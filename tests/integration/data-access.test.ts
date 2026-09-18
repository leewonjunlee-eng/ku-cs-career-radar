import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  APP_TABLES,
  type AuthUser,
  PUBLIC_VIEWS,
  connectDb,
  createAuthUser,
  deleteAuthUser,
  rest,
  testDb,
  truncateAppData,
} from './helpers';

// 실제 PostgREST 에 anon 키, 실제 로그인 JWT(authenticated), service_role 키로 직접 요청한다.
let db: pg.Client;
let owner: AuthUser;
let member: AuthUser;
let outsider: AuthUser;
let fixture: { subjectId: string; oppId: string; teamId: string };

const PERMISSION_DENIED = '42501';

function expectDenied(result: { status: number; body: unknown }) {
  expect([401, 403]).toContain(result.status);
  expect((result.body as { code?: string }).code).toBe(PERMISSION_DENIED);
}

beforeAll(async () => {
  db = await connectDb();
  await truncateAppData(db);
  owner = await createAuthUser();
  member = await createAuthUser();
  outsider = await createAuthUser();
  await db.query(
    `insert into public.profiles (id, display_name) values ($1, '팀장닉'), ($2, '팀원닉'), ($3, '외부인')
     on conflict (id) do update set display_name = excluded.display_name`,
    [owner.id, member.id, outsider.id],
  );
  const { rows } = await db.query(`
    with s as (insert into public.subjects (kind, name) values ('contest_series', '접근 테스트 공모전') returning id),
         o as (insert into public.opportunities (subject_id, title, organization, category, deadline_type, source_name, source_url, last_checked_at)
               select id, '공고', '기관', 'hackathon', 'tbd', '출처', 'https://example.test/access', '2026-09-01T00:00:00Z' from s returning id, subject_id)
    select o.id as opp_id, o.subject_id from o`);
  const { rows: teamRows } = await db.query(
    `insert into public.teams (opportunity_id, owner_id, name, introduction, max_members) values ($1, $2, '팀', '소개', 3) returning id`,
    [rows[0].opp_id, owner.id],
  );
  fixture = { subjectId: rows[0].subject_id, oppId: rows[0].opp_id, teamId: teamRows[0].id };
  await db.query(`insert into public.team_contacts (team_id, contact_link) values ($1, 'https://open.kakao.com/o/secret')`, [
    fixture.teamId,
  ]);
  await db.query(`insert into public.team_members (team_id, user_id, role) values ($1, $2, 'leader'), ($1, $3, 'member')`, [
    fixture.teamId,
    owner.id,
    member.id,
  ]);
  await db.query(`insert into public.team_requests (team_id, user_id, message) values ($1, $2, '비공개 메시지')`, [
    fixture.teamId,
    outsider.id,
  ]);
  await db.query(
    `insert into public.reviews (author_id, subject_id, review_type, title, body, experience_year, is_anonymous, is_demo)
     values ($1, $2, 'contest', '익명 후기', '본문', 2025, true, false),
            ($1, $2, 'contest', '실명 후기', '본문', 2025, false, false),
            ($1, $2, 'contest', '예시 후기', '본문', 2025, false, true)`,
    [owner.id, fixture.subjectId],
  );
});

afterAll(async () => {
  await truncateAppData(db);
  await db.end();
  for (const user of [owner, member, outsider]) await deleteAuthUser(user.id);
});

const callers = () =>
  [
    ['anon', undefined],
    ['authenticated(실제 로그인 JWT)', owner.accessToken],
  ] as const;

