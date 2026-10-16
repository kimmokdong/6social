'use strict';
const assert = require('assert/strict'), { T, W } = require('./bots');
const forms = {}, combos = new Set();
for (let seed = 0; seed < 2000; seed++) {
  const w = W.create(seed); assert.equal(JSON.stringify(w), JSON.stringify(W.create(seed)));
  const ids = Object.values(w.countries).map(c => c.id), sells = new Set(['chip']);
  for (const id of ids) for (const g of T.countries[id].sells.any ? Object.keys(T.goods) : Object.keys(T.countries[id].sells)) sells.add(g);
  assert(T.coverage.needGoods.every(g => sells.has(g))); assert(Object.values(T.products).filter(p => p.parts.every(g => sells.has(g))).length >= T.coverage.minProducts); assert(ids.filter(id => Object.keys(T.countries[id].buys).length).length >= T.coverage.minBuyers);
  for (let year = 1; year <= T.years; year++) for (const g of T.coverage.needGoods) {
    const supply = ids.reduce((n, id) => n + (T.countries[id].frozenYears?.includes(year) ? 0 : T.countries[id].sells[g] || T.countries[id].sells.any || 0), 0);
    assert(supply >= (T.needs.filter(n => n.from <= year).at(-1)?.[g] || 0), `생활 물량 부족: ${seed}/${year}/${g}`);
  }
  assert.equal(ids.length, T.countriesPerGame); assert.equal(new Set(ids).size, ids.length);
  for (const slot of Object.keys(w.slots)) assert(W.route(w, slot));
  // 곡물·석유를 파는 나라는 처음부터 만난 이웃이어야 한다
  for (const g of T.coverage.needGoods) assert(w.known.some(slot => w.countries[slot] && (T.countries[w.countries[slot].id].sells[g] || T.countries[w.countries[slot].id].sells.any)), `시작 이웃에 ${g} 없음: ${seed}`);
  for (const [slot, id] of Object.entries(T.maps[w.mapId].fixed || {})) assert.equal(w.countries[slot].id, id);
  const key = `${w.mapId}/${w.flip}`; forms[key] = (forms[key] || 0) + 1; combos.add(ids.sort().join(','));
}
assert.equal(Object.keys(forms).length, 16);
require('fs').writeFileSync(require('path').join(__dirname, 'worlds-result.json'), JSON.stringify({ seeds: 2000, forms, combinations: combos.size }, null, 2));
console.log('2000개 씨앗: coverage·거리≤3·모든 항로·고정 나라·재현성 통과'); console.table(forms); console.log('나라 조합', combos.size);
