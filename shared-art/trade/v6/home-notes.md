# 무역왕 6.3 우리 섬 성장 그림 제작·검수 기록

## 완료 상태

- 내장 `image_gen`으로 성장 그림 3장을 모두 제작했다. 사용량 제한으로 중단된 작업은 없다.
- 먼저 `trade/port_home.webp`, `trade/port_plains.webp`, `trade/v6/map6.webp`를 열어 확인하고 1단계 생성의 참고 이미지로 전달했다.
- 1단계 결과를 편집해 2단계를, 2단계 결과를 편집해 3단계를 만들었다. 시점·프레이밍·바위 해안·오른쪽 모래 만·청록 여울을 이어받았다.
- 그림은 전부 내장 이미지 도구가 생성했다. 코드/SVG/PIL로 그리거나 합성하지 않았다. Pillow는 열기·크기 조정·형식 변환·규격 검사에만 사용했다.
- 작업 파일은 `trade/v6/` 안에만 작성했다. 게임 코드와 기존 참조 그림은 수정하지 않았다.

## 결과 파일

| 단계 | PNG 보관본 | 게임용 WebP | 170px 검수본 |
|---|---|---|---|
| 작은 항구 | `raw/home_1.png` | `home_1.webp` | `raw/home_1-170.webp` |
| 커진 항구 | `raw/home_2.png` | `home_2.webp` | `raw/home_2-170.webp` |
| 무역 도시 | `raw/home_3.png` | `home_3.webp` | `raw/home_3-170.webp` |

- 생성 도구의 실제 출력: 세 장 모두 1672×941, RGB PNG. 프롬프트의 1536×864 요청과 약간 다른 크기로 반환됐다.
- 지정 PNG 보관본: 세 장 모두 1536×864, 정확한 16:9. 생성 결과 전체를 Lanczos로 크기 조정했다. 자르기·덧그리기·배경 제거는 하지 않았다.
- 게임용: 세 장 모두 680×384, WebP 품질 85. 지시된 픽셀 크기를 그대로 사용했다.
- 검수본: 게임용 WebP를 170×96으로 축소한 뒤 추가 압축 손실 없이 WebP로 저장했다.
- PNG 용량: 1단계 2,653,546바이트 / 2단계 2,555,293바이트 / 3단계 2,567,531바이트.
- 게임용 WebP 용량: 1단계 107,836바이트 / 2단계 105,648바이트 / 3단계 111,032바이트.

## 그림 내용과 검수

- 1단계: 집 3채, 작은 창고 1동, 목재 부두 1개, 작은 화물 범선 1척, 밀밭과 나무. 최초 프롬프트는 집 4채를 요청했으나 실제 결과는 지시서가 허용한 3~5채 범위의 3채다.
- 2단계: 주택 약 8채와 2층집, 중형 창고와 크레인 1개, 부두 2개, 굴뚝 1개의 작은 공장, 화물선 2척, 늘어난 길. 프롬프트의 9채 요청과 실제 표현에 차이는 있으나 지시서의 8~10채 범위다.
- 3단계: 많은 주택과 몇몇 높은 건물, 긴 콘크리트 안벽, 컨테이너 크레인 2개, 큰 창고, 굴뚝 3개의 공장 구역, 등대, 화물선 4척, 작은 조명과 무늬 없는 깃발.
- 세 PNG와 세 170×96 검수본을 각각 열어 확인했다. 모든 PNG·WebP·검수본의 정상 디코딩과 크기도 검사했다.
- 같은 시점과 섬의 주요 외곽 지형이 유지되고, 중앙의 항만과 도시 밀도가 단계별로 증가한다. 생성 편집 특성상 세부 바위·해안은 픽셀 단위로 완전히 같지는 않다.
- 육안으로 글자·숫자·국기·로고·워터마크·UI·테두리는 발견하지 못했다.
- 170px에서 부두와 선박 증가, 3단계의 크레인·도시 밀도가 구분된다. 작은 집·깃발·조명 세부는 축소 시 작게 보인다.
- 남은 작업: Claude가 `trade-king/js/game6.js`의 `HOME_ART = true`를 적용하고 실제 게임의 크롭·청록 테두리·단계 전환을 브라우저에서 확인한다. 이번 작업에서는 게임 실행과 코드 수정을 하지 않았다.

## 사용 프롬프트

