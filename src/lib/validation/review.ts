// 후기 작성/수정 입력 검증. 순수 함수(서버 전용 아님)이며 DB CHECK 제약과 같은 한도를 미리
// 적용해 잘못된 입력이 500이 아닌 400으로 걸러지게 한다. supabase/migrations/0001, 0010 참조.
import type { Enums } from '@/types/database';
import { ValidationError, isNonEmptyText, requireJsonObject, requireText, requireTextArray, requireUuid } from '@/lib/validation/common';

export const reviewTypes = [
  'contest',
  'research',
  'internship',
  'employment',
  'extracurricular',
] as const satisfies readonly Enums<'review_kind'>[];

export const reviewTypeLabels: Record<Enums<'review_kind'>, string> = {
  contest: '공모전·해커톤',
  research: '학부연구생',
  internship: '인턴',
  employment: '취업',
  extracurricular: '대외활동',
};

function isReviewType(value: unknown): value is Enums<'review_kind'> {
  return typeof value === 'string' && (reviewTypes as readonly string[]).includes(value);
}

type DetailFieldSpec =
  | { type: 'string'; label: string; maxLength: number }
  | { type: 'int'; label: string; min: number; max: number };

// docs/features/reviews.md §2 유형별 선택 입력 표에서, role/period/result/tips 등 이미 공통
// 컬럼으로 존재하는 항목을 뺀 나머지만 유형별 details 허용 키로 둔다.
export const reviewDetailSchemas: Record<Enums<'review_kind'>, Record<string, DetailFieldSpec>> = {
  contest: {
    team_size: { type: 'int', label: '팀 규모', min: 1, max: 50 },
  },
  research: {
    field: { type: 'string', label: '연구 분야', maxLength: 100 },
    prior_experience: { type: 'string', label: '시작 당시 경험', maxLength: 500 },
    weekly_hours: { type: 'int', label: '주당 참여 시간', min: 1, max: 100 },
  },
  internship: {
    selection_process: { type: 'string', label: '선발 과정', maxLength: 500 },
    key_tasks: { type: 'string', label: '실제 업무', maxLength: 500 },
    learnings: { type: 'string', label: '배운 점', maxLength: 500 },
  },
  employment: {
    profile: { type: 'string', label: '지원 당시 프로젝트·경력·학점 등', maxLength: 500 },
    process_experience: { type: 'string', label: '전형별 경험', maxLength: 500 },
  },
  extracurricular: {
    region: { type: 'string', label: '활동 국가/지역', maxLength: 100 },
    selection_process: { type: 'string', label: '선발 과정', maxLength: 500 },
  },
};

function validateDetails(reviewType: Enums<'review_kind'>, value: unknown): Record<string, unknown> {
  const details = requireJsonObject(value, 'details');
  const schema = reviewDetailSchemas[reviewType];
  const allowedKeys = Object.keys(schema);
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(details)) {
    if (!Object.hasOwn(schema, key)) {
      throw new ValidationError(
        `details.${key}은(는) ${reviewTypeLabels[reviewType]} 유형에서 허용되지 않습니다. 허용된 키: ${allowedKeys.join(', ') || '없음'}`,
        `details.${key}`,
      );
    }
    const spec = schema[key]!;
    if (spec.type === 'string') {
      result[key] = requireText(raw, `details.${key}(${spec.label})`, spec.maxLength);
    } else {
      if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < spec.min || raw > spec.max) {
        throw new ValidationError(`details.${key}(${spec.label})은(는) ${spec.min}~${spec.max} 사이의 정수여야 합니다.`, `details.${key}`);
      }
      result[key] = raw;
    }
  }
  // PostgreSQL's jsonb::text includes a space after each colon and comma. The
  // accepted details shape is shallow and scalar-only, so this is its exact
  // textual representation length without a database round trip.
  const jsonbText = `{${Object.entries(result).map(([key, item]) => `${JSON.stringify(key)}: ${JSON.stringify(item)}`).join(', ')}}`;
  if (Array.from(jsonbText).length > 2000) throw new ValidationError('details의 전체 길이가 너무 깁니다.', 'details');
  return result;
}

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  return requireText(value, field, maxLength);
}

const CURRENT_YEAR_CEILING = 2100;
const CURRENT_YEAR_FLOOR = 2000;

function validateExperienceYear(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < CURRENT_YEAR_FLOOR || value > CURRENT_YEAR_CEILING) {
    throw new ValidationError(`경험 연도는 ${CURRENT_YEAR_FLOOR}~${CURRENT_YEAR_CEILING} 사이의 정수여야 합니다.`, 'experience_year');
  }
  return value;
}

export type ReviewCreateInput = {
  subjectId: string;
  opportunityId: string | null;
  reviewType: Enums<'review_kind'>;
  title: string;
  body: string;
  experienceYear: number;
  period: string | null;
  role: string | null;
  result: string | null;
  preparation: string | null;
  pros: string | null;
  challenges: string | null;
  tips: string | null;
  skills: string[];
  details: Record<string, unknown>;
  isAnonymous: boolean;
};

export type ReviewUpdateInput = Partial<ReviewCreateInput>;

