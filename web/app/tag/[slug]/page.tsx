import type { Metadata } from 'next';
import { ListingPage, firstPageParams, listingMetadata } from '@/components/ListingPage';

export async function generateStaticParams() {
  return firstPageParams('tag');
}

export async function generateMetadata(props: PageProps<'/tag/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  return listingMetadata('tag', slug);
}

export default async function TagPage(props: PageProps<'/tag/[slug]'>) {
  const { slug } = await props.params;
  return <ListingPage kind="tag" slug={slug} />;
}
