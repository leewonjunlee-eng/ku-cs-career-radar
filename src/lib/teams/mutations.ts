import 'server-only';

import { HttpError } from '@/lib/http/security';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TeamCreateInput } from '@/lib/validation/team';

// DB 함수(0005_team_functions.sql)의 영어 예외 메시지를 화면용 한국어로 바꾼다.
const databaseMessages: Record<string, string> = {
  'Opportunity not found': '공고를 찾을 수 없습니다.',
  'Teams are only available for contests and hackathons': '팀원 모집은 공모전·해커톤 공고에서만 할 수 있습니다.',
  'Opportunity deadline has passed': '마감된 공고입니다.',
  'Invalid team name': '팀 이름을 확인해 주세요.',
  'Invalid team introduction': '팀 소개를 확인해 주세요.',
  'Invalid maximum member count': '최대 인원은 2~10명이어야 합니다.',
  'Invalid roles or skills': '모집 역할·기술 스택을 확인해 주세요.',
  'Invalid contact link': '팀 연락 링크를 확인해 주세요.',
  'Invalid request message': '메시지를 확인해 주세요.',
  'Team not found': '팀을 찾을 수 없습니다.',
  'Team is not accepting requests': '모집이 마감된 팀입니다.',
  'Team is full': '정원이 가득 찬 팀입니다.',
  'Team members cannot request to join': '이미 이 팀의 팀원입니다.',
  'Request not found for team': '참여 신청을 찾을 수 없습니다.',
  'Only the team owner can accept requests': '팀장만 신청을 수락할 수 있습니다.',
  'Only the team owner can reject requests': '팀장만 신청을 거절할 수 있습니다.',
  'Request is no longer pending': '이미 처리된 신청입니다.',
  'Requester is already a member': '이미 팀원인 사용자입니다.',
  'A valid actor is required': '로그인이 필요합니다.',
};
function koreanDatabaseMessage(message: string | undefined) {
  if (!message) return undefined;
  if (databaseMessages[message]) return databaseMessages[message];
  // 중복 신청 등 unique 위반은 DB 기본 영어 메시지로 온다.
  if (/duplicate key|already exists/i.test(message)) return '이미 신청했거나 처리된 요청입니다. 같은 팀에는 다시 신청할 수 없습니다.';
  return undefined;
}

function mapDatabaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '42501') throw new HttpError(403, 'FORBIDDEN', koreanDatabaseMessage(error.message) ?? '이 팀 작업을 할 권한이 없습니다.');
  if (error.code === '22023' || error.code === '23505' || error.code === '23514') throw new HttpError(409, 'TEAM_STATE_CONFLICT', koreanDatabaseMessage(error.message) ?? '팀 상태가 바뀌었습니다. 새로고침 후 다시 시도해 주세요.');
  throw error;
}

export async function createTeam(userId: string, input: TeamCreateInput) {
  const { data, error } = await createAdminClient().rpc('create_team', { p_actor_id: userId, p_opportunity_id: input.opportunityId, p_name: input.name, p_introduction: (input.introduction ?? null) as string, p_max_members: input.maxMembers, p_roles: input.roles, p_skills: input.skills, p_contact_link: (input.contactLink ?? null) as string });
  mapDatabaseError(error);
  if (!data) throw new HttpError(500, 'INTERNAL_ERROR', '팀을 만들 수 없습니다.');
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
    if (!data) throw new HttpError(404, 'NOT_FOUND', '팀을 찾을 수 없습니다.');
  } else {
    const { data, error } = await admin.from('teams').select('id').eq('id', teamId).eq('owner_id', userId).maybeSingle();
    if (error) throw error; if (!data) throw new HttpError(404, 'NOT_FOUND', '팀을 찾을 수 없습니다.');
  }
  if (patch.contactLink !== undefined) {
    const { error } = await admin.from('team_contacts').update({ contact_link: patch.contactLink }).eq('team_id', teamId);
    if (error) throw error;
  }
}
