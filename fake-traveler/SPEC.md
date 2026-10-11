# 가짜 여행자를 찾아라 — Build Spec (for Codex)

A visual detective game that teaches Korean 6th graders (age 12) to tell climates apart — especially the
look-alike pairs (열대우림 vs 사바나, 사막 vs 스텝, 지중해성 vs 서안 해양성, 냉대 vs 툰드라, 고산 vs 열대우림).

Each case: several travelers claim they visited one climate. One (in the final case, two) is lying — they actually
went to a look-alike climate. The player inspects each traveler's evidence (a photo, a temperature, a short quote, one packed item),
taps the suspicious one and shouts **"이의 있음!"**, then names where the liar *really* went.
Honest travelers sometimes carry **traps**: evidence that looks wrong but is actually true (e.g., rain in the savanna's wet season).
Wrong accusations cost a magnifying glass and show why the evidence was fine — that is where most learning happens.

**Audience:** 12-year-olds on school tablets (iPad, Galaxy Tab) and Chromebooks. One device per student. Classroom use.

**Top priorities (from the teacher):**
1. **Text as big as possible, and only the text that is truly needed.** Pictures carry the game. No paragraphs.
2. UI/UX that fits 6th graders: instantly obvious, big touch targets, satisfying feedback.
3. One consistent art style: the generated gouache illustrations + a warm detective-scrapbook UI around them.
4. Polish in the details.

---

## 1. Tech constraints
- Plain static files: `index.html`, `css/style.css`, `js/data.js` (already written), `js/sfx.js`, `js/game.js`, images in `assets/img/` (already generated; see `assets/img/manifest.json`).
- **No build step, no frameworks, no external JS libraries.** Classic `<script>` tags (not ES modules) so double-clicking `index.html` (file://) works. Do not `fetch()` the manifest or JSON — reference image paths directly (`assets/img/scenes/{id}.webp`, `assets/img/people/{id}.webp`, `assets/img/items/{id}.webp`, `assets/img/cover.webp`).
- Fonts with system fallbacks:
  - Headings: Google Fonts `Do Hyeon`
  - Traveler quotes (handwriting): Google Fonts `Gaegu` (700)
  - Everything else: Pretendard Variable — `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
- Preload the current case's images before showing the board (show a short loading state with the owl). Use `loading="lazy"` elsewhere (도감).
- Progress in `localStorage` key `fake-traveler-v1` (wrap all access in try/catch; the game must still run without storage).
- No console errors. **Do not change any Korean text or data in `js/data.js`.**

## 2. Rules
- Cases unlock in order (case n+1 unlocks when case n is solved). Solved cases can be replayed.
- Each case starts with **3 magnifying glasses (돋보기)**.
- Tapping an evidence tile opens it large. Two buttons: **수상해!** and **통과**.
  - `v: 'lie'` → correct. "이의 있음!" burst, the tile gets a red marker circle + "거짓!" stamp, show `why`. The traveler is now **caught** → go to the reveal step for that traveler.
  - `v: 'ok'` or `'trap'` → wrong. Lose one 돋보기, show "앗! 진짜 증거야" + the reason: `why` if present, else `okWhy` with `{claim}` replaced by the claimed climate name. Mark that tile with a small green check so it is not retried by accident.
  - A traveler's other evidence stays tappable after they are caught, but it no longer matters.
- **Reveal step** (per caught liar): "{name}의 진짜 여행지는?" with the 3 `options` as big climate cards (image + name + group color chip, shuffled).
  Correct → "들켰다!" with the traveler portrait and their `real` photo, one line "{name}은(는) 사실 {fake 기후명}에 다녀왔어!". Wrong → lose one 돋보기, that option grays out, choose again.
- Case solved when every liar (travelers with `fake`) has been caught and revealed. Final case has two liars; the header shows `가짜 0/2`.
- 돋보기 reaches 0 → "가짜가 도망쳤어!" fail screen → **다시 도전** restarts the case.
- Stars: 3 = no mistakes, 2 = one mistake, 1 = two mistakes. Keep the best stars per case.
- Solving a case unlocks the 도감 cards for the claimed climate and every liar's `fake` climate.

## 3. Screens

### 3.1 Title
- `cover.webp` as a large framed polaroid/illustration; logo "가짜 여행자를 찾아라!" (Do Hyeon, huge) with a magnifier accent; the owl mascot (`owl_point`) peeking in.
- Buttons: big **시작** · **기후 도감** (`n/전체 기후 수`). Sound toggle top-right.

### 3.2 Passport (case select)
- An open passport spread. One stamp slot per case (count from `data.cases`, currently 10 — never hardcode counts). Each slot: case number, claimed climate name, a small round crop of the climate's main image.
- Locked: faded with a lock. Solved: a colorful rubber stamp overlay in the climate's group color with the stars earned. The next case gently pulses.

### 3.3 Case intro
- Large climate card for the claim: main image, climate name (very big), group chip (열대/건조/온대/냉대/한대/고산 in its color), and 3 icon facts: 🌡 `temp`, ☔ `rain`, 👀 `look`.
- Traveler polaroid portraits in a row.
- One line: "가짜가 n명 숨어 있어!" Button **수사 시작**.
- Case 1 (`tutorial: true`): the owl shows the `tutorial` lines at the matching moments (`intro`, `board`, `reveal`) in a speech bubble; tap to dismiss. The `board` hint also pulses the first evidence row.

### 3.4 Board (main game screen)
Header (one row): case number, claimed-climate chip (tap → opens the climate card again, no penalty), 돋보기 icons ×3, `가짜 n/m`, menu.

**Line-up table** — this layout is important because it lets kids compare the same kind of clue across travelers:
- One row per traveler: portrait polaroid + name on the left, then 4 evidence tiles in fixed columns:
  📷 사진 | 🌡 기온 | 💬 한마디 | 🧳 짐. Column header icons at the top.
- Photo tile: the scene image cropped 3:2 in a white polaroid frame with a slight random tilt and a strip of washi tape. `cap` (e.g., "1월", "우기", "밤") shown as a small tag on the photo.
- Temp tile: a drawn thermometer whose fill matches the number, the number very large (e.g., "-20℃", "낮 42℃"), `cap` as a small tag. Hot = warm red fill, cold = blue fill.
- Quote tile: a speech bubble with the text in Gaegu, large (≥ 26px on tablets), `word-break: keep-all`.
- Item tile: the item sticker image with its Korean name below (from `items`).
- Rows must fit without scrolling for 3–5 travelers at 1366×768, 1280×800, 1180×820, 1024×768 landscape and 768×1024, 800×1280 portrait. On a phone the board may scroll vertically.
- Caught traveler: row gets a red "가짜!" stamp on the portrait. Revealed: portrait shows a small badge with their real climate.

### 3.5 Evidence zoom (modal)
- The evidence very large (photo near full width; temp/quote/item centered and huge), the traveler's small portrait + name in the corner.
- Buttons at the bottom: **🔍 수상해!** (red, primary) and **통과** (neutral). Big (≥ 64px tall).
- Result overlays:
  - Correct: comic-style burst "이의 있음!" with screen shake (reduced-motion: no shake), then a red marker circle draws around the evidence and the `why` line appears big. Then auto-advance to the reveal step (button **정체 밝히기**).
  - Wrong: a gray "앗!" burst, one 돋보기 cracks and falls away, green check on the evidence, the reason line big. Button **계속**.

### 3.6 Reveal
- "{name}의 진짜 여행지는?" and 3 climate option cards (image, name, group chip). After a correct answer, a satisfying "들켰다!" moment: the traveler polaroid flips to show the `real` photo with a passport stamp of the fake climate.

### 3.7 Case clear
- "사건 해결!" with stars popping in one by one, the passport stamp slamming onto the slot, newly unlocked 도감 cards fanning in ("새 기후 카드!"). The owl `owl_happy`.
- Buttons: **다음 사건** · **여권**.

### 3.8 Fail
- The owl `owl_shock`, "가짜가 도망쳤어!", **다시 도전** · **여권**.

### 3.9 기후 도감
- Two tabs: **기후 카드** and **구별법**.
- 기후 카드: one card per climate in `data.climates` (currently 10), grouped by group (열대 → 건조 → 온대 → 냉대 → 한대 → 고산), each in its group color. Locked = silhouette + "?". Unlocked card opens a detail view: big main image + swipeable/tappable gallery of the climate's `gallery` images, the 3 icon facts, `where`, and "헷갈리는 친구" chips for `confuse` (tap to jump to that card if unlocked).
- 구별법: the `ladder` drawn as a simple visual flow chart with big icons (⛰ / ☔ / 🌡) and the climate group chips at the ends. Very little text — only the `q` and `label` strings.

### 3.10 Settings (gear in the menu)
- Sound on/off, reset progress (two-step confirm "정말 지울까요?").

## 4. Visual design
**Concept: the climate detective's scrapbook.** Warm kraft-paper / cork background, cream cards, polaroid photos with washi tape, red marker circles, rubber stamps, a passport. The generated gouache illustrations are the heroes; the UI frames them.

Tokens:
- Kraft `#E8D9BF`, cream `#FBF5EA`, paper `#F3E9D7`, ink `#2D2620`, ink-soft `#6B5F52`, marker red `#D9412E`, check green `#3E9B5B`, stamp navy `#2F4A7A`, gold `#E6B64C`
- Group colors from `data.groups`.
- Radius 16–24px; soft shadows; subtle paper texture via CSS gradients/noise (very low opacity).
- Icons (🌡 ☔ 👀 📷 💬 🧳 🔍 돋보기, lock, gear, sound) as small inline SVGs in a consistent hand-inked style (rounded strokes, ink color) — do not rely on emoji glyphs, they render differently on iPad / Galaxy / Chromebook.

## 5. Sound (`js/sfx.js`)
Synthesize with WebAudio (no files): tap, paper slide, "이의 있음!" sting, wrong buzz, glass crack, stamp thud, star pops, clear fanfare. **Default: sound OFF.** Toggle persists. Create AudioContext after a user gesture.

## 6. UX details checklist
- Text sizes: headings 40–64px, case/board labels ≥ 20px, quotes ≥ 26px, temps ≥ 32px, buttons ≥ 22px. Use `clamp()`. Nothing below 16px.
- `word-break: keep-all; overflow-wrap: anywhere;` for all Korean text.
- Touch targets ≥ 56px, `touch-action: manipulation`, `overscroll-behavior: none`, no accidental text selection, no hover-only states, visible pressed states.
- `100dvh`, safe-area insets. `prefers-reduced-motion` → fades instead of shakes/spins.
- Keyboard: Tab/Enter work for every control; Esc closes modals.
- Images: `alt` text = the climate or item name (not a description that gives away the answer — use "여행 사진").
- Lock input during result animations.

## 7. Done when
- All cases in `data.cases` (currently 10) playable start to finish; every evidence tile responds correctly (`ok`/`trap`/`lie`); reveal works; stars, lives, fail and retry work; the final case requires both liars.
- Progress, 도감 unlocks and sound persist and reset correctly.
- Every screen fits the target viewports with no overlapping or clipped text.
- No console errors; file:// works.
- Hidden debug helper only with `?debug=1`: unlock all cases and 도감, and a button to auto-solve the current case.
