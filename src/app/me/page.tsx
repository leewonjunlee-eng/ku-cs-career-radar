import { MyPageTabs } from '@/components/me/my-page-tabs';
import { listPublicSubjects } from '@/lib/subjects/public-data';
import { createServerClient } from '@/lib/supabase/server';

export default async function MyActivityPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const subjects = user ? await listPublicSubjects() : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">마이페이지</h1>
      <p className="text-sm text-slate-600">
        로그인과 이메일 확인은 사용할 수 있습니다. 저장·팀 활동 조회는 다음 기능 단계에서 연결됩니다.
      </p>
      {user ? <MyPageTabs subjects={subjects} /> : <p className="text-sm text-slate-600">마이페이지를 이용하려면 <a href="/login" className="underline">로그인</a>이 필요합니다.</p>}
    </div>
  );
}
