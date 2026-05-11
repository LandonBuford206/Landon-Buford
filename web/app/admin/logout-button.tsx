'use client';

import { useState } from 'react';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.assign('/admin/login');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="text-xs text-[var(--color-ink-mute)] hover:text-[var(--color-accent)] disabled:opacity-50"
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
