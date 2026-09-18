import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Tables } from '@/types/database';

type SubjectRow = Tables<'subjects'>;

export type PublicSubject = {
  id: string;
  kind: SubjectRow['kind'];
  name: string;
  officialUrl: string | null;
};

const publicSelect = 'id,kind,name,official_url';

/**
 * 후기 작성 폼의 대상 선택 목록. subjects는 개발자 seed로만 생성되므로(참고: 사용자 임의 대상
 * 생성은 MVP 범위 밖) 여기서는 조회만 제공한다.
 */
export async function listPublicSubjects(): Promise<PublicSubject[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('subjects').select(publicSelect).order('name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as SubjectRow[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    officialUrl: row.official_url,
  }));
}
