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
      setError('Your reviews could not be loaded.');
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this review?')) return;
    try {
      const response = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? 'The review could not be deleted.');
        return;
      }
      await load();
    } catch {
      setError('A network error prevented deleting this review.');
    }
  }

  if (reviews === null) return <p className={error ? 'text-sm text-red-600' : 'text-sm text-slate-500'}>{error ?? 'Loading…'}</p>;
  if (reviews.length === 0) return <p className="text-sm text-slate-500">You have not written a review yet.</p>;

  return <div className="space-y-3">
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <ul className="space-y-3">
      {reviews.map((review) => <li key={review.id} className="space-y-2 rounded-lg border border-slate-200 p-4">
        {editingId === review.id ? <ReviewForm subjects={subjects} mode="edit" reviewId={review.id} initial={toFormValues(review)} onSaved={() => { setEditingId(null); void load(); }} onCancel={() => setEditingId(null)} /> : <>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{review.title}</h3>{review.isAnonymous && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Anonymous</span>}</div>
          <p className="text-xs text-slate-600">{review.experienceYear} · {reviewTypeLabels[review.reviewType]}</p>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{review.body}</p>
          <div className="flex gap-2 text-sm"><button type="button" onClick={() => setEditingId(review.id)} className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100">Edit</button><button type="button" onClick={() => void handleDelete(review.id)} className="rounded-md border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50">Delete</button></div>
        </>}
      </li>)}
    </ul>
  </div>;
}
