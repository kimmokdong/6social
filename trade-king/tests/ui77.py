# 무역왕 7.7 화면 확인: ⚙️ 설정 창(시작 화면으로 나가기 → 이어하기 왕복), 우리 나라 창 세 칸(산업·항구·고른 효과),
# 계약서 머리(1년 · 날짜), 1년 계약이 끝나 쉬는 배를 세 크기로 찍고 넘침·스크롤바·오류를 잰다.
# python -X utf8 trade-king/tests/ui77.py   (캡처: output/playwright/v77)
import os, sys, io
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/index.html')
OUT = Path('output/playwright/v77'); OUT.mkdir(parents=True, exist_ok=True)
fails, errors = [], []
# 사건은 번갈아(0·1) 골라 영구·기간 효과가 함께 생기게, 회의 카드는 살 수 있는 앞 카드 하나
PLAY = '''([id, months]) => { TK6.start(id); const G = TK6.G, E = TK6.E; let k2 = 0;
  for (let k = 0; k < months && !G.over; k++) { while (G.pending) { const p = G.pending; if (p.type === 'meeting') { const me = E.player(G); me.money += 300; const c = p.cards.find(c => E.cardCost(me, c) <= me.money); if (!c || !E.choose(G, c)) E.choose(G, null); else E.choose(G, null); } else E.choose(G, p.type === 'event' ? (k2++ % 2) : null); } E.botTurn(G, 'focus'); E.tick(G); }
  while (G.pending && !G.over) E.choose(G, null); TK6.render(); return true; }'''
OVER = """() => [...document.querySelectorAll('.sheet, .sheet *')].filter(e => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 1) return true;
  const s = e.closest('.sheet').getBoundingClientRect(), r = e.getBoundingClientRect(); return r.width && (r.right > s.right + 1 || r.bottom > s.bottom + 1 || r.left < s.left - 1); }).map(e => e.className || e.tagName).slice(0, 4)"""
BODY = "() => { const b = document.querySelector('.sheet .sh-body'), s = document.querySelector('.sheet').getBoundingClientRect(); return {over: b.scrollHeight - b.clientHeight, bottom: Math.round(s.bottom), fit: document.querySelector('.sheet').className}; }"
def check(pg, tag, w, h):
    o = pg.evaluate(OVER); b = pg.evaluate(BODY)
    if o or b['over'] > 1 or b['bottom'] > h: fails.append(f'{w} {tag} overflow {o} {b}')
    small = pg.evaluate("() => [...document.querySelectorAll('.sheet *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 15 && getComputedStyle(e).display !== 'none').map(e => e.tagName + '.' + e.className + ':' + e.textContent.trim().slice(0, 12)).slice(0, 3)")
    if small: fails.append(f'{w} {tag} font<15 {small}')
    return b
