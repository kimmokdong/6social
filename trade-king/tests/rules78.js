/* 7.8 빚·거래 거절·예측: node trade-king/tests/rules78.js */
const assert = require('node:assert/strict'), {performance} = require('node:perf_hooks');
const E = require('../js/engine6.js'), P = E.player, one = (g, q) => E.GOODS.map(k => k === g ? q : 0);
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const clear = G => { while (G.pending) E.choose(G, G.pending.type === 'event' ? 0 : null); };
const days = (G, k) => { while (k-- && !G.over) { clear(G); E.tickDay(G); } };
const game = (id = 'daon') => { const G = E.newGame(78, id); G.plan = []; G.small.next=1e9; for (const n of G.nations.slice(1)) n.ships = []; clear(G); for(const o of G.nations.slice(1))G.rel[G.nations[0].id][o.id]=G.rel[o.id][G.nations[0].id]=1; return G; };
const trust = (G, a, b, k) => { G.rel[a.id][b.id] = G.rel[b.id][a.id] = k; };

test('금고보다 큰 위약금은 빚, 상대는 전액 즉시 받음·수입은 상환 먼저', () => {
  const G = game(), n = P(G), o = G.nations.slice(1).find(o => E.buys(G, o, 3));
  n.money = 1; n.box[3] = [0, 0, 0, 1]; o.money = 9999;
  const before = o.money, out = n.year.moneyOut;
  assert.ok(E.setRoute(G, 0, {to: o.id, give: one(3, 3), get: null}));
  const pen = n.ships[0].cargo.penaltyOut[0];
  assert.ok(pen.amount > 1); assert.equal(n.money, 0); assert.equal(n.debt, pen.amount - 1);
  assert.equal(pen.debt, n.debt); assert.equal(o.money, before + pen.amount); assert.equal(n.year.moneyOut - out, 1);
  assert.equal(n.year.penaltyDebt, pen.debt);
  assert.ok(G.news.some(n => n.text.includes('빚이 됐어요')));
  const bad = E.saveGame(G); bad.nations[0].ships[0].cargo.penaltyOut[0].debt = '<img>';
  assert.equal(E.loadGame(bad), null);
  // 수입 사건으로 자동 상환과 입출금 장부를 확인한다
  const debt = n.debt, moneyIn = n.year.moneyIn, moneyOut = n.year.moneyOut;
  G.pending = {type: 'event', id: 'marketFair', until: 6}; G.queue = [G.pending]; E.choose(G, 0);
  assert.equal(n.debt, Math.max(0, debt - 200)); assert.equal(n.money, Math.max(0, 200 - debt));
  assert.equal(n.year.moneyIn - moneyIn, 200); assert.equal(n.year.moneyOut - moneyOut, Math.min(debt, 200));
  assert.ok(G.news.some(n => n.text.includes('빚을 모두 갚았어요')));
});
test('세금·수출·받은 위약금도 빚부터 갚고 장부는 실제 금고와 맞음', () => {
  const G = game('oil'), n = P(G); n.money = 0; n.debt = 10000;
  const start = n.debt; days(G, 90);
  assert.equal(n.money, 0); assert.equal(start - n.debt, n.year.moneyIn);
  assert.equal(n.year.moneyOut, n.year.moneyIn);
  const H = game(), p = P(H), o = H.nations.slice(1).find(o => E.sells(H, o, 0));
  trust(H,p,o,1); p.debt = 10000; p.money = 100; o.box[0] = [0, 0, 100, 0];
  assert.ok(E.setRoute(H, 0, {to: o.id, give: null, get: one(0, 2)})); o.box[0] = [0, 0, 0, 0]; days(H, p.ships[0].arrive);
  assert.ok(p.year.penaltyIn > 0); assert.ok(p.debt < 10000); assert.equal(p.money, 100);
});
test('빚 감점은 50억마다 올림·최대 10, 정산과 연말 내역에 기록', () => {
  for (const [debt, loss] of [[0, 0], [1, 2], [50, 2], [51, 4], [250, 10], [99999, 10]]) {
    const G = game(), n = P(G); n.debt = debt;
    assert.equal(E.debtLoss(n), loss); days(G, 90); assert.equal(n.last.debt, loss);
    assert.equal(n.last.raw, Math.round(n.last.slotsBy.reduce((a, b) => a + b.points, 0) + n.last.qual + n.last.abundance - n.last.unrest + n.last.extra - n.last.crisis - n.last.empty - n.last.pollution - loss));
    assert.equal(n.last.score, E.overScore(n.last.raw));
  }
  const G = game(), n = P(G); n.debt = 99999; days(G, 365);
  assert.equal(E.yearReport(G, 1).scoreParts.debtLoss, 10); assert.ok(n.history[0].debt > 0);
});
test('♥0은 양방향·NPC끼리 신규 계약 차단, 북쪽 대륙 제외', () => {
  const G = game(), n = P(G), o = G.nations[1], a = G.nations[2];
  trust(G, n, o, 0); trust(G, o, a, 0);
  for (const [x, y] of [[n, o], [o, n], [o, a], [a, o]]) {
    const r = {to: y.id, give: null, get: y.main}; assert.equal(E.allowed(G, x, r), false);
    assert.notEqual(E.bestRoute(G, x, x.ships[0], {only: y.id})?.to, y.id);
  }
  assert.equal(E.setRoute(G, 0, {to: o.id, give: null, get: o.main}), false);
  assert.ok(E.allowed(G, n, {to: 'world', give: null, get: 0}));
});
test('추천 짐은 수출 대금 중 빚을 갚고 남는 돈으로만 수입을 담음', () => {
  const G = game(), n = P(G); n.money = 0; n.debt = 99999;
  for (const o of [...G.nations.slice(1), G.world]) {
    const r = E.plan(G, n, n.ships[0], o);
    assert.equal(r.get.reduce((a, b) => a + b, 0), 0);
  }
});
test('♥0이어도 진행 계약 계속·예약은 시작할 때 취소하고 배 쉼', () => {
  const G = game(), n = P(G), [o, b] = G.nations.slice(1).filter(o => E.sells(G, o, 0)), s = n.ships[0];
  n.money = 9000; o.box[0][2] = 50; assert.ok(E.setRoute(G, 0, {to: o.id, give: null, get: one(0, 1)}));   // 7.9c 시작 재고가 절반이라 미리 채움
  const route = s.route; assert.ok(E.setRoute(G, 0, {to: b.id, give: null, get: one(0, 1)}));
  trust(G, n, o, 0); trust(G, n, b, 0); days(G, 100);
  assert.equal(s.route, route); assert.ok(route.done > 0); assert.ok(n.importedFrom[o.id] > 0);
  // 새해보다 먼저 계약 종료를 만들어 예약 취소만 확인한다
  route.until = E.today(G); days(G, 120);
  assert.equal(s.route, null); assert.equal(s.next, null); assert.equal(s.state, 'port');
  assert.ok(G.news.some(x => x.text.includes('예약을 취소'))); assert.equal(E.rel(G, n, o), 0);
});
test('새해 발전 회의 때 모든 ♥0 쌍을 ♥1로 회복', () => {
  const G = game(), n = P(G); days(G, 340);
  for (const a of G.nations) for (const b of G.nations) if (a !== b) trust(G, a, b, 0);
  days(G, 25); assert.equal(G.month, 12);
  for (const a of G.nations) for (const b of G.nations) if (a !== b) assert.ok(E.rel(G, a, b) >= 1, `${a.id}-${b.id}`);   // 같은 날 NPC 회의 카드로 더 오를 수 있다
  assert.ok(G.queue.some(p => p.type === 'meeting')); assert.ok(G.news.some(x => x.text.includes('새해를 맞아')));
});
test('선물·기술 나눔·FTA로 ♥0 거래 거절을 우회하지 못함', () => {
  const G = game(), n = P(G), o = G.nations[1]; trust(G, n, o, 0); n.money = 999;
  for (const [id, k] of [['invention', 1], ['festival', 0], ['fta', 0]]) {
    G.pending = {type: 'event', id, target: o.id, until: 6}; G.queue = [G.pending]; E.choose(G, k);
    assert.equal(E.rel(G, n, o), 0); assert.ok(!n.fta.includes(o.id));
  }
});
test('7.9부터 옛 저장(빚 없음·음수 금고)은 거절·잘못된 빚 거부', () => {
  const save = E.saveGame(E.newGame(78)); for (const n of save.nations) { delete n.debt; delete n.year.penaltyDebt; }
  save.nations[0].money = -581; assert.equal(E.loadGame(save), null);
  const ok = E.saveGame(E.newGame(78)); ok.nations[0].money = -1; assert.equal(E.loadGame(ok), null);
  const L = E.loadGame(E.saveGame(E.newGame(78))); assert.ok(L); assert.equal(P(L).debt, 0);
  for (const debt of [-1, 1.5, '5']) { const bad = E.saveGame(L); bad.nations[0].debt = debt; assert.equal(E.loadGame(bad), null); }
});
test('예측은 실제 다음 정산과 일치·원본 JSON과 난수 불변·하루 캐시·계약 변경 갱신', () => {
  const times = [];
  for (const seed of [1, 7, 24, 78, 345]) for (const id of ['daon', 'forest', 'ironland']) {
    const G = E.newGame(seed, id); clear(G); E.botTurn(G, 'focus'); days(G, seed % 100);
    P(G).debt = seed * 5;
    const before = JSON.stringify(G), t = performance.now(), f = E.forecast(G); times.push(performance.now() - t);
    assert.equal(JSON.stringify(G), before); assert.equal(E.forecast(G), f);
    const H = JSON.parse(before); H.pending = H.queue[0] || null; const len = P(H).seasons.length;
    while (P(H).seasons.length === len) { clear(H); E.tickDay(H); }
    assert.equal(f.score, P(H).last.score); assert.deepEqual(f.slotsBy, P(H).last.slotsBy); assert.equal(f.debt, P(H).last.debt);
    assert.ok(E.breakContract(G, 0)); assert.notEqual(E.forecast(G), f);
  }
  console.log(`예측 시간 평균 ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)}ms · 최대 ${Math.max(...times).toFixed(2)}ms`);
});
test('80씨앗 × 8나라 × 3전략 전 기간, 모든 나라의 금고·빚은 0 이상 정수', () => {
  let games = 0, min = Infinity, maxDebt = 0;
  for (let seed = 1; seed <= 80; seed++) for (const c of E.T.countries) for (const mode of ['focus', 'balanced', 'opportunist']) {
    const G = E.newGame(seed, c.id); let guard = 0;
    while (!G.over && guard++ < 300) {
      E.botTurn(G, mode); E.tick(G);
      for (const n of G.nations) { assert.ok(Number.isInteger(n.money) && n.money >= 0, `${seed} ${c.id} ${mode} ${n.id} 금고 ${n.money}`); assert.ok(Number.isInteger(n.debt) && n.debt >= 0); min = Math.min(min, n.money); maxDebt = Math.max(maxDebt, n.debt); }
    }
    assert.ok(G.over); games++;
  }
  console.log(`봇 ${games}판 · 최소 금고 ${min}억 · 최대 빚 ${maxDebt}억`);
});
console.log(`\n${passed}개 통과`);
