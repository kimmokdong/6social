"""8.5 전후 비교 캡처: 첫 판 도움말(클릭·말풍선 수), 안내 줄, 도착 알림·결과 창, 고를 일 자동 멈춤, 계약서, 결과 책.
같은 장면을 8.4와 8.5에서 찍어 비교한다. 화면마다 콘솔 오류·15px 미만 글자·도착 알림/안내 쪽지가 섬을 가리는지도 센다.
실행: python -X utf8 trade-king/tests/shots85.py http://localhost:8080/trade-king/index.html <저장 폴더> [크기들 예: 1366x768,1024x768]
"""
import json, os, sys
from playwright.sync_api import sync_playwright

BASE, OUT = sys.argv[1], sys.argv[2]
SIZES = [tuple(map(int, s.split('x'))) for s in (sys.argv[3] if len(sys.argv) > 3 else '1366x768,1024x768,768x1024').split(',')]
os.makedirs(OUT, exist_ok=True)
report = {'issues': [], 'tutorial': {}}

SMALL = """() => { const out = []; for (const el of document.querySelectorAll('#app *, #layer *, #coach *')) {
  if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
  const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
  const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 14.5) out.push(fs + 'px ' + el.textContent.trim().slice(0, 20)); } return out.slice(0, 5); }"""
COVER = """() => { const hit = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const isles = [...document.querySelectorAll('.isle:not(.world) .tile img, .isle:not(.world) .plank, .home img, .home > b')].map(e => [e.closest('.isle')?.dataset.drop || 'home', e.getBoundingClientRect()]);
  const out = []; for (const s of ['.arrival button', '.note']) for (const e of document.querySelectorAll(s)) { const r = e.getBoundingClientRect();
    for (const [id, q] of isles) { const a = hit(r, q); if (a > q.width * q.height * .08) out.push(`${s} → ${id} ${Math.round(a / (q.width * q.height) * 100)}%`); } } return out; }"""
# 모자란 생활 물건을 파는 가장 가까운 섬에 추천 짐으로 배 1을 보낸다(8.4·8.5 같은 엔진 함수)
ROUTE = """() => { const E = TK6.E, G = TK6.G, me = E.player(G), f = E.forecast(G);
  const g = f.slotsBy.filter(b => b.got < b.need).sort((a, b) => (b.need - b.got) / b.need - (a.need - a.got) / a.need)[0]?.good;
  const o = G.nations.slice(1).filter(o => g != null && E.sells(G, o, g) && E.rel(G, me, o)).sort((a, b) => E.tripTime(G, me, a.id) - E.tripTime(G, me, b.id))[0] || G.nations[1];
  const r = E.plan(G, me, me.ships[0], o); E.setRoute(G, 0, {to: o.id, give: r.give, get: r.get}); TK6.render(); return {good: g, to: o.id}; }"""
ADVANCE = """() => { const E = TK6.E, G = TK6.G, me = E.player(G); let n = 0;
  while (!me.ships.some(s => s.delivery) && n++ < 400) { while (G.pending) E.choose(G, G.pending.type === 'event' ? 0 : null); E.tickDay(G); }
  while (G.pending) E.choose(G, G.pending.type === 'event' ? 0 : null); TK6.render(); return n; }"""
FINISH = """() => { const E = TK6.E, G = TK6.G; G.bot = true; let n = 0; while (!G.over && n++ < 5000) { E.botTurn(G, 'balanced'); E.tick(G); } TK6.render(); return G.over; }"""


def page(b, w, h, helper):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + ('?debug&helper' if helper else '?debug'))
    pg.evaluate(f"() => {{ localStorage.clear(); {'' if helper else "localStorage.setItem('trade6.helper', 'off');"} }}")
    pg.reload(); pg.wait_for_timeout(300)
    return ctx, pg, errs


def new_game(pg, nid='plains'):
    pg.evaluate(f"() => TK6.start('{nid}')"); pg.wait_for_timeout(400)
    if pg.locator('[data-ok=open]').count(): pg.click('[data-ok=open]'); pg.wait_for_timeout(250)


def shot(pg, tag, errs, name):
    pg.screenshot(path=os.path.join(OUT, f'{name}-{tag}.png'))
    small = pg.evaluate(SMALL)
    if small: report['issues'].append(f'{name}-{tag} 15px 미만: {small}')
    if errs: report['issues'].append(f'{name}-{tag} 콘솔 오류: {errs[:3]}'); errs.clear()


