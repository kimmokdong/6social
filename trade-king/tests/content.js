/* 기존 콘텐츠 보호에 FIX-1에서 승인한 글·사슬 수치 변경만 더합니다. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
function load(file) { const ctx = vm.createContext({ window: {} }); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx); return JSON.parse(JSON.stringify(ctx.window.TRADE)); }
const before = load(path.join(__dirname, 'data-before.txt')), after = load(path.join(__dirname, '../js/data.js')), changes = [];
const slots = JSON.parse(fs.readFileSync(path.join(__dirname, '../../shared-art/trade/slots.json'), 'utf8'));
for (const [id, positions] of Object.entries(slots)) assert.deepEqual(after.maps[id].slots, positions, `그림 좌표 불일치: ${id}`);
const approvedText = new Set([
  'news.defect.text', 'news.defect.choice.0.say', 'endings.2.story',
  'nodes.tariff2.text', 'nodes.tariff2.options.1.say', 'nodes.tariff2.options.2.say',
  'nodes.tradeWar.text', 'nodes.warEnd.text'
]);
function compare(a, b, key) {
  if (a === b) return;
  if (key === 'nodes.tariff2.options.2.fx' && a === undefined) { assert.deepEqual(b, { money: -80 }); changes.push({ path: key, before: null, after: b }); return; }
  if (typeof a === 'number' && typeof b === 'number') {
    if (/^maps\.[^.]+\.slots\.[^.]+\.[01]$/.test(key)) return;
    assert(/^(nodes\.|news\.(tariff|defect|creditDue|creditOffer)\.)/.test(key), `사슬 밖 숫자 변경 금지: ${key}`);
    const choice = key.match(/^news\.([^.]+)\.choice\.(\d+)\./);
    if (choice) assert(before.news[choice[1]].choice[choice[2]].unfair, `공정한 길 변경 금지: ${key}`);
    changes.push({ path: key, before: a, after: b }); return;
  }
  assert.equal(typeof a, typeof b, key);
  if (a && typeof a === 'object') { const keys = key === 'nodes.tariff2.options.2' ? Object.keys(b).filter(k => k !== 'fx') : Object.keys(b); assert.deepEqual(Object.keys(a), keys, `구조 변경 금지: ${key}`); for (const k of Object.keys(b)) compare(a[k], b[k], key ? `${key}.${k}` : k); }
  else { assert(approvedText.has(key), `승인 밖 글 변경 금지: ${key}`); changes.push({ path: key, before: a, after: b }); }
}
compare(before, after, '');
const fixedBefore = load(path.join(__dirname, 'fix1-data-before.txt'));
function protect(a, b, key = '') {
  if (a === b) return;
  if (key === 'nodes.tariff2.options.2.fx' && a === undefined) { assert.deepEqual(b, { money: -80 }); return; }
  if (typeof a === 'number' && typeof b === 'number') { assert(/^nodes\./.test(key), `FIX-1 사슬 밖 숫자 변경: ${key}`); return; }
  if (a && typeof a === 'object') { const keys = key === 'nodes.tariff2.options.2' ? Object.keys(b).filter(k => k !== 'fx') : Object.keys(b); assert.deepEqual(Object.keys(a), keys, key); for (const k of Object.keys(b)) protect(a[k], b[k], key ? `${key}.${k}` : k); }
  else assert(approvedText.has(key), `FIX-1 승인 밖 변경: ${key}`);
}
protect(fixedBefore, after);
assert.deepEqual(after.nodes.tariff2.effect.tariff, ['bigMarket', ['car', 'ev', 'phone'], 0.5, 3]);
assert.equal(after.nodes.warEnd.removeTariff, 'bigMarket');
assert(after.nodes.tariff2.buy[1] > 0 && after.nodes.tariff2.buy[1] < 1);
assert(after.news.defect.text.includes('두 번') && after.news.defect.text.includes('공장 칸 수는 그대로'));
assert(after.news.defect.choice[0].say.includes('두 번') && after.news.defect.choice[0].say.includes('부품 하나'));
assert(after.endings[2].story.includes('국민 생활이 부족하거나 함께할 친구 나라가 적어요'));
assert(!fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8').includes('문장'));
fs.writeFileSync(path.join(__dirname, 'data-changes.json'), JSON.stringify(changes, null, 2));
console.table(changes); console.log('FIX-1 승인 범위·관세·부품·엔딩·쉬운 말 검사 통과');
