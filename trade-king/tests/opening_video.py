# 시작 화면 → 게임 시작 → 오프닝 영상 → 나라 고르기까지 녹화하고, 배경음악·내레이션·효과음을 실제 시각에 얹어 mp4로 굽는다.
# 결과: output/playwright/title71/trade-king-opening.mp4
# URL=http://localhost:8083/trade-king/play6.html python -X utf8 trade-king/tests/opening_video.py
import os, sys, io, time, shutil, subprocess, json
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/play6.html')
OUT = Path('output/playwright/title71'); OUT.mkdir(parents=True, exist_ok=True)
SND = Path('shared-art/trade/v6/sound'); VOICE = Path('shared-art/trade/v6/voice')
OP = json.loads(subprocess.run(['node', '-e', "require('./trade-king/js/opening6.js'); console.log(JSON.stringify(globalThis.TRADE_OPENING))"], capture_output=True, text=True, encoding='utf-8').stdout)
WATCH = '''() => { window.__subs = []; const n = document.querySelector('#cine .sub-line');
  new MutationObserver(() => window.__subs.push({t: Date.now(), text: n.textContent})).observe(n, {childList: true, characterData: true, subtree: true}); }'''
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, record_video_dir=str(OUT / 'vid'), record_video_size={'width': 1280, 'height': 720})
    pg = ctx.new_page(); t_page = time.time() * 1000
    pg.goto(BASE); pg.evaluate("localStorage.clear(); localStorage.setItem('trade6.settings', JSON.stringify({voice: true, sound: true}))"); pg.goto(BASE)
    pg.wait_for_timeout(4500)                       # 시작 화면을 잠시 보여 준다
    pg.click('#title [data-t=play]'); t_click = time.time() * 1000 - t_page
    pg.wait_for_function('document.querySelector("#cine .sub-line")', timeout=5000); pg.evaluate(WATCH)
    pg.wait_for_function('TradeTitle.peek().single?.playing', timeout=10000)
    t0, s = pg.evaluate('[Date.now(), TradeTitle.peek().single]'); t0 = t0 - s['clock'] * 1000 - t_page   # 첫 컷 시작(영상 기준 ms)
    lens = pg.evaluate('TradeTitle.peek().lens')
    pg.wait_for_function('!TradeTitle.playing', timeout=int((sum(lens) + 15) * 1000), polling=500)
    subs = pg.evaluate('window.__subs')
    pg.wait_for_function('document.querySelector(".start [data-start]")', timeout=8000)
    pg.wait_for_timeout(4000)                       # 나라 고르기 화면을 잠시 보여 준다
    path = pg.video.path(); ctx.close(); b.close()
acc, starts = 0, []
for L in lens: starts.append(t0 + acc * 1000); acc += L
seen, lines = set(), []
for x in subs:
    if x['text'] and x['text'] not in seen: seen.add(x['text']); lines.append(x['t'] - t_page)
print(f'click {t_click / 1000:.1f}s  first cut {t0 / 1000:.1f}s  opening {acc:.1f}s  lines {len(lines)}')
webm = OUT / 'full.webm'; shutil.move(path, webm)
ins, fc, k = [str(webm), str(SND / OP['soundtrack'])], '', 2
# 내레이션: 자막이 바뀐 시각
vo = []
for n, t in enumerate(lines):
    f = VOICE / f'op_{n + 1:02d}.mp3'
    if not f.exists(): continue
    ins.append(str(f)); fc += f'[{k}:a]adelay={int(t)}|{int(t)}[v{k}];'; vo.append(f'[v{k}]'); k += 1
# 효과음: 컷 시작 + sfxAt (sfxOff는 뺀다)
fx = []
for i, shot in enumerate(OP['shots']):
    if not shot.get('sfx') or shot['sfx'] in OP.get('sfxOff', []): continue
    f = SND / shot['sfx']
    if not f.exists(): continue
    t = int(starts[i] + shot.get('sfxAt', 0) * 1000)
    ins.append(str(f)); fc += f'[{k}:a]adelay={t}|{t},volume={OP["volume"]["sfx"]}[f{k}];'; fx.append(f'[f{k}]'); k += 1
fc += ''.join(vo) + f'amix=inputs={len(vo)}:normalize=0,asplit[vo][sc];'
fc += f'[1:a]adelay={int(t0)}|{int(t0)},volume={OP["volume"]["track"]}[mu];[mu][sc]sidechaincompress=threshold=0.015:ratio=8:attack=60:release=700[md];'
fc += ''.join(fx) + f'amix=inputs={len(fx)}:normalize=0[fx];[md][fx][vo]amix=inputs=3:normalize=0,alimiter=limit=0.9,apad[out]'
args = ['ffmpeg', '-y', '-loglevel', 'error'] + sum([['-i', f] for f in ins], [])
subprocess.run(args + ['-filter_complex', fc, '-map', '0:v', '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', str(OUT / 'trade-king-opening.mp4')], check=True)
webm.unlink(); print('ok', OUT / 'trade-king-opening.mp4', 'voices', len(vo), 'effects', len(fx))
