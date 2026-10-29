import type { Metadata, Viewport } from 'next';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import './globals.css';
import { SITE } from '@/lib/config.ts';

const description =
  'Kahramanlarımızın ve şehitlerimizin isimlerini direğe kazıyın, bayrağımızı birlikte göklere taşıyalım. 29 Ekim Cumhuriyet Bayramımız kutlu olsun.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: `${SITE.title} | 29 Ekim`,
  description,
  openGraph: {
    title: SITE.title,
    description,
    type: 'website',
    locale: 'tr_TR',
    siteName: SITE.title,
  },
  twitter: { card: 'summary', title: SITE.title, description },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e30a17',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
