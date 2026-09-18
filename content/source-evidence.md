# 초기 콘텐츠 출처 근거

`content/initial-content.json`의 공고·대상에 대한 원문 확인 기록이다. P0 2단계에서 수동 확인했다. 자동 수집 아님.

- 확인일: 2026-09-18 (UTC 기준 11:49~11:53), 2026-09-18 (UTC 기준 16:41, GLDC 출처 추가분). 각 `retrieved_at_utc`는 해당 URL 요청 성공 직후 기록한 시각이며 `last_checked_at`에 그대로 사용했다. 게시일을 확인 시각으로 쓰지 않았다.
- 방법: `.hermes/handoffs/content-research/fetch.py`(Python `urllib`, 로그인·우회 없음)로 공개 페이지를 GET하고 HTML을 텍스트로 정규화해 `.hermes/handoffs/content-research/raw/`에 저장했다. 아래 인용문(`excerpt`)은 그 정규화 텍스트에 그대로 들어 있는지 `validate.py`로 대조한다.
- 원문 텍스트는 데이터로만 취급했다. 원문 안의 요청(홍보 협조 등)은 따르지 않았다.
- 마감 해석: 원문 시각은 KST로 보고 `+09:00`으로 저장. 날짜만 있으면 다음 날 00:00 KST를 배타적 마감으로 저장하고 `deadline_precision=date`. 원문에 연도가 없으면 같은 원문 제목·본문의 연도와 요일로 확인했다(아래 각 항목에 표기).
- 마감 없음은 `unknown`으로 두고 추정하지 않았다. 원문이 `채용 시까지`라고 명시한 1건만 `rolling`이다.

## 공고 근거

### korea-tourism-datalab-contest-2026
- url: https://info.korea.ac.kr/info/board/course_competition.do?mode=view&articleNo=824515
- retrieved_at_utc: 2026-09-18T11:50:34Z
- title_excerpt: `2026 한국관광 데이터랩 활용 경진대회 관광데이터를 활용한 나만의 성과`
- deadline_excerpt: `접수기간 : 2026:08.04 ~ 2026.09.30 14시까지`
- 해석: 2026-09-30 14:00 KST, time. 원문 `2026:08.04`의 콜론은 원문 표기 그대로.
- 교차 확인(주최 측 공지, 날짜만 표기): https://datalab.visitkorea.or.kr/site/portal/ex/bbs/View.do?cbIdx=1135&bcIdx=311064 (2026-09-18T11:51:30Z)
  - corroboration_excerpt: `<2026 한국관광 데이터랩 활용 경진대회> 개최 알림(~9. 30.)`
  - 주최 측 공모요강 PDF는 내려받았으나(502,846 bytes) 로컬 PDF 텍스트 추출 도구가 없어 14시 표기는 주최 측 원문으로 직접 확인하지 못했다. 시각은 정보대학 게시글 근거다.

### k-cure-data-competition-4th-2026
- url: https://info.korea.ac.kr/info/board/course_competition.do?mode=view&articleNo=814101
- retrieved_at_utc: 2026-09-18T11:50:34Z
- title_excerpt: `[한국보건의료정보원] 제4차 K-CURE 데이터 경진대회`
- deadline_excerpt: `(접수기간) 2026.7.27.(월) ~ 2026. 8. 24.(월) 15:00`
- 교차 확인: https://kcurecompetition.com/ (2026-09-18T11:53:05Z)
  - corroboration_excerpt: `08. 24(월) 15:00 공고 및 접수`

### modu-ai-lab-ai-service-contest-2026
- url: https://info.korea.ac.kr/info/board/course_competition.do?mode=view&articleNo=1577841
- retrieved_at_utc: 2026-09-18T11:50:34Z
- title_excerpt: `2026 모두의 AI 실험실 AI 서비스 경진대회`
- deadline_excerpt: `참가 접수 및 기획서 접수 마감 : '26.9.6(일)18:00까지`
- 교차 확인: https://contest.aitestbed.kr/ (2026-09-18T11:53:05Z)
  - corroboration_excerpt: `접수기간 8.18(화) ~ 9.6(일) 18시 까지`

