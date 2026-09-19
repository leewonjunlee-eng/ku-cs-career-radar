import { decideOpportunity } from '@/lib/admin/opportunities';
import { requireOperator } from '@/lib/admin/access';
import { assertSameOrigin, HttpError, jsonError, jsonNoStore, readJsonBody } from '@/lib/http/security';
import { isNonEmptyText, requireUuid } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/opportunities/[id]'>) {
  try {
    assertSameOrigin(request);
    const operator = await requireOperator();
    const body = await readJsonBody(request);
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'VALIDATION_ERROR', '요청 본문은 JSON 객체여야 합니다.');
    const { decision, note } = body as Record<string, unknown>;
    if (decision !== 'approved' && decision !== 'rejected') throw new HttpError(400, 'VALIDATION_ERROR', '검수 결과가 올바르지 않습니다.');
    if (note !== undefined && note !== '' && !isNonEmptyText(note, 500)) throw new HttpError(400, 'VALIDATION_ERROR', '검수 메모를 확인해 주세요.');
    const { id } = await context.params;
    await decideOpportunity(operator.id, requireUuid(id, 'id'), decision, typeof note === 'string' && note.trim() ? note.trim() : null);
    return jsonNoStore({ reviewStatus: decision });
  } catch (error) {
    return jsonError(error, '검수 결과를 저장하지 못했습니다.');
  }
}
