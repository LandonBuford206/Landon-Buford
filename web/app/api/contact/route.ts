import { Resend } from 'resend';

export const runtime = 'nodejs';

const RECIPIENT = 'seatownrealist@gmail.com';
const FROM = 'LandonBuford Contact <onboarding@resend.dev>';

interface ContactPayload {
  name?: string;
  email?: string;
  message?: string;
  honeypot?: string;
}

function badRequest(message: string) {
  return Response.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(req: Request) {
  let body: ContactPayload;
  try {
    body = (await req.json()) as ContactPayload;
  } catch {
    return badRequest('Invalid request body.');
  }

  if (body.honeypot && body.honeypot.length > 0) {
    return Response.json({ ok: true });
  }

  const name = body.name?.trim() ?? '';
  const email = body.email?.trim() ?? '';
  const message = body.message?.trim() ?? '';

  if (!name || name.length > 200) return badRequest('Name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320)
    return badRequest('A valid email is required.');
  if (!message || message.length < 10 || message.length > 5000)
    return badRequest('Message must be 10–5000 characters.');

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Contact form: RESEND_API_KEY is not set.');
    return Response.json(
      { ok: false, error: 'Contact form is not configured yet.' },
      { status: 503 }
    );
  }

  const resend = new Resend(apiKey);
  const subject = `New contact form message from ${name}`;
  const text =
    `Name: ${name}\n` +
    `Email: ${email}\n` +
    `\n` +
    `Message:\n${message}\n`;
  const html =
    `<p><strong>Name:</strong> ${escapeHtml(name)}</p>` +
    `<p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` +
    `<p><strong>Message:</strong></p>` +
    `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: RECIPIENT,
    replyTo: email,
    subject,
    text,
    html,
  });

  if (error) {
    console.error('Contact form: Resend error', error);
    return Response.json(
      { ok: false, error: 'Failed to send message. Please try again later.' },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
