import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { notFound, redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { getPost } from '@/lib/content';
import { EditPostForm } from './edit-post-form';

export const dynamic = 'force-dynamic';

interface CategoryRecord {
  slug: string;
  name: string;
}

export default async function EditPostPage(props: { params: Promise<{ slug: string }> }) {
  const session = await verifySession();
  if (!session) redirect('/admin/login');

  const { slug } = await props.params;
  const post = await getPost(slug);
  if (!post) notFound();

  const categoriesRaw = await readFile(
    join(process.cwd(), 'data', 'categories.json'),
    'utf8'
  );
  const categories = JSON.parse(categoriesRaw) as CategoryRecord[];

  return (
    <div className="mx-auto max-w-[var(--container-page)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl tracking-tight">Edit post</h1>
        <a
          href="/admin/posts"
          className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
        >
          ← Back to posts
        </a>
      </div>
      <p className="mt-1 font-mono text-xs text-[var(--color-ink-mute)]">/{post.slug}</p>
      <div className="mt-8">
        <EditPostForm post={post} categories={categories} />
      </div>
    </div>
  );
}
