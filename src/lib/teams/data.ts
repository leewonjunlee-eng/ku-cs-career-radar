import 'server-only';

import { HttpError } from '@/lib/http/security';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Tables } from '@/types/database';

type TeamRow = Tables<'teams'>;

export type PublicTeam = {
  id: string; opportunityId: string; name: string; introduction: string | null;
  maxMembers: number; memberCount: number; roles: string[]; skills: string[];
  status: TeamRow['status']; createdAt: string; updatedAt: string;
  isOwner?: boolean;
};
export type MyTeamRequest = { id: string; teamId: string; opportunityId: string; teamName: string; message: string | null; status: Tables<'team_requests'>['status']; createdAt: string };
export type ManagedTeamRequest = { id: string; userId: string; displayName: string; message: string | null; status: Tables<'team_requests'>['status']; createdAt: string };

function publicTeam(row: Record<string, unknown>): PublicTeam {
  return { id: row.id as string, opportunityId: row.opportunity_id as string, name: row.name as string,
    introduction: row.introduction as string | null, maxMembers: row.max_members as number,
    memberCount: Number(row.member_count ?? 0), roles: (row.roles as string[]) ?? [], skills: (row.skills as string[]) ?? [],
    status: row.status as TeamRow['status'], createdAt: row.created_at as string, updatedAt: row.updated_at as string };
}

/** Public list intentionally uses the privacy-safe view: no owner, member or contact data. */
export async function listPublicTeams(opportunityId: string): Promise<PublicTeam[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('public_teams').select('*').eq('opportunity_id', opportunityId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => publicTeam(row as Record<string, unknown>));
}

export async function listMyTeams(userId: string): Promise<PublicTeam[]> {
  const admin = createAdminClient();
  const { data: memberships, error } = await admin.from('team_members').select('team_id,role').eq('user_id', userId);
  if (error) throw error;
  const ids = (memberships ?? []).map((m) => (m.team_id as string) ?? '');
  const nonEmptyIds = ids.filter(Boolean);
  if (nonEmptyIds.length === 0) return [];
  const { data, error: teamsError } = await admin.from('public_teams').select('*').in('id', nonEmptyIds).order('updated_at', { ascending: false });
  if (teamsError) throw teamsError;
  const leaders = new Set((memberships ?? []).filter((membership) => membership.role === 'leader').map((membership) => (membership.team_id as string) ?? ''));
  return (data ?? []).map((row) => ({ ...publicTeam(row as Record<string, unknown>), isOwner: row.id ? leaders.has(row.id as string) : false }));
}

export async function listMyTeamRequests(userId: string): Promise<MyTeamRequest[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('team_requests').select('id,team_id,message,status,created_at,teams!inner(opportunity_id,name)').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const team = row.teams as unknown as { opportunity_id: string; name: string };
    return { id: row.id, teamId: row.team_id, opportunityId: team.opportunity_id, teamName: team.name, message: row.message, status: row.status, createdAt: row.created_at };
  });
}

export async function listManagedRequests(userId: string, teamId: string): Promise<ManagedTeamRequest[]> {
  const admin = createAdminClient();
  const { data: team, error: teamError } = await admin.from('teams').select('owner_id').eq('id', teamId).maybeSingle();
  if (teamError) throw teamError;
  if (!team || team.owner_id !== userId) throw new HttpError(404, 'NOT_FOUND', 'Team not found');
  const { data, error } = await admin.from('team_requests').select('id,user_id,message,status,created_at,profiles!inner(display_name)').eq('team_id', teamId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, userId: row.user_id, displayName: (row.profiles as unknown as { display_name: string }).display_name, message: row.message, status: row.status, createdAt: row.created_at }));
}

export async function getTeamContact(userId: string, teamId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: membership, error } = await admin.from('team_members').select('id').eq('team_id', teamId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!membership) throw new HttpError(404, 'NOT_FOUND', 'Team not found');
  const { data, error: contactError } = await admin.from('team_contacts').select('contact_link').eq('team_id', teamId).maybeSingle();
  if (contactError) throw contactError;
  if (!data) throw new HttpError(404, 'NOT_FOUND', 'Contact not found');
  return data.contact_link;
}
