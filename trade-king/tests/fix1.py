"""FIX-1: 실제 웹폰트·관세 사슬·무료 부품·밥상 별이 높은 고립 엔딩을 검사합니다."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'output/playwright/python-packages'))
from playwright.sync_api import sync_playwright

SHOTS = ROOT / 'trade-king/check-verify'
RESULT = []


def click(page, action, extra=''):
    page.locator(f'[data-action="{action}"]{extra}').first.click()


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('trade-king-v1-game')).state")


def inject(page, state):
    page.evaluate("s => localStorage.setItem('trade-king-v1-game', JSON.stringify({state:s, selected:null}))", state)
    page.reload()
    click(page, 'continue')


def shot(page, size, scene):
    page.wait_for_function("""() => [...document.querySelectorAll('.paint')].every(e => e.classList.contains('loaded')) &&
        [...document.querySelectorAll('.chart-art')].every(g => !g.querySelector('image') ||
        g.querySelector('.chart-fallback').style.visibility === 'hidden')""")
    page.wait_for_function('document.styleSheets.length >= 3')
    fonts = page.evaluate("""async () => {
        await document.fonts.load('64px "Black Han Sans"', '무역왕 고립된 부자');
        await document.fonts.load('24px "Pretendard Variable"', '다온국 나라 표시');
        await document.fonts.load('34px "Nanum Myeongjo"', '다온일보 호외');
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('.paint img')].map(i => i.decode()));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))];
    }""")
    assert all(f in fonts for f in ['Black Han Sans', 'Pretendard Variable', 'Nanum Myeongjo']), fonts
    checks = page.evaluate("""() => {
        const root = document.querySelector('#layer[hidden]') ? document.querySelector('#app') : document.querySelector('.sheet');
        const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('svg');
        const wrongFont = [...root.querySelectorAll('h1,h2,.logo,.year,.money span,.stock-item b,.stepper strong,.offers b')]
            .filter(visible).filter(e => !getComputedStyle(e).fontFamily.startsWith('"Black Han Sans"')).map(e => e.textContent);
        const outside = [...root.querySelectorAll('button,a')].filter(visible).filter(e => {
            const b = e.getBoundingClientRect(); return b.left < -1 || b.right > innerWidth + 1;
        }).map(e => e.textContent);
        const names = [...root.querySelectorAll('.pin-name')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent);
        const small = [...root.querySelectorAll('button,p,.bubble,.say')].filter(visible).filter(e =>
            parseFloat(getComputedStyle(e).fontSize) < (e.tagName === 'BUTTON' ? 22 : 20)).map(e => e.textContent);
        const sheet = document.querySelector('.sheet')?.getBoundingClientRect();
        return {wrongFont, outside, names, small, overflow:document.documentElement.scrollWidth > innerWidth + 1,
            dialogOutside:!!sheet && (sheet.top < -1 || sheet.bottom > innerHeight + 1),
            difficultWord:root.textContent.includes('문장')};
    }""")
    assert not any(checks.values()), (size, scene, checks)
    if page.locator('.masthead').count():
        assert 'Nanum Myeongjo' in page.locator('.masthead').evaluate('(e) => getComputedStyle(e).fontFamily')
    page.screenshot(path=str(SHOTS / f'fix1-{size}-{scene}.png'), full_page=page.locator('#layer').is_hidden())
    RESULT.append({'size': size, 'scene': scene, 'fonts_loaded': fonts, **checks})


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    for width, height in [(1366, 768), (768, 1024), (390, 844)]:
        size = f'{width}x{height}'
        context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', ignore_https_errors=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.goto('http://localhost:8790/trade-king/?debug=1&seed=7')
        shot(page, size, 'title')
        click(page, 'new')
        click(page, 'intro-ok')
        assert '나라 표시' in page.locator('.sheet').inner_text()
        shot(page, size, 'tutorial')
        for _ in range(4):
            click(page, 'tutorial-next')
        shot(page, size, 'board')
        # 정상 연도 진행으로 시작 사건과 1년 뒤 후속 사건을 실제로 발생시킵니다.
        state = page.evaluate("""() => { const s=TradeEngine.fresh(4); s.newsPlan=Array(12).fill(null); s.newsPlan[1]='tariff'; return s; }""")
        inject(page, state)
        click(page, 'end-year')
        click(page, 'receipt-ok')
        shot(page, size, 'tariff')
        click(page, 'choose', '[data-key="a"]')
        click(page, 'event-next')
        click(page, 'end-year')
        click(page, 'receipt-ok')
        assert '8년' in page.locator('.bubble').inner_text() and '20%' in page.locator('.bubble').inner_text()
        shot(page, size, 'tariff2')
        tariff2 = saved(page)
        assert any(m['key'] == 'tariff' and m['left'] == 3 for m in tariff2['mods'])
        assert any(m['key'] == 'buy' and m['value'] == ['all', 0.2, 8] for m in tariff2['mods'])
        click(page, 'choose', '[data-key="a"]')
        click(page, 'event-next')
        click(page, 'end-year')
        click(page, 'receipt-ok')
        shot(page, size, 'trade-war')
        click(page, 'event-ok')
        for _ in range(3):
            click(page, 'end-year')
            click(page, 'receipt-ok')
        assert '관세와 거래 중단이 끝났어요' in page.locator('.bubble').inner_text()
        peace = saved(page)
        assert not any(m['key'] in ['tariff', 'closed'] and m['value'][0] == 'bigMarket' for m in peace['mods'])
        assert any(m['key'] == 'buy' for m in peace['mods'])
        shot(page, size, 'truce')
        click(page, 'event-ok')
        for key, cost in [('b', 160), ('c', 80)]:
            inject(page, tariff2)
            click(page, 'choose', f'[data-key="{key}"]')
            assert str(cost) in page.locator('.say').inner_text()
            assert saved(page)['money'] == max(0, tariff2['money'] - cost)
            shot(page, size, f'tariff2-{key}')
            click(page, 'event-next')
        # 무료 부품 두 번을 써도 올해 공장 칸은 2칸 그대로입니다.
        state = page.evaluate("""() => { const s=TradeEngine.fresh(7); s.newsPlan=Array(12).fill(null); s.newsPlan[1]='defect'; s.stock.iron=3; return s; }""")
        inject(page, state)
        click(page, 'end-year')
        click(page, 'receipt-ok')
        assert '두 번' in page.locator('.bubble').inner_text()
        shot(page, size, 'defect')
        click(page, 'choose', '[data-key="a"]')
        assert '공장 칸 수는 그대로' in page.locator('.say').inner_text()
        shot(page, size, 'defect-say')
        click(page, 'event-next')
        click(page, 'factory')
        click(page, 'make', '[data-id="car"]')
        click(page, 'make', '[data-id="car"]')
        assert page.locator('[data-action="make"][data-id="car"]').is_disabled()
        assert saved(page)['assembled'] == saved(page)['factory'] == 2
        assert saved(page)['freePart'] == 0
        shot(page, size, 'factory')
        click(page, 'close')
        click(page, 'debug-end')
        shot(page, size, 'ending')
        # 엔진이 실제로 정산한 밥상 별 5개·거래 친구가 적은 엔딩입니다.
        state = page.evaluate("""() => { const s=TradeEngine.fresh(7); s.newsPlan=Array(12).fill(null); s.year=12; s.money=500;
            s.gauges={food:5,energy:5,jobs:5}; s.stock.grain=3; s.stock.oil=3; return s; }""")
        inject(page, state)
        click(page, 'debug-end')
        assert page.locator('.paper h1').inner_text() == '고립된 부자'
        assert '국민 생활이 부족하거나 함께할 친구 나라가 적어요' in page.locator('.story').inner_text()
        assert page.locator('.paper .stars').first.get_attribute('aria-label').startswith('별 5개,')
        shot(page, size, 'rich-alone')
        click(page, 'album')
        shot(page, size, 'album')
        assert page.locator('.album-card').count() == 31
        assert not errors, errors
        RESULT.append({'size': size, 'console_errors': len(errors), 'tariff_branches': 3, 'free_parts': 2, 'rich_food': 5})
        print(f'{size}: 관세 3갈래·휴전·부품 2회·고립 엔딩·도감·실제 웹폰트 통과, 콘솔 오류 0', flush=True)
        context.close()
    browser.close()

(Path(__file__).parent / 'fix1-result.json').write_text(json.dumps(RESULT, ensure_ascii=False, indent=2), encoding='utf-8')
