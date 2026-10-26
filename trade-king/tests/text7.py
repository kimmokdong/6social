# 무역왕 7.1 글 검사(7.6: 섬·배·창고 툴팁, 계약서 추천/다 보기, 1년 결과 1~5년, 도착 결과 추가): 모든 화면(시작·설정·나라 고르기·판·섬 툴팁·회의·사건·도감·결과 책·도우미)을 네 크기(+아주 큰 글)로 돌며
# ① 글이 제 상자 밖으로 나가는지 ② 패널이 잘라먹는지(overflow hidden인데 내용이 더 큼) ③ 스크롤바 ④ 15px 미만 글자 ⑤ 단어 중간 줄바꿈을 찾는다.
# URL=http://localhost:8083/trade-king/index.html python -X utf8 trade-king/tests/text7.py   (캡처: output/playwright/text7)
import os, sys, io, json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui78 import scenes as scenes78
from ui79 import scenes as scenes79
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/index.html')
OUT = Path('output/playwright/text7'); OUT.mkdir(parents=True, exist_ok=True)
IDS = ['daon', 'plains', 'oil', 'market', 'forest', 'port', 'artisan', 'ironland']
SIZES = [(1366, 768), (1280, 720), (1024, 768), (768, 1024), (800, 1280), (1280, 800), (1180, 820), (820, 1180)]
# 크기 묶음 검사: SIZES=800x1280,1280x800 (HUGE=1이면 지정한 크기 전부 아주 큰 글도 검사)
if os.environ.get('SIZES'): SIZES = [tuple(map(int, x.split('x'))) for x in os.environ['SIZES'].split(',')]
HUGES = [('huge', *size) for size in SIZES] if not os.environ.get('SIZES') or os.environ.get('HUGE') == '1' else []
SHOT = os.environ.get('SHOT', '1') == '1'
issues = {}
def add(tag, kind, items):
    for it in items: issues.setdefault(f'{kind}: {it}', []).append(tag)

