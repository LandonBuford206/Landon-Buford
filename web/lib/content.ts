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

const DATA_DIR = join(process.cwd(), 'data');

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

// ---- low-level cached file readers (per-request memoization via React cache) ----

const loadIndex = cache(async (): Promise<PostListEntry[]> => {
  const raw = await readFile(join(DATA_DIR, 'index.json'), 'utf8');
  return JSON.parse(raw) as PostListEntry[];
});

const loadCategories = cache(async (): Promise<CategoryRecord[]> => {
  const raw = await readFile(join(DATA_DIR, 'categories.json'), 'utf8');
  return JSON.parse(raw) as CategoryRecord[];
});

const loadTags = cache(async (): Promise<TagRecord[]> => {
  const raw = await readFile(join(DATA_DIR, 'tags.json'), 'utf8');
  return JSON.parse(raw) as TagRecord[];
});

const loadAuthors = cache(async (): Promise<AuthorRecord[]> => {
  const raw = await readFile(join(DATA_DIR, 'authors.json'), 'utf8');
  return JSON.parse(raw) as AuthorRecord[];
});

// ---- public API ----

export async function getPost(slug: string): Promise<PostFull | null> {
  try {
    const raw = await readFile(join(DATA_DIR, 'posts', `${slug}.json`), 'utf8');
    return JSON.parse(raw) as PostFull;
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
  const { categorySlug, tagSlug, authorSlug, page = 1, perPage = 24 } = opts;
  const all = await loadIndex();

  let filtered = all;
  if (categorySlug) {
    filtered = filtered.filter((p) => p.primaryCategory?.slug === categorySlug);
  }
  if (authorSlug) {
    filtered = filtered.filter((p) => p.author.slug === authorSlug);
  }
  // tag filtering requires loading the full post; do it lazily
  if (tagSlug) {
    const matched: PostListEntry[] = [];
    for (const entry of filtered) {
      const post = await getPost(entry.slug);
      if (post?.tags.some((t) => t.slug === tagSlug)) matched.push(entry);
    }
    filtered = matched;
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
  const [cats, all] = await Promise.all([loadCategories(), loadIndex()]);
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

/**
 * Used by homepage and category landings. Picks a featured/lead post
 * and a set of secondary stories from the most recent posts.
 */
export async function getHomepageFeed(): Promise<{
  lead: PostListEntry | null;
  secondary: PostListEntry[];
  byCategory: { category: CategoryRecord & { count: number }; posts: PostListEntry[] }[];
}> {
  const all = await loadIndex();
  const cats = await getCategoriesWithCounts();
  const lead = all[0] ?? null;
  const secondary = all.slice(1, 9);
  const byCategory: { category: CategoryRecord & { count: number }; posts: PostListEntry[] }[] = [];
  const used = new Set<string>([lead?.slug ?? '', ...secondary.map((p) => p.slug)]);
  for (const cat of cats.slice(0, 4)) {
    const posts = all
      .filter((p) => p.primaryCategory?.slug === cat.slug && !used.has(p.slug))
      .slice(0, 4);
    posts.forEach((p) => used.add(p.slug));
    if (posts.length > 0) byCategory.push({ category: cat, posts });
  }
  return { lead, secondary, byCategory };
}
