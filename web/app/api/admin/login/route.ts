import { timingSafeEqual } from 'node:crypto';
import { createSession } from '@/lib/session';
import { isAllowedAdminOrigin } from '@/lib/admin/origin';

export const runtime = 'nodejs';

interface LoginPayload {
  password?: string;
}

function timingSafeStringEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  if (!isAllowedAdminOrigin(req)) {
    return Response.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
  }

  let body: LoginPayload;
  try {
    body = (await req.json()) as LoginPayload;
  } catch {
    return Response.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const submitted = body.password ?? '';
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    console.error('Admin login: ADMIN_PASSWORD is not set.');
    return Response.json(
      { ok: false, error: 'Admin login is not configured.' },
      { status: 503 }
    );
  }

  if (!timingSafeStringEq(submitted, expected)) {
    return Response.json({ ok: false, error: 'Incorrect password.' }, { status: 401 });
  }

  await createSession();
  return Response.json({ ok: true });
}
