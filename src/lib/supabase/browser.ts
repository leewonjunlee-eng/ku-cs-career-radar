'use client';

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabasePublicEnv } from './public-config';

/** 브라우저 세션 쿠키를 관리하는 유일한 클라이언트 팩토리. */
export function createBrowserClient(): SupabaseClient<Database> {
  const { url, key } = getSupabasePublicEnv();
  return createSupabaseBrowserClient<Database>(url, key);
}

export const createClient = createBrowserClient;
