# 무역왕 7.6 디자인 A 화면 확인: 판·섬 툴팁·창고 툴팁·끌기·계약서(추천/다 보기·헐값)·1년 결과(1~5년)·도착 결과(위약금)를 세 크기로 찍고
# ⓘ 단추의 i가 동그라미 가운데에 있는지, 정박 타원·부두 받침이 없는지, 남은 브라우저 title 툴팁이 없는지 잰다.
# python -X utf8 trade-king/tests/design76_ui.py   (캡처: output/playwright/v76)
import os, sys, io, json
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/index.html')
OUT = Path('output/playwright/v76'); OUT.mkdir(parents=True, exist_ok=True)
fails, errors = [], []
PLAY = '''([id, months]) => { TK6.start(id); const G = TK6.G, E = TK6.E;
  for (let k = 0; k < months && !G.over; k++) { while (G.pending) { if (G.pending.type === 'meeting') E.choose(G, null); else E.choose(G, G.pending.type === 'event' ? 0 : null); } E.botTurn(G, 'focus'); E.tick(G); }
  while (G.pending && !G.over) E.choose(G, null); for(const o of G.nations.slice(1))G.rel[G.nations[0].id][o.id]=G.rel[o.id][G.nations[0].id]=1; TK6.render(); return true; }'''
