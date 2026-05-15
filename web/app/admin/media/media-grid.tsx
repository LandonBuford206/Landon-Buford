'use client';

import { useMemo, useState } from 'react';

interface MediaItem {
  publicUrl: string;
  slug: string;
  year: string;
  filename: string;
  size: number;
}

export function MediaGrid({ items: initialItems }: { items: MediaItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.slug.toLowerCase().includes(q) ||
        i.filename.toLowerCase().includes(q)
    );
  }, [items, query]);

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  async function deleteItem(item: MediaItem) {
    if (
      !confirm(
        `Delete ${item.filename} from the repo? Posts that reference it will show a broken image.`
      )
    ) {
      return;
    }
    setDeleteError(null);
    setDeleting(item.publicUrl);
    try {
      const res = await fetch('/api/admin/delete-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicUrl: item.publicUrl }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setDeleteError(data.error || 'Delete failed.');
        setDeleting(null);
        return;
      }
      setItems((prev) => prev.filter((i) => i.publicUrl !== item.publicUrl));
      setDeleting(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Network error.');
      setDeleting(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-[var(--color-line)] bg-[var(--color-card)] p-12 text-center text-sm text-[var(--color-ink-mute)]">
        No images uploaded yet. Upload images from the new post or edit post pages.
      </div>
    );
  }

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by post slug or filename"
        className="mt-6 w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-card)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      />
      {deleteError && (
        <p className="mt-3 text-sm text-[var(--color-accent)]">{deleteError}</p>
      )}
      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--color-ink-mute)]">
          No matches for &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const htmlSnippet = `<img src="${item.publicUrl}" alt="" />`;
            const urlKey = `url:${item.publicUrl}`;
            const htmlKey = `html:${item.publicUrl}`;
            return (
              <div
                key={item.publicUrl}
                className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-card)]"
              >
                <a
                  href={item.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-[4/3] bg-[var(--color-page)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.publicUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </a>
                <div className="space-y-2 p-3 text-xs">
                  <p
                    className="break-all font-mono text-[var(--color-ink-soft)]"
                    title={item.filename}
                  >
                    {item.filename}
                  </p>
                  <a
                    href={`/admin/edit/${item.slug}`}
                    className="block break-all text-[var(--color-ink-mute)] hover:text-[var(--color-accent)]"
                  >
                    /{item.slug}
                  </a>
                  <p className="text-[10px] text-[var(--color-ink-mute)]">
                    {item.year} · {(item.size / 1024).toFixed(0)} KB
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => copy(item.publicUrl, urlKey)}
                      className="rounded border border-[var(--color-line-strong)] px-2 py-1 transition hover:border-[var(--color-accent)]"
                    >
                      {copied === urlKey ? 'Copied' : 'Copy URL'}
                    </button>
                    <button
                      type="button"
                      onClick={() => copy(htmlSnippet, htmlKey)}
                      className="rounded border border-[var(--color-line-strong)] px-2 py-1 transition hover:border-[var(--color-accent)]"
                    >
                      {copied === htmlKey ? 'Copied' : 'Copy <img>'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(item)}
                      disabled={deleting === item.publicUrl}
                      className="ml-auto rounded border border-transparent px-2 py-1 text-[var(--color-accent)] transition hover:border-[var(--color-accent)] disabled:opacity-50"
                    >
                      {deleting === item.publicUrl ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
