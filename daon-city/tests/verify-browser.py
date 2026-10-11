"""실행: 번들 Python으로 이 파일 실행. 실제 UI·상태·엣지를 검증합니다."""
import json
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'output/playwright/python-packages'))
sys.path.insert(0, str(Path(__file__).resolve().parent / '.python-packages'))
from playwright.sync_api import sync_playwright
OUT = ROOT / 'daon-city/check-verify'
OUT.mkdir(exist_ok=True)
BASE = 'http://localhost:8790/daon-city/?debug=1'
SIZES = [(1366,768),(1280,800),(1024,768),(768,1024),(390,844)]
PLAN = [['port','textile','school'],['power','steel','school'],['car','univ','park','welfare'],['semi','elec','welfare','park'],['it','green','cleaner','semi'],['content','semi','park','cleaner'],['battery','it','welfare','park']]
RESULT = {'screens':[], 'flows':[], 'edges':[], 'errors':[], 'warnings':[]}


def click(page, action):
    selector=f'[data-action="{action}"]'
    modal=page.locator(f'#layer:not([hidden]) {selector}')
    (modal if modal.count() else page.locator(selector)).first.click()


def watch(page, label):
    page.on('pageerror', lambda e: RESULT['errors'].append({'case':label,'kind':'pageerror','message':str(e)}))
    page.on('console', lambda m: RESULT['errors'].append({'case':label,'kind':'console','message':m.text,'location':m.location}) if m.type == 'error' else None)
    page.on('requestfailed', lambda r: RESULT['warnings'].append({'case':label,'url':r.url,'failure':r.failure}))


def instrument(page):
    page.evaluate('''() => {
      const gauges=DaonEngine.gauges;
      DaonEngine.gauges=(s,d)=>{window.__verifyGame=s; return gauges(s,d)};
    }''')


def state(page):
    return page.evaluate('JSON.parse(JSON.stringify(window.__verifyGame))')


def numbers(page):
    result = page.evaluate('''() => {
      const s=window.__verifyGame, g=DaonEngine.gauges(s), errors=[];
      for (const k of ['econ','life','env','fair']) {
        const n=document.querySelector(`.gauges [data-g="${k}"] .g-num`);
        if (n && Number(n.textContent)!==g[k]) errors.push([k,n.textContent,g[k]]);
      }
      const values=[...document.querySelectorAll('.res-item b')].map(e=>Number(e.textContent));
      if (values.length && (values[0]!==s.money||values[1]!==s.tech)) errors.push(['resources',values,s.money,s.tech]);
      if (document.querySelector('.slots') && document.querySelectorAll('.slot:not(.used)').length!==DaonEngine.slotsLeft(s)) errors.push(['slots']);
      const score=document.querySelector('.hist-score b');
      if(score && score.textContent!==`${DaonEngine.historyScore(s)}/${DAON_CITY.eras.length}`) errors.push(['history-score']);
      return errors;
    }''')
    assert not result, result


