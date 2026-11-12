/* 실행: node tteok-tycoon/tools/make-samples.js — 외부 연결 없이 실제 엔진으로 예시 생성 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({}); ctx.window = ctx;
for (const file of ['data', 'engine', 'result']) vm.runInContext(fs.readFileSync(path.join(__dirname, `../js/${file}.js`), 'utf8'), ctx);
const T = ctx.TTEOK, E = ctx.TteokEngine, R = ctx.TteokResult;
const profiles = [
  { price: 2500, portions: 40, invest: false, accept: [], answer: 0 },
  { price: 3000, portions: 40, invest: true, accept: ['donation'], answer: 1 },
  { price: 3500, adaptive: true, invest: true, accept: ['cartel', 'fakeAd'], answer: 0 },
  { price: 4000, portions: 30, invest: false, accept: ['fakeOrigin', 'complaint'], answer: 2 },
  { price: 2500, adaptive: true, invest: true, accept: ['donation', 'complaint'], answer: 0 },
  { price: 3000, adaptive: true, invest: false, accept: ['fakeAd', 'fakeOrigin'], answer: 1 }
];
function play(seed, policy) {
  const g = E.newGame(seed);
  const choose = () => E.choose(g, policy.accept.includes(E.day(g).id) ? 'a' : 'b');
  while (!g.ended) {
    for (const ev of E.morningEvents(g)) if (ev.node.options) E.chooseNode(g, ev, ev.node.options[(policy.node || 0) % ev.node.options.length].key);
    if (E.morningChoice(g)) choose();
    const upgrade = policy.invest ? ['cheese', 'chairs', 'sundae', 'staff', 'clean'].find(id => g.offers.includes(id) && E.canBuy(g, id) && g.money - T.upgrades[id].cost > 40000) || null : null;
    let plan = { price: policy.price, portions: policy.portions || Math.max(10, Math.min(E.capacity(g), Math.round(E.expectedVisitors(g) * .5 / 5) * 5)), upgrade };
    if (policy.adaptive) plan.price = Math.max(2000, Math.min(4000, g.rivalPrice + (E.day(g).mood > 1.3 ? 500 : -500)));
    if (policy.plan) plan = policy.plan(g, plan);
    E.simulate(g, plan);
    if (E.eveningChoice(g)) choose();
    E.endDay(g);
  }
  return g;
}
function makeSamples() {
  return profiles.map((profile, i) => {
    const plays = [];
    for (let j = 0; j < (i % 2 ? 2 : 3); j++) {
      const policy = { ...profile, accept: j ? Object.keys(T.pools.choices).filter(id => !profile.accept.includes(id)) : profile.accept, node: j };
      const g = play(31 + i * 37 + j * 13, policy), answers = {};
      for (const q of R.interview(g)) answers[q.id] = q.options.find(o => o.id === String.fromCharCode(97 + (j ? 0 : profile.answer))).id;
      plays.push(R.record(g, answers));
    }
    return { student: `${i + 1}번`, plays };
  });
}
if (require.main === module) {
  const samples = makeSamples();
  fs.writeFileSync(path.join(__dirname, '../docs/sample-records.js'), `/* 가상 학생의 실제 엔진 플레이 기록 */\nwindow.TTEOK_SAMPLES = ${JSON.stringify(samples, null, 2)};\n`, 'utf8');
  console.log(`가상 학생 ${samples.length}명 · ${samples.reduce((n, s) => n + s.plays.length, 0)}판`);
}
module.exports = { T, E, R, play, profiles, makeSamples };
