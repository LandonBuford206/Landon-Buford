/**
 * Designed fallback for posts that have no recovered image.
 * Renders an editorial-quality typographic card — solid color, serif overlay,
 * thin accent rule. Looks intentional, not "image failed to load".
 *
 * Used by PostCard (as the image fallback) and ArticleHeader (as the hero
 * fallback). Colors are deterministic per category so the same category
 * always reads the same.
 */

import { decodeEntities } from '@/lib/html';

export type CategoryArtSize = 'card' | 'feature' | 'lead' | 'hero' | 'compact';

interface CategoryArtProps {
  title: string;
  category?: string | null;
  size?: CategoryArtSize;
}

interface Palette {
  bg: string;
  ink: string;
  rule: string;
}

// Editorial palette — deep, desaturated, magazine-y. None compete with the
// brand's accent red. Each pair is bg + readable text + a subtle rule color.
const PALETTES: Palette[] = [
  { bg: '#1f2a44', ink: '#f4ede0', rule: '#d8a657' }, // deep navy / cream / amber
  { bg: '#2d2a26', ink: '#f3ece1', rule: '#c66e4f' }, // espresso / oat / clay
  { bg: '#2b3a36', ink: '#eef2ec', rule: '#9bb59a' }, // forest / mist / sage
  { bg: '#3a2b3d', ink: '#f0e7ee', rule: '#c89bb8' }, // aubergine / blush / mauve
  { bg: '#1c2a2a', ink: '#e7eded', rule: '#7fa7a3' }, // teal-noir / fog / seaglass
  { bg: '#3b2c1e', ink: '#f3e8d8', rule: '#d4a26a' }, // cocoa / cream / honey
  { bg: '#26282d', ink: '#ebebee', rule: '#9ca0ad' }, // charcoal / paper / steel
  { bg: '#3d2926', ink: '#f1e6df', rule: '#cf8a6a' }, // brick / sand / terracotta
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function paletteFor(category: string | null | undefined): Palette {
  if (!category) return PALETTES[6];
  return PALETTES[hashString(category) % PALETTES.length];
}

const TITLE_TRUNCATE: Record<CategoryArtSize, number> = {
  hero: 200,
  lead: 140,
  feature: 90,
  card: 70,
  compact: 50,
};

const TITLE_CLASSES: Record<CategoryArtSize, string> = {
  hero: 'text-4xl md:text-6xl lg:text-7xl leading-[0.95]',
  lead: 'text-3xl md:text-4xl lg:text-5xl leading-[1.0]',
  feature: 'text-2xl md:text-3xl leading-[1.05]',
  card: 'text-xl md:text-2xl leading-[1.1]',
  compact: 'text-base leading-[1.15]',
};

const PADDING: Record<CategoryArtSize, string> = {
  hero: 'p-10 md:p-16 lg:p-20',
  lead: 'p-6 md:p-10',
  feature: 'p-5 md:p-7',
  card: 'p-4 md:p-5',
  compact: 'p-2',
};

export function CategoryArt({ title, category, size = 'card' }: CategoryArtProps) {
  const p = paletteFor(category);
  const decoded = decodeEntities(title);
  const truncated =
    decoded.length > TITLE_TRUNCATE[size]
      ? decoded.slice(0, TITLE_TRUNCATE[size] - 1).replace(/\s+\S*$/, '') + '…'
      : decoded;

  // Compact variant: tiny square, just initials of the category
  if (size === 'compact') {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ backgroundColor: p.bg, color: p.ink }}
      >
        <span
          className="font-serif text-xs uppercase tracking-[0.16em]"
          style={{ color: p.rule }}
        >
          {(category ?? 'LB').slice(0, 3)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between ${PADDING[size]}`}
      style={{ backgroundColor: p.bg, color: p.ink }}
    >
      {/* corner mark */}
      <div className="flex items-start justify-between gap-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: p.rule }}
        >
          {category ?? 'LandonBuford'}
        </span>
        <span
          className="font-serif text-[10px] uppercase tracking-[0.16em] opacity-60"
          aria-hidden
        >
          LB
        </span>
      </div>

      {/* the title fills the available vertical space */}
      <h3
        className={`font-serif tracking-tight ${TITLE_CLASSES[size]}`}
        style={{ color: p.ink }}
      >
        {truncated}
      </h3>

      {/* baseline rule */}
      <div className="mt-4 flex items-center gap-3" aria-hidden>
        <span
          className="block h-px flex-1"
          style={{ backgroundColor: p.rule, opacity: 0.5 }}
        />
        <span className="font-serif italic text-xs opacity-60">
          landonbuford.com
        </span>
      </div>
    </div>
  );
}
