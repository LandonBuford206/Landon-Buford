import type { Metadata } from 'next';
import { ListingPage, firstPageParams, listingMetadata } from '@/components/ListingPage';

export async function generateStaticParams() {
  return firstPageParams('category');
}

export async function generateMetadata(props: PageProps<'/category/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  return listingMetadata('category', slug);
}

export default async function CategoryPage(props: PageProps<'/category/[slug]'>) {
  const { slug } = await props.params;
  return <ListingPage kind="category" slug={slug} />;
}
