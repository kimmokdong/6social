/* 7.6 규칙 단계: node trade-king/tests/rules76.js */
const assert = require('node:assert/strict'), E = require('../js/engine6.js');
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const one = (g, q) => E.GOODS.map(x => x === g ? q : 0), P = E.player;
function game(id = 'daon', quiet = true) { const G = E.newGame(76, id); while(G.pending) E.choose(G, null); G.plan = []; G.small.next=1e9; if (quiet) G.nations.slice(1).forEach(n => n.ships = []); return G; }
function days(G, q) { while (q-- > 0 && !G.over) { while (G.pending) E.choose(G, null); E.tickDay(G); } }
const buyer = (G, g) => G.nations.slice(1).find(n => E.buys(G, n, g));
const seller = (G, g) => G.nations.slice(1).find(n => E.sells(G, n, g));

test('헐값: 상대 판매값 절반 내림·최소 1원, 계약값 고정·두 상자만 팔고 나머지 귀항', () => {
  const G = game(), n = P(G), o = G.nations.slice(1).find(n => !E.buys(G, n, 3));
  assert.ok(o); o.money = 9999; n.box[3] = [0, 0, 0, 6];
  const p = Math.max(1, Math.floor(E.price(G, o, n, 3) / 2));
  assert.ok(E.isDump(G, o, 3)); assert.equal(E.dumpPrice(G, n, o, 3), p);
  assert.ok(!E.isDump(G, G.world, 3));
  assert.ok(E.setRoute(G, 0, {to: o.id, give: one(3, 6), get: null}));
  const s = n.ships[0]; assert.equal(s.route.gp[3], p); G.base[3] *= 2; assert.equal(s.route.gp[3], p);
  const stock = E.count(o, 3); days(G, s.arrive);
  assert.equal(s.cargo.sold[3], 2); assert.equal(s.cargo.give[3], 4); assert.equal(E.count(o, 3), stock + 2);
  s.breaking = true; days(G, s.T - s.t);
  assert.equal(s.delivery.sold[3], 2); assert.equal(s.delivery.earned, 2 * p); assert.equal(s.route, null); assert.equal(s.cargo, null);
  // 정산에 쓰인 몫도 더하면 못 판 네 상자가 모두 돌아왔다.
  const used = n.year.seasons.reduce((a, s) => a + s.slotsBy.find(b => b.good === 3).got, 0);
  assert.equal(E.count(n, 3) + used, 4);
  const H = game(); H.base[0] = 1; assert.equal(E.dumpPrice(H, P(H), H.nations[1], 0), 1);
});
test('헐값: 생산하지 않는 물건도 보유 재고로 수동 판매, 세계 대륙은 기존 제한', () => {
  const G = game(), n = P(G), o = G.nations[1]; n.box[0] = [0, 0, 1, 0];
  assert.ok(!E.canGive(G, n, 0)); assert.ok(E.setRoute(G, 0, {to: o.id, give: one(0, 1), get: null}));
  assert.equal(n.ships[0].cargo.give[0], 1);
  assert.equal(E.allowed(G, n, {to: 'world', give: 0, get: null}), false);
});
test('추천·plan·모든 봇·NPC는 헐값을 고르지 않는다', () => {
  for (const {id} of E.T.countries) {
    const G = game(id, false), n = P(G);
    for (const o of [...G.nations.slice(1), G.world]) {
      const r = E.plan(G, n, n.ships[0], o);
      assert.ok(r.give.every((q, g) => !q || !E.isDump(G, o, g)));
    }
    for (const mode of ['focus', 'balanced', 'random', 'opportunist']) {
      const H = E.runBot(76, id, mode);
      for (const m of H.nations) for (const s of m.ships) if (s.route) assert.ok(!s.route.dump.some(Boolean), `${id}/${mode}`);
    }
  }
});
test('월중 계약도 당일 출항, 실제 달 길이로 절반날 거래·마지막 날 귀항과 재출항', () => {
  const G = game(), n = P(G); days(G, 14);
  assert.equal(G.day, 15); assert.equal(G.month, 0);
  E.setRoute(G, 0, {to: 'world', give: null, get: one(0, 1)});
  const s = n.ships[0], T = E.tripDays(G, E.tripTime(G, n, 'world'));
  assert.equal(s.state, 'sea'); assert.equal(s.t, 0); assert.equal(s.T, T);
  days(G, s.arrive - 1); assert.equal(s.cargo.get[0], 0);
  days(G, 1); assert.equal(s.cargo.get[0], 1);
  days(G, s.T - s.t - 1); assert.equal(s.delivery, undefined);
  days(G, 1); assert.equal(s.delivery.get[0], 1); assert.equal(s.state, 'sea'); assert.equal(s.t, 0);
  assert.equal(s.delivery.day, G.day);
  const H = game(); days(H, 30); assert.equal(H.day, 31); assert.equal(E.tripDays(H, 1), 28, '없는 출항 날짜는 다음 달 말일');
});
test('정산은 4월 1일·연말은 다음 해 1월 1일, tick은 월중에도 다음 달 1일까지', () => {
  const G = game(); days(G, 89); assert.equal(G.month, 2); assert.equal(G.day, 31); assert.equal(P(G).seasons.length, 0);
  E.tickDay(G); assert.equal(G.month, 3); assert.equal(G.day, 1); assert.equal(P(G).seasons.length, 1);
  days(G, 11); assert.equal(G.day, 12); E.tick(G); assert.equal(G.month, 4); assert.equal(G.day, 1);
  while (G.month < 12) { while (G.pending) E.choose(G, null); E.tick(G); }
  assert.equal(G.day, 1); assert.equal(P(G).years.length, 1); assert.equal(G.pending.type, 'yearEnd');
});
test('수입 재고 부족 위약금은 부족분 금액의 30% 올림, 양쪽 금고·통계·도착 결과·뉴스에 기록', () => {
  const G = game(), n = P(G), o = seller(G, 0); o.box[0] = [0, 0, 1, 0]; n.money = 9999;
  E.setRoute(G, 0, {to: o.id, give: null, get: one(0, 4)}); const s = n.ships[0], p = s.route.bp[0];
  const a = n.money, b = o.money; days(G, s.arrive);
  assert.equal(s.cargo.get[0], 1); const amount = Math.max(3, Math.ceil(3 * p * .3));
  assert.equal(n.money, a - p + amount); assert.equal(o.money, b + p - amount);
  assert.equal(n.year.penaltyIn, amount); assert.equal(o.year.penaltyOut, amount); assert.ok(G.news.some(n => n.text.includes('위약금 +')));
  assert.deepEqual(s.cargo.penaltyIn, [{good: 0, qty: 3, amount, reason: '재고 부족'}]);
  days(G, s.T - s.t); assert.equal(s.delivery.penaltyIn[0].amount, amount);
  const H = game(), m = P(H), t = seller(H, 0); t.box[0] = [0, 0, 0, 0]; m.money = 9999;
  E.setRoute(H, 0, {to: t.id, give: null, get: one(0, 4)}); m.ships[0].route.bp[0] = 1;
  days(H, m.ships[0].arrive); assert.equal(m.ships[0].cargo.penaltyIn[0].amount, 4, '상자당 최소 1원');
});
test('수출 일부 적재 부족 위약금, 빈 배는 월별 대기·♥ 규칙 유지', () => {
  const G = game(), n = P(G), o = buyer(G, 3); n.box[3] = [0, 0, 0, 1]; o.money = 9999;
  const a = n.money, b = o.money; E.setRoute(G, 0, {to: o.id, give: one(3, 3), get: null});
  const s = n.ships[0], amount = Math.max(2, Math.ceil(2 * s.route.gp[3] * .3));
  assert.equal(s.state, 'sea'); assert.equal(s.cargo.give[3], 1); assert.equal(n.money, a - amount); assert.equal(o.money, b + amount);
  assert.equal(n.year.penaltyOut, amount); assert.equal(o.year.penaltyIn, amount); assert.equal(s.cargo.penaltyOut[0].qty, 2);
  days(G, s.T); assert.equal(s.delivery.penaltyOut[0].amount, amount);
  const H = game(), m = P(H), t = buyer(H, 3); m.box[3] = [0, 0, 0, 0];
  E.setRoute(H, 0, {to: t.id, give: one(3, 3), get: null}); const r = E.rel(H, m, t);
  days(H, 30); assert.equal(m.ships[0].waited, 1); E.tickDay(H); assert.equal(m.ships[0].waited, 2); assert.equal(E.rel(H, m, t), r - 1);
  assert.equal(m.year.penaltyOut, 0);
});
test('공급 끊김·사건 생산 감소·구매자 금고 부족에는 위약금 없음(수출·수입)', () => {
  for (const kind of ['cut', 'event', 'money', 'both']) {
    const G = game(), n = P(G), o = seller(G, 0); o.box[0] = [0, 0, kind === 'event' || kind === 'both' ? 0 : 99, 0];
    n.money = kind === 'money' || kind === 'both' ? 0 : 9999;
    if (kind === 'cut') G.cut = {source: o.id, good: 0, until: 99};
    assert.ok(E.setRoute(G, 0, {to: o.id, give: null, get: one(0, 4)}));
    if (kind === 'event') o.mods.push({kind: 'level', g: 0, v: -1, until: 99});
    days(G, n.ships[0].arrive);
    assert.equal(n.year.penaltyIn, 0, kind); assert.deepEqual(n.ships[0].cargo.penaltyIn, []);
  }
  for (const kind of ['cut', 'event', 'money']) {
    const G = game(), n = P(G), o = buyer(G, 3); n.box[3] = [0, 0, 0, 1];
    if (kind === 'cut') G.cut = {source: n.id, good: 3, until: 99};
    if (kind === 'event') n.mods.push({kind: 'level', g: 3, v: -1, until: 99});
    if (kind === 'money') o.money = 0;
    E.setRoute(G, 0, {to: o.id, give: one(3, 3), get: null}); assert.equal(n.year.penaltyOut, 0, kind);
  }
});
test('NPC도 적게 싣거나 상대에게 적게 주면 같은 위약금 규칙 적용', () => {
  const G = game(), n = G.nations[1], o = G.nations[2], g = n.main;
  n.box[g] = [0, 0, 1 + Math.max(0, E.uses(G, n)[g] - E.produces(G, n, g)), 0]; o.money = 9999;
  n.ships = [{state: 'port', waited: 0, route: {to: o.id, give: one(g, 3), get: one(0, 0), gp: one(g, 21), bp: one(0, 0), until: 400, done: 0, trips: 4, traded: 0, stake: 0, signed: 0}}];
  days(G, 1); assert.equal(n.ships[0].cargo.penaltyOut[0].amount, 13); assert.equal(n.year.penaltyOut, 13); assert.equal(o.year.penaltyIn, 13);
});
test('yearReport는 5개년·5나라 순위 변화·바구니·품목·돈·위약금, 순수 데이터', () => {
  const G = E.runBot(76, 'port'), before = JSON.stringify(G);
  assert.equal(E.yearReport(G, 0), null);
  for (let y = 1; y <= 5; y++) {
    const r = E.yearReport(G, y), h = P(G).history[y - 1];
    assert.equal(r.year, y); assert.equal(r.score, P(G).years[y - 1]); assert.equal(r.ranks.length, 5);
    assert.deepEqual(r.ranks.map(n => n.rank), [1, 2, 3, 4, 5]); assert.equal(r.rankChange, y > 1 ? P(G).history[y - 2].rank - r.rank : 0);
    assert.equal(r.slotsBy.length, E.CONSUMER.length); assert.equal(r.scoreParts.basketMax, E.CONSUMER.length * E.X.slotPoints);
    assert.equal(h.seasons.length, 4); assert.ok(h.seasons.every(s => Math.abs(s.slotsBy.reduce((a, b) => a + b.points, 0) - s.slots) <= .5));
    assert.equal(r.exports.length, E.GOODS.length); assert.equal(r.imports.length, E.GOODS.length);
    assert.ok(r.topExports.every((a, i) => !i || a.qty <= r.topExports[i - 1].qty));
    assert.equal(h.money, (y === 1 ? E.X.startMoney : P(G).history[y - 2].money) + r.moneyIn - r.moneyOut);
    // 7.8 못 낸 위약금은 지출 대신 빚, 갚은 돈은 실제 지출이다.
    const debtStart = y === 1 ? 0 : P(G).history[y - 2].debt || 0;
    assert.ok(r.moneyIn >= r.penalties.in && r.moneyOut + (h.debt || 0) - debtStart >= r.penalties.out);
    r.slotsBy[0].points = -99;
  }
  assert.equal(JSON.stringify(G), before);
});
test('월중 항해 JSON 저장·복원 후 날짜·항해·난수·연말 결과 동일, 옛 저장·잘못된 날짜 거부', () => {
  const G = game('oil', false); E.setRoute(G, 0, {to: 'world', give: null, get: one(0, 1)}); days(G, 17);
  const saved = E.saveGame(G), H = E.loadGame(saved); assert.ok(H); assert.equal(H.day, 18); assert.deepEqual(H, G);
  for (let i = 0; i < 400; i++) { days(G, 1); days(H, 1); } assert.deepEqual(H, G);
  assert.equal(E.loadGame({...saved, saveVersion: 1}), null);
  for (const day of [0, 32, 1.5]) assert.equal(E.loadGame({...saved, day}), null);
  assert.equal(E.loadGame({...saved, month: 1, day: 29}), null);
  const bad = JSON.parse(JSON.stringify(saved)); delete bad.nations[0].ships[0].cargo.penaltyIn; assert.equal(E.loadGame(bad), null);
});
console.log(`\n${passed}개 통과`);
