"""설명서(guides/trade.html)용 실제 게임 화면을 찍는다. 실행: PORT=8080 python -X utf8 trade-king/tests/guide_shots.py
찍은 그림은 guides/img/trade-*.webp로 저장하고, 게임판 번호표 위치(%)를 출력한다.
"""
import io
import json
import os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
IMG = ROOT / 'guides/img'
BASE = f"http://127.0.0.1:{os.environ.get('PORT', '8080')}/trade-king/?debug=1"
W, H = 1280, 800


def save(p, name, clip=None):
    p.evaluate("document.getElementById('toast').textContent = ''")
    png = p.screenshot(animations='disabled', clip=clip)
    Image.open(io.BytesIO(png)).convert('RGB').save(IMG / f'trade-{name}.webp', quality=82)
    print('saved', name)


def center(p, sel):
    b = p.locator(sel).first.bounding_box()
    return b['x'] + b['width'] / 2, b['y'] + b['height'] / 2


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe')
    ctx = browser.new_context(viewport={'width': W, 'height': H}, reduced_motion='reduce')
    ctx.add_init_script('Date.now = () => 1792550000777;')
    ctx.add_init_script("localStorage.setItem('trade-king-v4-progress', JSON.stringify({tutorialEnabled:false}))")
    p = ctx.new_page()
    p.goto(BASE, wait_until='networkidle')
    p.wait_for_function('window.GameAssets && GameAssets.finished')
    save(p, 'title')
    p.click('[data-action="new"]')
    save(p, 'countries')
    p.click('[data-action="country"][data-id="daon"]')
    # 1년째: 혼자 만들기
    p.click('#layer [data-action="event"]')
    for i, k in ((0, 2), (2, 2), (3, 2)):
        for _ in range(k):
            p.click(f'[data-action="plus"][data-i="{i}"]')
    p.click('#app [data-action="next"]')
    p.click('#layer [data-action="next"]')
    # 2년째 소식 카드
    save(p, 'event')
    p.click('#layer [data-action="event"]')
    # 만들기: 일꾼 말을 끄는 순간
    for i, k in ((0, 1), (2, 1), (3, 3)):
        for _ in range(k):
            p.click(f'[data-action="plus"][data-i="{i}"]')
    x, y = center(p, '.workers .meeple')
    tx, ty = center(p, '[data-industry="3"] .tray')
    p.mouse.move(x, y)
    p.mouse.down()
    p.mouse.move(x + 20, y + 20)
    p.mouse.move(tx + 10, ty + 4)
    save(p, 'make')
    p.mouse.up()
    p.click('#app [data-action="next"]')
    if p.locator('[data-action="confirm-next"]').count():
        p.click('[data-action="confirm-next"]')
    # 배 보내기 게임판(번호표용)
    save(p, 'board')
    marks = p.evaluate("""() => {
      const sel = ['.logo', '.phase-bar', '.money', '.ranking', '.factory-panel', '.island', '.home', '.merchant-island', '.basket-panel', '.todo-card', '#app [data-action=next]'];
      return sel.map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [s, Math.round(r.left / innerWidth * 100), Math.round(r.top / innerHeight * 100)]; });
    }""")
    print(json.dumps(marks, ensure_ascii=False))
    # 부두 교환대: 배를 섬으로 끌어 놓고, 상자를 싣는 순간
    target = p.evaluate("""() => { const G=TK.G,E=TK.E,n=G.nations[0]; return G.nations.slice(1).map(o=>[o.id,E.island(G,n,o)]).sort((a,b)=>(b[1].needs.some(s=>s.i===3)?10:0)+b[1].sells.length-((a[1].needs.some(s=>s.i===3)?10:0)+a[1].sells.length))[0][0]; }""")
    x, y = center(p, '.ship-token')
    tx, ty = center(p, f'.island[data-id="{target}"]')
    p.mouse.move(x, y); p.mouse.down(); p.mouse.move(x + 15, y - 10); p.mouse.move(tx, ty); p.mouse.up()
    give = p.locator('.tt-mine [data-drag="box"]')
    if give.count():
        give.first.click()
    get = p.locator('.tt-theirs [data-drag="box"]')
    for _ in range(2):
        if get.count():
            get.first.click()
    if give.count():
        x, y = center(p, '.tt-mine [data-drag="box"]')
        tx, ty = center(p, '.hold-give')
        p.mouse.move(x, y); p.mouse.down(); p.mouse.move(x + 20, y); p.mouse.move(tx, ty)
    save(p, 'dock')
    p.mouse.up()
    if p.locator('[data-action="sail"]:enabled').count():
        p.click('[data-action="sail"]')
    p.click('#app [data-action="next"]')
    if p.locator('[data-action="confirm-next"]').count():
        p.click('[data-action="confirm-next"]')
    p.click('#layer [data-action="next"]')
    # 3년째 해 끝(정책 카드)
    p.click('#layer [data-action="event"]')
    p.evaluate('() => { const G=TK.G; while (G.phase !== "yearEnd") TK.E.botTurn(G, "smart"); TK.render(); }')
    save(p, 'yearend')
    p.evaluate('() => { const G=TK.G; while (G.phase !== "ending") TK.E.botTurn(G, "smart"); TK.render(); }')
    save(p, 'ending')
    p.click('[data-action="album"]')
    save(p, 'album')
    browser.close()
