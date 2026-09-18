import 'server-only';

import { HttpError } from '@/lib/http/security';
import { listMyReviews } from '@/lib/reviews/mutations';
import { listMyTeamRequests, listMyTeams } from '@/lib/teams/data';
import { createAdminClient } from '@/lib/supabase/admin';

export type BookmarkItem = { opportunityId: string; createdAt: string; title: string; organization: string; category: string };

export async function listMyBookmarks(userId: string): Promise<BookmarkItem[]> {
  const { data, error } = await createAdminClient().from('bookmarks').select('opportunity_id,created_at,opportunities!inner(title,organization,category)').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const opportunity = row.opportunities as unknown as { title: string; organization: string; category: string };
    return { opportunityId: row.opportunity_id, createdAt: row.created_at, ...opportunity };
  });
}

export async function isBookmarked(userId: string, opportunityId: string) {
  const { data, error } = await createAdminClient().from('bookmarks').select('id').eq('user_id', userId).eq('opportunity_id', opportunityId).maybeSingle();
  if (error) throw error; return Boolean(data);
}

export async function setBookmark(userId: string, opportunityId: string, bookmarked: boolean) {
  const admin = createAdminClient();
  if (bookmarked) {
    // Existence is checked so a bad UUID cannot silently create a misleading bookmark state.
    const { data: opportunity, error: opportunityError } = await admin.from('opportunities').select('id').eq('id', opportunityId).maybeSingle();
    if (opportunityError) throw opportunityError;
    if (!opportunity) throw new HttpError(404, 'NOT_FOUND', 'Opportunity not found');
    const { error } = await admin.from('bookmarks').upsert({ user_id: userId, opportunity_id: opportunityId }, { onConflict: 'user_id,opportunity_id', ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await admin.from('bookmarks').delete().eq('user_id', userId).eq('opportunity_id', opportunityId);
    if (error) throw error;
  }
}

export async function getMyActivity(userId: string) {
  const [bookmarks, teams, teamRequests, reviews] = await Promise.all([listMyBookmarks(userId), listMyTeams(userId), listMyTeamRequests(userId), listMyReviews(userId)]);
  return { bookmarks, teams, teamRequests, reviews };
}

export async function getProfile(userId: string) {
  const { data, error } = await createAdminClient().from('profiles').select('display_name').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'NOT_FOUND', 'Profile not found');
  return { displayName: data.display_name };
}

export async function updateProfile(userId: string, displayName: string) {
  const { data, error } = await createAdminClient().from('profiles').update({ display_name: displayName }).eq('id', userId).select('display_name').maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'NOT_FOUND', 'Profile not found');
  return { displayName: data.display_name };
}
