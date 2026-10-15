/* 실행: node tests/rules.cjs — 외부 의존성이 없는 게임 규칙 검증. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: {} };
vm.createContext(context);
for (const file of ['data.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context);
const D = context.window.SAMGWON, R = context.window.SamgwonRules;
assert.equal(Object.keys(D.endings).length, 24);
assert.equal(Object.keys(D.powers).length, 18);
assert.equal(new Set(D.cards.map(c => c.id)).size, D.cards.length);
const collected = new Set();
// 저장한 카드·조건·연결 사건까지 동일하게 복원하고 손상된 임기는 버립니다.
{
  const run = R.createRun('president'); R.selectCard(run);
  R.resolve(run, 'right'); R.selectCard(run, () => 0);
  run.queue.push({ id: 'P02b', turn: 3 }); run.flags.add('saved-test');
  const saved = JSON.parse(JSON.stringify(R.snapshot(run)));
  const restored = R.restoreRun(saved);
  assert.equal(JSON.stringify(R.snapshot(restored)), JSON.stringify(saved));
  for (const bad of [null, {}, { ...saved, card: 'missing' }, { ...saved, used: null }, { ...saved, gauges: { p: 0, m: 50, l: 50, w: 50 } }, { ...saved, queue: [null] }, { ...saved, turn: 100 }, { ...saved, ended: 'pres_complete' }]) assert.equal(R.restoreRun(bad), null);
  restored.turn = 3;
  assert.equal(R.selectCard(restored).id, 'P02b');
}
for (const card of D.cards) {
  assert.ok(D.characters[card.char]);
  if (!card.chain && !card.first) {
    const run = R.createRun(card.role); run.turn = 2;
    for (const [key, [min, max]] of Object.entries(card.when || {})) run.gauges[key] = Math.round((min + max) / 2);
    assert.ok(R.eligible(run).some(c => c.id === card.id), card.id);
  }
  for (const side of ['left', 'right']) {
    const run = R.createRun(card.role); run.card = card;
    const result = R.resolve(run, side);
    assert.ok(result, `${card.id} ${side}`);
    for (const key of Object.keys(run.gauges)) assert.equal(run.gauges[key], R.clamp(50 + (card[side].fx?.[key] || 0)));
    for (const power of result.powers) { assert.ok(D.powers[power]); collected.add(power); }
    if (card[side].ending) assert.equal(result.ending, card[side].ending);
    if (card[side].flag) assert.ok(run.flags.has(card[side].flag));
    if (card[side].next) {
      const next = card[side].next;
      assert.ok(D.cards.find(c => c.id === next.id)?.chain);
      assert.equal(run.queue[0].turn, 1 + next.in);
      run.turn = 1 + next.in;
      assert.equal(R.selectCard(run).id, next.id);
    }
    assert.equal(R.resolve(run, 'invalid'), null);
  }
}
for (const [id, ending] of Object.entries(D.endings)) {
  for (const power of ending.powers || []) { assert.ok(D.powers[power]); collected.add(power); }
  assert.equal(R.endingFor(ending.role, ending.type), id);
}
assert.equal(collected.size, 18);
assert.equal(R.gaugeEnding({ w: 100, p: 0, m: 0, l: 0 }), 'w100');
assert.equal(R.gaugeEnding({ w: 0, p: 0, m: 0, l: 0 }), 'w0');
assert.equal(R.gaugeEnding({ w: 50, p: 0, m: 0, l: 0 }), 'p0');
assert.equal(R.gaugeEnding({ w: 50, p: 50, m: 0, l: 0 }), 'm0');
assert.equal(R.gaugeEnding({ w: 50, p: 50, m: 50, l: 0 }), 'l0');
for (const role of Object.keys(D.roles)) {
  const run = R.createRun(role);
  assert.ok(R.selectCard(run).first);
  R.resolve(run, 'left');
  const eligible = R.eligible(run), other = eligible.filter(c => c.char !== run.previous);
  if (other.length) assert.notEqual(R.selectCard(run, () => 0).char, D.cards.find(c => c.role === role && c.first).char);
  for (const w of [34, 35, 65, 66]) {
    const finish = R.createRun(role); finish.resolved = 19; finish.turn = 20; finish.gauges = { p: 60, m: 60, l: 60, w };
    finish.card = { left: { fx: {} } };
    assert.equal(D.endings[R.resolve(finish, 'left').ending].type, w >= 35 && w <= 65 ? 'legend' : 'complete');
    assert.equal(R.resolve(finish, 'left'), null);
  }
}
// 조건 카드의 가중치 3과 같은 인물 회피를 실제 선택 경계에서 확인합니다.
{
  const run = R.createRun('president'); run.turn = 2; run.gauges.w = 70;
  const pool = R.eligible(run), total = pool.reduce((sum, c) => sum + (c.when ? 3 : 1), 0);
  let cumulative = 0;
  for (const card of pool) {
    const weight = card.when ? 3 : 1;
    for (let i = 0; i < weight; i++) {
      const sample = R.createRun('president'); sample.turn = 2; sample.gauges.w = 70;
      assert.equal(R.selectCard(sample, () => (cumulative + i + .5) / total).id, card.id);
    }
    cumulative += weight;
  }
}
// 고정 시드의 실제 임기 시뮬레이션: 모든 카드·엔딩·권한이 자연 진행에서 도달됩니다.
let seed = 123456789;
function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
const seenCards = new Set(), seenEndings = new Set(), seenPowers = new Set();
for (let trial = 0; trial < 30000; trial++) {
  const run = R.createRun(Object.keys(D.roles)[trial % 3]);
  while (!run.ended) {
    const card = R.selectCard(run, random); seenCards.add(card.id);
    const result = R.resolve(run, random() < .5 ? 'left' : 'right');
    result.powers.forEach(id => seenPowers.add(id));
    if (result.ending) seenEndings.add(result.ending);
    assert.ok(run.resolved <= 20);
  }
}
assert.equal(seenCards.size, D.cards.length, '모든 카드 자연 등장');
assert.equal(seenEndings.size, 24, `누락 엔딩: ${Object.keys(D.endings).filter(id => !seenEndings.has(id))}`);
assert.equal(seenPowers.size, 18, '모든 권한 자연 획득');
// 임기 미션: 도장·권한 기록, 저장 복원, 판정
{
  assert.equal(R.missions.length, 7);
  const run = R.createRun('president', 'clean'); R.selectCard(run);
  assert.equal(run.mission, 'clean');
  const stampCard = D.cards.find(c => c.role === 'president' && !c.first && !c.chain && (c.left.stamp || c.right.stamp));
  const firstSeen = run.seen.size;
  run.card = stampCard; const res = R.resolve(run, stampCard.left.stamp ? 'left' : 'right');
  assert.equal(run.stamps, 1, '도장 수 기록');
  assert.ok(res.powers.every(id => run.seen.has(id)) && run.seen.size >= firstSeen, '만난 권한 기록');
  R.selectCard(run);
  const restored = R.restoreRun(JSON.parse(JSON.stringify(R.snapshot(run))));
  assert.equal(restored.mission, 'clean'); assert.equal(restored.stamps, 1); assert.equal(restored.seen.size, run.seen.size);
  const old = JSON.parse(JSON.stringify(R.snapshot(run))); delete old.mission; delete old.stamps; delete old.seen;
  const legacy = R.restoreRun(old);
  assert.ok(legacy && legacy.mission === null && legacy.stamps === 0, '미션 없던 저장본도 이어하기');
  const done = (mission, gauges, ending, extra = {}) => R.missionDone({ ...R.createRun('court', mission), gauges, ended: ending, ...extra });
  assert.ok(done('people', { p: 70, m: 50, l: 50, w: 50 }, 'court_complete'));
  assert.ok(!done('people', { p: 70, m: 50, l: 50, w: 50 }, 'court_people0'), '도중 실패면 미션 실패');
  assert.ok(done('balance', { p: 50, m: 50, l: 50, w: 40 }, 'court_complete'));
  assert.ok(!done('clean', { p: 50, m: 50, l: 50, w: 50 }, 'court_complete', { stamps: 1 }));
  assert.ok(done('powers', { p: 50, m: 50, l: 50, w: 50 }, 'court_people0', { seen: new Set(['C1', 'C2', 'C3', 'C4']) }));
  assert.ok(done('legend', { p: 60, m: 60, l: 60, w: 50 }, 'court_legend'));
  // 모든 역할에서 모든 미션이 실제 임기에서 달성 가능한지 (게이지를 보는 플레이)
  for (const role of Object.keys(D.roles)) for (const m of R.missions) {
    let ok = 0;
    for (let i = 0; i < 400 && !ok; i++) {
      const r = R.createRun(role, m.id);
      while (!r.ended) {
        const c = R.selectCard(r), score = s => c[s].ending ? -999 : Math.min(...['p', 'm', 'l'].map(k => r.gauges[k] + (c[s].fx?.[k] || 0)), 100 - Math.abs(r.gauges.w + (c[s].fx?.w || 0) - 50) * 2) - (m.id === 'clean' && c[s].stamp ? 999 : 0) + (Math.random() * 20 - 10);
        R.resolve(r, score('left') >= score('right') ? 'left' : 'right');
      }
      if (R.missionDone(r)) ok++;
    }
    assert.ok(ok, `${role} ${m.id} 미션 달성 가능`);
  }
}
console.log(`통과: ${D.cards.length}개 카드의 양쪽 선택, 연결·조건·가중치·우선순위, 30,000회 임기, 엔딩 24/24, 권한 18/18`);
