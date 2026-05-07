import { ImageResponse } from 'next/og';

export const alt = 'LandonBuford.com — Where Sports and Business Intersect';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function HomepageOG() {
  const bg = '#14161a';
  const ink = '#faf9f6';
  const accent = '#b91c1c';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: bg,
          color: ink,
          padding: 80,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: '"Source Serif", "Georgia", serif',
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: accent,
            fontFamily: 'sans-serif',
            fontWeight: 700,
          }}
        >
          LandonBuford.com
        </div>

        <div
          style={{
            fontSize: 110,
            lineHeight: 1.0,
            fontWeight: 600,
            letterSpacing: -2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>Where sports</span>
          <span>and business</span>
          <span>intersect.</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            paddingTop: 24,
            borderTop: `1px solid ${accent}66`,
            fontFamily: 'sans-serif',
            fontSize: 22,
            opacity: 0.7,
          }}
        >
          <div>By Landon Buford and contributors</div>
          <div style={{ flex: 1, textAlign: 'right' }}>landonbuford.com</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