아래는 실제 도구에 전달한 프롬프트다. 세 호출 모두 `transparent_background: false`로 설정했다.

### 1단계 — 새 그림 생성

참고 입력: `trade/port_home.webp`, `trade/port_plains.webp`, `trade/v6/map6.webp`.

```text
Use case: stylized-concept. Asset: stage 1 of a three-image growth sequence for a friendly educational trading game.
Generate ONE opaque landscape illustration, exactly 1536x864 pixels, 16:9 (at least 1024x576).
Reference images: port_home.webp and port_plains.webp are STYLE references: match their intricate softly painted miniature harbour aesthetic, warm cream limestone and terracotta roofs, olive/cypress greenery, sunlit honey tones, turquoise transparent shallow water and painterly brush texture. Stage 1 must look like a sibling of port_home, with less development. map6.webp is a SEA COLOUR and brush-feel reference only; do NOT copy its multiple islands.
Scene: a single modest home-port island surrounded by simple calm blue sea, three-quarter top-down camera from the south, looking north, full island completely inside the frame. No visible sky or horizon line, fixed elevated camera and water plane for all future stages. Sunlight from upper left.
Fix this island geography so future edits can keep it identical: low broad oval island extending x18%-82%, y18%-78%; rounded rocky west headland at x22%,y55%; low green north ridge with cypresses around x45%,y23%; small sandy northeast cove around x75%,y40%; a shallow south-facing harbour inlet around x54%,y68%; east rocky point at x79%,y61%. Keep these recognizable coastline features. Natural cream-gray shoreline rocks, low green terrain and narrow sandy edges, turquoise shallows. The island and central harbour should fill the frame usefully; simple sea at all frame edges.
STAGE 1 small village harbour: exactly FOUR clearly separate small cream houses with warm terracotta roofs, ONE tiny low warehouse beside the harbour, ONE short wooden pier projecting south into the inlet, ONE small sailing cargo boat moored alongside it. A few planted fields at the back left and a grove of trees. Simple dirt paths. Calm and modest. No cranes, no factory, no lighthouse, no extra ships. Buildings concentrated in the central half of the island; harbour and boat read clearly even when shrunk to 170x96. Use large readable silhouettes with restrained fine details. Warm daylight; not dusk.
No text, letters, numbers, labels, logos, signatures, watermark, borders, UI, picture frames, country flags. No real country emblems. Do not depict a triptych, collage, panel or multiple stages: this is ONE island at stage 1. Fill the rectangular background with sea, no transparency.
```

### 2단계 — 1단계 생성 결과 편집

편집 입력: `trade/v6/raw/home_1.png`의 크기 정규화 전 1672×941 생성 결과.

```text
Use case: precise-object-edit / stylized-concept. Create the SECOND growth stage of this SAME home harbour island.
Input image is the stage 1 EDIT TARGET, not merely inspiration. Preserve the EXACT composition, camera projection and framing, all sea pixels and shallow water pattern, island landmass outline, rocky western headland, green northern ridge and trees, sandy northeast cove, eastern rocky point and south-facing harbour inlet. Do not enlarge the island, shift it, add land or change coastline. Same sunlight, daytime, warm limestone/terracotta palette and delicate painterly brush feel. This is a growth-only edit.
Output ONE opaque 16:9 landscape PNG, ideally exactly 1536x864, at least 1024x576.
STAGE 2, medium harbour: keep the original THREE small houses visibly in their original positions, add SIX houses in the available central and northern plots for exactly NINE houses in total, including TWO two-storey ones. Keep houses individually readable. Replace the tiny warehouse at the central waterfront with ONE medium warehouse, and place ONE working cargo crane beside it. Exactly TWO piers total: keep the existing wooden pier at the front centre and add a second pier extending south from the left part of the harbour. Formalize the waterfront as a stone quay without changing the natural landmass. Add ONE small factory with ONE short chimney inland on the right; friendly modest scale with only a faint puff, no pollution cloud. Widen and connect paths into a few roads. Keep some fields on the left and the trees around the ridge.
Exactly TWO cargo ships total: preserve the original small sailing cargo boat alongside its original pier and add ONE medium cargo vessel moored at the second pier. Do not add stray background boats.
Make the central town and harbour the busiest part, readable at 170x96, with more development than stage 1 but still much less than a large trade city. Keep the outer sea simple and the original scene alignment fixed.
No text, letters, numbers, labels, country flags, logos, signatures, watermark, border, UI, collage or multi-panel images. No lighthouse yet, no container terminal yet.
```

