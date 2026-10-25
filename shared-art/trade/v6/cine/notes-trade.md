# Trade 시네마틱 제작 기록

- 범위: trade_load, trade_deal, trade_voyage, trade_arrive만 제작합니다.
- 참고 이미지 다섯 장을 열어 화풍과 색감 확인 완료.
- 생성: 내장 image_gen만 사용. Pillow는 리사이즈 및 WebP 변환에만 사용.
- 목표: 원본 PNG 보존, 최종 WebP 1600×900 / quality 85.
- 상태: 네 장 모두 생성·저장·검수 완료.

## trade_load — 완료
- 원본: raw/trade_load.png, 1672×941. 최종: trade_load.webp, 1600×900, WebP quality 85.
- 검수: 붉은 선체, 크레인과 목재 상자, 컨테이너, 안내 작업자, 곡물 자루와 천 두루마리 확인. 따뜻한 회화풍, 중앙 적재 동작 명확. 재생성 없음.
- 실제 생성 프롬프트:
```text
Use case: illustration-story. Asset: a single full-screen cinematic painting for a child-friendly island trading game's opening movie. Generate a 16:9 landscape image at 1536x864 or larger (prefer 2048x1152). Match the five reference pictures already inspected: trade/title.webp, trade/end_king.webp, trade/end_island.webp, trade/end_rawOnly.webp, trade/v6/home_3.webp. Their shared look is warm hand-painted storybook / Civilization-like world illustration: visible gouache and oil brushwork, richly detailed but readable shapes, Mediterranean cream stone buildings, terracotta roofs, turquoise and cobalt sea, golden sun, soft atmospheric island mountains, friendly expressive people of mixed backgrounds. The painting must look illustrated, never photographic or 3D rendered. One clear focal action anchored in the central third; strong foreground / midground / background depth. Keep top 10% and bottom 18% free of important detail for later letterbox and subtitles; paint those areas normally with sky / water / simple ground, do NOT draw bars or borders. Readable and bright at 400 pixels wide. NO text anywhere, no letters, numbers, ship names, hull markings, container codes, labels, written signs, logos, brands, real-country flags, watermarks, UI, collage, split panels, violence or injuries.

Scene (trade_load): Dawn at our harbour: a big crane lifting a wooden crate onto a cargo ship with a clearly RED hull, colourful unmarked containers being loaded and stacked on deck, dock workers guiding the suspended crate safely from the side, wheat sacks and colourful fabric rolls waiting on the quay, warm low sun. The crane's suspended wooden crate and red ship form the central focal action. Sunlit cream stone quay in the foreground, ship and dock workers in the middle, terracotta harbour village and island silhouettes behind. Epic but friendly anticipation.
```

## trade_deal — 완료
- 원본: raw/trade_deal.png, 1672×941. 최종: trade_deal.webp, 1600×900, WebP quality 85.
- 검수: 중앙 악수, 서로 다른 배경의 상인, 빈 계약서와 붉은 봉인, 밀 묶음·기름 용기·접은 셔츠·철제 볼트, 뒤편 두 배 확인. 재생성 없음.
- 실제 생성 프롬프트:
```text
Use case: illustration-story. Asset: a single full-screen cinematic painting for a child-friendly island trading game's opening movie. Generate a 16:9 landscape image at 1536x864 or larger (prefer 2048x1152). Match the five reference pictures already inspected: trade/title.webp, trade/end_king.webp, trade/end_island.webp, trade/end_rawOnly.webp, trade/v6/home_3.webp. Their shared look is warm hand-painted storybook / Civilization-like world illustration: visible gouache and oil brushwork, richly detailed but readable shapes, Mediterranean cream stone buildings, terracotta roofs, turquoise and cobalt sea, golden sun, soft atmospheric island mountains, friendly expressive people of mixed backgrounds. The painting must look illustrated, never photographic or 3D rendered. One clear focal action anchored in the central third; strong foreground / midground / background depth. Keep top 10% and bottom 18% free of important detail for later letterbox and subtitles; paint those areas normally with sky / water / simple ground, do NOT draw bars or borders. Readable and bright at 400 pixels wide. NO text anywhere, no letters, numbers, ship names, hull markings, container codes, labels, written signs, logos, brands, real-country flags, watermarks, UI, collage, split panels, violence or injuries.

Scene (trade_deal): Two merchants from different islands shaking hands across a wooden table on a harbour terrace. One tan-skinned dark-haired man in a blue open-collar shirt, one dark-skinned woman in a warm ochre jacket, both smiling hopefully. Their clasped hands are the clear central focal action. On the tabletop visibly include a completely BLANK unmarked paper contract with a plain red wax seal (no symbol, no writing), and all four sample goods: a wheat bundle, a small unlabelled oil can, a folded shirt, a large steel bolt. Their cargo ships visible behind them in turquoise water; cream stone terrace, distant island harbour. Warm golden light. Frame faces, handshake and every sample above the bottom 18%; leave the lower edge as simple table front / terrace.
```

