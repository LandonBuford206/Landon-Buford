import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ListingPage,
  laterPageParams,
  listingMetadata,
  parsePageSegment,
} from '@/components/ListingPage';

export async function generateStaticParams() {
  return laterPageParams('category');
}

export async function generateMetadata(
  props: PageProps<'/category/[slug]/page/[n]'>
): Promise<Metadata> {
  const { slug, n } = await props.params;
  const page = parsePageSegment(n);
  return page ? listingMetadata('category', slug, page) : {};
}

export default async function CategoryPagedPage(props: PageProps<'/category/[slug]/page/[n]'>) {
  const { slug, n } = await props.params;
  const page = parsePageSegment(n);
  if (!page) notFound();
  return <ListingPage kind="category" slug={slug} page={page} />;
}
