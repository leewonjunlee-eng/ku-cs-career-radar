import { requireUser } from '@/lib/auth/require-user';
import { assertSameOrigin, HttpError, jsonError, jsonNoStore, readJsonBody } from '@/lib/http/security';
import { getPointSummary, purchaseReviewAccess, reviewAccessProducts, type ReviewAccessProduct } from '@/lib/points/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    return jsonNoStore(await getPointSummary(user.id));
  } catch (error) {
    return jsonError(error, '포인트 정보를 불러오지 못했습니다.');
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJsonBody(request);
    const product = body && typeof body === 'object' && !Array.isArray(body) ? (body as { product?: unknown }).product : undefined;
    if (typeof product !== 'string' || !(product in reviewAccessProducts)) throw new HttpError(400, 'INVALID_PRODUCT', '올바른 열람권을 선택해 주세요.');
    return jsonNoStore(await purchaseReviewAccess(user.id, product as ReviewAccessProduct));
  } catch (error) {
    return jsonError(error, '열람권을 구매하지 못했습니다.');
  }
}
