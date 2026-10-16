/* 화면과 같은 command만 사용하는 전략별 플레이어. 숨은 값은 보지 않습니다. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({}); ctx.window = ctx;
for (const f of ['data', 'world', 'engine']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', f + '.js'), 'utf8'), ctx);
const T = ctx.TRADE, E = ctx.TradeEngine, W = ctx.TradeWorld;
function fair(s, ev) { const n = T.news[ev.id] || T.nodes[ev.id]; return ({ tariff: 'b', defect: 'b', creditOffer: 'a', creditDue: 'a', exportBan: 'b', fta: 'a', outsource: 'b', blockade: 'c' })[ev.id] || (n.choice || n.options)?.find(o => !o.unfair)?.key; }
function choices(s, mode, r, override) {
  while (s.events.length) {
    const ev = s.events[0], n = T.news[ev.id] || T.nodes[ev.id], opts = n.choice || n.options;
    let key = override?.(s, ev);
    if (!key && opts) key = mode === 'random' ? W.pick(opts, r).key : mode === 'unfair' ? (opts.find(o => o.unfair) || opts[0]).key : fair(s, ev);
    s = E.command(s, { type: 'event', key }).state;
  }
  return s;
}
function make(s, mode) {
  if (mode === 'raw' || mode === 'island') return s;
  for (let i = 0; i < T.factory.max; i++) {
    const id = [s.world.specialty, ...Object.keys(T.products)].find(g => E.canMake(s, g));
    if (!id) break; s = E.command(s, { type: 'make', id }).state;
  }
  return s;
}
const met = s => Object.entries(s.world.countries).filter(([slot, c]) => s.known.includes(slot) && !E.available(s, c.id));
function trade(s, id, buy, sell) {
  let result;
  for (const offer of ['fair', 'high']) { result = E.command(s, { type: 'trade', id, basket: { buy, sell }, offer }); s = result.state; if (!result.result.ok || result.result.accepted || !result.result.retry) break; }
  return { state: s, ok: result?.result.accepted };
}
function plan(s, mode, r) {
  if (mode === 'island') return null;
  // 반칙 전략은 사건뿐 아니라 계약 약속도 첫 배송 뒤에 끊습니다.
  if (mode === 'unfair') { const index = s.contracts.findIndex(c => c.left < T.contract.years); if (index >= 0) return { type: 'break', index }; }
  const known = met(s), n = E.needs(s);
  // 배를 쓰지 않는 정기편으로 생활과 공장의 공급을 안정시킵니다.
  const pipeline = g => s.voyages.reduce((v, b) => v + (b.buy?.[g] || 0), 0);
  const renewable = g => s.contracts.filter(c => c.good === g && c.left > 0).reduce((v, c) => v + c.quantity, 0);
  const production = Object.keys(T.products).sort((a, b) => {
    const score = id => { const p = T.products[id], parts = p.parts.filter(g => g !== 'chip'); const supply = Math.min(...parts.map(g => known.reduce((q, [, c]) => q + (T.countries[c.id].sells[g] || T.countries[c.id].sells.any || 0), 0)), 2); return supply * (p.price + (id === s.world.specialty ? 15 : 0) - parts.reduce((q, g) => q + T.goods[g].price, 0)) + parts.reduce((q, g) => q + renewable(g) * 10, 0); }; return score(b) - score(a);
  })[0];
  const targetParts = T.products[production].parts.filter(g => g !== 'chip');
  const desired = ['grain', 'oil', ...(mode === 'raw' ? [] : targetParts)];
  const frontier = Object.keys(s.world.slots).filter(slot => !s.known.includes(slot) && W.neighbors(s.world, slot).some(n => s.known.includes(n)) && !s.voyages.some(v => v.explore && v.slot === slot) && E.path(s, slot, true));
  const explore = () => frontier.length && s.voyages.filter(v => !v.contract).length < s.ships ? { type: 'explore', slot: frontier.sort((a, b) => E.path(s, a, true).years - E.path(s, b, true).years || W.neighbors(s.world, b).length - W.neighbors(s.world, a).length)[0] } : null;
  let best = null;
  for (const [, c] of known) {
    if ((s.attempts[c.id] || 0) >= 2) continue;
    if (E.path(s, Object.entries(s.world.countries).find(([, v]) => v.id === c.id)[0]).toll > s.money) continue;
    const sell = {}, maxChip = mode === 'raw' ? s.stock.chip : Math.max(0, s.stock.chip - 2); let load = 0, value = 0;
    for (const g of [...Object.keys(T.products), 'chip']) { const q = Math.min(g === 'chip' ? maxChip : s.stock[g], s.demand[c.id][g] || 0, T.shipLoad - load); if (q > 0) { sell[g] = q; load += q; value += q * E.goods[g].price * T.countries[c.id].market; } }
    if (load && (!best || value > best.value)) best = { type: 'trade', id: c.id, basket: { buy: {}, sell }, value };
  }
  // 운영자금이 부족하면 수입 계약에 앞서 재고를 팔아 배송 대금을 마련합니다.
  if (best && s.money < 140 && s.voyages.filter(v => !v.contract).length < s.ships) return best;
  const nextNeeds = (T.needs.filter(v => v.from <= Math.min(T.years, s.year + 1)).at(-1) || { grain: 0, oil: 0 });
  const ranked = desired.map(g => ({ g, target: g === 'grain' || g === 'oil' ? nextNeeds[g] : 1, value: g === 'grain' || g === 'oil' ? (s.gauges[g === 'grain' ? 'food' : 'energy'] < 4 ? 5 : 3) : 2 })).sort((a, b) => b.value - a.value);
  for (const { g, target } of ranked) {
    if (s.mods.some(m => m.key === 'embargo' && m.value[0] === g)) continue;
    if (g !== 'grain' && g !== 'oil' && s.year < T.years - 4 && ['grain', 'oil'].some(k => !known.some(([, c]) => s.supply[c.id][k] > 0))) { const a = explore(); if (a) return a; }
    if (g !== 'grain' && g !== 'oil' && s.money < 90 && (s.stock.chip > 2 || Object.keys(T.products).some(p => s.stock[p]))) continue;
    if (renewable(g) >= target || s.stock[g] + pipeline(g) > target * 5) continue;
    const suppliers = known.filter(([, c]) => s.supply[c.id][g] > 0 && !s.contracts.some(k => k.id === c.id && k.good === g)).sort((a, b) => E.path(s, a[0]).years - E.path(s, b[0]).years || T.countries[a[1].id].sells.any - T.countries[b[1].id].sells.any);
    for (const [slot, c] of suppliers) {
      const q = Math.min(target - renewable(g), s.supply[c.id][g]);
      const cost = Math.ceil(E.price(s, c.id, g, true) * q * .9) + E.path(s, slot).toll;
      if (!E.contractRefusal(s, c.id) && s.money >= cost + (g === 'grain' || g === 'oil' ? 0 : 25)) return { type: 'contract', id: c.id, good: g, quantity: q };
      if (E.contractRefusal(s, c.id) && s.stock[g] + pipeline(g) < target && (s.attempts[c.id] || 0) < 2 && s.voyages.filter(v => !v.contract).length < s.ships) {
        const quantity = Math.min(target - s.stock[g] - pipeline(g), q, T.shipLoad);
        const basket = { buy: { [g]: quantity }, sell: {} };
        if (quantity > 0 && s.money >= E.quote(s, c.id, basket, 'high').cost + E.path(s, slot).toll) return { type: 'trade', id: c.id, basket };
      }
    }
  }
  // 판매할 완성품부터 싣고, 여유 반도체로 초기 자금을 마련합니다.
  if (best && s.voyages.filter(v => !v.contract).length < s.ships) return best;
  if (E.command(s, { type: 'invest', id: 'ship' }).result.ok && s.ships < 3 && s.money > 130) return { type: 'invest', id: 'ship' };
  if (s.year < T.years - 2) { const a = explore(); if (a) return a; }
  if (s.money > 180 && s.ships < T.maxShips) return { type: 'invest', id: 'ship' };
  return null;
}
function randomPlan(s, r) {
  const candidates = [];
  for (const [slot, c] of met(s)) {
    for (const [g, max] of Object.entries(s.supply[c.id])) if (max) candidates.push({ type: 'trade', id: c.id, basket: { buy: { [g]: 1 + Math.floor(r() * Math.min(max, 3)) }, sell: {} } });
    for (const [g, max] of Object.entries(s.demand[c.id])) if (max && s.stock[g]) candidates.push({ type: 'trade', id: c.id, basket: { buy: {}, sell: { [g]: Math.min(max, s.stock[g], 3) } } });
    if (r() < .5) for (const g of ['grain', 'oil']) if (s.supply[c.id][g]) candidates.push({ type: 'contract', id: c.id, good: g, quantity: Math.min(2, s.supply[c.id][g]) });
  }
  for (const slot of Object.keys(s.world.slots)) if (!s.known.includes(slot)) candidates.push({ type: 'explore', slot });
  for (const id of ['ship', 'factory', 'tech']) candidates.push({ type: 'invest', id });
  return candidates.length ? W.pick(candidates, r) : null;
}
function year(s, mode, r) {
  s = make(s, mode); let guard = 0;
  while (s.actions && guard++ < 15) {
    const a = mode === 'random' ? (r() < .5 ? plan(s, 'balanced', r) : randomPlan(s, r)) : plan(s, mode, r); if (!a) break;
    if (a.type === 'trade') { const out = trade(s, a.id, a.basket.buy, a.basket.sell); if (out.state === s) break; s = out.state; }
    else { const out = E.command(s, a); if (!out.result.ok) { if (mode !== 'random') break; continue; } s = out.state; }
    s = make(s, mode);
  }
  return E.command(s, { type: 'end' }).state;
}
function play(seed, mode = 'balanced', override, initial) {
  let s = initial || E.fresh(seed); const r = W.rng(seed + 99);
  while (!s.ended) { s = choices(s, mode, r, override); s = year(s, mode, r); }
  return s;
}
module.exports = { T, E, W, play, year, choices, fair, trade, plan };
