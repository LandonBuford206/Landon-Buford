import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifyToken } from '@/lib/session';

export const config = {
  // Everything except Next internals, API routes, and uploaded media (the
  // admin media grid shows /uploads/* straight from this deployment).
  matcher: ['/((?!_next/|api/|uploads/|favicon.ico).*)'],
};

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname !== '/admin' && !pathname.startsWith('/admin/')) {
    // ADMIN_ONLY=true on the Vercel deployment: the public site is served as
    // static files from SiteGround, so send visitors there. The bare admin
    // hostname goes to the dashboard.
    if (process.env.ADMIN_ONLY !== 'true') return NextResponse.next();
    if (pathname === '/') return NextResponse.redirect(new URL('/admin', request.url));
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://landonbuford.com';
    return NextResponse.redirect(new URL(pathname + search, site), 308);
  }

  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (session) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = '';
  return NextResponse.redirect(url);
}
