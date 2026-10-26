"""8.2c 도움말 전수 검사: 나라 8곳 × 화면 3크기에서 첫 판 도움말을 실제 마우스 클릭으로 끝까지 따라간다.
단계마다 ① 가리키는 대상이 있는지 ② 말풍선이 대상을 가리지 않는지 ③ 딴 단추(⚙️ 설정)가 막히는지 ④ 막힘 없이 끝나는지 본다.
나라 소개만 나오는 두 번째 판, 나라별 때 맞춤 도움말이 가리키는 칸이 화면에 있는지도 본다.
실행: URL=http://localhost:8086/trade-king/index.html python trade-king/tests/coach82.py
"""
import os, re, pathlib
from playwright.sync_api import sync_playwright

BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/index.html')
SIZES = [(1366, 768), (1024, 768), (768, 1024)]
SRC = (pathlib.Path(__file__).parent.parent / 'js' / 'game6.js').read_text(encoding='utf-8')
issues = []

STATE = """() => { const c = TK6_coach.state(); if (!c) return null; const s = c.list[c.step], hid = document.querySelector('#coach').hidden;
  const b = document.querySelector('#coach .bubble').getBoundingClientRect(), t = s.at && document.querySelector(s.at), r = t && t.getBoundingClientRect();
  const ov = r ? Math.max(0, Math.min(b.right, r.right + 8) - Math.max(b.left, r.left - 8)) * Math.max(0, Math.min(b.bottom, r.bottom + 8) - Math.max(b.top, r.top - 8)) : 0;
  return {step: c.step, len: c.list.length, at: s.at || null, hidden: hid, next: !!document.querySelector('[data-coach-next]'), act: !!s.act, wait: !!s.wait,
    found: !s.at || !!t, cover: r ? Math.round(ov / Math.max(1, (r.width + 16) * (r.height + 16)) * 100) : 0, big: r ? r.width * r.height > innerWidth * innerHeight * .3 : false,
    inside: b.left >= 0 && b.top >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1, text: document.querySelector('#coach .bubble p').innerText.slice(0, 24)}; }"""
OPEN = "() => ({layer: !document.querySelector('#layer').hidden, dock: !!document.querySelector('.dockpanel'), sheet: !!document.querySelector('.sheet')})"


