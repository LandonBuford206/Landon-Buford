import { getRecentPosts } from '@/lib/content';
import { decodeEntities } from '@/lib/html';

/**
 * Returns a slim search index for client-side search.
 * Just title + excerpt + slug + author + category — enough for substring
 * matching but small enough to download quickly (~2 MB for 7,500 posts).
 *
 * Memoized at module scope: the index is built once per server process and
 * reused, instead of re-reading 7,500 post files on every request. CDN
 * cache headers still apply on top of that.
 */
async function buildIndex() {
  const all = await getRecentPosts(20000);
  return all.map((p) => ({
    s: p.slug,
    t: decodeEntities(p.title),
    e: decodeEntities(p.excerpt).slice(0, 240),
    a: p.author.displayName,
    c: p.primaryCategory?.name ?? null,
    d: p.publishedAt,
  }));
}

let cached: Awaited<ReturnType<typeof buildIndex>> | null = null;

export async function GET() {
  cached ??= await buildIndex();
  return Response.json(cached, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