def shot(page, size, stage):
    page.wait_for_timeout(180)
    page.evaluate('''async () => {
      await Promise.all([...document.querySelectorAll('.paint img')].map(i=>{i.loading='eager'; return i.decode().catch(()=>{})}));
    }''')
    metrics = page.evaluate('''() => {
      const visible=e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&!e.closest('[hidden],.debug')};
      const outside=[...document.querySelectorAll('.map-wrap .map,.tray-foot,.pop')].filter(e=>{
        const r=e.getBoundingClientRect();return visible(e)&&(r.left<0||r.right>innerWidth+1||r.bottom>innerHeight+1);
      }).map(e=>({cls:e.className,rect:e.getBoundingClientRect().toJSON()}));
      const small=[...document.querySelectorAll('button,.g-label,.c-name,.fx,.need,.c-lock,.c-new,.bdg p,.mini-mast,.badge')].filter(e=>visible(e)&&parseFloat(getComputedStyle(e).fontSize)<(e.tagName==='BUTTON'?20:18)).map(e=>({cls:e.className,size:getComputedStyle(e).fontSize,text:e.textContent}));
      const tiny=[...document.querySelectorAll('button,a.icon-btn')].filter(e=>visible(e)&&!e.disabled&&(e.getBoundingClientRect().width<44||e.getBoundingClientRect().height<44)).map(e=>e.className);
      const wrapped=[...document.querySelectorAll('.badge.boost,.g-num,.hist-me>b')].filter(visible).filter(e=>{
        const range=document.createRange();range.selectNodeContents(e);
        return new Set([...range.getClientRects()].map(r=>Math.round(r.top))).size>1;
      }).map(e=>({cls:e.className,text:e.textContent}));
      return {overflow:document.documentElement.scrollWidth>innerWidth+1,outside,small,tiny,wrapped,height:document.documentElement.scrollHeight,
        images:[...document.querySelectorAll('.paint')].filter(visible).map(e=>({loaded:e.classList.contains('loaded'),fallback:!!e.querySelector('.paint-fallback svg'),fit:e.querySelector('img')&&getComputedStyle(e.querySelector('img')).objectFit}))};
    }''')
    name=f'{size[0]}x{size[1]}-{stage}.png'
    page.screenshot(path=str(OUT/name),full_page=True,animations='disabled',style='.debug{visibility:hidden!important}')
    RESULT['screens'].append({'size':size,'stage':stage,'screenshot':name,**metrics})
    assert not metrics['overflow'], (name,'가로 넘침')
    assert not metrics['small'], (name,'작은 글씨',metrics['small'])
    assert not metrics['tiny'], (name,'작은 터치 영역',metrics['tiny'])
    assert not metrics['wrapped'], (name,'숫자·비교 문구 줄바꿈',metrics['wrapped'])
    if page.locator('.build').count():
        assert not metrics['outside'], (name,'화면 밖',metrics['outside'])
        if size[0]>=700:
            assert metrics['height']<=size[1], (name,'건설 화면 세로 스크롤')


def start(page, tutorial=False):
    instrument(page)
    click(page,'new')
    click(page,'start-build')
    page.wait_for_timeout(60)
    if page.locator('[data-action="tut-skip"]').count() and not tutorial:
        click(page,'tut-skip')


def choose_tile(page, building):
    return page.evaluate('''id => {
      const s=window.__verifyGame,E=DaonEngine,B=DAON_CITY.buildings;
      let best=-1,score=-Infinity;
      s.tiles.forEach((t,i)=>{
        if(!E.canPlace(s,id,i).ok)return;
        const ns=E.neighbors(i).map(j=>s.tiles[j].b);let v=0;
        if(B[id].factory)v+=(ns.includes('port')?5:0)+(ns.includes('road')?5:0)-(ns.includes('house')?3:0);
        if(id==='port'||id==='road')v+=ns.filter(n=>n&&B[n].factory).length*4+E.neighbors(i).filter(j=>!s.tiles[j].b&&E.buildable(s.tiles[j].x,s.tiles[j].y)).length;
        if(id==='park')v+=ns.reduce((a,n)=>a+(n?(B[n].pol||0):0),0)*3;
        if(['house','school','univ','welfare','market'].includes(id))v-=ns.filter(n=>n&&(B[n].pol||0)>=1).length*4;
        if((B[id].pol||0)>=2)v-=ns.filter(n=>n==='house').length*6;
        if(!B[id].coastal&&E.coastal(t.x,t.y))v-=2;
        v-=t.y*.01+t.x*.001;if(v>score){score=v;best=i}
      });return best;
    }''',building)


def place(page, building):
    tile=choose_tile(page,building)
    if tile<0:
        return False
    page.locator(f'[data-card="{building}"]').click()
    page.locator(f'.map-wrap [data-tile="{tile}"]').click()
    numbers(page)
    return True


