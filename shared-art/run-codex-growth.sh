#!/bin/bash
# 무역왕 6.3 우리 섬 성장 그림(TRADE-V6-GROWTH.md)을 Codex image_gen으로 만든다.
# Codex 사용량 한도에 걸려 있으면 첫 인자로 시작 시각(HHMM)을 주면 그때까지 기다렸다가 실행한다. 예: ./run-codex-growth.sh 2030
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -n "$1" ]; then until [ "$(date +%H%M)" -ge "$1" ]; do sleep 60; done; fi
cd "$ROOT/shared-art" || exit 1
codex exec --skip-git-repo-check -s workspace-write -C "$ROOT/shared-art" "Read TRADE-V6-GROWTH.md in this folder and make the three home-island growth pictures exactly as it says, with the built-in image generation tool only (no code/SVG/PIL drawing; Pillow only to resize and convert to WebP). Open the reference pictures first and match their style. If the usage limit stops you, stop there and write what was finished in trade/v6/home-notes.md. Do not edit any file outside trade/v6/. Report briefly what you made and what remains." 2>&1 | tail -30
