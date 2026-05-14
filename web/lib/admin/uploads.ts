import { createHash } from 'node:crypto';
import type { FileChange } from './github';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const FETCH_TIMEOUT_MS = 15_000;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const SAFE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

export function isSafePostSlug(slug: string): boolean {
  return SAFE_SLUG_PATTERN.test(slug);
}

export function extensionForMime(mime: string): string | null {
  return MIME_TO_EXT[mime] ?? null;
}

export function slugifyFilename(rawName: string): string {
  const withoutExt = rawName.replace(/\.[^./\\]+$/, '');
  const slug = withoutExt
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  return slug || 'image';
}

export class UploadValidationError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

export interface ImageBytes {
  bytes: Buffer;
  mime: string;
  originalName: string;
}

export function validateImage(image: ImageBytes): void {
  if (!ALLOWED_IMAGE_MIME.has(image.mime)) {
    throw new UploadValidationError(
      `Unsupported image type "${image.mime}". Allowed: JPEG, PNG, WebP, GIF.`
    );
  }
  if (image.bytes.length === 0) {
    throw new UploadValidationError('Image is empty.');
  }
  if (image.bytes.length > MAX_IMAGE_BYTES) {
    throw new UploadValidationError(
      `Image is ${(image.bytes.length / 1024 / 1024).toFixed(1)} MB; limit is ${
        MAX_IMAGE_BYTES / 1024 / 1024
      } MB.`,
      413
    );
  }
}

export interface UploadEntry {
  repoPath: string;
  publicUrl: string;
  fileChange: FileChange;
}

export function buildUploadEntry(args: {
  slug: string;
  image: ImageBytes;
  now?: Date;
}): UploadEntry {
  const { slug, image } = args;
  if (!isSafePostSlug(slug)) {
    throw new UploadValidationError('Invalid post slug for upload path.');
  }
  const ext = extensionForMime(image.mime);
  if (!ext) {
    throw new UploadValidationError(`Unsupported image type "${image.mime}".`);
  }

  const year = (args.now ?? new Date()).getUTCFullYear();
  const hash = createHash('sha1').update(image.bytes).digest('hex').slice(0, 6);
  const baseName = slugifyFilename(image.originalName);
  const filename = `${baseName}-${hash}.${ext}`;

  const publicUrl = `/uploads/${year}/${slug}/${filename}`;
  const repoPath = `web/public${publicUrl}`;

  return {
    repoPath,
    publicUrl,
    fileChange: {
      path: repoPath,
      contentBase64: image.bytes.toString('base64'),
    },
  };
}

function filenameFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const last = u.pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : 'image';
  } catch {
    return 'image';
  }
}

export async function fetchImageFromUrl(rawUrl: string): Promise<ImageBytes> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UploadValidationError('Invalid URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UploadValidationError('Only http(s) URLs can be rehosted.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'LandonBufordBot/1.0 (+https://landonbuford.com)' },
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : 'Fetch failed.';
    throw new UploadValidationError(`Could not fetch image: ${msg}`, 502);
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new UploadValidationError(
      `Source returned ${res.status} ${res.statusText}.`,
      502
    );
  }

  const headerType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const headerLen = Number(res.headers.get('content-length') || '0');
  if (headerLen && headerLen > MAX_IMAGE_BYTES) {
    throw new UploadValidationError(
      `Remote image is ${(headerLen / 1024 / 1024).toFixed(1)} MB; limit is ${
        MAX_IMAGE_BYTES / 1024 / 1024
      } MB.`,
      413
    );
  }

  const arrayBuf = await res.arrayBuffer();
  const bytes = Buffer.from(arrayBuf);

  const mime = ALLOWED_IMAGE_MIME.has(headerType) ? headerType : sniffImageMime(bytes);
  if (!mime) {
    throw new UploadValidationError(
      `Source did not return a supported image (content-type: ${headerType || 'unknown'}).`
    );
  }

  const image: ImageBytes = {
    bytes,
    mime,
    originalName: filenameFromUrl(rawUrl),
  };
  validateImage(image);
  return image;
}

function sniffImageMime(bytes: Buffer): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return 'image/webp';
  return null;
}

const IMG_TAG_RE =
  /<img\b([^>]*?)\bsrc\s*=\s*(["'])([^"']+)\2([^>]*)>/gi;

function isLocalSrc(src: string): boolean {
  return src.startsWith('/') || src.startsWith('data:');
}

export interface RehostResult {
  html: string;
  fileChanges: FileChange[];
  rehostedCount: number;
  strippedCount: number;
}

/**
 * Walks <img> tags in HTML, downloads any external src to /uploads/{year}/{slug}/...,
 * rewrites src to the local path, and returns the rewritten HTML alongside the
 * FileChange entries to include in the git commit. External images that fail to
 * fetch are stripped entirely (matches sanitizer behavior; no regression).
 *
 * Deduplicates by URL so the same image isn't rehosted twice in a single post.
 */
export async function rehostExternalImages(
  html: string,
  slug: string,
  now: Date = new Date()
): Promise<RehostResult> {
  if (!html) {
    return { html, fileChanges: [], rehostedCount: 0, strippedCount: 0 };
  }

  const matches = Array.from(html.matchAll(IMG_TAG_RE));
  const externalUrls = new Map<string, string>(); // url -> resolved publicUrl ('' if failed)
  for (const m of matches) {
    const src = m[3];
    if (isLocalSrc(src)) continue;
    if (!externalUrls.has(src)) externalUrls.set(src, '');
  }

  const fileChanges: FileChange[] = [];
  let rehostedCount = 0;
  let strippedCount = 0;

  await Promise.all(
    Array.from(externalUrls.keys()).map(async (url) => {
      try {
        const image = await fetchImageFromUrl(url);
        const entry = buildUploadEntry({ slug, image, now });
        externalUrls.set(url, entry.publicUrl);
        fileChanges.push(entry.fileChange);
        rehostedCount += 1;
      } catch (err) {
        console.warn(`[rehost] Skipping ${url}: ${err instanceof Error ? err.message : err}`);
        externalUrls.set(url, '');
      }
    })
  );

  const rewritten = html.replace(
    IMG_TAG_RE,
    (full, before: string, quote: string, src: string, after: string) => {
      if (isLocalSrc(src)) return full;
      const replaced = externalUrls.get(src);
      if (replaced) {
        return `<img${before}src=${quote}${replaced}${quote}${after}>`;
      }
      strippedCount += 1;
      return '';
    }
  );

  return { html: rewritten, fileChanges, rehostedCount, strippedCount };
}

/**
 * Returns the repo paths of all /uploads/... assets referenced by a post's
 * HTML and heroImage. Used by the delete route to clean up images when the
 * post is removed. Returns repo-rooted paths (e.g. "web/public/uploads/2026/foo/x.jpg").
 */
export function extractLocalUploadPaths(opts: {
  html: string | undefined | null;
  heroPath: string | undefined | null;
}): string[] {
  const found = new Set<string>();
  const html = opts.html ?? '';
  for (const m of html.matchAll(IMG_TAG_RE)) {
    const src = m[3];
    if (src.startsWith('/uploads/')) found.add(src);
  }
  if (opts.heroPath && opts.heroPath.startsWith('/uploads/')) {
    found.add(opts.heroPath);
  }
  return Array.from(found).map((url) => `web/public${url}`);
}
