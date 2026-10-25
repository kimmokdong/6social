/* 무역왕 7.0 나라 특성 규칙 검사: node trade-king/tests/traits7.js (NATIONS-v7.md 4장) */
const assert = require('node:assert/strict');
const E = require('../js/engine6.js');
const {X, S} = E, XT = S.economy.trait;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
const P = E.player;
const run = (G, months) => { for (let k = 0; k < months; k++) { while (G.pending) E.choose(G, null); E.tick(G); } };
const quiet = G => { for (const n of G.nations.slice(1)) n.ships = []; G.plan = []; G.small.next=1e9; return G; };
const toOpen = G => { while (G.pending) E.choose(G, null); return G; };
// 기본 특성 검사는 첫 증강의 효과를 빼고 시작한다. 증강 조합은 rules79가 검사한다.
const withNation = (id, seed = 41) => { const G = quiet(toOpen(E.newGame(seed, id))), n=P(G), c=S.countries[id]; n.augments=[];n.levels=[...c.levels];n.quality=[...c.quality];n.protect=E.GOODS.map(()=>0);n.warehouse=false;n.bigShip=!!c.bigShip;return {G,n}; };
const one = (g, q) => E.GOODS.map(x => x === g ? q : 0);
const toSeasonEnd = G => { while (G.month % 3 !== 2) run(G, 1); };   // 다음 tick이 정산

