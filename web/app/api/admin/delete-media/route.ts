import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { publishToGithub, type FileChange } from '@/lib/admin/github';
import { isAllowedAdminOrigin } from '@/lib/admin/origin';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface DeleteMediaPayload {
  publicUrl?: string;
}

const PUBLIC_URL_PATTERN =
  /^\/uploads\/(\d{4})\/([a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?)\/([a-zA-Z0-9._-]+)$/;

export async function POST(req: Request) {
  if (!isAllowedAdminOrigin(req)) {
    return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
  }

  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  let body: DeleteMediaPayload;
  try {
    body = (await req.json()) as DeleteMediaPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const publicUrl = body.publicUrl?.trim();
  if (!publicUrl || !PUBLIC_URL_PATTERN.test(publicUrl)) {
    return NextResponse.json(
      { ok: false, error: 'publicUrl must be /uploads/{year}/{slug}/{filename}.' },
      { status: 400 }
    );
  }

  const repoPath = `web/public${publicUrl}`;
  const files: FileChange[] = [{ path: repoPath, delete: true }];

  try {
    const commit = await publishToGithub({
      message: `Delete media: ${publicUrl}`,
      files,
    });
    return NextResponse.json({
      ok: true,
      publicUrl,
      commitSha: commit.commitSha,
      branch: commit.branch,
    });
  } catch (err) {
    console.error('Admin delete-media:', err);
    const message = err instanceof Error ? err.message : 'Delete failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
