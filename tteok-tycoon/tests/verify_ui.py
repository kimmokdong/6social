"""VERIFY.md의 실제 화면·저장·입력 검증. 기존 Playwright 설치를 재사용한다."""
import json
import atexit
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT / 'output/playwright/python-packages'))
from playwright.sync_api import sync_playwright

OUT = ROOT / 'tteok-tycoon/check-verify'
OUT.mkdir(exist_ok=True)
URL = os.environ.get('TTEOK_VERIFY_URL', 'http://localhost:8790/tteok-tycoon/?debug=1')
RESULT = {'flows': [], 'edges': [], 'endings': [], 'errors': [], 'requests': [], 'layout': []}
atexit.register(lambda: (OUT/'ui-results.json').write_text(json.dumps(RESULT,ensure_ascii=False,indent=2),encoding='utf-8'))
before = OUT/'ui-results.json'
if before.exists() and not (OUT/'ui-results-before.json').exists():
    (OUT/'ui-results-before.json').write_bytes(before.read_bytes())


def watch(page):
    page.on('pageerror', lambda e: RESULT['errors'].append(str(e)))
    page.on('console', lambda m: RESULT['errors'].append(m.text) if m.type == 'error' else None)
    page.on('requestfailed', lambda r: RESULT['requests'].append({'url': r.url, 'reason': r.failure}))
    page.on('response', lambda r: RESULT['requests'].append({'url': r.url, 'status': r.status}) if r.status >= 400 else None)
    page.set_default_timeout(10000)


def shot(page, name):
    page.evaluate("async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))}")
    page.evaluate("for(const a of document.getAnimations())if(a.effect.getTiming().iterations!==Infinity)a.finish()")
    page.screenshot(path=str(OUT / (name + '.png')), full_page=True)
    info = page.evaluate("""() => ({overflow:document.documentElement.scrollWidth>innerWidth+1,
      small:[...document.querySelectorAll('button,p,.up-fx,.goal,.mini-mast,.t-step i,.t-step em,.bar-col em,.bubble-s')]
        .filter(e=>e.getBoundingClientRect().height && !e.closest('.debug'))
        .filter(e=>parseFloat(getComputedStyle(e).fontSize)<(e.tagName==='BUTTON'?20:18))
        .map(e=>({text:e.textContent,size:getComputedStyle(e).fontSize})),
      touch:[...document.querySelectorAll('button,a')].filter(e=>!e.closest('.debug') && e.getBoundingClientRect().height)
        .filter(e=>e.getBoundingClientRect().height<44||e.getBoundingClientRect().width<44).map(e=>e.textContent)})""")
    RESULT['layout'].append({'name': name, **info})
    assert not info['overflow'], (name, '가로 넘침')
    assert not info['small'] and not info['touch'], (name, info)


def dismiss(page, prefix=None):
    for i in range(30):
        if page.locator('#layer').is_hidden():
            return
        if page.locator('#layer .choices button:not(:disabled)').count():
            page.wait_for_timeout(100)
            page.keyboard.press('Tab')
            assert page.evaluate("!!document.activeElement.closest('#layer')")
        if prefix and i == 0:
            shot(page, prefix)
        for action in ['tnext', 'ok', 'choose']:
            loc = page.locator(f'#layer [data-action="{action}"]:not(:disabled)')
            if loc.count():
                loc.first.click()
                break
        page.wait_for_timeout(160)
    raise AssertionError('레이어가 끝나지 않음')


