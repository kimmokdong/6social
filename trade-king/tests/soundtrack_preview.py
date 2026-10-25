# 오프닝을 실제로 재생해 컷 시작 시각을 재고, 그 시각에 사운드트랙+내레이션을 얹은 미리보기 영상을 만든다.
# 결과: output/playwright/title71/opening-soundtrack.mp4
# URL=http://localhost:8083/trade-king/play6.html python -X utf8 trade-king/tests/soundtrack_preview.py
import os, sys, io, time, shutil, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/play6.html')
OUT = Path('output/playwright/title71'); OUT.mkdir(parents=True, exist_ok=True)
SND = Path('shared-art/trade/v6/sound/soundtrack.mp3'); VOICE = Path('shared-art/trade/v6/voice')
WATCH = '''() => { window.__subs = []; const n = document.querySelector('#cine .sub-line');
  new MutationObserver(() => window.__subs.push({t: Date.now(), text: n.textContent})).observe(n, {childList: true, characterData: true, subtree: true}); }'''
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, record_video_dir=str(OUT / 'vid'), record_video_size={'width': 1280, 'height': 720})
    pg = ctx.new_page(); t_page = time.time() * 1000
    pg.goto(BASE); pg.evaluate("localStorage.setItem('trade6.settings', JSON.stringify({voice: true}))"); pg.wait_for_timeout(3200)
    pg.click('#title [data-t=play]')
    pg.wait_for_function('document.querySelector("#cine .sub-line")', timeout=5000); pg.evaluate(WATCH)
    pg.wait_for_function('TradeTitle.peek().single?.playing', timeout=10000)
    t0, s = pg.evaluate('[Date.now(), TradeTitle.peek().single]'); t0 -= s['clock'] * 1000   # 첫 컷 시작(페이지 시계)
    lens = pg.evaluate('TradeTitle.peek().lens')
    pg.wait_for_function('!TradeTitle.playing', timeout=int((sum(lens) + 15) * 1000), polling=500)
    subs = pg.evaluate('window.__subs'); pg.wait_for_timeout(1500)
    path = pg.video.path(); ctx.close(); b.close()
acc, starts = 0, []
for L in lens: starts.append(acc); acc += L
print('cut starts:', ' '.join(f'{i}:{t:.1f}' for i, t in enumerate(starts)), ' total', round(acc, 1))
seen, lines = set(), []
for x in subs:
    if x['text'] and x['text'] not in seen: seen.add(x['text']); lines.append(x['t'] - t_page)
webm = OUT / 'st.webm'; shutil.move(path, webm)
files = sorted(VOICE.glob('op_*.mp3')); n = min(len(files), len(lines))
d0 = int(t0 - t_page)
args = ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(webm), '-i', str(SND)] + sum([['-i', str(f)] for f in files[:n]], [])
fc = ''.join(f'[{k + 2}:a]adelay={int(lines[k])}|{int(lines[k])}[v{k}];' for k in range(n))
fc += ''.join(f'[v{k}]' for k in range(n)) + f'amix=inputs={n}:normalize=0,asplit[vo][sc];'
fc += f'[1:a]adelay={d0}|{d0},volume=0.8[mu];[mu][sc]sidechaincompress=threshold=0.015:ratio=8:attack=60:release=700[md];[md][vo]amix=inputs=2:normalize=0[out]'
subprocess.run(args + ['-filter_complex', fc, '-map', '0:v', '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', str(OUT / 'opening-soundtrack.mp4')], check=True)
webm.unlink(); print('ok', OUT / 'opening-soundtrack.mp4')
