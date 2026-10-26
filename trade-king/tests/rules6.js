/* 무역왕 6.0 규칙 검사: node trade-king/tests/rules6.js */
const assert = require('node:assert/strict');
const E = require('../js/engine6.js');
const {X, S} = E;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
const run = (G, months) => { for (let k = 0; k < months; k++) { while (G.pending) E.choose(G, null); E.tick(G); } };
// 다른 나라 배를 모두 묶어 두고 우리 배만 움직이게 한다.
const quiet = G => { for (const n of G.nations.slice(1)) n.ships = []; G.plan = []; G.small.next=1e9; return G; };
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
    for (const g of E.GOODS) if (E.buys(G, P(G), g)) assert.ok(G.nations.slice(1).some(o => E.sells(G, o, g)), `${id} ${seed} ${g}`);
  }
});
test('처음부터 개항: 첫 화면에서 멈추고 바로 항로를 정할 수 있다', () => {
  const G = E.newGame(1, 'daon');
  assert.equal(G.month, 0); assert.equal(G.pending.type, 'open'); assert.equal(G.queue.length, 1);   // 7.9 첫해에는 발전 회의가 없다
  assert.equal(P(G).ships.length, X.openShips);
  assert.ok(E.count(P(G), 3) > 0, '첫 출항에 실을 첨단기기가 있다');
  toOpen(G);
  const o = G.nations.slice(1).find(o => E.buys(G, o, 3));
  assert.ok(E.setRoute(G, 0, {to: o.id, give: 3, get: null}));
});
test('항로 규칙: 상대가 필요 없는 물건도 헐값으로 팔고, 남지 않는 물건은 못 산다. 상인은 기존 규칙', () => {
  const G = toOpen(E.newGame(1, 'daon'));
  const o = G.nations.slice(1).find(o => !E.buys(G, o, 3));
  if (o) assert.equal(E.allowed(G, P(G), {to: o.id, give: 3, get: null}), true);
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
  assert.equal(P(G).ships[0].state, 'sea', '계약 당일 출항');
  run(G, T - 1);
  assert.equal(got(), 0, '아직 돌아오지 않음');
  run(G, 1);
  assert.equal(got(), E.slotsOf(G, P(G), o), '칸 수만큼 상자가 온다(다온국은 큰 배 6칸)');
});
test('7.7 1년 계약을 마치면 ♥+1, 다시 맺지 않고 배는 쉰다', () => {
  const G = quiet(toOpen(E.newGame(4, 'daon'))), o = seller(G, 0), r0 = E.rel(G, P(G), o);
  o.box[0][2] = 500; P(G).money = 5000;
  E.setRoute(G, 0, {to: o.id, give: null, get: 0});
  run(G, 13);
  assert.equal(E.rel(G, P(G), o), Math.min(3, r0 + 1));
  assert.equal(P(G).ships[0].route, null);
});
test('계약 깨기: ♥−1, 지금 왕복을 마치고 예약한 항로로', () => {
  const G = quiet(toOpen(E.newGame(5, 'daon'))), [a, b] = [...G.nations.slice(1).filter(o => E.buys(G, o, 3)), G.world];
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
  E.tick(G);
  assert.equal(P(G).ships[0].state, 'port');
  assert.equal(E.rel(G, P(G), o), Math.max(0, r0 - 1));
  assert.equal(G.stats.misses, 1);
});
test('물건이 모자라면 ♥3인 나라가 먼저 받는다', () => {
  const G = toOpen(E.newGame(8, 'daon')), o = seller(G, 0);
  G.plan = []; G.small.next=1e9;
  for (const n of G.nations.slice(1)) n.ships = [];
  const rival = G.nations.slice(1).find(n => n !== o);
  rival.ships = [{state: 'port', route: null, next: null, breaking: false, waited: 0, t: 0, T: 0, arrive: 0, cargo: null}];
  rival.money = P(G).money = 5000;
  G.rel[P(G).id][o.id] = G.rel[o.id][P(G).id] = 3;
  G.dist[o.id] = 2;
  E.setRoute(G, 0, {to: o.id, give: null, get: 0});
  rival.ships[0].route = {to: o.id, give: [0, 0, 0, 0, 0, 0], get: [4, 0, 0, 0, 0, 0], gp: [0, 0, 0, 0, 0, 0], bp: [20, 0, 0, 0, 0, 0], until: 400, trips: 4, done: 0, signed: -1, traded: 0, stake: 0};
  G.dist[o.id] = 2;
  o.box[0] = [0, 0, 4 + Math.max(0, E.needs(G, o)[0] - E.produces(G, o, 0)), 0];   // 팔 수 있는 건 한 배 몫(4상자)뿐
  E.advance(G, 1); rival.ships[0].T = 58; rival.ships[0].arrive = 29;
  E.advance(G, 58);
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
test('한 판 끝까지: 점수 = 해마다 점수의 합(0 이상), 돈·상자·값 모두 정수', () => {
  for (const mode of ['self', 'focus', 'balanced', 'opportunist', 'random']) {
    const G = E.runBot(12, 'market', mode);
    assert.ok(G.over);
    for (const n of G.nations) {
      assert.ok(Number.isInteger(n.score) && n.score >= 0 && n.score === n.years.reduce((a, b) => a + b, 0));
      assert.equal(n.years.length, 5);
      assert.ok(Number.isInteger(n.money), `${mode} ${n.id} money ${n.money}`);
      for (const b of n.box) for (const v of b) assert.ok(Number.isInteger(v) && v >= 0);
    }
    for (const g of E.GOODS) assert.ok(Number.isInteger(E.worldPrice(G, g)));
  }
});
test('위기는 기본 2번(덤 위기가 끼면 3번), 평온한 판은 0번', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const k = E.runBot(seed, 'oil', 'focus').stats.crises; assert.ok(k >= 2 && k <= 3, `위기 ${k}번`);
    assert.equal(E.runBot(seed, 'oil', 'focus', {calm: true}).stats.crises, 0);
  }
});
test('처음 배는 3척(항구 섬나라는 4척), 카드를 고르면 늘릴 수 있다', () => {
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
  P(G).bigShip = false;   // 다온국은 큰 배로 시작하므로 기본 4칸으로 되돌려 검사
  assert.equal(E.allowed(G, P(G), {to: 'world', give: null, get: [2, 2, 1, 0, 0, 0]}), false, '4칸을 넘음');
  assert.ok(E.setRoute(G, 0, {to: 'world', give: [0, 0, 0, 2, 0, 0], get: [2, 1, 1, 0, 0, 0]}));
  const r = P(G).ships[0].route;
  assert.deepEqual(r.get, [2, 1, 1, 0, 0, 0]);
  assert.ok(r.bp[0] > 0 && r.bp[3] === 0 && r.gp[3] > 0);
  run(G, E.tripTime(G, P(G), 'world') + 1);
  assert.equal(P(G).year.imp[0].world, 2); assert.equal(P(G).year.imp[1].world, 1); assert.equal(P(G).year.imp[2].world, 1);
  P(G).bigShip = true;
  assert.ok(E.allowed(G, P(G), {to: 'world', give: null, get: [2, 2, 2, 0, 0, 0]}), '큰 배는 6칸');
  assert.equal(E.slotsOf(G, P(G), o), X.shipSlots + X.bigShipSlots);
});
test('추천 항로는 칸을 넘지 않고, 모자란 물건을 여러 가지 담는다', () => {
  // 재료(철강)가 급하면 한 가지로 칸을 다 채울 수도 있으니, 여러 판 중 섞어 담는 추천이 있는지 본다.
  let mixed = 0;
  for (const seed of [16, 17, 18, 19, 20]) {
    const G = toOpen(E.newGame(seed, 'daon')), r = E.bestRoute(G, P(G), P(G).ships[0]);
    assert.ok(r && E.allowed(G, P(G), r), JSON.stringify(r));
    mixed += r.get.filter(v => v > 0).length >= 2;
  }
  assert.ok(mixed >= 2, `섞어 담는 추천 ${mixed}/5`);
});
test('귀항 결과는 실제 거래량·금액이며 같은 달 재출항 후에도 유지된다', () => {
  const G = quiet(toOpen(E.newGame(21, 'daon'))), me = P(G);
  me.money = 5000;
  E.setRoute(G, 0, {to: 'world', give: [0, 0, 0, 1, 0, 0], get: [2, 1, 1, 0, 0, 0]});
  const r = me.ships[0].route;
  run(G, E.tripTime(G, me, 'world') + 1);
  const s = me.ships[0], d = s.delivery;
  assert.equal(s.state, 'sea', '다음 항해가 이미 출발함');
  assert.deepEqual(d.get, [2, 1, 1, 0, 0, 0]);
  assert.deepEqual(d.sold, [0, 0, 0, 1, 0, 0]);
  assert.equal(d.earned, r.gp[3]);
  assert.equal(d.spent, 2 * r.bp[0] + r.bp[1] + r.bp[2]);
  assert.deepEqual(d.shortages, []);
  s.cargo.get[0] = 99;
  assert.equal(d.get[0], 2, '다음 항해 짐과 귀항 결과는 별개');
});

