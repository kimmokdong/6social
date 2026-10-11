# 가짜 여행자를 찾아라 — Image list (for Codex image generation)

Use the built-in image generation tool. Save originals to `assets/raw/` and optimized WebP to `assets/img/`.

## Shared style (append to EVERY prompt)
> Soft flat gouache travel-postcard illustration, warm natural palette, visible but gentle brush texture, clean simple readable shapes, soft afternoon light. No text, no letters, no numbers, no logos, no signatures, no borders, no frames. Not photorealistic.

Scenes: landscape 3:2 (1536×1024). The key subject must be large and obvious — a 12-year-old must recognize it at thumbnail size (~160px). No people in the foreground (tiny distant figures are OK). Do not depict any ethnic group stereotypically.

Reference for the target look: `_imgtest/savanna.png` in the parent folder (already generated, reuse it as `sv_giraffe`).

## Climate scenes (id → subject)

### 열대우림 (tropical rainforest)
- `rf_jungle` — dense multi-layered rainforest along a brown river, very tall trees, hanging vines, misty humid air, deep lush greens. Absolutely no open grassland.
- `rf_rain` — a sudden heavy afternoon downpour (squall) over a rainforest riverside village, dark clouds, sheets of rain, puddles, still very green and lush.
- `rf_house` — a wooden stilt house (raised high on poles) at the edge of a brown rainforest river, a dugout canoe tied below, thick jungle behind.
- `rf_parrot` — a colorful scarlet macaw and a toucan perched in dense wet rainforest foliage, large leaves, water droplets.
- `rf_fruit` — a riverside stall piled with bananas, papayas and cacao pods, dense jungle behind, humid.

### 사바나 (savanna)
- `sv_giraffe` — (reuse `_imgtest/savanna.png`) dry-season golden tall grass, scattered umbrella acacia trees, giraffes.
- `sv_waterhole` — dry season: zebras and wildebeest crowded around a small shrinking muddy waterhole, cracked dry earth, dusty golden grassland, a few acacia trees.
- `sv_wetseason` — rainy season on the savanna: fresh green tall grass, scattered umbrella acacia trees, dark storm clouds with rain falling in the distance, zebras grazing. Open grassland, NOT a forest.
- `sv_huts` — a cluster of round mud huts with conical thatched roofs and a thorny branch fence, on open golden grassland with a few acacias.
- `sv_lion` — a pride of lions resting in the shade of a lone umbrella acacia on golden grassland.

### 사막 (desert)
- `ds_dunes` — huge orange sand dunes under a blazing sun, a camel caravan crossing, no plants at all.
- `ds_oasis` — a desert oasis: a small blue pool surrounded by date palm trees, sand dunes all around.
- `ds_house` — a desert town of thick-walled mud-brick houses with tiny windows and flat roofs, sand-colored, harsh sunlight, a date palm.
- `ds_night` — a desert night: sand dunes under a sky full of stars, a small campfire with a tent and two camels resting, cold blue night tones.

### 스텝 (steppe)
- `st_grass` — endless flat steppe of short green grass to the horizon, a flock of sheep, huge sky, absolutely no trees.
- `st_ger` — a round white felt ger (yurt) with a small door on short-grass steppe, horses tied nearby, no trees.
- `st_winter` — winter on the steppe: snow-covered flat grassland, a white ger with smoke from its chimney, horses with frosty breath, very cold.
- `st_horse` — a herd of horses galloping across short-grass steppe, distant tiny riders, rolling bare hills, no trees.

### 지중해성 (Mediterranean)
- `md_village` — a hillside village of white houses with blue domes above a bright blue sea, blazing summer sun, dry hills.
- `md_olive` — an olive grove with twisted silver-green olive trees on dry golden hills under a strong summer sun.
- `md_vineyard` — sunny vineyard rows with ripe purple grapes on a dry hillside, a stone farmhouse.
- `md_winterrain` — a rainy winter day in a narrow stone alley of a Mediterranean town, wet cobblestones, puddles, potted lemon tree, gray sky.

### 서안 해양성 (marine west coast)
- `wm_pasture` — lush bright-green rolling pasture with black-and-white dairy cows under an overcast gray sky with light drizzle, stone walls, cool and damp.
- `wm_street` — a rainy city street with old brick buildings, several open umbrellas (tiny figures), wet reflective pavement, gray sky.
- `wm_cheese` — a cozy market stall with big wheels of cheese and bottles of milk, green meadow and cloudy sky visible behind.

### 냉대 (taiga / subarctic)
- `tg_forest` — an endless dense forest of dark-green spruce and fir (conifer) trees stretching to the horizon, a river winding through.
- `tg_cabin` — a log cabin with a big stack of firewood among tall conifer trees, smoke from the chimney.
- `tg_snow` — deep winter: heavy snow on a dense conifer forest, a frozen river, very cold blue light.
- `tg_summerlake` — warm sunny summer: a calm blue lake surrounded by dense conifer forest, a small wooden dock, wildflowers.
- `tg_moose` — a moose standing at the edge of a dense conifer forest by a marshy lake.