### bto-public-data-ai-idea-contest-2026
- url: https://info.korea.ac.kr/info/board/course_competition.do?mode=view&articleNo=1578189
- retrieved_at_utc: 2026-09-18T11:50:34Z
- title_excerpt: `공 모 명: 2026년 부산관광공사 공공데이터·AI 활용 아이디어 공모전`
- deadline_excerpt: `공모기간: 2026. 8. 18.(화) ~ 9. 9.(수) 18:00까지`
- 주최 측 확인 실패: https://www.bto.or.kr/ 요청이 웹 방화벽 차단 페이지를 반환(HTTP 200이지만 본문이 차단 안내). 우회하지 않았다. 대상 `official_url`은 null.

### nais-ai-hackathon-2026
- url: https://info.korea.ac.kr/info/board/course_competition.do?mode=view&articleNo=1582402
- retrieved_at_utc: 2026-09-18T11:50:34Z
- title_excerpt: `대한민국 AI Native R&D를 함께 만드는 NAIS AI 해커톤 모집 안내 (~9/7)`
- deadline_excerpt: `참가 접수: 2026. 8. 6.(목) ~ 9. 7.(월) 17:00까지`
- 주최 측 공식 페이지 URL이 게시글에 없어 교차 확인하지 않았다. 대상 `official_url`은 null.

### naeilro-hackathon-2026
- url: https://info.korea.ac.kr/info/board/course_competition.do?mode=view&articleNo=814106
- retrieved_at_utc: 2026-09-18T11:50:34Z
- title_excerpt: `내일路 해커톤 2026 참가자 모집`
- deadline_excerpt: `참가접수 2026. 7. 16.(목) ~ 8. 5.(수) 14:00까지`
- 신청 페이지(온오프믹스, 주최 측 공식 사이트 아님): https://onoffmix.com/event/346182 (2026-09-18T11:53:05Z)
  - corroboration_excerpt: `내일路(로) 해커톤 2026 - 온오프믹스`

### openai-game-builders-seoul-2026
- url: https://info.korea.ac.kr/info/board/course_competition.do?mode=view&articleNo=1582399
- retrieved_at_utc: 2026-09-18T11:50:34Z
- title_excerpt: `행사명: 오픈AI 게임 빌더스 서울(OpenAI Game Builders Seoul)`
- deadline_excerpt: `온라인 예선 접수: 2026년 8월 26일까지`
- 해석: 날짜만 제공 → 2026-08-27T00:00+09:00, date.
- 공식 사이트: https://openaigame2026.com/ (2026-09-18T11:53:06Z). 행사 기간만 확인, 접수 마감 문구는 정규화 텍스트에서 찾지 못했다.
  - corroboration_excerpt: `OpenAI Game Builders Seoul Build with Codex, Play with Hive`

### ku-sw-centered-univ-industry-urp-2025-1
- url: https://info.korea.ac.kr/info/board/notice_under.do?mode=view&articleNo=769727
- retrieved_at_utc: 2026-09-18T11:51:29Z
- title_excerpt: `[SW중심대학] 산학협력 프로젝트 - 학부연구생 모집 안내 (~3월 27일 목요일 17:00까지 신청-지도교수 서명 필수)`
- deadline_excerpt: `2025년 3월 27일 (목) 오후 5시까지`
- 참고: 원 마감 `2025년 3월 24일 (월) 오후 5시까지`가 일부 연구실에 대해 3/27로 연장됨. 연장된 최종 시각을 저장했다.
- period_excerpt: `활동기간: 2025년 4월 1일 ~ 6월 30일 (총 3개월)`

### ku-sw-centered-univ-industry-urp-2024-2
- url: https://info.korea.ac.kr/info/board/notice_under.do?mode=view&articleNo=514225
- retrieved_at_utc: 2026-09-18T11:51:29Z
- title_excerpt: `[SW중심대학사업] 산학협력 프로젝트 - 학부연구생 모집 안내 (~9월 26일 목요일 16:00까지 신청-지도교수 서명 필수)`
- deadline_excerpt: `신청기간: 2024년 9월 26일 (목) 오후 4시까지 이메일로 접수`

