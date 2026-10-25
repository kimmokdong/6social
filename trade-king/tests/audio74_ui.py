# 무역왕 7.4 소리 검사: 배경음악(멈춤 중에도 나옴·창이 뜨면 줄어듦·위기·탭 숨김·처음 화면에서 멈춤), 효과음 17가지가 맞는 파일로 울리는지, 설정 저장, 404·오류 0.
# URL=http://localhost:8083/trade-king/index.html python -X utf8 trade-king/tests/audio74_ui.py
import os, sys, io
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/index.html')
fails, errors, bad = [], [], []
def ok(c, m):
    if not c: fails.append(m)
J = {
 'event': "([id, close]) => { const G = TK6.G, o = G.nations[1]; G.pending = {type: 'event', id, until: G.month + 6, source: o.id, good: o.main}; G.queue = [G.pending]; TK6.render(); if (close) { G.pending = null; G.queue = []; document.querySelector('#layer').hidden = true; } }",
 'meeting': "() => { const G = TK6.G, E = TK6.E, me = E.player(G); while (G.pending) E.choose(G, null); me.money = 999; G.pending = {type: 'meeting', tier:'gold', cards: E.cardsFor(G, me,'gold').slice(0,3)}; G.queue = [G.pending]; TK6.render(); }",
 'clear': "() => { const G = TK6.G; G.pending = null; G.queue = []; document.querySelector('#layer').hidden = true; TK6.render(); }",
 'finish': "() => { const G = TK6.G, E = TK6.E; let n = 0; while (!G.over && n++ < 200) { while (G.pending) E.choose(G, G.pending.type === 'event' ? 0 : null); if (G.over) break; E.botTurn(G, 'focus'); E.tick(G); } while (G.pending) E.choose(G, null); TK6.render(); }",
 'months': "() => { const G = TK6.G, E = TK6.E; E.botTurn(G, 'focus'); TK6.render(); for (let k = 0; k < 16; k++) { TK6.tick(); while (G.pending) E.choose(G, G.pending.type === 'event' ? 0 : null); } TK6.render(); }",
 'hide': "h => { Object.defineProperty(document, 'hidden', {value: h, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); }",
}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1366, 'height': 768})
    pg.on('pageerror', lambda e: errors.append(str(e)[:120])); pg.on('response', lambda r: r.status >= 400 and bad.append(r.url))
    pg.goto(BASE + '?debug'); pg.evaluate("localStorage.clear(); localStorage.setItem('trade6.helper', 'off')"); pg.goto(BASE + '?debug'); pg.wait_for_timeout(400)
    st = lambda: pg.evaluate('TK6.audio.state()')
    pg.click('[data-start=plains]'); pg.wait_for_timeout(1500)
    s = st(); ok(s['cur'] == 'sail' and s['playing'], f'게임 시작에 평소 곡: {s}'); ok('layer' in s['duck'] and s['duckGain'] < .6, f'첫 무역 창에서 작아짐: {s}')
    pg.click('[data-ok=open]'); pg.wait_for_timeout(700)
    t0 = st()['time']; pg.wait_for_timeout(1200); s = st()
    ok(s['time'] > t0 + .8 and not s['duck'], f'멈춤 중에도 음악이 흐름·창 닫히면 원래 크기: {t0} → {s}')
    # 7.6 출항은 계약 당일. 실제 계약 버튼으로 출항음을 검증한다(봇 API는 UI 소리를 내지 않음).
    target = pg.evaluate("() => {const {G,E}=TK6,n=E.player(G);return E.bestRoute(G,n,n.ships[0]).to}")
    pg.click(f'.isle[data-drop="{target}"]'); pg.click('[data-sign]'); pg.wait_for_timeout(200)
    pg.evaluate(J['event'], ['storm', False]); pg.wait_for_timeout(700)
    s = st(); ok(s['want'] == 'storm' and s['duckGain'] < .6, f'위기 사건: {s}')
    pg.click('[data-opt-event]'); pg.wait_for_timeout(700); s = st(); ok(s['want'] == 'sail' and s['duckGain'] > .9, f'위기 끝: {s}')
    pg.evaluate(J['hide'], True); pg.wait_for_timeout(300); ok(not st()['playing'], '탭을 숨기면 멈춤')
    pg.evaluate(J['hide'], False); pg.wait_for_timeout(500); ok(st()['playing'], '탭이 보이면 다시')
    files = pg.evaluate("Object.fromEntries(TradeSound74.events.map(([id]) => [id, TradeAudio.fileOf(id)]))")
    # 몇 달 흘려 출항·도착·정산, 회의·카드, 사건 세 종류
    pg.evaluate(J['months']); pg.wait_for_timeout(200)
    pg.evaluate(J['meeting']); pg.wait_for_timeout(300)
    pg.click('[data-card]:not([data-card=""]):not(:disabled)'); pg.wait_for_timeout(200); pg.evaluate(J['clear'])
    evs = pg.evaluate("TK6.E.S.events.map(e => [e.id, e.crisis ? 'crisis' : e.kind === 'problem' ? 'problem' : 'opportunity'])")
    for kind in ['crisis', 'problem', 'opportunity']:
        pg.evaluate(J['event'], [next(i for i, k in evs if k == kind), True]); pg.wait_for_timeout(150)
    # 끌기·섬 위·놓기·취소·계약·막힌 단추
    piece = pg.locator('.piece').first.bounding_box(); isle = pg.locator('.isle:not(.world)').first.bounding_box()
    def drag():
        pg.mouse.move(piece['x'] + 20, piece['y'] + 20); pg.mouse.down(); pg.mouse.move(piece['x'] + 50, piece['y'] - 50, steps=4)
        pg.mouse.move(isle['x'] + isle['width'] / 2, isle['y'] + isle['height'] / 2, steps=10); pg.mouse.up(); pg.wait_for_timeout(500)
    drag(); pg.click('[data-close]'); pg.wait_for_timeout(150)
    drag(); pg.evaluate("() => document.querySelector('[data-step][data-d=\"1\"]:not(:disabled)')?.click()"); pg.wait_for_timeout(100)
    sign = pg.locator('[data-sign]:not(:disabled)')
    if sign.count(): sign.click(); pg.wait_for_timeout(200)
    else: pg.click('[data-close]')
    # 돈이 모자라 막힌 회의 카드를 누르면 '안 돼요'
    pg.evaluate(J['meeting'].replace('me.money = 999', 'me.money = 0; me.debt = 1')); pg.wait_for_timeout(300)
    bb = pg.locator('#layer [data-reroll]:disabled').first.bounding_box(); pg.mouse.click(bb['x'] + 6, bb['y'] + 6); pg.wait_for_timeout(100); pg.evaluate(J['clear'])
    # 결과 책: 음악·효과음, 쪽 넘기기
    pg.evaluate(J['finish']); pg.wait_for_timeout(800)
    ok(st()['want'] == 'end', f'결과 책 음악: {st()}')
    pg.click('[data-endpage="2"].pg'); pg.wait_for_timeout(200)
    played = {x['id']: x['file'] for x in pg.evaluate('TK6.audio.log')}
    print('울린 효과음:', sorted(played))
    for id, f in files.items():
        if id == 'rankup': continue   # 순위가 오를 때만(판마다 다름)
        ok(played.get(id) == f, f'효과음 {id} → {f} (울린 것: {played.get(id)})')
    # 처음 화면이면 게임 음악 멈춤 · 설정 저장
    pg.click('[data-ok=again]'); pg.wait_for_timeout(1800)
    s = st(); ok(s['cur'] is None or not s['playing'], f'처음 화면에서 게임 음악 멈춤: {s}')
    pg.click('[data-start=forest]'); pg.wait_for_timeout(500); pg.click('[data-ok=open]'); pg.wait_for_timeout(200)
    # 7.7 위쪽 막대의 🎵·🔊 대신 ⚙️ 설정 창에서 끈다
    pg.click('[data-settings]'); pg.wait_for_timeout(150); pg.click('[data-setk=music][data-setv=off]'); pg.click('[data-setk=sound][data-setv=off]'); pg.click('.sh-foot [data-sheet-close]'); pg.wait_for_timeout(300)
    sv = pg.evaluate("JSON.parse(localStorage.getItem('trade6.settings'))"); ok(sv.get('music') == 'off' and sv.get('sound') is False, f'설정 저장: {sv}')
    pg.reload(); pg.wait_for_timeout(500); s = st(); ok(not s['music'] and not s['sfx'], f'다시 열어도 꺼짐: {s}')
    b.close()
print('errors', errors); print('404', bad)
print(f'issues: {len(fails)}')
for f in fails: print('FAIL', f)
sys.exit(1 if fails or errors or bad else 0)
