import type { Metadata } from 'next';
import { vacationSections } from '@/lib/vacation/programs';

export const metadata: Metadata = { title: '이번 방학 때 뭐할까? | KU CS Career Radar' };

export default function VacationPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-3 pt-4">
        <span className="inline-block rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-primary">방학 준비 가이드</span>
        <h1 className="text-3xl leading-tight tracking-tight sm:text-4xl">이번 방학 때 뭐할까?</h1>
        <p className="max-w-3xl text-base leading-relaxed text-slate-600">
          작년에 운영된 학교 프로그램을 바탕으로, 올해도 열릴 것으로 예상되는 프로그램과 미리 준비할 것을 모았습니다.
          모든 일정은 <strong className="text-slate-800">예정</strong>이며, 지원 전 반드시 올해 공식 공지를 확인하세요.
        </p>
      </section>

      {vacationSections.map((section) => (
        <section key={section.title} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">{section.title}</h2>
            <p className="text-sm text-slate-600">{section.description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {section.programs.map((program) => (
              <article key={program.name} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{program.name}</h3>
                    <p className="text-sm text-slate-600">{program.host}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-bold text-primary">예정</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{program.expected}</p>
                <p className="text-xs leading-relaxed text-slate-500">작년 근거: {program.lastYear}</p>
                <div>
                  <p className="text-xs font-semibold text-slate-700">미리 준비할 것</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-slate-700">
                    {program.prepare.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  {program.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">#{tag}</span>)}
                  <a href={program.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm font-medium text-primary hover:underline">
                    작년 공고 보기
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-500">근거 확인일: 2026-09-19. 작년 공고를 기준으로 한 예정 정보이며, 올해 운영 여부·일정·자격은 달라질 수 있습니다.</p>
    </div>
  );
}
