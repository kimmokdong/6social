# 7.9b 화면: 증강체 회의(실버·골드·프리즘) · 작은 돌발 카드 · 값 신호(▲▼, 최근 6달) · 위쪽 막대 예상(8.0 가중치 없음) · 1년 결과 풍요 · 우리 나라 증강체 칸 · 자동 멈춤 설정 · 결과 책 빌드 · 도감 증강체.
# text7도 같은 장면을 모든 크기·아주 큰 글자로 검사한다. URL=http://localhost:8083/trade-king/index.html python -X utf8 trade-king/tests/ui79.py
import ast, io, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/index.html')
OUT = Path('output/playwright/v79b')
# 같은 등급에서 서로 다른 콘셉트 세 장(엔진 회의와 같은 모양)
OFFER = """([tier, have]) => { const {G,E}=TK6,n=E.player(G); n.augments=have||[]; const seen=new Set(),cards=[];
  for(const id of E.cardsFor(G,n,tier)){const c=E.conceptOf(id);if(!seen.has(c)&&cards.length<3){seen.add(c);cards.push(id);}}
  G.pending={type:'meeting',year:Math.floor(G.month/12)+1,tier,cards,catchup:tier==='prism',rerolls:0}; G.queue=[G.pending]; TK6.render(); return cards; }"""

def scenes(pg, check):
    pg.evaluate("() => { localStorage.setItem('trade6.helper','off'); TK6.start('daon'); TK6.render(); }")
    assert pg.locator('.meeting79').count() == 0, '첫해에는 회의가 없다'
    assert pg.locator('[data-ok=open]').count() == 1
    pg.click('[data-ok=open]')
    assert '×' not in pg.inner_text('.forecast'), '8.0: 가중치 표시 없음'
    check('topbar')
    for tier, have in [('silver', []), ('gold', ['grow']), ('prism', ['grow', 'navigator', 'bigShip'])]:
        cards = pg.evaluate(OFFER, [tier, have])
        assert pg.locator('.aug-card').count() == 3 and pg.locator('.aug-card.' + tier).count() == 3
        assert pg.locator('.aug-card .aug-ico').count() == 3 and '/3' in pg.inner_text('.aug-card >> nth=0')
        if have: assert pg.locator('.mine-con').count() >= 1
        check('meeting-' + tier)
        before = pg.evaluate('TK6.E.player(TK6.G).money')
        pg.evaluate("() => { const {G,E}=TK6; G.month=12; E.player(G).meetings.free=1; TK6.render(); }")
        pg.click('[data-reroll]'); pg.wait_for_timeout(150)   # 다시 뽑은 카드가 자리 잡을 때까지
        assert pg.evaluate('TK6.E.player(TK6.G).money') == before
        assert pg.evaluate('new Set(TK6.G.pending.cards.map(TK6.E.conceptOf)).size') == 3
        pg.mouse.move(2, 2); pg.wait_for_timeout(200)   # 긴 검사(text7) 안에서 다시 뽑은 카드가 자리 잡게
        pg.locator('[data-card]').first.click()
        assert pg.evaluate('TK6.G.pending') is None
        pg.evaluate("() => { const {G}=TK6; G.month=0; TK6.render(); }")
    # 작은 돌발: 지도 오른쪽 위 카드(시간 안 멈춤), 단추가 붙은 것
    pg.evaluate("() => { const {G,E}=TK6; G.small.actions=[]; E.player(G).box[E.player(G).main][3]=10; E.smallEvent(G,'merchant'); TK6.render(); }")
    pg.evaluate("() => { TK6.render(); }")
    for id in pg.evaluate('TK6.E.S.smallEvents.map(e=>e.id)'):
        pg.evaluate("id => { const {G,E}=TK6; G.small.actions=[]; E.smallEvent(G,id); TK6.render(); }", id)
        check('small-' + id)
    pg.evaluate("() => { const {G,E}=TK6; G.small.actions=[]; E.player(G).box[E.player(G).main][3]=10; E.smallEvent(G,'merchant'); TK6.render(); }")
    assert pg.locator('[data-small-action]').count() == 1
    check('small-button')
    pg.click('[data-small-action]')
    assert pg.evaluate('TK6.E.smallActions(TK6.G).length') == 0
    # 값 신호: 오르는 물건에 ▲, 계약서에 '최근 6달 중'
    pg.evaluate("() => { const {G}=TK6; for(const a of G.priceHistory){const p=a.at(-1)?.price||20;a.splice(0,a.length,...[0,1,2,3,4,5].map(k=>({month:k,price:Math.max(1,p-5+k)})));} TK6.render(); }")
    assert pg.locator('.isle .trend').count() > 0
    check('isle-trend')
    pg.evaluate("() => document.querySelector('.isle:not(.world)').click()"); pg.wait_for_timeout(120)
    pg.evaluate("() => document.querySelector('[data-edit]')?.click()"); pg.wait_for_timeout(120)   # 8.5 계약서 기본은 세 줄 · '짐 바꾸기'로 펼친다
    if pg.locator('[data-more]').count(): pg.click('[data-more]'); pg.wait_for_timeout(80)
    assert pg.locator('.six').count() > 0 and '최근 6달 중' in pg.locator('.six >> nth=0').text_content()
    check('contract-six')
    pg.evaluate("() => document.querySelector('[data-close]')?.click()"); pg.wait_for_timeout(60)
    # 우리 나라 창: 증강체 칸(콘셉트 10가지)과 산업 칸 풍요 조건
    pg.evaluate("() => { const {G,E}=TK6; E.player(G).augments=['grow','factory','envoy','semiconductor']; TK6.render(); document.querySelector('[data-home-info]').click(); }"); pg.wait_for_timeout(100)
    assert pg.locator('.abund').count() == 1
    check('home-ind')
    pg.evaluate("() => document.querySelector('[data-sheet-tab=\"aug\"]').click()"); pg.wait_for_timeout(100)
    assert pg.locator('.con-grid .con').count() == 10 and pg.locator('.con-grid .con.lit').count() >= 1
    check('home-aug')
    pg.evaluate("() => document.querySelector('[data-sheet-close]').click()"); pg.wait_for_timeout(60)
    # ⚙️ 자동 멈춤 두 줄
    pg.evaluate("() => document.querySelector('[data-settings]').click()"); pg.wait_for_timeout(100)
    assert pg.locator('[data-setk=pauseIdle]').count() == 2 and pg.locator('[data-setk=pauseDrop]').count() == 2
    check('settings-pause')
    pg.evaluate("() => document.querySelector('[data-sheet-close]').click()"); pg.wait_for_timeout(60)
    # 1년 결과: 풍요 줄 · 누적 점수 · 누적 순위, 바로 뒤 2년째 회의
    pg.evaluate("""() => { TK6.start('ironland'); const {G,E}=TK6; while(G.month<12){if(G.pending&&G.pending.type!=='yearEnd'){E.choose(G,null);continue;}if(G.pending)break;E.botTurn(G,'focus');E.tick(G);} TK6.render(); }""")
    t = pg.inner_text('.year-modal')
    assert '풍요 보너스' in t and '누적' in t and ('앞 나라까지' in t or '선두' in t)
    check('year-abundance')
    pg.click('[data-ok=year]'); pg.wait_for_timeout(120)
    assert '2년째 발전 회의' in pg.inner_text('#layer')
    check('meeting-year2')
    # 결과 책 빌드와 점수 그래프, 도감 증강체 모음
    pg.evaluate("""() => { TK6.start('plains'); const {G,E}=TK6; while(!G.over){if(G.pending){E.choose(G,G.pending.type==='event'?0:null);continue;}E.botTurn(G,'focus');E.tick(G);} TK6.render(); }"""); pg.wait_for_timeout(200)
    assert pg.locator('.ending .build em.tier').count() == 4
    assert '×' not in pg.inner_text('.ending .years') and '5년 누적' in pg.inner_text('.ending')
    check('end-build')
    pg.evaluate("() => document.querySelector('[data-codex]').click()"); pg.wait_for_timeout(150)
    pg.evaluate("() => document.querySelector('[data-book-tab=augs]').click()"); pg.wait_for_timeout(100)
    # 8.4 넓은 화면은 한 쪽, 1100px 이하는 두 쪽(콘셉트 / 나라 특성). 쪽을 넘기며 고른 카드 이름을 모은다
    names = lambda: set(pg.locator('.bk-augs2 .ac.on, .bk-augs.traits .ac.on').all_inner_texts())
    got = names()
    check('codex-augs')
    if pg.locator('.bk-pager').count():
        pg.evaluate("() => document.querySelector('.bk-pager button:last-child:not([disabled])')?.click()"); pg.wait_for_timeout(60)
        got |= names()
        check('codex-augs-p2')
    assert len(got) >= 4, f'도감에 고른 발전 카드 4장 이상: {got}'
    pg.evaluate("() => document.querySelector('[data-codex-close]')?.click()")

