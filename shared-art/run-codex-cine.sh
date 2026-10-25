#!/bin/bash
# 오프닝 영상 장면 12장(TRADE-V6-CINE.md)을 Codex image_gen으로 만든다. 배경 실행 때도 stdin을 닫는다.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/shared-art" || exit 1
codex exec --skip-git-repo-check -s workspace-write -C "$ROOT/shared-art" "Read TRADE-V6-CINE.md in this folder and make all twelve scene paintings exactly as it says, with the built-in image generation tool only (Pillow only to resize and convert to WebP). Open the reference pictures first and match their style. Work in this order: res_food, res_oil, res_ore, res_cloth, res_steel, res_tech, ev_storm, ev_pirates, ev_invention, ev_festival, ev_fire, ev_market. Save each WebP as soon as it is done. If the usage limit stops you, stop there and write what was finished in trade/v6/cine/notes.md. Do not edit any file outside trade/v6/cine/. Report briefly." </dev/null 2>&1 | tail -20
