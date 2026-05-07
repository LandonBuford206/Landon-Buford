import Link from 'next/link';
import { getCategoriesWithCounts } from '@/lib/content';

export async function SiteHeader() {
  const cats = await getCategoriesWithCounts();
  const navCats = cats.slice(0, 6);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-paper)]/80">
      <div className="mx-auto flex w-full max-w-[var(--container-page)] items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-xl font-semibold tracking-tight md:text-2xl">
            Landon<span className="text-[var(--color-accent)]">Buford</span>
            <span className="text-[var(--color-ink-mute)]">.com</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {navCats.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="text-sm font-medium text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            aria-label="Search"
            className="rounded-md p-2 text-[var(--color-ink-soft)] transition hover:bg-[var(--color-line)] hover:text-[var(--color-ink)]"
          >
            <SearchIcon />
          </Link>
          <Link
            href="/feed.xml"
            aria-label="RSS feed"
            className="hidden rounded-md p-2 text-[var(--color-ink-soft)] transition hover:bg-[var(--color-line)] hover:text-[var(--color-ink)] sm:inline-flex"
          >
            <RssIcon />
          </Link>
        </div>
      </div>

      <nav className="border-t border-[var(--color-line)] md:hidden">
        <div className="mx-auto flex w-full max-w-[var(--container-page)] gap-4 overflow-x-auto px-4 py-2 text-sm">
          {navCats.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="whitespace-nowrap text-[var(--color-ink-soft)]"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function RssIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  );
}
