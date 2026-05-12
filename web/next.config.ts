import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // The post pages read JSON files via dynamic paths (`${slug}.json`), which
  // Next's static analyzer cannot trace. Without this, the data/ files do not
  // ship with the serverless functions and on-demand-rendered posts (the
  // 7,000 outside the pre-built top 500) return ENOENT in production.
  outputFileTracingIncludes: {
    '/**/*': ['./data/**/*.json'],
  },

  // Pin Turbopack's filesystem root to this dir explicitly. Without this,
  // auto-detection can walk up to the parent (which contains a 59 MB WXR
  // file and a separate node_modules), ballooning the dev-server file
  // watcher and crashing low-memory machines.
  turbopack: {
    root: path.join(process.cwd()),
  },

  // Allow remote images from the original WordPress host (so featured images
  // resolve until the recovery script reuploads them) and from Wayback.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'landonbuford.com' },
      { protocol: 'https', hostname: 'web.archive.org' },
    ],
  },

  // The site has thousands of legacy URLs. Trailing slashes were never used.
  trailingSlash: false,

  // Map old WordPress URL patterns onto the new App Router routes so Google's
  // existing index transitions cleanly. Trailing-slash variants are handled
  // automatically by Next via `trailingSlash: false`.
  async redirects() {
    return [
      // Homepage and archive pagination
      { source: '/page/:n(\\d+)', destination: '/?page=:n', permanent: true },
      {
        source: '/category/:slug/page/:n(\\d+)',
        destination: '/category/:slug?page=:n',
        permanent: true,
      },
      {
        source: '/tag/:slug/page/:n(\\d+)',
        destination: '/tag/:slug?page=:n',
        permanent: true,
      },
      {
        source: '/author/:slug/page/:n(\\d+)',
        destination: '/author/:slug?page=:n',
        permanent: true,
      },
      // RSS — WordPress used /feed/ and /<archive>/feed/. Point everything
      // at the single /feed.xml route.
      { source: '/feed', destination: '/feed.xml', permanent: true },
      { source: '/category/:slug/feed', destination: '/feed.xml', permanent: true },
      { source: '/tag/:slug/feed', destination: '/feed.xml', permanent: true },
      { source: '/author/:slug/feed', destination: '/feed.xml', permanent: true },

      // Category consolidation (2026-05-07) — duplicate WordPress slugs
      // collapsed onto canonical ones. Mirrors SLUG_MAP in
      // scripts/consolidate-categories.ts.
      { source: '/category/music-news', destination: '/category/music', permanent: true },
      { source: '/category/music-news-2', destination: '/category/music', permanent: true },
      { source: '/category/music-news-3', destination: '/category/music', permanent: true },
      { source: '/category/wnba-sports', destination: '/category/wnba', permanent: true },
      { source: '/category/business-news-2', destination: '/category/business', permanent: true },
      { source: '/category/youtube-music', destination: '/category/youtube', permanent: true },
      { source: '/category/uncategorized', destination: '/category/general', permanent: true },

      // Author consolidation (2026-05-10) — Chad Hughes's posts were reassigned
      // to Landon Buford; preserve any inbound links to the old author page.
      { source: '/author/chad-hughes', destination: '/author/landon-buford', permanent: true },

      // WordPress legacy dated permalinks (2026-05-12) — the old WP install used
      // /YYYY/MM/DD/:slug/ as its permalink structure. The new site uses /:slug/
      // only, so forward the dated form to preserve inbound backlinks.
      {
        source: '/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug',
        destination: '/:slug',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
