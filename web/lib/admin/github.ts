import { Octokit } from '@octokit/rest';

export type FileChange =
  | { path: string; content: string }
  | { path: string; contentBase64: string }
  | { path: string; delete: true };

export interface PublishToGithubArgs {
  message: string;
  files: FileChange[];
}

export interface PublishToGithubResult {
  commitSha: string;
  branch: string;
  repo: string;
}

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

export async function publishToGithub(
  args: PublishToGithubArgs
): Promise<PublishToGithubResult> {
  const token = getEnv('GITHUB_TOKEN');
  const repoSpec = getEnv('GITHUB_REPO');
  const branch = process.env.GITHUB_BRANCH || 'main';
  const { owner, repo } = parseRepo(repoSpec);
  const octokit = new Octokit({ auth: token });

  const commitSha = await tryCommit(octokit, owner, repo, branch, args);
  return { commitSha, branch, repo: repoSpec };
}

async function tryCommit(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  args: PublishToGithubArgs,
  attempt = 0
): Promise<string> {
  let ref;
  try {
    ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      throw new Error(
        `GitHub 404 on ${owner}/${repo}@${branch}. Check GITHUB_REPO, GITHUB_BRANCH, ` +
          `and that GITHUB_TOKEN has Contents:write access to this repo.`
      );
    }
    if (status === 401 || status === 403) {
      throw new Error(
        `GitHub ${status} on ${owner}/${repo}. GITHUB_TOKEN is missing, expired, ` +
          `or lacks Contents:write on this repo.`
      );
    }
    throw err;
  }
  const parentSha = ref.data.object.sha;

  const parentCommit = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: parentSha,
  });

  const treeEntries = await Promise.all(
    args.files.map(async (f) => {
      if ('delete' in f) {
        return {
          path: f.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: null,
        };
      }
      const base64 =
        'contentBase64' in f
          ? f.contentBase64
          : Buffer.from(f.content, 'utf8').toString('base64');
      const blob = await octokit.git.createBlob({
        owner,
        repo,
        content: base64,
        encoding: 'base64',
      });
      return {
        path: f.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.data.sha,
      };
    })
  );

  const tree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: parentCommit.data.tree.sha,
    tree: treeEntries,
  });

  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message: args.message,
    tree: tree.data.sha,
    parents: [parentSha],
  });

  try {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.data.sha,
      force: false,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if ((status === 409 || status === 422) && attempt < 1) {
      return tryCommit(octokit, owner, repo, branch, args, attempt + 1);
    }
    throw err;
  }

  return commit.data.sha;
}
