"""무역왕 5.0 실제 브라우저 검증. 실행: PORT=8080 python -u -X utf8 trade-king/tests/verify.py
게임 명령은 실제 마우스·키보드·터치 입력으로 보내고, 엔진은 상태를 읽을 때만 쓴다.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/trade-v5-verify'
OUT.mkdir(parents=True, exist_ok=True)
BASE = f"http://127.0.0.1:{os.environ.get('PORT', '8080')}/trade-king/"
SAVE = 'trade-king-v4-game'
PROGRESS = 'trade-king-v4-progress'
SIZES = [(1366, 768), (1280, 800), (1024, 768), (768, 1024)]
errors, checks = [], []


def passed(text):
    checks.append(text)
    print('PASS: ' + text, flush=True)


def page(browser, w=1366, h=768, touch=False, debug=True, seed=1792550000123, tutorial=False, progress=None):
    context = browser.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch, reduced_motion='reduce')
    # 매번 같은 세계에서 입력을 재현하도록 시작 시각을 고정한다.
    context.add_init_script(f'Date.now = () => {seed};')
    base = progress or {}
    base.setdefault('tutorialEnabled', tutorial)
    context.add_init_script(f"if(!sessionStorage.getItem('seeded')){{localStorage.setItem('{PROGRESS}',JSON.stringify({json.dumps(base)}));sessionStorage.setItem('seeded','1');}}")
    p = context.new_page()
    p.on('pageerror', lambda error: errors.append(str(error)))
    p.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    p.goto(BASE + ('?debug=1' if debug else ''), wait_until='networkidle')
    p.wait_for_function('window.GameAssets && GameAssets.finished')
    return p


def state(p):
    return p.evaluate('() => ({year:TK.G.year,phase:TK.G.phase,money:TK.G.nations[0].money,voyages:TK.G.nations[0].voyages.length,left:TK.E.shipsLeft(TK.G.nations[0])})')


def shot(p, name):
    p.screenshot(path=str(OUT / f'{name}.png'), animations='disabled')


def act(p, selector, how='mouse'):
    el = p.locator(selector).first
    if how == 'touch':
        el.tap()
    elif how == 'keyboard':
        keyboard_click(p, selector)
    else:
        el.click()


def keyboard_click(p, selector):
    # focus()나 엔진 호출 없이 Tab만으로 원하는 버튼에 도달한다.
    for _ in range(140):
        if p.evaluate('s => document.activeElement && document.activeElement.matches(s)', selector):
            p.keyboard.press('Enter')
            return
        p.keyboard.press('Tab')
    raise AssertionError(('Tab으로 닿지 못함', selector))


def audit(p, label):
    r = p.evaluate("""() => {
      const visible=n=>n.checkVisibility()&&!n.closest('[hidden]');
      const zoom=n=>parseFloat(n.closest('.sheet')?.style.zoom)||1;
      const small=[...document.querySelectorAll('#app *,#layer *,#coach *')].filter(n=>visible(n)&&!n.closest('svg')&&
        [...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())&&parseFloat(getComputedStyle(n).fontSize)*zoom(n)<12.99).map(n=>n.textContent.trim().slice(0,30));
      const overflow=[...document.querySelectorAll('.panel,.factory,.basket-line,.island,.merchant-island,.todo-card,.phase-bar,.country-card,.collection-card,.sheet,.trade-table,.tt-side,.hold,.policy-card')]
        .filter(n=>visible(n)&&(n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2)).map(n=>n.className);
      const clipped=[];
      for(const n of document.querySelectorAll('#app *,#layer *,#coach *')){
        if(!visible(n)||n.closest('svg')||n.closest('select'))continue;
        for(const c of n.childNodes){ if(c.nodeType!==3||!c.textContent.trim())continue; const range=document.createRange(); range.selectNodeContents(c);
          for(const b of range.getClientRects()) if(b.left<-1||b.right>innerWidth+1||b.top<-1||b.bottom>innerHeight+1) clipped.push(c.textContent.trim().slice(0,30)); }
      }
      const els=[...document.querySelectorAll('.island,.merchant-island,.home')].filter(visible), boxes=els.map(n=>n.getBoundingClientRect());
      const overlap=[]; for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j]; if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1) overlap.push([els[i].dataset.id||'home',els[j].dataset.id||'home',[a.top,a.bottom,b.top,b.bottom].map(Math.round)]);}
      const tiny=[...document.querySelectorAll('#app button,#layer button,#coach button')].filter(n=>visible(n)&&(n.offsetWidth<40||n.offsetHeight<32)).map(n=>n.textContent.trim()||n.getAttribute('aria-label'));
      return {w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,vw:innerWidth,vh:innerHeight,small,overflow,clipped,overlap,tiny};
    }""")
    if r['overlap'] or r['overflow'] or r['clipped']:
        shot(p, 'fail-' + label.replace(' ', '_'))
    assert r['w'] <= r['vw'] + 1, (label, '가로 넘침', r)
    assert r['h'] <= r['vh'] + 1, (label, '세로 스크롤', r)
    assert not r['small'], (label, '13px 미만 글자', r['small'])
    assert not r['overflow'], (label, '내용 잘림', r['overflow'])
    assert not r['clipped'], (label, '화면 밖 글자', r['clipped'])
    assert not r['overlap'], (label, '지도 위 섬 겹침', r['overlap'])
    assert not r['tiny'], (label, '누르기 작은 버튼', r['tiny'])


def finish_make(p, how='mouse'):
    """가장 잘하는 공장에 일꾼을 모두 놓고 만들기를 끝낸다."""
    best = p.evaluate('() => TK.E.best(TK.G.nations[0])')
    while p.locator(f'[data-action="plus"][data-i="{best}"]:enabled').count():
        act(p, f'[data-action="plus"][data-i="{best}"]', how)
    act(p, '#app [data-action="next"]', how)
    if p.locator('[data-action="confirm-next"]').count():
        act(p, '[data-action="confirm-next"]', how)


def send_ship(p, how='mouse'):
    """빈 칸을 가장 많이 채울 섬으로 배 한 척을 보낸다. 실패하면 False."""
    target = p.evaluate("""() => { const G=TK.G,E=TK.E,n=G.nations[0]; let best=null,v=0;
      for(const o of [...G.nations.slice(1),G.world]){const is=E.island(G,n,o); const s=is.sells.filter(x=>!x.blocked).reduce((a,x)=>a+Math.min(x.qty,E.deficit(n,x.i)),0)*2+is.needs.reduce((a,x)=>a+Math.min(x.qty,E.surplus(n,x.i)),0); if(s>v){v=s;best=o.id;}}
      return best; }""")
    if not target:
        return False
    act(p, f'[data-action="island"][data-id="{target}"]', how)
    assert p.locator('.trade-table').count(), '부두 교환대가 열리지 않음'
    for kind in ('give', 'get'):
        for _ in range(6):
            needed = p.evaluate(f'''() => {{ const n=TK.G.nations[0]; const k=[...document.querySelectorAll('.trade-table [data-action="load"][data-kind="{kind}"]:not(:disabled)')].map(b=>+b.dataset.i);
              return k.find(i => "{kind}"==="give" ? TK.E.surplus(n,i) > (TK.cargo.give[i]||0) : TK.E.deficit(n,i) > (TK.cargo.get[i]||0)); }}''')
            if needed is None:
                break
            act(p, f'.trade-table [data-action="load"][data-kind="{kind}"][data-i="{needed}"]', how)
            if kind == 'get' and not p.locator('[data-action="sail"]').is_enabled():
                act(p, f'.hold-get [data-action="unload"][data-i="{needed}"]', how)
                break
    if p.locator('[data-action="sail"]:enabled').count():
        act(p, '[data-action="sail"]', how)
        assert not p.locator('.trade-table').count()
        return True
    act(p, '[data-action="dock-cancel"]', how)
    return False


def play_year(p, how='mouse', policy=True, label=None, sizes=False):
    """한 해를 실제 입력으로 끝까지 진행한다. label이 있으면 단계마다 화면을 검사한다."""
    y = state(p)['year']
    if label:
        audit(p, f'{label} {y}년 소식')
    act(p, '#layer [data-action="event"]', how)
    if y >= 3 and p.locator('.shield:enabled').count():
        act(p, '.shield[data-i="4"]', how)
        assert p.evaluate('() => TK.G.nations[0].protect[4]'), '보호 버튼'
        act(p, '.shield[data-i="4"]', how)
    if label:
        audit(p, f'{label} {y}년 만들기')
    finish_make(p, how)
    if state(p)['phase'] == 'ship':
        if label:
            audit(p, f'{label} {y}년 배 보내기')
        sent = 0
        for _ in range(state(p)['left']):
            if not send_ship(p, how):
                break
            sent += 1
        if label and sent:
            audit(p, f'{label} {y}년 출항 뒤')
        act(p, '#app [data-action="next"]', how)
        if p.locator('[data-action="confirm-next"]').count():
            act(p, '[data-action="confirm-next"]', how)
    assert state(p)['phase'] == 'yearEnd'
    if label:
        audit(p, f'{label} {y}년 해 끝')
    if policy and p.locator('#layer [data-action="policy"]:enabled').count():
        act(p, '#layer [data-action="policy"]:enabled', how)
    else:
        act(p, '#layer [data-action="next"]', how)


def start(p, country='daon', how='mouse'):
    act(p, '[data-action="new"]', how)
    act(p, f'[data-action="country"][data-id="{country}"]', how)
    assert state(p)['year'] == 1 and state(p)['phase'] == 'event'


def full_game(browser):
    p = page(browser)
    start(p)
    shot(p, 'event-1366')
    play_year(p, label='1366')
    play_year(p, label='1366')
    for _ in range(3):
        play_year(p, label='1366')
    assert p.locator('.ending-screen').count(), '엔딩 화면'
    audit(p, '엔딩')
    shot(p, 'ending')
    hist = p.evaluate('() => TK.G.nations[0].history.map(h=>h.score)')
    assert len(hist) == 5 and hist[1] > hist[0], hist
    passed(f'마우스로 다섯 해 끝까지 · 2년째 무역 점수가 1년째보다 높음 {hist}')
    act(p, '[data-action="album"]')
    for tab in ('events', 'countries', 'badges'):
        act(p, f'[data-action="album-tab"][data-id="{tab}"]')
        audit(p, f'도감 {tab}')
    passed('엔딩 → 도감 세 탭')
    p.context.close()


def size_checks(browser):
    for w, h in SIZES:
        p = page(browser, w, h)
        audit(p, f'{w}x{h} 타이틀')
        act(p, '[data-action="new"]')
        audit(p, f'{w}x{h} 나라 고르기')
        act(p, '[data-action="country"][data-id="market"]')
        play_year(p, label=f'{w}x{h}')
        act(p, '#layer [data-action="event"]')
        finish_make(p)
        assert state(p)['phase'] == 'ship'
        shot(p, f'ship-{w}x{h}')
        # 섬마다 선적 카드가 화면 안에 들어오는지
        for ident in p.evaluate('() => [...document.querySelectorAll("[data-action=island]")].map(n=>n.dataset.id)'):
            p.locator(f'[data-action="island"][data-id="{ident}"]').click()
            audit(p, f'{w}x{h} 부두 교환대 {ident}')
            p.locator('[data-action="dock-cancel"]').click()
        send_ship(p)
        shot(p, f'sailed-{w}x{h}')
        audit(p, f'{w}x{h} 출항 뒤')
        passed(f'{w}x{h} 타이틀·나라·소식·만들기·배 보내기·부두 교환대·해 끝에서 스크롤·잘림·겹침 없음')
        p.context.close()


def input_checks(browser):
    # 키보드만으로 1·2년째
    p = page(browser)
    start(p, how='keyboard')
    play_year(p, how='keyboard')
    play_year(p, how='keyboard')
    assert state(p)['year'] == 3
    act(p, '#layer [data-action="event"]', 'keyboard')
    p.keyboard.press('4')
    p.keyboard.press('+')
    assert p.evaluate('() => TK.G.nations[0].allocation[3]') == 1
    p.keyboard.press('-')
    assert p.evaluate('() => TK.G.nations[0].allocation[3]') == 0
    passed('키보드(Tab·Enter·숫자·+/−)만으로 진행')
    p.context.close()
    # 터치
    p = page(browser, 1024, 768, touch=True)
    start(p, how='touch')
    play_year(p, how='touch')
    play_year(p, how='touch')
    assert state(p)['year'] == 3
    passed('터치만으로 1·2년째 진행(섬 누르기·선적·출항)')
    p.context.close()
    # 배 끌어다 놓기와 일꾼 끌어다 놓기
    p = page(browser)
    start(p)
    act(p, '#layer [data-action="event"]')
    p.locator('.workers .meeple').first.drag_to(p.locator('[data-industry="3"] .tray'))
    assert p.evaluate('() => TK.G.nations[0].allocation[3]') == 1
    p.locator('.workers .meeple').first.drag_to(p.locator('[data-industry="0"] .tray'))
    p.locator('[data-industry="0"] .meeple').first.drag_to(p.locator('[data-industry="3"] .tray'))
    assert p.evaluate('() => TK.G.nations[0].allocation.slice(0,4).join()') == '0,0,0,2', '공장끼리 옮기기'
    p.locator('[data-industry="3"] .meeple').first.drag_to(p.locator('.workers'))
    assert p.evaluate('() => TK.G.nations[0].allocation[3]') == 1, '남은 일꾼 자리로 되돌리기'
    finish_make(p)
    act(p, '#layer [data-action="next"]')
    act(p, '#layer [data-action="event"]')
    finish_make(p)
    target = p.evaluate('() => TK.G.nations[1].id')
    p.locator('.ship-token').first.drag_to(p.locator(f'.island[data-id="{target}"]'))
    assert p.locator('.trade-table').count()
    box = p.locator('.tt-mine [data-drag="box"]')
    if box.count():
        box.first.drag_to(p.locator('.hold-give'))
        assert p.evaluate('() => Object.values(TK.cargo.give).reduce((a,b)=>a+b,0)') == 1, '상자 끌어 싣기'
        p.locator('.hold-give [data-action="unload"]').first.drag_to(p.locator('.tt-mine'))
        assert p.evaluate('() => Object.values(TK.cargo.give).reduce((a,b)=>a+b,0)') == 0, '상자 끌어 내리기'
    theirs = p.locator('.tt-theirs [data-drag="box"]')
    if theirs.count():
        theirs.first.drag_to(p.locator('.hold-get'))
        assert p.evaluate('() => Object.values(TK.cargo.get).reduce((a,b)=>a+b,0)') == 1, '상자 끌어 받기'
    p.keyboard.press('Escape')
    assert not p.locator('.trade-table').count(), 'Esc로 배 돌리기'
    passed('일꾼 말(놓기·옮기기·되돌리기)·배·상자 끌어다 놓기 · Esc 배 돌리기')
    # 되돌리기
    before = state(p)
    assert send_ship(p)
    act(p, '[data-action="undo"]')
    after = state(p)
    assert after['money'] == before['money'] and after['left'] == before['left']
    passed('출항 되돌리기로 돈·배가 그대로 돌아옴')
    p.context.close()


def guide_checks(browser):
    p = page(browser, tutorial=True)
    start(p)
    seen = []
    for _ in range(200):
        g = state(p)
        if g['year'] >= 3 and g['phase'] == 'ship':
            break
        bubble = p.locator('.coach-bubble')
        if bubble.count():
            ident = bubble.get_attribute('data-guide')
            if not seen or seen[-1] != ident:
                seen.append(ident)
                audit(p, f'안내 {ident}')
                box = p.evaluate('''() => {const a=document.querySelector('.coach-bubble').getBoundingClientRect();
                  return a.left>=0&&a.top>=0&&a.right<=innerWidth&&a.bottom<=innerHeight;}''')
                assert box, ('말풍선 화면 밖', ident)
            if bubble.get_attribute('data-kind') == 'confirm':
                p.locator('[data-action="coach-next"]').click()
                continue
            # 반짝이는 곳 밖을 누르면 막힌다.
            if ident == 'y1-plus':
                p.locator('[data-action="plus"][data-i="3"]').click(force=True)
                assert p.evaluate('() => TK.G.nations[0].allocation[3]') == 0, '안내 중 다른 버튼이 눌림'
            target = p.evaluate('() => TK.coach.target')
            if ident.endswith('event'):
                p.locator('#layer [data-action="event"]').first.click()
            elif ident == 'y1-plus':
                p.locator('[data-action="plus"][data-i="0"]').click()
            elif ident in ('y1-assign', 'y2-assign'):
                best = p.evaluate('() => TK.E.best(TK.G.nations[0])')
                while p.locator(f'[data-action="plus"][data-i="{best}"]:enabled').count():
                    p.locator(f'[data-action="plus"][data-i="{best}"]').click()
            elif ident in ('y2-give', 'y2-get'):
                p.locator(('.tt-mine' if ident == 'y2-give' else '.tt-theirs') + ' [data-action="load"]:enabled').first.click()
            elif ident == 'y2-more':
                p.locator('#app [data-action="next"]').click()
                if p.locator('[data-action="confirm-next"]').count():
                    p.locator('[data-action="confirm-next"]').click()
            else:
                p.locator(target).first.click()
                if p.locator('[data-action="confirm-next"]').count():
                    p.locator('[data-action="confirm-next"]').click()
            continue
        # 안내가 없는 단계는 평소처럼 진행
        if g['phase'] == 'event':
            p.locator('#layer [data-action="event"]').first.click()
        elif g['phase'] == 'make':
            finish_make(p)
        elif g['phase'] == 'ship':
            p.locator('#app [data-action="next"]').click()
            p.locator('[data-action="confirm-next"]').click()
        else:
            p.locator('#layer [data-action="next"]').click()
    need = ['y1-order', 'y1-event', 'y1-basket', 'y1-plus', 'y1-best', 'y1-assign', 'y1-make', 'y1-score', 'y2-map', 'y2-island', 'y2-give', 'y2-get', 'y2-sail', 'y2-compare', 'protect']
    missing = [x for x in need if x not in seen]
    assert not missing, (missing, seen)
    passed(f'해 보면서 배우는 안내 {len(seen)}단계 · 다른 버튼 막힘 · 말풍선 화면 안')
    # 안내 끄기
    p.locator('[data-action="title"]').click()
    start(p)
    p.locator('[data-action="coach-off"]').click()
    p.locator('[data-action="coach-stop"]').click()
    assert not p.locator('.coach-bubble').count()
    assert p.evaluate(f'() => JSON.parse(localStorage.getItem("{PROGRESS}")).tutorialEnabled') is False
    passed('안내 끄기는 다음 접속에도 유지')
    p.context.close()


def save_checks(browser):
    p = page(browser)
    start(p)
    play_year(p)
    assert state(p)['year'] == 2
    p.reload(wait_until='networkidle')
    p.locator('[data-action="continue"]').click()
    assert state(p)['year'] == 2 and state(p)['phase'] == 'event'
    passed('해가 시작될 때 저장 · 이어하기')
    p.evaluate(f'() => {{const old=JSON.parse(localStorage.getItem("{SAVE}"));old.version=4.3;localStorage.setItem("{SAVE}",JSON.stringify(old));}}')
    p.reload(wait_until='networkidle')
    assert p.locator('[data-action="continue"]').count() == 0
    passed('4.x 저장은 이어하기에서 제외')
    p.context.close()
    p = page(browser, progress={'endings': ['power'], 'events': [], 'badges': [], 'countryEndings': {}, 'best': {}})
    p.evaluate(f"""() => localStorage.setItem('{PROGRESS}', JSON.stringify({{endings:TK.T.endings.map(e=>e.id),events:TK.T.events.map(e=>e.id),badges:TK.T.badges.map(b=>b.id),countryEndings:{{}},best:{{}},tutorialEnabled:false}}))""")
    p.reload(wait_until='networkidle')
    p.locator('[data-action="new"]').click()
    assert p.locator('.country-card:disabled').count() == 0
    p.locator('#challenge').select_option('no-protect')
    p.locator('[data-action="country"][data-id="daon"]').click()
    assert p.evaluate('() => TK.G.challenge') == 'no-protect'
    passed('전체 해금 · 도전 규칙 선택')
    p.context.close()
    p = page(browser, debug=False)
    assert p.evaluate('() => typeof window.TK') == 'undefined'
    start_plain = p.locator('[data-action="new"]')
    start_plain.click()
    p.locator('[data-action="country"][data-id="daon"]').click()
    assert p.locator('[data-action="debug-year"]').count() == 0
    passed('일반 모드에서 디버그 핸들과 버튼 숨김')
    p.context.close()
    p = page(browser, 390, 844)
    start(p)
    assert p.evaluate('() => document.documentElement.scrollWidth <= innerWidth + 1')
    shot(p, 'phone')
    passed('폰 390px: 가로 넘침 없음(세로 스크롤 허용)')
    p.context.close()


ONLY = os.environ.get('ONLY')
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe')
    if ONLY:
        globals()[ONLY](browser)
        raise SystemExit(0 if not errors else errors)
    full_game(browser)
    size_checks(browser)
    input_checks(browser)
    guide_checks(browser)
    save_checks(browser)
    assert not errors, errors
    Path(__file__).with_name('verify-results.json').write_text(json.dumps({'ok': True, 'checks': checks, 'errors': errors}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    browser.close()
print('ALL PASS', flush=True)