def flow(pg, nid, tag, intro_only=False):
    pg.goto(BASE + ('?debug&hints' if intro_only else '?debug&helper'))
    pg.wait_for_timeout(300)
    if intro_only:  # 공통 단계는 본 것으로, 이 나라 소개는 아직
        pg.evaluate("id => { localStorage.setItem('trade6.helper', 'done'); localStorage.removeItem('trade6.helper.' + id); }", nid)
    else:
        pg.evaluate('() => TK6_coach.on()')
    pg.evaluate(f"() => TK6.start('{nid}')"); pg.wait_for_timeout(400)
    if pg.locator('[data-ok=open]').count(): pg.click('[data-ok=open]'); pg.wait_for_timeout(300)
    seen, guard = [], 0
    while guard < 80:
        guard += 1
        s = pg.evaluate(STATE)
        if s is None: break
        if s['hidden']:
            if pg.locator('[data-close-report]').count():  # 도착 결과 창 닫기
                pg.click('[data-close-report]'); pg.wait_for_timeout(300); continue
            if pg.evaluate('() => !document.querySelector("#layer").hidden'):  # 사건·회의 창: 첫 선택
                pg.evaluate('() => (document.querySelector("#layer button.primary") || document.querySelector("#layer button"))?.click()'); pg.wait_for_timeout(300); continue
            if s['wait'] or s['step'] > 0:  # 배가 오가는 동안: 날짜를 넘겨 도착 표시를 기다린다
                pg.evaluate('() => { for (let i = 0; i < 15 && !document.querySelector(".arrival"); i++) { TK6.E.advance(TK6.G, 1); TK6.render(); } }'); pg.wait_for_timeout(60)
                continue
            issues.append(f'{tag} 단계 {s["step"]} 도움말이 숨은 채 멈춤'); break
        key = (s['step'], s['text'])
        if key not in seen:
            seen.append(key)
            if not s['found']: issues.append(f'{tag} 단계 {s["step"] + 1}/{s["len"]} 대상 없음 {s["at"]} · {s["text"]}')
            if not s['inside']: issues.append(f'{tag} 단계 {s["step"] + 1} 말풍선이 화면 밖')
            if s['cover'] > 0 and not s['big']: issues.append(f'{tag} 단계 {s["step"] + 1} 말풍선이 대상 {s["cover"]}% 가림 {s["at"]} · {s["text"]}')
            # 딴 단추는 막혀야: ⚙️ 설정(창이 없을 때만 보임)
            if pg.locator('[data-settings]').is_visible() and not pg.evaluate(OPEN)['dock']:
                pg.click('[data-settings]', force=True); pg.wait_for_timeout(200)
                if pg.evaluate(OPEN)['layer']: issues.append(f'{tag} 단계 {s["step"] + 1} ⚙️ 설정이 열림(막혀야 함)'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        before = s['step']
        at = s['at'] or ''
        if s['next']: pg.click('[data-coach-next]')
        elif at.startswith('.piece'):
            pg.click('.piece[data-ship="0"]'); pg.wait_for_timeout(150)
            # 말풍선에 안 가린 섬을 고른다(다 가리면 문제)
            k = pg.evaluate('''() => [...document.querySelectorAll('.isle[data-drop]:not(.world)')].findIndex(e => { const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && e.contains(t); })''')
            covered = pg.evaluate('''() => [...document.querySelectorAll('.isle[data-drop]')].filter(e => { const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && t.closest('#coach'); }).length''')
            if covered: issues.append(f'{tag} 배 단계 말풍선이 섬 {covered}곳을 가림')
            if k < 0: issues.append(f'{tag} 배 단계 누를 수 있는 섬이 없음'); break
            pg.locator('.isle[data-drop]:not(.world)').nth(k).click()
        elif at == '[data-sign]' and pg.locator('[data-sign]:disabled').count():
            # 이 섬과는 계약할 짐이 없음 → 도움말이 시키는 대로 취소하고 다른 섬으로
            if '다른 섬' not in s['text'] and '다른 섬' not in pg.inner_text('#coach .bubble'): issues.append(f'{tag} 계약하기가 꺼졌는데 다른 섬 안내가 없음')
            tried = locals().get('tried', 0) + 1
            if tried > 4: issues.append(f'{tag} 계약할 수 있는 섬이 없음'); break
            pg.click('[data-close]'); pg.wait_for_timeout(300); pg.click('.piece[data-ship="0"]'); pg.wait_for_timeout(150)
            pg.locator('.isle[data-drop]:not(.world)').nth(tried % pg.locator('.isle[data-drop]:not(.world)').count()).click(); pg.wait_for_timeout(500)
            continue
        elif at in ('[data-more]', '[data-reco]', '[data-sign]', '.arrival'): pg.click(at)
        elif at == '.speed': pg.click('[data-speed="1"]')
        else: issues.append(f'{tag} 단계 {s["step"] + 1} 무엇을 눌러야 할지 모름 {at} · {s["text"]}'); break
        pg.wait_for_timeout(450)
        after = pg.evaluate(STATE)
        if after is None or s['text'].startswith('이제 혼자서도'): break   # 공통 도움말 끝(그 뒤 때 맞춤 도움말은 따로 본다)
        if after['step'] == before and not after['hidden'] and (after['text'] == s['text']):
            issues.append(f'{tag} 단계 {before + 1} 눌러도 안 넘어감 {at} · {s["text"]}'); break
    else:
        last = pg.evaluate(STATE); issues.append(f'{tag} 80번 넘게 돌아도 안 끝남 · 마지막 {last and (last["step"], last["text"], last["hidden"])} · 창={pg.evaluate(OPEN)} · {pg.inner_text("#layer")[:60] if pg.evaluate("() => !document.querySelector('#layer').hidden") else ""}')
    return len(seen)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1366, 'height': 768})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '?debug'); pg.wait_for_timeout(300)
    nations = pg.evaluate('() => Object.keys(TK6.E.S.countries)')
    hint_at = sorted(set(re.findall(r"\{key: '[^']+', id: (?:'[^']+'|null), at: '([^']+)'", SRC)))
    for w, h in SIZES:
        pg.set_viewport_size({'width': w, 'height': h})
        for nid in nations:
            n = flow(pg, nid, f'{w}x{h} {nid} 첫 판')
            if n < 12: issues.append(f'{w}x{h} {nid} 첫 판 도움말이 {n}단계만 나옴')
            flow(pg, nid, f'{w}x{h} {nid} 나라 소개만', intro_only=True)
            # 때 맞춤 도움말이 가리키는 칸이 이 나라 화면에 있는지(사건 카드처럼 그때만 생기는 칸은 뺀다)
            pg.goto(BASE + '?debug'); pg.wait_for_timeout(200); pg.evaluate(f"() => TK6.start('{nid}')"); pg.wait_for_timeout(300)
            if pg.locator('[data-ok=open]').count(): pg.click('[data-ok=open]'); pg.wait_for_timeout(200)
            for sel in hint_at:
                if sel in ('.small-pop', '.isle .trend', '.lane-mark'): continue
                if not pg.locator(sel).count(): issues.append(f'{w}x{h} {nid} 때 맞춤 도움말 칸 없음 {sel}')
        print(f'{w}x{h} 끝 · 나라 {len(nations)}')
    b.close()
for e in errs: issues.append('페이지 오류 ' + e)
print('\n'.join(issues) or '문제 없음')
print(f'issues: {len(issues)}')
