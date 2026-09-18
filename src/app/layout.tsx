import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SiteNav } from '@/components/site-nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'KCCR',
  description: '고려대 컴퓨터 관련 학생을 위한 공고·후기·팀원 모집 모음',
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
          본문으로 건너뛰기
        </a>
        <SiteNav />
        <main id="main" className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-8">
          {children}
        </main>
        <footer className="mx-auto max-w-screen-2xl px-4 pb-10 sm:px-8 text-xs text-slate-500">
          고려대 컴퓨터 관련 학생을 위한 공고 탐색 · 경험 후기 · 팀원 모집
        </footer>
      </body>
    </html>
  );
}
