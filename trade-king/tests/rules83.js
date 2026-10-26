/* 8.3 계약 지킬 수 있는 양·벌점 없는 그만두기·♥ 1년 1번·NPC 계약 요청·누적 순위: node trade-king/tests/rules83.js */
const assert=require('node:assert/strict'),E=require('../js/engine6'),P=E.player;
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
const clear=G=>{while(G.pending)E.choose(G,G.pending.type==='event'?0:null);};
const game=(id='market',seed=83)=>{const G=E.newGame(seed,id);clear(G);G.plan=[];G.lanes={};G.small.next=1e9;for(const n of G.nations.slice(1))n.ships=[];P(G).augments=[];P(G).money=99999;return G;};
const one=(g,k)=>E.GOODS.map(x=>x===g?k:0);
const days=(G,k)=>{for(let i=0;i<k&&!G.over;i++){clear(G);E.tickDay(G);}};
// 우리가 사 올 수 있는 이웃(남는 물건 g를 파는 나라)
const seller=G=>{for(const o of G.nations.slice(1))for(const g of E.GOODS)if(E.sells(G,o,g))return {o,g};};

test('상대가 지킬 수 있는 양까지만 계약을 받아 준다(넘으면 거절)',()=>{
  const G=game(),{o,g}=seller(G),s=P(G).ships[0];o.box[g]=[0,0,4,0];P(G).bigShip=true;   // 큰 배(짐칸 +2)라야 상한이 짐칸보다 작다
  const cap=E.supplyCap(G,P(G),s,o,g);
  assert.ok(cap>=1&&cap<E.slotsOf(G,P(G),o),`상한 ${cap}`);
  assert.equal(E.allowed(G,P(G),{to:o.id,give:null,get:one(g,cap+1)},s),false,'상한 + 1은 거절');
  assert.ok(E.setRoute(G,0,{to:o.id,give:null,get:one(g,cap)}),'상한까지는 계약');
  // 다른 배가 이미 약속받은 양은 빠진다
  assert.ok(E.supplyCap(G,P(G),P(G).ships[1],o,g)<=cap);
  // 추천(plan)도 상한을 넘지 않는다
  assert.ok(E.plan(G,P(G),P(G).ships[1],o).get[g]<=E.supplyCap(G,P(G),P(G).ships[1],o,g));
});
test('상대가 약속을 못 지킨 계약은 깨도 ♥가 줄지 않는다',()=>{
  const G=game(),{o,g}=seller(G),me=P(G);o.box[g]=[0,0,40,0];
  assert.ok(E.setRoute(G,0,{to:o.id,give:null,get:one(g,1)}));
  o.box[g]=[0,0,0,0];o.levels[g]=0;   // 계약 뒤 상대 재고·생산이 끊김
  const r0=E.rel(G,me,o),s=me.ships[0];days(G,s.T);
  assert.ok(s.route.failed,'못 받은 계약은 표시');
  assert.ok(E.breakContract(G,0));days(G,s.T+1);
  assert.equal(E.rel(G,me,o),r0,'신뢰 그대로');assert.equal(G.stats.breaks,0);
  // 보통 계약 깨기는 그대로 ♥−1
  const H=game(),x=seller(H);x.o.box[x.g]=[0,0,40,0];
  assert.ok(E.setRoute(H,0,{to:x.o.id,give:null,get:one(x.g,1)}));const h0=E.rel(H,P(H),x.o);
  assert.ok(E.breakContract(H,0));days(H,P(H).ships[0].T+1);
  assert.equal(E.rel(H,P(H),x.o),Math.max(0,h0-1));
});
test('계약으로 오르는 ♥는 두 나라 사이에 1년에 한 번',()=>{
  const G=game(),{o,g}=seller(G),me=P(G);days(G,70);   // 연말 회의 카드의 ♥가 섞이지 않게 해 중간에 끝나는 계약
  o.box[g]=[0,0,200,0];o.levels[g]+=3;me.money=99999;
  for(const i of [0,1,2])assert.ok(E.setRoute(G,i,{to:o.id,give:null,get:one(g,1)}),`배 ${i+1}`);
  // 계약이 도는 동안 ♥를 날마다 1로 되돌려(새해 회의 카드·사건의 ♥를 빼려고) 세 계약이 끝나는 날 오른 양만 잰다
  for(let i=0;i<450&&me.ships.some(s=>s.route);i++){clear(G);G.rel[me.id][o.id]=G.rel[o.id][me.id]=1;E.tickDay(G);}
  assert.ok(me.ships.every(s=>!s.route),'세 계약 모두 끝');
  assert.equal(E.rel(G,me,o),2,'배 세 척 계약이 같은 해에 끝나도 ♥+1');
});
test('NPC가 우리와 계약하고 싶으면 요청을 걸고, 수락하면 맺고 거절하면 다른 나라로',()=>{
  const G=E.newGame(83,'plains');clear(G);G.small.next=1e9;const me=P(G);
  for(const o of G.nations.slice(1)){G.rel[me.id][o.id]=G.rel[o.id][me.id]=2;for(const s of o.ships){s.route=null;s.next=null;s.state='port';}}
  me.box.forEach(b=>b[2]+=60);
  days(G,1);
  const f=(G.offers||[])[0];assert.ok(f,'요청이 생김');
  const n=E.nation(G,f.from),ship=n.ships[f.ship];
  assert.equal(ship.route,null);assert.ok(ship.offer,'배는 기다림');
  assert.ok(E.answerOffer(G,f.id,true),'수락');assert.equal(ship.route.to,me.id);assert.ok(!G.offers.some(x=>x.id===f.id));
  const f2=G.offers.find(x=>x.id!==f.id);
  if(f2){const s2=E.nation(G,f2.from).ships[f2.ship];assert.equal(E.answerOffer(G,f2.id,false),false);assert.ok(!s2.route||s2.route.to!==me.id,'거절하면 우리 말고 다른 곳');}
  // 기한이 지나면 거절로 친다
  const left=(G.offers||[]).map(x=>x.id);days(G,E.S.rules79.actionDays+2);   // 8.5 기한 actionDays(7 → 30일)
  assert.ok(left.every(id=>!(G.offers||[]).some(x=>x.id===id)),'기한이 지나면 사라짐');
  // 저장·불러오기
  assert.ok(E.loadGame(E.saveGame(G)));
});
test('연말 순위는 그해까지 쌓은 점수(누적)',()=>{
  const G=E.runBot(5,'daon','balanced');
  for(let y=1;y<=5;y++){const R=E.yearReport(G,y),order=[...R.ranks].sort((a,b)=>b.total-a.total);
    assert.deepEqual(R.ranks.map(r=>r.id),order.map(r=>r.id),`${y}년 순위`);assert.equal(R.ranks.find(r=>r.id===P(G).id).rank,R.totalRank);}
});
test('8.4 NPC는 하루 끝에 계약: 첫날 학생이 먼저 고르고, 그날 끝에 NPC가 남은 여유로 맺는다',()=>{
  let done=0;
  for(const id of ['plains','oil','forest','artisan'])for(let seed=1;seed<=4;seed++){
    const G=E.newGame(seed*31,id);clear(G);G.small.next=1e9;const me=P(G);me.money=99999;
    assert.ok(G.nations.slice(1).every(m=>m.ships.every(s=>!s.route)),'첫날엔 NPC 계약이 아직 없다');
    const o=G.nations.slice(1).find(o=>E.GOODS.some(g=>E.sells(G,o,g)&&E.buys(G,me,g)));if(!o)continue;
    const g=E.GOODS.find(g=>E.sells(G,o,g)&&E.buys(G,me,g)),k=Math.min(E.supplyCap(G,me,me.ships[0],o,g),E.slotsOf(G,me,o));if(k<1)continue;
    assert.ok(E.setRoute(G,0,{to:o.id,give:null,get:one(g,k)}));
    clear(G);E.tickDay(G);
    assert.ok(G.nations.slice(1).some(m=>m.ships.some(s=>s.route)),'첫날 끝에 NPC가 계약');
    for(const m of G.nations.slice(1))for(const x of m.ships)if(x.route?.to===o.id&&x.route.get[g])assert.ok(x.route.get[g]<=E.supplyCap(G,m,x,o,g),'NPC는 학생 몫을 뺀 여유 안에서');
    done++;
  }
  assert.ok(done>=3,`겨룬 경우 ${done}`);
});
console.log(`rules83: ${passed} passed`);
