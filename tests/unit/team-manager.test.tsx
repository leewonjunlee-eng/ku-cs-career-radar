import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TeamManager } from '@/components/me/team-manager';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const team = {
  id: 't1', opportunityId: 'o1', name: '원래 팀', status: 'open', isOwner: true,
  introduction: '소개', roles: ['FE'], skills: ['React'],
};

describe('TeamManager 수정 폼', () => {
  it('현재 값을 채우고 이름·역할·스킬을 PATCH로 보내며 비운 연락 링크는 보내지 않는다', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const reload = vi.fn(async () => {});
    render(<TeamManager teams={[team]} reload={reload} />);

    fireEvent.click(screen.getByRole('button', { name: '팀 정보 수정' }));
    const name = screen.getByLabelText('팀 이름') as HTMLInputElement;
    expect(name.value).toBe('원래 팀');
    expect((screen.getByLabelText('모집 역할 (쉼표로 구분)') as HTMLInputElement).value).toBe('FE');

    fireEvent.change(name, { target: { value: '새 팀' } });
    fireEvent.change(screen.getByLabelText('모집 역할 (쉼표로 구분)'), { target: { value: 'FE, BE ,' } });
    fireEvent.change(screen.getByLabelText('기술 스택 (쉼표로 구분)'), { target: { value: 'Next.js' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('/api/teams/t1', expect.objectContaining({ method: 'PATCH' }));
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual({ name: '새 팀', introduction: '소개', roles: ['FE', 'BE'], skills: ['Next.js'] });
    expect(screen.queryByLabelText('팀 이름')).toBeNull();
  });

  it('서버 오류 메시지를 보여주고 폼을 유지한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":{"message":"name is required"}}', { status: 400 })));
    render(<TeamManager teams={[team]} reload={vi.fn(async () => {})} />);

    fireEvent.click(screen.getByRole('button', { name: '팀 정보 수정' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('alert')).textContent).toContain('name is required');
    expect(screen.getByLabelText('팀 이름')).toBeTruthy();
  });
});
