import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { NewPostEditor } from './new-post-editor';

export const dynamic = 'force-dynamic';

interface CategoryRecord {
  slug: string;
  name: string;
}

interface AuthorRecord {
  slug: string;
  displayName: string;
}

export default async function NewPostPage() {
  const session = await verifySession();
  if (!session) redirect('/admin/login');

  const dataDir = join(process.cwd(), 'data');
  const [categoriesRaw, authorsRaw] = await Promise.all([
    readFile(join(dataDir, 'categories.json'), 'utf8'),
    readFile(join(dataDir, 'authors.json'), 'utf8'),
  ]);
  const categories = JSON.parse(categoriesRaw) as CategoryRecord[];
  const authors = JSON.parse(authorsRaw) as AuthorRecord[];

  return (
    <div className="mx-auto max-w-[var(--container-page)] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl tracking-tight">New post</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-mute)]">
        Paste your raw text. The AI formats it; you preview and publish.
      </p>
      <div className="mt-8">
        <NewPostEditor categories={categories} authors={authors} />
      </div>
    </div>
  );
}
