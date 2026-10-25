# 무역왕 6.4 — 북쪽 대륙 + 물건 6종 아이콘 — Codex 이미지 생성 지시

## Goal
Two sets of pictures for the 6.x trade game (`trade-king/play6.html`):
1. **Northern continent coast** — a wide painted band of a big continent's southern coastline, shown clipped along the top edge of the sea map.
2. **Six goods icons** — small painted "sticker" icons used everywhere in the UI (island icon strips, basket, contract sheet, tooltips, codex).

## Rules
- Use the built-in image generation tool (image_gen) only. No code/SVG/PIL drawing. Pillow is allowed only to crop, remove a flat background, resize and convert to WebP.
- Open these first and match their colours and brush feel: `trade/v6/map6.webp` (the sea map the continent sits on), `trade/port_factoryIsle.webp`, `trade/port_bigMarket.webp` (island style), `trade/ship.webp`.
- No text, letters, numbers, real-country flags, logos, signatures, borders, UI.
- Do not touch any file outside `trade/v6/`. Do not edit game code.

## 1. Northern continent — `trade/v6/continent.webp`
- Generate 1536×640 (or wider), then WebP quality 85 at 1400×420 px → `trade/v6/continent.webp`; keep the original in `trade/v6/raw/continent.png`.
- Camera: the same three-quarter top-down view as `map6.webp`. We are looking north from the sea at the **southern coast of a huge continent**.
- Composition: the **top ~65 % is land**, the **bottom ~35 % is open sea** in exactly the sea colour of `map6.webp` (so the game can blend it). The coastline runs left to right across the picture with gentle bays, and should read as "this land continues far beyond the edges" (no island outline, land touches both the left and right edges and the top edge).
- On the land, centred: a **big busy harbour city** — a long stone quay with many cranes, big warehouses, a factory district with several chimneys, dense houses climbing up hills, a few taller buildings, a lighthouse on a headland; green hills and distant blue-grey mountains behind. Several cargo ships moored. It must look richer and bigger than any island port in `trade/`, but the same friendly storybook style.
- Keep the centre of the coast the busiest (the game crops a 640×112 px band from the middle and rounds its bottom edge). Keep the far left/right simpler (hills, fields).

## 2. Goods icons — `trade/v6/goods/{id}.webp`
Six icons, same style, same scale, each a single object on a **pure white background `#FFFFFF`** so the background can be removed.
- Generate **one sheet 1536×1024 with a 3 columns × 2 rows grid**, generous white gaps between cells, objects centred in their cells and not touching each other. Order (row 1: food, oil, cloth · row 2: tech, ore, steel).
- Then with Pillow: crop each cell, turn near-white pixels (RGB all ≥ 240) fully transparent and soften the edge (alpha blur 1–2 px), trim to the object's bounding box plus 8 % padding, fit into a 256×256 transparent square (object ≈ 85 % of the box, centred), save WebP (lossless or quality 90, keep alpha) → `trade/v6/goods/food.webp`, `oil.webp`, `cloth.webp`, `tech.webp`, `ore.webp`, `steel.webp`. Keep the sheet in `trade/v6/raw/goods_sheet.png`.
- Style: painted storybook sticker, bold simple silhouette, soft gouache shading, a thin darker outline is fine, **must be readable at 24 px** — so big shapes, few details, high contrast against both white and warm wood brown. Match these colours (they are the game's current flat icons):

| id | 물건 | object | main colours |
|---|---|---|---|
| food | 식량 | a bundle of three golden wheat stalks tied with a small ribbon | wheat `#F5C542` / `#BB8B24`, ribbon `#E0533C` |
| oil | 석유 | a round orange oil barrel with two darker bands, seen slightly from above | `#E8761E`, bands `#B5561A`, top `#F2A35A` |
| cloth | 옷 | a folded pink t-shirt on top of a small stack of folded clothes (one blue, one cream) | pink `#D86A8E`, blue `#5B8FD6`, cream `#FFF3E0` |
| tech | 첨단기기 | a small friendly boxy robot with a round screen face and a little antenna with a red light | body `#6F8FC8` / `#4D6CA8`, face `#FFFDF8`, light `#E0533C` |
| ore | 철광석 | a chunky grey rock with angular facets and a few rust-orange and metallic sparkle flecks | `#89909C`, `#B1BBC7`, rust `#B5561A` |
| steel | 철강 | three stacked shiny silver steel beams (I-beams) in a neat pile, slightly angled | `#B9C2CE`, `#D2D9E2`, shadow `#6B7F99` |

- Check each result downscaled to 24×24: food, oil, ore and steel must still be told apart at a glance (ore = rock, steel = beams). If not, regenerate that cell with bigger, simpler shapes.

## After generating
1. Open every result and check: continent has land across the whole top and plain sea at the bottom, no text; icons have clean transparent edges (no white halo) and fill their squares similarly.
2. Write `trade/v6/goods-notes.md`: the prompts used, sizes, what was regenerated.
3. Report which files were made. Claude will wire them into the game (`GOODS_ART`, `.isle.world .land` background) and verify in the browser.
