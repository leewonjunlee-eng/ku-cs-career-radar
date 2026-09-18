import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { inject } from 'vitest';

// global-setup 의 가드를 통과한 전용 테스트 스택 설정만 사용한다.
export const testDb = inject('testDb');

export const APP_TABLES = [
  'profiles',
  'subjects',
  'opportunities',
  'bookmarks',
  'reviews',
  'teams',
  'team_contacts',
  'team_members',
  'team_requests',
] as const;
export const PUBLIC_VIEWS = ['public_reviews', 'public_teams'] as const;

/** 픽스처·제약 검사용 superuser 연결 (4단계 프로필 트리거 전까지 raw SQL 로 픽스처를 만든다). */
export async function connectDb() {
  const client = new pg.Client({ connectionString: testDb.dbUrl });
  await client.connect();
  return client;
}

/** 전용 테스트 스택의 앱 데이터만 비운다. auth 사용자는 deleteAuthUser 로 정리한다. */
export async function truncateAppData(client: pg.Client) {
  await client.query(`truncate ${APP_TABLES.map((t) => `public.${t}`).join(', ')} cascade`);
}

/** SQL 이 실패해야 하는 경우 SQLSTATE 를 반환한다. 성공하면 null. 각 시도는 savepoint 로 격리한다. */
export async function sqlState(client: pg.Client, sql: string, params: unknown[] = []) {
  await client.query('savepoint attempt');
  try {
    await client.query(sql, params);
    await client.query('release savepoint attempt');
    return null;
  } catch (error) {
    await client.query('rollback to savepoint attempt');
    return (error as { code?: string }).code ?? 'unknown';
  }
}

export type AuthUser = { id: string; accessToken: string; email?: string; password?: string };

async function authFetch(path: string, init: RequestInit & { json?: unknown } = {}) {
  const response = await fetch(`${testDb.apiUrl}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: testDb.serviceRoleKey,
      Authorization: `Bearer ${testDb.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`auth ${path} 실패: HTTP ${response.status}`);
  return body;
}

/** 로컬 Auth admin API 로 확인 완료된 임시 사용자를 만들고 비밀번호 로그인으로 실제 JWT 를 받는다. */
export async function createAuthUser(): Promise<AuthUser> {
  const email = `it-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const user = await authFetch('admin/users', { method: 'POST', json: { email, password, email_confirm: true } });
  const response = await fetch(`${testDb.apiUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: testDb.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`로그인 실패: HTTP ${response.status}`);
  const session = (await response.json()) as { access_token: string };
  return { id: user.id, accessToken: session.access_token, email, password };
}

export async function createUnconfirmedAuthUser() {
  const email = `it-unconfirmed-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const user = await authFetch('admin/users', { method: 'POST', json: { email, password, email_confirm: false } });
  return { id: user.id as string, email, password };
}

export async function passwordLogin(email: string, password: string) {
  const response = await fetch(`${testDb.apiUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: testDb.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body } as const;
}

export async function updateAuthUser(id: string, patch: Record<string, unknown>) {
  return authFetch(`admin/users/${id}`, { method: 'PUT', json: patch });
}

export async function signUpUser(email: string, password: string, metadata: { display_name?: string; name?: string }) {
  const response = await fetch(`${testDb.apiUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: testDb.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: metadata }),
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body } as const;
}

export async function deleteAuthUser(id: string) {
  await authFetch(`admin/users/${id}`, { method: 'DELETE' });
}

type RestOptions = { method?: string; body?: unknown; bearer?: string; apikey?: string; prefer?: string };

/** PostgREST 직접 호출. 기본은 anon 키. */
export async function rest(path: string, options: RestOptions = {}) {
  const apikey = options.apikey ?? testDb.anonKey;
  const headers: Record<string, string> = {
    apikey,
    Authorization: `Bearer ${options.bearer ?? apikey}`,
    'Content-Type': 'application/json',
  };
  if (options.prefer) headers.Prefer = options.prefer;
  const response = await fetch(`${testDb.apiUrl}/rest/v1/${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}
