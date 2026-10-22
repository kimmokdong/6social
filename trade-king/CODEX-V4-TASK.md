# Codex 작업 지시: 무역왕 4.0 구현 (그림 없이 먼저)

## 목표
`trade-king/SPEC-v4.md`(규칙서)대로 **턴제 세계 무역 전략 게임**을 새로 만든다. 3.x(항구 공장 액션) 코드는 버리고 같은 폴더(`trade-king/`)에 다시 짠다. 3.x는 `output/trade-king-v3-backup/`에 백업되어 있으니 지워도 된다.
**새 그림은 만들지 않는다.** 그림이 필요한 곳은 이미 있는 것만 쓴다:
- 나라 인물: `js/people-art.js`의 `P.portrait(id)`(SVG)와 `../shared/game-assets.js`에 등록된 `../shared-art/people/*.webp`(plains, oilKingdom, bigMarket, forest, factoryIsle, lithiumHigh, straitIsle, northIce, chipLand, hubCity 등). 나라 8곳에 어울리는 인물을 골라 쓴다.
- 물건 아이콘: `js/map-art.js`의 `A.icon(name)`(wheat, oil, chip, iron, banana 등 이미 있음. 없으면 이 파일에 간단한 SVG 아이콘을 추가해도 된다).
- 나라 풍경·사건 그림 자리는 색 블록 + 큰 아이콘으로 대신한다(나중에 그림으로 교체하기 쉽게 `art` 키만 남겨 둔다).

## 만들 것 (모든 화면 문구·코드 주석은 한국어)
1. `js/data.js` — `TRADE` 데이터(노드에서도 `require` 가능, 지금 파일처럼 UMD). 물건 5종, 나라 8곳(조건·일꾼·생산표·고유 능력·전략 A/B·약점), 바구니 필요량, 기본 값, 사건 카드(문제 7종 이상 + 기회·해결 6종 이상, 희귀도, 이어지는 사건), 정책 카드, 엔딩 6종, 배지(나라별 전략 A/B 배지 포함), 해금 조건. 수치는 SPEC-v4 표를 시작값으로 하고 봇으로 맞춘다.
2. `js/engine.js` — 화면 없는 순수 규칙 엔진(UMD, 노드 테스트·봇이 같은 코드를 씀). `newGame(seed, countryId, progress)`가 고른 나라 + 해금 여부와 상관없이 나머지 7곳 중 **랜덤 4곳**을 NPC로 뽑는다. 5년(턴), 한 해 단계: 사건 → 일꾼 배치 → 무역(세계 시장 사고팔기 + NPC 거래 제안 카드) → 결산(바구니·생활 수준·산업 기반·의존도·순위) → 정책(3년째부터). 1년째는 국경 닫힘(무역 없음). 세계 값은 수요/공급으로 0.5~2배. 관세·보복·우호도·의존도(한 나라 70% 넘으면 위기 피해 2배)·수출 상대 수(한 곳뿐이면 수입 제한 피해 2배)·산업 기반(2년 연속 일꾼 없으면 −1)·FTA(4년째부터)·국제 회의(4년째부터)·비축 창고. NPC는 자기 나라 전략과 성격(자유무역형/보호무역형)대로 움직인다. 시드가 같으면 결과가 같아야 한다.
   - 명령 예: `assign(industry, n)`, `sell(good, n)`, `buy(good, n, from)`, `acceptOffer(id)`, `rejectOffer(id)`, `chooseEvent(index)`, `choosePolicy(id)`, `setTariff(good, level)`, `endPhase()`.