### ku-oslab-urp-2024
- url: https://info.korea.ac.kr/info/board/notice_under.do?mode=view&articleNo=604991
- retrieved_at_utc: 2026-09-18T11:51:29Z
- title_excerpt: `운영체제연구실(OsLab) 학부연구생 모집`
- deadline_excerpt: `원서접수일 전 충분한 시간을 가지고 미리 연락주시면 감사하겠습니다`
- 해석: 마감일·원서접수일 미기재 → `unknown`. 목록상 게시일 2024.10.21.
- 연구실 사이트: https://os.korea.ac.kr/ (2026-09-18T11:53:06Z)
  - corroboration_excerpt: `Operating Systems Lab., Korea University (고려대 운영체제연구실)`

### ku-hvcl-urp-2023
- url: https://info.korea.ac.kr/info/board/notice_under.do?mode=view&articleNo=338631
- retrieved_at_utc: 2026-09-18T11:51:29Z
- title_excerpt: `[학부연구생 모집] 고성능비주얼컴퓨팅 연구실(정원기 교수님)`
- deadline_excerpt: `모집기간 : 채용 시까지`
- 해석: 원문 명시 `채용 시까지` → `rolling`. 목록상 게시일 2023.12.11로 오래됐으며 현재 모집 여부는 확인하지 않았다(상시를 모집 중으로 표시하지 않는 명세 규칙 적용 필요).
- 연구실 사이트: https://hvcl.korea.ac.kr/ (2026-09-18T11:53:07Z)
  - corroboration_excerpt: `HVCL – Bridging computers and sciences`

### nexon-nextorial-2026
- url: https://info.korea.ac.kr/info/board/course_intern.do?mode=view&articleNo=1582984
- retrieved_at_utc: 2026-09-18T11:50:35Z
- title_excerpt: `2026 넥토리얼 For Game Programmer`
- deadline_excerpt: `모집일정 : 8/25(화) ~ 9/7(월) 4PM`
- 교차 확인: https://nexon.link/bJ7 (2026-09-18T11:53:29Z, 최종 리디렉션 www.nexon-tutorial.com 넥슨 공식 넥토리얼 사이트)
  - corroboration_excerpt: `접수기간 2026년 8월 25일(화) - 9월 7일(월) 오후 4시`

### naver-z-zepeto-world-intern-2026
- url: https://info.korea.ac.kr/info/board/course_intern.do?mode=view&articleNo=1583195
- retrieved_at_utc: 2026-09-18T11:50:35Z
- title_excerpt: `[NAVER Z] AI 기반 제페토 월드 콘텐츠 제작 체험형 인턴`
- deadline_excerpt: `지원서 접수 마감 : 2026.09.06(일) 23:59`
- 채용 페이지 https://recruit.naverz-corp.com/rcrt/view.do?annoId=30005350&lang=ko 는 HTTP 200이나 본문이 스크립트 렌더링이라 텍스트 0자. 교차 확인 실패.

### lx-international-2026h2-intern
- url: https://info.korea.ac.kr/info/board/course_intern.do?mode=view&articleNo=1583864
- retrieved_at_utc: 2026-09-18T11:50:34Z
- title_excerpt: `[LX인터내셔널] 2026년 하반기 신입사원 채용(채용연계형 인턴십)`
- deadline_excerpt: `접수기간 : 9 .1(화)~9.20(일)`
- 해석: 연도 미표기 → 제목의 `2026년 하반기`와 요일(2026-09-01 화, 2026-09-20 일) 일치로 2026년 확정. 날짜만 제공 → 2026-09-21T00:00+09:00, date.
- 교차 확인 실패: https://apply.lxcareers.com/ DNS 조회 실패(`getaddrinfo failed`). 게시글 링크는 뉴스레터 리디렉터(stibee) 경유라 따라가지 않았다.

### bioresearch-ai-data-engineer-intern-2026
- url: https://info.korea.ac.kr/info/board/course_intern.do?mode=view&articleNo=1582796
- retrieved_at_utc: 2026-09-18T11:50:35Z
- title_excerpt: `[바이오리서치에이아이] 데이터엔지니어(인턴십) 채용공고`
- deadline_excerpt: `2026년 9월 채용일 ~ 11월 30일 (3개월)`
- 해석: 인용문은 근무 기간이며 접수 마감이 아니다. 게시글 본문에 접수 마감 없음 → `unknown`. 사람인·잡코리아 링크는 확인하지 않았다(약관 확인 전).