def decade(page,size,d):
    before=state(page)
    page.locator('[data-action="advance"]').dblclick(delay=25)
    page.wait_for_selector('[data-action="choose"]')
    produced=state(page)
    assert produced['money']==before['money']+produced['last']['income'], '연타로 생산 중복'
    assert produced['tech']==before['tech']+produced['last']['techGain'], '연타로 기술 중복'
    events=[]
    while page.locator('[data-action="choose"]').count():
        ev=page.locator('.bubble').inner_text()
        events.append(ev)
        shot(page,size,f'd{d}-event{len(events)}')
        old=state(page)
        page.locator('[data-action="choose"][data-k="a"]').dblclick(delay=25)
        # 연타해도 선택이 한 번만 반영되어야 합니다.
        after=state(page)
        assert len(after['records'][d]['choices'])==len(old['records'][d]['choices'])+1
        numbers(page)
        page.wait_for_function('text=> !document.querySelector(".bubble") || document.querySelector(".bubble").textContent!==text',arg=ev)
        if page.locator('[data-action="hist-next"]').count():
            break
    page.wait_for_selector('[data-action="hist-next"]')
    shot(page,size,f'd{d}-history')
    numbers(page)
    click(page,'hist-next')
    page.wait_for_selector('.screen-ending' if d==6 else '.screen-paper')
    return events


def full_flow(browser,size):
    context=browser.new_context(viewport={'width':size[0],'height':size[1]},reduced_motion='reduce')
    context.add_init_script('''window.__tones=0;
      const start=OscillatorNode.prototype.start;
      OscillatorNode.prototype.start=function(...args){window.__tones++;return start.apply(this,args)};
    ''')
    page=context.new_page();watch(page,str(size))
    page.goto(BASE);shot(page,size,'title');instrument(page)
    click(page,'settings');shot(page,size,'settings')
    assert page.locator('[data-action="sound"]').last.get_attribute('aria-pressed')=='false'
    assert page.evaluate('window.__tones')==0
    click(page,'sound');assert page.locator('[data-action="sound"]').last.get_attribute('aria-pressed')=='true'
    assert page.evaluate('window.__tones')>0
    tones=page.evaluate('window.__tones')
    click(page,'sound');assert page.evaluate('window.__tones')==tones
    click(page,'close')
    click(page,'new');shot(page,size,'paper')
    click(page,'start-build')
    for step in range(3):
        shot(page,size,f'tutorial{step}');click(page,'tut-next')
    events=[]
    for d in range(7):
        if d:
            shot(page,size,f'd{d}-paper');click(page,'start-build')
        shot(page,size,f'd{d}-build')
        for building in PLAN[d]:
            place(page,building)
        numbers(page)
        shot(page,size,f'd{d}-placed')
        if d==0:
            saved=state(page)
            page.reload();instrument(page);click(page,'continue')
            assert state(page)==saved, '건설 중 저장·불러오기 불일치'
            click(page,'menu');shot(page,size,'menu');click(page,'to-title')
            shot(page,size,'continue-title');click(page,'continue');assert state(page)==saved
        events+=decade(page,size,d)
    shot(page,size,'ending');numbers(page)
    assert page.locator('.mini-paper').count()==7
    result={'size':size,'ending':page.locator('.final-paper h2').inner_text(),'events':events,'state':state(page)}
    click(page,'endings');shot(page,size,'album')
    assert page.locator('.end-card').count()==6
    click(page,'title');click(page,'settings');shot(page,size,'settings-after')
    click(page,'close');click(page,'new');page.wait_for_selector('.screen-paper')
    RESULT['flows'].append(result)
    print(f'FLOW {size}: {result["ending"]}, {len(events)} events',flush=True)
    context.close()


