# 공용 그림을 게임 3개에 연결하기 (Codex 작업 지시)

## 목표
`shared-art/` 의 구아슈 그림(manifest.json 참고)을 **삼권 스와이프 · 떡볶이 타이쿤** 화면에 연결한다.
원칙: **이야기 그림(인물·신문 사진·엔딩·타이틀)은 그림 파일**, **놀이 조각(지도·건물·아이콘·게이지·장사 장면)은 지금의 SVG 그대로**.

## 공통 규칙
- 경로는 각 게임 폴더 기준 상대 경로 `../shared-art/...` (file:// 로 열어도 동작해야 함). 그림 파일은 복사하지 말 것.
- **그림이 없거나 못 불러오면 지금의 SVG가 그대로 보여야 한다.** 예: `<img ... onerror>` 에서 SVG 대체본으로 바꾸기, 또는 SVG 위에 그림을 겹쳐 두고 로드 성공 시에만 보이기. 그림이 없는 인물은 SVG로 나와야 한다(떡볶이 타이쿤 `trucker`는 2026-10-12에 그림 추가).
- 각 게임에 작은 도우미 하나(예: `js/paint.js` 의 `Paint.person(id, svgFallback)`, `Paint.scene(path, svgFallback, alt)`)를 두고 그걸로만 그림을 넣는다. 게임마다 같은 이름·같은 방식.
- `<img>` 에는 `width`/`height`(또는 aspect-ratio)를 줘서 화면이 흔들리지 않게, `decoding="async"`, 장면 그림은 `loading="lazy"` (단, 지금 보이는 엔딩·타이틀은 eager). 장식 그림은 `alt=""`, 내용이 있는 장면은 짧은 한국어 alt.
- 인물 그림은 정사각형(512). 지금 SVG 초상 칸 비율(300×320 또는 300×360)에 `object-fit: cover; object-position: center top` 으로 맞춘다.
- 다음에 쓸 인물 그림은 미리 불러 두기(예: 카드가 바뀌기 전에 `new Image().src = …`). 첫 화면이 그림 때문에 느려지면 안 된다.
- 글씨 크기·버튼 배치·게임 규칙은 바꾸지 않는다.

## 1) 삼권 스와이프 (`samgwon-swipe/`)
- 인물 카드(`A.portrait(card.char)`), 튜토리얼 카드의 인물 → `people/{id}.webp` (16명 모두 있음).
- 플레이어 얼굴(`A.portrait('player', {face, role, mood})`) → `players/p{face}_{role}_{mood}.webp`. 표정 연결: happy·proud → `happy`, sad·shock·neutral → `worried`. 얼굴 고르기 화면·타이틀 부채꼴 카드도 포함.
- 신문 장면(임기 시작 `intro`, 엔딩 `paper-scene`)에서 `standing: true` 전신 SVG 대신: 배경 `samgwon/bg_{role}.webp`(role: assembly/president/court) 위에 플레이어 상반신 그림을 액자처럼 얹고, 엔딩이면 소품 `samgwon/prop_{prop}.webp` 를 옆에 둔다. (헌법재판소 등 배경이 없는 역할은 지금 SVG 유지)
- 엔딩 도감 썸네일의 `A.prop(...)` → `prop_{prop}.webp`.
- 건물 아이콘·게이지·권한 수첩 그림은 **그대로 SVG**.


## 3) 떡볶이 타이쿤 (`tteok-tycoon/`)
- 타이틀 화면의 장면 → `tteok/title.webp` (SVG 장면 대신). 장사 화면의 거리 장면은 **그대로 SVG**(손님 애니메이션이 그 위에서 움직임).
- 엔딩 신문의 장면 → `tteok/end_{id}.webp` (closed, best, greedy, kind, rich, normal). 엔딩 도감에서 얻은 엔딩 카드에 작은 썸네일.
- 사건 카드·라이벌 소개의 인물(`P.portrait(c.char)`) → `people/{id}.webp` (ad_agent, ftc_officer, trucker 포함).
- 아침 화면 투자 카드 그림(`.up-ico`)과 튜토리얼 그림 → `tteok/st_{id}.webp` (cheese, sundae, chairs, staff, clean, flyer / 튜토리얼: coin, bowl). 작은 아이콘(상단 돈·별·버튼 안 아이콘)은 **그대로 SVG**.

## 건드리면 안 되는 것
- `shared-art/` 안의 모든 파일(읽기만), `fake-traveler/` 전체, 각 게임의 `data.js`·`engine.js`·`tests/`.
- 게임 규칙, 글 내용, 저장 형식(localStorage 키).

## 완료 조건
1. 세 게임 모두 위 위치에 그림이 나오고, 그림 파일 경로를 일부러 틀리게 했을 때 SVG로 대체되는 것을 직접 확인.
2. Playwright(파이썬)로 세 게임을 1366×768, 768×1024, 390×844 에서 타이틀 → 플레이 → 엔딩 → 도감까지 돌려 콘솔 오류 0. 스크린샷을 `shared-art/check/` 에 저장하고 직접 열어 보며 잘림·늘어남·겹침이 없는지 확인.
   (서버: `python -m http.server 8790 --directory C:/Users/hyunseung/Desktop/test/sahoe-games`, 디버그: 각 게임 `?debug=1`)
3. 끝나면 바꾼 파일 목록, 그림이 들어간 곳, 확인 결과를 짧게 보고.
