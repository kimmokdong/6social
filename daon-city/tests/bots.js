/* 실행: node daon-city/tests/bots.js — 돈을 추가하지 않고 서로 다른 산업 경로를 끝까지 검증한다. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ctx = vm.createContext({}); ctx.window = ctx;
for (const f of ['data.js', 'engine.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', f), 'utf8'), ctx);
const D = ctx.DAON_CITY, E = ctx.DaonEngine, B = D.buildings;
const plans = {
  '균형': [['textile','school','market','park'], ['expand','power','ship','house+'], ['univ','elec','house+','welfare'], ['expand','cleaner','semi','univ+'], ['it','green','house','welfare+'], ['content','house+','univ','car'], ['house','house+','car+','cleaner+']],
  '기술': [['textile','school','school+','market'], ['expand','power','ship','house+'], ['univ','elec','house+','univ+'], ['expand','semi','cleaner','power+','house'], ['it','green','semi+','house+'], ['it+','house','univ','welfare'], ['battery','green+','house+','cleaner+']],
  '문화': [['textile','school','market','park'], ['expand','power','ship','house+'], ['univ','elec','house+','welfare'], ['expand','cleaner','semi','univ+'], ['it','green','house','welfare+'], ['content','content+','house+','univ'], ['content','content+','house','it+']],
  '공장만': Array.from({ length: 7 }, (_, d) => Array(4).fill(d === 0 ? 'textile' : d < 3 ? 'steel' : 'semi')),
  '경공업': [['textile','textile','market','park'], ['expand','house+','textile','power'], ['textile','house+','welfare','textile+'], ['market+','cleaner','textile','house'], ['green','welfare+','textile+'], ['park','house+','textile+'], ['cleaner+','market','textile+']]
};
function bestAction(s, action) {
  if (action === 'expand') return E.expand(s);
  const upgrade = action.endsWith('+'), id = action.replace('+', ''), base = E.production(s);
  let best, score = -Infinity;
  s.tiles.forEach((t, i) => {
    const can = upgrade ? t.b === id && E.canUpgrade(s, i).ok : E.canPlace(s, id, i).ok;
    if (!can) return;
    const copy = JSON.parse(JSON.stringify(s));
    (upgrade ? E.upgrade(copy, i) : E.place(copy, id, i));
    const p = E.production(copy);
    let v = (p.exports-base.exports)*2 + (p.service-base.service)*2 + (p.education-base.education)*3 - (p.exposed.length-base.exposed.length)*5 - (p.pollution-base.pollution)*.3;
    if (B[id].homes) v -= E.production(copy).rows.reduce((n,r)=>n+r.pollution/(E.distance(i,r.i)+1),0);
    if (B[id].supply) v -= E.distance(i,28)*.01;
    if (!B[id].coastal && E.coastal(t.x,t.y)) v -= .5;
    if (v > score) { score=v; best=i; }
  });
  return best === undefined ? { ok:false } : upgrade ? E.upgrade(s,best) : E.place(s,id,best);
}
function play(plan, policy = 'a') {
  const s = E.newGame(), states = [], trace = [];
  for (let d=0;d<=E.LAST;d++) {
    const built=[], missed=[];
    for (const action of plan[d]) (bestAction(s,action).ok ? built : missed).push(action);
    states.push(JSON.parse(JSON.stringify(s)));
    const forecast=E.production(s), before=s.money, r=E.advance(s);
    if (r.exports!==forecast.exports || s.money!==Math.max(0,before+forecast.income)) throw Error('예상 생산 불일치');
    if (r.problem) E.applyFx(s,E.choiceEffects(s,r.problem,policy),r.problem[policy].label);
    const ev=D.eras[d].event; E.applyFx(s,E.choiceEffects(s,ev,policy),ev[policy].label);
    if (!E.valid(JSON.parse(JSON.stringify(s)))) throw Error('사건 저장 복원 실패');
    trace.push({era:d,built,missed,exports:r.exports,income:r.income,money:s.money,people:r.workers,skills:r.skilled,power:r.supply,needPower:r.energy,exposed:r.exposed.length,gauges:r.gauges});
    E.nextDecade(s);
  }
  return { id:E.ending(s).id, ending:E.ending(s).name, gauges:E.gauges(s), state:s, states, trace };
}
const out={};
if (require.main===module) for (const [name,plan] of Object.entries(plans)) {
  const r=play(plan);out[name]=r;
  console.log(`${name}: ${r.ending} · 경제 ${r.gauges.econ} 생활 ${r.gauges.life} 환경 ${r.gauges.env} 공정 ${r.gauges.fair} · 잔액 ${r.state.money}`);
  if(process.argv.includes('--trace')) console.log(JSON.stringify(r.trace));
}
module.exports={E,D,plans,play,bestAction};
