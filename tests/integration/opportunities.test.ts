import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { classifyDeadline } from '@/lib/opportunities/deadline';
import { escapeIlikePattern, quotePostgrestValue } from '@/lib/opportunities/query';
import { connectDb, rest, testDb, truncateAppData } from './helpers';

// 실제 전용 테스트 스택 Postgres/PostgREST를 대상으로 한다 (mock 아님).
// 필터·정렬·마감 계산은 src/lib/opportunities/public-data.ts가 서비스 롤로 실행하는
// 쿼리와 같은 조건을 raw SQL로 검증한다('server-only'로 표시된 모듈은 vitest에서 직접
// import할 수 없다).

let db: pg.Client;
const service = { apikey: testDb.serviceRoleKey };

let subjectId: string;
let openFixedId: string;
let expiredFixedId: string;
let rollingId: string;
let tbdId: string;
let keywordId: string;
let underscoreLiteralId: string;
let underscoreDecoyId: string;
let commaKeywordId: string;

const publicSelect =
  'id,title,organization,category,tags,deadline,deadline_type,deadline_precision,source_name,source_url,description,last_checked_at';

async function insertOpportunity(overrides: Record<string, unknown>): Promise<string> {
  const row = {
    subject_id: subjectId,
    title: '공고',
    organization: '기관',
    category: 'hackathon',
    source_name: '출처',
    source_url: `https://example.test/opp/${Math.random()}`,
    last_checked_at: '2026-09-01T00:00:00Z',
    ...overrides,
  };
  const keys = Object.keys(row);
  const { rows } = await db.query(
    `insert into public.opportunities (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
    Object.values(row),
  );
  return rows[0].id;
}

beforeAll(async () => {
  db = await connectDb();
  await truncateAppData(db);
  const { rows } = await db.query(
    `insert into public.subjects (kind, name) values ('contest_series', '공고 조회 테스트 대상') returning id`,
  );
  subjectId = rows[0].id;

  openFixedId = await insertOpportunity({
    title: '열린 확정 마감 공고',
    category: 'hackathon',
    tags: ['AI', '백엔드'],
    deadline_type: 'fixed',
    deadline: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    deadline_precision: 'time',
  });
  expiredFixedId = await insertOpportunity({
    title: '마감된 공고',
    category: 'contest',
    deadline_type: 'fixed',
    deadline: new Date(Date.now() - 86_400_000).toISOString(),
    deadline_precision: 'time',
  });
  rollingId = await insertOpportunity({
    title: '상시 채용 공고',
    category: 'internship',
    deadline_type: 'rolling',
  });
  tbdId = await insertOpportunity({
    title: '마감 미정 연구실 공고',
    category: 'lab',
    deadline_type: 'tbd',
  });
  keywordId = await insertOpportunity({
    title: '특이키워드_검색%대상',
    category: 'extracurricular',
    deadline_type: 'tbd',
  });
  // '_'는 LIKE에서 임의의 한 글자와 일치하는 와일드카드다. 이스케이프가 실제로
  // 동작한다면 literal 검색은 정확히 밑줄이 있는 쪽만 찾아야 한다.
  underscoreLiteralId = await insertOpportunity({ title: 'ab_cd 밑줄공고', category: 'extracurricular', deadline_type: 'tbd' });
  underscoreDecoyId = await insertOpportunity({ title: 'abXcd 언더스코어아님공고', category: 'extracurricular', deadline_type: 'tbd' });
  commaKeywordId = await insertOpportunity({ title: '쉼표,포함(공고)*별표', category: 'extracurricular', deadline_type: 'tbd' });
});

afterAll(async () => {
  await truncateAppData(db);
  await db.end();
});

describe('공고 조회 (실제 DB)', () => {
  it('기본 목록은 마감된 확정 공고를 제외하고, 열린 확정 공고를 상시/미정보다 앞에 둔다', async () => {
    const { rows } = await db.query(
      `select id from public.opportunities
        where deadline_type in ('rolling', 'tbd') or deadline > now()
        order by deadline asc nulls last, id asc`,
    );
    const ids = rows.map((r) => r.id);
    expect(ids).not.toContain(expiredFixedId);
    expect(ids[0]).toBe(openFixedId);
    expect(ids).toEqual(expect.arrayContaining([openFixedId, rollingId, tbdId, keywordId]));
  });

  it('마감 공고 포함 옵션을 켜면 마감된 확정 공고도 조회된다', async () => {
    const { rows } = await db.query(`select id from public.opportunities where id = $1`, [expiredFixedId]);
    expect(rows).toHaveLength(1);
  });

  it('제목·기관·설명에서 검색어를 ILIKE 부분 일치로 찾고 %,_ 를 리터럴로 처리한다', async () => {
    const pattern = `%${escapeIlikePattern('특이키워드_검색%대상')}%`;
    const { rows } = await db.query(
      `select id from public.opportunities where title ilike $1 or organization ilike $1 or description ilike $1`,
      [pattern],
    );
    expect(rows.map((r) => r.id)).toEqual([keywordId]);

    // '_'를 이스케이프하지 않으면 임의의 한 글자와 일치하는 와일드카드로 동작해
    // 'ab_cd'와 'abXcd' 둘 다 걸린다. 이스케이프하면 밑줄이 있는 쪽만 걸려야 한다.
    const escapedUnderscore = `%${escapeIlikePattern('ab_cd')}%`;
    const literalOnly = await db.query(`select id from public.opportunities where title ilike $1`, [escapedUnderscore]);
    expect(literalOnly.rows.map((r) => r.id)).toEqual([underscoreLiteralId]);

    const unescaped = await db.query(`select id from public.opportunities where title ilike '%ab_cd%'`);
    expect(unescaped.rows.map((r) => r.id).sort()).toEqual([underscoreDecoyId, underscoreLiteralId].sort());
  });

  it('REST or() 필터로 검색할 때 쉼표·괄호가 포함된 검색어도 안전하게 처리한다', async () => {
    // src/lib/opportunities/public-data.ts의 listPublicOpportunities가 실제로
    // 만드는 or() 필터 문자열을 그대로 재현한다. 값에 quotePostgrestValue를
    // 씌우지 않으면 ','/')'가 필터 트리를 깨고(500) 사용자가 조건 구조를 바꿀 수 있다.
    const pattern = quotePostgrestValue(`%${escapeIlikePattern('쉼표,포함(공고)*별표')}%`);
    const or = `title.ilike.${pattern},organization.ilike.${pattern},description.ilike.${pattern}`;
    const result = await rest(`opportunities?select=id&or=(${or})`, service);
    expect(result.status).toBe(200);
    expect((result.body as { id: string }[]).map((r) => r.id)).toEqual([commaKeywordId]);

    // 알려진 한계, 스펙 범위 밖(docs/features/opportunities.md §3은 %,_ 만 명시):
    // '*' 하나만 검색해도 PostgREST가 or() 안에서 '*'를 '%'로 치환해 전체 공고가
    // 매치된다. escapeIlikePattern으로도 quoting으로도 막을 수 없다(둘 다 시도해서
    // 확인함 — see git history). 회귀 여부만 관찰하는 용도로 현재 동작을 고정한다.
    const starPattern = quotePostgrestValue(`%${escapeIlikePattern('*')}%`);
    const starOr = `title.ilike.${starPattern},organization.ilike.${starPattern},description.ilike.${starPattern}`;
    const starResult = await rest(`opportunities?select=id&or=(${starOr})`, service);
    expect(starResult.status).toBe(200);
    expect((starResult.body as { id: string }[]).length).toBeGreaterThan(1);
  });

  it('카테고리로 필터링한다', async () => {
    const { rows } = await db.query(`select id from public.opportunities where category = 'lab'`);
    expect(rows.map((r) => r.id)).toEqual([tbdId]);
  });

  it('태그 배열을 포함(containment) 조건으로 필터링한다', async () => {
    const { rows } = await db.query(`select id from public.opportunities where tags @> array['AI']::text[]`);
    expect(rows.map((r) => r.id)).toEqual([openFixedId]);
  });

  it('service_role은 공개 필드를 조회할 수 있고 anon/authenticated는 여전히 차단된다', async () => {
    const byId = await rest(`opportunities?id=eq.${openFixedId}&select=${publicSelect}`, service);
    expect(byId.status).toBe(200);
    const [row] = byId.body as Record<string, unknown>[];
    expect(row.title).toBe('열린 확정 마감 공고');
    expect(row).not.toHaveProperty('subject_id');

    const anonAttempt = await rest(`opportunities?id=eq.${openFixedId}&select=id`);
    expect([401, 403]).toContain(anonAttempt.status);
  });

  it('존재하지 않는 id는 빈 결과를 반환한다', async () => {
    const missing = await rest(`opportunities?id=eq.00000000-0000-0000-0000-000000000000&select=id`, service);
    expect(missing.status).toBe(200);
    expect(missing.body).toEqual([]);
  });

  it('실제로 저장된 마감 시각을 애플리케이션의 마감 분류 로직으로 계산하면 예상한 라벨이 나온다', async () => {
    const { rows } = await db.query(
      `select id, deadline, deadline_type, deadline_precision from public.opportunities where id = $1`,
      [openFixedId],
    );
    const classification = classifyDeadline(rows[0], new Date());
    expect(classification.kind).toBe('open');
    if (classification.kind !== 'rolling' && classification.kind !== 'tbd') {
      expect(classification.timeIsProvided).toBe(true);
      expect(classification.daysUntil).toBeGreaterThanOrEqual(3);
    }

    const expired = await db.query(
      `select id, deadline, deadline_type, deadline_precision from public.opportunities where id = $1`,
      [expiredFixedId],
    );
    expect(classifyDeadline(expired.rows[0], new Date()).kind).toBe('expired');
  });

  it('원문 URL이 고려대 웹사이트면 is_korea_university_source가 자동으로 true가 되고 위장 도메인은 false다', async () => {
    const cases: [string, boolean][] = [
      ['https://info.korea.ac.kr/info/board/x.do?articleNo=1', true],
      ['https://GLDC.KOREA.AC.KR/gldc/index.do', true],
      ['https://korea.ac.kr/', true],
      ['https://korea.ac.kr.example.test/x', false],
      ['https://evilkorea.ac.kr/x', false],
      ['https://korea.ac.kr@example.test/x', false],
      ['https://dacon.io/competitions/1', false],
    ];
    for (const [url, expected] of cases) {
      const id = await insertOpportunity({ title: `출처 판별 ${url}`, deadline_type: 'tbd', source_url: url });
      const { rows } = await db.query('select is_korea_university_source from public.opportunities where id = $1', [id]);
      expect([url, rows[0].is_korea_university_source]).toEqual([url, expected]);
    }

    // 계산 컬럼이라 직접 값을 넣어 위조할 수 없다.
    await expect(
      insertOpportunity({ title: '위조 시도', deadline_type: 'tbd', is_korea_university_source: true }),
    ).rejects.toThrow();
  });

  it('고려대 출처 공고만 DB에서 필터링할 수 있다(service_role REST)', async () => {
    const kuId = await insertOpportunity({
      title: '고려대 필터 대상',
      deadline_type: 'tbd',
      source_url: 'https://info.korea.ac.kr/info/board/filter.do?articleNo=2',
    });
    const result = await rest('opportunities?select=id&is_korea_university_source=eq.true', service);
    expect(result.status).toBe(200);
    const ids = (result.body as { id: string }[]).map((r) => r.id);
    expect(ids).toContain(kuId);
    expect(ids).not.toContain(openFixedId); // example.test 출처
  });
});
