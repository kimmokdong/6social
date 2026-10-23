/* 실행: node fake-traveler/js/liar-check.js — 라이어 여행단 균형 확인 (화면 없이)
 * 사람 자리(0번)를 '잘하는 아이'(sharp)·'보통 아이'(normal)·'찍는 아이'(random)로 바꿔 가며 대회를 돌린다. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({}); ctx.window = ctx;
for (const f of ['data.js', 'bank.js', 'replay.js', 'liar.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx);
const L = ctx.Liar, CFG = L.CFG;
const assert = require('node:assert/strict'), D = ctx.FAKE, B = ctx.FAKE_BANK;

// 두 방향의 실제 pool을 검사한다. 도감에만 있고 라이어 손패 후보에 없는 사진도 잡는다.
const added = Object.entries(B.photos).filter(([,p])=>p.also);
assert(added.length >= 14, '새 공통 사진 14장 이상');
for (const [img,p] of added) {
  assert(p.tags.length > 0 && p.tags.every(t=>B.tags[t]), img+' 관찰 태그');
  assert(fs.existsSync(path.join(__dirname,'../assets/img/scenes',img+'.webp')), img+' 이미지 파일');
  for (const climate of [p.home,p.also]) {
    assert(p.tags.every(t=>B.rules[climate].allowed.includes(t)), img+' 공통 허용 태그');
    assert.notEqual(ctx.Replay.verdict({...p,type:'photo'},climate).v,'lie', img+' 진짜 판정');
    assert(D.climates[climate].gallery.includes(img), img+' 도감 등록');
  }
}
for (const [claim,c] of Object.entries(D.climates)) for (const home of c.confuse) {
  const shared = added.filter(([,p])=>[p.home,p.also].includes(claim)&&[p.home,p.also].includes(home));
  assert(shared.length >= 2, claim+'↔'+home+' 새 공통 사진 2장 이상');
  const photos = L.pool(home).filter(p=>p.type==='photo' && L.verdict(p,claim).v !== 'lie');
  assert(photos.length >= 1, claim+'←'+home+' 라이어 손패 후보 중 통하는 사진');
  console.log(`${D.climates[claim].name} ← ${D.climates[home].name}: 라이어 손패 후보 중 통하는 사진 ${photos.length}장`);
}

// 기온 차·작물 카드: 고향에서 진짜, 태그·그림 존재, 거짓이 되는 기후 목록 출력(사람이 눈으로 확인)
for (const climate of Object.keys(D.climates)) for (const c of L.pool(climate).filter(c => c.type === 'range' || c.type === 'crop')) {
  assert(c.tags.length && c.tags.every(t => B.tags[t]), c.id + ' 태그');
  assert.notEqual(L.verdict(c, climate).v, 'lie', c.id + ' 고향에서 진짜');
  if (c.type === 'crop') assert(D.crops[c.crop] && fs.existsSync(path.join(__dirname, '../assets/img/crops', c.crop + '.webp')), c.id + ' 작물 이름·그림');
  const lies = Object.keys(D.climates).filter(x => L.verdict(c, x).v === 'lie').map(x => D.climates[x].name);
  console.log(`${D.climates[climate].name} ${L.cardName(c)}: 거짓 → ${lies.join(', ') || '없음'}`);
}

function humanMove(s, style) {
  const seat = 0, me = s.seats[0];
  if (style === 'random') {
    if (s.phase === 'play') return { type: 'play', seat, card: me.hand[Math.floor(Math.random() * me.hand.length)].id };
    const others = [1, 2, 3]; return { type: 'vote', seat, target: others[Math.floor(Math.random() * 3)] };
  }
  // 사람 자리도 AI 판단을 빌려 씀: 의심 기록이 없으니 투표 때는 직접 계산
  me.persona = style;
  if (s.phase === 'vote' && me.role !== 'liar') {
    const P = CFG.personas[style], X = s.claim;
    const susp = i => s.seats[i].played.reduce((a, c) => { const v = L.verdict(c, X).v; if (v === 'lie') return a + (Math.random() < P.notice ? 100 : 6); if (v === 'trap') return a + P.trap; if (c.neutral) return a + 12; const pr = P.proof === 'wide' ? L.proof(c, X, 'wide') : P.proof === 'confuse' ? L.proof(c, X, 'confuse') : (L.proof(c, X, 'wide') + L.proof(c, X, 'confuse')) / 2; return a + 8 - 45 * pr; }, 0) + (Math.random() * 2 - 1) * P.gut;
    return { type: 'vote', seat, target: [1, 2, 3].sort((a, b) => susp(b) - susp(a))[0] };
  }
  const m = L.decide(s, 0); me.persona = null; return m;
}
function contest(stage, style, seed, me = 'haneul') {
  let s = L.newContest({ seed, stage, me });
  while (s.phase !== 'end') {
    s = L.apply(s, { type: 'start' }).state;
    if (s.phase === 'end') break;
    while (s.phase === 'play' || s.phase === 'vote') {
      s = L.runAI(s);
      if (s.phase === 'play' && L.current(s) === 0) s = L.apply(s, humanMove(s, style)).state;
      else if (s.phase === 'vote' && s.seats[0].vote === null) s = L.apply(s, humanMove(s, style)).state;
    }
  }
  return s;
}
const N = 400;
for (const stage of Object.keys(CFG.stages)) {
  for (const style of ['sharp', 'normal', 'random']) {
    let win = 0, rankSum = 0, humanLiar = 0, humanEsc = 0, aiLiar = 0, aiCaught = 0, votes = 0, good = 0, accused = 0, rounds = 0;
    for (let k = 0; k < N; k++) {
      const s = contest(stage, style, 1000 + k), rank = L.ranking(s);
      if (rank[0] === 0) win++; rankSum += rank.indexOf(0) + 1;
      for (const r of s.results) {
        rounds++;
        if (r.liar === 0) { humanLiar++; if (!r.caught) humanEsc++; }
        else { aiLiar++; if (r.caught) aiCaught++; votes++; }
        if (r.accused === 0 && r.liar !== 0) accused++;
      }
      good += s.seats[0].stats.caught;
    }
    console.log(`${CFG.stages[stage].name} · ${style.padEnd(6)} 우승 ${Math.round(win / N * 100)}% 평균 등수 ${(rankSum / N).toFixed(2)} | 내가 라이어일 때 안 들킴 ${Math.round(humanEsc / humanLiar * 100)}% | AI 라이어가 잡힘 ${Math.round(aiCaught / aiLiar * 100)}% | 내가 맞힌 비율 ${Math.round(good / votes * 100)}% | 억울하게 지목 ${Math.round(accused / rounds * 100)}%`);
  }
}
// 카드가 모자란 판이 없는지
let bad = 0;
for (let k = 0; k < 3000; k++) {
  let s = L.newContest({ seed: 5000 + k, stage: 'world' }); s = L.apply(s, { type: 'start' }).state;
  if (s.seats.some(x => x.hand.length !== CFG.handSize)) bad++;
}
console.log('손패 5장이 안 되는 판', bad, '/ 3000');
assert.equal(bad, 0, '모든 손패는 5장');

// 찬스·베팅·콤보·의심 게이지 규칙
{
  let s = L.apply(L.newContest({ seed: 77, stage: 'world', me: 'taeyang' }), { type: 'start' }).state;
  while (L.current(s) !== 0) s = L.apply(s, L.decide(s, L.current(s))).state;
  const turn = s.turn, card = s.seats[0].hand[0].id;
  let r = L.apply(s, { type: 'swap', seat: 0, card });
  assert(!r.error, '바꾸기 성공'); assert.equal(r.state.turn, turn, '바꾸기 후 차례 그대로');
  assert.equal(r.state.seats[0].hand.length, CFG.handSize, '바꾸기 후 손패 5장');
  assert(!r.state.seats[0].hand.some(c => c.id === card), '버린 카드는 손패에서 빠짐');
  assert(L.apply(r.state, { type: 'swap', seat: 0, card: r.state.seats[0].hand[0].id }).error, '바꾸기는 1번만');
  s = L.apply(r.state, { type: 'play', seat: 0, card: r.state.seats[0].hand[0].id }).state;
  while (L.current(s) !== 0) s = L.apply(s, L.decide(s, L.current(s))).state;
  const target = s.seats.findIndex((x, i) => i !== 0 && x.played.length), chips = s.seats[0].chips;
  r = L.apply(s, { type: 'glass', seat: 0, target, index: 0 });
  assert(!r.error, '돋보기 성공'); assert.equal(r.state.seats[0].chips, chips + CFG.score.glass, '돋보기 1점 차감');
  assert.equal(r.state.seats[0].glassed.length, 1, '돋보기 결과 저장');
  assert(L.apply(r.state, { type: 'glass', seat: 0, target, index: 0 }).error, '돋보기는 1번만');
  assert(L.view(r.state, 1).seats[0].glassed.length === 0, '남의 돋보기 결과는 가림');
  for (let k = 0; k < 4; k++) { const h = L.heat(r.state, k); assert(h >= 0 && h <= 100, 'heat 0~100'); }
}
{
  // 베팅·콤보: AI 라이어 라운드에서 사람이 라이어를 맞히면 catch+(bet-1), 2연속부터 combo
  let s = L.newContest({ seed: 3, stage: 'town' }), hits = 0;
  while (s.phase !== 'end') {
    s = L.apply(s, { type: 'start' }).state; if (s.phase === 'end') break;
    while (s.phase === 'play') { s = L.runAI(s); if (s.phase === 'play') s = L.apply(s, L.decide(s, 0)).state; }
    const liar = s.liarSeat, before = s.seats[0].streak;
    if (liar === 0) { s = L.runAI(s); s = L.apply(s, { type: 'vote', seat: 0, target: 1 }).state; s = L.runAI(s); continue; }
    assert(L.apply(s, { type: 'vote', seat: 0, target: liar, bet: 4 }).error, '베팅은 1~3');
    s = L.apply(s, { type: 'vote', seat: 0, target: liar, bet: 3 }).state; s = L.runAI(s);
    const r = s.results.at(-1), want = CFG.score.catch + 2 + (before + 1 >= 2 ? CFG.score.combo : 0) + (r.accused === 0 ? CFG.score.accused : 0);
    assert.equal(r.delta[0], want, '베팅·콤보 점수'); assert.equal(r.bets[0], 3, '베팅 기록'); hits++;
  }
  assert(hits >= 2 && s.seats[0].stats.allin === hits && s.seats[0].stats.bestStreak >= 2, '올인·연속 기록');
}
console.log('찬스·베팅·콤보·게이지 규칙 통과');

// 캐릭터 능력
{
  const start = me => L.apply(L.newContest({ seed: 9, stage: 'town', me }), { type: 'start' }).state;
  assert.equal(start('haneul').seats[0].chances.glass, 2, '하늘 돋보기 2번');
  assert.equal(start('miso').seats[0].chances.swap, 2, '미소 바꾸기 2번');
  assert.equal(L.maxBet(start('leo').seats[0]), 4, '레오 4점 베팅'); assert.equal(L.maxBet(start('ara').seats[0]), 3, '기본 3점 베팅');
  let s = start('junho');
  while (s.phase === 'play') { s = L.runAI(s); if (s.phase === 'play') s = L.apply(s, L.decide(s, 0)).state; }
  const chips = s.seats[0].chips, r = L.apply(s, { type: 'glass', seat: 0, target: 1, index: 0 });
  assert(!r.error && r.state.seats[0].chips === chips, '준호 돋보기 무료');
  assert(L.apply(s, { type: 'vote', seat: 0, target: 1, bet: 4 }).error, '준호는 4점 베팅 불가');
}
{
  // 능력 점수: 박 할아버지 억울한 지목 0점, 소피 탈출 +2, 아라 콤보 +2 — 여러 판 돌려 실제 delta 로 확인
  let park = 0, sophie = 0;
  for (let k = 0; k < 300; k++) for (const who of ['park', 'sophie']) {
    const s = contest('town', 'random', 9000 + k, who);
    for (const r of s.results) {
      if (who === 'park' && r.accused === 0 && r.liar !== 0) { park++; assert.equal(r.delta[0], r.voted[0] === r.liar ? CFG.score.catch + (r.bets[0] - 1) + (r.streaks[0] >= 2 ? CFG.score.combo : 0) : CFG.score.miss - (r.bets[0] - 1), '박 할아버지 지목 감점 없음'); }
      if (who === 'sophie' && r.liar === 0 && !r.caught) { sophie++; assert.equal(r.delta[0], CFG.score.escape + 2, '소피 탈출 +2'); }
    }
  }
  assert(park > 0 && sophie > 0, '능력 점수 사례 있음');
}
// 캐릭터별 균형 (전국 대회, 보통 실력으로 플레이)
for (const who of Object.keys(CFG.perks)) {
  let win = 0, rankSum = 0;
  for (let k = 0; k < 300; k++) { const s = contest('nation', 'normal', 20000 + k, who), rank = L.ranking(s); if (rank[0] === 0) win++; rankSum += rank.indexOf(0) + 1; }
  console.log(`${CFG.perks[who].icon} ${D.travelers[who].name.padEnd(5)} ${CFG.perks[who].name.padEnd(7)} 우승 ${Math.round(win / 3)}% 평균 등수 ${(rankSum / 300).toFixed(2)}`);
}
console.log('캐릭터 능력 규칙 통과');
// 라이어 탈출 베팅: 탈출 escape+(bet-1), 들킴 -(bet-1)
{
  let esc = 0, caught = 0;
  for (let k = 0; k < 200 && (!esc || !caught); k++) {
    let s = L.apply(L.newContest({ seed: 30000 + k, stage: 'town', me: 'ara' }), { type: 'start' }).state;
    if (s.liarSeat !== 0) continue;
    while (s.phase === 'play') { s = L.runAI(s); if (s.phase === 'play') s = L.apply(s, L.decide(s, 0)).state; }
    s = L.apply(s, { type: 'vote', seat: 0, target: 1, bet: 3 }).state; s = L.runAI(s);
    const r = s.results.at(-1);
    if (r.caught) { caught++; assert.equal(r.delta[0], -2, '라이어 들킴 -(bet-1)'); }
    else { esc++; assert.equal(r.delta[0], CFG.score.escape + 2, '라이어 탈출 +(bet-1)'); }
  }
  assert(esc && caught, '탈출·들킴 사례 모두 확인');
}
console.log('라이어 탈출 베팅 통과');
