# 무역왕 7.0 나라 특성 화면 검사: 여덟 나라 × 네 화면 크기에서 넘침·스크롤바 0, 나라 칸 보임, 글자 15px 이상.
# URL=http://localhost:8083/trade-king/play6.html python -X utf8 trade-king/tests/traits7_ui.py  (캡처: output/playwright/trade70)
import os, sys, io, json
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/play6.html')
OUT = Path('output/playwright/trade70'); OUT.mkdir(parents=True, exist_ok=True)
IDS = ['daon', 'plains', 'oil', 'market', 'forest', 'port', 'artisan', 'ironland']
SIZES = [(1366, 768), (1280, 720), (1024, 768), (768, 1024)]
fails, errors = [], []

SCAN = '''() => {
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const oy = /auto|scroll/.test(cs.overflowY), ox = /auto|scroll/.test(cs.overflowX);
    if (oy && el.scrollHeight > el.clientHeight + 1) bad.push('y:' + (el.className || el.tagName));
    if (ox && el.scrollWidth > el.clientWidth + 1) bad.push('x:' + (el.className || el.tagName));
  }
  const d = document.documentElement;
  if (d.scrollHeight > innerHeight + 1) bad.push('page-y ' + d.scrollHeight + '>' + innerHeight);
  if (d.scrollWidth > innerWidth + 1) bad.push('page-x ' + d.scrollWidth);
  return bad.slice(0, 6);
}'''
SLOT = '''() => { const e = document.querySelector('.nation-slot'); if (!e) return null; const r = e.getBoundingClientRect();
  let minF = 99; for (const x of document.querySelectorAll('.bar, .bar *')) { if (!x.childNodes.length || getComputedStyle(x).display === 'none') continue;
    if ([...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) minF = Math.min(minF, parseFloat(getComputedStyle(x).fontSize)); }
  return {x: r.x, y: r.y, w: Math.round(r.width), h: Math.round(r.height), inside: r.x >= 0 && r.right <= innerWidth && r.y >= 0 && r.bottom <= innerHeight, minF, text: e.innerText.replace(/\\s+/g, ' ')}; }'''
PLAY = '''([id, months]) => { TK6.start(id); const G = TK6.G, E = TK6.E;
  for (let k = 0; k < months && !G.over; k++) { while (G.pending) { if (G.pending.type === 'meeting') E.choose(G, null); else E.choose(G, G.pending.type === 'event' ? 0 : null); } E.botTurn(G, 'focus'); E.tick(G); }
  while (G.pending && !G.over) E.choose(G, null); TK6.render(); return E.traitInfo(G, E.player(G)); }'''

def check(page, tag):
    bad = page.evaluate(SCAN)
    if bad: fails.append(f'{tag} overflow {bad}')

