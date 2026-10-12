/* 실행: node tteok-tycoon/tests/chains.js
 * 사슬 검증: 불공정한 선택의 모든 갈래가 '거절'보다 손해인지, 장사를 잘하는 플레이어 기준으로 확인한다. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({ structuredClone }); ctx.window = ctx;
for (const f of ['../js/data.js', '../js/engine.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx);
const T = ctx.TTEOK, E = ctx.TteokEngine;
const clone = s => JSON.parse(JSON.stringify(s));

/* 그날 이윤이 가장 큰 가격·재료를 고르는 '장사 고수' (투자는 정해진 순서로) */
function bestPlan(s) {
  const order = ['cheese', 'chairs', 'clean', 'staff'];
  const upgrade = order.find(id => s.offers.includes(id) && E.canBuy(s, id) && s.money - T.upgrades[id].cost > 40000) || null;
  let best = null;
  for (const price of s.lockedPrice ? [s.lockedPrice] : [2000, 2500, 3000, 3500, 4000])
    for (const portions of T.portions) {
      const t = clone(s), r = E.simulate(t, { price, portions, upgrade });
      const score = r.profit + (t.rep - s.rep) * 20000;
      if (!best || score > best.score) best = { score, plan: { price, portions, upgrade } };
    }
  return best.plan;
}
/* policy: { root: 'a'|'b' 고르기, node: 사슬 사건별 고르기 } */
function play(seed, policy) {
  const s = E.newGame(seed);
  while (!s.ended) {
    for (const ev of E.morningEvents(s)) if (ev.node.options) E.chooseNode(s, ev, policy.node[ev.id] || ev.node.options[0].key);
    const mc = E.morningChoice(s);
    if (mc) E.choose(s, policy.root[E.day(s).id] || (mc.options.find(o => o.refuse) || mc.options[0]).key);
    E.simulate(s, bestPlan(s));
    const ec = E.eveningChoice(s);
    if (ec) E.choose(s, policy.root[E.day(s).id] || 'a');
    E.endDay(s);
  }
  return s;
}
const fair = { root: {}, node: { priceWar: 'b' } };
const cases = [];
for (const [root, ch] of Object.entries(T.chains)) {
  const acceptKey = root === 'complaint' ? 'b' : 'a';
  for (const o of T.nodes[ch.branch].options) {
    const node = { priceWar: 'b', [ch.branch]: o.key };
    cases.push({ name: `${ch.name} → ${o.label}`, root, policy: { root: { [root]: acceptKey }, node } });
  }
}
const seeds = Array.from({ length: +(process.argv[2] || 80) }, (_, i) => i + 1);
const baseCache = {};
console.log('갈래'.padEnd(26), '거절 대비 평균 돈', '  이긴 판', '  평판 차');
let bad = 0;
for (const c of cases) {
  let diff = 0, wins = 0, n = 0, dRep = 0, worst = -Infinity;
  for (const seed of seeds) {
    if (!E.makeSchedule(seed).some(d => d.id === c.root)) continue;
    const base = baseCache[seed] || (baseCache[seed] = play(seed, fair)), alt = play(seed, c.policy);
    if (!alt.trail.some(t => t.root === c.root && t.start && t.pick)) continue;
    if (!alt.trail.some(t => t.id === T.chains[c.root].branch)) continue; // 사슬이 실제로 이어진 판만
    n++; diff += alt.money - base.money; dRep += alt.rep - base.rep;
    if (alt.money > base.money) { wins++; console.log(`  확인 필요: 씨앗 ${seed}, 차이 ${alt.money - base.money}원`); }
    worst = Math.max(worst, alt.money - base.money);
  }
  const avg = Math.round(diff / n);
  if (!n || avg >= 0 || wins > 0) bad++;
  console.log(c.name.padEnd(26), String(avg.toLocaleString()).padStart(10), `${Math.round(wins / n * 100)}%`.padStart(8), (dRep / n).toFixed(1).padStart(8), `최고 ${worst.toLocaleString()}`.padStart(12), `(${n}판)`);
}
console.log(bad ? `⚠ 거절보다 나을 수 있는 갈래 ${bad}개` : '✔ 모든 갈래가 거절보다 손해');
if (bad) process.exitCode = 1;