## trade_voyage — 완료
- 원본: raw/trade_voyage.png, 1672×941. 최종: trade_voyage.webp, 1600×900, WebP quality 85.
- 검수: 낮은 수면 시점, 푸른 선체, 흰 물보라와 항적, 갈매기, 섬과 황금빛 햇빛 확인. 재생성 없음.
- 실제 생성 프롬프트:
```text
Use case: illustration-story. Asset: a single full-screen cinematic painting for a child-friendly island trading game's opening movie. Generate a 16:9 landscape image at 1536x864 or larger (prefer 2048x1152). Match the five reference pictures already inspected: trade/title.webp, trade/end_king.webp, trade/end_island.webp, trade/end_rawOnly.webp, trade/v6/home_3.webp. Their shared look is warm hand-painted storybook / Civilization-like world illustration: visible gouache and oil brushwork, richly detailed but readable shapes, Mediterranean cream stone buildings, terracotta roofs, turquoise and cobalt sea, golden sun, soft atmospheric island mountains, friendly expressive people of mixed backgrounds. The painting must look illustrated, never photographic or 3D rendered. One clear focal action anchored in the central third; strong foreground / midground / background depth. Keep top 10% and bottom 18% free of important detail for later letterbox and subtitles; paint those areas normally with sky / water / simple ground, do NOT draw bars or borders. Readable and bright at 400 pixels wide. NO text anywhere, no letters, numbers, ship names, hull markings, container codes, labels, written signs, logos, brands, real-country flags, watermarks, UI, collage, split panels, violence or injuries.

Scene (trade_voyage): Low dramatic angle from the water: a cargo ship with a clearly BLUE hull ploughing through open sea at golden hour, white wake and spray, seagulls, another Mediterranean island on the horizon. Epic sense of journey. Ship bow and white bridge near the centre third, colourful unmarked containers on deck, diagonal wake creating depth. The full main ship fits comfortably inside the safe middle band, with no vital mast tip or gull in the top 10%. The bottom 18% is only unimportant painterly rolling water. Warm sunlight illuminates the blue hull and container shapes against turquoise/cobalt waves, bright painterly spray, hazy gold sky. No threatening storm.
```

