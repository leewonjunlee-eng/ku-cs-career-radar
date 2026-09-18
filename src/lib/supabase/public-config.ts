const missing = (name: string) => new Error(`Supabase 환경변수 ${name}이(가) 설정되지 않았습니다.`);

function parseOrigin(value: string, name: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
    return parsed.origin;
  } catch {
    throw new Error(`${name}은(는) 올바른 http(s) URL이어야 합니다.`);
  }
}

/** 브라우저에 노출해도 되는 Supabase URL과 publishable/anon key. */
export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw missing('NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw missing('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  parseOrigin(url, 'NEXT_PUBLIC_SUPABASE_URL');
  return { url, key } as const;
}

/** Auth redirect에 쓰는 허용 origin. request Host나 Origin으로 대체하지 않는다. */
export function getAppOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw missing('NEXT_PUBLIC_SITE_URL');
  return parseOrigin(value, 'NEXT_PUBLIC_SITE_URL');
}

export function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}
