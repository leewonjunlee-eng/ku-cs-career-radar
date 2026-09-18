import { describe, expect, it } from 'vitest';
import { applyNoStoreHeaders, assertSameOrigin, HttpError, isSameOrigin, jsonError, noStoreHeaders } from '@/lib/http/security';
import { isHttpUrl, isNonEmptyText, requireJsonObject, requireTextArray, ValidationError } from '@/lib/validation/common';
import { requireUser, UnauthenticatedError } from '@/lib/auth/require-user';
import { safeNext } from '@/app/auth/confirm/route';
import { POST as logout } from '@/app/auth/logout/route';
import { getAuthEmailRedirectOrigin } from '@/lib/auth/redirect';

describe('API 보안 경계', () => {
  it('세션 객체가 아닌 서버 검증 getUser 결과만 신뢰한다', async () => {
    const getUser = async () => ({ data: { user: { id: 'user-id' } }, error: null });
    const user = await requireUser({ auth: { getUser } } as never);
    expect(user.id).toBe('user-id');
    await expect(requireUser({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } } as never)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('동일 출처 Origin만 허용한다', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.test';
    const request = new Request('https://app.example.test/api/me', { headers: { Origin: 'https://app.example.test' } });
    expect(isSameOrigin(request)).toBe(true);
    expect(isSameOrigin(new Request(request, { headers: { Origin: 'https://evil.example.test' } }))).toBe(false);
    expect(() => assertSameOrigin(new Request(request, { headers: { Origin: 'https://evil.example.test' } }))).toThrow(HttpError);
    process.env.NEXT_PUBLIC_SITE_URL = 'https://configured.example';
    expect(isSameOrigin(new Request('https://malicious-host.example/api', { headers: { Origin: 'https://configured.example' } }))).toBe(false);
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(isSameOrigin(request)).toBe(false);
    process.env.NEXT_PUBLIC_SITE_URL = 'not a URL';
    expect(isSameOrigin(request)).toBe(false);
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('개인 응답 캐시를 금지한다', () => {
    const headers = noStoreHeaders({ 'X-Test': 'ok' });
    expect(headers.get('Cache-Control')).toBe('private, no-store');
    expect(headers.get('Vary')).toBe('Cookie');
    expect(headers.get('X-Test')).toBe('ok');
    const response = applyNoStoreHeaders(new Response('ok'));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('예상하지 못한 5xx에서는 드라이버 오류 코드를 노출하지 않는다', async () => {
    const response = jsonError({ code: '22P05', message: 'driver-only detail' });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: { code: 'INTERNAL_ERROR', message: '요청을 처리할 수 없습니다.' } });
  });

  it('logout POST는 교차 출처 요청을 거부하고 응답을 캐시하지 않는다', async () => {
    const response = await logout(new Request('https://configured.example/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
    }));
    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('확인 redirect는 설정된 origin의 안전한 상대 next만 허용한다', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://configured.example';
    expect(getAuthEmailRedirectOrigin()).toBe('https://configured.example');
    expect(safeNext('/me?tab=reviews', 'https://configured.example').toString()).toBe('https://configured.example/me?tab=reviews');
    expect(safeNext('https://evil.example/phish', 'https://configured.example').origin).toBe('https://configured.example');
    expect(safeNext('//evil.example/phish', 'https://configured.example').pathname).toBe('/');
    expect(safeNext('/\\\\evil.example', 'https://configured.example').pathname).toBe('/');
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });
});

describe('공통 입력 검증', () => {
  it('공백류만 있는 문자열을 거부한다', () => {
    expect(isNonEmptyText('\u200b\uFEFF　')).toBe(false);
    expect(isNonEmptyText('닉네임', 50)).toBe(true);
    expect(() => requireTextArray(['ok', '  '], 'tags')).toThrow(ValidationError);
  });

  it('http/https URL만 허용한다', () => {
    expect(isHttpUrl('https://example.test/a')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('https:// space.test')).toBe(false);
  });

  it('details는 배열이 아닌 객체여야 한다', () => {
    expect(requireJsonObject({ ok: true })).toEqual({ ok: true });
    expect(() => requireJsonObject([])).toThrow(ValidationError);
  });
});
