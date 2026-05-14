import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { publishToGithub, type FileChange } from '@/lib/admin/github';
import { isAllowedAdminOrigin } from '@/lib/admin/origin';
import { cleanWordPressHtml } from '@/lib/html';
import { estimateReadingTime } from '@/lib/admin/post-builder';
import { getPost } from '@/lib/content';
import { rehostExternalImages } from '@/lib/admin/uploads';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DATA_DIR = join(process.cwd(), 'data');

interface HeroImagePayload {
  localPath?: string;
  alt?: string;
}

interface UpdatePayload {
  slug?: string;
  title?: string;
  excerpt?: string;
  htmlContent?: string;
  categorySlug?: string;
  tagNames?: string[];
  publishedAt?: string;
  heroImage?: HeroImagePayload | null;
}

interface TagRecord {
  slug: string;
  name: string;
}

interface CategoryRecord {
  slug: string;
  name: string;
}

interface HeroImage {
  originalUrl: string;
  localPath?: string;
  blobUrl?: string;
  alt?: string;
}

interface IndexEntry {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: { slug: string; displayName: string };
  primaryCategory: { slug: string; name: string } | null;
  heroImage: HeroImage | null;
  readingTimeMin: number;
}

function tagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function isValidIsoDate(s: string): boolean {
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export async function POST(req: Request) {
  if (!isAllowedAdminOrigin(req)) {
    return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
  }

  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  let body: UpdatePayload;
  try {
    body = (await req.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const slug = body.slug?.trim();
  if (!slug) return NextResponse.json({ ok: false, error: 'Slug is required.' }, { status: 400 });

  const existing = await getPost(slug);
  if (!existing)
    return NextResponse.json({ ok: false, error: 'Post not found.' }, { status: 404 });

  const title = body.title?.trim() || existing.title;
  const excerpt = body.excerpt?.trim() || existing.excerpt;
  const rawHtml = body.htmlContent ?? existing.htmlContent;
  const publishedAt = body.publishedAt ?? existing.publishedAt;
  if (!isValidIsoDate(publishedAt)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid publishedAt date.' },
      { status: 400 }
    );
  }
  const categorySlug = body.categorySlug?.trim() || existing.categories[0]?.slug || 'general';

  const [categoriesRaw, tagsRaw, indexRaw] = await Promise.all([
    readFile(join(DATA_DIR, 'categories.json'), 'utf8'),
    readFile(join(DATA_DIR, 'tags.json'), 'utf8'),
    readFile(join(DATA_DIR, 'index.json'), 'utf8'),
  ]);
  const categories = JSON.parse(categoriesRaw) as CategoryRecord[];
  const existingTags = JSON.parse(tagsRaw) as TagRecord[];
  const index = JSON.parse(indexRaw) as IndexEntry[];

  const categoryName =
    categories.find((c) => c.slug === categorySlug)?.name ?? categorySlug;

  // Rehost any external <img> before sanitizer strips them.
  const rehost = await rehostExternalImages(rawHtml, slug, new Date(publishedAt));
  const cleanedHtml = cleanWordPressHtml(rehost.html);

  const tagNames = body.tagNames ?? existing.tags.map((t) => t.name);
  const seen = new Set<string>();
  const dedupedTags: TagRecord[] = [];
  for (const name of tagNames) {
    const s = tagSlug(name);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    dedupedTags.push({ slug: s, name: name.trim() });
  }
  const knownTagSlugs = new Set(existingTags.map((t) => t.slug));
  const netNewTags = dedupedTags.filter((t) => !knownTagSlugs.has(t.slug));

  const nowIso = new Date().toISOString();

  // heroImage: undefined = keep existing; null = clear; object = replace.
  let hero: HeroImage | null = existing.heroImage ?? null;
  if (body.heroImage === null) {
    hero = null;
  } else if (body.heroImage && body.heroImage.localPath?.startsWith('/')) {
    hero = {
      originalUrl: body.heroImage.localPath,
      localPath: body.heroImage.localPath,
      alt: body.heroImage.alt?.trim() || '',
    };
  }

  const updatedPost = {
    ...existing,
    title,
    excerpt,
    htmlContent: cleanedHtml,
    publishedAt,
    modifiedAt: nowIso,
    categories: [{ slug: categorySlug, name: categoryName }],
    tags: dedupedTags,
    heroImage: hero,
    readingTimeMin: estimateReadingTime(cleanedHtml),
  };

  const updatedIndex = index.map((e) =>
    e.slug === slug
      ? {
          slug,
          title,
          excerpt,
          publishedAt,
          author: e.author,
          primaryCategory: { slug: categorySlug, name: categoryName },
          heroImage: hero,
          readingTimeMin: updatedPost.readingTimeMin,
        }
      : e
  );

  // resort by publishedAt desc if the date changed
  updatedIndex.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const files: FileChange[] = [
    {
      path: `web/data/posts/${slug}.json`,
      content: JSON.stringify(updatedPost, null, 2) + '\n',
    },
    {
      path: 'web/data/index.json',
      content: JSON.stringify(updatedIndex, null, 2) + '\n',
    },
    ...rehost.fileChanges,
  ];

  if (netNewTags.length > 0) {
    files.push({
      path: 'web/data/tags.json',
      content: JSON.stringify([...existingTags, ...netNewTags]) + '\n',
    });
  }

  try {
    const commit = await publishToGithub({
      message: `Update post: ${title}\n\nEdits /${slug} via admin CMS.`,
      files,
    });
    return NextResponse.json({
      ok: true,
      slug,
      commitSha: commit.commitSha,
      branch: commit.branch,
    });
  } catch (err) {
    console.error('Admin update:', err);
    const message = err instanceof Error ? err.message : 'Update failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
