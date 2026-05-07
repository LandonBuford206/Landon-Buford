/**
 * Sanitize WordPress HTML for safe rendering.
 *
 * Strips:
 *   - <script>, <iframe>, <object>, <embed>, dangerous handlers
 *   - WP block comments (<!-- wp:paragraph --> etc.) so they don't appear as text
 *   - Empty paragraphs left over from WP shortcodes
 *   - <img> tags whose src is on a dead/external host (broken-image icons)
 *
 * Preserves:
 *   - Standard formatting tags, lists, blockquotes, tables
 *   - Anchor tags (with rel="noopener noreferrer" added for external)
 *   - Images whose src is a local recovered path (so images automatically
 *     reappear once the recovery script repopulates URLs)
 */

import sanitizeHtml from 'sanitize-html';

const WP_BLOCK_COMMENT = /<!--\s*\/?wp:[^>]*-->/g;
const EMPTY_PARAGRAPH = /<p>\s*(&nbsp;| )?\s*<\/p>/g;
const IMG_TAG = /<img\s+[^>]*?src=["']([^"']+)["'][^>]*?\/?>/gi;
const EMPTY_FIGURE =
  /<figure[^>]*>\s*(<figcaption[^>]*>[\s\S]*?<\/figcaption>)?\s*<\/figure>/gi;

/**
 * True for image URLs we trust to render — local recovered images or
 * future CDN-hosted ones. Everything else (the dead WP host, external
 * syndication URLs, IP-based legacy URLs) is stripped from article bodies
 * to avoid broken-image icons during the image-recovery transition.
 *
 * When images are restored later, the recovery script rewrites
 * originalUrl -> localPath in the post JSON; at that point images flow
 * through here automatically.
 */
function isRenderableImageSrc(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('/')) return true;
  if (src.startsWith('data:')) return true;
  return false;
}

function stripBrokenImages(html: string): string {
  const stripped = html.replace(IMG_TAG, (match, src: string) =>
    isRenderableImageSrc(src) ? match : ''
  );
  return stripped.replace(EMPTY_FIGURE, '');
}

export function cleanWordPressHtml(raw: string): string {
  if (!raw) return '';

  const pre = stripBrokenImages(
    raw.replace(WP_BLOCK_COMMENT, '').replace(EMPTY_PARAGRAPH, '')
  );

  const cleaned = sanitizeHtml(pre, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'b', 'em', 'i', 'u', 's', 'sup', 'sub', 'mark', 'small',
      'a', 'blockquote', 'pre', 'code',
      'ul', 'ol', 'li',
      'figure', 'figcaption', 'img', 'picture', 'source',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
      'span', 'div',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel', 'title'],
      img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
      source: ['src', 'srcset', 'type', 'media'],
      blockquote: ['cite'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
      '*': ['class', 'id'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: true,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
    },
    exclusiveFilter: (frame) => {
      if (
        frame.tag === 'p' &&
        (!frame.text || /^\s*$/.test(frame.text)) &&
        !frame.mediaChildren?.length
      ) {
        return true;
      }
      return false;
    },
  });

  return cleaned;
}

/** Strip ALL HTML — useful for plain-text excerpts and meta descriptions. */
export function htmlToText(raw: string): string {
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—');
}
