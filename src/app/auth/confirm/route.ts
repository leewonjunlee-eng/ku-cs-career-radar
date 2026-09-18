import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { noStoreHeaders } from '@/lib/http/security';
import { getAppOrigin } from '@/lib/supabase/public-config';

const allowedTypes = new Set(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']);

export function safeNext(value: string | null, appOrigin: string) {
  const fallback = new URL('/', appOrigin);
  // 확인 링크의 next는 앱 내부의 상대 경로만 허용한다. `//host`와
  // 백슬래시 우회(`\\\\evil`)도 절대 URL로 해석될 수 있으므로 거부한다.
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  try {
    const next = new URL(value, appOrigin);
    return next.origin === appOrigin ? next : fallback;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appOrigin = getAppOrigin();
  const next = safeNext(url.searchParams.get('next'), appOrigin);
  const supabase = await createServerClient();
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  let error: { message?: string } | null = null;

  if (tokenHash && type && allowedTypes.has(type)) {
    const result = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
    error = result.error;
  } else if (url.searchParams.get('code')) {
    const result = await supabase.auth.exchangeCodeForSession(url.searchParams.get('code') as string);
    error = result.error;
  } else {
    error = { message: '확인 링크가 유효하지 않습니다.' };
  }

  if (!error) return NextResponse.redirect(next, { headers: noStoreHeaders() });
  const login = new URL('/login', appOrigin);
  login.searchParams.set('error', 'confirm_failed');
  return NextResponse.redirect(login, { headers: noStoreHeaders() });
}
