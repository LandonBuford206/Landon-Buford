/**
 * Origin allowlist for admin POST endpoints.
 * Accepts the configured SITE_URL plus its www / apex sibling and localhost.
 */
export function isAllowedAdminOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  if (origin.startsWith('http://localhost')) return true;

  const configured = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  if (!configured) return false;

  try {
    const expected = new URL(configured);
    const got = new URL(origin);
    if (got.protocol !== expected.protocol) return false;

    const expectedHost = expected.host.replace(/^www\./, '');
    const gotHost = got.host.replace(/^www\./, '');
    return expectedHost === gotHost;
  } catch {
    return false;
  }
}
