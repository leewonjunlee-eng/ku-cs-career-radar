import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SiteNav } from '@/components/site-nav';
import { UnavailableNotice } from '@/components/unavailable-notice';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

afterEach(() => {
  pathname = '/';
  cleanup();
  vi.unstubAllGlobals();
});

describe('SiteNav', () => {
  it('주요 화면으로 이동하는 링크를 접근 가능한 이름과 함께 제공한다', () => {
    render(<SiteNav />);

    const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
    const expected: Array<[string, string]> = [
      ['홈', '/'],
      ['후기 모아보기', '/reviews'],
      ['로그인', '/login'],
      ['가입', '/signup'],
      ['내 활동', '/me'],
    ];

    for (const [name, href] of expected) {
      expect(within(nav).getByRole('link', { name }).getAttribute('href')).toBe(
        href,
      );
    }
  });

  it('현재 화면 링크에 aria-current 를 표시한다', () => {
    pathname = '/me';
    render(<SiteNav />);

    expect(
      screen.getByRole('link', { name: '내 활동' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByRole('link', { name: '홈' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('로그아웃 실패 시 이동하지 않고 오류를 표시한다', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<SiteNav />);

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect((await screen.findByRole('alert')).textContent).toContain('로그아웃에 실패했습니다');
    expect(fetchMock).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
  });
});

describe('UnavailableNotice', () => {
  it('미동작 기능임을 안내 역할로 알린다', () => {
    render(<UnavailableNotice>공고 목록</UnavailableNotice>);

    const notice = screen.getByRole('note');
    expect(notice.textContent).toContain('공고 목록');
    expect(notice.textContent).toContain('구현되지 않았습니다');
  });

  it('라이브 리전이 아니다', () => {
    // 정적 안내를 role="status" 로 두면 화면 낭독기가 페이지 진입 시 전부 읽는다.
    // 내 활동 화면은 이런 안내를 4개 렌더링하므로 라이브 리전이면 안 된다.
    render(<UnavailableNotice>공고 목록</UnavailableNotice>);

    expect(screen.queryAllByRole('status')).toHaveLength(0);
    expect(screen.getByRole('note').getAttribute('aria-live')).toBeNull();
  });
});
