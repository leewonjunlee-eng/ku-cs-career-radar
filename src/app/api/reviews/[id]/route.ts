import { requireUser } from '@/lib/auth/require-user';
import { assertSameOrigin, HttpError, jsonError, jsonNoStore, readJsonBody } from '@/lib/http/security';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteReview, updateReview } from '@/lib/reviews/mutations';
import { requireUuid } from '@/lib/validation/common';
import { validateReviewUpdate } from '@/lib/validation/review';
import type { Tables } from '@/types/database';

export const dynamic = 'force-dynamic';

/** 수정 검증에는 현재 유형과 저장된 details가 함께 필요하다. */
async function currentReview(userId: string, reviewId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('reviews')
    .select('review_type,details')
    .eq('id', reviewId)
    .eq('author_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'NOT_FOUND', '후기를 찾을 수 없습니다.');
  return data as Pick<Tables<'reviews'>, 'review_type' | 'details'>;
}

/** 본인 후기만 수정할 수 있다. */
export async function PATCH(request: Request, context: RouteContext<'/api/reviews/[id]'>) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const reviewId = requireUuid(id, 'id');
    const existingReview = await currentReview(user.id, reviewId);
    const input = validateReviewUpdate(await readJsonBody(request), existingReview.review_type, existingReview.details);
    const review = await updateReview(user.id, reviewId, input);
    return jsonNoStore(review);
  } catch (error) {
    return jsonError(error, '후기를 수정할 수 없습니다.');
  }
}

/** 본인 후기만 삭제할 수 있다. */
export async function DELETE(request: Request, context: RouteContext<'/api/reviews/[id]'>) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    await deleteReview(user.id, requireUuid(id, 'id'));
    return jsonNoStore({ ok: true });
  } catch (error) {
    return jsonError(error, '후기를 삭제할 수 없습니다.');
  }
}
