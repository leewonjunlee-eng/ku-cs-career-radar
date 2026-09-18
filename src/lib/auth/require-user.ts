import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { createServerClient } from '@/lib/supabase/server';

export class UnauthenticatedError extends Error {
  readonly status = 401;
  readonly code = 'UNAUTHENTICATED';

  constructor(message = '로그인이 필요합니다.') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

/** getSession()이 아닌 서버 검증 getUser()로 현재 사용자를 확인한다. */
export async function requireUser(client?: SupabaseClient<Database>): Promise<User> {
  const supabase = client ?? (await createServerClient());
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new UnauthenticatedError();
  return data.user;
}

export const requireAuthenticatedUser = requireUser;
