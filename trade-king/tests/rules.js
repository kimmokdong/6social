/* 무역왕 5.0 규칙 검사: 엔진의 핵심 규칙이 설계서대로 움직이는지 확인한다. */
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const T = E.T, sum = a => a.reduce((s, v) => s + v, 0);
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const isInt = v => Number.isInteger(v);
// 첫 소식을 고르고 만들기 단계로 간다.
const start = (seed = 1, id = 'daon') => { const G = E.newGame(seed, id); E.chooseEvent(G, 0); return G; };
// 지금 해를 끝까지 넘겨 다음 해 만들기 단계로 간다.
function toNextMake(G) { while (G.phase !== 'event') E.endPhase(G); E.chooseEvent(G, 0); }
function toShip(G, year = 2) { while (!(G.year === year && G.phase === 'ship')) { if (G.phase === 'event') E.chooseEvent(G, 0); else if (G.phase === 'make') { const n = E.player(G); E.assign(G, E.best(n), n.workers); E.endPhase(G); } else E.endPhase(G); } }

test('버전과 기본 자료', () => {
  assert.equal(T.version, 5); assert.equal(T.years, 5); assert.equal(T.goods.length, 5); assert.equal(T.countries.length, 8);
  for (const c of T.countries) { assert.ok(c.production.every(isInt)); assert.ok(c.quality.every(q => q >= 1 && q <= 3)); }
});
test('같은 씨앗이면 같은 판', () => {
  const a = E.runBot(7, 'daon', 'smart'), b = E.runBot(7, 'daon', 'smart');
  assert.deepEqual(E.player(a).history, E.player(b).history); assert.equal(a.ending, b.ending);
});
test('상대 4나라는 우리와 겹치지 않고 서로 다르다', () => {
  for (let s = 1; s <= 20; s++) { const G = E.newGame(s, 'plains'), ids = G.nations.map(n => n.id); assert.equal(ids.length, 5); assert.equal(new Set(ids).size, 5); assert.equal(ids[0], 'plains'); }
});
test('사건 계획: 다섯 해 중 위기는 정확히 둘, 5년째는 위기', () => {
  for (let s = 1; s <= 40; s++) { const G = E.newGame(s, 'daon'), crisis = G.eventPlan.filter(id => E.event(id).crisis); assert.equal(crisis.length, 2, G.eventPlan.join()); assert.ok(E.event(G.eventPlan[4]).crisis); assert.ok(!E.event(G.eventPlan[0]).crisis); }
});
test('일꾼은 정수로만, 일꾼 수를 넘지 못한다', () => {
  const G = start(), n = E.player(G);
  assert.equal(E.assign(G, 0, 1.5), false); assert.equal(E.assign(G, 0, n.workers + 1), false);
  assert.ok(E.assign(G, 0, 2)); assert.ok(E.assign(G, 1, n.workers - 2)); assert.equal(E.assign(G, 2, 1), false);
});
test('만든 상자와 점수, 돈은 모두 정수', () => {
  for (const id of T.countries.map(c => c.id)) { const G = E.runBot(3, id, 'smart'); for (const n of G.nations) { assert.ok(isInt(n.money), `${n.id} 돈 ${n.money}`); assert.ok(n.box.every(b => b.every(isInt))); } for (const h of E.player(G).history) assert.ok(isInt(h.score)); }
});
test('1년째는 국경이 닫혀 배를 보낼 수 없다', () => {
  const G = start(), n = E.player(G); E.assign(G, E.best(n), n.workers); E.endPhase(G);
  assert.equal(G.phase, 'yearEnd'); assert.equal(E.voyage(G, G.nations[1].id, [], [[0, 1]]), false);
});
test('2년째부터 출항: 배 수, 한 척 6상자 제한, 되돌리기', () => {
  const G = E.newGame(2, 'daon'); toShip(G); const n = E.player(G), o = G.nations[1];
  assert.equal(E.shipsLeft(n), E.shipsTotal(n)); assert.equal(E.shipsTotal(n), 3);
  const q = E.quoteVoyage(G, n, 'world', [], [[0, 7]]); assert.equal(q.ok, false); assert.match(q.reason, /6상자/);
  const money = n.money, food = E.count(n, 0);
  assert.ok(E.voyage(G, 'world', [], [[0, 2]])); assert.equal(E.shipsLeft(n), 2); assert.equal(E.count(n, 0), food + 2); assert.ok(n.money < money);
  assert.ok(E.undoVoyage(G, 0)); assert.equal(n.money, money); assert.equal(E.count(n, 0), food); assert.equal(E.shipsLeft(n), 3);
  assert.equal(E.quoteVoyage(G, n, o, [], []).ok, false);
});
test('국민 몫은 팔 수 없고, 상대가 필요한 만큼만 판다', () => {
  const G = E.newGame(2, 'daon'); toShip(G); const n = E.player(G), o = G.nations[1];
  const good = [0, 1, 2, 3, 4].find(i => E.surplus(n, i) === 0 && E.count(n, i) > 0);
  if (good !== undefined) assert.equal(E.quoteVoyage(G, n, 'world', [[good, 1]], []).ok, false);
  const i = E.best(n), room = E.room(G, n, o, i);
  if (E.surplus(n, i) > room) assert.equal(E.quoteVoyage(G, n, o, [[i, room + 1]], []).ok, false);
});
test('먼 바다 상인: 사면 비싸고(+2), 팔면 싸고, 물건마다 4상자까지만 산다', () => {
  const G = E.newGame(2, 'daon'); toShip(G); const n = E.player(G), w = G.world, i = E.best(n);
  assert.equal(E.buyPrice(G, n, w, 0), T.goods[0].price + 2);
  assert.ok(E.sellPrice(G, n, w, i) < T.goods[i].price + 1);
  assert.equal(E.room(G, n, w, i), 4);
});
test('대평원국 식량은 상인에게 제값', () => {
  const G = E.newGame(2, 'plains'); toShip(G); const n = E.player(G);
  assert.equal(E.sellPrice(G, n, G.world, 0), T.goods[0].price);
});
test('보호: 3년째부터, 값 +1, 불만 −2, 그 물건이 주력인 나라와 ♥−1', () => {
  const G = E.newGame(4, 'daon'); E.chooseEvent(G, 0); assert.equal(E.setProtect(G, 0, true), false);
  toShip(G, 3); const n = E.player(G), o = G.nations.slice(1).find(x => !n.fta.includes(x.id));
  const i = E.best(o), price = E.buyPrice(G, n, o, i), r = E.rel(G, n, o);
  assert.ok(E.setProtect(G, i, true)); assert.equal(E.buyPrice(G, n, o, i), price + 1); assert.equal(E.rel(G, n, o), Math.max(0, r - 1));
  assert.equal(E.preview(G).unrest, 2);
});
test('보호 끄기 도전에서는 보호를 못 켠다', () => {
  const G = E.newGame(4, 'daon', {}, 'no-protect'); toShip(G, 3); assert.equal(E.setProtect(G, 0, true), false);
});
test('일꾼 없는 공장은 2년 뒤 문을 닫고, 보호하면 닫히지 않는다', () => {
  const G = E.newGame(5, 'daon'); const n = E.player(G), keep = 2;
  for (let y = 1; y <= 3; y++) {
    if (G.phase === 'event') E.chooseEvent(G, 0);
    if (G.year === 3) E.setProtect(G, keep, true);
    E.assign(G, 3, n.workers); while (G.phase !== 'yearEnd') E.endPhase(G); E.endPhase(G);
  }
  assert.ok(n.closed[0] || n.closed[4], `닫힌 공장 ${n.closed}`);
  assert.equal(E.perWorker(n, n.closed.findIndex(Boolean)), 0);
});
test('사이(♥): 3상자 넘게 오가면 +1, 최대 3', () => {
  const G = E.newGame(6, 'market'); toShip(G); const n = E.player(G);
  const o = G.nations.slice(1).find(o => [0, 1, 2, 3, 4].some(i => E.available(G, o, i) >= 3 && E.buyPrice(G, n, o, i) * 3 <= n.money));
  if (!o) return; const i = [0, 1, 2, 3, 4].find(i => E.available(G, o, i) >= 3); const r = E.rel(G, n, o);
  assert.ok(E.voyage(G, o.id, [], [[i, 3]])); E.endPhase(G); assert.equal(E.rel(G, n, o), Math.min(3, r + 1));
});
test('FTA 정책: ♥3 상대와 맺으면 1원 싸고 보호해도 값이 오르지 않는다', () => {
  const G = E.newGame(8, 'daon'); while (!(G.year === 4 && G.phase === 'yearEnd')) E.botTurn(G, 'smart');
  const n = E.player(G), o = G.nations[1]; G.rel[n.id][o.id] = G.rel[o.id][n.id] = 3; n.fta = n.fta.filter(x => x !== o.id); n.money = 20;
  assert.ok(E.policyChoices(G).includes('fta')); assert.ok(E.choosePolicy(G, 'fta', o.id)); assert.ok(n.fta.includes(o.id)); assert.equal(n.money, 20 - E.policyCost(n, 'fta') + n.workers * T.economy.tax);
  E.chooseEvent(G, 0); E.assign(G, 3, n.workers); E.endPhase(G);
  const i = [0, 1, 2, 3, 4].find(k => E.best(n) !== k), before = E.buyPrice(G, n, o, i); E.setProtect(G, i, true);
  assert.equal(E.buyPrice(G, n, o, i), before);
});
test('정책: 돈이 모자라면 못 고르고, 3년째 전에는 정책이 없다', () => {
  const G = E.newGame(9, 'daon'); while (G.phase !== 'yearEnd') E.botTurn(G, 'smart'); assert.deepEqual(E.policyChoices(G), []);
  while (!(G.year === 3 && G.phase === 'yearEnd')) E.botTurn(G, 'smart');
  const n = E.player(G), id = E.policyChoices(G)[0]; n.money = 0; assert.equal(E.choosePolicy(G, id, 0), false);
  n.money = 20; const prod = n.production[3]; assert.ok(E.choosePolicy(G, 'grow', 3) || !E.policyChoices(G).includes('grow'));
  if (G.year === 4) assert.ok(n.production[3] >= prod);
});
test('위기 피해는 수입에 기댄 만큼: 수입이 없으면 피해 없음', () => {
  let found = 0;
  for (let s = 1; s <= 30 && found < 3; s++) { const G = E.runBot(s, 'daon', 'self'); for (const h of E.player(G).history) if (h.crisis && h.imported === 0) { found++; assert.equal(h.crisisLoss, 0); } }
  assert.ok(found > 0);
});
test('의존 위기: 한 나라에 70% 넘게 기대면 피해가 두 배', () => {
  const one = [], spread = [];
  for (let s = 1; s <= 30; s++) { const p = E.newGame(s, 'daon'), t = p.nations[1].id; one.push(E.player(E.runBot(s, 'daon', 'one', {oneTarget: t, cutTarget: true})).history.reduce((a, h) => a + h.crisisLoss, 0)); spread.push(E.player(E.runBot(s, 'daon', 'smart', {oneTarget: t, cutTarget: true, effOnly: true})).history.reduce((a, h) => a + h.crisisLoss, 0)); }
  assert.ok(sum(one) > sum(spread), `${sum(one)} > ${sum(spread)}`);
});
test('귀한 물건: 폭풍이면 상인은 식량을 팔지 않는다', () => {
  const G = E.newGame(1, 'daon'); G.event = {id: 'storm', source: G.nations[1].id, good: null};
  assert.ok(E.scarce(G, 0)); assert.equal(E.available(G, G.world, 0), 0); assert.equal(E.available(G, G.world, 1), 99);
});
test('점수는 0~100, 엔딩과 해금', () => {
  for (const id of T.countries.map(c => c.id)) for (const mode of ['self', 'smart', 'random']) {
    const G = E.runBot(11, id, mode); assert.equal(G.phase, 'ending'); assert.ok(T.endings.some(e => e.id === G.ending));
    for (const h of E.player(G).history) assert.ok(h.score >= 0 && h.score <= 100);
  }
  assert.deepEqual(E.unlocked({}).length < 8, true);
  assert.equal(E.unlocked({endings: T.endings.map(e => e.id), events: T.events.map(e => e.id), badges: T.badges.map(b => b.id), countryEndings: {}, best: {}}).length, 8);
});
test('예상 점수는 해 끝 실제 점수와 같다(사건 효과 빼고)', () => {
  for (let s = 1; s <= 10; s++) {
    const G = E.newGame(s, 'daon'); E.chooseEvent(G, 0); const n = E.player(G); E.assign(G, E.best(n), n.workers);
    const pv = E.preview(G); E.endPhase(G); const h = n.history.at(-1);
    assert.equal(pv.slot, h.slot); assert.equal(pv.quality, h.quality);
  }
});

let failed = 0;
for (const [name, fn] of tests) { try { fn(); console.log(`PASS: ${name}`); } catch (e) { failed++; console.log(`FAIL: ${name}\n  ${e.message}`); } }
assert.equal(failed, 0, `규칙 검사 실패 ${failed}개`);
console.log(`PASS ${tests.length}개`);
