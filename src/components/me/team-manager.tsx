'use client';

import { useState } from 'react';

type Team = { id: string; opportunityId: string; name: string; status: string; isOwner?: boolean; introduction?: string | null; roles?: string[]; skills?: string[] };
type EditForm = { name: string; introduction: string; roles: string; skills: string; contactLink: string };
const list = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const input = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2';
type Request = { id: string; displayName: string; message: string | null; status: string };

export function TeamManager({ teams, reload }: { teams: Team[]; reload: () => Promise<void> }) {
  const [requests, setRequests] = useState<Record<string, Request[]>>({}); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
  async function load(teamId: string) { try { const response = await fetch(`/api/teams/${teamId}/requests`, { cache: 'no-store' }); if (!response.ok) throw new Error(); const data = await response.json() as { items: Request[] }; setRequests((current) => ({ ...current, [teamId]: data.items })); } catch { setError('Requests could not be loaded.'); } }
  async function decide(teamId: string, requestId: string, action: 'accept' | 'reject') { setBusy(requestId); setError(null); try { const response = await fetch(`/api/teams/${teamId}/requests/${requestId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }); if (!response.ok) throw new Error(); await load(teamId); await reload(); } catch { setError('Request could not be updated. Refresh and try again.'); } finally { setBusy(null); } }
  async function close(teamId: string) { if (!window.confirm('Close this team? It cannot be reopened.')) return; setBusy(teamId); try { const response = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' }); if (!response.ok) throw new Error(); await reload(); } catch { setError('Team could not be closed.'); } finally { setBusy(null); } }
  const [editing, setEditing] = useState<{ teamId: string; form: EditForm } | null>(null);
  function startEdit(team: Team) {
    setError(null);
    setEditing({ teamId: team.id, form: { name: team.name, introduction: team.introduction ?? '', roles: (team.roles ?? []).join(', '), skills: (team.skills ?? []).join(', '), contactLink: '' } });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const { teamId, form } = editing;
    setBusy(teamId); setError(null);
    try {
      // 연락 링크는 현재 값을 내려받지 않으므로(비공개) 비워 두면 유지한다.
      const body: Record<string, unknown> = { name: form.name, introduction: form.introduction.trim() || null, roles: list(form.roles), skills: list(form.skills) };
      if (form.contactLink.trim()) body.contact_link = form.contactLink.trim();
      const response = await fetch(`/api/teams/${teamId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { const data = await response.json().catch(() => null) as { error?: { message?: string } } | null; throw new Error(data?.error?.message ?? 'Team details could not be updated.'); }
      setEditing(null);
      await reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Team details could not be updated.'); } finally { setBusy(null); }
  }
  const field = (key: keyof EditForm) => ({ value: editing?.form[key] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditing((current) => current && { ...current, form: { ...current.form, [key]: e.target.value } }) });
  const owned = teams.filter((team) => team.isOwner);
  if (!owned.length) return null;
  return <section className="space-y-3"><h2 className="text-lg font-semibold">Manage teams</h2>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<ul className="space-y-3">{owned.map((team) => <li key={team.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{team.name} · {team.status}</span><div className="flex gap-2"><button type="button" onClick={() => (editing?.teamId === team.id ? setEditing(null) : startEdit(team))} className="rounded-md border px-2 py-1 text-sm">{editing?.teamId === team.id ? 'Cancel edit' : 'Edit'}</button><button type="button" onClick={() => void load(team.id)} className="rounded-md border px-2 py-1 text-sm">View requests</button>{team.status === 'open' && <button disabled={busy === team.id} type="button" onClick={() => void close(team.id)} className="rounded-md border border-red-300 px-2 py-1 text-sm text-red-700">Close</button>}</div></div>{editing?.teamId === team.id && <form onSubmit={save} aria-label={`${team.name} 수정`} className="mt-3 grid gap-3 border-t border-slate-200 pt-3 text-sm sm:grid-cols-2"><label>팀 이름<input required maxLength={50} className={input} {...field('name')} /></label><label>연락 링크 (비워 두면 유지)<input type="url" placeholder="https://" className={input} {...field('contactLink')} /></label><label className="sm:col-span-2">소개<textarea maxLength={5000} rows={3} className={input} {...field('introduction')} /></label><label>모집 역할 (쉼표로 구분)<input className={input} placeholder="FE, 디자이너" {...field('roles')} /></label><label>기술 스택 (쉼표로 구분)<input className={input} placeholder="React, Figma" {...field('skills')} /></label><div className="flex gap-2 sm:col-span-2"><button disabled={busy === team.id} className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover disabled:opacity-50">{busy === team.id ? '저장 중…' : '저장'}</button><button type="button" onClick={() => setEditing(null)} className="rounded-md border px-4 py-2">취소</button></div></form>}{requests[team.id] && <ul className="mt-3 space-y-2 text-sm">{requests[team.id].length ? requests[team.id].map((request) => <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><span>{request.displayName}{request.message ? ` - ${request.message}` : ''} <em className="text-slate-500">({request.status})</em></span>{request.status === 'pending' && <span className="flex gap-1"><button disabled={busy === request.id} onClick={() => void decide(team.id, request.id, 'accept')} className="rounded-md border px-2 py-1">Accept</button><button disabled={busy === request.id} onClick={() => void decide(team.id, request.id, 'reject')} className="rounded-md border px-2 py-1">Reject</button></span>}</li>) : <li>No requests.</li>}</ul>}</li>)}</ul></section>;
}
