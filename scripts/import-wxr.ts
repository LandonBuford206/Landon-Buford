/**
 * WordPress WXR -> normalized JSON importer.
 *
 * Streams the 59 MB XML, parses each <item> with fast-xml-parser, and writes:
 *   data/posts/{slug}.json    (full post: htmlContent + metadata)
 *   data/index.json           (slim list, sorted newest-first)
 *   data/categories.json
 *   data/tags.json
 *   data/authors.json
 *
 * Run: npm run import
 *      npm run import:report   (parse only, no writes)
 */

import { XMLParser } from 'fast-xml-parser';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const XML_PATH = 'landonbufordcom.WordPress.2026-04-23.xml';
const OUT_DIR = 'web/data';

interface AuthorRecord {
  slug: string;
  login: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

interface PostJson {
  slug: string;
  postId: number;
  title: string;
  htmlContent: string;
  excerpt: string;
  publishedAt: string;
  modifiedAt: string;
  author: { slug: string; displayName: string };
  categories: { slug: string; name: string }[];
  tags: { slug: string; name: string }[];
  heroImage: { originalUrl: string; blobUrl?: string; alt?: string } | null;
  inlineImageUrls: string[];
  readingTimeMin: number;
  type: 'post' | 'page';
  link: string;
}

interface IndexEntry {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: { slug: string; displayName: string };
  primaryCategory: { slug: string; name: string } | null;
  heroImage: { originalUrl: string; blobUrl?: string } | null;
  readingTimeMin: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  isArray: (name) =>
    ['category', 'wp:postmeta', 'wp:author', 'wp:category', 'wp:tag'].includes(name),
});

