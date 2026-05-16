import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { publishToGithub, type FileChange } from '@/lib/admin/github';
import { isAllowedAdminOrigin } from '@/lib/admin/origin';
import { getPost } from '@/lib/content';
import { extractLocalUploadPaths } from '@/lib/admin/uploads';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DATA_DIR = join(process.cwd(), 'data');

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

  const [existing, indexRaw] = await Promise.all([
    getPost(slug),
    readFile(join(DATA_DIR, 'index.json'), 'utf8'),
  ]);
  const index = JSON.parse(indexRaw) as IndexEntry[];
  const indexHasSlug = index.some((e) => e.slug === slug);

  // 404 only if BOTH the post JSON and the index entry are missing — there's
  // truly nothing to delete. If one exists without the other (orphan), the
  // route still cleans up whatever is present.
  if (!existing && !indexHasSlug) {
    return NextResponse.json({ ok: false, error: 'Post not found.' }, { status: 404 });
  }

  const updatedIndex = index.filter((e) => e.slug !== slug);

  const files: FileChange[] = [
    {
      path: 'web/data/index.json',
      content: JSON.stringify(updatedIndex, null, 2) + '\n',
    },
  ];
  if (existing) {
    files.push({ path: `web/data/posts/${slug}.json`, delete: true });
    const uploadPaths = extractLocalUploadPaths({
      html: existing.htmlContent,
      heroPath: existing.heroImage?.localPath,
    });
    files.push(...uploadPaths.map((path) => ({ path, delete: true as const })));
  }

  const message = existing
    ? `Delete post: ${existing.title}\n\nRemoves /${slug} via admin CMS.`
    : `Delete orphan index entry: ${slug}\n\nIndex referenced a missing post JSON; cleaned up via admin CMS.`;

  try {
    const commit = await publishToGithub({
      message,
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
