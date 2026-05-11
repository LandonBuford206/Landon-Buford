import { Octokit } from '@octokit/rest';

interface FileChange {
  path: string;
  content: string;
}

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
  const ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const parentSha = ref.data.object.sha;

  const parentCommit = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: parentSha,
  });

  const blobs = await Promise.all(
    args.files.map((f) =>
      octokit.git
        .createBlob({
          owner,
          repo,
          content: Buffer.from(f.content, 'utf8').toString('base64'),
          encoding: 'base64',
        })
        .then((b) => ({ path: f.path, sha: b.data.sha }))
    )
  );

  const tree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: parentCommit.data.tree.sha,
    tree: blobs.map((b) => ({
      path: b.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: b.sha,
    })),
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
