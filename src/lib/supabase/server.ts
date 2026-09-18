import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { getSupabasePublicEnv } from './public-config';

/** Route handler/server component용 세션 클라이언트. service-role 키를 사용하지 않는다. */
export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const { url, key } = getSupabasePublicEnv();
  const cookieStore = await cookies();
  return createSupabaseServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components에서는 쿠키 쓰기가 불가능하다. proxy/route가 갱신을 담당한다.
        }
      },
    },
  });
}

export const createClient = createServerClient;
