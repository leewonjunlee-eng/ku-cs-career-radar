import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Tables } from '@/types/database';
import type { ReviewPagination, ReviewQuery } from './query';

// 생성된 타입은 뷰 컬럼을 전부 nullable로 표시하지만, reviews 테이블의 NOT NULL 제약과
// public_reviews의 join 방식(항상 profiles 매칭) 때문에 실제로는 아래 컬럼들이 null일 수 없다.
type PublicReviewRow = Tables<'public_reviews'>;
type NonNullableFields = Omit<PublicReviewRow, 'opportunity_id' | 'period' | 'role' | 'result' | 'preparation' | 'pros' | 'challenges' | 'tips'>;
type StrictPublicReviewRow = { [K in keyof NonNullableFields]: NonNullable<NonNullableFields[K]> } & Pick<
  PublicReviewRow,
  'opportunity_id' | 'period' | 'role' | 'result' | 'preparation' | 'pros' | 'challenges' | 'tips'
>;

export type PublicReview = {
  id: string;
  subjectId: string;
  opportunityId: string | null;
  reviewType: NonNullable<PublicReviewRow['review_type']>;
  title: string;
  body: string;
  experienceYear: number;
  period: string | null;
  role: string | null;
  result: string | null;
  preparation: string | null;
  pros: string | null;
  challenges: string | null;
  tips: string | null;
  skills: string[];
  details: PublicReviewRow['details'];
  isAnonymous: boolean;
  isDemo: boolean;
  createdAt: string;
  authorDisplayName: string;
};

type PublicReviewList = {
  items: PublicReview[];
  page: number;
  limit: number;
  total: number;
};

const publicSelect =
  'id,subject_id,opportunity_id,review_type,title,body,experience_year,period,role,result,preparation,pros,challenges,tips,skills,details,is_anonymous,is_demo,created_at,author_display_name';

function mapPublicReview(row: StrictPublicReviewRow): PublicReview {
  return {
    id: row.id,
    subjectId: row.subject_id,
    opportunityId: row.opportunity_id,
    reviewType: row.review_type,
    title: row.title,
    body: row.body,
    experienceYear: row.experience_year,
    period: row.period,
    role: row.role,
    result: row.result,
    preparation: row.preparation,
    pros: row.pros,
    challenges: row.challenges,
    tips: row.tips,
    skills: row.skills,
    details: row.details,
    isAnonymous: row.is_anonymous,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    authorDisplayName: row.author_display_name ?? '익명',
  };
}

/**
 * public_reviews 뷰만 읽는다(author_id 없음). demo=false(기본)면 예시 후기를 제외하고,
 * demo=true면 예시 후기만 보여준다(docs/features/reviews.md §3 "예시 보기" 토글).
 */
export async function listPublicReviews(filters: ReviewQuery, pagination: ReviewPagination): Promise<PublicReviewList> {
  const start = (pagination.page - 1) * pagination.limit;
  const end = start + pagination.limit - 1;
  const admin = createAdminClient();
  let query = admin
    .from('public_reviews')
    .select(publicSelect, { count: 'exact' })
    .eq('is_demo', filters.demo)
    .order('experience_year', { ascending: false })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);
  if (filters.opportunityId) query = query.eq('opportunity_id', filters.opportunityId);
  if (filters.reviewType) query = query.eq('review_type', filters.reviewType);
  if (filters.experienceYear) query = query.eq('experience_year', filters.experienceYear);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: ((data ?? []) as StrictPublicReviewRow[]).map(mapPublicReview),
    page: pagination.page,
    limit: pagination.limit,
    total: count ?? 0,
  };
}
