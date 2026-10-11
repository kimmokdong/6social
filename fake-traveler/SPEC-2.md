# 가짜 여행자를 찾아라 — Stage 2: Replay (for Codex)

Add replay value on top of the finished stage-1 game, without changing how the 10 story cases play.
Same principles as SPEC.md: **big text, only necessary words, pictures first, consistent scrapbook art, polish.**
Content for this stage is in `js/bank.js` (`window.FAKE_BANK`). Load it with a classic `<script>` after `data.js`.
**Do not change any Korean text or data in `js/data.js` or `js/bank.js`.**

## 1. 무한 수사 (Endless mode)

Unlocks when story case 10 is solved (show it on the passport as a locked special page before that, with a lock and "사건 10을 해결하면 열려요").

### 1.1 Verdict rules (must match exactly)
For evidence `ev` (with `tags`) and a claimed climate `C`, using `R = FAKE_BANK.rules[C]`:
- Walk `ev.tags` **in array order**. The first tag not in `R.allowed` makes the evidence a **lie** for C. Its reason:
  1. `FAKE_BANK.tags[tag].why` exists → that string with `{T}` replaced by `R.topic`
  2. tag `cat === 'animal'` → `` `${tags[tag].name} ${R.place} 살지 않아요!` ``
  3. otherwise → `` `${R.topic} ${R.facts[cat]}!` `` where `cat = tags[tag].cat`, and `'life'` uses `'land'`
- If every tag is allowed, the evidence is **true** for C:
  - photos/temps/quotes: `trap` (a string) is used only when `ev.home === C` → shown as a trap (the wrong-objection reason is the trap string). Otherwise reason = `okWhy` or `` `${climateName}에서도 볼 수 있어요!` ``.
  - items: `trapFor[C]` → trap with that reason; else `okWhy?.[C]` or the default reason.

### 1.2 Case generator
1. Claim `C`: random climate from `data.climates`, never the same as the previous endless case.
2. Traveler count: 3 or 4 (`endless.travelers`). From streak ≥ `fourFrom`, use 4 at 70%, else 30%.
3. Fake count k from `endless.fakeWeights` (0/1/2). k = 2 only when there are 4 travelers. Each fake's real climate `F` = random element of `data.climates[C].confuse`.
4. Pick distinct travelers from `data.travelers` at random.
5. Honest traveler (one photo, one temp, one quote, one item):
   - photo: unused photo from `data.climates[C].gallery`
   - temp: random `temps` entry with `home === C`
   - quote: random `quotes` entry with `home === C` (at most one `neutralQuotes` line per case, 20% chance, as type `quote` with no tags)
   - item: random item that is true for C
   - With probability `endless.forceTrapChance`, make sure at least one honest evidence in the case is a trap (re-roll a slot from the trap-capable pool if needed).
6. Fake traveler from F:
   - photo: unused photo from `data.climates[F].gallery` that is a **lie** for C (required).
   - Then exactly one more lie among temp/quote/item: pick from `temps`/`quotes` with `home === F` (or items true for F) that are lies for C.
   - Remaining slots: **neutral** = true for both C and F and not a trap for C (temps from F's home pool that are true for C, `neutralQuotes`, or items true for both). If no neutral option exists for a slot, use another lie.
7. Validate before showing: every honest evidence is true for C; every fake has 2+ lies and its other evidence is true for C; no photo repeats in a case. If validation fails, regenerate (never show an unfair case).
8. Reveal options for each fake: `F` + up to 2 other climates (prefer `C`'s other confuse entries, then random), never `C`, shuffled.
9. Ask for a seeded RNG (`?seed=` in debug) so a case can be reproduced in testing.

### 1.3 Play changes in endless mode
- Header shows **`가짜 ?명`** instead of `n/m`.
- A big button at the bottom of the board: **"수사 끝! 나머지는 진짜"**. When pressed:
  - If every fake has been caught and revealed → solved.
  - If a fake is still hidden → fail screen "가짜를 놓쳤어!", that traveler's lie evidence is circled to show why, streak resets.
  - With 0 fakes, pressing it right away is the correct answer → solved (badge `nofake`).
- Everything else (3 돋보기, objections, reveal, stars) works like story cases.
- Streak: consecutive endless solves. Show "연속 n건" on the board header and the result screen. Save best streak.
- After solving: **다음 사건** (new random case) · **여권**.

## 2. 탐정 등급 & 배지
- Total stars = best stars of story cases + all stars earned in endless mode.
- Rank = highest `ranks` entry whose `stars` ≤ total. Show the rank title and a progress bar to the next rank on the title screen and passport. Rank-up gets a celebration moment.
- Badges (`badges`): show in a **배지** tab of the passport/도감 as round stamps; locked = gray with `goal`; earned = color + "NEW" once. Conditions:
  - `first` any case solved · `perfect` ★3 five times · `trap` five solved cases that contained at least one trap and no trap was objected · `speed` solved within 30 seconds of the board appearing · `nofake` endless 0-fake case solved · `twin` endless 2-fake case solved · `streak` endless streak 10 · `dex` all climates unlocked · `photo` all photos collected.

## 3. 사진 수집
- When a case is solved (any mode), every photo that appeared on its board (and each revealed `real` photo) is collected.
- 기후 도감 detail: gallery thumbnails show collected photos; not-yet-collected ones are a blank polaroid with "?". Show `n/전체` per climate and in total on the 도감 tab.

## 4. Storage
Extend the existing `fake-traveler-v1` save (keep old saves working): `endless: { best, streak }`, `badges: []`, `photos: []`, `endlessStars`, plus counters needed for badges.

## 5. Done when
- 2,000 generated endless cases (scripted, seeded) all pass §1.2 validation, cover every climate as a claim and every confuse pair, and include 0/1/2-fake cases in roughly the configured ratio.
- Endless mode fully playable at all target viewports from SPEC.md (no scroll on the board for 3–4 travelers at tablet/Chromebook sizes), including the "수사 끝" button, fail-by-missed-fake, streaks, rank-up, badge unlocks, photo collection.
- Story cases unchanged. Old saves load. No console errors. file:// works. `?debug=1` adds: unlock endless, generate case by seed, show the hidden answer.