SIZES = [(1366, 768), (1024, 768), (768, 1024)] + ([(1280, 720), (800, 1280), (1280, 800), (1180, 820), (820, 1180)] if os.environ.get('ALL') else [])
with sync_playwright() as p:
    br = p.chromium.launch()
    for huge in ([False, True] if os.environ.get('HUGE') else [False]):
        for w, h in SIZES:
            sfx = f'{w}{"-huge" if huge else ""}'
            pg = br.new_page(viewport={'width': w, 'height': h}, reduced_motion='reduce')
            pg.on('pageerror', lambda e: errors.append(str(e)[:200]))
            pg.goto(BASE + '?debug'); pg.evaluate("localStorage.clear(); localStorage.setItem('trade6.opening', '1')")
            if huge: pg.evaluate("localStorage.setItem('trade6.settings', JSON.stringify({text: 'huge'}))")
            pg.goto(BASE + '?debug'); pg.wait_for_timeout(400)
            pg.evaluate(PLAY, ['plains', 30]); pg.wait_for_timeout(150)
            # 설정 단추: 🎵·🔊 대신 ⚙️ 하나
            if pg.locator('.bar [data-music], .bar [data-sound]').count(): fails.append(f'{w} old sound buttons still in bar')
            pg.click('[data-settings]'); pg.wait_for_timeout(150)
            if pg.evaluate('TK6.G && document.querySelector(".sheet.sh-set") ? 1 : 0') != 1: fails.append(f'{w} settings panel not open')
            txt = pg.inner_text('.sheet')
            for word in ['효과음', '배경음악', '글자 크기', '시작 화면으로 나가기']:
                if word not in txt: fails.append(f'{w} settings missing {word}')
            if '오프닝' in txt: fails.append(f'{w} settings still shows opening replay')
            check(pg, 'settings', w, h); pg.screenshot(path=str(OUT / f'settings-{sfx}.png'))
            # 효과음 끄기 → 저장된 설정에 반영
            pg.click('[data-setk="sound"][data-setv="off"]'); pg.wait_for_timeout(80)
            if pg.evaluate("JSON.parse(localStorage.getItem('trade6.settings')).sound") is not False: fails.append(f'{w} sound setting not saved')
            pg.click('[data-setk="sound"][data-setv="on"]')
            # 시작 화면으로 나가기 → 이어하기: 같은 날짜·금고
            before = pg.evaluate('({m: TK6.G.month, d: TK6.G.day, money: TK6.E.player(TK6.G).money})')
            pg.click('[data-exit-title]'); pg.wait_for_timeout(700)
            if not pg.evaluate("!document.querySelector('#title').hidden && !TK6.G"): fails.append(f'{w} exit did not show title')
            pg.screenshot(path=str(OUT / f'exit-title-{sfx}.png'))
            pg.click('#title [data-t="resume"]'); pg.wait_for_timeout(700)
            after = pg.evaluate('TK6.G ? ({m: TK6.G.month, d: TK6.G.day, money: TK6.E.player(TK6.G).money}) : null')
            if after != before: fails.append(f'{w} resume mismatch {before} {after}')
            # 우리 나라 창 세 칸
            pg.click('[data-home-info]'); pg.wait_for_timeout(150)
            for tab in ['ind', 'port', 'fx']:
                pg.click(f'[data-sheet-tab="{tab}"]'); pg.wait_for_timeout(150)
                b = check(pg, f'home-{tab}', w, h)
                if w == 1366: print(tab, b)
                pg.screenshot(path=str(OUT / f'home-{tab}-{sfx}.png'))
            ft = pg.inner_text('.sheet')
            if '영구' not in ft or '고른 것 모두' not in ft: fails.append(f'{w} fx tab text {ft[:120]}')
            if pg.locator('[data-fx-page="1"]:not([disabled])').count():
                pg.click('[data-fx-page="1"]'); pg.wait_for_timeout(120); check(pg, 'home-fx-p2', w, h); pg.screenshot(path=str(OUT / f'home-fx-p2-{sfx}.png'))
            pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
            if pg.locator('.sheet').count(): fails.append(f'{w} Esc did not close home sheet')
            # 계약서 머리: 1년 계약 · 날짜
            pg.evaluate("() => { const me = TK6.E.player(TK6.G); me.ships.forEach(s => { s.route = null; s.next = null; s.state = 'port'; s.cargo = null; s.t = 0; }); TK6.render(); }")
            pg.evaluate("() => document.querySelector('.isle:not(.world)').click()"); pg.wait_for_timeout(200)
            pg.evaluate("() => document.querySelector('[data-edit]')?.click()"); pg.wait_for_timeout(120)   # 8.5 계약서 기본은 세 줄 · '짐 바꾸기'로 펼친다
            head = pg.inner_text('.dk-head')
            if '1년 계약' not in head or '다음 해' not in head or '번 왕복' not in head: fails.append(f'{w} contract head {head[:120]}')
            pg.screenshot(path=str(OUT / f'contract-head-{sfx}.png')); pg.click('[data-close]'); pg.wait_for_timeout(100)
            # 1년 계약이 끝나 쉬는 배
            ended = pg.evaluate("""() => { const G = TK6.G, E = TK6.E, me = E.player(G), o = G.nations.find(n => n !== me && E.sells(G, n, 0)) || G.nations[1];
                me.money = 5000; E.setRoute(G, 0, {to: 'world', give: null, get: 0}); const r = me.ships[0].route; let k = 0;
                while (me.ships[0].route === r && k++ < 500) { while (G.pending) E.choose(G, null); E.advance(G, 1); } TK6.render(); return {done: r.done, trips: r.trips, until: r.until, now: E.today(G), news: G.news.map(n => n.text)}; }""")
            if pg.evaluate("TK6.E.player(TK6.G).ships[0].route") is not None: fails.append(f'{w} ship 1 did not rest after one year')
            if '쉬는 중' not in pg.inner_text('.piece[data-ship="0"]'): fails.append(f'{w} resting label')
            if not any('계약이 끝났어요' in t for t in ended['news']): fails.append(f'{w} no contract-ended news {ended}')
            pg.screenshot(path=str(OUT / f'resting-{sfx}.png'))
            pg.close()
    br.close()
print('errors', errors); print(f'fails: {len(fails)}')
for f in fails: print('FAIL', f)
sys.exit(1 if fails or errors else 0)
