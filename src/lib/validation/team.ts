import { ValidationError, requireHttpUrl, requireText, requireTextArray, requireUuid } from './common';

export type TeamCreateInput = {
  opportunityId: string;
  name: string;
  introduction: string | null;
  maxMembers: number;
  roles: string[];
  skills: string[];
  contactLink: string;
};

function optionalText(value: unknown, field: string, maximum: number) {
  if (value === null || value === undefined || value === '') return null;
  return requireText(value, field, maximum);
}

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('요청 본문은 JSON 객체여야 합니다.');
  }
  return value as Record<string, unknown>;
}

export function validateTeamCreate(value: unknown): TeamCreateInput {
  const body = object(value);
  const maxMembers = body.max_members;
  if (!Number.isInteger(maxMembers) || (maxMembers as number) < 2 || (maxMembers as number) > 10) {
    throw new ValidationError('최대 인원은 2~10명이어야 합니다.', 'max_members');
  }
  return {
    opportunityId: requireUuid(body.opportunity_id, 'opportunity_id'),
    name: requireText(body.name, 'name', 50),
    introduction: optionalText(body.introduction, 'introduction', 5000),
    maxMembers: maxMembers as number,
    roles: requireTextArray(body.roles ?? [], 'roles', 10, 30),
    skills: requireTextArray(body.skills ?? [], 'skills', 20, 30),
    contactLink: requireHttpUrl(body.contact_link, 'contact_link'),
  };
}

export function validateTeamRequest(value: unknown) {
  const body = object(value);
  return { message: optionalText(body.message, 'message', 500) };
}

export function validateTeamEdit(value: unknown) {
  const body = object(value);
  const result: { name?: string; introduction?: string | null; roles?: string[]; skills?: string[]; contactLink?: string } = {};
  if ('name' in body) result.name = requireText(body.name, 'name', 50);
  if ('introduction' in body) result.introduction = optionalText(body.introduction, 'introduction', 5000);
  if ('roles' in body) result.roles = requireTextArray(body.roles, 'roles', 10, 30);
  if ('skills' in body) result.skills = requireTextArray(body.skills, 'skills', 20, 30);
  if ('contact_link' in body) result.contactLink = requireHttpUrl(body.contact_link, 'contact_link');
  if (Object.keys(result).length === 0) throw new ValidationError('수정할 값이 없습니다.');
  return result;
}

export function validateRequestAction(value: unknown): 'accept' | 'reject' {
  const body = object(value);
  if (body.action !== 'accept' && body.action !== 'reject') throw new ValidationError('처리 방식은 수락 또는 거절이어야 합니다.', 'action');
  return body.action;
}
