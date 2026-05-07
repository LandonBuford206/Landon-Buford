/**
 * Wayback Machine image recovery.
 *
 * For every unique image URL referenced in data/posts/*.json:
 *   1. Query the Wayback availability API for the closest snapshot.
 *   2. Download the snapshot bytes.
 *   3. Save to data/_images/{sha256(originalUrl)}.{ext}
 *   4. Rewrite each post JSON to add blobUrl (local path for now;
 *      a future deploy script will upload to Vercel Blob and rewrite again).
 *
 * Run: npm run scrape-images
 *      npm run scrape-images -- --report      (count only, no downloads)
 *      npm run scrape-images -- --limit 100   (test with 100 URLs)
 *      npm run scrape-images -- --concurrency 3
 *
 * The script is idempotent and resumable: it tracks progress in
 * data/_progress/wayback.json so you can stop and restart.
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const DATA_DIR = 'web/data';
const POSTS_DIR = join(DATA_DIR, 'posts');
const IMAGES_DIR = join(DATA_DIR, '_images');
const PROGRESS_DIR = join(DATA_DIR, '_progress');
const PROGRESS_FILE = join(PROGRESS_DIR, 'wayback.json');
const INDEX_FILE = join(DATA_DIR, 'index.json');

interface ProgressEntry {
  originalUrl: string;
  status: 'ok' | 'miss' | 'error';
  localPath?: string;
  snapshotUrl?: string;
  error?: string;
  triedAt: string;
}

interface ProgressFile {
  entries: Record<string, ProgressEntry>; // keyed by hash(originalUrl)
}

function urlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 24);
}

function pickExt(url: string, contentType: string | null): string {
  const fromUrl = extname(new URL(url).pathname).toLowerCase().replace(/\?.*/, '');
  if (/^\.(jpg|jpeg|png|gif|webp|avif|svg)$/.test(fromUrl)) return fromUrl;
  if (contentType?.includes('jpeg')) return '.jpg';
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('gif')) return '.gif';
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('svg')) return '.svg';
  return '.jpg';
}

async function loadProgress(): Promise<ProgressFile> {
  if (!existsSync(PROGRESS_FILE)) return { entries: {} };
  try {
    return JSON.parse(await readFile(PROGRESS_FILE, 'utf8')) as ProgressFile;
  } catch {
    return { entries: {} };
  }
}

async function saveProgress(p: ProgressFile): Promise<void> {
  await writeFile(PROGRESS_FILE, JSON.stringify(p, null, 0));
}

async function collectUrls(): Promise<string[]> {
  const files = await readdir(POSTS_DIR);
  const urls = new Set<string>();
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const post = JSON.parse(await readFile(join(POSTS_DIR, f), 'utf8'));
    if (post.heroImage?.originalUrl) urls.add(post.heroImage.originalUrl);
    for (const u of post.inlineImageUrls || []) urls.add(u);
  }
  return [...urls];
}

interface WaybackAvailability {
  archived_snapshots?: {
    closest?: {
      available: boolean;
      url: string;
      timestamp: string;
      status: string;
    };
  };
}

async function findSnapshot(url: string): Promise<string | null> {
  const api = `http://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
  // Retry transient errors with exponential backoff. Wayback's availability
  // endpoint frequently 503s under load — these are recoverable.
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(api, {
        headers: { 'User-Agent': 'landonbuford-rebuild/0.1' },
      });
      if (res.status === 429 || res.status === 503 || res.status >= 500) {
        // backoff: 2s, 5s, 10s, 20s
        const wait = [2000, 5000, 10000, 20000][attempt];
        await sleep(wait);
        lastErr = new Error(`availability ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`availability ${res.status}`);
      const json = (await res.json()) as WaybackAvailability;
      const closest = json.archived_snapshots?.closest;
      if (!closest?.available) return null;
      if (closest.status !== '200') return null;
      // strip the wayback wrapper to get the raw archived bytes
      // pattern: https://web.archive.org/web/{ts}/{originalUrl}
      // -> https://web.archive.org/web/{ts}im_/{originalUrl}  (im_ = raw image)
      return closest.url.replace(/(\/web\/\d+)\//, (_m, p1) => `${p1}im_/`);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      await sleep(2000 + attempt * 1000);
    }
  }
  throw lastErr ?? new Error('availability failed after retries');
}

