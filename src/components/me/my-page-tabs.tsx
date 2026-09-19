'use client';

import { useState } from 'react';
import { MyActivity } from '@/components/me/activity';
import { PointShop } from '@/components/me/point-shop';
import { ProfileForm } from '@/components/me/profile-form';
import { MyReviews } from '@/components/reviews/my-reviews';

type SubjectOption = { id: string; name: string };

export function MyPageTabs({ subjects }: { subjects: SubjectOption[] }) {
  const [tab, setTab] = useState<'activity' | 'shop'>('activity');
  return <>
    <div role="tablist" aria-label="마이페이지 메뉴" className="flex border-b border-slate-200">
      <button role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')} className={`px-4 py-3 text-sm font-semibold ${tab === 'activity' ? 'border-b-2 border-primary text-primary' : 'text-slate-600'}`}>내 활동</button>
      <button role="tab" aria-selected={tab === 'shop'} onClick={() => setTab('shop')} className={`px-4 py-3 text-sm font-semibold ${tab === 'shop' ? 'border-b-2 border-primary text-primary' : 'text-slate-600'}`}>포인트샵</button>
    </div>
    {tab === 'activity' ? <div className="space-y-8 pt-2"><section className="space-y-3"><h2 className="text-lg font-semibold">프로필</h2><ProfileForm /></section><MyActivity /><section className="space-y-3"><h2 className="text-lg font-semibold">내가 쓴 후기</h2><MyReviews subjects={subjects} /></section></div> : <div className="pt-5"><PointShop /></div>}
  </>;
}
