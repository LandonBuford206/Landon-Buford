// GitHub-backed readers for admin pages.
//
// The public site reads JSON from process.cwd()/data/ — fine because static
// rendering ships those files into the deployment. The admin needs to see
// changes immediately, before Vercel's next build, so it reads from GitHub
// via the same transport the write routes use.
//
// Only call these from /admin/* routes. The public site (homepage, /[slug],
// category/author/tag pages, feed, sitemap) stays on lib/content.ts.

import type {
  AuthorRecord,
  CategoryRecord,
  PostFull,
  PostListEntry,
} from '@/lib/content';
import { readRepoFile, readRepoFileOrNull } from './repo-read';

export async function loadIndexFromRepo(): Promise<PostListEntry[]> {
  const raw = await readRepoFile('web/data/index.json');
  return JSON.parse(raw) as PostListEntry[];
}

export async function loadPostFromRepo(slug: string): Promise<PostFull | null> {
  const raw = await readRepoFileOrNull(`web/data/posts/${slug}.json`);
  return raw ? (JSON.parse(raw) as PostFull) : null;
}

export async function loadCategoriesFromRepo(): Promise<CategoryRecord[]> {
  const raw = await readRepoFile('web/data/categories.json');
  return JSON.parse(raw) as CategoryRecord[];
}

export async function loadAuthorsFromRepo(): Promise<AuthorRecord[]> {
  const raw = await readRepoFile('web/data/authors.json');
  return JSON.parse(raw) as AuthorRecord[];
}
