'use client';

import { useEffect, useState } from 'react';

type Summary = { points: number; reviewAccessUntil: string | null };

const products = [
  { id: 'review_access_30', days: 30, cost: 35 },
  { id: 'review_access_90', days: 90, cost: 55 },
  { id: 'review_access_180', days: 180, cost: 75 },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(value));
}

export function PointShop() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { void (async () => {
    const response = await fetch('/api/me/points', { cache: 'no-store' });
    if (response.ok) setSummary(await response.json() as Summary);
  })(); }, []);

  async function buy(product: typeof products[number]['id']) {
    setBusy(product); setMessage(null);
    try {
      const response = await fetch('/api/me/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product }) });
      const body = await response.json() as Summary | { error?: { message?: string } };
      if (!response.ok) throw new Error('error' in body ? body.error?.message : undefined);
      setSummary(body as Summary);
      setMessage('열람권을 구매했습니다.');
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : '구매하지 못했습니다.');
    } finally { setBusy(null); }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-950">포인트 안내</p>
        <p className="mt-1 text-sm text-amber-900">후기 작성 1건당 15P를 얻습니다. 현재는 열람권이 없어도 모든 후기를 자유롭게 볼 수 있습니다.</p>
        <p className="mt-3 text-lg font-bold text-slate-900">보유 포인트 {summary?.points ?? '…'}P</p>
        {summary?.reviewAccessUntil && <p className="mt-1 text-sm text-slate-700">보유 열람권 만료일: {formatDate(summary.reviewAccessUntil)}</p>}
      </div>
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {products.map((product) => <article key={product.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div><h3 className="font-semibold text-slate-900">후기 열람권</h3><p className="text-sm text-slate-600">{product.days}일</p></div>
          <p className="text-lg font-bold text-primary">{product.cost}P</p>
          <button type="button" disabled={busy !== null || (summary?.points ?? 0) < product.cost} onClick={() => void buy(product.id)} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{busy === product.id ? '구매 중…' : '구매하기'}</button>
        </article>)}
      </div>
    </section>
  );
}