### 3단계 — 2단계 생성 결과 편집

편집 입력: `trade/v6/raw/home_2.png`의 크기 정규화 전 1672×941 생성 결과.

```text
Use case: precise-object-edit / stylized-concept. Create the THIRD and final growth stage of the SAME home harbour island.
Input is the stage 2 EDIT TARGET. Keep EXACTLY its camera, projection, framing, island outline, natural rocky western headland, the cypress ridge along the north, northeast sandy cove and east rocky point, existing shallow-water patterns, sea colour, warm daylight and painterly brush texture. The same island at the same scale and same position, with construction growing within existing land and into the existing south harbour. Do not expand the natural coastline, move rocks or zoom out. ONE opaque 16:9 landscape illustration, ideally exactly 1536x864 pixels, at least 1024x576.
STAGE 3 prosperous trade city: develop the centre into a compact friendly busy town with MANY small warm cream and terracotta houses plus a FEW taller three/four-storey buildings. Keep several original houses and the ridge cypresses recognizable. Put large warehouses along the CENTRAL south-facing harbour, a long concrete quay along its existing waterfront and TWO clearly recognizable container gantry cranes with spreader beams and a small cluster of coloured shipping containers. Replace the previous wooden dock cargo area with this mature quay, keeping original coastal rocks outside it unchanged.
Expand the existing small factory on the right into a compact factory district with exactly THREE chimneys total and restrained light steam. Add ONE slim cream lighthouse on the existing east rocky point, without changing that headland shape. Add a few harbour lamps, warm tiny lights under warehouse eaves visible in daylight, and a few plain solid-colour pennants with NO national patterns, no symbols. Keep greenery between buildings and a small field on the left. Friendly, sunny and readable, no industrial smog.
Exactly FOUR cargo ships total, easy to count, in the southern harbour water: two modern modest-sized container freighters moored at the new quay, one medium cargo vessel beside the left dock and one small sailing cargo boat toward the right. Keep hull silhouettes separated, not overlapping the central buildings. No additional distant boats. All development concentrated in central half and central harbour, readable at 170x96. Main visual difference from stage 2 is a dense little trade city with container cranes, bigger warehouses, lighthouse and four ships, while the island, rocks, bay and camera remain identical.
No writing of any kind anywhere: no text, letters, numbers, labels, ship names, logos, signatures, watermarks, real country flags, national emblems, borders, UI or multiple panels. Containers and ship hulls must be unmarked.
```

## 2026-10-23 — 2·3단계 시대 변화 재생성

이번 기록은 위의 최초 제작 기록 중 2·3단계 내용과 프롬프트를 대체한다. 갱신된 `TRADE-V6-GROWTH.md`에 따라 항만 규모뿐 아니라 건축·도로·차량·선박의 시대를 바꿨다.

- 내장 `image_gen`으로 2단계와 3단계를 각각 한 번 생성했다. 두 호출 모두 기존 `raw/home_1.png`만 직접 편집 기준으로 전달했으며, 3단계에 2단계 결과를 연쇄 입력하지 않았다. `transparent_background: false`.
- 2단계: 중앙 기와집을 평지붕 콘크리트 상점·공동주택으로 교체했다. 포장도로, 버스·자동차, 가로등, 물탑, 굴뚝 하나의 벽돌 공장, 금속 지붕 창고, 콘크리트 부두 두 개와 크레인 하나, 동력 화물선 두 척을 표현했다. 옛 붉은 지붕 집은 왼쪽 가장자리 한 채만 남았다.
- 3단계: 중앙을 유리 업무 타워 세 동과 현대식 아파트 군으로 교체했다. 아스팔트 도로와 자동차·버스·트럭, 고가도로, 분수 공원, 컨테이너 터미널·크레인 두 개·컨테이너·철제 창고, 굴뚝 세 개의 공장, 등대, 컨테이너선 세 척과 페리 한 척을 표현했다. 중앙에 옛 붉은 기와집이 남아 있지 않다.
- 생성 결과 원본은 두 장 모두 1672×941 RGB PNG였다. 전체 프레임을 Lanczos로 1536×864로 조정하여 지정 PNG에 저장했다. 자르기·그리기·합성·마스킹은 하지 않았다. Pillow는 크기·형식 변환에만 사용했다.
- 게임용은 680×384 WebP, 품질 85. 검수본은 해당 게임용 WebP를 170×96으로 줄인 후 무손실 WebP로 저장했다.

