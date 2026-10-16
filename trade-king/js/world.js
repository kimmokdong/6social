/* 씨앗 하나로 지도·나라·성격·꿈을 함께 만듭니다. */
(function (root) {
  'use strict';
  const T = root.TRADE;
  function rng(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (a, r) => a[Math.floor(r() * a.length)];
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function coverage(ids) {
    const has = g => g === 'chip' || ids.some(id => T.countries[id].sells[g] || T.countries[id].sells.any);
    // 얼음 항로가 닫히는 해에도 국민에게 필요한 물량을 구할 수 있어야 합니다.
    const enough = g => Array.from({ length: T.years }, (_, i) => i + 1).every(year => ids.reduce((n, id) => n + (T.countries[id].frozenYears?.includes(year) ? 0 : T.countries[id].sells[g] || T.countries[id].sells.any || 0), 0) >= (T.needs.filter(n => n.from <= year).at(-1)?.[g] || 0));
    return T.coverage.needGoods.every(enough) && Object.values(T.products).filter(p => p.parts.every(has)).length >= T.coverage.minProducts && ids.filter(id => Object.keys(T.countries[id].buys).length).length >= T.coverage.minBuyers;
  }
  function neighbors(w, slot) { return w.lanes.filter(l => l[0] === slot || l[1] === slot).map(l => l[0] === slot ? l[1] : l[0]); }
  function route(w, target, options = {}) {
    const dist = { [w.home]: 0 }, paths = { [w.home]: [] }, tolls = { [w.home]: 0 }, todo = new Set(Object.keys(w.slots));
    while (todo.size) {
      const a = [...todo].sort((x, y) => (dist[x] ?? Infinity) - (dist[y] ?? Infinity))[0]; todo.delete(a);
      if (!Number.isFinite(dist[a])) break;
      if (a === target) return { years: dist[a], toll: tolls[a], path: paths[a] };
      for (const l of w.lanes) {
        if (!l.includes(a)) continue;
        const b = l[0] === a ? l[1] : l[0], type = l[2] || 'normal';
        if (!todo.has(b) || options.block?.includes(type)) continue;
        if (options.known && (!options.known.includes(a) || (!options.known.includes(b) && b !== options.explore))) continue;
        const ice = [a, b].some(s => w.countries[s]?.id === 'northIce');
        if (ice && T.countries.northIce.frozenYears.includes(options.year)) continue;
        if ([a, b].some(s => options.closed?.includes(w.countries[s]?.id))) continue;
        const d = dist[a] + T.laneYears[type] + (type === 'storm' && options.storm ? 1 : 0);
        const toll = tolls[a] + (type === 'strait' ? T.toll * (options.tollMult || 1) : 0);
        if (d < (dist[b] ?? Infinity) || (d === dist[b] && toll < tolls[b])) { dist[b] = d; tolls[b] = toll; paths[b] = [...paths[a], b]; }
      }
    }
    return null;
  }
  function create(seed) {
    const r = rng(seed), mapId = pick(Object.keys(T.maps), r), map = T.maps[mapId], flip = Math.floor(r() * 4), home = pick(map.home, r);
    const w = { seed, mapId, flip, home, slots: {}, lanes: map.lanes.map(l => l.slice()), countries: {}, lands: [], specialty: pick(Object.keys(T.specialties), r), dream: pick(T.dreams, r).id };
    for (const [id, [x, y]] of Object.entries(map.slots)) w.slots[id] = [flip & 1 ? 1000 - x : x, flip & 2 ? 640 - y : y];
    const fixed = map.fixed || {}, free = Object.keys(w.slots).filter(s => s !== home && !fixed[s]);
    let valid = false;
    for (let attempt = 0; attempt < 10000 && !valid; attempt++) {
      const ids = shuffle(Object.keys(T.countries).filter(id => !Object.values(fixed).includes(id)), r).slice(0, T.countriesPerGame - Object.keys(fixed).length);
      const positions = shuffle(free, r); w.countries = {};
      for (const [slot, id] of Object.entries(fixed)) w.countries[slot] = { id };
      ids.forEach((id, i) => w.countries[positions[i]] = { id });
      // 첫해부터 밥상·불빛 재료를 구할 수 있게, 곡물·석유를 파는 나라는 다온국 바로 옆에 둔다
      const near = neighbors(w, home);
      valid = coverage(Object.values(w.countries).map(c => c.id)) && T.coverage.needGoods.every(g => near.some(s => w.countries[s] && (T.countries[w.countries[s].id].sells[g] || T.countries[w.countries[s].id].sells.any)));
    }
    if (!valid) throw new Error('조건에 맞는 세계를 만들지 못했어요.');
    for (const c of Object.values(w.countries)) c.personality = pick(Object.keys(T.personalities), r);
    // 항로가 지나는 땅 안쪽은 파내어 바닷길을 남깁니다(그림에서 SVG mask 사용).
    w.lands = map.lands.map(group => group.map(slot => ({ slot, radius: 45 + r() * 15, wobble: Array.from({ length: 8 }, () => .85 + r() * .3) })));
    w.known = [home, ...neighbors(w, home)];
    return w;
  }
  root.TradeWorld = { rng, pick, shuffle, coverage, neighbors, route, create };
})(typeof window === 'undefined' ? globalThis : window);
