import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-slate-600">요청한 공고나 페이지가 존재하지 않거나 삭제되었습니다.</p>
      <Link href="/" className="inline-block text-sm text-sky-700 underline">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