def edge_checks(browser):
    context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    page=context.new_page();watch(page,'edges');page.goto(BASE);start(page)
    # 건물 선택·설치 후 초점 유지, 방향키·Enter·Esc.
    page.locator('[data-card="school"]').focus();page.keyboard.press('Enter')
    assert page.evaluate('document.activeElement.dataset.card')=='school'
    page.locator('[data-tile="2"]').focus();page.keyboard.press('ArrowRight')
    assert page.evaluate('document.activeElement.dataset.tile')=='3'
    page.keyboard.press('Enter');assert state(page)['tiles'][3]['b']=='school'
    assert page.evaluate('document.activeElement.dataset.tile')=='3'
    page.keyboard.press('Escape');assert not page.locator('.card.sel').count()
    click(page,'menu');page.wait_for_timeout(80)
    page.locator('[data-action="to-title"]').focus();page.keyboard.press('Tab')
    assert page.evaluate('document.activeElement.dataset.action')=='close'
    page.keyboard.press('Shift+Tab');assert page.evaluate('document.activeElement.dataset.action')=='to-title'
    page.keyboard.press('Escape');assert page.locator('#layer').is_hidden()
    assert page.evaluate('document.activeElement.dataset.action')=='menu'
    RESULT['edges'].append('키보드 Enter·방향키·Esc·Tab, 모달 초점 순환·메뉴 버튼으로 복귀')
    # 빠른 설치, 되돌리기, 철거 연타.
    click(page,'undo');place(page,'house');before=state(page)
    click(page,'undo');assert state(page)['money']==before['money']+2
    page.locator('[data-tile="8"]').click();shot(page,(390,844),'demolish-pop')
    old=state(page);page.locator('[data-action="pop-demolish"]').dblclick(delay=10)
    after=state(page);assert after['money']==old['money']-1 and after['tiles'][8]['b'] is None
    RESULT['edges'].append('건설·되돌리기·철거와 빠른 연타의 중복 반영 방지')
    # 발전소 되돌리기 실패 안내(예전에는 reasonHtml에서 예외).
    page.evaluate('''() => {
      const s=window.__verifyGame; s.d=1;s.money=100;s.tech=10;
      DaonEngine.place(s,'power',2);DaonEngine.place(s,'steel',4);
    }''')
    click(page,'dbg-money');page.locator('[data-tile="2"]').click();click(page,'pop-undo')
    assert state(page)['tiles'][2]['b']=='power'
    assert page.locator('.toast').inner_text().strip()=='필요'
    RESULT['edges'].append('다른 건물에 필요한 발전소 되돌리기 차단 안내 정상')
    # 사건 선택 전에 새로고침, 선택 후 새로고침: 생산·효과 중복 없음.
    click(page,'menu');click(page,'to-title');click(page,'new');click(page,'start-build')
    click(page,'advance');page.wait_for_selector('[data-action="choose"]');saved=state(page)
    page.reload();instrument(page);click(page,'continue');page.wait_for_selector('[data-action="choose"]')
    assert state(page)==saved
    page.locator('[data-action="choose"][data-k="a"]').click();saved=state(page)
    page.reload();instrument(page);click(page,'continue');page.wait_for_selector('[data-action="choose"]')
    assert state(page)==saved and len(saved['records'][0]['choices'])==1
    page.locator('[data-action="choose"][data-k="b"]').click();saved=state(page)
    page.reload();instrument(page);click(page,'continue');page.wait_for_selector('[data-action="hist-next"]')
    assert state(page)==saved and len(saved['records'][0]['choices'])==2
    numbers(page);click(page,'hist-next');click(page,'start-build')
    RESULT['edges'].append('생산 직후·문제 선택 후·시대 선택 후 새로고침: 상태 동일·중복 생산/효과 없음')
    # 마우스 드래그.
    page.locator('[data-card="house"]').scroll_into_view_if_needed()
    source=page.locator('[data-card="house"]').bounding_box();target=page.locator('[data-tile="3"]').bounding_box()
    page.mouse.move(source['x']+source['width']/2,source['y']+source['height']/2);page.mouse.down()
    page.mouse.move(target['x']+target['width']/2,target['y']+target['height']/2,steps=10);page.mouse.up()
    assert state(page)['tiles'][3]['b']=='house'
    RESULT['edges'].append('마우스 끌어 놓기')
    context.close()
    # 실제 터치 입력: 카드 가로 스크롤과 지도까지 세로 끌어 놓기.
    context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce')
    page=context.new_page();watch(page,'touch');page.goto(BASE);start(page)
    session=context.new_cdp_session(page)
    def touch(kind,x=0,y=0):
        session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':x,'y':y}]})
    card=page.locator('[data-card="house"]').bounding_box()
    x=card['x']+card['width']/2;y=card['y']+card['height']/2
    before=state(page)
    touch('touchStart',x,y)
    for offset in [20,40,60]:
        touch('touchMove',x-offset,y);page.wait_for_timeout(25)
    touch('touchEnd')
    assert page.locator('.cards').evaluate('e=>e.scrollLeft')>0
    assert state(page)==before
    page.locator('.cards').evaluate('e=>e.scrollLeft=0');page.wait_for_timeout(100)
    card=page.locator('[data-card="house"]').bounding_box();tile=page.locator('[data-tile="2"]').bounding_box()
    x=card['x']+card['width']/2;y=card['y']+card['height']/2
    tx=tile['x']+tile['width']/2;ty=tile['y']+tile['height']/2
    touch('touchStart',x,y)
    for step in range(1,11):
        touch('touchMove',x+(tx-x)*step/10,y+(ty-y)*step/10);page.wait_for_timeout(25)
    touch('touchEnd');page.wait_for_timeout(100)
    assert state(page)['tiles'][2]['b']=='house'
    assert len(state(page)['placed'])==1
    shot(page,(390,844),'touch-build')
    RESULT['edges'].append('실제 터치: 카드 가로 스크롤은 건설 없음·세로 끌어 놓기는 한 번 건설')
    context.close()
    # localStorage 접근 자체를 차단해도 전체 엔딩 흐름이 완료되어야 함.
    context=browser.new_context(viewport={'width':1024,'height':768},reduced_motion='reduce')
    context.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})")
    page=context.new_page();watch(page,'storage-blocked');page.goto(BASE);start(page)
    for d in range(7):
        if d: click(page,'start-build')
        decade(page,(1024,768),d)
    assert page.locator('.screen-ending').count()
    click(page,'endings');click(page,'title');click(page,'settings');click(page,'sound');click(page,'close')
    RESULT['edges'].append('localStorage 완전 차단: 시작·7턴·엔딩·도감·설정 정상')
    context.close()
    # 파일 URL과 오프라인 SVG 대체.
    context=browser.new_context(viewport={'width':768,'height':1024},reduced_motion='reduce')
    page=context.new_page();watch(page,'file');page.goto((ROOT/'daon-city/index.html').as_uri()+'?debug=1');start(page)
    place(page,'school');saved=state(page);page.reload();instrument(page);click(page,'continue');assert state(page)==saved
    click(page,'dbg-bot');page.wait_for_selector('.screen-ending');shot(page,(768,1024),'file-ending')
    click(page,'endings');click(page,'title');click(page,'settings');click(page,'sound');click(page,'close')
    RESULT['edges'].append('file:// 시작·건설·저장·이어하기·디버그 엔딩·도감·설정')
    context.close()
    # HTTP 실패로 console error를 만들지 않고, 그림 디코드 실패를 재현.
    context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    context.route('**/shared-art/**/*.webp',lambda route:route.fulfill(status=200,content_type='image/webp',body=b'broken-image'))
    page=context.new_page();watch(page,'fallback');page.goto(BASE);instrument(page);click(page,'new')
    shot(page,(390,844),'fallback-paper');assert page.locator('.paper-map .paint-fallback svg').count()>0
    click(page,'start-build');click(page,'tut-skip');click(page,'advance');page.wait_for_selector('[data-action="choose"]')
    shot(page,(390,844),'fallback-event');assert page.locator('.ev-portrait .paint-fallback svg').count()==1
    # 페이지 이동으로 대기 중인 턴을 중단하고 독립적인 디버그 봇 검사.
    page.goto(BASE);click(page,'dbg-bot');page.wait_for_selector('.screen-ending');shot(page,(390,844),'fallback-ending')
    assert page.locator('.final-map .paint-fallback .map').count()==1
    RESULT['edges'].append('그림 디코드 실패: 신문·사건 인물·최종 지도 SVG 대체')
    context.close()