### hyundai-mobis-robotics-2026h2
- url: https://info.korea.ac.kr/info/board/course_job.do?mode=view&articleNo=1584964
- retrieved_at_utc: 2026-09-18T11:52:28Z
- title_excerpt: `[현대모비스] 26년 하반기 로보틱스 집중 채용`
- deadline_excerpt: `모집일정 9월 11일(금) ~ 9월 29일(화) 오전 10시`
- 해석: 연도 미표기 → 제목 `26년 하반기`와 요일(2026-09-11 금, 2026-09-29 화) 일치.
- 교차 확인: https://mobisrobotics-recruit.com/ (2026-09-18T11:53:28Z), 날짜만 표기
  - corroboration_excerpt: `모집 기간 09.11(금) ~ 09.29(화)`

### sc-bio-ai-drug-discovery-researcher
- url: https://info.korea.ac.kr/info/board/course_job.do?mode=view&articleNo=1584963
- retrieved_at_utc: 2026-09-18T11:52:28Z
- title_excerpt: `[에스씨바이오] AI 신약개발 연구원(이미지/영상/데이터 분석) 채용 공고`
- deadline_excerpt: `적정 인력 채용 시 마감일 이전에 채용이 조기종료 될 수 있습니다`
- 해석: `마감일`을 언급하지만 날짜는 미기재 → `unknown`. 추정하지 않았다.
- 회사 사이트 확인 실패: https://sc-bio.co.kr/ 연결 시간 초과(TimeoutError 10060). 대상 `official_url`은 null.

### gldc-kist-europe-internship-2027-1
- url: https://gldc.korea.ac.kr/gldc/community/notice.do?mode=view&articleNo=1585181
- retrieved_at_utc: 2026-09-18T16:41:26Z
- title_excerpt: `2027학년도 1학기 KIST 유럽연구소 글로벌 인턴십 프로그램 참가자 모집`
- deadline_excerpt: `2026년 9월 28일 월요일 23:59`
- 해석: 2026-09-28 23:59 KST, time.
- 주최: 고려대학교 국제처 국제교류팀(독일 자르브뤼켄 소재 KIST 유럽연구소 파견). 모집 대상: `2026년 2학기 기준, 4학기 초과 수료한 서울캠퍼스 정규학기 재학생 및 휴학생`(8학기 이내). 활동 기간: 2027.2.15~8.13(6개월). 지원: 본교 200만원 + KIST 활동장려금 월 600유로. 신청: 쿠카이브.
- 프로그램 소개 페이지(교차 확인): https://gldc.korea.ac.kr/gldc/intern/intro.do (2026-09-18T16:41:26Z)

### ku-glp-2026-summer
- url: https://gldc.korea.ac.kr/gldc/community/notice.do?mode=view&articleNo=804404
- retrieved_at_utc: 2026-09-18T16:41:26Z
- title_excerpt: `2026학년도 여름 KU-GLP (Germany, UK, Australia, Denmark, USA, France) 참가자 모집`
- deadline_excerpt: 없음 — 본문이 이미지 공고문으로만 제공되어 마감·모집 대상·활동 기간을 텍스트로 확인할 수 없었다.
- 해석: `unknown`. 추정하지 않았다. 문의처: 02-3290-2694 / gldc@korea.ac.kr (본문 텍스트에서 확인).
- 같은 게시판에서 `2026학년도 겨울 GLP` 공지(articleNo=1585145, 2026.09.16 게시)를 확인했으나 "9월 22일 이후 공지 예정"이라는 안내글뿐이며 모집 대상·기간·마감일이 전혀 없어 opportunity로 등록하지 않았다.
- 프로그램 소개 페이지(교차 확인): https://gldc.korea.ac.kr/gldc/glp/intro.do (2026-09-18T16:41:26Z) — "단기집중 언어·문화 교육과정"(7~8주), 해외대학 통합교육, 어학교육·특별강연·문화체험·기업탐방.

## 대상 official_url 확인

