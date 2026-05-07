import { getRecentPosts, getPost } from '@/lib/content';
import { decodeEntities, htmlToText } from '@/lib/html';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://landonbuford.com';

export async function GET() {
  const recent = await getRecentPosts(50);

  const items = await Promise.all(
    recent.map(async (entry) => {
      const post = await getPost(entry.slug);
      if (!post) return '';
      const link = `${SITE_URL}/${post.slug}`;
      const desc = htmlToText(post.excerpt).slice(0, 500);
      const cats = post.categories
        .map((c) => `<category>${escapeXml(c.name)}</category>`)
        .join('');
      return `
    <item>
      <title>${escapeXml(decodeEntities(post.title))}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(post.author.displayName)}</dc:creator>
      ${cats}
      <description>${escapeXml(desc)}</description>
      <content:encoded><![CDATA[${post.htmlContent}]]></content:encoded>
    </item>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LandonBuford.com</title>
    <link>${SITE_URL}</link>
    <description>Where Sports and Business Intersect</description>
    <language>en-US</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items.join('')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
