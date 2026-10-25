/* 무역왕 6.0 봇 검사: 나라마다 전략별로 30판씩 돌려 SPEC-v6 15장 기준을 숫자로 본다.
   node trade-king/tests/bots6.js  (결과는 tests/bot6-results.json) */
const fs = require('node:fs');
const path = require('node:path');
const E = require('../js/engine6.js');
const {X} = E, T = E.S;   // T = data6(값·필요 비율), 나라 이름은 E.T
// 수치 실험용 덮어쓰기: IRON_NEED(철 국민 필요 비율), TECH_IRON(기술 1상자당 철), OUT=0이면 결과 파일을 쓰지 않는다.
if (process.env.IRON_NEED) T.goods[4].need = +process.env.IRON_NEED;
if (process.env.TECH_IRON) X.inputPer = +process.env.TECH_IRON;
if (process.env.TECH_NEED) T.goods[3].need = +process.env.TECH_NEED;
if (process.env.FACTORY_IDLE) X.factoryIdle = process.env.FACTORY_IDLE === '1';
if (process.env.TECH_PRICE) T.goods[3].price = +process.env.TECH_PRICE;
if (process.env.STEEL_PRICE) T.goods[5].price = +process.env.STEEL_PRICE;
if (process.env.ORE_PRICE) T.goods[4].price = +process.env.ORE_PRICE;
if (process.env.START_MONEY) X.startMoney = +process.env.START_MONEY;
// LV="port.4=1;artisan.4=1" 꼴로 나라별 시작 산업 단계를 덮어쓴다.
if (process.env.LV) for (const kv of process.env.LV.split(';')) { const [k, v] = kv.split('='), [id, g] = k.split('.'); T.countries[id].levels[+g] = +v; }
if (process.env.DAON_SHIP) T.countries.daon.extraShip = process.env.DAON_SHIP === '1';
if (process.env.DAON_BIG) T.countries.daon.bigShip = process.env.DAON_BIG === '1';
if (process.env.ARTISAN_TECH) T.countries.artisan.levels[3] = +process.env.ARTISAN_TECH;
if (process.env.ARTISAN_BIG) T.countries.artisan.bigShip = process.env.ARTISAN_BIG === '1';
const SEEDS = +(process.env.SEEDS || 30), ids = E.T.countries.map(c => c.id), MODES = ['self', 'focus', 'balanced', 'opportunist', 'random'];
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
const r1 = v => Math.round(v * 10) / 10;
const lo = E.GOODS.map(() => 1e9), hi = E.GOODS.map(() => 0);

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
  const r = {id, name: E.T.countries.find(c => c.id === id).name};
  for (const m of MODES) { r[m] = []; r[m + 'Win'] = 0; }
  for (let seed = 1; seed <= SEEDS; seed++) {
    const games = Object.fromEntries(MODES.map(m => [m, play(seed, id, m)]));
    for (const m of MODES) { r[m].push(score(games[m])); r[m + 'Win'] += first(games[m]); }
    (r.traitGood ??= []).push(E.traitResult(games.focus, E.player(games.focus)).good ? 1 : 0); (r.traitVal ??= []).push(E.player(games.focus).history.at(-1)?.trait ?? 0);
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
    for (const g of E.GOODS) if (E.buys(probe, E.player(probe), g)) { all.supplyGoods++; all.supply2 += probe.nations.slice(1).filter(n => E.sells(probe, n, g)).length >= 2; }
  }
  rows.push(r);
}

const table = rows.map(r => ({나라: r.name, 자급: r1(mean(r.self)), 몰빵: r1(mean(r.focus)), 균형: r1(mean(r.balanced)), 기회주의: r1(mean(r.opportunist)), 무작위: r1(mean(r.random)),
  '무역−자급': r1(Math.max(mean(r.focus), mean(r.balanced)) - mean(r.self)), '1등%': Math.round(100 * Math.max(r.focusWin, r.balancedWin, r.opportunistWin) / SEEDS), '특성 값': r1(mean(r.traitVal)), '특성 잘함%': Math.round(100 * mean(r.traitGood))}));
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
  '세계 값 범위': E.S.goods.map((g, i) => `${g.name} ${lo[i]}~${hi[i]}`).join(', ')
};
console.log(summary);
if (process.env.OUT !== '0') fs.writeFileSync(path.join(__dirname, 'bot6-results.json'), JSON.stringify({seeds: SEEDS, table, summary}, null, 2));
