import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-admin-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-admin-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nisha Safari CMS — Admin Studio',
  description: 'Manage pages, sections, images, text, hero badges, and Cloudflare R2 media sync.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} min-h-screen bg-[#090d0b] text-slate-100 antialiased font-sans`}
    >
      {children}
    </div>
  );
}
