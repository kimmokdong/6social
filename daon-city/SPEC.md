# 다온시 70년 — Build Spec (for Codex)

A turn-based city-building puzzle that teaches Korean 6th graders (age 12) **how Korea's economy grew (1960s→2020s)**,
why each era's industry made sense (conditions: money, labor, technology/education), and the **problems of rapid growth**
(pollution, inequality, labor) — without turning history into a quiz.

The player is the mayor of **다온시**, a fictional city living through the real Korean eras. One turn = 10 years, 7 turns.
Each decade they place buildings on a small map. Copying history works well because the rules model the real conditions,
but it is not the "answer": the **true ending (모두의 도시)** needs growth *and* environment *and* fairness — doing better than history did.
At each decade's end a small card shows **"그때 우리나라는?"** (what Korea actually did).

**Audience:** 12-year-olds, school tablets (iPad, Galaxy Tab) and Chromebooks, one device each.
**Top priorities (teacher):** 1) text as big as possible and only what's necessary — icons over words; 2) UI/UX a 6th grader gets instantly; 3) one consistent art style; 4) polish in details.

This game is part of a series with **삼권 스와이프** (`../samgwon-swipe/`). Use the **same art system**: flat paper-cut illustration, same palette tokens, same Pretendard + Black Han Sans fonts, same character portraits.
Copy what you need from `../samgwon-swipe/js/art.js` (read only — do not modify that folder) into `js/art.js` here, and extend it with map tiles and buildings in the same style.

