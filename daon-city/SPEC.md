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
- Plain static files: `index.html`, `css/style.css`, `js/data.js` (written — **do not change its Korean text or numbers**), `js/art.js`, `js/sfx.js`, `js/game.js`. No build step, no libraries, classic `<script>` tags (works from file://).
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
- `money += income.base + round(exports × income.exportRate) + income.perMarket × (#market)`.
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
  Expected roughly: 균형+a → 모두의 도시, 성장 → 잿빛 수출왕, 교육 없음 → 불공평한 부자 도시 or 멈춰 버린 도시, 환경 → 조용한 초록 마을. **Report the actual results; do not change data.js numbers to force them** (tell me if they differ).
- All screens checked at every target viewport, no overlapping text, no console errors, file:// works.
- `?debug=1`: set money/tech, jump to any decade, run a bot, jump to any ending.
