/**
 * Content loader — the Phase-2 swap point.
 *
 * Phase 1: reads JSON files from web/data/ produced by scripts/import-wxr.ts
 * Phase 2: replace the implementations below with CMS API calls. Pages, layouts,
 *          components, RSS, and search continue to work without modification.
 *
 * Keep this surface stable.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cache } from 'react';
import { readRepoFileOrNull } from './admin/repo-read';

const DATA_DIR = join(process.cwd(), 'data');

export const PER_PAGE = 24;

export interface PostFull {
  slug: string;
  postId: number;
  title: string;
  htmlContent: string;
  excerpt: string;
  publishedAt: string;
  modifiedAt: string;
  author: { slug: string; displayName: string };
  categories: { slug: string; name: string }[];
  tags: { slug: string; name: string }[];
  heroImage: { originalUrl: string; localPath?: string; blobUrl?: string; alt?: string } | null;
  inlineImageUrls: string[];
  readingTimeMin: number;
  type: 'post' | 'page';
  link: string;
}

export interface PostListEntry {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: { slug: string; displayName: string };
  primaryCategory: { slug: string; name: string } | null;
  heroImage: { originalUrl: string; localPath?: string; blobUrl?: string } | null;
  readingTimeMin: number;
}

export interface CategoryRecord {
  slug: string;
  name: string;
  parentSlug: string | null;
}

export interface TagRecord {
  slug: string;
  name: string;
}

export interface AuthorRecord {
  slug: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

export type ListingKind = 'category' | 'tag' | 'author';

// ---- low-level file readers ----

// Files on disk only change with a new build, so each is parsed once per
// process. The static export renders ~22k pages; re-parsing the 5 MB index
// for every one of them would add many minutes to each deploy.
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () =>
    (promise ??= load().catch((err) => {
      promise = null;
      throw err;
    }));
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(join(DATA_DIR, file), 'utf8')) as T;
}

const loadIndex = once(() => readJson<PostListEntry[]>('index.json'));
const loadCategories = once(() => readJson<CategoryRecord[]>('categories.json'));
const loadTags = once(() => readJson<TagRecord[]>('tags.json'));
const loadAuthors = once(() => readJson<AuthorRecord[]>('authors.json'));

// Prefer GitHub over local disk for runtime listing reads when a token is
// configured. The deployed build's disk lags the latest commit while a new
// build runs, so a freshly-published post is in GitHub before it's on disk.
// Disk fallback keeps local dev and the static export working without
// GITHUB_TOKEN, and covers GitHub failures.
const loadIndexFresh = cache(async (): Promise<PostListEntry[]> => {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
    try {
      const raw = await readRepoFileOrNull('web/data/index.json');
      if (raw) return JSON.parse(raw) as PostListEntry[];
    } catch {
      // fall through to disk
    }
  }
  return loadIndex();
});

// Tag membership lives in each post file, not the index. Build the full
// tag -> posts map in one pass instead of opening every post for every tag
// page (~13,700 tags x ~7,500 posts).
const loadTagIndex = once(async (): Promise<Map<string, PostListEntry[]>> => {
  const map = new Map<string, PostListEntry[]>();
  for (const entry of await loadIndex()) {
    const post = await getPost(entry.slug);
    for (const slug of new Set(post?.tags.map((t) => t.slug))) {
      const posts = map.get(slug);
      if (posts) posts.push(entry);
      else map.set(slug, [entry]);
    }
  }
  return map;
});

// ---- public API ----

export async function getPost(slug: string): Promise<PostFull | null> {
  try {
    return await readJson<PostFull>(join('posts', `${slug}.json`));
  } catch {
    return null;
  }
}

export interface ListPostsOptions {
  categorySlug?: string;
  tagSlug?: string;
  authorSlug?: string;
  page?: number;
  perPage?: number;
}

export interface PaginatedPosts {
  posts: PostListEntry[];
  page: number;
  perPage: number;
  totalPosts: number;
  totalPages: number;
}

export async function listPosts(opts: ListPostsOptions = {}): Promise<PaginatedPosts> {
  const { categorySlug, tagSlug, authorSlug, page = 1, perPage = PER_PAGE } = opts;
  const all = await loadIndexFresh();

  let filtered = all;
  if (categorySlug) {
    filtered = filtered.filter((p) => p.primaryCategory?.slug === categorySlug);
  }
  if (authorSlug) {
    filtered = filtered.filter((p) => p.author.slug === authorSlug);
  }
  if (tagSlug) {
    const tagged = new Set((await loadTagIndex()).get(tagSlug)?.map((p) => p.slug));
    filtered = filtered.filter((p) => tagged.has(p.slug));
  }

  const totalPosts = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / perPage));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * perPage;
  return {
    posts: filtered.slice(start, start + perPage),
    page: safePage,
    perPage,
    totalPosts,
    totalPages,
  };
}

/**
 * Every category / tag / author that has at least one post, with its page
 * count at PER_PAGE. Drives generateStaticParams for the archive pages.
 */