// 서버가 절대 신뢰해서는 안 되는 필드. 클라이언트가 보내면 조용히 무시하지 않고 명시적으로
// 거부한다: 위조 시도를 400으로 드러내는 편이 "묵살"보다 안전 회귀 테스트가 쉽고, 클라이언트
// 버그(실수로 author_id를 보내는 등)도 조기에 드러난다.
const FORBIDDEN_CLIENT_FIELDS = ['author_id', 'authorId', 'is_demo', 'isDemo'] as const;

function assertNoForbiddenFields(payload: Record<string, unknown>) {
  for (const field of FORBIDDEN_CLIENT_FIELDS) {
    if (field in payload) throw new ValidationError(`${field}는 직접 지정할 수 없습니다.`, field);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('요청 본문은 JSON 객체여야 합니다.');
  }
  return value as Record<string, unknown>;
}

export function validateReviewCreate(payload: unknown): ReviewCreateInput {
  const body = record(payload);
  assertNoForbiddenFields(body);

  const reviewType = body.review_type;
  if (!isReviewType(reviewType)) {
    throw new ValidationError(`review_type은(는) ${reviewTypes.join(', ')} 중 하나여야 합니다.`, 'review_type');
  }

  return {
    subjectId: requireUuid(body.subject_id, 'subject_id'),
    opportunityId: body.opportunity_id === undefined || body.opportunity_id === null ? null : requireUuid(body.opportunity_id, 'opportunity_id'),
    reviewType,
    title: requireText(body.title, 'title', 100),
    body: requireText(body.body, 'body', 5000),
    experienceYear: validateExperienceYear(body.experience_year),
    period: optionalText(body.period, 'period', 100),
    role: optionalText(body.role, 'role', 100),
    result: optionalText(body.result, 'result', 100),
    preparation: optionalText(body.preparation, 'preparation', 1000),
    pros: optionalText(body.pros, 'pros', 1000),
    challenges: optionalText(body.challenges, 'challenges', 1000),
    tips: optionalText(body.tips, 'tips', 1000),
    skills: body.skills === undefined ? [] : requireTextArray(body.skills, 'skills', 20, 30),
    details: validateDetails(reviewType, body.details ?? {}),
    isAnonymous: validateIsAnonymous(body.is_anonymous),
  };
}

function validateIsAnonymous(value: unknown): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') throw new ValidationError('is_anonymous은(는) boolean이어야 합니다.', 'is_anonymous');
  return value;
}

/**
 * 수정은 보낸 필드만 갱신한다. review_type을 바꾸면 details 허용 키 집합도 바뀌므로, details를
 * 함께 보내지 않았다면 기존 review_type 기준으로 재검증할 수 있도록 현재 유형을 인자로 받는다.
 */
export function validateReviewUpdate(
  payload: unknown,
  currentReviewType: Enums<'review_kind'>,
  currentDetails: unknown = {},
): ReviewUpdateInput {
  const body = record(payload);
  assertNoForbiddenFields(body);

  const result: ReviewUpdateInput = {};
  const effectiveType = isReviewType(body.review_type) ? body.review_type : currentReviewType;

  if (body.review_type !== undefined) {
    if (!isReviewType(body.review_type)) throw new ValidationError(`review_type은(는) ${reviewTypes.join(', ')} 중 하나여야 합니다.`, 'review_type');
    result.reviewType = body.review_type;
  }
  if (body.subject_id !== undefined) result.subjectId = requireUuid(body.subject_id, 'subject_id');
  if (body.opportunity_id !== undefined) result.opportunityId = body.opportunity_id === null ? null : requireUuid(body.opportunity_id, 'opportunity_id');
  if (body.title !== undefined) result.title = requireText(body.title, 'title', 100);
  if (body.body !== undefined) result.body = requireText(body.body, 'body', 5000);
  if (body.experience_year !== undefined) result.experienceYear = validateExperienceYear(body.experience_year);
  if (body.period !== undefined) result.period = optionalText(body.period, 'period', 100);
  if (body.role !== undefined) result.role = optionalText(body.role, 'role', 100);
  if (body.result !== undefined) result.result = optionalText(body.result, 'result', 100);
  if (body.preparation !== undefined) result.preparation = optionalText(body.preparation, 'preparation', 1000);
  if (body.pros !== undefined) result.pros = optionalText(body.pros, 'pros', 1000);
  if (body.challenges !== undefined) result.challenges = optionalText(body.challenges, 'challenges', 1000);
  if (body.tips !== undefined) result.tips = optionalText(body.tips, 'tips', 1000);
  if (body.skills !== undefined) result.skills = requireTextArray(body.skills, 'skills', 20, 30);
  if (body.details !== undefined) result.details = validateDetails(effectiveType, body.details);
  // A type change also changes the detail allow-list. If details were omitted,
  // validate the persisted value against the newly effective type instead of
  // leaving an impossible record behind.
  if (result.reviewType !== undefined && result.reviewType !== currentReviewType && body.details === undefined) {
    validateDetails(result.reviewType, currentDetails);
  }
  if (body.is_anonymous !== undefined) result.isAnonymous = validateIsAnonymous(body.is_anonymous);

  if (Object.keys(result).length === 0) throw new ValidationError('수정할 값이 없습니다.');
  return result;
}

export function isNonEmptyString(value: unknown): value is string {
  return isNonEmptyText(value);
}
