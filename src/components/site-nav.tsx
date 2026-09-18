'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { opportunityTabHref, opportunityTabs } from '@/lib/opportunities/query';

const TABS = [{ label: '홈', categories: [] as string[] }, ...opportunityTabs.filter((tab) => !tab.categories.includes('lab'))];
const SECONDARY = [
  { href: '/reviews', label: '후기 모아보기' },
  { href: '/me', label: '내 활동' },
] as const;

const itemClass = (current: boolean) =>
  'block rounded-md px-3 py-2 hover:bg-slate-100 ' + (current ? 'font-bold text-primary' : 'text-slate-700');

function Tabs({ current }: { current: string | null }) {
  return TABS.map((tab) => {
    const active = tab.label === current;
    return (
      <li key={tab.label}>
        <Link href={opportunityTabHref(tab.categories)} aria-current={active ? 'page' : undefined} className={itemClass(active)}>
          {tab.label}
        </Link>
      </li>
    );
  });
}

// useSearchParams는 정적 페이지에서 Suspense가 필요하다. 대기 중에는 선택 표시 없이 그린다.
function TabsWithParams() {
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.getAll('category').sort().join(',');
  const match = pathname === '/' ? TABS.find((tab) => [...tab.categories].sort().join(',') === selected) : undefined;
  return <Tabs current={match?.label ?? null} />;
}

function LabMenu() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const labNoticesActive = pathname === '/' && params.getAll('category').length === 1 && params.get('category') === 'lab';
  const active = labNoticesActive || pathname === '/labs';

  return (
    <li className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        className={itemClass(active)}
        onClick={() => setOpen((current) => !current)}
      >
        연구실
      </button>
      {open ? (
        <div aria-label="연구실 메뉴" className="absolute left-0 top-full z-30 mt-1 w-36 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
          <Link
            href="/?category=lab"
            aria-current={labNoticesActive ? 'page' : undefined}
            className={itemClass(labNoticesActive)}
            onClick={() => setOpen(false)}
          >
            연구실 공고
          </Link>
          <Link
            href="/labs"
            aria-current={pathname === '/labs' ? 'page' : undefined}
            className={itemClass(pathname === '/labs')}
            onClick={() => setOpen(false)}
          >
            연구실 정보
          </Link>
        </div>
      ) : null}
    </li>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [logoutError, setLogoutError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // null = 확인 중. 표시용일 뿐 권한 판단은 서버가 한다.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    createBrowserClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
      .catch(() => setSignedIn(false));
  }, []);

  async function logout() {
    setLoggingOut(true);
    setLogoutError(false);
    try {
      const response = await fetch('/auth/logout', { method: 'POST' });
      if (!response.ok) {
        setLogoutError(true);
        return;
      }
      window.location.assign('/login');
    } catch {
      setLogoutError(true);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <nav
      aria-label="주요 메뉴"
      className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-1 px-4 py-3 sm:px-8 text-sm font-medium">
        <li className="mr-3">
          <Link href="/" className="block px-1 py-2 text-base font-bold tracking-tight text-slate-900">
            KCCR
          </Link>
        </li>
        <Suspense fallback={<Tabs current={null} />}>
          <TabsWithParams />
        </Suspense>
        <Suspense fallback={null}><LabMenu /></Suspense>
        {SECONDARY.map((item, i) => (
          <li key={item.href} className={i === 0 ? 'ml-auto' : undefined}>
            <Link href={item.href} aria-current={item.href === pathname ? 'page' : undefined} className={itemClass(item.href === pathname)}>
              {item.label}
            </Link>
          </li>
        ))}
        <li className="ml-2 flex min-h-10 items-center gap-2 border-l border-slate-200 pl-3">
          {signedIn === false && <>
          <Link
            href="/login"
            aria-current={pathname === '/login' ? 'page' : undefined}
            className="block rounded-md px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            aria-current={pathname === '/signup' ? 'page' : undefined}
            className="block rounded-md bg-primary px-3.5 py-2 font-bold text-white hover:bg-primary-hover"
          >
            가입
          </Link>
          </>}
          {signedIn && (
            <button disabled={loggingOut} type="button" onClick={logout} className="block rounded-md border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              {loggingOut ? '로그아웃 중…' : '로그아웃'}
            </button>
          )}
        </li>
      </ul>
      {logoutError && <p role="alert" className="mx-auto max-w-screen-2xl px-4 pb-2 sm:px-8 text-sm text-red-700">로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.</p>}
    </nav>
  );
}
