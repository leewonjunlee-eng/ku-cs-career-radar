import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicEnv } from './public-config';
import { applyNoStoreHeaders } from '@/lib/http/security';

/** Next.js proxy에서 쿠키 세션을 새로 고친다. getUser()가 서버 검증을 수행한다. */
export async function updateSession(request: NextRequest) {
  const { url, key } = getSupabasePublicEnv();
  // Public routes may deliberately set shared-cache headers. Only a response
  // that actually refreshes an auth cookie needs to be private/no-store.
  let response = NextResponse.next({ request });
  const supabase = createSupabaseServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) request.cookies.set(name, value);
        response = applyNoStoreHeaders(NextResponse.next({ request }));
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}
