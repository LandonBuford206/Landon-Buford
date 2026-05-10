'use client';

import { useState } from 'react';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      message: String(data.get('message') ?? ''),
      honeypot: String(data.get('company') ?? ''),
    };

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setStatus('error');
        setErrorMessage(json.error || 'Something went wrong. Please try again.');
        return;
      }
      setStatus('sent');
      form.reset();
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-paper-soft)] p-8 text-center">
        <p className="font-serif text-2xl tracking-tight">Message sent.</p>
        <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
          Thanks — we&apos;ll get back to you as soon as we can.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          autoComplete="name"
          className="mt-2 block w-full rounded-md border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={320}
          autoComplete="email"
          className="mt-2 block w-full rounded-md border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={7}
          className="mt-2 block w-full rounded-md border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
      </div>

      {/* Honeypot — hidden from real users; bots fill it and get silently dropped */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-[var(--color-accent)]" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex items-center justify-center rounded-md bg-[var(--color-ink)] px-6 py-3 text-sm font-semibold text-[var(--color-paper)] transition hover:bg-[var(--color-ink-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
