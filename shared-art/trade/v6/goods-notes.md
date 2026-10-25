# 무역왕 6.4 대륙 해안·물건 아이콘 제작·검수 기록

## 완료 상태

- 내장 `image_gen`만 사용하여 대륙 해안과 물건 6종 시트를 생성했다. 사용량 제한은 발생하지 않았다.
- 생성 전 `trade/v6/map6.webp`, `trade/port_factoryIsle.webp`, `trade/port_bigMarket.webp`, `trade/ship.webp`를 모두 열어 확인했다. 생성 호출에도 화풍 참고 이미지로 전달했다.
- 생성 호출은 총 3회: 대륙 최초 생성 1회, 물건 시트 생성 1회, 대륙 구도 보정 1회. 물건 개별 재생성은 하지 않았다.
- 그림을 코드·SVG·PIL로 그리지 않았다. Pillow는 배경 제거(알파 마스크와 가장자리 정리 포함), 크롭·패딩·크기 조정·WebP 변환 및 픽셀/규격 검사에만 사용했다.
- 프로젝트 결과물은 모두 `trade/v6/` 안에 작성했다. 기존 참조 그림과 게임 코드는 수정하지 않았다. 내장 도구가 자동 보관한 생성 캐시에서 PNG를 복사해 원본을 보존했다.

## 결과 파일

| 용도 | 파일 | 실제 크기·형식 |
|---|---|---|
| 대륙 최종 원본 | `raw/continent.png` | 1942×809, RGB PNG, 3,437,470바이트 |
| 대륙 게임용 | `continent.webp` | 1400×420, RGB WebP 품질 85, 255,860바이트 |
| 대륙 최초 생성 보관 | `raw/continent-first.png` | 1942×809 PNG |
| 대륙 중앙 검수용 크롭 | `raw/continent-centre-640x112.webp` | 640×112, 무손실 WebP |
| 물건 시트 원본 | `raw/goods_sheet.png` | 1536×1024, RGB PNG, 1,843,963바이트 |
| 식량 | `goods/food.webp` | 256×256, RGBA 무손실 WebP |
| 석유 | `goods/oil.webp` | 256×256, RGBA 무손실 WebP |
| 옷 | `goods/cloth.webp` | 256×256, RGBA 무손실 WebP |
| 첨단기기 | `goods/tech.webp` | 256×256, RGBA 무손실 WebP |
| 철광석 | `goods/ore.webp` | 256×256, RGBA 무손실 WebP |
| 철강 | `goods/steel.webp` | 256×256, RGBA 무손실 WebP |
| 물건 소형 검수본 | `raw/{food,oil,cloth,tech,ore,steel}-24.webp` | 각 24×24, RGBA 무손실 WebP |

대륙은 1536×640 또는 그 이상 너비의 같은 비율을 요청했고, 도구가 1942×809로 반환했다. `raw/continent.png`는 도구 원본 그대로다. 게임용은 지시된 1400×420에 전체 그림을 Lanczos 리사이즈했다. 서로 다른 비율이므로 세로 비율이 압축되며, 임의로 지형을 잘라내지는 않았다.

## 후처리

- 시트를 좌상단부터 food / oil / cloth, tech / ore / steel 순서의 512×512 셀로 잘랐다.
- R·G·B가 모두 240 이상인 픽셀을 완전히 투명하게 했다. 해당 픽셀의 알파가 0인지 assert로 확인했다.
- 흰 매트 가장자리를 줄이도록 알파를 1px 안쪽으로 정리하고 1px Gaussian blur로 부드럽게 했다. 원래 마스크 밖으로 알파가 번지지 않도록 제한했다.
- 투명 제거 후 물체 바운딩 박스의 가로·세로 각각 8%를 양쪽에 더해 여백을 만들고, 비율을 유지하며 256×256 투명 정사각형에 맞춰 중앙 정렬했다. 물체의 긴 변은 약 85~86%를 차지한다.
- WebP는 알파를 유지하는 무손실 모드로 저장했다. 이 파일을 다시 24×24로 축소해 소형 검수본을 만들었다.
- 지시된 전역 near-white 제거는 배경뿐 아니라 물체 내부의 아주 밝은 하이라이트 일부에도 적용된다. 로봇의 밝은 얼굴 등에 작은 투명 점이 남을 수 있다. 24px에서는 얼굴과 로봇 실루엣을 구분할 수 있다.

## 검수 결과와 남은 사항

