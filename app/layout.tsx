import type {Metadata} from 'next';
import './globals.css';
import {ALL_SEO_KEYWORDS_LIST, PAGE_SEO_CONFIG, SITE_BASE_URL} from '@/lib/seo-config';

const APP_TITLE = 'Nisha Travelling';
const APP_DESCRIPTION =
  'Nisha Travelling offers private Sri Lanka travel experiences, curated wildlife & nature tours, national park expeditions, scenic transfers, and shore excursions across Sri Lanka.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_BASE_URL),
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  keywords: ALL_SEO_KEYWORDS_LIST,
  alternates: {
    canonical: SITE_BASE_URL,
  },
  icons: {
    icon: [
      {
        url: '/favicon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        url: '/favicon.png',
        sizes: '96x96',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon-96x96.png',
    apple: [
      {
        url: '/favicon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    url: SITE_BASE_URL,
    siteName: 'Nisha Travelling',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  const homeJsonLd = PAGE_SEO_CONFIG['index.html']?.jsonLd || [];
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify(homeJsonLd)}}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
