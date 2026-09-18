'use client';

import { useEffect, useState } from 'react';

export function ProfileForm() {
  const [displayName, setDisplayName] = useState(''); const [loaded, setLoaded] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { void (async () => { try { const response = await fetch('/api/me/profile', { cache: 'no-store' }); if (!response.ok) throw new Error(); setDisplayName((await response.json() as { displayName: string }).displayName); } catch { setMessage('프로필을 불러오지 못했습니다.'); } finally { setLoaded(true); } })(); }, []);
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); setMessage(null); try { const response = await fetch('/api/me/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: displayName }) }); if (!response.ok) { const body = await response.json().catch(() => null) as { error?: { message?: string } } | null; throw new Error(body?.error?.message ?? '프로필을 저장하지 못했습니다.'); } setMessage('저장했습니다.'); } catch (error) { setMessage(error instanceof Error ? error.message : '프로필을 저장하지 못했습니다.'); } finally { setSaving(false); } }
  return <form onSubmit={save} className="flex flex-wrap items-end gap-2"><label className="text-sm">닉네임<input disabled={!loaded || saving} required maxLength={50} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2" /></label><button disabled={!loaded || saving} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">저장</button>{message && <p role="status" className="text-sm text-slate-600">{message}</p>}</form>;
}
