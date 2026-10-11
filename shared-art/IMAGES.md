# 6학년 사회 게임 시리즈 — 공용 그림 (for Codex image generation)

Goal: give the "story" pictures of 삼권 스와이프 and 다온시 70년 the same painted look as 가짜 여행자.
Use the built-in image generation tool only (no code/SVG/PIL drawing). Save originals to `raw/`, optimized WebP to the folders below.

## Shared style (append to EVERY prompt)
> Soft gouache storybook illustration, warm natural palette, visible but gentle brush texture, clean readable shapes, friendly and slightly humorous, consistent character design. No text, no letters, no numbers, no logos, no signatures, no borders.

Style reference (read these and match them): `../fake-traveler/assets/img/people/t_junho.webp`, `../fake-traveler/assets/img/people/t_park.webp`, `../fake-traveler/assets/img/scenes/rf_house.webp`.
All people are East Asian (Korean) unless stated. Avoid stereotypes. No real politicians, no real flags, no real buildings, no real brand logos.

## 1. Characters — `people/{id}.webp` (512×512, quality ~85)
Bust portraits (shoulders up), facing the viewer, centered, plain warm cream background `#F3E9D7`, same scale and framing for all.
Generate in sheets of 4 in one row (1536×1024), evenly spaced, then crop each into its own square (check nothing is cut off or mixed).
Each character keeps the recognizable features of the existing flat versions in `../samgwon-swipe` (same names, colors and props):

| id | look |
|---|---|
| grandma | 봉순 할머니 — kind grandma (~75), short silver curly perm, round glasses, pink cardigan, warm smile |
| kid | 도윤 — 6th-grade boy (~12), messy black hair, yellow cap worn backwards, big grin, orange backpack straps |
| shopkeeper | 떡볶이 사장님 — cheerful snack-shop owner (~45), red bandana, white apron with a tiny tteokbokki drawing, round face, a little sweat |
| teacher | 다정 선생님 — gentle teacher (~35), shoulder-length hair, beige cardigan, holding a book |
| activist | 초록 활동가 — environmental activist (~28), green beanie, earth pin, scarf, determined look |
| reporter | 나팩트 기자 — reporter (~30), thick-rimmed glasses, spiky short hair, press badge without text, microphone, sly smile |
| tycoon | 왕부자 회장 — rich company chairman (~60), combover, thick curled mustache, gold tie, smug half-closed eyes, double chin (funny, not scary) |
| secretary | 한결 비서실장 — presidential chief of staff (~40), neat side part, navy suit, earpiece, tablet |
| minister | 오성실 장관 — government minister (~55), gray temples, glasses, suit with a small pin, folder |
| police | 박든든 경찰관 — police officer (~35), police cap with plain badge, navy uniform, sturdy jaw, friendly |
| president | 대통령 — president (~60), silver hair, navy suit, red tie, small pin (not a real flag) |
| lawmaker | 고집세 의원 — lawmaker (~55), thick stubborn eyebrows, gray-green suit, round gold pin, smirk |
| aide | 민지 보좌관 — legislative aide (~27), ponytail, glasses pushed up on head, stack of papers, lanyard ID |
| judge | 정의로 판사 — judge (~45), black judge robe with purple collar band, calm serious face |
| chief | 대법원장 — chief justice (~65), white hair, black robe with gold and purple trim, wise |
| justice | 헌법재판관 — constitutional court justice (~55), black robe with maroon trim, glasses, stern but fair |

## 2. Player avatars — `players/p{face}_{role}_{mood}.webp` (512×512)
Same framing and background as the characters. 4 faces × 3 roles × 2 moods = 24.
- faces (아이들이 자기와 닮은 모습을 고를 수 있게 **남자 2 · 여자 2**, 한눈에 성별이 보이게):
  `0` MAN ~32, short dark-brown side-part hair, light skin, clearly masculine face (stronger jaw, thicker eyebrows) · `1` MAN ~32, short curly black hair, brown skin, clearly masculine face ·
  `2` WOMAN ~30, brown bob hair, fair skin · `3` WOMAN ~30, long black ponytail, tan skin, clearly feminine face
  (2026-10-10: 처음 생성본은 0·1번까지 여성처럼 보여서 0·1번을 남성으로 다시 생성)
