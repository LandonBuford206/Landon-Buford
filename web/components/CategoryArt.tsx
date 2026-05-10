/**
 * Designed fallback for posts that have no recovered image.
 * Renders an editorial-quality typographic card — solid color, serif overlay,
 * thin accent rule. Looks intentional, not "image failed to load".
 *
 * Used by PostCard (as the image fallback) and ArticleHeader (as the hero
 * fallback). Colors come from lib/category-style — same palette feeds the
 * card badge and section eyebrow bar so identity is consistent.
 */

import { decodeEntities } from '@/lib/html';
import { paletteFor } from '@/lib/category-style';

export type CategoryArtSize = 'card' | 'feature' | 'lead' | 'hero' | 'compact';

interface CategoryArtProps {
  title: string;
  category?: { slug: string; name: string } | string | null;
  size?: CategoryArtSize;
}

const TITLE_TRUNCATE: Record<CategoryArtSize, number> = {
  hero: 200,
  lead: 140,
  feature: 90,
  card: 70,
  compact: 50,
};

// Every non-compact size renders the title inside a fixed-aspect-ratio box
// with overflow-hidden. Long titles wrap past the available height and clip,
// so we tier the font size down by character length. Tier 1 of each size
// matches the original static font, so short-title cards are unchanged.
type TitleTier = { max: number; cls: string };

const TITLE_TIERS: Record<Exclude<CategoryArtSize, 'compact'>, TitleTier[]> = {
  hero: [
    { max: 50, cls: 'text-4xl md:text-6xl lg:text-7xl leading-[0.95]' },
    { max: 90, cls: 'text-3xl md:text-5xl lg:text-6xl leading-[1.0]' },
    { max: 140, cls: 'text-2xl md:text-4xl lg:text-5xl leading-[1.05]' },
    { max: Infinity, cls: 'text-xl md:text-3xl lg:text-4xl leading-[1.1]' },
  ],
  lead: [
    { max: 50, cls: 'text-3xl md:text-4xl lg:text-5xl leading-[1.0]' },
    { max: 90, cls: 'text-2xl md:text-3xl lg:text-4xl leading-[1.05]' },
    { max: Infinity, cls: 'text-xl md:text-2xl lg:text-3xl leading-[1.1]' },
  ],
  feature: [
    { max: 45, cls: 'text-2xl md:text-3xl leading-[1.05]' },
    { max: 70, cls: 'text-xl md:text-2xl leading-[1.1]' },
    { max: Infinity, cls: 'text-lg md:text-xl leading-[1.15]' },
  ],
  card: [
    { max: 40, cls: 'text-xl md:text-2xl leading-[1.1]' },
    { max: 55, cls: 'text-lg md:text-xl leading-[1.15]' },
    { max: Infinity, cls: 'text-base md:text-lg leading-[1.2]' },
  ],
};

function titleClassFor(size: CategoryArtSize, length: number): string {
  if (size === 'compact') return 'text-base leading-[1.15]';
  return TITLE_TIERS[size].find((t) => length <= t.max)!.cls;
}

const PADDING: Record<CategoryArtSize, string> = {
  hero: 'p-10 md:p-16 lg:p-20',
  lead: 'p-6 md:p-10',
  feature: 'p-5 md:p-7',
  card: 'p-4 md:p-5',
  compact: 'p-2',
};

export function CategoryArt({ title, category, size = 'card' }: CategoryArtProps) {
  const slug = typeof category === 'string' ? null : category?.slug ?? null;
  const name = typeof category === 'string' ? category : category?.name ?? null;
  const p = paletteFor(slug);
  const decoded = decodeEntities(title);
  const truncated =
    decoded.length > TITLE_TRUNCATE[size]
      ? decoded.slice(0, TITLE_TRUNCATE[size] - 1).replace(/\s+\S*$/, '') + '…'
      : decoded;

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
          {(name ?? 'LB').slice(0, 3)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between ${PADDING[size]}`}
      style={{ backgroundColor: p.bg, color: p.ink }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: p.rule }}
        >
          {name ?? 'LandonBuford'}
        </span>
        <span
          className="font-serif text-[10px] uppercase tracking-[0.16em] opacity-60"
          aria-hidden
        >
          LB
        </span>
      </div>

      <h3
        className={`font-serif tracking-tight ${titleClassFor(size, truncated.length)}`}
        style={{ color: p.ink }}
      >
        {truncated}
      </h3>

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
