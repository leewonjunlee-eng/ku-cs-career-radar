import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/validation/common';
import { validateReviewCreate, validateReviewUpdate } from '@/lib/validation/review';

const validBase = {
  subject_id: '11111111-1111-4111-8111-111111111111',
  review_type: 'contest',
  title: '제목',
  body: '본문입니다.',
  experience_year: 2025,
};

describe('validateReviewCreate', () => {
  it('필수 필드만으로 유효한 입력을 만든다', () => {
    const result = validateReviewCreate(validBase);
    expect(result).toMatchObject({
      subjectId: validBase.subject_id,
      opportunityId: null,
      reviewType: 'contest',
      title: '제목',
      body: '본문입니다.',
      experienceYear: 2025,
      isAnonymous: false,
      skills: [],
      details: {},
    });
  });

  it('필수 필드 누락을 거부한다', () => {
    expect(() => validateReviewCreate({ ...validBase, title: undefined })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, body: undefined })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, subject_id: undefined })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, review_type: undefined })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, experience_year: undefined })).toThrow(ValidationError);
  });

  it('공백류만 있는 문자열을 거부한다 (제로폭·표제 공백 포함)', () => {
    expect(() => validateReviewCreate({ ...validBase, title: '   ' })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, title: '​﻿　' })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, body: '​' })).toThrow(ValidationError);
  });

  it('길이 제한을 초과하면 거부한다', () => {
    expect(() => validateReviewCreate({ ...validBase, title: 'a'.repeat(101) })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, body: 'a'.repeat(5001) })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, period: 'a'.repeat(101) })).toThrow(ValidationError);
  });

  it('review_type이 enum 밖이면 거부한다', () => {
    expect(() => validateReviewCreate({ ...validBase, review_type: 'seminar' })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, review_type: 123 })).toThrow(ValidationError);
  });

  it('experience_year 범위를 검사한다', () => {
    expect(() => validateReviewCreate({ ...validBase, experience_year: 1999 })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, experience_year: 2101 })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, experience_year: 2025.5 })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, experience_year: '2025' })).toThrow(ValidationError);
  });

  it('skills 배열 크기·항목 길이를 검사한다', () => {
    expect(() => validateReviewCreate({ ...validBase, skills: Array(21).fill('x') })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, skills: ['a'.repeat(31)] })).toThrow(ValidationError);
    expect(validateReviewCreate({ ...validBase, skills: ['Python', 'React'] }).skills).toEqual(['Python', 'React']);
  });

  it('opportunity_id는 선택이며 UUID 형식을 검사한다', () => {
    expect(validateReviewCreate({ ...validBase, opportunity_id: null }).opportunityId).toBeNull();
    expect(() => validateReviewCreate({ ...validBase, opportunity_id: 'not-a-uuid' })).toThrow(ValidationError);
    const uuid = '22222222-2222-4222-8222-222222222222';
    expect(validateReviewCreate({ ...validBase, opportunity_id: uuid }).opportunityId).toBe(uuid);
  });

  it('is_anonymous은 boolean만 허용한다', () => {
    expect(validateReviewCreate({ ...validBase, is_anonymous: true }).isAnonymous).toBe(true);
    expect(() => validateReviewCreate({ ...validBase, is_anonymous: 'true' })).toThrow(ValidationError);
  });

  it('유형별 details 허용 키·값 타입을 검사한다', () => {
    expect(validateReviewCreate({ ...validBase, review_type: 'contest', details: { team_size: 4 } }).details).toEqual({ team_size: 4 });
    expect(() => validateReviewCreate({ ...validBase, review_type: 'contest', details: { team_size: 0 } })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, review_type: 'contest', details: { team_size: 'four' } })).toThrow(ValidationError);
    // research 전용 키를 contest에 쓰면 거부된다
    expect(() => validateReviewCreate({ ...validBase, review_type: 'contest', details: { field: '연구분야' } })).toThrow(ValidationError);

    expect(
      validateReviewCreate({
        ...validBase,
        review_type: 'research',
        details: { field: 'AI', prior_experience: '없음', weekly_hours: 10 },
      }).details,
    ).toEqual({ field: 'AI', prior_experience: '없음', weekly_hours: 10 });

    expect(
      validateReviewCreate({ ...validBase, review_type: 'extracurricular', details: { region: '싱가포르', selection_process: '서류+면접' } })
        .details,
    ).toEqual({ region: '싱가포르', selection_process: '서류+면접' });

    expect(() => validateReviewCreate({ ...validBase, details: [] })).toThrow(ValidationError);
  });

  it('details가 배열이 아닌 JSON 객체여야 한다', () => {
    expect(() => validateReviewCreate({ ...validBase, details: 'x' })).toThrow(ValidationError);
  });

  it('NUL, 고립 surrogate, 허용되지 않은 제어 문자를 DB 전에 거부한다', () => {
    expect(() => validateReviewCreate({ ...validBase, title: 'bad\u0000text' })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, title: 'bad\ud800text' })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, body: 'bad\u0001text' })).toThrow(ValidationError);
    expect(validateReviewCreate({ ...validBase, body: 'first line\nsecond line' }).body).toBe('first line\nsecond line');
  });

  it('details는 prototype 체인의 키를 허용 목록으로 취급하지 않는다', () => {
    expect(() => validateReviewCreate({ ...validBase, details: { constructor: 1 } })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, details: { toString: 1 } })).toThrow(ValidationError);
  });

  it('details의 길이를 PostgreSQL jsonb 출력 기준으로 검사한다', () => {
    const field = 'x'.repeat(1989);
    expect(() => validateReviewCreate({ ...validBase, review_type: 'research', details: { field } })).toThrow(ValidationError);
  });

  it('author_id/is_demo를 클라이언트가 지정하면 거부한다', () => {
    expect(() => validateReviewCreate({ ...validBase, author_id: 'someone-else' })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, is_demo: true })).toThrow(ValidationError);
    expect(() => validateReviewCreate({ ...validBase, isDemo: true })).toThrow(ValidationError);
  });

  it('본문이 JSON 객체가 아니면 거부한다', () => {
    expect(() => validateReviewCreate(null)).toThrow(ValidationError);
    expect(() => validateReviewCreate([])).toThrow(ValidationError);
    expect(() => validateReviewCreate('x')).toThrow(ValidationError);
  });
});

