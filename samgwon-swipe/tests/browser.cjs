/* 실행: node tests/browser.cjs — 설치된 Chrome만 사용하며 테스트 파일은 프로젝트 안에 저장합니다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'check-verify', 'existing');
fs.mkdirSync(output, { recursive: true });
const profile = fs.mkdtempSync(path.join(output, 'chrome-'));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-breakpad', '--disable-crash-reporter', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
browser.on('error', error => console.error('Chrome 실행 실패:', error.message));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws, serial = 0;
const keepAlive = setInterval(() => {}, 1000);
const pending = new Map(), errors = [];
async function send(method, params = {}) {
  const id = ++serial;
  const response = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Chrome 응답 시간 초과: ' + method)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
  });
  ws.send(JSON.stringify({ id, method, params }));
  return response;
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text + ': ' + response.exceptionDetails.exception?.description);
  return response.result.value;
}
async function click(selector) {
  const point = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) throw new Error('대상 없음: ' + ${JSON.stringify(selector)}); e.scrollIntoView({block:'nearest'}); const r = e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}
async function key(key, code = key) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: { ArrowLeft: 37, ArrowRight: 39, Escape: 27, Enter: 13, ' ': 32 }[key] || 0 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
}
async function ready(expression, timeout = 6000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if (await evaluate(expression)) return; await sleep(60); }
  throw new Error(`대기 시간 초과: ${expression}`);
}
async function navigate(debug = true) {
  await send('Page.navigate', { url: pathToFileURL(path.join(root, 'index.html')).href + (debug ? '?debug=1' : '') });
  await ready('!!window.SamgwonRules && !!document.querySelector(".title-screen")');
}
async function size(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
}
async function screenshot(name) {
  await sleep(320);
  const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(image.data, 'base64'));
}
async function dismissRewards() {
  for (let i = 0; i < 12; i++) {
    if (await evaluate('!!document.querySelector("[data-action=collect-power]")')) await key('Escape');
    else if (await evaluate('!!document.querySelector(".stamp-modal")')) await key('Enter');
    else if (await evaluate('!window.SamgwonDebug.locked && !document.querySelector(".overlay-backdrop")')) return;
    await sleep(400);
  }
  await ready('!window.SamgwonDebug.locked && !document.querySelector(".overlay-backdrop")');
}
const viewports = [[1366,768],[1280,800],[800,1280],[1180,820],[1024,768],[768,1024],[390,844]];
const results = [];
(async () => {
  try {
    let tab;
    for (let i = 0; i < 80; i++) {
      try { const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; tab = (await (await fetch(`http://127.0.0.1:${port}/json`, { signal:AbortSignal.timeout(1000) })).json()).find(t => t.type === 'page'); if (tab) break; } catch (_) {}
      await sleep(100);
    }
    assert.ok(tab, 'Chrome 실행');
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const item = pending.get(message.id); pending.delete(message.id);
        if (message.error) item?.reject(new Error(message.error.message)); else item?.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(a => a.value || a.description).join(' '));
      else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
    });
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    await size(1366, 768); await navigate();
    await evaluate('localStorage.removeItem("samgwon-swipe-v1")'); await navigate();
    await screenshot('title-1366x768');
    await click('[data-action=start]');
    await evaluate('document.querySelector("#player-name").value="현승"');
    await click('[data-face="2"]'); await click('[data-action=save-profile]');
    await screenshot('roles-1366x768');
    await click('[data-role=assembly]'); await screenshot('intro-1366x768');
    await click('[data-action=begin]');
    for (let i = 0; i < 3; i++) await click('[data-action=tutorial-next]');
    assert.equal(await evaluate('SamgwonDebug.progress.name'), '현승');
    assert.equal(await evaluate('SamgwonDebug.progress.face'), 2);
    assert.equal(await evaluate('SamgwonDebug.progress.tutorialSeen'), true);
    assert.equal(await evaluate('SamgwonDebug.progress.sound'), false);
    // 모든 콘텐츠를 각 목표 해상도에 올려 문장 두 줄, 겹침, 화면 밖 이탈을 확인합니다.
    for (const [width, height] of viewports) {
      await size(width, height);
      const report = await evaluate(`(() => {
        const failures=[];
        for (const card of SAMGWON.cards) {
          SamgwonDebug.card(card.id);
          const game=document.querySelector('.game-screen'), speech=document.querySelector('.speech'), text=speech.firstElementChild;
          const rects=['.gauges','.speech','.character-card','.choice-left','.choice-right','.game-footer'].map(s=>({s,r:document.querySelector(s).getBoundingClientRect()}));
          for (const {s,r} of rects) if(r.left < -1 || r.top < -1 || r.right > innerWidth+1 || r.bottom > innerHeight+1) failures.push(card.id+' outside '+s);
          const intersects=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
          for(let i=0;i<rects.length;i++) for(let j=i+1;j<rects.length;j++) if(intersects(rects[i].r,rects[j].r)) failures.push(card.id+' overlap '+rects[i].s+' '+rects[j].s);
          if(document.documentElement.scrollHeight>innerHeight+1||document.documentElement.scrollWidth>innerWidth+1) failures.push(card.id+' scroll');
          const font=getComputedStyle(speech), lineHeight=parseFloat(font.lineHeight);
          if(text.getBoundingClientRect().height>lineHeight*2+2) failures.push(card.id+' speech '+Math.round(text.getBoundingClientRect().height/lineHeight)+' lines');
          for(const b of document.querySelectorAll('[data-choice]')) if(b.scrollHeight>b.clientHeight+1) failures.push(card.id+' choice overflow');
          if(parseFloat(font.fontSize)<(${width}>600?30:22)) failures.push(card.id+' small speech');
        }
        return {viewport:innerWidth+'x'+innerHeight,failures:[...new Set(failures)]};
      })()`);
      results.push(report);
      await evaluate('SamgwonDebug.card("P17")');
      await screenshot(`game-${width}x${height}`);
    }
    fs.writeFileSync(path.join(output, 'layout-report.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    assert.equal(results.flatMap(r => r.failures).length, 0, '모든 해상도·모든 카드 배치');
    await size(1024,768);
    await evaluate('SamgwonDebug.card("A01")');
    await key('Tab');
    await evaluate('document.querySelector(".character-card").focus()');
    assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".character-card")).outlineStyle'), 'none', '카드 키보드 포커스 표시');
    const first = await evaluate('SamgwonDebug.run.resolved');
    await key('ArrowLeft'); await key('ArrowRight');
    await sleep(820); await dismissRewards();
    assert.equal(await evaluate('SamgwonDebug.run.resolved'), first + 1, '연타 방지');
    assert.ok(await evaluate('SamgwonDebug.progress.powers.includes("A1")'));
    // 미리보기에는 변화 크기만 표시하며 숫자·방향을 노출하지 않습니다.
    await evaluate('SamgwonDebug.card("A04")');
    const point = await evaluate('(()=>{const r=document.querySelector(".choice-right").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    assert.equal(await evaluate('document.querySelectorAll(".gauge-dot.visible").length'), 2);
    await key('Escape'); assert.ok(await evaluate('!!document.querySelector("[role=dialog]")'));
    await key('Escape'); assert.equal(await evaluate('document.querySelectorAll("[role=dialog]").length'), 0);
    // 드래그 취소는 원위치, 충분한 이동은 정확히 한 선택만 실행합니다.
    const beforeDrag = await evaluate('SamgwonDebug.run.resolved');
    const cardPoint = await evaluate('(()=>{const r=document.querySelector(".character-card").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,width:r.width}})()');
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x:cardPoint.x,y:cardPoint.y,button:'left',clickCount:1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x:cardPoint.x+10,y:cardPoint.y,button:'left',buttons:1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x:cardPoint.x+10,y:cardPoint.y,button:'left',clickCount:1 });
    assert.equal(await evaluate('SamgwonDebug.run.resolved'), beforeDrag);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x:cardPoint.x,y:cardPoint.y,button:'left',clickCount:1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x:cardPoint.x+cardPoint.width*.5,y:cardPoint.y,button:'left',buttons:1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x:cardPoint.x+cardPoint.width*.5,y:cardPoint.y,button:'left',clickCount:1 });
    await sleep(850); await dismissRewards();
    assert.equal(await evaluate('SamgwonDebug.run.resolved'), beforeDrag + 1);
    await evaluate('SamgwonDebug.card("A07")'); await click('[data-choice=right]');
    await ready('!!document.querySelector(".stamp-modal")');
    await screenshot('stamp'); await key('Enter'); await dismissRewards();
    assert.ok(await evaluate('SamgwonDebug.progress.stamps.includes("overreach")'));
    await evaluate('void SamgwonDebug.ending("pres_power100")'); await dismissRewards();
    await screenshot('ending-1024x768');
    await click('[data-action=roles]'); await click('[data-action=title]');
    await click('[data-action=notebook]'); await screenshot('notebook-1024x768');
    assert.equal(await evaluate('document.querySelectorAll(".checks-art path[marker-end]").length'), 6);
    await click('[data-action=collection-back]'); await click('[data-action=endings]');
    await screenshot('endings-1024x768');
    await click('[data-tab=president]'); await click('[data-ending=pres_power100]');
    await key('Escape'); await click('[data-action=collection-back]');
    const saved = await evaluate('JSON.stringify(SamgwonDebug.progress)');
    await navigate();
    assert.equal(await evaluate('JSON.stringify(SamgwonDebug.progress)'), saved, 'file:// 저장과 다시 읽기');
    await click('[data-action=sound]'); assert.equal(await evaluate('SamgwonDebug.progress.sound'), true);
    await click('[data-action=settings]'); await screenshot('settings');
    await click('[data-action=edit-profile]');
    await evaluate('document.querySelector("#player-name").value=""');
    await click('[data-face="3"]'); await click('[data-action=save-profile]');
    assert.equal(await evaluate('SamgwonDebug.progress.name'), '새봄');
    await click('[data-action=reset]'); await click('[data-action=reset-cancel]');
    assert.ok(await evaluate('SamgwonDebug.progress.endings.length>0'));
    await click('[data-action=reset]'); await click('[data-action=reset-confirm]');
    assert.equal(await evaluate('SamgwonDebug.progress.endings.length+SamgwonDebug.progress.powers.length'), 0);
    assert.equal(await evaluate('SamgwonDebug.progress.tutorialSeen || SamgwonDebug.progress.profileSeen || SamgwonDebug.progress.sound'), false);
    // 타이틀·역할·신문 24종·도감·수첩을 모든 목표 해상도에서 검사합니다.
    const screens = [];
    async function inspectScreen(label, fixed = false) {
      const issues = await evaluate(`(() => {
        const issues=[];
        if(document.documentElement.scrollWidth>innerWidth+1)issues.push('horizontal scroll');
        if(${fixed}&&document.documentElement.scrollHeight>innerHeight+1)issues.push('vertical scroll');
        for(const el of document.querySelectorAll('#app h1,#app h2,#app h3,#app p,#app button,#app .learning-note,#app .paper-date')) {
          const r=el.getBoundingClientRect();
          if(r.width>innerWidth+1||r.left < -1||r.right>innerWidth+1)issues.push('outside '+el.className+' '+el.textContent.slice(0,25));
          if(el.clientWidth&&el.scrollWidth>el.clientWidth+2)issues.push('text overflow '+el.textContent.slice(0,25));
        }
        return [...new Set(issues)];
      })()`);
      screens.push({ screen: label, issues });
    }
    for(const [width,height] of viewports) {
      await size(width,height);
      await evaluate('localStorage.setItem("samgwon-swipe-v1",JSON.stringify({name:"가나다라마바",face:3,profileSeen:true,sound:false,tutorialSeen:true,endings:Object.keys(SAMGWON.endings),powers:Object.keys(SAMGWON.powers),stamps:[]}))');
      await navigate(); await inspectScreen(`title-${width}x${height}`,true); await screenshot(`title-${width}x${height}`);
      await click('[data-action=start]'); await inspectScreen(`roles-${width}x${height}`); await screenshot(`roles-${width}x${height}`);
      await click('[data-role=president]'); await inspectScreen(`intro-${width}x${height}`); await screenshot(`intro-${width}x${height}`);
      const ids = await evaluate('Object.keys(SAMGWON.endings)');
      for(const id of ids) { await evaluate(`SamgwonDebug.ending(${JSON.stringify(id)})`); await inspectScreen(`${id}-${width}x${height}`); }
      await screenshot(`ending-${width}x${height}`);
      await click('[data-action=endings]'); await inspectScreen(`endings-${width}x${height}`); await screenshot(`endings-${width}x${height}`);
      await click('[data-action=collection-back]'); await click('[data-action=roles]'); await click('[data-action=title]');
      await click('[data-action=notebook]'); await inspectScreen(`notebook-${width}x${height}`); await screenshot(`notebook-${width}x${height}`);
      console.log(`전체 화면 검증: ${width}x${height}`);
    }
    fs.writeFileSync(path.join(output,'screen-report.json'),JSON.stringify(screens,null,2));
    assert.equal(screens.flatMap(s=>s.issues).length,0,JSON.stringify(screens.filter(s=>s.issues.length),null,2));
    // 손상된 기록도 안전하게 복구됩니다.
    await evaluate('localStorage.setItem("samgwon-swipe-v1","{invalid")'); await navigate();
    assert.equal(await evaluate('SamgwonDebug.progress.endings.length+SamgwonDebug.progress.powers.length'),0);
    // 저장이 차단되거나 손상되어도 시작과 선택이 계속됩니다.
    await send('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(window,"localStorage",{get(){throw new DOMException("blocked","SecurityError")}});' });
    await navigate(); await click('[data-action=start]'); await click('[data-action=save-profile]');
    await click('[data-role=court]'); await click('[data-action=begin]'); await click('[data-action=tutorial-skip]');
    await key('ArrowRight'); await sleep(820); await dismissRewards();
    assert.equal(await evaluate('SamgwonDebug.run.resolved'), 1);
    await navigate(false);
    assert.equal(await evaluate('!!document.querySelector("#debug-panel") || !!window.SamgwonDebug'), false, '일반 화면에는 디버그 없음');
    await size(1366,768);
    await evaluate(`(() => {
      const A=SamgwonArt;
      document.getElementById('app').innerHTML='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:16px;padding:20px">'+Object.entries(SAMGWON.characters).map(([id,c])=>'<div style="overflow:hidden;border-radius:18px;background:#FFFDF8"><div style="height:180px">'+A.portrait(id)+'</div><p style="font-size:20px;font-weight:800;text-align:center;padding:8px">'+c.name+'</p></div>').join('')+[0,1,2,3].map(face=>'<div style="overflow:hidden;border-radius:18px;background:#FFFDF8"><div style="height:180px">'+A.portrait('player',{role:['assembly','president','court','assembly'][face],face,mood:['happy','sad','shock','proud'][face]})+'</div><p style="font-size:20px;font-weight:800;text-align:center;padding:8px">내 모습 '+(face+1)+'</p></div>').join('')+'</div>';
    })()`);
    await screenshot('characters');
    assert.deepEqual(errors, [], '콘솔 오류 없음');
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ passed:true, protocol:'file://', viewports, cards:109, consoleErrors:errors, checks:['전체 콘텐츠 배치','키보드','드래그','연타 방지','도장','권한','도감','관계도','저장·재로드','프로필 수정','소리','초기화','저장 차단','디버그 숨김'] }, null, 2));
    console.log('브라우저 검증 통과: file://, 7개 해상도 × 109개 카드, 입력·저장·수첩·초기화·저장 차단, 콘솔 오류 0');
  } finally {
    if (ws?.readyState === 1) { try { await send('Browser.close'); } catch (_) {} }
    ws?.close(); browser.kill();
    await sleep(500);
    try { fs.rmSync(profile, { recursive:true, force:true }); } catch (_) {}
    clearInterval(keepAlive);
  }
})().catch(error => { console.error(error); process.exitCode=1; });