test('다온국 가공 무역: 철강 1상자로 첨단기기 2상자, 2계절 연속 멈추면 첨단기기 산업 −1단계', () => {
  const {G, n} = withNation('daon');
  toSeasonEnd(G);
  n.box[3] = [0, 0, 0, 0]; n.box[5] = [0, 0, 3, 0]; n.levels[5] = 0; const p0 = n.year.prod[3];
  run(G, 1);
  assert.equal(n.year.prod[3] - p0, 6, '철강 3상자로 첨단기기 6상자'); assert.equal(E.count(n, 5), 0);
  const lv = n.levels[3];
  toSeasonEnd(G); n.box[3] = [0, 0, 0, 0]; run(G, 1);
  assert.equal(n.trait.idleRun, 1); assert.equal(n.levels[3], lv, '한 계절 멈춤은 아직 괜찮다');
  toSeasonEnd(G); n.box[3] = [0, 0, 0, 0]; run(G, 1);
  assert.equal(n.levels[3], lv - 1, '두 계절 연속 멈추면 녹슨다'); assert.equal(n.trait.rusts, 1);
  assert.ok(G.news.some(x => x.text.includes('녹슬었어요')));
});
test('대평원: 날씨에 따라 식량 1.5배·보통·절반, 예보가 다음 계절 날씨가 된다', () => {
  const {G, n} = withNation('plains');
  for (const w of [0, 1, 2]) {
    toSeasonEnd(G); n.trait.next = w === 0 ? 1 : 0; n.trait.weather = w;
    const nxt = n.trait.next, before = n.year.prod[0], expect = Math.round(E.produces(G, n, 0) * XT.harvest[w]);
    run(G, 1);
    assert.equal(n.year.prod[0] - before, expect, `날씨 ${w}`);
    assert.equal(n.trait.weather, nxt, '예보한 날씨가 그대로 온다');
  }
});
test('대평원 원조: 받아 올 것 없이 보내기만 한 계약을 끝내면 ♥+2', () => {
  const {G, n} = withNation('plains', 43);
  const o = G.nations.slice(1).find(o => E.buys(G, o, 0));
  assert.ok(o);
  G.rel[n.id][o.id] = G.rel[o.id][n.id] = 1;
  assert.ok(E.setRoute(G, 0, {to: o.id, give: one(0, 2), get: null}));
  for (let k = 0; k < 40 && !n.trait.aids; k++) run(G, 1);
  assert.equal(n.trait.aids, 1); assert.equal(E.rel(G, n, o), 1 + XT.aidRel);
});
test('석유 왕국: 석유 +40%, 캔 만큼 매장량이 줄고 단계마다 생산이 줄되 3상자 아래로는 안 준다', () => {
  const {G, n} = withNation('oil'); n.levels=[...S.countries.oil.levels]; n.augments=[]; // 증강 전 기본 특성을 따로 검사

  assert.equal(E.price(G, n, G.world, 1), Math.round(E.worldPrice(G, 1) * X.worldBuy * XT.oilSell));
  assert.equal(n.trait.reserve, XT.oilReserve); assert.equal(E.produces(G, n, 1), 15);
  toSeasonEnd(G); run(G, 1); assert.equal(n.trait.reserve, XT.oilReserve - 15);
  n.trait.reserve = 106; toSeasonEnd(G); run(G, 1); assert.equal(n.trait.stage, 1); assert.equal(E.produces(G, n, 1), 12);
  assert.ok(G.news.some(x => x.text.includes('유전이 늙어')));
  n.trait.reserve = 56; toSeasonEnd(G); run(G, 1); assert.equal(n.trait.stage, 2); assert.equal(E.produces(G, n, 1), 9);
  n.trait.reserve = 5; toSeasonEnd(G); run(G, 1); assert.equal(n.trait.stage, 3); assert.equal(E.produces(G, n, 1), 3, '바닥나도 3상자');
  assert.equal(n.trait.reserve, 0);
});
test('재생 에너지(🌱 골드): 석유값과 상관없이 회의에 나오고, 사면 석유 필요 −2 · 다시는 안 나옴', () => {
  const {G, n} = withNation('daon', 44);
  G.base[1] = 30; assert.ok(E.cardsFor(G, n).includes('renewable'));
  G.base[1] = 45; const cards = E.cardsFor(G, n);
  assert.ok(cards.includes('renewable')); assert.ok(cards.every(id=>E.S.cards.find(c=>c.id===id).tier));
  const need = E.needs(G, n)[1]; n.money = 999; G.pending = {type: 'meeting', cards}; G.queue = [G.pending];
  assert.ok(E.choose(G, 'renewable'));
  assert.equal(E.needs(G, n)[1], Math.max(1, need - XT.renewNeed)); assert.ok(!E.cardsFor(G, n).includes('renewable'));
});
test('큰 시장국: 다른 나라가 팔 때 10% 깎고, 바구니가 완전히 빈 칸마다 −5점', () => {
  const {G, n} = withNation('market');
  const o = G.nations[1], third = G.nations[2], g = E.GOODS.find(g => E.sells(G, o, g));
  for (const x of [n, third]) G.rel[o.id][x.id] = G.rel[x.id][o.id] = 1;
  assert.equal(E.price(G, o, n, g), Math.round(E.price(G, o, third, g) * XT.marketDiscount));
  toSeasonEnd(G); n.levels[0] = 0; n.box[0] = [0, 0, 0, 0];
  run(G, 1);
  assert.equal(n.last.empty, XT.emptyPenalty, '식량 칸이 비면 −5'); assert.equal(n.trait.empties, 1);
});
test('숲의 나라: ♥2 친구 하나당 관광 15원, 식량 말고 산업을 키우면 단계마다 −15원', () => {
  const {G, n} = withNation('forest');
  for (const o of G.nations.slice(1)) G.rel[n.id][o.id] = G.rel[o.id][n.id] = 1;
  const [a, b] = G.nations.slice(1);
  G.rel[n.id][a.id] = G.rel[a.id][n.id] = 2; G.rel[n.id][b.id] = G.rel[b.id][n.id] = 3;
  toSeasonEnd(G); run(G, 1); const t1 = XT.tourPerFriend * 2; assert.equal(n.last.tour, t1);
  n.levels[2] += 1; toSeasonEnd(G); run(G, 1); assert.equal(n.last.tour, t1 - XT.tourCut);
  assert.equal(n.trait.tourism, 2 * t1 - XT.tourCut); assert.equal(E.traitInfo(G, n).value, t1 - XT.tourCut);
});
test('항구 섬나라: 사 온 물건을 되팔 수 있고, 되판 상자는 +15%', () => {
  const {G, n} = withNation('port');
  const g = E.GOODS.find(g => !E.sells(G, n, g) && G.nations.slice(1).some(o => E.buys(G, o, g)));
  assert.ok(g != null);
  n.box[g] = [0, 0, 30, 0];
  const o = G.nations.slice(1).find(o => E.buys(G, o, g));
  assert.ok(E.isRelay(G, n, g) && E.canGive(G, n, g));
  assert.equal(E.price(G, n, G.world, g), Math.round(E.worldPrice(G, g) * X.worldBuy * XT.relayBonus));
  assert.ok(E.setRoute(G, 0, {to: o.id, give: one(g, 2), get: null}), '중계 항로를 맺을 수 있다');
  for (let k = 0; k < 6 && !n.trait.relay; k++) run(G, 1);
  assert.ok(n.trait.relay > 0, '되판 돈이 기록된다');
  const other = G.nations.find(x => x.id !== 'port' && !E.sells(G, x, g));
  if (other) assert.equal(E.canGive(G, other, g), false, '다른 나라는 남지 않는 물건을 못 판다');
});
test('장인의 나라: ⭐3 물건은 +30%, 한 항로에 2상자까지만(추천 항로도)', () => {
  const G = toOpen(E.newGame(41, 'artisan')), n = P(G);
  const g = E.GOODS.find(g => n.quality[g] === 3 && E.sells(G, n, g) && G.nations.slice(1).some(o => E.buys(G, o, g)));
  assert.ok(g != null);
  const o = G.nations.slice(1).find(o => E.buys(G, o, g));
  assert.equal(E.allowed(G, n, {to: o.id, give: one(g, 3), get: null}), false, '3상자는 안 된다');
  assert.equal(E.allowed(G, n, {to: o.id, give: one(g, 2), get: null}), true);
  n.quality[g] = 2; const plain = E.price(G, n, o, g); n.quality[g] = 3; const lux = E.price(G, n, o, g);
  assert.ok(lux >= Math.round(plain * (XT.luxBonus - .1)), `명품 값 ${plain} → ${lux}`);
  for (const s of n.ships) { const r = E.bestRoute(G, n, s); if (r) assert.ok(E.allowed(G, n, r)); }
});
test('철의 나라: 철광석·철강 계약은 2년, 공해는 산업 3단계마다 −1점, 정화 시설이면 절반', () => {
  const {G, n} = withNation('ironland');
  const o = G.nations.slice(1).find(o => E.buys(G, o, 5));
  if (o) { assert.ok(E.setRoute(G, 0, {to: o.id, give: 5, get: null})); const r = n.ships[0].route; assert.equal(r.until - E.today(G), 365 * XT.longYears - 1); }
  const pol = () => Math.floor((E.levelOf(G, n, 4) + E.levelOf(G, n, 5)) / XT.pollutionPer);
  toSeasonEnd(G); run(G, 1); assert.equal(n.last.pollution, pol()); assert.ok(pol() >= 2);
  assert.ok(E.cardsFor(G, n).includes('modernSteel'));
  n.money = 999; G.pending = {type: 'meeting', cards: ['cleaner']}; G.queue = [G.pending]; E.choose(G, 'cleaner');
  toSeasonEnd(G); run(G, 1); assert.equal(n.last.pollution, Math.floor(pol() / 2)); assert.ok(!E.cardsFor(G, n).includes('cleaner'));
});
test('나라 칸(traitInfo)·엔딩 한 줄(traitResult): 여덟 나라 모두 글이 있고, 해마다 특성 값을 기록한다', () => {
  for (const id of E.T.countries.map(c => c.id)) {
    const G = E.runBot(5, id, 'focus'), n = P(G), info = E.traitInfo(G, n), res = E.traitResult(G, n);
    assert.ok(info.text && info.tip && info.name && ['ok', 'warn', 'bad'].includes(info.warn), id);
    assert.equal(typeof res.good, 'boolean'); assert.ok(res.line.length > 3, id);
    assert.equal(n.history.length, 5); assert.ok(n.history.every(h => Number.isInteger(h.trait)), id);
    for (const m of G.nations.slice(1)) assert.ok(E.traitInfo(G, m).text, m.id);
    assert.ok(G.nations.every(m => Number.isInteger(m.money) && m.box.flat().every(Number.isInteger)), `${id} 정수 유지`);
  }
});
test('NPC 석유 왕국도 매장량이 줄고, 북쪽 대륙은 언제나 석유를 판다', () => {
  let found = 0;
  for (let seed = 1; seed <= 20 && !found; seed++) {
    const G = E.runBot(seed, 'daon', 'focus'), oil = G.nations.find(n => n.id === 'oil');
    if (oil) { found++; assert.ok(oil.trait.reserve < XT.oilReserve); assert.ok(E.sells(G, G.world, 1)); }
  }
  assert.ok(found);
});
console.log(`\n${passed}개 통과`);
