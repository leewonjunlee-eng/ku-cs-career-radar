import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabasePublicEnv } from '@/lib/supabase/public-config';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  // 첫 골격을 환경변수 없이도 렌더링할 수 있게 한다. 배포/로컬 연결 시에는
  // 매 요청마다 Supabase가 세션 쿠키를 갱신한다.
  return hasSupabasePublicEnv() ? updateSession(request) : NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