SCAN = r'''() => {
  const bad = {overflow: [], clipped: [], scroll: [], small: [], midword: []};
  const vis = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0' && el.getClientRects().length; };
  const label = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
  const txt = el => el.innerText.replace(/\s+/g, ' ').trim().slice(0, 28);
  const hidden = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    if (el.closest('[hidden]')) continue;
    const cs = getComputedStyle(el);
    // 스크롤바
    if (/auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) bad.scroll.push('y ' + label(el));
    if (/auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) bad.scroll.push('x ' + label(el));
    // 잘림: overflow hidden/clip 인데 내용이 더 큼(말줄임 처리된 것은 제외)
    if (/hidden|clip/.test(cs.overflowX + cs.overflowY) && cs.textOverflow !== 'ellipsis' && !el.matches('.news, .marquee, .scene, .shots, .shot, .cam, .pic, #cine, .fx, .bars, .cover, .rig, .board, #title, .isle, .map, .sea, .fog, .track')) {
      if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) bad.clipped.push(label(el) + ' "' + txt(el) + '" ' + el.scrollWidth + 'x' + el.scrollHeight + '>' + el.clientWidth + 'x' + el.clientHeight);
    }
    // 글이 제 상자 밖으로: 직접 가진 글 노드의 사각형이 요소 상자를 넘음
    const tn = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    if (tn.length) {
      const fs = parseFloat(cs.fontSize); if (fs < 15 && cs.fontSize !== '0px') bad.small.push(label(el) + ' ' + Math.round(fs) + 'px "' + txt(el) + '"');
      const box = el.getBoundingClientRect();
      for (const n of tn) {
        const r = document.createRange(); r.selectNodeContents(n); const rects = [...r.getClientRects()];
        if (!rects.length) continue;
        const right = Math.max(...rects.map(x => x.right)), bottom = Math.max(...rects.map(x => x.bottom));
        if (!el.closest('.news, #title .scene') && cs.textOverflow !== 'ellipsis' && (right > box.right + 4 || right > innerWidth + 1 || bottom > innerHeight + 1)) bad.overflow.push(label(el) + ' "' + txt(el) + '" +' + Math.round(Math.max(right - box.right, bottom - box.bottom)) + 'px');
        // 단어 중간 줄바꿈: 한글 글자 사이(공백 없음)에서 줄이 바뀜
        if (rects.length > 1 && cs.wordBreak !== 'break-all') {
          const s = n.textContent; let prevTop = null;
          for (let i = 1; i < s.length; i++) {
            if (!/[가-힣A-Za-z0-9]/.test(s[i - 1]) || !/[가-힣A-Za-z0-9]/.test(s[i])) continue;
            const rr = document.createRange(); rr.setStart(n, i); rr.setEnd(n, i + 1); const cr = rr.getBoundingClientRect();
            const rp = document.createRange(); rp.setStart(n, i - 1); rp.setEnd(n, i); const pr = rp.getBoundingClientRect();
            if (cr.top > pr.top + pr.height * .5 && cr.left < pr.left) { bad.midword.push(label(el) + ' "…' + s.slice(Math.max(0, i - 6), i) + '|' + s.slice(i, i + 6) + '…"'); break; }
          }
        }
      }
    }
  }
  const yt = document.querySelector('.year-trade'), yf = document.querySelector('.yr-foot');
  if (yt && yf && vis(yt) && yt.getBoundingClientRect().bottom > yf.getBoundingClientRect().top + 1) bad.overflow.push('year-footer-overlap');
  const d = document.documentElement;
  if (d.scrollHeight > innerHeight + 1) bad.scroll.push('page-y ' + d.scrollHeight + '>' + innerHeight);
  if (d.scrollWidth > innerWidth + 1) bad.scroll.push('page-x ' + d.scrollWidth);
  for (const k in bad) bad[k] = [...new Set(bad[k])].slice(0, 12);
  return bad;
}'''
PLAY = '''([id, months]) => { TK6.start(id); const G = TK6.G, E = TK6.E;
  for (let k = 0; k < months && !G.over; k++) { while (G.pending) { if (G.pending.type === 'meeting') E.choose(G, null); else E.choose(G, G.pending.type === 'event' ? 0 : null); } E.botTurn(G, 'focus'); E.tick(G); }
  while (G.pending && !G.over) E.choose(G, null); TK6.render(); return true; }'''

last = ['']
def check(pg, tag, shot=None):
    last[0] = tag
    bad = pg.evaluate(SCAN)
    for kind, items in bad.items(): add(tag, kind, items)
    if shot and SHOT: pg.screenshot(path=str(OUT / f'{shot}.png'))
    return bad

