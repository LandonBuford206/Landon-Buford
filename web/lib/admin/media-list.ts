import { Octokit } from '@octokit/rest';

export interface MediaItem {
  publicUrl: string;
  slug: string;
  year: string;
  filename: string;
  size: number;
}

const UPLOAD_PREFIX = 'web/public/uploads/';

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set.`);
  return v;
}

export async function listMedia(): Promise<MediaItem[]> {
  const token = getEnv('GITHUB_TOKEN');
  const repoSpec = getEnv('GITHUB_REPO');
  const branch = process.env.GITHUB_BRANCH || 'main';
  const [owner, repo] = repoSpec.split('/');
  if (!owner || !repo) {
    throw new Error(`GITHUB_REPO must be "owner/name", got: ${repoSpec}`);
  }

  const octokit = new Octokit({ auth: token });

  const tree = await (async () => {
    try {
      const ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
      const commit = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: ref.data.object.sha,
      });
      return await octokit.git.getTree({
        owner,
        repo,
        tree_sha: commit.data.tree.sha,
        recursive: 'true',
      });
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        throw new Error(
          `GitHub ${status} on ${owner}/${repo}. GITHUB_TOKEN is missing, expired, ` +
            `or lacks Contents:read on this repo.`
        );
      }
      if (status === 404) {
        throw new Error(
          `GitHub 404 on ${owner}/${repo}@${branch}. Check GITHUB_REPO, GITHUB_BRANCH, ` +
            `and that GITHUB_TOKEN has access to this repo.`
        );
      }
      throw err;
    }
  })();

  const items: MediaItem[] = [];
  for (const entry of tree.data.tree) {
    if (entry.type !== 'blob' || !entry.path) continue;
    if (!entry.path.startsWith(UPLOAD_PREFIX)) continue;
    const rel = entry.path.slice(UPLOAD_PREFIX.length);
    const parts = rel.split('/');
    if (parts.length !== 3) continue;
    const [year, slug, filename] = parts;
    items.push({
      publicUrl: `/uploads/${year}/${slug}/${filename}`,
      slug,
      year,
      filename,
      size: entry.size ?? 0,
    });
  }

  items.sort(
    (a, b) =>
      b.year.localeCompare(a.year) ||
      a.slug.localeCompare(b.slug) ||
      a.filename.localeCompare(b.filename)
  );
  return items;
}
