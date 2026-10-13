"""실행: python -u daon-city/tests/verify-browser.py — 실제 조작·저장·반응형·설명서 증거 검증."""
import json, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/daon-v2-check'
OUT.mkdir(parents=True,exist_ok=True)
BASE='http://127.0.0.1:8790'
KEY='daon-city-v2-game'
BOT=json.loads(subprocess.check_output(['node','-e',"const {plans,play}=require('./daon-city/tests/bots');process.stdout.write(JSON.stringify(play(plans['균형'])));"],cwd=ROOT,text=True,encoding='utf-8'))
errors=[]

def click(page,action,qual=''):
    page.locator(f'[data-action="{action}"]{qual}').first.click()

def start(page):
    page.goto(BASE+'/daon-city/')
    page.evaluate('() => window.GameAssets?.ready')
    page.evaluate("localStorage.setItem('daon-city-v2',JSON.stringify({endings:[],badges:[],tutorialSeen:true,sound:false}))")
    page.reload()
    page.evaluate("() => {const gauge=DaonEngine.gauges;DaonEngine.gauges=(s,d)=>{window.__state=s;return gauge(s,d)}}")
    click(page,'new');click(page,'start-build')

def state(page):return page.evaluate('JSON.parse(JSON.stringify(window.__state))')

def shot(page,name,guide=None):
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(OUT/(name+'.png')),full_page=True,animations='disabled')
    if guide:
        page.screenshot(path=str(ROOT/'guides/img'/('daon-'+guide+'.webp')),full_page=True,type='png',animations='disabled')
        # 설명서 사진은 실제 화면을 그대로 webp로 저장한다.
        from PIL import Image
        target=ROOT/'guides/img'/('daon-'+guide+'.webp')
        Image.open(target).convert('RGB').save(target,'WEBP',quality=88)

def layout(page):
    info=page.evaluate("""() => {
      const map=document.querySelector('.map-wrap .map'), warn=document.querySelector('.city-warnings');
      return {width:document.documentElement.scrollWidth,view:innerWidth,map:map?.getBoundingClientRect().toJSON(),warn:warn?.getBoundingClientRect().toJSON()};
    }""")
    assert info['width']<=info['view']+1,info
    if info['map']:assert info['map']['bottom']<=info['warn']['top']+1,info

def advance(page,capture=False):
    click(page,'advance')
    page.wait_for_selector('#layer .event',timeout=10000)
    if capture:shot(page,'era0-event','event0')
    while page.locator('#layer .event').count():
        old=page.locator('#layer .bubble').inner_text()
        click(page,'choose','[data-k="a"]')
        page.wait_for_function('old=>!document.querySelector("#layer .bubble")||document.querySelector("#layer .bubble").textContent!==old',arg=old)
    page.wait_for_selector('.hist')
    if capture:shot(page,'era0-history','hist')
    click(page,'hist-next')
    if page.locator('.screen-ending').count():return
    page.wait_for_selector('[data-action="start-build"]')
    click(page,'start-build')

