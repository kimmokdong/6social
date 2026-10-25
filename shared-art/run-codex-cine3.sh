#!/bin/bash
# 오프닝 영상 마지막 장면 finale 1장
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/shared-art" || exit 1
codex exec --skip-git-repo-check -s workspace-write -C "$ROOT/shared-art" "Read TRADE-V6-CINE.md in this folder. Other workers are making the other scenes; you make ONLY the Finale scene (id finale) exactly as the file says, with the built-in image generation tool only (Pillow only to resize and convert to WebP). Use trade/v6/home_3.webp as the reference for the island and city, and trade/title.webp for the painting style. Save trade/v6/cine/finale.webp (1600x900, quality 85) and raw/finale.png. Write notes to trade/v6/cine/notes-finale.md. Do not edit any file outside trade/v6/cine/. Report briefly." </dev/null 2>&1 | tail -12
