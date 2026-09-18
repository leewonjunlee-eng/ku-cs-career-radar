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
        setError(body?.error?.message ?? '후기를 저장하지 못했습니다.');
        return;
      }
      if (mode === 'create') setValues(emptyValues({ subjectId: defaultSubjectId, opportunityId: defaultOpportunityId }));
      onSaved?.();
      router.refresh();
    } catch {
      setError('네트워크 오류로 후기를 저장하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  const detailSchema = reviewDetailSchemas[values.reviewType];
  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 p-4">
      <p className="text-xs text-slate-500">개인정보, 회사 기밀, 비밀 유지 대상 내용은 적지 마세요. 채용 후기는 개인 경험이며 결과를 보장하지 않습니다.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">후기 대상
          <select required value={values.subjectId} onChange={(event) => {
            const subjectId = event.target.value;
            setValues((previous) => ({ ...previous, subjectId, opportunityId: subjectId === previous.subjectId ? previous.opportunityId : null }));
          }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">대상을 선택하세요</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">경험 유형
          <select required value={values.reviewType} onChange={(event) => update('reviewType', event.target.value as Enums<'review_kind'>)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {reviewTypes.map((type) => <option key={type} value={type}>{reviewTypeLabels[type]}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">제목<input required maxLength={100} value={values.title} onChange={(event) => update('title', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
      <label className="block text-sm">참여 연도<input required type="number" min={2000} max={2100} value={values.experienceYear} onChange={(event) => update('experienceYear', Number(event.target.value))} className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
      <label className="block text-sm">후기 내용<textarea required maxLength={5000} rows={5} value={values.body} onChange={(event) => update('body', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        {([['period', '활동 기간'], ['role', '맡은 역할'], ['result', '결과'], ['skills', '사용 기술 (쉼표로 구분)']] as const).map(([key, label]) => (
          <label key={key} className="block text-sm">{label}<input value={values[key]} onChange={(event) => update(key, event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        ))}
      </div>
      {Object.keys(detailSchema).length > 0 && <fieldset className="space-y-2 rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-xs font-medium text-slate-600">{reviewTypeLabels[values.reviewType]} 상세 정보 (선택)</legend>
        {Object.entries(detailSchema).map(([key, spec]) => <label key={key} className="block text-sm">{spec.label}<input type={spec.type === 'int' ? 'number' : 'text'} value={values.details[key] ?? ''} onChange={(event) => setValues((previous) => ({ ...previous, details: { ...previous.details, [key]: event.target.value } }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>)}
      </fieldset>}
      {([['preparation', '준비 과정'], ['pros', '좋았던 점'], ['challenges', '어려웠던 점'], ['tips', '팁']] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<textarea rows={2} value={values[key]} onChange={(event) => update(key, event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>)}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={values.isAnonymous} onChange={(event) => update('isAnonymous', event.target.checked)} className="mt-1" /><span>익명으로 게시<span className="block text-xs text-slate-500">닉네임만 가려집니다. 본문 내용은 자동으로 익명 처리되지 않습니다.</span></span></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2"><button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">{submitting ? '저장 중…' : mode === 'create' ? '후기 등록' : '수정 저장'}</button>{mode === 'edit' && onCancel && <button type="button" disabled={submitting} onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50">취소</button>}</div>
    </form>
  );
}
