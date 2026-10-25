# 무역왕 6.3 도우미 ‘항해사 바다’ 제작·검수 기록

## 완료 상태

- 내장 `image_gen`으로 따뜻하고 친절한 노년 항해사 초상화 한 장을 완성했다.
- 생성 전 `home_1.webp`, `cine/trade_deal.webp`, `cine/trade_arrive.webp`, `ships/ship_2.webp`를 모두 열어 확인하고, 실제 생성 도구에 스타일 참고 이미지로 전달했다.
- 기존 그림의 따뜻한 햇빛, 남색·크림색 계열, 부드러운 붓 질감과 입체적인 동화풍 인물 표현을 참고했다.
- 생성은 총 2회 사용했다. 첫 결과는 얼굴이 오른쪽을 향해 최종 산출물로 채택하지 않았다. 두 번째 호출에서 같은 인물을 왼쪽으로 돌리고 흰 배경 원본을 생성했다. 최종 캐릭터는 한 명이며, 추가 변형은 만들지 않았다.
- 그림은 내장 이미지 도구가 그렸다. Pillow는 배경 제거, 외곽 흰 매트 제거, 자르기, 크기 조정, 파일 변환과 검사에만 사용했다.
- 프로젝트에 작성한 파일은 아래 4개뿐이다. 게임 코드와 기존 참고 이미지는 수정하지 않았다. 이미지 도구가 자동 생성한 캐시 원본은 도구의 기본 경로에 남아 있다.

## 결과 파일

| 용도 | 파일 | 크기·형식 | 파일 용량 |
|---|---|---|---|
| 최종 생성 원본 | `raw/coach_bada.png` | 1254×1254, RGB PNG, 흰 배경 | 2,047,249바이트 |
| 게임용 초상화 | `coach_bada.webp` | 512×512, RGBA WebP, 투명 배경, 무손실 | 202,880바이트 |
| 축소 검수본 | `raw/coach_bada-64.webp` | 64×64, RGBA WebP, 투명 배경, 무손실 | 6,706바이트 |
| 제작 기록 | `coach-notes.md` | UTF-8 마크다운 | 이 문서 |

- PNG는 두 번째 생성 결과를 바이트 단위 그대로 복사했다. SHA-256 비교로 원본 일치를 확인했다.
- 외곽과 연결된 흰 배경을 제거하고 인물과 연결된 영역을 보존했다. 수염·셔츠 내부의 밝은 색은 보존했다. 외곽 2px는 인접 내부 색을 참고해 흰 매트 영향을 제거했다.
- 원본 인물 영역은 좌상단 (16, 17)부터 우하단 (1237, 1237)까지다. 자른 뒤 긴 변을 450px로 조정해 512px 투명 캔버스 중앙에 배치했다.
- 게임용 불투명 영역의 경계는 (31, 31)–(481, 481)이며, 가로·세로 약 87.9%를 차지한다. 어깨 아래는 평평하게 끝난다.
- 64px 검수본은 최종 512px 이미지를 Lanczos로 축소했다.

## 그림 내용과 검수

- 햇볕에 탄 얼굴, 온화한 눈과 미소, 풍성한 흰색·회색 수염, 낡은 남색 선원 모자와 황동 단추, 남색 외투와 크림색 셔츠를 표현했다.
- 얼굴과 코는 화면 왼쪽을 향하고, 눈은 플레이어 쪽을 바라본다.
- 소품은 추가하지 않아 작은 크기에서도 얼굴과 실루엣에 집중할 수 있다.
- 최종 512px와 64px WebP를 각각 열어 확인했다. 64px에서도 남색 모자, 밝은 수염, 따뜻한 얼굴과 미소가 구분된다.
- 어두운 투명 이미지 뷰어 배경에서 외곽을 확인했다. 흰 배경 덩어리나 연속적인 흰 매트 테두리는 육안으로 발견하지 못했다. 모자와 머리카락의 밝은 부분은 그림 자체의 햇빛 표현이다.
- 글자·숫자·로고·워터마크·장식 테두리는 육안으로 발견하지 못했다.
- 두 WebP의 정상 디코딩, 정확한 픽셀 크기, RGBA 모드, 알파 최솟값 0·최댓값 255, 투명 모서리, 무손실 픽셀 일치를 자동 검사했다.
- 실제 게임 화면의 배치·크롭·테두리·배경별 어울림은 확인하지 않았다. 이번 작업은 이미지 제작이며 게임 코드 연결과 브라우저 실행은 포함하지 않았다.

## 사용 프롬프트

### 1차 — 초상화 생성

참고 입력: `home_1.webp`, `cine/trade_deal.webp`, `cine/trade_arrive.webp`, `ships/ship_2.webp`.
도구 설정: `transparent_background: true`. 첫 생성은 흰 배경 요청과 달리 RGBA로 반환됐고, 얼굴 방향도 오른쪽이어서 채택하지 않았다.

