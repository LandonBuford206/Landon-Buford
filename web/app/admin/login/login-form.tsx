'use client';

import { useState } from 'react';

export function LoginForm() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error || 'Login failed.');
        setBusy(false);
        return;
      }
      window.location.assign('/admin/new');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-card)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </label>
      {error && (
        <p className="text-sm text-[var(--color-accent)]">{error}</p>
      )}
      <button
        type="submit"
        disabled={busy || !password}
        className="w-full rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
