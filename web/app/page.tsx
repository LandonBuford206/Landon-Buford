import Link from 'next/link';
import { PostCard } from '@/components/PostCard';
import { NewsletterEmbed } from '@/components/NewsletterEmbed';
import { AdSlot } from '@/components/AdSlot';
import { getHomepageFeed, type HomepageCategoryBlock } from '@/lib/content';

// Slugs that get bespoke layouts on the homepage. Order = render order.
const SLOTTED = ['sports', 'nba', 'business', 'music', 'entertainment'] as const;

export default async function HomePage() {
  const { lead, secondary, byCategory } = await getHomepageFeed();

  const slotsRendered = new Set<string>();
  const slot = (slug: string): HomepageCategoryBlock | undefined => {
    const b = byCategory.get(slug);
    if (b) slotsRendered.add(slug);
    return b;
  };

  const sports = slot('sports');
  const nba = slot('nba');
  const business = slot('business');
  const music = slot('music');
  const entertainment = slot('entertainment');

  const fallback = Array.from(byCategory.values()).filter(
    ({ category }) => !slotsRendered.has(category.slug),
  );

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
        <section className="mt-24 lg:mt-28">
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

      {/* Sports — 1 feature-large + 3 compact */}
      {sports && (
        <section className="mt-24 lg:mt-28">
          <SectionHead
            title={sports.category.name}
            href={`/category/${sports.category.slug}`}
            cta="View all"
          />
          <FeatureWithStack block={sports} />
        </section>
      )}

      {/* NBA — 4-card row */}
      {nba && (
        <section className="mt-24 lg:mt-28">
          <SectionHead
            title={nba.category.name}
            href={`/category/${nba.category.slug}`}
            cta="View all"
          />
          <CardRow block={nba} />
        </section>
      )}

      {/* Business — 2x2 feature mosaic */}
      {business && (
        <section className="mt-24 lg:mt-28">
          <SectionHead
            title={business.category.name}
            href={`/category/${business.category.slug}`}
            cta="View all"
          />
          <FeatureMosaic block={business} />
        </section>
      )}

      {/* Music — feature + headline list */}
      {music && (
        <section className="mt-24 lg:mt-28">
          <SectionHead
            title={music.category.name}
            href={`/category/${music.category.slug}`}
            cta="View all"
          />
          <FeatureWithHeadlines block={music} />
        </section>
      )}

      {/* Entertainment — 4-card row */}
      {entertainment && (
        <section className="mt-24 lg:mt-28">
          <SectionHead
            title={entertainment.category.name}
            href={`/category/${entertainment.category.slug}`}
            cta="View all"
          />
          <CardRow block={entertainment} />
        </section>
      )}

      {/* Remaining categories (Interviews, Fashion, Gaming, etc.) — default 4-card row */}
      {fallback.map((block) => (
        <section key={block.category.slug} className="mt-24 lg:mt-28">
          <SectionHead
            title={block.category.name}
            href={`/category/${block.category.slug}`}
            cta="View all"
          />
          <CardRow block={block} />
        </section>
      ))}

      {process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT && (
        <section className="my-24">
          <NewsletterEmbed />
        </section>
      )}
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
      <h2 className="font-serif text-3xl tracking-tight md:text-4xl">{title}</h2>
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

function CardRow({ block }: { block: HomepageCategoryBlock }) {
  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
      {block.posts.slice(0, 4).map((p) => (
        <PostCard key={p.slug} post={p} variant="card" />
      ))}
    </div>
  );
}

function FeatureWithStack({ block }: { block: HomepageCategoryBlock }) {
  const [lead, ...rest] = block.posts;
  if (!lead) return null;
  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
      <PostCard post={lead} variant="feature-large" />
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:grid-cols-1">
        {rest.slice(0, 3).map((p) => (
          <PostCard key={p.slug} post={p} variant="compact" />
        ))}
      </div>
    </div>
  );
}

function FeatureMosaic({ block }: { block: HomepageCategoryBlock }) {
  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
      {block.posts.slice(0, 4).map((p) => (
        <PostCard key={p.slug} post={p} variant="feature-large" />
      ))}
    </div>
  );
}

function FeatureWithHeadlines({ block }: { block: HomepageCategoryBlock }) {
  const [lead, ...rest] = block.posts;
  if (!lead) return null;
  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <PostCard post={lead} variant="feature-large" />
      <div>
        {rest.slice(0, 4).map((p) => (
          <PostCard key={p.slug} post={p} variant="headline" />
        ))}
      </div>
    </div>
  );
}
