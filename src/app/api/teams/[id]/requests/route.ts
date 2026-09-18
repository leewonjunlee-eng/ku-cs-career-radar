import { assertSameOrigin, jsonError, jsonNoStore, readJsonBody } from '@/lib/http/security';
import { requireUser } from '@/lib/auth/require-user';
import { listManagedRequests } from '@/lib/teams/data';
import { createJoinRequest } from '@/lib/teams/mutations';
import { validateTeamRequest } from '@/lib/validation/team';
import { requireUuid } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: RouteContext<'/api/teams/[id]/requests'>) {
  try { const user = await requireUser(); const { id } = await context.params; return jsonNoStore({ items: await listManagedRequests(user.id, requireUuid(id, 'id')) }); }
  catch (error) { return jsonError(error, '참여 신청 목록을 불러올 수 없습니다.'); }
}
export async function POST(request: Request, context: RouteContext<'/api/teams/[id]/requests'>) {
  try { assertSameOrigin(request); const user = await requireUser(); const { id } = await context.params; const requestId = await createJoinRequest(user.id, requireUuid(id, 'id'), validateTeamRequest(await readJsonBody(request)).message); return jsonNoStore({ id: requestId }, { status: 201 }); }
  catch (error) { return jsonError(error, '참여 신청을 보낼 수 없습니다.'); }
}
