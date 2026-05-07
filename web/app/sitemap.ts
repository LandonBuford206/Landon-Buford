import type { MetadataRoute } from 'next';
import { getAllAuthors, getAllCategories, getRecentPosts } from '@/lib/content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://landonbuford.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // for very large sitemaps, Next.js supports splitting via generateSitemaps;
  // 7,500 entries fit comfortably in a single sitemap file (50,000 max per sitemap.org)
  const [posts, cats, authors] = await Promise.all([
    getRecentPosts(10000),
    getAllCategories(),
    getAllAuthors(),
  ]);

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const postEntries = posts.map((p) => ({
    url: `${SITE_URL}/${p.slug}`,
    lastModified: p.publishedAt ? new Date(p.publishedAt) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const catEntries = cats.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const authorEntries = authors.map((a) => ({
    url: `${SITE_URL}/author/${a.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...postEntries, ...catEntries, ...authorEntries];
}