### 툰드라 (tundra)
- `td_reindeer` — flat treeless tundra covered in moss and lichen, a herd of reindeer, low gray sky, snow patches. Absolutely no trees.
- `td_summer` — brief tundra summer: tiny wildflowers, moss, shallow puddles on flat treeless land, distant snow patches, cool light. No trees.
- `td_winter` — snowy treeless tundra with a reindeer-pulled sled, pale cold light.
- `td_stilts` — colorful houses raised on stilts above frozen ground in a snowy treeless arctic town.

### 고산 (highland)
- `al_city` — a city in a high mountain valley surrounded by tall green-and-snowy peaks, clear crisp sky, spring-like green.
- `al_llama` — llamas and alpacas on high mountain grassland with snowy peaks behind, clear thin air.
- `al_potato` — a mountain market stall with many varieties of colorful potatoes (purple, yellow, red) in woven baskets, peaks behind.
- `al_terrace` — terraced green fields on steep mountainsides, high peaks, clouds below.

## Characters

Square 1:1 (1024×1024) bust portraits, friendly, same gouache style, plain warm cream background `#F3E9D7`, centered, shoulders up, looking at the viewer, gentle smile.
For consistency, generate the 8 travelers as **two sheets of 4 characters in one row** each (1536×1024), evenly spaced, same scale, plain cream background, then crop each into its own square.

Travelers (diverse; avoid stereotypes):
Each traveler must look clearly different (gender, age, hair, skin tone, silhouette). Names are Korean, so 하늘·준호·아라·박 할아버지·태양 should read as East Asian.
1. `t_haneul` 하늘 — **teenage girl (~15)**, East Asian, short black bob, yellow rain jacket, holding a small action camera on a selfie stick
2. `t_junho` 준호 — **young man (~25)**, East Asian, short black wavy hair, round glasses, olive photographer vest, big camera with strap (no brand text)
3. `t_miso` 미소 — **woman (~35)**, wildlife scientist, safari hat, binoculars around neck, khaki shirt
4. `t_leo` 레오 — **young man (~28)**, tan skin, short beard stubble, red beanie, huge hiking backpack straps, big friendly grin
5. `t_ara` 아라 — **woman (~30)**, East Asian, cheerful cook, hair in a bun, apron over a striped shirt
6. `t_park` 박 할아버지 — **grandpa (~70)**, East Asian, white beard, bucket hat, hiking jacket
7. `t_sophie` 소피 — **woman (~40)**, dark skin, glasses, curly hair tied back, scientist holding a notebook and pencil
8. `t_taeyang` 태양 — **boy (~12)**, East Asian, baseball cap, big smile, small backpack

Mascot: `owl_point`, `owl_happy`, `owl_shock` — a cute round owl detective with a tiny brown deerstalker hat and a magnifying glass, same gouache style, on plain cream background. Generate the three poses side by side in ONE image (pointing with the magnifier / cheering happily / shocked with wide eyes), then crop.

## Items

One sticker sheet: 16 travel items in a strict 4×4 grid, each item centered in its own cell with generous empty space between items, plain cream background `#F3E9D7`, same gouache style, each item drawn alone with no shadow touching neighbors:
1 `raincoat` yellow raincoat, 2 `umbrella` open umbrella, 3 `puffer` thick down puffer jacket, 4 `beanie` knitted wool hat,
5 `sunglasses`, 6 `sunscreen` sunscreen tube, 7 `bugspray` mosquito repellent spray can, 8 `canteen` large water canteen,
9 `binoculars`, 10 `robe` long loose light-colored robe/scarf, 11 `boots` rubber rain boots, 12 `handwarmer` hand warmer pouch,
13 `oxygen` small portable oxygen can, 14 `camera`, 15 `hikingboots` hiking boots, 16 `tshirt` short-sleeve t-shirt.
Crop each item by detecting its non-background bounding box (connected components), not by a fixed grid, then pad to a square.

## Cover
- `cover` — a detective-themed travel still life: an open vintage suitcase covered in travel stickers, scattered polaroid photos of different landscapes (jungle, desert, snowy forest), a big magnifying glass, a passport, a small globe. 3:2. Warm cream background. No text.

## Output
- `assets/img/scenes/{id}.webp` — 1200×800, quality ~80
- `assets/img/people/{id}.webp` — 512×512, quality ~85
- `assets/img/items/{id}.webp` — 256×256 with cream background, quality ~85
- `assets/img/cover.webp` — 1500×1000
- Keep the original PNGs in `assets/raw/` (they will be deleted later).
- Write `assets/img/manifest.json` listing every file and its size.

## Added later: 빙설 (ice cap) — same shared style
- `ic_icesheet` — an endless flat white ice sheet under a pale blue sky, wind-carved snow ridges, a distant blue ice cliff, absolutely no plants, no animals, no land visible.
- `ic_station` — a small cluster of bright red and orange polar research station buildings on stilts on a vast ice sheet, a tracked snow vehicle, antenna mast, no trees, no plants.
- `ic_penguin` — a colony of emperor penguins standing on sea ice next to huge white icebergs and dark blue water, Antarctica, no plants.
- `ic_blizzard` — a fierce blizzard: whiteout snow blowing sideways across a flat ice sheet, a lone orange flag marker, cold blue-white light.
