import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabasePublicEnv } from './public-config';
import { getSupabaseServiceRoleKey } from './server-config';

/** 서버 전용 service-role 클라이언트. 사용자 세션 검증을 대신하지 않는다. */
export function createAdminClient(): SupabaseClient<Database> {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export const createClient = createAdminClient;
