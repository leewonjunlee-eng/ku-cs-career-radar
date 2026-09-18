'use client';

import { useEffect, useState } from 'react';

export function BookmarkButton({ opportunityId, signedIn }: { opportunityId: string; signedIn: boolean }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(signedIn);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    void (async () => { try { const response = await fetch(`/api/opportunities/${opportunityId}/bookmark`, { cache: 'no-store' }); if (response.ok) setBookmarked((await response.json() as { bookmarked: boolean }).bookmarked); } catch { setError('Bookmark status could not be loaded.'); } finally { setLoading(false); } })();
  }, [opportunityId, signedIn]);
  if (!signedIn) return <a href="/login" className="text-sm underline">Sign in to bookmark</a>;
  async function toggle() {
    setLoading(true); setError(null);
    try { const response = await fetch(`/api/opportunities/${opportunityId}/bookmark`, { method: bookmarked ? 'DELETE' : 'POST' }); if (!response.ok) throw new Error(); setBookmarked(!bookmarked); }
    catch { setError('Bookmark could not be updated.'); } finally { setLoading(false); }
  }
  return <div className="space-y-1"><button type="button" disabled={loading} onClick={() => void toggle()} className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-50">{bookmarked ? 'Remove bookmark' : 'Bookmark'}</button>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}</div>;
}
