'use client';

import { useEffect, useState } from 'react';

export function BookmarkButton({ opportunityId, signedIn }: { opportunityId: string; signedIn: boolean }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(signedIn);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    void (async () => { try { const response = await fetch(`/api/opportunities/${opportunityId}/bookmark`, { cache: 'no-store' }); if (response.ok) setBookmarked((await response.json() as { bookmarked: boolean }).bookmarked); } catch { setError('스크랩 상태를 불러오지 못했습니다.'); } finally { setLoading(false); } })();
  }, [opportunityId, signedIn]);
  if (!signedIn) return <a href="/login" className="text-sm underline">로그인하고 스크랩하기</a>;
  async function toggle() {
    setLoading(true); setError(null);
    try { const response = await fetch(`/api/opportunities/${opportunityId}/bookmark`, { method: bookmarked ? 'DELETE' : 'POST' }); if (!response.ok) throw new Error(); setBookmarked(!bookmarked); }
    catch { setError('스크랩을 변경하지 못했습니다. 다시 시도해 주세요.'); } finally { setLoading(false); }
  }
  return <div className="space-y-1"><button type="button" disabled={loading} onClick={() => void toggle()} className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-50">{bookmarked ? '스크랩 취소' : '스크랩'}</button>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}</div>;
}