with sync_playwright() as p:
    b = p.chromium.launch()
    for size in SIZES + HUGES:
        huge = size[0] == 'huge'; w, h = (size[1], size[2]) if huge else size
        tag0 = f'{w}{"H" if huge else ""}'
        pg = b.new_page(viewport={'width': w, 'height': h}, reduced_motion='reduce')
        pg.on('pageerror', lambda e: add('page', 'error', [f'{str(e)[:100]} (직전 검사: {last[0]}) {(e.stack or "").splitlines()[1:3]}']))
        pg.goto(BASE + '?debug&title'); pg.evaluate("localStorage.clear(); localStorage.setItem('trade6.opening', '1'); localStorage.setItem('trade6.settings', JSON.stringify({text: %s, motion: 'less'}))" % ("'huge'" if huge else "'big'")); pg.goto(BASE + '?debug&title'); pg.wait_for_timeout(600)
        check(pg, f'{tag0} title', f'title-{tag0}')
        pg.click('#title [data-t=set]'); pg.wait_for_timeout(200); check(pg, f'{tag0} settings', f'settings-{tag0}'); pg.click('#title [data-t=close]')
        pg.click('#title [data-t=play]'); pg.wait_for_timeout(300); check(pg, f'{tag0} pick', f'pick-{tag0}')
        for id in IDS:
            pg.evaluate(PLAY, [id, 8]); pg.wait_for_timeout(100)
            check(pg, f'{tag0} board {id}', f'board-{id}-{tag0}' if id in ('daon', 'forest') else None)
            # 섬 툴팁(첫 이웃 섬)과 나라 칸
            pg.evaluate("() => document.querySelector('.isle:not(.world) [data-info]')?.click()"); pg.wait_for_timeout(80); check(pg, f'{tag0} isle-tip {id}', f'tip-{id}-{tag0}' if id == 'daon' else None)
            pg.mouse.click(5, h - 5); pg.wait_for_timeout(40)
            pg.click('.nation-slot'); pg.wait_for_timeout(60); check(pg, f'{tag0} nation-tip {id}'); pg.mouse.click(5, h - 5)
            # 7.6 섬 툴팁 전부(북쪽 대륙 포함) · 배 툴팁 · 창고 상자 툴팁(게임 툴팁)
            for k in range(pg.locator('[data-info]').count()):
                pg.evaluate("k => document.querySelectorAll('[data-info]')[k].click()", k); pg.wait_for_timeout(50); check(pg, f'{tag0} isle-tip {id} #{k}')
                pg.mouse.click(5, h - 5); pg.wait_for_timeout(30)
            for k in range(pg.locator('.piece[data-ship]').count()):
                pg.evaluate("k => document.querySelectorAll('.piece[data-ship]')[k].click()", k); pg.wait_for_timeout(50); check(pg, f'{tag0} ship-tip {id} #{k}', f'shiptip-{id}-{tag0}' if id == 'daon' and k == 0 else None)
                pg.mouse.click(5, h - 5); pg.wait_for_timeout(30)
            if id in ('daon', 'ironland', 'market'):
                for k in range(pg.locator('.stock').count()):
                    pg.hover(f'.stock >> nth={k}'); pg.wait_for_timeout(330); check(pg, f'{tag0} stock-tip {id} #{k}', f'stocktip-{id}-{tag0}' if k == 4 else None)
                pg.mouse.move(5, 5); pg.wait_for_timeout(30)
            # 7.6 계약서: 추천 → 다 보기(헐값 줄 포함), 이웃 섬 하나와 북쪽 대륙
            for sel in ('.isle:not(.world)', '.isle.world'):
                pg.evaluate("s => document.querySelector(s).click()", sel); pg.wait_for_timeout(120); check(pg, f'{tag0} contract {id} {sel}', f'contract-{id}-{tag0}' if id == 'forest' and 'world' not in sel else None)
                pg.evaluate("() => document.querySelector('[data-edit]')?.click()"); pg.wait_for_timeout(80)   # 8.5 계약서 기본은 세 줄 · 짐 바꾸기로 펼친다
                if pg.locator('[data-more]').count():
                    pg.click('[data-more]'); pg.wait_for_timeout(100); check(pg, f'{tag0} contract-more {id} {sel}', f'contract-more-{id}-{tag0}' if id in ('forest', 'market') and 'world' not in sel else None)
                pg.evaluate("() => document.querySelector('[data-close]')?.click()"); pg.wait_for_timeout(60)
        # 7.8 빚 금고·툴팁, 거절 섬·툴팁, 예상 점수·툴팁, 빚 연말 행
        scenes78(pg, lambda name: check(pg, f'{tag0} v78 {name}'))
        # 7.6 1년 결과(1~5년) · 도착 결과(위약금 두 방향)
        for y, nat in [(1, 'plains'), (2, 'market'), (3, 'ironland'), (4, 'forest'), (5, 'daon')]:
            pg.evaluate(PLAY, [nat, 12 * y])
            pg.evaluate("y => { const G = TK6.G; G.pending = {type: 'yearEnd', year: y}; G.queue = [G.pending]; TK6.render(); }", y); pg.wait_for_timeout(120)
            check(pg, f'{tag0} year{y} {nat}', f'year{y}-{tag0}' if y in (1, 3) else None)
            pg.evaluate("() => { const G = TK6.G; G.pending = null; G.queue = []; document.querySelector('#layer').hidden = true; }")
            # 7.7 우리 나라 창 세 칸(산업·항구·고른 효과, 쪽마다)과 ⚙️ 설정 창
            if y in (3, 4):
                pg.evaluate("() => document.querySelector('[data-home-info]').click()"); pg.wait_for_timeout(100)
                for tab in ('ind', 'port', 'aug', 'fx'):
                    pg.evaluate("t => document.querySelector(`[data-sheet-tab=\"${t}\"]`).click()", tab); pg.wait_for_timeout(100); check(pg, f'{tag0} home-{tab} {nat}', f'home-{tab}-{tag0}' if y == 4 else None)
                for k in range(4):
                    if not pg.locator('[data-fx-page="1"]:not([disabled])').count(): break
                    pg.click('[data-fx-page="1"]'); pg.wait_for_timeout(80); check(pg, f'{tag0} home-fx p{k + 2} {nat}')
                pg.evaluate("() => document.querySelector('[data-sheet-close]').click()"); pg.wait_for_timeout(60)
                pg.evaluate("() => document.querySelector('[data-settings]').click()"); pg.wait_for_timeout(100); check(pg, f'{tag0} game-settings', f'game-settings-{tag0}' if y == 3 else None)
                pg.evaluate("() => document.querySelector('[data-sheet-close]').click()"); pg.wait_for_timeout(60)
        pg.evaluate(PLAY, ['oil', 4])
        pg.evaluate("""() => { const G = TK6.G, me = TK6.E.player(G), o = G.nations[1]; me.ships[0].delivery = {month: G.month, day: G.day, to: o.id, get: [2, 0, 1, 1, 0, 0], sold: [0, 3, 0, 0, 0, 1], earned: 196, spent: 170,
            shortages: [{good: 2, qty: 1, reason: '상대 재고 부족'}], penaltyIn: [{good: 2, qty: 1, amount: 9, reason: '재고 부족'}], penaltyOut: [{good: 5, qty: 2, amount: 19, reason: '재고 부족'}]}; TK6.render(); }""")
        pg.evaluate("() => document.querySelector('.arrival [data-report=\"0\"]')?.click()"); pg.wait_for_timeout(120); check(pg, f'{tag0} arrival', f'arrival-{tag0}')
        pg.evaluate("() => document.querySelector('[data-close-report]')?.click()")
        # 사건 카드 전부
        evs = pg.evaluate("() => TK6.E.S.events.map(e => e.id)")
        for ev in evs:
            pg.evaluate(PLAY, ['plains', 0])
            err = pg.evaluate("id => { const G = TK6.G, E = TK6.E; while (G.pending) E.choose(G, null); const o = G.nations[1]; if (E.startEvent) { E.startEvent(G, {id, source: o.id}); } else { G.pending = {type: 'event', id, until: G.month + 6, source: o.id, target: G.nations[2].id, good: o.main}; G.queue = [G.pending]; } try { TK6.render(); } catch (e) { return 'render error ' + id + ': ' + e.message; } }", ev); pg.wait_for_timeout(80)
            check(pg, f'{tag0} event {ev}', f'event-{ev}-{tag0}' if ev in ('storm', 'supplyCut') else None)
            pg.evaluate("() => { const G = TK6.G; G.pending = null; G.queue = []; document.querySelector('#layer').hidden = true; }")
        # 발전 회의(카드)
        for id in ('plains', 'forest', 'ironland'):
            pg.evaluate(PLAY, [id, 0])
            pg.evaluate("() => { const G = TK6.G, E = TK6.E, me = E.player(G); while (G.pending) E.choose(G, null); G.month = 24; me.money = 999; const seen = new Set(), cards = []; for (const id of E.cardsFor(G, me, 'gold')) if (!seen.has(E.conceptOf(id)) && cards.length < 3) { seen.add(E.conceptOf(id)); cards.push(id); } G.pending = {type: 'meeting', year: 3, tier: 'gold', cards, catchup: true, rerolls: 0}; G.queue = [G.pending]; TK6.render(); }"); pg.wait_for_timeout(100)
            check(pg, f'{tag0} meeting {id}', f'meeting-{id}-{tag0}' if id == 'forest' else None)
            pg.evaluate("() => { const G = TK6.G; G.pending = null; G.queue = []; document.querySelector('#layer').hidden = true; }")
        scenes79(pg, lambda name: check(pg, f'{tag0} v79 {name}'))
        # 도감
        # 도감(7.2 책): 탭마다 모든 쪽
        pg.evaluate("() => document.querySelector('[data-codex]')?.click()"); pg.wait_for_timeout(150)
        for tab in ['nations', 'goods', 'events', 'augs', 'badges', 'lessons', 'records']:
            pg.evaluate("t => document.querySelector(`[data-book-tab=${t}]`)?.click()", tab); pg.wait_for_timeout(60)
            for n in range(10):
                check(pg, f'{tag0} codex {tab} p{n + 1}', f'codex-{tab}-{tag0}' if n == 0 and tab in ('nations', 'events') else None)
                if not pg.evaluate("() => { const b = document.querySelector('.bk-pager button:last-child:not([disabled])'); b?.click(); return !!b; }"): break
                pg.wait_for_timeout(50)
        pg.evaluate("() => document.querySelector('[data-codex-close]')?.click()")
        # 결과 책 3쪽
        for id in ('oil', 'forest'):
            pg.evaluate(PLAY, [id, 99]); pg.wait_for_timeout(200)
            for n in (1, 2, 3):
                pg.evaluate(f"() => document.querySelector('[data-endpage=\"{n}\"].pg')?.click()"); pg.wait_for_timeout(120); check(pg, f'{tag0} end{n} {id}', f'end{n}-{id}-{tag0}' if id == 'oil' else None)
            pg.evaluate("() => { document.querySelector('#layer').hidden = true; }")
        # 도우미 말풍선(첫 판 안내 1단계)과 첫 무역 안내
        pg.goto(BASE + '?debug&helper'); pg.wait_for_timeout(300); pg.evaluate("() => { TK6_coach.on(); TK6.start('plains'); }"); pg.wait_for_timeout(300); check(pg, f'{tag0} coach+open', f'coach-{tag0}')
        for k in range(3):
            pg.evaluate("() => document.querySelector('[data-ok=open]')?.click()"); pg.wait_for_timeout(120)
            pg.evaluate("() => document.querySelector('[data-coach-next]')?.click()"); pg.wait_for_timeout(250); check(pg, f'{tag0} coach step{k + 2}', f'coach{k + 2}-{tag0}' if k == 1 else None)
        pg.evaluate("() => document.querySelector('[data-coach-off]')?.click()")
        pg.close()
    b.close()
print(f'issues: {len(issues)}')
by = {}
for k, tags in issues.items(): by.setdefault(k.split(':')[0], []).append((k, tags))
for kind in ['error', 'scroll', 'overflow', 'clipped', 'midword', 'small']:
    rows = by.get(kind, [])
    print(f'\n## {kind} ({len(rows)})')
    for k, tags in sorted(rows, key=lambda r: -len(r[1]))[:40]: print(f'  {k}  ← {len(tags)}곳 예: {", ".join(tags[:3])}')
json.dump(issues, open(OUT / 'issues.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
sys.exit(bool(issues))
