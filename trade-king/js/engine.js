/* 화면·시계·저장소에 의존하지 않는 규칙. 모든 command는 새 상태를 돌려줍니다. */
(function (root) {
  'use strict';
  const T = root.TRADE, W = root.TradeWorld, goods = { ...T.goods, ...T.products };
  const clone = s => JSON.parse(JSON.stringify(s)), clamp = n => Math.max(0, Math.min(5, n));
  const country = (s, id) => Object.entries(s.world.countries).find(([, c]) => c.id === id);
  const needs = s => T.needs.filter(n => n.from <= s.year).at(-1) || { grain: 0, oil: 0 };
  const active = (s, key) => s.mods.filter(m => m.key === key && m.left > 0);
  const mult = (s, key, id) => active(s, key).filter(m => m.value[0] === id || m.value[0] === 'all').reduce((n, m) => n * m.value[1], 1);
  function path(s, slot, explore = false) {
    return W.route(s.world, slot, { known: s.known, explore: explore ? slot : null, year: s.year, storm: T.stormSeason.includes(s.year) || active(s, 'storm').length > 0, block: active(s, 'block').map(m => m.value[0]), closed: active(s, 'closed').map(m => m.value[0]), tollMult: active(s, 'tollMult').reduce((a, m) => a * m.value[0], 1) });
  }
  function matches(w, n) { return (!n.needsAny || Object.values(w.countries).some(c => n.needsAny.includes(c.id))) && (!n.needsLane || w.lanes.some(l => l[2] === n.needsLane)); }
  function schedule(w, seed) {
    const r = W.rng(seed + 777), roots = W.shuffle(T.newsPlan.chainRoots.filter(id => matches(w, T.news[id])), r), crises = W.shuffle(T.newsPlan.crises.filter(id => matches(w, T.news[id])), r).slice(0, 1 + Math.floor(r() * 2));
    const plan = Array(T.years).fill(null), early = W.shuffle([1, 2, 3, 4], r);
    roots.forEach((id, i) => { plan[early[i]] = id; });
    const slots = W.shuffle(plan.map((_, i) => i).filter(i => i > 0 && !plan[i]), r);
    crises.forEach((id, i) => { plan[slots[i]] = id; });
    const market = T.newsPlan.market.filter(id => matches(w, T.news[id]));
    for (let i = 1; i < plan.length; i++) if (!plan[i]) plan[i] = W.pick(market, r);
    return plan;
  }
  function fresh(seed = 1) {
    const world = W.create(seed), s = { seed, world, year: 1, money: T.start.money, ships: T.start.ships, factory: T.start.factory, tech: false, gauges: { ...T.start.gauges }, stock: Object.fromEntries(Object.keys(goods).map(g => [g, g === 'chip' ? T.home.chipPerYear : 0])), known: world.known.slice(), trust: {}, deals: {}, sold: {}, supply: {}, demand: {}, voyages: [], contracts: [], mods: [], swaps: {}, fta: [], pending: [], trail: [], found: [], events: [], newsPlan: schedule(world, seed), stats: { unfair: 0, deals: 0, made: 0, products: { phone: 0, car: 0, ev: 0 }, soldYear: 0, orders: 0, partsFrom: [] }, orders: [], history: [], actions: T.actionsPerYear, assembled: 0, jobMade: 0, freePart: 0, attempts: {}, ended: null, allMetYear: null };
    for (const [slot, c] of Object.entries(world.countries)) { s.trust[c.id] = s.known.includes(slot) ? T.start.trustMet : T.start.trustNew; s.deals[c.id] = 0; s.sold[c.id] = 0; }
    begin(s); return s;
  }
  function inventories(s) {
    s.supply = {}; s.demand = {};
    for (const c of Object.values(s.world.countries)) {
      const d = T.countries[c.id];
      s.supply[c.id] = d.sells.any ? Object.fromEntries(Object.keys(T.goods).map(g => [g, d.sells.any])) : { ...d.sells };
      s.demand[c.id] = d.buys.any ? Object.fromEntries([...Object.keys(T.products), 'chip'].map(g => [g, d.buys.any])) : { ...d.buys };
      if (!d.buys.any && Object.keys(d.buys).length) s.demand[c.id].chip = 2;
    }
  }
  function eventChar(s, n) {
    if (n.char === 'country') return Object.values(s.world.countries).find(c => n.needsAny?.includes(c.id))?.id || 'president';
    if (n.char === 'buyer') return Object.keys(s.sold).filter(id => s.sold[id] > 0).sort((a, b) => s.sold[b] - s.sold[a])[0] || 'reporter';
    return n.char || 'reporter';
  }
  function queue(s, id, rootId) {
    const n = T.news[id] || T.nodes[id]; if (!n) throw new Error(`알 수 없는 사건: ${id}`);
    const ev = { id, root: T.chains[id] ? id : rootId || null, char: eventChar(s, n) };
    const { effect, choice, options, ...self } = n;
    effects(s, self, ev); if (effect) effects(s, effect, ev);
    if (id === 'tradeWar') s.stats.tradeWar = true;
    if (!choice && !options) s.trail.push({ year: s.year, ...ev, title: n.title });
    s.events.push(ev);
  }
  function begin(s) {
    inventories(s);
    const due = s.pending.filter(p => p.year <= s.year); s.pending = s.pending.filter(p => p.year > s.year);
    due.forEach(p => queue(s, p.id, p.root));
    if (s.newsPlan[s.year - 1]) queue(s, s.newsPlan[s.year - 1]);
    spawnOrders(s);
  }
  /* 주문서: 사 주는 나라가 완성품을 주문한다. 판에서 부품을 다 구할 수 있는 완성품만, 만난 나라 우선 */
  function spawnOrders(s) {
    const r = W.rng(s.seed * 13 + s.year * 101 + 5);
    s.orders = (s.orders || []).filter(o => !o.done && o.until >= s.year);
    const sells = g => g === 'chip' || Object.values(s.world.countries).some(c => T.countries[c.id].sells[g] || T.countries[c.id].sells.any);
    const makeable = Object.keys(T.products).filter(id => T.products[id].parts.every(sells));
    while (s.orders.length < T.orders.max) {
      const options = [];
      for (const [slot, c] of Object.entries(s.world.countries)) for (const g of makeable) {
        const d = T.countries[c.id]; if (!(d.buys.any || d.buys[g])) continue;
        if (s.orders.some(o => o.id === c.id && o.product === g)) continue;
        options.push({ slot, id: c.id, product: g, known: s.known.includes(slot) });
      }
      if (!options.length) break;
      const known = options.filter(o => o.known), pool = known.length && (r() < .75 || known.length === options.length) ? known : options;
      const pick = W.pick(pool, r), qty = s.year <= 3 ? 1 : 1 + Math.floor(r() * 2);
      s.orders.push({ id: pick.id, slot: pick.slot, product: pick.product, qty, left: qty, bonus: Math.round(T.products[pick.product].price * T.orders.bonus * qty), until: Math.min(T.years, s.year + T.orders.years - 1), year: s.year, done: false });
    }
  }
  /* 흥정 규칙(공개): 믿음이 성격별 기준 이상이면 '깎기'가 통한다. 변덕쟁이는 홀수 해에만 */
  function haggle(s, id) {
    const [, c] = country(s, id), p = T.personalities[c.personality], moody = c.personality === 'fickle' && s.year % 2 === 0;
    return { ok: !moody && s.trust[id] >= p.haggle, need: p.haggle, moody };
  }
  function effects(s, o, ev = {}) {
    if (o.fx?.money) s.money = Math.max(0, s.money + o.fx.money);
    for (const [g, d] of Object.entries(o.gauge || {})) s.gauges[g] = clamp(s.gauges[g] + d);
    if (o.unfair) s.stats.unfair++;
    for (const [id, d] of Object.entries(o.trust || {})) for (const c of Object.values(s.world.countries)) if (id === c.id || id === 'all' || (id === 'buyers' && s.sold[c.id] > 0)) s.trust[c.id] = clamp(s.trust[c.id] + d);
    s.contracts = s.contracts.filter(c => s.trust[c.id] > 0);
    for (const key of ['price', 'buy', 'embargo', 'tariff', 'closed', 'block', 'tollMult']) if (o[key]) {
      const v = o[key], left = v.at(-1); if (key === 'tariff') s.mods = s.mods.filter(m => !(m.key === key && m.value[0] === v[0]));
      s.mods.push({ key, value: v, left });
    }
    if (o.storm) s.mods.push({ key: 'storm', value: [1], left: o.storm });
    if (o.outsource) s.mods.push({ key: 'outsource', value: [1], left: o.outsource });
    if (o.noContract) {
      const left = Math.max(o.noContract, contractYears(s));
      s.mods = s.mods.filter(m => m.key !== 'noContract');
      s.mods.push({ key: 'noContract', value: [1], left });
    }
    if (o.removeTariff) s.mods = s.mods.filter(m => !(m.key === 'tariff' && m.value[0] === o.removeTariff));
    if (o.fta && !s.fta.includes(ev.char)) { s.fta.push(ev.char); s.mods = s.mods.filter(m => !(m.key === 'tariff' && m.value[0] === ev.char)); }
    if (o.freePart) s.freePart += o.freePart;
    if (o.recipeSwap) s.swaps[o.recipeSwap[0]] = o.recipeSwap.slice(1);
    for (const [g, n] of Object.entries(o.stock || {})) s.stock[g] += n;
    if (o.payBack) { if (s.stock[o.payBack]) s.stock[o.payBack]--; else s.money = Math.max(0, s.money - goods[o.payBack].price); }
    if (o.recall) s.money = Math.max(0, s.money - Math.max(2, s.stats.soldYear) * o.recall);
    if (o.next) s.pending.push({ id: o.next[0], year: Math.min(T.years, s.year + o.next[1]), root: ev.root || ev.id });
  }
  function price(s, id, g, buying) {
    const [, c] = country(s, id), d = T.countries[id], p = T.personalities[c.personality], r = W.rng(s.seed + s.year * 7919 + Object.keys(T.countries).indexOf(id) * 37), values = [p.ask, p.bid].map(v => Array.isArray(v) ? v[0] + r() * (v[1] - v[0]) : v);
    const base = goods[g].price + (s.world.specialty === g ? T.specialties[g].bonus : 0), trust = p.trustStep * (s.trust[id] - 2);
    if (buying) return base * values[0] * (1 - trust) * mult(s, 'price', g) * (d.sells.any ? d.anyMarkup : 1) * (g === 'grain' && s.fta.includes(id) ? .8 : 1);
    const tariff = s.fta.includes(id) ? 1 : active(s, 'tariff').filter(m => m.value[0] === id && m.value[1].includes(g)).reduce((v, m) => v * m.value[2], 1);
    return base * d.market * values[1] * (1 + trust) * mult(s, 'buy', g) * tariff * (s.fta.includes(id) ? 1.15 : 1);
  }
  function quote(s, id, basket, offer = 'fair') {
    const tier = T.offers[offer]; let cost = 0, revenue = 0, accepts = offer !== 'low' || haggle(s, id).ok;
    for (const [g, n] of Object.entries(basket.buy || {})) if (n) { const offered = price(s, id, g, true); const base = goods[g].price * mult(s, 'price', g) * (T.countries[id].sells.any ? T.countries[id].anyMarkup : 1) * (g === 'grain' && s.fta.includes(id) ? .8 : 1); cost += base * tier * n; }
    for (const [g, n] of Object.entries(basket.sell || {})) if (n) { const base = (goods[g].price + (g === s.world.specialty ? T.specialties[g].bonus : 0)) * T.countries[id].market * mult(s, 'buy', g) * (s.fta.includes(id) ? 1.15 : active(s, 'tariff').filter(m => m.value[0] === id && m.value[1].includes(g)).reduce((v, m) => v * m.value[2], 1)); revenue += base / tier * n; }
    return { cost: Math.ceil(cost), revenue: Math.floor(revenue), accepts };
  }
  function available(s, id) {
    const c = country(s, id); if (!c || !s.known.includes(c[0])) return '아직 만나지 못했어요';
    if (s.trust[id] === 0 || active(s, 'closed').some(m => m.value[0] === id)) return '지금은 거래를 쉬고 있어요';
    if (!path(s, c[0])) return '바닷길이 닫혔어요';
    return null;
  }
  const emptyShip = s => s.voyages.filter(v => !v.contract).length < s.ships;
  const contractYears = s => Math.max(0, ...active(s, 'noContract').map(m => m.left));
  const contractRefusal = (s, id) => available(s, id) || (contractYears(s) ? `장기 계약 거절 ${contractYears(s)}년` : s.trust[id] === 1 ? '장기 계약 거절' : null);
  function fillOrder(s, id, g, n, result) {
    const o = s.orders.find(o => !o.done && o.id === id && o.product === g && o.left > 0); if (!o) return;
    o.left -= Math.min(n, o.left);
    if (!o.left) { o.done = true; o.doneYear = s.year; s.money += o.bonus; s.gauges.jobs = clamp(s.gauges.jobs + T.orders.jobs); s.stats.orders++; result.orderDone = { ...o }; }
  }
  function dealHeart(s, id) { s.stats.deals++; s.deals[id]++; if (s.deals[id] % T.trust.dealsPerHeart === 0) s.trust[id] = Math.min(T.trust.max, s.trust[id] + 1); }
  function recipe(s, id) {
    let parts = T.products[id].parts.slice(); if (s.swaps[id]) parts = parts.map(g => g === s.swaps[id][0] ? s.swaps[id][1] : g);
    if (s.freePart > 0 || active(s, 'outsource').length) { const missing = parts.findIndex(g => s.stock[g] === 0); parts.splice(missing < 0 ? parts.length - 1 : missing, 1); }
    return parts;
  }
  function canMake(s, id) { if (!T.products[id] || s.assembled >= s.factory || s.ended) return false; const count = {}; recipe(s, id).forEach(g => count[g] = (count[g] || 0) + 1); return Object.entries(count).every(([g, n]) => s.stock[g] >= n); }
  function metrics(s) { const partners = Object.values(s.deals).filter(n => n >= 2).length, allGauges = Math.min(...Object.values(s.gauges)), avgGauge = Object.values(s.gauges).reduce((a, b) => a + b, 0) / 3; return { partners, allGauges, avgGauge }; }
  function ending(s) { const m = metrics(s); return T.endings.find(e => ({ king: m.allGauges >= 4 && m.partners >= 2, war: s.stats.tradeWar && m.avgGauge < 3.5, richAlone: s.money >= 200 && (m.avgGauge < 3 || m.partners <= 1), island: s.stats.deals <= 3, rawOnly: s.stats.made <= 1, normal: true })[e.id]); }
  function dream(s) { return ({ phones: s.stats.products.phone >= 4, friends: Object.values(s.trust).filter(n => n >= 3).length >= 3, fullFood: s.gauges.food === 5, explorer: s.allMetYear !== null && s.allMetYear <= 5, partners: metrics(s).partners >= 4, evs: s.stats.products.ev >= 3 })[s.world.dream]; }
  function badges(s, p = {}) { return T.badges.filter(b => ({ king: s.ended === 'king', explorer: Object.keys(s.world.countries).every(slot => s.known.includes(slot)), allMaps: (p.maps || []).length === 4, allLands: Object.keys(p.countries || {}).length === 10, honest: !s.stats.unfair, chain: Object.values(s.stats.products).every(n => n > 0), dream: dream(s), allEndings: (p.endings || []).length === 6 })[b.id]).map(b => b.id); }
  function discover(s, slot) { if (!s.known.includes(slot)) s.known.push(slot); if (Object.keys(s.world.countries).every(k => s.known.includes(k)) && s.allMetYear === null) s.allMetYear = s.year; }
  function settle(s) {
    const before = { ...s.gauges }, arrivals = [], found = [];
    s.voyages.forEach(v => v.left--);
    for (const v of s.voyages.filter(v => v.left <= 0)) { if (v.explore) { discover(s, v.slot); found.push(v.slot); } else { for (const [g, n] of Object.entries(v.buy || {})) s.stock[g] += n; s.money += v.revenue || 0; } arrivals.push(v); }
    s.voyages = s.voyages.filter(v => v.left > 0);
    const use = {}, n = needs(s);
    const prep = n.grain === 0 && n.oil === 0;
    for (const [g, gauge] of [['grain', 'food'], ['oil', 'energy']]) { use[g] = Math.min(s.stock[g], n[g]); s.stock[g] -= use[g]; if (prep) continue; const rule = use[g] >= n[g] ? 'full' : use[g] >= n[g] / 2 ? 'half' : use[g] > 0 ? 'little' : 'none'; s.gauges[gauge] = clamp(s.gauges[gauge] + T.gaugeRules.need[rule]); }
    if (!prep) s.gauges.jobs = clamp(s.gauges.jobs + T.gaugeRules.jobs.find(r => s.jobMade >= r.made).d);
    s.stock.chip += T.home.chipPerYear + (s.tech ? T.tech.chipPerYear : 0);
    const deliveries = [];
    for (const c of s.contracts.filter(c => c.left > 0)) {
      const slot = country(s, c.id)[0], route = path(s, slot), cost = Math.ceil(price(s, c.id, c.good, true) * T.contract.discount * c.quantity) + (route?.toll || 0);
      const blocked = available(s, c.id) || active(s, 'embargo').some(m => m.value[0] === c.good);
      if (!blocked && route && s.money >= cost && s.supply[c.id][c.good] >= c.quantity) { s.money -= cost; s.supply[c.id][c.good] -= c.quantity; s.voyages.push({ id: c.id, slot, buy: { [c.good]: c.quantity }, revenue: 0, left: route.years, total: route.years, path: route.path, contract: true }); dealHeart(s, c.id); deliveries.push(c.good); } else deliveries.push('배송을 쉬었어요');
      c.left--;
    }
    s.contracts = s.contracts.filter(c => c.left > 0);
    s.mods.forEach(m => m.left--); s.mods = s.mods.filter(m => m.left > 0);
    const receipt = { year: s.year, before, after: { ...s.gauges }, use, required: n, prep, arrivals, found, made: s.assembled, money: s.money, deliveries, ordersDone: s.orders.filter(o => o.done && o.doneYear === s.year).map(o => ({ ...o })), ordersMissed: s.orders.filter(o => !o.done && o.until <= s.year).map(o => ({ ...o })) };
    s.history.push(receipt);
    if (s.year === T.years) s.ended = ending(s).id;
    else { s.year++; s.actions = T.actionsPerYear; s.assembled = 0; s.jobMade = 0; s.freePart = 0; s.attempts = {}; s.stats.soldYear = 0; begin(s); }
    return receipt;
  }
  function command(input, a) {
    const s = clone(input); let result = {}; const fail = message => ({ state: input, result: { ok: false, message } });
    if (s.ended) return fail('이번 항해는 끝났어요');
    if (a.type === 'event') {
      const ev = s.events[0]; if (!ev) return fail('소식이 없어요'); const n = T.news[ev.id] || T.nodes[ev.id], opts = n.choice || n.options;
      const o = opts?.find(o => o.key === a.key); if (opts && !o) return fail('선택을 골라 주세요');
      if (o) { effects(s, o, ev); if (T.chains[ev.root]?.branch === ev.id) { const k = `${ev.root}:${o.key}`; if (!s.found.includes(k)) s.found.push(k); } s.trail.push({ year: s.year, ...ev, title: n.title, pick: o.label }); }
      s.events.shift(); result.say = o?.say; return { state: s, result: { ok: true, ...result } };
    }
    if (s.events.length) return fail('세계 소식을 먼저 확인해 주세요');
    if (a.type === 'make') { if (!canMake(s, a.id)) return fail('부품이나 공장 칸이 모자라요'); recipe(s, a.id).forEach(g => s.stock[g]--); if (s.freePart > 0) s.freePart--; s.stock[a.id]++; s.assembled++; if (!active(s, 'outsource').length) s.jobMade += a.id === s.world.specialty ? 2 : 1; s.stats.made++; s.stats.products[a.id]++; }
    else if (a.type === 'end') result.receipt = settle(s);
    else {
      if (s.actions <= 0) return fail('올해 행동을 다 썼어요');
      if (a.type === 'trade' || a.type === 'contract') {
        const error = available(s, a.id); if (error) return fail(error); const [slot] = country(s, a.id), route = path(s, slot);
        if (a.type === 'contract') {
          const refusal = contractRefusal(s, a.id); if (refusal) return fail(refusal);
          const q = a.quantity; if (!Number.isInteger(q) || q <= 0 || q > (s.supply[a.id][a.good] || 0) || s.contracts.some(c => c.id === a.id && c.good === a.good)) return fail('계약 수량을 확인해 주세요');
          if (active(s, 'embargo').some(m => m.value[0] === a.good)) return fail('지금은 수출을 멈췄어요');
          s.contracts.push({ id: a.id, good: a.good, quantity: q, left: T.contract.years }); s.actions--;
        } else {
          if (!T.offers[a.offer] || !a.basket || !emptyShip(s)) return fail(!emptyShip(s) ? '배가 없어요' : '바구니를 확인해 주세요');
          const b = a.basket; let load = 0;
          for (const mode of ['buy', 'sell']) for (const [g, n] of Object.entries(b[mode] || {})) {
            if (!goods[g] || !Number.isInteger(n) || n < 0) return fail('바구니 수량을 확인해 주세요'); load += n;
            if (mode === 'buy' && (n > (s.supply[a.id][g] || 0) || (n && active(s, 'embargo').some(m => m.value[0] === g)))) return fail('올해 파는 물건이 모자라요');
            if (mode === 'sell' && (n > s.stock[g] || n > (s.demand[a.id][g] || 0))) return fail('팔 물건이 모자라요');
          }
          if (load < 1 || load > T.shipLoad) return fail(`한 배에는 ${T.shipLoad}개까지 실어요`);
          if ((s.attempts[a.id] || 0) >= 2) return fail('이 나라와 올해 협상은 끝났어요');
          const q = quote(s, a.id, b, a.offer); if (s.money < q.cost + route.toll) return fail('돈이 모자라요');
          if (!q.accepts) { s.attempts[a.id] = (s.attempts[a.id] || 0) + 1; if (s.attempts[a.id] === 2) s.actions--; result = { accepted: false, retry: s.attempts[a.id] < 2, mood: a.offer === 'low' ? 'angry' : 'thinking' }; }
          else { s.money -= q.cost + route.toll; for (const [g, n] of Object.entries(b.buy || {})) s.supply[a.id][g] -= n; for (const [g, n] of Object.entries(b.sell || {})) { s.stock[g] -= n; s.demand[a.id][g] -= n; s.sold[a.id] += n; if (T.products[g]) { s.stats.soldYear += n; fillOrder(s, a.id, g, n, result); } } for (const [g, n] of Object.entries(b.buy || {})) if (n && !['grain', 'oil'].includes(g) && !s.stats.partsFrom.includes(a.id)) s.stats.partsFrom.push(a.id); s.voyages.push({ id: a.id, slot, buy: b.buy || {}, sell: b.sell || {}, revenue: q.revenue, left: route.years, total: route.years, path: route.path }); dealHeart(s, a.id); if (a.offer === 'high') s.trust[a.id] = Math.min(T.trust.max, s.trust[a.id] + 1); s.actions--; s.attempts[a.id] = 2; result.accepted = true; result.firstDeal = s.stats.deals === 1; }
        }
      } else if (a.type === 'explore') {
        if (!s.world.slots[a.slot] || s.known.includes(a.slot) || !W.neighbors(s.world, a.slot).some(n => s.known.includes(n))) return fail('만난 곳 옆의 안개를 골라 주세요');
        if (!emptyShip(s)) return fail('배가 없어요'); if (s.voyages.some(v => v.explore && v.slot === a.slot)) return fail('이미 탐험 중이에요');
        const route = path(s, a.slot, true); if (!route) return fail('바닷길이 닫혔어요'); if (s.money < route.toll) return fail('통행료가 모자라요'); s.money -= route.toll;
        s.voyages.push({ slot: a.slot, explore: true, left: route.years, total: route.years, path: route.path }); s.actions--;
      } else if (a.type === 'break') {
        const c = s.contracts[a.index]; if (!c) return fail('계약이 없어요'); s.contracts.splice(a.index, 1); s.stats.unfair++; s.trust[c.id] = clamp(s.trust[c.id] - 2);
        W.neighbors(s.world, country(s, c.id)[0]).forEach(slot => { const id = s.world.countries[slot]?.id; if (id) s.trust[id] = clamp(s.trust[id] - 1); }); s.actions--; result.say = '약속을 끊었어요';
        s.contracts = s.contracts.filter(c => s.trust[c.id] > 0);
      } else if (a.type === 'invest') {
        const cost = { ship: T.shipCost, factory: T.factory.cost, tech: T.tech.cost }[a.id]; if (!cost || s.money < cost || (a.id === 'ship' && s.ships >= T.maxShips) || (a.id === 'factory' && s.factory >= T.factory.max) || (a.id === 'tech' && s.tech)) return fail('지금은 투자할 수 없어요');
        s.money -= cost; if (a.id === 'ship') s.ships++; if (a.id === 'factory') s.factory++; if (a.id === 'tech') s.tech = true; s.actions--;
      } else return fail('알 수 없는 행동이에요');
    }
    return { state: s, result: { ok: true, ...result } };
  }
  root.TradeEngine = { fresh, command, path, price, quote, available, contractYears, contractRefusal, canMake, recipe, needs, metrics, ending, dream, badges, matches, goods, haggle };
})(typeof window === 'undefined' ? globalThis : window);
