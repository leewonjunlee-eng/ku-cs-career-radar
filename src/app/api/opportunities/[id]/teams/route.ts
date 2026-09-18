import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/http/security';
import { listPublicTeams } from '@/lib/teams/data';
import { requireUuid } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';
const cacheHeaders = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } as const;

export async function GET(_request: Request, context: RouteContext<'/api/opportunities/[id]/teams'>) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ items: await listPublicTeams(requireUuid(id, 'id')) }, { headers: cacheHeaders });
  } catch (error) { return jsonError(error, '팀 목록을 불러올 수 없습니다.'); }
}
