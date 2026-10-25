# 7.6 규칙 단계: 실제 계약·날짜·소리·저장·도착 결과 연결 검사.
import io, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/index.html')
OUT = Path('output/balance76'); OUT.mkdir(parents=True, exist_ok=True)
fails, errors = [], []
def ok(c, text):
    if not c: fails.append(text)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1366, 'height': 768})
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + '?debug'); pg.evaluate("localStorage.clear();localStorage.setItem('trade6.helper','off')"); pg.reload()
    pg.click('[data-start=daon]'); pg.click('[data-ok=open]')
    target = pg.evaluate('''() => { const {G,E}=TK6, n=E.player(G); G.plan=[];G.small.next=1e9;for(const o of G.nations.slice(1))G.rel[n.id][o.id]=G.rel[o.id][n.id]=1; G.nations.slice(1).forEach(n=>n.ships.forEach(s=>{s.route=null;s.state='port';s.cargo=null;s.repair=999}));
      E.advance(G,14); const o=G.nations.slice(1).find(o=>E.isDump(G,o,3)); n.box[3]=[0,0,0,8];o.money=9999;TK6.render();return o.id; }''')
    pg.click(f'.isle[data-drop="{target}"]')
    ok('헐값' not in pg.inner_text('.dockpanel'), '다 보기 전 헐값이 보임')
    pg.click('[data-more]'); ok('헐값' in pg.inner_text('.dockpanel .step.dump') and '2상자까지' in pg.inner_text('.dockpanel .step.dump'), '헐값·두 상자 안내 없음')   # 7.6b 헐값 칩 + 안내 줄
    # 추천 짐을 비우고 헐값 첨단기기 3상자를 직접 선택한다.
    pg.evaluate('''() => { let q; while((q=document.querySelector('[data-step][data-d="-1"]:not(:disabled)')))q.click(); }''')
    for _ in range(3): pg.click('[data-step=give][data-g="3"][data-d="1"]')
    pg.click('[data-sign]')
    snap = pg.evaluate('''() => {const s=TK6.E.player(TK6.G).ships[0];return {day:TK6.G.day, month:TK6.G.month,t:s.t,T:s.T,state:s.state,ids:TK6.audio.log.map(x=>x.id),date:document.querySelector('.when b').textContent}}''')
    ok(snap['day'] == 15 and snap['month'] == 0 and snap['t'] == 0 and snap['state'] == 'sea', f'당일 출항 {snap}')
    ok('depart' in snap['ids'] and '1월 15일' in snap['date'], '당일 소리·날짜 불일치')
    pg.screenshot(path=str(OUT / 'contract-day.png'))
    pg.click('[data-speed="1"]'); pg.wait_for_timeout(900); pg.click('[data-speed="0"]')
    before = pg.evaluate('JSON.parse(localStorage.getItem("trade6.save"))')
    pg.goto(BASE + '?debug&title'); pg.click('#title [data-t=resume]')
    after = pg.evaluate('JSON.parse(localStorage.getItem("trade6.save"))')
    ok(before == after, '월중 화면 저장 복원 불일치')
    pg.evaluate('''() => {const {G,E}=TK6,s=E.player(G).ships[0];s.breaking=true;E.advance(G,s.T-s.t);TK6.render();}''')
    pg.click('.piece[data-ship="0"]'); pg.click('[data-report="0"]')
    ok(pg.evaluate("() => [...document.querySelectorAll('#layer .receipt-goods.sold > span')].some(s => s.innerText.includes('첨단기기') && s.querySelector('b').textContent === '2')"), '헐값 실제 판매량 없음')   # 7.6b 판 물건은 상자 칩
    pg.screenshot(path=str(OUT / 'dump-result.png')); pg.click('[data-close-report]')
    # 부족분 위약금을 실제 도착 창에서 표시.
    pg.evaluate('''() => {TK6.start('daon');const {G,E}=TK6,n=E.player(G);while(G.pending)E.choose(G,null);G.plan=[];G.small.next=1e9;for(const o of G.nations.slice(1))G.rel[n.id][o.id]=G.rel[o.id][n.id]=1;G.nations.slice(1).forEach(n=>n.ships.forEach(s=>{s.route=null;s.state='port';s.cargo=null;s.repair=999}));
      const o=G.nations.slice(1).find(o=>E.sells(G,o,0));n.money=9999;o.box[0]=[0,0,1,0];E.setRoute(G,0,{to:o.id,give:null,get:[4,0,0,0,0,0]});
      const s=n.ships[0];s.breaking=true;E.advance(G,s.T);TK6.render();}''')
    pg.click('.piece[data-ship="0"]'); pg.click('[data-report="0"]')
    ok('위약금' in pg.inner_text('#layer'), '도착 결과 위약금 없음')
    pg.screenshot(path=str(OUT / 'penalty-result.png'))
    # 옛 저장은 이어하기를 표시하지 않는다.
    pg.goto(BASE + '?debug&title')
    pg.evaluate('''() => {const s=JSON.parse(localStorage.getItem('trade6.save'));s.game.saveVersion=1;localStorage.setItem('trade6.save',JSON.stringify(s));}''')
    pg.reload(); ok(not pg.locator('#title [data-t=resume]').is_visible(), '옛 저장 이어하기 표시')
    # 한 프레임이 이틀 분량이어도 월초 사건에서 멈추며 유효한 저장을 남긴다.
    pg.goto(BASE + '?debug')
    pg.evaluate('''() => {TK6.start('oil');const {G,E}=TK6;while(G.pending)E.choose(G,null);G.day=31;G.plan=[{id:'expo',month:1}];TradeTitle.set('pace','fast');TK6.render();}''')
    pg.click('[data-speed="2"]')
    pg.evaluate('''() => {const end=performance.now()+280;while(performance.now()<end){};}''')
    pg.wait_for_timeout(350)
    edge = pg.evaluate('''() => {const s=JSON.parse(localStorage.getItem('trade6.save'));return {day:TK6.G.day,month:TK6.G.month,pending:TK6.G.pending?.type,acc:s.acc,valid:!!TK6.E.loadGame(s.game)};}''')
    ok(edge == {'day':1,'month':1,'pending':'event','acc':0,'valid':True}, f'월초 멈춤 저장 {edge}')
    b.close()
print('errors', errors); print(f'issues: {len(fails)}')
for f in fails: print('FAIL', f)
sys.exit(1 if fails or errors else 0)


