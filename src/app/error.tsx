'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // 서버 콘솔에만 남기고 사용자에게는 원인을 노출하지 않는다.
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">문제가 발생했습니다</h1>
      <p className="text-sm text-slate-600">잠시 후 다시 시도해 주세요.</p>
      <button
        type="button"
        onClick={reset}
        className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
      >
        다시 시도
      </button>
    </div>
  );
}
