import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { verifySession } from '@/lib/session';
import { buildPost, normalizeSlug } from '@/lib/admin/post-builder';
import { publishToGithub, type FileChange } from '@/lib/admin/github';
import type { FormattedPost } from '@/lib/admin/anthropic';
import { isAllowedAdminOrigin } from '@/lib/admin/origin';
import { rehostExternalImages } from '@/lib/admin/uploads';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DATA_DIR = join(process.cwd(), 'data');

interface PublishPayload {
  formatted?: FormattedPost;
  publishedAt?: string;
}

function isValidIsoDate(s: string): boolean {
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export async function POST(req: Request) {
  if (!isAllowedAdminOrigin(req)) {
    return Response.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
  }

  const session = await verifySession();
  if (!session) {
    return Response.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  let body: PublishPayload;
  try {
    body = (await req.json()) as PublishPayload;
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const f = body.formatted;
  if (!f?.title || !f.slug || !f.htmlContent || !f.categorySlug) {
    return Response.json(
      { ok: false, error: 'Missing required formatted fields.' },
      { status: 400 }
    );
  }

  const publishedAt = body.publishedAt ?? new Date().toISOString();
  if (!isValidIsoDate(publishedAt)) {
    return Response.json({ ok: false, error: 'Invalid publishedAt date.' }, { status: 400 });
  }

  const [categoriesRaw, tagsRaw, indexRaw] = await Promise.all([
    readFile(join(DATA_DIR, 'categories.json'), 'utf8'),
    readFile(join(DATA_DIR, 'tags.json'), 'utf8'),
    readFile(join(DATA_DIR, 'index.json'), 'utf8'),
  ]);
  const categories = JSON.parse(categoriesRaw) as { slug: string; name: string }[];
  const existingTags = JSON.parse(tagsRaw) as { slug: string; name: string }[];
  const index = JSON.parse(indexRaw) as { publishedAt: string }[];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://landonbuford.com';
  const postId = Math.floor(Date.now() / 1000);

  // Rehost any external <img> in the body before buildPost runs sanitizer.
  // sanitizer strips non-local images; rehosting first preserves them by
  // committing the bytes into our repo and rewriting the src.
  const rehost = await rehostExternalImages(
    f.htmlContent,
    normalizeSlug(f.slug),
    new Date(publishedAt)
  );
  const formattedWithLocalImages: FormattedPost = {
    ...f,
    htmlContent: rehost.html,
  };

  const { postJson, indexEntry, newTags, finalSlug } = buildPost({
    formatted: formattedWithLocalImages,
    categories,
    existingTags,
    publishedAt,
    authorSlug: 'landon-buford',
    authorName: 'Landon Buford',
    postId,
    siteUrl,
  });

  const publishedAtMs = new Date(publishedAt).getTime();
  let insertAt = index.length;
  for (let i = 0; i < index.length; i++) {
    if (new Date(index[i].publishedAt).getTime() <= publishedAtMs) {
      insertAt = i;
      break;
    }
  }
  const updatedIndex = [...index.slice(0, insertAt), indexEntry, ...index.slice(insertAt)];

  const files: FileChange[] = [
    {
      path: `web/data/posts/${finalSlug}.json`,
      content: JSON.stringify(postJson, null, 2) + '\n',
    },
    {
      path: 'web/data/index.json',
      content: JSON.stringify(updatedIndex, null, 2) + '\n',
    },
    ...rehost.fileChanges,
  ];

  if (newTags.length > 0) {
    const updatedTags = [...existingTags, ...newTags];
    files.push({
      path: 'web/data/tags.json',
      content: JSON.stringify(updatedTags) + '\n',
    });
  }

  try {
    const commit = await publishToGithub({
      message: `Add post: ${f.title}\n\nPublishes /${finalSlug} via admin CMS.`,
      files,
    });
    return Response.json({
      ok: true,
      slug: finalSlug,
      url: `${siteUrl.replace(/\/$/, '')}/${finalSlug}`,
      commitSha: commit.commitSha,
      branch: commit.branch,
    });
  } catch (err) {
    console.error('Admin publish:', err);
    const message = err instanceof Error ? err.message : 'Publish failed.';
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
