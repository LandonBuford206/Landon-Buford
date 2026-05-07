import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleHeader } from '@/components/ArticleHeader';
import { ArticleBody } from '@/components/ArticleBody';
import { PostCard } from '@/components/PostCard';
import { NewsletterEmbed } from '@/components/NewsletterEmbed';
import { getPost, getRelatedPosts, getRecentPosts } from '@/lib/content';
import { decodeEntities, htmlToText } from '@/lib/html';
import { resolveImageSrc } from '@/lib/format';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://landonbuford.com';

/**
 * Pre-build the most recent ~500 posts at build time. The remaining
 * ~7,000 are generated on-demand at first request and cached for
 * subsequent visits (default Next.js behavior since dynamicParams is
 * implicitly true when generateStaticParams is provided).
 */
export async function generateStaticParams() {
  const recent = await getRecentPosts(500);
  return recent.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<'/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPost(slug);
  if (!post) return {};
  const title = decodeEntities(post.title);
  const description = htmlToText(post.excerpt).slice(0, 200);
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${post.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${SITE_URL}/${post.slug}`,
      // OG image is generated automatically by app/[slug]/opengraph-image.tsx
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [post.author.displayName],
      tags: post.tags.map((t) => t.name),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ArticlePage(props: PageProps<'/[slug]'>) {
  const { slug } = await props.params;
  const post = await getPost(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post, 4);
  const heroSrc = resolveImageSrc(post.heroImage);
  // Always provide an image to schema.org (the auto-generated OG card if
  // no recovered hero exists) so Google has a valid Article entry.
  const articleImage = heroSrc ?? `${SITE_URL}/${post.slug}/opengraph-image`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: decodeEntities(post.title),
    image: [articleImage],
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