function readField(node: unknown, ...keys: string[]): string {
  if (!node || typeof node !== 'object') return '';
  const obj = node as Record<string, unknown>;
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      const inner = v as Record<string, unknown>;
      if (typeof inner.__cdata === 'string') return inner.__cdata;
      if (typeof inner['#text'] === 'string') return inner['#text'];
    }
  }
  return '';
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function slugify(s: string): string {
  return (
    (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'untitled'
  );
}

function fsSlug(slug: string): string {
  return slug.replace(/[^a-z0-9-_]/gi, '-').slice(0, 200) || 'untitled';
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImageUrls(html: string): string[] {
  const urls = new Set<string>();
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) urls.add(m[1]);
  return [...urls];
}

function calcReadingTime(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function makeExcerpt(html: string, max = 200): string {
  const t = stripHtml(html);
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function toIsoDate(wpDate: string): string {
  if (!wpDate) return '';
  const m = wpDate.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  if (m) return `${m[1]}T${m[2]}Z`;
  // pubDate like "Wed, 15 Mar 2024 14:30:00 +0000"
  const d = new Date(wpDate);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return '';
}

async function main() {
  const reportOnly = process.argv.includes('--report');
  console.log(`WXR importer ${reportOnly ? '(report only)' : ''}`);

  await mkdir(join(OUT_DIR, 'posts'), { recursive: true });

  const stream = createReadStream(XML_PATH, {
    encoding: 'utf8',
    highWaterMark: 256 * 1024,
  });
  let buffer = '';
  let headerCaptured = false;

  const authors = new Map<string, AuthorRecord>();
  const categoriesMeta = new Map<
    string,
    { slug: string; name: string; parentSlug: string | null }
  >();
  const tagsMeta = new Map<string, { slug: string; name: string }>();

  // post_id -> attachment URL
  const attachmentUrls = new Map<number, string>();

  // Defer post writes until after the full stream so featured-image
  // resolution sees all attachments (which appear late in the file).
  const collectedPosts: { item: Record<string, unknown>; postType: 'post' | 'page' }[] = [];

  const stats = {
    posts: 0,
    pages: 0,
    attachments: 0,
    nonPublished: 0,
    other: 0,
  };

  function processHeader(headerXml: string) {
    const wrapped = headerXml + '</channel></rss>';
    let parsed: Record<string, unknown>;
    try {
      parsed = parser.parse(wrapped) as Record<string, unknown>;
    } catch (e) {
      console.error('Failed to parse channel header', e);
      return;
    }
    const rss = parsed.rss as Record<string, unknown> | undefined;
    const channel = rss?.channel as Record<string, unknown> | undefined;
    if (!channel) return;

    for (const a of asArray(channel['wp:author'])) {
      const login = readField(a, 'wp:author_login');
      if (!login) continue;
      const displayName = readField(a, 'wp:author_display_name') || login;
      authors.set(login, {
        slug: slugify(displayName),
        login,
        email: readField(a, 'wp:author_email'),
        displayName,
        firstName: readField(a, 'wp:author_first_name'),
        lastName: readField(a, 'wp:author_last_name'),
      });
    }

    for (const c of asArray(channel['wp:category'])) {
      const slug = readField(c, 'wp:category_nicename');
      if (!slug) continue;
      const parent = readField(c, 'wp:category_parent');
      categoriesMeta.set(slug, {
        slug,
        name: readField(c, 'wp:cat_name') || slug,
        parentSlug: parent || null,
      });
    }

    for (const t of asArray(channel['wp:tag'])) {
      const slug = readField(t, 'wp:tag_slug');
      if (!slug) continue;
      tagsMeta.set(slug, { slug, name: readField(t, 'wp:tag_name') || slug });
    }

    console.log(
      `Header: ${authors.size} authors, ${categoriesMeta.size} categories, ${tagsMeta.size} tags`
    );
  }

  function processItem(itemXml: string) {
    const wrapped =
      `<root xmlns:wp="http://wordpress.org/export/1.2/"` +
      ` xmlns:dc="http://purl.org/dc/elements/1.1/"` +
      ` xmlns:content="http://purl.org/rss/1.0/modules/content/"` +
      ` xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/">${itemXml}</root>`;
    let parsed: Record<string, unknown>;
    try {
      parsed = parser.parse(wrapped) as Record<string, unknown>;
    } catch (e) {
      console.error('Item parse error', e);
      return;
    }
    const root = parsed.root as Record<string, unknown> | undefined;
    const item = root?.item as Record<string, unknown> | undefined;
    if (!item) return;

    const postType = readField(item, 'wp:post_type') || 'post';
    const postId = parseInt(readField(item, 'wp:post_id') || '0', 10);
    const status = readField(item, 'wp:status');

    if (postType === 'attachment') {
      const url = readField(item, 'wp:attachment_url');
      if (url && postId) attachmentUrls.set(postId, url);
      stats.attachments++;
      return;
    }

    if (postType !== 'post' && postType !== 'page') {
      stats.other++;
      return;
    }

    if (status !== 'publish') {
      stats.nonPublished++;
      return;
    }

    // WordPress sometimes leaves orphan posts whose slug starts with
    // `__trashed` — soft-deleted items that never got purged. Skip them
    // even when status reports as 'publish'.
    const rawPostName = readField(item, 'wp:post_name') || '';
    if (rawPostName.startsWith('__trashed')) {
      stats.nonPublished++;
      return;
    }

    if (postType === 'post') stats.posts++;
    else stats.pages++;

    collectedPosts.push({ item, postType });
  }

  // ---- streaming pass ----
  console.log('Streaming XML...');
  for await (const chunk of stream) {
    buffer += chunk;

    if (!headerCaptured) {
      const firstItem = buffer.indexOf('<item>');
      if (firstItem !== -1) {
        processHeader(buffer.slice(0, firstItem));
        buffer = buffer.slice(firstItem);
        headerCaptured = true;
      }
    }

    if (headerCaptured) {
      let endIdx: number;
      while ((endIdx = buffer.indexOf('</item>')) !== -1) {
        const startIdx = buffer.lastIndexOf('<item>', endIdx);
        if (startIdx === -1) {
          buffer = buffer.slice(endIdx + '</item>'.length);
          continue;
        }
        const itemXml = buffer.slice(startIdx, endIdx + '</item>'.length);
        buffer = buffer.slice(endIdx + '</item>'.length);
        processItem(itemXml);
      }
    }
  }

  console.log(
    `Streamed: ${stats.posts} posts, ${stats.pages} pages, ${stats.attachments} attachments, ` +
      `${stats.nonPublished} non-published, ${stats.other} other`
  );

  // ---- resolve & write ----
  console.log('Resolving featured images and writing JSON...');

  const indexEntries: IndexEntry[] = [];
  const slugCounts = new Map<string, number>();
  let writeQueue: Promise<unknown>[] = [];
  let written = 0;
  const failures: { slug: string; reason: string }[] = [];

  for (const { item, postType } of collectedPosts) {
    try {
      // Normalize the slug to the filesystem-safe form used for filenames.
      // WordPress sometimes stores URL-encoded post_name values for posts
      // with non-ASCII titles (Hebrew, CJK, etc.) — keeping those raw would
      // produce a slug in index.json that no file on disk matches, breaking
      // the build at static-render time. fsSlug is idempotent on ordinary
      // ASCII slugs, so this is a no-op for the vast majority of posts.
      const rawPostName = readField(item, 'wp:post_name') || slugify(readField(item, 'title'));
      const normalized = fsSlug(rawPostName);
      const count = (slugCounts.get(normalized) ?? 0) + 1;
      slugCounts.set(normalized, count);
      const slug = count === 1 ? normalized : `${normalized}-${count}`;

      const title = readField(item, 'title') || '(untitled)';
      const link = readField(item, 'link');
      const html = readField(item, 'content:encoded');
      const wpExcerpt = readField(item, 'excerpt:encoded');
      const excerpt = wpExcerpt ? stripHtml(wpExcerpt) : makeExcerpt(html);
      const pubDate =
        readField(item, 'wp:post_date_gmt') ||
        readField(item, 'wp:post_date') ||
        readField(item, 'pubDate');
      const modDate =
        readField(item, 'wp:post_modified_gmt') ||
        readField(item, 'wp:post_modified') ||
        pubDate;
      const creator = readField(item, 'dc:creator');
      const postId = parseInt(readField(item, 'wp:post_id') || '0', 10);

      const authorRecord: AuthorRecord = authors.get(creator) ?? {
        slug: slugify(creator || 'unknown'),
        login: creator,
        email: '',
        displayName: creator || 'Unknown',
        firstName: '',
        lastName: '',
      };

      // categories & tags from <category domain="..." nicename="...">CDATA</category>
      const cats: { slug: string; name: string }[] = [];
      const tags: { slug: string; name: string }[] = [];
      for (const c of asArray(item.category as unknown)) {
        if (typeof c !== 'object' || c === null) continue;
        const obj = c as Record<string, unknown>;
        const domain = obj['@_domain'] as string | undefined;
        const nicename = obj['@_nicename'] as string | undefined;
        if (!nicename) continue;
        const cdataName =
          (typeof obj.__cdata === 'string' && obj.__cdata) ||
          (typeof obj['#text'] === 'string' && obj['#text']) ||
          '';
        if (domain === 'category') {
          cats.push({
            slug: nicename,
            name: cdataName || categoriesMeta.get(nicename)?.name || nicename,
          });
        } else if (domain === 'post_tag') {
          tags.push({
            slug: nicename,
            name: cdataName || tagsMeta.get(nicename)?.name || nicename,
          });
        }
      }

      // featured image via _thumbnail_id postmeta
      let heroOriginalUrl: string | null = null;
      for (const m of asArray(item['wp:postmeta'] as unknown)) {
        const k = readField(m, 'wp:meta_key');
        if (k !== '_thumbnail_id') continue;
        const v = readField(m, 'wp:meta_value');
        const id = parseInt(v, 10);
        if (id && attachmentUrls.has(id)) {
          heroOriginalUrl = attachmentUrls.get(id) ?? null;
        }
        break;
      }

      const inlineImages = extractImageUrls(html);
      if (!heroOriginalUrl && inlineImages.length > 0) {
        heroOriginalUrl = inlineImages[0];
      }

      const post: PostJson = {
        slug,
        postId,
        title,
        htmlContent: html,
        excerpt,
        publishedAt: toIsoDate(pubDate),
        modifiedAt: toIsoDate(modDate),
        author: { slug: authorRecord.slug, displayName: authorRecord.displayName },
        categories: cats,
        tags,
        heroImage: heroOriginalUrl ? { originalUrl: heroOriginalUrl } : null,
        inlineImageUrls: inlineImages,
        readingTimeMin: calcReadingTime(html),
        type: postType,
        link,
      };

      if (!reportOnly) {
        const path = join(OUT_DIR, 'posts', `${fsSlug(slug)}.json`);
        writeQueue.push(writeFile(path, JSON.stringify(post)));
        if (writeQueue.length >= 200) {
          await Promise.all(writeQueue);
          writeQueue = [];
        }
      }

      indexEntries.push({
        slug,
        title,
        excerpt,
        publishedAt: post.publishedAt,
        author: post.author,
        primaryCategory: cats[0] ?? null,
        heroImage: post.heroImage,
        readingTimeMin: post.readingTimeMin,
      });

      written++;
      if (written % 1000 === 0) console.log(`  ...processed ${written}`);
    } catch (e) {
      failures.push({
        slug: readField(item, 'wp:post_name'),
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (writeQueue.length > 0) await Promise.all(writeQueue);

  if (!reportOnly) {
    indexEntries.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(indexEntries));

    await writeFile(
      join(OUT_DIR, 'categories.json'),
      JSON.stringify([...categoriesMeta.values()], null, 2)
    );
    await writeFile(join(OUT_DIR, 'tags.json'), JSON.stringify([...tagsMeta.values()]));

    const authorsArr = [...authors.values()].map((a) => ({
      slug: a.slug,
      displayName: a.displayName,
      firstName: a.firstName,
      lastName: a.lastName,
    }));
    await writeFile(join(OUT_DIR, 'authors.json'), JSON.stringify(authorsArr, null, 2));
  }

  console.log(`\nDone. ${written} posts written.`);
  if (failures.length > 0) {
    console.log(`Failures: ${failures.length}`);
    for (const f of failures.slice(0, 10)) console.log(`  ${f.slug}: ${f.reason}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