test('돈·재고·공급 끊김으로 덜 받은 이유를 실제 거래 시점에 기록한다', () => {
  for (const reason of ['money', 'stock', 'cut']) {
    const G = quiet(toOpen(E.newGame(22, 'daon'))), me = P(G), o = seller(G, 0);
    G.dist[o.id] = 2; o.box[0] = [0, 0, reason === 'stock' ? 1 : 100, 0];
    if (reason === 'cut') G.cut = {source: o.id, good: 0, until: 99};
    me.money = reason === 'money' ? E.price(G, o, me, 0) : 5000;
    E.setRoute(G, 0, {to: o.id, give: null, get: [4, 0, 0, 0, 0, 0]});
    const bp = me.ships[0].route.bp[0];
    E.advance(G, me.ships[0].T);
    const d = me.ships[0].delivery, qty = reason === 'cut' ? 0 : 1;
    assert.equal(d.get[0], qty);
    assert.equal(d.spent, qty * bp);
    assert.deepEqual(d.shortages, [{good: 0, qty: 4 - qty, reason: {money: '우리 금고 부족', stock: '상대 재고 부족', cut: '공급 끊김'}[reason]}]);
  }
});

// ---------- 6.4 투입 사다리·위기 값 ----------
test('첨단기기 공장은 철강을 쓴다: 철강이 모자라면 그만큼만 만들고 소식이 뜬다', () => {
  const G = quiet(toOpen(E.newGame(31, 'port'))), me = P(G);
  assert.deepEqual(E.CHAIN, [[4, 5], [5, 3]]); assert.equal(E.inputOf(3), 5); assert.equal(E.inputOf(5), 4);
  const full = E.inputNeed(G, me, 5);
  me.box[3] = [0, 0, 0, 0];   // 창고를 비우면 공장이 다 돌아간다
  assert.equal(E.inputNeed(G, me, 5), E.produces(G, me, 3) * X.inputPer, '철강 투입 = 첨단기기 생산량 × inputPer');
  assert.ok(full < E.inputNeed(G, me, 5), '창고에 첨단기기가 있으면 그만큼 덜 만들고 철강도 덜 쓴다');
  assert.equal(E.uses(G, me)[5], E.needs(G, me)[5] + E.inputNeed(G, me, 5));
  me.box[3] = [0, 0, 0, 0]; me.box[5] = [0, 0, 2, 0]; me.levels[5] = 0;   // 철강 2상자뿐, 철강 생산 없음
  run(G, 3);
  assert.equal(me.year.prod[3], 2, '철강 2상자로 첨단기기 2상자만');
  assert.equal(me.short[3], E.produces(G, me, 3) - 2);
  assert.ok(G.news.some(n => n.text.includes('철강 부족으로')));
});
test('철강 공장은 철광석을 쓴다: 사다리 순서대로 만들어 철광석 → 철강 → 첨단기기가 한 계절에 이어진다', () => {
  const G = quiet(toOpen(E.newGame(35, 'ironland'))), me = P(G);
  assert.ok(E.produces(G, me, 5) > 0 && E.produces(G, me, 4) > 0);
  assert.ok(E.inputNeed(G, me, 4) < E.produces(G, me, 5) * X.inputPer, '시작 창고에 철강이 있으니 공장은 빈자리만큼만 돌고 철광석도 그만큼만 쓴다');
  me.box[4] = [0, 0, 0, 0]; me.box[5] = [0, 0, 0, 0]; me.box[3] = [0, 0, 0, 0];
  assert.equal(E.inputNeed(G, me, 4), E.produces(G, me, 5) * X.inputPer, '창고를 비우면 철광석 투입 = 철강 생산량 × inputPer');
  me.levels[3] = 2;   // 철의 나라에 첨단기기 공장을 하나 세우면 그 계절 만든 철강으로 바로 첨단기기를 만든다
  run(G, 3);
  assert.equal(me.year.prod[5], E.produces(G, me, 5), '철광석은 이번 계절 캔 것으로 충분');
  assert.equal(me.year.prod[3], E.produces(G, me, 3), '철강은 이번 계절 만든 것으로 충분');
  assert.equal(Object.keys(me.short).length, 0);
});
test('창고가 차면 공장이 쉰다: 철강을 헛되이 쓰지 않는다', () => {
  const G = quiet(toOpen(E.newGame(32, 'daon'))), me = P(G);
  me.box[3] = [0, 0, 0, 99]; me.box[5] = [0, 0, 20, 0];
  assert.equal(E.inputNeed(G, me, 5), 0, '창고가 차면 공장이 쓸 철강도 0');
  assert.equal(E.uses(G, me)[5], E.needs(G, me)[5]);
  run(G, 3);
  assert.equal(me.year.prod[3], 0, '첨단기기 창고가 꽉 차서 안 만듦');
  assert.equal(me.short[3], undefined);
});
test('세계 경제 위기: 1차 물건 값은 반토막, 만든 물건은 조금만 내린다', () => {
  const G = quiet(toOpen(E.newGame(33, 'daon')));
  const before = E.GOODS.map(g => E.worldPrice(G, g));
  G.plan = [{id: 'recession', month: G.month + 1}];
  run(G, 1);
  assert.equal(G.pending.type, 'event');
  const after = E.GOODS.map(g => E.worldPrice(G, g));
  assert.deepEqual(E.RAW, [0, 1, 4]);
  for (const g of E.RAW) assert.equal(after[g], Math.max(1, Math.round(G.base[g] * X.recessionRaw)), `1차 물건 ${g}`);
  for (const g of [2, 3, 5]) assert.equal(after[g], Math.max(1, Math.round(G.base[g] * X.recessionMade)), `만든 물건 ${g}`);
  assert.ok(after[0] / before[0] < after[3] / before[3]);
});
test('다온국은 큰 배로 시작한다(짐칸 6칸), 발전 회의에 큰 배 카드가 안 나온다', () => {
  const G = toOpen(E.newGame(34, 'daon')), me = P(G);
  assert.ok(me.bigShip);
  assert.equal(E.slotsOf(G, me, G.world), X.shipSlots + X.bigShipSlots);
  assert.ok(!E.cardsFor(G, me).includes('bigShip'));
  assert.ok(!P(E.newGame(34, 'plains')).bigShip);
});

