# 무역왕 6.3 우리 섬 성장 그림 3장 — Codex 이미지 생성 지시

## Goal
Three pictures of the player's home port island at three growth stages, so the island visibly changes as the nation develops.
The game shows the picture in a 170×96 px box (border-radius, teal border) at the bottom centre of the sea map (`trade-king/play6.html`).
Stage is picked by code (`game6.js` → `homeStage`): 1 = 작은 항구, 2 = 커진 항구, 3 = 무역 도시.

## Rules
- Use the built-in image generation tool (image_gen) only. No code/SVG/PIL drawing. Pillow is allowed only to resize/convert.
- Open these first and match their colours and brush feel: `trade/port_home.webp` (the current single home picture — stage 1 must look like a sibling of it), `trade/port_plains.webp`, `trade/v6/map6.webp` (the sea it will sit on).
- Same camera for all three: three-quarter top-down view, same island outline and coastline, same horizon. Only the buildings, docks, cranes, ships and fields grow between stages.
- No text, letters, numbers, flags of real countries, logos, signatures, borders, UI.
- Output: originals to `trade/v6/raw/home_1.png`, `home_2.png`, `home_3.png` (when regenerating only some stages, start from `raw/home_1.png` as the base image so the island outline matches) (1024×576 or larger, 16:9). Then WebP (quality 85) at 680×384 px to `trade/v6/home_1.webp`, `home_2.webp`, `home_3.webp`.
- Do not touch any other file. Do not edit game code.

## The three stages (keep the island outline, coast and camera identical)
**The era must visibly change, not just the harbour.** Stage 1 is an old fishing village; stage 3 is a modern city. Buildings, roads, vehicles and ships all modernise together — a modern container port next to old stone cottages is wrong.

| file | stage | era | what is on the island |
|---|---|---|---|
| home_1 | 작은 항구 | old village | A small village harbour: one wooden pier, 3–5 small stone cottages with red tile roofs, one tiny warehouse, a single small wooden sailing cargo boat, fields, dirt paths and trees. Calm, modest. (Keep the existing `home_1` — do not regenerate it.) |
| home_2 | 커진 항구 | growing town (1960s–80s feel) | Same island, grown and modernising: a stone-and-concrete quay with two piers and one crane, a medium warehouse, a brick factory with one chimney, **mostly new flat-roofed concrete two- and three-storey buildings** (shops, a school, small apartment blocks) with only a few old cottages left near the edge, paved roads with a bus and a couple of cars, street lamps, a water tower, two motor cargo ships (no sails). |
| home_3 | 무역 도시 | modern city (today) | Same island, a modern trade city: a long concrete container terminal with gantry cranes and stacked containers, big steel warehouses, a factory district with chimneys, a lighthouse, **a modern downtown of glass-and-steel office towers and 8–15-storey apartment blocks**, wide asphalt roads with cars, buses and trucks, a bridge or overpass, street lights and billboards without text, a small park with fountains, three or four modern container ships and a ferry. **No red-tile cottages remain in the centre** (at most one or two preserved old buildings as a park). Busy, bright and prosperous but still friendly and readable. |

Make the contrast obvious at 170 px wide: stage 1 = warm red roofs and green fields, stage 2 = grey concrete blocks and one chimney, stage 3 = tall glass towers, cranes and containers.

Keep the centre of the island (where the picture is cropped by the game) as the busiest part; keep the sea around it simple so the game's teal border reads cleanly.

## After generating
1. Open each result and check: same island shape in all three, no text, the harbour reads at 170 px wide (test by viewing a downscaled copy).
2. Write `trade/v6/home-notes.md`: the prompts used, sizes, and anything you changed.
3. Report which files were made. Claude will then flip `HOME_ART = true` in `trade-king/js/game6.js` and verify in the browser.
