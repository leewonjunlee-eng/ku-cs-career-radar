'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TeamManager } from './team-manager';
import { label, requestStatusLabels, teamStatusLabels } from '@/lib/teams/labels';

type Activity = { bookmarks: { opportunityId: string; title: string; organization: string }[]; teams: { id: string; opportunityId: string; name: string; status: string; isOwner?: boolean }[]; teamRequests: { id: string; teamId: string; opportunityId: string; teamName: string; status: string }[] };

export function MyActivity() {
  const [activity, setActivity] = useState<Activity | null>(null); const [error, setError] = useState<string | null>(null); const [contacts, setContacts] = useState<Record<string, string>>({});
  useEffect(() => { void (async () => { try { const response = await fetch('/api/me', { cache: 'no-store' }); if (!response.ok) throw new Error(); setActivity(await response.json() as Activity); } catch { setError('내 활동을 불러오지 못했습니다.'); } })(); }, []);
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!activity) return <p className="text-sm text-slate-500">내 활동을 불러오는 중…</p>;
  async function reload() { setActivity(null); const response = await fetch('/api/me', { cache: 'no-store' }); if (!response.ok) throw new Error(); setActivity(await response.json() as Activity); }
  async function cancel(teamId: string, requestId: string) { try { const response = await fetch(`/api/teams/${teamId}/requests/${requestId}`, { method: 'DELETE' }); if (!response.ok) throw new Error(); await reload(); } catch { setError('신청을 취소하지 못했습니다.'); } }
  async function contact(teamId: string) { try { const response = await fetch(`/api/teams/${teamId}/contact`, { cache: 'no-store' }); if (!response.ok) throw new Error(); const data = await response.json() as { contactLink: string }; setContacts((current) => ({ ...current, [teamId]: data.contactLink })); } catch { setError('팀 연락 링크를 불러오지 못했습니다.'); } }
  return <div className="space-y-5"><div className="grid gap-5 md:grid-cols-3"><section><h2 className="font-semibold">스크랩한 공고</h2>{activity.bookmarks.length ? <ul className="mt-2 space-y-1 text-sm">{activity.bookmarks.map((item) => <li key={item.opportunityId}><Link className="underline" href={`/opportunities/${item.opportunityId}`}>{item.title}</Link><span className="text-slate-500"> · {item.organization}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">아직 스크랩한 공고가 없습니다.</p>}</section><section><h2 className="font-semibold">참여 중인 팀</h2>{activity.teams.length ? <ul className="mt-2 space-y-2 text-sm">{activity.teams.map((item) => <li key={item.id}><Link className="underline" href={`/opportunities/${item.opportunityId}`}>{item.name}</Link><span className="text-slate-500"> · {label(teamStatusLabels, item.status)}</span><button onClick={() => void contact(item.id)} className="ml-2 underline">연락 링크 보기</button>{contacts[item.id] && <a className="ml-2 underline" target="_blank" rel="noreferrer" href={contacts[item.id]}>링크 열기</a>}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">아직 참여 중인 팀이 없습니다.</p>}</section><section><h2 className="font-semibold">보낸 참여 신청</h2>{activity.teamRequests.length ? <ul className="mt-2 space-y-2 text-sm">{activity.teamRequests.map((item) => <li key={item.id}><Link className="underline" href={`/opportunities/${item.opportunityId}`}>{item.teamName}</Link><span className="text-slate-500"> · {label(requestStatusLabels, item.status)}</span>{item.status === 'pending' && <button onClick={() => void cancel(item.teamId, item.id)} className="ml-2 underline">신청 취소</button>}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">보낸 참여 신청이 없습니다.</p>}</section></div><TeamManager teams={activity.teams} reload={reload} /></div>;
}
