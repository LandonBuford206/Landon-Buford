import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleHeader } from '@/components/ArticleHeader';
import { ArticleBody } from '@/components/ArticleBody';
import { PostCard } from '@/components/PostCard';
import { NewsletterEmbed } from '@/components/NewsletterEmbed';
import { getAllSlugs, getPost, getRelatedPosts, type PostFull } from '@/lib/content';
import { decodeEntities, htmlToText } from '@/lib/html';
import { resolveImageSrc } from '@/lib/format';
import { IS_STATIC_EXPORT } from '@/lib/build-target';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://landonbuford.com';

/**
 * The static export pre-renders every post. Elsewhere (Vercel admin build,
 * `next dev`) posts render on demand.
 */
export async function generateStaticParams() {
  if (!IS_STATIC_EXPORT) return [];
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * The recovered hero image when there is one, otherwise the site-wide card
 * (app/opengraph-image.tsx). Per-post generated cards were dropped: ~7,500
 * PNGs would add ~470 MB to every static deploy.
 */
function socialImage(post: PostFull): string {
  const hero = resolveImageSrc(post.heroImage);
  return hero ? new URL(hero, SITE_URL).toString() : `${SITE_URL}/opengraph-image`;
}

export async function generateMetadata(props: PageProps<'/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPost(slug);
  if (!post) return {};
  const title = decodeEntities(post.title);
  const description = htmlToText(post.excerpt).slice(0, 200);
  const image = socialImage(post);
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${post.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${SITE_URL}/${post.slug}`,
      images: [image],
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [post.author.displayName],
      tags: post.tags.map((t) => t.name),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function ArticlePage(props: PageProps<'/[slug]'>) {
  const { slug } = await props.params;
  const post = await getPost(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: decodeEntities(post.title),
    image: [socialImage(post)],
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt,
    author: { '@type': 'Person', name: post.author.displayName },
    publisher: { '@type': 'Organization', name: 'LandonBuford.com' },
    description: htmlToText(post.excerpt).slice(0, 300),
    mainEntityOfPage: `${SITE_URL}/${post.slug}`,
  };

  return (
    <article>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleHeader post={post} />
      <div className="mt-10">
        <ArticleBody html={post.htmlContent} />
      </div>

      {/* tags */}
      {post.tags.length > 0 && (
        <div className="mx-auto mt-12 max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[var(--container-prose)] flex-wrap gap-2">
            {post.tags.slice(0, 12).map((t) => (
              <a
                key={t.slug}
                href={`/tag/${t.slug}`}
                className="rounded-full border border-[var(--color-line-strong)] px-3 py-1 text-xs text-[var(--color-ink-soft)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {t.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* related */}
      {related.length > 0 && (
        <section className="mx-auto mt-20 w-full max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8">
          <h3 className="mb-8 border-b border-[var(--color-line)] pb-3 font-serif text-2xl tracking-tight">
            More from {post.categories[0]?.name ?? 'the archive'}
          </h3>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PostCard key={p.slug} post={p} variant="card" />
            ))}
          </div>
        </section>
      )}

      {process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT && (
        <section className="mx-auto my-24 w-full max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <NewsletterEmbed />
          </div>
        </section>
      )}
    </article>
  );
}
