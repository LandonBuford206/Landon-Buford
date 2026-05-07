import { ImageResponse } from 'next/og';
import { getPost } from '@/lib/content';
import { decodeEntities } from '@/lib/html';

export const alt = 'LandonBuford.com';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PALETTES = [
  { bg: '#1f2a44', ink: '#f4ede0', rule: '#d8a657' },
  { bg: '#2d2a26', ink: '#f3ece1', rule: '#c66e4f' },
  { bg: '#2b3a36', ink: '#eef2ec', rule: '#9bb59a' },
  { bg: '#3a2b3d', ink: '#f0e7ee', rule: '#c89bb8' },
  { bg: '#1c2a2a', ink: '#e7eded', rule: '#7fa7a3' },
  { bg: '#3b2c1e', ink: '#f3e8d8', rule: '#d4a26a' },
  { bg: '#26282d', ink: '#ebebee', rule: '#9ca0ad' },
  { bg: '#3d2926', ink: '#f1e6df', rule: '#cf8a6a' },
];

function paletteFor(s: string | null | undefined) {
  if (!s) return PALETTES[6];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return PALETTES[Math.abs(h) % PALETTES.length];
}

export default async function ArticleOG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return new ImageResponse(<DefaultCard />, { ...size });
  }

  const title = decodeEntities(post.title);
  const cat = post.categories[0]?.name ?? null;
  const author = post.author.displayName;
  const p = paletteFor(cat);

  // Truncate title for visual weight
  const trim = title.length > 110 ? title.slice(0, 109).replace(/\s+\S*$/, '') + '…' : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: p.bg,
          color: p.ink,
          padding: '70px 80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: '"Source Serif", "Georgia", serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 4,
              textTransform: 'uppercase',
              fontWeight: 700,
              color: p.rule,
              fontFamily: 'sans-serif',
            }}
          >
            {cat ?? 'LandonBuford'}
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 3,
              textTransform: 'uppercase',
              opacity: 0.6,
              fontFamily: 'sans-serif',
            }}
          >
            LB
          </div>
        </div>

        <div
          style={{
            fontSize: trim.length > 80 ? 60 : trim.length > 50 ? 72 : 88,
            lineHeight: 1.05,
            letterSpacing: -1,
            fontWeight: 600,
            display: 'flex',
          }}
        >
          {trim}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            paddingTop: 24,
            borderTop: `1px solid ${p.rule}66`,
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 600 }}>{author}</div>
          <div style={{ flex: 1, fontSize: 20, opacity: 0.6, textAlign: 'right' }}>
            landonbuford.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function DefaultCard() {
  const p = PALETTES[6];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: p.bg,
        color: p.ink,
        padding: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        fontFamily: '"Source Serif", "Georgia", serif',
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: p.rule,
          fontFamily: 'sans-serif',
          fontWeight: 700,
        }}
      >
        LandonBuford.com
      </div>
      <div style={{ fontSize: 96, lineHeight: 1.05, marginTop: 24, fontWeight: 600 }}>
        Where sports and business intersect.
      </div>
    </div>
  );
}
