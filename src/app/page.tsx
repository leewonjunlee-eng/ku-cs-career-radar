import Link from 'next/link';
import { OpportunityCard } from '@/components/opportunity-card';
import { listPublicOpportunities, listThisWeekOpportunities } from '@/lib/opportunities/public-data';
import {
  opportunityTabs,
  opportunitySearchTags,
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
  const title = rawParams.get('title') ?? '';
  const organization = rawParams.get('organization') ?? '';
  const description = rawParams.get('description') ?? '';
  const selectedCategories = rawParams.getAll('category');
  const selectedKey = [...selectedCategories].sort().join(',');
  const tab = opportunityTabs.find((t) => [...t.categories].sort().join(',') === selectedKey);
  const selectedTags = rawParams.getAll('tag');

  const thisWeek = await listThisWeekOpportunities();

  // 잘못된 검색 조건(사용자 입력)만 여기서 안내로 흡수한다. DB/네트워크 장애 같은
  // 그 외 오류는 그대로 던져서 error.tsx가 실패 상태로 처리하게 둔다.
  let items: Awaited<ReturnType<typeof listPublicOpportunities>>['items'] = [];
  let queryError: string | null = null;
  let page = 1;
  let pageCount = 1;
  try {
    const filters = parseOpportunityQuery(rawParams);
    const pagination = parseOpportunityPagination(rawParams);
    const result = await listPublicOpportunities(filters, pagination);
    items = result.items;
    page = result.page;
    pageCount = Math.max(1, Math.ceil(result.total / result.limit));
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    queryError = error.message;
  }
  // 현재 탭·검색 조건을 유지한 채 page만 바꾼 링크.
  const pageHref = (target: number) => {
    const params = new URLSearchParams(rawParams);
    params.set('page', String(target));
    return `/?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 pt-4">
        <span className="inline-block rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-primary">
          고려대 컴퓨터 관련 학생을 위한 커리어 레이더
        </span>
        <h1 className="text-3xl leading-tight tracking-tight sm:text-4xl">KCCR</h1>
        <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
          고려대학교 컴퓨터 관련 학생이 흩어진 커리어 정보를 한곳에서 찾고,
          경험 후기로 판단하고, 함께 도전할 팀까지 구성하는 서비스입니다.
        </p>
      </section>

      <section className="rounded-lg border border-sky-200 bg-sky-50 p-5">
        <h2 className="text-sm font-bold text-primary">이번 주 마감</h2>
        {thisWeek.length === 0 ? (
          <p className="mt-1 text-sm text-sky-800">이번 주 마감인 공고가 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-sky-900">
            {thisWeek.map((opportunity) => (
              <li key={opportunity.id} className="flex justify-between gap-2">
                <Link href={`/opportunities/${opportunity.id}`} className="font-medium hover:underline">
                  {opportunity.title}
                </Link>
                <span className="shrink-0 font-medium">{opportunity.deadline.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{tab ? `${tab.label} 공고` : '기회 탐색'}</h2>

        <form className="space-y-3" role="search">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm text-slate-700">
              제목
              <input name="title" defaultValue={title} placeholder="공고 제목" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-700">
              기관
              <input name="organization" defaultValue={organization} placeholder="기관 또는 회사" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-700">
              설명
              <input name="description" defaultValue={description} placeholder="설명에 포함된 내용" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
          </div>
          {/* 카테고리는 상단 탭이 고른다. 검색해도 현재 탭을 유지한다. */}
          {selectedCategories.map((category) => (
            <input key={category} type="hidden" name="category" value={category} />
          ))}
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">태그</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {opportunitySearchTags.map((tag) => (
                <label key={tag} className="cursor-pointer rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 has-[:checked]:border-primary has-[:checked]:bg-sky-50 has-[:checked]:font-medium has-[:checked]:text-primary">
                  <input type="checkbox" name="tag" value={tag} defaultChecked={selectedTags.includes(tag)} className="sr-only" />
                  {tag}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">검색</button>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        )}
        {!queryError && pageCount > 1 && (
          <nav aria-label="공고 페이지" className="flex items-center justify-center gap-3 pt-2 text-sm">
            {page > 1 ? (
              <a href={pageHref(page - 1)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100">이전</a>
            ) : (
              <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-400">이전</span>
            )}
            <span className="text-slate-600">{page} / {pageCount}</span>
            {page < pageCount ? (
              <a href={pageHref(page + 1)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100">다음</a>
            ) : (
              <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-400">다음</span>
            )}
          </nav>
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
