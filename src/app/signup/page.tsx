'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { getAuthEmailRedirectOrigin } from '@/lib/auth/redirect';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedDisplayName = displayName.trim();
    if (!normalizedDisplayName) {
      setMessage('닉네임을 입력해주세요.');
      return;
    }
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
      const { data, error } = await createBrowserClient().auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { display_name: normalizedDisplayName },
          emailRedirectTo: getAuthEmailRedirectOrigin(),
        },
      });
      if (error) setMessage('가입할 수 없습니다. 입력값을 확인해주세요.');
      else if (data.session) window.location.assign('/');
      else setMessage('가입이 완료되었습니다. 이메일 확인 링크를 열어 로그인해주세요.');
    } catch {
      setMessage('가입 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">가입</h1>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="block space-y-1 text-sm">
          <span>닉네임</span>
          <input required maxLength={50} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="w-full rounded-md border p-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>이메일</span>
          <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border p-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>비밀번호</span>
          <input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md border p-2" />
        </label>
        {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
        <button disabled={busy} className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50" type="submit">
          {busy ? '가입 중…' : '가입하기'}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        이미 계정이 있나요? <Link className="underline" href="/login">로그인</Link>
      </p>
    </div>
  );
}
