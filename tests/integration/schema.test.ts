import type pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type AuthUser, connectDb, createAuthUser, deleteAuthUser, sqlState, truncateAppData } from './helpers';

// 실제 전용 테스트 스택 Postgres 에서 제약을 검증한다 (mock 아님).
// 각 테스트는 트랜잭션 안에서 실행하고 롤백한다. 기본 픽스처는 beforeAll 에서 커밋한다.
const FK = '23503';
const UNIQUE = '23505';
const NOT_NULL = '23502';
const CHECK = '23514';
const BAD_ENUM = '22P02';

let db: pg.Client;
let alice: AuthUser;
let bob: AuthUser;
let subjectA: string;
let subjectB: string;
let oppA: string;
let oppB: string;

const opp = (overrides: Record<string, unknown> = {}) => ({
  subject_id: subjectA,
  title: '공고',
  organization: '기관',
  category: 'hackathon',
  deadline: '2026-12-01T15:00:00Z',
  deadline_type: 'fixed',
  deadline_precision: 'date',
  source_name: '출처',
  source_url: `https://example.test/${Math.random()}`,
  last_checked_at: '2026-09-01T00:00:00Z',
  ...overrides,
});

async function insert(table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const sql = `insert into public.${table} (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`;
  return sqlState(db, sql, Object.values(row));
}

