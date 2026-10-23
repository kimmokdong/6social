# 무역왕 6.x 화면 검사(Playwright): 저장소 루트에서 python -m http.server 8080 을 켠 뒤 python trade-king/tests/check6.py <캡처 저장 폴더>
import sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = 'http://localhost:8080/trade-king/play6.html?debug'
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1366, 'height': 768})
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/1-start.png')
    pg.click('[data-start=daon]')
    pg.evaluate('TK6.E.X.monthSeconds = 0.25')
    pg.wait_for_selector('#layer:not([hidden]) [data-ok=open]', timeout=10000)
    pg.screenshot(path=f'{OUT}/2-open.png')
    pg.click('[data-ok=open]')
    # 배 1: 끌어다 놓기
    img = pg.locator('.shipcard[data-ship="0"] .no img').bounding_box()
    card = {'x': img['x'] - 40, 'y': img['y'] - 30}   # 카드 속 배 그림 위에서 끌기 시작
    isle = pg.locator('.isle:not(.world)').first.bounding_box()
    pg.mouse.move(card['x'] + 60, card['y'] + 50); pg.mouse.down()  # = 그림 중앙
    pg.mouse.move(card['x'] + 80, card['y'] + 20, steps=4)
    pg.mouse.move(isle['x'] + isle['width'] / 2, isle['y'] + isle['height'] / 2, steps=8); pg.mouse.up()
    pg.wait_for_selector('.dockpanel'); pg.screenshot(path=f'{OUT}/3-dock.png')
    print('dock sign enabled:', pg.is_enabled('[data-sign]'))
    if not pg.is_enabled('[data-sign]'):
        pg.locator('[data-step][data-d="1"]:not([disabled])').first.click()
    print('dock fill:', pg.evaluate('JSON.stringify([...document.querySelectorAll(".step")].map(e => e.innerText.replace(/\s+/g, " ")))'))
    pg.locator('[data-step][data-d="1"]:not([disabled])').first.click() if pg.locator('[data-step][data-d="1"]:not([disabled])').count() else None; pg.screenshot(path=f'{OUT}/3b-dock-step.png')
    print('after pick:', pg.is_enabled('[data-sign]'))
    pg.click('[data-sign]')
    # 배 2: 지도 위 배 그림을 섬으로 끌기
    sh = pg.locator('.ship.mine[data-k="1"]').bounding_box(); isle2 = pg.locator('.isle:not(.world)').nth(1).bounding_box()
    pg.mouse.move(sh['x'] + sh['width'] / 2, sh['y'] + sh['height'] / 2); pg.mouse.down()
    pg.mouse.move(isle2['x'] + isle2['width'] / 2, isle2['y'] + isle2['height'] / 2, steps=10); pg.mouse.up()
    print('map-ship drag opened dock:', pg.locator('.dockpanel').count() == 1)
    pg.wait_for_selector('.dockpanel')
    if pg.is_enabled('[data-sign]'): pg.click('[data-sign]')
    else: pg.click('[data-close]')
    pg.click('[data-speed="1"]'); pg.wait_for_timeout(700)
    pg.evaluate('TK6.E.X.monthSeconds = 3'); pg.wait_for_timeout(2500)
    pg.screenshot(path=f'{OUT}/4-sailing.png')
    print('ticker:', pg.evaluate('({x: getComputedStyle(document.querySelector(".roll")).transform, dur: document.querySelector(".roll").style.cssText})'))
    pg.evaluate('TK6.E.X.monthSeconds = 0.25')
    print('routes:', pg.evaluate('TK6.G.nations[0].ships.map(s => s.route && [s.route.to, s.route.give, s.route.get, s.state])'))
    shots = {'yearEnd': 0, 'meeting': 0, 'event': 0}
    for _ in range(400):
        st = pg.evaluate('({p: TK6.G.pending && TK6.G.pending.type, over: TK6.G.over, m: TK6.G.month})')
        if st['over']: break
        if st['p']:
            t = st['p']
            if t in shots and shots[t] == 0:
                shots[t] = 1; pg.screenshot(path=f'{OUT}/5-{t}.png')
                if t == 'event': print('event results:', pg.evaluate('[...document.querySelectorAll("#layer .result")].map(e => e.textContent)'))
            if st['m'] == 14 and not shots.get('mid'):
                shots['mid'] = 1; print('lanes mine/routed:', pg.evaluate('[document.querySelectorAll(".lanes .mine").length, TK6.E.player(TK6.G).ships.filter(s => s.route).length]'))
            if t == 'meeting':
                btns = pg.locator('#layer [data-card]:not([data-card=""]):not([disabled])')
                if btns.count(): btns.first.click()
                pg.click('#layer [data-card=""]') if pg.locator('#layer [data-card=""]').count() else None
            else:
                pg.locator('#layer button').first.click()
            # 쉬는 배가 있으면 첫 섬으로 보낸다
            pg.evaluate("""(() => { const G = TK6.G, E = TK6.E, P = E.player(G); P.ships.forEach((s, i) => { if (!s.route && G.month >= 3) { const r = E.bestRoute(G, P, s, {}); if (r) E.setRoute(G, i, r); } }); })()""")
            pg.evaluate('TK6.render()')
            if pg.locator('[data-speed="1"][aria-pressed=false]').count() and not pg.evaluate('!!TK6.G.pending'): pg.click('[data-speed="2"]')
        pg.wait_for_timeout(150)
    pg.wait_for_timeout(300); pg.screenshot(path=f'{OUT}/6-end.png')
    print('over:', pg.evaluate('TK6.G.over'), 'score:', pg.evaluate('TK6.E.player(TK6.G).score'))
    for w, h in [(1024, 768), (768, 1024)]:
        pg.set_viewport_size({'width': w, 'height': h}); pg.click('[data-ok=again]') if pg.locator('[data-ok=again]').count() else None
        pg.click('[data-start=market]'); pg.evaluate('TK6.E.X.monthSeconds = 0.25'); pg.wait_for_selector('[data-ok=open]'); pg.click('[data-ok=open]')
        pg.evaluate("""(() => { const G = TK6.G, E = TK6.E, P = E.player(G); P.ships.forEach((s, i) => { const r = E.bestRoute(G, P, s, {}); if (r) E.setRoute(G, i, r); }); TK6.render(); })()""")
        pg.click('[data-speed="1"]'); pg.wait_for_timeout(600)
        sc = pg.evaluate('({sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, minFont: Math.min(...[...document.querySelectorAll("body *")].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => parseFloat(getComputedStyle(e).fontSize)))})')
        print(w, h, sc); pg.screenshot(path=f'{OUT}/7-{w}x{h}.png')
        pg.evaluate('TK6.G.over = true'); pg.evaluate('TK6.render()')
    b.close()
print('errors:', errs[:5])
