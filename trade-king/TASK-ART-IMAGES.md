# 무역왕 그림 — 1단계: 그림만 만들기 (Codex 작업 지시)

같은 시간에 다른 Codex 가 `trade-king/` 코드(사슬 균형)를 고치고 있다. **이 작업은 그림 파일만 만든다 — `trade-king/` 의 코드·data.js 는 절대 바꾸지 말 것**(읽기와 화면 캡처만 허용). 연결은 다음 단계 작업이 한다.

## 원칙 (선생님: "퀄리티가 필요하지만 시리즈 아트 스타일은 일관돼야")
- 시리즈 공통 **구아슈 그림**. 먼저 `shared-art/people/*.webp`, `shared-art/tteok/title.webp`, `shared-art/daon/era3.webp`, `fake-traveler/assets/img/scenes/*.webp` 를 열어 붓 터치·색감·밝기를 똑같이.
- 글자·숫자·로고·실제 국기·실존 건물 없음. 나라는 모두 가상. 옷·피부색으로 나라를 희화화하는 고정관념 금지.
- 내장 image_gen 만 사용(코드/SVG/PIL로 그리기 금지 — 자르기·배경 지우기·크기 조절·WebP 변환만 PIL 허용). 원본 `shared-art/raw/`, 결과 `shared-art/trade/`, `shared-art/manifest.json` 갱신.

## 만들 그림
1. **바다 지도 4장** `shared-art/trade/map_{archipelago,strait,inland,continent}.webp` (2000×1280): 오래된 종이 해도 위에 구아슈로 그린 바다와 섬.
   - 구도 참고: `http://localhost:8790/trade-king/index.html?debug=1` 을 Playwright 로 열어 지금의 SVG 지도를 지도 틀마다 PNG 로 찍어(`shared-art/raw/trade_ref_{map}.png`) 참고 그림으로 함께 주고 생성. 섬 배치는 `trade-king/js/data.js` 의 `maps[*].slots`·`lands` 를 따름.
   - 섬은 나라 특색 없이 일반적인 섬(모래·초록·바위). 큰 대륙형·해협형은 큰 땅덩이, 해협 자리는 좁은 물길, 폭풍 바다 항로 근처엔 거친 물결. 나침반·배·글자 없음.
   - 그린 뒤 **그림 속 섬의 항구 자리 좌표**를 지도마다 `shared-art/trade/slots.json` 에 적는다: `{ "archipelago": { "a": [x, y], ... }, ... }` (1000×640 기준, 슬롯 이름은 data.js 와 같게). 항구 핀이 바다에 뜨지 않고, 항로 직선이 섬을 크게 가로지르지 않게.
2. **항구 그림 11개** `shared-art/trade/port_{나라id}.webp` + `port_home.webp` (투명 배경, 약 420×320). 나라 id 는 `trade-king/js/data.js` 의 `countries` 키. 석유 왕국=모래 항구와 시추대 · 대평원국=밀밭과 곡물 창고 · 공장 섬=굴뚝 공장 · 반도체 강국=유리 반도체 공장 · 해협 섬나라=등대와 물길 문 · 큰 시장국=북적이는 시장 도시 · 무역항 도시국=크레인과 컨테이너 · 숲의 나라=고무나무 숲과 목조 부두 · 리튬 고원국=결정 바위산과 광산 · 얼음 북방국=눈 덮인 항구 · 다온국=현대 항구와 공장, 작은 집.
3. **안개 구름 3개** `shared-art/trade/fog_{1..3}.webp`(투명), **우리 배** `shared-art/trade/ship.webp`(투명, 옆모습, 화물 실은 작은 배).
4. **나라 대표 인물 10명** `shared-art/people/{나라id}.webp` (512×512, 기존 인물과 같은 틀·배경색 #F3E9D7). 가상의 무역 대표, 나라 색 옷과 작은 배지(물방울·밀·톱니·칩·물결·바구니·닻·나뭇잎·결정·눈송이). 나이·피부색 다양, **남녀 반반이 한눈에 구분되게**.
5. **타이틀** `shared-art/trade/title.webp`(1600×900): 다온국 항구에서 배들이 해도 같은 바다로 떠나는 장면. **엔딩 6장** `shared-art/trade/end_{king,war,richAlone,island,rawOnly,normal}.webp`(1200×800, data.js `endings` 의 story 에 맞게).

## 완료 조건
- 모든 그림을 직접 열어 확인: 글자·워터마크 없음, 잘림 없음, 투명 배경 가장자리 깨끗, 화풍 통일. 문제 있으면 다시 생성.
- 지도 4장 위에 slots.json 좌표로 점을 찍은 확인용 그림 `shared-art/check/trade-slots-{map}.png` 를 만들어 확인.
- 확인용 모음 `shared-art/check/trade-art-sheet.png`.
- 마지막 답변: 만든 그림 목록, 다시 만든 것, 남은 것 5줄 안. 사용량 한도에 걸리면 멈추고 어디까지 했는지 보고.
