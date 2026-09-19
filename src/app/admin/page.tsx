import { ReviewQueue } from '@/components/admin/review-queue';
import { requireOperator } from '@/lib/admin/access';
import { listReviewQueue } from '@/lib/admin/opportunities';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireOperator();
  const items = await listReviewQueue();
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <section className="space-y-2 rounded-xl border border-primary/20 bg-sky-50 p-6">
        <p className="text-sm font-semibold text-primary">운영자 공간</p>
        <h1 className="text-2xl font-bold text-slate-900">공고 검수함</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-700">원문과 마감, 분류를 확인한 뒤 승인하세요. 승인한 공고만 일반 목록과 검색 결과에 표시됩니다.</p>
      </section>
      <ReviewQueue initialItems={items} />
    </div>
  );
}
