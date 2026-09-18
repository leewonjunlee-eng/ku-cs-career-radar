'use client';

import { useEffect, useState } from 'react';

export function ProfileForm() {
  const [displayName, setDisplayName] = useState(''); const [loaded, setLoaded] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { void (async () => { try { const response = await fetch('/api/me/profile', { cache: 'no-store' }); if (!response.ok) throw new Error(); setDisplayName((await response.json() as { displayName: string }).displayName); } catch { setMessage('Profile could not be loaded.'); } finally { setLoaded(true); } })(); }, []);
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); setMessage(null); try { const response = await fetch('/api/me/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: displayName }) }); if (!response.ok) { const body = await response.json().catch(() => null) as { error?: { message?: string } } | null; throw new Error(body?.error?.message ?? 'Profile could not be saved.'); } setMessage('Saved.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Profile could not be saved.'); } finally { setSaving(false); } }
  return <form onSubmit={save} className="flex flex-wrap items-end gap-2"><label className="text-sm">Display name<input disabled={!loaded || saving} required maxLength={50} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2" /></label><button disabled={!loaded || saving} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Save</button>{message && <p role="status" className="text-sm text-slate-600">{message}</p>}</form>;
}