```text
Use case: illustration-story / stylized-concept.
Create ONE square character portrait, not a sheet or variants. Asset: Navigator Bada (항해사 바다), the friendly helper in an educational trade game for Korean sixth graders.
STYLE REFERENCE INPUTS: image 1 home_1.webp for warm honey sunlight, cream and blue palette and hand-painted material; image 2 trade_deal.webp for the painterly character rendering and warm welcoming expressions; image 3 trade_arrive.webp for gentle storybook cartoon charm and soft gouache/watercolor-like brushwork; image 4 ship_2.webp for the game's softly painted compact asset silhouette and clean isolated edges. These four are style references only, do not copy the scenes, people, ship, scenery, frames, or layouts.
SUBJECT: one veteran old sailor grandpa, kind and dependable, warm weathered sun-tanned face, rounded friendly nose, broad gentle smile, bright kind eyes looking at the player, thick simple grey-white eyebrows and a full softly rounded white/grey beard and moustache. Worn navy sailor/captain cap with a simple muted brass button, no letters or insignia. Navy blue worn coat over warm cream sailor shirt, subtly warm ochre collar accents. No hands or accessories needed: prioritize the friendly face.
COMPOSITION: bust/shoulders-up, centered in a square, body and head turned slightly toward image-left while eyes warmly meet the viewer. Large head, bold compact silhouette, a few big readable painted shapes, strong separation of navy cap / tan face / grey-white beard / navy shoulders. Head and shoulders occupy 85-90% of square width and height. Whole cap visible with a little breathing room above; shoulders can end in one flat crop line near the bottom. Not a tiny figure in a large canvas.
RENDERING: charming softly painted storybook cartoon with warm colors and gentle dimensional light, restrained visible brush texture, soft watercolor/gouache-like transitions, enough defined outer silhouette for clean masking. Simplify facial details and clothing folds strongly for an actual 64x64 game avatar. Avoid photorealism, shiny 3D, thick black vector outlines, anime, excessive wrinkles, fine clutter or individual flyaway hairs.
SOURCE BACKGROUND FOR POSTPROCESSING: plain uniform pure white #FFFFFF, cleanly separable from the subject; keep beard and shirt slightly warm grey/cream with defined painted edges so background can be keyed out without erasing them. No shadow on background, no glow, no white sticker outline, no halo, no paper texture outside subject. Final deliverable will be transparent after white removal.
No text, letters, numbers, signature, logos, watermark, border, scenery, other characters, props floating outside silhouette. One portrait only. Square 1024x1024 or higher.
```

### 2차 — 방향 보정 및 최종 흰 배경 원본

입력 1: 1차 생성 초상화(편집 대상). 입력 2–5: 위의 스타일 참고 이미지 4장.
도구 설정: `transparent_background: false`. 흰 배경 RGB PNG로 반환됐으며, 이 결과를 최종 원본으로 보관하고 후처리했다.

```text
Use case: precise-object-edit / illustration-story.
Create ONE corrected final portrait of Navigator Bada for the educational trade game.
INPUT IMAGE 1 is the EDIT TARGET: preserve this same friendly veteran old sailor grandpa identity, painterly warm storybook rendering, worn navy cap with brass button, sun-tanned skin, large friendly eyes, gentle smile, full grey-white beard, navy coat and warm cream collar. INPUTS 2-5 are STYLE REFERENCES: home_1.webp, trade_deal.webp, trade_arrive.webp, ship_2.webp. Match their warm painted gouache/watercolor-like materials and dimensional storybook cartoon charm.
REQUIRED DIRECTION CORRECTION: the target currently has the nose pointing to image-right. Turn/mirror the character's pose to face slightly toward IMAGE-LEFT instead: the NOSE TIP MUST POINT TOWARD THE LEFT EDGE of the image; the visible EAR should be on IMAGE-RIGHT. Keep eyes looking at the player. Gentle three-quarter portrait, not a side profile.
REQUIRED SOURCE BACKGROUND: output an OPAQUE pure flat WHITE #FFFFFF background, no transparency in this source image. This white source will subsequently be keyed out using Pillow for the final transparent game WebP. Beard/shirt remain warm ivory/grey with distinct painted edges. Absolutely no cast shadow outside the silhouette, no white halo, glow, sticker border or background texture.
COMPOSITION: square image, centered head-and-shoulders bust with the large friendly head occupying most of the picture. The ENTIRE silhouette should fit within approximately 88% of square width and 88% of square height, leaving roughly 6% plain white margin on every side including above the cap. Shoulders may terminate in a flat horizontal bust crop near the bottom inside that margin. No hands or props. Big simple readable navy cap / tan face / ivory beard / navy shoulders at 64x64. Preserve the first image's excellent warmth and style, simplify fine stray hairs on outer edges. Warm gentle lighting, kind and dependable expression suitable for Korean sixth graders.
Do not include any text, letters, numbers, emblem, logos, signatures, watermarks, frames, scenery, extra characters or multiple variants. ONE portrait only. Output square 1024x1024 or larger.
```

