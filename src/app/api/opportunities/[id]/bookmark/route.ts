import { requireUser } from '@/lib/auth/require-user';
import { assertSameOrigin, jsonError, jsonNoStore } from '@/lib/http/security';
import { isBookmarked, setBookmark } from '@/lib/me/data';
import { requireUuid } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: RouteContext<'/api/opportunities/[id]/bookmark'>) {
  try { const user = await requireUser(); const { id } = await context.params; return jsonNoStore({ bookmarked: await isBookmarked(user.id, requireUuid(id, 'id')) }); }
  catch (error) { return jsonError(error, '스크랩 상태를 불러올 수 없습니다.'); }
}
export async function POST(request: Request, context: RouteContext<'/api/opportunities/[id]/bookmark'>) {
  try { assertSameOrigin(request); const user = await requireUser(); const { id } = await context.params; await setBookmark(user.id, requireUuid(id, 'id'), true); return jsonNoStore({ bookmarked: true }); }
  catch (error) { return jsonError(error, '스크랩할 수 없습니다.'); }
}
export async function DELETE(request: Request, context: RouteContext<'/api/opportunities/[id]/bookmark'>) {
  try { assertSameOrigin(request); const user = await requireUser(); const { id } = await context.params; await setBookmark(user.id, requireUuid(id, 'id'), false); return jsonNoStore({ bookmarked: false }); }
  catch (error) { return jsonError(error, '스크랩을 취소할 수 없습니다.'); }
}
