/* 무역왕 6.0 규칙 검사: node trade-king/tests/rules6.js */
const assert = require('node:assert/strict');
const E = require('../js/engine6.js');
const {X, S} = E;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
const run = (G, months) => { for (let k = 0; k < months; k++) { while (G.pending) E.choose(G, null); E.tick(G); } };
// 다른 나라 배를 모두 묶어 두고 우리 배만 움직이게 한다.
const quiet = G => { for (const n of G.nations.slice(1)) n.ships = []; G.plan = []; return G; };
const toOpen = G => { while (G.pending) E.choose(G, null); return G; };
const P = E.player;
const seller = (G, g) => G.nations.slice(1).find(o => E.sells(G, o, g));

test('같은 씨앗이면 같은 판, 나라 5곳', () => {
  const a = E.runBot(7, 'daon', 'focus'), b = E.runBot(7, 'daon', 'focus');
  assert.equal(a.nations.length, 5);
  assert.deepEqual(a.nations.map(n => n.score), b.nations.map(n => n.score));
});
test('우리가 모자란 물건마다 파는 NPC가 1곳 이상', () => {
  for (const id of E.T.countries.map(c => c.id)) for (let seed = 1; seed <= 30; seed++) {
    const G = E.newGame(seed, id);
    for (const g of [0, 1, 2, 3, 4]) if (E.buys(G, P(G), g)) assert.ok(G.nations.slice(1).some(o => E.sells(G, o, g)), `${id} ${seed} ${g}`);
  }
});
test('처음부터 개항: 첫 화면에서 멈추고 바로 항로를 정할 수 있다', () => {
  const G = E.newGame(1, 'daon');
  assert.equal(G.month, 0); assert.equal(G.pending.type, 'open');
  assert.equal(P(G).ships.length, X.openShips);
  assert.ok(E.count(P(G), 3) > 0, '첫 출항에 실을 기술제품이 있다');
  toOpen(G);
  const o = G.nations.slice(1).find(o => E.buys(G, o, 3));
  assert.ok(E.setRoute(G, 0, {to: o.id, give: 3, get: null}));
});
test('항로 규칙: 상대가 필요 없는 물건은 못 팔고, 남지 않는 물건은 못 산다. 상인은 언제나', () => {
  const G = toOpen(E.newGame(1, 'daon'));
  const o = G.nations.slice(1).find(o => !E.buys(G, o, 3));
  if (o) assert.equal(E.allowed(G, P(G), {to: o.id, give: 3, get: null}), false);
  const noSell = G.nations.slice(1).find(o => !E.sells(G, o, 1));
  assert.equal(E.allowed(G, P(G), {to: noSell.id, give: null, get: 1}), false);
  assert.equal(E.allowed(G, P(G), {to: 'world', give: 3, get: 1}), true);
  assert.equal(E.allowed(G, P(G), {to: 'world', give: 0, get: null}), false, '다온국은 식량이 남지 않는다');
});
test('계약값은 세계 값이 바뀌어도 그대로', () => {
  const G = quiet(toOpen(E.newGame(2, 'daon'))), o = seller(G, 0);
  assert.ok(E.setRoute(G, 0, {to: o.id, give: null, get: 0}));
  const bp = P(G).ships[0].route.bp[0];
  G.base[0] += 10;
  assert.equal(P(G).ships[0].route.bp[0], bp);
  assert.ok(E.price(G, o, P(G), 0) > bp);
});
test('왕복 시간만큼 지나면 수입 상자가 들어온다', () => {
  const G = quiet(toOpen(E.newGame(3, 'daon'))), o = seller(G, 0), T = E.tripTime(G, P(G), o.id);
  for (let g = 0; g < 5; g++) o.box[g][2] = 50;
  E.setRoute(G, 0, {to: o.id, give: null, get: 0});
  const got = () => P(G).year.imp[0][o.id] || 0;   // 계절 끝 소비와 섞이지 않게 수입 기록으로 본다
  E.tick(G);                         // 이달 출항
  run(G, T - 1);
  assert.equal(got(), 0, '아직 돌아오지 않음');
  run(G, 1);
  assert.equal(got(), X.shipSlots, '칸 수만큼 상자가 온다');
});
test('4번 왕복을 마치면 ♥+1, 같은 나라와 새 값으로 자동 갱신', () => {
  const G = quiet(toOpen(E.newGame(4, 'daon'))), o = seller(G, 0), r0 = E.rel(G, P(G), o);
  o.box[0][2] = 500; P(G).money = 5000;
  E.setRoute(G, 0, {to: o.id, give: null, get: 0});
  const first = P(G).ships[0].route;
  run(G, E.tripTime(G, P(G), o.id) * X.contractTrips + 1);
  assert.equal(E.rel(G, P(G), o), Math.min(3, r0 + 1));
  assert.notEqual(P(G).ships[0].route, first);
  assert.equal(P(G).ships[0].route.to, o.id);
});
test('계약 깨기: ♥−1, 지금 왕복을 마치고 예약한 항로로', () => {
  const G = quiet(toOpen(E.newGame(5, 'daon'))), [a, b] = G.nations.slice(1).filter(o => E.buys(G, o, 3));
  P(G).box[3][3] = 50; P(G).money = 5000;
  E.setRoute(G, 0, {to: a.id, give: 3, get: null}); E.tick(G);
  const r0 = E.rel(G, P(G), a);
  assert.ok(E.setRoute(G, 0, {to: b.id, give: 3, get: null}));
  assert.ok(E.breakContract(G, 0));
  assert.equal(P(G).ships[0].route.to, a.id, '바다 위에서는 왕복을 마친다');
  run(G, E.tripTime(G, P(G), a.id));
  assert.equal(E.rel(G, P(G), a), Math.max(0, r0 - 1));
  assert.equal(P(G).ships[0].route.to, b.id);
});
test('수출품이 모자라면 기다리고, 2번 놓치면 ♥−1', () => {
  const G = quiet(toOpen(E.newGame(6, 'daon'))), o = G.nations.slice(1).find(o => E.buys(G, o, 3));
  P(G).box[3] = [0, 0, 0, 0]; P(G).levels[3] = 6;
  E.setRoute(G, 0, {to: o.id, give: 3, get: null});
  const r0 = E.rel(G, P(G), o);
  E.tick(G); E.tick(G);
  assert.equal(P(G).ships[0].state, 'port');
  assert.equal(E.rel(G, P(G), o), Math.max(0, r0 - 1));
  assert.equal(G.stats.misses, 1);
});
test('물건이 모자라면 ♥3인 나라가 먼저 받는다', () => {
  const G = toOpen(E.newGame(8, 'daon')), o = seller(G, 0);
  G.plan = [];
  for (const n of G.nations.slice(1)) n.ships = [];
  const rival = G.nations.slice(1).find(n => n !== o);
  rival.ships = [{state: 'port', route: null, next: null, breaking: false, waited: 0, t: 0, T: 0, arrive: 0, cargo: null}];
  rival.money = P(G).money = 5000;
  G.rel[P(G).id][o.id] = G.rel[o.id][P(G).id] = 3;
  E.setRoute(G, 0, {to: o.id, give: null, get: 0});
  rival.ships[0].route = {to: o.id, give: [0, 0, 0, 0, 0], get: [4, 0, 0, 0, 0], gp: [0, 0, 0, 0, 0], bp: [20, 0, 0, 0, 0], trips: 4, done: 0, signed: -1, traded: 0, stake: 0};
  G.dist[o.id] = 2;
  o.box[0] = [0, 0, 4 + Math.max(0, E.needs(G, o)[0] - E.produces(G, o, 0)), 0];   // 팔 수 있는 건 한 배 몫(4상자)뿐
  E.tick(G); rival.ships[0].T = 2; rival.ships[0].arrive = 1;
  run(G, 2);
  assert.equal(P(G).year.imp[0][o.id], 4);
  assert.equal(rival.ships[0].route.traded, 0);
});
test('산업 쇠퇴: 한 해 수입이 국내 생산보다 많으면 −1단계, 지키기를 하면 그대로', () => {
  for (const guard of [false, true]) {
    const G = quiet(toOpen(E.newGame(9, 'daon'))), o = seller(G, 0);
    o.box[0][2] = 999; P(G).money = 99999;
    if (guard) P(G).protect[0] = 1e9;
    G.dist[o.id] = 2;
    E.setRoute(G, 0, {to: o.id, give: null, get: 0}); E.setRoute(G, 1, {to: o.id, give: null, get: 0});
    const lv = P(G).levels[0];
    run(G, 12);
    assert.equal(P(G).levels[0], guard ? lv : lv - 1);
  }
});
test('지키기: 수입값 +20%, 보호 표시', () => {
  const G = quiet(toOpen(E.newGame(10, 'daon'))), o = seller(G, 0);
  const p0 = E.price(G, o, P(G), 0);
  P(G).money = 1000;
  E.choose(G, null); G.queue = [{type: 'meeting', cards: ['protect']}]; G.pending = G.queue[0];
  assert.ok(E.choose(G, 'protect', 0));
  assert.equal(E.price(G, o, P(G), 0), p0 + 2 * Math.round(S.goods[0].price * .1));
  assert.ok(E.isProtected(G, P(G), 0));
});
test('공급 끊김: ♥가 낮으면 그 나라에서 못 산다', () => {
  const G = quiet(toOpen(E.newGame(11, 'daon'))), o = seller(G, 1) || seller(G, 0), g = E.sells(G, o, 1) ? 1 : 0;
  o.box[g] = [0, 0, 40, 0];
  G.cut = {source: o.id, good: g, until: 99};
  G.rel[P(G).id][o.id] = G.rel[o.id][P(G).id] = 2;   // ♥2여도 분쟁 중에는 막힌다
  P(G).money = 5000;
  E.setRoute(G, 0, {to: o.id, give: null, get: g});
  run(G, E.tripTime(G, P(G), o.id) + 1);
  assert.equal(P(G).ships[0].route.traded, 0);
});
test('한 판 끝까지: 점수 0~100, 돈·상자·값 모두 정수', () => {
  for (const mode of ['self', 'focus', 'balanced', 'opportunist', 'random']) {
    const G = E.runBot(12, 'market', mode);
    assert.ok(G.over);
    for (const n of G.nations) {
      assert.ok(n.score >= 0 && n.score <= 100);
      assert.equal(n.years.length, 5);
      assert.ok(Number.isInteger(n.money), `${mode} ${n.id} money ${n.money}`);
      for (const b of n.box) for (const v of b) assert.ok(Number.isInteger(v) && v >= 0);
    }
    for (const g of [0, 1, 2, 3, 4]) assert.ok(Number.isInteger(E.worldPrice(G, g)));
  }
});
test('위기는 정확히 2번, 평온한 판은 0번', () => {
  for (let seed = 1; seed <= 20; seed++) {
    assert.equal(E.runBot(seed, 'oil', 'focus').stats.crises, 2);
    assert.equal(E.runBot(seed, 'oil', 'focus', {calm: true}).stats.crises, 0);
  }
});
test('2년째 1월에 세 번째 배가 들어온다(항구 섬나라는 4척)', () => {
  const G = E.runBot(13, 'daon', 'focus'), H = E.runBot(13, 'port', 'focus');
  assert.ok(E.player(G).ships.length >= 3);
  assert.ok(E.player(H).ships.length >= 4);
});
test('상인은 나라마다 물건별 한 해 정해진 상자까지만 산다', () => {
  const G = quiet(toOpen(E.newGame(14, 'plains')));
  P(G).box[0][2] = 500;
  E.setRoute(G, 0, {to: 'world', give: 0, get: null});
  run(G, 8);
  assert.ok((G.world.bought[P(G).id]?.[0] || 0) <= X.worldLimit);
});
test('짐칸: 1칸 = 1상자, 여러 물건을 섞어 싣고, 칸을 넘으면 안 된다', () => {
  const G = quiet(toOpen(E.newGame(15, 'daon'))), o = G.world;
  P(G).money = 5000;
  assert.equal(E.allowed(G, P(G), {to: 'world', give: null, get: [2, 2, 1, 0, 0]}), false, '4칸을 넘음');
  assert.ok(E.setRoute(G, 0, {to: 'world', give: [0, 0, 0, 2, 0], get: [2, 1, 1, 0, 0]}));
  const r = P(G).ships[0].route;
  assert.deepEqual(r.get, [2, 1, 1, 0, 0]);
  assert.ok(r.bp[0] > 0 && r.bp[3] === 0 && r.gp[3] > 0);
  run(G, E.tripTime(G, P(G), 'world') + 1);
  assert.equal(P(G).year.imp[0].world, 2); assert.equal(P(G).year.imp[1].world, 1); assert.equal(P(G).year.imp[2].world, 1);
  P(G).bigShip = true;
  assert.ok(E.allowed(G, P(G), {to: 'world', give: null, get: [2, 2, 2, 0, 0]}), '큰 배는 6칸');
  assert.equal(E.slotsOf(G, P(G), o), X.shipSlots + X.bigShipSlots);
});
test('추천 항로는 칸을 넘지 않고, 모자란 물건을 여러 가지 담는다', () => {
  const G = toOpen(E.newGame(16, 'daon')), r = E.bestRoute(G, P(G), P(G).ships[0]);
  assert.ok(r && E.allowed(G, P(G), r));
  assert.ok(r.get.filter(v => v > 0).length >= 2, JSON.stringify(r));
});
console.log(`\n${passed}개 통과`);
