'use client';

import { useState } from 'react';

interface NewsletterEmbedProps {
  variant?: 'inline' | 'footer';
}

/**
 * Newsletter capture. Posts to whatever endpoint is configured via
 * NEXT_PUBLIC_NEWSLETTER_ENDPOINT (Beehiiv / ConvertKit / Substack — all
 * accept a simple form post). Renders nothing if no endpoint is set,
 * so we never silently drop submissions on a fake-success placeholder.
 */
export function NewsletterEmbed({ variant = 'inline' }: NewsletterEmbedProps) {
  const endpoint = process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT;
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'ok' | 'err'>('idle');

  if (!endpoint) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('submitting');
    try {
      const fd = new FormData();
      fd.append('email', email);
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      setState(res.ok ? 'ok' : 'err');
    } catch {
      setState('err');
    }
  }

  const wrapperClass =
    variant === 'footer'
      ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
      : 'bg-[var(--color-card)] border border-[var(--color-line)]';

  return (
    <section className={`rounded-lg p-6 sm:p-8 ${wrapperClass}`}>
      <h3 className="font-serif text-2xl tracking-tight md:text-3xl">
        Where sports and business intersect.
      </h3>
      <p
        className={`mt-2 text-sm md:text-base ${
          variant === 'footer' ? 'text-[var(--color-line)]' : 'text-[var(--color-ink-soft)]'
        }`}
      >
        Get the latest from LandonBuford.com in your inbox.
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`nl-${variant}`} className="sr-only">
          Email address
        </label>
        <input
          id={`nl-${variant}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`flex-1 rounded-md border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${
            variant === 'footer'
              ? 'border-[var(--color-ink-soft)] bg-[var(--color-ink)] text-[var(--color-paper)] placeholder:text-[var(--color-ink-mute)]'
              : 'border-[var(--color-line-strong)] bg-[var(--color-paper)]'
          }`}
        />
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="rounded-md bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-accent-ink)] transition hover:opacity-90 disabled:opacity-50"
        >
          {state === 'submitting' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {state === 'ok' && (
        <p className="mt-3 text-sm text-[var(--color-accent)]">Thanks — check your inbox.</p>
      )}
      {state === 'err' && (
        <p className="mt-3 text-sm text-[var(--color-accent)]">
          Something went wrong. Please try again.
        </p>
      )}
    </section>
  );
}