async function insertReturning(table: string, row: Record<string, unknown>): Promise<string> {
  const keys = Object.keys(row);
  const { rows } = await db.query(
    `insert into public.${table} (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
    Object.values(row),
  );
  return rows[0].id;
}

const review = (overrides: Record<string, unknown> = {}) => ({
  author_id: alice.id,
  subject_id: subjectA,
  review_type: 'contest',
  title: '후기',
  body: '본문',
  experience_year: 2025,
  ...overrides,
});

const team = (overrides: Record<string, unknown> = {}) => ({
  opportunity_id: oppA,
  owner_id: alice.id,
  name: '팀',
  introduction: '소개',
  max_members: 4,
  ...overrides,
});

beforeAll(async () => {
  db = await connectDb();
  await truncateAppData(db);
  alice = await createAuthUser();
  bob = await createAuthUser();
  await db.query(
    `insert into public.profiles (id, display_name) values ($1, 'alice'), ($2, 'bob')
     on conflict (id) do update set display_name = excluded.display_name`,
    [alice.id, bob.id],
  );
  subjectA = await insertReturning('subjects', { kind: 'contest_series', name: 'A 공모전' });
  subjectB = await insertReturning('subjects', { kind: 'company', name: 'B 회사' });
  oppA = await insertReturning('opportunities', opp());
  oppB = await insertReturning('opportunities', opp({ subject_id: subjectB, category: 'internship' }));
});

afterAll(async () => {
  await truncateAppData(db);
  await db.end();
  await deleteAuthUser(alice.id);
  await deleteAuthUser(bob.id);
});

beforeEach(async () => {
  await db.query('begin');
});
afterEach(async () => {
  await db.query('rollback');
});

describe('유효한 행', () => {
  it('모든 테이블에 올바른 행을 저장하고 기본값을 채운다', async () => {
    expect(await insert('opportunities', opp({ deadline: null, deadline_type: 'rolling', deadline_precision: null }))).toBeNull();
    expect(await insert('opportunities', opp({ deadline: null, deadline_type: 'tbd', deadline_precision: null, tags: ['AI', '웹'] }))).toBeNull();
    expect(await insert('bookmarks', { user_id: alice.id, opportunity_id: oppA })).toBeNull();
    const reviewId = await insertReturning('reviews', review({ opportunity_id: oppA, skills: ['TypeScript'], details: { team_size: 4 } }));
    expect(await insert('reviews', review({ subject_id: subjectB, review_type: 'internship', opportunity_id: null }))).toBeNull();
    const teamId = await insertReturning('teams', team({ roles: ['백엔드'], skills: ['Next.js'] }));
    expect(await insert('team_contacts', { team_id: teamId, contact_link: 'https://open.kakao.com/o/abc' })).toBeNull();
    expect(await insert('team_members', { team_id: teamId, user_id: alice.id, role: 'leader' })).toBeNull();
    expect(await insert('team_requests', { team_id: teamId, user_id: bob.id, message: '참여하고 싶어요' })).toBeNull();

    const { rows } = await db.query(
      `select r.is_anonymous, r.is_demo, r.details, t.status, q.status as request_status, o.ingestion_method
         from reviews r, teams t, team_requests q, opportunities o
        where r.id = $1 and t.id = $2 and q.team_id = t.id and o.id = $3`,
      [reviewId, teamId, oppA],
    );
    expect(rows[0]).toEqual({
      is_anonymous: false,
      is_demo: false,
      details: { team_size: 4 },
      status: 'open',
      request_status: 'pending',
      ingestion_method: 'manual',
    });
  });

  it('후기 대상과 같은 subject 의 공고 회차는 허용한다', async () => {
    expect(await insert('reviews', review({ subject_id: subjectB, opportunity_id: oppB, review_type: 'internship' }))).toBeNull();
  });
});

describe('외래 키·삭제 보존', () => {
  it('존재하지 않는 대상·공고·사용자 참조를 거부한다', async () => {
    const missing = '00000000-0000-0000-0000-000000000000';
    expect(await insert('opportunities', opp({ subject_id: missing }))).toBe(FK);
    expect(await insert('bookmarks', { user_id: alice.id, opportunity_id: missing })).toBe(FK);
    expect(await insert('bookmarks', { user_id: missing, opportunity_id: oppA })).toBe(FK);
    expect(await insert('reviews', review({ subject_id: missing }))).toBe(FK);
    expect(await insert('teams', team({ opportunity_id: missing }))).toBe(FK);
    expect(await insert('team_members', { team_id: missing, user_id: alice.id, role: 'member' })).toBe(FK);
    expect(await insert('profiles', { id: missing, display_name: 'ghost' })).toBe(FK);
  });

  it('후기 subject 는 필수이며 다른 subject 의 공고 회차와 연결할 수 없다 (복합 FK)', async () => {
    expect(await insert('reviews', review({ subject_id: null }))).toBe(NOT_NULL);
    expect(await insert('reviews', review({ subject_id: subjectA, opportunity_id: oppB }))).toBe(FK);
  });

  it('후기·팀이 참조하는 공고·대상·프로필은 삭제할 수 없다', async () => {
    await insertReturning('reviews', review({ opportunity_id: oppA }));
    await insertReturning('teams', team());
    expect(await sqlState(db, 'delete from public.opportunities where id = $1', [oppA])).toBe(FK);
    expect(await sqlState(db, 'delete from public.subjects where id = $1', [subjectA])).toBe(FK);
    expect(await sqlState(db, 'delete from public.profiles where id = $1', [alice.id])).toBe(FK);
  });

  it('공고가 참조하는 대상은 삭제할 수 없다', async () => {
    expect(await sqlState(db, 'delete from public.subjects where id = $1', [subjectB])).toBe(FK);
  });
});

describe('유일성', () => {
  it('같은 공고의 중복 북마크를 거부한다', async () => {
    expect(await insert('bookmarks', { user_id: bob.id, opportunity_id: oppA })).toBeNull();
    expect(await insert('bookmarks', { user_id: bob.id, opportunity_id: oppA })).toBe(UNIQUE);
  });

  it('같은 원문 URL 의 공고를 중복 저장하지 않는다', async () => {
    expect(await insert('opportunities', opp({ source_url: 'https://example.test/dup' }))).toBeNull();
    expect(await insert('opportunities', opp({ source_url: 'https://example.test/dup', title: '다른 제목' }))).toBe(UNIQUE);
  });

  it('팀 멤버·참여 요청 쌍과 팀장 멤버는 팀마다 하나다', async () => {
    const teamId = await insertReturning('teams', team());
    expect(await insert('team_members', { team_id: teamId, user_id: alice.id, role: 'leader' })).toBeNull();
    expect(await insert('team_members', { team_id: teamId, user_id: alice.id, role: 'member' })).toBe(UNIQUE);
    expect(await insert('team_members', { team_id: teamId, user_id: bob.id, role: 'leader' })).toBe(UNIQUE);
    expect(await insert('team_requests', { team_id: teamId, user_id: bob.id })).toBeNull();
    expect(await insert('team_requests', { team_id: teamId, user_id: bob.id })).toBe(UNIQUE);
  });
});

describe('마감 조합', () => {
  it.each([
    ['확정인데 마감 시각 없음', { deadline: null }],
    ['확정인데 정밀도 없음', { deadline_precision: null }],
    ['상시인데 마감 시각 있음', { deadline_type: 'rolling', deadline_precision: null }],
    ['미정인데 정밀도 있음', { deadline_type: 'tbd', deadline: null }],
  ])('%s → 거부', async (_label, overrides) => {
    expect(await insert('opportunities', opp(overrides))).toBe(CHECK);
  });

  it('원문 확인 시각은 기본값 없이 필수다', async () => {
    expect(await insert('opportunities', opp({ last_checked_at: null }))).toBe(NOT_NULL);
  });
});

describe('enum·범위', () => {
  it('알 수 없는 enum 값을 거부한다', async () => {
    expect(await insert('opportunities', opp({ category: 'party' }))).toBe(BAD_ENUM);
    expect(await insert('opportunities', opp({ deadline_type: 'soon' }))).toBe(BAD_ENUM);
    expect(await insert('subjects', { kind: 'club', name: 'x' })).toBe(BAD_ENUM);
    expect(await insert('reviews', review({ review_type: 'gossip' }))).toBe(BAD_ENUM);
    expect(await insert('teams', team({ status: 'recruiting' }))).toBe(BAD_ENUM);
    const teamId = await insertReturning('teams', team());
    expect(await insert('team_members', { team_id: teamId, user_id: bob.id, role: 'owner' })).toBe(BAD_ENUM);
    expect(await insert('team_requests', { team_id: teamId, user_id: bob.id, status: 'approved' })).toBe(BAD_ENUM);
  });

  it.each([1, 0, 11])('팀 정원 %i 을 거부한다 (팀장 포함 2~10)', async (max) => {
    expect(await insert('teams', team({ max_members: max }))).toBe(CHECK);
  });

  it.each([1999, 2101])('경험 연도 %i 을 거부한다', async (year) => {
    expect(await insert('reviews', review({ experience_year: year }))).toBe(CHECK);
  });

  it('필수 불리언은 NULL 을 허용하지 않는다', async () => {
    expect(await insert('reviews', review({ is_demo: null }))).toBe(NOT_NULL);
    expect(await insert('reviews', review({ is_anonymous: null }))).toBe(NOT_NULL);
  });

  it('details 는 JSON 객체여야 한다', async () => {
    expect(await insert('reviews', review({ details: JSON.stringify([1, 2]) }))).toBe(CHECK);
    expect(await insert('reviews', review({ details: JSON.stringify({ tip: 'x'.repeat(5000) }) }))).toBe(CHECK);
  });
});

describe('문자열·URL·배열', () => {
  const blanks = ['', '   ', '\t\n\r', ' ', '　　', '​', ' ﻿ '];

  it.each(blanks.map((b) => [JSON.stringify(b), b]))('공백만 있는 필수 문자열 %s 을 거부한다', async (_label, blank) => {
    expect(await insert('profiles', { id: bob.id, display_name: blank })).toBe(CHECK);
    expect(await insert('subjects', { kind: 'lab', name: blank })).toBe(CHECK);
    expect(await insert('opportunities', opp({ title: blank }))).toBe(CHECK);
    expect(await insert('reviews', review({ title: blank }))).toBe(CHECK);
    expect(await insert('reviews', review({ body: blank }))).toBe(CHECK);
    expect(await insert('teams', team({ name: blank }))).toBe(CHECK);
    expect(await insert('reviews', review({ tips: blank }))).toBe(CHECK);
  });

  it('필수 문자열 NULL 을 거부한다', async () => {
    expect(await insert('opportunities', opp({ title: null }))).toBe(NOT_NULL);
    expect(await insert('reviews', review({ body: null }))).toBe(NOT_NULL);
    expect(await insert('teams', team({ name: null }))).toBe(NOT_NULL);
  });

  it('길이 한도를 넘는 문자열을 거부한다', async () => {
    expect(await insert('reviews', review({ body: '가'.repeat(5001) }))).toBe(CHECK);
    expect(await insert('reviews', review({ body: '가'.repeat(5000) }))).toBeNull();
    expect(await insert('teams', team({ name: 'x'.repeat(51) }))).toBe(CHECK);
  });

  it.each(['javascript:alert(1)', 'ftp://example.test/x', 'https://', 'https:// space.test', 'example.test/x'])(
    'http/https 가 아닌 URL %s 을 거부한다',
    async (url) => {
      expect(await insert('opportunities', opp({ source_url: url }))).toBe(CHECK);
      expect(await insert('subjects', { kind: 'lab', name: `연구실 ${url}`, official_url: url })).toBe(CHECK);
    },
  );

  it('팀 연락 링크도 http/https 만 허용한다', async () => {
    const teamId = await insertReturning('teams', team());
    expect(await insert('team_contacts', { team_id: teamId, contact_link: 'javascript:alert(1)' })).toBe(CHECK);
  });

  it('배열 크기·항목 길이·NULL·공백 항목을 거부한다', async () => {
    expect(await insert('opportunities', opp({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }))).toBe(CHECK);
    expect(await insert('opportunities', opp({ tags: ['ok', null] }))).toBe(CHECK);
    expect(await insert('opportunities', opp({ tags: ['x'.repeat(31)] }))).toBe(CHECK);
    expect(await insert('opportunities', opp({ tags: ['  '] }))).toBe(CHECK);
    expect(await insert('reviews', review({ skills: Array.from({ length: 21 }, (_, i) => `s${i}`) }))).toBe(CHECK);
    expect(await insert('teams', team({ roles: Array.from({ length: 11 }, (_, i) => `r${i}`) }))).toBe(CHECK);
    expect(await insert('opportunities', opp({ tags: null }))).toBe(NOT_NULL);
  });
});
