import { describe, expect, it } from 'vitest';
import { vacationSections } from '@/lib/vacation/programs';

describe('방학 준비 가이드 데이터', () => {
  it('모든 항목이 작년 근거·원문 링크·예정 시기·준비물을 가진다', () => {
    const programs = vacationSections.flatMap((s) => s.programs);
    expect(programs.length).toBeGreaterThan(0);
    for (const p of programs) {
      expect(p.lastYear, p.name).toMatch(/20\d\d년/);
      expect(p.sourceUrl, p.name).toMatch(/^https:\/\/[\w.-]+\.korea\.ac\.kr\//);
      expect(p.expected, p.name).toMatch(/예정/);
      expect(p.prepare.length, p.name).toBeGreaterThan(0);
    }
  });
});