with sync_playwright() as p:
    b = p.chromium.launch()
    for (w, h) in SIZES:
        page = b.new_page(viewport={'width': w, 'height': h}, reduced_motion='reduce')
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
        page.goto(BASE + '?debug'); page.wait_for_timeout(400)
        check(page, f'title {w}')
        if w in (1366, 768): page.screenshot(path=str(OUT / f'title-{w}.png'))
        for id in IDS:
            info = page.evaluate(PLAY, [id, 14]); page.wait_for_timeout(120)
            s = page.evaluate(SLOT)
            if not s or not s['inside']: fails.append(f'{id} {w} slot {s}')
            elif s['minF'] < 15: fails.append(f'{id} {w} bar font {s["minF"]}')
            check(page, f'{id} {w}')
            page.click('.nation-slot'); page.wait_for_timeout(80)
            tr = page.evaluate("() => { const t = document.querySelector('#tip.nation-tip'); if (!t) return null; const r = t.getBoundingClientRect(); return {in: r.x >= 0 && r.right <= innerWidth && r.y >= 0 && r.bottom <= innerHeight, txt: t.innerText.slice(0, 60)}; }")
            if not tr or not tr['in']: fails.append(f'{id} {w} slot tip {tr}')
            if w == 1366 or (w == 768 and id in ('oil', 'ironland')): page.screenshot(path=str(OUT / f'{id}-{w}.png'))
            page.mouse.click(5, h - 5); page.wait_for_timeout(50)
            if w == 1366: print(id, s['w'], 'px |', s['text'], '|', info['warn'], '|', tr and tr['txt'].replace('\n', ' '))
        # 결과 책: 석유·철의 나라·숲
        for id in ('oil', 'ironland', 'forest'):
            page.evaluate(PLAY, [id, 99]); page.wait_for_timeout(200)
            for pg in (1, 2, 3):
                page.evaluate(f"() => document.querySelector('[data-endpage=\"{pg}\"].pg')?.click()"); page.wait_for_timeout(150)
                check(page, f'end{pg} {id} {w}')
                if w == 1366 and id != 'forest' or w == 768 and id == 'oil' and pg == 2: page.screenshot(path=str(OUT / f'end{pg}-{id}-{w}.png'))
            page.evaluate("() => { document.querySelector('#layer').hidden = true; }")
        # 발전 회의(카드 경고): 숲·철의 나라
        for id in ('forest', 'ironland', 'oil'):
            page.evaluate(PLAY, [id, 0])
            page.evaluate("() => { const G = TK6.G, E = TK6.E, me = E.player(G); while (G.pending) E.choose(G, null); G.month = 24; G.base[1] = 45; me.money = 999; const cards = E.cardsFor(G, me,'gold').slice(0,3); G.pending = {type: 'meeting', tier:'gold', cards}; G.queue = [G.pending]; TK6.render(); }")
            page.wait_for_timeout(150); check(page, f'meeting {id} {w}')
            if w == 1366: page.screenshot(path=str(OUT / f'meeting-{id}.png')); print('meeting', id, page.evaluate("() => [...document.querySelectorAll('#layer [data-card]')].map(b => b.innerText.replace(/\\n/g, ' / ')).join(' || ')"))
            page.evaluate("() => { const G = TK6.G; G.pending = null; G.queue = []; document.querySelector('#layer').hidden = true; }")
        # 계약서 꼬리표: 장인·대평원·항구
        if w in (1366, 1024):
            for id in ('artisan', 'plains', 'port', 'ironland'):
                page.evaluate(PLAY, [id, 6]); page.wait_for_timeout(100)
                tgt = page.evaluate("""() => { const G = TK6.G, E = TK6.E, me = E.player(G);
                  const pick = {artisan: o => E.GOODS.some(g => me.quality[g] === 3 && E.sells(G, me, g) && E.buys(G, o, g)), plains: o => E.buys(G, o, 0),
                    port: o => E.GOODS.some(g => E.isRelay(G, me, g) && E.buys(G, o, g)), ironland: o => E.buys(G, o, 5)}[me.id];
                  const o = G.nations.slice(1).find(pick); if (me.id === 'port') for (const g of E.GOODS) if (E.isRelay(G, me, g)) me.box[g][2] += 10; TK6.render(); return o && o.id; }""")
                if not tgt: print('no target for', id); continue
                page.evaluate(f"() => document.querySelector('[data-drop=\"{tgt}\"]').click()"); page.wait_for_timeout(200)
                feats = page.evaluate("() => [...document.querySelectorAll('.features li, .dockpanel .tag.relay, .dockpanel .tag.lux, .dockpanel h3 small')].map(e => e.innerText).join(' | ')")
                check(page, f'dock {id} {w}')
                if w == 1366: page.screenshot(path=str(OUT / f'dock-{id}.png')); print('dock', id, '→', tgt, ':', feats)
                page.evaluate("() => document.querySelector('[data-close]')?.click()"); page.wait_for_timeout(80)
        page.close()
    # 도우미: 처음 게임(공통 + 나라 소개), 새 나라(소개만), 때 맞춤(석유 유전)
    ctx = b.new_context(viewport={'width': 1366, 'height': 768}, reduced_motion='reduce'); page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE + '?helper&debug'); page.evaluate('localStorage.clear()'); page.goto(BASE + '?helper&debug'); page.wait_for_timeout(300)
    page.click('[data-start=plains]'); page.wait_for_timeout(200); page.evaluate("() => document.querySelector('[data-ok=open]')?.click()"); page.wait_for_timeout(300)
    page.click('[data-coach-next]'); page.wait_for_timeout(200); page.click('[data-coach-next]'); page.wait_for_timeout(500)
    txt = page.inner_text('#coach .bubble'); page.screenshot(path=str(OUT / 'helper-intro.png'))
    print('helper step3:', txt.replace('\n', ' ')[:140])
    if '우리 나라만의 특성' not in txt: fails.append('helper intro missing')
    if 'helper.plains' not in json.dumps(page.evaluate('Object.keys(localStorage)')): fails.append('intro not stored')
    page.click('[data-coach-off]'); page.wait_for_timeout(100)
    # 새 나라(공통은 끝냄): 소개 하나만
    page.evaluate("localStorage.setItem('trade6.helper','done')"); page.goto(BASE + '?debug&hints'); page.wait_for_timeout(300)
    page.click('[data-start=oil]'); page.wait_for_timeout(200); page.evaluate("() => document.querySelector('[data-ok=open]')?.click()"); page.wait_for_timeout(500)
    txt = page.inner_text('#coach .bubble') if page.locator('#coach:not([hidden])').count() else ''
    print('new nation:', txt.replace('\n', ' ')[:120])
    if '새 나라 도움말' not in txt: fails.append('new-nation intro missing')
    page.click('[data-coach-next]'); page.wait_for_timeout(100)
    page.evaluate("() => { const G = TK6.G, me = TK6.E.player(G); while (G.pending) TK6.E.choose(G, null); me.trait.reserve = 79; me.trait.stage = 1; TK6.render(); }"); page.wait_for_timeout(400)
    txt = page.inner_text('#coach .bubble') if page.locator('#coach:not([hidden])').count() else ''
    page.screenshot(path=str(OUT / 'helper-hint-oil.png'))
    print('hint:', txt.replace('\n', ' ')[:120])
    if '유전이 늙어' not in txt: fails.append('oil hint missing')
    page.click('[data-coach-next]'); page.wait_for_timeout(100); page.evaluate('TK6.render()'); page.wait_for_timeout(200)
    if page.locator('#coach:not([hidden])').count() and '유전이 늙어' in page.inner_text('#coach .bubble'): fails.append('hint repeated')
    ctx.close(); b.close()
print('errors', errors[:5]); print('FAILS', len(fails)); [print(' -', f) for f in fails[:40]]
