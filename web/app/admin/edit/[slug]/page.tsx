import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { notFound, redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import type { PostFull } from '@/lib/content';
import { loadPostFromRepo } from '@/lib/admin/admin-reads';
import { AdminLoadError } from '../../_components/load-error';
import { EditPostForm } from './edit-post-form';

export const dynamic = 'force-dynamic';

interface CategoryRecord {
  slug: string;
  name: string;
}

interface AuthorRecord {
  slug: string;
  displayName: string;
}

export default async function EditPostPage(props: { params: Promise<{ slug: string }> }) {
  const session = await verifySession();
  if (!session) redirect('/admin/login');

  const { slug } = await props.params;
  // Read from GitHub directly so the edit page sees freshly-published posts
  // before Vercel has redeployed. Catch read failures (e.g. an expired
  // GITHUB_TOKEN) so the page surfaces the cause instead of crashing into
  // Vercel's opaque "page could not load" 500. notFound() stays outside the
  // try — it throws a Next.js control signal that must not be swallowed.
  let post: PostFull | null = null;
  let categories: CategoryRecord[];
  let authors: AuthorRecord[];
  try {
    post = await loadPostFromRepo(slug);
    const dataDir = join(process.cwd(), 'data');
    const [categoriesRaw, authorsRaw] = await Promise.all([
      readFile(join(dataDir, 'categories.json'), 'utf8'),
      readFile(join(dataDir, 'authors.json'), 'utf8'),
    ]);
    categories = JSON.parse(categoriesRaw) as CategoryRecord[];
    authors = JSON.parse(authorsRaw) as AuthorRecord[];
  } catch (err) {
    return <AdminLoadError message={err instanceof Error ? err.message : String(err)} />;
  }

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-[var(--container-page)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-3xl tracking-tight">Edit post</h1>
        <div className="flex items-baseline gap-5">
          <a
            href={`/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
          >
            View post ↗
          </a>
          <a
            href="/admin/posts"
            className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
          >
            ← Back to posts
          </a>
        </div>
      </div>
      <p className="mt-1 font-mono text-xs text-[var(--color-ink-mute)]">/{post.slug}</p>
      <div className="mt-8">
        <EditPostForm post={post} categories={categories} authors={authors} />
      </div>
    </div>
  );
}
