import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { isAllowedAdminOrigin } from '@/lib/admin/origin';
import { publishToGithub } from '@/lib/admin/github';
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  UploadValidationError,
  buildUploadEntry,
  fetchImageFromUrl,
  isSafePostSlug,
  validateImage,
  type ImageBytes,
} from '@/lib/admin/uploads';

export const runtime = 'nodejs';
export const maxDuration = 60;

function errorJson(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function readImageFromRequest(req: Request): Promise<{
  image: ImageBytes;
  slug: string;
}> {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const slug = String(form.get('slug') ?? '').trim();
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw new UploadValidationError('No file in upload.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new UploadValidationError(
        `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB; limit is ${
          MAX_IMAGE_BYTES / 1024 / 1024
        } MB.`,
        413
      );
    }
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
      throw new UploadValidationError(
        `Unsupported image type "${mime || 'unknown'}". Allowed: JPEG, PNG, WebP, GIF.`
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const image: ImageBytes = { bytes, mime, originalName: file.name || 'image' };
    validateImage(image);
    return { image, slug };
  }

  if (contentType.includes('application/json')) {
    const body = (await req.json()) as { url?: unknown; slug?: unknown };
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!url) {
      throw new UploadValidationError('url is required.');
    }
    const image = await fetchImageFromUrl(url);
    return { image, slug };
  }

  throw new UploadValidationError(
    'Use multipart/form-data (file upload) or application/json ({ url, slug }).'
  );
}

export async function POST(req: Request) {
  if (!isAllowedAdminOrigin(req)) {
    return errorJson('Forbidden.', 403);
  }
  const session = await verifySession();
  if (!session) {
    return errorJson('Unauthorized.', 401);
  }

  let image: ImageBytes;
  let slug: string;
  try {
    ({ image, slug } = await readImageFromRequest(req));
  } catch (err) {
    if (err instanceof UploadValidationError) return errorJson(err.message, err.status);
    const msg = err instanceof Error ? err.message : 'Invalid upload.';
    return errorJson(msg, 400);
  }

  if (!slug || !isSafePostSlug(slug)) {
    return errorJson(
      'slug is required (lowercase letters, digits, hyphens; 1-100 chars).',
      400
    );
  }

  let entry;
  try {
    entry = buildUploadEntry({ slug, image });
  } catch (err) {
    if (err instanceof UploadValidationError) return errorJson(err.message, err.status);
    const msg = err instanceof Error ? err.message : 'Invalid upload.';
    return errorJson(msg, 400);
  }

  try {
    const commit = await publishToGithub({
      message: `Upload image for /${slug}: ${entry.publicUrl.split('/').pop()}`,
      files: [entry.fileChange],
    });
    return NextResponse.json({
      ok: true,
      path: entry.publicUrl,
      bytes: image.bytes.length,
      mime: image.mime,
      commitSha: commit.commitSha,
      branch: commit.branch,
    });
  } catch (err) {
    console.error('Admin upload:', err);
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return errorJson(message, 502);
  }
}
