import 'server-only';

const missing = (name: string) => new Error(`Supabase 환경변수 ${name}이(가) 설정되지 않았습니다.`);

/** 서버 번들에서만 import해야 하는 service-role/secret 키. */
export function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) throw missing('SUPABASE_SERVICE_ROLE_KEY');
  return key;
}
