import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostCard } from '@/components/PostCard';
import { PaginationNav } from '@/components/PaginationNav';
import { AdSlot } from '@/components/AdSlot';
import {
  getAuthor,
  getCategory,
  getListingPageCounts,
  getTag,
  listPosts,
  type ListingKind,
} from '@/lib/content';
import { accentColor } from '@/lib/category-style';
import { IS_STATIC_EXPORT } from '@/lib/build-target';

/**
 * Shared by the category / tag / author archives. Page 1 lives at
 * /{kind}/{slug}; later pages at /{kind}/{slug}/page/{n}, so every page is a
 * real file in the static export (query strings can't be pre-rendered).
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://landonbuford.com';

const LABELS: Record<ListingKind, string> = {
  category: 'Category',
  tag: 'Tag',
  author: 'Author',
};

async function getSubject(
  kind: ListingKind,
  slug: string
): Promise<{ slug: string; name: string } | null> {
  if (kind === 'category') {
    const cat = await getCategory(slug);
    return cat && { slug: cat.slug, name: cat.name };
  }
  if (kind === 'tag') {
    const tag = await getTag(slug);
    return tag && { slug: tag.slug, name: tag.name };
  }
  const author = await getAuthor(slug);
  return author && { slug: author.slug, name: author.displayName };
}

function listingHref(kind: ListingKind, slug: string, page = 1): string {
  const base = `/${kind}/${slug}`;
  return page > 1 ? `${base}/page/${page}` : base;
}

/** Parses the [n] segment of /…/page/[n]. Page 1 only exists at the bare URL. */
export function parsePageSegment(n: string): number | null {
  if (!/^\d+$/.test(n)) return null;
  const page = Number(n);
  return page >= 2 ? page : null;
}

export async function firstPageParams(kind: ListingKind): Promise<{ slug: string }[]> {
  if (!IS_STATIC_EXPORT) return [];
  const counts = await getListingPageCounts(kind);
  return counts.map(({ slug }) => ({ slug }));
}

export async function laterPageParams(kind: ListingKind): Promise<{ slug: string; n: string }[]> {
  if (!IS_STATIC_EXPORT) return [];
  const counts = await getListingPageCounts(kind);
  return counts.flatMap(({ slug, totalPages }) =>
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({ slug, n: String(i + 2) }))
  );
}

export async function listingMetadata(
  kind: ListingKind,
  slug: string,
  page = 1
): Promise<Metadata> {
  const subject = await getSubject(kind, slug);
  if (!subject) return {};
  const title =
    kind === 'tag' ? `${subject.name} archive` : subject.name;
  const description =
    kind === 'category'
      ? `Latest stories in ${subject.name} from LandonBuford.com.`
      : kind === 'tag'
        ? `Posts tagged ${subject.name} on LandonBuford.com.`
        : `Stories by ${subject.name} on LandonBuford.com.`;
  return {
    title: page > 1 ? `${title} — Page ${page}` : title,
    description,
    alternates: { canonical: `${SITE_URL}${listingHref(kind, subject.slug, page)}` },
  };
}

export async function ListingPage({
  kind,
  slug,
  page = 1,
}: {
  kind: ListingKind;
  slug: string;
  page?: number;
}) {
  const subject = await getSubject(kind, slug);
  if (!subject) notFound();

  const { posts, totalPages, totalPosts } = await listPosts({
    categorySlug: kind === 'category' ? slug : undefined,
    tagSlug: kind === 'tag' ? slug : undefined,
    authorSlug: kind === 'author' ? slug : undefined,
    page,
  });
  if (posts.length === 0 || page > totalPages) notFound();

  const isCategory = kind === 'category';

  return (
    <div className="mx-auto w-full max-w-[var(--container-page)] px-4 pt-12 sm:px-6 lg:px-8">
      <header className="mb-10 border-b border-[var(--color-line)] pb-6">
        {isCategory ? (
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="block h-9 w-[3px] md:h-12"
              style={{ backgroundColor: accentColor(subject.slug) }}
            />
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-[0.16em]"
                style={{ color: accentColor(subject.slug) }}
              >
                {LABELS[kind]}
              </span>
              <h1 className="mt-1 font-serif text-4xl tracking-tight md:text-5xl">
                {subject.name}
              </h1>
            </div>
          </div>
        ) : (
          <>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
              {LABELS[kind]}
            </span>
            <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">{subject.name}</h1>
          </>
        )}
        <p className={`${isCategory ? 'mt-3' : 'mt-2'} text-sm text-[var(--color-ink-mute)]`}>
          {totalPosts} {totalPosts === 1 ? 'story' : 'stories'}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <PostCard key={p.slug} post={p} variant="card" priority={isCategory && i < 3} />
        ))}
      </div>

      {isCategory && posts.length >= 6 && (
        <div className="my-16">
          <AdSlot placement="listing-mid" />
        </div>
      )}

      <PaginationNav baseHref={listingHref(kind, subject.slug)} page={page} totalPages={totalPages} />
    </div>
  );
}
