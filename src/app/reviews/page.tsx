import { ReviewCard } from '@/components/reviews/review-card';
import { ReviewForm } from '@/components/reviews/review-form';
import { listPublicReviews } from '@/lib/reviews/public-data';
import { parseReviewQuery } from '@/lib/reviews/query';
import { listPublicSubjects } from '@/lib/subjects/public-data';
import { createServerClient } from '@/lib/supabase/server';
import { reviewTypeLabels, reviewTypes } from '@/lib/validation/review';
import { ValidationError } from '@/lib/validation/common';

function toSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value !== undefined) params.set(key, value);
  }
  return params;
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = toSearchParams(await searchParams);
  const subjects = await listPublicSubjects();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let items: Awaited<ReturnType<typeof listPublicReviews>>['items'] = [];
  let queryError: string | null = null;
  const demo = rawParams.get('demo') === 'true';
  try {
    const filters = parseReviewQuery(rawParams);
    ({ items } = await listPublicReviews(filters, { page: 1, limit: 50 }));
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    queryError = error.message;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">후기 모아보기</h1>
        <p className="text-sm text-slate-600">같은 대상에 쌓인 경험을 유형·경험 연도로 찾아볼 수 있습니다.</p>
      </section>

      <form className="flex flex-wrap items-end gap-2" role="search">
        <label className="text-sm">
          대상
          <select name="subjectId" defaultValue={rawParams.get('subjectId') ?? ''} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">전체</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          유형
          <select name="reviewType" defaultValue={rawParams.get('reviewType') ?? ''} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">전체</option>
            {reviewTypes.map((type) => (
              <option key={type} value={type}>
                {reviewTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          경험 연도
          <input name="experienceYear" defaultValue={rawParams.get('experienceYear') ?? ''} placeholder="예: 2025" className="mt-1 block w-28 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="demo" value="true" defaultChecked={demo} />
          예시 보기
        </label>
        <button type="submit" className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
          검색
        </button>
      </form>

      {queryError ? (
        <p className="text-sm text-red-600">{queryError}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">조건에 맞는 후기가 없습니다.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">후기 작성</h2>
        {user ? (
          <ReviewForm subjects={subjects} mode="create" />
        ) : (
          <p className="text-sm text-slate-600">
            후기를 작성하려면{' '}
            <a href="/login" className="underline">
              로그인
            </a>
            이 필요합니다.
          </p>
        )}
      </section>
    </div>
  );
}