describe('validateReviewUpdate', () => {
  it('보낸 필드만 갱신 대상에 포함한다', () => {
    const result = validateReviewUpdate({ title: '새 제목' }, 'contest');
    expect(result).toEqual({ title: '새 제목' });
  });

  it('빈 patch는 거부한다', () => {
    expect(() => validateReviewUpdate({}, 'contest')).toThrow(ValidationError);
  });

  it('review_type을 바꾸지 않고 details만 보내면 현재 유형 기준으로 검증한다', () => {
    expect(() => validateReviewUpdate({ details: { team_size: 2 } }, 'contest')).not.toThrow();
    expect(() => validateReviewUpdate({ details: { field: 'x' } }, 'contest')).toThrow(ValidationError);
  });

  it('review_type과 details를 함께 바꾸면 새 유형 기준으로 검증한다', () => {
    const result = validateReviewUpdate({ review_type: 'research', details: { field: 'AI' } }, 'contest');
    expect(result).toEqual({ reviewType: 'research', details: { field: 'AI' } });
  });

  it('유형만 바꾸면 저장된 details도 새 유형으로 검증한다', () => {
    expect(() => validateReviewUpdate({ review_type: 'research' }, 'contest', { team_size: 3 })).toThrow(ValidationError);
    expect(validateReviewUpdate({ review_type: 'research' }, 'contest', {})).toEqual({ reviewType: 'research' });
  });

  it('author_id/is_demo 변경 시도를 거부한다', () => {
    expect(() => validateReviewUpdate({ is_demo: true }, 'contest')).toThrow(ValidationError);
    expect(() => validateReviewUpdate({ author_id: 'x' }, 'contest')).toThrow(ValidationError);
  });
});
