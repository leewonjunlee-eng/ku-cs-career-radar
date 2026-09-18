import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// 'server-only' 모듈은 웹팩의 react-server 조건에서만 empty.js 로 치환된다. vitest(node)에서는
// 그냥 import하면 즉시 throw하므로 실제 서버 전용 데이터 모듈을 그대로 exercise하려면 mock한다.
vi.mock('server-only', () => ({}));

import { connectDb, createAuthUser, deleteAuthUser, testDb, truncateAppData, type AuthUser } from './helpers';

let db: pg.Client;
let userA: AuthUser;
let userB: AuthUser;
let subjectId: string;
let otherSubjectId: string;
let currentOppId: string;
let otherSubjectOppId: string;

beforeAll(async () => {
  // public-config.ts/server-config.ts는 process.env를 호출 시점에 읽으므로 여기서 설정해도 된다
  // (모듈 최상단 import 시점에는 읽지 않는다).
  process.env.NEXT_PUBLIC_SUPABASE_URL = testDb.apiUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = testDb.anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = testDb.serviceRoleKey;

  db = await connectDb();
  await truncateAppData(db);
  userA = await createAuthUser();
  userB = await createAuthUser();
  await db.query(
    `update public.profiles set display_name = '작성자A' where id = $1`,
    [userA.id],
  );
  await db.query(`update public.profiles set display_name = '작성자B' where id = $1`, [userB.id]);

  const subjectRows = await db.query(
    `insert into public.subjects (kind, name) values ('contest_series', '후기 통합테스트 공모전') returning id`,
  );
  subjectId = subjectRows.rows[0].id;
  const otherSubjectRows = await db.query(
    `insert into public.subjects (kind, name) values ('company', '후기 통합테스트 다른 대상') returning id`,
  );
  otherSubjectId = otherSubjectRows.rows[0].id;

  const oppRows = await db.query(
    `insert into public.opportunities (subject_id, title, organization, category, deadline_type, source_name, source_url, last_checked_at)
     values ($1, '올해 공고', '기관', 'contest', 'tbd', '출처', $2, now()) returning id`,
    [subjectId, `https://example.test/reviews-it/${randomUUID()}`],
  );
  currentOppId = oppRows.rows[0].id;

  const otherOppRows = await db.query(
    `insert into public.opportunities (subject_id, title, organization, category, deadline_type, source_name, source_url, last_checked_at)
     values ($1, '다른 대상 공고', '기관', 'contest', 'tbd', '출처', $2, now()) returning id`,
    [otherSubjectId, `https://example.test/reviews-it/${randomUUID()}`],
  );
  otherSubjectOppId = otherOppRows.rows[0].id;

  // 공고 미연결 과거 후기 (docs/features/reviews.md §4)
  await db.query(
    `insert into public.reviews (author_id, subject_id, opportunity_id, review_type, title, body, experience_year, is_anonymous, is_demo)
     values ($1, $2, null, 'contest', '작년 후기', '작년 경험', 2024, false, false)`,
    [userA.id, subjectId],
  );
  // 예시 후기 (기본 목록에서 제외되어야 함)
  await db.query(
    `insert into public.reviews (author_id, subject_id, opportunity_id, review_type, title, body, experience_year, is_anonymous, is_demo)
     values ($1, $2, null, 'contest', '예시 후기', '예시 경험', 2024, false, true)`,
    [userA.id, subjectId],
  );
});