| 단계 | PNG 보관본 | 게임용 WebP | 170×96 검수본 |
|---|---|---|---|
| 2 | `raw/home_2.png` (1536×864, 2,518,179바이트) | `home_2.webp` (680×384, q85, 105,192바이트) | `raw/home_2-170.webp` (34,680바이트) |
| 3 | `raw/home_3.png` (1536×864, 2,687,089바이트) | `home_3.webp` (680×384, q85, 117,998바이트) | `raw/home_3-170.webp` (35,678바이트) |

### 검수 결과

- 생성된 두 큰 이미지를 확인하고, 기존 1단계와 새 2·3단계의 170×96 파일을 각각 열어 비교했다. 1단계는 붉은 지붕과 밭, 2단계는 낮은 콘크리트 건물과 굴뚝, 3단계는 높은 청록 유리 타워와 아파트·컨테이너 크레인으로 세 시대가 구분된다. 옛 건축이 남아 재생성할 필요는 없었다.
- 동일한 구도·섬 위치와 배율, 서쪽 바위 해안·오른쪽 모래 만·동쪽 곶·남쪽 항구의 주요 지형이 유지된다. 생성 편집이므로 해안 바위·파도 등의 세부가 픽셀 단위로 완전히 동일하다는 보장은 없다.
- 글자·로고·워터마크·UI·국기는 육안으로 발견하지 못했다. 작은 차량 등 세부는 170px에서 작게 보이지만 시대를 나타내는 건물 실루엣은 구분된다.
- 교체한 여섯 파일을 다시 디코딩해 크기와 형식을 assert로 확인했다.
- 1단계 PNG·게임용 WebP·검수본은 모두 수정 전후 SHA-256이 일치했다:
  - `raw/home_1.png`: `AB7DAF42F7E83C6D5D016F05ECA1D37E8D9B2A5CE51A3180A6CDD08CAFD53896`
  - `home_1.webp`: `C650CC3FF974F22761D8DB9E060C905B84BB77DAE0A159EF78E75ED0FB08329E`
  - `raw/home_1-170.webp`: `5B3CF2CD588F29E2B9A416381E73C29E3FC6A5C265635A7C0A03F3FBCCA290B3`
- 프로젝트에서 수정한 것은 위 여섯 이미지와 이 메모뿐이며 모두 `trade/v6/` 안이다. 내장 생성 도구는 자체 기본 위치인 Codex generated_images에도 결과를 자동 보관한다.
- 게임 코드 수정·실행·브라우저 내 크롭 검수는 수행하지 않았다.

### 실제 프롬프트 — 2단계

편집 입력: `trade/v6/raw/home_1.png`.

```text
Use case: precise-object-edit / stylized-concept. Asset: stage 2 growth illustration for an educational island trading game.
The attached local home_1.png is the EDIT TARGET. Edit this exact image, not a new composition. Output ONE opaque 1536x864 PNG, 16:9.
LOCK GEOGRAPHY AND CAMERA: identical island outline, coastline, south harbour indentation, west rocky headland, right-hand sandy crescent cove, east rocky point, northern ridge, shoreline rocks, sea/shallows pattern, perspective, island position and size, framing, daylight and warm painterly miniature texture. Preserve all unedited water and coastal areas. No zooming, moving or expanding the natural island. Construction fits INSIDE the existing island and harbour. Keep all frame edges sea.
REPLACE THE ERA, not simply add docks. This is a growing concrete town with a 1960s–1980s feel. REMOVE the old red-tile cottages from the CENTRAL area and replace them with a clearly readable cluster of mostly grey/cream FLAT-ROOFED CONCRETE TWO- AND THREE-STOREY blocks: shops, a school, small apartment blocks, rectangular windows, simple modern facades. These new concrete blocks dominate the central silhouette. At most ONE old red-roof cottage may remain at the far left outer edge. No central red tile roof buildings.
Replace dirt paths with paved grey asphalt streets with one bus and two cars, street lamps. Add a water tower inland. One brick factory with ONE chimney toward the right inland. One medium industrial warehouse with a grey metal roof beside the waterfront. A stone-and-concrete quay, exactly TWO modern concrete piers and ONE cargo crane. Exactly TWO motor cargo ships with cabins and short funnels in the south harbour; NO SAILS, no wooden sailing boat, no masts with rigging. Preserve a few green spaces and northern trees, but most central fields have become concrete town.
READABILITY at 170x96: a grey low-rise concrete TOWN and one chimney, visibly later than the old red-roof village, yet no glass skyscrapers or modern container terminal at this stage. Large readable architectural shapes. Same warm sunlit painterly detail and blue turquoise water as target. Central town and harbour busiest. No text, writing, numbers, logos, labels, flags, watermarks, UI, border, collage or multiple stages.
```

