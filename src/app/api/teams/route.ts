import { assertSameOrigin, jsonError, jsonNoStore, readJsonBody } from '@/lib/http/security';
import { requireUser } from '@/lib/auth/require-user';
import { createTeam } from '@/lib/teams/mutations';
import { validateTeamCreate } from '@/lib/validation/team';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const id = await createTeam(user.id, validateTeamCreate(await readJsonBody(request)));
    return jsonNoStore({ id }, { status: 201 });
  } catch (error) { return jsonError(error, '팀을 만들 수 없습니다.'); }
}