## trade_arrive — 1차 생성 기록 (아래 최종 수정 완료)
- 원본: raw/trade_arrive.png, 1672×941. 최종: trade_arrive.webp, 1600×900, WebP quality 85.
- 검수: 초록 선체, 하역, 환영 인파, 상품 바구니를 든 아이들 확인. 일부 돔이 파란색이므로 지시서의 흰 돔으로 수정 예정.
- 실제 1차 생성 프롬프트:
```text
Use case: illustration-story. Asset: a single full-screen cinematic painting for a child-friendly island trading game's opening movie. Generate a 16:9 landscape image at 1536x864 or larger (prefer 2048x1152). Match the five reference pictures already inspected: trade/title.webp, trade/end_king.webp, trade/end_island.webp, trade/end_rawOnly.webp, trade/v6/home_3.webp. Their shared look is warm hand-painted storybook / Civilization-like world illustration: visible gouache and oil brushwork, richly detailed but readable shapes, Mediterranean cream stone buildings, terracotta roofs, turquoise and cobalt sea, golden sun, soft atmospheric island mountains, friendly expressive people of mixed backgrounds. The painting must look illustrated, never photographic or 3D rendered. One clear focal action anchored in the central third; strong foreground / midground / background depth. Keep top 10% and bottom 18% free of important detail for later letterbox and subtitles; paint those areas normally with sky / water / simple ground, do NOT draw bars or borders. Readable and bright at 400 pixels wide. NO text anywhere, no letters, numbers, ship names, hull markings, container codes, labels, written signs, logos, brands, real-country flags, watermarks, UI, collage, split panels, violence or injuries.

Scene (trade_arrive): A ship with a clearly GREEN hull arriving at a foreign island harbour with different architecture: white domes and palms. People on the quay waving, wooden crates being unloaded, children carrying a basket of goods, festive welcome. The green ship's arrival is the central main subject, with a cheerful group waving nearby; two children together carrying a wicker basket of produce clearly visible in the lower-middle safe area above the bottom 18%. Warm cream stone quay in foreground, green cargo ship and unloading action in the middle, white domed harbour village and palms behind, bright turquoise bay and sunny island slopes. Festive welcome comes from smiling gestures and sunlight, no written banners or flags.
```

### trade_arrive 최종 수정 완료
- 수정 1회: 파란 건축 돔을 따뜻한 흰 회벽 돔으로 변경. 최종 PNG와 WebP를 즉시 갱신.
- 수정 프롬프트:
```text
Use case: precise-object-edit. Edit this single painted harbour scene with only one change: repaint EVERY blue architectural dome roof in the harbour village to warm WHITE plaster, matching the white domed architecture specified for this foreign island. Keep gentle warm cream shadows so the white domes have volume. Preserve the whole composition, green hull, children carrying goods basket, all faces and waving people, crates unloading, palms, sea, warm painterly brushwork, brightness and landscape framing exactly. No text, symbols, logos or markings. Do not add anything else. Output the same full scene in 16:9 landscape, 1536x864 or larger.
```

## 최종 파일 규격
- 네 원본 PNG 모두 1672×941(도구 반환 크기, 약 16:9, 요청 최소 해상도 이상). 원본 보존.
- 네 최종 WebP 모두 1600×900(정확한 16:9), quality 85, RGB. Pillow LANCZOS 리사이즈와 변환만 적용.
- trade_load / trade_deal / trade_voyage / trade_arrive 모두 저장 완료. 사용량 제한 발생 없음.


## 최종 검수 및 작업 범위
- 네 최종 WebP를 각각 열어 선체·컨테이너·계약서·건물·천막의 글자/로고 유무를 육안 확인: 보이는 글자 없음.
- 네 장을 각각 400×225로 줄여 열어 확인: 핵심 행동과 선체 색이 분명하고, 어두워 읽기 어려운 장면 없음.
- 공통 따뜻한 회화풍과 청록색 바다 유지. 사진풍으로 인한 재생성 없음. 도착 장면의 돔 색상만 1회 수정.
- 임시 Pillow 설치 폴더와 400px 미리보기는 검수 후 삭제. 최종 네 WebP, raw/의 네 PNG, 이 메모를 보존.
- 게임 코드 연결 및 실제 영상의 레터박스·자막·줌 재생은 작업 범위 밖이므로 확인하지 않음. 줌 배율에 따른 가장자리 잘림은 재생 단계에서 확인 필요.
- res_* / ev_* 및 다른 작업자의 notes.md는 변경하지 않음. 직접 수정한 파일은 trade/v6/cine/ 내부뿐임.
