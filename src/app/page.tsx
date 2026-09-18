import { OpportunityCard } from '@/components/opportunity-card';
import { listPublicOpportunities, listThisWeekOpportunities } from '@/lib/opportunities/public-data';
import {
  opportunityCategories,
  opportunityCategoryLabels,
  parseOpportunityPagination,
  parseOpportunityQuery,
} from '@/lib/opportunities/query';
import { ValidationError } from '@/lib/validation/common';
import { UnavailableNotice } from '@/components/unavailable-notice';

function toSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value !== undefined) params.set(key, value);
  }
  return params;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = toSearchParams(await searchParams);
  const q = rawParams.get('q') ?? '';
  const selectedCategory = rawParams.get('category') ?? '';
  const selectedDeadline = rawParams.get('deadline') ?? '';
  const selectedTag = rawParams.get('tag') ?? '';
  const includeExpired = rawParams.get('includeExpired') === 'true';

  const thisWeek = await listThisWeekOpportunities();

  // 잘못된 검색 조건(사용자 입력)만 여기서 안내로 흡수한다. DB/네트워크 장애 같은
  // 그 외 오류는 그대로 던져서 error.tsx가 실패 상태로 처리하게 둔다.
  let items: Awaited<ReturnType<typeof listPublicOpportunities>>['items'] = [];
  let queryError: string | null = null;
  try {
    const filters = parseOpportunityQuery(rawParams);
    const pagination = parseOpportunityPagination(rawParams);
    ({ items } = await listPublicOpportunities(filters, pagination));
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    queryError = error.message;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold sm:text-3xl">KU CS Career Radar</h1>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
          고려대학교 컴퓨터 관련 학생이 흩어진 커리어 정보를 한곳에서 찾고,
          경험 후기로 판단하고, 함께 도전할 팀까지 구성하는 서비스입니다.
        </p>
      </section>

      <section className="rounded-lg border border-sky-200 bg-sky-50 p-4">
        <h2 className="text-sm font-semibold text-sky-900">이번 주 마감</h2>
        {thisWeek.length === 0 ? (
          <p className="mt-1 text-sm text-sky-800">이번 주 마감인 공고가 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-sky-900">
            {thisWeek.map((opportunity) => (
              <li key={opportunity.id} className="flex justify-between gap-2">
                <span>{opportunity.title}</span>
                <span className="shrink-0 font-medium">{opportunity.deadline.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">기회 탐색</h2>

        <form className="flex flex-wrap gap-2" role="search">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="제목, 기관, 설명 검색"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="category"
            defaultValue={selectedCategory}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">전체 카테고리</option>
            {opportunityCategories.map((category) => (
              <option key={category} value={category}>
                {opportunityCategoryLabels[category]}
              </option>
            ))}
          </select>
          <input name="tag" defaultValue={selectedTag} placeholder="Tag" className="min-w-28 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="deadline" defaultValue={selectedDeadline} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All deadlines</option>
            <option value="this-week">This week</option>
            <option value="fixed">Fixed date</option>
            <option value="rolling">Rolling</option>
            <option value="tbd">TBD</option>
          </select>
          <label className="flex items-center gap-1 text-sm text-slate-600"><input type="checkbox" name="includeExpired" value="true" defaultChecked={includeExpired} /> Include expired</label>
          <button type="submit" className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
            검색
          </button>
        </form>

        <p className="text-sm text-slate-600">
          공고 데이터는 원문을 확인한 실제 공고만 등록합니다. 예시 공고를 만들어
          두지 않습니다.
        </p>
        {queryError ? (
          <p className="text-sm text-red-600">{queryError}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">조건에 맞는 공고가 없습니다.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">경험 후기</h2>
        <p className="text-sm text-slate-600">
          같은 대상에 쌓인 참여자 경험을{' '}
          <a href="/reviews" className="underline">
            후기 모아보기
          </a>
          에서 찾아보세요.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">팀원 찾기</h2>
        <UnavailableNotice>팀 모집글·참여 요청</UnavailableNotice>
      </section>
    </div>
  );
}
