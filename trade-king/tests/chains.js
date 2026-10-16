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
// 벌칙을 판 안에서 겪고 회복할 수 있는 크기로 낮춘 뒤의 기준: 거의 모든 판에서 손해이고, 평균도 손해여야 한다
const mean = results.reduce((a, x) => a + x.difference, 0) / results.length;
console.log('불공정이 손해인 비율', `${Math.round((1 - failures.length / results.length) * 100)}%`, '평균 차이', mean.toFixed(1));
const big = failures.filter(f => f.difference > 40).length;
console.log('불공정이 40점 넘게 이득인 판', big, `(${Math.round(big / results.length * 100)}%)`);
assert(failures.length <= results.length * 0.15, '불공정 선택은 85% 이상의 판에서 공정보다 손해여야 합니다');
assert(big <= results.length * 0.10, '불공정이 뚜렷하게(40점 넘게) 이득인 판은 10% 이하여야 합니다');
assert(mean < -40, '불공정 선택은 평균적으로 뚜렷한 손해여야 합니다');
