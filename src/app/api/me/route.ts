import { requireUser } from '@/lib/auth/require-user';
import { jsonError, jsonNoStore } from '@/lib/http/security';
import { getMyActivity } from '@/lib/me/data';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { const user = await requireUser(); return jsonNoStore(await getMyActivity(user.id)); }
  catch (error) { return jsonError(error, 'Unable to load activity.'); }
}
