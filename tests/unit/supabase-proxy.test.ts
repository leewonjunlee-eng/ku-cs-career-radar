import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn(async () => ({ data: { user: null }, error: null }));
let refreshCookie = true;
const createServerClient = vi.fn((_url: string, _key: string, options: { cookies: { setAll: (cookies: { name: string; value: string; options?: object }[]) => void } }) => ({
  auth: {
    getUser: async () => {
      if (refreshCookie) options.cookies.setAll([{ name: 'sb-test-auth', value: 'refreshed', options: { httpOnly: true } }]);
      return getUser();
    },
  },
}));

vi.mock('@supabase/ssr', () => ({ createServerClient }));

describe('Supabase 세션 proxy 응답', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    refreshCookie = true;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('세션 쿠키 갱신 응답도 private no-store다', async () => {
    const { NextRequest } = await import('next/server');
    const { updateSession } = await import('@/lib/supabase/proxy');
    const response = await updateSession(new NextRequest('https://app.example.test/'));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Vary')).toBe('Cookie');
    expect(response.cookies.get('sb-test-auth')?.value).toBe('refreshed');
  });

  it('does not add private cache headers when no auth cookie is refreshed', async () => {
    refreshCookie = false;
    const { NextRequest } = await import('next/server');
    const { updateSession } = await import('@/lib/supabase/proxy');
    const response = await updateSession(new NextRequest('https://app.example.test/api/reviews'));
    expect(response.headers.get('Cache-Control')).toBeNull();
    expect(response.headers.get('Vary')).toBeNull();
  });
});
