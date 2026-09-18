import type { Enums } from '@/types/database';
import { ValidationError, isUuid } from '@/lib/validation/common';
import { reviewTypes } from '@/lib/validation/review';

export type ReviewQuery = {
  subjectId?: string;
  opportunityId?: string;
  reviewType?: Enums<'review_kind'>;
  experienceYear?: number;
  /** true면 예시 후기만, false(기본)면 예시 후기를 제외한 실제 후기만 보여준다. */
  demo: boolean;
};

export type ReviewPagination = { page: number; limit: number };

function parsePositiveInteger(value: string | null, field: string, fallback: number, maximum: number): number {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new ValidationError(`${field}은(는) 양의 정수여야 합니다.`, field);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) throw new ValidationError(`${field}은(는) 최대 ${maximum}입니다.`, field);
  return parsed;
}

export function parseReviewQuery(searchParams: URLSearchParams): ReviewQuery {
  const subjectId = searchParams.get('subjectId') ?? undefined;
  const opportunityId = searchParams.get('opportunityId') ?? undefined;
  const reviewType = searchParams.get('reviewType') ?? undefined;
  const experienceYearRaw = searchParams.get('experienceYear');
  const demoRaw = searchParams.get('demo');

  if (subjectId !== undefined && !isUuid(subjectId)) throw new ValidationError('subjectId는 올바른 UUID여야 합니다.', 'subjectId');
  if (opportunityId !== undefined && !isUuid(opportunityId)) throw new ValidationError('opportunityId는 올바른 UUID여야 합니다.', 'opportunityId');
  if (reviewType !== undefined && !(reviewTypes as readonly string[]).includes(reviewType)) {
    throw new ValidationError(`reviewType은(는) ${reviewTypes.join(', ')} 중 하나여야 합니다.`, 'reviewType');
  }
  let experienceYear: number | undefined;
  if (experienceYearRaw !== null) {
    if (!/^\d{4}$/.test(experienceYearRaw)) throw new ValidationError('experienceYear는 4자리 연도여야 합니다.', 'experienceYear');
    experienceYear = Number(experienceYearRaw);
  }
  if (demoRaw !== null && demoRaw !== 'true' && demoRaw !== 'false') {
    throw new ValidationError('demo는 true 또는 false여야 합니다.', 'demo');
  }

  return {
    ...(subjectId ? { subjectId } : {}),
    ...(opportunityId ? { opportunityId } : {}),
    ...(reviewType ? { reviewType: reviewType as Enums<'review_kind'> } : {}),
    ...(experienceYear ? { experienceYear } : {}),
    demo: demoRaw === 'true',
  };
}

export function parseReviewPagination(searchParams: URLSearchParams): ReviewPagination {
  return {
    page: parsePositiveInteger(searchParams.get('page'), 'page', 1, 1_000),
    limit: parsePositiveInteger(searchParams.get('limit'), 'limit', 20, 50),
  };
}
