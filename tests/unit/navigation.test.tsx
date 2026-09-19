import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SiteNav } from '@/components/site-nav';
import { UnavailableNotice } from '@/components/unavailable-notice';

let pathname = '/';
let search = '';
let session: object | null = null;
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/lib/supabase/browser', () => ({
  createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session } }) } }),
}));

afterEach(() => {
  pathname = '/';
  search = '';
  session = null;
  cleanup();
  vi.unstubAllGlobals();
});

describe('SiteNav', () => {
  it('주요 화면으로 이동하는 링크를 접근 가능한 이름과 함께 제공한다', async () => {
    render(<SiteNav />);
    await screen.findByRole('link', { name: '로그인' });

    const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
    const expected: Array<[string, string]> = [
      ['홈', '/'],
      ['후기 모아보기', '/reviews'],
      ['로그인', '/login'],
      ['가입', '/signup'],
      ['마이페이지', '/me'],
    ];

    for (const [name, href] of expected) {
      expect(within(nav).getByRole('link', { name }).getAttribute('href')).toBe(
        href,
      );
    }
  });

  it('공고 탭은 카테고리로 연결되고 공모전 탭은 해커톤을 포함한다', () => {
    search = 'category=hackathon&category=contest';
    render(<SiteNav />);

    const contest = screen.getByRole('link', { name: '공모전' });
    expect(contest.getAttribute('href')).toBe('/?category=contest&category=hackathon');
    expect(contest.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: '인턴' }).getAttribute('href')).toBe('/?category=internship');
    expect(screen.getByRole('link', { name: '홈' }).getAttribute('aria-current')).toBeNull();
  });

  it('현재 화면 링크에 aria-current 를 표시한다', () => {
    pathname = '/me';
    render(<SiteNav />);

    expect(
      screen.getByRole('link', { name: '마이페이지' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByRole('link', { name: '홈' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('로그인 상태에 따라 계정 메뉴를 바꿔 보여준다', async () => {
    render(<SiteNav />);
    await screen.findByRole('link', { name: '가입' });
    expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull();
    cleanup();

    session = { user: { id: 'u1' } };
    render(<SiteNav />);
    await screen.findByRole('button', { name: '로그아웃' });
    expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
    expect(screen.queryByRole('link', { name: '가입' })).toBeNull();
  });

  it('로그아웃 실패 시 이동하지 않고 오류를 표시한다', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    session = { user: { id: 'u1' } };
    render(<SiteNav />);

    fireEvent.click(await screen.findByRole('button', { name: '로그아웃' }));
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
