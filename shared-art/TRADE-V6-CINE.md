# 무역왕 6.7 — 오프닝 영상 장면 12장 — Codex 이미지 생성 지시

## Goal
Sixteen cinematic scene paintings for the opening movie of the trade game (`trade-king/play6.html`), in the style of a Civilization-like intro: wide, dramatic, warm storybook painting. They are shown full-screen for about 2 seconds each with a slow Ken-Burns zoom, under black letterbox bars and a Korean subtitle line at the bottom. They will later also be used as illustrations in the in-game event windows.

## Rules
- Use the built-in image generation tool (image_gen) only. No code/SVG/PIL drawing. Pillow only to resize and convert to WebP.
- Open these first and match their painterly style, colour warmth, light and level of detail: `trade/title.webp`, `trade/end_king.webp`, `trade/end_island.webp`, `trade/end_rawOnly.webp`, `trade/v6/home_3.webp`. Same world: sunny Mediterranean-like islands, turquoise sea, friendly people of mixed backgrounds, children-friendly.
- Every image: **16:9, generate at 1536×864 (or larger), save WebP quality 85 at 1600×900** → `trade/v6/cine/<id>.webp`; keep originals in `trade/v6/cine/raw/<id>.png`.
- Composition for video: one clear subject in the centre third, strong depth (foreground / middle / background), interesting light (golden hour, glow, spotlight). Keep the top 10 % and bottom 18 % free of important detail (letterbox + subtitles cover them).
- No text, letters, numbers, signs with writing, logos, brand names, real country flags, watermarks, borders, UI, collage or split panels. No violence, no weapons used on people, no injuries. Friendly but epic.
- Do not touch any file outside `trade/v6/cine/`. Do not edit game code.

## Resource scenes (gathering and making the six goods)
| id | 물건 | scene |
|---|---|---|
| res_food | 식량 | Golden wheat fields on a hillside island at sunrise; farmers harvesting with a small red harvester and by hand, sacks of grain stacked on a wooden cart, the sea and a small harbour far below. |
| res_oil | 석유 | Oil derricks (nodding pump-jacks) on a dry coastal plain at sunset, a few orange oil barrels being rolled onto a truck, an offshore platform glowing on the sea behind. |
| res_ore | 철광석 | A terraced open-pit iron mine cut into a mountain island, miners in helmets, rail carts full of grey-red ore rocks, a conveyor down to the docks; dust in warm sunlight. |
| res_cloth | 옷 | A bright sunlit textile workshop by the harbour: rolls of colourful fabric, rows of sewing machines, workers folding pink, blue and cream T-shirts into boxes; large windows show ships outside. |
| res_steel | 철강 | Inside a steel mill: a huge ladle pouring glowing orange molten steel, sparks, workers in silver suits at a safe distance, finished steel I-beams stacked in the foreground. Dramatic glow. |
| res_tech | 첨단기기 | A clean modern high-tech factory: white robot arms assembling small friendly robots and devices on a conveyor, engineers in white coats, blue screen glow, glass wall with a modern city skyline behind. |

## Event scenes (the kinds of surprises in the game)
| id | 사건 | scene |
|---|---|---|
| ev_storm | 태풍 | A huge storm over the harbour: dark swirling clouds, lightning, giant waves crashing on the breakwater, cargo ships rocking at anchor, harbour lights on. Dramatic but nobody hurt. |
| ev_pirates | 해적 출몰 | Fog at sea at dusk: a dark old-style pirate sailing ship silhouette with tattered sails looming behind a modern cargo ship that is turning away; lanterns, mysterious green-grey mood. No fighting. |
| ev_invention | 신기술 발명 | An exciting reveal at an island science expo: a glowing new machine under a lifted cloth on a stage, inventors smiling, a crowd and children with wide eyes, spotlights and confetti. |
| ev_festival | 이웃 섬 축제 | Night festival on the harbour: paper lanterns strung over the quay, fireworks over the sea, people dancing and sharing food at long tables, boats decorated with lights. |
| ev_fire | 산불 / 위기 | A forest island at dusk with a wildfire glow on a distant ridge and smoke drifting, firefighting seaplanes dropping water, people on the beach watching safely, ships evacuating calmly. |
| ev_market | 큰 장날 · 박람회 | A gigantic busy trade fair on the quay: colourful tents and stalls with goods from many islands (wheat sacks, oil barrels, fabric, steel beams, little robots), crowds, ships of many colours moored behind. |

## Trade scenes (the heart of the game: selling, buying, sailing)
| id | 장면 | scene |
|---|---|---|
| trade_load | 짐 싣기 | Dawn at our harbour: a big crane lifting a wooden crate and colourful containers onto a cargo ship with a red hull, dock workers guiding it, wheat sacks and fabric rolls waiting on the quay, warm low sun. |
| trade_deal | 계약 | Two merchants from different islands shaking hands across a wooden table on a harbour terrace, a paper contract with a wax seal and sample goods on the table (a wheat bundle, a small oil can, a folded shirt, a steel bolt), their ships visible behind them. Smiling, hopeful. |
| trade_voyage | 먼 바다 항해 | Low dramatic angle from the water: a cargo ship with a blue hull ploughing through open sea at golden hour, white wake and spray, seagulls, another island on the horizon. Epic sense of journey. |
| trade_arrive | 도착 | A ship with a green hull arriving at a foreign island harbour with different architecture (white domes and palms), people on the quay waving, crates being unloaded, children carrying a basket of goods, festive welcome. |

## Finale (the ending: our nation grew through trade)
| id | 장면 | scene |
|---|---|---|
| finale | 번영한 우리 나라 | Golden sunset over OUR island from `trade/v6/home_3.webp`, seen from a slightly lower, more dramatic three-quarter angle: the same modern trade city with glass towers, container terminal and lighthouse, now glowing with warm lights; cargo ships with red, blue, green, purple and yellow hulls arriving in a line along a shimmering sun path on the sea; fireworks bursting over the harbour; tiny crowds celebrating on the quay. Triumphant ending feeling. Keep the island recognisable as the same place as home_3. |

## After generating
1. Open every result: 16:9, no text anywhere (zoom into signs, ship hulls, tents), centre subject clear, style consistent with the references.
2. Regenerate any image that has text, looks photographic instead of painted, or is too dark to read at 400 px wide.
3. Write `trade/v6/cine/notes.md`: the prompts used, sizes, what was regenerated.
4. If the usage limit stops you, stop and write in `notes.md` which ids are finished.
5. Report briefly which files were made.