describe('익명·로그인 사용자의 직접 Data API 접근 차단', () => {
  it.each([...APP_TABLES, ...PUBLIC_VIEWS])('%s 조회를 거부한다', async (name) => {
    for (const [, bearer] of callers()) expectDenied(await rest(`${name}?select=*`, { bearer }));
  });

  it.each(APP_TABLES)('%s 쓰기(INSERT/UPDATE/DELETE)를 거부한다', async (table) => {
    for (const [, bearer] of callers()) {
      expectDenied(await rest(table, { method: 'POST', bearer, body: { id: owner.id } }));
      expectDenied(await rest(`${table}?id=eq.${owner.id}`, { method: 'PATCH', bearer, body: { created_at: 'now()' } }));
      expectDenied(await rest(`${table}?id=eq.${owner.id}`, { method: 'DELETE', bearer }));
    }
  });

  it('로그인 사용자가 자기 author_id 로 후기를 넣거나 is_demo 를 바꿀 수 없다', async () => {
    expectDenied(
      await rest('reviews', {
        method: 'POST',
        bearer: member.accessToken,
        body: { author_id: member.id, subject_id: fixture.subjectId, review_type: 'contest', title: 't', body: 'b', experience_year: 2025 },
      }),
    );
    expectDenied(await rest('reviews?is_demo=eq.false', { method: 'PATCH', bearer: owner.accessToken, body: { is_demo: true } }));
    const { rows } = await db.query('select count(*)::int as n from public.reviews where is_demo');
    expect(rows[0].n).toBe(1);
  });

  it('카탈로그 기준으로도 anon/authenticated 권한이 전혀 없다', async () => {
    const { rows } = await db.query(
      `select c.relname, r.rolname
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
         cross join (values ('anon'), ('authenticated'), ('public')) as r(rolname)
        where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'S')
          and exists (
            select 1 from aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
             where a.grantee = case r.rolname when 'public' then 0 else (select oid from pg_roles where rolname = r.rolname) end
          )`,
    );
    expect(rows).toEqual([]);
  });

  it('모든 앱 테이블에 RLS 가 켜져 있고 사용자 허용 정책이 없다', async () => {
    const { rows } = await db.query(
      `select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    expect(rows).toEqual([]);
    const { rows: policies } = await db.query(`select policyname from pg_policies where schemaname = 'public'`);
    expect(policies).toEqual([]);
  });

  it('공개 뷰는 security_invoker 로 만들어졌다', async () => {
    const { rows } = await db.query(
      `select relname, reloptions from pg_class where relnamespace = 'public'::regnamespace and relkind = 'v' order by relname`,
    );
    expect(rows).toEqual([
      { relname: 'public_reviews', reloptions: ['security_invoker=true'] },
      { relname: 'public_teams', reloptions: ['security_invoker=true'] },
    ]);
  });

  it('public 스키마 함수는 anon/authenticated/PUBLIC 이 실행할 수 없다', async () => {
    const { rows } = await db.query(
      `select p.oid::regprocedure::text as fn from pg_proc p
        where p.pronamespace = 'public'::regnamespace
          and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`,
    );
    expect(rows).toEqual([]);
  });

  it('마이그레이션 역할이 새로 만드는 테이블·함수도 기본 권한이 회수된다', async () => {
    await db.query('begin');
    try {
      await db.query('set local role postgres');
      await db.query('create table public.zz_default_priv_probe (id int)');
      await db.query('create function public.zz_default_priv_fn() returns int language sql as $$ select 1 $$');
      const { rows } = await db.query(
        `select has_table_privilege('anon', 'public.zz_default_priv_probe', 'select') as anon_t,
                has_table_privilege('authenticated', 'public.zz_default_priv_probe', 'insert') as auth_t,
                has_function_privilege('anon', 'public.zz_default_priv_fn()', 'execute') as anon_f,
                has_function_privilege('authenticated', 'public.zz_default_priv_fn()', 'execute') as auth_f`,
      );
      expect(rows[0]).toEqual({ anon_t: false, auth_t: false, anon_f: false, auth_f: false });
    } finally {
      await db.query('rollback');
    }
  });
});

describe('service_role 서버 접근', () => {
  const service = { apikey: testDb.serviceRoleKey };

  it.each(APP_TABLES)('%s 조회에 성공한다', async (table) => {
    const result = await rest(`${table}?select=*`, service);
    expect(result.status).toBe(200);
    expect(Array.isArray(result.body)).toBe(true);
  });

  it('유효한 쓰기와 제약 위반을 구분한다', async () => {
    const ok = await rest('bookmarks', { ...service, method: 'POST', body: { user_id: member.id, opportunity_id: fixture.oppId }, prefer: 'return=minimal' });
    expect(ok.status).toBe(201);
    const dup = await rest('bookmarks', { ...service, method: 'POST', body: { user_id: member.id, opportunity_id: fixture.oppId } });
    expect(dup.status).toBe(409);
    expect((dup.body as { code: string }).code).toBe('23505');
  });

  it('public_reviews 는 작성자 UUID 없이 익명·예시 규칙에 맞는 닉네임만 제공한다', async () => {
    const result = await rest('public_reviews?select=*&order=title', service);
    expect(result.status).toBe(200);
    const rows = result.body as Record<string, unknown>[];
    expect(rows.map((r) => [r.title, r.author_display_name, r.is_demo])).toEqual([
      ['실명 후기', '팀장닉', false],
      ['예시 후기', '예시 작성자', true],
      ['익명 후기', '익명', false],
    ]);
    for (const row of rows) {
      expect(row).not.toHaveProperty('author_id');
      expect(JSON.stringify(row)).not.toContain(owner.id);
    }
  });

  it('public_teams 는 멤버 수만 집계하고 팀장 UUID·연락·요청·명단을 노출하지 않는다', async () => {
    const result = await rest('public_teams?select=*', service);
    expect(result.status).toBe(200);
    const [row] = result.body as Record<string, unknown>[];
    expect(row.member_count).toBe(2);
    expect(Object.keys(row).sort()).toEqual(
      ['created_at', 'id', 'introduction', 'max_members', 'member_count', 'name', 'opportunity_id', 'roles', 'skills', 'status', 'updated_at'],
    );
    const text = JSON.stringify(row);
    for (const secret of [owner.id, member.id, outsider.id, 'open.kakao.com', '비공개 메시지']) expect(text).not.toContain(secret);
  });
});
