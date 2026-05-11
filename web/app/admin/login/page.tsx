import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in · Admin · LandonBuford.com',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await verifySession();
  if (session) redirect('/admin/new');

  return (
    <div className="mx-auto max-w-md px-4 pt-24 sm:px-6">
      <h1 className="font-serif text-3xl tracking-tight">Admin sign-in</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-mute)]">
        Authorized publishers only.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
