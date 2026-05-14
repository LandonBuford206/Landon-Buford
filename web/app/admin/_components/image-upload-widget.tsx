'use client';

import { useRef, useState } from 'react';

interface UploadResult {
  path: string;
  bytes: number;
  mime: string;
}

interface Props {
  slug: string;
}

type Mode = 'file' | 'url';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function ImageUploadWidget({ slug }: Props) {
  const [mode, setMode] = useState<Mode>('file');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [copied, setCopied] = useState<'url' | 'html' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slugMissing = !slug;

  async function doUpload(file: File) {
    if (slugMissing) {
      setError('A slug is required before uploading.');
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
      setError('A slug is required before uploading.');
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

  function reset() {
    setResult(null);
    setUrl('');
    setAlt('');
    setError(null);
    setCopied(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void doUpload(file);
  }

  async function copyText(kind: 'url' | 'html', text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
    } catch {
      setError('Could not copy — your browser blocked clipboard access.');
    }
  }

  const filename = result ? result.path.split('/').pop() ?? result.path : null;
  const htmlSnippet = result
    ? `<img src="${result.path}" alt="${alt.replace(/"/g, '&quot;')}" />`
    : '';

  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      {!result && (
        <div className="flex w-fit gap-1 rounded-md border border-[var(--color-line)] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`rounded px-3 py-1 transition ${
              mode === 'file'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            Upload file
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`rounded px-3 py-1 transition ${
              mode === 'url'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            Use URL
          </button>
        </div>
      )}

      {slugMissing && !result && (
        <p className="mt-3 text-xs text-[var(--color-accent)]">
          A slug is required before uploading.
        </p>
      )}

      {!result && mode === 'file' && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy && !slugMissing) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            disabled={busy || slugMissing}
            className={`flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-8 text-center transition ${
              dragOver
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                : 'border-[var(--color-line-strong)] hover:border-[var(--color-accent)]'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <PictureIcon className="h-8 w-8 text-[var(--color-ink-mute)]" />
            <span className="mt-2 text-sm text-[var(--color-ink-soft)]">
              {busy ? (
                'Uploading…'
              ) : (
                <>
                  Drag an image here, or{' '}
                  <span className="font-medium text-[var(--color-accent)] underline">
                    choose image
                  </span>
                </>
              )}
            </span>
            <span className="mt-1 text-[10px] text-[var(--color-ink-mute)]">
              JPEG, PNG, WebP, or GIF · max 5 MB
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            disabled={busy || slugMissing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doUpload(f);
            }}
            className="hidden"
          />
        </div>
      )}

      {!result && mode === 'url' && (
        <div className="mt-3 space-y-2">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
            Image URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy || slugMissing}
              placeholder="https://example.com/photo.jpg"
              className="block w-full rounded border border-[var(--color-line-strong)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void doRehost()}
              disabled={busy || !url.trim() || slugMissing}
              className="shrink-0 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Fetching…' : 'Use image'}
            </button>
          </div>
          <p className="text-[10px] text-[var(--color-ink-mute)]">
            We rehost the image into our repo so the link can&apos;t rot later.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-[var(--color-accent)]">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.path}
              alt=""
              className="h-20 w-20 shrink-0 rounded border border-[var(--color-line)] object-cover"
            />
            <div className="flex-1 text-xs">
              <p className="break-all font-mono text-[var(--color-ink-soft)]">{filename}</p>
              <p className="mt-1 text-[var(--color-ink-mute)]">
                {(result.bytes / 1024).toFixed(0)} KB · {result.mime.replace('image/', '')}
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
              className="mt-1 block w-full rounded border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </label>

          <CopyField
            label="Image URL"
            value={result.path}
            copied={copied === 'url'}
            onCopy={() => copyText('url', result.path)}
          />
          <CopyField
            label={'HTML <img> tag'}
            value={htmlSnippet}
            copied={copied === 'html'}
            onCopy={() => copyText('html', htmlSnippet)}
          />

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={reset}
              className="text-xs text-[var(--color-ink-soft)] underline hover:text-[var(--color-ink)]"
            >
              Upload another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyField({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
        {label}
      </span>
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={value}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          className="block w-full rounded border border-[var(--color-line)] bg-transparent px-2 py-1.5 font-mono text-[11px] outline-none"
        />
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md border border-[var(--color-line-strong)] px-3 py-1.5 text-xs hover:border-[var(--color-accent)]"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function PictureIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
