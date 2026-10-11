"""삼권 스와이프 전용 Playwright 검증. 결과는 check-verify/에만 저장합니다."""
import hashlib
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT.parent / 'output/playwright/python-packages'))
from playwright.sync_api import sync_playwright

OUT = ROOT / 'check-verify'
OUT.mkdir(exist_ok=True)
SIZES = [(1366, 768), (1280, 800), (1024, 768), (768, 1024), (390, 844)]
URL = 'http://localhost:8790/samgwon-swipe/?debug=1'
RESULT = {'viewports': SIZES, 'checks': [], 'layout': [], 'errors': [], 'requests_failed': []}
PROTECTED = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
             for p in [ROOT / 'js/data.js', ROOT / 'SPEC.md']}


def record(name, value=True):
    RESULT['checks'].append({'name': name, 'result': value})
    save()


def save():
    (OUT / 'playwright-results.json').write_text(json.dumps(RESULT, ensure_ascii=False, indent=2), encoding='utf-8')


def watch(page, label):
    page.on('pageerror', lambda error: RESULT['errors'].append({'page': label, 'type': 'pageerror', 'text': str(error)}))
    def console(message):
        if message.type != 'error':
            return
        target = 'expected_image_errors' if label == 'images-blocked' and 'Failed to load resource' in message.text else 'errors'
        if label == 'keyboard-home' and message.location.get('url') == 'http://localhost:8790/favicon.ico':
            target = 'external_page_errors'
        RESULT.setdefault(target, []).append({'page': label, 'type': 'console', 'text': message.text, 'location':message.location})
    page.on('console', console)
    page.on('requestfailed', lambda request: RESULT['requests_failed'].append({'page': label, 'url': request.url, 'reason': request.failure}))


def click(page, selector):
    page.locator(selector).first.click()


def shot(page, name):
    page.wait_for_timeout(80)
    page.evaluate("""async () => {
      await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.decode().catch(()=>{})));
    }""")
    page.screenshot(path=str(OUT / f'{name}.png'), full_page=True, animations='disabled',
                    style='.debug-panel{visibility:hidden!important}')


def inspect(page, label, fixed=False):
    page.evaluate("() => document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).forEach(a=>a.finish())")
    issues = page.evaluate("""fixed => {
      const issues=[], root=document.querySelector('[role=dialog]')||document.querySelector('#app');
      if(document.documentElement.scrollWidth>innerWidth+1)issues.push('horizontal scroll');
      if(fixed && document.documentElement.scrollHeight>innerHeight+1)issues.push('vertical scroll');
      const nodes=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      for(let node;node=nodes.nextNode();) {
        if(!node.textContent.trim())continue;
        const el=node.parentElement, r=el.getBoundingClientRect(), s=getComputedStyle(el);
        if(!r.width||!r.height||s.visibility==='hidden'||el.closest('.sr-only,[aria-hidden=true]'))continue;
        const minimum=el.closest('button')?20:18;
        if(parseFloat(s.fontSize)<minimum)issues.push('small text '+s.fontSize+' '+node.textContent.trim().slice(0,35));
        if(el.clientWidth&&el.scrollWidth>el.clientWidth+2)issues.push('text overflow '+node.textContent.trim().slice(0,35));
        if(r.left < -1 || r.right>innerWidth+1)issues.push('outside x '+node.textContent.trim().slice(0,35));
      }
      for(const el of root.querySelectorAll('button,input,a')) {
        const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
        if(r.width<44||r.height<44)issues.push('small target '+Math.round(r.width)+'x'+Math.round(r.height)+' '+(el.ariaLabel||el.textContent.trim()));
        if(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2)issues.push('control overflow '+(el.ariaLabel||el.textContent.trim()));
      }
      return [...new Set(issues)];
    }""", fixed)
    RESULT['layout'].append({'screen': label, 'issues': issues})
    save()


