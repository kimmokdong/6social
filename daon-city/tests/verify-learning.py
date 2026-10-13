"""실행: python -u daon-city/tests/verify-learning.py — 초보 안내와 연습 도시의 저장 분리 검증."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/daon-learning-check';OUT.mkdir(exist_ok=True)
BASE='http://127.0.0.1:8790/daon-city/'
errors=[]

def click(p,action):
    selector=f'[data-action="{action}"]'
    modal=p.locator(f'#layer:not([hidden]) {selector}')
    (modal if modal.count() else p.locator(selector)).first.click()
def shot(p,name):
    if p.locator('.pop').count():p.locator('.pop').screenshot(path=str(OUT/(name+'.png')),animations='disabled')
    elif p.locator('#layer:not([hidden]) .sheet').count():p.locator('#layer .sheet').screenshot(path=str(OUT/(name+'.png')),animations='disabled')
    else:p.screenshot(path=str(OUT/(name+'.png')),full_page=True,animations='disabled')
def stores(p):return p.evaluate("Object.fromEntries(['daon-city-v2-game','daon-city-v2','daon-city-v1-game'].map(k=>[k,localStorage.getItem(k)]))")
def feedback(p):p.wait_for_selector('.practice-feedback');click(p,'practice-next')

with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    for w,h in [(1280,800),(1024,768),(768,1024),(390,844),(320,568)]:
        p=b.new_page(viewport={'width':w,'height':h},reduced_motion='reduce');p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);p.evaluate('()=>GameAssets.ready')
        # 실제 저장과 도감이 있는 상황에서 연습해도 기록은 바뀌지 않는다.
        p.evaluate("""() => {
          const s=DaonEngine.newGame();DaonEngine.place(s,'textile',21);DaonEngine.place(s,'school',7);DaonEngine.upgrade(s,8);DaonEngine.upgrade(s,9);DaonEngine.advance(s);DaonEngine.nextDecade(s);
          localStorage.setItem('daon-city-v2-game',JSON.stringify(s));localStorage.setItem('daon-city-v2',JSON.stringify({endings:['tech'],badges:['history'],tutorialSeen:true,sound:false}));localStorage.setItem('daon-city-v1-game','옛 기록');
        }""");p.reload();before=stores(p);click(p,'continue')
        assert '도시 돈' in p.locator('.money-res').inner_text()
        small=p.locator('.city-v2').evaluate("""el=>[...el.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.checkVisibility()&&[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())&&parseFloat(getComputedStyle(n).fontSize)<18).map(n=>({text:n.textContent,size:getComputedStyle(n).fontSize}))""")
        assert not small,small
        assert '사용' in p.locator('[data-action="expand"]').inner_text() and '12칸 → 20칸' in p.locator('[data-action="expand"]').inner_text()
        for key in ['people','tech','power','money','econ','life','env','fair']:
            p.locator(f'[data-action="help"][data-help="{key}"]').first.click();p.wait_for_selector('.help-clear')
            assert p.locator('.help-advice').count()==1
            if key=='people':
                text=p.locator('.help-clear').inner_text();assert '4명' in text and '2명' in text and '충분해요' in text
            if key=='tech':assert '없어도 운영' in p.locator('.help-status').inner_text()
            if w in [1280,390] and key in ['people','tech','money']:shot(p,f'help-{key}-{w}')
            click(p,'close')
        p.locator('[data-tile="8"]').click();assert '최대 크기' in p.locator('.pop').inner_text();assert '도시 돈 2 사용' in p.locator('[data-action="pop-move"]').inner_text();assert '도시 돈 1 사용' in p.locator('[data-action="pop-demolish"]').inner_text();shot(p,f'house-pop-{w}');click(p,'pop-close')
        click(p,'menu');click(p,'practice')
        if w>=h:
            assert p.locator('.tray-foot').bounding_box()['y']+p.locator('.tray-foot').bounding_box()['height']<=h+1
        assert stores(p)==before
        assert p.locator('.practice-numbers').count()==1 and '18' in p.locator('.practice-numbers').inner_text()
        small=p.locator('.city-v2').evaluate("""el=>[...el.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.checkVisibility()&&[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())&&parseFloat(getComputedStyle(n).fontSize)<18).map(n=>({text:n.textContent,size:getComputedStyle(n).fontSize}))""")
        assert not small,small
        assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        if w>=h:
            rect=p.locator('.card').bounding_box();foot=p.locator('.tray-foot').bounding_box()
            assert rect['y']+rect['height']<=foot['y']+1,(rect,foot)
        shot(p,f'practice-numbers-{w}')
        # 다른 땅을 누르거나 다음 시대를 먼저 보낼 수 없다.
        assert p.locator('[data-action="advance"]').is_disabled()
        p.locator('[data-card="textile"]').click();p.locator('[data-tile="14"]').click();assert not p.locator('.practice-feedback').count()
        p.locator('[data-tile="21"]').click();assert '18 → 15' in p.locator('.practice-feedback').inner_text();assert stores(p)==before
        # 설명을 닫아도 다음 연습 버튼이 남아 막히지 않는다.
        p.keyboard.press('Escape');assert p.locator('.practice-panel [data-action="practice-next"]').count()==1;click(p,'practice-next')
        p.locator('[data-card="school"]').click();p.locator('[data-tile="7"]').click();feedback(p)
        p.locator('[data-tile="8"]').click();assert '2명 → 4명' in p.locator('[data-action="pop-upgrade"]').inner_text();assert '도시 돈 2 사용' in p.locator('[data-action="pop-upgrade"]').inner_text();shot(p,f'upgrade-{w}');click(p,'pop-upgrade');feedback(p)
        click(p,'advance');assert '기술을 배운 사람 2명' in p.locator('.practice-feedback').inner_text();feedback(p)
        p.locator('[data-card="steel"]').click()
        if w>=h:
            rect=p.locator('.tray-foot').bounding_box();assert rect['y']+rect['height']<=h+1
        p.locator('[data-tile="22"]').click();assert '50%' in p.locator('.practice-feedback').inner_text();feedback(p)
        p.locator('[data-card="power"]').click();p.locator('[data-tile="28"]').click();assert '100%' in p.locator('.practice-feedback').inner_text();feedback(p)
        assert p.locator('.tile-alert').count()==1;shot(p,f'practice-pollution-{w}')
        p.locator('[data-tile="22"]').click();click(p,'pop-move');p.locator('[data-tile="30"]').click();assert '1곳 → 0곳' in p.locator('.practice-feedback').inner_text();feedback(p)
        click(p,'expand');assert '12칸 → 20칸' in p.locator('.practice-feedback').inner_text();assert '5는 비용' in p.locator('.practice-feedback').inner_text();feedback(p)
        assert p.locator('.practice-complete').count()==1;assert stores(p)==before
        click(p,'practice-finish');assert p.locator('.practice-city').count()==0;assert stores(p)==before
        # 중도 종료도 저장을 건드리지 않는다.
        click(p,'menu');click(p,'practice');click(p,'practice-exit');assert stores(p)==before
        # 모바일에서 내용이 가로로 넘치지 않는다.
        assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        print(f'PASS: {w}×{h} 도움말·비용과 효과·8단계 연습·저장 보존',flush=True);p.close()
    # 새 사용자의 시작 안내와 연습 뒤 본 게임 시작.
    p=b.new_page(viewport={'width':1280,'height':800},reduced_motion='reduce');p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);click(p,'new');click(p,'start-build');assert p.locator('.welcome').count()==1;click(p,'tut-skip');assert p.locator('.welcome').count()==0
    click(p,'menu');click(p,'practice');click(p,'practice-exit');assert p.locator('[data-action="continue"]').count()==1
    # 저장이 없는 사용자가 연습을 끝내면 연습 도시 대신 새 본 게임을 만든다.
    p=b.new_page(viewport={'width':1280,'height':800},reduced_motion='reduce');p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);click(p,'practice')
    for card,tile in [('textile',21),('school',7)]:
        p.locator(f'[data-card="{card}"]').click();p.locator(f'[data-tile="{tile}"]').click();feedback(p)
    p.locator('[data-tile="8"]').click();click(p,'pop-upgrade');feedback(p);click(p,'advance');feedback(p)
    for card,tile in [('steel',22),('power',28)]:
        p.locator(f'[data-card="{card}"]').click();p.locator(f'[data-tile="{tile}"]').click();feedback(p)
    p.locator('[data-tile="22"]').click();click(p,'pop-move');p.locator('[data-tile="30"]').click();feedback(p);click(p,'expand');feedback(p)
    assert stores(p)['daon-city-v2-game'] is None
    click(p,'practice-finish');saved=json.loads(stores(p)['daon-city-v2-game'])
    assert saved['d']==0 and saved['money']==18 and saved['tech']==0 and saved['land']==0 and not saved['records']
    assert [t['b'] for t in saved['tiles'] if t['b']]==['house','house']
    assert json.loads(stores(p)['daon-city-v2'])['endings']==[]
    print('PASS: 새 사용자의 연습 완료 → 원래 예산의 본 게임 시작',flush=True)
    assert not errors,errors
    (OUT/'results.json').write_text(json.dumps({'errors':errors,'sizes':[1280,1024,768,390,320],'steps':8,'saveProtection':True,'exitProtection':True,'costAndEffect':True},ensure_ascii=False,indent=2),encoding='utf-8')
    b.close()
