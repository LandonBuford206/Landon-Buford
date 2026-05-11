'use client';

import { useState } from 'react';

export function DeleteButton({ slug, title }: { slug: string; title: string }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    if (!confirm(`Delete "${title}"? This commits a removal to the repo and can't be undone from the admin.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        alert(data.error || 'Delete failed.');
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Network error.');
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="text-[var(--color-accent)] hover:underline disabled:opacity-50"
    >
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  );
}
