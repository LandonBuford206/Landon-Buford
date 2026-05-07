'use client';

import { useEffect, useRef } from 'react';

type Placement = 'in-article' | 'article-end' | 'listing-mid' | 'sidebar';

interface AdSlotProps {
  placement: Placement;
  /** Override the default AdSense slot ID for this placement. */
  slotId?: string;
}

/**
 * AdSense slot. Renders the <ins> tag and pushes to adsbygoogle on mount.
 * If NEXT_PUBLIC_ADSENSE_CLIENT is not set, renders a labeled placeholder
 * (useful in development and during pre-launch review).
 *
 * This is the single point of change if Landon ever moves off AdSense
 * (e.g. to Mediavine / Raptive). Only this file gets touched.
 */
export function AdSlot({ placement, slotId }: AdSlotProps) {
  const ref = useRef<HTMLModElement>(null);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const resolvedSlot = slotId ?? defaultSlotForPlacement(placement);

  useEffect(() => {
    if (!client) return;
    try {
      // adsbygoogle is loaded as a global by the script in layout.tsx
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // swallow — ad failures should never break the page
    }
  }, [client]);

  const minHeight = minHeightFor(placement);

  if (!client) {
    return (
      <div
        className="flex w-full items-center justify-center rounded border border-dashed border-[var(--color-line-strong)] bg-[var(--color-paper)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]"
        style={{ minHeight }}
        aria-hidden
      >
        Advertisement · {placement}
      </div>
    );
  }

  return (
    <ins
      ref={ref}
      className="adsbygoogle block"
      style={{ display: 'block', minHeight }}
      data-ad-client={client}
      data-ad-slot={resolvedSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

function defaultSlotForPlacement(p: Placement): string {
  // These IDs come from the AdSense console. Override per-placement
  // via env vars without redeploying code.
  switch (p) {
    case 'in-article':
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_INARTICLE ?? '0000000000';
    case 'article-end':
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END ?? '0000000000';
    case 'listing-mid':
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_LISTING ?? '0000000000';
    case 'sidebar':
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR ?? '0000000000';
  }
}

function minHeightFor(p: Placement): number {
  switch (p) {
    case 'in-article':
      return 280;
    case 'article-end':
      return 280;
    case 'listing-mid':
      return 250;
    case 'sidebar':
      return 600;
  }
}
