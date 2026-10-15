/* 다온시 v2 — 산업, 주민, 교육, 전기와 입지를 한 번에 계산하는 규칙 엔진. */
(function (root) {
  'use strict';
  const D = root.DAON_CITY, B = D.buildings, R = D.rules;
  const W = D.map[0].length, H = D.map.length, LAST = D.eras.length - 1;
  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
  const round = v => Math.round(v * 10) / 10;
  const terrain = (x, y) => D.map[y]?.[x];
  const buildable = (x, y) => ['F', 'V'].includes(terrain(x, y));
  const coastal = (x, y) => buildable(x, y) && terrain(x, y + 1) === 'S';
  const distance = (i, j) => Math.abs(i % W - j % W) + Math.abs(Math.floor(i / W) - Math.floor(j / W));
  const neighbors = i => Array.from({ length: W * H }, (_, j) => j).filter(j => distance(i, j) === 1);
  const level = t => t.level || 1;
  const isOpen = (s, i) => s.land >= 2 || (s.land === 1 ? i % W <= 4 && Math.floor(i / W) >= 1 : i % W <= 2 && Math.floor(i / W) >= 1);
  function newGame() {
    const tiles = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tiles.push({ x, y, t: terrain(x, y), b: terrain(x, y) === 'V' ? 'house' : null, at: -1, level: 1 });
    return { v: 2, d: 0, money: R.startMoney, tech: 0, people: 4, land: 0, bonus: { env: 0, life: 0, fair: 0 }, tiles, placed: [], actions: [], problemsSeen: {}, records: [], phase: 'build', last: null };
  }
  const hasPower = s => s.tiles.some(t => t.b && B[t.b].supply);
  const slotsLeft = s => s.tiles.filter((t, i) => buildable(t.x, t.y) && isOpen(s, i) && !t.b).length;
  function valid(s) {
    const finite = (v, max = 1000000) => Number.isFinite(v) && Math.abs(v) <= max;
    const indices = a => Array.isArray(a) && a.every(i => Number.isInteger(i) && i >= 0 && i < W * H);
    const tile = (t, i, land) => t && t.x === i % W && t.y === Math.floor(i / W) && t.t === terrain(t.x, t.y)
      && (t.b === null || (Object.hasOwn(B, t.b) && B[t.b].era <= s.d && buildable(t.x, t.y) && isOpen({ land }, i) && (!B[t.b].coastal || coastal(t.x, t.y))))
      && [1, 2].includes(t.level) && Number.isInteger(t.at) && t.at >= -1 && t.at <= s.d;
    const gaugesOk = g => g && ['econ', 'life', 'env', 'fair'].every(k => finite(g[k], 100) && g[k] >= 0);
    if (!s || s.v !== 2 || !Number.isInteger(s.d) || s.d < 0 || s.d > LAST || !['build', 'events', 'end'].includes(s.phase)) return false;
    if (!['money', 'tech', 'people'].every(k => finite(s[k]) && s[k] >= 0) || ![0, 1, 2].includes(s.land) || !Array.isArray(s.tiles) || s.tiles.length !== W * H || !s.tiles.every((t, i) => tile(t, i, s.land))) return false;
    if (!s.bonus || !['env', 'life', 'fair'].every(k => finite(s.bonus[k])) || !indices(s.placed) || !s.placed.every(i => s.tiles[i].b)) return false;
    if (!Array.isArray(s.actions) || !s.actions.every(a => a && finite(a.cost) && a.cost >= 0 && [0, 1, 2].includes(a.land) && indices(a.placed)
      && (a.type === 'expand' ? a.tile === null : ['place', 'upgrade', 'convert', 'move', 'demolish'].includes(a.type) && Number.isInteger(a.i) && a.i >= 0 && a.i < W * H && tile(a.tile, a.i, a.land))
      && (a.type !== 'move' || Number.isInteger(a.to) && a.to >= 0 && a.to < W * H && a.to !== a.i && tile(a.other, a.to, a.land)))) return false;
    if (!s.problemsSeen || !Object.entries(s.problemsSeen).every(([id, n]) => D.problems.some(p => p.id === id) && Number.isInteger(n) && n >= 0 && n <= 2)) return false;
    if (!Array.isArray(s.records) || s.records.length !== s.d + (s.phase === 'build' ? 0 : 1) || !s.records.every((r, i) => r && r.d === i && finite(r.exports) && finite(r.income) && Array.isArray(r.built) && r.built.every(id => Object.hasOwn(B, id)) && Array.isArray(r.choices) && r.choices.every(v => typeof v === 'string') && gaugesOk(r.gauges) && r.categories && Object.entries(r.categories).every(([k, v]) => Object.hasOwn(D.categories, k) && finite(v) && v >= 0) && Array.isArray(r.warnings) && r.warnings.every(v => typeof v === 'string'))) return false;
    if (s.phase === 'build') return true;
    return !!(s.last && s.last.d === s.d && gaugesOk(s.last.gauges) && finite(s.last.income) && finite(s.last.exports) && Array.isArray(s.last.rows) && s.last.rows.every(r => r && Object.hasOwn(B, r.id) && Number.isInteger(r.i) && s.tiles[r.i]?.b === r.id && finite(r.rate, 1) && r.rate >= 0 && finite(r.exports) && r.exports >= 0 && r.b && r.b.name === B[r.id].name && Array.isArray(s.last.built) && s.last.built.every(id => Object.hasOwn(B,id)))
      && ['housing','workers','jobs','employed','skilled','skilledNeed','energy','supply','education','pollution','base','marketIncome','exportIncome','upkeep','techGain'].every(k => finite(s.last[k]) && s.last[k] >= 0) && s.last.categories && Object.entries(s.last.categories).every(([k,v]) => Object.hasOwn(D.categories,k) && finite(v) && v >= 0) && ['residents','educated','served'].every(k => Array.isArray(s.last[k]) && s.last[k].every(v => Array.isArray(v) && Number.isInteger(v[0]) && v[0] >= 0 && v[0] < W*H && finite(v[1]) && v[1] >= 0)) && indices(s.last.exposed)
      && Array.isArray(s.last.warnings) && s.last.warnings.every(v => typeof v === 'string') && (!s.last.problem || D.problems.some(p => p.id === s.last.problem.id)));
  }
  function cardStatus(s, id) {
    if (!B[id]) return { ok: false, reason: 'tile' };
    if (s.phase !== 'build') return { ok: false, reason: 'phase' };
    if (B[id].era > s.d) return { ok: false, reason: 'era' };
    if (s.money < B[id].cost) return { ok: false, reason: 'money' };
    return { ok: true };
  }
  function canPlace(s, id, i) {
    const st = cardStatus(s, id), t = s.tiles[i];
    if (!st.ok) return st;
    if (!t || !buildable(t.x, t.y) || t.b) return { ok: false, reason: 'tile' };
    if (!isOpen(s, i)) return { ok: false, reason: 'land' };
    if (B[id].coastal && !coastal(t.x, t.y)) return { ok: false, reason: 'coast' };
    return { ok: true };
  }
  function change(s, type, cost, i, update) {
    s.actions.push({ type, cost, i, tile: i === undefined ? null : { ...s.tiles[i] }, land: s.land, placed: [...s.placed] });
    s.money -= cost; update(); return { ok: true };
  }
  function place(s, id, i) {
    const c = canPlace(s, id, i); if (!c.ok) return c;
    return change(s, 'place', B[id].cost, i, () => { Object.assign(s.tiles[i], { b: id, at: s.d, level: 1 }); s.placed.push(i); });
  }
  function canUpgrade(s, i) {
    const t = s.tiles[i], cost = t?.b ? Math.ceil(B[t.b].cost * .75) : 0;
    if (s.phase !== 'build' || !t?.b || level(t) >= 2) return { ok: false, reason: 'tile' };
    return { ok: s.money >= cost, reason: s.money >= cost ? '' : 'money', cost };
  }
  function upgrade(s, i) {
    const c = canUpgrade(s, i); if (!c.ok) return c;
    return change(s, 'upgrade', c.cost, i, () => { s.tiles[i].level = 2; });
  }
  function canConvert(s, id, i) {
    const t = s.tiles[i];
    if (!t?.b || !B[t.b].exp || !B[id]?.exp || id === t.b) return { ok: false, reason: 'tile' };
    const c = cardStatus(s, id); if (!c.ok && c.reason !== 'money') return c;
    if (B[id].coastal && !coastal(t.x, t.y)) return { ok: false, reason: 'coast' };
    const cost = Math.ceil(B[id].cost * .8);
    return { ok: s.money >= cost, cost, reason: s.money >= cost ? '' : 'money' };
  }
  function convert(s, id, i) {
    const c = canConvert(s, id, i); if (!c.ok) return c;
    return change(s, 'convert', c.cost, i, () => { Object.assign(s.tiles[i], { b: id, level: 1, at: s.d }); if (!s.placed.includes(i)) s.placed.push(i); });
  }
  function canDemolish(s, i) {
    return { ok: s.phase === 'build' && !!s.tiles[i]?.b && s.money >= R.demolishCost, reason: 'money' };
  }
  function demolish(s, i) {
    if (!canDemolish(s, i).ok) return { ok: false, reason: 'money' };
    return change(s, 'demolish', R.demolishCost, i, () => { Object.assign(s.tiles[i], { b: null, at: -1, level: 1 }); s.placed = s.placed.filter(j => j !== i); });
  }
  function move(s, from, to) {
    const t = s.tiles[from], u = s.tiles[to];
    if (s.phase !== 'build' || !t?.b || !u || u.b || !buildable(u.x, u.y) || !isOpen(s, to) || (B[t.b].coastal && !coastal(u.x, u.y)) || s.money < 2) return { ok: false, reason: 'tile' };
    const r = change(s, 'move', 2, from, () => {}); s.actions.at(-1).to = to; s.actions.at(-1).other = { ...u };
    Object.assign(u, t, { x: u.x, y: u.y, t: u.t }); Object.assign(t, { b: null, level: 1, at: -1 });
    s.placed = s.placed.map(i => i === from ? to : i); return r;
  }
  function expand(s) {
    if (s.phase !== 'build' || s.land >= 2 || s.d < (s.land === 0 ? 1 : 3)) return { ok: false, reason: 'era' };
    const cost = R.expandCost[s.land]; if (s.money < cost) return { ok: false, reason: 'money' };
    return change(s, 'expand', cost, undefined, () => { s.land++; });
  }
  function undo(s) {
    if (s.phase !== 'build' || !s.actions.length) return { ok: false };
    const a = s.actions.pop(); s.money += a.cost; s.land = a.land; s.placed = a.placed;
    if (a.tile) s.tiles[a.i] = a.tile; if (a.other) s.tiles[a.to] = a.other;
    return { ok: true };
  }
  function preview(s, id, i) {
    const copy = JSON.parse(JSON.stringify(s));
    if (!canPlace(copy, id, i).ok) return null;
    place(copy, id, i); return production(copy);
  }
  function production(s, d = s.d) {
    const rows = s.tiles.map((t, i) => ({ i, id: t.b, level: level(t), b: t.b ? B[t.b] : null, exports: 0, rate: 1, pollution: 0, boost: 1, collaboration: false })).filter(r => r.b);
    const houses = rows.filter(r => r.b.homes), industries = rows.filter(r => r.b.exp && r.b.era <= d);
    const housing = houses.reduce((n, r) => n + r.b.homes * r.level, 0), jobs = industries.reduce((n, r) => n + r.b.jobs * r.level, 0);
    const workers = Math.min(housing, Math.max(Math.min(s.people, housing), Math.ceil(jobs)));
    const residents = new Map(houses.map(h => [h.i, 0]));
    for (let n = 0; n < workers;) for (const h of houses) {
      if (n >= workers) break;
      if (residents.get(h.i) < h.b.homes * h.level) { residents.set(h.i, residents.get(h.i) + 1); n++; }
    }
    // 한 시설의 수용량을 가까운 주택부터 나눈다. 겹치는 시설은 이미 지원한 주민을 중복 계산하지 않는다.
    function coverage(predicate) {
      const covered = new Map(houses.map(h => [h.i, 0]));
      for (const facility of rows.filter(predicate)) {
        let capacity = (facility.b.education || facility.b.capacity) * facility.level;
        for (const h of [...houses].sort((a, b) => distance(a.i, facility.i) - distance(b.i, facility.i) || a.i - b.i)) {
          if (distance(h.i, facility.i) > facility.b.range) continue;
          const take = Math.min(capacity, residents.get(h.i) - covered.get(h.i)); covered.set(h.i, covered.get(h.i) + take); capacity -= take;
        }
      }
      return covered;
    }
    const educated = coverage(r => !!r.b.education), served = coverage(r => !!r.b.service), markets = coverage(r => r.id === 'market');
    const total = map => Math.min(workers, [...map.values()].reduce((a, b) => a + b, 0));
    const education = total(educated), skilled = Math.min(s.tech, education, workers), skilledNeed = industries.reduce((n, r) => n + r.b.skilled * r.level, 0);
    const energy = industries.reduce((n, r) => n + r.b.energy * r.level, 0), supply = 2 + rows.reduce((n, r) => n + (r.b.supply || 0) * r.level, 0);
    const workforceRate = jobs ? Math.min(1, workers / jobs) : 1, powerRate = energy ? Math.min(1, supply / energy) : 1, skillRate = skilledNeed ? Math.min(1, skilled / skilledNeed) : 1;
    for (const r of industries) { r.rate = Math.min(workforceRate, powerRate, r.b.skilled ? skillRate : 1); r.potential = r.b.exp[d] * r.level * r.rate; }
    for (const facility of rows.filter(r => r.b.logistics)) {
      const targets = industries.filter(r => distance(r.i, facility.i) <= facility.b.range), wanted = targets.reduce((n, r) => n + r.potential * .5, 0);
      const fraction = wanted ? Math.min(1, facility.b.logistics * facility.level / wanted) : 0;
      targets.forEach(r => { r.boost = Math.min(2, r.boost + .5 * fraction); });
    }
    for (const supplier of industries.filter(r => r.rate > 0)) {
      industries.filter(r => !r.collaboration && r.b.links?.includes(supplier.id) && distance(r.i, supplier.i) <= 2).slice(0, 2 * supplier.level).forEach(r => { r.collaboration = true; });
    }
    const totals = {};
    for (const r of industries) { r.output = r.potential * r.boost * (r.collaboration ? 1.15 : 1); totals[r.b.cat] = (totals[r.b.cat] || 0) + r.output; }
    for (const r of industries) { r.market = Math.min(1, R.demand[r.b.cat][d] / (totals[r.b.cat] || 1)); r.exports = r.output * r.market; }
    for (const r of rows) r.pollution = (r.b.pol || 0) * (r.b.exp ? r.rate : 1) * r.level;
    for (const cleaner of rows.filter(r => r.b.cleaning)) {
      let capacity = cleaner.b.cleaning * cleaner.level;
      for (const r of rows.filter(r => r.pollution && distance(r.i, cleaner.i) <= cleaner.b.range).sort((a, b) => distance(a.i, cleaner.i) - distance(b.i, cleaner.i) || a.i - b.i)) { const cut = Math.min(capacity, r.pollution); r.pollution -= cut; capacity -= cut; }
    }
    const exposed = houses.filter(h => rows.some(r => r.pollution >= 1 && distance(h.i, r.i) <= (r.pollution >= 3 ? 2 : 1))).map(r => r.i);
    const employed = industries.reduce((n, r) => n + r.b.jobs * r.level * r.rate, 0);
    const exports = industries.reduce((n, r) => n + r.exports, 0), upkeep = rows.reduce((n, r) => n + (r.b.upkeep || 0) * r.level, 0);
    const marketIncome = total(markets), exportIncome = Math.round(exports * R.income.exportRate), base = R.income.base[d];
    const techGain = Math.min(2, Math.max(0, education - s.tech));
    const categories = {};
    industries.forEach(r => { categories[r.b.cat] = (categories[r.b.cat] || 0) + r.exports; });
    const warnings = [];
    if (jobs > workers) warnings.push(`집이 부족해요 · 일할 사람 ${Math.ceil(jobs - workers)} 부족`);
    if (energy > supply) warnings.push(`전기가 ${energy - supply} 부족해요`);
    if (skilledNeed > skilled) warnings.push(`기술 인력 ${skilledNeed - skilled} 부족 · 교육을 준비해요`);
    if (exposed.length) warnings.push(`주택 ${exposed.length}곳에 오염이 닿아요`);
    if (industries.some(r => r.market < .99)) warnings.push('수출 기회를 나눠 받아요 · 다른 산업이나 기반을 살펴봐요');
    if (workers - employed >= .5) warnings.push(`일하지 못하는 주민 ${Math.ceil(workers - employed)} · 산업과 기반을 살펴요`);
    return { rows, industries, housing, residents: [...residents], workers, jobs, employed, skilled, skilledNeed, energy, supply, education, educated: [...educated], served: [...served], service: total(served), exposed, pollution: rows.reduce((n, r) => n + r.pollution, 0), categories,
      exports: round(exports), base, marketIncome, exportIncome, upkeep, income: base + marketIncome + exportIncome - upkeep, techGain, warnings: warnings.slice(0, 3) };
  }
  const exportOf = (s, i, d = s.d, id = s.tiles[i]?.b) => id !== s.tiles[i]?.b ? (preview(s, id, i)?.rows.find(r => r.i === i)?.exports || 0) : (production(s, d).rows.find(r => r.i === i)?.exports || 0);
  const exportsTotal = (s, d = s.d) => production(s, d).exports;
  const pollutionAt = (s, i) => production(s).rows.find(r => r.i === i)?.pollution || 0;
  const smokyHouses = s => production(s).exposed;
  const boostAt = (s, i, id = s.tiles[i]?.b) => (id !== s.tiles[i]?.b ? preview(s, id, i) : production(s))?.rows.find(r => r.i === i)?.boost || 1;
  function gaugeDetails(s, d = s.d) {
    const p = production(s, d), employment = p.workers ? Math.min(1, p.employed / p.workers) : 0, coverage = p.workers ? p.service / p.workers : 0;
    return { econ: { exports: p.exports, target: R.exportTarget[d], value: clamp(p.exports / R.exportTarget[d] * 70) },
      env: { base: 100, loss: p.pollution * 5, gain: 0, bonus: Math.max(-20, Math.min(20, s.bonus.env)) },
      life: { base: 30, gain: employment * 30 + coverage * 25, loss: p.exposed.length * 6, bonus: Math.max(-15, Math.min(15, s.bonus.life)) },
      fair: { base: 25, gain: employment * 40 + coverage * 30, loss: p.exposed.length * 3, bonus: Math.max(-20, Math.min(20, s.bonus.fair)) } };
  }
  function gauges(s, d = s.d) {
    const detail = gaugeDetails(s, d), g = { econ: detail.econ.value, exports: detail.econ.exports };
    for (const k of ['env', 'life', 'fair']) g[k] = clamp(detail[k].base + detail[k].gain - detail[k].loss + detail[k].bonus);
    return g;
  }
  function advance(s) {
    if (s.phase !== 'build') return s.last;
    const p = production(s), d = s.d, built = [...new Set(s.placed.map(i => s.tiles[i].b).filter(Boolean))];
    const g = gauges(s), match = (p.categories[D.eras[d].real] || 0) > 0;
    const problem = D.problems.find(x => (x.id !== 'housing' || p.jobs > p.housing) && g[x.gauge] < x.below && (s.problemsSeen[x.id] || 0) < 2) || null;
    if (problem) s.problemsSeen[problem.id] = (s.problemsSeen[problem.id] || 0) + 1;
    const moneyBefore = s.money, relief = Math.max(0, -(s.money + p.income)); s.money = Math.max(0, s.money + p.income); s.people = p.workers; s.tech += p.techGain;
    s.last = { d, ...p, gauges: g, built, match, problem, relief };
    s.records[d] = { d, built, exports: p.exports, income: p.income, gauges: g, match, categories: p.categories, warnings: p.warnings, choices: [], relief, moneyBefore };
    s.phase = 'events'; return s.last;
  }
  function choiceEffects(s, ev, key) {
    const choice = ev[key];
    return choice.energyCost ? { ...choice.fx, money: -Math.max(1, Math.ceil((s.last?.energy ?? production(s).energy) / 2)) } : choice.fx;
  }
  function applyFx(s, fx, label) {
    for (const [k, v] of Object.entries(fx || {})) { if (k === 'money') s.money = Math.max(0, s.money + v); else if (k === 'tech') s.tech = Math.max(0, s.tech + v); else if (Object.hasOwn(s.bonus, k)) s.bonus[k] += v; }
    if (label && s.records[s.d]) { s.records[s.d].choices.push(label); s.records[s.d].gauges = gauges(s); }
  }
  function nextDecade(s) {
    if (s.phase !== 'events') return false;
    if (s.d >= LAST) { s.phase = 'end'; return false; }
    s.d++; s.placed = []; s.actions = []; s.phase = 'build'; return true;
  }
  function ending(s) {
    const g = gauges(s, LAST), p = production(s, LAST), total = p.exports || 1;
    let id = 'grown';
    if (g.econ < 35) id = 'stuck';
    else if (g.env < 40) id = 'gray';
    else if (g.fair < 40 || g.life < 35) id = 'unfair';
    else if ((p.categories.content || 0) / total >= .3) id = 'creative';
    else if (((p.categories.semi || 0) + (p.categories.it || 0) + (p.categories.battery || 0)) / total >= .5) id = 'tech';
    else if (g.econ >= 60 && g.life >= 65 && g.env >= 60 && g.fair >= 60 && Object.values(p.categories).filter(n => n >= 3).length >= 3) id = 'together';
    else if (g.econ >= 55) id = 'export';
    return D.endings.find(e => e.id === id);
  }
  const historyScore = s => s.records.filter(r => r && r.match).length;
  root.DaonEngine = { W, H, LAST, terrain, buildable, coastal, neighbors, distance, level, isOpen, newGame, valid, cardStatus, canPlace, place, canUpgrade, upgrade, canConvert, convert, move, canDemolish, demolish, expand, undo, preview, production, boostAt, exportOf, exportsTotal, pollutionAt, smokyHouses, gaugeDetails, gauges, advance, choiceEffects, applyFx, nextDecade, ending, historyScore, slotsLeft, hasPower };
})(typeof window !== 'undefined' ? window : globalThis);
