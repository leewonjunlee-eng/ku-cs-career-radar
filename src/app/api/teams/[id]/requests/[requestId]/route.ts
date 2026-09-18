import { assertSameOrigin, jsonError, jsonNoStore, readJsonBody } from '@/lib/http/security';
import { requireUser } from '@/lib/auth/require-user';
import { cancelJoinRequest, decideJoinRequest } from '@/lib/teams/mutations';
import { validateRequestAction } from '@/lib/validation/team';
import { requireUuid } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';
export async function PATCH(request: Request, context: RouteContext<'/api/teams/[id]/requests/[requestId]'>) {
  try { assertSameOrigin(request); const user = await requireUser(); const { id, requestId } = await context.params; await decideJoinRequest(user.id, requireUuid(id, 'id'), requireUuid(requestId, 'requestId'), validateRequestAction(await readJsonBody(request))); return jsonNoStore({ ok: true }); }
  catch (error) { return jsonError(error, 'Unable to update team request.'); }
}
export async function DELETE(request: Request, context: RouteContext<'/api/teams/[id]/requests/[requestId]'>) {
  try { assertSameOrigin(request); const user = await requireUser(); const { id, requestId } = await context.params; await cancelJoinRequest(user.id, requireUuid(id, 'id'), requireUuid(requestId, 'requestId')); return jsonNoStore({ ok: true }); }
  catch (error) { return jsonError(error, 'Unable to cancel team request.'); }
}
