import { deleteSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  await deleteSession();
  return Response.json({ ok: true });
}
