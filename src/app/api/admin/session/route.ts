import { requireUser } from '@/lib/auth/require-user';
import { isOperator } from '@/lib/admin/access';
import { jsonError, jsonNoStore } from '@/lib/http/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    return jsonNoStore({ operator: await isOperator(user.id) });
  } catch (error) {
    return jsonError(error, '운영자 권한을 확인하지 못했습니다.');
  }
}
