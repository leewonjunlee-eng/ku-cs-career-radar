/**
 * 로컬 개발용 Supabase 스택(supabase/config.toml)에 content/initial-content.json을 적용한다.
 *   node scripts/seed-content.ts
 *
 * - 실행 전 `npm run db:dev:start`로 스택을 띄워 마이그레이션이 적용돼 있어야 한다.
 * - 원문·확인 시각은 JSON 값을 그대로 쓴다(seed 실행 시각으로 덮어쓰지 않는다).
 * - opportunities는 source_url UNIQUE로 upsert하여 반복 실행해도 중복되지 않는다.
 * - 예시 후기 작성자는 개발자 관리 스크립트로 실제 auth.users 계정을 생성해 쓴다.
 *   가짜 UUID를 auth.users 없이 profiles/reviews에 직접 넣지 않는다.
 * - 키는 화면에 출력하지 않고 실패 시에도 stderr에서 가린다.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const CLI = ['node_modules/supabase/dist/supabase.js'];
const DEMO_AUTHOR_EMAIL = 'demo-reviewer@kucs-career-radar.local';

type Content = {
  subjects: { slug: string; kind: string; name: string; official_url: string | null }[];
  opportunities: Record<string, unknown>[];
  demo_review_templates: Record<string, unknown>[];
};

// content/initial-content.json은 P0 단계에서 준비된 어휘를 쓴다. DB enum과 다른
// 값만 여기서 옮긴다(그 외 값은 이름이 같다).
const categoryMap: Record<string, string> = { undergraduate_research: 'lab', employment: 'hiring' };
const deadlineTypeMap: Record<string, string> = { unknown: 'tbd' };
const reviewTypeMap: Record<string, string> = { undergraduate_research: 'research' };

function redact(text: string) {
  return text
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<redacted-jwt>')
    .replace(/sb_(publishable|secret)_[\w-]+/g, '<redacted-key>')
    .replace(/postgres(ql)?:\/\/[^\s"']+/g, '<redacted-db-url>');
}

function supabase(args: string[]): string {
  try {
    return execFileSync(process.execPath, [...CLI, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const e = error as { stderr?: string; stdout?: string };
    throw new Error(`supabase ${args[0]} 실패:\n${redact(`${e.stderr ?? ''}\n${e.stdout ?? ''}`).slice(-4000)}`);
  }
}

async function ensureDemoAuthor(apiUrl: string, serviceRoleKey: string): Promise<string> {
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  const created = await fetch(`${apiUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: DEMO_AUTHOR_EMAIL,
      password: `seed-${crypto.randomUUID()}`,
      email_confirm: true,
      user_metadata: { display_name: '예시 후기 계정' },
    }),
  });
  if (created.ok) return ((await created.json()) as { id: string }).id;

  // 이미 있으면(재실행) 목록에서 이메일로 찾는다.
  const list = await fetch(`${apiUrl}/auth/v1/admin/users?per_page=200`, { headers });
  if (!list.ok) throw new Error(`데모 작성자 조회 실패: HTTP ${list.status}`);
  const { users } = (await list.json()) as { users: { id: string; email?: string }[] };
  const existing = users.find((u) => u.email === DEMO_AUTHOR_EMAIL);
  if (!existing) throw new Error('데모 작성자 계정을 만들거나 찾을 수 없습니다.');
  return existing.id;
}

async function main() {
  const content = JSON.parse(readFileSync('content/initial-content.json', 'utf8')) as Content;
  const status = JSON.parse(supabase(['status', '-o', 'json'])) as {
    API_URL: string;
    DB_URL: string;
    SERVICE_ROLE_KEY: string;
  };

  const db = new pg.Client({ connectionString: status.DB_URL });
  await db.connect();
  try {
    const subjectIdBySlug = new Map<string, string>();
    for (const subject of content.subjects) {
      const existing = await db.query('select id from public.subjects where name = $1', [subject.name]);
      if (existing.rows[0]) {
        subjectIdBySlug.set(subject.slug, existing.rows[0].id);
        continue;
      }
      const { rows } = await db.query(
        'insert into public.subjects (kind, name, official_url) values ($1, $2, $3) returning id',
        [subject.kind, subject.name, subject.official_url],
      );
      subjectIdBySlug.set(subject.slug, rows[0].id);
    }
    console.log(`[seed-content] subjects: ${subjectIdBySlug.size}개 확인/생성`);

    let opportunityCount = 0;
    const opportunityIdBySlug = new Map<string, string>();
    for (const opp of content.opportunities) {
      const category = categoryMap[opp.category as string] ?? opp.category;
      const deadlineType = deadlineTypeMap[opp.deadline_type as string] ?? opp.deadline_type;
      const subjectId = subjectIdBySlug.get(opp.subject_slug as string);
      if (!subjectId) throw new Error(`알 수 없는 subject_slug: ${opp.subject_slug}`);

      const { rows } = await db.query(
        `insert into public.opportunities
           (subject_id, title, organization, category, tags, deadline, deadline_type, deadline_precision,
            source_name, source_url, ingestion_method, description, last_checked_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (source_url) do update set
           title = excluded.title, organization = excluded.organization, category = excluded.category,
           tags = excluded.tags, deadline = excluded.deadline, deadline_type = excluded.deadline_type,
           deadline_precision = excluded.deadline_precision, source_name = excluded.source_name,
           ingestion_method = excluded.ingestion_method, description = excluded.description,
           last_checked_at = excluded.last_checked_at
         returning id`,
        [
          subjectId,
          opp.title,
          opp.organization,
          category,
          opp.tags ?? [],
          opp.deadline,
          deadlineType,
          opp.deadline_precision,
          opp.source_name,
          opp.source_url,
          opp.ingestion_method,
          opp.description,
          opp.last_checked_at,
        ],
      );
      opportunityIdBySlug.set(opp.slug as string, rows[0].id);
      opportunityCount += 1;
    }
    console.log(`[seed-content] opportunities: ${opportunityCount}개 upsert`);

    const demoAuthorId = await ensureDemoAuthor(status.API_URL, status.SERVICE_ROLE_KEY);
    await db.query(
      `update public.profiles set display_name = '예시 후기 계정' where id = $1 and display_name <> '예시 후기 계정'`,
      [demoAuthorId],
    );

    let reviewCount = 0;
    for (const review of content.demo_review_templates) {
      const subjectId = subjectIdBySlug.get(review.subject_slug as string);
      if (!subjectId) throw new Error(`알 수 없는 subject_slug: ${review.subject_slug}`);
      const opportunityId = review.opportunity_slug
        ? (opportunityIdBySlug.get(review.opportunity_slug as string) ?? null)
        : null;
      const reviewType = reviewTypeMap[review.review_type as string] ?? review.review_type;

      const exists = await db.query(
        'select 1 from public.reviews where author_id = $1 and subject_id = $2 and title = $3',
        [demoAuthorId, subjectId, review.title],
      );
      if (exists.rows[0]) continue;

      await db.query(
        `insert into public.reviews
           (author_id, subject_id, opportunity_id, review_type, title, body, experience_year, period, role,
            result, preparation, pros, challenges, tips, skills, details, is_anonymous, is_demo)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true)`,
        [
          demoAuthorId,
          subjectId,
          opportunityId,
          reviewType,
          review.title,
          review.body,
          review.experience_year,
          review.period,
          review.role,
          review.result,
          review.preparation,
          review.pros,
          review.challenges,
          review.tips,
          review.skills ?? [],
          JSON.stringify(review.details ?? {}),
          review.is_anonymous ?? false,
        ],
      );
      reviewCount += 1;
    }
    console.log(`[seed-content] demo reviews: ${reviewCount}개 새로 생성 (기존 항목은 건너뜀)`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(redact(String(error instanceof Error ? error.message : error)));
  process.exit(1);
});
