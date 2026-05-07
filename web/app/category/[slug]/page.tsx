import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostCard } from '@/components/PostCard';
import { PaginationNav } from '@/components/PaginationNav';
import { AdSlot } from '@/components/AdSlot';
import { getAllCategories, getCategory, listPosts } from '@/lib/content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://landonbuford.com';

export async function generateStaticParams() {
  const cats = await getAllCategories();
  return cats.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: PageProps<'/category/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const cat = await getCategory(slug);
  if (!cat) return {};
  return {
    title: cat.name,
    description: `Latest stories in ${cat.name} from LandonBuford.com.`,
    alternates: { canonical: `${SITE_URL}/category/${cat.slug}` },
  };
}

export default async function CategoryPage(props: PageProps<'/category/[slug]'>) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const page = parseInt((sp?.page as string) || '1', 10);

  const cat = await getCategory(slug);
  if (!cat) notFound();

  const { posts, totalPages, totalPosts } = await listPosts({
    categorySlug: slug,
    page,
  });

  if (posts.length === 0 && page === 1) notFound();

  return (
    <div className="mx-auto w-full max-w-[var(--container-page)] px-4 pt-12 sm:px-6 lg:px-8">
      <header className="mb-10 border-b border-[var(--color-line)] pb-6">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
          Category
        </span>
        <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">{cat.name}</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-mute)]">
          {totalPosts} {totalPosts === 1 ? 'story' : 'stories'}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <PostCard key={p.slug} post={p} variant="card" priority={i < 3} />
        ))}
      </div>

      {posts.length >= 6 && (
        <div className="my-16">
          <AdSlot placement="listing-mid" />
        </div>
      )}

      <PaginationNav baseHref={`/category/${slug}`} page={page} totalPages={totalPages} />
    </div>
  );
}
