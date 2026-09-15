import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ListingPage,
  laterPageParams,
  listingMetadata,
  parsePageSegment,
} from '@/components/ListingPage';

export async function generateStaticParams() {
  return laterPageParams('tag');
}

export async function generateMetadata(
  props: PageProps<'/tag/[slug]/page/[n]'>
): Promise<Metadata> {
  const { slug, n } = await props.params;
  const page = parsePageSegment(n);
  return page ? listingMetadata('tag', slug, page) : {};
}

export default async function TagPagedPage(props: PageProps<'/tag/[slug]/page/[n]'>) {
  const { slug, n } = await props.params;
  const page = parsePageSegment(n);
  if (!page) notFound();
  return <ListingPage kind="tag" slug={slug} page={page} />;
}
