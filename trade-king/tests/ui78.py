# 7.8 실제 툴팁·거절·정산 화면 검사. text7에서도 같은 장면을 검사한다.
import ast, io, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

SIZES = [(1366, 768), (1280, 720), (1024, 768), (768, 1024), (800, 1280), (1280, 800), (1180, 820), (820, 1180)]
OUT = Path('output/playwright/v78')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/index.html')

def scenes(pg, check):
    pg.keyboard.press('Escape'); pg.mouse.move(5, 5)
    pg.evaluate("""() => { TK6.start('daon'); const G = TK6.G, E = TK6.E; while (G.pending) E.choose(G, null); E.botTurn(G, 'focus'); TK6.render(); }""")
    assert pg.locator('.settle-dots i').count() == 4
    assert '올해 1번째 정산까지' in pg.inner_text('.settle')
    assert '다음 정산 예상' in pg.inner_text('.forecast')
    check('top')
    pg.hover('.forecast'); pg.locator('.forecast').focus(); pg.wait_for_timeout(350)
    assert '식량' in pg.inner_text('#gtip') and '빚' in pg.inner_text('#gtip'), pg.inner_text('#gtip')
    check('forecast-tip'); pg.mouse.move(5, 5)
    pg.evaluate("""() => { const G = TK6.G, E = TK6.E, n = E.player(G); n.money = 0; n.debt = 120; E.tickDay(G); TK6.render(); }""")
    assert '빚 120억' in pg.inner_text('.coins')
    check('debt')
    pg.hover('.coins'); pg.wait_for_timeout(350)
    assert '들어오는 돈으로 빚부터 갚아요' in pg.inner_text('#gtip')
    assert '−6점' in pg.inner_text('#gtip')
    check('debt-tip'); pg.mouse.move(5, 5)
    pg.evaluate("""() => { const G = TK6.G, n = G.nations[0], o = G.nations[1]; G.rel[n.id][o.id] = G.rel[o.id][n.id] = 0; TK6.render(); }""")
    pg.evaluate("document.querySelector('.isle.refused').click()")
    assert not pg.locator('.dockpanel').count()
    assert '거래 거절' in pg.inner_text('#ticker')
    check('refusal')
    pg.evaluate("document.querySelector('.isle.refused [data-info]').click()")
    assert '거래 거절 · 새해에 다시' in pg.inner_text('#tip')
    check('refusal-tip'); pg.mouse.click(5, pg.viewport_size['height'] - 5)
    # 계약 깨기는 실제 배 툴팁의 경고를 검사한다
    pg.evaluate("document.querySelector('.piece[data-ship]').click()")
    b = pg.locator('[data-break]').first
    assert '♥0이 되면 새해까지 거래를 안 해요' in b.get_attribute('data-tip')
    b.hover(); pg.wait_for_timeout(350); check('break-warning')
    pg.mouse.click(5, pg.viewport_size['height'] - 5)
    pg.evaluate("""() => { const G = TK6.G, me = TK6.E.player(G); me.ships[0].delivery = {month: G.month, day: G.day, to: G.nations[1].id,
      get: [1, 0, 0, 0, 0, 0], sold: [0, 0, 0, 1, 0, 0], earned: 120, spent: 20, shortages: [], penaltyIn: [],
      penaltyOut: [{good: 3, qty: 1, amount: 36, debt: 9, reason: '재고 부족'}]}; TK6.render(); }""")
    pg.evaluate("document.querySelector('.arrival [data-report]').click()")
    assert '금고가 모자라 9억은 빚이 됐어요' in pg.inner_text('#layer')
    check('arrival-debt'); pg.locator('[data-close-report]').click()
    # 실제 엔진으로 빚이 있는 한 해를 마친다
    pg.evaluate("""() => { TK6.start('ironland'); const G = TK6.G, E = TK6.E; G.plan = []; const n = E.player(G); n.debt = 99999;
      while (G.month < 12) { while (G.pending) E.choose(G, null); E.tick(G); } n.history[0].penaltyDebt = 9; n.history[0].penaltyOut = 36; TK6.render(); }""")
    row = pg.locator('.score-row').filter(has_text='빚 때문에 깎인 점수')
    assert '−10점' in row.inner_text()
    assert '금고가 모자라 9억은 빚이 됐어요' in pg.inner_text('#layer')
    assert pg.evaluate("document.querySelector('.year-trade').getBoundingClientRect().bottom <= document.querySelector('.yr-foot').getBoundingClientRect().top + 1"), '연말 무역 내역과 다음 해 팁이 겹침'
    check('year-debt')

def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    OUT.mkdir(parents=True, exist_ok=True)
    tree = ast.parse(Path('trade-king/tests/text7.py').read_text(encoding='utf-8'))
    scan = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'SCAN' for t in n.targets))
    fails, errors, perf = [], [], []
    sizes = SIZES if os.environ.get('ALL') else [SIZES[i] for i in [0, 2, 3]]
    with sync_playwright() as p:
        br = p.chromium.launch()
        for huge in [False, True]:
            for w, h in sizes:
                tag = f'{w}x{h}{"-huge" if huge else ""}'
                pg = br.new_page(viewport={'width': w, 'height': h}, reduced_motion='reduce')
                pg.on('pageerror', lambda e: errors.append(str(e)))
                pg.goto(BASE + '?debug')
                pg.evaluate("h => { localStorage.clear(); localStorage.setItem('trade6.settings', JSON.stringify({text: h ? 'huge' : 'big', motion: 'less'})); }", huge)
                pg.reload(); pg.wait_for_timeout(150)
                def check(name):
                    bad = {k: v for k, v in pg.evaluate(scan).items() if v}
                    if bad: fails.append(f'{tag} {name}: {bad}')
                    if not huge and w in [1366, 1024, 768]: pg.screenshot(path=str(OUT / f'{name}-{tag}.png'))
                scenes(pg, check)
                perf.append(pg.evaluate("""() => { const E = TK6.E, G = TK6.G; E.choose(G, null); const t = performance.now(); E.forecast(G); const fresh = performance.now() - t, c = performance.now(); for (let i = 0; i < 100; i++) E.forecast(G); return {fresh, cached: (performance.now() - c) / 100}; }"""))
                pg.close()
        br.close()
    print('예측 시간(ms):', perf)
    print('issues:', len(fails), 'errors:', len(errors))
    for f in fails + errors: print(f)
    assert not fails and not errors
    print('PASS ui78')

if __name__ == '__main__': main()
