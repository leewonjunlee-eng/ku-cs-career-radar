import { NextResponse } from 'next/server';

/** 잘못된 JSON 본문을 500이 아닌 400으로 만든다. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'INVALID_JSON', '요청 본문이 올바른 JSON이 아닙니다.');
  }
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function configuredOrigins() {
  const vercelDeploymentUrl = process.env.VERCEL_URL;
  const values = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    vercelDeploymentUrl ? `https://${vercelDeploymentUrl}` : undefined,
    ...(process.env.NEXT_PUBLIC_ALLOWED_ORIGINS ?? '').split(','),
  ];
  return values.map((value) => {
    if (!value?.trim()) return null;
    try {
      return new URL(value.trim()).origin;
    } catch {
      return null;
    }
  }).filter((value): value is string => Boolean(value));
}

/** 쿠키 인증을 사용하는 변경 요청의 Origin을 동일 출처로 제한한다. */
export function isSameOrigin(request: Request, allowedOrigins: readonly string[] = []) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let requestOrigin: string;
  let suppliedOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
    suppliedOrigin = new URL(origin).origin;
  } catch {
    return false;
  }
  const configured = new Set([...configuredOrigins(), ...allowedOrigins]);
  // Host 헤더가 조작된 요청 URL인데 Origin만 신뢰된 값인 경우를 허용하지
  // 않는다. 요청 URL 자체와 Origin이 같은, 설정된 앱 origin이어야 한다.
  if (configured.size === 0 || !configured.has(requestOrigin)) return false;
  return suppliedOrigin === requestOrigin;
}

export function assertSameOrigin(request: Request, allowedOrigins?: readonly string[]) {
  if (!isSameOrigin(request, allowedOrigins)) {
    throw new HttpError(403, 'ORIGIN_MISMATCH', '허용되지 않은 출처의 요청입니다.');
  }
}

/** 개인 응답/인증 응답이 CDN이나 브라우저 캐시에 남지 않도록 한다. */
export function noStoreHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Pragma', 'no-cache');
  headers.set('Vary', 'Cookie');
  return headers;
}

/** NextResponse/Response에도 동일한 개인 캐시 금지 정책을 적용한다. */
export function applyNoStoreHeaders<T extends Response>(response: T): T {
  for (const [name, value] of noStoreHeaders()) response.headers.set(name, value);
  return response;
}

export const privateNoStoreHeaders = noStoreHeaders;

export function jsonError(error: unknown, fallback = '요청을 처리할 수 없습니다.') {
  const value = error as Partial<HttpError>;
  const status = typeof value.status === 'number' ? value.status : 500;
  // Never forward driver/PostgREST codes in a 5xx response. They are neither a
  // stable client contract nor safe diagnostic output.
  const code = status >= 500 ? 'INTERNAL_ERROR' : typeof value.code === 'string' ? value.code : 'BAD_REQUEST';
  const message = status >= 500 ? fallback : error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: { code, message } }, { status, headers: noStoreHeaders() });
}

export function jsonNoStore<T>(body: T, init: ResponseInit = {}) {
  return NextResponse.json(body, { ...init, headers: noStoreHeaders(init.headers) });
}
