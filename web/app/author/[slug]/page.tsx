import type { Metadata } from 'next';
import { ListingPage, firstPageParams, listingMetadata } from '@/components/ListingPage';

export async function generateStaticParams() {
  return firstPageParams('author');
}

export async function generateMetadata(props: PageProps<'/author/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  return listingMetadata('author', slug);
}

export default async function AuthorPage(props: PageProps<'/author/[slug]'>) {
  const { slug } = await props.params;
  return <ListingPage kind="author" slug={slug} />;
}
