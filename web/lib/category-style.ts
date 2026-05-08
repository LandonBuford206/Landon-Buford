/**
 * Per-category color identity. One source of truth for:
 *   - CategoryArt typographic image-fallback (bg + ink + rule)
 *   - PostCard category badge (rule color)
 *   - SectionHead eyebrow bar (rule color)
 *
 * Slugs not in SLUG_PALETTES fall back to a deterministic hash pick from
 * HASH_PALETTES, so the same long-tail category always reads the same.
 */

export interface Palette {
  bg: string;
  ink: string;
  rule: string;
}

const HASH_PALETTES: Palette[] = [
  { bg: '#1f2a44', ink: '#f4ede0', rule: '#d8a657' },
  { bg: '#2d2a26', ink: '#f3ece1', rule: '#c66e4f' },
  { bg: '#2b3a36', ink: '#eef2ec', rule: '#9bb59a' },
  { bg: '#3a2b3d', ink: '#f0e7ee', rule: '#c89bb8' },
  { bg: '#1c2a2a', ink: '#e7eded', rule: '#7fa7a3' },
  { bg: '#3b2c1e', ink: '#f3e8d8', rule: '#d4a26a' },
  { bg: '#26282d', ink: '#ebebee', rule: '#9ca0ad' },
  { bg: '#3d2926', ink: '#f1e6df', rule: '#cf8a6a' },
];

const SLUG_PALETTES: Record<string, Palette> = {
  sports:        { bg: '#2b3a36', ink: '#eef2ec', rule: '#9bb59a' }, // forest / sage
  nba:           { bg: '#3b2c1e', ink: '#f3e8d8', rule: '#d4a26a' }, // cocoa / honey
  wnba:          { bg: '#3a2b3d', ink: '#f0e7ee', rule: '#c89bb8' }, // aubergine / mauve
  nfl:           { bg: '#1c2a2a', ink: '#e7eded', rule: '#7fa7a3' }, // teal-noir / seaglass
  business:      { bg: '#1f2a44', ink: '#f4ede0', rule: '#d8a657' }, // navy / amber
  music:         { bg: '#3d2926', ink: '#f1e6df', rule: '#cf8a6a' }, // brick / terracotta
  entertainment: { bg: '#2d2a26', ink: '#f3ece1', rule: '#c66e4f' }, // espresso / clay
  interviews:    { bg: '#1c2a2a', ink: '#e7eded', rule: '#7fa7a3' }, // teal-noir / seaglass
  news:          { bg: '#26282d', ink: '#ebebee', rule: '#9ca0ad' }, // charcoal / steel
  general:       { bg: '#26282d', ink: '#ebebee', rule: '#9ca0ad' }, // charcoal / steel
  fashion:       { bg: '#3a2b3d', ink: '#f0e7ee', rule: '#c89bb8' }, // aubergine / mauve
  gaming:        { bg: '#1c2a2a', ink: '#e7eded', rule: '#7fa7a3' }, // teal-noir / seaglass
  technology:    { bg: '#1f2a44', ink: '#f4ede0', rule: '#d8a657' }, // navy / amber
  education:     { bg: '#2b3a36', ink: '#eef2ec', rule: '#9bb59a' }, // forest / sage
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function paletteFor(slug?: string | null): Palette {
  if (!slug) return SLUG_PALETTES.general;
  return SLUG_PALETTES[slug] ?? HASH_PALETTES[hashString(slug) % HASH_PALETTES.length];
}

/**
 * The "rule" color from a category's palette — the accent used for badges,
 * eyebrow bars, and decorative rules.
 */
export function accentColor(slug?: string | null): string {
  return paletteFor(slug).rule;
}
