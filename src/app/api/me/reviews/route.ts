import { requireUser } from '@/lib/auth/require-user';
import { jsonError, jsonNoStore } from '@/lib/http/security';
import { listMyReviews } from '@/lib/reviews/mutations';

export const dynamic = 'force-dynamic';

/** 본인이 쓴 후기 전체(익명 포함)를 반환한다. 개인 응답이므로 공용 캐시를 금지한다. */
export async function GET() {
  try {
    const user = await requireUser();
    const reviews = await listMyReviews(user.id);
    return jsonNoStore({ items: reviews });
  } catch (error) {
    return jsonError(error, '내 후기를 불러올 수 없습니다.');
  }
}
