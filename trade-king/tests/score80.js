/* 무역왕 8.0 점수 검사: 100점 한도·가중치를 없앤 누적 점수가 재미 지표를 지키는지 본다.
   node tests/score80.js [판 수=40]  (나라 8 × 봇 3종 × 판 수, 결과 파일은 쓰지 않는다) */
const E = require('../js/engine6.js');
// 수치 실험: OVR="overRate=.3;abundanceMore=1" 꼴로 rules79 값을 덮어쓴다
for (const kv of (process.env.OVR || '').split(';').filter(Boolean)) { const [k, v] = kv.split('='); E.S.rules79[k] = +v; }
const SEEDS = +(process.argv[2] || 40), MODES = ['focus', 'balanced', 'random'];
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0, r1 = v => Math.round(v * 10) / 10;
// 해마다 점수로 매긴 순위(1등 = 1). total이 없던 옛 규칙(가중 평균)도 같은 함수로 잰다.
const upTo = (n, y) => E.totalScore ? E.totalScore({years: n.years.slice(0, y)}) : E.weightedScore({years: n.years.slice(0, y)});
const rankAt = (G, y) => { const P = E.player(G), s = G.nations.map(n => upTo(n, y)); return 1 + s.filter((v, i) => v > upTo(P, y) && G.nations[i] !== P).length; };
const raw = s => s.slots + s.qual + s.abundance - s.unrest + s.extra - s.crisis - s.empty - s.pollution - s.debt;

const byYear = [[], [], [], [], []], over = [], jumps = [], wins = {}, nationScore = {}, catchup = [], flips = [], close = [], spread = [];
for (const id of E.T.countries.map(c => c.id)) {
  wins[id] = []; nationScore[id] = [];
  for (const mode of MODES) for (let seed = 1; seed <= SEEDS; seed++) {
    const G = E.runBot(seed, id, mode), P = E.player(G), seasons = P.history.flatMap(h => h.seasons);
    P.years.forEach((s, i) => byYear[i].push(s));
    over.push(mean(seasons.map(s => raw(s) > 100 ? 1 : 0)));
    jumps.push(seasons.some((s, i) => i && s.score - seasons[i - 1].score > 10) ? 1 : 0);
    wins[id].push(rankAt(G, 5) === 1 ? 1 : 0); nationScore[id].push(P.score);
    if (rankAt(G, 2) >= 4) catchup.push(rankAt(G, 5) <= 3 ? 1 : 0);
    // 4년 끝 1등이 최종 1등을 놓치는 판, 4년 끝 1·2등 차이(한 해 평균 점수 기준)
    const lead4 = [...G.nations].sort((a, b) => upTo(b, 4) - upTo(a, 4)), lead5 = [...G.nations].sort((a, b) => upTo(b, 5) - upTo(a, 5));
    flips.push(lead4[0] !== lead5[0] ? 1 : 0);
    close.push((upTo(lead4[0], 4) - upTo(lead4[1], 4)) / (E.totalScore ? 4 : 1) <= 5 ? 1 : 0);
    spread.push((upTo(lead5[0], 5) - upTo(lead5[4], 5)) / (E.totalScore ? 5 : 1));
  }
}
console.table(Object.keys(wins).map(id => ({나라: E.T.countries.find(c => c.id === id).name, '평균 최종': r1(mean(nationScore[id])), '1등%': Math.round(100 * mean(wins[id]))})));
console.log({
  '해마다 평균 점수(1→5년)': byYear.map(a => r1(mean(a))).join(' → '),
  '100 넘는 정산%(한도 전 값)': r1(100 * mean(over)),
  '10점 넘게 뛰는 정산이 있는 판%': Math.round(100 * mean(jumps)),
  '따라잡기%(2년째 4·5등 → 최종 3등 안)': r1(100 * mean(catchup)),
  '4년 끝 1등이 뒤집힌 판%': r1(100 * mean(flips)),
  '4년 끝 1·2등 차이 5점 안(한 해 평균)%': r1(100 * mean(close)),
  '1등과 5등 차이(한 해 평균)': r1(mean(spread)),
  판수: catchup.length + '/' + over.length
});
