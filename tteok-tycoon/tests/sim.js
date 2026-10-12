/* 실행: node tteok-tycoon/tests/sim.js — 전략별 결과(씨앗 300개) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({}); ctx.window = ctx;
for (const f of ['../js/data.js', '../js/engine.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx);
const T = ctx.TTEOK, E = ctx.TteokEngine;
const assert = require('assert/strict');

function play(seed, strat) {
  const s = E.newGame(seed);
  const r = E.rng(seed + 99);
  while (!s.ended) {
    for (const ev of E.morningEvents(s)) if (ev.node.options) E.chooseNode(s, ev, (strat.node || randomNode)(s, ev, r));
    const mc = E.morningChoice(s);
    if (mc) E.choose(s, strat.choice(s, mc, r));
    const plan = strat.plan(s, r);
    E.simulate(s, plan);
    const ec = E.eveningChoice(s);
    if (ec) E.choose(s, strat.choice(s, ec, r));
    E.endDay(s);
  }
  return s;
}
const randomNode = (s, ev, r) => ev.node.options[Math.floor(r() * ev.node.options.length)].key;
const fairChoice = (s, c) => c.options.find(o => !o.unfair).key;
const greedyChoice = (s, c) => (c.options.find(o => o.unfair) || c.options[0]).key;
const est = (s, plan, share) => Math.min(E.capacity(s, plan), Math.round(E.expectedVisitors(s, plan) * share / 5) * 5);
const pickPortions = n => T.portions.reduce((a, b) => Math.abs(b - n) < Math.abs(a - n) ? b : a);
const strategies = {
  '똑똑하고 공정': {
    choice: fairChoice,
    plan(s) {
      const order = ['cheese', 'chairs', 'clean', 'staff', 'sundae'];
      const upgrade = order.find(id => s.offers.includes(id) && E.canBuy(s, id) && s.money - T.upgrades[id].cost > 40000) || null;
      const busy = E.day(s).mood >= 1.5;
      const plan = { price: busy ? 3500 : 3000, upgrade };
      plan.portions = pickPortions(est(s, plan, busy ? .55 : .5) + 5);
      return plan;
    }
  },
  '욕심쟁이(담합·과장광고)': {
    choice: greedyChoice,
    plan(s) { const plan = { price: 4000, upgrade: null }; plan.portions = pickPortions(est(s, plan, .4)); return plan; }
  },
  '영리한 욕심쟁이': {
    choice: greedyChoice,
    plan(s) { const busy = E.day(s).mood >= 1.5; const order = ['cheese', 'chairs', 'staff'];
      const upgrade = order.find(id => s.offers.includes(id) && E.canBuy(s, id) && s.money - T.upgrades[id].cost > 40000) || null;
      const plan = { price: busy ? 3500 : 3000, upgrade }; plan.portions = pickPortions(est(s, plan, .5) + 5); return plan; }
  },
  '보통 아이': {
    choice: (s, c, r) => r() < .6 ? fairChoice(s, c) : greedyChoice(s, c),
    plan(s, r) { const plan = { price: [2500, 3000, 3000, 3500][Math.floor(r() * 4)], upgrade: r() < .5 ? s.offers.find(id => E.canBuy(s, id)) || null : null };
      plan.portions = pickPortions(E.expectedVisitors(s, plan) * .5 + (r() * 20 - 10)); return plan; }
  },
  '보통 아이(늘 공정)': { choice: fairChoice, plan: (s, r) => strategies['보통 아이'].plan(s, r) },
  '보통 아이(늘 반칙)': { choice: greedyChoice, plan: (s, r) => strategies['보통 아이'].plan(s, r) },
  '투자 없이 3000원': { choice: fairChoice, plan: () => ({ price: 3000, portions: 40, upgrade: null }) },
  '무조건 500원 싸게': { choice: fairChoice, plan(s) {
    const plan = strategies['똑똑하고 공정'].plan(s);
    plan.price = Math.max(T.prices[0], s.rivalPrice - 500);
    return plan;
  } },
  '싸게 많이(1500원)': { choice: fairChoice, plan: () => ({ price: 1500, portions: 80, upgrade: null }) },
  '비싸게(5000원)': { choice: fairChoice, plan: () => ({ price: 5000, portions: 30, upgrade: null }) },
  '무작위': {
    choice: (s, c, r) => r() < .5 ? 'a' : 'b',
    plan(s, r) { return { price: T.prices[Math.floor(r() * T.prices.length)], portions: T.portions[Math.floor(r() * T.portions.length)], upgrade: r() < .4 ? s.offers[Math.floor(r() * s.offers.length)] : null }; }
  }
};
const results = {}, allEndings = new Set();
for (const [name, st] of Object.entries(strategies)) {
  const ends = {}; let money = 0, rep = 0, fair = 0; const N = 300;
  for (let seed = 1; seed <= N; seed++) { const s = play(seed, st); ends[s.ended] = (ends[s.ended] || 0) + 1; allEndings.add(s.ended); money += s.money; rep += s.rep; fair += s.fair; }
  results[name] = { money: money / N, best: (ends.best || 0) / N, closed: (ends.closed || 0) / N };
  const names = Object.fromEntries(T.endings.map(e => [e.id, e.name]));
  console.log(`${name.padEnd(14)} 평균 돈 ${Math.round(money / N).toLocaleString()} 평판 ${(rep / N).toFixed(1)} 공정 ${Math.round(fair / N)} | ` +
    Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${names[k]} ${Math.round(v / N * 100)}%`).join(', '));
}
assert.equal(allEndings.size, 6, '엔딩 6개에 모두 도달해야 해요');
assert.ok(results['똑똑하고 공정'].best >= .4 && results['똑똑하고 공정'].best <= .7, '공정 전략 최고 엔딩 40~70%');
assert.ok(results['욕심쟁이(담합·과장광고)'].closed >= .9, '욕심 전략은 실패해야 해요');
for (const name of ['무조건 500원 싸게', '투자 없이 3000원']) {
  assert.ok(results['똑똑하고 공정'].money > results[name].money + 50000, `${name}보다 공정 전략의 잔액이 충분히 커야 해요`);
  assert.ok(results['똑똑하고 공정'].best > results[name].best + .2, `${name}보다 최고 엔딩도 많아야 해요`);
}

// 옛 저장처럼 대응 필드가 없는 상태에서도 미리보기와 장사 계산은 같아야 한다.
for (const upgrade of Object.keys(T.upgrades)) {
  const s = E.newGame(7), before = JSON.stringify(s), plan = { price: 3000, portions: 55, upgrade };
  const p = E.plannedState(s, plan), visitors = E.expectedVisitors(s, plan), cap = E.capacity(s, plan), wages = E.wages(s, plan);
  assert.equal(JSON.stringify(s), before, '미리보기는 원본을 바꾸면 안 돼요');
  const res = E.simulate(s, plan);
  assert.equal(res.visitors, visitors); assert.equal(res.cap, cap); assert.equal(res.wage, wages);
  assert.equal(res.ingredientCost, plan.portions * p.ingredient);
  assert.equal(s.money, p.money + res.profit);
  assert.equal(res.decisions.length, res.visitors);
  assert.equal(Object.values(res.counts).reduce((a, b) => a + b, 0), res.visitors);
  for (const line of E.choiceSummary(res)) assert.equal(line.count, res.decisions.filter(d => d.choice === line.choice && d.reason === line.reason && d.saving === line.saving).length);
}

// 같은 가격에 치즈만 산 뒤 3일: 평판·날씨·사건을 고정해 경쟁 대응의 영향만 비교한다.
const shares = [0, 0, 0], control = [0, 0, 0];
for (let seed = 1; seed <= 300; seed++) for (const adapt of [true, false]) {
  const s = E.newGame(seed); s.rivalId = 'normal'; s.rivalBase = s.rivalPrice = 3000;
  s.schedule = Array.from({ length: 10 }, () => ({ mood: 1 }));
  for (let n = 0; n < 3; n++) {
    s.rep = 3;
    if (!adapt) { s.responseCut = 0; s.responseTaste = 0; s.rivalPrice = 3000; }
    const res = E.simulate(s, { price: 3000, portions: 80, upgrade: n ? null : 'cheese' });
    (adapt ? shares : control)[n] += (res.counts.mine + res.counts.soldout) / res.visitors / 300;
    E.endDay(s);
  }
}
console.log('치즈 뒤 우리 가게 선택 비율:', shares.map(x => (x * 100).toFixed(1) + '%').join(' → '), '· 대응 없는 3일째', (control[2] * 100).toFixed(1) + '%');
assert.ok(shares[0] - shares[2] > .07 && control[2] - shares[2] > .07, '이틀 뒤 대응으로 우리 선택 비율이 눈에 띄게 줄어야 해요');
// 하루 장사 예시(첫날, 가격별 손님 수)
const demo = [];
for (const price of T.prices) { const s = E.newGame(7); s.rivalId = 'normal'; s.rivalBase = s.rivalPrice = 3000; s.pending = []; E.morningEvents(s); const r = E.simulate(s, { price, portions: 40, upgrade: null }); demo.push(`${price}원→${r.served}명(이윤 ${r.profit})`); }
console.log('첫날 가격별:', demo.join('  '));

// 일정·경쟁 가게 다양성 확인
const seen = {}, rivals = {}, first = new Set();
for (let seed = 1; seed <= 300; seed++) { const s = E.newGame(seed); rivals[s.rivalId] = (rivals[s.rivalId] || 0) + 1; first.add(s.schedule.map(d => d.id).join(','));
  s.schedule.forEach((d, i) => { seen[d.id] = (seen[d.id] || 0) + 1; if (d.id === 'cartel' && (i < 1 || i > 3)) throw new Error('담합 위치'); }); }
console.log('서로 다른 일정', first.size, '/ 300 · 경쟁 가게', JSON.stringify(rivals));
console.log('사건 등장 횟수', JSON.stringify(seen));
