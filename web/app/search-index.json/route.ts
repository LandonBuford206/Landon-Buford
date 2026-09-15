import { getRecentPosts } from '@/lib/content';
import { decodeEntities } from '@/lib/html';

// Rendered once into a static file, so it works on the SiteGround export.
export const dynamic = 'force-static';

/**
 * Slim search index for client-side search (app/search/SearchClient.tsx).
 * Just title + excerpt + slug + author + category — enough for substring
 * matching but small enough to download quickly (~3 MB for 7,500 posts).
 */
export async function GET() {
  const all = await getRecentPosts(20000);
  return Response.json(
    all.map((p) => ({
      s: p.slug,
      t: decodeEntities(p.title),
      e: decodeEntities(p.excerpt).slice(0, 240),
      a: p.author.displayName,
      c: p.primaryCategory?.name ?? null,
      d: p.publishedAt,
    }))
  );
}
