import type { Metadata } from 'next';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with LandonBuford.com — story tips, partnership inquiries, and general feedback.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-[var(--container-page)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[var(--container-prose)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Contact
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">
          Get in touch
        </h1>
        <p className="mt-5 text-base leading-relaxed text-[var(--color-ink-soft)]">
          Story tips, partnership inquiries, corrections, or just a hello — send
          a note and we&apos;ll get back to you.
        </p>

        <div className="mt-10">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