def all_endings(browser):
    # 엔진의 판정은 내부 gauges를 쓰므로 최종 지도·보너스를 테스트 상태로 만듭니다.
    fixtures={'together':[5,80,80,80],'gray':[5,70,30,60],'unfair':[4,70,50,30],'green':[2,80,80,60],'stuck':[2,40,30,50],'grown':[3,55,50,50]}
    for size in SIZES:
        context=browser.new_context(viewport={'width':size[0],'height':size[1]},reduced_motion='reduce')
        page=context.new_page();watch(page,f'endings-{size}');page.goto(BASE)
        instrument(page)
        for eid, values in fixtures.items():
            page.evaluate('''values=>{
              window.__baseEnding ||= DaonEngine.ending;
              DaonEngine.ending=s=>{
                s.tiles.forEach(t=>{t.b=null;t.at=-1});
                s.tiles[14].b='power';
                [2,3,4,5,7].slice(0,values[0]).forEach(i=>s.tiles[i].b='semi');
                s.bonus={life:0,env:0,fair:0};
                const g=DaonEngine.gauges(s);
                ['life','env','fair'].forEach((k,i)=>s.bonus[k]=values[i+1]-g[k]);
                return window.__baseEnding(s);
              };
            }''',values)
            click(page,'new');click(page,'dbg-bot');page.wait_for_selector('.screen-ending')
            expected=page.evaluate('id=>DAON_CITY.endings.find(e=>e.id===id).name',eid)
            assert page.locator('.final-paper h2').inner_text()==expected, (size,eid,page.locator('.final-paper h2').inner_text(),expected)
            shot(page,size,'ending-'+eid);numbers(page)
            click(page,'endings');shot(page,size,'album-'+eid);click(page,'title')
        progress=page.evaluate('JSON.parse(localStorage.getItem("daon-city-v1"))')
        assert len(progress['endings'])==6 and 'allEndings' in progress['badges']
        RESULT['edges'].append(f'{size}: 실제 판정 함수로 엔딩 6개·도감 6/6·전체 배지')
        context.close()


def main():
    parser=argparse.ArgumentParser(description='다온시 전체 검증 또는 중단 구간 재검증')
    parser.add_argument('--stage',choices=['all','flows','edges','endings'],default='all')
    parser.add_argument('--width',type=int,choices=[s[0] for s in SIZES])
    args=parser.parse_args()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
        try:
            if args.stage in ['all','flows']:
                for size in SIZES:
                    if args.width is None or size[0]==args.width:
                        full_flow(browser,size)
            if args.stage in ['all','edges']:
                edge_checks(browser)
            if args.stage in ['all','endings']:
                all_endings(browser)
            assert not RESULT['errors'], RESULT['errors']
        finally:
            OUT.joinpath('results.json' if args.stage=='all' else f'{args.stage}-results.json').write_text(json.dumps(RESULT,ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
    print(f'PASS: {len(RESULT["screens"])} screenshots, {len(RESULT["flows"])} flows, {len(RESULT["edges"])} edge checks, {len(RESULT["errors"])} errors',flush=True)


if __name__=='__main__':
    main()
