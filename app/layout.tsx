import type {Metadata} from 'next';
import './globals.css';
import {ALL_SEO_KEYWORDS_LIST, PAGE_SEO_CONFIG, SITE_BASE_URL} from '@/lib/seo-config';

const APP_TITLE = 'Janaka Safari Jeep Tours';
const APP_DESCRIPTION =
  'Book private & shared Yala Safari Tours, Yala National Park Jeep Safari, Udawalawe, Bundala, Wilpattu, Minneriya & Hambantota Port Shore Excursions.';

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
        url: '/assets/aistudio/images__8_-removebg-preview__1__c2145e28.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        url: '/favicon.png',
        sizes: '96x96',
        type: 'image/png',
      },
    ],
    shortcut: '/assets/aistudio/images__8_-removebg-preview__1__c2145e28.png',
    apple: [
      {
        url: '/assets/aistudio/images__8_-removebg-preview__1__c2145e28.png',
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
    siteName: 'Nisha Safari Jeep Tours — Sri Lanka Best Safari',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://cdn.srilankabestsafari.com/slots/index_html__slot_1.jpg',
        width: 1600,
        height: 900,
        alt: 'Yala National Park Safari & Sri Lanka Safari Tours',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: ['https://cdn.srilankabestsafari.com/slots/index_html__slot_1.jpg'],
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

