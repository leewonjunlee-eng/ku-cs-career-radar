import 'server-only';

import { HttpError } from '@/lib/http/security';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Tables } from '@/types/database';
import { classifyDeadline, isDeadlineThisWeek, sortByDeadline, type DeadlineClassification } from './deadline';
import {
  escapeIlikePattern,
  quotePostgrestValue,
  type OpportunityPagination,
  type OpportunityQuery,
} from './query';

type OpportunityRow = Tables<'opportunities'>;

type PublicOpportunityFields = {
  id: string;
  subjectId: string;
  title: string;
  organization: string;
  category: OpportunityRow['category'];
  tags: string[];
  deadline: DeadlineClassification;
  sourceName: string;
  sourceUrl: string;
  /** 원문이 고려대 웹사이트(korea.ac.kr 하위 도메인)에 있는지. DB가 source_url에서 계산한다. */
  isKoreaUniversitySource: boolean;
};

export type PublicOpportunityListItem = PublicOpportunityFields;

export type PublicOpportunityDetail = PublicOpportunityFields & {
  description: string | null;
  lastCheckedAt: string;
};

type PublicOpportunityList = {
  items: PublicOpportunityListItem[];
  page: number;
  limit: number;
  total: number;
};

const publicSelect =
  'id,subject_id,title,organization,category,tags,deadline,deadline_type,deadline_precision,source_name,source_url,is_korea_university_source,description,last_checked_at';

function mapPublicOpportunity(row: OpportunityRow, now: Date): PublicOpportunityFields {
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    organization: row.organization,
    category: row.category,
    tags: row.tags,
    deadline: classifyDeadline(row, now),
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    isKoreaUniversitySource: row.is_korea_university_source,
  };
}

/**
 * Reads only the explicitly public opportunity fields. This is deliberately
 * server-only because the underlying tables are accessible through service role.
 */
export async function listPublicOpportunities(
  filters: OpportunityQuery,
  pagination: OpportunityPagination,
  now = new Date(),
): Promise<PublicOpportunityList> {
  const start = (pagination.page - 1) * pagination.limit;
  const end = start + pagination.limit - 1;
  const admin = createAdminClient();
  let query = admin
    .from('opportunities')
    .select(publicSelect, { count: 'exact' })
    // SQL sorting performs pagination before mapping. Fixed upcoming deadlines
    // precede rolling/TBD; id keeps ties stable.
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
    .range(start, end);

  if (!filters.includeExpired) {
    // Fixed deadlines are open only before their timestamp. Rolling and TBD
    // notices intentionally remain visible because neither implies a deadline.
    query = query.or(`deadline_type.in.(rolling,tbd),deadline.gt.${now.toISOString()}`);
  }
  if (filters.keyword) {
    // escapeIlikePattern neutralizes '%'/'_'/'\\'; quoting separately
    // protects the or() logic tree from ','/')' in user input. Neither can
    // stop PostgREST's '*'->'%' ilike shorthand (see escapeIlikePattern).
    const pattern = quotePostgrestValue(`%${escapeIlikePattern(filters.keyword)}%`);
    query = query.or(`title.ilike.${pattern},organization.ilike.${pattern},description.ilike.${pattern}`);
  }
  if (filters.categories.length > 0) query = query.in('category', filters.categories);
  if (filters.deadline === 'fixed') query = query.eq('deadline_type', 'fixed');
  if (filters.deadline === 'rolling') query = query.eq('deadline_type', 'rolling');
  if (filters.deadline === 'tbd') query = query.eq('deadline_type', 'tbd');
  if (filters.tags.length > 0) query = query.contains('tags', filters.tags);

  const { data, error, count } = await query;
  if (error) throw error;

  // PostgREST can only order by real columns, so the SQL order above merely
  // windows a close-enough candidate set. `deadline asc` alone would put
  // expired rows (the earliest timestamps) first once includeExpired=true;
  // re-sort with the documented rule (open fixed first, then rolling/tbd)
  // before mapping. This is exact within a page; a row that should move
  // across a page boundary under includeExpired=true is a known gap.
  let rows = sortByDeadline((data ?? []) as OpportunityRow[], now);
  if (filters.deadline === 'this-week') rows = rows.filter((row) => isDeadlineThisWeek(row, now));
  return {
    items: rows.map((row) => mapPublicOpportunity(row, now)),
    page: pagination.page,
    limit: pagination.limit,
    total: count ?? 0,
  };
}

/**
 * Fixed-deadline opportunities due this KST week (Mon 00:00 through next Mon).
 * Fetches a bounded window of the nearest upcoming fixed deadlines and filters
 * in application code rather than translating the KST week boundary into SQL.
 */
export async function listThisWeekOpportunities(now = new Date()): Promise<PublicOpportunityListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('opportunities')
    .select(publicSelect)
    .eq('deadline_type', 'fixed')
    .gt('deadline', now.toISOString())
    .order('deadline', { ascending: true })
    .limit(50);

  if (error) throw error;
  const rows = (data ?? []) as OpportunityRow[];
  return rows.filter((row) => isDeadlineThisWeek(row, now)).map((row) => mapPublicOpportunity(row, now));
}

export async function getPublicOpportunity(id: string, now = new Date()): Promise<PublicOpportunityDetail> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('opportunities')
    .select(publicSelect)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new HttpError(404, 'NOT_FOUND', 'Opportunity not found');

  const row = data as OpportunityRow;
  return {
    ...mapPublicOpportunity(row, now),
    description: row.description,
    lastCheckedAt: row.last_checked_at,
  };
}
