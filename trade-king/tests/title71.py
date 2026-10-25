# 무역왕 7.1 시작 화면·오프닝 검사: 시작 화면 4크기 넘침 0, 게임 시작 → 영상 → 건너뛰기 → 나라 고르기, 두 번째는 영상 없이,
# 설정이 실제로 적용·저장, 도감, 내레이션 파일 길이에 맞춰 컷이 늘어남(VOICE_TEST=1이면 시험 음성 파일이 있어야 함).
# URL=http://localhost:8083/trade-king/play6.html python -X utf8 trade-king/tests/title71.py
import os, sys, io
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/play6.html')
OUT = Path('output/playwright/title71'); OUT.mkdir(parents=True, exist_ok=True)
fails, errors = [], []
SCAN = '''() => { const bad = []; const d = document.documentElement;
  if (d.scrollHeight > innerHeight + 1) bad.push('page-y ' + d.scrollHeight); if (d.scrollWidth > innerWidth + 1) bad.push('page-x ' + d.scrollWidth);
  for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if (cs.display === 'none') continue;
    if (/auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) bad.push('y:' + el.className); }
  return bad.slice(0, 5); }'''
def ok(cond, msg):
    if not cond: fails.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    # 1) 시작 화면: 네 크기
    for w, h in [(1366, 768), (1280, 720), (1024, 768), (768, 1024)]:
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto(BASE); pg.wait_for_timeout(3600)
        ok(pg.locator('#title:not([hidden])').count() == 1, f'title hidden {w}')
        bad = pg.evaluate(SCAN); ok(not bad, f'title overflow {w} {bad}')
        box = pg.locator('#title .play').bounding_box(); ok(box and box['y'] + box['height'] <= h, f'play button off screen {w} {box}')
        pg.screenshot(path=str(OUT / f'title-{w}.png'))
        pg.click('#title [data-t=set]'); pg.wait_for_timeout(350)
        pb = pg.locator('#title .panel').bounding_box(); ok(pb and pb['y'] >= 0 and pb['y'] + pb['height'] <= h, f'settings off screen {w} {pb}')
        pg.screenshot(path=str(OUT / f'settings-{w}.png')); pg.close()
    # 2) 흐름
    ctx = b.new_context(viewport={'width': 1366, 'height': 768}); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'voice/' not in m.text and '404' not in m.text and errors.append(m.text))
    pg.goto(BASE); pg.evaluate('localStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(3000)
    pg.click('#title [data-t=play]'); pg.wait_for_timeout(2500)
    ok(pg.evaluate('TradeTitle.playing'), 'opening not playing')
    peek = pg.evaluate('TradeTitle.peek()'); print('lens', peek['lens'][:3], 'voices', peek['voices'][:3])
    if os.environ.get('VOICE_TEST'):
        ok(peek['voices'][0] and peek['voices'][0]['ok'], 'voice file 1 not loaded')
        ok(peek['lens'][0] >= 9.4, f'cut 1 not stretched to voice: {peek["lens"][0]}')
        ok(peek['speaking'], 'voice not playing')
    pg.wait_for_timeout(3500)
    sub = pg.inner_text('#cine .sub-line'); print('subtitle:', sub); ok('바다' in sub, 'subtitle 1 missing')
    pg.screenshot(path=str(OUT / 'opening-cut1.png'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(2200)
    ok(not pg.evaluate('TradeTitle.playing'), 'skip failed'); ok(pg.locator('#title[hidden]').count() == 1, 'title not hidden after dive')
    ok(pg.locator('.start [data-start=plains]').is_visible(), 'nation pick not shown'); ok(pg.evaluate("localStorage.getItem('trade6.opening')") == '1', 'opening not marked seen')
    pg.screenshot(path=str(OUT / 'pick-1366.png'))
    ok(not pg.evaluate(SCAN), 'pick overflow')
    pg.click('[data-home]'); pg.wait_for_timeout(600); ok(pg.locator('#title:not([hidden])').count() == 1, 'home did not show title')
    pg.click('#title [data-t=play]'); pg.wait_for_timeout(400); ok(not pg.evaluate('TradeTitle.playing'), 'opening replayed on 2nd start')
    pg.wait_for_timeout(1500); ok(pg.locator('.start').is_visible(), 'pick not shown 2nd')
    # 3) 설정: 소리·시간 흐름·글자·움직임·도우미가 실제로 적용·저장
    pg.click('[data-home]'); pg.wait_for_timeout(3000)
    pg.click('#title [data-t=set]'); pg.wait_for_timeout(300)
    for k, v in [('sound', 'on'), ('pace', 'slow'), ('text', 'huge'), ('motion', 'less'), ('helper', 'off')]:
        pg.click(f'#title [data-set={k}][data-v={v}]'); pg.wait_for_timeout(80)
    st = pg.evaluate("[JSON.parse(localStorage.getItem('trade6.settings')), localStorage.getItem('trade6.helper'), document.documentElement.className]"); print('settings', st)
    ok(st[0]['sound'] is True and st[0]['pace'] == 'slow' and st[0]['text'] == 'huge' and st[0]['motion'] == 'less', 'settings not saved')
    ok(st[1] == 'off' and 'calm' in st[2] and 'huge-text' in st[2], 'settings not applied')
    pg.screenshot(path=str(OUT / 'settings-applied.png'))
    pg.click('#title [data-set=helper][data-v=on]'); ok(pg.evaluate("localStorage.getItem('trade6.helper')") is None, 'helper on did not reset')
    pg.click('#title [data-t=close]'); pg.wait_for_timeout(200)
    # 4) 도감: 시작 화면 위로 열리고 닫힌다
    pg.click('#title [data-t=codex]'); pg.wait_for_timeout(300)
    ok(pg.locator('#layer:not([hidden]) .book-modal').count() == 1, 'codex not shown'); ok(not pg.evaluate(SCAN), 'codex overflow')
    top = pg.evaluate("document.elementFromPoint(683, 384).closest('#layer') !== null"); ok(top, 'codex under title')
    pg.screenshot(path=str(OUT / 'codex-over-title.png'))
    pg.click('[data-codex-close]'); pg.wait_for_timeout(200)
    # 5) 설정 '줄이기'·'아주 크게'로 게임 화면 넘침 없음 + 소리 설정이 게임 단추에 반영
    pg.click('#title [data-t=play]'); pg.wait_for_timeout(600); pg.click('[data-start=plains]'); pg.wait_for_timeout(600)
    for sel in ['[data-card]', '[data-ok=open]', '[data-coach-off]']:
        if pg.locator(sel).count(): pg.locator(sel).first.click(); pg.wait_for_timeout(200)
    ok(not pg.evaluate(SCAN), 'game overflow with huge text'); pg.click('[data-settings]'); pg.wait_for_timeout(150); ok(pg.locator('[data-setk=sound][data-setv=on][aria-pressed=true]').count() == 1, 'sound setting not applied in game'); ok(not pg.evaluate(SCAN), 'settings overflow with huge text'); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    pg.screenshot(path=str(OUT / 'game-huge-text.png'))
    # 6) 설정의 '오프닝 다시 보기'
    pg.goto(BASE); pg.wait_for_timeout(1200); pg.click('#title [data-t=set]'); pg.wait_for_timeout(200); pg.click('#title [data-t=replay]'); pg.wait_for_timeout(2500)
    ok(pg.evaluate('TradeTitle.playing'), 'replay failed'); pg.click('#cine [data-c=skip]'); pg.wait_for_timeout(900)
    ok(pg.locator('#title:not([hidden])').count() == 1, 'replay should return to title')
    ctx.close(); b.close()
print('errors', errors[:5]); print('FAILS', len(fails)); [print(' -', f) for f in fails]
