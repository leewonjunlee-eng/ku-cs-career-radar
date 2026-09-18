import 'server-only';

import { HttpError } from '@/lib/http/security';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json, Tables } from '@/types/database';
import type { ReviewCreateInput, ReviewUpdateInput } from '@/lib/validation/review';

type ReviewRow = Tables<'reviews'>;

export type MyReview = {
  id: string;
  subjectId: string;
  opportunityId: string | null;
  reviewType: ReviewRow['review_type'];
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
  details: ReviewRow['details'];
  isAnonymous: boolean;
  isDemo: boolean;
  createdAt: string;
};

const FOREIGN_KEY_VIOLATION = '23503';
const USER_INPUT_VIOLATION_CODES = new Set([
  '22021', // character not in repertoire
  '22P02', // invalid text representation
  '22P05', // untranslatable character
  '23514', // CHECK constraint
  'PGRST102', // malformed JSON observed by PostgREST
]);

function mapRow(row: ReviewRow): MyReview {
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
  };
}

/** subject_id/opportunity_id 조합이 잘못됐거나 존재하지 않는 대상이면 23503으로 실패한다. */
function throwIfUserInputViolation(error: { code?: string; message?: string } | null): void {
  if (!error) return;
  if (error.code === FOREIGN_KEY_VIOLATION) {
    throw new HttpError(400, 'INVALID_SUBJECT_OR_OPPORTUNITY', '존재하지 않거나 대상이 일치하지 않는 subject/공고 조합입니다.');
  }
  if (error.code && USER_INPUT_VIOLATION_CODES.has(error.code)) {
    throw new HttpError(400, 'INVALID_REVIEW_INPUT', '후기 입력값이 허용 범위를 벗어났습니다.');
  }
  throw error;
}

function toInsertRow(userId: string, input: ReviewCreateInput) {
  return {
    author_id: userId,
    subject_id: input.subjectId,
    opportunity_id: input.opportunityId,
    review_type: input.reviewType,
    title: input.title,
    body: input.body,
    experience_year: input.experienceYear,
    period: input.period,
    role: input.role,
    result: input.result,
    preparation: input.preparation,
    pros: input.pros,
    challenges: input.challenges,
    tips: input.tips,
    skills: input.skills,
    details: input.details as Json,
    is_anonymous: input.isAnonymous,
    is_demo: false, // 일반 사용자는 항상 false로 고정한다 (docs/architecture.md API 최소 안전 규칙)
  };
}

function toUpdatePatch(input: ReviewUpdateInput) {
  const patch: Record<string, unknown> = {};
  if (input.subjectId !== undefined) patch.subject_id = input.subjectId;
  if (input.opportunityId !== undefined) patch.opportunity_id = input.opportunityId;
  if (input.reviewType !== undefined) patch.review_type = input.reviewType;
  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  if (input.experienceYear !== undefined) patch.experience_year = input.experienceYear;
  if (input.period !== undefined) patch.period = input.period;
  if (input.role !== undefined) patch.role = input.role;
  if (input.result !== undefined) patch.result = input.result;
  if (input.preparation !== undefined) patch.preparation = input.preparation;
  if (input.pros !== undefined) patch.pros = input.pros;
  if (input.challenges !== undefined) patch.challenges = input.challenges;
  if (input.tips !== undefined) patch.tips = input.tips;
  if (input.skills !== undefined) patch.skills = input.skills;
  if (input.details !== undefined) patch.details = input.details;
  if (input.isAnonymous !== undefined) patch.is_anonymous = input.isAnonymous;
  // is_demo는 절대 patch에 포함하지 않는다: 일반 사용자는 변경할 수 없다.
  return patch;
}

export async function createReview(userId: string, input: ReviewCreateInput): Promise<MyReview> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('reviews').insert(toInsertRow(userId, input)).select().maybeSingle();
  throwIfUserInputViolation(error);
  if (error) throw error;
  if (!data) throw new HttpError(500, 'INTERNAL_ERROR', '후기를 저장할 수 없습니다.');
  return mapRow(data as ReviewRow);
}

export async function updateReview(userId: string, reviewId: string, input: ReviewUpdateInput): Promise<MyReview> {
  const admin = createAdminClient();
  const patch = toUpdatePatch(input);
  const { data, error } = await admin
    .from('reviews')
    .update(patch)
    .eq('id', reviewId)
    .eq('author_id', userId)
    .select()
    .maybeSingle();
  throwIfUserInputViolation(error);
  if (error) throw error;
  // 존재하지 않거나(다른 사용자의 후기 포함) 소유자가 아니면 같은 404로 응답해 존재 여부를 흘리지 않는다.
  if (!data) throw new HttpError(404, 'NOT_FOUND', '후기를 찾을 수 없습니다.');
  return mapRow(data as ReviewRow);
}

export async function deleteReview(userId: string, reviewId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('reviews').delete().eq('id', reviewId).eq('author_id', userId).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'NOT_FOUND', '후기를 찾을 수 없습니다.');
}

export async function listMyReviews(userId: string): Promise<MyReview[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('reviews')
    .select()
    .eq('author_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ReviewRow[]).map(mapRow);
}
