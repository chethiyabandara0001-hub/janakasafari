import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nisha Safari - Nisha Safari Jeep Tours | Yala & Sri Lanka Safaris',
  description: 'Guided 4x4 wildlife safaris across Yala, Udawalawe, Bundala, Wilpattu, Minneriya, and Kumana National Parks in Sri Lanka.',
  openGraph: {
    title: 'Nisha Safari - Nisha Safari Jeep Tours | Yala & Sri Lanka Safaris',
    description: 'Guided 4x4 wildlife safaris across Yala, Udawalawe, Bundala, Wilpattu, Minneriya, and Kumana National Parks in Sri Lanka.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nisha Safari - Nisha Safari Jeep Tours | Yala & Sri Lanka Safaris',
    description: 'Guided 4x4 wildlife safaris across Yala, Udawalawe, Bundala, Wilpattu, Minneriya, and Kumana National Parks in Sri Lanka.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