// ---------- 6.5 사건 다양화·나라별 특별 사건·도감 ----------
test('나라별 특별 사건은 그 나라로 할 때만 나오고, 거의 매 판 나온다', () => {
  for (const id of E.T.countries.map(c => c.id)) {
    let mine = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const G = E.newGame(seed, id);
      for (const p of G.plan) { const e = S.events.find(e => e.id === p.id); assert.ok(!e.only || e.only === id, `${id} ${seed} ${p.id}`); }
      mine += G.plan.some(p => S.events.find(e => e.id === p.id).only === id);
    }
    assert.ok(mine >= 18, `${id} 특별 사건 ${mine}/20`);
  }
});
test('사건 계획: 씨앗마다 다르고, 큰 사건은 한 판 4~5번, 위기 덤은 한 판에 하나, 달이 겹치지 않는다', () => {
  const ids = G => G.plan.map(p => p.id).join(',');
  assert.notEqual(ids(E.newGame(1, 'daon')), ids(E.newGame(2, 'daon')));
  for (let seed = 1; seed <= 30; seed++) {
    const G = E.newGame(seed, 'port'), extras = G.plan.filter(p => S.events.find(e => e.id === p.id).extra);
    assert.ok(G.plan.length>=4&&G.plan.length<=5);
    assert.equal(G.plan.filter(p=>S.events.find(e=>e.id===p.id).only==='port').length,1);
    assert.equal(G.plan.filter(p=>{const e=S.events.find(e=>e.id===p.id);return e.crisis&&!e.only;}).length,2);
    assert.equal(new Set(G.plan.map(p => p.month)).size, G.plan.length, '달 겹침');
    assert.ok(G.plan.every(p => p.month % 12 !== 0), '발전 회의 달과 겹침');
  }
});
test('덤 사건 효과: 해적은 왕복 +1달, 배 고장은 3달 못 떠남, 관세 전쟁은 값 +15%', () => {
  const G = quiet(toOpen(E.newGame(41, 'daon'))), me = P(G), o = G.nations[1];
  const t0 = E.tripTime(G, me, o.id);
  G.plan = [{id: 'pirates', month: G.month + 1}]; run(G, 1); assert.equal(G.pending.id, 'pirates'); E.choose(G, 1);
  assert.equal(E.tripTime(G, me, o.id), t0 + 1);
  const H = quiet(toOpen(E.newGame(42, 'daon'))), m = P(H);
  H.plan = [{id: 'shipwreck', month: H.month + 1}]; run(H, 1); E.choose(H, 1);
  assert.ok(m.ships.some(s => s.repair === H.month + 3));
  const K = quiet(toOpen(E.newGame(43, 'daon'))), before = E.worldPrice(K, 0);
  K.plan = [{id: 'tariffWar', month: K.month + 1}]; run(K, 1); assert.equal(K.pending.id, 'tariffWar');
  assert.equal(E.worldPrice(K, 0), Math.round(before * 1.15));
});
test('도감: 끝난 판을 더하면 나라·사건·물건·배지가 쌓이고 원본은 바뀌지 않는다', () => {
  const G = E.runBot(5, 'plains', 'focus'), c0 = {games: 1, nations: {daon: {games: 1, best: 50, wins: 0}}};
  const c1 = E.codexAdd(c0, G);
  assert.equal(c0.games, 1); assert.equal(c1.games, 2);
  assert.equal(c1.nations.plains.games, 1); assert.equal(c1.nations.plains.best, P(G).score);
  for (const id of G.seen) assert.ok(c1.events[id]);
  assert.ok(Object.keys(c1.goods).length >= 1, '수출한 물건이 적힌다');
  assert.equal(!!c1.badges.honest, !G.stats.breaks);
  const c2 = E.codexAdd(c1, G); assert.equal(c2.nations.plains.games, 2);
});

// ---------- 6.6 결과 책 기록 ----------
test('결과 책 기록: 해마다 기록 5개, 사건 선택은 일어난 사건과 같고, 섬별 거래량 합은 누적 수입·수출과 같다', () => {
  const G = E.runBot(9, 'port', 'balanced'), me = P(G);
  assert.equal(me.history.length, 5);
  for (const h of me.history) { assert.equal(h.levels.length, E.GOODS.length); assert.equal(h.imp.length, E.GOODS.length); assert.ok(Number.isInteger(h.money)); }
  assert.deepEqual(G.story.map(s => s.id), G.seen, '선택 기록 = 일어난 사건');
  for (const s of G.story) assert.ok(Number.isInteger(s.k) && s.k >= 0);
  const imp = Object.values(me.importedFrom).reduce((a, b) => a + b, 0), exp = Object.values(me.exportedTo).reduce((a, b) => a + b, 0);
  assert.equal(imp, me.history.reduce((a, h) => a + h.imp.reduce((x, y) => x + y, 0), 0), '수입 합');
  assert.equal(exp, me.exported.reduce((a, b) => a + b, 0), '수출 합');
  assert.ok(me.earnedTotal >= 0 && me.spentTotal >= 0);
});

console.log(`\n${passed}개 통과`);
