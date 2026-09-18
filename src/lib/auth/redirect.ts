import { getAppOrigin } from '@/lib/supabase/public-config';

/**
 * Supabase가 허용 목록과 대조할 앱 origin. 확인 메일 template이 이 값 뒤에
 * 고정된 /auth/confirm TokenHash callback을 붙인다.
 */
export function getAuthEmailRedirectOrigin() {
  return getAppOrigin();
}