| subject | official_url | 결과 (UTC) |
| --- | --- | --- |
| korea-tourism-datalab-contest | https://datalab.visitkorea.or.kr/ | 200, 2026-09-18T11:53:04Z |
| k-cure-data-competition | https://kcurecompetition.com/ | 200, 2026-09-18T11:53:05Z (2026 제4차 사이트) |
| modu-ai-lab-ai-service-contest | https://contest.aitestbed.kr/ | 200, 2026-09-18T11:53:05Z (2026 회차 사이트) |
| openai-game-builders-seoul | https://openaigame2026.com/ | 200, 2026-09-18T11:53:06Z (2026 회차 사이트) |
| ku-oslab | https://os.korea.ac.kr/ | 200, 2026-09-18T11:53:06Z |
| ku-hvcl | https://hvcl.korea.ac.kr/ | 200, 2026-09-18T11:53:07Z |
| nexon | https://www.nexon.com/ | 200, 2026-09-18T11:53:31Z |
| naver-z | https://naverz-corp.com/ | 200, 2026-09-18T11:53:31Z |
| lx-international | https://www.lxinternational.com/ | 200, 2026-09-18T11:53:29Z |
| hyundai-mobis | https://careers.mobis.com/ | 200, 2026-09-18T11:53:28Z |
| bto / nais / naeilro / sw-centered-urp / bioresearch-ai / sc-bio | null | 공식 URL 미확보 또는 확인 실패(위 각 항목) |
| gldc-kist-europe-internship | https://gldc.korea.ac.kr/gldc/intern/intro.do | 200, 2026-09-18T16:41:26Z |
| ku-glp | https://gldc.korea.ac.kr/gldc/glp/intro.do | 200, 2026-09-18T16:41:26Z |

회차별 사이트(`kcurecompetition.com`, `contest.aitestbed.kr`, `openaigame2026.com`)는 다음 해에 바뀔 수 있다. 다음 회차 등록 시 재확인한다.

## 조회했으나 제외한 후보

- 코리아 핀테크 위크 2026(articleNo=1184204): 공모전이 아닌 전시 행사.
- 국토안전 AI 콘텐츠 공모전(1054006), 공과대학 숏폼 공모전(1584615), AI 서비스 풀스택 개발자 인턴(825997): 본문이 비어 있고 첨부파일에만 내용. 첨부를 열지 않아 마감 미확인.
- 레브잇 인턴(824524): 외부 채용 페이지 링크만 있고 마감 미기재. CS 관련성은 있으나 subject·근거가 약해 보류.
- NC문화재단 프로젝토리 크루(1585175), 현대모비스 연구장학생(1584965, 석·박사 대상): CS 학부생 초기 집중 분야와 거리.
- 리얼월드(1585176): 게시글 본문에 마감 없음, 채용 페이지(greetinghr) 미확인.

## 자동 수집 가능성 메모 (후보만, 허가 아님)

- 고려대 정보대학 게시판(`info.korea.ac.kr/info/board/*.do`): 로그인 없이 목록·상세 열람 가능, 서버 렌더링 HTML, 목록 링크가 `?mode=view&articleNo=N` 구조. `robots.txt` = `User-agent: * Allow: /` (2026-09-18T11:49:46Z). robots 허용과 HTTP 200은 이용 허가가 아니다. 학교 측 이용 조건은 확인하지 못했다. P3 후보로만 둔다.
- 한국관광 데이터랩: `robots.txt`가 일반 봇에 `/search/`만 차단하나, 페이지 하단에 "공식 제공되는 다운로드 이외의 방법에 의한 무단 수집이 금지됩니다" 문구가 있다. 자동 수집 후보에서 제외.

## 재확인 예약

- 발표일 미정. 발표 직전 열린 공고(`korea-tourism-datalab-contest-2026` 2026-09-30 14:00, `hyundai-mobis-robotics-2026h2` 2026-09-29 10:00, `lx-international-2026h2-intern` 2026-09-20, `gldc-kist-europe-internship-2027-1` 2026-09-28 23:59)를 원문으로 재확인하고 `last_checked_at`을 갱신한다. 2026-09-30 이후에는 열린 공모전·해커톤이 0건이 된다.
- `ku-glp-2026-summer`는 마감이 `unknown`이라 상시 재확인 대상이다. 2026-09-22 이후 게시 예정인 `2026학년도 겨울 GLP` 공지(articleNo=1585145)도 실제 모집 내용이 올라오면 별도 opportunity로 등록한다.