SIZES = [(1366, 768), (1024, 768), (768, 1024)]
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in SIZES:
        pg = b.new_page(viewport={'width': w, 'height': h}, reduced_motion='reduce')
        pg.on('pageerror', lambda e: errors.append(str(e)[:160]))
        pg.goto(BASE + '?debug'); pg.evaluate("localStorage.clear(); localStorage.setItem('trade6.opening', '1')"); pg.goto(BASE + '?debug'); pg.wait_for_timeout(500)
        pg.evaluate(PLAY, ['plains', 4]); pg.wait_for_timeout(200)
        pg.screenshot(path=str(OUT / f'board-{w}.png'))
        # 남은 title 속성, 받침·정박 타원
        left = pg.evaluate("() => [...document.querySelectorAll('#app [title], #layer [title]')].map(e => e.outerHTML.slice(0, 80))")
        if left: fails.append(f'{w} title attrs {left[:3]}')
        if pg.evaluate("() => document.querySelectorAll('.pier .pad, .mooring').length"): fails.append(f'{w} pads/moorings still in DOM')
        # ⓘ: i 글자 상자의 가운데가 동그라미 가운데와 1px 안
        ic = pg.evaluate("""() => [...document.querySelectorAll('.info')].map(el => { const c = el.getBoundingClientRect(), i = el.querySelector('i').getBoundingClientRect();
            return {w: Math.round(c.width * 10) / 10, h: Math.round(c.height * 10) / 10, dx: Math.round((i.left + i.width / 2 - c.left - c.width / 2) * 10) / 10, dy: Math.round((i.top + i.height / 2 - c.top - c.height / 2) * 10) / 10}; })""")
        for k in ic:
            if abs(k['w'] - k['h']) > .5 or abs(k['dx']) > 1 or abs(k['dy']) > 1: fails.append(f'{w} info off-centre {k}')
        if w == 1366: print('info boxes', ic[:2])
        # 섬 툴팁(그 나라 입장)
        pg.evaluate("() => document.querySelector('.isle:not(.world) [data-info]').click()"); pg.wait_for_timeout(120)
        txt = pg.inner_text('#tip')
        if '수출해요' not in txt or '수입하고 싶어요' not in txt: fails.append(f'{w} isle tip text {txt[:80]}')
        pg.screenshot(path=str(OUT / f'isle-tip-{w}.png'))
        pg.mouse.click(5, h - 5); pg.wait_for_timeout(60)
        # 창고 툴팁(게임 툴팁)
        pg.hover('.stock[data-good="0"]'); pg.wait_for_timeout(450)
        if pg.evaluate("() => document.querySelector('#gtip').hidden"): fails.append(f'{w} warehouse gtip not shown')
        pg.screenshot(path=str(OUT / f'gtip-stock-{w}.png'))
        pg.mouse.move(5, 5); pg.wait_for_timeout(80)
        # 끌기: 섬 위에 올렸을 때(네모 틀 없음)
        sh = pg.locator('.piece[data-ship="1"] .fig').bounding_box(); isle = pg.locator('.isle:not(.world)').first.bounding_box()
        pg.mouse.move(sh['x'] + sh['width'] / 2, sh['y'] + sh['height'] / 2); pg.mouse.down(); pg.mouse.move(sh['x'] + 40, sh['y'] - 40, steps=4)
        pg.mouse.move(isle['x'] + isle['width'] / 2, isle['y'] + isle['height'] / 3, steps=8); pg.wait_for_timeout(120)
        out = pg.evaluate("() => { const el = document.querySelector('.isle.over'); if (!el) return null; const cs = getComputedStyle(el); return {outline: cs.outlineStyle, bg: cs.backgroundColor, scale: cs.scale, img: getComputedStyle(el.querySelector('.tile img')).filter}; }")
        if not out or out['outline'] != 'none' or 'drop-shadow' not in out['img']: fails.append(f'{w} drag-over {out}')
        pg.screenshot(path=str(OUT / f'drag-over-{w}.png'))
        pg.mouse.up(); pg.wait_for_timeout(400)
        # 계약서: 추천 → 다 보기(헐값 줄)
        if not pg.locator('.dockpanel').count(): pg.evaluate("() => document.querySelector('.isle:not(.world)').click()"); pg.wait_for_timeout(200)
        pg.screenshot(path=str(OUT / f'contract-{w}.png'))
        pg.click('[data-more]'); pg.wait_for_timeout(150)
        dump = pg.locator('.dockpanel .step.dump').count()
        if not dump: fails.append(f'{w} no 헐값 row in 다 보기')
        sc = pg.evaluate("() => { const b = document.querySelector('.dockbody'); return {fit: document.querySelector('.dockpanel').className, over: b.scrollHeight - b.clientHeight}; }")
        if sc['over'] > 1: fails.append(f'{w} contract overflow {sc}')
        print(w, 'contract more', sc)
        pg.screenshot(path=str(OUT / f'contract-more-{w}.png'))
        pg.click('[data-close]'); pg.wait_for_timeout(100)
        # 북쪽 대륙 계약서 다 보기
        pg.evaluate("() => document.querySelector('.isle.world').click()"); pg.wait_for_timeout(150); pg.click('[data-more]'); pg.wait_for_timeout(150)
        sc = pg.evaluate("() => { const b = document.querySelector('.dockbody'); return {fit: document.querySelector('.dockpanel').className, over: b.scrollHeight - b.clientHeight}; }")
        if sc['over'] > 1: fails.append(f'{w} world contract overflow {sc}')
        pg.screenshot(path=str(OUT / f'contract-world-{w}.png')); pg.click('[data-close]'); pg.wait_for_timeout(100)
        # 도착 결과(위약금 두 방향)
        pg.evaluate("""() => { const G = TK6.G, me = TK6.E.player(G), o = G.nations[1]; me.ships[0].delivery = {month: G.month, day: G.day, to: o.id, get: [2, 0, 1, 0, 0, 0], sold: [0, 0, 0, 0, 0, 3], earned: 96, spent: 70,
            shortages: [{good: 2, qty: 1, reason: '상대 재고 부족'}], penaltyIn: [{good: 2, qty: 1, amount: 9, reason: '재고 부족'}], penaltyOut: [{good: 5, qty: 1, amount: 10, reason: '재고 부족'}]}; TK6.render(); }""")
        pg.click('.arrival [data-report="0"]'); pg.wait_for_timeout(150)
        rt = pg.inner_text('#layer')
        if '위약금 +9억' not in rt or '위약금 −10억' not in rt: fails.append(f'{w} delivery penalties {rt[:120]}')
        pg.screenshot(path=str(OUT / f'arrival-{w}.png')); pg.click('[data-close-report]'); pg.wait_for_timeout(80)
        # 1년 결과 1~5년
        for y, nat in [(1, 'plains'), (2, 'market'), (3, 'ironland'), (4, 'forest'), (5, 'daon')]:
            pg.evaluate(PLAY, [nat, 12 * y])
            pg.evaluate("y => { const G = TK6.G; G.pending = {type: 'yearEnd', year: y}; G.queue = [G.pending]; TK6.render(); }", y); pg.wait_for_timeout(150)
            yt = pg.inner_text('#layer')
            if '바구니' in yt or '공장 재료' in yt or '생활에 필요한 물건' not in yt: fails.append(f'{w} year{y} words {yt[:100]}')
            m = pg.evaluate("() => { const m = document.querySelector('#layer .modal'); return {cls: m.className, over: m.scrollHeight - m.clientHeight, bottom: m.getBoundingClientRect().bottom}; }")
            if m['over'] > 1 or m['bottom'] > h: fails.append(f'{w} year{y} overflow {m}')
            if y in (1, 2, 3) or w == 1366: pg.screenshot(path=str(OUT / f'year{y}-{nat}-{w}.png'))
            pg.evaluate("() => { const G = TK6.G; G.pending = null; G.queue = []; document.querySelector('#layer').hidden = true; }")
        # 사건 카드·회의
        pg.evaluate(PLAY, ['plains', 0])
        pg.evaluate("() => { const G = TK6.G, E = TK6.E, o = G.nations[1]; while (G.pending) E.choose(G, null); E.startEvent ? E.startEvent(G, {id: 'supplyCut', source: o.id}) : 0; TK6.render(); }"); pg.wait_for_timeout(150)
        pg.screenshot(path=str(OUT / f'event-{w}.png'))
        pg.evaluate("() => { const G = TK6.G, E = TK6.E, me = E.player(G); G.pending = null; G.queue = []; G.month = 24; me.money = 999; G.pending = {type: 'meeting', tier:'gold', cards: E.cardsFor(G, me,'gold').slice(0,3)}; G.queue = [G.pending]; TK6.render(); }"); pg.wait_for_timeout(150)
        pg.screenshot(path=str(OUT / f'meeting-{w}.png'))
        pg.close()
    b.close()
print('errors', errors); print(f'fails: {len(fails)}')
for f in fails: print('FAIL', f)
sys.exit(1 if fails or errors else 0)
