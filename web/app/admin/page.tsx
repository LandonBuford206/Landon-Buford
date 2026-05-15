import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminIndexPage() {
  const session = await verifySession();
  if (session) redirect('/admin/new');
  redirect('/admin/login');
}
