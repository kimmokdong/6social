# 무역왕 7.2 도감(선장의 항해 일지) 화면 검사: 시작 화면·나라 고르기에서 책을 열고, 모든 탭·쪽을 여러 크기(+아주 큰 글)로 돌며
# text7.py와 같은 글 검사(스크롤·넘침·잘림·15px 미만·단어 중간 줄바꿈) + 카드 안 내용이 카드 밖으로 나가는지 + NEW 리본이 한 번만 뜨는지 본다.
# URL=http://localhost:8083/trade-king/index.html python -X utf8 trade-king/tests/codex72_ui.py   (캡처: output/playwright/codex72)
import os, re, sys, io, json
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.environ.get('URL', 'http://localhost:8083/trade-king/index.html')
OUT = Path('output/playwright/codex72'); OUT.mkdir(parents=True, exist_ok=True)
SCAN = re.search(r"SCAN = r'''(.*?)'''", (Path(__file__).parent / 'text7.py').read_text(encoding='utf-8'), re.S).group(1)
SIZES = [(1366, 768, 'big'), (1280, 720, 'big'), (1024, 768, 'big'), (768, 1024, 'big'), (1366, 768, 'huge'), (1024, 768, 'huge')]
TABS = ['nations', 'goods', 'events', 'badges', 'lessons', 'records']
# 카드(li) 안 내용이 카드 밖으로 나가거나, 카드가 책 쪽(.bk-page) 밖으로 나가는지
CELLS = r'''() => { const out = [], page = document.querySelector('.bk-page'); if (!page) return ['no .bk-page'];
  const pb = page.getBoundingClientRect();
  for (const li of page.querySelectorAll('li')) { const b = li.getBoundingClientRect();
    if (b.bottom > pb.bottom + 2 || b.right > pb.right + 2) out.push('cell out of page: ' + li.innerText.slice(0, 20));
    for (const d of li.querySelectorAll('*')) { if (d.closest('.newrib')) continue; const r = d.getBoundingClientRect(); if (!r.width) continue;
      if (r.bottom > b.bottom + 2 || r.top < b.top - 14 || r.right > b.right + 2) { out.push('content out of cell: ' + li.innerText.replace(/\s+/g, ' ').slice(0, 20) + ' <' + d.tagName + '>'); break; } } }
  return [...new Set(out)].slice(0, 8); }'''
issues = {}
def add(tag, kind, items):
    for it in items: issues.setdefault(f'{kind}: {it}', []).append(tag)
seed = (OUT / 'seed.json').read_text(encoding='utf-8') if (OUT / 'seed.json').exists() else None
fails = []
def ok(cond, msg):
    if not cond: fails.append(msg)

def walk(pg, tag, shots):
    for tab in TABS:
        pg.click(f'[data-book-tab={tab}]'); pg.wait_for_timeout(80)
        n = 0
        while True:
            t = f'{tag} {tab} p{n + 1}'
            for kind, items in pg.evaluate(SCAN).items(): add(t, kind, items)
            add(t, 'cells', pg.evaluate(CELLS))
            if shots and n == 0: pg.screenshot(path=str(OUT / f'ui-{tag.replace(" ", "-")}-{tab}.png'))
            nxt = pg.query_selector('.bk-pager button:last-child:not([disabled])')
            if not nxt: break
            nxt.click(); pg.wait_for_timeout(60); n += 1
            if n > 10: add(t, 'error', ['too many pages']); break

with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, text in SIZES:
        tag0 = f'{w}x{h}{"H" if text == "huge" else ""}'
        pg = b.new_page(viewport={'width': w, 'height': h}, reduced_motion='reduce')
        pg.on('pageerror', lambda e: add('page', 'error', [str(e)[:120]]))
        for name, codex in [('empty', None), ('rich', seed)]:
            if name == 'rich' and not codex: continue
            pg.goto(BASE + '?debug&title')
            pg.evaluate("([c, t]) => { localStorage.clear(); localStorage.setItem('trade6.opening', '1'); localStorage.setItem('trade6.settings', JSON.stringify({text: t, motion: 'less'})); if (c) localStorage.setItem('trade6.codex', c); }", [codex, text])
            pg.goto(BASE + '?debug&title'); pg.wait_for_timeout(500)
            rank = pg.inner_text('#title .codex-rank')
            ok(('견습 선원 · 0%' in rank) if name == 'empty' else ('%' in rank and '0%' != rank[-2:]), f'{tag0} {name} title rank "{rank}"')
            # 시작 화면에서 열기
            pg.click('#title [data-t=codex]'); pg.wait_for_timeout(200)
            ok(pg.query_selector('.book-modal') is not None, f'{tag0} {name} book from title')
            fresh = pg.evaluate("() => document.querySelectorAll('.book-modal .fresh, .book-modal .newrib').length")
            if name == 'rich': ok(fresh > 0, f'{tag0} rich: NEW ribbons on first open')
            walk(pg, f'{tag0} {name} title', shots=(name == 'rich' and text == 'big'))
            pg.click('[data-codex-close]'); pg.wait_for_timeout(100)
            # 나라 고르기에서 다시 열기: NEW는 이미 봤으니 없어야 함
            pg.click('#title [data-t=play]'); pg.wait_for_timeout(300)
            pg.click('[data-codex]'); pg.wait_for_timeout(200)
            ok(pg.evaluate("() => document.querySelectorAll('.book-modal .fresh').length") == 0, f'{tag0} {name}: NEW cleared after viewing')
            walk(pg, f'{tag0} {name} pick', shots=False)
            pg.click('[data-codex-close]')
        pg.close()
    b.close()
print(f'issues: {len(issues)}  fails: {len(fails)}')
for f in fails: print('FAIL', f)
by = {}
for k, tags in issues.items(): by.setdefault(k.split(':')[0], []).append((k, tags))
for kind in ['error', 'scroll', 'overflow', 'clipped', 'cells', 'midword', 'small']:
    rows = by.get(kind, [])
    print(f'\n## {kind} ({len(rows)})')
    for k, tags in sorted(rows, key=lambda r: -len(r[1]))[:40]: print(f'  {k}  ← {len(tags)}곳 예: {", ".join(tags[:3])}')
json.dump({'issues': issues, 'fails': fails}, open(OUT / 'ui-issues.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
sys.exit(1 if issues or fails else 0)
