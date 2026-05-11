'use client';

import { useState } from 'react';

interface Category {
  slug: string;
  name: string;
}

interface FormattedPost {
  title: string;
  slug: string;
  excerpt: string;
  htmlContent: string;
  categorySlug: string;
  tags: { slug: string; name: string }[];
}

interface PublishResult {
  slug: string;
  url: string;
  commitSha: string;
  branch: string;
}

type Stage = 'idle' | 'formatting' | 'preview' | 'publishing' | 'done';

export function NewPostEditor({ categories }: { categories: Category[] }) {
  const [rawText, setRawText] = useState('');
  const [seedTitle, setSeedTitle] = useState('');
  const [formatted, setFormatted] = useState<FormattedPost | null>(null);
  const [publishedAt, setPublishedAt] = useState<string>(toLocalInputValue(new Date()));
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishResult | null>(null);

  async function handleFormat() {
    setError(null);
    setStage('formatting');
    try {
      const res = await fetch('/api/admin/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, title: seedTitle || undefined }),
      });
      const data = (await res.json()) as
        | { ok: true; formatted: FormattedPost }
        | { ok: false; error: string };
      if (!data.ok) {
        setError(data.error);
        setStage('idle');
        return;
      }
      setFormatted(data.formatted);
      setStage('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Format failed.');
      setStage('idle');
    }
  }

  async function handlePublish() {
    if (!formatted) return;
    setError(null);
    setStage('publishing');
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formatted,
          publishedAt: new Date(publishedAt).toISOString(),
        }),
      });
      const data = (await res.json()) as
        | { ok: true; slug: string; url: string; commitSha: string; branch: string }
        | { ok: false; error: string };
      if (!data.ok) {
        setError(data.error);
        setStage('preview');
        return;
      }
      setPublished({
        slug: data.slug,
        url: data.url,
        commitSha: data.commitSha,
        branch: data.branch,
      });
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed.');
      setStage('preview');
    }
  }

  if (stage === 'done' && published) {
    return (
      <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-card)] p-6">
        <h2 className="font-serif text-2xl">Published.</h2>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          Commit <code className="text-xs">{published.commitSha.slice(0, 7)}</code>{' '}
          landed on <code className="text-xs">{published.branch}</code>. Your post will
          be live at{' '}
          <a href={published.url} className="text-[var(--color-accent)] underline">
            {published.url}
          </a>{' '}
          in ~60–120 seconds (after Vercel finishes deploying).
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setRawText('');
              setSeedTitle('');
              setFormatted(null);
              setPublished(null);
              setStage('idle');
              setPublishedAt(toLocalInputValue(new Date()));
            }}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Write another
          </button>
          <a
            href={published.url}
            className="rounded-md border border-[var(--color-line-strong)] px-4 py-2 text-sm hover:border-[var(--color-accent)]"
          >
            Open URL
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: input */}
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Title (optional — AI generates one if blank)</span>
          <input
            type="text"
            value={seedTitle}
            onChange={(e) => setSeedTitle(e.target.value)}
            disabled={stage === 'formatting' || stage === 'publishing'}
            className="mt-1 w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-card)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Raw article text</span>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={stage === 'formatting' || stage === 'publishing'}
            rows={20}
            placeholder="Paste your article here. The AI will format it; you preview and publish."
            className="mt-1 w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-card)] px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
          />
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleFormat}
            disabled={!rawText.trim() || stage === 'formatting' || stage === 'publishing'}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {stage === 'formatting'
              ? 'Formatting…'
              : formatted
                ? 'Regenerate'
                : 'Format with AI'}
          </button>
          {formatted && (
            <span className="text-xs text-[var(--color-ink-mute)]">
              Edit text or title above and click Regenerate to re-run.
            </span>
          )}
        </div>
        {error && <p className="text-sm text-[var(--color-accent)]">{error}</p>}
      </div>

      {/* Right: preview / metadata */}
      <div className="space-y-4">
        {!formatted && (
          <div className="rounded-lg border border-dashed border-[var(--color-line)] bg-[var(--color-card)] p-8 text-center text-sm text-[var(--color-ink-mute)]">
            Preview will appear here after formatting.
          </div>
        )}
        {formatted && (
          <>
            <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-card)] p-4">
              <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
                Title
              </label>
              <input
                type="text"
                value={formatted.title}
                onChange={(e) =>
                  setFormatted({ ...formatted, title: e.target.value })
                }
                className="mt-1 w-full border-b border-[var(--color-line)] bg-transparent py-1 font-serif text-2xl tracking-tight outline-none focus:border-[var(--color-accent)]"
              />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formatted.slug}
                    onChange={(e) =>
                      setFormatted({ ...formatted, slug: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-[var(--color-line)] bg-transparent px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
                    Category
                  </label>
                  <select
                    value={formatted.categorySlug}
                    onChange={(e) =>
                      setFormatted({ ...formatted, categorySlug: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-[var(--color-line)] bg-transparent px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
                  Excerpt
                </label>
                <textarea
                  value={formatted.excerpt}
                  onChange={(e) =>
                    setFormatted({ ...formatted, excerpt: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full rounded border border-[var(--color-line)] bg-transparent px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
                />
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
                  Tags
                </label>
                <p className="mt-1 text-xs text-[var(--color-ink-mute)]">
                  {formatted.tags.map((t) => t.name).join(', ')}
                </p>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
                  Publish date
                </label>
                <input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="mt-1 rounded border border-[var(--color-line)] bg-transparent px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>

            <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-card)] p-6">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
                Body preview
              </span>
              <div
                className="prose prose-lg mt-3 max-w-none"
                dangerouslySetInnerHTML={{ __html: formatted.htmlContent }}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handlePublish}
                disabled={stage === 'publishing'}
                className="rounded-md bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {stage === 'publishing' ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
