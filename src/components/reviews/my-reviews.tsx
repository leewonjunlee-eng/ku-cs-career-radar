'use client';

import { useEffect, useState } from 'react';
import { ReviewForm, type ReviewFormValues } from './review-form';
import { reviewTypeLabels } from '@/lib/validation/review';
import type { MyReview } from '@/lib/reviews/mutations';

type SubjectOption = { id: string; name: string };

function toFormValues(review: MyReview): ReviewFormValues {
  const details: Record<string, string | number> = {};
  if (review.details && typeof review.details === 'object' && !Array.isArray(review.details)) {
    for (const [key, value] of Object.entries(review.details)) if (typeof value === 'string' || typeof value === 'number') details[key] = value;
  }
  return {
    subjectId: review.subjectId, opportunityId: review.opportunityId, reviewType: review.reviewType,
    title: review.title, body: review.body, experienceYear: review.experienceYear,
    period: review.period ?? '', role: review.role ?? '', result: review.result ?? '',
    preparation: review.preparation ?? '', pros: review.pros ?? '', challenges: review.challenges ?? '', tips: review.tips ?? '',
    skills: review.skills.join(', '), details, isAnonymous: review.isAnonymous,
  };
}

export function MyReviews({ subjects }: { subjects: SubjectOption[] }) {
  const [reviews, setReviews] = useState<MyReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch('/api/me/reviews', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { items: MyReview[] };
      setReviews(body.items);
      setError(null);
    } catch {
      setError('내 후기를 불러오지 못했습니다.');
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleDelete(id: string) {
    if (!window.confirm('이 후기를 삭제할까요?')) return;
    try {
      const response = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? '후기를 삭제하지 못했습니다.');
        return;
      }
      await load();
    } catch {
      setError('네트워크 오류로 후기를 삭제하지 못했습니다.');
    }
  }

  if (reviews === null) return <p className={error ? 'text-sm text-red-600' : 'text-sm text-slate-500'}>{error ?? '불러오는 중…'}</p>;
  if (reviews.length === 0) return <p className="text-sm text-slate-500">아직 작성한 후기가 없습니다.</p>;

  return <div className="space-y-3">
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <ul className="space-y-3">
      {reviews.map((review) => <li key={review.id} className="space-y-2 rounded-lg border border-slate-200 p-4">
        {editingId === review.id ? <ReviewForm subjects={subjects} mode="edit" reviewId={review.id} initial={toFormValues(review)} onSaved={() => { setEditingId(null); void load(); }} onCancel={() => setEditingId(null)} /> : <>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{review.title}</h3>{review.isAnonymous && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">익명</span>}</div>
          <p className="text-xs text-slate-600">{review.experienceYear} · {reviewTypeLabels[review.reviewType]}</p>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{review.body}</p>
          <div className="flex gap-2 text-sm"><button type="button" onClick={() => setEditingId(review.id)} className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100">수정</button><button type="button" onClick={() => void handleDelete(review.id)} className="rounded-md border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50">삭제</button></div>
        </>}
      </li>)}
    </ul>
  </div>;
}
