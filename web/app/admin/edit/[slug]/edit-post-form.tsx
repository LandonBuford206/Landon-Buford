'use client';

import { useState } from 'react';
import type { PostFull } from '@/lib/content';

interface Category {
  slug: string;
  name: string;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function EditPostForm({
  post,
  categories,
}: {
  post: PostFull;
  categories: Category[];
}) {
  const [title, setTitle] = useState(post.title);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [htmlContent, setHtmlContent] = useState(post.htmlContent);
  const [categorySlug, setCategorySlug] = useState(
    post.categories[0]?.slug ?? 'general'
  );
  const [tagsText, setTagsText] = useState(
    post.tags.map((t) => t.name).join(', ')
  );
  const [publishedAt, setPublishedAt] = useState(toLocalInputValue(post.publishedAt));
  const [busy, setBusy] = useState<null | 'save' | 'delete'>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSavedAt(null);
    setBusy('save');
    try {
      const res = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: post.slug,
          title,
          excerpt,
          htmlContent,
          categorySlug,
          tagNames: tagsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          publishedAt: new Date(publishedAt).toISOString(),
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error || 'Save failed.');
        setBusy(null);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
      setBusy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${post.title}"? This commits a removal to the repo and can't be undone from the admin.`)) {
      return;
    }
    setError(null);
    setBusy('delete');
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: post.slug }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error || 'Delete failed.');
        setBusy(null);
        return;
      }
      window.location.assign('/admin/posts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
      setBusy(null);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-card)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50';
  const disabled = busy !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Category</span>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              disabled={disabled}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Publish date</span>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Tags (comma-separated)</span>
          <input
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            disabled={disabled}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Excerpt</span>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            disabled={disabled}
            rows={3}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Body (raw HTML)</span>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            disabled={disabled}
            rows={22}
            className={`${inputClass} font-mono text-xs`}
          />
        </label>

        {error && <p className="text-sm text-[var(--color-accent)]">{error}</p>}
        {savedAt && (
          <p className="text-sm text-[var(--color-ink-soft)]">
            Saved at {savedAt}. Live in ~60–120 seconds (Vercel redeploy).
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            className="rounded-md bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy === 'save' ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={disabled}
            className="text-sm text-[var(--color-accent)] underline hover:opacity-80 disabled:opacity-50"
          >
            {busy === 'delete' ? 'Deleting…' : 'Delete this post'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div>
        <div className="sticky top-6 rounded-lg border border-[var(--color-line)] bg-[var(--color-card)] p-6">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
            Preview
          </span>
          <h2 className="mt-3 font-serif text-2xl tracking-tight">{title}</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-mute)]">
            {excerpt}
          </p>
          <div
            className="prose prose-lg mt-6 max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
}
