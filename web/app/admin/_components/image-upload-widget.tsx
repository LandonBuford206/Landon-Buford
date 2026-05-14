'use client';

import { useRef, useState } from 'react';

interface UploadResult {
  path: string;
  bytes: number;
  mime: string;
}

interface Props {
  slug: string;
  onInsertHtml: (html: string) => void;
  onSetAsHero?: (args: { path: string; alt: string }) => void;
}

export function ImageUploadWidget({ slug, onInsertHtml, onSetAsHero }: Props) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slugMissing = !slug;

  async function doUpload(file: File) {
    if (slugMissing) {
      setError('Save a slug first so we know where to put the file.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('slug', slug);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as
        | { ok: true; path: string; bytes: number; mime: string }
        | { ok: false; error: string };
      if (!data.ok) setError(data.error);
      else setResult({ path: data.path, bytes: data.bytes, mime: data.mime });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setBusy(false);
    }
  }

  async function doRehost() {
    if (slugMissing) {
      setError('Save a slug first so we know where to put the file.');
      return;
    }
    if (!url.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), slug }),
      });
      const data = (await res.json()) as
        | { ok: true; path: string; bytes: number; mime: string }
        | { ok: false; error: string };
      if (!data.ok) setError(data.error);
      else setResult({ path: data.path, bytes: data.bytes, mime: data.mime });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setBusy(false);
    }
  }

  function handleInsert() {
    if (!result) return;
    const safeAlt = alt.replace(/"/g, '&quot;');
    onInsertHtml(`<img src="${result.path}" alt="${safeAlt}" />`);
    reset();
  }

  function handleHero() {
    if (!result || !onSetAsHero) return;
    onSetAsHero({ path: result.path, alt });
    reset();
  }

  function reset() {
    setResult(null);
    setUrl('');
    setAlt('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
          Add image
        </span>
        <div className="flex gap-1 rounded-md border border-[var(--color-line)] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`rounded px-2 py-1 ${
              mode === 'upload'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`rounded px-2 py-1 ${
              mode === 'url'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            From URL
          </button>
        </div>
      </div>

      {slugMissing && (
        <p className="mt-2 text-xs text-[var(--color-accent)]">
          A slug is required before uploading.
        </p>
      )}

      {!result && mode === 'upload' && (
        <div className="mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={busy || slugMissing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doUpload(f);
            }}
            className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:opacity-90 disabled:opacity-50"
          />
          <p className="mt-1 text-[10px] text-[var(--color-ink-mute)]">
            JPEG, PNG, WebP, or GIF — max 5 MB.
          </p>
        </div>
      )}

      {!result && mode === 'url' && (
        <div className="mt-3 space-y-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy || slugMissing}
            placeholder="https://example.com/photo.jpg"
            className="block w-full rounded border border-[var(--color-line-strong)] bg-transparent px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void doRehost()}
            disabled={busy || !url.trim() || slugMissing}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Fetching…' : 'Rehost'}
          </button>
          <p className="text-[10px] text-[var(--color-ink-mute)]">
            We download the image once and commit it to our repo — links don&apos;t rot later.
          </p>
        </div>
      )}

      {busy && !result && (
        <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
          {mode === 'url' ? 'Fetching and committing…' : 'Uploading and committing…'}
        </p>
      )}

      {error && <p className="mt-2 text-xs text-[var(--color-accent)]">{error}</p>}

      {result && (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.path}
              alt=""
              className="h-20 w-20 rounded border border-[var(--color-line)] object-cover"
            />
            <div className="flex-1 text-xs">
              <p className="break-all font-mono text-[var(--color-ink-soft)]">{result.path}</p>
              <p className="mt-1 text-[var(--color-ink-mute)]">
                {(result.bytes / 1024).toFixed(0)} KB · {result.mime}
              </p>
            </div>
          </div>
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
              Alt text (recommended)
            </span>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image briefly"
              className="mt-1 block w-full rounded border border-[var(--color-line)] bg-transparent px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleInsert}
              className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Insert into body
            </button>
            {onSetAsHero && (
              <button
                type="button"
                onClick={handleHero}
                className="rounded-md border border-[var(--color-line-strong)] px-3 py-1.5 text-xs hover:border-[var(--color-accent)]"
              >
                Set as hero
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-md px-3 py-1.5 text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
