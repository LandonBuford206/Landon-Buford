// Renders a readable panel when an admin page fails to load its data from
// GitHub. Without this, a failed read (most commonly an expired/revoked
// GITHUB_TOKEN) bubbles up as Vercel's opaque "page could not load" 500.

export function AdminLoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-[var(--container-page)] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl tracking-tight">Couldn’t load from GitHub</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
        The admin reads live post data from GitHub on every load. That read
        failed, so this page can’t be shown.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-md border border-[var(--color-line)] bg-[var(--color-card)] p-4 font-mono text-xs text-[var(--color-accent)]">
        {message}
      </pre>
      <p className="mt-4 text-sm text-[var(--color-ink-mute)]">
        If this mentions a 401/403, the GitHub token used by the site has
        expired, been revoked, or lost access to the repo and needs to be
        rotated. Other admin pages (posts, editing, publishing) will fail the
        same way until it’s fixed.
      </p>
    </div>
  );
}
