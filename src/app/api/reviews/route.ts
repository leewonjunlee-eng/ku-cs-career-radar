import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { assertSameOrigin, jsonError, jsonNoStore, readJsonBody } from '@/lib/http/security';
import { listPublicReviews } from '@/lib/reviews/public-data';
import { createReview } from '@/lib/reviews/mutations';
import { parseReviewPagination, parseReviewQuery } from '@/lib/reviews/query';
import { validateReviewCreate } from '@/lib/validation/review';

export const dynamic = 'force-dynamic';

const publicCacheHeaders = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
} as const;

/** 공개 후기 목록. 비로그인 조회 가능. 예시 후기는 demo=true일 때만, 그 외에는 항상 제외한다. */
export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const filters = parseReviewQuery(searchParams);
    const pagination = parseReviewPagination(searchParams);
    const result = await listPublicReviews(filters, pagination);
    return NextResponse.json(result, { headers: publicCacheHeaders });
  } catch (error) {
    return jsonError(error, 'Unable to load reviews');
  }
}

/** 로그인 사용자만 후기를 작성할 수 있다. author_id/is_demo는 항상 서버가 정한다. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = validateReviewCreate(await readJsonBody(request));
    const review = await createReview(user.id, input);
    return jsonNoStore(review, { status: 201 });
  } catch (error) {
    return jsonError(error, '후기를 작성할 수 없습니다.');
  }
}
