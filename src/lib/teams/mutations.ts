import 'server-only';

import { HttpError } from '@/lib/http/security';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TeamCreateInput } from '@/lib/validation/team';

function mapDatabaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '42501') throw new HttpError(403, 'FORBIDDEN', 'You are not permitted to perform this team action.');
  if (error.code === '22023' || error.code === '23505' || error.code === '23514') throw new HttpError(409, 'TEAM_STATE_CONFLICT', error.message ?? 'The team state has changed. Refresh and try again.');
  throw error;
}

export async function createTeam(userId: string, input: TeamCreateInput) {
  const { data, error } = await createAdminClient().rpc('create_team', { p_actor_id: userId, p_opportunity_id: input.opportunityId, p_name: input.name, p_introduction: (input.introduction ?? null) as string, p_max_members: input.maxMembers, p_roles: input.roles, p_skills: input.skills, p_contact_link: (input.contactLink ?? null) as string });
  mapDatabaseError(error);
  if (!data) throw new HttpError(500, 'INTERNAL_ERROR', 'Team could not be created.');
  return data;
}
export async function createJoinRequest(userId: string, teamId: string, message: string | null) {
  const { data, error } = await createAdminClient().rpc('create_team_request', { p_actor_id: userId, p_team_id: teamId, p_message: (message ?? null) as unknown as string });
  mapDatabaseError(error); return data;
}
export async function decideJoinRequest(userId: string, teamId: string, requestId: string, action: 'accept' | 'reject') {
  const { error } = await createAdminClient().rpc(action === 'accept' ? 'accept_team_request' : 'reject_team_request', { p_actor_id: userId, p_team_id: teamId, p_request_id: requestId });
  mapDatabaseError(error);
}
export async function cancelJoinRequest(userId: string, teamId: string, requestId: string) {
  const { error } = await createAdminClient().rpc('cancel_team_request', { p_actor_id: userId, p_team_id: teamId, p_request_id: requestId });
  mapDatabaseError(error);
}
export async function closeTeam(userId: string, teamId: string) {
  const { error } = await createAdminClient().rpc('close_team', { p_actor_id: userId, p_team_id: teamId }); mapDatabaseError(error);
}
export async function editTeam(userId: string, teamId: string, patch: { name?: string; introduction?: string | null; roles?: string[]; skills?: string[]; contactLink?: string }) {
  const admin = createAdminClient();
  const teamPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) teamPatch.name = patch.name;
  if (patch.introduction !== undefined) teamPatch.introduction = patch.introduction;
  if (patch.roles !== undefined) teamPatch.roles = patch.roles;
  if (patch.skills !== undefined) teamPatch.skills = patch.skills;
  if (Object.keys(teamPatch).length) {
    const { data, error } = await admin.from('teams').update({ ...teamPatch, updated_at: new Date().toISOString() }).eq('id', teamId).eq('owner_id', userId).select('id').maybeSingle();
    if (error) mapDatabaseError(error);
    if (!data) throw new HttpError(404, 'NOT_FOUND', 'Team not found');
  } else {
    const { data, error } = await admin.from('teams').select('id').eq('id', teamId).eq('owner_id', userId).maybeSingle();
    if (error) throw error; if (!data) throw new HttpError(404, 'NOT_FOUND', 'Team not found');
  }
  if (patch.contactLink !== undefined) {
    const { error } = await admin.from('team_contacts').update({ contact_link: patch.contactLink }).eq('team_id', teamId);
    if (error) throw error;
  }
}
