import { reviewDetailSchemas, reviewTypeLabels } from '@/lib/validation/review';
import type { PublicReview } from '@/lib/reviews/public-data';

export function DemoReviewBadge() {
  return (
    <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
      Example review
    </span>
  );
}

function detailEntries(review: PublicReview) {
  if (review.details === null || typeof review.details !== 'object' || Array.isArray(review.details)) return [];
  const schema = reviewDetailSchemas[review.reviewType];
  return Object.entries(review.details).flatMap(([key, value]) => {
    if (!Object.hasOwn(schema, key) || (typeof value !== 'string' && typeof value !== 'number')) return [];
    return [[schema[key]!.label, String(value)] as const];
  });
}

/** User prose is rendered only as text; no review field is interpreted as HTML. */
export function ReviewCard({ review }: { review: PublicReview }) {
  const details = detailEntries(review);
  const optionalSections = [
    ['Preparation', review.preparation],
    ['What went well', review.pros],
    ['Challenges', review.challenges],
    ['Tips', review.tips],
  ] as const;

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{review.title}</h3>
        {review.isDemo && <DemoReviewBadge />}
      </div>
      <p className="text-xs text-slate-600">
        {review.experienceYear} · {reviewTypeLabels[review.reviewType]} · {review.authorDisplayName}
        {review.isAnonymous && !review.isDemo && ' (anonymous)'}
      </p>
      <p className="whitespace-pre-wrap text-sm text-slate-800">{review.body}</p>

      {(review.period || review.role || review.result || details.length > 0) && (
        <dl className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
          {review.period && <div><dt className="inline font-medium">Period: </dt><dd className="inline">{review.period}</dd></div>}
          {review.role && <div><dt className="inline font-medium">Role: </dt><dd className="inline">{review.role}</dd></div>}
          {review.result && <div><dt className="inline font-medium">Result: </dt><dd className="inline">{review.result}</dd></div>}
          {details.map(([label, value]) => <div key={label}><dt className="inline font-medium">{label}: </dt><dd className="inline">{value}</dd></div>)}
        </dl>
      )}

      {optionalSections.filter(([, value]) => value).map(([label, value]) => (
        <section key={label} className="space-y-1 text-sm text-slate-700">
          <h4 className="font-medium">{label}</h4>
          <p className="whitespace-pre-wrap">{value}</p>
        </section>
      ))}

      {review.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {review.skills.map((skill, index) => (
            <span key={`${skill}-${index}`} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
              #{skill}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
