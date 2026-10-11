"""그림 연결·16가지 지도·이름 오류의 SVG 대체를 실제 브라우저로 확인합니다."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'output/playwright/python-packages'))
from playwright.sync_api import sync_playwright

SHOTS = ROOT / 'trade-king/check-verify'
SHOTS.mkdir(exist_ok=True)
URL = 'http://localhost:8790/trade-king/?debug=1&seed=7'


def assets_ready(page):
    page.wait_for_function("""() => [...document.querySelectorAll('.chart-art')].every(g =>
        !g.querySelector('image') || g.querySelector('.chart-fallback').style.visibility === 'hidden') &&
        [...document.querySelectorAll('.paint img')].every(i => i.complete && i.naturalWidth)""")
    page.evaluate("async () => { await Promise.all([...document.querySelectorAll('.paint img')].map(i => i.decode())); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }")


def dismiss_events(page):
    for _ in range(15):
        if page.locator('[data-action="choose"]').count():
            choices = page.locator('[data-action="choose"][data-key="b"]')
            (choices if choices.count() else page.locator('[data-action="choose"]')).first.click()
            page.locator('[data-action="event-next"]').click()
        elif page.locator('[data-action="event-ok"], [data-action="meeting-ok"]').count():
            page.locator('[data-action="event-ok"], [data-action="meeting-ok"]').first.click()
        else:
            return
    raise AssertionError('사건 진행이 끝나지 않아요')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    context = browser.new_context(viewport={'width': 1366, 'height': 768}, reduced_motion='reduce')
    context.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
    context.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('requestfailed', lambda r: errors.append(f'{r.url}: {r.failure}'))
    page.goto(URL)
    assets_ready(page)
    assert page.locator('.title-scene > .paint.loaded > img').count() == 1
    page.evaluate("""raw => {
        const old = new Function('window', raw + ';return window.TRADE;')({});
        const state = TradeEngine.fresh(7), w=state.world;
        w.slots=Object.fromEntries(Object.entries(old.maps[w.mapId].slots).map(([id,[x,y]]) =>
            [id,[w.flip&1?1000-x:x,w.flip&2?640-y:y]]));
        state.money=123;
        localStorage.setItem('trade-king-v1-game',JSON.stringify({state,selected:'d'}));
    }""", (ROOT / 'trade-king/tests/data-before.txt').read_text(encoding='utf-8'))
    page.reload()
    page.locator('[data-action="continue"]').click()
    assert '123' in page.locator('.money').inner_text()
    page.locator('[data-action="port"][data-slot="d"]').click()
    assert page.evaluate("""() => {
        const state=JSON.parse(localStorage.getItem('trade-king-v1-game')).state;
        return JSON.stringify(state.world) === JSON.stringify(TradeWorld.create(7)) && state.money===123;
    }""")
    page.evaluate("""() => {
        const saved=JSON.parse(localStorage.getItem('trade-king-v1-game'));
        saved.state.world.lanes[0][2]='storm';
        localStorage.setItem('trade-king-v1-game',JSON.stringify(saved));
    }""")
    page.reload()
    assert page.locator('[data-action="continue"]').count() == 0, '항로 변조 저장은 거절해야 합니다'
    seeds = page.evaluate("""() => {
        const forms = {};
        for (let seed = 0; Object.keys(forms).length < 16 && seed < 2000; seed++) {
            const w = TradeWorld.create(seed); forms[`${w.mapId}-${w.flip}`] ??= seed;
        }
        return forms;
    }""")
    assert len(seeds) == 16
    layouts = []
    for name, seed in seeds.items():
        page.evaluate("""seed => {
            const state = TradeEngine.fresh(seed); state.known = Object.keys(state.world.slots);
            state.year = 3;
            localStorage.setItem('trade-king-v1-game', JSON.stringify({state, selected: state.world.home}));
        }""", seed)
        page.reload()
        assert page.locator('[data-action="continue"]').count(), page.evaluate("""() => {
            const saved=JSON.parse(localStorage.getItem('trade-king-v1-game'));
            return {seed:saved.state.seed, world_matches:JSON.stringify(saved.state.world) === JSON.stringify(TradeEngine.fresh(saved.state.seed).world)};
        }""")
        page.locator('[data-action="continue"]').click()
        assets_ready(page)
        assert page.locator('.chart-map').count() == 1
        assert page.locator('image[href$="port_home.webp"]').count() == 1
        assert page.locator('.chart-frame').count() == 1
        assert page.locator('.chart-compass').count() == 1
        layout = page.evaluate("""() => {
            const map = document.querySelector('.map-wrap').getBoundingClientRect();
            const boxes = [...document.querySelectorAll('.map-pin .pin-name')].map(e => {
                const b = e.getBoundingClientRect(); return {slot: e.parentElement.dataset.slot,
                    left:b.left, top:b.top, right:b.right, bottom:b.bottom};
            });
            const clipped = boxes.filter(b => b.left < map.left - 1 || b.right > map.right + 1 ||
                b.top < map.top - 1 || b.bottom > map.bottom + 1).map(b => b.slot);
            const overlap = boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b =>
                a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
            ).map(b => [a.slot, b.slot]));
            return {clipped, overlap};
        }""")
        page.locator('.map-card').screenshot(path=str(SHOTS / f'art-{name}.png'))
        layouts.append({'form': name, 'seed': seed, **layout})
    # 배 그림과 항로를 따라 움직이는 키프레임, 안개에 숨은 나라 비노출.
    page.evaluate("""() => {
        const state = TradeEngine.fresh(7);
        const target = Object.keys(state.world.slots).find(k => !state.known.includes(k) &&
            TradeEngine.path(state, k, true));
        const result = TradeEngine.command(state, {type:'explore', slot:target});
        if (!result.result.ok) throw Error(result.result.message);
        localStorage.setItem('trade-king-v1-game', JSON.stringify({state:result.state, selected:target}));
    }""")
    page.reload()
    page.locator('[data-action="continue"]').click()
    assets_ready(page)
    assert page.locator('.boat-marker .paint.loaded img[src$="ship.webp"]').count() == 1
    assert page.locator('.map-wrap style').count() == 1
    assert page.locator('.fog image').count() > 0
    assert page.evaluate("""() => [...document.querySelectorAll('.map-pin.unknown')].every(pin => {
        const state=JSON.parse(localStorage.getItem('trade-king-v1-game')).state;
        const c=state.world.countries[pin.dataset.slot];
        return !c || !document.querySelector(`image[href$="port_${c.id}.webp"]`);
    })""")
    page.screenshot(path=str(SHOTS / 'art-voyage.png'), full_page=True)
    page.emulate_media(reduced_motion='no-preference')
    page.locator('[data-action="port"]').first.click()
    position = page.locator('.boat-marker').bounding_box()
    page.wait_for_function("""([x,y]) => {
        const b=document.querySelector('.boat-marker').getBoundingClientRect();
        return Math.abs(b.x-x)+Math.abs(b.y-y)>5;
    }""", arg=[position['x'], position['y']])
    for _ in range(3):
        page.locator('[data-action="end-year"]').click()
        if page.locator('.fog-clearing').count():
            break
        page.locator('[data-action="receipt-ok"]').click()
        dismiss_events(page)
    assert page.locator('.fog-clearing').count() > 0
    page.wait_for_function("() => [...document.querySelectorAll('.fog-clearing')].every(e => +getComputedStyle(e).opacity < .05)")
    page.emulate_media(reduced_motion='reduce')
    page.locator('[data-action="receipt-ok"]').click()
    dismiss_events(page)
    page.locator('[data-action="debug-end"]').click()
    assets_ready(page)
    assert page.locator('.ending-world .paint.loaded > img').count() == 1
    # 모든 엔딩 경로와 나라 인물이 디렉터리 목록 조회 없이 로드되는지 확인합니다.
    for ending in ['king', 'war', 'richAlone', 'island', 'rawOnly', 'normal']:
        page.evaluate("id => document.querySelector('.ending-world').innerHTML=Paint.scene(`trade/end_${id}`, TradeArt.icon('ship'))", ending)
        assets_ready(page)
        assert page.locator(f'.ending-world .paint.loaded img[src$="end_{ending}.webp"]').count() == 1
        page.locator('.ending-world').screenshot(path=str(SHOTS / f'art-ending-{ending}.png'))
    page.evaluate("""() => {
        const box=document.createElement('div'); box.className='art-people';
        box.innerHTML=Object.keys(TRADE.countries).map(id => Paint.person(id, SamgwonArt.portrait(id))).join('');
        document.body.append(box);
    }""")
    assets_ready(page)
    assert page.locator('.art-people .paint.loaded').count() == 10
    page.evaluate("document.querySelector('.art-people').remove()")
    assert not errors, errors
    # 요청 URL의 이름만 틀리게 바꿉니다. 원본 파일은 수정하지 않습니다.
    context.route('**/shared-art/**/*.webp', lambda r: r.fulfill(response=r.fetch(url=r.request.url.replace('.webp', '-missing.webp'))))
    page.reload()
    page.wait_for_function("() => !document.querySelector('.title-scene > .paint > img')")
    assert page.locator('.title-scene .paint-fallback > .chart').is_visible()
    page.locator('[data-action="new"]').click()
    page.locator('[data-action="intro-ok"]').click()
    while page.locator('[data-action="tutorial-next"]').count():
        page.locator('[data-action="tutorial-next"]').click()
    page.locator('[data-action="debug-fog"]').click()
    assets_ready(page)
    assert page.locator('.chart-art image').count() == 0
    assert page.locator('.chart-fallback').evaluate_all("els => els.every(e => getComputedStyle(e).visibility === 'visible')")
    page.locator('[data-action="port"][data-slot="d"]').click()
    assets_ready(page)
    assert page.locator('.panel .paint.loaded').count() == 0
    assert page.locator('.panel .paint-fallback svg').is_visible()
    page.screenshot(path=str(SHOTS / 'art-fallback.png'), full_page=True)
    page.locator('[data-action="debug-end"]').click()
    page.wait_for_function("() => !document.querySelector('.ending-world .paint > img')")
    assert page.locator('.ending-world .paint-fallback svg').is_visible()
    browser.close()

report = {'normal_console_errors': 0, 'fallback': True, 'fog_reveal': True, 'ship_motion': True, 'coordinate_resume': True, 'people': 10, 'endings': 6, 'layouts': layouts}
(Path(__file__).parent / 'art-result.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False), flush=True)
assert all(not r['clipped'] and not r['overlap'] for r in layouts), '지도 이름표 겹침·잘림: art-result.json 확인'
