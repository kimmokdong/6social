"""라이어 전용 도감의 비교 판정, 사진 수집, 배지, 기록과 화면을 검증한다."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path.cwd()
URL = 'http://127.0.0.1:8790/fake-traveler/'
OUT = ROOT / 'output/playwright/climate-book'
OUT.mkdir(parents=True, exist_ok=True)

# 비공개 손패를 공개하지 않고 실제 버튼으로 한 라운드를 진행한다.
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    errors = []
    page = browser.new_page(viewport={'width':1366, 'height':768}, reduced_motion='reduce')
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(URL)
    page.wait_for_selector('.screen-title')
    page.wait_for_function('!window.GameAssets || GameAssets.finished')
    assert page.locator('[data-action="passport"]').count() == 0, '탐정 연습 메뉴 제거'
    page.locator('[data-action="book"]').click()
    page.locator('[data-action="tab-ladder"]').click()
    assert page.locator('.comparison-locked').count() == 7, '처음에는 비교 7쌍 잠금'
    assert page.locator('.comparison-evidence').count() == 0, '잠긴 기후의 증거 숨김'
    page.locator('[data-action="book-back"]').click()
    page.locator('[data-action="liar"]').click()
    page.locator('[data-action="liar-start"][data-stage="town"]').click()
    page.locator('[data-action="liar-role"]').click()
    assert '3바퀴 뒤 라이어를 지목' in page.locator('dialog').inner_text(), '첫 라운드 안내'
    page.locator('[data-action="liar-go"]').click()
    for _ in range(3):
        card = page.locator('[data-action="liar-card"]:not([disabled])').first
        card.wait_for(state='visible')
        card.click()
        page.locator('[data-action="liar-play"]').click()
    page.locator('[data-action="liar-vote"]').first.wait_for(state='visible')
    page.locator('[data-action="liar-vote"]').first.click()
    page.wait_for_selector('.liar-result')
    expected = page.evaluate('''() => {
      const s=JSON.parse(localStorage.getItem('fake-traveler-v1-liar')).state;
      return {climates:[s.claim,s.liarClimate], photos:[...s.seats.flatMap(x=>x.played.filter(c=>c.type==='photo').map(c=>c.img)),FAKE.climates[s.claim].img,FAKE.climates[s.liarClimate].img]};
    }''')
    saved = page.evaluate("JSON.parse(localStorage.getItem('fake-traveler-v1'))")
    assert all(c in saved['climates'] for c in expected['climates']), '라운드의 두 기후 해금'
    assert all(img in saved['photos'] for img in expected['photos']), '공개 사진과 대표 사진 저장'
    page.reload()
    page.wait_for_selector('.screen-title')
    page.wait_for_function('!window.GameAssets || GameAssets.finished')
    page.locator('[data-action="book"]').click()
    page.locator('[data-action="tab-ladder"]').click()
    assert page.locator('.climate-comparison[data-pair]').count() >= 1, '새로고침 후 비교 해금 유지'
    page.screenshot(path=str(OUT/'after-round.png'), full_page=True)

    # 게임이 쓰는 판정으로 도감의 모든 카드 후보를 검사한다.
    page.evaluate('''() => {
      for(const {pair:[a,b]} of FAKE.comparisons){
        if(!FAKE.climates[a].confuse.includes(b)||!FAKE.climates[b].confuse.includes(a))throw Error('닮은 기후 짝 불일치');
        for(const photos of [false,true]){
          const pool=[...Liar.pool(a),...Liar.pool(b)].filter(c=>photos||c.type!=='photo');
          if(!pool.some(c=>Liar.verdict(c,a).v!=='lie'&&Liar.verdict(c,b).v!=='lie'))throw Error('공통 카드 없음');
          for(const [id,other] of [[a,b],[b,a]])if(!pool.some(c=>c.home===id&&Liar.verdict(c,id).v!=='lie'&&Liar.verdict(c,other).v==='lie'))throw Error('구분 카드 없음');
        }
      }
      const p=JSON.parse(localStorage.getItem('fake-traveler-v1'));
      p.climates=Object.keys(FAKE.climates);p.photos=[];p.liar.badges=['win'];p.liar.xp=90;p.liar.played=7;p.liar.me='leo';p.liar.best={town:1};p.liar.unlocked=['nation'];p.liar.chars=['haneul','leo'];
      localStorage.setItem('fake-traveler-v1',JSON.stringify(p));
    }''')
    page.reload()
    page.wait_for_selector('.screen-title')
    page.wait_for_function('!window.GameAssets || GameAssets.finished')
    page.locator('[data-action="book"]').click()
    page.locator('[data-action="tab-ladder"]').click()
    assert page.locator('.climate-comparison[data-pair]').count() == 7, '닮은 기후 7쌍'
    assert page.locator('.comparison-evidence').count() == 21, '사진 없이도 공통·구분 카드 3개씩'
    assert page.locator('.comparison-evidence img').count() == 0, '미수집 사진 노출 없음'
    assert page.locator('.comparison-evidence:visible').count() == 0, '처음에는 핵심 차이만 표시'
    summary=page.locator('details.climate-comparison summary').first
    summary.focus()
    page.keyboard.press('Enter')
    assert page.locator('.comparison-evidence:visible').count() == 3, '키보드로 증거 펼치기'
    page.keyboard.press('Enter')
    assert page.locator('.comparison-evidence:visible').count() == 0, '키보드로 증거 접기'
    page.locator('[data-action="tab-ladder"]').focus()
    page.keyboard.press('ArrowRight')
    assert page.locator('[data-action="tab-badges"]').get_attribute('aria-selected') == 'true', '방향키 탭 이동'
    page.keyboard.press('Home')
    assert page.locator('[data-action="tab-cards"]').get_attribute('aria-selected') == 'true', 'Home 탭 이동'
    page.locator('[data-action="tab-badges"]').click()
    assert page.locator('.badge-stamp').count() == page.evaluate('LiarUI.BADGES.length'), '라이어 배지 전체 표시'
    assert page.locator('.badge-got').count() >= 2, '기존 우승과 도감 완성 배지 유지'
    assert '첫 사건 해결' not in page.locator('#app').inner_text(), '예전 배지 제거'

    page.evaluate('''() => {
      const p=JSON.parse(localStorage.getItem('fake-traveler-v1'));
      p.photos=[...new Set(Object.values(FAKE.climates).flatMap(c=>c.gallery))];
      localStorage.setItem('fake-traveler-v1',JSON.stringify(p));
    }''')
    page.reload()
    page.wait_for_selector('.screen-title')
    page.wait_for_function('!window.GameAssets || GameAssets.finished')
    page.locator('[data-action="book"]').click()
    page.locator('[data-action="tab-ladder"]').click()
    for width,height in [(1366,768),(768,1024),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), '기후 비교 가로 넘침'
        page.screenshot(path=str(OUT/f'compare-{width}.png'), full_page=True)
        page.screenshot(path=str(OUT/f'compare-{width}-preview.png'))
        assert page.evaluate('document.documentElement.scrollHeight < 3000'), '접힌 비교 목록 길이 제한'
        page.locator('details.climate-comparison summary').first.click()
        assert page.locator('.comparison-evidence:visible').count() == 3, '선택한 기후 짝만 펼치기'
        page.screenshot(path=str(OUT/f'compare-{width}-expanded.png'), full_page=True)
        page.locator('.comparison-links [data-action="detail"]').first.click()
        assert page.locator('.gallery-photo img').count() == 1, '수집한 사진 표시'
        assert '라이어가 올 수 있는 닮은 기후' in page.locator('dialog').inner_text(), '상세 카드 최신 문구'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), '상세 카드 가로 넘침'
        page.keyboard.press('Escape')
        page.locator('[data-action="tab-badges"]').click()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), '배지 가로 넘침'
        page.screenshot(path=str(OUT/f'badges-{width}.png'), full_page=True)
        page.locator('[data-action="tab-ladder"]').click()
    final=page.evaluate("JSON.parse(localStorage.getItem('fake-traveler-v1'))")
    assert final['liar']['xp']==90 and final['liar']['played']==7 and final['liar']['me']=='leo', '경험치·참가·캐릭터 기록 보존'
    assert final['liar']['best']=={'town':1} and final['liar']['unlocked']==['nation'], '순위·대회 해금 기록 보존'
    assert final['liar']['chars']==['haneul','leo'] and 'win' in final['liar']['badges'], '여행자·기존 배지 기록 보존'
    assert len(final['climates'])==10 and len(final['photos'])==page.evaluate('new Set(Object.values(FAKE.climates).flatMap(c=>c.gallery)).size'), '기후·사진 기록 보존'
    assert not errors, errors
    browser.close()
print('한 라운드 실제 플레이·사진 저장·배지·비교 7쌍 판정·3개 화면 크기 통과')
