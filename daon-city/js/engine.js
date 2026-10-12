/* 다온시 70년 — 규칙 엔진 (화면 없이 node 에서도 돌아감) */
(function (root) {
  'use strict';
  const D = root.DAON_CITY;
  const W = D.map[0].length, H = D.map.length, LAST = D.eras.length - 1;
  const B = D.buildings, R = D.rules;
  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

  const terrain = (x, y) => D.map[y][x];
  const buildable = (x, y) => terrain(x, y) === 'F' || terrain(x, y) === 'V';
  const coastal = (x, y) => buildable(x, y) && y + 1 < H && terrain(x, y + 1) === 'S';
  const neighbors = i => {
    const x = i % W, y = Math.floor(i / W), out = [];
    if (x > 0) out.push(i - 1); if (x < W - 1) out.push(i + 1);
    if (y > 0) out.push(i - W); if (y < H - 1) out.push(i + W);
    return out;
  };

  function newGame() {
    const tiles = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      tiles.push({ x, y, t: terrain(x, y), b: terrain(x, y) === 'V' ? 'house' : null, at: -1 });
    }
    return {
      d: 0, money: R.startMoney, tech: 0, bonus: { env: 0, life: 0, fair: 0 },
      tiles, placed: [], problemsSeen: {}, records: [], phase: 'build', last: null
    };
  }

  const cityIds = s => s.tiles.filter(t => t.b).map(t => t.b);
  const has = (s, id) => s.tiles.some(t => t.b === id);
  const hasPower = s => s.tiles.some(t => t.b && B[t.b].power);
  const slotsLeft = s => R.buildsPerDecade[s.d] - s.placed.length;

  /* 카드(건물 종류) 상태: 타일과 무관한 이유. 우선순위 era > slots > money > tech > power */
  function cardStatus(s, id) {
    const b = B[id];
    if (b.era > s.d) return { ok: false, reason: 'era' };
    if (slotsLeft(s) <= 0) return { ok: false, reason: 'slots' };
    if (s.money < b.cost) return { ok: false, reason: 'money' };
    if (b.techReq && s.tech < b.techReq) return { ok: false, reason: 'tech' };
    if (b.needPower && !hasPower(s)) return { ok: false, reason: 'power' };
    return { ok: true };
  }
  function canPlace(s, id, i) {
    const st = cardStatus(s, id);
    if (!st.ok) return st;
    const t = s.tiles[i];
    if (!buildable(t.x, t.y) || t.b) return { ok: false, reason: 'tile' };
    if (B[id].coastal && !coastal(t.x, t.y)) return { ok: false, reason: 'coast' };
    return { ok: true };
  }
  function place(s, id, i) {
    const c = canPlace(s, id, i);
    if (!c.ok) return c;
    s.money -= B[id].cost;
    Object.assign(s.tiles[i], { b: id, at: s.d });
    s.placed.push(i);
    return { ok: true };
  }
  /* 이번 시대에 지은 것은 전액 환불로 되돌리기 */
  function undo(s, i) {
    const k = s.placed.indexOf(i);
    if (k < 0) return { ok: false };
    const id = s.tiles[i].b;
    // 발전소를 되돌리면 전기가 필요한 이번 시대 건물이 고립되지 않게 막기
    if (B[id].power && s.tiles.filter(t => t.b && B[t.b].power).length === 1 &&
        s.tiles.some((t, j) => j !== i && t.b && B[t.b].needPower)) return { ok: false, reason: 'power' };
    s.money += B[id].cost;
    Object.assign(s.tiles[i], { b: null, at: -1 });
    s.placed.splice(k, 1);
    return { ok: true };
  }
  /* 예전 시대 건물 철거 (건설 횟수는 쓰지 않음) */
  function canDemolish(s, i) {
    const t = s.tiles[i];
    if (!t.b || s.placed.includes(i)) return { ok: false };
    if (s.money < R.demolishCost) return { ok: false, reason: 'money' };
    if (B[t.b].power && s.tiles.filter(u => u.b && B[u.b].power).length === 1 && s.tiles.some(u => u.b && B[u.b].needPower)) return { ok: false, reason: 'power' };
    return { ok: true };
  }
  function demolish(s, i) {
    const c = canDemolish(s, i);
    if (!c.ok) return c;
    s.money -= R.demolishCost;
    Object.assign(s.tiles[i], { b: null, at: -1 });
    return { ok: true };
  }

  /* 수출 증가 배율: 공장이 항구·고속도로 옆이면 */
  function boostAt(s, i, id = s.tiles[i].b) {
    if (!id || !B[id].factory) return 1;
    const ns = neighbors(i).map(j => s.tiles[j].b);
    const port = ns.includes('port'), road = ns.includes('road');
    return port && road ? R.boost.both : port || road ? R.boost.one : 1;
  }
  function exportOf(s, i, d = s.d, id = s.tiles[i].b) {
    const b = id && B[id];
    if (!b || !b.exp) return 0;
    let e = b.exp[d];
    if (!e) return 0;
    if (b.steelBonus && has(s, 'steel')) e += b.steelBonus;
    return e * boostAt(s, i, id);
  }
  const exportsTotal = (s, d = s.d) => s.tiles.reduce((sum, t, i) => sum + exportOf(s, i, d), 0);

  /* 공원 옆 건물의 실제 오염 */
  function pollutionAt(s, i) {
    const id = s.tiles[i].b, p = id ? (B[id].pol || 0) : 0;
    if (!p) return 0;
    const parks = neighbors(i).filter(j => s.tiles[j].b === 'park').length;
    return Math.max(0, p - parks);
  }
  /* 오염 2 이상인 건물 옆 주택 */
  function smokyHouses(s) {
    return s.tiles.reduce((list, t, i) => {
      if (t.b === 'house' && neighbors(i).some(j => s.tiles[j].b && (B[s.tiles[j].b].pol || 0) >= 2)) list.push(i);
      return list;
    }, []);
  }

  function gaugeDetails(s, d = s.d) {
    const ids = cityIds(s), sum = key => ids.reduce((a, id) => a + (B[id][key] || 0), 0);
    const ex = exportsTotal(s, d);
    const econ = clamp(ex / R.exportTarget[d] * 70);
    const pol = s.tiles.reduce((a, t, i) => a + pollutionAt(s, i), 0);
    return {
      econ: { exports: ex, target: R.exportTarget[d], value: econ },
      env: { base: 80, loss: 5 * pol, gain: sum('env'), bonus: s.bonus.env },
      life: { base: 25, loss: R.housePollutionPenalty * smokyHouses(s).length, gain: sum('life'), economy: econ * 0.2, bonus: s.bonus.life },
      fair: { base: 55, loss: 4 * sum('unfair'), gain: sum('fair'), bonus: s.bonus.fair }
    };
  }
  function gauges(s, d = s.d) {
    const t = gaugeDetails(s, d), g = { econ: t.econ.value, exports: t.econ.exports };
    for (const k of ['env', 'life', 'fair']) g[k] = clamp(t[k].base - t[k].loss + t[k].gain + (t[k].economy || 0) + t[k].bonus);
    return g;
  }
  function production(s, d = s.d) {
    const ids = cityIds(s), exports = exportsTotal(s, d);
    const base = R.income.base[d];
    const marketIncome = R.income.perMarket * ids.filter(id => id === 'market').length;
    const exportIncome = Math.round(exports * R.income.exportRate);
    return { exports, base, marketIncome, exportIncome, income: base + exportIncome + marketIncome,
      techGain: ids.reduce((a, id) => a + (B[id].tech || 0), 0) };
  }

  /* 10년 보내기: 생산 → 돈·기술 → 게이지 → 문제 사건 결정 */
  function advance(s) {
    const d = s.d, { exports: ex, income, techGain } = production(s, d);
    s.money += income; s.tech += techGain;
    const g = gauges(s, d);
    const built = s.placed.map(i => s.tiles[i].b);
    const real = D.eras[d].real;
    const match = built.some(id => B[id].cat === real);
    let problem = null;
    for (const p of [...D.problems].sort((a, b) => ['env', 'fair', 'life'].indexOf(a.gauge) - ['env', 'fair', 'life'].indexOf(b.gauge))) {
      if (g[p.gauge] < p.below && (s.problemsSeen[p.id] || 0) < 2) { problem = p; break; }
    }
    if (problem) s.problemsSeen[problem.id] = (s.problemsSeen[problem.id] || 0) + 1;
    s.last = { d, exports: ex, income, techGain, gauges: g, built, match, problem };
    s.records[d] = { d, built, exports: Math.round(ex * 10) / 10, gauges: g, match, choices: [] };
    s.phase = 'events';
    return s.last;
  }
  function applyFx(s, fx, label) {
    for (const [k, v] of Object.entries(fx || {})) {
      if (k === 'money') s.money = Math.max(0, s.money + v);
      else if (k === 'tech') s.tech += v;
      else s.bonus[k] += v;
    }
    if (label && s.records[s.d]) s.records[s.d].choices.push(label);
    if (s.records[s.d]) s.records[s.d].gauges = gauges(s, s.d);
  }
  /* 다음 시대로 (마지막이면 끝) */
  function nextDecade(s) {
    if (s.d >= LAST) { s.phase = 'end'; return false; }
    s.d++; s.placed = []; s.phase = 'build';
    return true;
  }
  function ending(s) {
    const g = gauges(s, LAST), ok = {
      all60: g.econ >= 60 && g.life >= 60 && g.env >= 60 && g.fair >= 60,
      'econ>=70 && env<40': g.econ >= 70 && g.env < 40,
      'econ>=60 && fair<40': g.econ >= 60 && g.fair < 40,
      'env>=70 && econ<50': g.env >= 70 && g.econ < 50,
      // 학교·대학교가 하나도 없으면 새 산업으로 나아가지 못함
      'econ<45 || noEdu': g.econ < 45 || !s.tiles.some(t => t && (t.b === 'school' || t.b === 'univ')),
      else: true
    };
    return D.endings.find(e => ok[e.when]);
  }
  const historyScore = s => s.records.filter(r => r && r.match).length;

  root.DaonEngine = {
    W, H, LAST, terrain, buildable, coastal, neighbors, newGame, cardStatus, canPlace, place, undo, canDemolish, demolish,
    boostAt, exportOf, exportsTotal, pollutionAt, smokyHouses, gaugeDetails, gauges, production, advance, applyFx, nextDecade, ending, historyScore, slotsLeft, hasPower
  };
})(typeof window !== 'undefined' ? window : globalThis);
