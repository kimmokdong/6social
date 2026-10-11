/* 같은 세계·같은 균형 전략으로 모든 불공정 사슬 갈래를 비교합니다. */
'use strict';
const assert = require('assert/strict'), { T, E, play } = require('./bots');
const score = s => Object.values(s.gauges).reduce((a, b) => a + b, 0) * 40 + s.money;
const results = [], failures = [];
for (const [root, ch] of Object.entries(T.chains)) {
  const opts = T.nodes[ch.branch].options; let count = 0;
  for (let seed = 0; seed < 300; seed++) {
    const fresh = E.fresh(seed), starter = root === 'creditDue' ? 'creditOffer' : root;
    if (!fresh.newsPlan.includes(starter)) continue;
    count++;
    const fair = play(seed, 'balanced');
    for (const option of opts) {
      const bad = play(seed, 'balanced', (s, ev) => {
        if (ev.id === root) return (T.news[root].choice.find(o => o.unfair)).key;
        if (ev.id === ch.branch) return option.key;
        return null;
      });
      assert(bad.found.includes(`${root}:${option.key}`), `갈래 실제 진행: ${root}/${seed}/${option.key}`);
      const difference = score(bad) - score(fair); results.push({ root, seed, branch: option.key, difference });
      if (!(difference < 0)) failures.push({ root, seed, branch: option.key, difference, fair: score(fair), bad: score(bad) });
    }
  }
  console.log(root, '해당 씨앗', count, '갈래', opts.length);
}
require('fs').writeFileSync(require('path').join(__dirname, 'chains-result.json'), JSON.stringify({ comparisons: results.length, failures }, null, 2));
console.log('전체 비교', results.length, '실패', failures.length, '가장 큰 차이', Math.max(...results.map(x => x.difference)));
if (failures.length) console.table(failures.slice(0, 12));
assert.equal(failures.length, 0, '모든 씨앗·모든 갈래의 돈+행복 점수가 공정보다 낮아야 합니다');
