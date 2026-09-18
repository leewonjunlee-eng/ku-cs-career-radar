import type { Enums } from '@/types/database';
import { ValidationError } from '@/lib/validation/common';

export const opportunityCategories = [
  'internship',
  'hiring',
  'hackathon',
  'contest',
  'lab',
  'extracurricular',
] as const satisfies readonly Enums<'opp_category'>[];

export const opportunityCategoryLabels: Record<Enums<'opp_category'>, string> = {
  internship: '인턴',
  hiring: '채용',
  hackathon: '해커톤',
  contest: '공모전',
  lab: '연구실',
  extracurricular: '대외활동',
};

/** 상단 메뉴 탭. 공모전 탭은 해커톤까지 함께 보여준다. */
export const opportunityTabs: { label: string; categories: Enums<'opp_category'>[] }[] = [
  { label: '인턴', categories: ['internship'] },
  { label: '채용', categories: ['hiring'] },
  { label: '공모전', categories: ['contest', 'hackathon'] },
  { label: '대외활동', categories: ['extracurricular'] },
  { label: '연구실', categories: ['lab'] },
];

export function opportunityTabHref(categories: readonly string[]) {
  return categories.length ? `/?${categories.map((c) => `category=${c}`).join('&')}` : '/';
}

export type OpportunityQuery = {
  keyword?: string;
  categories: Enums<'opp_category'>[];
  tags: string[];
  includeExpired: boolean;
  deadline?: 'fixed' | 'rolling' | 'tbd' | 'this-week';
};

export type OpportunityPagination = {
  page: number;
  limit: number;
};

const TRUE = 'true';
const FALSE = 'false';

/**
 * Escapes user input for a parameterized PostgreSQL ILIKE pattern (`%`, `_`,
 * and the escape character `\` itself). Does NOT and cannot neutralize `*`:
 * PostgREST rewrites any bare `*` to `%` for ilike/like operators as a raw
 * text substitution before Postgres ever sees the value, including inside an
 * already-escaped `\*` (it becomes `\%`, i.e. a literal `%`, not `*`) and
 * inside a quoted `or=(...)` value. docs/features/opportunities.md §3 only
 * requires `%`/`_` to be treated literally, so a literal `*` in a search
 * term matching everything is a known, spec-exempt PostgREST limitation.
 */
export function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/**
 * Quotes a value for embedding inside a PostgREST `or=(...)` filter string.
 * Without this, a value containing `,` or `)` breaks out of its filter and
 * lets the caller reshape the logic tree.
 */
export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Converts public list-query parameters into typed values only. The API layer
 * will bind keyword values rather than interpolating them into SQL.
 */
export function parseOpportunityQuery(searchParams: URLSearchParams): OpportunityQuery {
  const keyword = searchParams.get('q')?.trim();
  const categories = [...new Set(searchParams.getAll('category').filter(Boolean))];
  const includeExpired = searchParams.get('includeExpired');
  const deadline = searchParams.get('deadline');
  const tags = [...new Set(searchParams.getAll('tag').map((tag) => tag.trim()).filter(Boolean))];

  if (keyword && Array.from(keyword).length > 200) {
    throw new ValidationError('Search query must be 200 characters or fewer', 'q');
  }
  if (categories.some((category) => !opportunityCategories.includes(category as Enums<'opp_category'>))) {
    throw new ValidationError('Invalid opportunity category', 'category');
  }
  if (tags.length > 10 || tags.some((tag) => Array.from(tag).length > 30)) {
    throw new ValidationError('Tags must contain at most 10 values of 30 characters or fewer', 'tag');
  }
  if (includeExpired !== null && includeExpired !== TRUE && includeExpired !== FALSE) {
    throw new ValidationError('includeExpired must be true or false', 'includeExpired');
  }
  if (deadline !== null && deadline !== 'fixed' && deadline !== 'rolling' && deadline !== 'tbd' && deadline !== 'this-week') {
    throw new ValidationError('Invalid deadline filter', 'deadline');
  }

  return {
    ...(keyword ? { keyword } : {}),
    categories: categories as Enums<'opp_category'>[],
    tags,
    includeExpired: includeExpired === TRUE,
    ...(deadline ? { deadline: deadline as OpportunityQuery['deadline'] } : {}),
  };
}

function parsePositiveInteger(value: string | null, field: string, fallback: number, maximum: number): number {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new ValidationError(`${field} must be a positive integer`, field);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new ValidationError(`${field} must be at most ${maximum}`, field);
  }
  return parsed;
}

/** Limits public list reads to a predictable, cache-friendly range. */
export function parseOpportunityPagination(searchParams: URLSearchParams): OpportunityPagination {
  return {
    page: parsePositiveInteger(searchParams.get('page'), 'page', 1, 1_000),
    limit: parsePositiveInteger(searchParams.get('limit'), 'limit', 20, 50),
  };
}
