'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

interface IndexEntry {
  s: string; // slug
  t: string; // title
  e: string; // excerpt
  a: string; // author
  c: string | null; // category
  d: string; // publishedAt
}

export function SearchClient() {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/search-index', { cache: 'force-cache' });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as IndexEntry[];
        if (!cancelled) setIndex(data);
      } catch (e) {
        if (!cancelled)
          setLoadError(e instanceof Error ? e.message : 'failed to load index');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    if (!index) return [];
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const scored: { entry: IndexEntry; score: number }[] = [];
    for (const e of index) {
      const hay = `${e.t} ${e.e} ${e.a} ${e.c ?? ''}`.toLowerCase();
      let score = 0;
      let allMatch = true;
      for (const t of terms) {
        const idx = hay.indexOf(t);
        if (idx === -1) {
          allMatch = false;
          break;
        }
        // Title matches score higher than excerpt matches
        const titleHit = e.t.toLowerCase().indexOf(t);
        score += titleHit !== -1 ? 10 - Math.min(titleHit, 5) : 1;
      }
      if (allMatch) scored.push({ entry: e, score });
    }
    scored.sort((a, b) => b.score - a.score || b.entry.d.localeCompare(a.entry.d));
    return scored.slice(0, 50);
  }, [query, index]);

  return (
    <div>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          index
            ? `Search across ${index.length.toLocaleString()} stories...`
            : 'Loading...'
        }
        disabled={!index}
        className="w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-card)] px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
      />

      {loadError && (
        <p className="mt-4 text-sm text-[var(--color-accent)]">
          Search index failed to load: {loadError}
        </p>
      )}

      {query.trim().length >= 2 && results.length === 0 && index && (
        <p className="mt-6 text-sm text-[var(--color-ink-mute)]">
          No results for “{query}”.
        </p>
      )}

      {results.length > 0 && (
        <p className="mt-6 text-xs text-[var(--color-ink-mute)]">
          {results.length} result{results.length === 1 ? '' : 's'}
        </p>
      )}

      <ul className="mt-6 space-y-7">
        {results.map(({ entry }) => (
          <li key={entry.s} className="border-b border-[var(--color-line)] pb-6">
            {entry.c && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                {entry.c}
              </span>
            )}
            <Link
              href={`/${entry.s}`}
              className="mt-1 block font-serif text-xl tracking-tight hover:text-[var(--color-accent)]"
            >
              {entry.t}
            </Link>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{entry.e}</p>
            <div className="mt-2 text-xs text-[var(--color-ink-mute)]">
              {entry.a} · {new Date(entry.d).toUTCString().slice(5, 16)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