with sync_playwright() as p:
    b=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    # 실제 버튼으로 7시대의 건설·증축·확장·사건·엔딩까지 진행한다.
    c=b.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce')
    page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));start(page)
    for d,expected in enumerate(BOT['states']):
        for action in expected['actions']:
            if action['type']=='expand':click(page,'expand');continue
            i=action['i']
            if action['type']=='upgrade':
                page.keyboard.press('Escape');page.locator(f'[data-tile="{i}"]').click();click(page,'pop-upgrade')
            else:
                bid=expected['tiles'][i]['b']
                industry=page.evaluate('id=>!!DAON_CITY.buildings[id].exp',bid)
                click(page,'tray',f'[data-tray="{"industry" if industry else "support"}"]')
                page.locator(f'[data-card="{bid}"]').click();page.locator(f'[data-tile="{i}"]').click()
        current=state(page)
        assert current==expected,('시대',d,current,expected)
        forecast=page.evaluate('DaonEngine.production(window.__state)')
        assert str(forecast['income']) in page.locator('.forecast').inner_text()
        layout(page)
        if d==0:shot(page,'era0-build','build')
        if d==3:
            click(page,'lens','[data-lens="env"]');shot(page,'environment','env');click(page,'lens','[data-lens="industry"]')
        advance(page,d==0)
        print(f'시대 {d+1}/7 통과',flush=True)
    page.wait_for_selector('.screen-ending')
    assert page.locator('.final-paper h2').inner_text()=='모두의 도시'
    assert page.locator('.mini-paper').count()==7
    shot(page,'ending','ending');click(page,'endings');shot(page,'album','dogam');click(page,'title');shot(page,'title','title')
    assert page.evaluate("JSON.parse(localStorage.getItem('daon-city-v2')).endings.includes('together')")
    # 신축 자금이 부족해도 더 저렴한 산업 전환은 가능하고 되돌릴 수 있다.
    fixture=BOT['states'][2]
    page.evaluate("s=>localStorage.setItem('daon-city-v2-game',JSON.stringify(s))",fixture)
    page.reload();click(page,'continue')
    tile=next(i for i,t in enumerate(fixture['tiles']) if t['b']=='textile')
    page.locator('[data-card="car"]').click();page.locator(f'[data-tile="{tile}"]').click();click(page,'pop-convert')
    assert page.evaluate(f"JSON.parse(localStorage.getItem('{KEY}')).tiles[{tile}].b")=='car'
    click(page,'undo');assert page.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")==fixture
    page.evaluate("localStorage.setItem('daon-city-v2-game',JSON.stringify({v:2,d:0,tiles:[]}))")
    page.reload();assert page.locator('[data-action="continue"]').count()==0
    c.close()
    # 작은 화면의 범위·미리보기·되돌리기·이전·저장 재개·옛 저장 보호.
    for w,h in [(1024,768),(768,1024),(390,844),(320,568)]:
        c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce')
        page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));start(page)
        before=state(page)
        page.locator('[data-card="textile"]').click()
        tile=page.locator('[data-tile="21"]')
        tile.hover();assert '배치 예상' in page.locator('.city-warnings').inner_text()
        tile.click();assert state(page)['tiles'][21]['b']=='textile'
        click(page,'undo');assert state(page)==before
        page.keyboard.press('Escape');page.locator('[data-tile="8"]').click();click(page,'pop-upgrade')
        assert state(page)['tiles'][8]['level']==2
        click(page,'undo');assert state(page)==before
        page.locator('[data-tile="8"]').click();click(page,'pop-move');page.locator('[data-tile="15"]').click()
        assert state(page)['tiles'][15]['b']=='house'
        click(page,'undo');assert state(page)==before
        click(page,'tray','[data-tray="support"]');page.locator('[data-card="school"]').click();page.locator('[data-tile="7"]').click()
        page.keyboard.press('Escape');click(page,'lens','[data-lens="people"]')
        assert page.locator('.lens-good').count()>0
        page.locator('[data-tile="7"]').click();assert page.locator('.in-range').count()>0
        pop=page.locator('.pop').bounding_box();assert pop['x']>=0 and pop['y']>=0 and pop['y']+pop['height']<=h+1
        click(page,'pop-close');page.evaluate('window.scrollTo(0,0)');layout(page);shot(page,f'build-{w}')
        saved=state(page);page.reload();click(page,'continue')
        assert page.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")==saved
        page.evaluate("localStorage.setItem('daon-city-v1-game','OLD-SAVE');localStorage.removeItem('daon-city-v2-game')")
        page.reload();assert page.locator('.legacy-note').count()==1;click(page,'new')
        assert page.evaluate("localStorage.getItem('daon-city-v1-game')")=='OLD-SAVE'
        # 중단된 사건에서 재개하고 기존 선택을 중복 적용하지 않는다.
        page.evaluate("() => {const s=DaonEngine.newGame();DaonEngine.advance(s);localStorage.setItem('daon-city-v2-game',JSON.stringify(s))}")
        page.reload();click(page,'continue');page.wait_for_selector('[data-action="choose"]');click(page,'choose','[data-k="a"]')
        page.wait_for_function("JSON.parse(localStorage.getItem('daon-city-v2-game')).records[0].choices.length===1")
        page.reload();click(page,'continue');page.wait_for_selector('[data-action="choose"]');click(page,'choose','[data-k="a"]');page.wait_for_selector('.hist')
        assert page.evaluate("JSON.parse(localStorage.getItem('daon-city-v2-game')).records[0].choices.length")==2
        print(f'화면 {w}×{h} 조작·저장 통과',flush=True)
        c.close()
    assert not errors,errors
    (OUT/'results.json').write_text(json.dumps({'errors':errors,'eras':7,'sizes':[1280,1024,768,390,320],'checks':['배치','저장','되돌리기','증축','이전','범위','미리보기','옛저장보호']},ensure_ascii=False,indent=2),encoding='utf-8')
    b.close()
print('PASS: 7시대 실제 버튼 완주 · 5크기 화면 · 배치·증축·이전·범위·되돌리기·저장·사건 재개',flush=True)
