import type { ReactNode } from 'react';

/**
 * 아직 구현하지 않은 기능을 동작 중으로 표시하지 않기 위한 공통 안내.
 * 화면 자체는 실제 데이터에 연결됐어도, 이 안내가 가리키는 세부 기능만
 * 뒷 단계로 미뤄졌을 수 있다(예: 태그 필터는 9단계).
 */
export function UnavailableNotice({ children }: { children: ReactNode }) {
  return (
    <p
      // role="note" 는 라이브 리전이 아니다. 정적 안내를 status 로 두면
      // 화면 낭독기가 페이지 진입 시 모든 안내를 한꺼번에 읽는다.
      role="note"
      className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <strong className="font-semibold">{children}</strong> 기능은 아직 구현되지
      않았습니다.
    </p>
  );
}
