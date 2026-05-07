import Link from 'next/link';
import type { PostFull } from '@/lib/content';
import { formatDate, resolveImageSrc } from '@/lib/format';
import { decodeEntities } from '@/lib/html';
import { CategoryArt } from './CategoryArt';

interface ArticleHeaderProps {
  post: PostFull;
}

export function ArticleHeader({ post }: ArticleHeaderProps) {
  const heroSrc = resolveImageSrc(post.heroImage);
  const cat = post.categories[0];
  const title = decodeEntities(post.title);

  return (
    <header className="mx-auto w-full max-w-[var(--container-page)] px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-ink-mute)]">
        <Link href="/" className="hover:text-[var(--color-ink)]">Home</Link>
        {cat && (
          <>
            <span aria-hidden>›</span>
            <Link
              href={`/category/${cat.slug}`}
              className="hover:text-[var(--color-ink)]"
            >
              {cat.name}
            </Link>
          </>
        )}
      </nav>

      <div className="mx-auto max-w-3xl">
        {cat && (
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            {cat.name}
          </span>
        )}
        <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-[3.5rem]">
          {title}
        </h1>
        {post.excerpt && (
          <p className="mt-5 font-serif text-xl leading-snug text-[var(--color-ink-soft)] md:text-2xl">
            {decodeEntities(post.excerpt)}
          </p>
        )}
        <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-ink-mute)]">
          <Link
            href={`/author/${post.author.slug}`}
            className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]"
          >
            {post.author.displayName}
          </Link>
          <span aria-hidden>·</span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{post.readingTimeMin} min read</span>
        </div>
      </div>

      {heroSrc ? (
        <figure className="mx-auto mt-10 max-w-5xl">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-[var(--color-line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSrc}
              alt={post.heroImage?.alt || title}
              className="h-full w-full object-cover"
            />
          </div>
        </figure>
      ) : (
        <div className="mx-auto mt-10 max-w-5xl">
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-md md:aspect-[24/8]">
            <CategoryArt title={post.title} category={cat?.name} size="hero" />
          </div>
        </div>
      )}
    </header>
  );
}
