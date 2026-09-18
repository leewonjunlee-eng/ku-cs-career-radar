import { requireUser } from '@/lib/auth/require-user';
import { jsonError, jsonNoStore } from '@/lib/http/security';
import { getTeamContact } from '@/lib/teams/data';
import { requireUuid } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';
/** Contact links are private to accepted members and are never part of the public team list. */
export async function GET(_request: Request, context: RouteContext<'/api/teams/[id]/contact'>) {
  try { const user = await requireUser(); const { id } = await context.params; return jsonNoStore({ contactLink: await getTeamContact(user.id, requireUuid(id, 'id')) }); }
  catch (error) { return jsonError(error, '팀 연락 링크를 불러올 수 없습니다.'); }
}
