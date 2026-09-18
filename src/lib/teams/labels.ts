/** 화면 표시용 팀·참여 신청 상태 라벨. DB 값은 영어 enum 그대로 둔다. */
export const teamStatusLabels: Record<string, string> = { open: '모집 중', closed: '모집 마감' };

export const requestStatusLabels: Record<string, string> = {
  pending: '대기 중',
  accepted: '수락됨',
  rejected: '거절됨',
  cancelled: '취소됨',
};

export const label = (labels: Record<string, string>, value: string) => labels[value] ?? value;
