import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { SiteChrome } from './components/site-chrome';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Ankara Mobil Oto Yıkama | Kapınıza Gelen Araç Bakımı',
  description: 'Ankara’da profesyonel mobil oto yıkama ve araç bakım hizmeti. Paketinizi seçin, randevunuzu oluşturun; ekibimiz adresinize gelsin.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Ankara Mobil Oto Yıkama',
    description: 'Oto yıkama. Kapınıza kadar gelir.',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: '/og-card.png', width: 1680, height: 945, alt: 'Ankara Mobil Oto Yıkama' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body className={poppins.variable}><SiteChrome>{children}</SiteChrome></body></html>;
}
