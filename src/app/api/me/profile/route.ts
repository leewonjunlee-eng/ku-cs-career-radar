import { requireUser } from '@/lib/auth/require-user';
import { assertSameOrigin, jsonError, jsonNoStore, readJsonBody } from '@/lib/http/security';
import { getProfile, updateProfile } from '@/lib/me/data';
import { requireText, ValidationError } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { const user = await requireUser(); return jsonNoStore(await getProfile(user.id)); }
  catch (error) { return jsonError(error, '프로필을 불러올 수 없습니다.'); }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request); const user = await requireUser(); const body = await readJsonBody(request);
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('요청 본문은 JSON 객체여야 합니다.');
    return jsonNoStore(await updateProfile(user.id, requireText((body as Record<string, unknown>).display_name, 'display_name', 50)));
  } catch (error) { return jsonError(error, '프로필을 저장할 수 없습니다.'); }
}
