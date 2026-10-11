"""열린 도감·긴 사건·거리 원근을 다섯 화면 크기에서 확인한다."""
import atexit
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT / 'output/playwright/python-packages'))
from playwright.sync_api import sync_playwright

OUT = ROOT / 'tteok-tycoon/check-verify'
RESULT = {'cases': [], 'errors': []}
URL = os.environ.get('TTEOK_VERIFY_URL', 'http://localhost:8790/tteok-tycoon/?debug=1')
atexit.register(lambda: (OUT/'review-results.json').write_text(json.dumps(RESULT, ensure_ascii=False, indent=2), encoding='utf-8'))


def shot(page, name):
    page.evaluate("async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))}")
    page.evaluate("for(const a of document.getAnimations())if(a.effect.getTiming().iterations!==Infinity)a.finish()")
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), name
    assert page.evaluate("[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height&&!e.closest('.debug')).every(e=>e.getBoundingClientRect().height>=44&&e.getBoundingClientRect().width>=44)"), name
    page.screenshot(path=str(OUT/(name+'.png')), full_page=True)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    for w, h in [(1366,768),(1280,800),(1024,768),(768,1024),(390,844)]:
        page = browser.new_page(viewport={'width':w,'height':h}, reduced_motion='reduce')
        page.on('pageerror', lambda e: RESULT['errors'].append(str(e)))
        page.on('console', lambda m: RESULT['errors'].append(m.text) if m.type=='error' else None)
        page.goto(URL)
        page.evaluate("""()=>{
          const G=TteokEngine.newGame(420);G.day=1;G.money=500000;
          G.owned={chairs:true,staff:true,cheese:true,clean:true};
          G.schedule[1]={...G.schedule[0],id:'review'};
          G.pending=[{id:'truck',day:1,root:'cartel'}];
          const events=TteokEngine.morningEvents(G);
          localStorage.setItem('tteok-tycoon-v1',JSON.stringify({tutorialSeen:true,sound:false,
            endings:TTEOK.endings.map(e=>e.id),badges:TTEOK.badges.map(b=>b.id),
            found:Object.entries(TTEOK.chains).flatMap(([id,c])=>TTEOK.nodes[c.branch].options.map(o=>id+':'+o.key))}));
          localStorage.setItem('tteok-tycoon-v2-game',JSON.stringify({G,plan:{price:2500,portions:40,upgrade:null},resume:{phase:'morning',events}}));
        }""")
        page.reload()
        page.locator('[data-action="endings"]').click()
        assert page.locator('.chain-card.done').count()==4
        shot(page,f'{w}x{h}-unlocked-collection')
        page.locator('.chain-wall').screenshot(path=str(OUT/f'{w}x{h}-unlocked-chains.png'))
        page.locator('[data-action="title"]').click()
        page.locator('[data-action="continue"]').click()
        page.wait_for_selector('.choices.n3')
        shot(page,f'{w}x{h}-three-choices')
        page.locator('.choices [data-k="b"]').click()
        shot(page,f'{w}x{h}-choice-result')
        page.locator('#layer [data-action="ok"]').click()
        page.wait_for_selector('#layer', state='hidden')
        # 모든 이동 경로가 나오도록 검사 중의 반환값만 바꾼다.
        page.evaluate("""()=>{const simulate=TteokEngine.simulate;TteokEngine.simulate=(...args)=>{
          const r=simulate(...args);r.kids=Array.from({length:20},(_,i)=>['mine','rival','truck','soldout','none'][i%5]);return r;};}""")
        page.locator('[data-action="open"]').click()
        page.wait_for_selector('.kid.go-none')
        shot(page,f'{w}x{h}-perspective')
        geometry=page.evaluate("""()=>({scene:document.querySelector('.scene-wrap').getBoundingClientRect().toJSON(),
          staff:document.querySelector('.prop-staff').getBoundingClientRect().toJSON(),
          kids:[...document.querySelectorAll('.kid')].map(e=>({route:e.className,scale:+e.style.getPropertyValue('--s'),width:e.getBoundingClientRect().width}))})""")
        scale={k['route'].split()[1]:k['scale'] for k in geometry['kids']}
        assert scale['go-mine']==scale['go-rival']==1.15, scale
        assert scale['go-none']>scale['go-mine'], scale
        assert geometry['staff']['height']>max(k['width']*1.6 for k in geometry['kids']), geometry
        scene=geometry['scene']
        assert abs(scene['width']/scene['height']-16/9)<.01, scene
        RESULT['cases'].append({'size':f'{w}x{h}','pass':True,'geometry':geometry})
        print('REVIEW',w,h,flush=True)
        page.close()
    browser.close()
assert len(RESULT['cases'])==5 and not RESULT['errors'], RESULT
