import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { assertSameOrigin, jsonError, noStoreHeaders } from '@/lib/http/security';

/** 쿠키 기반 로그아웃은 교차 출처 POST를 거부하고 Supabase 세션 쿠키를 폐기한다. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) return jsonError(error, '로그아웃할 수 없습니다.');
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
  } catch (error) {
    return jsonError(error);
  }
}
