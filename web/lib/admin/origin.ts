/**
 * Origin allowlist for admin POST endpoints.
 * Accepts the public site URL and the admin URL (each with its www / apex
 * sibling) plus localhost.
 */
export function isAllowedAdminOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  if (origin.startsWith('http://localhost')) return true;

  let got: URL;
  try {
    got = new URL(origin);
  } catch {
    return false;
  }
  const gotHost = got.host.replace(/^www\./, '');

  return [process.env.NEXT_PUBLIC_SITE_URL, process.env.ADMIN_URL].some((configured) => {
    if (!configured) return false;
    try {
      const expected = new URL(configured);
      return (
        got.protocol === expected.protocol && gotHost === expected.host.replace(/^www\./, '')
      );
    } catch {
      return false;
    }
  });
}
