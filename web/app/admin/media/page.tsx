import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { listMedia } from '@/lib/admin/media-list';
import { MediaGrid } from './media-grid';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const session = await verifySession();
  if (!session) redirect('/admin/login');

  let items: Awaited<ReturnType<typeof listMedia>> = [];
  let error: string | null = null;
  try {
    items = await listMedia();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load media.';
  }

  return (
    <div className="mx-auto max-w-[var(--container-page)] px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Media</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-mute)]">
          {error
            ? 'Could not load media.'
            : `${items.length.toLocaleString()} ${
                items.length === 1 ? 'image' : 'images'
              } uploaded across all posts.`}
        </p>
      </div>

      {error ? (
        <div className="mt-8 rounded-lg border border-[var(--color-line)] bg-[var(--color-card)] p-6 text-sm text-[var(--color-accent)]">
          {error}
        </div>
      ) : (
        <MediaGrid items={items} />
      )}
    </div>
  );
}
