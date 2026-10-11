"""VERIFY.md 추가 검사: 화면 수치·접근성·설정·연타·저장 차단·실제 엔딩 6종."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'output/playwright/python-packages'))
from playwright.sync_api import sync_playwright

SHOTS = ROOT / 'trade-king/check-verify'
SHOTS.mkdir(exist_ok=True)
URL = 'http://localhost:8790/trade-king/?debug=1&seed=7'
FIXTURES = json.loads((Path(__file__).parent / 'verify-endings.json').read_text(encoding='utf-8'))
RESULT = {'screens': [], 'endings': [], 'edges': [], 'maps': []}


def click(page, action, extra=''):
    page.locator(f'[data-action="{action}"]{extra}').first.click()


def context_for(browser, width=1366, height=768, touch=False):
    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce',has_touch=touch,is_mobile=touch)
    for pattern in ['https://fonts.googleapis.com/**', 'https://cdn.jsdelivr.net/**']:
        context.route(pattern, lambda r: r.fulfill(status=200, content_type='text/css', body=''))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.set_default_timeout(10000)
    return context, page, errors


def shot(page, name):
    page.wait_for_function("""() => [...document.querySelectorAll('.paint')].every(e => !e.querySelector('img') || e.classList.contains('loaded')) &&
        [...document.querySelectorAll('.paint img')].every(i => i.complete && i.naturalWidth) &&
        [...document.querySelectorAll('.chart-art')].every(g => !g.querySelector('image') ||
        g.querySelector('.chart-fallback').style.visibility === 'hidden')""")
    page.evaluate("""async () => {
        await Promise.all([...document.querySelectorAll('.paint img')].map(i => i.decode()));
        await document.fonts.ready;
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }""")
    page.evaluate('window.getSelection().removeAllRanges()')
    page.screenshot(path=str(SHOTS / f'{name}.png'), full_page=page.locator('#layer').is_hidden())
    issues = page.evaluate("""() => {
        const root = document.querySelector('#layer[hidden]') ? document.querySelector('#app') : document.querySelector('.sheet');
        const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('svg');
        const small = [...root.querySelectorAll('button,a,p,li,span,b,strong,h1,h2,h3')].filter(visible).filter(e =>
            [...e.childNodes].some(n => n.nodeType===3 && n.textContent.trim()) &&
            parseFloat(getComputedStyle(e).fontSize) < (e.closest('button') ? 20 : 18)).map(e => e.textContent.trim());
        const targets = [...root.querySelectorAll('button,a')].filter(visible).filter(e => {
            const b=e.getBoundingClientRect(); return b.width < 43.5 || b.height < 43.5;
        }).map(e => e.outerHTML.slice(0,180));
        const clipping = [...root.querySelectorAll('button,a')].filter(visible).filter(e => {
            const b=e.getBoundingClientRect(); return b.left < -1 || b.right > innerWidth+1;
        }).map(e => e.textContent.trim());
        const sheet=document.querySelector('.sheet'), b=sheet?.getBoundingClientRect();
        const textOverflow=[...root.querySelectorAll('.pin-name')].filter(visible).filter(e => e.scrollWidth>e.clientWidth+1).map(e=>e.textContent);
        return {small,targets,clipping,textOverflow,overflow:document.documentElement.scrollWidth > innerWidth+1,
            dialogOutside:!!b && (b.left < -1 || b.right > innerWidth+1 || b.top < -1 || b.bottom > innerHeight+1)};
    }""")
    RESULT['screens'].append({'name': name, **issues})
    assert not any(issues.values()), (name, issues)


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('trade-king-v1-game')).state")


def inject(page, state, selected=None):
    page.evaluate("v => localStorage.setItem('trade-king-v1-game',JSON.stringify(v))", {'state': state, 'selected': selected})
    page.reload()
    click(page, 'continue')


def start(page):
    click(page, 'new')
    click(page, 'intro-ok')
    while page.locator('[data-action="tutorial-next"]').count():
        click(page, 'tutorial-next')


def check_numbers(page, state=None):
    state = state or saved(page)
    actual = page.evaluate("""() => ({money: document.querySelector('.money span')?.textContent,
        gauges:[...document.querySelectorAll('.topbar .stars')].map(e => +e.getAttribute('aria-label').match(/\\d+/)[0]),
        stock:[...document.querySelectorAll('.stock-item b')].map(e => +e.textContent),
        actions:document.querySelectorAll('.action-chip:not(.used)').length,
        year:document.querySelector('.year')?.textContent})""")
    assert actual['money'] == f"{state['money']:,}", actual
    assert actual['gauges'] == list(state['gauges'].values()), actual
    assert actual['stock'] == list(state['stock'].values()), actual
    assert actual['actions'] == state['actions'], actual
    assert actual['year'] == f"{state['year']}년째", actual


def double(page, selector):
    page.locator(selector).first.scroll_into_view_if_needed()
    box = page.locator(selector).first.bounding_box()
    page.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2, click_count=2, delay=25)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    for width, height in [(1366,768),(1280,800),(1024,768),(768,1024),(390,844)]:
        size = f'{width}x{height}'
        context, page, errors = context_for(browser, width, height)
        page.goto(URL)
        shot(page, size+'-title')
        click(page, 'settings')
        shot(page, size+'-settings')
        # 모달의 포커스 순환, Enter, Esc, 방향키의 기본 스크롤을 확인합니다.
        assert page.evaluate("document.activeElement.dataset.action") == 'close'
        page.keyboard.press('Shift+Tab')
        assert page.evaluate("document.activeElement.dataset.action") == 'reset-confirm'
        page.keyboard.press('Tab')
        assert page.evaluate("document.activeElement.dataset.action") == 'close'
        page.keyboard.press('Enter')
        assert page.locator('#layer').is_hidden()
        assert page.evaluate("document.activeElement.dataset.action") == 'settings'
        click(page, 'settings')
        click(page, 'tutorial-open')
        page.keyboard.press('Escape')
        assert page.locator('#layer').is_visible()
        shot(page, size+'-tutorial')
        for _ in range(4):
            page.keyboard.press('Enter')
        assert page.locator('#layer').is_hidden()
        start(page)
        check_numbers(page)
        shot(page, size+'-board')
        page.keyboard.press('ArrowDown')
        page.keyboard.press('ArrowUp')
        click(page, 'port', '[data-slot="d"]')
        shot(page, size+'-country')
        click(page, 'trade')
        click(page, 'basket', '[data-good="grain"][data-mode="buy"][data-delta="1"]')
        click(page, 'offer', '[data-offer="high"]')
        quotes = page.evaluate("s => ['low','fair','high'].map(offer=>TradeEngine.quote(s,'hubCity',{buy:{grain:1},sell:{}},offer))",saved(page))
        for text, quote in zip(page.locator('.offers button').all_inner_texts(),quotes):
            assert f"지불 {quote['cost']:,}" in text and f"받음 {quote['revenue']:,}" in text
        shot(page, size+'-trade')
        double(page, '[data-action="propose"]')
        assert len(saved(page)['voyages']) == 1
        click(page, 'close')
        check_numbers(page)
        before = saved(page)
        click(page, 'menu')
        shot(page, size+'-menu')
        click(page, 'settings')
        sound = page.locator('#layer [data-action="sound"]')
        assert sound.get_attribute('aria-pressed') == 'false'
        sound.click()
        assert sound.get_attribute('aria-pressed') == 'true'
        sound.click()
        assert sound.get_attribute('aria-pressed') == 'false'
        page.keyboard.press('Escape')
        assert page.locator('#layer').is_hidden()
        click(page, 'menu')
        click(page, 'title')
        click(page, 'album')
        click(page, 'album-back')
        assert page.locator('.screen-title').count() == 1, '타이틀에서 연 도감은 타이틀로 돌아와야 합니다'
        click(page, 'continue')
        assert saved(page) == before
        page.reload()
        click(page, 'continue')
        assert saved(page) == before
        check_numbers(page)
        double(page, '[data-action="end-year"]')
        state = saved(page)
        assert state['year'] == before['year']+1
        assert len(state['history']) == len(before['history'])+1
        assert page.locator('[data-action="receipt-ok"]').count() == 1, '연타가 정산창까지 넘기면 안 됩니다'
        shot(page, size+'-receipt')
        click(page, 'receipt-ok')
        while page.locator('[data-action="choose"], [data-action="event-ok"], [data-action="event-next"]').count():
            if page.locator('[data-action="choose"]').count():
                shot(page, size+'-event')
                state = saved(page)
                key = page.locator('[data-action="choose"]').first.get_attribute('data-key')
                expected = page.evaluate("([s,key]) => TradeEngine.command(s,{type:'event',key}).state", [state,key])
                double(page, '[data-action="choose"]')
                assert saved(page) == expected
                click(page, 'event-next')
            else:
                click(page, 'event-ok')
        check_numbers(page)
        # 빈 목록과 투자·계약·공장도 터치 영역을 검사합니다.
        for action in ['factory','invest','contracts']:
            click(page, action)
            shot(page, size+'-'+action)
            click(page, 'close')
        click(page, 'port', '[data-slot="e"]')
        click(page, 'contract')
        shot(page, size+'-contract')
        double(page, '[data-action="sign"][data-good="iron"][data-quantity="1"]')
        assert len(saved(page)['contracts']) == 1
        check_numbers(page)
        click(page, 'debug-fog')
        shot(page, size+'-all-ports')
        # 그림만 교체하는 대신 각 엔딩에 도달한 실제 상태를 정산합니다.
        expected_best = 0
        for ending, fixture in FIXTURES.items():
            inject(page, fixture['state'])
            check_numbers(page, fixture['state'])
            page.evaluate("""() => {
                const command=TradeEngine.command;
                TradeEngine.command=(s,a)=>{const out=command(s,a);window.verifyFinal=out.state;return out;};
            }""")
            click(page, 'debug-end')
            assert page.evaluate('window.verifyFinal') == fixture['final']
            assert page.locator('.paper h1').inner_text() == page.evaluate("id => TRADE.endings.find(e=>e.id===id).name", ending)
            assert page.locator(f'.ending-world img[src$="end_{ending}.webp"]').count() == 1
            gauges = page.locator('.paper .stars').evaluate_all("els => els.map(e=>+e.getAttribute('aria-label').match(/\\d+/)[0])")
            assert gauges == list(fixture['final']['gauges'].values())
            score = sum(gauges)*40 + fixture['final']['money']
            expected_best = max(expected_best,score)
            progress = page.evaluate("JSON.parse(localStorage.getItem('trade-king-v1'))")
            assert progress['best'] == expected_best and ending in progress['endings']
            assert page.evaluate("localStorage.getItem('trade-king-v1-game')") is None
            shot(page, size+'-ending-'+ending)
            RESULT['endings'].append({'size':size,'ending':ending,'score':score})
        click(page, 'album')
        shot(page, size+'-album')
        assert page.locator('.album-card').count() == 31
        assert '엔딩 6/6' in page.locator('#app').inner_text()
        assert f'최고 기록 {expected_best:,}' in page.locator('#app').inner_text()
        click(page, 'album-back')
        assert page.locator('.paper').count() == 1
        click(page, 'title')
        assert page.locator('[data-action="continue"]').count() == 0
        click(page, 'album')
        click(page, 'album-back')
        assert page.locator('.screen-title').count() == 1, '엔딩 후 타이틀 도감도 타이틀로 돌아와야 합니다'
        click(page, 'settings')
        click(page, 'reset-confirm')
        shot(page, size+'-reset-confirm')
        click(page, 'reset')
        assert page.evaluate("JSON.parse(localStorage.getItem('trade-king-v1')).endings") == []
        assert not errors, errors
        RESULT['edges'].append({'size':size,'resume':True,'numbers':True,'rapid_click':True,'keyboard':True,'sound':True,'console_errors':len(errors)})
        context.close()
    for protocol in ['http','file']:
        context, page, errors = context_for(browser)
        context.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})")
        page.goto(URL if protocol=='http' else (ROOT/'trade-king/index.html').as_uri()+'?debug=1&seed=7')
        start(page)
        click(page,'port','[data-slot="d"]')
        click(page,'trade')
        click(page,'basket','[data-good="grain"][data-mode="buy"][data-delta="1"]')
        click(page,'offer','[data-offer="high"]')
        click(page,'propose')
        click(page,'close')
        click(page,'debug-end')
        shot(page,protocol+'-storage-blocked-ending')
        click(page,'album')
        click(page,'album-back')
        click(page,'title')
        click(page,'sound')
        click(page,'sound')
        assert not errors, errors
        RESULT['edges'].append({'protocol':protocol,'storage_blocked':True,'console_errors':len(errors)})
        context.close()
    for width,height in [(768,1024),(390,844)]:
        context,page,errors=context_for(browser,width,height,touch=True)
        page.goto(URL)
        start(page)
        click(page,'port','[data-slot="d"]')
        click(page,'trade')
        click(page,'basket','[data-good="grain"][data-mode="buy"][data-delta="1"]')
        click(page,'offer','[data-offer="high"]')
        button=page.locator('[data-action="propose"]')
        button.scroll_into_view_if_needed()
        box=button.bounding_box()
        for _ in range(2):
            page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2)
        assert len(saved(page)['voyages'])==1
        click(page,'close')
        before=saved(page)
        button=page.locator('[data-action="end-year"]')
        button.scroll_into_view_if_needed()
        box=button.bounding_box()
        for _ in range(2):
            page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2)
        assert saved(page)['year']==before['year']+1
        assert len(saved(page)['history'])==len(before['history'])+1
        assert page.locator('[data-action="receipt-ok"]').count()==1
        shot(page,f'touch-{width}x{height}-receipt')
        assert not errors,errors
        RESULT['edges'].append({'size':f'{width}x{height}','touch':True,'rapid_click':True,'console_errors':len(errors)})
        context.close()
    # 16가지 지도와 뒤집기의 이름표를 다섯 화면 크기에서 검사합니다.
    for width, height in [(1366,768),(1280,800),(1024,768),(768,1024),(390,844)]:
        context, page, errors = context_for(browser, width, height)
        page.goto(URL)
        forms = page.evaluate("""() => {
            const forms={};
            for(let seed=0; Object.keys(forms).length<16 && seed<2000; seed++) {
                const w=TradeWorld.create(seed); forms[`${w.mapId}-${w.flip}`] ??= seed;
            }
            return forms;
        }""")
        assert len(forms)==16
        for form, seed in forms.items():
            state = page.evaluate("seed => {const s=TradeEngine.fresh(seed);s.known=Object.keys(s.world.slots);return s;}", seed)
            inject(page,state)
            page.evaluate('TradeArt.layoutPins()')
            issues = page.evaluate("""() => {
                const map=document.querySelector('.map-wrap').getBoundingClientRect();
                const names=[...document.querySelectorAll('.pin-name')].filter(e=>e.getClientRects().length);
                const boxes=names.map(e=>e.getBoundingClientRect());
                const clipped=boxes.filter(b=>b.left<map.left-1 || b.right>map.right+1 || b.top<map.top-1 || b.bottom>map.bottom+1).length;
                const overlap=boxes.flatMap((a,i)=>boxes.slice(i+1).filter(b=>a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top)).length;
                const textOverflow=names.filter(e=>e.scrollWidth>e.clientWidth+1).length;
                return {clipped,overlap,textOverflow};
            }""")
            RESULT['maps'].append({'size':f'{width}x{height}','form':form,**issues})
            if any(issues.values()):
                page.screenshot(path=str(SHOTS/f'map-failure-{width}x{height}-{form}.png'),full_page=True)
            assert not any(issues.values()),(width,height,form,issues)
            if width==1024 and form=='strait-1':
                shot(page,'map-fixed-1024x768-strait-1')
        assert not errors,errors
        context.close()
    browser.close()

(Path(__file__).parent/'verify-result.json').write_text(json.dumps(RESULT,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'screens':len(RESULT['screens']),'endings':RESULT['endings'],'edges':RESULT['edges'],'maps':len(RESULT['maps'])},ensure_ascii=False),flush=True)
