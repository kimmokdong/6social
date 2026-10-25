/* 무역왕 7.7 1년 계약 검사: node trade-king/tests/rules77.js */
const assert = require('node:assert/strict');
const E = require('../js/engine6.js');
const P = E.player;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
const quiet = G => { for (const n of G.nations.slice(1)) n.ships = []; G.plan = []; G.small.next=1e9; return G; };
const toOpen = G => { while (G.pending) E.choose(G, null); return G; };
// 하루씩 가며 멈춤(회의·1년 결과)은 그냥 넘긴다. 매일 f(G)를 부른다.
const days = (G, k, f) => { while (k > 0 && !G.over) { while (G.pending) E.choose(G, null); if (E.advance(G, 1)) { k--; f?.(G); } } };
const goTo = (G, m, d, f) => days(G, E.dayNo(m, d) - E.today(G), f);
const seller = (G, g) => G.nations.slice(1).find(o => E.sells(G, o, g));

test('3월 5일에 맺으면 다음 해 3월 4일까지', () => {
  const G = quiet(toOpen(E.newGame(4, 'daon'))), o = seller(G, 0);
  goTo(G, 2, 5); assert.deepEqual([G.month, G.day], [2, 5]);
  P(G).money = 5000; o.box[0][2] = 500;
  assert.ok(E.setRoute(G, 0, {to: o.id, give: null, get: 0}));
  const r = P(G).ships[0].route;
  assert.deepEqual(E.dateOf(r.until), {month: 14, day: 4});
  assert.equal(E.dayText(r.until), '2년째 3월 4일');
  assert.equal(r.trips, E.fitTrips(G, P(G), r));
});
test('끝나는 날 뒤에 돌아오는 왕복은 떠나지 않고, 끝나면 다시 맺지 않고 쉰다', () => {
  const G = quiet(toOpen(E.newGame(4, 'daon'))), o = seller(G, 0), me = P(G), s = me.ships[0];
  goTo(G, 2, 5); me.money = 9000; o.box[0][2] = 900;
  E.setRoute(G, 0, {to: o.id, give: null, get: 0});
  const r = s.route, planned = r.trips; let homes = 0, lastHome = -1, wasSea = true;
  days(G, 420, G => { const sea = s.state === 'sea'; if (wasSea && !sea && s.route === r || wasSea && !sea && !s.route && homes < planned) { homes++; lastHome = E.today(G); } wasSea = sea; });
  assert.equal(s.route, null, '1년이 지나면 쉬는 중');
  assert.equal(s.next, null);
  assert.equal(r.done, planned, `계획한 ${planned}번을 다 다녀왔다`);
  assert.ok(planned >= 4 && planned <= 6, `왕복 ${planned}번`);
  assert.ok(lastHome <= r.until + 1, `마지막으로 돌아온 날 ${lastHome}이 계약 끝 다음 날 아침까지 ${r.until}`);
  if (E.tripTime(G, me, o.id) === 2) assert.equal(planned, 6, '2달 왕복은 꼭 6번'); else assert.equal(planned, 4, '3달 왕복은 4번');
  assert.ok(G.news.some(x => /계약이 끝났어요\(2년째 3월 4일\)/.test(x.text || x)), '끝났다는 소식');
});
test('NPC 배는 계약이 끝나면 새로 고른다', () => {
  const G = toOpen(E.newGame(9, 'plains')); G.plan = []; G.small.next=1e9;
  const n = G.nations[1], s = n.ships.find(s => s.route), r = s.route;
  days(G, r.until - E.today(G) + 130);
  assert.ok(s.route && s.route !== r, 'NPC 새 계약');
  assert.ok(s.route.until > r.until);
});
test('예약한 새 계약은 실제로 시작한 날부터 1년, 그날 값', () => {
  const G = quiet(toOpen(E.newGame(5, 'daon'))), [a, b] = [...G.nations.slice(1).filter(o => E.buys(G, o, 3)), G.world], me = P(G), s = me.ships[0];
  me.box[3][3] = 400; me.money = 9000;
  E.setRoute(G, 0, {to: a.id, give: 3, get: null});
  const first = s.route; days(G, 40);
  assert.ok(E.setRoute(G, 0, {to: b.id, give: 3, get: null}), '예약'); assert.equal(s.route, first);
  let start = -1; days(G, 400, G => { if (start < 0 && s.route && s.route !== first) start = E.today(G); });
  assert.ok(start > first.until - 70 && start <= first.until + 1, `예약은 앞 계약 끝 무렵 시작 ${start} / ${first.until}`);
  const next = s.route.to === b.id ? s.route : null;
  assert.ok(next, '예약한 나라로'); assert.equal(next.until, start + 364);
});
test('철의 나라 철광석·철강 계약은 2년', () => {
  const G = toOpen(E.newGame(3, 'ironland')), n = P(G), o = G.nations.slice(1).find(o => E.buys(G, o, 5));
  n.box[5][2] = 50; n.money = 999;
  if (o) { assert.ok(E.setRoute(G, 0, {to: o.id, give: 5, get: null})); assert.equal(n.ships[0].route.until - E.today(G), 729); }
  const f = G.nations.slice(1).find(x => E.sells(G, x, 0));
  if (f) { assert.ok(E.setRoute(G, 1, {to: f.id, give: null, get: 0})); assert.equal(n.ships[1].route.until - E.today(G), 364); }
});
test('옛 저장(끝나는 날 없음)은 7.9부터 받지 않는다', () => {
  const G = toOpen(E.newGame(4, 'daon')), o = seller(G, 0); G.plan = []; G.small.next=1e9;
  goTo(G, 2, 5); P(G).money = 5000; E.setRoute(G, 0, {to: o.id, give: null, get: 0});
  const save = E.saveGame(G); for (const n of save.nations) for (const s of n.ships) if (s.route) delete s.route.until;
  assert.equal(E.loadGame(save), null, '옛 저장은 조용히 거절');
  assert.ok(E.loadGame(E.saveGame(G)), '지금 저장은 이어 한다');
});
test('봇은 쉬는 배가 없게 다시 계약한다(한 판 끝까지)', () => {
  const G = E.runBot(11, 'market', 'focus');
  assert.ok(G.over); assert.ok(G.nations[0].years.length === 5);
  assert.ok(P(G).history.every(h => h.ships >= 1));
});
console.log(`\n${passed}개 통과`);
