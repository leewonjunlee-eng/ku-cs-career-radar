/**
 * "이번 방학 때 뭐할까?" 안내 데이터. 작년 운영 이력을 근거로 한 예정 정보이며 올해 확정이 아니다.
 * 각 항목은 작년 원문(기준 연도·게시일)을 반드시 가진다. 근거 확인: 2026-09-19.
 */
export type VacationProgram = {
  name: string;
  host: string;
  /** 올해 예상 시기. 항상 "예정"으로만 표시한다. */
  expected: string;
  /** 작년 운영 근거 요약 (기준 연도 포함). */
  lastYear: string;
  sourceUrl: string;
  prepare: string[];
  tags: string[];
};

export type VacationSection = { title: string; description: string; programs: VacationProgram[] };

const GLDC = 'https://gldc.korea.ac.kr/gldc/community/notice.do?mode=view&articleNo=';
const FIELD = 'https://internship.korea.ac.kr/internship/notice/common-notice.do?mode=view&articleNo=';
const KUAI = 'https://ku-ai.korea.ac.kr/swuniv/community/';

export const vacationSections: VacationSection[] = [
  {
    title: '겨울방학 (2026.12 ~ 2027.2)',
    description: '대부분 가을학기 중(9~12월)에 지원을 받습니다. 지금부터 준비하세요.',
    programs: [
      {
        name: 'KU-GLP 겨울 (단기 집중 언어·문화 연수)',
        host: '고려대 글로벌리더십센터',
        expected: '9월 말 이후 모집 공고 예정',
        lastYear: '2025년: 9/12 모집 공고 (독일·라틴아메리카·일본·프랑스). 올해는 "9/22 이후 게시 예정" 안내가 올라와 있음.',
        sourceUrl: `${GLDC}782738`,
        prepare: ['공인 어학성적 (조건은 직전 학기 공고와 동일하다고 안내됨)', '7~8주 연수 기간 일정 확보', '지원서 작성'],
        tags: ['해외', '어학', '장학'],
      },
      {
        name: 'WFUNA 유엔본부 한국대학생 대표단',
        host: '고려대 글로벌리더십센터',
        expected: '9월 모집, 1월 말 뉴욕 파견 예정',
        lastYear: '2025년: 9/11 공고, 서류 9/22 마감, 2026.1.25~1.31 뉴욕 유엔본부 파견 (7명 선발).',
        sourceUrl: `${GLDC}782651`,
        prepare: ['영어 공인성적 및 관련 자격증', '지원서 (쿠카이브 접수)', '참가교육비'],
        tags: ['해외', '국제기구'],
      },
      {
        name: '겨울계절학기 학점인정형 인턴십 (현장실습)',
        host: '고려대 현장실습지원센터',
        expected: '10월 말 설명회, 11월 전후 신청 예정',
        lastYear: '2025년: 10/30 겨울계절학기 학점인정형 인턴십 설명회 개최.',
        sourceUrl: `${FIELD}784197`,
        prepare: ['4학기 이상 이수 (1학기 공고 기준 신청 자격)', '현장실습 교과목 수강 신청', '현장실습 온라인 시스템에서 참여 기업 확인'],
        tags: ['인턴', '학점'],
      },
      {
        name: 'LG Aimers (AI 교육 + 해커톤)',
        host: 'LG AI연구원 (SW중심대학협의회 안내)',
        expected: '12월 모집 예정',
        lastYear: '2025년: 12/11 8기 모집 안내, 12/18 접수 마감.',
        sourceUrl: `${KUAI}event.do?mode=view&articleNo=788111`,
        prepare: ['Python·머신러닝 기초', '겨울방학 온라인 교육 시간 확보'],
        tags: ['AI', '교육', '해커톤'],
      },
      {
        name: 'KOTRA 해외무역관 현장실습 (상반기)',
        host: 'KOTRA · 고려대 글로벌리더십센터',
        expected: '12월 모집 공고 예정',
        lastYear: '2025년: 12/11 "2026년 상반기 KOTRA 해외무역관 현장실습제도" 공고.',
        sourceUrl: `${GLDC}788121`,
        prepare: ['어학 성적', '해외 체류 가능 일정'],
        tags: ['해외', '인턴'],
      },
    ],
  },
  {
    title: '겨울방학에 지원하는 다음 학기 프로그램',
    description: '방학 중에 신청해 1학기(3~6월)에 참여합니다.',
    programs: [
      {
        name: 'KIST 유럽연구소 해외인턴십 (1학기 파견)',
        host: '고려대 글로벌리더십센터',
        expected: '가을 모집, 2월 독일 출국 예정',
        lastYear: '2025년: 10/24 공고, 2026.2.20~8.7 파견. 올해는 9월에 2027-1학기 모집 공고가 올라옴.',
        sourceUrl: `${GLDC}785074`,
        prepare: ['독일 비자 (선발 직후 개별 진행)', '연구소 모집 분야별 전공 역량', '어학 성적'],
        tags: ['연구', '해외', '인턴'],
      },
      {
        name: '현장실습학기제 (1학기 4~6개월)',
        host: '고려대 현장실습지원센터',
        expected: '1월 참여 학생 모집 예정',
        lastYear: '2026년 1학기 기준: 1/22 공고, 학생 신청 ~2월 초, 선발 2/13, 실습 3/3~6/30.',
        sourceUrl: `${FIELD}799173`,
        prepare: ['4학기 이상 이수', '현장실습 교과목 학점인정 신청', '1/5 전후 공개되는 참여 기업 목록 확인'],
        tags: ['인턴', '학점'],
      },
      {
        name: '한미대학생 연수 (WEST)',
        host: '한미 정부 협정 · 고려대 국제교류팀',
        expected: '2월 모집 공고 예정',
        lastYear: '2026년 상반기: 2/12 공고, 월드잡플러스 지원 3/18 17:00 마감.',
        sourceUrl: `${GLDC}801990`,
        prepare: ['국내 정기시험 어학성적 (마감일 기준 2년 이내)', '지원 서류 ZIP 제출'],
        tags: ['해외', '어학', '인턴'],
      },
      {
        name: '산학협력프로젝트 학부연구생',
        host: '고려대 AI중심대학사업단',
        expected: '개강 직후(3월) 모집 예정',
        lastYear: '2026년 1학기: 3/16 모집 공고, 3/30 17:00 마감 (지도교수 서명 필수). 2학기는 9월 모집.',
        sourceUrl: `${KUAI}news.do?mode=view&articleNo=803126`,
        prepare: ['함께할 지도교수와 미리 상의', '관심 산학 과제 정리'],
        tags: ['연구', '산학협력'],
      },
    ],
  },
  {
    title: '내년 여름방학 미리 보기',
    description: '봄학기 초에 모집합니다. 겨울방학 동안 준비해 두면 좋습니다.',
    programs: [
      {
        name: 'KU Silicon Valley 해외 단기 현장실습',
        host: '고려대 AI중심대학사업단',
        expected: '3~4월 모집 예정',
        lastYear: '2025년: 4/3 공고(4/11 마감), 2026년: 3/31 공고(4/10 마감).',
        sourceUrl: `${KUAI}event.do?mode=view&articleNo=805306`,
        prepare: ['영어 면접 대비', '개발 포트폴리오 (GitHub 등)'],
        tags: ['해외', '인턴', 'SW'],
      },
      {
        name: 'KU-GLP 여름',
        host: '고려대 글로벌리더십센터',
        expected: '3월 모집 공고 예정',
        lastYear: '2026년: 3/20 여름 KU-GLP(독일·영국·호주·덴마크·미국·프랑스) 모집 공고.',
        sourceUrl: `${GLDC}804404`,
        prepare: ['공인 어학성적', '여름방학 7~8주 일정 확보'],
        tags: ['해외', '어학', '장학'],
      },
    ],
  },
];
