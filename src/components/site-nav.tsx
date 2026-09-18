'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const ITEMS = [
  { href: '/', label: '홈' },
  { href: '/reviews', label: '후기 모아보기' },
  { href: '/login', label: '로그인' },
  { href: '/signup', label: '가입' },
  { href: '/me', label: '내 활동' },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const [logoutError, setLogoutError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
      className="border-b border-slate-200 bg-white/90 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-3xl flex-wrap gap-1 px-4 py-2 text-sm">
        {ITEMS.map((item) => {
          const current = item.href === pathname;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={
                  'block rounded px-3 py-2 hover:bg-slate-100 ' +
                  (current ? 'font-semibold text-slate-900' : 'text-slate-600')
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button disabled={loggingOut} type="button" onClick={logout} className="block rounded px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50">
            {loggingOut ? '로그아웃 중…' : '로그아웃'}
          </button>
        </li>
      </ul>
      {logoutError && <p role="alert" className="mx-auto max-w-3xl px-4 pb-2 text-sm text-red-700">로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.</p>}
    </nav>
  );
}
