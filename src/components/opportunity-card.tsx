import Link from 'next/link';
import { opportunityCategoryLabels } from '@/lib/opportunities/query';
import type { PublicOpportunityListItem } from '@/lib/opportunities/public-data';

const deadlineBadgeClass: Record<PublicOpportunityListItem['deadline']['kind'], string> = {
  open: 'border-sky-300 bg-sky-50 text-sky-900',
  expired: 'border-slate-300 bg-slate-100 text-slate-600',
  rolling: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  tbd: 'border-slate-300 bg-slate-100 text-slate-600',
};

const categoryAccentClass: Record<PublicOpportunityListItem['category'], string> = {
  internship: 'border-l-sky-500',
  hiring: 'border-l-violet-500',
  hackathon: 'border-l-amber-500',
  contest: 'border-l-orange-500',
  lab: 'border-l-emerald-500',
  extracurricular: 'border-l-rose-500',
};

const categoryBadgeClass: Record<PublicOpportunityListItem['category'], string> = {
  internship: 'bg-sky-100 text-sky-900',
  hiring: 'bg-violet-100 text-violet-900',
  hackathon: 'bg-amber-100 text-amber-900',
  contest: 'bg-orange-100 text-orange-900',
  lab: 'bg-emerald-100 text-emerald-900',
  extracurricular: 'bg-rose-100 text-rose-900',
};

/** 원문이 고려대 웹사이트에 있는 공고 표시. */
export function KoreaUniversityBadge() {
  return (
    <span className="rounded-full border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-900">
      고려대
    </span>
  );
}

export function OpportunityCard({ opportunity }: { opportunity: PublicOpportunityListItem }) {
  const { deadline } = opportunity;
  const urgent = deadline.kind === 'open' && deadline.daysUntil <= 3;
  const deadlineClass = urgent
    ? 'border-red-400 bg-red-50 font-bold text-red-800'
    : deadlineBadgeClass[deadline.kind];

  return (
    <article className={`space-y-3 rounded-lg border border-slate-200 border-l-4 bg-white p-5 transition-shadow hover:shadow-[0_12px_32px_rgba(27,29,31,0.07)] ${categoryAccentClass[opportunity.category]} ${urgent ? 'ring-1 ring-red-200' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-900">
            <Link href={`/opportunities/${opportunity.id}`} className="hover:underline">
              {opportunity.title}
            </Link>
          </h3>
          <p className="text-sm text-slate-600">{opportunity.organization}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${deadlineClass}`}>
          {deadline.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        {opportunity.isKoreaUniversitySource && <KoreaUniversityBadge />}
        <span className={`rounded-full px-2 py-1 font-medium ${categoryBadgeClass[opportunity.category]}`}>
          {opportunityCategoryLabels[opportunity.category]}
        </span>
        {opportunity.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-2 py-1">
            #{tag}
          </span>
        ))}
      </div>

      <a
        href={opportunity.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm font-medium text-primary hover:underline"
      >
        원문 보기 ({opportunity.sourceName})
      </a>
    </article>
  );
}