### 실제 프롬프트 — 3단계

편집 입력: `trade/v6/raw/home_1.png`.

```text
Use case: precise-object-edit / stylized-concept. Asset: FINAL stage 3 growth illustration for an educational island trading game.
The attached home_1.png is the EDIT TARGET: modernize this very SAME island. Output ONE opaque 1536x864 PNG, 16:9.
LOCK GEOGRAPHY AND CAMERA: identical island landmass outline, coastline, south harbour indentation, west rocky headland, right-hand sandy crescent cove, east rocky point, northern ridge, shoreline rocks, sea/shallows pattern, perspective, island position and size, framing and warm sunlight. Preserve unedited water and coastal areas. Do not enlarge, move, reshape the island or zoom out. Build within the existing land and harbour. Same friendly painterly miniature texture and detailed turquoise water; keep sea at all frame edges and no sky/horizon.
RADICAL ARCHITECTURAL ERA CHANGE: this is a prosperous MODERN CITY TODAY. DEMOLISH AND REPLACE ALL old stone cottages and ALL red-tiled roofs from the centre and everywhere else. No cottages, no old village, no terracotta pitched house roofs. Central island is dominated by a clearly modern downtown: THREE tall blue/teal GLASS-AND-STEEL office towers with reflective curtain-wall facades and strong vertical silhouettes; several 8–15-STOREY grey/white modern APARTMENT BLOCKS with flat roofs, window grids and balconies. Tall buildings visibly rise above the north tree ridge but fit entirely inside the image, with sea margin above. Make modern urban density and height the first thing seen at thumbnail size.
Wide dark ASPHALT ROADS with lane marks, CARS, a BUS and TRUCKS connecting the blocks and port. A short urban overpass within the existing landmass, street lights and one plain blank billboard without text. Small green public park with a fountain between buildings. No dirt paths, fields or sailing boats. Northern ridge trees and a thin green buffer remain.
At the SOUTH CENTRAL HARBOUR make a long concrete CONTAINER TERMINAL with TWO clearly readable gantry cranes with horizontal spreader beams, neat stacked coloured containers, big grey steel warehouses. Construction fits the existing harbour, leave the outside natural coastline rocks in their exact places. A compact factory district toward right inland with three slim chimneys and restrained light steam. A slim lighthouse on the existing east rocky point, keeping that rock outline intact. THREE modern container cargo ships with boxy container stacks and ONE ferry, separated in the south harbour water; all motor vessels, NO SAILS, no wooden ships. Container terminal, roads and city must all belong to the same contemporary era.
READABILITY at 170x96: large blue GLASS TOWERS plus grey tall APARTMENT BLOCKS, container gantry silhouettes and colourful containers. Clear era difference from a grey low-rise concrete town and an old red-roof village. Keep the centre as the busiest focal area; do not hide the city behind the port. Friendly sunny bright prosperous scene.
No writing of any kind: no text, letters, numbers, ship names, labels, logos, signatures, watermarks, country flags, UI, borders, collage, triptych or multiple stages. All hulls and containers unmarked.
```




## 2026-10-23 — 2·3단계 시대 변화 재생성

이 절이 위의 최초 제작 기록 중 2·3단계 결과와 프롬프트를 대체하는 최신 기록이다. 갱신된 `TRADE-V6-GROWTH.md`를 읽고 내장 `image_gen`만으로 2·3단계를 각각 한 번씩 다시 생성했다. 두 호출 모두 기존 `raw/home_1.png`를 직접 편집 기준으로 전달했다. 2단계 결과를 3단계 입력으로 사용하지 않았다. `transparent_background: false`를 적용했다.

