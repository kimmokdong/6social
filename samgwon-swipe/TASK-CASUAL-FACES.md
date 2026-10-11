# 삼권 스와이프 — 평상복 얼굴 4장 (Codex 작업 지시)

## 목표
처음 "이름·모습 고르기" 화면의 얼굴 4개가 지금은 국회(초록) 옷을 입은 `p{0..3}_assembly_happy` 그림을 동그랗게 잘라 쓰고 있다. 아직 역할을 고르기 전이므로, **같은 사람의 평상복 그림**으로 바꾼다.

## 할 일
1. 그림 4장 생성 — 내장 image_gen 만 사용(코드·SVG·PIL로 그리기 금지, 자르기·크기·WebP 변환만 PIL 허용).
   - 결과: `shared-art/players/p{0,1,2,3}_casual_happy.webp` (기존 `p{n}_assembly_happy.webp` 와 같은 크기·틀·배경색·구도·밝기).
   - 원본은 `shared-art/raw/` 에 보관, `shared-art/manifest.json` 갱신.
   - **반드시 같은 얼굴**: 각 `p{n}_assembly_happy.webp`(그리고 `_court_`, `_president_`)를 참고 그림으로 주고, 얼굴·머리 모양·피부색·나이·표정이 똑같게. 바뀌는 건 옷만.
   - 옷: 역할 색(초록·파랑·보라)이 아닌 평범한 평상복(예: 크림/베이지 니트, 회색 후드티, 흰 셔츠에 데님 셔츠 등 차분한 중간색). 정장·넥타이·법복·배지 없음. 남녀(p0·p1 남, p2·p3 여)가 한눈에 구분되게 지금 그대로.
   - 시리즈 구아슈 화풍 유지. 글자·워터마크 없음.
2. 연결: `samgwon-swipe/js/game.js` 의 프로필 화면(`profile-form`, `data-face` 버튼)에서 `player('assembly', 'happy', { face })` → 평상복 그림(`p${face}_casual_happy`)을 쓰게. `js/paint.js` 의 `players/` 경로 규칙(`/^p\d_/`)으로 그대로 불러와지는지 확인. 그림을 못 불러오면 지금처럼 SVG 대체.
3. `samgwon-swipe/css/style.css` 의 `.face-button ... transform:scale(1.75)` 얼굴 확대 자르기는 평상복 그림에 맞게 조정(상반신이 자연스럽게 보이도록 확대를 줄이거나 없앰). 동그란 버튼 모양은 유지.

## 완료 조건
- 새 그림 4장과 기존 assembly 그림을 나란히 붙인 비교 그림 `shared-art/check/samgwon-casual-compare.png` 를 직접 열어 같은 사람인지, 옷이 평상복인지 확인. 다르면 다시 생성.
- Playwright: `http://localhost:8790/samgwon-swipe/index.html` 에서 localStorage 비우고 시작 → 프로필 화면을 1366×768·390×844 에서 캡처(`samgwon-swipe/tests/shots/casual-*.png`)해 직접 확인. 콘솔 오류 0.
- `node samgwon-swipe/tests/rules.cjs` 통과.
- 마지막 답변 5줄 안. 사용량 한도에 걸리면 멈추고 어디까지 했는지 보고.

## 건드리면 안 되는 것
다른 게임 폴더, `shared/music.js`, 기존 그림 파일(읽기만), 프로필 화면 외의 화면·규칙·저장 키, `js/sfx.js`.
