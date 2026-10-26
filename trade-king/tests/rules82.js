/* 8.2 계약서 창고 전망(1년 합계·모자라는 달): node trade-king/tests/rules82.js */
const assert=require('node:assert/strict'),E=require('../js/engine6'),P=E.player;
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
const clear=G=>{while(G.pending)E.choose(G,G.pending.type==='event'?0:null);};
const game=(id='market',seed=82)=>{const G=E.newGame(seed,id);clear(G);G.plan=[];G.lanes={};G.small.next=1e9;for(const n of G.nations.slice(1))n.ships=[];P(G).augments=[];return G;};  // 항로 특징(폭풍·해류)은 우연이라 뺀다
const one=(g,k)=>E.GOODS.map(x=>x===g?k:0);
const copy=G=>JSON.parse(JSON.stringify(G));
// 실제로 하루씩 돌려 계약 마지막 날의 정산까지 지난 창고를 잰다
// 옷을 사 주는 이웃 나라(돈·창고 넉넉히): 팔다 남아 돌아오는 짐이 없게
const buyer=(G,g)=>{const o=G.nations.slice(1).find(o=>E.buys(G,o,g));o.money=99999;o.box[g]=[0,0,0,0];return o;};
const play=(G,g,until)=>{const n=P(G);let low=E.count(n,g);while(E.today(G)<=until&&!G.over){clear(G);E.tickDay(G);low=Math.min(low,E.count(n,g));}return {end:E.count(n,g),low};};

test('이웃 나라에 옷을 팔면: 1년 합계와 끝날 때 창고가 실제 진행과 같다',()=>{
  const G=game(),n=P(G),g=2,o=buyer(G,g),from=E.today(G),until=from+364,r={to:o.id,give:one(g,2),get:one(g,0)};
  n.box[g]=[0,0,20,0];
  const w=E.outlook(G,n,n.ships[0],r,from,until),trips=E.fitTrips(G,n,{to:o.id,until},from),x=w.goods[g];
  assert.equal(w.trips,trips);
  assert.equal(x.mine,-2*trips);
  assert.equal(x.made,E.produces(G,n,g)*w.seasons);
  assert.equal(x.used,E.uses(G,n)[g]*w.seasons);
  assert.equal(x.end,x.stock+x.made-x.used+x.others+x.mine-x.waste);
  const H=copy(G);assert.ok(E.setRoute(H,0,{to:o.id,give:r.give,get:null}));
  assert.equal(play(H,g,until).end,x.end);
});
test('다른 배에 이미 맺은 수출은 다른 계약으로 빠진다',()=>{
  const G=game(),n=P(G),g=2,from=E.today(G),until=from+364;
  n.box[g]=[0,0,30,0];
  const o=buyer(G,g);assert.ok(E.setRoute(G,0,{to:o.id,give:one(g,2),get:null}));
  const w=E.outlook(G,n,n.ships[1],{to:o.id,give:one(g,1),get:one(g,0)},from,until).goods[g];
  assert.ok(w.others<0,'배 1 수출이 빠짐');
  assert.equal(w.end,w.stock+w.made-w.used+w.others+w.mine-w.waste);
});
test('너무 많이 실으면 처음 모자라는 날과 상자 수를 알려 준다',()=>{
  const G=game(),n=P(G),g=2,from=E.today(G),until=from+364;
  n.box[g]=[0,0,3,0];const o=buyer(G,g);
  const ok=E.outlook(G,n,n.ships[0],{to:o.id,give:one(g,0),get:one(g,0)},from,until).goods[g];
  const w=E.outlook(G,n,n.ships[0],{to:o.id,give:one(g,4),get:one(g,0)},from,until).goods[g];
  assert.ok(w.short>0&&Number.isInteger(w.shortDay)&&w.shortDay>=from&&w.shortDay<=until);
  assert.ok(ok.short<w.short,'안 실을 때보다 더 모자람');
});
test('사 오는 계약: 끝난 다음 날 도착분까지 n상자 × 왕복 수로 세고 실제 진행과 같다',()=>{
  const G=game(),n=P(G),g=0,o=G.nations.slice(1).find(o=>E.sells(G,o,g)),from=E.today(G),until=from+364;
  o.box[g]=[0,0,99,0];n.money=99999;n.box[g]=[0,0,5,0];
  const r={to:o.id,give:one(g,0),get:one(g,3)},trips=E.fitTrips(G,n,{to:o.id,until},from),x=E.outlook(G,n,n.ships[0],r,from,until).goods[g];
  assert.equal(x.mine,3*trips);
  const H=copy(G);for(const m of H.nations.slice(1))m.box[g]=[0,0,99,0];assert.ok(E.setRoute(H,0,{to:o.id,give:null,get:r.get}));
  assert.equal(play(H,g,until).end,x.end);
});
console.log(`${passed}개 통과`);
