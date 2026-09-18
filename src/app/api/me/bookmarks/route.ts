import { requireUser } from '@/lib/auth/require-user';
import { jsonError, jsonNoStore } from '@/lib/http/security';
import { listMyBookmarks } from '@/lib/me/data';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { const user = await requireUser(); return jsonNoStore({ items: await listMyBookmarks(user.id) }); }
  catch (error) { return jsonError(error, '스크랩 목록을 불러올 수 없습니다.'); }
}
