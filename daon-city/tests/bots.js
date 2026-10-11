/* 실행: node daon-city/tests/bots.js — 실제 엔진으로 4가지 봇 플레이 결과 보고 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({});
ctx.window = ctx;
for (const f of ['../js/data.js', '../js/engine.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx);
const D = ctx.DAON_CITY, E = ctx.DaonEngine, B = D.buildings;

/* 배치 요령: 공장은 항구·고속도로 옆, 공원은 가장 오염된 건물 옆, 주택·학교는 공장에서 멀리 */
function bestTile(s, id) {
  let best = -1, score = -Infinity;
  s.tiles.forEach((t, i) => {
    if (!E.canPlace(s, id, i).ok) return;
    const ns = E.neighbors(i).map(j => s.tiles[j].b);
    let v = 0;
    if (B[id].factory) v += (ns.includes('port') ? 5 : 0) + (ns.includes('road') ? 5 : 0) - (ns.includes('house') ? 3 : 0) + ns.filter(n => n === 'park').length;
    if (id === 'port' || id === 'road') v += ns.filter(n => n && B[n].factory).length * 4 + E.neighbors(i).filter(j => !s.tiles[j].b && E.buildable(s.tiles[j].x, s.tiles[j].y)).length;
    if (id === 'park') v += ns.reduce((a, n) => a + (n ? (B[n].pol || 0) : 0), 0) * 3;
    if (['house', 'school', 'univ', 'welfare', 'market'].includes(id)) v -= ns.filter(n => n && (B[n].pol || 0) >= 1).length * 4;
    if ((B[id].pol || 0) >= 2) v -= ns.filter(n => n === 'house').length * 6;
    if (!B[id].coastal && E.coastal(t.x, t.y)) v -= 2; // 해안은 아껴 두기
    v -= t.y * 0.01 + t.x * 0.001;
    if (v > score) { score = v; best = i; }
  });
  return best;
}
function play(plan, policy) {
  const s = E.newGame();
  for (let d = 0; d <= E.LAST; d++) {
    for (const id of plan[d]) {
      if (E.slotsLeft(s) <= 0) break;
      const i = bestTile(s, id);
      if (i >= 0) E.place(s, id, i);
    }
    const r = E.advance(s);
    if (r.problem) E.applyFx(s, r.problem[policy].fx, r.problem[policy].label);
    const ev = D.eras[d].event[policy];
    E.applyFx(s, ev.fx, ev.label);
    E.nextDecade(s);
  }
  return { ending: E.ending(s).name, gauges: E.gauges(s, E.LAST), history: E.historyScore(s), money: s.money, tech: s.tech };
}
const bots = {
  '균형': [['port','textile','school','school'],['power','steel','school','park'],['car','univ','park','welfare'],['semi','elec','welfare','park'],['it','green','cleaner','semi'],['content','semi','park','cleaner'],['battery','it','welfare','park']],
  '역사 그대로': [['port','textile','school'],['power','steel','school'],['car','elec','univ','road'],['semi','elec','univ','ship'],['it','semi','car','chem'],['content','semi','it','car'],['battery','semi','it','content']],
  '성장': [['port','textile','textile','school'],['power','steel','road','ship'],['car','elec','chem','univ'],['semi','ship','elec'],['it','car','chem'],['content','semi'],['battery','semi']],
  '교육 없음': [['port','textile','textile','market'],['power','steel','road','ship'],['car','elec','chem'],['ship','elec','car'],['car','chem','steel'],['steel','ship'],['car','elec']],
  '환경': [['park','school','market','park'],['park','school','market'],['univ','park','welfare'],['park','school','cleaner'],['green','it','park'],['content','park'],['park','cleaner']]
};
const out = {};
for (const [name, plan] of Object.entries(bots)) for (const policy of ['a', 'b']) {
  const r = play(plan, policy);
  out[`${name}+${policy}`] = r;
  console.log(`${name.padEnd(6)} ${policy === 'a' ? '좋은 선택' : '성장 선택'}: ${r.ending.padEnd(10)} 역사 ${r.history}/7  경제 ${r.gauges.econ} 생활 ${r.gauges.life} 환경 ${r.gauges.env} 공정 ${r.gauges.fair}  (돈 ${r.money}, 기술 ${r.tech})`);
}
module.exports = out;
