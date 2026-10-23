/* 무역왕 6.0 봇 검사: 나라마다 전략별로 30판씩 돌려 SPEC-v6 15장 기준을 숫자로 본다.
   node trade-king/tests/bots6.js  (결과는 tests/bot6-results.json) */
const fs = require('node:fs');
const path = require('node:path');
const E = require('../js/engine6.js');
const {X, T} = E;
const SEEDS = +(process.env.SEEDS || 30), ids = T.countries.map(c => c.id), MODES = ['self', 'focus', 'balanced', 'opportunist', 'random'];
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
const r1 = v => Math.round(v * 10) / 10;
const lo = [99, 99, 99, 99, 99].map(() => 1e9), hi = [0, 0, 0, 0, 0];

function play(seed, id, mode, opts = {}) {
  const G = E.newGame(seed, id, opts);
  let guard = 0;
  while (!G.over && guard++ < 5000) {
    E.botTurn(G, mode, opts); E.tick(G);
    G.base.forEach((p, g) => { lo[g] = Math.min(lo[g], p); hi[g] = Math.max(hi[g], p); });
  }
  return G;
}
const first = G => E.ranking(G)[0] === E.player(G);
const score = G => E.player(G).score;

const rows = [], all = {calmFocus: [], calmBal: [], crisisBalWin: 0, crisisGames: 0, keepWin: 0, oppWin: 0, pairs: 0, stakes: [], decisions: [], pauses: [],
  randomWin: 0, randomGames: 0, oneLose: 0, oneGames: 0, supply2: 0, supplyGoods: 0, declines: [], moneyEnd: []};
for (const id of ids) {
  const r = {id, name: T.countries.find(c => c.id === id).name};
  for (const m of MODES) { r[m] = []; r[m + 'Win'] = 0; }
  for (let seed = 1; seed <= SEEDS; seed++) {
    const games = Object.fromEntries(MODES.map(m => [m, play(seed, id, m)]));
    for (const m of MODES) { r[m].push(score(games[m])); r[m + 'Win'] += first(games[m]); }
    const f = games.focus, b = games.balanced, o = games.opportunist, P = E.player(f);
    all.randomWin += first(games.random); all.randomGames++;
    all.crisisGames++; all.crisisBalWin += score(b) > score(f);
    if (score(f) !== score(o)) { all.pairs++; all.keepWin += score(f) > score(o); all.oppWin += score(o) > score(f); }
    for (const G of [f, b, o]) for (const c of G.contracts) if (c.done) all.stakes.push(c.stake);
    all.decisions.push((b.stats.pauses + b.stats.routeSets + b.stats.breaks) / 5); all.pauses.push(b.stats.stops);
    all.declines.push(f.stats.declines); all.moneyEnd.push(P.money);
    all.calmFocus.push(score(play(seed, id, 'focus', {calm: true}))); all.calmBal.push(score(play(seed, id, 'balanced', {calm: true})));
    // 한 섬 봇: 공급 끊김이 그 섬에 걸리게 하고 똑같이 끊긴 판의 분산 봇과 비교
    const probe = E.newGame(seed, id), target = probe.nations.slice(1).find(n => E.sells(probe, n, n.main) && E.buys(probe, E.player(probe), n.main));
    if (target) {
      const one = play(seed, id, 'one', {oneTarget: target.id, cutTarget: target.id}), bal = play(seed, id, 'balanced', {cutTarget: target.id});
      all.oneGames++; all.oneLose += score(one) < score(bal);
    }
    for (let g = 0; g < 5; g++) if (E.buys(probe, E.player(probe), g)) { all.supplyGoods++; all.supply2 += probe.nations.slice(1).filter(n => E.sells(probe, n, g)).length >= 2; }
  }
  rows.push(r);
}

const table = rows.map(r => ({나라: r.name, 자급: r1(mean(r.self)), 몰빵: r1(mean(r.focus)), 균형: r1(mean(r.balanced)), 기회주의: r1(mean(r.opportunist)), 무작위: r1(mean(r.random)),
  '무역−자급': r1(Math.max(mean(r.focus), mean(r.balanced)) - mean(r.self)), '1등%': Math.round(100 * Math.max(r.focusWin, r.balancedWin, r.opportunistWin) / SEEDS)}));
console.table(table);
const techAvg = mean(rows.filter(r => ['daon', 'port', 'artisan'].includes(r.id)).map(r => mean(r.focus)));
const rawAvg = mean(rows.filter(r => ['plains', 'oil', 'ironland', 'forest'].includes(r.id)).map(r => mean(r.focus)));
const pauses = mean(all.pauses), flow = 60 * X.monthSeconds;
const summary = {
  '평온한 판 몰빵−균형': r1(mean(all.calmFocus) - mean(all.calmBal)),
  '위기 판 균형 승률%': Math.round(100 * all.crisisBalWin / all.crisisGames),
  '계약 고수 vs 기회주의 승률%': `${Math.round(100 * all.keepWin / Math.max(1, all.pairs))} / ${Math.round(100 * all.oppWin / Math.max(1, all.pairs))}`,
  '계약 하나 걸린 금액(평균원, 목표 30 이상)': Math.round(mean(all.stakes)),
  '한 해 선택 수(균형 봇)': r1(mean(all.decisions)),
  '시간이 멈춘 횟수(한 판)': r1(pauses), '멈춤 사이 평균초': Math.round(flow / pauses),
  '한 판 예상 분': r1((flow + pauses * X.pauseSeconds) / 60),
  '기술 나라 vs 원자재 나라(몰빵)': `${r1(techAvg)} / ${r1(rawAvg)}`,
  '한 섬 봇이 분산보다 낮은 판%': Math.round(100 * all.oneLose / Math.max(1, all.oneGames)),
  '무작위 봇 1등%': Math.round(100 * all.randomWin / all.randomGames),
  '모자란 물건 공급국 2곳 이상%': Math.round(100 * all.supply2 / all.supplyGoods),
  '몰빵 봇 산업 쇠퇴(판당)': r1(mean(all.declines)), '몰빵 봇 끝 금고(평균원)': Math.round(mean(all.moneyEnd)),
  '세계 값 범위': T.goods.map((g, i) => `${g.name} ${lo[i]}~${hi[i]}`).join(', ')
};
console.log(summary);
fs.writeFileSync(path.join(__dirname, 'bot6-results.json'), JSON.stringify({seeds: SEEDS, table, summary}, null, 2));
