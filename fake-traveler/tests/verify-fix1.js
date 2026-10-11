/* FIX-1: 실제 버튼으로 각 단계에서 새로고침·이어하기 후 5라운드를 마친다. */
async page => {
  const {width:w,height:h}=page.viewportSize(), base='http://localhost:8790/fake-traveler/';
  const out='C:/Users/hyunseung/Desktop/test/sahoe-games/fake-traveler/check-verify/';
  const key='fake-traveler-v1-liar', checks=[],errors=[],captures=[];
  let titleFixture;
  const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  const click=async(a,extra='')=>{
    const root=await page.locator('dialog[open]').count()?page.locator('dialog[open]'):page;
    await root.locator(`[data-action="${a}"]${extra}`).first().click();
  };
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  const shot=async label=>{
    await page.locator('img').evaluateAll(async es=>{es.forEach(e=>e.loading='eager');await Promise.all(es.map(e=>e.decode().catch(()=>{})));});
    const file=`fix1-${w}x${h}-${label}.png`;
    await page.screenshot({path:out+file,fullPage:true});captures.push(file);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label}: 가로 넘침 없음`);
    assert(await page.evaluate(()=>{
      const root=document.querySelector('dialog[open]')||document.querySelector('#app');
      return [...root.querySelectorAll('.facts span')].every(e=>e.scrollWidth<=e.clientWidth+2&&e.scrollHeight<=e.clientHeight+2);
    }),`${label}: 기후 문구 잘림 없음`);
  };
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const observe=()=>page.evaluate(()=>{
    const apply=Liar.apply;
    Liar.apply=(s,cmd)=>{const r=apply(s,cmd);if(r.error)throw Error(`명령 실패: ${r.error}`);return r;};
  });
  const reload=async label=>{
    await page.reload();assert(await page.locator('.screen-title').count(),`${label}: 새로고침 정상 시작`);
    const before=await saved();assert(before,`${label}: 대회 저장 존재`);
    const progress=await page.evaluate(()=>{const {stars,sound,liar}=FT.progress();return JSON.stringify({stars,sound,liar});});
    await observe();await click('liar');
    assert(await page.locator('[data-action="liar-resume"]').count()===1,`${label}: 이어하기 한 개`);
    await shot(`${label}-resume`);await click('liar-resume');
    assert(await page.evaluate(()=>{const {stars,sound,liar}=FT.progress();return JSON.stringify({stars,sound,liar});})===progress,`${label}: 기존 기록 보존`);
    return before;
  };
  const ready=()=>page.locator('[data-action="liar-card"]:not([disabled])').first().waitFor();
  const play=async()=>{await ready();await click('liar-card');await click('liar-play');};
  const voteReady=()=>page.locator('[data-action="liar-vote"]').first().waitFor();
  const resultReady=()=>page.locator('[data-action="liar-next"],[data-action="liar-finish"]').waitFor();

  for(const checkpoint of ['intro','play','vote','reveal']){
    await page.goto(base);
    await page.evaluate(key=>{localStorage.removeItem(key);localStorage.removeItem('fake-traveler-v1');},key);
    await page.reload();await observe();
    const climate={intro:'tundra',play:'icecap',vote:'highland',reveal:'desert'}[checkpoint];
    await page.evaluate(climate=>{
      const start=Liar.newContest;
      let seed=1;
      while(Liar.apply(start({seed}),{type:'start'}).state.claim!==climate)seed++;
      Liar.newContest=o=>start({...o,seed});
    },climate);
    await click('liar');assert(!await page.locator('[data-action="liar-resume"]').count(),'새 대회에는 이어하기 없음');
    await click('liar-start','[data-stage="town"]');
    await shot(`${checkpoint}-changed-facts`);
    if(checkpoint==='intro'){
      const old=await saved();await reload('intro');
      assert(JSON.stringify(await saved())===JSON.stringify(old),'소개 상태 그대로 복원');
      assert(await page.locator('[data-action="liar-role"]').count(),'이번 여행지 소개 복원');
      await click('liar-role');await reload('role');
      assert(await page.locator('[data-action="liar-go"]').count(),'내 역할 소개 복원');
    }else await click('liar-role');
    await click('liar-go');
    if(checkpoint==='play'){
      await ready();const old=await saved();await reload('play');await ready();
      assert(JSON.stringify(await saved())===JSON.stringify(old),'카드·차례·난수 그대로 복원');
      await shot('play-restored');
    }
    for(let round=1;round<=5;round++){
      if(round>1){await click('liar-role');await click('liar-go');}
      for(let lap=0;lap<3;lap++){
        await play();
        if(round===1&&lap===0&&checkpoint==='play'){
          const before=await reload('ai-play');
          const expected=await page.evaluate(s=>{
            while(s.phase==='play'&&Liar.current(s)!==0)s=Liar.apply(s,Liar.decide(s,Liar.current(s))).state;
            return s;
          },before.state);
          await ready();assert(JSON.stringify((await saved()).state)===JSON.stringify(expected),'AI 대기 복원: 중복·건너뛰기 없이 같은 카드·난수');
        }
      }
      await voteReady();
      if(round===1&&checkpoint==='vote'){
        const old=await saved();await reload('vote');await voteReady();
        assert(JSON.stringify(await saved())===JSON.stringify(old),'투표 선택 단계 그대로 복원');await shot('vote-restored');
      }
      await click('liar-vote');
      if(round===1&&checkpoint==='vote'){
        const before=await reload('ai-vote');
        const expected=await page.evaluate(s=>Liar.runAI(s),before.state);
        await resultReady();assert(JSON.stringify((await saved()).state)===JSON.stringify(expected),'AI 투표 복원: 투표·칩 중복 적용 없음');
      }
      await resultReady();
      if((round===1&&checkpoint==='reveal')||(round===5&&checkpoint==='intro')){
        const old=await saved(), heading=await page.locator('.lr h2').textContent(), why=await page.locator('.lr-why').textContent();
        await reload(round===5?'final-result':'reveal');await resultReady();
        assert(JSON.stringify(await saved())===JSON.stringify(old),'결과 상태·칩 그대로 복원');
        assert(await page.locator('.lr h2').textContent()===heading&&await page.locator('.lr-why').textContent()===why,'결과 제목·나를 의심한 이유 보존');
        await shot(round===5?'final-result-restored':'reveal-restored');
      }
      const s=(await saved()).state;
      if(round===5&&checkpoint==='reveal') titleFixture=s;
      assert(s.log.length===12&&s.results.length===round&&s.seats.every(x=>x.played.length===3&&new Set(x.played.map(c=>c.id)).size===3),`${checkpoint} ${round}: 12장·한 장씩·결과 한 번`);
      await click(round===5?'liar-finish':'liar-next');
    }
    await page.locator('.screen-liar-end').waitFor();
    assert(await saved()===null,'대회 완료 시 중간 저장 삭제');
    assert(await page.evaluate(()=>FT.progress().liar.played)===1,'이어한 대회 완료 기록 한 번');
    await click('liar');assert(!await page.locator('[data-action="liar-resume"]').count(),'완료 후 이어하기 없음');
  }

  // 조건 숫자 3·2 경계의 칭호 문구는 마지막 라운드 저장본으로 따로 확인한다.
  await page.evaluate(({key,state})=>{
    state.seats[0].stats.caught=3;state.seats[0].stats.accused=2;
    localStorage.setItem(key,JSON.stringify({state,intro:0}));
  },{key,state:titleFixture});
  await page.reload();await click('liar');await click('liar-resume');await click('liar-finish');
  const titles=await page.locator('.le-titles').textContent();
  assert(titles.includes('3번 이상')&&titles.includes('두 번 이상')&&!titles.includes('넘게'),'칭호 3·2 경계 숫자와 이상 문구');
  await shot('title-boundaries');await click('liar');

  await click('liar-start','[data-stage="town"]');await click('liar-role');await click('liar-go');await ready();
  await play();await click('liar-quit');await click('close');assert(await saved()!==null,'그만하기 취소는 저장 보존');
  await click('liar-quit');await click('liar');await page.waitForTimeout(200);
  assert(await saved()===null&&!await page.locator('[data-action="liar-resume"]').count(),'AI 대기 중 그만하기 확정은 저장 삭제');
  for(const value of ['{broken',JSON.stringify({state:{v:1},intro:0})]){
    await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key,value});await page.reload();await click('liar');
    assert(!await page.locator('[data-action="liar-resume"]').count(),'손상된 저장은 이어하기에서 제외');
  }

  for(const failure of ['access','write']){
    const context=await page.context().browser().newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});
    await context.addInitScript(failure=>{
      if(failure==='access')Object.defineProperty(window,'localStorage',{get(){throw new DOMException('저장 차단','SecurityError');}});
      else for(const method of ['setItem','removeItem'])Storage.prototype[method]=()=>{throw new DOMException('저장 용량 초과','QuotaExceededError');};
    },failure);
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const press=async a=>{const root=await p.locator('dialog[open]').count()?p.locator('dialog[open]'):p;await root.locator(`[data-action="${a}"]`).first().click();};
    await p.goto(base);await press('liar');await press('liar-start');await press('liar-role');await press('liar-go');
    for(let lap=0;lap<3;lap++){await p.locator('[data-action="liar-card"]:not([disabled])').first().waitFor();await press('liar-card');await press('liar-play');}
    await p.locator('[data-action="liar-vote"]').first().waitFor();await press('liar-vote');await p.locator('[data-action="liar-next"]').waitFor();
    assert(await p.locator('.lr-why').count(),`${failure}: 저장 실패에도 카드·투표·결과 정상 진행`);
    await press('liar-next');await press('liar-role');await press('liar-go');await p.locator('[data-action="liar-quit"]').waitFor();await press('liar-quit');await press('liar');
    assert(await p.locator('.screen-liar-lobby').count(),`${failure}: 저장 삭제 실패에도 그만하기 정상 진행`);
    await context.close();
  }

  await page.goto(base+'?debug=1');await click('passport');await click('unlock');
  for(const [index,label]of [[3,'desert'],[8,'icecap'],[9,'highland']]){
    await click('case',`[data-index="${index}"]`);await shot(`story-${label}`);
    if(index===3){const i=await page.evaluate(()=>FAKE.cases[3].travelers.findIndex(t=>t.fake==='steppe'));await click('start');await page.locator('.screen-board').waitFor();await click('evidence',`[data-traveler="${i}"][data-evidence="0"]`);await click('accuse');await page.locator('[data-after-animation]:not([disabled])').waitFor();assert((await page.locator('.reason').textContent()).includes('끝없는 풀밭은 스텝'),'사건 4 스텝 판정 문구');await shot('desert-verdict');await click('reveal');await click('option','[data-climate="steppe"]');await click('after-reveal');await click('passport');}
    else await click('passport');
  }
  await click('book');
  for(const id of ['tundra','icecap','highland']){await click('detail',`[data-climate="${id}"]`);await shot(`book-${id}`);await click('close');}
  assert(await page.evaluate(()=>{const t=FAKE.cases[3].travelers.find(t=>t.fake==='steppe');return t.ev[0].v==='lie'&&t.ev[2].v==='lie';}),'사건 4 판정 유지');
  assert(await page.evaluate(()=>FAKE.climates.highland.rain==='높이에 따라 달라요'&&FAKE.climates.highland.look.includes('희박한 공기')),'고산 비·공기 칸 분리');
  assert(errors.length===0,'콘솔·페이지 오류 0개');
  return {w,h,checks,errors,captures};
}
