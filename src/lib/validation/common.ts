const blankPattern = /^[\s​﻿　]*$/u;

export class ValidationError extends Error {
  readonly status = 400;
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * PostgreSQL text/jsonb cannot represent NUL, and malformed UTF-16 can fail
 * later in the JSON/PostgREST boundary. Keep ordinary line breaks and tabs
 * (which are useful in review prose), but reject the remaining controls.
 */
function hasInvalidTextCodePoint(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0 || (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || (code >= 0x7f && code <= 0x9f)) return true;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

export function isNonEmptyText(value: unknown, maxLength?: number): value is string {
  return typeof value === 'string'
    && !hasInvalidTextCodePoint(value)
    && !blankPattern.test(value)
    && (maxLength === undefined || Array.from(value).length <= maxLength);
}

export function requireText(value: unknown, field = '값', maxLength?: number) {
  if (!isNonEmptyText(value, maxLength)) throw new ValidationError(`${field}은(는) 비어 있지 않은 문자열이어야 합니다.`, field);
  return value.trim();
}

export const validateRequiredText = requireText;

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || hasInvalidTextCodePoint(value) || blankPattern.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname) && !/[\s]/u.test(value);
  } catch {
    return false;
  }
}

export function requireHttpUrl(value: unknown, field = 'URL') {
  if (!isHttpUrl(value)) throw new ValidationError(`${field}은(는) http 또는 https URL이어야 합니다.`, field);
  return value;
}

export const validateHttpUrl = requireHttpUrl;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

export function requireUuid(value: unknown, field = 'ID') {
  if (!isUuid(value)) throw new ValidationError(`${field}은(는) 올바른 UUID여야 합니다.`, field);
  return value;
}

export function requireTextArray(value: unknown, field = '목록', maxItems = 20, maxItemLength = 30) {
  if (!Array.isArray(value) || value.length > maxItems) throw new ValidationError(`${field}의 개수가 올바르지 않습니다.`, field);
  return value.map((item, index) => requireText(item, `${field}[${index}]`, maxItemLength));
}

export function requireJsonObject(value: unknown, field = 'details'): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(`${field}은(는) JSON 객체여야 합니다.`, field);
  return value as Record<string, unknown>;
}