SHOTS = {'topbar', 'meeting-silver', 'meeting-gold', 'meeting-prism', 'small-button', 'isle-trend', 'contract-six', 'home-ind', 'home-aug', 'settings-pause', 'year-abundance', 'meeting-year2', 'end-build', 'codex-augs', 'codex-augs-p3'}

def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    OUT.mkdir(parents=True, exist_ok=True)
    tree = ast.parse(Path('trade-king/tests/text7.py').read_text(encoding='utf-8'))
    scan = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'SCAN' for t in n.targets))
    fails, errors = [], []
    with sync_playwright() as p:
        br = p.chromium.launch()
        for w, h, huge in [(1366, 768, False), (1024, 768, False), (768, 1024, False), (1366, 768, True)]:
            tag = f'{w}x{h}{"-huge" if huge else ""}'
            pg = br.new_page(viewport={'width': w, 'height': h}, reduced_motion='reduce')
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(BASE + '?debug')
            pg.evaluate("h => {localStorage.clear();localStorage.setItem('trade6.helper','off');localStorage.setItem('trade6.settings',JSON.stringify({text:h?'huge':'big',motion:'less'}));}", huge)
            pg.reload()
            def check(name):
                bad = {k: v for k, v in pg.evaluate(scan).items() if v}
                if bad: fails.append(f'{tag} {name}: {bad}')
                if name in SHOTS: pg.screenshot(path=str(OUT / f'{name}-{tag}.png'))
            try: scenes(pg, check)
            except Exception as e: import traceback; fails.append(f'{tag} 장면 실패: {e!r} {traceback.extract_tb(e.__traceback__)[-1].lineno}행')
            pg.close()
        br.close()
    print('issues:', len(fails) + len(errors))
    for x in fails + errors: print(x)
    raise SystemExit(bool(fails or errors))

if __name__ == '__main__': main()
