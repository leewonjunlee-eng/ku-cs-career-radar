import { describe, expect, it } from 'vitest';
import {
  classifyDeadline,
  deadlineDateKey,
  formatSeoulDateTime,
  isDeadlineThisWeek,
  sortByDeadline,
  type OpportunityDeadline,
} from '@/lib/opportunities/deadline';
import { escapeIlikePattern, parseOpportunityPagination, parseOpportunityQuery } from '@/lib/opportunities/query';
import { ValidationError } from '@/lib/validation/common';

const fixed = (overrides: Partial<OpportunityDeadline> = {}): OpportunityDeadline => ({
  id: 'fixed',
  deadline_type: 'fixed',
  deadline: '2026-09-21T14:00:00.000Z', // 23:00 KST
  deadline_precision: 'time',
  ...overrides,
});

describe('opportunity deadlines', () => {
  it('uses KST calendar days, not 24-hour intervals, for D-day', () => {
    const now = new Date('2026-09-20T15:30:00.000Z'); // Sep 21 00:30 KST
    expect(classifyDeadline(fixed(), now)).toMatchObject({ kind: 'open', label: 'D-day', daysUntil: 0 });
  });

  it('keeps a date-only source deadline open through its KST date and marks its precision', () => {
    const deadline = fixed({ deadline: '2026-09-21T15:00:00.000Z', deadline_precision: 'date' });
    expect(deadlineDateKey(deadline)).toBe('2026-09-21');
    expect(classifyDeadline(deadline, new Date('2026-09-21T14:59:59.000Z'))).toMatchObject({
      kind: 'open', label: 'D-day', timeIsProvided: false, deadlineDate: '2026-09-21',
    });
    expect(classifyDeadline(deadline, new Date('2026-09-21T15:00:00.000Z')).kind).toBe('expired');
  });

  it('preserves rolling and tbd labels without asserting that they are open', () => {
    expect(classifyDeadline(fixed({ deadline_type: 'rolling', deadline: null, deadline_precision: null }))).toEqual({ kind: 'rolling', label: '모집시 마감' });
    expect(classifyDeadline(fixed({ deadline_type: 'tbd', deadline: null, deadline_precision: null }))).toEqual({ kind: 'tbd', label: '마감일 미정' });
  });

  it('sorts active fixed deadlines first and uses id for ties and non-fixed notices', () => {
    const now = new Date('2026-09-20T00:00:00.000Z');
    expect(sortByDeadline([
      fixed({ id: 'z-rolling', deadline_type: 'rolling', deadline: null, deadline_precision: null }),
      fixed({ id: 'b-fixed', deadline: '2026-09-22T00:00:00.000Z' }),
      fixed({ id: 'a-fixed', deadline: '2026-09-22T00:00:00.000Z' }),
      fixed({ id: 'expired', deadline: '2026-09-19T00:00:00.000Z' }),
      fixed({ id: 'a-tbd', deadline_type: 'tbd', deadline: null, deadline_precision: null }),
    ], now).map(({ id }) => id)).toEqual(['a-fixed', 'b-fixed', 'a-tbd', 'expired', 'z-rolling']);
  });

  it('formats a timestamp as a KST date and time', () => {
    expect(formatSeoulDateTime('2026-09-18T11:50:34Z')).toBe('2026. 09. 18. 20:50');
  });

  it('includes only unexpired fixed deadlines whose KST deadline date is in the current week', () => {
    const now = new Date('2026-09-20T15:00:00.000Z'); // Monday 00:00 KST
    expect(isDeadlineThisWeek(fixed({ deadline: '2026-09-21T15:00:00.000Z', deadline_precision: 'date' }), now)).toBe(true);
    expect(isDeadlineThisWeek(fixed({ deadline: '2026-09-28T15:00:00.000Z', deadline_precision: 'date' }), now)).toBe(false);
    expect(isDeadlineThisWeek(fixed({ deadline: '2026-09-20T14:00:00.000Z' }), now)).toBe(false);
  });
});

describe('opportunity query parsing', () => {
  it('retains keyword/category/repeated tags and defaults to hiding expired fixed deadlines', () => {
    const query = parseOpportunityQuery(new URLSearchParams('q=%20AI%25_%20&category=hackathon&tag=AI&tag=%EC%9B%B9'));
    expect(query).toEqual({ keyword: 'AI%_', categories: ['hackathon'], tags: ['AI', '웹'], includeExpired: false });
    expect(escapeIlikePattern(query.keyword!)).toBe('AI\\%\\_');
  });

  it('accepts several categories so one tab can cover contest and hackathon', () => {
    expect(parseOpportunityQuery(new URLSearchParams('category=contest&category=hackathon')).categories).toEqual(['contest', 'hackathon']);
    expect(parseOpportunityQuery(new URLSearchParams('')).categories).toEqual([]);
    expect(() => parseOpportunityQuery(new URLSearchParams('category=contest&category=party'))).toThrow(ValidationError);
  });

  it('allows expired inclusion only as an explicit boolean and rejects unknown categories', () => {
    expect(parseOpportunityQuery(new URLSearchParams('includeExpired=true')).includeExpired).toBe(true);
    expect(() => parseOpportunityQuery(new URLSearchParams('includeExpired=1'))).toThrow(ValidationError);
    expect(() => parseOpportunityQuery(new URLSearchParams('category=party'))).toThrow(ValidationError);
  });

  it('rejects an over-long keyword and too many or too-long tags', () => {
    expect(() => parseOpportunityQuery(new URLSearchParams(`q=${'a'.repeat(201)}`))).toThrow(ValidationError);
    const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag=t${i}`).join('&');
    expect(() => parseOpportunityQuery(new URLSearchParams(tooManyTags))).toThrow(ValidationError);
    expect(() => parseOpportunityQuery(new URLSearchParams(`tag=${'a'.repeat(31)}`))).toThrow(ValidationError);
  });

  it('defaults pagination and rejects non-positive, non-integer, or over-limit values', () => {
    expect(parseOpportunityPagination(new URLSearchParams(''))).toEqual({ page: 1, limit: 20 });
    expect(parseOpportunityPagination(new URLSearchParams('page=3&limit=50'))).toEqual({ page: 3, limit: 50 });
    for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=abc', 'page=1001', 'limit=51']) {
      expect(() => parseOpportunityPagination(new URLSearchParams(query))).toThrow(ValidationError);
    }
  });
});