## 1. Tech constraints
- Plain static files: `index.html`, `css/style.css`, `js/data.js` (written — **역사·사건·엔딩·배지 문구는 유지한다. 교사가 요청한 수입 숫자 변경은 아래 변경 기록을 따른다**), `js/art.js`, `js/sfx.js`, `js/game.js`. No build step, no libraries, classic `<script>` tags (works from file://).
- Fonts: Black Han Sans (Google Fonts) for headlines, Pretendard Variable (jsdelivr) for everything else, Nanum Myeongjo 800 for the newspaper masthead only. System fallbacks.
- All art inline SVG. Save in `localStorage` key `daon-city-v1` (try/catch everywhere). No console errors.
- Sound: WebAudio synth, **default OFF**.

## 2. Rules (must match exactly — balance was simulated with these)
State: `money` (start `rules.startMoney`), `tech` (start 0), map tiles, event bonuses `{env, life, fair}` (start 0), decade index `d` 0..6.

### 2.1 Map
`data.map` is 7 columns × 6 rows. `M` mountain (never buildable), `F` farmland (buildable), `V` village (starts with a `house`), `S` sea (never buildable).
Coastal tiles = buildable tiles directly above a sea tile (row 4). Neighbors = 4 directions (up/down/left/right).

### 2.2 Build phase (each decade)
- The player may place up to `rules.buildsPerDecade[d]` buildings this decade (show remaining slots).
- A building card is **available** if `era <= d`. It is **placeable** if: money ≥ cost, tech ≥ `techReq` (if any), a `power` building exists in the city (already built or placed this decade) when `needPower`, and the target tile is buildable, empty (or see demolish) and coastal when `coastal`.
- Locked/unaffordable cards stay visible but dimmed with **one icon reason**: 🪙 not enough money, ⭐n tech needed, ⚡ needs a power plant, 🌊 coast only, 🔒 future era (show the decade).
- **Undo**: any building placed this decade can be removed for a full refund before advancing.
- **Demolish**: tap an older building → "철거" for `rules.demolishCost`. Does not use a build slot. (Lets players replace old polluting factories — this is the real "industrial restructuring".)
- Button **"10년 보내기"** ends the phase (allowed even with slots left).

### 2.3 Production (after "10년 보내기")
For each building `b` in the city (including ones placed this decade):
- **Export** (only buildings with `exp`): `e = exp[d]`; if `steelBonus` and the city has a `steel` → `e += steelBonus`;
  if `factory` and adjacent to a `port` or `road` → `× boost.one`; adjacent to both → `× boost.both`.
- `exports = Σ e`.
- `money += income.base[d] + round(exports × income.exportRate) + income.perMarket × (#market)`.
- `tech += Σ tech_b` (+ event `tech` effects are added immediately when chosen).
- Gauges (clamp 0..100, round):
  - `econ = exports / exportTarget[d] × 70`
  - `env  = 80 − 5 × Σ max(0, pol_b − (#adjacent parks of b)) + Σ env_b + bonus.env`
  - `life = 25 + Σ life_b − housePollutionPenalty × (#houses adjacent to any building with pol ≥ 2) + econ × 0.2 + bonus.life`
  - `fair = 55 − 4 × Σ unfair_b + Σ fair_b + bonus.fair`
  (`env_b`, `life_b`, `fair_b` are the positive fields in data; buildings without them add 0.)

### 2.4 After production
1. **Problem event** (`problems`): if a gauge is below its `below`, show that event (max one per decade, priority env → fair → life, each id at most 2 times per game).
2. **Era event** (`eras[d].event`).
   Event `fx`: `money` changes money now; `tech` changes tech now; `env/life/fair` add to the persistent bonuses. After choosing, recompute and animate the gauges so the effect is visible immediately.
3. **"그때 우리나라는?"** card: `eras[d].realText`, plus whether the player built a building of category `eras[d].real` **during this decade** (✓ "나도 같은 길!" or ✗ "나는 다른 길"). Count matches for the history score.
4. Next decade (or the ending after 2020년대).

### 2.5 Ending
After decade 6, evaluate `endings` top to bottom (`all60` = all four gauges ≥ 60; `else` = fallback). Badges: `history` (7/7 matches), `together` (모두의 도시), `allEndings`.

## 3. Screens & flow
```
Title → (first time) 3-step tutorial → [decade loop ×7] → 다온시 70년사 (ending) → Title
decade loop: 시대 신문 → 건설 → 10년 보내기 연출 → (문제 사건) → 시대 사건 → 그때 우리나라는?
Title also: 엔딩 도감, 설정
```

### 3.1 Title
Big logo "다온시 70년" (Black Han Sans), a small animated city skyline growing from huts to towers behind it. Buttons: **시작** · **엔딩 도감** (`n/6`). Home icon (top-left, aria-label "게임 목록") → `../index.html`. Sound/settings top-right. No other text.

### 3.2 Tutorial (first run, 3 steps, tap to advance, skippable)
1. Drag/tap a card onto a glowing tile → "골라서 놓기!"
2. A factory next to a port shows ×1.5 sparkle → "항구·고속도로 옆은 수출 UP!"
3. Smoke from a factory next to houses / a park cleaning it → "공원은 오염을 줄여요!"

### 3.3 Era newspaper (start of each decade)
"다온일보" front page: masthead, the decade label, `headline` (huge), an illustration of the city's current state, and the **new building cards of this era** fanned in with "NEW". Button **"건설 시작"**.

### 3.4 Build screen (main screen, must not scroll at tablet/Chromebook sizes)
- **Top bar:** decade timeline (7 dots, current highlighted with its label), 💰 money, ⭐ tech, remaining build slots (hammer icons).
- **Gauges:** 경제 / 생활 / 환경 / 공정 — same visual language as 삼권 스와이프 (icon fills from the bottom, label under, danger pulse ≤ 25).
- **Map (the hero):** big square-ish tiles, flat paper-cut. Farmland = soft green fields, mountains, sea with waves along the bottom, coast marked by sand. Buildings are chunky readable icons that fill their tile.
- **Card tray:** available building cards (icon, short name, 🪙 cost; small effect icons like 📈+, 🌳−). Tray scrolls horizontally if needed. Landscape: tray on the right side; portrait: tray under the map.
- **Placing:** tap a card (or drag it) → valid tiles glow; hovering/dragging over a tile shows a **ghost building** plus mini effect chips (e.g. ×1.5 when next to port/road, 😷 when it would pollute next to houses, 🌳 park reduction). Tap the tile to place (pop + dust animation). Invalid tiles shake with the reason icon.
- **Visual feedback in the city:** polluting factories puff smoke; when env < 40 a light gray smog tint covers the map; parks have swaying trees; boosted factories show small moving trucks/ships.
- **Era color grading:** 1960s slightly sepia/desaturated, gradually warming to full vivid color by the 2020s.
- Button **"10년 보내기 ▶"** (big, bottom-right). Undo icon next to it.

### 3.5 10년 보내기 (time-lapse, ~2.5 s, skippable by tap)
Year counter rolls (e.g. 1960 → 1969), factories puff, coins fly from factories into the 💰 counter (`+n`), gauges animate with green/red sparkles. Then the events.

### 3.6 Event cards
Use the 삼권 스와이프 card language: speech bubble with `text` (big, max 2 lines) over a character portrait card (`char` ids are the same characters as 삼권 스와이프), two big choice buttons `a.label` / `b.label`. After choosing, show the effect as icon chips (🪙−5, 🌳+10 …) flying to the gauges.

### 3.7 "그때 우리나라는?" card
Small and quick: decade label, `realText` (one line), the category icon, and ✓/✗ comparison. Button **다음 10년** (or **70년사 보기** after the 2020s).

### 3.8 다온시 70년사 (ending)
A scrollable newspaper scrapbook: 7 mini front pages (decade, headline, the buildings the player built that decade as icons, gauge mini-bars). Then the big final page: ending `name` (huge), `story`, a **snapshot of the final map**, the 4 gauges, "실제 역사와 n/7 같은 길", a boxed note (`note`, and `finalNote` for non-legend endings), NEW stamp if first time, badges earned. `legend` ending gets gold styling + confetti behind the paper.
Buttons: **다시 하기** · **엔딩 도감**.

### 3.9 엔딩 도감
6 newspaper cards (locked: "?" + a one-line hint derived from the condition, e.g. "환경을 잃으면…"). Badges row.

## 4. UX details
- Text sizes: headlines 48–72px, event text ≥ 28px on tablets, card names ≥ 18px, buttons ≥ 22px, nothing below 16px. `clamp()`. `word-break: keep-all`.
- Touch targets ≥ 56px; map tiles at least ~72px on tablets. `touch-action` set correctly so dragging cards never scrolls/zooms the page. Mouse + touch + keyboard (arrow keys move a tile cursor, Enter places, Esc cancels).
- Targets (no scroll on the build screen): 1366×768, 1280×800, 1180×820, 1024×768, 768×1024, 800×1280; 390×844 phone may scroll the tray.
- `prefers-reduced-motion` → fades. Visible focus ring. Lock input during animations.

## 5. Done when
- Rules exactly as §2. Write a scripted test that drives the real engine with these 4 bots (placement heuristic: factories next to port/road when possible, parks next to the most polluting building, houses away from factories; build in the listed priority while slots/money allow) and report the endings with good (`a`) and growth (`b`) event choices:
  - 균형: `['port','textile','school','school'],['power','steel','school','park'],['car','univ','park','welfare'],['semi','elec','welfare','park'],['it','green','cleaner','semi'],['content','semi','park','cleaner'],['battery','it','welfare','park']`
  - 성장: `['port','textile','textile','school'],['power','steel','road','ship'],['car','elec','chem','univ'],['semi','ship','elec'],['it','car','chem'],['content','semi'],['battery','semi']`
  - 교육 없음: `['port','textile','textile','market'],['power','steel','road','ship'],['car','elec','chem'],['ship','elec','car'],['car','chem','steel'],['steel','ship'],['car','elec']`
  - 환경: `['park','school','market','park'],['park','school','market'],['univ','park','welfare'],['park','school','cleaner'],['green','it','park'],['content','park'],['park','cleaner']`
  Expected roughly: 균형+a → 모두의 도시, 성장 → 잿빛 수출왕, 교육 없음 → 불공평한 부자 도시 or 멈춰 버린 도시, 환경 → 조용한 초록 마을. **실제 결과를 보고한다. 2026-10-12 교사 요청에 따른 수입 조정은 아래 기록을 따른다. 엔딩 판정과 건물 비용은 유지한다.**
- All screens checked at every target viewport, no overlapping text, no console errors, file:// works.
- `?debug=1`: set money/tech, jump to any decade, run a bot, jump to any ending.

## 6. 교사 요청 개선 기록 (2026-10-12)

- 기본 수입: 모든 시대 6 → `[24, 22, 20, 16, 12, 8, 6]`. 초반에 건설비를 확보하고, 수출이 늘어나는 만큼 서서히 줄여 시대가 바뀌어도 수입이 갑자기 줄지 않게 한다.
- 수출→돈 비율: `0.7 → 0.25`. 후반 수출 규모가 커져도 돈이 지나치게 쌓이지 않게 한다.
- 시작 돈 15, 시장 수입 +2, 건물 비용, 기술 요구량, 게이지 공식, 엔딩 판정은 유지한다.
- 예상 수입·기술은 `engine.production()`을 사용하고 `advance()`도 같은 함수로 생산한다. 예상에는 다음 사건 효과가 포함되지 않는다.
- 건물 패널은 이번 시대 기본 수출·조건·수치와 대략의 개별 수입을 표시한다. 칸마다 실제 배율 적용 수출을 미리 보여 준다. 수출 수입은 도시 전체 수출을 합친 뒤 반올림한다.
- 돈·기술 및 네 게이지를 누르면 짧은 도움말과 현재 도시의 계산 내역을 본다. 게이지 내역은 `gaugeDetails()`와 실제 게이지 계산이 공유한다.
- 미래·돈·기술·전기 잠금 카드도 숫자 정보를 볼 수 있다. 건설 가능 여부는 기존 엔진 검사를 따른다.
- 다른 역사 선택은 나침반과 중립 색으로 표시한다. 역사 탐험가 배지 판정은 그대로다.
- 이번 시대 건물은 10년 보내기 중 비계에서 완성된다. 차·항구 근처 배·공원 성장·오염량에 따른 연기가 움직이고, 이전 시대 환경에서 현재 환경으로 하늘·바다의 탁함이 서서히 바뀐다.
- 논밭은 1980~1990년대 흙길·공터, 2000년대부터 포장 바닥이 된다. 학교·시장·섬유·제철·자동차·전자 건물에는 시대별 증축과 현대식 지붕을 더한다.
- 움직임은 주로 transform/opacity를 쓴다. 건설 중은 잔잔하고, reduced-motion에서는 비계·성장·차·배·연기 움직임을 최소화한다.
- 저장 키와 저장 상태 필드는 추가·변경하지 않는다. 옛 돈·지도·기록을 그대로 이어가며 다음 생산부터 새 수입 규칙을 적용한다.
- 태블릿은 건설 화면에서 전체 페이지 스크롤이 없다. 휴대폰은 상세 정보와 카드 영역을 세로로 스크롤할 수 있다. 팝업·도움말은 화면 안에서 스크롤한다.

### 시대별 시작 돈 / 수입 (좋은 선택, 동일한 봇 계획)

| 시대 | 균형 이전 | 균형 이후 | 역사 이전 | 역사 이후 |
|---|---:|---:|---:|---:|
| 1960년대 | 15 / +10 | 15 / +26 | 15 / +10 | 15 / +26 |
| 1970년대 | 18 / +18 | 34 / +28 | 18 / +18 | 34 / +28 |
| 1980년대 | 19 / +24 | 45 / +30 | 19 / +32 | 45 / +33 |
| 1990년대 | 24 / +37 | 52 / +17 | 24 / +44 | 45 / +24 |
| 2000년대 | 42 / +51 | 48 / +22 | 46 / +67 | 35 / +31 |
| 2010년대 | 58 / +75 | 35 / +31 | 68 / +100 | 29 / +41 |
| 2020년대 | 104 / +109 | 37 / +43 | 129 / +156 | 39 / +63 |

1960~1990년대 균형·역사 봇은 좋은 선택·성장 선택 모두 돈 부족 실패 0회, 시대마다 3~4개 건설. 역사+좋은 선택은 후반 2000년대 석유 화학, 2010년대 자동차가 돈 부족으로 빠지지만 각 시대 3개를 짓는다.

### 봇 엔딩과 끝 돈 (a=좋은 선택, b=성장 선택)

| 봇 | 이전 엔딩 / 끝 돈 | 이후 엔딩 / 끝 돈 |
|---|---|---|
| 균형+a | 모두의 도시 / 179 | 모두의 도시 / 46 |
| 균형+b | 조용한 초록 마을 / 99 | 열심히 자란 도시 / 70 |
| 역사 그대로+a | 잿빛 수출왕 / 238 | 잿빛 수출왕 / 55 |
| 역사 그대로+b | 잿빛 수출왕 / 235 | 잿빛 수출왕 / 83 |
| 성장+a | 멈춰 버린 도시 / 144 | 열심히 자란 도시 / 55 |
| 성장+b | 불공평한 부자 도시 / 193 | 불공평한 부자 도시 / 97 |
| 교육 없음+a | 멈춰 버린 도시 / 141 | 멈춰 버린 도시 / 37 |
| 교육 없음+b | 멈춰 버린 도시 / 177 | 멈춰 버린 도시 / 79 |
| 환경+a | 조용한 초록 마을 / 42 | 조용한 초록 마을 / 68 |
| 환경+b | 조용한 초록 마을 / 74 | 조용한 초록 마을 / 96 |

요청한 주요 엔딩은 모두 유지된다. 균형+b는 교육·복지가 돈에 막히지 않아 조용한 초록 마을 → 열심히 자란 도시, 성장+a는 대학교를 지어 멈춰 버린 도시 → 열심히 자란 도시로 달라졌다. 종류·문구·판정을 바꾼 결과가 아니다.

성장+b(97), 환경+b(96), 역사+b(83)는 대략 목표 30~80보다 조금 더 남는다. 이 봇들은 기술 부족으로 건설을 건너뛰거나 돈을 주는 사건을 고른다. 모든 봇을 억지로 동일한 잔액에 맞추는 추가 비용·엔딩 변경은 넣지 않았다.

전체 10개 봇의 시대별 시작 돈·수입·건설·실패 원인은 [balance.json](check-verify/balance.json)에 기록한다. `node daon-city/tests/bots.js --trace`로 현재 추적을 다시 볼 수 있다.
