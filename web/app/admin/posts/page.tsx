import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { listPosts } from '@/lib/content';
import { DeleteButton } from './delete-button';

export const dynamic = 'force-dynamic';

const PER_PAGE = 30;

interface SearchParams {
  page?: string;
}

export default async function PostsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();
  if (!session) redirect('/admin/login');

  const { page: pageRaw } = await props.searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const { posts, totalPosts, totalPages } = await listPosts({ page, perPage: PER_PAGE });

  return (
    <div className="mx-auto max-w-[var(--container-page)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Posts</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-mute)]">
            {totalPosts.toLocaleString()} total · page {page} of {totalPages}
          </p>
        </div>
        <a
          href="/admin/new"
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          New post
        </a>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-line)] text-xs uppercase tracking-wider text-[var(--color-ink-mute)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr
                key={p.slug}
                className="border-b border-[var(--color-line)] last:border-b-0"
              >
                <td className="px-4 py-3">
                  <a
                    href={`/admin/edit/${p.slug}`}
                    className="font-medium hover:text-[var(--color-accent)]"
                  >
                    {p.title}
                  </a>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-ink-soft)]">
                  {p.primaryCategory?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-ink-mute)]">
                  {new Date(p.publishedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3 text-xs">
                    <a
                      href={`/admin/edit/${p.slug}`}
                      className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
                    >
                      Edit
                    </a>
                    <a
                      href={`/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
                    >
                      View
                    </a>
                    <DeleteButton slug={p.slug} title={p.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  return (
    <div className="mt-6 flex items-center justify-between text-sm">
      {page > 1 ? (
        <a
          href={`/admin/posts?page=${page - 1}`}
          className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
        >
          ← Newer
        </a>
      ) : (
        <span />
      )}
      <span className="text-xs text-[var(--color-ink-mute)]">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <a
          href={`/admin/posts?page=${page + 1}`}
          className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
        >
          Older →
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}
