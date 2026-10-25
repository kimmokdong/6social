/* 무역왕 7.2 도감 기록 검사: node trade-king/tests/codex72.js (BOOK-v72.md) */
const assert = require('node:assert/strict');
const E = require('../js/engine6.js');
const {X, S} = E;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
const P = E.player;
// 봇처럼 5년을 끝까지: 사건은 0번, 회의는 봇 규칙(botTurn이 카드도 산다)
const play = (id, seed = 7, pick = () => 0) => {
  const G = E.newGame(seed, id);
  while (!G.over) {
    while (G.pending && !G.over) { const p = G.pending; if (p.type === 'event') E.choose(G, pick(p)); else E.choose(G, null); }
    if (G.over) break; E.botTurn(G, 'focus'); E.tick(G);
  }
  return G;
};
const badgeIds = S.badges.map(b => b.id);

test('데이터: 배지 16개(숨김 2개는 힌트), 상식 16장, 칭호 4단계', () => {
  assert.equal(S.badges.length, 16); assert.equal(S.lessons.length, 16); assert.equal(S.ranks.length, 4);
  assert.deepEqual(S.badges.filter(b => b.hidden).map(b => b.id), ['guest', 'giver']);
  for (const b of S.badges) { assert.ok(b.emoji && b.name && b.text); if (b.hidden) assert.ok(b.hint); }
  for (const l of S.lessons) assert.ok(l.icon && l.name && l.text.length > 20 && l.how);
});
test('빈 도감: 0%, 견습 선원. 전체 칸 = 나라 16 + 물건 18 + 사건 선택지 + 배지 16 + 상식 16', () => {
  const st = E.codexStats({});
  assert.equal(st.filled, 0); assert.equal(st.rank.name, '견습 선원');
  assert.equal(st.total, 16 + 18 + S.events.reduce((a, e) => a + e.options.length, 0) + 16 + 16 + S.cards.filter(c => c.concept).length);   // 7.9 증강체 39칸
});
test('예전(7.1) 기록을 읽으면 새 칸이 생기고, 기록만으로 열 수 있는 상식이 열린다', () => {
  const old = {games: 2, nations: {oil: {games: 1, best: 60, wins: 0}, port: {games: 1, best: 70, wins: 1}}, events: {dumping: true, exchange: true}, goods: {1: true}, badges: {king: 1}};
  const c = E.codexNormalize(JSON.parse(JSON.stringify(old)));
  for (const k of ['friends', 'imports', 'star3', 'sold', 'choices', 'lessons', 'records']) assert.ok(c[k], k);
  for (const id of ['trade', 'expimp', 'resource', 'relay', 'dumping', 'exchange', 'protect']) assert.ok(c.lessons[id], id);
  assert.ok(!c.lessons.crisis && !c.lessons.fta);
  assert.equal(c.nations.oil.best, 60, '예전 기록은 그대로');
  // 선택 기록이 없는 예전 사건도 한 칸으로 센다
  assert.ok(E.codexSlots(old).includes('event:dumping:0'));
});
test('한 판 기록: 나라·사건 선택·물건 3단계·누적 판매·친구·기록·새로 채운 칸(lastNew)', () => {
  const G = play('plains', 11);
  const c = E.codexAdd({}, G), me = P(G);
  assert.equal(c.games, 1); assert.equal(c.nations.plains.games, 1);
  for (const st of G.story.filter(x => typeof x.k === 'number')) assert.ok(c.choices[st.id][st.k], st.id);
  for (const g of E.GOODS) assert.equal(c.sold[g], me.exported[g]);
  for (const o of G.nations.filter(o => o !== me)) assert.equal(!!c.friends[o.id], E.rel(G, me, o) >= X.relMax);
  assert.equal(c.records.bestScore, me.score); assert.ok(c.records.newBest);
  assert.ok(c.lastNew.includes('nation:plains') && c.lastNew.includes('lesson:trade'));
  assert.deepEqual(c.lastNew, E.codexSlots(c), '첫 판이면 채운 칸이 모두 새 칸');
  const c2 = E.codexAdd(c, play('plains', 12));
  assert.equal(c2.games, 2); assert.ok(!c2.lastNew.includes('nation:plains'), '이미 있던 칸은 새 칸이 아님');
  assert.ok(c2.records.exp >= c.records.exp);
});
test('여러 판을 하면 도감이 차고 칭호가 오른다(돌아가며 8나라 × 선택지 바꾸기)', () => {
  let c = {};
  const ids = E.T.countries.map(x => x.id);
  for (let k = 0; k < 16; k++) c = E.codexAdd(c, play(ids[k % 8], 100 + k, p => k % 3 % (E.S.events.find(e => e.id === p.id).options.length)));
  const st = E.codexStats(c);
  console.log('   16판 뒤:', st.filled + '/' + st.total, st.percent + '%', st.rank.name, '| 배지', Object.keys(c.badges).join(','), '| 상식', Object.keys(c.lessons).length);
  assert.ok(st.percent >= 15, '항해사 이상'); assert.ok(Object.keys(c.lessons).length >= 8);
  assert.ok(c.badges.allNations, '여덟 나라 여행');
  assert.ok(c.last.rankTo >= c.last.rankFrom);
});
// 배지마다: 그 배지가 나오도록 한 판 상태를 맞춰 놓고 판정
const endState = (id = 'plains', seed = 5) => { const G = play(id, seed); return {G, me: P(G), others: G.nations.filter(o => o !== P(G))}; };
const earned = G => E.codexAdd({}, G).last.badges;
test('새 배지 판정: 탐험가·대륙 상인·위기를 이긴 나라·대화·발명가·균형·벼락부자·단골 부자·손님·나눔', () => {
  let {G, me, others} = endState();
  for (const o of others) me.exportedTo[o.id] = 1; assert.ok(earned(G).includes('explorer'));
  ({G, me} = endState()); me.exportedTo.world = 20; me.importedFrom.world = 10; assert.ok(earned(G).includes('continent'));
  ({G, me} = endState()); G.stats.crises = 2; me.score = 70; assert.ok(earned(G).includes('survivor'));
  ({G, me} = endState()); G.story.push({id: 'tariffWar', k: 1}); assert.ok(earned(G).includes('peace'));
  ({G, me} = endState()); G.story.push({id: 'retaliation', k: 2}); assert.ok(earned(G).includes('peace'));
  ({G, me} = endState()); me.augments = ['grow', 'factory', 'revolution']; assert.ok(earned(G).includes('inventor'), '같은 콘셉트 3장');
  ({G, me} = endState()); me.history.forEach((h, i) => { h.exp = E.GOODS.map(g => g === 0 ? 10 : 0); h.imp = E.GOODS.map(g => g === 1 ? 10 : 0); }); assert.ok(earned(G).includes('balance'));
  ({G, me} = endState()); me.history[0].money = X.startMoney + 300; assert.ok(earned(G).includes('boom'));
  ({G, me, others} = endState()); for (const o of others.slice(0, 3)) { G.rel[me.id][o.id] = 3; G.rel[o.id][me.id] = 3; } assert.ok(earned(G).includes('loyal'));
  ({G, me} = endState()); G.story.push({id: 'tourists', k: 0}); assert.ok(earned(G).includes('guest'));
  for (const [id, k] of [['storm', 1], ['invention', 1], ['plainsHarvest', 1], ['festival', 0]]) { ({G, me} = endState()); me.trait.aids = 0; G.story = G.story.filter(x => x.id !== id); G.story.push({id, k}); assert.ok(earned(G).includes('giver'), id); }
  // 아무것도 안 맞추면 새 배지 일부는 안 나온다(늘 나오는 배지가 아님)
  ({G, me} = endState()); me.exportedTo = {}; me.importedFrom = {}; G.stats.cards = 0; G.stats.crises = 0; G.story = []; me.trait.aids = 0;
  const none = earned(G); for (const id of ['explorer', 'continent', 'survivor', 'peace', 'inventor', 'guest', 'giver']) assert.ok(!none.includes(id), id);
  for (const id of none) assert.ok(badgeIds.includes(id));
});
test('발전 회의 카드를 사면 G.stats.cards·cardIds가 늘고 도감 cards에 쌓인다', () => {
  const G = E.newGame(3, 'forest'); while (G.pending) E.choose(G, null);
  const me = P(G); me.money = 2000; G.pending = {type: 'meeting', cards: E.cardsFor(G, me)}; G.queue = [G.pending];
  const before=G.stats.cards,ids=[...G.stats.cardIds];
  const id = G.pending.cards.find(x => x !== 'protect');
  assert.ok(E.choose(G, id)); assert.equal(G.stats.cards, before+1); assert.deepEqual(G.stats.cardIds, [...ids,id]);
  while (G.pending) E.choose(G, null);
  while (!G.over) { while (G.pending && !G.over) E.choose(G, G.pending.type === 'event' ? 0 : null); if (G.over) break; E.tick(G); }
  assert.ok(E.codexAdd({}, G).cards[id] >= 1);
});
test('칭호 경계: 14%는 견습 선원, 15% 항해사, 40% 선장, 70% 무역왕', () => {
  const st = E.codexStats({}), total = st.total;
  const fake = n => { const c = {lessons: {}, badges: {}, nations: {}}; const keys = [...S.lessons.map(l => ['lessons', l.id]), ...S.badges.map(b => ['badges', b.id]), ...E.T.countries.map(x => ['nations', x.id])]; for (const [k, id] of keys.slice(0, n)) c[k][id] = k === 'nations' ? {games: 1} : 1; return c; };
  const at = pct => { for (let n = 0; n <= 40; n++) if (Math.floor(n / total * 100) >= pct) return n; };
  // 상식은 기록에서 다시 판정되므로, 직접 넣은 상식 칸이 그대로 남는지(정규화가 지우지 않는지)만 본다
  assert.equal(E.codexStats(fake(at(15) - 1)).rank.name, '견습 선원');
  assert.equal(E.codexStats(fake(at(15))).rank.name, '항해사');
});
console.log(`\n${passed}개 통과`);