- roles (outfit): `assembly` green blazer + round gold pin · `president` navy suit + small pin · `court` black robe with purple trim
- moods: `happy` (big smile) · `worried` (worried eyebrows, small sweat drop)
Generate each face as one sheet of 6 (3 roles × 2 moods, 3 columns × 2 rows) so the same face stays identical, then crop.

## 3. 삼권 스와이프 ending backdrops — `samgwon/` (1200×800)
- `bg_assembly`, `bg_president`, `bg_court`: a wide painted street scene with the institution's building in the center back, fictional design (assembly: green dome; government: modern blue building with a flag pole without a real flag; court: classical columns with a balance-scale motif), empty foreground for a character, soft daylight. No people.
- `props` sticker sheet (4×3 grid, cream background, crop by detected bounding boxes to `samgwon/prop_{id}.webp` 256×256): flowers, trophy, emptyChairs (two empty chairs), emptySafe (open empty safe), gavel, scarecrow, brokenCrown, ferrisWheel, envelope, phone, ballot (ballot box), brokenScale.

## 4. 다온시 70년 — `daon/` (1200×800)
Era newspaper photos (a Korean town in that decade, painted like an old-to-new photo, no identifiable people, no text):
- `era0` 1960s: rice fields with thatched-roof houses and the first small textile factory with a chimney, dirt road
- `era1` 1970s: a new highway with trucks, a steel mill with glowing furnace and a shipyard crane in the distance
- `era2` 1980s: a car factory lot full of new cars, apartment blocks rising, a stadium in the distance
- `era3` 1990s: a clean white semiconductor factory, computers in an office window, a busy city street
- `era4` 2000s: a glowing city at dusk with internet cafés and many phone screens lighting up, glass office towers
- `era5` 2010s: a big concert stage with colorful lights and a happy crowd seen from behind, city skyline
- `era6` 2020s: wind turbines and solar panels next to a modern battery factory, electric buses, green parks
Ending scenes:
- `end_together`: a bright green modern city with parks, clean river, factories with solar roofs, people enjoying
- `end_gray`: a busy port city under thick gray smog, many smokestacks and cargo ships
- `end_unfair`: shiny glass towers next to small run-down houses, a clear contrast
- `end_green`: a quiet green village with fields and few jobs, peaceful but sleepy
- `end_stuck`: rusty closed old factories, empty streets
- `end_grown`: an ordinary bustling city, a mix of old and new

## 5. 떡볶이 타이쿤 — `tteok/`
Extra characters (same rules as section 1, add to `people/`):
- `ad_agent` 광고 회사 직원 — flashy salesperson (~35), loud checkered jacket, big grin, holding a stack of colorful flyers (no text)
- `ftc_officer` 공정거래위원회 조사관 — fair-trade investigator (~45), neat dark suit, ID badge without text, clipboard, serious but kind
Scenes (1200×800, no text anywhere, signs are blank or show only a picture of a tteokbokki bowl / a crown):
- `title` — a cozy tteokbokki snack shop in front of an elementary school at golden hour, a big steaming pan of red tteokbokki on the counter, kids with backpacks lining up; across the street a flashy black-and-gold chain store with a crown sign
- `end_best` — the little shop packed with happy kids, the owner (red bandana, apron) beaming, balloons
- `end_kind` — the owner handing out bowls of tteokbokki to children at a community center, warm light
- `end_greedy` — the shop with a pile of coins on the counter but empty seats and a few unhappy faces outside, gloomy colors
- `end_rich` — the owner happily counting money behind a busy counter
- `end_normal` — the shop on an ordinary evening, a few customers, calm
- `end_closed` — the shop with its shutter pulled down on a rainy evening, a lonely umbrella
Sticker sheet (3×3 grid on cream background, crop by bounding boxes to `tteok/st_{id}.webp` 256×256): bowl (bowl of tteokbokki), cheese, sundae (Korean blood sausage slices), chairs (two small stools), staff (part-time worker in an apron, waving), clean (cleaning spray with sparkles), flyer (a colorful flyer with a tteokbokki picture), coin (gold coin), crown (gold crown)

## Output
- WebP sizes as listed (quality ~80 for scenes, ~85 for people). Keep originals in `raw/` (deleted later).
- Write `manifest.json` (every id → file, size).
- Check every image yourself: no text/watermarks, correct features, consistent style; regenerate if not.
