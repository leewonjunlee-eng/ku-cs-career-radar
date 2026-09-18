'use client';

import { useMemo, useState } from 'react';
import { filterLabs } from '@/lib/labs/filter';
import type { LabDirectory as LabDirectoryData } from '@/lib/labs/types';

function sourceLinks(sourceIds: string[], directory: LabDirectoryData) {
  const sourceById = new Map(directory.sources.map((source) => [source.id, source]));
  return sourceIds.flatMap((id) => {
    const source = sourceById.get(id);
    return source ? [source] : [];
  });
}

export function LabDirectory({ directory }: { directory: LabDirectoryData }) {
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('');
  const departments = useMemo(
    () => [...new Set(directory.labs.flatMap((lab) => lab.departments))].sort((a, b) => a.localeCompare(b, 'ko-KR')),
    [directory.labs],
  );
  const labs = useMemo(() => filterLabs(directory.labs, keyword, department), [directory.labs, keyword, department]);

  return (
    <section aria-labelledby="lab-directory-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="lab-directory-heading" className="text-xl font-bold">연구실 정보</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          {directory.scope}의 컴퓨터 관련 연구실을 분야와 소속으로 찾아볼 수 있습니다. 이 목록은 연구실 모집 여부를 뜻하지 않습니다.
        </p>
        {directory.checkedAt && <p className="text-xs text-slate-500">확인일: {directory.checkedAt}</p>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="lab-search">연구실 검색</label>
        <input
          id="lab-search"
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="교수, 연구실명, 연구분야 검색"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="sr-only" htmlFor="lab-department">소속 필터</label>
        <select id="lab-department" value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-56">
          <option value="">소속 전체</option>
          {departments.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <p aria-live="polite" className="text-sm text-slate-600">{labs.length}개 연구실</p>
      {directory.labs.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">연구실 정보가 준비되는 중입니다.</p>
      ) : labs.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">검색 조건에 맞는 연구실이 없습니다.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {labs.map((lab) => (
            <article key={lab.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
              <div>
                <h3 className="font-semibold text-slate-900">{lab.name}</h3>
                {lab.professors.length > 0 && <p className="mt-1 text-sm text-slate-600">{lab.professors.join(', ')}</p>}
              </div>
              {lab.departments.length > 0 && <p className="text-sm text-slate-600">소속: {lab.departments.join(' · ')}</p>}
              {lab.topics.length > 0 && <div className="flex flex-wrap gap-1.5">{lab.topics.map((topic) => <span key={topic} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{topic}</span>)}</div>}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-primary">
                {lab.website && <a href={lab.website} target="_blank" rel="noopener noreferrer" className="hover:underline">공식 홈페이지</a>}
                {sourceLinks(lab.sourceIds, directory).map((source) => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline">출처: {source.label}</a>)}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