### 변경 내용과 파일

- 2단계: 중앙의 붉은 기와집을 2~3층 평지붕 콘크리트 건물로 교체했다. 포장도로, 버스와 자동차, 가로등, 급수탑, 굴뚝 하나의 벽돌 공장, 창고와 크레인, 두 부두, 동력 화물선 두 척으로 근대화했다. 범선은 없다.
- 3단계: 중앙의 옛 기와집을 모두 없애고 푸른 유리 고층 업무 건물과 아파트로 교체했다. 아스팔트 도로와 차량, 버스·트럭, 고가도로, 분수 공원, 공장과 굴뚝, 등대, 철골 창고, 갠트리 크레인 두 대와 컨테이너 야적장, 컨테이너선 세 척과 페리를 표현했다.
- 생성 도구의 실제 출력은 두 장 모두 1672×941 RGB PNG였다. 전체 화면을 Lanczos로 1536×864(정확한 16:9)로 조정해 지정 PNG에 저장했다. 자르기·그리기·합성은 하지 않았으며 Pillow는 크기 조정·색상/형식 변환에만 사용했다.
- 게임용 WebP는 680×384, 품질 85로 저장했다. 검수본은 저장된 게임용 WebP를 170×96으로 축소해 무손실 WebP로 저장했다.

| 단계 | PNG 보관본 | 게임용 WebP | 170px 검수본 |
|---|---|---|---|
| 2 | `raw/home_2.png` — 1536×864, 2,549,425바이트 | `home_2.webp` — 680×384, 품질 85, 105,954바이트 | `raw/home_2-170.webp` — 170×96, 34,372바이트 |
| 3 | `raw/home_3.png` — 1536×864, 2,621,417바이트 | `home_3.webp` — 680×384, 품질 85, 113,678바이트 | `raw/home_3-170.webp` — 170×96, 35,610바이트 |

### 검수와 보존

- 저장된 2·3단계 PNG와 1·2·3단계의 170×96 검수본을 실제로 열어 확인했다. 170px에서도 1단계의 낮은 붉은 지붕과 밭, 2단계의 평지붕 콘크리트 시가지와 굴뚝, 3단계의 푸른 유리 고층 건물·크레인·컨테이너가 뚜렷하게 구분된다. 중앙에 옛 기와집이 남아 있지 않아 추가 재생성은 필요하지 않았다.
- 원본과 비교해 카메라·화면 배치, 서쪽 바위 해안, 북쪽 능선, 동쪽 모래 만, 전면 바위와 여울의 주요 위치·윤곽을 육안 확인했다. 생성 편집 결과이므로 세부 해안·파도까지 픽셀 단위로 동일하다는 보장은 없다.
- 육안으로 글자·숫자·국기·로고·서명·UI·테두리를 발견하지 못했다. 여섯 출력 파일의 디코딩과 규격을 assert로 검사했다.
- `raw/home_1.png`, `home_1.webp`, `raw/home_1-170.webp`는 수정하지 않았고, 변경 전후 SHA-256이 모두 일치했다.
- 직접 저장·수정한 프로젝트 파일은 이 메모와 위의 2·3단계 여섯 이미지뿐이며 모두 `trade/v6/` 안에 있다. 내장 도구의 기본 생성 보관본은 도구 기본 경로에 남겼다. 게임 코드 수정·브라우저 실행은 하지 않았다.

### 실제 사용 프롬프트 — 2단계

편집 입력: `trade/v6/raw/home_1.png`.

