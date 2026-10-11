"""실제 버튼으로 3년 플레이 후 엔딩·도감·이어하기를 다섯 화면 크기에서 검증합니다."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'output/playwright/python-packages'))
from playwright.sync_api import sync_playwright

SHOTS = ROOT / 'trade-king/check-verify'
SHOTS.mkdir(exist_ok=True)
REPORT = []


def click(page, action, extra=''):
    page.locator(f'[data-action="{action}"]{extra}').first.click()


def shot(page, size, name):
    page.wait_for_function("""() => [...document.querySelectorAll('.chart-art')].every(g =>
        !g.querySelector('image') || g.querySelector('.chart-fallback').style.visibility === 'hidden') &&
        [...document.querySelectorAll('.paint')].every(e => e.classList.contains('loaded')) &&
        [...document.querySelectorAll('.paint img')].every(i => i.complete && i.naturalWidth)""")
    page.evaluate("async () => { await Promise.all([...document.querySelectorAll('.paint img')].map(i => i.decode())); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }")
    page.screenshot(path=str(SHOTS / f'walk-{size}-{name}.png'), full_page=page.locator('#layer').is_hidden())
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'가로 넘침: {name}'
    assert page.locator('button:visible').evaluate_all("els => els.every(e => parseFloat(getComputedStyle(e).fontSize) >= 22 || e.classList.contains('map-pin'))"), f'작은 버튼 글씨: {name}'


def dismiss_events(page):
    for _ in range(15):
        if page.locator('[data-action="choose"]').count():
            buttons = page.locator('[data-action="choose"]')
            b = page.locator('[data-action="choose"][data-key="b"]')
            (b if b.count() else buttons.first).click()
            click(page, 'event-next')
        elif page.locator('[data-action="event-ok"]').count():
            click(page, 'event-ok')
        elif page.locator('[data-action="meeting-ok"]').count():
            click(page, 'meeting-ok')
        else:
            return
    raise AssertionError('사건 진행이 끝나지 않아요')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    for width, height in [(1366, 768), (1280, 800), (1024, 768), (768, 1024), (390, 844)]:
        size = f'{width}x{height}'
        context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
        # 외부 폰트 서비스 연결 여부와 독립적으로 기본 글꼴의 레이아웃도 검사합니다.
        context.route('https://fonts.googleapis.com/**', lambda route: route.fulfill(status=200, content_type='text/css', body=''))
        context.route('https://cdn.jsdelivr.net/**', lambda route: route.fulfill(status=200, content_type='text/css', body=''))
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.goto('http://localhost:8790/trade-king/?debug=1&seed=7')
        shot(page, size, 'title')
        click(page, 'new')
        click(page, 'intro-ok')
        shot(page, size, 'tutorial')
        for _ in range(4):
            click(page, 'tutorial-next')
        shot(page, size, 'board')
        # 1년: 곡물·석유 수입과 두 종류의 부품 계약.
        click(page, 'port', '[data-slot="d"]')
        click(page, 'trade')
        for good in ['grain', 'oil']:
            for _ in range(2):
                click(page, 'basket', f'[data-good="{good}"][data-mode="buy"][data-delta="1"]')
        click(page, 'offer', '[data-offer="high"]')
        shot(page, size, 'trade')
        click(page, 'propose')
        click(page, 'close')
        assert page.locator('#layer').is_hidden()
        for good in ['iron', 'rubber']:
            click(page, 'port', '[data-slot="e"]')
            click(page, 'contract')
            click(page, 'sign', f'[data-good="{good}"][data-quantity="1"]')
        click(page, 'end-year')
        shot(page, size, 'receipt')
        click(page, 'receipt-ok')
        if page.locator('[data-action="choose"], [data-action="event-ok"]').count():
            shot(page, size, 'event')
        dismiss_events(page)
        # 2년: 만난 항구의 이웃을 실제 배로 탐험.
        click(page, 'port', '[data-slot="a"]')
        shot(page, size, 'explore')
        click(page, 'explore')
        click(page, 'end-year')
        click(page, 'receipt-ok')
        dismiss_events(page)
        # 3년: 전해 도착한 부품으로 조립하고 수출.
        click(page, 'factory')
        shot(page, size, 'factory')
        assert page.locator('[data-action="make"][data-id="car"]').is_enabled()
        click(page, 'make', '[data-id="car"]')
        click(page, 'close')
        click(page, 'port', '[data-slot="d"]')
        click(page, 'trade')
        click(page, 'basket', '[data-good="car"][data-mode="sell"][data-delta="1"]')
        click(page, 'offer', '[data-offer="high"]')
        click(page, 'propose')
        click(page, 'close')
        assert page.locator('#layer').is_hidden()
        # 진행 중 판을 새로 열어 저장된 연도·창고·배가 이어지는지 확인.
        before = page.evaluate("JSON.parse(localStorage.getItem('trade-king-v1-game')).state")
        page.reload()
        click(page, 'continue')
        assert page.evaluate("JSON.parse(localStorage.getItem('trade-king-v1-game')).state") == before
        click(page, 'end-year')
        click(page, 'receipt-ok')
        dismiss_events(page)
        click(page, 'debug-end')
        assert page.locator('.masthead').inner_text() == '다온일보 호외'
        shot(page, size, 'ending')
        click(page, 'album')
        shot(page, size, 'album')
        assert page.locator('.album-card').count() == 31
        # 저장한 판을 이어 실제 패널의 계약 거절·신뢰 0/1 표시를 확인합니다.
        for trust, years in [(2, 12), (1, 0), (0, 12), (0, 0)]:
            page.evaluate("""([trust, years]) => {
                const state = TradeEngine.fresh(7);
                state.trust.hubCity = trust;
                if (years) state.mods.push({key: 'noContract', value: [1], left: years});
                localStorage.setItem('trade-king-v1-game', JSON.stringify({state, selected: 'd'}));
            }""", [trust, years])
            page.reload()
            click(page, 'continue')
            assert page.locator('[data-action="contract"]').is_disabled()
            if trust or years:
                label = '🔒 장기 계약 거절' + (f' {years}년' if years else '')
                assert label in page.locator('.panel').inner_text()
            if trust:
                assert page.locator('[data-action="trade"]').is_enabled()
            else:
                assert page.locator('[data-action="trade"]').is_disabled()
                assert '거래를 끊었어요' in page.locator('.panel').inner_text()
            shot(page, size, f'refusal-{trust}-{years}')
        assert not errors, errors
        REPORT.append({'size': size, 'console_errors': len(errors), 'played_years': 3, 'trade': True, 'assembly': True, 'exploration': True, 'resume': True, 'contract_refusal': True, 'trust_zero': True, 'trust_one': True})
        context.close()
    # file://에서도 빌드·서버 없이 시작하고 저장 실패 시에도 계속합니다.
    context = browser.new_context()
    page = context.new_page()
    page.goto((ROOT / 'trade-king/index.html').as_uri())
    click(page, 'new')
    assert page.locator('[data-action="intro-ok"]').count() == 1
    context.close()
    browser.close()

(Path(__file__).parent / 'walk-result.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(REPORT, ensure_ascii=False), flush=True)
