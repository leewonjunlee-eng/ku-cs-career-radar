import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KoreaUniversityBadge } from '@/components/opportunity-card';
import { ReviewCard } from '@/components/reviews/review-card';
import { ReviewForm } from '@/components/reviews/review-form';
import { BookmarkButton } from '@/components/bookmark-button';
import { TeamSection } from '@/components/teams/team-section';
import { formatSeoulDateTime } from '@/lib/opportunities/deadline';
import { HttpError } from '@/lib/http/security';
import { getPublicOpportunity } from '@/lib/opportunities/public-data';
import { opportunityCategoryLabels } from '@/lib/opportunities/query';
import { listPublicReviews } from '@/lib/reviews/public-data';
import { listPublicSubjects } from '@/lib/subjects/public-data';
import { createServerClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validation/common';

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  let opportunity;
  try {
    opportunity = await getPublicOpportunity(id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }

  const demo = (await searchParams).demo === 'true';
  const [{ items: reviews }, subjects, { data: userData }] = await Promise.all([
    // subject_id로 조회하므로 같은 대상의 공고 미연결 과거 후기도 함께 나온다(docs/features/reviews.md §3·§5).
    listPublicReviews({ subjectId: opportunity.subjectId, demo }, { page: 1, limit: 50 }),
    listPublicSubjects(),
    (await createServerClient()).auth.getUser(),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">{opportunity.title}</h1>
        <p className="text-sm text-slate-600">
          {opportunity.organization} · {opportunityCategoryLabels[opportunity.category]}
        </p>
        <p className="text-sm text-slate-700">{opportunity.deadline.label}</p>
        {opportunity.description && <p className="text-sm text-slate-700">{opportunity.description}</p>}
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          {opportunity.isKoreaUniversitySource && <KoreaUniversityBadge />}
          {opportunity.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2 py-1">
              #{tag}
            </span>
          ))}
        </div>
        <a
          href={opportunity.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-sky-700 underline"
        >
          원문 보기 ({opportunity.sourceName})
        </a>
        <p className="text-xs text-slate-400">마지막 확인: {formatSeoulDateTime(opportunity.lastCheckedAt)} (KST)</p>
        <BookmarkButton opportunityId={id} signedIn={Boolean(userData.user)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">관련 후기</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/opportunities/${id}${demo ? '' : '?demo=true'}`} className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100">
            {demo ? '실제 후기 보기' : '예시 보기'}
          </Link>
        </div>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500">{demo ? '예시 후기가 없습니다.' : '아직 등록된 후기가 없습니다.'}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}

        <h3 className="text-base font-semibold">후기 작성</h3>
        {userData.user ? (
          <ReviewForm subjects={subjects} mode="create" defaultSubjectId={opportunity.subjectId} defaultOpportunityId={id} />
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">팀원 모집</h2>
        <TeamSection opportunityId={id} signedIn={Boolean(userData.user)} canRecruit={opportunity.category === 'contest' || opportunity.category === 'hackathon'} />
      </section>

      <Link href="/" className="inline-block text-sm text-slate-600 underline">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
