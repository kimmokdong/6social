"""초기 화면·조작 결함 확인. 결과는 게임 전용 check-verify에 저장합니다."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'output/playwright/python-packages'))
sys.path.insert(0, str(Path(__file__).resolve().parent / '.python-packages'))
from playwright.sync_api import sync_playwright

OUT = ROOT / 'daon-city/check-verify'
OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    findings = []
    for w, h in [(1366,768),(1280,800),(1024,768),(768,1024),(390,844)]:
        page = browser.new_page(viewport={'width':w,'height':h}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
        page.goto('http://localhost:8790/daon-city/?debug=1')
        for stage, selector in [('title',None),('paper','[data-action="new"]'),('tutorial','[data-action="start-build"]'),('build','[data-action="tut-skip"]')]:
            if selector:
                page.locator(selector).click()
            page.wait_for_timeout(180)
            page.screenshot(path=str(OUT / f'inspect-{w}x{h}-{stage}.png'), full_page=True)
            metrics = page.evaluate('''() => ({
              overflow:document.documentElement.scrollWidth>innerWidth+1,
              height:document.documentElement.scrollHeight,
              small:[...document.querySelectorAll('button,.g-label,.c-name,.fx,.need,.bdg p')].filter(e=>!e.closest('.debug') && e.getBoundingClientRect().width && parseFloat(getComputedStyle(e).fontSize)<(e.tagName==='BUTTON'?20:18)).map(e=>({cls:e.className,text:e.textContent,size:getComputedStyle(e).fontSize})),
              outside:[...document.querySelectorAll('.map-wrap .map,.tray-foot,.pop')].filter(e=> {const r=e.getBoundingClientRect(); return r.left<0||r.right>innerWidth||r.bottom>innerHeight}).map(e=>({cls:e.className,rect:e.getBoundingClientRect().toJSON()})),
              tile:document.querySelector('.map-wrap .tile')?.getBoundingClientRect().width
            })''')
            findings.append({'size':[w,h],'stage':stage,'metrics':metrics,'errors':errors[:]})
        page.close()
    OUT.joinpath('inspect-metrics.json').write_text(json.dumps(findings,ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()
assert all(not r['metrics']['overflow'] and not r['metrics']['small'] and not r['errors'] for r in findings), findings
print(f'PASS: 초기 화면 {len(findings)}개, 가로 넘침·작은 글씨·오류 0')
