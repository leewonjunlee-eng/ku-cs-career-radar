import type { PublicOpportunityDetail } from '@/lib/opportunities/public-data';
import { opportunityCategoryLabels } from '@/lib/opportunities/query';

export function OpportunityExamples({ opportunity }: { opportunity: PublicOpportunityDetail }) {
  const canRecruit = opportunity.category === 'contest' || opportunity.category === 'hackathon';
  const categoryLabel = opportunityCategoryLabels[opportunity.category];

  return (
    <section className="space-y-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-amber-950">예시 참여 정보</h2>
        <p className="text-sm text-amber-900">서비스 화면을 보여주기 위한 가상 예시이며, 실제 후기나 모집글이 아닙니다.</p>
      </div>

      <article className="space-y-2 rounded-lg border border-amber-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900">[예시 후기] {categoryLabel} 준비 가상 사례</h3>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">예시 후기</span>
        </div>
        <p className="text-sm text-slate-700">
          공고의 지원 조건과 마감 일정을 먼저 정리하고, 필요한 결과물과 역할을 나눠 준비했다는 가상의 참여 사례입니다.
        </p>
        <p className="text-sm text-slate-600">팁: 원문 공고의 제출 형식과 마감 시각을 다시 확인하세요.</p>
      </article>

      {canRecruit ? (
        <article className="space-y-2 rounded-lg border border-amber-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900">[예시] 아이디어를 구현할 팀원을 찾습니다</h3>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">예시 팀원 모집</span>
          </div>
          <p className="text-sm text-slate-700">기획과 프로토타입을 함께 완성할 프론트엔드·백엔드·디자인 역할을 모집하는 가상 글입니다.</p>
          <p className="text-xs text-slate-600">모집 역할: 프론트엔드, 백엔드, 디자인 · 기술 스택: React, Python, Figma</p>
        </article>
      ) : null}
    </section>
  );
}
