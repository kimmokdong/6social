# Finale 시네마틱 제작 기록

- 범위: finale 장면만 제작. 다른 장면 및 게임 코드는 수정하지 않았습니다.
- 생성 도구: 내장 image_gen. Pillow는 리사이즈 및 WebP 변환에만 사용했습니다.
- 참고: `trade/v6/home_3.webp`의 섬·도시 정체성, `trade/title.webp`의 회화 스타일. 지침에 나열된 end_king, end_island, end_rawOnly도 열어 색감과 화풍을 확인했습니다.
- 최종 원본: `raw/finale.png`, 1672×940 PNG. 도구 생성 원본을 그대로 복사했습니다.
- 최종 납품: `finale.webp`, 1600×900, WebP quality 85, LANCZOS 리사이즈.
- 재생성: 최초 결과에서 화물선 6척과 하단 자막 영역 침범을 확인하여 1회 수정했습니다.
- 최종 검수: 빨강·파랑·초록·보라·노랑 화물선 각 1척, 유리 타워·컨테이너 부두·등대·오른쪽 해변 등 기준 섬 특징, 황금빛 석양과 불꽃놀이, 부두 축하 인파 확인. 상단 약 10%는 하늘, 하단 18%는 바다로 확보했습니다. 육안상 글자·숫자·로고·국기·워터마크 없음. 선체와 컨테이너도 확인했습니다.
- 최종 이미지와 400×225 축소본에서 밝기·색 구분·중심 피사체를 육안 확인했습니다. 임시 축소 검수 파일은 삭제했습니다.

## 최초 생성 프롬프트

```text
Use case: illustration-story / reference-guided transformation.
Create ONE cinematic finale painting, landscape 16:9, 1600x900 or larger (minimum 1536x864).
Input 1 home_3.webp is the exact island and city identity to preserve. Input 2 title.webp is the painting style reference only. Redraw the SAME island from a slightly lower, more dramatic three-quarter viewpoint at golden sunset. Preserve its recognizable compact rocky oval island, pale granite outcrops on the left shoreline, central cluster of blue glass towers including its tallest rounded glass tower and rectangular towers, white apartment blocks, small central roundabout, right rear industrial plant with three slim stacks, turquoise crescent beach at the right and small white lighthouse at the right rocky tip, and the front container terminal with two blue gantry cranes and low grey warehouses. Do not substitute a generic old town or a different island.
Composition: the island and its glowing modern trade city form one clear central subject in the centre third, shown in a sweeping wide establishing shot. Strong near-water / middle-distance ships and island / distant sky depth. The same modern glass towers, container terminal and lighthouse now glow with warm lights. Five distinct cargo ships with RED, BLUE, GREEN, PURPLE and YELLOW hulls arrive in a graceful single-file line along a shimmering golden sun path on the sea toward the terminal. Keep all five hull colors visibly distinct; perspective size differences and white wakes make the direction of arrival clear. Modest beautiful celebratory fireworks burst over the harbour, while tiny friendly crowds celebrate on the quay. Triumphant, hopeful ending: our nation prospered through trade.
Style: match title.webp's warm detailed hand-painted Mediterranean storybook illustration, visible brushwork, richly painted water, natural rocky coastline, warm golden light, turquoise sea. Friendly and epic, suitable for children; no photorealism, no slick 3D render or miniature game screenshot. Sunset remains luminous enough to read at 400 pixels wide; retain bright warm architecture and clear ship colors rather than dark silhouettes.
Frame safety: important objects and fireworks stay below the top 10 percent and above the bottom 18 percent. Top 10 percent is only soft sunset sky; bottom 18 percent is only shimmering open water. Keep buildings, lighthouse, crowds, ships and fireworks fully inside the safe central region.
Absolutely no text, lettering, numbers, writing on hulls or containers, signs, logos, brand names, flags, watermarks, borders, UI, collage, split panels, or baked-in letterbox bars. No violence, injuries or danger. Output only the single finished illustration.
```

## 수정 프롬프트

```text
Edit this finale illustration, keeping the beautifully recognizable home_3 island with the same blue tower cluster, rocky left shore, two blue cranes, front container quay and warehouses, right crescent beach, white right-hand lighthouse, warm sunset lights, fireworks and tiny celebrating crowds. Keep its detailed warm hand-painted Mediterranean storybook illustration finish; soften digital-sharp microtextures into visible painterly brushwork like title.webp.

Fix the ship procession and video-safe framing. There must be EXACTLY FIVE cargo ships in the entire picture, no sixth ship: one RED hull, one BLUE hull, one GREEN hull, one PURPLE hull, one YELLOW hull. Remove the duplicated green-hulled ship. Recompose the five ships smaller into a single curved incoming line from the distant sun-path water at the left toward the FRONT CONTAINER QUAY. The RED ship leads the line nearest the quay; BLUE follows; GREEN follows; PURPLE follows; YELLOW is furthest away near the sun path. All bows point TOWARD the island terminal, all wakes trail AWAY from it, making arrival unambiguous. No ship points toward the bottom-right corner or away from the island. Their fully visible colored hulls, bows and wakes must all remain ABOVE y=74% of the canvas. Island, pier crowds and lighthouse also stay above y=74%. Bottom 20% (y=80–100%) MUST be only beautiful open sea and reflected sunset ripples, zero ships, cargo, people or rocks: this space is needed for subtitles. Top 10% must remain sunset sky only; fireworks fully below the top 10%. Move/scale the composition as needed to achieve the real empty sea foreground. Maintain one clear island-city focal subject in the middle of the wide 16:9 frame. Luminous, readable at 400 pixels wide. Output 1600x900 or larger 16:9.

No text, writing, letters, numbers, signs, logos, real flags, watermarks, borders, UI or split panels. Hulls and containers completely unmarked. Preserve recognizable island identity; do not add new buildings or alter its landmarks.
```

