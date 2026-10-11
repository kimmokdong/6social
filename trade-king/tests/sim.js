'use strict';
const assert = require('assert/strict'), { play, E } = require('./bots');
const modes = ['balanced', 'island', 'raw', 'unfair', 'random'], results = {};
for (const mode of modes) {
  const out = { endings: {}, gauges: [0, 0, 0], money: 0 };
  for (let seed = 0; seed < 300; seed++) { const s = play(seed, mode); out.endings[s.ended] = (out.endings[s.ended] || 0) + 1; Object.values(s.gauges).forEach((v, i) => out.gauges[i] += v / 300); out.money += s.money / 300; assert.equal(s.history.length, 12); assert(s.money >= 0); assert(Object.values(s.stock).every(v => v >= 0)); }
  results[mode] = out; console.log(mode, JSON.stringify(out));
}
require('fs').writeFileSync(require('path').join(__dirname, 'sim-result.json'), JSON.stringify(results, null, 2));
assert((results.balanced.endings.king || 0) >= 105, '균형 봇 무역왕 ≥35%'); assert.equal(results.balanced.endings.war || 0, 0);
assert.equal(Object.entries(results.island.endings).sort((a, b) => b[1] - a[1])[0][0], 'island');
assert.equal(Object.entries(results.raw.endings).sort((a, b) => b[1] - a[1])[0][0], 'rawOnly');
assert((results.unfair.endings.king || 0) <= 15, '반칙 봇 무역왕 ≤5%');
assert(Math.max(...Object.values(results.random.endings)) <= 150, '무작위 봇 한 엔딩 ≤50%');
console.log('봇별 완료 조건 통과');
