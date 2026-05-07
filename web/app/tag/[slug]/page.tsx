import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostCard } from '@/components/PostCard';
import { PaginationNav } from '@/components/PaginationNav';
import { getTag, listPosts } from '@/lib/content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://landonbuford.com';

// Tags are very numerous (~13,500). We do NOT pre-build them — every tag page
// is rendered on first request and cached.

export async function generateMetadata(props: PageProps<'/tag/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const tag = await getTag(slug);
  if (!tag) return {};
  return {
    title: `${tag.name} archive`,
    description: `Posts tagged ${tag.name} on LandonBuford.com.`,
    alternates: { canonical: `${SITE_URL}/tag/${tag.slug}` },
  };
}

export default async function TagPage(props: PageProps<'/tag/[slug]'>) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const page = parseInt((sp?.page as string) || '1', 10);

  const tag = await getTag(slug);
  if (!tag) notFound();

  const { posts, totalPages, totalPosts } = await listPosts({ tagSlug: slug, page });
  if (posts.length === 0 && page === 1) notFound();

  return (
    <div className="mx-auto w-full max-w-[var(--container-page)] px-4 pt-12 sm:px-6 lg:px-8">
      <header className="mb-10 border-b border-[var(--color-line)] pb-6">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
          Tag
        </span>
        <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">{tag.name}</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-mute)]">
          {totalPosts} {totalPosts === 1 ? 'story' : 'stories'}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <PostCard key={p.slug} post={p} variant="card" />
        ))}
      </div>

      <PaginationNav baseHref={`/tag/${slug}`} page={page} totalPages={totalPages} />
    </div>
  );
}
