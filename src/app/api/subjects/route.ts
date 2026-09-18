import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/http/security';
import { listPublicSubjects } from '@/lib/subjects/public-data';

export const dynamic = 'force-dynamic';

const publicCacheHeaders = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
} as const;

/** 후기 작성 폼의 대상 선택 목록. 비로그인 조회 가능. */
export async function GET() {
  try {
    const subjects = await listPublicSubjects();
    return NextResponse.json({ items: subjects }, { headers: publicCacheHeaders });
  } catch (error) {
    return jsonError(error, '후기 대상 목록을 불러올 수 없습니다.');
  }
}
