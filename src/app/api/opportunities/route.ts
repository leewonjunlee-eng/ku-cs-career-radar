import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/http/security';
import { listPublicOpportunities } from '@/lib/opportunities/public-data';
import { parseOpportunityPagination, parseOpportunityQuery } from '@/lib/opportunities/query';

export const dynamic = 'force-dynamic';

const publicCacheHeaders = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
} as const;

/** Public, non-personal opportunity search. It intentionally does not read cookies. */
export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const filters = parseOpportunityQuery(searchParams);
    const pagination = parseOpportunityPagination(searchParams);
    const result = await listPublicOpportunities(filters, pagination);
    return NextResponse.json(result, { headers: publicCacheHeaders });
  } catch (error) {
    return jsonError(error, '공고 목록을 불러올 수 없습니다.');
  }
}