```text
Use case: precise-object-edit. Asset: stage 2 home island illustration for a friendly educational trading game.
The attached home_1.png is the EDIT TARGET. Edit this exact image, not a new island. Output ONE opaque 1536x864 landscape PNG, 16:9. LOCK the camera, projection, zoom, framing, sunlight, sea, turquoise shallows and the entire natural coastline: jagged rocky west shore at left, the north cypress ridge, northeast sandy horseshoe cove at right, eastern rocky point, southern central harbour inlet and isolated foreground rocks must stay in the EXACT same positions and shapes. Do not add land or zoom out. Retain the richly painted miniature illustration brush texture and warm daylight of the input.
CHANGE THE ERA across the island to a growing concrete town of the 1960s–1980s, not an old village with a new harbour. REPLACE ALL THREE central red-tile cottages and the old red-roof warehouse with mostly new flat-roofed light-grey and off-white concrete TWO- AND THREE-STOREY buildings: shops, a school and small apartment blocks. Make these the unmistakable central visual mass, readable at 170x96. About ten distinct blocky buildings, with windows, flat parapets and concrete balconies; no pitched red roofs anywhere in the centre. At most one small preserved cottage near the far left edge, not required. Retain some fields and peripheral trees.
Replace dirt paths with paved grey roads connecting the town to the waterfront, a clearly visible bus and two cars, street lamps and a water tower. One modest red-brick factory with ONE chimney inland right. A stone-and-concrete quay following the existing southern harbour edge, TWO piers into the existing harbour water, ONE working crane and ONE medium industrial warehouse with a grey roof. Exactly TWO motor cargo ships, engines and deckhouses, no masts or sails. Keep boats separated and within the original water.
The scene must clearly read as a modernising mid-century concrete town even as a 170px thumbnail: broad grey flat roofs, low rectangular concrete blocks, paved roads and one chimney. Still lower, smaller and less dense than a modern high-rise city. No glass skyscrapers yet. Keep the sea around the island simple and unchanged.
NO writing anywhere: no text, letters, numbers, labels, ship names, flags, logos, signatures, watermark, borders or UI. No collage or multiple panels. Do not preserve the old central cottages; only the geography and camera are immutable.
```

### 실제 사용 프롬프트 — 3단계

편집 입력: `trade/v6/raw/home_1.png`.

```text
Use case: precise-object-edit. Asset: stage 3 modern home island for a friendly educational trading game.
The attached home_1.png is the EDIT TARGET, the immutable geographical base. Make ONE opaque landscape PNG 1536x864, 16:9, showing this EXACT SAME island today. Keep camera projection, zoom, framing, sunlight, sea colour and painted miniature illustration texture identical. LOCK the entire natural landmass silhouette and coast: jagged rocky western headland, north cypress ridge, northeast sandy horseshoe cove, eastern rocky point, southern central harbour inlet and isolated foreground rocks must retain their EXACT original coordinates and shapes. Do not enlarge or replace the island, reclaim land, zoom out, change the cove or move the rocks. New quays may project into the existing south harbour water only. Keep a little of the peripheral trees and greenery.
Primary change: COMPLETE URBAN MODERNISATION. REMOVE ALL old red-tile cottages, old central warehouse, dirt roads and wooden sailing boat. The centre is now a clearly MODERN city, not a Mediterranean old town: a compact cluster of FOUR prominent BLUE/TEAL GLASS-AND-STEEL office towers, around 12–18 floors, and SIX modern pale concrete apartment blocks 8–15 storeys tall with repeated balconies/windows and FLAT roofs. Concentrate this distinctly vertical skyline in the CENTRAL HALF of the island, yet keep all tower tops inside the image with sea margin. Use clearly legible large silhouettes and blue glass reflections so the modern era is obvious even at 170x96. NO red-tile cottages or pitched-roof village houses anywhere in the centre; preferably zero cottages anywhere.
Wide dark asphalt roads with simple white lane marks, several visible cars, a bus and container trucks; one short urban road overpass within the island; street lights, a small landscaped park with fountain, blank solid-colour billboards WITHOUT lettering. Factory district inland right with three chimneys and restrained light steam. A small modern white lighthouse on the existing eastern point without moving rocks.
Convert the original south-facing harbour into a long grey CONCRETE CONTAINER TERMINAL following its existing shoreline: TWO big unmistakable steel gantry cranes with horizontal spreader beams, neat stacks of colourful unmarked containers, big steel warehouses with flat/low grey metal roofs, loading yards and trucks. Keep industry and terminal readable and distinct from the glass downtown. THREE modern container ships carrying stacks of containers and ONE small white motor ferry, separated in the existing southern water. No sails, no antique ships.
Sunny prosperous friendly city, high clarity, rich hand-painted game illustration matching the input rather than photorealism. At thumbnail scale the dominant signature MUST be tall BLUE GLASS TOWERS plus apartment slabs, asphalt roads and container cranes, radically different from the input red-roof village. Preserve the exact underlying island geography and same three-quarter top-down camera.
NO text, letters, numbers, names, logos, flags, signatures, watermark, borders, frames, UI, collage or multiple panels. Containers, ships and billboards unmarked.
```
