#!/bin/bash
# 오프닝 영상 무역 장면 4장(TRADE-V6-CINE.md의 Trade scenes)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/shared-art" || exit 1
codex exec --skip-git-repo-check -s workspace-write -C "$ROOT/shared-art" "Read TRADE-V6-CINE.md in this folder. Another worker is making the res_* and ev_* images; you make ONLY the four Trade scenes (trade_load, trade_deal, trade_voyage, trade_arrive) exactly as the file says, with the built-in image generation tool only (Pillow only to resize and convert to WebP). Open the reference pictures first and match their style. Save each WebP as soon as it is done. Write your notes to trade/v6/cine/notes-trade.md (not notes.md). If the usage limit stops you, stop and write what was finished there. Do not edit any file outside trade/v6/cine/. Report briefly." </dev/null 2>&1 | tail -20
