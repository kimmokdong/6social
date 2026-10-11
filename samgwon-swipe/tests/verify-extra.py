"""권한 알림 18종, 사건 연결, 확인창·홈 링크의 회귀 검사."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT.parent / 'output/playwright/python-packages'))
from playwright.sync_api import sync_playwright
OUT = ROOT / 'check-verify'
OUT.mkdir(exist_ok=True)
URL = 'http://localhost:8790/samgwon-swipe/?debug=1'
results = {'powers': [], 'errors': [], 'checks': [], 'http_errors': [], 'external_page_errors': []}


def settle(page):
    for _ in range(100):
        done = page.evaluate("""() => {
          const power=document.querySelector('[data-action=collect-power]'),stamp=document.querySelector('.stamp-modal');
          if(power)power.click();else if(stamp)stamp.click();
          return !SamgwonDebug.locked && !document.querySelector('[role=dialog]');
        }""")
        if done:
            return
        page.wait_for_timeout(100)
    raise AssertionError('선택 전환 시간 초과')


with sync_playwright() as p:
    b = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    try:
        context = b.new_context()
        page = context.new_page()
        page.on('pageerror', lambda error: results['errors'].append(str(error)))
        def console(msg):
            if msg.type == 'error':
                target = 'external_page_errors' if msg.location.get('url') == 'http://localhost:8790/favicon.ico' else 'errors'
                results[target].append({'text':msg.text,'location':msg.location})
        page.on('console', console)
        page.on('response', lambda response: results['http_errors'].append({'url':response.url,'status':response.status}) if response.status >= 400 else None)
        page.goto(URL)
        ids = page.evaluate('Object.keys(SAMGWON.powers)')
        for width, height in [(1366,768),(1280,800),(1024,768),(768,1024),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            for power in ids:
                page.evaluate("""id=>localStorage.setItem('samgwon-swipe-v1',JSON.stringify({name:'검증이',profileSeen:true,tutorialSeen:true,sound:false,powers:Object.keys(SAMGWON.powers).filter(p=>p!==id)}))""", power)
                page.reload()
                page.wait_for_function('!!window.SamgwonDebug')
                page.evaluate("""id=>{
                  const c=SAMGWON.cards.find(c=>c.power===id||c.left.power===id||c.right.power===id);
                  if(c){SamgwonDebug.card(c.id);void SamgwonDebug.choose(c.right.power===id?'right':'left');}
                  else{void SamgwonDebug.ending(Object.keys(SAMGWON.endings).find(e=>SAMGWON.endings[e].powers?.includes(id)));}
                }""", power)
                page.locator('[data-action=collect-power]').wait_for()
                page.evaluate("() => document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).forEach(a=>a.finish())")
                issues = page.locator('.power-modal').evaluate("""el=>{
                  const issues=[],r=el.getBoundingClientRect();
                  if(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight)issues.push('modal outside');
                  for(const n of el.querySelectorAll('h2,p,button'))if(n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2)issues.push('overflow '+n.textContent);
                  return issues;
                }""")
                results['powers'].append({'id':power,'viewport':f'{width}x{height}','issues':issues})
                if width == 390 and (issues or power == 'G5'):
                    page.screenshot(path=str(OUT / f'power-{power}-{width}x{height}.png'),animations='disabled',style='.debug-panel{visibility:hidden!important}')
                settle(page)
            print(f'권한 알림 18종 {width}x{height} 완료', flush=True)
        page.set_viewport_size({'width':390,'height':844})
        page.goto(URL)
        page.evaluate('SamgwonDebug.intro("assembly");SamgwonDebug.begin()')
        page.locator('[data-action=pause]').click()
        page.locator('[data-action=leave]').click()
        assert page.locator('[data-action=close-modal]').evaluate('el=>!el.classList.contains("modal-close")')
        assert page.locator('[data-action=close-modal]').evaluate('el=>el.getBoundingClientRect().top>=document.querySelector("[role=dialog] h2").getBoundingClientRect().bottom')
        page.screenshot(path=str(OUT / 'leave-after.png'),animations='disabled',style='.debug-panel{visibility:hidden!important}')
        page.locator('[data-action=leave-confirm]').click()
        results['checks'].append('확인창 제목·계속하기 버튼 분리')
        page.locator('.title-home').focus()
        page.keyboard.press('Enter')
        page.wait_for_url('http://localhost:8790/index.html')
        results['checks'].append('게임 목록 링크 Enter 이동')
        page.goto(URL)
        page.evaluate('SamgwonDebug.card("P02")')
        page.locator('[data-choice=right]').click()
        settle(page)
        assert page.evaluate('SamgwonDebug.run.turn') == 2
        side = page.evaluate("""()=>['left','right'].map(side=>{const r=SamgwonDebug.run,c=r.card[side];return{side,score:(r.gauges.l+(c.fx?.l||0))-Math.abs(50-r.gauges.w-(c.fx?.w||0))-(c.ending?1000:0)}}).sort((a,b)=>b.score-a.score)[0].side""")
        page.locator(f'[data-choice={side}]').click()
        settle(page)
        assert page.evaluate('SamgwonDebug.run.card.id') == 'P02b'
        page.screenshot(path=str(OUT / 'chain-P02b.png'),animations='disabled',style='.debug-panel{visibility:hidden!important}')
        page.locator('[data-choice=right]').click()
        page.locator('.stamp-modal').wait_for()
        page.screenshot(path=str(OUT / 'stamp-overreach.png'),animations='disabled',style='.debug-panel{visibility:hidden!important}')
        settle(page)
        assert page.evaluate('SamgwonDebug.run.card.id') == 'P02c'
        page.locator('[data-choice=right]').click()
        settle(page)
        assert page.evaluate('SamgwonDebug.run.ended') == 'pres_scandal'
        results['checks'].append('P02 → 두 턴 뒤 P02b → P02c → 스캔들 엔딩')
        for scheme in ['http', 'file']:
            page.goto(URL if scheme == 'http' else (ROOT / 'index.html').as_uri() + '?debug=1')
            page.evaluate("""()=>{localStorage.setItem('samgwon-swipe-v1',JSON.stringify({name:'검증이',profileSeen:true,tutorialSeen:true}));}""")
            page.reload()
            page.evaluate('SamgwonDebug.card("P02")')
            page.locator('[data-choice=right]').click()
            # 게이지 반영 뒤 권한/도장 전환 중에도 다음 카드를 저장합니다.
            page.wait_for_function('SamgwonDebug.run.resolved===1 && SamgwonDebug.progress.activeRun?.card===SamgwonDebug.run.card?.id')
            checkpoint = page.evaluate('JSON.stringify(SamgwonRules.snapshot(SamgwonDebug.run))')
            page.reload()
            page.locator('[data-action=resume]').click()
            assert page.evaluate('JSON.stringify(SamgwonRules.snapshot(SamgwonDebug.run))') == checkpoint
            assert page.evaluate('SamgwonDebug.run.queue[0].id') == 'P02b'
            before = page.evaluate('SamgwonDebug.run.resolved')
            page.keyboard.press('ArrowLeft')
            settle(page)
            assert page.evaluate('SamgwonDebug.run.resolved') == before + 1
            assert page.evaluate('SamgwonDebug.run.card.id') == 'P02b'
            results['checks'].append(f'{scheme}: 전환 중 새로고침·전체 임기 상태 복원·연결 사건 유지')
            page.locator('[data-action=pause]').click()
            page.locator('[data-action=leave]').click()
            page.locator('[data-action=close-modal]').click()
            assert page.locator('.game-screen').count() == 1
            page.locator('[data-action=pause]').click()
            page.locator('[data-action=leave]').click()
            page.locator('[data-action=leave-confirm]').click()
            page.reload()
            assert page.locator('[data-action=resume]').count() == 0
            results['checks'].append(f'{scheme}: 그만두기 취소·확정 후 임기 제거')
        page.goto(URL)
        page.evaluate("""()=>localStorage.setItem('samgwon-swipe-v1',JSON.stringify({name:'보존',endings:['pres_complete'],powers:['G1'],activeRun:{role:'president',queue:[null]}}))""")
        page.reload()
        assert page.evaluate('SamgwonDebug.progress.name') == '보존'
        assert page.evaluate('SamgwonDebug.progress.endings[0]') == 'pres_complete'
        assert page.evaluate('SamgwonDebug.progress.activeRun') is None
        results['checks'].append('손상된 임기만 버리고 기존 이름·수집 기록 보존')
        page.evaluate('SamgwonDebug.card("P34")')
        page.locator('[data-choice=left]').click()
        page.locator('.stamp-modal').wait_for()
        page.evaluate("() => document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).forEach(a=>a.finish())")
        page.screenshot(path=str(OUT / 'stamp-nocheck.png'),animations='disabled',style='.debug-panel{visibility:hidden!important}')
        page.keyboard.press('Enter')
        settle(page)
        results['checks'].append('견제 실패 도장·Enter 닫기')
        assert not [p for p in results['powers'] if p['issues']], results['powers']
        assert not results['errors'], results['errors']
    finally:
        b.close()
        (OUT / 'extra-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
