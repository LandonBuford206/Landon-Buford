import Link from 'next/link';
import { PostCard } from '@/components/PostCard';
import { NewsletterEmbed } from '@/components/NewsletterEmbed';
import { AdSlot } from '@/components/AdSlot';
import { getHomepageFeed } from '@/lib/content';

export default async function HomePage() {
  const { lead, secondary, byCategory } = await getHomepageFeed();

  return (
    <div className="mx-auto w-full max-w-[var(--container-page)] px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      {/* hero band: lead + secondary */}
      {lead && (
        <section className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <PostCard post={lead} variant="lead" priority />
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-1">
            {secondary.slice(0, 4).map((p) => (
              <PostCard key={p.slug} post={p} variant="compact" />
            ))}
          </div>
        </section>
      )}

      {/* "Latest" rail */}
      {secondary.length > 4 && (
        <section className="mt-20">
          <SectionHead title="Latest" />
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {secondary.slice(4, 8).map((p) => (
              <PostCard key={p.slug} post={p} variant="card" />
            ))}
          </div>
        </section>
      )}

      <div className="my-16">
        <AdSlot placement="listing-mid" />
      </div>

      {/* category rails */}
      {byCategory.map(({ category, posts }) => (
        <section key={category.slug} className="mt-20">
          <SectionHead
            title={category.name}
            href={`/category/${category.slug}`}
            cta="View all"
          />
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {posts.map((p) => (
              <PostCard key={p.slug} post={p} variant="card" />
            ))}
          </div>
        </section>
      ))}

      <section className="my-24">
        <NewsletterEmbed />
      </section>
    </div>
  );
}

function SectionHead({
  title,
  href,
  cta,
}: {
  title: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 border-b border-[var(--color-line)] pb-3">
      <h2 className="font-serif text-2xl tracking-tight md:text-3xl">{title}</h2>
      {href && cta && (
        <Link
          href={href}
          className="text-sm font-medium text-[var(--color-ink-soft)] transition hover:text-[var(--color-accent)]"
        >
          {cta} →
        </Link>
      )}
    </div>
  );
}
