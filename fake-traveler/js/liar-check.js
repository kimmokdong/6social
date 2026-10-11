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
function contest(stage, style, seed) {
  let s = L.newContest({ seed, stage, me: 'haneul' });
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
