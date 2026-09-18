'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { reviewDetailSchemas, reviewTypeLabels, reviewTypes } from '@/lib/validation/review';
import type { Enums } from '@/types/database';

type SubjectOption = { id: string; name: string };

export type ReviewFormValues = {
  subjectId: string;
  opportunityId: string | null;
  reviewType: Enums<'review_kind'>;
  title: string;
  body: string;
  experienceYear: number;
  period: string;
  role: string;
  result: string;
  preparation: string;
  pros: string;
  challenges: string;
  tips: string;
  skills: string;
  details: Record<string, string | number>;
  isAnonymous: boolean;
};

function emptyValues(defaults: { subjectId?: string; opportunityId?: string | null }): ReviewFormValues {
  return {
    subjectId: defaults.subjectId ?? '', opportunityId: defaults.opportunityId ?? null, reviewType: 'contest',
    title: '', body: '', experienceYear: new Date().getFullYear(), period: '', role: '', result: '',
    preparation: '', pros: '', challenges: '', tips: '', skills: '', details: {}, isAnonymous: false,
  };
}

function toApiBody(values: ReviewFormValues) {
  const optionalText = (value: string) => value.trim() || null;
  const details: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(reviewDetailSchemas[values.reviewType])) {
    const raw = values.details[key];
    if (raw === undefined || raw === '') continue;
    details[key] = spec.type === 'int' ? Number(raw) : String(raw).trim();
  }
  return {
    subject_id: values.subjectId,
    opportunity_id: values.opportunityId,
    review_type: values.reviewType,
    title: values.title.trim(),
    body: values.body.trim(),
    experience_year: values.experienceYear,
    period: optionalText(values.period), role: optionalText(values.role), result: optionalText(values.result),
    preparation: optionalText(values.preparation), pros: optionalText(values.pros),
    challenges: optionalText(values.challenges), tips: optionalText(values.tips),
    skills: values.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
    details,
    is_anonymous: values.isAnonymous,
  };
}

export function ReviewForm({
  subjects, mode, reviewId, defaultSubjectId, defaultOpportunityId, initial, onSaved, onCancel,
}: {
  subjects: SubjectOption[];
  mode: 'create' | 'edit';
  reviewId?: string;
  defaultSubjectId?: string;
  defaultOpportunityId?: string | null;
  initial?: ReviewFormValues;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ReviewFormValues>(initial ?? emptyValues({ subjectId: defaultSubjectId, opportunityId: defaultOpportunityId }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ReviewFormValues>(key: K, value: ReviewFormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(mode === 'create' ? '/api/reviews' : `/api/reviews/${reviewId}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toApiBody(values)),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? 'The review could not be saved.');
        return;
      }
      if (mode === 'create') setValues(emptyValues({ subjectId: defaultSubjectId, opportunityId: defaultOpportunityId }));
      onSaved?.();
      router.refresh();
    } catch {
      setError('A network error prevented saving this review.');
    } finally {
      setSubmitting(false);
    }
  }

  const detailSchema = reviewDetailSchemas[values.reviewType];
  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 p-4">
      <p className="text-xs text-slate-500">Do not include personal information, confidential information, or secrets. Employment reviews describe personal experience and never guarantee an outcome.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Subject
          <select required value={values.subjectId} onChange={(event) => {
            const subjectId = event.target.value;
            setValues((previous) => ({ ...previous, subjectId, opportunityId: subjectId === previous.subjectId ? previous.opportunityId : null }));
          }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select a subject</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">Experience type
          <select required value={values.reviewType} onChange={(event) => update('reviewType', event.target.value as Enums<'review_kind'>)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {reviewTypes.map((type) => <option key={type} value={type}>{reviewTypeLabels[type]}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">Title<input required maxLength={100} value={values.title} onChange={(event) => update('title', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
      <label className="block text-sm">Experience year<input required type="number" min={2000} max={2100} value={values.experienceYear} onChange={(event) => update('experienceYear', Number(event.target.value))} className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
      <label className="block text-sm">Review<textarea required maxLength={5000} rows={5} value={values.body} onChange={(event) => update('body', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        {([['period', 'Period'], ['role', 'Role'], ['result', 'Result'], ['skills', 'Skills (comma-separated)']] as const).map(([key, label]) => (
          <label key={key} className="block text-sm">{label}<input value={values[key]} onChange={(event) => update(key, event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        ))}
      </div>
      {Object.keys(detailSchema).length > 0 && <fieldset className="space-y-2 rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-xs font-medium text-slate-600">{reviewTypeLabels[values.reviewType]} details (optional)</legend>
        {Object.entries(detailSchema).map(([key, spec]) => <label key={key} className="block text-sm">{spec.label}<input type={spec.type === 'int' ? 'number' : 'text'} value={values.details[key] ?? ''} onChange={(event) => setValues((previous) => ({ ...previous, details: { ...previous.details, [key]: event.target.value } }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>)}
      </fieldset>}
      {([['preparation', 'Preparation'], ['pros', 'What went well'], ['challenges', 'Challenges'], ['tips', 'Tips']] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<textarea rows={2} value={values[key]} onChange={(event) => update(key, event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>)}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={values.isAnonymous} onChange={(event) => update('isAnonymous', event.target.checked)} className="mt-1" /><span>Display anonymously<span className="block text-xs text-slate-500">Only the display name is hidden. Review text is never automatically anonymized.</span></span></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2"><button type="submit" disabled={submitting} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{submitting ? 'Saving…' : mode === 'create' ? 'Submit review' : 'Save changes'}</button>{mode === 'edit' && onCancel && <button type="button" disabled={submitting} onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50">Cancel</button>}</div>
    </form>
  );
}
