#!/bin/bash
# Codex 사용량 한도가 풀리는 20:25 이후에 그림 작업 시작
until [ "$(date +%H%M)" -ge 2025 ]; do sleep 60; done
cd /c/Users/hyunseung/Desktop/test/sahoe-games/shared-art
codex exec --skip-git-repo-check -s workspace-write -C "C:/Users/hyunseung/Desktop/test/sahoe-games/shared-art" --add-dir "C:/Users/hyunseung/Desktop/test/sahoe-games/fake-traveler" "이 폴더의 IMAGES.md에 적힌 그림을 전부 내장 이미지 생성 도구(image_gen)로 만들어 줘. 코드/SVG/PIL로 그림을 그리면 안 돼.
규칙: IMAGES.md의 공통 스타일 문장을 모든 프롬프트 끝에 붙이고, 참고 그림(../fake-traveler/assets/img/...)을 먼저 열어 보고 화풍을 맞춰. 원본은 raw/, 최적화본은 IMAGES.md의 폴더·크기대로 WebP(Pillow 사용 가능), 마지막에 manifest.json.
순서: 1) 등장인물 16명 2) 플레이어 24장 3) 다온시 시대 사진 7장·엔딩 6장 4) 삼권 엔딩 배경 3장·소품 12개. 사용량 한도가 오면 거기서 멈추고 지금까지 만든 것까지 manifest.json에 정리해.
품질 확인: 직접 열어 보고 글자·워터마크, 실존 국기·건물·로고, 특징이 틀린 인물(예: 왕부자 회장 콧수염 없음), 잘린 크롭이 있으면 다시 생성.
건드리면 안 되는 것: 이 폴더 밖의 파일(참고 그림 읽기만 허용), IMAGES.md.
끝나면 만든 것·다시 만든 것·남은 것을 짧게 보고해 줘." 2>&1 | tail -30
