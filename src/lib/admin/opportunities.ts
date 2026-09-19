import 'server-only';

import { HttpError } from '@/lib/http/security';
import { createAdminClient } from '@/lib/supabase/admin';

export type ReviewQueueOpportunity = {
  id: string;
  title: string;
  organization: string;
  category: string;
  tags: string[];
  deadline: string | null;
  deadlineType: string;
  sourceName: string;
  sourceUrl: string;
  description: string | null;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  reviewedAt: string | null;
};

const selectFields = 'id,title,organization,category,tags,deadline,deadline_type,source_name,source_url,description,review_status,review_note,reviewed_at';

function mapRow(row: Record<string, unknown>): ReviewQueueOpportunity {
  return {
    id: row.id as string,
    title: row.title as string,
    organization: row.organization as string,
    category: row.category as string,
    tags: (row.tags as string[]) ?? [],
    deadline: row.deadline as string | null,
    deadlineType: row.deadline_type as string,
    sourceName: row.source_name as string,
    sourceUrl: row.source_url as string,
    description: row.description as string | null,
    reviewStatus: row.review_status as ReviewQueueOpportunity['reviewStatus'],
    reviewNote: row.review_note as string | null,
    reviewedAt: row.reviewed_at as string | null,
  };
}

export async function listReviewQueue() {
  const { data, error } = await createAdminClient()
    .from('opportunities')
    .select(selectFields)
    .in('review_status', ['pending', 'rejected'])
    .order('review_status', { ascending: true })
    .order('deadline', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function decideOpportunity(
  operatorId: string,
  opportunityId: string,
  decision: 'approved' | 'rejected',
  note: string | null,
) {
  const { data, error } = await createAdminClient()
    .from('opportunities')
    .update({ review_status: decision, reviewed_by: operatorId, reviewed_at: new Date().toISOString(), review_note: note })
    .eq('id', opportunityId)
    .in('review_status', ['pending', 'rejected'])
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'NOT_FOUND', '검수할 공고를 찾을 수 없습니다.');
}
