"""라이어 결과·의심 이유·증거 확대·중복 카드 효과를 실제 브라우저에서 검증한다."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = os.environ.get('LIAR_VERIFY_URL', 'http://127.0.0.1:8790/fake-traveler/')
OUT = Path(__file__).resolve().parents[2] / 'output/liar-interactions'
OUT.mkdir(parents=True, exist_ok=True)
FIXTURE = """seed => {
  let s = Liar.apply(Liar.newContest({seed}), {type:'start'}).state;
  while(s.phase==='play') s=Liar.apply(s,Liar.decide(s,Liar.current(s))).state;
  while(s.phase==='vote') {
    const seat=s.seats.findIndex(x=>x.vote===null);
    s=Liar.apply(s,Liar.decide(s,seat)).state;
  }
  localStorage.setItem('fake-traveler-v1-liar',JSON.stringify({state:s,intro:0}));
  return s;
}"""

def fit(page):
    dialog = page.locator('dialog[open]')
    dialog.evaluate("e=>Promise.all([...e.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})))")
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), '가로 넘침'
    assert dialog.locator('h2').evaluate('e=>e.getBoundingClientRect().top>=e.closest("dialog").getBoundingClientRect().top'), '결과 제목 잘림'
    if not dialog.evaluate('e=>e.scrollHeight<=e.clientHeight+1'):
        # 낮은 화면에서는 결과 창 안을 스크롤해 마지막 버튼까지 볼 수 있어야 한다.
        assert page.viewport_size['height'] < 650, '일반 화면 결과 창 세로 넘침'
        assert dialog.evaluate('e=>["auto","scroll"].includes(getComputedStyle(e).overflowY)'), '결과 창 내부 스크롤 가능'
        last=dialog.locator('button').last
        last.scroll_into_view_if_needed()
        assert last.evaluate('e=>{const r=e.getBoundingClientRect(),d=e.closest("dialog").getBoundingClientRect();return r.top>=d.top&&r.bottom<=d.bottom;}'), '마지막 버튼 접근 가능'
        dialog.evaluate('e=>e.scrollTop=0')

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width,height in [(1280,800),(1024,768),(390,844),(320,568)]:
        page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        for seed in [7,17,27]:
            page.goto(URL,wait_until='networkidle')
            page.wait_for_function('window.Liar && window.FT && (!window.GameAssets || GameAssets.finished)')
            state=page.evaluate(FIXTURE,seed)
            page.get_by_role('button',name='라이어 여행단',exact=False).click()
            page.locator('[data-action="liar-resume"]').click()
            page.locator('.liar-result').wait_for()
            fit(page)
            assert '점수' in page.locator('.lr-panel').inner_text()
            assert '칩' not in page.locator('dialog').inner_text()
            page.locator('[data-tab="learn"]').click()
            fit(page)
            page.locator('[data-tab="reason"]').click()
            for seat in range(4):
                page.locator('.lr-people [data-seat="%s"]'%seat).click()
                text=page.locator('.lr-why').inner_text()
                who=page.evaluate('(who)=>FAKE.travelers[who].name',state['seats'][seat]['who'])
                assert who in text
                target=state['seats'][seat]['vote']
                name=page.evaluate('(who)=>FAKE.travelers[who].name',state['seats'][target]['who'])
                assert name in text
                if seat==0: assert '직접 선택' in text
                fit(page)
            page.get_by_role('button',name='닫기',exact=True).click()
            assert page.locator('dialog[open]').count()==0
            assert page.locator('.seat .vote-tag').count()==4
            for seat in range(4):
                page.locator('.seat[data-seat="%s"] .vote-tag'%seat).click()
                assert page.locator('.lr-why').is_visible()
                page.get_by_role('button',name='카드 다시 보기',exact=False).click()
                assert page.locator('dialog[open]').count()==0
            evidence=page.locator('.seat-cards button').first
            evidence.click()
            assert page.locator('.zoom-evidence').is_visible()
            page.get_by_role('button',name='닫기',exact=True).click()
            assert page.locator('dialog[open]').count()==0
            page.get_by_role('button',name='결과 다시 보기',exact=False).click()
            fit(page)
            page.screenshot(path=str(OUT/f'result-{width}-{seed}.png'))
            page.keyboard.press('Escape')
            assert page.locator('dialog[open]').count()==0
        assert not errors,errors
        print(f'{width}x{height}: 결과·4명 의심 이유·증거 확대 통과')
        page.close()
    page=browser.new_page(viewport={'width':1280,'height':800})
    page.goto(URL,wait_until='networkidle')
    page.wait_for_function('window.Liar && window.FT && (!window.GameAssets || GameAssets.finished)')
    card=page.evaluate("""() => {
      let s;
      for(let seed=1;seed<100;seed++) {
        s=Liar.apply(Liar.newContest({seed}),{type:'start'}).state;
        if(Liar.current(s)===0) break;
      }
      const card=s.seats[0].hand.find(c=>c.type==='item') || s.seats[0].hand[0];
      // 다른 여행자가 같은 카드 ID를 먼저 제출한 상황을 재현한다.
      s.seats[1].played=[card];s.seats[1].hand.pop();
      localStorage.setItem('fake-traveler-v1-liar',JSON.stringify({state:s,intro:0}));
      return card.id;
    }""")
    page.get_by_role('button',name='라이어 여행단',exact=False).click()
    page.locator('[data-action="liar-resume"]').click()
    page.locator('[data-action="liar-card"][data-card="%s"]'%card).click()
    page.locator('[data-action="liar-play"]').click()
    assert page.locator('.seat-cards .new').count()==1
    assert page.locator('.seat[data-seat="0"] .new').count()==1
    assert page.locator('.seat[data-seat="1"] .new').count()==0
    assert page.locator('.new').evaluate("e=>getComputedStyle(e).animationName")=='card-in'
    print('중복 카드: 새로 제출한 여행자의 카드만 등장 효과 통과')
    page.close()
    browser.close()
