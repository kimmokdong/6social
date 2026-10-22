/* 무역왕 5.0 봇 검사: 나라마다 여러 전략을 30판씩 돌려 밸런스 기준을 확인한다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../js/engine.js');
const T = E.T;
const SEEDS = 30, ids = T.countries.map(c => c.id);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const first = (G, id) => E.ranking(G)[0].id === id;
const crises = G => E.player(G).history.filter(h => h.crisis).length;

const rows = [], all = {perfectYears: 0, years: 0, randomWins: 0, randomGames: 0, calmEff: [], calmBal: [], severe: 0, severeWins: 0, qualityWins: 0, oneLoses: 0, oneGames: 0};
for (const id of ids) {
  const r = {id, name: E.country(id).name, self: [], eff: [], bal: [], q: [], sm: [], effWin: 0, balWin: 0, qWin: 0, smWin: 0};
  for (let seed = 1; seed <= SEEDS; seed++) {
    const s = E.runBot(seed, id, 'self'), e = E.runBot(seed, id, 'efficient'), b = E.runBot(seed, id, 'balanced'), q = E.runBot(seed, id, 'quality'), m = E.runBot(seed, id, 'smart'), x = E.runBot(seed, id, 'random');
    r.sm.push(E.player(m).score); r.smWin += first(m, id);
    r.self.push(E.player(s).score); r.eff.push(E.player(e).score); r.bal.push(E.player(b).score); r.q.push(E.player(q).score);
    r.effWin += first(e, id); r.balWin += first(b, id); r.qWin += first(q, id);
    all.randomWins += first(x, id); all.randomGames++;
    for (const G of [m, b]) for (const h of E.player(G).history) { all.years++; all.perfectYears += h.score >= 100; }
    if (crises(e) >= 2 && crises(b) >= 2) { all.severe++; all.severeWins += E.player(b).score > E.player(e).score; }
    all.calmEff.push(E.player(E.runBot(seed, id, 'efficient', {calm: true})).score);
    all.calmBal.push(E.player(E.runBot(seed, id, 'balanced', {calm: true})).score);
    // 한 섬 봇: 공급 끊김이 그 섬에 걸리도록 고정
    const probe = E.newGame(seed, id), target = probe.nations[1].id;
    const one = E.runBot(seed, id, 'one', {oneTarget: target, cutTarget: true}), eff2 = E.runBot(seed, id, 'smart', {cutTarget: true, oneTarget: target, effOnly: true});
    all.oneGames++; all.oneLoses += E.player(one).score < E.player(eff2).score;
  }
  r.qualityFirst = r.qWin; all.qualityWins += r.qWin;
  rows.push(r);
}
const table = rows.map(r => ({나라: r.name, 자급: +mean(r.self).toFixed(1), 몰빵: +mean(r.eff).toFixed(1), 균형: +mean(r.bal).toFixed(1), 똑똑: +mean(r.sm).toFixed(1), 품질: +mean(r.q).toFixed(1), 몰빵1위: `${r.effWin}/${SEEDS}`, 균형1위: `${r.balWin}/${SEEDS}`, 똑똑1위: `${r.smWin}/${SEEDS}`, 품질1위: `${r.qWin}/${SEEDS}`}));
console.table(table);
const summary = {
  calmGap: mean(all.calmEff) - mean(all.calmBal), crisisWinRate: all.severeWins / Math.max(1, all.severe), severe: all.severe,
  perfectYearRate: all.perfectYears / all.years, randomWinRate: all.randomWins / all.randomGames, oneLoseRate: all.oneLoses / all.oneGames,
  qualityWinRate: all.qualityWins / (SEEDS * ids.length)
};
console.log(summary);
fs.writeFileSync(path.join(__dirname, 'bot-results.json'), JSON.stringify({table, summary}, null, 2));

const checks = [];
const check = (ok, text) => { checks.push([ok, text]); console.log(`${ok ? 'PASS' : 'FAIL'}: ${text}`); };
for (const r of rows) {
  check(mean(r.sm) - mean(r.self) >= 15, `${r.name} 무역이 자급보다 15점 이상 높다 (+${(mean(r.sm) - mean(r.self)).toFixed(1)})`);
  check(mean(r.sm) >= 60 && mean(r.sm) <= 85 && mean(r.bal) >= 55 && mean(r.bal) <= 85, `${r.name} 똑똑·균형 평균이 알맞다 (${mean(r.sm).toFixed(1)}, ${mean(r.bal).toFixed(1)})`);
  const top = Math.max(r.effWin, r.balWin, r.qWin, r.smWin) / SEEDS;
  check(top >= .15 && top <= .5, `${r.name} 가장 좋은 전략의 1등 비율 15~50% (${Math.round(top * 100)}%)`);
}
check(summary.calmGap >= 1, `평온한 판에서는 몰빵이 균형보다 높다 — 보호에는 비용이 있다 (+${summary.calmGap.toFixed(2)})`);
check(summary.crisisWinRate >= .45 && summary.crisisWinRate <= .85, `위기 2회 이상 판에서 균형이 몰빵을 이긴다 45~85% (${Math.round(summary.crisisWinRate * 100)}%)`);
check(summary.randomWinRate <= .15, `무작위 봇 1등 15% 이하 (${Math.round(summary.randomWinRate * 100)}%)`);
check(summary.perfectYearRate <= .05, `100점 해 5% 이하 (${(summary.perfectYearRate * 100).toFixed(1)}%)`);
check(summary.oneLoseRate >= .6, `한 섬에만 기대면 그 섬 위기 때 똑똑 봇보다 낮다 (${Math.round(summary.oneLoseRate * 100)}%)`);
check(summary.qualityWinRate >= .1, `품질 봇도 1등을 한다 (${Math.round(summary.qualityWinRate * 100)}%)`);
const failed = checks.filter(c => !c[0]);
assert.equal(failed.length, 0, `봇 기준 실패 ${failed.length}개`);
console.log('PASS');
