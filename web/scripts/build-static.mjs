// Builds the static public site for SiteGround into web/out.
//
// The admin area, API routes and proxy need a server, so they can't be part of
// a static export. They're moved aside for the build and always put back
// afterwards; they keep running on Vercel.
//
// Usage (from web/): node scripts/build-static.mjs

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Outside .next/ and out/, which the build wipes.
const stash = join(root, 'node_modules', '.cache', 'static-build-stash');
const SERVER_ONLY = ['app/admin', 'app/api', 'proxy.ts'];

if (existsSync(stash)) {
  console.error(
    `A previous static build was interrupted before restoring files.\n` +
      `Move everything in ${stash} back (e.g. app__admin -> app/admin), delete that folder, then retry.`
  );
  process.exit(1);
}

mkdirSync(stash, { recursive: true });
const moved = [];
let status = 1;

try {
  for (const rel of SERVER_ONLY) {
    const from = join(root, rel);
    if (!existsSync(from)) continue;
    const to = join(stash, rel.replaceAll('/', '__'));
    renameSync(from, to);
    moved.push([from, to]);
  }

  const result = spawnSync('npx', ['next', 'build', '--webpack'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      BUILD_TARGET: 'static',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=4096`.trim(),
    },
  });
  status = result.status ?? 1;
} finally {
  for (const [from, to] of moved.reverse()) renameSync(to, from);
  rmSync(stash, { recursive: true, force: true });
}

if (status === 0) {
  const removed = pruneNavigationPayloads(join(root, 'out'));
  console.log(`Removed ${removed} client-navigation payload entries from out/.`);
}

process.exit(status);

// Public links are plain <a> tags, so the RSC payloads Next writes for
// client-side navigation (X.txt beside X.html, plus __next.* files and
// folders) are never requested. Dropping them takes the export from ~197k
// files to ~23k, well inside SiteGround's inode quota. Real .txt files such
// as ads.txt and robots.txt have no .html twin and are kept.
function pruneNavigationPayloads(dir) {
  let removed = 0;
  const entries = readdirSync(dir, { withFileTypes: true });
  const names = new Set(entries.map((e) => e.name));
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.name.startsWith('__next.')) {
      rmSync(path, { recursive: true, force: true });
      removed++;
    } else if (entry.isDirectory()) {
      if (entry.name === '_next') continue;
      removed += pruneNavigationPayloads(path);
      // Post folders held nothing but payloads; each one is still an inode.
      if (readdirSync(path).length === 0) {
        rmSync(path, { recursive: true });
        removed++;
      }
    } else if (entry.name.endsWith('.txt') && names.has(`${entry.name.slice(0, -4)}.html`)) {
      rmSync(path);
      removed++;
    }
  }
  return removed;
}
