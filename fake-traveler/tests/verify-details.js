/* Playwright 보완 검사: 키보드, 설정, 오답과 저장 기록. */
async page => {
  const checks=[],errors=[],captures=[];
  const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  const click=async(a,extra='')=>{
    const root=await page.locator('dialog[open]').count()?page.locator('dialog[open]'):page;
    await root.locator(`[data-action="${a}"]${extra}`).first().click();
  };
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://localhost:8790/fake-traveler/');
  await page.evaluate(()=>localStorage.removeItem('fake-traveler-v1'));await page.reload();
  await page.locator('[data-action="settings"]').focus();await page.keyboard.press('Enter');
  assert(await page.locator('.settings-modal[open]').count(),'Enter로 설정 열기');
  await page.locator('[data-action="reset-confirm"]').focus();await page.keyboard.press('Tab');
  assert(await page.locator('.modal-close').evaluate(e=>e===document.activeElement),'설정 Tab 포커스 순환');
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator('[data-action="reset-confirm"]').evaluate(e=>e===document.activeElement),'설정 Shift+Tab 포커스 순환');
  await page.keyboard.press('Escape');assert(!await page.locator('dialog[open]').count(),'Esc 설정 닫기');
  await page.evaluate(()=>{
    const Audio=window.AudioContext;
    window.verifyAudio=[];
    window.AudioContext=function(){const ctx=new Audio();verifyAudio.push(ctx);return ctx;};
  });
  await click('sound');
  assert(await page.evaluate(()=>FT.progress().sound&&verifyAudio.length===1&&verifyAudio[0].state==='running'),'소리 켜기·AudioContext 실행');
  await click('sound');assert(await page.evaluate(()=>!FT.progress().sound),'소리 끄기');
  await click('passport');await click('case','[data-index="0"]');await click('start');await page.locator('.screen-board').waitFor();
  await click('settings');await click('close');assert(await page.locator('.screen-board').count(),'설정 닫기 후 진행 유지');
  const c=await page.evaluate(()=>FAKE.cases[0]),i=c.travelers.findIndex(t=>t.fake),t=c.travelers[i];
  await click('evidence',`[data-traveler="${i}"][data-evidence="0"]`);await click('accuse');await page.locator('[data-after-animation]:not([disabled])').waitFor();await click('reveal');
  await click('option',`[data-climate="${t.options.find(x=>x!==t.fake)}"]`);
  assert(await page.locator('.screen-reveal .glass.spent').count()===1,'정체 오답 돋보기 1개 소비');
  assert(await page.locator('.option-wrong').count()===1,'정체 오답 보기 비활성 표시');
  await click('option',`[data-climate="${t.fake}"]`);await click('after-reveal');
  assert(await page.evaluate(()=>FT.progress().stars[0]===2),'오답 후 해결 별 2개와 상태 일치');
  const saved=await page.evaluate(()=>JSON.stringify(FT.progress()));await page.reload();
  assert(await page.evaluate(()=>JSON.stringify(FT.progress()))===saved,'새로고침 후 해결·사진·소리 기록 유지');
  await click('book');await page.locator('[data-action="tab-cards"]').focus();await page.keyboard.press('ArrowRight');
  assert(await page.locator('[data-action="tab-ladder"]').getAttribute('aria-selected')==='true','도감 오른쪽 방향키 탭 이동');
  assert(await page.locator('[data-action="tab-ladder"]').evaluate(e=>e===document.activeElement),'방향키 이동 후 탭 포커스 유지');
  await page.keyboard.press('ArrowLeft');await click('detail','[data-climate="rainforest"]');
  const before=await page.locator('.gallery-controls [aria-live]').textContent();await page.keyboard.press('ArrowRight');
  assert(await page.locator('.gallery-controls [aria-live]').textContent()!==before,'도감 사진 오른쪽 방향키 이동');
  await page.keyboard.press('ArrowLeft');assert(await page.locator('.gallery-controls [aria-live]').textContent()===before,'도감 사진 왼쪽 방향키 복귀');
  await page.keyboard.press('Escape');await click('settings');await click('reset-confirm');await click('settings');
  assert(await page.evaluate(()=>JSON.stringify(FT.progress()))===saved,'초기화 취소는 기록 보존');
  await click('reset-confirm');await click('reset');
  assert(await page.locator('.screen-title').count()&&await page.evaluate(()=>FT.progress().stars.every(x=>x===0)),'초기화 확인 후 빈 여권');
  await page.evaluate(()=>localStorage.setItem('fake-traveler-v1','{invalid'));await page.reload();
  assert(await page.locator('.screen-title').count()&&await page.evaluate(()=>FT.progress().stars.every(x=>x===0)),'손상된 저장 기록에서 정상 시작');
  assert(errors.length===0,'콘솔·페이지 오류 0개');return {checks,errors,captures};
}
