from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[2]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
 for w,h in [(1280,800),(1024,768),(768,1024),(390,844),(320,568)]:
  c=b.new_context(viewport={"width":w,"height":h},reduced_motion='reduce')
  page=c.new_page();page.on('pageerror',lambda e:print('ERROR',e,flush=True))
  page.goto('http://127.0.0.1:8790/daon-city/')
  page.evaluate("localStorage.setItem('daon-city-v2',JSON.stringify({tutorialSeen:true,endings:[],badges:[],sound:false}))")
  page.reload();page.locator('[data-action="new"]').click();page.locator('[data-action="start-build"]').click()
  page.locator('[data-card="textile"]').click()
  page.screenshot(path=str(root/'output'/f'daon-v2-{w}.png'),full_page=True)
  print(w,page.evaluate("""() => [...document.querySelectorAll('.topbar,.city-readiness,.map,.city-warnings,.tray,.cards,.tray-foot')].map(e=>({c:e.className,r:e.getBoundingClientRect().toJSON(),scroll:[e.scrollWidth,e.scrollHeight]}))"""),flush=True)
  c.close()
 b.close()
