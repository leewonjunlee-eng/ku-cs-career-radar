import 'server-only';

import { HttpError } from '@/lib/http/security';
import { createAdminClient } from '@/lib/supabase/admin';

export const reviewAccessProducts = {
  review_access_30: { days: 30, cost: 35, label: '후기 열람권 30일' },
  review_access_90: { days: 90, cost: 55, label: '후기 열람권 90일' },
  review_access_180: { days: 180, cost: 75, label: '후기 열람권 180일' },
} as const;

export type ReviewAccessProduct = keyof typeof reviewAccessProducts;

export type PointSummary = {
  points: number;
  reviewAccessUntil: string | null;
};

export async function getPointSummary(userId: string): Promise<PointSummary> {
  const admin = createAdminClient();
  const [{ data: events, error: eventsError }, { data: profile, error: profileError }] = await Promise.all([
    admin.from('review_point_events').select('amount').eq('user_id', userId),
    admin.from('profiles').select('review_access_until').eq('id', userId).maybeSingle(),
  ]);
  if (eventsError) throw eventsError;
  if (profileError) throw profileError;
  if (!profile) throw new HttpError(404, 'NOT_FOUND', '프로필을 찾을 수 없습니다.');
  return { points: (events ?? []).reduce((total, event) => total + event.amount, 0), reviewAccessUntil: profile.review_access_until };
}

export async function purchaseReviewAccess(userId: string, product: ReviewAccessProduct): Promise<PointSummary> {
  const { data, error } = await createAdminClient().rpc('purchase_review_access', { p_actor_id: userId, p_product: product }).maybeSingle();
  if (error) {
    if (error.code === '22023' && error.message === 'Not enough points') throw new HttpError(409, 'INSUFFICIENT_POINTS', '포인트가 부족합니다. 후기를 작성해 포인트를 모아 보세요.');
    throw error;
  }
  if (!data) throw new HttpError(500, 'INTERNAL_ERROR', '열람권을 구매하지 못했습니다.');
  return { points: data.points, reviewAccessUntil: data.review_access_until };
}