- 최초 대륙은 바다 비중이 커서 해안을 아래로 내리고 내륙을 늘리는 보정을 1회 했다. 최종본은 상단과 양옆으로 이어지는 대륙, 중앙 항만·도시·공장, 좌우의 비교적 단순한 들판과 언덕, 하단 열린 바다가 보인다.
- 해안선은 굴곡이 있어 일정한 직선이 아니다. 주 해안은 대략 높이의 60~65% 부근이고, 부두·등대 곶·정박선은 더 아래로 돌출한다. 맨 아래 약 20~25%는 육지·선박 없이 바다로 비어 있다.
- 대륙 최종 WebP와 중앙 640×112 크롭을 열어 항구·크레인·창고 밀도를 확인했다. 검수용 크롭은 최종 WebP의 (380,154)~(1020,266) 영역이며 실제 게임 크롭 좌표와 일치한다고 가정하지 않는다.
- 바다는 참조와 유사한 짙은 파랑으로 생성되었지만 픽셀 단위로 정확하게 일치하지는 않는다. 생성 원본 하단 표본 평균 RGB는 약 (2.4,98.9,193.4), map6의 중앙 열린 바다 표본 평균은 약 (3.3,101.1,183.2)였다. 표본 위치와 파도 질감의 차이가 있으며 생성본이 약간 더 푸르다. 코드로 색상을 덧칠하거나 색보정하지 않았다.
- 여섯 최종 WebP와 여섯 24px 검수본을 각각 열었다. 밀 3대와 빨간 리본, 주황 통, 분홍·파랑·크림 옷 더미, 파란 로봇과 빨간 안테나, 불규칙한 바위, I자 단면의 철강 3개를 확인했다.
- 24px에서도 식량·석유·철광석·철강을 실루엣과 색으로 구분할 수 있어 물건 재생성은 하지 않았다. 밝은 가장자리는 알파 정리 후 다시 확인했다.
- 육안 검수에서 글자·숫자·실제 국기·로고·서명·UI·테두리는 발견하지 못했다.
- PNG와 게임용 WebP가 정상 디코딩되는지, 대륙 1400×420·물건 256×256인지, 각 물건 알파 최솟값/최댓값이 0/255인지 검사했다.
- 남은 작업: Claude가 `GOODS_ART`와 `.isle.world .land` 배경을 연결하고 실제 게임에서 크롭·둥근 하단·바다 접합부 및 흰색/나무색 배경 위 아이콘을 확인한다. 이번 작업에서는 게임 코드 수정·서버 실행·브라우저 검수를 하지 않았다.

## 실제 사용 프롬프트

세 호출 모두 `transparent_background: false`였다. 아이콘의 투명화는 생성 후 Pillow로 수행했다.

### 1. 대륙 최초 생성

참고 이미지: map6, port_factoryIsle, port_bigMarket, ship.

```text
Use case: illustration-story / style-transfer. Create a NEW game illustration, using the four supplied images ONLY as style and palette reference: map6.webp is the exact sea colour and three-quarter top-down camera reference; port_factoryIsle.webp and port_bigMarket.webp are warm stone architecture, greenery and painterly detail references; ship.webp is friendly cargo-ship style. Do not reproduce islands or a cutout.
Output: one very wide opaque painted panorama, requested 1536 x 640 pixels (2.4:1), no border. The southern coastline of a HUGE NORTHERN CONTINENT, viewed looking north from sea in the same three-quarter top-down map camera. No sky, no horizon. Land occupies approximately the TOP 65 percent, sea the BOTTOM 35 percent. Continuous mainland MUST touch and be cropped by the ENTIRE TOP EDGE and BOTH LEFT AND RIGHT EDGES, no complete island outline. Gentle bays along an approximately horizontal coast.
At the CENTRAL coast build a big busy rich harbour city, far larger than either reference island port: long stone quay, many cranes, big warehouses, factory district with several chimneys, dense warm cream stone houses with terracotta roofs climbing green hills, a few taller buildings, a lighthouse on a headland, several moored cargo ships with navy hulls and warm cargo colours. Place the densest quay/cranes/buildings at the centre of the image (central half, vertical middle), because the game crops a narrow central 640 x 112 band. Make far left and right simpler rolling green hills and fields; distant blue-grey mountains behind the city continue beyond the top border, no sky strip.
The lower 35 percent is OPEN SEA, unobstructed toward the bottom, matching the deep saturated medium cobalt/azure BLUE of map6.webp, with very subtle small painterly ripples only; NOT pale cyan, not grey-blue, not a white or transparent background. Turquoise shallows only immediately at shore; the bottom edge is the map's deep blue open water. Friendly storybook gouache/oil-like brushwork, warm sunlight, dimensional hand-painted forms, lush olive greens, warm cream and sandy stone, soft grey-blue shadows. No text, letters, numbers, logos, signatures, real-country flags, labels, UI, framing, or decorative border. Generate the illustration only.
```

### 2. 물건 시트 생성

참고 이미지: port_factoryIsle, port_bigMarket, ship.

