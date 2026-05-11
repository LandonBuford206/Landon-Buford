import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { verifySession } from '@/lib/session';
import { formatPost } from '@/lib/admin/anthropic';
import { cleanWordPressHtml } from '@/lib/html';
import { isAllowedAdminOrigin } from '@/lib/admin/origin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DATA_DIR = join(process.cwd(), 'data');
const MAX_TAGS_IN_PROMPT = 500;
const MAX_RAW_TEXT_CHARS = 50_000;

interface FormatPayload {
  rawText?: string;
  title?: string;
}

export async function POST(req: Request) {
  if (!isAllowedAdminOrigin(req)) {
    return Response.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
  }

  const session = await verifySession();
  if (!session) {
    return Response.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  let body: FormatPayload;
  try {
    body = (await req.json()) as FormatPayload;
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const rawText = (body.rawText ?? '').trim();
  if (!rawText) {
    return Response.json({ ok: false, error: 'Article body is required.' }, { status: 400 });
  }
  if (rawText.length > MAX_RAW_TEXT_CHARS) {
    return Response.json(
      { ok: false, error: `Article body exceeds ${MAX_RAW_TEXT_CHARS} characters.` },
      { status: 413 }
    );
  }

  const [categoriesRaw, tagsRaw] = await Promise.all([
    readFile(join(DATA_DIR, 'categories.json'), 'utf8'),
    readFile(join(DATA_DIR, 'tags.json'), 'utf8'),
  ]);
  const categories = JSON.parse(categoriesRaw) as { slug: string; name: string }[];
  const tags = (JSON.parse(tagsRaw) as { slug: string; name: string }[]).slice(
    0,
    MAX_TAGS_IN_PROMPT
  );

  try {
    const formatted = await formatPost({
      rawText,
      title: body.title?.trim() || undefined,
      categories,
      tags,
    });
    const sanitizedHtml = cleanWordPressHtml(formatted.htmlContent);
    return Response.json({
      ok: true,
      formatted: { ...formatted, htmlContent: sanitizedHtml },
    });
  } catch (err) {
    console.error('Admin format:', err);
    const message = err instanceof Error ? err.message : 'Formatter failed.';
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
