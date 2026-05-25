import type { Metadata } from 'next';
import Script from 'next/script';
import { Source_Serif_4, Inter } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import './globals.css';

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://landonbuford.com';
const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-5891753549050616';
const GTAG_ID = process.env.NEXT_PUBLIC_GTAG_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'LandonBuford.com — Where Sports and Business Intersect',
    template: '%s · LandonBuford.com',
  },
  description:
    'Coverage of the WNBA, athlete entrepreneurship, sports business, and the people building it — by Landon Buford and contributors.',
  openGraph: {
    type: 'website',
    siteName: 'LandonBuford.com',
    url: SITE_URL,
    title: 'LandonBuford.com — Where Sports and Business Intersect',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: {
    canonical: SITE_URL,
    types: { 'application/rss+xml': `${SITE_URL}/feed.xml` },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {ADSENSE_CLIENT && (
          <Script
            id="adsense-loader"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          />
        )}
        {GTAG_ID && (
          <>
            <Script
              id="gtag-loader"
              async
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`}
            />
            <Script
              id="gtag-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GTAG_ID}');`,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
