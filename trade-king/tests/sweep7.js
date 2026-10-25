/* 7.0 특성 숫자 실험: node tests/sweep7.js oil 'oilSell=1.1;oilReserve=140' [SEEDS]
   한 나라를 몰빵·균형·기회주의 봇으로 돌려 평균 점수와 1등%를 본다. 결과 파일은 쓰지 않는다. */
const E = require('../js/engine6.js');
const [id = 'oil', kv = '', seeds = '30'] = process.argv.slice(2);
for (const pair of kv.split(';').filter(Boolean)) {
  const [k, v] = pair.split('=');
  if (k.startsWith('lv.')) { const [, nid, g] = k.split('.'); E.S.countries[nid].levels[+g] = +v; }
  else E.S.economy.trait[k] = +v;
}
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const out = {};
for (const m of ['focus', 'balanced', 'opportunist']) {
  const sc = [], win = [];
  for (let s = 1; s <= +seeds; s++) { const G = E.runBot(s, id, m), P = E.player(G); sc.push(P.score); win.push(E.ranking(G)[0] === P ? 1 : 0); }
  out[m] = `${mean(sc).toFixed(1)} (${Math.round(100 * mean(win))}%)`;
}
console.log(id, kv || '(기본)', JSON.stringify(out));
