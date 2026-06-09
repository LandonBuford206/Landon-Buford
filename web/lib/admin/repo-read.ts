import { Octokit } from '@octokit/rest';

// Read a file's CURRENT content from the configured GitHub branch.
//
// The publish/update/delete routes read indexes (index.json, tags.json) and
// existing post JSON before computing the next state. Reading those off
// Vercel's local filesystem is unsafe: the serverless function sees the
// filesystem of whatever build is currently DEPLOYED, which lags the latest
// main commit by ~60-120s while Vercel rebuilds. If two write operations
// happen inside that window, the second one reads a stale snapshot and
// silently undoes the first one's changes.
//
// Always reading from GitHub avoids the drift entirely.

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set.`);
  return v;
}

function parseRepo(spec: string): { owner: string; repo: string } {
  const [owner, repo] = spec.split('/');
  if (!owner || !repo) throw new Error(`GITHUB_REPO must be "owner/name", got: ${spec}`);
  return { owner, repo };
}

export async function readRepoFile(path: string): Promise<string> {
  const token = getEnv('GITHUB_TOKEN');
  const repoSpec = getEnv('GITHUB_REPO');
  const branch = process.env.GITHUB_BRANCH || 'main';
  const { owner, repo } = parseRepo(repoSpec);
  const octokit = new Octokit({ auth: token });

  let res;
  try {
    res = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
      mediaType: { format: 'raw' },
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    // Surface auth/repo failures with the same friendly wording the write
    // path uses (lib/admin/github.ts), so an expired/revoked GITHUB_TOKEN
    // reads as a clear message instead of an opaque crash. 404s pass through
    // untouched so readRepoFileOrNull can still detect "file not present".
    if (status === 401 || status === 403) {
      const e = new Error(
        `GitHub ${status} reading ${path} from ${owner}/${repo}@${branch}. ` +
          `GITHUB_TOKEN is missing, expired, revoked, or lacks access to this repo.`
      );
      (e as { status?: number }).status = status;
      throw e;
    }
    throw err;
  }
  // With mediaType raw, the SDK returns the raw text as `data` (string),
  // but its type signature still claims the structured object. Coerce.
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
}

export async function readRepoFileOrNull(path: string): Promise<string | null> {
  try {
    return await readRepoFile(path);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) return null;
    throw err;
  }
}
