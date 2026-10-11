"""기존 전체 흐름에서 빠지기 쉬운 지연·투자·잠금·새로고침을 검증한다."""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT / 'output/playwright/python-packages'))
from playwright.sync_api import sync_playwright

OUT = ROOT / 'tteok-tycoon/check-verify'
URL = os.environ.get('TTEOK_VERIFY_URL', 'http://localhost:8790/tteok-tycoon/?debug=1')
RESULT = {'cases': [], 'errors': [], 'requests': []}
before = OUT / 'edge-results.json'
if before.exists() and not (OUT / 'edge-results-before.json').exists():
    (OUT / 'edge-results-before.json').write_bytes(before.read_bytes())


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('tteok-tycoon-v2-game'))")


def setup(browser, mode, broken=None):
    page = browser.new_page(viewport={'width': 1024, 'height': 768})
    page.set_default_timeout(10000)
    page.on('pageerror', lambda e: RESULT['errors'].append(str(e)))
    page.on('console', lambda m: RESULT['errors'].append(m.text) if m.type == 'error' else None)
    page.on('requestfailed', lambda r: RESULT['requests'].append({'url': r.url, 'reason': r.failure}))
    if broken:
        page.route(broken, lambda r: r.fulfill(status=200, content_type='image/webp', body=b'broken-image'))
    page.goto(URL)
    page.evaluate("""mode=>{const G=TteokEngine.newGame(420); G.day=1; G.money=500000;
      G.schedule[1]={...G.schedule[0],id:'edge-check'};
      if(mode==='evening')G.schedule[1]={id:'donation',...TTEOK.pools.choices.donation};
      if(mode==='locked'){G.lockedPrice=4000;G.rivalPrice=4000;}
      if(mode==='investment')G.offers=['cheese','staff','flyer'];
      if(mode==='staff')G.owned.staff=true;
      if(mode==='poor')G.money=20000;
      localStorage.setItem('tteok-tycoon-v1',JSON.stringify({tutorialSeen:true,sound:false}));
      localStorage.setItem('tteok-tycoon-v2-game',JSON.stringify({G,plan:{price:mode==='locked'?4000:2500,portions:40,upgrade:null}}));}""", mode)
    page.reload()
    page.locator('[data-action="continue"]').click()
    page.wait_for_selector('.morning')
    return page


def sell(page):
    page.locator('[data-action="open"]').click()
    page.locator('[data-action="skip"]').click()
    page.wait_for_selector('.evening')


def delayed_choice(page):
    sell(page)
    before = saved(page)
    # 사건이 나오기 전 클릭을 시도한다. 해당 시간에도 다음 날은 잠겨 있어야 한다.
    page.locator('[data-action="next"]').evaluate('(b)=>b.click()')
    assert saved(page)['G']['day'] == before['G']['day'], '저녁 사건을 건너뛰고 다음 날로 이동'
    page.wait_for_selector('.choices')
    page.locator('.choices button').first.click()
    page.locator('#layer [data-action="ok"]').click()
    page.wait_for_function("document.querySelector('[data-action=next]') && !document.querySelector('[data-action=next]').disabled")
    chosen = saved(page)
    assert chosen['G']['choiceDone'] == chosen['G']['day']
    page.locator('[data-action="next"]').click()
    assert saved(page)['G']['day'] == chosen['G']['day'] + 1


def business_reload(page):
    page.locator('[data-action="open"]').click()
    before = saved(page)
    assert before['resume']['phase'] == 'evening'
    page.reload()
    page.locator('[data-action="continue"]').click()
    page.wait_for_selector('.evening')
    assert saved(page) == before
    assert len(saved(page)['G']['history']) == 1


def investment_receipt(page):
    page.locator('[data-up="cheese"]').click()
    before = saved(page)['G']['money']
    sell(page)
    state = saved(page)
    res = state['resume']['res']
    profit = int(page.locator('.profit').inner_text().replace(',', '').replace('원', '').replace('−', '-'))
    assert profit == res['profit'] - res['upCost'], f"정산 합계 불일치: 표시 {profit}, 실제 {res['profit'] - res['upCost']}"
    assert state['G']['money'] - before == profit
    page.screenshot(path=str(OUT / 'investment-receipt.png'), full_page=True)


def locked_keyboard(page):
    before = saved(page)['plan']['price']
    page.keyboard.press('ArrowDown')
    page.keyboard.press('ArrowUp')
    assert saved(page)['plan']['price'] == before
    page.keyboard.press('ArrowDown')
    assert saved(page)['plan']['price'] == before, '가격 잠금 중 방향키로 계획 가격 변경'


def menu_continue(page):
    page.locator('[data-action="por-up"]').click()
    before = saved(page)
    page.locator('[data-action="menu"]').click()
    page.locator('[data-action="to-title"]').click()
    page.locator('[data-action="continue"]').click()
    assert saved(page) == before
    sell(page)
    chosen = saved(page)
    page.locator('[data-action="next"]').evaluate('(b)=>{b.click();b.click()}')
    assert saved(page)['G']['day'] == chosen['G']['day'] + 1
    assert len(saved(page)['G']['history']) == 1


