import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SiteNav } from '@/components/site-nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'KU CS Career Radar',
  description: 'A directory of career opportunities, experience reviews, and team recruitment for Korea University CS students.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:block focus:bg-slate-900 focus:p-3 focus:text-white"
        >
          Skip to content
        </a>
        <SiteNav />
        <main id="main" className="mx-auto max-w-3xl px-4 py-8">
          {children}
        </main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-slate-500">
          Opportunity discovery, experience reviews, and team recruitment for Korea University CS students.
        </footer>
      </body>
    </html>
  );
}
