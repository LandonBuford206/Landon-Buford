import Link from 'next/link';
import { getCategoriesWithCounts } from '@/lib/content';
import { NewsletterEmbed } from './NewsletterEmbed';

export async function SiteFooter() {
  const cats = await getCategoriesWithCounts();
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-24 border-t border-[var(--color-line)] bg-[var(--color-ink)] text-[var(--color-paper)]">
      <div className="mx-auto w-full max-w-[var(--container-page)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Link href="/" className="font-serif text-2xl tracking-tight">
              Landon<span className="text-[var(--color-accent)]">Buford</span>
              <span className="text-[var(--color-ink-mute)]">.com</span>
            </Link>
            <p className="mt-4 max-w-md text-sm text-[var(--color-line)]">
              Where sports and business intersect. Coverage of the WNBA, athlete
              entrepreneurship, the business of sport, and the people building it.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
              Sections
            </h4>
            <ul className="mt-5 space-y-3 text-sm">
              {cats.slice(0, 8).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="text-[var(--color-line)] transition hover:text-[var(--color-paper)]"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
              Follow
            </h4>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/feed.xml" className="text-[var(--color-line)] hover:text-[var(--color-paper)]">
                  RSS Feed
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-[var(--color-line)] hover:text-[var(--color-paper)]">
                  Search the archive
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="text-[var(--color-line)] hover:text-[var(--color-paper)]">
                  Sitemap
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-[var(--color-line)] hover:text-[var(--color-paper)]">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        {process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT && (
          <div className="mt-14">
            <NewsletterEmbed variant="footer" />
          </div>
        )}
        <div className="mt-12 border-t border-[var(--color-ink-soft)]/40 pt-6 text-xs text-[var(--color-ink-mute)]">
          © {year} LandonBuford.com. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
