import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cleanWordPressHtml } from '@/lib/html';
import type { FormattedPost } from './anthropic';

const DATA_DIR = join(process.cwd(), 'data');
const POSTS_DIR = join(DATA_DIR, 'posts');

const ALLOWED_CATEGORY_SLUGS = new Set<string>();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function normalizeSlug(raw: string): string {
  const cleaned = slugify(raw);
  return cleaned || 'untitled';
}

export function resolveCollisionSlug(baseSlug: string): string {
  let slug = baseSlug;
  let n = 2;
  while (existsSync(join(POSTS_DIR, `${slug}.json`))) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
  return slug;
}

export function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export interface BuildPostArgs {
  formatted: FormattedPost;
  categories: { slug: string; name: string }[];
  existingTags: { slug: string; name: string }[];
  publishedAt: string;
  authorSlug: string;
  authorName: string;
  postId: number;
  siteUrl: string;
}

export interface BuiltPost {
  postJson: Record<string, unknown>;
  indexEntry: Record<string, unknown>;
  newTags: { slug: string; name: string }[];
  finalSlug: string;
  finalCategorySlug: string;
}

export function buildPost(args: BuildPostArgs): BuiltPost {
  const { formatted } = args;

  if (ALLOWED_CATEGORY_SLUGS.size === 0) {
    for (const c of args.categories) ALLOWED_CATEGORY_SLUGS.add(c.slug);
  }

  const categorySlug = ALLOWED_CATEGORY_SLUGS.has(formatted.categorySlug)
    ? formatted.categorySlug
    : 'general';
  const categoryName =
    args.categories.find((c) => c.slug === categorySlug)?.name ??
    formatted.categorySlug;

  const baseSlug = normalizeSlug(formatted.slug);
  const finalSlug = resolveCollisionSlug(baseSlug);

  const cleanedHtml = cleanWordPressHtml(formatted.htmlContent);

  const knownTagSlugs = new Set(args.existingTags.map((t) => t.slug));
  const seen = new Set<string>();
  const dedupedTags: { slug: string; name: string }[] = [];
  for (const t of formatted.tags) {
    const slug = slugify(t.slug || t.name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    dedupedTags.push({ slug, name: t.name.trim() });
  }
  const newTags = dedupedTags.filter((t) => !knownTagSlugs.has(t.slug));

  const categories = [{ slug: categorySlug, name: categoryName }];

  const postJson = {
    slug: finalSlug,
    postId: args.postId,
    title: formatted.title,
    htmlContent: cleanedHtml,
    excerpt: formatted.excerpt,
    publishedAt: args.publishedAt,
    modifiedAt: args.publishedAt,
    author: { slug: args.authorSlug, displayName: args.authorName },
    categories,
    tags: dedupedTags,
    heroImage: null,
    inlineImageUrls: [],
    readingTimeMin: estimateReadingTime(cleanedHtml),
    type: 'post',
    link: `${args.siteUrl.replace(/\/$/, '')}/${finalSlug}/`,
  };

  const indexEntry = {
    slug: finalSlug,
    title: formatted.title,
    excerpt: formatted.excerpt,
    publishedAt: args.publishedAt,
    author: { slug: args.authorSlug, displayName: args.authorName },
    primaryCategory: { slug: categorySlug, name: categoryName },
    heroImage: null,
    readingTimeMin: postJson.readingTimeMin,
  };

  return {
    postJson,
    indexEntry,
    newTags,
    finalSlug,
    finalCategorySlug: categorySlug,
  };
}
