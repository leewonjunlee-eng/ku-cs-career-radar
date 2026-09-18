import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn(async () => ({ error: null }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { signOut } }),
}));

import { POST } from '@/app/auth/logout/route';

describe('logout route', () => {
  beforeEach(() => {
    signOut.mockClear();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.test';
  });
  afterEach(() => delete process.env.NEXT_PUBLIC_SITE_URL);

  it('동일 출처 POST로 세션을 폐기하고 개인 캐시를 막는다', async () => {
    const response = await POST(new Request('https://app.example.test/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://app.example.test' },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledOnce();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
