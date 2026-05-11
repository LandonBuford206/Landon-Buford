import type { Metadata } from 'next';
import Link from 'next/link';
import { LogoutButton } from './logout-button';

export const metadata: Metadata = {
  title: 'Admin · LandonBuford.com',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-page)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-card)]">
        <div className="mx-auto flex max-w-[var(--container-page)] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/admin/new"
              className="font-serif text-lg tracking-tight"
            >
              LandonBuford <span className="text-[var(--color-accent)]">Admin</span>
            </Link>
            <nav className="flex gap-4 text-sm text-[var(--color-ink-soft)]">
              <Link href="/admin/new" className="hover:text-[var(--color-accent)]">
                New post
              </Link>
              <Link href="/" className="hover:text-[var(--color-accent)]">
                View site
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

