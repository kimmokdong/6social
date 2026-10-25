# 한 파일 사운드트랙 싱크 검사: 영상 시계(clock)와 실제 재생 위치(at)의 차이가 0.25초 안인지, 소리 끄고 켠 뒤에도 맞는지.
# shared-art/trade/v6/sound/soundtrack.mp3 가 있어야 한다(없으면 시험용으로 아무 소리나 넣고 돌린다).
# URL=http://localhost:8083/trade-king/play6.html python -X utf8 trade-king/tests/soundtrack71.py
import os, sys, io
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/play6.html')
fails = []
def check(pg, tag):
    s = pg.evaluate('TradeTitle.peek().single')
    gap = abs(s['at'] - s['clock'])
    print(f"{tag}: clock {s['clock']}s  at {s['at']}s  playing {s['playing']}  vol {s['vol']}  gap {gap:.2f}")
    if not s['ok'] or not s['playing'] or gap > .25: fails.append(f'{tag} gap {gap:.2f} playing {s["playing"]}')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto(BASE); pg.evaluate("localStorage.setItem('trade6.settings', JSON.stringify({voice: true}))"); pg.goto(BASE); pg.wait_for_timeout(3000)
    pg.click('#title [data-t=play]')
    pg.wait_for_function('TradeTitle.peek().single?.playing', timeout=10000)
    pg.wait_for_timeout(3000); check(pg, 'start+3s')
    pg.wait_for_timeout(9000); check(pg, 'start+12s')
    pg.click('#cine [data-c=voice]'); pg.wait_for_timeout(4000)
    s = pg.evaluate('TradeTitle.peek().single'); print('off:', s)
    if s['playing'] and s['vol'] > 0: fails.append('still audible when off')
    pg.click('#cine [data-c=voice]'); pg.wait_for_timeout(1500); check(pg, 'after on')
    pg.wait_for_timeout(8000); check(pg, 'after on+8s')
    b.close()
print('FAILS', len(fails)); [print(' -', f) for f in fails]