def instrument(page):
    page.evaluate("""() => {for(const n of ['morningEvents','choose','chooseNode','simulate','endDay']) {
      const f=TteokEngine[n];TteokEngine[n]=(...args)=>{const r=f(...args);window.__state=args[0];
      window.__calls=window.__calls||{};window.__calls[n]=(window.__calls[n]||0)+1;return r;};}}""")


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('tteok-tycoon-v2-game'))")


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    for w, h in [(1366,768),(1280,800),(1024,768),(768,1024),(390,844)]:
        page = browser.new_page(viewport={'width':w,'height':h}, reduced_motion='reduce')
        watch(page)
        page.goto(URL)
        # 외부 폰트까지 기다린 다음 캡처한다.
        page.evaluate('document.fonts.ready')
        instrument(page)
        size = f'{w}x{h}'
        shot(page, size+'-title')
        page.locator('[data-action="new"]').click()
        dismiss(page, size+'-tutorial')
        shot(page, size+'-morning')
        page.locator('[data-action="price-up"]').click()
        visible_price = page.locator('.val').first.inner_text()
        stored_price = saved(page)['plan']['price']
        RESULT['edges'].append({'size':size,'case':'plan-save','display':visible_price,'saved':stored_price})
        assert stored_price == 3500
        snapshot = saved(page)
        page.reload()
        instrument(page)
        page.locator('[data-action="continue"]').click()
        dismiss(page)
        assert saved(page) == snapshot, '아침 이어하기 상태가 달라짐'
        page.locator('[data-action="price-down"]').click()
        events = 0
        for day in range(10):
            dismiss(page)
            if page.locator('.ending-page').count():
                break
            # 하루 두 번 열리지 않아야 한다.
            page.locator('[data-action="open"]').evaluate('(b)=>{b.click();b.click()}')
            if day == 0:
                page.wait_for_timeout(900)
                shot(page, size+'-street')
            page.locator('[data-action="skip"]').click()
            page.wait_for_selector('.evening')
            page.wait_for_timeout(160)
            if not page.locator('#layer').is_hidden():
                events += 1
                dismiss(page, size+f'-evening-event-{day}')
            state = page.evaluate('JSON.parse(JSON.stringify(window.__state))')
            stored = saved(page)
            RESULT['edges'].append({'size':size,'case':'evening-save','day':day,'currentMoney':state['money'],'savedMoney':stored['G']['money']})
            assert stored['G'] == state, '저녁 저장 상태가 다름'
            assert len(state['history']) == day+1, '장사 두 번 적용'
            assert page.locator('.bank b').inner_text().replace(',','').replace('원','').replace('−','-') == str(state['money'])
            assert page.locator('.topbar .stars').get_attribute('aria-label') == f"평판 별 {state['rep']:g}개"
            res=stored['resume']['res']
            numbers=page.locator('.mind-legend span').all_text_contents()
            keys=['mine','rival']+(['truck']if res['truck']else[])+['none','soldout']
            assert [int(n.rsplit(' ', 1)[-1])for n in numbers]==[res['counts'][k]+(res['counts']['budget']if k=='none'else 0)for k in keys]
            if day == 0:
                shot(page,size+'-evening')
                page.reload()
                instrument(page)
                page.locator('[data-action="continue"]').click()
                page.wait_for_selector('.evening')
                assert saved(page) == stored, '저녁 이어하기 상태가 달라짐'
            page.locator('[data-action="next"]').click()
            dismiss(page, size+f'-event-{day}' if day < 3 else None)
        page.wait_for_selector('.ending-page')
        shot(page,size+'-ending')
        page.locator('[data-action="endings"]').click()
        shot(page,size+'-collection')
        page.locator('[data-action="title"]').click()
        page.locator('[data-action="settings"]').click()
        shot(page,size+'-settings')
        page.locator('#layer [data-action="sound"]').click()
        assert page.locator('#layer [data-action="sound"]').get_attribute('aria-pressed') == 'true'
        page.locator('#layer [data-action="sound"]').click()
        page.keyboard.press('Escape')
        assert page.locator('#layer').is_hidden()
        RESULT['flows'].append({'size':size,'days':day+1,'eveningEvents':events})
        print('FLOW',size,flush=True)
        page.close()

    # 각 엔딩은 디버그의 기존 엔진을 통과해서 실제 화면에 도착한다.
    for end, money, rep, fair, taste in [('closed',-100000,3,70,3),('best',800000,5,100,5),
        ('greedy',500000,3,40,3),('kind',100000,4,100,3),('rich',500000,2.5,70,3),('normal',100000,2.5,70,3)]:
        page = browser.new_page(viewport={'width':390,'height':844}, reduced_motion='reduce')
        watch(page); page.goto(URL)
        page.evaluate("""v=>{const G=TteokEngine.newGame(420);Object.assign(G,{day:9,money:v[0],rep:v[1],fair:v[2],taste:v[3]});
          localStorage.setItem('tteok-tycoon-v1',JSON.stringify({tutorialSeen:true,sound:false}));
          localStorage.setItem('tteok-tycoon-v2-game',JSON.stringify({G,plan:G.lastPlan}));}""",[money,rep,fair,taste])
        page.reload(); instrument(page)
        page.locator('[data-action="continue"]').click()
        page.locator('[data-action="dbg-end"]').click()
        page.wait_for_selector('.ending-page')
        assert page.evaluate('window.__state.ended') == end
        state = page.evaluate('window.__state')
        assert page.locator('.stat b').first.inner_text().replace(',', '').replace('원', '').replace('−', '-') == str(state['money'])
        assert page.locator('.stat b').last.inner_text() == str(state['fair'])
        assert page.locator('.final-side .stars').get_attribute('aria-label') == f"평판 별 {state['rep']:g}개"
        assert saved(page) is None
        shot(page,'debug-ending-'+end)
        RESULT['endings'].append(end); page.close()

    # 키보드 포커스와 기록 삭제 확인창의 취소.
    page=browser.new_page(reduced_motion='reduce'); watch(page); page.goto(URL)
    page.locator('[data-action="new"]').click(); dismiss(page)
    page.locator('[data-action="price-up"]').focus(); page.keyboard.press('Enter')
    assert page.evaluate("document.activeElement.dataset.action") == 'price-up'
    page.keyboard.press('ArrowDown'); assert saved(page)['plan']['price'] == 3000
    page.locator('[data-action="menu"]').click(); page.wait_for_timeout(80)
    for _ in range(8):
        page.keyboard.press('Tab')
        assert page.evaluate("!!document.activeElement.closest('#layer')")
    page.keyboard.press('Shift+Tab'); page.keyboard.press('Escape')
    assert page.evaluate('document.activeElement.dataset.action') == 'menu'
    page.locator('[data-action="menu"]').click();page.locator('#layer [data-action="settings"]').click()
    page.locator('[data-action="reset-ask"]').click();page.locator('.confirm [data-action="settings"]').click()
    assert saved(page) is not None
    RESULT['edges'].append({'case':'keyboard-and-cancel','pass':True});page.close()

    # 저장을 차단해도 플레이·소리 설정은 예외 없이 동작한다.
    page=browser.new_page(reduced_motion='reduce');watch(page)
    page.add_init_script("for(const k of ['getItem','setItem','removeItem'])Storage.prototype[k]=()=>{throw new DOMException('blocked','SecurityError')}")
    page.goto(URL);page.locator('[data-action="new"]').click();dismiss(page)
    page.locator('[data-action="open"]').click();page.locator('[data-action="skip"]').click();page.wait_for_selector('.evening');dismiss(page)
    page.locator('[data-action="dbg-end"]').click();page.wait_for_selector('.ending-page')
    shot(page,'storage-blocked-ending');RESULT['edges'].append({'case':'storage-blocked','pass':True});page.close()

    page=browser.new_page(reduced_motion='reduce');watch(page)
    page.goto((ROOT/'tteok-tycoon/index.html').as_uri()+'?debug=1')
    page.locator('[data-action="new"]').click();dismiss(page)
    page.locator('[data-action="dbg-end"]').click();page.wait_for_selector('.ending-page')
    shot(page,'file-ending');RESULT['edges'].append({'case':'file-url','pass':True});page.close()

    # 실제 다음 날 진입 후 아직 고르지 않은 사슬 사건을 복원한다.
    page=browser.new_page(reduced_motion='reduce');watch(page);page.goto(URL)
    page.evaluate("""()=>{const G=TteokEngine.newGame(420);G.money=500000;
      G.schedule[1]={...G.schedule[0],id:'resume-check'};
      G.pending=[{id:'priceWar',day:1,root:'cartel'},{id:'warEnd',day:1,root:'cartel'}];
      localStorage.setItem('tteok-tycoon-v1',JSON.stringify({tutorialSeen:true,sound:false}));
      localStorage.setItem('tteok-tycoon-v2-game',JSON.stringify({G,plan:G.lastPlan}));}""")
    page.reload();page.locator('[data-action="continue"]').click()
    page.locator('[data-action="open"]').click();page.locator('[data-action="skip"]').click();page.wait_for_selector('.evening')
    page.locator('[data-action="next"]').click();page.wait_for_selector('.choices')
    pending=saved(page);assert len(pending['resume']['events'])==2
    page.reload();page.locator('[data-action="continue"]').click();page.wait_for_selector('.choices')
    assert saved(page)==pending
    page.locator('.choices').evaluate('(c)=>{c.children[0].click();c.children[1].click()}')
    picked=saved(page);assert len(picked['G']['trail'])==len(pending['G']['trail'])+1
    assert len(picked['resume']['events'])==1
    page.locator('#layer [data-action="ok"]').click();page.wait_for_timeout(160)
    text=page.locator('.bubble').inner_text();info=saved(page)
    page.reload();page.locator('[data-action="continue"]').click();page.wait_for_selector('.bubble')
    assert page.locator('.bubble').inner_text()==text and saved(page)==info
    dismiss(page);assert not saved(page)['resume']['events']
    RESULT['edges'].append({'case':'chain-resume-and-double-choice','pass':True});page.close()

    # 그림 자체는 건드리지 않고 브라우저 응답만 손상시켜 SVG 대체를 검사한다.
    for mode in ['all','rain','truck','fallback']:
        page=browser.new_page(viewport={'width':1024,'height':768});watch(page)
        if mode=='fallback':
            page.route('**/shared-art/**/*.webp',lambda r:r.fulfill(status=200,content_type='image/webp',body=b'broken-image'))
        page.goto(URL)
        page.evaluate("""mode=>{const G=TteokEngine.newGame(420);G.day=1;G.choiceDone=1;G.money=500000;
          G.schedule[1]={...G.schedule[0],id:'scene-check',mood:mode==='rain'?.75:1};
          if(mode==='all')G.owned={chairs:true,staff:true,cheese:true,clean:true};
          if(mode==='truck'){G.truck=true;G.truckLeft=3;}
          localStorage.setItem('tteok-tycoon-v1',JSON.stringify({tutorialSeen:true,sound:false}));
          localStorage.setItem('tteok-tycoon-v2-game',JSON.stringify({G,plan:{price:2500,portions:40,upgrade:null}}));}""",mode)
        page.reload();page.locator('[data-action="continue"]').click()
        page.locator('[data-action="open"]').click();page.wait_for_selector('.kid');page.wait_for_timeout(1300)
        shot(page,'scene-'+mode)
        assert page.evaluate("[...document.querySelectorAll('.bubble-stack')].every(e=>e.children.length<=3)")
        assert page.locator('.kid .bubble-s').count()==0
        if mode=='fallback':
            assert page.locator('.street-art.failed').count()==1
            assert page.locator('.street-fallback').is_visible()
        else:
            assert page.locator('.street-art.loaded:not(.failed)').count()==1
            scales=page.evaluate("[...document.querySelectorAll('.kid')].map(e=>({route:e.className,scale:e.style.getPropertyValue('--s')}))")
            RESULT['edges'].append({'case':'perspective-'+mode,'scales':scales})
        page.locator('[data-action="skip"]').click();page.wait_for_selector('.evening');dismiss(page)
        page.locator('[data-action="dbg-end"]').click();page.wait_for_selector('.ending-page')
        if mode=='fallback':
            shot(page,'fallback-ending')
            assert page.locator('.final-scene .paint-fallback').is_visible()
        RESULT['edges'].append({'case':'scene-'+mode,'pass':True});page.close()
    browser.close()

(OUT/'ui-results.json').write_text(json.dumps(RESULT,ensure_ascii=False,indent=2),encoding='utf-8')
assert not RESULT['errors'], RESULT['errors']
print('완료', json.dumps({'flows':len(RESULT['flows']),'errors':RESULT['errors']},ensure_ascii=False))