afterAll(async () => {
  await truncateAppData(db);
  await db.end();
  await deleteAuthUser(userA.id);
  await deleteAuthUser(userB.id);
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe('후기 조회 (실제 DB, server-only 데이터 모듈 직접 호출)', () => {
  it('공고 미연결 과거 후기가 같은 대상의 목록에 조회된다', async () => {
    const { listPublicReviews } = await import('@/lib/reviews/public-data');
    const result = await listPublicReviews({ subjectId, demo: false }, { page: 1, limit: 20 });
    const titles = result.items.map((r) => r.title);
    expect(titles).toContain('작년 후기');
    expect(result.items.find((r) => r.title === '작년 후기')?.opportunityId).toBeNull();
  });

  it('기본 목록·예시 보기는 서로 배타적이다', async () => {
    const { listPublicReviews } = await import('@/lib/reviews/public-data');
    const normal = await listPublicReviews({ subjectId, demo: false }, { page: 1, limit: 20 });
    expect(normal.items.map((r) => r.title)).not.toContain('예시 후기');

    const demo = await listPublicReviews({ subjectId, demo: true }, { page: 1, limit: 20 });
    expect(demo.items.map((r) => r.title)).toEqual(['예시 후기']);
    expect(demo.items[0].isDemo).toBe(true);
  });

  it('subjects 공개 목록을 조회할 수 있다', async () => {
    const { listPublicSubjects } = await import('@/lib/subjects/public-data');
    const subjects = await listPublicSubjects();
    expect(subjects.map((s) => s.id)).toContain(subjectId);
  });
});

describe('후기 작성·수정·삭제 (실제 DB)', () => {
  it('작성 -> 수정 -> 삭제가 재조회에 반영된다', async () => {
    const { createReview, updateReview, deleteReview, listMyReviews } = await import('@/lib/reviews/mutations');

    const created = await createReview(userA.id, {
      subjectId,
      opportunityId: currentOppId,
      reviewType: 'contest',
      title: '올해 후기',
      body: '본문',
      experienceYear: 2026,
      period: null,
      role: null,
      result: null,
      preparation: null,
      pros: null,
      challenges: null,
      tips: null,
      skills: ['Python'],
      details: { team_size: 4 },
      isAnonymous: false,
    });
    expect(created.isDemo).toBe(false);

    let mine = await listMyReviews(userA.id);
    expect(mine.map((r) => r.id)).toContain(created.id);

    const updated = await updateReview(userA.id, created.id, { title: '수정된 후기' });
    expect(updated.title).toBe('수정된 후기');
    mine = await listMyReviews(userA.id);
    expect(mine.find((r) => r.id === created.id)?.title).toBe('수정된 후기');

    await deleteReview(userA.id, created.id);
    mine = await listMyReviews(userA.id);
    expect(mine.map((r) => r.id)).not.toContain(created.id);
  });

  it('다른 사용자의 후기 수정·삭제는 거부되고 원본은 바뀌지 않는다', async () => {
    const { createReview, updateReview, deleteReview } = await import('@/lib/reviews/mutations');
    const created = await createReview(userA.id, {
      subjectId,
      opportunityId: null,
      reviewType: 'contest',
      title: '보호되어야 할 후기',
      body: '본문',
      experienceYear: 2025,
      period: null,
      role: null,
      result: null,
      preparation: null,
      pros: null,
      challenges: null,
      tips: null,
      skills: [],
      details: {},
      isAnonymous: false,
    });

    await expect(updateReview(userB.id, created.id, { title: '탈취 시도' })).rejects.toMatchObject({ status: 404 });
    await expect(deleteReview(userB.id, created.id)).rejects.toMatchObject({ status: 404 });

    const { rows } = await db.query('select title from public.reviews where id = $1', [created.id]);
    expect(rows[0].title).toBe('보호되어야 할 후기');
  });

  it('존재하지 않는 subject나 subject/공고 불일치는 400으로 거부된다', async () => {
    const { createReview } = await import('@/lib/reviews/mutations');
    const base = {
      reviewType: 'contest' as const,
      title: '실패해야 함',
      body: '본문',
      experienceYear: 2025,
      period: null,
      role: null,
      result: null,
      preparation: null,
      pros: null,
      challenges: null,
      tips: null,
      skills: [],
      details: {},
      isAnonymous: false,
    };

    await expect(createReview(userA.id, { ...base, subjectId: randomUUID(), opportunityId: null })).rejects.toMatchObject({ status: 400 });
    await expect(createReview(userA.id, { ...base, subjectId, opportunityId: otherSubjectOppId })).rejects.toMatchObject({ status: 400 });
  });

  it('일반 사용자는 is_demo를 지정하거나 바꿀 수 없다 (mutations 계층에 그 경로가 없다)', async () => {
    const { createReview } = await import('@/lib/reviews/mutations');
    const created = await createReview(userA.id, {
      subjectId,
      opportunityId: null,
      reviewType: 'contest',
      title: 'is_demo 고정 확인',
      body: '본문',
      experienceYear: 2025,
      period: null,
      role: null,
      result: null,
      preparation: null,
      pros: null,
      challenges: null,
      tips: null,
      skills: [],
      details: {},
      isAnonymous: false,
    });
    expect(created.isDemo).toBe(false);
    const { rows } = await db.query('select is_demo from public.reviews where id = $1', [created.id]);
    expect(rows[0].is_demo).toBe(false);
  });

  it('익명 후기 작성자 UUID는 공개 응답 어디에도 노출되지 않는다', async () => {
    const { createReview } = await import('@/lib/reviews/mutations');
    const { listPublicReviews } = await import('@/lib/reviews/public-data');
    await createReview(userA.id, {
      subjectId,
      opportunityId: null,
      reviewType: 'contest',
      title: '익명 확인용 후기',
      body: '본문',
      experienceYear: 2025,
      period: null,
      role: null,
      result: null,
      preparation: null,
      pros: null,
      challenges: null,
      tips: null,
      skills: [],
      details: {},
      isAnonymous: true,
    });

    const result = await listPublicReviews({ subjectId, demo: false }, { page: 1, limit: 20 });
    const anon = result.items.find((r) => r.title === '익명 확인용 후기');
    expect(anon?.authorDisplayName).toBe('익명');
    expect(JSON.stringify(result)).not.toContain(userA.id);
  });
});
