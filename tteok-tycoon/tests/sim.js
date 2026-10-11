/* 실행: node tteok-tycoon/tests/sim.js — 전략별 결과(씨앗 300개) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({}); ctx.window = ctx;
for (const f of ['../js/data.js', '../js/engine.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx);
const T = ctx.TTEOK, E = ctx.TteokEngine;

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
const est = (s, plan, share) => Math.min(E.capacity(s), Math.round(E.expectedVisitors(s, plan) * share / 10) * 10);
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
  '싸게 많이(1500원)': { choice: fairChoice, plan: () => ({ price: 1500, portions: 80, upgrade: null }) },
  '비싸게(5000원)': { choice: fairChoice, plan: () => ({ price: 5000, portions: 30, upgrade: null }) },
  '무작위': {
    choice: (s, c, r) => r() < .5 ? 'a' : 'b',
    plan(s, r) { return { price: T.prices[Math.floor(r() * T.prices.length)], portions: T.portions[Math.floor(r() * T.portions.length)], upgrade: r() < .4 ? s.offers[Math.floor(r() * s.offers.length)] : null }; }
  }
};
for (const [name, st] of Object.entries(strategies)) {
  const ends = {}; let money = 0, rep = 0, fair = 0; const N = 300;
  for (let seed = 1; seed <= N; seed++) { const s = play(seed, st); ends[s.ended] = (ends[s.ended] || 0) + 1; money += s.money; rep += s.rep; fair += s.fair; }
  const names = Object.fromEntries(T.endings.map(e => [e.id, e.name]));
  console.log(`${name.padEnd(14)} 평균 돈 ${Math.round(money / N).toLocaleString()} 평판 ${(rep / N).toFixed(1)} 공정 ${Math.round(fair / N)} | ` +
    Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${names[k]} ${Math.round(v / N * 100)}%`).join(', '));
}
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
