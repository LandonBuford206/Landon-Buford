import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-32 text-center sm:px-6">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
        404
      </span>
      <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-base text-[var(--color-ink-soft)]">
        The story you’re looking for may have moved, been retitled, or never existed.
        Try searching the archive instead.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-md bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-accent-ink)] hover:opacity-90"
        >
          Go home
        </Link>
        <Link
          href="/search"
          className="rounded-md border border-[var(--color-line-strong)] px-5 py-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          Search
        </Link>
      </div>
    </div>
  );
}
