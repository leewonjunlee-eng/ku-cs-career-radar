import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDb, createAuthUser, deleteAuthUser, passwordLogin, signUpUser, testDb, updateAuthUser, type AuthUser } from './helpers';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';

describe('Auth와 프로필 트리거', () => {
  let db: pg.Client;
  let user: AuthUser;

  beforeAll(async () => {
    db = await connectDb();
    user = await createAuthUser();
  });

  afterAll(async () => {
    await db.query('delete from auth.users where id = $1', [user.id]);
    await db.end();
  });

  it('Auth 사용자 생성 직후 기본 프로필이 생성된다', async () => {
    const result = await db.query('select id, display_name from public.profiles where id = $1', [user.id]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe(user.id);
    expect(result.rows[0].display_name).toBe('사용자');
    expect(result.rows[0].display_name).not.toContain(user.email?.split('@')[0]);
  });

  it('확인된 계정은 실제 비밀번호 JWT를 발급받는다', async () => {
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(user.accessToken.split('.')).toHaveLength(3);
    expect(testDb.anonKey).toBeTruthy();
  });

  it('미확인 계정은 로그인할 수 없고 확인 후 로그인할 수 있다', async () => {
    const email = `it-unconfirmed-${randomUUID()}@example.test`;
    const password = `pw-${randomUUID()}`;
    const signup = await signUpUser(email, password, { display_name: '미확인닉네임' });
    expect(signup.ok).toBe(true);
    const signupBody = signup.body as { id?: string; user?: { id?: string } };
    const pendingId = signupBody.user?.id ?? signupBody.id;
    expect(pendingId).toBeTruthy();
    if (!pendingId) throw new Error('signup 응답에 사용자 ID가 없습니다.');
    const pending = { id: pendingId, email, password };
    try {
      const denied = await passwordLogin(pending.email, pending.password);
      expect(denied.ok).toBe(false);
      expect(denied.status).toBe(400);

      // 로컬 SMTP가 꺼진 격리 스택에서는 admin API로 실제 확인 완료 상태를
      // 재현한다. 공개 배포에서는 /auth/confirm의 verifyOtp 경로를 사용한다.
      await updateAuthUser(pending.id, { email_confirm: true });
      const accepted = await passwordLogin(pending.email, pending.password);
      expect(accepted.ok).toBe(true);
      expect(accepted.body).toHaveProperty('access_token');
    } finally {
      await deleteAuthUser(pending.id);
    }
  });

  it('공개 signup은 프로필 트리거까지 원자적으로 만든다', async () => {
    const email = `it-signup-${randomUUID()}@example.test`;
    const password = `pw-${randomUUID()}`;
    const signup = await signUpUser(email, password, { display_name: '가입닉네임' });
    expect(signup.ok).toBe(true);
    const signupBody = signup.body as { id?: string; user?: { id?: string } };
    const id = signupBody.user?.id ?? signupBody.id;
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    try {
      const result = await db.query('select display_name from public.profiles where id = $1', [id]);
      expect(result.rows[0]?.display_name).toBe('가입닉네임');
    } finally {
      await deleteAuthUser(id as string);
    }
  });

  it('raw metadata의 이메일 형태 name/display_name은 공개 프로필에 쓰지 않는다', async () => {
    const cases = [
      { metadata: { display_name: 'visible-email@example.test' }, expectedLeak: 'visible-email@example.test' },
      { metadata: { name: 'also-email@example.test' }, expectedLeak: 'also-email@example.test' },
    ];

    for (const { metadata, expectedLeak } of cases) {
      const email = `it-private-${randomUUID()}@example.test`;
      const password = `pw-${randomUUID()}`;
      const signup = await signUpUser(email, password, metadata);
      expect(signup.ok).toBe(true);
      const body = signup.body as { id?: string; user?: { id?: string } };
      const id = body.user?.id ?? body.id;
      if (!id) throw new Error('signup 응답에 사용자 ID가 없습니다.');
      try {
        const result = await db.query('select display_name from public.profiles where id = $1', [id]);
        expect(result.rows[0]?.display_name).toBe('사용자');
        expect(result.rows[0]?.display_name).not.toBe(expectedLeak);
      } finally {
        await deleteAuthUser(id);
      }
    }
  });

  it('Supabase 세션 로그아웃은 현재 토큰을 폐기한다', async () => {
    const response = await fetch(`${testDb.apiUrl}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: testDb.anonKey, Authorization: `Bearer ${user.accessToken}` },
    });
    expect(response.status).toBe(204);
  });

  it('위조된 bearer 토큰은 Auth 사용자 조회에서 거부된다', async () => {
    const response = await fetch(`${testDb.apiUrl}/auth/v1/user`, {
      headers: { apikey: testDb.anonKey, Authorization: 'Bearer forged.invalid.token' },
    });
    expect([401, 403]).toContain(response.status);
  });
});