3. `js/game.js` + `css/style.css` + `index.html` — DOM으로 그리는 한 화면 보드게임 UI(캔버스 필요 없음). 구성은 SPEC-v4 12장과 `../shared-art/trade/concept4/screen.png` 콘셉트 참고:
   - 타이틀 → 나라 고르기(8장 카드, 잠긴 나라는 자물쇠 + 해금 조건) → 판 화면 → 사건/거래/정책/결산 카드 → 엔딩(나라 모습 + 무역 노트 + 토론 질문) → 도감(사건 카드·나라×엔딩·배지).
   - 판 화면: 위 순위 띠(이번 판 5나라 얼굴 + 생활 수준), 왼쪽 우리 나라 판(산업 5줄, "1명당 n", 기반 별, 일꾼 자리), 가운데 세계 지도(5나라 배치, 거래하면 항로 표시, 의존도 높은 줄 빨강, FTA 초록), 오른쪽 국민 바구니 5칸 막대 + 창고, 아래 시장 패널.
   - 조작: 일꾼 끌어다 놓기 + 탭(일꾼 → 칸) + 키보드(숫자키로 칸, +/−). 태블릿 터치.
   - **스크롤 금지**: 1366×768, 1280×800, 1024×768, 768×1024에서 페이지·카드 창 모두 스크롤이 없어야 한다. 카드 창이 길면 통째로 줄여 맞춘다(3.x의 `fitSheet` 방식: 창 높이가 화면보다 크면 `zoom`으로 축소). 390×844 폰은 세로 스크롤 허용.
   - 화면 높이가 내용에 따라 출렁이면 안 된다(패널 높이 고정).
   - 결산 카드에 1년째 "혼자 만든 해"와 비교한 "무역해서 / 혼자 만들었다면" 두 줄을 보여 준다.
   - 저장: 해가 시작될 때 localStorage(`trade-king-v4-game`), 진행(해금·도감·배지)은 `trade-king-v4-progress`. 이어하기 지원.
   - 소리: 기존 `js/sfx.js` 재사용 가능.
   - `?debug=1`이면 `window.TK = { G, E, T, ... }` 디버그 핸들과 "한 해 넘기기" 버튼.
4. `../shared/game-assets.js`의 `"trade-king"` 항목 — v3 공장 그림(boss_*, m_*, v_*, floor*) 목록을 빼고, 새로 쓰는 인물 webp만 남긴다. **다른 게임 항목은 건드리지 않는다.**
5. 테스트(전부 다시 작성)
   - `tests/rules.js`: 값 계산, 국경 닫힘, 관세·보복, 의존도 피해 2배, 수출 상대 수, 산업 기반 감소, FTA, 사건 효과, 랜덤 NPC 4곳(시드별로 다름·고른 나라 제외), 같은 시드 같은 결과, 해금.
   - `tests/bots.js`: 나라마다 "자급자족 봇 / 효율만 봇(가장 잘 만드는 것만 + 관세 없음) / 균형 봇(무역 + 약한 산업 하나 보호 + 비축)" 각 30판. **통과 조건**: (a) 모든 나라에서 무역하는 봇 평균 생활 수준 > 자급자족 봇, (b) 위기 사건이 2번 이상 걸린 판들에서 균형 봇이 효율만 봇을 이기는 비율 ≥ 40%, 위기가 없는 판들에서는 효율만 봇이 더 높음(보호에는 비용이 있다), (c) 모든 나라가 균형 또는 효율 봇으로 1등을 하는 판이 20% 이상, (d) 무작위 봇의 1등 비율 ≤ 15%. 결과 표를 출력하고 assert.
   - `tests/verify.py`(Playwright, 크롬 `C:/Program Files/Google/Chrome/Application/chrome.exe`, 서버 `http://127.0.0.1:{PORT}`, 기본 PORT 8080 — 서버는 이미 떠 있다): 나라 고르기 → 5년 끝까지(마우스) → 엔딩 → 도감, 키보드만으로 한 해, 터치로 한 해, 이어하기, 위 화면 크기들에서 스크롤 없음·가로 넘침 없음·13px 미만 글자 없음, 콘솔 오류 없음. 스크린샷은 `output/trade-v4-verify/`에.

## 완료 조건
- `node trade-king/tests/rules.js` → `PASS`
- `node trade-king/tests/bots.js` → 통과 조건 전부 `PASS` (수치를 조정해서 맞춘다. 조정한 값은 SPEC-v4.md 해당 표에 반영)
- `PORT=8080 python -u -X utf8 trade-king/tests/verify.py` → `ALL PASS`
- `trade-king/SPEC-v4.md` 끝에 "구현 메모" 절: 실제 수치, 봇 결과 표, 남은 문제.

## 건드리면 안 되는 것
- `trade-king/` 밖의 파일(단, `../shared/game-assets.js`의 trade-king 항목만 수정 허용). 특히 다른 게임 폴더, `shared-art/`, `guides/`, `output/release-github/`.
- `index.html`의 `<script defer src="https://hsstudio.pages.dev/project-visits.js"></script>` 줄은 그대로 둔다.
- 배포·git 커밋 하지 않는다.
- 사용량 한도가 오면 거기서 멈추고, 어디까지 했는지 `trade-king/CODEX-V4-PROGRESS.md`에 적는다.
