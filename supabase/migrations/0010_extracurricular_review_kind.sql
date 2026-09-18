-- 대외활동(opp_category='extracurricular') 공고에도 후기를 작성할 수 있도록 review_kind에 값을 추가한다.
-- docs/features/reviews.md 유형 표에 대외활동 행을 함께 추가했다(0007에서 공고 카테고리에는 이미 추가됨).
alter type review_kind add value 'extracurricular';