async function downloadImage(snapshotUrl: string, hash: string): Promise<string> {
  const res = await fetch(snapshotUrl, {
    headers: { 'User-Agent': 'landonbuford-rebuild/0.1' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error('payload too small');
  const ext = pickExt(snapshotUrl, res.headers.get('content-type'));
  const path = join(IMAGES_DIR, `${hash}${ext}`);
  await writeFile(path, buf);
  return path;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function rewritePostUrls(progress: ProgressFile): Promise<void> {
  console.log('Rewriting post JSON files with local image paths...');
  const files = await readdir(POSTS_DIR);
  let touched = 0;
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const path = join(POSTS_DIR, f);
    const post = JSON.parse(await readFile(path, 'utf8'));
    let changed = false;
    if (post.heroImage?.originalUrl) {
      const e = progress.entries[urlHash(post.heroImage.originalUrl)];
      if (e?.status === 'ok' && e.localPath) {
        post.heroImage.localPath = e.localPath.replace(/\\/g, '/');
        changed = true;
      }
    }
    if (changed) {
      await writeFile(path, JSON.stringify(post));
      touched++;
    }
  }
  // also update index.json
  const idx = JSON.parse(await readFile(INDEX_FILE, 'utf8'));
  for (const entry of idx) {
    if (entry.heroImage?.originalUrl) {
      const e = progress.entries[urlHash(entry.heroImage.originalUrl)];
      if (e?.status === 'ok' && e.localPath) {
        entry.heroImage.localPath = e.localPath.replace(/\\/g, '/');
      }
    }
  }
  await writeFile(INDEX_FILE, JSON.stringify(idx));
  console.log(`Rewrote ${touched} post files + index.json`);
}

async function main() {
  const reportOnly = process.argv.includes('--report');
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;
  const concArg = process.argv.indexOf('--concurrency');
  const concurrency = concArg !== -1 ? parseInt(process.argv[concArg + 1], 10) : 3;

  await mkdir(IMAGES_DIR, { recursive: true });
  await mkdir(PROGRESS_DIR, { recursive: true });

  console.log('Collecting unique image URLs from posts...');
  const allUrls = await collectUrls();
  console.log(`Found ${allUrls.length} unique image URLs`);

  if (reportOnly) {
    const progress = await loadProgress();
    const stats = { ok: 0, miss: 0, error: 0, untried: 0 };
    for (const url of allUrls) {
      const e = progress.entries[urlHash(url)];
      if (!e) stats.untried++;
      else stats[e.status]++;
    }
    console.log('Status:', stats);
    return;
  }

  const progress = await loadProgress();
  const work = allUrls
    .filter((url) => {
      const e = progress.entries[urlHash(url)];
      return !e || e.status === 'error'; // retry errors, skip ok and miss
    })
    .slice(0, limit);

  console.log(`Processing ${work.length} URLs (concurrency=${concurrency})`);
  console.log(`(${allUrls.length - work.length} already attempted)`);

  let processed = 0;
  let okCount = 0;
  let missCount = 0;
  let errCount = 0;

  async function worker(slice: string[]) {
    for (const url of slice) {
      const hash = urlHash(url);
      const entry: ProgressEntry = {
        originalUrl: url,
        status: 'error',
        triedAt: new Date().toISOString(),
      };
      try {
        const snap = await findSnapshot(url);
        if (!snap) {
          entry.status = 'miss';
          missCount++;
        } else {
          const path = await downloadImage(snap, hash);
          entry.status = 'ok';
          entry.localPath = path;
          entry.snapshotUrl = snap;
          okCount++;
        }
      } catch (e) {
        entry.error = e instanceof Error ? e.message : String(e);
        errCount++;
      }
      progress.entries[hash] = entry;
      processed++;
      if (processed % 25 === 0) {
        await saveProgress(progress);
        console.log(
          `  ${processed}/${work.length}  ok=${okCount} miss=${missCount} err=${errCount}`
        );
      }
      // be polite to archive.org — they rate-limit aggressively
      await sleep(800);
    }
  }

  // simple round-robin partition
  const chunks: string[][] = Array.from({ length: concurrency }, () => []);
  work.forEach((u, i) => chunks[i % concurrency].push(u));
  await Promise.all(chunks.map(worker));

  await saveProgress(progress);
  console.log(`\nFinal: ok=${okCount} miss=${missCount} err=${errCount}`);

  await rewritePostUrls(progress);
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
