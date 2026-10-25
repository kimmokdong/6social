/* 무역왕 7.3 저장 검사: node trade-king/tests/save73.js */
const assert = require('node:assert/strict');
const E = require('../js/engine6.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
const copy = G => JSON.parse(JSON.stringify(E.saveGame(G)));
function finish(G, H) {
  let guard = 0;
  while (!G.over && guard++ < 300) {
    E.botTurn(G, 'balanced'); E.botTurn(H, 'balanced'); E.tick(G); E.tick(H);
    assert.deepEqual(copy(H), copy(G), `복원 뒤 ${G.month}달 상태`);
  }
  assert.ok(G.over && H.over);
  assert.deepEqual(H.nations.map(n => [n.score, n.money]), G.nations.map(n => [n.score, n.money]));
  assert.deepEqual(H.story, G.story);
}
test('8나라 × 4시점: JSON 왕복 후 같은 행동으로 끝까지 모든 상태·점수·돈·이야기 일치', () => {
  for (const {id} of E.T.countries) for (const k of [0, 7, 23, 45]) {
    const G = E.newGame(731 + k, id);
    while (G.month < k) { E.botTurn(G, 'balanced'); E.tick(G); }
    const before = copy(G), H = E.loadGame(before);
    assert.ok(H); assert.notEqual(H, G); assert.deepEqual(copy(G), before);
    assert.equal(H.rng, G.rng); assert.equal(H.pending, H.queue[0] || null); finish(G, H);
  }
});
test('보류 사건·연말·발전 회의와 연속 구매: queue/pending 참조 복원', () => {
  for (const type of ['event', 'yearEnd', 'meeting']) {
    const G = E.newGame(73, 'oil');
    while (G.pending?.type !== type) { if (G.pending) E.choose(G, null); else { E.botTurn(G, 'balanced'); E.tick(G); } }
    const H = E.loadGame(copy(G)); assert.ok(H); assert.equal(H.pending, H.queue[0]);
    if (type === 'meeting') {
      const card = G.pending.cards.find(id => !['grow', 'quality', 'protect', 'fta'].includes(id) && E.cardCost(E.player(G), id) <= E.player(G).money);
      assert.ok(card); E.choose(G, card); E.choose(H, card);
      assert.equal(H.pending, H.queue[0] || null); assert.deepEqual(copy(H), copy(G));
    }
    finish(G, H);
  }
});
test('잘못된 값·옛 버전·깨진 나라/배/선택 큐는 null, 입력은 변경하지 않음', () => {
  for (const obj of [null, undefined, 1, 'save', [], {}, {saveVersion: 0}, new Map()]) assert.equal(E.loadGame(obj), null);
  const G = E.newGame(73, 'oil');
  for (const damage of [s => s.saveVersion = 0, s => s.version = 'old', s => s.month = 60, s => s.rng = -1, s => delete s.stats,
    s => s.nations[0].box = [], s => s.nations[0].ships[0].state = 'bad', s => s.queue = [], s => s.nations[0].id = 'unknown', s => s.base[0] = Infinity]) {
    const s = copy(G); damage(s); assert.equal(E.loadGame(s), null);
  }
  const s = copy(G), before = JSON.stringify(s); E.loadGame(s); assert.equal(JSON.stringify(s), before);
  s.loop = s; assert.equal(E.loadGame(s), null);
});
console.log(`\n${passed}개 통과`);