def settle(page):
    deadline = time.monotonic() + 12
    while time.monotonic() < deadline:
        done = page.evaluate("""() => {
          const power=document.querySelector('[data-action=collect-power]'),stamp=document.querySelector('.stamp-modal');
          if(power)power.click();else if(stamp)stamp.click();
          return !SamgwonDebug.locked && !document.querySelector('[role=dialog]');
        }""")
        if done:
            return
        page.wait_for_timeout(80)
    shot(page, 'transition-timeout')
    state = page.evaluate('({run:SamgwonDebug.run,locked:SamgwonDebug.locked,dialog:document.querySelector("[role=dialog]")?.innerText,focus:document.activeElement?.outerHTML})')
    raise AssertionError('선택 후 전환이 끝나지 않음: ' + json.dumps(state, ensure_ascii=False))


def gauges_match(page):
    assert page.evaluate("""() => Object.entries(SamgwonDebug.run.gauges).every(([k,v]) =>
      Number(document.querySelector(`[data-gauge="${k}"]`).getAttribute('aria-valuenow'))===v &&
      (k==='w' ? Number(document.querySelector('.power-meter').style.getPropertyValue('--value'))===v :
      document.querySelector(`[data-gauge="${k}"] .gauge-fill`).style.transform===`scaleY(${v/100})`))"""), '화면과 엔진 게이지 불일치'


def start(page, role, tutorial=False):
    click(page, '[data-action=start]')
    if page.locator('#player-name').count():
        page.locator('#player-name').fill('검증이')
        click(page, '[data-face="2"]')
        click(page, '[data-action=save-profile]')
    click(page, f'[data-role={role}]')
    click(page, '[data-action=begin]')
    if page.locator('[data-action=tutorial-next]').count():
        if tutorial:
            for i in range(3):
                inspect(page, f'tutorial-{i}-{page.viewport_size["width"]}')
                shot(page, f'tutorial-{i}-{page.viewport_size["width"]}')
                click(page, '[data-action=tutorial-next]')
        else:
            click(page, '[data-action=tutorial-skip]')


