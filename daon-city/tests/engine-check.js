/* 실행: node daon-city/tests/engine-check.js — v2의 생산·입지·저장·7시대 회귀 검사 */
'use strict';
const assert=require('node:assert/strict');
const {E,D,plans,play}=require('./bots');
const plain=x=>JSON.parse(JSON.stringify(x));
const fixture=(d=0)=>{const s=E.newGame();s.d=d;s.money=1000;s.land=2;return s;};
const put=(s,id,i)=>assert.equal(E.place(s,id,i).ok,true,`${id}@${i}`);
assert.equal(E.valid(E.newGame()),true);
const base=E.newGame();assert.equal(E.slotsLeft(base),10);
assert.equal(E.canPlace(base,'house',10).reason,'land');
assert.equal(E.canPlace(base,'port',14).reason,'coast');
assert.equal(E.cardStatus(base,'semi').reason,'era');
assert.equal(E.expand(base).ok,false);
for(const [id,b] of Object.entries(D.buildings)) {
 assert.ok(Number.isFinite(b.upkeep),id);
 if(b.exp) for(const k of ['jobs','energy','skilled']) assert.ok(Number.isFinite(b[k]),`${id}.${k}`);
}
// 사람·전력·기술을 여러 공장에 중복 배정하지 않는다.
const labour=fixture();put(labour,'textile',21);put(labour,'textile',22);put(labour,'textile',23);
assert.ok(E.production(labour).industries.every(r=>r.rate===2/3));
const a=plain(labour), p=E.production(labour);E.production(labour);assert.deepEqual(plain(labour),a);
put(labour,'house',10);put(labour,'power',28);assert.ok(E.production(labour).exports>p.exports);
const power=fixture(1);power.people=20;put(power,'house',10);put(power,'steel',21);put(power,'steel',22);
assert.ok(E.production(power).industries.every(r=>r.rate===1/3));put(power,'power',28);assert.equal(E.production(power).industries[0].rate,1);
// 교육 효과는 다음 시대에 나타나고 범위 밖 주택은 세지 않는다.
const education=fixture(2);put(education,'school',7);put(education,'univ',15);put(education,'elec',28);
const before=E.production(education);assert.equal(before.skilled,0);assert.equal(before.education,4);assert.equal(before.exports,0);
const money=education.money, res=E.advance(education);
assert.equal(res.exports,before.exports);assert.equal(res.income,before.income);assert.equal(education.money,money+before.income);assert.equal(education.tech,2);
E.nextDecade(education);assert.equal(E.production(education).skilled,2);assert.ok(E.production(education).exports>0);
const remote=fixture();put(remote,'school',34);assert.equal(E.production(remote).education,0);
const duplicate=fixture();put(duplicate,'school',7);put(duplicate,'school',14);put(duplicate,'school',10);assert.equal(E.production(duplicate).education,4);
// 같은 산업의 수출 기회, 물류·정화 처리량, 생활시설 정원.
const orders=fixture();orders.people=20;
for(const i of [10,11,12])put(orders,'house',i);
put(orders,'power',34);for(const i of [21,22,23,24])put(orders,'textile',i);
assert.equal(E.production(orders).exports,D.rules.demand.light[0]);
const log=fixture(1);log.people=20;log.tech=20;for(const i of [10,11,12])put(log,'house',i);put(log,'power',34);
for(const i of [21,29,31])put(log,'steel',i);const pre=E.production(log).exports;put(log,'road',30);assert.ok(E.production(log).exports-pre<=6.01);
const clean=fixture(3);clean.people=20;put(clean,'house',10);put(clean,'power',34);put(clean,'steel',21);put(clean,'steel',22);
const pol=E.production(clean).pollution;put(clean,'cleaner',28);assert.equal(pol-E.production(clean).pollution,4);
const park=fixture(1);put(park,'steel',21);const raw=E.production(park).pollution;put(park,'park',28);assert.equal(E.production(park).pollution,raw);
const service=fixture();put(service,'market',7);put(service,'market',10);assert.ok(E.production(service).marketIncome<=E.production(service).workers);
// 증축·전환·이전·철거·확장은 비용까지 전액 되돌린다.
for(const operation of [s=>E.upgrade(s,8),s=>E.move(s,8,15),s=>E.demolish(s,8)]) {
 const s=E.newGame(), snap=plain(s);assert.equal(operation(s).ok,true);assert.equal(E.valid(s),true);assert.equal(E.undo(s).ok,true);assert.deepEqual(plain(s),snap);
}
const convert=fixture(2);put(convert,'textile',21);const original=plain(convert);assert.equal(E.convert(convert,'car',21).ok,true);assert.equal(convert.tiles[21].b,'car');E.undo(convert);assert.deepEqual(plain(convert),original);
const land=E.newGame();land.d=1;const l0=E.slotsLeft(land);assert.equal(E.expand(land).ok,true);assert.equal(E.slotsLeft(land)-l0,8);assert.equal(land.money,13);E.undo(land);assert.equal(land.land,0);land.d=3;E.expand(land);E.expand(land);assert.equal(E.slotsLeft(land),30);
const ghost=fixture();put(ghost,'port',28);const snapshot=plain(ghost);assert.equal(E.preview(ghost,'textile',21).exports,6);assert.deepEqual(plain(ghost),snapshot);
// 변조·옛 형식·손상된 되돌리기 기록은 저장 경계에서 거부한다.
for(const mutate of [s=>s.v=1,s=>s.tiles[8].b='missing',s=>s.tiles[8]=null,s=>s.money=null,s=>s.d=99,s=>s.actions=[{type:'move',cost:2,i:8,to:999,land:0,placed:[],tile:s.tiles[8]}],s=>s.records=[{}]]) {
 const s=E.newGame();mutate(s);assert.equal(E.valid(s),false);
}
const results={};
for(const [name,plan] of Object.entries(plans)) {
 const r=play(plan);results[name]=r;assert.equal(r.state.records.length,7);assert.equal(E.valid(plain(r.state)),true);assert.ok(r.trace.every(t=>Number.isFinite(t.exports)&&Number.isFinite(t.income)));
 for(const s of r.states){assert.equal(E.valid(s),true);assert.deepEqual(plain(E.production(plain(s))),plain(E.production(s)));}
 console.log(`${name}: ${r.ending} · 경제 ${r.gauges.econ} 환경 ${r.gauges.env}`);
}
assert.ok(results['기술'].gauges.econ>results['공장만'].gauges.econ);
assert.equal(results['공장만'].id,'stuck');
assert.equal(new Set(Object.values(results).map(r=>r.id)).size>=3,true);
assert.equal(results['균형'].id,'together');
assert.equal(results['기술'].id,'tech');
assert.equal(results['문화'].id,'creative');
// 엔딩 조건마다 실제로 놓을 수 있는 지도와 운영 조건이 존재한다.
function endingCity(ids, service=true) {
 const s=fixture(6);s.tech=30;
 s.tiles.forEach(t=>{t.b=null;t.at=-1;});
 for(const i of [7,8,9,10,11,12]) {put(s,'house',i);E.upgrade(s,i);}
 for(const i of [14,17,19]) {put(s,'univ',i);E.upgrade(s,i);}
 for(const i of [20,21]) {put(s,'green',i);E.upgrade(s,i);}
 if(service) for(const i of [15,18]) {put(s,'welfare',i);E.upgrade(s,i);}
 for(const id of ids) {const i=s.tiles.findIndex((t,i)=>i>=22&&E.canPlace(s,id,i).ok);put(s,id,i);}
 return s;
}
const cases={
 tech:endingCity(['semi','semi','it','cleaner']),
 creative:endingCity(['content','content','it']),
 export:endingCity(['car','car','car','ship','ship']),
 gray:endingCity(['steel','steel','ship','car','car']),
 unfair:endingCity(['car','car','semi','ship','cleaner'],false),
 grown:endingCity(['car','ship','elec','cleaner']),
 stuck:endingCity([])
};
cases.unfair.people=24;cases.unfair.bonus.fair=-20;
for(const [id,s] of Object.entries(cases))assert.equal(E.ending(s).id,id);
// 사건 중 저장도 완주 직전 저장도 숫자·범위가 없으면 거부한다.
const event=E.newGame();E.advance(event);const bad=plain(event);delete bad.last.categories;assert.equal(E.valid(bad),false);
const polluted=fixture(1);put(polluted,'steel',21);E.advance(polluted);
assert.ok(Math.abs(E.choiceEffects(polluted,D.eras[1].event,'b').money)>0);
console.log('PASS: 인구·교육·전력·수출기회·물류·정화·생활범위·증축·전환·이전·확장·저장·7시대');
