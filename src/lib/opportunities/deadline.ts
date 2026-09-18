import type { Enums, Tables } from '@/types/database';

export const SEOUL_TIME_ZONE = 'Asia/Seoul';

type DeadlineType = Enums<'opp_deadline_type'>;
type DeadlinePrecision = Enums<'opp_deadline_precision'>;

export type OpportunityDeadline = Pick<
  Tables<'opportunities'>,
  'id' | 'deadline' | 'deadline_type' | 'deadline_precision'
>;

export type DeadlineClassification =
  | { kind: 'rolling'; label: '모집시 마감' }
  | { kind: 'tbd'; label: '마감일 미정' }
  | {
      kind: 'open' | 'expired';
      label: string;
      deadlineDate: string;
      precision: DeadlinePrecision;
      timeIsProvided: boolean;
      daysUntil: number;
    };

function validDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('deadline must be a valid timestamp');
  return date;
}

function seoulParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: SEOUL_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
}

/** Returns an ISO calendar date in the product's display timezone. */
export function seoulDateKey(value: Date | string): string {
  const parts = seoulParts(typeof value === 'string' ? validDate(value) : value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Formats a timestamp for display as a KST date and time (e.g. "2026.09.18 20:50"). */
export function formatSeoulDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? validDate(value) : value;
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function addCalendarDays(dateKey: string, amount: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/**
 * A date-precision deadline is stored as the exclusive start of the following
 * KST day. Its displayed deadline is therefore one calendar day earlier.
 */
export function deadlineDateKey(deadline: OpportunityDeadline): string | null {
  if (deadline.deadline_type !== 'fixed' || deadline.deadline === null) return null;
  const instant = validDate(deadline.deadline);
  return deadline.deadline_precision === 'date'
    ? seoulDateKey(new Date(instant.getTime() - 1))
    : seoulDateKey(instant);
}

export function isExpired(deadline: OpportunityDeadline, now = new Date()): boolean {
  return deadline.deadline_type === 'fixed'
    && deadline.deadline !== null
    && validDate(deadline.deadline).getTime() <= now.getTime();
}

export function classifyDeadline(deadline: OpportunityDeadline, now = new Date()): DeadlineClassification {
  if (deadline.deadline_type === 'rolling') return { kind: 'rolling', label: '모집시 마감' };
  if (deadline.deadline_type === 'tbd') return { kind: 'tbd', label: '마감일 미정' };
  if (deadline.deadline === null || deadline.deadline_precision === null) {
    throw new TypeError('fixed deadlines require a timestamp and precision');
  }

  const dateKey = deadlineDateKey(deadline);
  const daysUntil = Math.round((Date.parse(dateKey!) - Date.parse(seoulDateKey(now))) / 86_400_000);
  const expired = isExpired(deadline, now);

  return {
    kind: expired ? 'expired' : 'open',
    label: expired ? '마감' : daysUntil === 0 ? 'D-day' : `D-${daysUntil}`,
    deadlineDate: dateKey!,
    precision: deadline.deadline_precision,
    timeIsProvided: deadline.deadline_precision === 'time',
    daysUntil,
  };
}

/** This KST week's Monday 00:00 and next Monday 00:00 as UTC ISO instants, for SQL filters. */
export function kstWeekBounds(now = new Date()): { start: string; end: string } {
  const today = seoulDateKey(now);
  const dayOfWeek = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const monday = addCalendarDays(today, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const at = (key: string) => new Date(`${key}T00:00:00+09:00`).toISOString();
  return { start: at(monday), end: at(addCalendarDays(monday, 7)) };
}

/** Monday 00:00 KST through (but excluding) the following Monday. */
export function isDeadlineThisWeek(deadline: OpportunityDeadline, now = new Date()): boolean {
  if (deadline.deadline_type !== 'fixed' || isExpired(deadline, now)) return false;
  const today = seoulDateKey(now);
  const dayOfWeek = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const monday = addCalendarDays(today, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const nextMonday = addCalendarDays(monday, 7);
  const key = deadlineDateKey(deadline);
  return key !== null && key >= monday && key < nextMonday;
}

/**
 * Active fixed deadlines come first, then rolling/tbd notices. `id` makes
 * every tie deterministic for a database query and a client-side re-sort.
 */
export function compareByDeadline(
  left: OpportunityDeadline,
  right: OpportunityDeadline,
  now = new Date(),
): number {
  const leftOpenFixed = left.deadline_type === 'fixed' && !isExpired(left, now);
  const rightOpenFixed = right.deadline_type === 'fixed' && !isExpired(right, now);
  if (leftOpenFixed !== rightOpenFixed) return leftOpenFixed ? -1 : 1;
  if (leftOpenFixed && rightOpenFixed) {
    const byDeadline = validDate(left.deadline!).getTime() - validDate(right.deadline!).getTime();
    if (byDeadline !== 0) return byDeadline;
  }
  return left.id.localeCompare(right.id);
}

export function sortByDeadline<T extends OpportunityDeadline>(opportunities: readonly T[], now = new Date()): T[] {
  return [...opportunities].sort((left, right) => compareByDeadline(left, right, now));
}

/** 목록 정렬: 고려대 원문 공고를 먼저, 각 그룹 안에서는 마감일 순. */
export function sortKoreaUniversityFirst<T extends OpportunityDeadline & { is_korea_university_source: boolean | null }>(
  opportunities: readonly T[],
  now = new Date(),
): T[] {
  return [...opportunities].sort(
    (left, right) =>
      Number(Boolean(right.is_korea_university_source)) - Number(Boolean(left.is_korea_university_source))
      || compareByDeadline(left, right, now),
  );
}
