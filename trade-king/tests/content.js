/* 콘텐츠 보호: 그림 좌표와 데이터 구조(나라·물건·완성품·사건 키)가 기준과 같아야 합니다.
 * 2026-10 주문서 중심 개편에서 기준(data-before.txt)을 새로 잡았습니다. 숫자 조정은 보고서에 적습니다. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
function load(file) { const ctx = vm.createContext({ window: {} }); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx); return JSON.parse(JSON.stringify(ctx.window.TRADE)); }
const before = load(path.join(__dirname, 'data-before.txt')), after = load(path.join(__dirname, '../js/data.js'));
const slots = JSON.parse(fs.readFileSync(path.join(__dirname, '../../shared-art/trade/slots.json'), 'utf8'));
for (const [id, positions] of Object.entries(slots)) assert.deepEqual(after.maps[id].slots, positions, `그림 좌표 불일치: ${id}`);
for (const key of ['goods', 'products', 'countries', 'news', 'nodes', 'chains', 'personalities', 'dreams', 'badges']) assert.deepEqual(Object.keys(after[key]).sort(), Object.keys(before[key]).sort(), `구조 변경: ${key}`);
assert.equal(after.endings.length, before.endings.length);
for (const [id, c] of Object.entries(after.countries)) { assert.deepEqual(Object.keys(c.sells), Object.keys(before.countries[id].sells), `${id} 파는 것`); assert.deepEqual(Object.keys(c.buys), Object.keys(before.countries[id].buys), `${id} 사 주는 것`); }
console.log('콘텐츠 구조·그림 좌표 보호 통과');
