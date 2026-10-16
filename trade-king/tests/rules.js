/* 수량·협상·도착 순서·계약·사건·순수 함수를 직접 검증합니다. */
'use strict';
const assert = require('assert/strict'), { T, E } = require('./bots');
let s = E.fresh(7);
const first = JSON.stringify(s), id = 'hubCity';
let out = E.command(s, { type: 'trade', id, basket: { buy: { grain: -1 }, sell: {} }, offer: 'high' }); assert.equal(out.result.ok, false); assert.equal(JSON.stringify(s), first);
out = E.command(s, { type: 'trade', id, basket: { buy: { grain: 5 }, sell: {} }, offer: 'high' }); assert.equal(out.result.ok, false);
out = E.command(s, { type: 'trade', id, basket: { buy: { grain: 2, oil: 2 }, sell: {} }, offer: 'high' }); assert(out.result.accepted); assert.equal(JSON.stringify(s), first); s = out.state;
assert.equal(s.stock.grain, 0); assert.equal(s.actions, 2); assert.equal(s.voyages.length, 1);
s = E.command(s, { type: 'end' }).state; assert(s.history[0].prep); assert.equal(s.history[0].use.grain, 0); assert.equal(s.history[0].arrivals.length, 1); assert.equal(JSON.stringify(s.gauges), JSON.stringify(T.start.gauges), '1년째는 별이 움직이지 않음');
s.events = []; s = E.command(s, { type: 'end' }).state; assert.equal(s.history[1].use.grain, 2); assert.equal(s.history[1].use.oil, 2);
let t = E.fresh(7); t.trust[id] = 1; const trust = t.trust[id]; assert(!E.haggle(t, id).ok);
out = E.command(t, { type: 'trade', id, basket: { buy: { grain: 1 }, sell: {} }, offer: 'low' }); assert.equal(out.result.accepted, false); assert(out.result.retry); t = out.state; assert.equal(t.actions, 3); assert.equal(t.trust[id], trust);
out = E.command(t, { type: 'trade', id, basket: { buy: { grain: 1 }, sell: {} }, offer: 'low' }); assert.equal(out.result.retry, false); t = out.state; assert.equal(t.actions, 2); assert.equal(t.trust[id], trust);
assert.equal(E.command(t, { type: 'trade', id, basket: { buy: { grain: 1 } }, offer: 'high' }).result.ok, false);
t = E.fresh(7); t = E.command(t, { type: 'contract', id: 'factoryIsle', good: 'iron', quantity: 2 }).state;
assert.equal(t.voyages.length, 0); t = E.command(t, { type: 'end' }).state; assert.equal(t.voyages[0].contract, true); assert.equal(t.stock.iron, 0); assert.equal(t.contracts[0].left, 2);
let b = E.fresh(7); b = E.command(b, { type: 'contract', id: 'factoryIsle', good: 'iron', quantity: 1 }).state; b = E.command(b, { type: 'break', index: 0 }).state; assert.equal(b.stats.unfair, 1); assert.equal(b.trust.factoryIsle, 0);
let f = E.fresh(7); f.stock.chip = 2; f.stock.iron = 1; f.stock.rubber = 1; const actions = f.actions; f = E.command(f, { type: 'make', id: 'car' }).state; assert.equal(f.stock.car, 1); assert.equal(f.actions, actions); assert.equal(f.stock.chip, 1); assert(!E.canMake(f, 'car'));
f = E.fresh(7); f.swaps.phone = ['rare', 'chip']; f.stock.chip = 1; f.stock.lithium = 1; assert(!E.canMake(f, 'phone')); f.stock.chip = 2; assert(E.canMake(f, 'phone'));
let chain = E.fresh(7); chain.newsPlan = Array(12).fill(null); chain.events = [{ id: 'creditDue', root: 'creditDue', char: 'lithiumHigh' }];
chain = E.command(chain, { type: 'event', key: 'b' }).state; assert.equal(chain.pending[0].root, 'creditDue'); assert.equal(chain.trust.lithiumHigh, T.start.trustMet); chain = E.command(chain, { type: 'end' }).state; assert.equal(chain.events[0].id, 'promiseAngry'); chain = E.command(chain, { type: 'event', key: 'c' }).state; assert(chain.found.includes('creditDue:c'));
let frozen = E.fresh(0); frozen.known = Object.keys(frozen.world.slots); const north = Object.entries(frozen.world.countries).find(([, c]) => c.id === 'northIce'); if (north) { frozen.year = 3; assert.equal(E.path(frozen, north[0]), null); }
// 노드 자체 효과는 선택 전 한 번, 선택 효과는 선택할 때 적용합니다.
let node = E.fresh(7); node.newsPlan = Array(12).fill(null);
node.pending = [{ id: 'tariff2', year: 2, root: 'tariff' }];
node = E.command(node, { type: 'end' }).state;
assert.equal(node.mods.filter(m => m.key === 'buy').length, 1);
node = E.command(node, { type: 'event', key: 'b' }).state;
assert.equal(node.mods.filter(m => m.key === 'buy').length, 1);
assert(!node.mods.some(m => m.key === 'tariff'));
let refusal = E.fresh(7); refusal.newsPlan = Array(12).fill(null);
refusal = E.command(refusal, { type: 'contract', id, good: 'grain', quantity: 1 }).state;
refusal.trust[id] = 5;
refusal.pending = [{ id: 'badRumor', year: 2, root: 'defect' }];
refusal = E.command(refusal, { type: 'end' }).state;
assert.equal(E.contractYears(refusal), T.nodes.badRumor.noContract);
assert.equal(refusal.trust[id], Math.max(0, 5 + T.nodes.badRumor.trust.all));
assert.equal(refusal.contracts.length, 1);
refusal = E.command(refusal, { type: 'event' }).state;
refusal.events = [{ id: 'promiseAngry', root: 'creditDue', char: 'lithiumHigh' }];
refusal = E.command(refusal, { type: 'event', key: 'b' }).state;
assert.equal(E.contractYears(refusal), Math.max(T.nodes.badRumor.noContract, T.nodes.promiseAngry.options[1].noContract));
assert.equal(E.command(refusal, { type: 'contract', id, good: 'oil', quantity: 1 }).result.ok, false);
const years = E.contractYears(refusal);
refusal = E.command(refusal, { type: 'end' }).state;
assert.equal(E.contractYears(refusal), years - 1);
assert(refusal.voyages.some(v => v.contract && v.id === id));
// 짧은 거절이 다시 와도 남은 기간이 줄어들지 않습니다.
refusal.pending = [{ id: 'badRumor', year: refusal.year + 1, root: 'defect' }];
refusal.mods = [{ key: 'noContract', value: [1], left: 9 }];
refusal = E.command(refusal, { type: 'end' }).state;
assert.equal(E.contractYears(refusal), Math.max(8, T.nodes.badRumor.noContract));
let low = E.fresh(7); low.trust[id] = 1;
assert.equal(E.command(low, { type: 'contract', id, good: 'grain', quantity: 1 }).result.ok, false);
assert(E.command(low, { type: 'trade', id, basket: { buy: { grain: 1 } }, offer: 'high' }).result.ok);
low.trust[id] = 0;
assert.equal(E.command(low, { type: 'trade', id, basket: { buy: { grain: 1 } }, offer: 'high' }).result.ok, false);
let severed = E.fresh(7); severed.newsPlan = Array(12).fill(null);
severed = E.command(severed, { type: 'contract', id, good: 'grain', quantity: 1 }).state;
severed.trust[id] = 1;
severed.pending = [{ id: 'promiseAngry', year: 2, root: 'creditDue' }];
severed = E.command(severed, { type: 'end' }).state;
assert.equal(severed.trust[id], 0); assert.equal(severed.contracts.length, 0);
// 기존에 출발한 배송은 유지합니다.
assert(severed.voyages.some(v => v.id === id));
for (const sold of [0, 1, 3]) {
  let recall = E.fresh(7); recall.money = 10000; recall.stats.soldYear = sold;
  recall.events = [{ id: 'recall', root: 'defect', char: 'reporter' }]; recall.gauges.jobs += (T.nodes.recall.gauge?.jobs || 0);
  recall = E.command(recall, { type: 'event', key: 'a' }).state;
  assert.equal(recall.money, 10000 - Math.max(2, sold) * T.nodes.recall.options[0].recall);
  assert.equal(recall.gauges.jobs, Math.max(0, T.start.gauges.jobs + (T.nodes.recall.gauge?.jobs || 0) + (T.nodes.recall.options[0].gauge?.jobs || 0)));
}
assert(require('./bots').play(54).money + Object.values(require('./bots').play(54).gauges).reduce((a, b) => a + b, 0) * 40 > 0, '통행료를 못 내는 판매처에서 봇이 멈추지 않음');
// 관세는 큰 시장국의 완성품에만 3년, 시장 위축은 모든 수출에 명시된 기간만 적용됩니다.
let tariff = E.fresh(4); tariff.newsPlan = Array(12).fill(null); tariff.fta = []; tariff.mods = [];
tariff.pending = [{ id: 'tariff2', year: 2, root: 'tariff' }];
tariff = E.command(tariff, { type: 'end' }).state;
const plain = JSON.parse(JSON.stringify(tariff)); plain.mods = [];
for (const c of Object.values(tariff.world.countries)) for (const good of ['car', 'ev', 'phone', 'chip']) {
  const factor = T.nodes.tariff2.buy[1] * (c.id === 'bigMarket' && good !== 'chip' ? 0.5 : 1);
  assert(Math.abs(E.price(tariff, c.id, good, false) / E.price(plain, c.id, good, false) - factor) < 1e-9);
  assert.equal(E.price(tariff, c.id, good, true), E.price(plain, c.id, good, true));
}
let peace = E.command(tariff, { type: 'event', key: 'a' }).state;
while (peace.year < 5) { while (peace.events.length) peace = E.command(peace, { type: 'event' }).state; peace = E.command(peace, { type: 'end' }).state; }
assert(peace.events.some(ev => ev.id === 'warEnd'));
assert(!peace.mods.some(m => (m.key === 'tariff' || m.key === 'closed') && m.value[0] === 'bigMarket'));
assert(peace.mods.some(m => m.key === 'buy' && m.value[1] === T.nodes.tradeWar.buy[1]));
let expire = E.command(tariff, { type: 'event', key: 'c' }).state;
for (let i = 0; i < 3; i++) expire = E.command(expire, { type: 'end' }).state;
assert(!expire.mods.some(m => m.key === 'tariff'));
while (!expire.ended) expire = E.command(expire, { type: 'end' }).state;
assert.equal(expire.mods.find(m => m.key === 'buy' && m.value[0] === 'all')?.left || 0, Math.max(0, T.nodes.tariff2.buy[2] - (T.years - 1)));
// 무료 부품은 두 번의 부품 절약이며 공장의 연간 상한은 늘리지 않습니다.
let parts = E.fresh(7); parts.newsPlan = Array(12).fill(null); parts.factory = 4;
parts.stock.chip = 4; parts.stock.iron = 4; parts.stock.rubber = 0;
parts.events = [{ id: 'defect', root: 'defect', char: 'factoryIsle' }];
parts = E.command(parts, { type: 'event', key: 'a' }).state;
const limited = JSON.parse(JSON.stringify(parts)); limited.factory = 1;
assert.equal(E.command(E.command(limited, { type: 'make', id: 'car' }).state, { type: 'make', id: 'car' }).result.ok, false);
for (let i = 0; i < 2; i++) { const made = E.command(parts, { type: 'make', id: 'car' }); assert(made.result.ok); parts = made.state; }
assert.equal(parts.freePart, 0); assert.equal(parts.stock.rubber, 0); assert.equal(parts.stock.chip, 2);
assert.equal(E.command(parts, { type: 'make', id: 'car' }).result.ok, false);
parts.stock.rubber = 1; assert(E.command(parts, { type: 'make', id: 'car' }).result.ok);
parts = E.command(parts, { type: 'end' }).state; assert.equal(parts.freePart, 0);
// 밥상 별이 높아도 함께 거래한 나라 수에 따라 고립된 부자가 됩니다.
let rich = E.fresh(7); rich.money = 200; rich.gauges = { food: 5, energy: 5, jobs: 5 };
rich.deals = Object.fromEntries(Object.keys(rich.deals).map(id => [id, 0]));
assert.equal(E.ending(rich).id, 'richAlone');
rich.gauges = { food: 5, energy: 0, jobs: 0 };
Object.keys(rich.deals).slice(0, 3).forEach(id => rich.deals[id] = 2);
assert.equal(E.ending(rich).id, 'richAlone');
// 주문서: 사 주는 나라에 완성품을 팔면 주문이 채워지고 보너스·일자리 별
let ord = E.fresh(7); assert(ord.orders.length >= 1 && ord.orders.length <= T.orders.max); const o = ord.orders[0];
ord.known = Object.keys(ord.world.slots); ord.stock[o.product] = o.qty; const jobsBefore = ord.gauges.jobs, moneyBefore = ord.money;
const sale = E.command(ord, { type: 'trade', id: o.id, basket: { buy: {}, sell: { [o.product]: o.qty } }, offer: 'fair' }); assert(sale.result.ok, '주문 상대에게 판매'); assert(sale.result.orderDone, '주문 완료 결과');
assert.equal(sale.state.money, moneyBefore + o.bonus); assert.equal(sale.state.gauges.jobs, Math.min(5, jobsBefore + T.orders.jobs)); assert.equal(sale.state.stats.orders, 1);
// 흥정 규칙: 믿음이 기준 이상이면 깎기가 통한다 (변덕쟁이는 홀수 해만)
let hg = E.fresh(7); const [, hc] = Object.entries(hg.world.countries).find(([, c]) => c.id === id); hg.trust[id] = 5; hg.year = 1; assert(E.haggle(hg, id).ok); hg.year = 2; assert.equal(E.haggle(hg, id).ok, hc.personality !== 'fickle');
console.log('규칙 검사 통과: 기존 규칙·관세 대상/기간/휴전·무료 부품 2회/공장 상한·고립된 부자 조건');
