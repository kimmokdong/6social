/* 실행: Playwright CLI run-code --filename ../tests/verify-ui.js
 * 현재 URL의 verify=story|liar|edges, w/h를 사용한다. 실제 버튼으로만 플레이한다. */
async (page, mode = new URL(page.url()).searchParams.get('verify') || 'story') => {
  const {width:w,height:h} = page.viewportSize();
  const base = 'http://localhost:8790/fake-traveler/';
  const out = 'C:/Users/hyunseung/Desktop/test/sahoe-games/fake-traveler/check-verify/';
  const checks = [], errors = [], layouts = [], captures = [], endings = [];
  const onError = e => errors.push(e.message), onConsole = m => { if (m.type() === 'error') errors.push(m.text()); };
  page.on('pageerror', onError); page.on('console', onConsole);
  const assert = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  const click = async (a, extra = '') => {
    const root = await page.locator('dialog[open]').count() ? page.locator('dialog[open]') : page;
    await root.locator(`[data-action="${a}"]${extra}`).first().click();
  };
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('fake-traveler-v1')));
  const capture = async label => {
    await page.locator('img').evaluateAll(async es => {
      es.forEach(e => e.loading = 'eager');
      await Promise.all(es.map(e => e.decode().catch(() => {})));
    });
    const file = `${w}x${h}-${mode}-${label}.png`;
    await page.screenshot({path: out + file, fullPage: true}); captures.push(file);
    layouts.push(await page.evaluate(label => {
      const root = document.querySelector('dialog[open]') || document.querySelector('#app');
      const visible = e => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden'; };
      return {label, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        clippedModalHeading: root.tagName==='DIALOG'&&root.querySelector('h2')?.getBoundingClientRect().top<root.getBoundingClientRect().top ? [root.querySelector('h2').textContent] : [],
        smallButtons: [...root.querySelectorAll('button:not(:disabled)')].filter(visible).filter(e => {
          const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44;
        }).map(e => ({action:e.dataset.action, text:e.textContent.trim(), width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),
        smallText: [...root.querySelectorAll('p,b,strong,span,button,figcaption,small,i,label')].filter(visible).filter(e => e.textContent.trim() && !e.children.length && parseFloat(getComputedStyle(e).fontSize) < 18 && !e.closest('.debug')).map(e => ({class:e.className,text:e.textContent.trim(),size:getComputedStyle(e).fontSize})),
        smallButtonText: [...root.querySelectorAll('button:not(:disabled)')].filter(visible).filter(e=>!e.closest('.debug')).flatMap(button=>{
          const texts=[],walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT);
          while(walker.nextNode()){
            const node=walker.currentNode,e=node.parentElement;
            if(node.textContent.trim()&&visible(e)&&parseFloat(getComputedStyle(e).fontSize)<20)texts.push({action:button.dataset.action,text:node.textContent.trim(),size:getComputedStyle(e).fontSize});
          }
          return texts;
        }),
        clipped: [...root.querySelectorAll('.speech,.cap,.item-wrap strong')].filter(visible).filter(e => {
          const box=e.closest('.mini-ev,.hand-card');
          const r=e.getBoundingClientRect(), p=box?.getBoundingClientRect();
          return e.scrollHeight>e.clientHeight+2 || e.scrollWidth>e.clientWidth+2 || (p && (r.top<p.top-2 || r.bottom>p.bottom+2));
        }).map(e => ({class:e.className,text:e.textContent,sh:e.scrollHeight,ch:e.clientHeight,sw:e.scrollWidth,cw:e.clientWidth}))};
    }, label));
    assert(layouts.at(-1).scrollWidth <= w, `${label}: 가로 스크롤 없음`);
  };
  await page.setViewportSize({width:w,height:h});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(base);
  await page.evaluate(() => localStorage.removeItem('fake-traveler-v1'));
  await page.reload();
  if (mode === 'story') {
    await capture('title');
    await click('passport'); await capture('passport');
    for (let index = 0; index < 10; index++) {
      await click('case', `[data-index="${index}"]`);
      if (index === 0 || index === 9) await capture(`intro-${index+1}`);
      if (await page.locator('[data-action="hint"]').count()) await click('hint');
      await click('start'); await page.locator('.screen-board').waitFor();
      if (await page.locator('[data-action="hint"]').count()) await click('hint');
      await capture(`board-${index+1}`);
      await click('claim'); await page.keyboard.press('Escape');
      assert(!await page.locator('dialog[open]').count(), 'Esc 기후 카드 닫기');
      const c = await page.evaluate(i => FAKE.cases[i], index);
      const honest = c.travelers.findIndex(t => !t.fake);
      if (honest >= 0) { await click('evidence', `[data-traveler="${honest}"][data-evidence="0"]`); await click('close'); }
      for (const [i,t] of c.travelers.entries()) if (t.fake) {
        const j = t.ev.findIndex(e => e.v === 'lie');
        await click('evidence', `[data-traveler="${i}"][data-evidence="${j}"]`);
        await click('accuse'); await page.locator('[data-after-animation]:not([disabled])').waitFor();
        if (index === 0 || index === 9) await capture(`objection-${index+1}`);
        await click('reveal');
        if (await page.locator('[data-action="hint"]').count()) await click('hint');
        if (index === 0 || index === 9) await capture(`reveal-${index+1}`);
        await click('option', `[data-climate="${t.fake}"]`); await click('after-reveal');
      }
      await page.locator('.screen-clear').waitFor();
      assert((await state()).stars[index] === 3, `사건 ${index+1}: 별 3개 저장`);
      if (index === 0 || index === 9) await capture(`clear-${index+1}`);
      await click('passport');
    }
    const before = await state(); await page.reload();
    assert(JSON.stringify(await state()) === JSON.stringify(before), '해결 기록 새로고침 일치');
    await click('book'); await capture('book');
    await click('detail','[data-climate="rainforest"]'); await capture('detail');
    await click('gallery-next'); await click('gallery-prev'); await page.keyboard.press('Escape');
    await click('tab-ladder'); await capture('ladder'); await click('tab-badges'); await capture('badges');
    await click('settings'); await click('sound'); assert((await state()).sound, '소리 켜기 저장');
    await click('sound'); assert(!(await state()).sound, '소리 끄기 저장'); await click('menu-title');
    assert(await page.locator('.screen-title').count(), '처음 화면');
  } else if (mode === 'liar') {
    await page.evaluate(() => {
      const start = Liar.newContest, apply = Liar.apply;
      let seed;
      for (let n = 1; n <= 500; n++) {
        const s = apply(start({seed:n, stage:'town',me:'haneul'}),{type:'start'}).state;
        if (s.seats[0].role==='liar' && s.seats[0].hand.some(c=>c.type==='photo' && c.also && Liar.verdict(c,s.claim).v!=='lie')) {seed=n;break;}
      }
      if (!seed) throw Error('공통 사진 시드 없음');
      Liar.newContest = options => (window.verifyState = start({...options,seed}));
      Liar.apply = (s,cmd) => { const r=apply(s,cmd); if(r.error)throw Error(r.error); window.verifyState=r.state; return r; };
    });
    await click('liar'); await capture('lobby');
    const stages = w === 1366 ? ['town','nation','world'] : ['town'];
    let photoShown = false;
    for (const stage of stages) {
      if (stage !== 'town') await page.evaluate(stage => { FT.progress().liar.unlocked.push(stage); LiarUI.lobby(); }, stage);
      await click('liar-start',`[data-stage="${stage}"]`);
      for (let round=1;round<=5;round++) {
        await page.locator('[data-action="liar-role"]').waitFor();
        if (round===1) await capture(`${stage}-intro`);
        await click('liar-role'); if(round===1)await capture(`${stage}-role`);
        await page.keyboard.press('Escape'); assert(await page.locator('dialog[open]').count(),'역할 설명은 Esc로 닫히지 않음');
        await click('liar-go');
        for(let lap=1;lap<=3;lap++) {
          await page.locator('[data-action="liar-card"]:not([disabled])').first().waitFor();
          const card=await page.evaluate(()=>{const s=verifyState;return s.seats[0].hand.find(c=>c.type==='photo'&&c.also&&Liar.verdict(c,s.claim).v!=='lie')||s.seats[0].hand.find(c=>Liar.verdict(c,s.claim).v!=='lie')||s.seats[0].hand[0];});
          if(!photoShown&&card.type==='photo'&&card.also){
            await page.locator(`[data-card="${card.id}"]`).scrollIntoViewIfNeeded();await capture('new-photo-hand');
            assert(await page.locator(`[data-card="${card.id}"] img`).evaluate(e=>e.complete&&e.naturalWidth===1200),'새 사진 1200px 로딩');photoShown=true;
          }
          await click('liar-card',`[data-card="${card.id}"]`);await click('liar-play');
          if(round===1&&lap===1)await capture(`${stage}-played`);
        }
        await page.locator('[data-action="liar-vote"]').first().waitFor();
        if(round===1)await capture(`${stage}-vote`);
        await click('liar-vote');
        await page.locator('[data-action="liar-next"],[data-action="liar-finish"]').waitFor();
        assert(await page.evaluate(round=>verifyState.log.length===12&&verifyState.results.length===round,round),'12장 제출 및 라운드 완료');
        const reason=await page.evaluate(()=>{
          const r=verifyState.results.at(-1),mine=r.reasons.filter(x=>x.target===0).sort((a,b)=>b.d-a.d);
          return {heading:r.liar===0?(r.caught?'들켰다!':'안 들켰다!'):(r.caught?'라이어를 잡았다!':'라이어가 빠져나갔다!'),who:mine.length?FAKE.travelers[verifyState.seats[mine[0].voter].who].name:null,delta:r.delta};
        });
        endings.push(reason.heading);
        assert(await page.locator('.lr h2').textContent()===reason.heading,'역할·잡힘에 맞는 결과 제목');
        const why=await page.locator('.lr-why').textContent();
        assert(reason.who?why.includes(reason.who)&&why.includes('나를 의심한 이유'):why.includes('아무도 나를 의심하지 않았어요'),'whyLine 결과 줄과 의심 기록 일치');
        assert(JSON.stringify(await page.locator('.lr-chips b').allTextContents().then(xs=>xs.map(Number)))===JSON.stringify(reason.delta),'라운드 칩 증감과 엔진 일치');
        if(round===1)await capture(`${stage}-reveal`);
        await click(round===5?'liar-finish':'liar-next');
      }
      await page.locator('.screen-liar-end').waitFor();await capture(`${stage}-end`);
      assert(await page.evaluate(()=>[...document.querySelectorAll('.pod-chips')].every((el,k)=>Number(el.textContent.trim())===verifyState.seats[Liar.ranking(verifyState)[k]].chips)),'결과 칩과 엔진 일치');
      await click('liar');
    }
    assert(photoShown,'공통 사진 손패 출현');
  } else {
    // 빠른 연타, 중도 나가기와 새로고침을 각각 확인한다.
    await click('liar');await click('liar-start','[data-stage="town"]');await click('liar-role');await click('liar-go');
    await page.locator('[data-action="liar-card"]:not([disabled])').first().waitFor();
    await click('liar-card');
    await page.evaluate(()=>document.querySelector('[data-action="liar-play"]').click());
    await click('liar-quit');await click('liar');
    await page.waitForTimeout(600);
    checks.push('카드 제출 직후 나가기');
    await page.reload();checks.push('진행 중 새로고침은 타이틀(이어하기 저장 없음)');
    await click('passport');await click('case','[data-index="0"]');await click('start');await page.locator('.screen-board').waitFor();
    if(await page.locator('[data-action="hint"]').count())await click('hint');
    await click('evidence','[data-traveler="0"][data-evidence="0"]');
    await page.keyboard.press('Tab');await page.keyboard.press('Escape');
    assert(!await page.locator('dialog[open]').count(),'Tab/Esc 증거 화면');
    await page.reload();checks.push('탐정 연습 중간 상태 저장 없음');
    await page.route('**/assets/img/scenes/*.webp', route=>route.abort());
    await click('passport');await click('case','[data-index="0"]');await click('start');
    await page.waitForTimeout(500);await capture('missing-images');
    checks.push(await page.locator('.screen-board').count() ? '사진 장애에도 보드 진행' : '사진 장애로 시작 불가');
    await page.unroute('**/assets/img/scenes/*.webp');
  }
  page.off('pageerror',onError);page.off('console',onConsole);
  return {mode,w,h,checks,errors,layouts,captures,endings:[...new Set(endings)]};
}
