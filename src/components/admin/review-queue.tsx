'use client';

import { useState } from 'react';
import type { ReviewQueueOpportunity } from '@/lib/admin/opportunities';

function deadlineText(opportunity: ReviewQueueOpportunity) {
  if (opportunity.deadlineType === 'rolling') return '상시 모집';
  if (opportunity.deadlineType === 'tbd' || !opportunity.deadline) return '마감일 미정';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(opportunity.deadline));
}

export function ReviewQueue({ initialItems }: { initialItems: ReviewQueueOpportunity[] }) {
  const [items, setItems] = useState(initialItems);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, decision: 'approved' | 'rejected') {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: notes[id] ?? '' }),
      });
      if (!response.ok) throw new Error();
      if (decision === 'approved') setItems((current) => current.filter((item) => item.id !== id));
      else setItems((current) => current.map((item) => item.id === id ? { ...item, reviewStatus: 'rejected', reviewNote: notes[id] || null } : item));
    } catch {
      setError('검수 결과를 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = items.filter((item) => item.reviewStatus === 'pending').length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">검수 대기</h2>
          <p className="text-sm text-slate-600">현재 {pendingCount}건이 공개 전 확인을 기다리고 있습니다.</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">승인 시 즉시 공개</span>
      </div>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {items.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">검수 대기 또는 반려된 공고가 없습니다.</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((opportunity) => {
            const rejected = opportunity.reviewStatus === 'rejected';
            const busy = busyId === opportunity.id;
            return (
              <article key={opportunity.id} className={`space-y-4 rounded-lg border bg-white p-5 ${rejected ? 'border-slate-300' : 'border-amber-300 ring-1 ring-amber-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{opportunity.organization} · {deadlineText(opportunity)}</p>
                    <h3 className="mt-1 font-semibold text-slate-900">{opportunity.title}</h3>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${rejected ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-900'}`}>
                    {rejected ? '반려됨' : '검수 대기'}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-700">{opportunity.description ?? '설명 없음'}</p>
                <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">{opportunity.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1">#{tag}</span>)}</div>
                <a href={opportunity.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-medium text-primary underline">원문 확인 · {opportunity.sourceName}</a>
                <label className="block text-sm font-medium text-slate-700">검수 메모
                  <textarea value={notes[opportunity.id] ?? opportunity.reviewNote ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [opportunity.id]: event.target.value }))} maxLength={500} rows={2} placeholder="선택 사항" className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-normal" />
                </label>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => void decide(opportunity.id, 'approved')} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">{busy ? '저장 중…' : '승인하고 공개'}</button>
                  <button type="button" disabled={busy} onClick={() => void decide(opportunity.id, 'rejected')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">반려</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
