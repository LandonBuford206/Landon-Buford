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

export default async function NewPostPage() {
  const session = await verifySession();
  if (!session) redirect('/admin/login');

  const categoriesRaw = await readFile(
    join(process.cwd(), 'data', 'categories.json'),
    'utf8'
  );
  const categories = JSON.parse(categoriesRaw) as CategoryRecord[];

  return (
    <div className="mx-auto max-w-[var(--container-page)] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl tracking-tight">New post</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-mute)]">
        Paste your raw text. The AI formats it; you preview and publish.
      </p>
      <div className="mt-8">
        <NewPostEditor categories={categories} />
      </div>
    </div>
  );
}
