# 삼권 스와이프 — Build Spec (for Codex)

A Reigns-style swipe decision game that teaches Korean 6th graders (age 12) the separation of powers (삼권분립):
what the National Assembly (국회), the Government (정부) and the Courts (법원) each do, and how they check each other.

The player picks a role (국회의원 / 대통령 / 대법원장), makes 20 swipe decisions, and tries to finish the term
without any gauge running out. Every ending is a newspaper "extra" (호외) that teaches one concept.
Collecting all 24 endings and all 18 power cards is the long-term goal.

**Audience:** 12-year-olds on school tablets (iPad, Galaxy Tab) and Chromebooks. One device per student. Classroom use.

**Top priorities (from the teacher):**
1. **Text as big as possible, and only the text that is truly needed.** No paragraphs anywhere. If a screen can say it with an icon, use the icon.
2. UI/UX that fits 6th graders: instantly obvious, big touch targets, satisfying feedback.
3. One consistent art style across the whole game.
4. Polish in the details (animations, states, edge cases).

---

## 1. Tech constraints

- Plain static files: `index.html`, `css/style.css`, `js/data.js` (already written), `js/art.js`, `js/sfx.js`, `js/game.js`.
- **No build step, no frameworks, no external JS libraries.** Classic `<script>` tags (NOT ES modules) so it works when a teacher double-clicks `index.html` (file://) and on any static host.
- Fonts (with system fallbacks so it still works offline):
  - Display / headlines: Google Fonts `Black Han Sans`
  - Everything else: Pretendard Variable — `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
  - Newspaper masthead only: Google Fonts `Nanum Myeongjo` (800)
- All art is **inline SVG generated in `js/art.js`** (no raster images). Keep total size small.
- Save progress with `localStorage` key `samgwon-swipe-v1`. Wrap every read/write in try/catch; the game must work if storage is blocked.
- No console errors. No network calls except fonts.
- **`js/data.js` is the content source of truth. Do not change any Korean text or numbers in it.** If you need presentational data (colors, art params), put it in `art.js` / `game.js`.

## 2. Rules (must match exactly — the content was balance-tested against these rules)

- Gauges `p` 국민, `m` 살림, `l` 법, `w` 권력. All start at 50, clamp to 0..100.
- A choice applies `fx` deltas. Then check endings in this priority:
  1. `w >= 100` → role's `w100` ending
  2. `w <= 0` → `w0`
  3. `p <= 0` → `p0`
  4. `m <= 0` → `m0`
  5. `l <= 0` → `l0`
- A choice with `ending` ends the run immediately with that ending id.
- `w` (권력) is **two-sided**: both 0 and 100 are deaths. The safe zone is the middle. This is the core teaching metaphor: power must stay balanced.
- One run = `turnsPerTerm` (20) decisions. Surviving all 20 → `legend` ending if `p>=60 && m>=60 && l>=60 && 35<=w<=65`, otherwise `complete` ending.
- Ending ids per role: `{prefix}_{complete|legend|people0|money0|law0|power0|power100|scandal}` where prefix is `pres`, `asm`, `court`. Map ending type via the `type` field in `data.endings` (`complete, legend, p0, m0, l0, w0, w100, scandal`).
- Card selection each turn:
  1. Turn 1: the role's card with `first: true`.
  2. Else, if a queued follow-up (`next: {id, in}` scheduled at `turnIndex + in`) is due, show it.
  3. Else weighted random from the role's cards that are not `first`, not `chain`, not yet used this run, and whose `when` ranges are all satisfied. Weight 3 if the card has `when`, otherwise 1.
  4. Avoid the same character twice in a row when another eligible card exists.
- Power cards: a card-level `power` is granted when the card is resolved (either side). A choice-level `power` is granted when that side is chosen. An ending's `powers` array is granted on that ending. Show the "new power" modal only the first time each power is obtained.
- `stamp` on a choice: show the stamp animation (see §6) after choosing.

## 3. Screens & flow

```
Title → (first time) Name & Look → Role Select → Newspaper Intro → (first time) Tutorial → Game → Ending Newspaper
                                       ↑______________________________________________________________|
Title also opens: 엔딩 도감 (Endings), 권한 수첩 (Power Notebook), 설정 (Settings)
```

### 3.1 Title
- Huge logo "삼권 스와이프" (Black Han Sans) with three fanned role cards (green / blue / purple) floating gently behind it.
- One short subtitle line: "다온 공화국을 지켜라!"
- Buttons: big primary **시작** · secondary **엔딩 도감** (show `n/24`) · **권한 수첩** (show `n/18`). Sound toggle icon top-right.

### 3.2 Name & Look (first time only; editable later from Settings)
- Text field "이름" (max 6 chars, default empty; if empty use "새봄").
- Choose 1 of 4 faces (big tappable portraits: different hair + skin tone). The chosen face is used for the player avatar in every role.
- Button **다음**.

### 3.3 Role Select
- Three big cards (side by side in landscape, stacked/scroll in portrait):
  - building illustration (국회 dome / 정부 building with flag / 법원 columns with scale) in the role color
  - role title (big): 국회의원 / 대통령 / 대법원장
  - one line from `roles[x].does` and "임기 n년"
  - 8 small dots = endings collected for that role
- Colors: assembly `#2E9E6B`, president (gov) `#3B6FE0`, court `#7B52D3`.

### 3.4 Newspaper Intro (every run, short)
- A "다온일보" front page slides in: masthead, `roles[x].headline` with `{name}` replaced, player avatar (happy) in front of the building. Button **임기 시작!**

### 3.5 Tutorial (first run only, 3 quick steps, tap to advance, skippable)
1. Animated hand swiping a card → "밀어서 결정!"
2. Gauges highlighted, one draining → "하나라도 바닥나면 끝!"
3. Power meter highlighted with both red ends → "권력은 가운데가 안전!"

### 3.6 Game screen (must never scroll; fits all target viewports)
Layout, top to bottom:
- **Gauge bar**: 4 big gauges (icon ≥ 56px on tablets) each with its short label underneath (국민 / 살림 / 법 / 권력).
  - p, m, l: icon silhouette that fills from the bottom (Reigns style).
  - w 권력: same size, but a vertical meter with **red danger bands at top and bottom**, green middle band, and a marker showing the value. Must read instantly as "keep it in the middle".
  - A gauge in danger (p/m/l ≤ 20, or w ≤ 15 or ≥ 85) pulses red.
  - Effect preview: while dragging (or hovering a choice button with a mouse), show a dot above each gauge the choice will change. Dot size = magnitude (|Δ| ≤ 5 small, ≤ 10 medium, > 10 large). **Do not show direction** — players must think.
- **Speech**: the card `text` in a speech bubble pointing at the card. Very large (target 30px on tablets, never below 22px), max 2 lines, `word-break: keep-all`.
- **Card**: the character portrait card (~3:4). Below the portrait: a name plate with the character name and a small colored chip for the group (시민 / 언론 / 기업 / 정부 / 국회 / 법원 / 헌법재판소).
- **Choices**: two big buttons with arrows: `◀ left.label` and `right.label ▶`.
  - Landscape: buttons sit left and right of the card, vertically centered.
  - Portrait: buttons sit under the card, side by side.
  - Label text ≥ 24px. Buttons ≥ 64px tall.
- **Footer**: "임기 n년 차" + a 20-tick progress bar, a 권한 수첩 icon button (with a badge when something new was added), and a menu (pause) button.

Interaction:
- Drag the card with pointer events (touch + mouse). The card follows the finger, rotates up to ~12°. As it passes the side, the matching choice button lights up and the label appears on the top edge of the card. Release beyond ~30% of card width (or a fast flick) commits; otherwise spring back.
- Tapping a choice button commits immediately (card flies out that way).
- Keyboard (Chromebook): ← / → commit, Enter/Space confirm dialogs, Esc closes overlays.
- Lock input during transitions (no double choices).
- After a choice: card flies off → gauges animate (≈500ms) with a small "+"/"−" sparkle (green up / red down) → stamp or power modal if any → next card flips in. Keep the whole cycle snappy (≈900ms without modals).
- On death: freeze 700ms, the responsible gauge flashes and shakes, then the ending newspaper.

### 3.7 Stamp (월권 / 견제 실패)
- A big rotated rubber stamp slams onto the screen with a short screen shake:
  - `overreach` → red stamp "월권!"
  - `nocheck` → steel-blue stamp "견제 실패!"
- Under it, the choice's `stamp.text` in a big line. The **first time** each stamp type appears, also show `data.stamps[type].meaning` in a smaller line.
- Auto-dismiss after ~2.4s or on tap.

### 3.8 New Power modal
- A card flips in: org color, org icon, "새 권한 카드!" small label, power `name` (very big), `desc` (one line, big).
- Button **수첩에 넣기** → the card shrinks and flies to the notebook icon in the footer.

### 3.9 Ending newspaper (호외)
- Classic spinning-newspaper entrance (spin + scale in, ~700ms; reduced-motion: fade).
- Contents: masthead "다온일보 호외" (Nanum Myeongjo), a date line "다온력 {turn}일째" style or "임기 n년 차", **headline** (huge, Black Han Sans), illustration (player avatar with `art.mood` + `art.prop`), `story` (one line), and a boxed **"삼권분립 노트"** with a lightbulb icon showing `note`.
- If first time: a red "NEW!" stamp. Show `엔딩 n/24`.
- Buttons: **다시 하기** (same role) · **역할 바꾸기** · **엔딩 도감**.
- `complete`/`legend` endings get confetti; `legend` gets gold styling.

### 3.10 엔딩 도감 (Endings)
- Tabs: 국회의원 / 대통령 / 대법원장 (role colors). Grid of 8 mini newspapers.
- Unlocked: thumbnail with headline; tap → full newspaper view.
- Locked: blank paper with a big "?" and the `hint`.
- Header counter `n / 24`.

### 3.11 권한 수첩 (Power Notebook)
- Top: the **견제 관계도** — a triangle of the three buildings (국회 top, 정부 bottom-left, 법원 bottom-right) with the 6 arrows from `data.checks`. An arrow is colored and labeled if any of its `powers` is obtained; otherwise dashed gray with "?".
- Below: power cards grouped in 4 columns/sections: 국회 / 정부 / 법원 / 헌법재판소 (헌재 color `#B8434F`). Locked = silhouette with "?". Unlocked = name + desc.
- Counter `n / 18`. Newly added cards glow once.

### 3.12 Settings (gear icon)
- Sound on/off, change name & face, reset all progress (two-step confirm: "정말 지울까요?").

## 4. Visual design (one consistent style)

**Concept: "다온 공화국" flat paper-cut editorial illustration.** Warm paper background, bold flat shapes, no outlines, soft drop shadows, subtle paper grain. Friendly and a little humorous, never childish-babyish.

Tokens:
- Paper `#F4EEE2`, paper-dark `#E9E0CF`, ink `#24212B`, ink-soft `#5B5566`, white card `#FFFDF8`
- Group colors: citizen `#F2994A`, press `#6B7A8F`, business `#E0B33A`, gov `#3B6FE0`, assembly `#2E9E6B`, court `#7B52D3`, ccourt `#B8434F`
- Danger `#E5484D`, safe `#2EB872`, gold `#F5C542`
- Radius 20–28px; shadow `0 10px 30px rgba(36,33,43,.15)`
- Subtle paper grain via an inline SVG noise filter or tiny CSS pattern (very low opacity).
- Game background: role-colored large building silhouette at the bottom (~8% opacity) and a soft sky gradient.

### Characters (`js/art.js`)
Write one parametric SVG portrait system so every character shares the same proportions and construction. viewBox `0 0 300 360`, bust portrait.
- Big rounded head (~45% of height), simple dark oval eyes with a tiny white highlight, expressive eyebrows, small rounded nose one shade darker than skin, simple mouth curve, soft rosy cheeks. Flat colors with one darker shade per shape for depth. No outlines.
- Background: group color with a soft radial gradient + a faint pattern (dots or diagonal stripes, ~6% opacity) + a faint org emblem watermark.
- Expressions: `neutral` for cards; player avatars also need `happy`, `sad`, `shock` (sweat drop), `proud` (sparkles).

| id | look |
|---|---|
| grandma 봉순 할머니 | short silver curly perm (clustered circles), round glasses, pink cardigan, warm smile |
| kid 도윤 | 6th grader, messy black hair, backward yellow cap, big grin, orange backpack straps |
| shopkeeper 떡볶이 사장님 | red bandana, apron with a tiny tteokbokki icon, round friendly face, sweat drop |
| teacher 다정 선생님 | shoulder-length hair, beige cardigan, book held at chest |
| activist 초록 활동가 | green beanie, earth pin, scarf, determined brows |
| reporter 나팩트 기자 | thick-rimmed glasses, "기자" press badge, microphone, sharp short hair, sly smile |
| tycoon 왕부자 회장 | combover, thick curled mustache, gold tie, smug half-closed eyes, double chin |
| secretary 한결 비서실장 | neat side part, navy suit, earpiece, tablet |
| minister 오성실 장관 | gray temples, glasses, suit with pin, folder |
| police 박든든 경찰관 | police cap with badge, navy uniform, sturdy jaw |
| president 대통령 (NPC) | silver hair, navy suit, red tie, small 다온 flag pin |
| lawmaker 고집세 의원 | thick stubborn eyebrows, gray-green suit, round gold 국회 badge, smirk |
| aide 민지 보좌관 | ponytail, glasses pushed up on head, stack of papers, lanyard ID |
| judge 정의로 판사 | black robe with purple collar band, calm serious face |
| chief 대법원장 (NPC) | white hair, black robe with gold & purple trim, wise |
| justice 헌법재판관 | black robe with maroon trim, glasses, stern but fair |

Player avatar = chosen face preset (4) × role outfit:
- 국회의원: green blazer + round gold badge
- 대통령: navy suit + 다온 flag pin
- 대법원장: black robe + purple trim

Also draw in the same style: 3 buildings (generic, not real buildings), gauge icons (people / money pouch / law scroll / balance scale), org emblems, ending props (`flowers, trophy, emptyChairs, emptySafe, gavel, scarecrow, brokenCrown, ferrisWheel, envelope, phone, ballot, brokenScale`), a hand icon for the tutorial, notebook icon, gear icon, sound icons.
The fictional "다온" flag: a simple design (e.g., a sun-like circle with three colored stripes for the three branches). Do not use the real Korean flag or real buildings.

## 5. Sound (`js/sfx.js`)
Synthesize with WebAudio (no files): swipe whoosh, card flip, gauge up blip, gauge down blip, stamp thud, power-card chime, newspaper fanfare, button tick. **Default: sound OFF** (classroom with 25 tablets). Toggle persists. Create the AudioContext only after a user gesture.

## 6. UX details checklist
- Text sizes: speech ≥ 30px on tablets (clamp down to 22px only on very small phones), choice labels ≥ 24px, buttons ≥ 22px, gauge labels ≥ 16px, headlines 48–64px. Use `clamp()`.
- Korean wrapping: `word-break: keep-all; overflow-wrap: anywhere;` everywhere.
- Touch targets ≥ 56px. `touch-action: manipulation` on buttons, `touch-action: none` on the draggable card, `overscroll-behavior: none` on body, no text selection on game UI, no pinch-zoom breaking the layout.
- Use `100dvh`; respect safe-area insets.
- Target viewports (all must fit the game screen without scrolling): 1366×768, 1280×800, 800×1280, 1180×820, 1024×768, 768×1024, and a 390×844 phone.
- Visible focus ring for keyboard users; aria-labels on icon buttons.
- `prefers-reduced-motion`: replace spins/shakes with fades.
- Never block on fonts: `font-display: swap`; layout must not jump badly when fonts load.
- Nothing hover-only.
- Every button has pressed state (scale 0.96) and disabled state.

## 7. Done when
- Every card id in `data.js` can appear and both choices work; chains (`next`) and `when` cards work; all 24 endings reachable; all 18 powers obtainable (8 via endings/cards as specified).
- Progress (endings, powers, name, face, sound, tutorial seen) persists across reloads and resets correctly.
- All screens look right at every target viewport, no scrolling on the game screen, no overlapping text.
- No console errors. Opening `index.html` via file:// works.
- Add a hidden debug helper for testing only: `?debug=1` in the URL shows a tiny panel to set gauges and jump to any ending (not visible otherwise).
