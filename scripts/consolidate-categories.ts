/**
 * One-shot consolidation of category slugs in web/data/.
 *
 * The WordPress export produced duplicate slugs (multiple "Music" buckets,
 * `wnba` + `wnba-sports`, `business` + `business-news-2`, etc.) and an
 * empty `uncategorized` bucket. This script collapses them onto a clean
 * canonical set and flattens parent/child to top-level.
 *
 * Idempotent — safe to re-run.
 *
 * Run: npx tsx scripts/consolidate-categories.ts
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DATA_DIR = 'web/data';
const POSTS_DIR = join(DATA_DIR, 'posts');

// Old slug → canonical slug. Slugs not listed pass through unchanged.
// Also used by next.config.ts to emit /category/<old> → /category/<new> redirects.
export const SLUG_MAP: Record<string, string> = {
  'music-news': 'music',
  'music-news-2': 'music',
  'music-news-3': 'music',
  'wnba-sports': 'wnba',
  'business-news-2': 'business',
  'youtube-music': 'youtube',
  uncategorized: 'general',
};

// The canonical category records. After consolidation, categories.json
// contains exactly these (whichever have at least one post). All flat.
const CANONICAL: { slug: string; name: string }[] = [
  { slug: 'sports', name: 'Sports' },
  { slug: 'nba', name: 'NBA' },
  { slug: 'wnba', name: 'WNBA' },
  { slug: 'nfl', name: 'NFL' },
  { slug: 'wwe', name: 'WWE' },
  { slug: 'business', name: 'Business' },
  { slug: 'music', name: 'Music' },
  { slug: 'entertainment', name: 'Entertainment' },
  { slug: 'interviews', name: 'Interviews' },
  { slug: 'news', name: 'News' },
  { slug: 'fashion', name: 'Fashion' },
  { slug: 'gaming', name: 'Gaming' },
  { slug: 'technology', name: 'Technology' },
  { slug: 'education', name: 'Education' },
  { slug: 'pop', name: 'Pop' },
  { slug: 'youtube', name: 'Youtube' },
  { slug: 'general', name: 'General' },
];

const CANONICAL_NAME = new Map(CANONICAL.map((c) => [c.slug, c.name]));

function canonicalize(slug: string): string {
  return SLUG_MAP[slug] ?? slug;
}

interface CategoryRef {
  slug: string;
  name: string;
}

function dedupeCategories(cats: CategoryRef[]): CategoryRef[] {
  const seen = new Set<string>();
  const out: CategoryRef[] = [];
  for (const c of cats) {
    const slug = canonicalize(c.slug);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, name: CANONICAL_NAME.get(slug) ?? c.name });
  }
  return out;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function rewritePosts(): Promise<{ touched: number; total: number }> {
  const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.json'));
  let touched = 0;
  for (const f of files) {
    const path = join(POSTS_DIR, f);
    const post = await readJson<{
      categories: CategoryRef[];
    }>(path);
    const before = JSON.stringify(post.categories);
    post.categories = dedupeCategories(post.categories ?? []);
    const after = JSON.stringify(post.categories);
    if (before !== after) {
      await writeJson(path, post);
      touched++;
    }
  }
  return { touched, total: files.length };
}

async function rewriteIndex(): Promise<{ touched: number; total: number }> {
  const path = join(DATA_DIR, 'index.json');
  const entries = await readJson<
    { primaryCategory: CategoryRef | null }[]
  >(path);
  let touched = 0;
  for (const e of entries) {
    if (!e.primaryCategory) continue;
    const slug = canonicalize(e.primaryCategory.slug);
    if (slug === e.primaryCategory.slug) continue;
    e.primaryCategory = { slug, name: CANONICAL_NAME.get(slug) ?? e.primaryCategory.name };
    touched++;
  }
  if (touched > 0) await writeJson(path, entries);
  return { touched, total: entries.length };
}

async function rewriteCategoriesFile(): Promise<void> {
  // Determine which canonical slugs actually have posts (after rewrite),
  // and write the canonical records flat. This drops merged-away slugs and
  // flips parentSlug to null everywhere.
  const path = join(DATA_DIR, 'categories.json');
  const entries = await readJson<{ primaryCategory: CategoryRef | null }[]>(
    join(DATA_DIR, 'index.json'),
  );
  const used = new Set<string>();
  for (const e of entries) if (e.primaryCategory) used.add(e.primaryCategory.slug);
  const out = CANONICAL.filter((c) => used.has(c.slug)).map((c) => ({
    slug: c.slug,
    name: c.name,
    parentSlug: null as string | null,
  }));
  await writeJson(path, out);
}

async function main() {
  const i = await rewriteIndex();
  const p = await rewritePosts();
  await rewriteCategoriesFile();
  console.log(`index.json:    ${i.touched}/${i.total} entries updated`);
  console.log(`posts/*.json:  ${p.touched}/${p.total} files updated`);
  console.log(`categories.json: rewritten with canonical flat list`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
