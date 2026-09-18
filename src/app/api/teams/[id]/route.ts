import { assertSameOrigin, jsonError, jsonNoStore, readJsonBody } from '@/lib/http/security';
import { requireUser } from '@/lib/auth/require-user';
import { closeTeam, editTeam } from '@/lib/teams/mutations';
import { validateTeamEdit } from '@/lib/validation/team';
import { requireUuid } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';
export async function PATCH(request: Request, context: RouteContext<'/api/teams/[id]'>) {
  try {
    assertSameOrigin(request); const user = await requireUser(); const { id } = await context.params;
    await editTeam(user.id, requireUuid(id, 'id'), validateTeamEdit(await readJsonBody(request)));
    return jsonNoStore({ ok: true });
  } catch (error) { return jsonError(error, 'Unable to update team.'); }
}
export async function DELETE(request: Request, context: RouteContext<'/api/teams/[id]'>) {
  try {
    assertSameOrigin(request); const user = await requireUser(); const { id } = await context.params;
    await closeTeam(user.id, requireUuid(id, 'id')); return jsonNoStore({ ok: true });
  } catch (error) { return jsonError(error, 'Unable to close team.'); }
}
