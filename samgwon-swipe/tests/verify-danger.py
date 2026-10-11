"""위험 게이지의 가시성/위치와 화면 숫자를 엔진 상태와 대조합니다."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT.parent / 'output/playwright/python-packages'))
from playwright.sync_api import sync_playwright

result = {'checks': [], 'errors': []}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    page = browser.new_page()
    page.on('pageerror', lambda error: result['errors'].append(str(error)))
    page.on('console', lambda msg: result['errors'].append(msg.text) if msg.type == 'error' else None)
    try:
        page.goto('http://localhost:8790/samgwon-swipe/?debug=1')
        for width, height in [(1366,768),(1280,800),(1024,768),(768,1024),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate("""()=>{SamgwonDebug.card('P01');SamgwonDebug.run.gauges={p:10,m:10,l:10,w:90};SamgwonDebug.game();}""")
            page.wait_for_timeout(1000)
            gauges = page.evaluate("""()=>[...document.querySelectorAll('.gauge')].map(g=>{
              const icon=g.querySelector('.gauge-art,.power-meter'),style=getComputedStyle(icon),r=icon.getBoundingClientRect(),label=g.querySelector('.gauge-label').getBoundingClientRect();
              return {key:g.dataset.gauge,opacity:Number(style.opacity),inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=label.top+1};
            })""")
            result['checks'].append({'viewport':f'{width}x{height}','gauges':gauges})
            page.screenshot(path=str(ROOT / f'check-verify/danger-{width}x{height}.png'),animations='disabled',style='.debug-panel{visibility:hidden!important}')
            assert all(g['opacity'] > .2 and g['inside'] for g in gauges), gauges
        page.evaluate("""()=>localStorage.setItem('samgwon-swipe-v1',JSON.stringify({profileSeen:true,tutorialSeen:true,endings:Object.keys(SAMGWON.endings),powers:Object.keys(SAMGWON.powers)}))""")
        page.reload()
        assert page.locator('.title-secondary .counter').all_text_contents() == ['24/24', '18/18']
        page.locator('[data-action=start]').click()
        assert page.locator('.ending-dots .found').count() == 24
        page.locator('[data-role=president]').click()
        page.locator('[data-action=begin]').click()
        page.evaluate('SamgwonDebug.run.resolved=8;SamgwonDebug.run.turn=9;SamgwonDebug.game()')
        assert page.locator('.ticks .done').count() == page.evaluate('SamgwonDebug.run.resolved')
        assert page.locator('.term-label').inner_text() == '임기 3년 차'
        page.locator('[data-action=notebook]').click()
        assert page.locator('.screen-header .counter').inner_text() == '18 / 18'
        assert page.locator('.power-entry:not(.locked)').count() == page.evaluate('SamgwonDebug.progress.powers.length')
        page.keyboard.press('Escape')
        page.evaluate('()=>{void SamgwonDebug.ending("pres_complete")}')
        assert page.locator('.paper-date').inner_text().replace('\n',' ').endswith('엔딩 24/24')
        page.locator('[data-action=endings]').click()
        assert page.locator('.screen-header .counter').inner_text() == '24 / 24'
        result['checks'].append({'screen_counters':True,'checks':['타이틀','역할 수집 점','임기/결정 진행','권한 수첩','엔딩 신문/도감']})
        assert not result['errors'], result['errors']
        result['passed'] = True
    finally:
        browser.close()
        (ROOT / 'check-verify/danger-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
