/* Playwright CLI run-code --filename ../tests/verify-edges.js — 저장소·file://·연타·이미지 실패 회귀 */
async page => {
  const out='C:/Users/hyunseung/Desktop/test/sahoe-games/fake-traveler/check-verify/';
  const base='http://localhost:8790/fake-traveler/';
  const checks=[],errors=[],captures=[];
  const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  const click=async(p,a,extra='')=>{
    const root=await p.locator('dialog[open]').count()?p.locator('dialog[open]'):p;
    await root.locator(`[data-action="${a}"]${extra}`).first().click();
  };
  const listen=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const p=await context.newPage();listen(p);
  await p.goto(base);
  // 기존 규칙의 초기 씨앗과 명령 횟수만 관찰한다.
  await p.evaluate(()=>{
    const start=Liar.newContest,apply=Liar.apply;
    Liar.newContest=o=>(window.edgeState=start({...o,seed:9}));
    Liar.apply=(s,cmd)=>{const r=apply(s,cmd);window.edgeState=r.state;return r;};
  });
  await click(p,'liar');await click(p,'liar-start','[data-stage="town"]');await click(p,'liar-role');await click(p,'liar-go');
  await p.locator('[data-action="liar-card"]:not([disabled])').first().waitFor();
  await click(p,'liar-card');
  await p.evaluate(()=>{const b=document.querySelector('[data-action="liar-play"]');b.click();b.click();});
  assert(await p.evaluate(()=>edgeState.seats[0].played.length===1),'카드 빠른 연타는 한 번만 적용');
  await click(p,'liar-quit');await p.waitForTimeout(500);
  assert(await p.locator('dialog[open] [data-action="liar"]').isVisible(),'AI 진행 중 그만하기 확인 창 유지');
  await click(p,'liar');await p.waitForTimeout(400);
  assert(await p.locator('.screen-liar-lobby').count(),'제출 직후 중도 나가기 후 로비 유지');
  await click(p,'liar-start','[data-stage="town"]');await click(p,'liar-role');await click(p,'liar-go');
  await p.locator('[data-action="liar-card"]:not([disabled])').first().waitFor();
  assert(true,'중도 나가기 후 새 대회 조작 가능');
  await p.reload();assert(await p.locator('.screen-title').count(),'진행 중 새로고침: 타이틀에서 모드 선택');
  await click(p,'liar');assert(await p.locator('[data-action="liar-resume"]').count(),'진행 중 대회의 이어하기 버튼');
  await click(p,'title');
  await click(p,'passport');await click(p,'case','[data-index="0"]');await click(p,'start');await p.locator('.screen-board').waitFor();
  if(await p.locator('[data-action="hint"]').count())await click(p,'hint');
  const c=await p.evaluate(()=>FAKE.cases[0]);
  const honest=c.travelers.findIndex(t=>!t.fake);
  for(const j of [0,1,2]){
    await click(p,'evidence',`[data-traveler="${honest}"][data-evidence="${j}"]`);
    await p.evaluate(()=>{const b=document.querySelector('[data-action="accuse"]');b.click();b.click();});
    await p.locator('[data-after-animation]:not([disabled])').waitFor();
    assert(await p.locator('.result-top .glass.spent').count()===j+1,'진짜 증거 연타는 돋보기 1개만 소비');
    await click(p,'continue');
  }
  await p.locator('.screen-fail').waitFor();await p.screenshot({path:out+'390x844-practice-fail.png',fullPage:true});captures.push('390x844-practice-fail.png');
  await click(p,'retry');await click(p,'start');await p.locator('.screen-board').waitFor();assert(true,'연습 실패 후 다시 도전');
  await p.reload();
  // 깨진 이미지 응답은 네트워크 오류와 구분한다. 대체 UI는 두 모드에서 공통 처리한다.
  await p.route('**/assets/img/**/*.webp',r=>r.fulfill({status:200,contentType:'image/webp',body:'invalid image'}));
  await p.reload();
  await click(p,'passport');await click(p,'case','[data-index="0"]');await click(p,'start');await p.locator('.screen-board').waitFor();
  await p.waitForFunction(()=>[...document.images].every(e=>e.complete&&e.naturalWidth>0));
  await p.locator('img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));
  assert(await p.locator('img[data-fallback]').count()>0,'탐정 연습 이미지 실패 시 대체 그림');
  await p.screenshot({path:out+'390x844-image-fallback.png',fullPage:true});captures.push('390x844-image-fallback.png');
  await click(p,'settings');await click(p,'menu-title');await click(p,'liar');await click(p,'liar-start','[data-stage="town"]');
  await p.waitForFunction(()=>[...document.images].every(e=>e.complete&&e.naturalWidth>0));
  await p.locator('img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));
  assert(await p.locator('dialog img[data-fallback]').count()>0,'라이어 소개 이미지 실패 시 대체 그림');
  await click(p,'liar-role');await click(p,'liar-go');await p.locator('.screen-liar').waitFor();
  await p.locator('[data-action="liar-card"]:not([disabled])').first().waitFor();await click(p,'liar-card');await click(p,'liar-play');
  assert(true,'이미지 실패에도 두 모드 실제 조작 가능');
  await context.close();
  const blocked=await page.context().browser().newContext({reducedMotion:'reduce'});
  await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('저장 차단','SecurityError');}}));
  const b=await blocked.newPage();listen(b);await b.goto(base);
  await click(b,'sound');await click(b,'sound');await click(b,'passport');await click(b,'case','[data-index="0"]');await click(b,'start');await b.locator('.screen-board').waitFor();
  assert(true,'localStorage 차단에서 탐정 연습 시작·소리 조작');
  await click(b,'settings');await click(b,'menu-title');await click(b,'liar');await click(b,'liar-me','[data-who="miso"]');await click(b,'liar-start','[data-stage="town"]');await click(b,'liar-role');await click(b,'liar-go');await b.locator('.screen-liar').waitFor();
  assert(true,'localStorage 차단에서 여행자 선택·본편 시작');await blocked.close();
  const files=await page.context().browser().newContext({viewport:{width:1024,height:768},reducedMotion:'reduce'});
  const f=await files.newPage();listen(f);await f.goto('file:///C:/Users/hyunseung/Desktop/test/sahoe-games/fake-traveler/index.html');
  await f.locator('[data-action="settings"]').focus();await f.keyboard.press('Enter');
  assert(await f.locator('.settings-modal[open]').count(),'file:// Enter로 설정 열기');
  await f.keyboard.press('Tab');await f.keyboard.press('Escape');
  await click(f,'passport');await click(f,'case','[data-index="0"]');await click(f,'start');await f.locator('.screen-board').waitFor();
  const tc=await f.evaluate(()=>FAKE.cases[0]);
  for(const [i,t]of tc.travelers.entries())if(t.fake){
    const j=t.ev.findIndex(e=>e.v==='lie');await click(f,'evidence',`[data-traveler="${i}"][data-evidence="${j}"]`);await click(f,'accuse');await f.locator('[data-after-animation]:not([disabled])').waitFor();await click(f,'reveal');await click(f,'option',`[data-climate="${t.fake}"]`);await click(f,'after-reveal');
  }
  await f.locator('.screen-clear').waitFor();assert(true,'file:// 연습 사건 실제 해결');
  await click(f,'settings');await click(f,'menu-title');await click(f,'liar');await click(f,'liar-start','[data-stage="town"]');await click(f,'liar-role');await click(f,'liar-go');await f.locator('[data-action="liar-card"]:not([disabled])').first().waitFor();
  await click(f,'liar-card');await click(f,'liar-play');assert(true,'file:// 본편 카드 제출');await files.close();
  assert(errors.length===0,'콘솔 오류·페이지 오류 0개');
  return {checks,errors,captures};
}
