import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Pin trace root to this dir so Next doesn't warn about the parent's
  // package-lock.json (the parent has scripts/ for the WXR importer).
  outputFileTracingRoot: path.join(process.cwd()),

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
};

export default nextConfig;
