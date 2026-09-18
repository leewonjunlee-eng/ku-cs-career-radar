import { describe, expect, it } from 'vitest';
import { filterLabs } from '@/lib/labs/filter';
import type { Lab } from '@/lib/labs/types';

const labs: Lab[] = [
  { id: 'ai', name: 'AI Lab', professors: ['김교수'], departments: ['인공지능학과'], topics: ['머신러닝'], website: null, sourceIds: [] },
  { id: 'security', name: 'Security Lab', professors: ['이교수'], departments: ['정보보호대학원'], topics: ['시스템 보안'], website: null, sourceIds: [] },
];

describe('filterLabs', () => {
  it('searches a lab name, professor, and research topic independently of the department filter', () => {
    expect(filterLabs(labs, '김교수', '')).toEqual([labs[0]]);
    expect(filterLabs(labs, '보안', '정보보호대학원')).toEqual([labs[1]]);
    expect(filterLabs(labs, '보안', '인공지능학과')).toEqual([]);
  });
});
