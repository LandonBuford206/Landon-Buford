/** Small formatting helpers shared across components. */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatDateShort(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;
}

/**
 * Returns a renderable image src — only trusts recovered paths (localPath
 * or CDN blobUrl). The originalUrl is intentionally NOT used as a fallback
 * because the original WordPress host is dead; serving those URLs would
 * produce broken-image icons.
 *
 * When images are restored (recovery script writes localPath / blobUrl),
 * they automatically light up here.
 */
export function resolveImageSrc(
  hero: { originalUrl?: string; localPath?: string; blobUrl?: string } | null | undefined
): string | null {
  if (!hero) return null;
  return hero.blobUrl || hero.localPath || null;
}
