import Link from 'next/link';
import type { PostListEntry } from '@/lib/content';
import { formatDate, resolveImageSrc } from '@/lib/format';
import { decodeEntities } from '@/lib/html';
import { accentColor } from '@/lib/category-style';
import { CategoryArt, type CategoryArtSize } from './CategoryArt';

type Variant = 'lead' | 'feature-large' | 'feature' | 'card' | 'compact' | 'headline';

const ART_SIZE: Record<Variant, CategoryArtSize> = {
  lead: 'lead',
  'feature-large': 'feature',
  feature: 'feature',
  card: 'card',
  compact: 'compact',
  headline: 'compact',
};

type CategoryRef = NonNullable<PostListEntry['primaryCategory']>;

function CategoryBadge({ cat, size = 'sm' }: { cat: CategoryRef; size?: 'sm' | 'xs' }) {
  return (
    <span
      className={
        size === 'xs'
          ? 'text-[10px] font-semibold uppercase tracking-[0.14em]'
          : 'text-xs font-semibold uppercase tracking-[0.14em]'
      }
      style={{ color: accentColor(cat.slug) }}
    >
      {cat.name}
    </span>
  );
}

interface PostCardProps {
  post: PostListEntry;
  variant?: Variant;
  priority?: boolean;
}

export function PostCard({ post, variant = 'card', priority = false }: PostCardProps) {
  const imgSrc = resolveImageSrc(post.heroImage);
  const href = `/${post.slug}`;
  const cat = post.primaryCategory;
  const title = decodeEntities(post.title);
  const excerpt = decodeEntities(post.excerpt);

  if (variant === 'lead') {
    return (
      <article className="group">
        <Link href={href} className="block">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-[var(--color-line)]">
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt={title}
                loading={priority ? 'eager' : 'lazy'}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
            ) : (
              <CategoryArt title={post.title} category={cat} size={ART_SIZE.lead} />
            )}
          </div>
          <div className="mt-5">
            {cat && <CategoryBadge cat={cat} />}
            <h2 className="mt-2 font-serif text-3xl leading-[1.1] tracking-tight md:text-4xl lg:text-[2.75rem]">
              {title}
            </h2>
            {excerpt && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--color-ink-soft)] md:text-lg">
                {excerpt}
              </p>
            )}
            <Meta post={post} />
          </div>
        </Link>
      </article>
    );
  }

  if (variant === 'feature-large') {
    return (
      <article className="group">
        <Link href={href} className="block">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-[var(--color-line)]">
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <CategoryArt title={post.title} category={cat} size="feature" />
            )}
          </div>
          <div className="mt-4">
            {cat && <CategoryBadge cat={cat} />}
            <h3 className="mt-2 font-serif text-2xl leading-[1.15] tracking-tight md:text-3xl">
              {title}
            </h3>
            {excerpt && (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                {excerpt}
              </p>
            )}
            <Meta post={post} compact />
          </div>
        </Link>
      </article>
    );
  }

  if (variant === 'headline') {
    return (
      <article className="group border-t border-[var(--color-line)] py-3.5 first:border-t-0 first:pt-0">
        <Link href={href} className="block">
          {cat && <CategoryBadge cat={cat} size="xs" />}
          <h4 className="mt-1 font-serif text-base leading-snug tracking-tight transition group-hover:text-[var(--color-accent)] md:text-lg">
            {title}
          </h4>
          <Meta post={post} compact />
        </Link>
      </article>
    );
  }

  if (variant === 'feature') {
    return (
      <article className="group">
        <Link href={href} className="block">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-[var(--color-line)]">
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <CategoryArt title={post.title} category={cat} size={ART_SIZE.feature} />
            )}
          </div>
          <div className="mt-4">
            {cat && <CategoryBadge cat={cat} size="xs" />}
            <h3 className="mt-1.5 font-serif text-xl leading-[1.2] tracking-tight md:text-2xl">
              {title}
            </h3>
            <Meta post={post} compact />
          </div>
        </Link>
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article className="group flex gap-4">
        <Link href={href} className="flex flex-1 items-start gap-4">
          <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-sm bg-[var(--color-line)] sm:w-24">
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgSrc} alt={title} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <CategoryArt title={post.title} category={cat} size={ART_SIZE.compact} />
            )}
          </div>
          <div className="flex-1">
            {cat && <CategoryBadge cat={cat} size="xs" />}
            <h4 className="mt-1 font-serif text-base leading-snug tracking-tight">
              {title}
            </h4>
            <Meta post={post} compact />
          </div>
        </Link>
      </article>
    );
  }

  // 'card' (default)
  return (
    <article className="group">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-[var(--color-line)]">
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <CategoryArt title={post.title} category={cat} size={ART_SIZE.card} />
          )}
        </div>
        <div className="mt-3.5">
          {cat && <CategoryBadge cat={cat} size="xs" />}
          <h3 className="mt-1.5 font-serif text-lg leading-snug tracking-tight md:text-xl">
            {title}
          </h3>
          <Meta post={post} compact />
        </div>
      </Link>
    </article>
  );
}

function Meta({ post, compact = false }: { post: PostListEntry; compact?: boolean }) {
  return (
    <div
      className={`mt-${compact ? '2' : '4'} flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-ink-mute)]`}
    >
      <span>{post.author.displayName}</span>
      <span aria-hidden>·</span>
      <span>{formatDate(post.publishedAt)}</span>
      {!compact && (
        <>
          <span aria-hidden>·</span>
          <span>{post.readingTimeMin} min read</span>
        </>
      )}
    </div>
  );
}
