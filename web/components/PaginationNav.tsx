import Link from 'next/link';

interface PaginationNavProps {
  baseHref: string;
  page: number;
  totalPages: number;
}

export function PaginationNav({ baseHref, page, totalPages }: PaginationNavProps) {
  if (totalPages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  const link = (n: number) => (n === 1 ? baseHref : `${baseHref}?page=${n}`);

  return (
    <nav className="mt-16 flex items-center justify-between border-t border-[var(--color-line)] pt-8 text-sm">
      {prev ? (
        <Link
          href={link(prev)}
          className="font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
        >
          ← Newer
        </Link>
      ) : (
        <span aria-hidden />
      )}
      <span className="text-[var(--color-ink-mute)]">
        Page {page} of {totalPages}
      </span>
      {next ? (
        <Link
          href={link(next)}
          className="font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
        >
          Older →
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}