```text
Use case: illustration-story / style-transfer. Generate ONE 1536 x 1024 pixel icon SPRITE SHEET, EXACT 3 columns by 2 rows, six separate painted objects, on a completely pure flat WHITE #FFFFFF background. The supplied port_factoryIsle, port_bigMarket and ship pictures are STYLE REFERENCES ONLY: match their warm friendly storybook hand-painted gouache shading and dimensional materials, while simplifying strongly for readable tiny 24 pixel game icons. No scenery, no islands or ships from the references, no frame or grid lines.
Six equal 512 x 512 conceptual cells. Object centres at (256,256), (768,256), (1280,256), (256,768), (768,768), (1280,768). Keep each icon comfortably inside its own cell with generous pure-white gaps, minimum 50 pixel margins. Comparable visual scale and mass, bold compact simple silhouettes, just a few large shapes, gently dark painted contours. No cast shadows on the white background, no white glow, no sticker border; clean separable edges, pure white outside the objects. Use medium/darker contours so they remain clear against both white and warm wood brown.
TOP LEFT food: EXACTLY THREE golden wheat stalks bundled together with a small red ribbon; three thick distinct grain heads forming a bold fan, short stems, not a basket or sheaf of dozens. Wheat #F5C542 lit and #BB8B24 shaded, ribbon #E0533C.
TOP CENTRE oil: ONE round plump upright ORANGE oil barrel with exactly TWO darker horizontal bands, seen slightly from above, broad round elliptical top. Orange #E8761E, bands #B5561A, top #F2A35A; no text or oil drop label.
TOP RIGHT cloth: ONE compact stack of THREE folded garments: clearly recognisable folded PINK T-SHIRT on top (visible neckline and small sleeve corners), blue folded garment underneath, cream at bottom. Pink #D86A8E, blue #5B8FD6, cream #FFF3E0. Simple soft cloth folds, no pattern.
BOTTOM LEFT tech: ONE small friendly BOXY ROBOT with a round pale screen face in a square blue head/body, a little top antenna ending in a RED light. Body #6F8FC8 and #4D6CA8, round face #FFFDF8, light #E0533C. Two simple dark eyes, short blocky arms/feet, few details, toy-like painted metal.
BOTTOM CENTRE ore: ONE chunky irregular GREY ROCK with large ANGULAR FACETS, grey #89909C and light #B1BBC7, a few rust-orange #B5561A flecks and tiny metallic highlight flecks INSIDE the rock silhouette. Must look like a solid natural rock, not a crystal cluster or a metal ingot.
BOTTOM RIGHT steel: EXACTLY THREE straight shiny SILVER I-BEAMS in a neat compact stacked pile, slightly diagonally angled in three-quarter view, with CLEAR I-SHAPED END PROFILES and long flat straight edges. Silver #B9C2CE, highlights #D2D9E2, shadows #6B7F99. Must instantly read as manufactured metal beams, completely different from the natural rock.
No text, letters, numbers, captions, real-country flags, logos, signatures, borders, grid lines, UI, extra decorative objects or ground shadows. All six objects must be visually distinct at 24 x 24 pixels, especially wheat vs barrel vs rock vs I-beams. Opaque pure white background, not transparency. Generate the sheet only.
```

### 3. 대륙 구도 보정

편집 대상: `raw/continent-first.png`. 바다 색 참고: `map6.webp`.

```text
Use case: precise-object-edit. Edit the supplied FIRST image (the generated northern mainland harbour panorama). SECOND image is map6.webp, a sea palette reference ONLY. Preserve the first image's excellent friendly hand-painted style, warm stone harbour architecture, big busy central city, cranes, warehouses, factories, dense hillside homes, lighthouse, cargo ships and blue sea palette. One targeted correction is REQUIRED: the FIRST image has too much sea. MOVE THE MAIN COAST DOWN so continuous MAINLAND fills the TOP APPROXIMATELY 65 PERCENT and clear OPEN SEA fills the BOTTOM APPROXIMATELY 35 PERCENT. Measure coastline as the main solid LAND/WATER boundary, not the projecting piers. Main left/right shoreline and central stone quay must be around y=63 to 67 percent. Piers and moored ships may protrude only a little below that, never into the bottom 25 percent. The harbour city should remain in the central half and straddle the vertical middle, densest at the centre because the game samples a narrow middle strip. Add inland hills/city area above rather than simply adding objects to the water. Keep the left and right sides simpler hills and fields. Mainland touches the entire top edge and both side edges; no island outline, no sky, no horizon, no white margins. Keep distant blue-grey mountains cropped by the top edge. Lower open sea deep saturated blue matching map6.webp, representative sea RGB around (8,104,186), variations around (3,110,190) and (5,96,177), subtle quiet painted ripples, plain clear water without ships or rocks in bottom 25 percent. Turquoise ONLY immediately along shore. No text, letters, numbers, logos, country flags, signatures, UI, borders. Requested output 1536 x 640 pixels or wider at the same 2.4:1 aspect. Opaque full-bleed painted panorama. Change composition only as needed for the 65/35 land/sea split.
```