export async function getListingPageCounts(
  kind: ListingKind
): Promise<{ slug: string; totalPages: number }[]> {
  const counts = new Map<string, number>();
  if (kind === 'tag') {
    for (const [slug, posts] of await loadTagIndex()) counts.set(slug, posts.length);
  } else {
    for (const p of await loadIndex()) {
      const slug = kind === 'category' ? p.primaryCategory?.slug : p.author.slug;
      if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }

  const records =
    kind === 'category' ? await loadCategories() : kind === 'tag' ? await loadTags() : await loadAuthors();
  const known = new Set(records.map((r) => r.slug));

  return Array.from(counts)
    .filter(([slug]) => known.has(slug))
    .map(([slug, n]) => ({ slug, totalPages: Math.ceil(n / PER_PAGE) }));
}

export async function getRelatedPosts(post: PostFull, limit = 3): Promise<PostListEntry[]> {
  const all = await loadIndex();
  const primary = post.categories[0]?.slug;
  if (!primary) {
    return all.filter((p) => p.slug !== post.slug).slice(0, limit);
  }
  return all
    .filter((p) => p.slug !== post.slug && p.primaryCategory?.slug === primary)
    .slice(0, limit);
}

export async function getRecentPosts(limit = 12): Promise<PostListEntry[]> {
  const all = await loadIndex();
  return all.slice(0, limit);
}

export async function getCategoriesWithCounts(): Promise<
  (CategoryRecord & { count: number })[]
> {
  const [cats, all] = await Promise.all([loadCategories(), loadIndexFresh()]);
  const counts = new Map<string, number>();
  for (const p of all) {
    const slug = p.primaryCategory?.slug;
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return cats
    .map((c) => ({ ...c, count: counts.get(c.slug) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

export async function getCategory(slug: string): Promise<CategoryRecord | null> {
  const cats = await loadCategories();
  return cats.find((c) => c.slug === slug) ?? null;
}

export async function getTag(slug: string): Promise<TagRecord | null> {
  const tags = await loadTags();
  return tags.find((t) => t.slug === slug) ?? null;
}

export async function getAuthor(slug: string): Promise<AuthorRecord | null> {
  const authors = await loadAuthors();
  return authors.find((a) => a.slug === slug) ?? null;
}

export async function getAllSlugs(): Promise<string[]> {
  const all = await loadIndex();
  return all.map((p) => p.slug);
}

export async function getAllCategories(): Promise<CategoryRecord[]> {
  return loadCategories();
}

export async function getAllAuthors(): Promise<AuthorRecord[]> {
  return loadAuthors();
}

export interface HomepageCategoryBlock {
  category: CategoryRecord & { count: number };
  posts: PostListEntry[];
}

/**
 * Used by homepage and category landings. Picks a featured/lead post
 * and a set of secondary stories from the most recent posts.
 *
 * `byCategory` is a slug-keyed Map (insertion-ordered by post count). The
 * homepage reads specific slugs from it for slotted layouts and iterates
 * the rest for a default fallback grid.
 */
export async function getHomepageFeed(): Promise<{
  lead: PostListEntry | null;
  secondary: PostListEntry[];
  byCategory: Map<string, HomepageCategoryBlock>;
}> {
  const all = await loadIndexFresh();
  const cats = await getCategoriesWithCounts();
  const lead = all[0] ?? null;
  const secondary = all.slice(1, 9);
  const byCategory = new Map<string, HomepageCategoryBlock>();
  const used = new Set<string>([lead?.slug ?? '', ...secondary.map((p) => p.slug)]);
  for (const cat of cats.slice(0, 8)) {
    const posts = all
      .filter((p) => p.primaryCategory?.slug === cat.slug && !used.has(p.slug))
      .slice(0, 5);
    posts.forEach((p) => used.add(p.slug));
    if (posts.length > 0) byCategory.set(cat.slug, { category: cat, posts });
  }
  return { lead, secondary, byCategory };
}
