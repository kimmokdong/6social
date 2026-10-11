/* 디버그용 고정 씨앗·투표만 주입해 본편 결과 네 종류를 실제 화면에서 확인한다. */
async page => {
  const checks=[],errors=[],captures=[];
  const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  const click=async(a,extra='')=>{
    const root=await page.locator('dialog[open]').count()?page.locator('dialog[open]'):page;
    await root.locator(`[data-action="${a}"]${extra}`).first().click();
  };
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const humanLiar of [true,false])for(const caught of [true,false]){
    await page.goto('http://localhost:8790/fake-traveler/?debug=1');
    // 첫 결과는 실제 애니메이션과 원래 대기 시간도 확인한다.
    await page.emulateMedia({reducedMotion:humanLiar&&caught?'no-preference':'reduce'});
    await page.evaluate(({humanLiar,caught})=>{
      const start=Liar.newContest,apply=Liar.apply,decide=Liar.decide;
      let seed=1;
      while((apply(start({seed,stage:'town',me:'haneul'}),{type:'start'}).state.liarSeat===0)!==humanLiar)seed++;
      FT.progress().liar.me='haneul';
      Liar.newContest=o=>(window.endingState=start({...o,seed}));
      Liar.apply=(s,c)=>{const r=apply(s,c);if(r.error)throw Error(r.error);window.endingState=r.state;return r;};
      Liar.decide=(s,seat)=>s.phase==='vote'?{type:'vote',seat,target:caught&&seat!==s.liarSeat?s.liarSeat:s.seats.findIndex((_,i)=>i!==seat&&i!==s.liarSeat)}:decide(s,seat);
    },{humanLiar,caught});
    await click('liar');await click('liar-start','[data-stage="town"]');await click('liar-role');await click('liar-go');
    for(let lap=0;lap<3;lap++){
      await page.locator('[data-action="liar-card"]:not([disabled])').first().waitFor();await click('liar-card');await click('liar-play');
      if(lap===0){
        await click('liar-topic');await page.waitForTimeout(500);
        assert(await page.locator('dialog[open] .lri h2').isVisible(),'AI 진행 중 여행지 설명 창 유지');
        await page.keyboard.press('Escape');assert(!await page.locator('dialog[open]').count(),'AI 설명 창 Esc 닫기');
      }
    }
    await page.locator('[data-action="liar-vote"]').first().waitFor();
    const target=await page.evaluate(caught=>caught&&endingState.liarSeat!==0?endingState.liarSeat:endingState.seats.findIndex((_,i)=>i!==0&&i!==endingState.liarSeat),caught);
    await click('liar-vote',`[data-seat="${target}"]`);await page.locator('[data-action="liar-next"]').waitFor();
    const expected=humanLiar?(caught?'들켰다!':'안 들켰다!'):(caught?'라이어를 잡았다!':'라이어가 빠져나갔다!');
    assert(await page.locator('.lr h2').textContent()===expected,expected);
    assert(await page.locator('.lr-why').count()===1,'whyLine 유지');
    const file=`${humanLiar?'me':'ai'}-${caught?'caught':'escaped'}-ending.png`;
    await page.screenshot({path:'C:/Users/hyunseung/Desktop/test/sahoe-games/fake-traveler/check-verify/'+file});captures.push(file);
  }
  assert(errors.length===0,'콘솔·페이지 오류 0개');return {checks,errors,captures};
}
