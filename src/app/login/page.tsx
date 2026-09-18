'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setMessage('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    if (password.length < 8) {
      setMessage('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await createBrowserClient().auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) setMessage('이메일 또는 비밀번호를 확인해주세요.');
      else window.location.assign('/');
    } catch {
      setMessage('로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">로그인</h1>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="block space-y-1 text-sm">
          <span>이메일</span>
          <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border p-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>비밀번호</span>
          <input required type="password" minLength={8} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md border p-2" />
        </label>
        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
        <button disabled={busy} className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50" type="submit">
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        계정이 없나요? <Link className="underline" href="/signup">가입하기</Link>
      </p>
    </div>
  );
}
