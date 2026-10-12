"""투자 미리보기·옛 저장·말풍선·결과 설명을 실제 브라우저에서 확인한다."""
import json
import os
import atexit
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/playwright/tteok'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('TTEOK_VERIFY_URL', 'http://localhost:8790/tteok-tycoon/')
errors = []
checked = []
atexit.register(lambda: (OUT / 'results.json').write_text(json.dumps({'checked': checked, 'errors': errors}, ensure_ascii=False, indent=2), encoding='utf-8'))


def fixture(page, upgrade='cheese', owned=None, evening=False):
    page.evaluate("""({upgrade,owned,evening}) => {
      const G=TteokEngine.newGame(7); G.money=500000; G.owned=owned||{};
      if(G.owned.cheese)G.taste+=1;
      if(G.owned.sundae)G.taste+=.5;
      G.offers=[upgrade,...Object.keys(TTEOK.upgrades).filter(k=>k!==upgrade)].slice(0,3);
      const plan={price:3000,portions:40,upgrade:null};
      const resume={phase:'morning',events:[]};
      if(evening){
        resume.phase='evening';resume.before={money:G.money,rep:G.rep};
        resume.res=TteokEngine.simulate(G,plan);
        delete resume.res.decisions;delete resume.res.ingredient;
      }
      for(const k of ['responseCut','responseTaste','responseTurns','leadDays','rivalNews'])delete G[k];
      localStorage.setItem('tteok-tycoon-v1',JSON.stringify({tutorialSeen:true}));
      localStorage.setItem('tteok-tycoon-v2-game',JSON.stringify({G,plan,resume}));
    }""", {'upgrade': upgrade, 'owned': owned, 'evening': evening})
    page.reload()
    page.locator('[data-action="continue"]').click()
    page.wait_for_selector('.evening' if evening else '.morning')


def check_width(page):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), '가로 화면 넘침'


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(URL)
    for upgrade in ['cheese', 'sundae', 'chairs', 'staff', 'clean', 'flyer']:
        fixture(page, upgrade)
        before = page.evaluate("JSON.parse(localStorage.getItem('tteok-tycoon-v2-game')).G")
        page.locator(f'[data-up="{upgrade}"]').click()
        expected = page.evaluate("""()=>{
          const {G,plan}=JSON.parse(localStorage.getItem('tteok-tycoon-v2-game'));
          const p=TteokEngine.plannedState(G,plan);
          return {G,cap:TteokEngine.capacity(G,plan),vis:TteokEngine.expectedVisitors(G,plan),
            taste:p.taste,rep:p.rep,ingredient:p.ingredient,
            spend:plan.portions*p.ingredient+TTEOK.rent+TteokEngine.wages(G,plan)+TTEOK.upgrades[plan.upgrade].cost};
        }""")
        assert expected['G'] == before, '카드를 고르기만 했는데 실제 상태가 바뀜'
        assert page.locator('.cap-note').inner_text() == f"최대 {expected['cap']}그릇 판매"
        assert f"지나가는 아이 {expected['vis']}명" in page.locator('.chips').inner_text()
        assert f"1그릇 재료비 {expected['ingredient']:,}원" in page.locator('.chips').inner_text()
        assert page.locator('.spend b').inner_text() == f"{expected['spend']:,}원"
        if upgrade in ['cheese', 'sundae', 'clean']:
            assert '→' in page.locator('.plan-stats').inner_text()
        page.locator(f'[data-up="{upgrade}"]').click()
        assert '→' not in page.locator('.plan-stats').inner_text()
        checked.append('투자 ' + upgrade)
    fixture(page, 'cheese', {'cheese': True, 'sundae': True})
    assert '1그릇 재료비 1,200원' in page.locator('.chips').inner_text()
    fixture(page, evening=True)
    assert page.locator('.choice-summary').inner_text() == ''
    assert '원' in page.locator('.receipt').inner_text()
    checked.append('옛 아침·저녁 저장')

    for width in [1280, 390, 320]:
        page.set_viewport_size({'width': width, 'height': 844})
        fixture(page)
        page.locator('[data-action="por-up"]').click()
        assert page.locator('.val').last.inner_text() == '45그릇'
        assert '5그릇은 만들어도 못 팔아요' in page.locator('.waste').inner_text()
        page.locator('[data-up="cheese"]').click()
        check_width(page)
        page.screenshot(path=str(OUT / f'{width}-morning.png'), full_page=True)
        for painted in [True, False]:
            fixture(page)
            # 이동과 말풍선 검사는 모든 경로를 반복하는 고정 손님 표본으로 한다.
            page.evaluate("""painted=>{
              const simulate=TteokEngine.simulate;
              TteokEngine.simulate=(...args)=>{
                const r=simulate(...args);r.truck=true;
                r.kids=Array.from({length:42},(_,i)=>['mine','rival','truck','none','soldout'][i%5]);
                r.decisions=r.kids.map(choice=>({choice,reason:{mine:'taste',rival:'loyalty',truck:'price',none:'budget',soldout:'soldout'}[choice],saving:choice==='truck'?500:0}));
                return r;
              };
              Math.random=()=>.1;
              if(!painted){const scene=TycoonArt.scene;TycoonArt.scene=o=>scene(o,false);}
            }""", painted)
            page.locator('[data-action="open"]').click()
            page.wait_for_selector('.bubble-s')
            page.wait_for_timeout(2100)
            bubbles = page.evaluate("""()=>[...document.querySelectorAll('.bubble-s')].map(e=>{
              const r=e.getBoundingClientRect(),s=e.closest('.scene-wrap').getBoundingClientRect();
              return {text:e.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,
                inside:r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom,
                count:e.parentElement.children.length, inKid:!!e.closest('.kid')};
            })""")
            assert bubbles and all(b['inside'] and not b['inKid'] for b in bubbles), bubbles
            assert all(b['count'] <= (2 if width <= 600 else 3) for b in bubbles)
            check_width(page)
            page.screenshot(path=str(OUT / f'{width}-bubbles-{painted}.png'), full_page=True)
            page.locator('[data-action="skip"]').click()
            assert page.locator('.bubble-s').count() == 0
            page.wait_for_selector('.evening')
            check_width(page)
            checked.append(f'{width} 말풍선 그림={painted}')
        fixture(page)
        page.locator('[data-action="open"]').click()
        page.locator('[data-action="skip"]').click()
        page.wait_for_selector('.evening')
        res = page.evaluate("JSON.parse(localStorage.getItem('tteok-tycoon-v2-game')).resume.res")
        assert f"지나간 아이 {res['visitors']}명은 어디로?" in page.locator('.e-side').inner_text()
        lines = page.evaluate('(r)=>TteokEngine.choiceSummary(r).map(x=>x.text)', res)
        assert page.locator('.choice-summary p').all_text_contents() == lines
        page.screenshot(path=str(OUT / f'{width}-evening.png'), full_page=True)
    page.goto('http://localhost:8790/guides/tteok.html')
    assert '10~80그릇, 5그릇씩' in page.locator('body').inner_text()
    assert '그릇마다 300원' in page.locator('body').inner_text()
    check_width(page)
    browser.close()

(OUT / 'results.json').write_text(json.dumps({'checked': checked, 'errors': errors}, ensure_ascii=False, indent=2), encoding='utf-8')
assert not errors, errors
print('개선 검증 통과:', len(checked), '개 / 콘솔 오류:', len(errors))
