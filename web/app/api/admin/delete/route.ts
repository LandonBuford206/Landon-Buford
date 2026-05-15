import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { publishToGithub, type FileChange } from '@/lib/admin/github';
import { isAllowedAdminOrigin } from '@/lib/admin/origin';
import type { PostFull } from '@/lib/content';
import { extractLocalUploadPaths } from '@/lib/admin/uploads';
import { readRepoFile, readRepoFileOrNull } from '@/lib/admin/repo-read';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface DeletePayload {
  slug?: string;
}

interface IndexEntry {
  slug: string;
}

export async function POST(req: Request) {
  if (!isAllowedAdminOrigin(req)) {
    return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
  }

  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  let body: DeletePayload;
  try {
    body = (await req.json()) as DeletePayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const slug = body.slug?.trim();
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug is required.' }, { status: 400 });
  }

  // Read these from GitHub, not the local Vercel filesystem — see
  // lib/admin/repo-read.ts for why disk reads are unsafe here.
  const existingRaw = await readRepoFileOrNull(`web/data/posts/${slug}.json`);
  if (!existingRaw) {
    return NextResponse.json({ ok: false, error: 'Post not found.' }, { status: 404 });
  }
  const existing = JSON.parse(existingRaw) as PostFull;

  const indexRaw = await readRepoFile('web/data/index.json');
  const index = JSON.parse(indexRaw) as IndexEntry[];
  const updatedIndex = index.filter((e) => e.slug !== slug);

  const uploadPaths = extractLocalUploadPaths({
    html: existing.htmlContent,
    heroPath: existing.heroImage?.localPath,
  });

  const files: FileChange[] = [
    { path: `web/data/posts/${slug}.json`, delete: true },
    {
      path: 'web/data/index.json',
      content: JSON.stringify(updatedIndex, null, 2) + '\n',
    },
    ...uploadPaths.map((path) => ({ path, delete: true as const })),
  ];

  try {
    const commit = await publishToGithub({
      message: `Delete post: ${existing.title}\n\nRemoves /${slug} via admin CMS.`,
      files,
    });
    return NextResponse.json({
      ok: true,
      slug,
      commitSha: commit.commitSha,
      branch: commit.branch,
    });
  } catch (err) {
    console.error('Admin delete:', err);
    const message = err instanceof Error ? err.message : 'Delete failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
