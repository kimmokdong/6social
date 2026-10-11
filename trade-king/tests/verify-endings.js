/* 실제 봇의 마지막 정산 직전 상태로 엔딩 화면을 검사합니다. */
'use strict';
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
const { E, T, play } = require('./bots');
const command = E.command, fixtures = {};
let last;
E.command = (state, action) => {
  if (action.type === 'end' && state.year === T.years) last = state;
  return command(state, action);
};
try {
  for (const mode of ['balanced', 'island', 'raw', 'unfair', 'random']) {
    for (let seed = 0; seed < 300 && Object.keys(fixtures).length < T.endings.length; seed++) {
      const final = play(seed, mode);
      if (fixtures[final.ended]) continue;
      assert.deepEqual(command(last, { type: 'end' }).state, final);
      assert.equal(last.events.length, 0);
      assert(!Object.keys(T.products).some(id => E.canMake(last, id)));
      fixtures[final.ended] = { mode, seed, state: last, final };
    }
  }
} finally { E.command = command; }
assert.deepEqual(Object.keys(fixtures).sort(), Array.from(T.endings, e => e.id).sort());
fs.writeFileSync(path.join(__dirname, 'verify-endings.json'), JSON.stringify(fixtures, null, 2));
console.log('실제 마지막 정산 직전 엔딩 6종:', Object.keys(fixtures).join(', '));
