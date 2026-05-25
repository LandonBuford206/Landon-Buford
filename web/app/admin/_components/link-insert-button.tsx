'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Ref to the body textarea whose selection/caret we splice into. */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Current body HTML. */
  value: string;
  /** Setter for the body HTML. */
  onChange: (next: string) => void;
}

interface Selection {
  start: number;
  end: number;
  selectedText: string;
}

/** Leave well-formed/relative/scheme'd URLs alone; prepend https:// to bare hosts. */
function normalizeUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return url;
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url) || url.startsWith('//')) {
    return url;
  }
  return `https://${url}`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function LinkInsertButton({ textareaRef, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0, selectedText: '' });
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [newTab, setNewTab] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Focus the URL field when the panel opens.
  useEffect(() => {
    if (open) urlInputRef.current?.focus();
  }, [open]);

  // Capture the textarea selection BEFORE the button steals focus.
  function captureSelection() {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selectedText = value.slice(start, end);
    setSelection({ start, end, selectedText });
    setText(selectedText);
  }

  function toggleOpen() {
    if (open) {
      reset();
    } else {
      setOpen(true);
    }
  }

  function reset() {
    setOpen(false);
    setText('');
    setUrl('');
    setNewTab(false);
  }

  function handleInsert() {
    const href = normalizeUrl(url);
    const linkText = text.trim();
    if (!href || !linkText) return;

    const attrs = newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
    const anchor = `<a href="${escapeAttr(href)}"${attrs}>${escapeText(linkText)}</a>`;

    const { start, end } = selection;
    const next = value.slice(0, start) + anchor + value.slice(end);
    const caret = start + anchor.length;
    onChange(next);
    reset();
    // Restore focus + caret after the controlled textarea commits the new value.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(caret, caret);
      }
    });
  }

  const canInsert = url.trim().length > 0 && text.trim().length > 0;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        // onMouseDown fires before the textarea blurs, so the selection is still live.
        onMouseDown={captureSelection}
        onClick={toggleOpen}
        className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
      >
        <LinkIcon className="h-3.5 w-3.5" />
        Insert link
      </button>

      {open && (
        <div className="absolute left-0 z-10 mt-2 w-72 space-y-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-card)] p-3 shadow-lg">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
              Link text
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Text to display"
              className="mt-1 block w-full rounded border border-[var(--color-line-strong)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
            />
            {selection.selectedText && (
              <p className="mt-1 text-[10px] text-[var(--color-ink-mute)]">
                Wrapping your highlighted text.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-mute)]">
              URL
            </label>
            <input
              ref={urlInputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canInsert) {
                  e.preventDefault();
                  handleInsert();
                }
              }}
              placeholder="example.com or https://…"
              className="mt-1 block w-full rounded border border-[var(--color-line-strong)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
            <input
              type="checkbox"
              checked={newTab}
              onChange={(e) => setNewTab(e.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            Open in new tab
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-[var(--color-line-strong)] px-3 py-1.5 text-xs hover:border-[var(--color-accent)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsert}
              disabled={!canInsert}
              className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Insert link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkIcon({ className }: { className?: string }) {
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
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