def tutorial(b, w, h, tag):
    ctx, pg, errs = page(b, w, h, True)
    new_game(pg)
    pg.wait_for_timeout(600); shot(pg, tag, errs, '1-tutorial')
    clicks, bubbles, guard = 0, set(), 0
    while guard < 40:
        guard += 1
        s = pg.evaluate("() => { const c = TK6_coach.state(); if (!c) return null; const s = c.list[c.step]; return {step: c.step, at: s.at, hidden: document.querySelector('#coach').hidden, next: !!document.querySelector('[data-coach-next]'), text: document.querySelector('#coach .bubble p')?.innerText}; }")
        if s is None or s['hidden']: break
        bubbles.add(s['text'][:30] if s['step'] != 2 or '추천대로' not in (s['text'] or '') else 'sign')
        at = s['at'] or ''
        if s['next']: pg.click('[data-coach-next]'); clicks += 1
        elif '.piece' in at: pg.click('.piece[data-ship="0"]'); pg.click('.isle[data-drop]:not(.world)'); clicks += 2
        elif at.startswith('.isle'): pg.click(at if at.startswith('.isle[data-drop=') else '.isle.match:not(.world)' if pg.locator('.isle.match:not(.world)').count() else '.isle[data-drop]:not(.world)'); clicks += 1   # 8.5 도움말이 가리키는 섬(말풍선에 안 가림)
        elif at in ('[data-more]', '[data-reco]', '[data-sign]'): pg.click(at); clicks += 1
        elif '.speed' in at: pg.click('.speed [data-speed="1"]'); clicks += 1; break
        else: report['issues'].append(f'tutorial-{tag} 모르는 단계 {at}'); break
        pg.wait_for_timeout(450)
    sailing = pg.evaluate("() => TK6.E.player(TK6.G).ships.some(s => s.route)")
    report['tutorial'][tag] = {'clicks': clicks, 'bubbles': len(bubbles), 'sailing': sailing}
    if errs: report['issues'].append(f'tutorial-{tag} 콘솔 오류 {errs[:3]}')
    ctx.close()


def scenes(b, w, h, tag):
    ctx, pg, errs = page(b, w, h, False)
    new_game(pg)
    pg.evaluate(ROUTE); pg.wait_for_timeout(500); shot(pg, tag, errs, '3-guidance')
    pg.evaluate(ADVANCE); pg.wait_for_timeout(700); shot(pg, tag, errs, '2-arrival')
    for c in pg.evaluate(COVER): report['issues'].append(f'2-arrival-{tag} 가림: {c}')
    pg.click('.arrival button'); pg.wait_for_timeout(500); shot(pg, tag, errs, '2b-report')
    ctx.close()
    # 고를 일: 시간이 흐르는 동안 단추 돌발이 오면
    ctx, pg, errs = page(b, w, h, False)
    new_game(pg); pg.evaluate(ROUTE); pg.click('.speed [data-speed="1"]'); pg.wait_for_timeout(400)
    pg.evaluate("() => TK6.E.smallEvent(TK6.G, 'request')"); pg.wait_for_timeout(300)
    d0 = pg.evaluate('() => TK6.G.day'); pg.wait_for_timeout(1500); d1 = pg.evaluate('() => TK6.G.day')
    shot(pg, tag, errs, '4-choice'); report.setdefault('choice', {})[tag] = {'days_passed_in_1.5s': d1 - d0}
    ctx.close()
    # 계약서 기본 화면
    ctx, pg, errs = page(b, w, h, False)
    new_game(pg)
    to = pg.evaluate("() => { const E = TK6.E, G = TK6.G, me = E.player(G), f = E.forecast(G), g = f.slotsBy.filter(b => b.got < b.need).sort((a, b) => (b.need - b.got) / b.need - (a.need - a.got) / a.need)[0]?.good; return (G.nations.slice(1).filter(o => g != null && E.sells(G, o, g)).sort((a, b) => E.tripTime(G, me, a.id) - E.tripTime(G, me, b.id))[0] || G.nations[1]).id; }")
    pg.hover(f'.isle[data-drop="{to}"]'); pg.wait_for_timeout(300); pg.click(f'.isle[data-drop="{to}"]'); pg.wait_for_timeout(600)
    shot(pg, tag, errs, '5-dock')
    if pg.locator('[data-edit]').count(): pg.click('[data-edit]'); pg.wait_for_timeout(500); shot(pg, tag, errs, '5b-dock-edit')
    ctx.close()
    # 결과 책
    ctx, pg, errs = page(b, w, h, False)
    new_game(pg); pg.evaluate(FINISH); pg.wait_for_timeout(2600); shot(pg, tag, errs, '6-ending')
    if pg.locator('.got-open').count(): pg.click('.got-open'); pg.wait_for_timeout(700); shot(pg, tag, errs, '6b-ending-more')
    ctx.close()


with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in SIZES:
        tag = f'{w}x{h}'
        tutorial(b, w, h, tag)
        scenes(b, w, h, tag)
    b.close()
json.dump(report, open(os.path.join(OUT, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False, indent=1))
