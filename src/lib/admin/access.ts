import 'server-only';

import { requireUser } from '@/lib/auth/require-user';
import { HttpError } from '@/lib/http/security';
import { createAdminClient } from '@/lib/supabase/admin';

export async function requireOperator() {
  const user = await requireUser();
  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (data?.role !== 'operator') {
    throw new HttpError(403, 'FORBIDDEN', '운영자 권한이 필요합니다.');
  }
  return user;
}

export async function isOperator(userId: string) {
  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role === 'operator';
}
