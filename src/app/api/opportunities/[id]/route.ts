import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/http/security';
import { getPublicOpportunity } from '@/lib/opportunities/public-data';
import { requireUuid } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';

const publicCacheHeaders = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
} as const;

/** Public, non-personal opportunity detail. It intentionally does not read cookies. */
export async function GET(_request: Request, context: RouteContext<'/api/opportunities/[id]'>) {
  try {
    const { id } = await context.params;
    const opportunity = await getPublicOpportunity(requireUuid(id, 'id'));
    return NextResponse.json(opportunity, { headers: publicCacheHeaders });
  } catch (error) {
    return jsonError(error, '공고를 불러올 수 없습니다.');
  }
}