def back_title(page):
    if page.locator('.game-screen').count():
        click(page, '[data-action=pause]')
        click(page, '[data-action=leave]')
        inspect(page, f'leave-{page.viewport_size["width"]}')
        assert page.evaluate("""() => {
          const dialog=document.querySelector('[role=dialog]'), h=dialog.querySelector('h2').getBoundingClientRect(),
                b=dialog.querySelector('[data-action=close-modal]').getBoundingClientRect();
          return b.top>=h.bottom && !dialog.querySelector('[data-action=close-modal]').classList.contains('modal-close');
        }"""), '임기 종료 확인창의 계속하기 버튼이 제목을 덮음'
        shot(page, f'leave-{page.viewport_size["width"]}x{page.viewport_size["height"]}')
        click(page, '[data-action=leave-confirm]')
    elif page.locator('[data-action=roles]').count():
        click(page, '[data-action=roles]')
        click(page, '[data-action=title]')
    else:
        page.reload()


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
        try:
            for width, height in SIZES:
                context = browser.new_context(viewport={'width': width, 'height': height})
                page = context.new_page()
                watch(page, f'web-{width}x{height}')
                page.goto(URL)
                page.wait_for_function('!!window.SamgwonDebug')
                tag = f'{width}x{height}'
                inspect(page, f'title-{tag}', True)
                shot(page, f'title-{tag}')
                click(page, '[data-action=settings]')
                inspect(page, f'settings-{tag}')
                shot(page, f'settings-{tag}')
                page.keyboard.press('Tab')
                assert page.evaluate('!!document.activeElement.closest("[role=dialog]")')
                page.keyboard.press('Escape')
                click(page, '[data-action=start]')
                inspect(page, f'profile-{tag}')
                shot(page, f'profile-{tag}')
                page.locator('#player-name').fill('검증이')
                click(page, '[data-face="2"]')
                click(page, '[data-action=save-profile]')
                inspect(page, f'roles-{tag}')
                shot(page, f'roles-{tag}')
                click(page, '[data-role=president]')
                inspect(page, f'intro-{tag}')
                shot(page, f'intro-{tag}')
                click(page, '[data-action=begin]')
                for step in range(3):
                    inspect(page, f'tutorial-{step}-{tag}')
                    shot(page, f'tutorial-{step}-{tag}')
                    click(page, '[data-action=tutorial-next]')
                for role in ['president', 'assembly', 'court']:
                    if role != 'president':
                        back_title(page)
                        start(page, role)
                    # 실제 선택을 6턴 실행하고 화면과 엔진의 숫자를 대조합니다.
                    for turn in range(6):
                        if page.locator('.game-screen').count() == 0:
                            break
                        gauges_match(page)
                        inspect(page, f'play-{role}-{turn}-{tag}', True)
                        if turn == 0:
                            shot(page, f'play-{role}-{tag}')
                        side = page.evaluate("""() => {
                          const r=SamgwonDebug.run;
                          return ['left','right'].map(side=>{
                            const c=r.card[side],g=Object.fromEntries(Object.entries(r.gauges).map(([k,v])=>[k,SamgwonRules.clamp(v+(c.fx?.[k]||0))]));
                            const score=c.ending||SamgwonRules.gaugeEnding(g)?-10000:Math.min(g.p,g.m,g.l,g.w,100-g.w)+.05*(g.p+g.m+g.l);
                            return {side,score};
                          }).sort((a,b)=>b.score-a.score)[0].side;
                        }""")
                        before = page.evaluate('SamgwonDebug.run.resolved')
                        page.locator(f'[data-choice={side}]').dispatch_event('click')
                        page.locator(f'[data-choice={side}]').dispatch_event('click')
                        settle(page)
                        assert page.evaluate('SamgwonDebug.run.resolved') == before + 1
                    record(f'실제 6턴·연타·게이지 {role} {tag}', page.evaluate('SamgwonDebug.run.resolved'))
                    if page.locator('.game-screen').count():
                        click(page, '[data-action=notebook]')
                        inspect(page, f'notebook-partial-{role}-{tag}')
                        page.keyboard.press('Escape')
                        gauges_match(page)
                        click(page, '[data-action=pause]')
                        inspect(page, f'pause-{role}-{tag}')
                        page.keyboard.press('Escape')
                    # 실제 선택으로 종료까지 진행하고 엔딩 신문을 확인합니다.
                    while page.locator('.game-screen').count():
                        page.keyboard.press('ArrowRight')
                        settle(page)
                    inspect(page, f'natural-ending-{role}-{tag}')
                    shot(page, f'natural-ending-{role}-{tag}')
                    record(f'실제 엔딩 {role} {tag}', page.evaluate('SamgwonDebug.run.ended'))
                    click(page, '[data-action=retry]')
                    assert page.locator('.intro-paper').count() == 1
                    page.reload()
                    page.wait_for_function('!!window.SamgwonDebug')
                click(page, '[data-action=sound]')
                assert page.evaluate('SamgwonDebug.progress.sound') is True
                click(page, '[data-action=sound]')
                assert page.evaluate('SamgwonDebug.progress.sound') is False
                saved = page.evaluate('JSON.stringify(SamgwonDebug.progress)')
                page.reload()
                page.wait_for_function('!!window.SamgwonDebug')
                assert page.evaluate('JSON.stringify(SamgwonDebug.progress)') == saved
                record(f'수집 기록 저장·재로드 및 소리 {tag}')
                # 원문과 규칙을 유지하고 디버그로 모든 엔딩을 표시합니다.
                for ending in page.evaluate('Object.keys(SAMGWON.endings)'):
                    page.evaluate('(id)=>{void SamgwonDebug.ending(id)}', ending)
                    settle(page)
                    assert page.locator('.newspaper h1').inner_text() == page.evaluate('(id)=>SAMGWON.endings[id].headline', ending)
                    inspect(page, f'{ending}-{tag}')
                    if ending.endswith('_legend') or ending.endswith('_power100'):
                        shot(page, f'{ending}-{tag}')
                record(f'디버그 엔딩 24/24 {tag}')
                click(page, '[data-action=endings]')
                inspect(page, f'endings-{tag}')
                shot(page, f'endings-{tag}')
                for role in ['assembly','president','court']:
                    click(page, f'[data-tab={role}]')
                    click(page, '[data-ending]')
                    inspect(page, f'ending-detail-{role}-{tag}')
                    page.keyboard.press('Escape')
                click(page, '[data-action=collection-back]')
                back_title(page)
                click(page, '[data-action=notebook]')
                inspect(page, f'notebook-{tag}')
                shot(page, f'notebook-{tag}')
                page.keyboard.press('Escape')
                start(page, 'assembly')
                page.keyboard.press('ArrowLeft')
                settle(page)
                run = page.evaluate('({turn:SamgwonDebug.run.turn,gauges:SamgwonDebug.run.gauges,card:SamgwonDebug.run.card.id})')
                page.reload()
                page.wait_for_function('!!window.SamgwonDebug')
                assert page.get_by_text('이어하기', exact=True).count() == 1
                inspect(page, f'resume-title-{tag}', True)
                shot(page, f'resume-title-{tag}')
                click(page, '[data-action=resume]')
                resumed = page.evaluate('({turn:SamgwonDebug.run.turn,gauges:SamgwonDebug.run.gauges,card:SamgwonDebug.run.card.id})')
                assert resumed == run
                gauges_match(page)
                record(f'진행 중 새로고침·이어하기 {tag}', {'before': run, 'after': resumed})
                context.close()
                print(f'Playwright {tag} 완료', flush=True)
            # file://, 저장 차단, 그림 요청 실패는 별도 컨텍스트로 격리합니다.
            for mode in ['file', 'storage-blocked', 'images-blocked']:
                context = browser.new_context(viewport={'width': 390, 'height': 844})
                if mode == 'storage-blocked':
                    context.add_init_script('Object.defineProperty(window,"localStorage",{get(){throw new DOMException("blocked","SecurityError")}})')
                if mode == 'images-blocked':
                    context.route('**/shared-art/**', lambda route: route.abort())
                page = context.new_page()
                watch(page, mode)
                page.goto((ROOT / 'index.html').as_uri() + '?debug=1' if mode == 'file' else URL)
                page.wait_for_function('!!window.SamgwonDebug')
                start(page, 'court')
                shot(page, f'{mode}-play')
                page.keyboard.press('ArrowRight')
                settle(page)
                assert page.evaluate('SamgwonDebug.run.resolved') == 1
                gauges_match(page)
                if mode == 'images-blocked':
                    assert page.evaluate("""() => [...document.querySelectorAll('.paint')].every(el=>!el.classList.contains('loaded') && el.querySelector('.paint-fallback svg'))""")
                    inspect(page, 'fallback-play', True)
                    shot(page, 'fallback-play')
                    page.evaluate('()=>{void SamgwonDebug.ending("court_complete")}')
                    settle(page)
                    shot(page, 'fallback-ending')
                if mode == 'storage-blocked':
                    click(page, '[data-action=pause]')
                    click(page, '[data-action=pause-settings]')
                    assert page.get_by_text('이 환경에서는 기록을 저장할 수 없어요.').count() == 1
                    shot(page, 'storage-blocked-settings')
                record(mode)
                context.close()
            context = browser.new_context(viewport={'width':390,'height':844})
            page = context.new_page()
            watch(page, 'keyboard-home')
            page.goto(URL)
            page.locator('.title-home').focus()
            assert page.locator('.title-home').evaluate("el=>getComputedStyle(el).outlineStyle") != 'none'
            page.keyboard.press('Enter')
            page.wait_for_url('http://localhost:8790/index.html')
            record('게임 목록 링크 Tab 포커스·Enter 이동')
            context.close()
            assert not RESULT['errors'], RESULT['errors']
            assert not [screen for screen in RESULT['layout'] if screen['issues']], [screen for screen in RESULT['layout'] if screen['issues']]
        finally:
            browser.close()
            RESULT['protected_unchanged'] = all(hashlib.sha256((ROOT / p).read_bytes()).hexdigest() == h for p,h in PROTECTED.items())
            save()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        RESULT['fatal'] = str(error)
        save()
        raise
