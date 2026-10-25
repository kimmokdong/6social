# 오프닝 내레이션 검사: 16개 파일이 모두 불리고, 자막이 바뀌는 순간마다 그 줄 음성이 재생되며, 다음 자막이 녹음을 끊지 않는지 본다.
# 결과 영상(자막 시각에 음성을 얹은 미리보기): output/playwright/title71/opening-voice.mp4
# URL=http://localhost:8083/trade-king/play6.html python -X utf8 trade-king/tests/voice71.py
import os, sys, io, time, json, shutil, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/play6.html')
ROOT = Path('.'); OUT = Path('output/playwright/title71'); OUT.mkdir(parents=True, exist_ok=True)
VOICE = Path('shared-art/trade/v6/voice')
fails, errors = [], []
WATCH = '''() => { window.__subs = []; const n = document.querySelector('#cine .sub-line');
  new MutationObserver(() => { const a = (() => { try { return TradeTitle.peek(); } catch { return {}; } })(); window.__subs.push({t: Date.now(), text: n.textContent, speaking: a.speaking}); }).observe(n, {childList: true, characterData: true, subtree: true}); }'''
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, record_video_dir=str(OUT / 'vid'), record_video_size={'width': 1280, 'height': 720})
    pg = ctx.new_page(); t_page = time.time() * 1000
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('response', lambda r: r.status >= 400 and errors.append(f'{r.status} {r.url}'))
    pg.goto(BASE); pg.evaluate("localStorage.setItem('trade6.settings', JSON.stringify({voice: true}))"); pg.wait_for_timeout(3200)
    pg.click('#title [data-t=play]')
    pg.wait_for_function('document.querySelector("#cine .sub-line")', timeout=5000); pg.evaluate(WATCH)
    pg.wait_for_function('TradeTitle.peek().lens.length > 0 && !document.querySelector("#cine .loading")', timeout=8000)
    peek = pg.evaluate('TradeTitle.peek()')
    total = sum(peek['lens']) + 3
    pg.wait_for_function('!TradeTitle.playing', timeout=int((total + 15) * 1000), polling=500)
    subs = pg.evaluate('window.__subs'); pg.wait_for_timeout(1800)
    path = pg.video.path(); ctx.close(); b.close()
shots = [x for x in json.load(open('trade-king/js/opening6.json', encoding='utf-8'))] if False else None
voices = peek['voices']; lines = [i for i, v in enumerate(voices) if v]
print('files loaded:', sum(1 for v in voices if v and v['ok']), '/', len(lines))
for v in voices:
    if v is not None and not v['ok']: fails.append('voice not loaded')
starts = []
seen = set()
for s in subs:
    if s['text'] and s['text'] not in seen: seen.add(s['text']); starts.append((s['t'] - t_page, s['text']))
print('subtitle changes:', len(starts))
if len(starts) != len(lines): fails.append(f'subtitles {len(starts)} != voice lines {len(lines)}')
# 녹음이 다음 자막 전에 끝나는지(겹침 없음)
durs = [voices[i]['dur'] for i in lines]
for k in range(len(starts)):
    gap = (starts[k + 1][0] - starts[k][0]) / 1000 if k + 1 < len(starts) else None
    flag = '' if gap is None or gap >= durs[k] else '  ← 다음 자막이 녹음을 끊음'
    if flag: fails.append(f'line {k + 1} cut off')
    print(f'{k + 1:2d}  {starts[k][0] / 1000:6.2f}s  음성 {durs[k]:.1f}s  다음까지 {gap if gap is None else round(gap, 1)}s  {starts[k][1][:22]}{flag}')
# 미리보기 영상: 자막이 바뀐 시각에 그 줄 음성을 얹는다
webm = OUT / 'opening-voice.webm'; shutil.move(path, webm)
files = sorted(VOICE.glob('op_*.mp3'))
args = ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(webm)] + sum([['-i', str(f)] for f in files], [])
mix = ''.join(f'[{k + 1}:a]adelay={int(starts[k][0])}|{int(starts[k][0])}[a{k}];' for k in range(min(len(files), len(starts))))
mix += ''.join(f'[a{k}]' for k in range(min(len(files), len(starts)))) + f'amix=inputs={min(len(files), len(starts))}:normalize=0[out]'
subprocess.run(args + ['-filter_complex', mix, '-map', '0:v', '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest', str(OUT / 'opening-voice.mp4')], check=True)
webm.unlink()
print('errors', errors[:5]); print('FAILS', len(fails)); [print(' -', f) for f in fails]
