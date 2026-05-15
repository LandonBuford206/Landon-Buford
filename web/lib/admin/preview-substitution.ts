// Rewrites <img src="..."> in HTML so that paths committed but not yet deployed
// (e.g. /uploads/{year}/{slug}/{file}) render with a local blob/source URL in
// the editor's live preview. Only used at preview-render time — the underlying
// htmlContent state still carries the committed path and is what gets saved.

const IMG_SRC_PATTERN = /(<img\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi;

export function applyPreviewMap(
  html: string,
  map: Record<string, string>
): string {
  if (!html || Object.keys(map).length === 0) return html;
  return html.replace(IMG_SRC_PATTERN, (full, prefix, quote, src) => {
    const replacement = map[src];
    return replacement ? `${prefix}${quote}${replacement}${quote}` : full;
  });
}