def no_skip(page):
    page.locator('[data-action="open"]').click()
    page.wait_for_selector('.kid')
    page.clock.install()
    page.clock.run_for(14000)
    page.wait_for_selector('.evening')
    assert len(saved(page)['G']['history']) == 1
    assert page.locator('.bank b').inner_text().replace(',', '').replace('원', '').replace('−', '-') == str(saved(page)['G']['money'])


def reset_record(page):
    page.locator('[data-action="menu"]').click()
    page.locator('#layer [data-action="settings"]').click()
    page.locator('[data-action="reset-ask"]').click()
    page.locator('[data-action="reset"]').click()
    assert saved(page) is None
    assert page.locator('[data-action="continue"]').count() == 0
    assert page.locator('[data-action="new"]').is_visible()
    progress = page.evaluate("JSON.parse(localStorage.getItem('tteok-tycoon-v1'))")
    assert progress == {'endings':[], 'badges':[], 'rivals':[], 'found':[], 'tutorialSeen':False, 'sound':False, 'best':0}


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    for name, mode, check in [('delayed-evening-choice','evening',delayed_choice),
            ('business-reload','normal',business_reload),('investment-receipt','investment',investment_receipt),
            ('locked-keyboard','locked',locked_keyboard),('menu-continue-and-double-next','normal',menu_continue),
            ('full-animation','normal',no_skip),('reset-record','normal',reset_record)]:
        page = setup(browser, mode)
        try:
            check(page)
            RESULT['cases'].append({'name':name,'pass':True})
        except Exception as exc:
            RESULT['cases'].append({'name':name,'pass':False,'reason':str(exc)})
            page.screenshot(path=str(OUT / (name + '-failure.png')), full_page=True)
        finally:
            page.close()
        print(name, RESULT['cases'][-1], flush=True)
        (OUT/'edge-results.json').write_text(json.dumps(RESULT,ensure_ascii=False,indent=2),encoding='utf-8')

    # 저장이 차단된 실제 오디오 경로에서도 켜기/끄기가 적용되는지 확인한다.
    page = browser.new_page()
    page.set_default_timeout(10000)
    page.on('pageerror', lambda e: RESULT['errors'].append(str(e)))
    page.on('console', lambda m: RESULT['errors'].append(m.text) if m.type == 'error' else None)
    page.on('requestfailed', lambda r: RESULT['requests'].append({'url': r.url, 'reason': r.failure}))
    page.add_init_script("""for(const k of ['getItem','setItem','removeItem'])Storage.prototype[k]=()=>{throw new DOMException('blocked','SecurityError')};
      const Audio=window.AudioContext;window.__tones=0;
      window.AudioContext=class extends Audio{createOscillator(){window.__tones++;return super.createOscillator()}};""")
    page.goto(URL)
    page.locator('[data-action="settings"]').click()
    page.locator('#layer [data-action="sound"]').click()
    assert page.locator('#layer [data-action="sound"]').get_attribute('aria-pressed') == 'true'
    tones = page.evaluate('window.__tones')
    assert tones > 0
    page.locator('#layer [data-action="sound"]').click()
    assert page.locator('#layer [data-action="sound"]').get_attribute('aria-pressed') == 'false'
    assert page.evaluate('window.__tones') == tones
    page.close()
    RESULT['cases'].append({'name':'sound-with-storage-blocked','pass':True})

    for mode, broken in [('staff','**/tteok/sp_staff.webp'),('kid','**/tteok/kid_*.webp')]:
        page = setup(browser, mode, broken)
        page.locator('[data-action="open"]').click()
        page.wait_for_selector('.kid')
        if mode == 'staff':
            assert page.locator('.street-art.failed .street-fallback').is_visible()
            assert page.locator('.kid .kid-art').first.is_visible()
        else:
            page.wait_for_function("[...document.querySelectorAll('.walking-kid')].some(e=>!e.querySelector('img'))")
            assert page.locator('.walking-fallback').first.is_visible()
            assert page.locator('.street-art.loaded:not(.failed)').count() == 1
        page.screenshot(path=str(OUT / ('broken-' + mode + '.png')), full_page=True)
        page.close()
        RESULT['cases'].append({'name':'individual-image-fallback-'+mode,'pass':True})

    for w, h in [(1366,768),(1280,800),(1024,768),(768,1024),(390,844)]:
        page = setup(browser, 'poor')
        page.set_viewport_size({'width':w, 'height':h})
        page.wait_for_function("getComputedStyle(document.querySelector('.toast')).opacity > .95")
        rect = page.locator('.toast').bounding_box()
        assert rect['x'] >= 0 and rect['x'] + rect['width'] <= w and rect['height'] <= 60
        page.screenshot(path=str(OUT / f'{w}x{h}-toast.png'), full_page=True)
        page.locator('[data-action="menu"]').click()
        page.locator('[data-action="to-title"]').click()
        assert page.locator('.toast.show').count() == 0
        page.locator('[data-action="continue"]').click()
        page.locator('[data-action="dbg-end"]').click()
        page.wait_for_selector('.ending-page')
        assert page.locator('.toast.show').count() == 0
        RESULT['cases'].append({'name':f'toast-layout-and-transition-{w}x{h}','pass':True})
        page.close()
    browser.close()

(OUT/'edge-results.json').write_text(json.dumps(RESULT,ensure_ascii=False,indent=2),encoding='utf-8')
assert all(c['pass'] for c in RESULT['cases']) and not RESULT['errors'], RESULT
