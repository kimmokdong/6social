# 무역왕 7.3 저장·이어하기·연속 시계 검사. repo root에서 실행(서버 8083).
import io, json, os, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/index.html')
OUT = Path('trade-king/output/playwright/save73'); OUT.mkdir(parents=True, exist_ok=True)
SCAN = re.search(r"SCAN = r'''(.*?)'''", (Path(__file__).parent / 'text7.py').read_text(encoding='utf-8'), re.S).group(1)
fails, errors = [], []
def ok(cond, text):
    if not cond: fails.append(text)

SNAP = '''() => ({game: TK6.E.saveGame(TK6.G), save: JSON.parse(localStorage.getItem('trade6.save')), date: document.querySelector('.when b').textContent,
  ships: [...document.querySelectorAll('#ships .ship')].map(e => [e.dataset.n, e.dataset.k, e.style.left, e.style.top]), paused: document.querySelector('[data-speed="0"]').getAttribute('aria-pressed') === 'true'})'''
SAMPLE = '''ms => new Promise(resolve => { const out = [], begin = performance.now(), me = TK6.E.player(TK6.G), start = TK6.G.month;
  function frame(ts) { const e = document.querySelector('#ships .mine'), s = me.ships[0];
    out.push({at: ts, month: TK6.G.month, t: s.t, T: s.T, date: document.querySelector('.when b').textContent, x: parseFloat(e.style.left), y: parseFloat(e.style.top), track: document.querySelector('.track span').style.width, settle: document.querySelector('.settle').textContent});
    if (ts - begin < ms) requestAnimationFrame(frame); else resolve(out); } requestAnimationFrame(frame); })'''

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 720}, reduced_motion='reduce')
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + '?debug&title')
    pg.evaluate("localStorage.clear();localStorage.setItem('trade6.opening','1');localStorage.setItem('trade6.helper','off')")
    pg.reload(); pg.click('#title [data-t=play]'); pg.click('[data-start=oil]'); pg.click('[data-ok=open]')
    pg.evaluate("() => {const {G,E}=TK6;for(let i=0;i<3;i++){E.botTurn(G,'balanced');E.tick(G)} TK6.render()}")
    pg.click('[data-speed="1"]'); pg.wait_for_timeout(1300); pg.click('[data-speed="0"]')
    before = pg.evaluate(SNAP); ok(any(s['state'] == 'sea' for s in before['game']['nations'][0]['ships']), '항해 중인 배 없음')
    pg.reload(); pg.wait_for_selector('#title [data-t=resume]:visible')
    summary = pg.inner_text('#title .resume small')
    ok('석유 왕국' in summary and before['date'] in summary, f'이어하기 요약 {summary}')
    pg.click('#title [data-t=play]'); ok(pg.locator('.save-note').is_visible(), '새 게임 덮어쓰기 안내 없음')
    pg.click('[data-home]'); pg.click('#title [data-t=resume]'); pg.wait_for_selector('#title[hidden]', state='attached')
    after = pg.evaluate(SNAP)
    for key in ['game', 'date', 'ships']: ok(after[key] == before[key], f'복원 불일치 {key}')
    ok(after['paused'] and pg.locator('#coach[hidden]').count() == 1, '복원 시 일시정지·도우미 끄기')
    ok(not pg.evaluate('TradeTitle.playing'), '이어하기 영상 재생됨')
    pg.evaluate('document.activeElement.blur()'); pg.keyboard.press('Space'); pg.wait_for_timeout(100)
    ok(pg.locator('[data-speed="0"][aria-pressed=false]').count() == 1, '이어하기 뒤 Space 재생')
    pg.click('[data-speed="0"]')
    # 보류 창도 그대로 복원, 선택 뒤 계속 멈춤.
    for kind, selector in [('event', '[data-opt-event]'), ('meeting', '[data-card]')]:
        pg.evaluate('''kind => {const {G,E}=TK6;let guard=0;while(G.pending?.type!==kind && guard++<200){if(G.pending)E.choose(G,null);else E.tick(G)}TK6.render()}''', kind)
        pending = pg.evaluate('TK6.G.pending'); pg.reload(); pg.click('#title [data-t=resume]'); pg.wait_for_selector('#title[hidden]', state='attached')
        ok(pg.evaluate('TK6.G.pending') == pending and pg.locator(selector).count() > 0, f'{kind} 보류 창 복원')
        pg.locator('[data-card]' if kind == 'meeting' else '[data-opt-event="0"]').first.click()
        ok(pg.locator('[data-speed="0"][aria-pressed=true]').count() == 1, f'{kind} 선택 뒤 멈춤 유지')
    # 실제 종료 처리 → 저장 삭제, 새 나라 선택 → 교체.
    pg.evaluate("() => {const {G,E}=TK6;while(!G.over){E.botTurn(G,'balanced');E.tick(G)}TK6.render()}")
    ok(pg.evaluate("localStorage.getItem('trade6.save')") is None, '끝난 게임 저장이 남음')
    pg.click('[data-ok=again]'); pg.click('[data-start=forest]')
    ok(pg.evaluate("JSON.parse(localStorage.getItem('trade6.save')).game.nations[0].id") == 'forest', '새 게임 저장 안 됨')
    pg.goto(BASE + '?debug&title'); pg.click('#title [data-t=play]'); pg.click('[data-start=plains]')
    ok(pg.evaluate("JSON.parse(localStorage.getItem('trade6.save')).game.nations[0].id") == 'plains', '새 나라로 저장 교체 안 됨')
    # 축소 모션 + 속도/pace 조합. 같은 달 안에서 여러 날짜·여러 프레임 이동.
    for pace in ['slow', 'normal', 'fast']:
        for speed in [1, 2]:
            pg.goto(BASE + '?debug')
            pg.evaluate('''pace => {TradeTitle.set('pace',pace);TradeTitle.set('motion','less')}''', pace)
            pg.reload(); pg.evaluate("() => {TK6.start('oil');const {G,E}=TK6;while(G.pending)E.choose(G,null);G.plan=[];E.setRoute(G,0,{to:'world',give:null,get:0});E.tick(G);TK6.render()}")
            pg.click(f'[data-speed="{speed}"]'); samples = pg.evaluate(SAMPLE, 1500); pg.click('[data-speed="0"]')
            days = len(set(s['date'] for s in samples)); positions = len(set(s['x'] for s in samples))
            ok(samples[0]['month'] == samples[-1]['month'] and days >= 4, f'연속 날짜 {pace}/{speed}: {days}')
            ok(positions > len(samples) * .7, f'연속 배 위치 {pace}/{speed}: {positions}/{len(samples)}')
            ok(len(set(s['track'] for s in samples)) > 20 and len(set(s['settle'] for s in samples)) >= 4, f'진행 막대·정산 {pace}/{speed}')
            print(f'clock {pace}/{speed}: days={days}, positions={positions}/{len(samples)}')
    # 월 경계·회항·귀항·재출항을 포함한 4달 왕복. 프레임 사이 큰 점프 없음.
    pg.evaluate("() => {TK6.start('oil');const {G,E}=TK6;while(G.pending)E.choose(G,null);G.plan=[];E.setRoute(G,0,{to:'world',give:null,get:0});E.tick(G);TK6.render()}")
    pg.click('[data-speed="2"]'); samples = pg.evaluate(SAMPLE, 16500); pg.click('[data-speed="0"]')
    jumps = [((a['x']-z['x'])**2 + ((a['y']-z['y'])/2.72)**2)**.5 for a,z in zip(samples, samples[1:])]
    ok(max(jumps) < 2, f'월 경계·회항 점프 {max(jumps):.3f}')
    ok(any(a['t'] > z['t'] for a,z in zip(samples, samples[1:])), '귀항/재출항을 못 봄')
    print(f'roundtrip: frames={len(samples)}, max-step={max(jumps):.4f}')
    # 4크기 × 보통/아주 크게: 글 검사와 제목 요약 검사.
    for w,h in [(1024,768),(1280,720),(768,1024)]:
        for text in ['big','huge']:
            pg.set_viewport_size({'width':w,'height':h})
            pg.evaluate('text => TradeTitle.set("text",text)', text)
            pg.reload(); pg.evaluate("() => {TK6.start('oil');while(TK6.G.pending)TK6.E.choose(TK6.G,null);TK6.render();TradeTitle.hide()}"); pg.wait_for_selector('#title', state='hidden')
            for screen in ['board','title','pick']:
                if screen == 'title': pg.goto(BASE + '?debug&title'); pg.wait_for_timeout(400)
                if screen == 'pick': pg.click('#title [data-t=play]'); pg.wait_for_selector('#title[hidden]', state='attached')
                bad = {k:v for k,v in pg.evaluate(SCAN).items() if v}; ok(not bad, f'{w}x{h}/{text}/{screen}: {bad}')
                pg.screenshot(path=str(OUT / f'{w}-{h}-{text}-{screen}.png'))
    # 깨진 저장과 저장소 차단도 시작 화면을 막지 않음.
    pg.evaluate("localStorage.setItem('trade6.save','{bad')"); pg.goto(BASE + '?debug&title')
    ok(not pg.locator('#title [data-t=resume]').is_visible(), '깨진 저장의 이어하기 표시')
    pg.add_init_script("Storage.prototype.getItem=Storage.prototype.setItem=Storage.prototype.removeItem=()=>{throw new Error('blocked')}")
    pg.goto(BASE + '?debug&title'); pg.click('#title [data-t=play]'); pg.keyboard.press('Escape'); pg.wait_for_timeout(800)
    pg.evaluate("() => {TK6.start('oil');while(TK6.G.pending)TK6.E.choose(TK6.G,null);TK6.render();dispatchEvent(new Event('pagehide'))}")
    pg.close(); b.close()
print('errors', errors)
print(f'issues: {len(fails)}')
for f in fails: print('FAIL', f)
(OUT / 'results.json').write_text(json.dumps({'fails':fails,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
sys.exit(1 if fails or errors else 0)
