import type { Metadata } from 'next';
import { SearchClient } from './SearchClient';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search the LandonBuford.com archive.',
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-[var(--container-page)] px-4 pt-12 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">Search</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-mute)]">
          Search across the entire LandonBuford.com archive.
        </p>
      </header>
      <SearchClient />
    </div>
  );
}
