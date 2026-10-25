#!/bin/bash
# 무역왕 6.4 북쪽 대륙 + 물건 6종 아이콘(TRADE-V6-GOODS.md)을 Codex image_gen으로 만든다.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/shared-art" || exit 1
mkdir -p trade/v6/raw trade/v6/goods
codex exec --skip-git-repo-check -s workspace-write -C "$ROOT/shared-art" "Read TRADE-V6-GOODS.md in this folder and make the northern-continent coast picture and the six goods icons exactly as it says, with the built-in image generation tool only (no code/SVG/PIL drawing; Pillow only to crop, remove the white background, resize and convert to WebP). Open the reference pictures first and match their style. If the usage limit stops you, stop there and write what was finished in trade/v6/goods-notes.md. Do not edit any file outside trade/v6/. Report briefly what you made and what remains." 2>&1 | tail -30
