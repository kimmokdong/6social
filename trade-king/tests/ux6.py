# 무역왕 6.2 회귀 검사: URL로 로컬 서버 지정, 캡처는 output/playwright/trade6-ux에 저장.
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = os.environ.get('URL', 'http://127.0.0.1:8081/trade-king/play6.html?debug')
OUT = Path('output/playwright/trade6-ux')
OUT.mkdir(parents=True, exist_ok=True)

def stopped(page, value='0'):
    assert page.locator(f'[data-speed="{value}"][aria-pressed=true]').count() >= 1

def visible_button(page, selector):
    box = page.locator(selector).bounding_box()
    assert box and box['y'] >= 0 and box['y'] + box['height'] <= page.viewport_size['height'], (selector, box)
    assert page.locator(selector).evaluate('(e) => { const r=e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }')

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 720}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.locator('[data-start=daon]').click()
    page.locator('[data-ok=open]').click()
    page.locator('.stock[data-good="0"]').click()
    assert page.locator('.isle.match:not(.world)').count() > 0
    assert page.evaluate('TK6.G.nations.slice(1).every(n => document.querySelector(`[data-drop="${n.id}"]`).classList.contains("match") === TK6.E.sells(TK6.G,n,0))')
    page.screenshot(path=str(OUT / '01-suppliers.png'))
    page.locator('[data-drop=world]').click()
    visible_button(page, '[data-sign]')
    visible_button(page, '[data-close]')
    assert page.locator('.map').get_attribute('inert') is not None
    page.locator('[data-close]').click()
    stopped(page)
    page.locator('[data-drop=world]').click()
    page.keyboard.press('Escape')
    stopped(page)
    page.locator('[data-drop=world]').click()
    page.screenshot(path=str(OUT / '02-contract.png'))
    page.locator('[data-sign]').click()
    stopped(page)
    assert page.evaluate('TK6.G.month') == 0
    page.locator('[data-speed="2"]').click()
    page.locator('[data-drop=world]').click()
    page.locator('[data-close]').click()
    stopped(page, '2')
    page.locator('[data-speed="0"]').click()
    print('PASS 첫 계약·취소·Escape의 정지 상태와 재생 중 복귀')

    # 브라우저 시간 대신 엔진만 진행해서 실제 귀항·자동 재출항의 표시를 검사한다.
    page.evaluate('''() => {
      const {G,E}=TK6, me=E.player(G); G.plan=[]; G.nations.slice(1).forEach(n=>n.ships=[]); me.money=5000;
      for(let i=0;i<6;i++) E.tick(G); TK6.render();
    }''')
    # 6.6b: '최근 도착' 단추는 배 툴팁 머리줄에 있다(배 말을 눌러 툴팁을 연다)
    page.locator('.piece[data-ship="0"]').click()
    assert page.locator('#tip .delivery[data-report="0"]').count() == 1
    page.locator('#tip .delivery[data-report="0"]').click()
    d = page.evaluate('TK6.E.player(TK6.G).ships[0].delivery')
    assert f"+{d['earned']}억" in page.locator('#layer').inner_text()
    assert f"−{d['spent']}억" in page.locator('#layer').inner_text()
    page.screenshot(path=str(OUT / '03-delivery.png'))
    page.keyboard.press('Escape')
    stopped(page)
    assert page.locator('.map').get_attribute('inert') is None
    print('PASS 귀항 결과의 실제 금액과 닫은 뒤 정지 상태')

    for w,h in [(1366,768), (1280,720), (1024,768), (768,1024), (390,844)]:
        page.set_viewport_size({'width':w,'height':h})
        page.evaluate("TK6.start('daon')")
        page.locator('[data-ok=open]').click()
        page.locator('.stock[data-good="0"]').click()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (w,h,'가로 넘침')
        page.screenshot(path=str(OUT / f'04-map-{w}.png'), full_page=True)
        page.locator('[data-drop=world]').click()
        visible_button(page,'[data-sign]')
        visible_button(page,'[data-close]')
        page.locator('[data-close]').focus()
        page.keyboard.press('Tab')
        assert page.evaluate('!!document.activeElement.closest(".dockpanel")')
        page.keyboard.press('Shift+Tab')
        assert page.locator('[data-close]').evaluate('(e) => e === document.activeElement')
        page.locator('.dockbody').evaluate('(e) => e.scrollTop = e.scrollHeight')
        plus = page.locator('[data-step][data-d="1"]:not([disabled])').first
        if plus.count():
            plus.click()
            assert page.evaluate('!!document.activeElement.closest(".dockpanel")')
        visible_button(page,'[data-sign]')
        page.screenshot(path=str(OUT / f'05-contract-{w}.png'))
        page.locator('[data-close]').click()
        stopped(page)
    print('PASS 5개 화면 크기·버튼 노출·가로 넘침·키보드 초점')

    page.set_viewport_size({'width':1280,'height':720})
    page.evaluate('''() => {
      const {G,E}=TK6; let guard=0;
      while(!G.over && guard++<5000){E.botTurn(G,'balanced',{});E.tick(G)}
      TK6.render();
    }''')
    assert page.evaluate('TK6.G.over')
    assert page.locator('[data-ok=again]').is_visible()
    assert not errors, errors
    page.screenshot(path=str(OUT / '06-ending.png'))
    print('PASS 5년 완료·엔딩·콘솔 예외 없음')
    browser.close()
