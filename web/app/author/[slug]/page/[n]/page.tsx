import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ListingPage,
  laterPageParams,
  listingMetadata,
  parsePageSegment,
} from '@/components/ListingPage';

export async function generateStaticParams() {
  return laterPageParams('author');
}

export async function generateMetadata(
  props: PageProps<'/author/[slug]/page/[n]'>
): Promise<Metadata> {
  const { slug, n } = await props.params;
  const page = parsePageSegment(n);
  return page ? listingMetadata('author', slug, page) : {};
}

export default async function AuthorPagedPage(props: PageProps<'/author/[slug]/page/[n]'>) {
  const { slug, n } = await props.params;
  const page = parsePageSegment(n);
  if (!page) notFound();
  return <ListingPage kind="author" slug={slug} page={page} />;
}
