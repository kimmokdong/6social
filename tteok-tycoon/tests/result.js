/* 실행: node tteok-tycoon/tests/result.js — 실제 플레이의 결과 도달성과 결정성 */
'use strict';
const assert = require('assert/strict');
const { T, E, R, play, profiles } = require('../tools/make-samples');
const exact = (g, plan) => {
  const cap = E.capacity(g, plan), probe = E.simulate(JSON.parse(JSON.stringify(g)), { ...plan, portions: cap });
  return { ...plan, portions: Math.max(10, Math.min(cap, Math.ceil(probe.served / 5) * 5)) };
};
const strategies = [...profiles, ...[2500, 3500].flatMap(price => [false, true].flatMap(invest => [false, true].map(vary => ({ price, invest, accept: ['donation', 'complaint'], plan: (g, p) => vary ? { ...p, portions: g.day % 2 ? 20 : 50 } : exact(g, p) })))),
  { price: 5000, portions: 80, accept: ['cartel'] },
  { price: 2500, invest: true, accept: ['donation', 'complaint'], plan: (g, p) => exact(g, { ...p, price: g.day % 2 ? 3000 : 2500 }) }
];
const types = Array(8).fill(0), questions = Object.fromEntries(T.result.questions.map(q => [q.id, 0])), stars = T.result.labels.map(() => [0, 0, 0]);
const past = []; let closed = 0, total = 0;
let capped = 0, adjustedIngredient = 0;
for (let seed = 1; seed <= 100; seed++) for (const st of strategies) {
  const g = play(seed, st), qs = R.interview(g), answers = {};
  assert.equal(JSON.stringify(qs), JSON.stringify(R.interview(g)));
  for (const q of qs) { questions[q.id]++; answers[q.id] = seed % 2 ? 'a' : 'b'; assert.equal(q.options.length, 3); }
  const before = JSON.stringify(g), result = R.analyze(g, answers, past);
  assert.equal(JSON.stringify(g), before, '분석은 게임을 바꾸지 않아요');
  if (seed === 1) {
    const rng = E.rng;
    try { E.rng = () => { throw new Error('분석에서 난수를 쓰면 안 돼요'); }; assert.equal(JSON.stringify(result), JSON.stringify(R.analyze(g, answers, past))); }
    finally { E.rng = rng; }
  }
  assert.equal(JSON.stringify(result), JSON.stringify(R.analyze(g, answers, past)), '결정성');
  assert.ok(result.cards.length <= 3);
  assert.ok(!/\b(?:NaN|undefined)\b|\{[^}]+\}|\b[NMABCDXY]\b/.test(result.cards.flatMap(c => [c.action, c.event, c.concept, c.last]).join(' ')), '카드의 모든 칸을 채워요');
  if (past.length) assert.ok(result.compare);
  types[result.type.id]++; result.stars.forEach((s, i) => stars[i][s.value - 1]++);
  const record = R.record(g, answers);
  for (const card of result.cards) {
    const h = g.history.find(h => h.day === qs.find(q => q.id === card.id).day);
    if (card.id === 'S6' && h.rep > 4.2 || card.id === 'S7' && h.rep > 4.7) { assert.equal(card.event, ''); capped++; }
    if (card.id === 'S4' && h.ingredient !== 500) { assert.ok(!card.event.includes('3일 동안 재료비가 500원')); adjustedIngredient++; }
  }
  if (seed === 1) {
    const legacy = JSON.parse(JSON.stringify(g));
    for (const h of legacy.history) for (const k of ['upgrade', 'locked', 'taste', 'mood', 'cap', 'ingredient', 'mineReason', 'rivalReason']) delete h[k];
    assert.ok(!R.analyze(legacy, {}).cards.some(c => /NaN|undefined/.test(c.event)), '옛 진행 기록에서도 수치를 지어내지 않아요');
  }
  assert.deepEqual(Object.keys(record).sort(), ['seed', 'rivalId', 'ended', 'history', 'trail', 'schedule', 'answers', 'date'].sort());
  assert.match(record.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(JSON.stringify(R.interview(record)), JSON.stringify(qs), '줄인 기록의 문항도 같아요');
  past.push(record); if (past.length > 4) past.shift();
  if (g.ended === 'closed') closed++; total++;
}
console.log(`실제 플레이 ${total}판 · 파산 ${closed}판`);
console.log('유형별 등장 빈도:', JSON.stringify(Object.fromEntries(T.result.types.map((t, i) => [t.name, types[i]]))));
console.log('문항별 등장 빈도:', JSON.stringify(questions));
console.log('별 분포 (★/★★/★★★):', JSON.stringify(Object.fromEntries(T.result.labels.map((label, i) => [label, stars[i]]))));
assert.ok(types.every(n => n > 0), '유형 8개에 모두 도달해요');
assert.ok(Object.values(questions).every(n => n > 0), '문항 18개에 모두 도달해요');
assert.ok(stars.every(row => row.every(n => n > 0)), '항목마다 별 1·2·3개에 모두 도달해요');
assert.ok(closed > 0);
assert.ok(capped > 0 && adjustedIngredient > 0, '평판 상한과 실제 재료비가 다른 플레이도 확인해요');
console.log('결과 검증 통과');
