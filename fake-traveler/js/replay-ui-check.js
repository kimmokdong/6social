/* Playwright CLI run-code --filename fake-traveler/js/replay-ui-check.js */
async page => {
  const url='file:///C:/Users/hyunseung/Desktop/test/sahoe-games/fake-traveler/index.html';
  const output='C:/Users/hyunseung/AppData/Local/Temp/sahoe-games-replay-check/';
  const errors=[],checks=[],captures=[],layouts=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  const click=async(a,extra='')=>{const root=await page.locator('dialog[open]').count()?page.locator('dialog[open]'):page;await root.locator(`[data-action="${a}"]${extra}`).first().click();};
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fake-traveler-v1')));
  const base=()=>({stars:[3,3,3,0,0,0,0,0,0,0],sound:false});
  const seed=async(n)=>{await click('seed');await page.locator('#case-seed').fill(String(n));await click('seed-start');await page.locator('.screen-board').waitFor();};
  const capture=async(label,w,h)=>{const file=`${w}x${h}-${label}.png`;const style=await page.addStyleTag({content:'.debug{display:none!important}'});await page.locator('img').evaluateAll(async es=>{es.forEach(e=>e.loading='eager');await Promise.all(es.map(e=>e.decode()));});await page.screenshot({path:output+file,fullPage:!(await page.locator('dialog[open]').count())});await style.evaluate(e=>e.remove());captures.push(file);};
  const boardFits=async(w,h)=>{
    const size=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,footer:document.querySelector('.board-footer').getBoundingClientRect().bottom,tiles:[...document.querySelectorAll('.traveler-row')].map(e=>({h:e.getBoundingClientRect().height,sh:e.scrollHeight}))}));
    layouts.push({w,h,...size});assert(size.sw<=w,`${w}×${h} 보드 가로 넘침 없음`);if(w>700){assert(size.sh<=h+1,`${w}×${h} 보드 스크롤 없음`);assert(size.footer<=h+1,`${w}×${h} 수사 끝 버튼 화면 내`);}
  };
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [w,h] of [[1366,768],[1280,800],[1024,768],[768,1024],[800,1280],[390,844]]){
    await page.setViewportSize({width:w,height:h});await page.goto(url+'?debug=1');
    await page.evaluate(p=>localStorage.setItem('fake-traveler-v1',JSON.stringify(p)),base());await page.reload();
    await capture('title',w,h);await click('passport');await capture('passport-locked',w,h);
    assert(await page.locator('[data-action="endless"]').isDisabled(),'사건10 미해결 무한 수사 잠금');
    await click('book');await click('tab-ladder');await capture('ladder-locked',w,h);assert(await page.locator('.branch-climates .leaf-locked').count()>0,'잠긴 분류 기후 물음표 실루엣');
    await seed(3);assert(await page.locator('.traveler-row').count()===3,'시드3 여행자3명');await boardFits(w,h);await capture('board-3',w,h);
    assert(await page.locator('.fake-count').textContent()==='가짜 ?명','가짜 수 숨김');
    await click('evidence','[data-traveler="1"][data-evidence="0"]');await click('accuse');await page.locator('[data-after-animation]:not([disabled])').waitFor();await click('reveal');await capture('reveal',w,h);
    const sources=await page.locator('.climate-option img').evaluateAll(es=>es.map(e=>e.src.split('/').pop().replace('.webp','')));
    const expected=await page.evaluate(()=>Replay.generate(Replay.seeded(3),undefined,0));
    assert(!sources.some(img=>expected.travelers.some(t=>t.ev[0].img===img)),'보기 사진 보드와 겹치지 않음');
    await click('option','[data-climate="rainforest"]');assert(!(await page.locator('.revealed-layout h2').textContent()).includes('(는)'),'조사 자연스러움');await click('after-reveal');await page.locator('.screen-board').waitFor();
    assert(((await saved()).endlessStars||0)===0,'정체 공개만으로 무한 수사 완료하지 않음');await click('finish');await page.locator('.screen-clear').waitFor();await capture('finish-success-rank',w,h);
    let p=await saved();assert(p.endless.streak===1&&p.endless.best===1&&p.endlessStars===3,'연속·최고·별 저장');assert(p.photos.length>=4,'보드·실제 여행 사진 수집');assert(p.badges.includes('first')&&p.badges.includes('speed'),'첫 해결·속도 배지');assert(await page.locator('.rank-up').count()===1,'등급 상승 연출');
    await click('badges');await capture('badges-new',w,h);assert(await page.locator('.badge-new').count()>0,'NEW 최초 표시');await click('tab-cards');await click('tab-badges');assert(await page.locator('.badge-new').count()===0,'NEW 한 번만 표시');
    await click('tab-cards');await capture('collection',w,h);await click('detail','[data-climate="rainforest"]');await capture('photos',w,h);
    assert(await page.locator('.gallery-thumbs .blank-photo').count()>0,'미수집 사진 물음표');await page.keyboard.press('Escape');await click('tab-ladder');await capture('ladder',w,h);
    assert(await page.locator('.branch-climates .ladder-leaf').count()===7,'분류 끝 기후 7종 표시');
    await seed(1);assert(await page.locator('.traveler-row').count()===4,'시드1 여행자4명');await boardFits(w,h);await capture('board-4',w,h);await click('finish');await page.locator('.screen-fail').waitFor();await capture('finish-fail',w,h);
    assert(await page.locator('.missed-tile.marked-lie').count()>=4,'놓친 가짜 거짓 증거 표시');p=await saved();assert(p.endless.streak===0&&p.endless.best===1,'실패 연속 초기화·최고 유지');
    await seed(0);await click('finish');await page.locator('.screen-clear').waitFor();assert((await saved()).badges.includes('nofake'),'가짜0 즉시 완료 배지');await capture('nofake-success',w,h);
    await click('passport');await click('case','[data-index="9"]');await click('start');await page.locator('.screen-board').waitFor();await boardFits(w,h);await capture('story-final-5',w,h);
    await page.goto(url+'?debug=1');await page.evaluate(p=>{p.stars=Array(10).fill(3);localStorage.setItem('fake-traveler-v1',JSON.stringify(p));},base());await page.reload();await click('passport');await capture('passport-open',w,h);assert(!await page.locator('[data-action="endless"]').isDisabled(),'구형 저장 사건10으로 무한 수사 열림');
  }
  // 두 가짜를 각각 실제로 잡고 정체를 밝혀도 종료 버튼으로 확인해야 한다.
  await page.setViewportSize({width:1366,height:768});await page.goto(url+'?debug=1');await page.evaluate(p=>localStorage.setItem('fake-traveler-v1',JSON.stringify(p)),base());await page.reload();await seed(1);
  for(const i of [0,2]){await click('evidence',`[data-traveler="${i}"][data-evidence="0"]`);await click('accuse');await page.locator('[data-after-animation]:not([disabled])').waitFor();await click('reveal');await click('option','[data-climate="tundra"]');await click('after-reveal');await page.locator('.screen-board').waitFor();}
  await click('finish');assert((await saved()).badges.includes('twin'),'가짜2 실제 플레이 배지');
  let p=await saved();p.endless.streak=9;p.endless.best=9;p.counters.perfect=4;p.counters.trap=4;
  await page.evaluate(p=>localStorage.setItem('fake-traveler-v1',JSON.stringify(p)),p);await page.reload();
  await seed(0);const c=await page.evaluate(()=>Replay.generate(Replay.seeded(0),undefined,9));
  for(const [i,t] of c.travelers.entries())if(t.fake){await click('evidence',`[data-traveler="${i}"][data-evidence="0"]`);await click('accuse');await page.locator('[data-after-animation]:not([disabled])').waitFor();await click('reveal');await click('option',`[data-climate="${t.fake}"]`);await click('after-reveal');}
  await click('finish');p=await saved();assert(p.badges.includes('streak')&&p.badges.includes('perfect')&&p.badges.includes('trap'),'연속10·완벽5·함정5 조건');
  await page.reload();assert((await saved()).endless.best===10,'무한 기록 재시작 유지');
  // 마지막 사진을 실제 해결로 채우면 사진가 배지를 얻는다.
  await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('fake-traveler-v1'));const c=Replay.generate(Replay.seeded(0),undefined,p.endless.streak);const missing=c.travelers[0].ev[0].img;p.photos=Object.values(FAKE.climates).flatMap(c=>c.gallery).filter(img=>img!==missing);localStorage.setItem('fake-traveler-v1',JSON.stringify(p));});await page.reload();await seed(0);await click('finish');p=await saved();assert(p.photos.length===await page.evaluate(()=>new Set(Object.values(FAKE.climates).flatMap(c=>c.gallery)).size)&&p.badges.includes('photo'),'마지막 사진 수집·사진가 배지');
  assert(errors.length===0,'콘솔·페이지 오류 0개');return {checks:checks.length,errors,captures,layouts};
}
