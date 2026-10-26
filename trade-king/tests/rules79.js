/* 7.9 규칙(7.9a2: 회의 2~5년째 · 콘셉트 10 × 3등급 · 모으기 보너스 · 옛 저장 없음): node trade-king/tests/rules79.js */
const assert=require('node:assert/strict'),E=require('../js/engine6'),P=E.player,V=E.S.rules79,X=E.X;
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
const clear=G=>{while(G.pending)E.choose(G,G.pending.type==='event'?0:null);};
const days=(G,k)=>{while(k--&&!G.over){clear(G);E.tickDay(G);}};
const game=(id='daon',seed=79)=>{const G=E.newGame(seed,id);clear(G);G.plan=[];G.small.next=1e9;for(const n of G.nations.slice(1))n.ships=[];P(G).augments=[];return G;};
const take=(G,id,target)=>{G.pending={type:'meeting',tier:'gold',cards:[id]};G.queue=[G.pending];assert.equal(E.choose(G,id,target),true,id);};
const one=(g,k)=>E.GOODS.map(x=>x===g?k:0);
const card=id=>E.S.cards.find(c=>c.id===id);
const toSeason=G=>{G.month=2;G.day=31;E.tickDay(G);};
const toMeeting=G=>{G.month=11;G.day=31;E.tickDay(G);return G.queue.find(p=>p.type==='meeting');};
const twin=(id,fn,setup=()=>{})=>{const A=game(id),B=game(id);setup(A);setup(B);fn(B);return [A,B];};   // B만 카드를 받는 같은 판 두 개
const abundance=k=>k<1?0:V.abundanceGood+(Math.min(k,V.abundanceTimes)-1)*V.abundanceMore;
const stockPoints=s=>s.abundanceBy.reduce((a,b)=>a+abundance(Math.floor(b.stock/Math.max(1,b.need))),0);

test('콘셉트 10 × 실버·골드·프리즘, 특성 8장은 어울리는 콘셉트, 기존 ID 유지',()=>{
  assert.equal(E.S.concepts.length,10);
  const pool=E.S.cards.filter(c=>c.concept&&!c.only);
  for(const c of E.S.concepts)for(const t of V.tiers)assert.ok(pool.some(x=>x.concept===c.id&&x.tier===t),`${c.id} ${t}`);
  assert.equal(pool.length,31,'30칸 + ⛵ 골드는 큰 배·배 한 척 더 둘 중 하나');
  assert.deepEqual(pool.filter(c=>c.concept==='sea'&&c.tier==='gold').map(c=>c.id).sort(),['bigShip','moreShip']);
  const traits=E.S.cards.filter(c=>c.only);assert.equal(traits.length,8);
  assert.deepEqual(Object.fromEntries(traits.map(c=>[c.only,c.concept])),{daon:'tech',plains:'hoarder',oil:'merchant',market:'diplomat',forest:'green',port:'sea',artisan:'artisan',ironland:'factory'});
  assert.ok(traits.every(c=>c.tier==='gold'));
  for(const id of ['grow','climb','protect','warehouse','bigShip','moreShip','quality','renewable','cleaner'])assert.ok(card(id));
  assert.equal(card('cleaner').concept,undefined);
  assert.deepEqual(V.odds.slice(1),[[.4,.5,.1],[.1,.6,.3],[.1,.5,.4],[.2,.6,.2]]);
});
test('첫해에는 회의가 없고 바로 개항, 회의는 2·3·4·5년째 1월 1일 네 번',()=>{
  const G=E.newGame(3,'forest');assert.equal(G.pending.type,'open');assert.equal(G.queue.length,1);assert.ok(G.news.every(n=>!n.text.includes('발전 회의')));
  for(const m of G.nations)assert.equal(m.augments.length,0);
  for(let seed=1;seed<=20;seed++)for(const c of E.T.countries){
    const G=E.runBot(seed,c.id,'focus');
    assert.ok(G.over);assert.deepEqual(G.stats.cardLog.map(x=>x.month),[12,24,36,48]);
    for(const m of G.nations){
      assert.deepEqual(m.meetings.years,[2,3,4,5]);assert.equal(m.augments.length,4);assert.ok(m.meetings.traitSeen);
      assert.ok(m.augments.includes(E.S.cards.find(c=>c.only===m.id).id)||m.meetings.offers.some(p=>p.cards.some(id=>card(id).only===m.id)),'특성 카드는 한 번 나옴');
      for(const p of m.meetings.offers){
        assert.equal(p.cards.length,3);assert.equal(new Set(p.cards.map(E.conceptOf)).size,3,'서로 다른 콘셉트');
        assert.ok(p.cards.every(id=>card(id).tier===p.tier&&(!card(id).only||card(id).only===m.id)));
        if(p.year===5)assert.ok(p.cards.every(id=>card(id).immediate));
      }
    }
    assert.ok(G.stats.cardLog.every(x=>V.tiers.includes(x.tier)&&x.fx));
  }
});
test('2년째 등급 확률 40·50·10, 따라잡기는 승급 확률과 공짜 다시 뽑기',()=>{
  const tiers={silver:0,gold:0,prism:0};let normalPrism=0,catchPrism=0;const N=1500;
  for(let seed=1;seed<=N;seed++){
    const G=game('daon',seed),H=JSON.parse(JSON.stringify(G));
    for(const [x,bottom] of [[G,false],[H,true]]){for(const n of x.nations)n.seasons=(n===P(x))!==bottom?[100,100,100]:[0,0,0];const m=toMeeting(x);if(!bottom)tiers[m.tier]++;if(bottom)catchPrism+=m.tier==='prism';else normalPrism+=m.tier==='prism';}
  }
  assert.ok(Math.abs(tiers.silver/N-.4)<.04&&Math.abs(tiers.gold/N-.5)<.04&&Math.abs(tiers.prism/N-.1)<.03,JSON.stringify(tiers));
  assert.ok(catchPrism-normalPrism>90);
  const G=game(),n=P(G);for(const m of G.nations)m.seasons=m===n?[0,0,0]:[100,100,100];
  const free=n.meetings.free,m=toMeeting(G);assert.equal(m.catchup,true);assert.equal(n.meetings.free,free+1);
});
test('다시 뽑기: 처음 공짜·그 뒤 50억·돈 부족과 빚 차단·회의 밖 차단',()=>{
  const G=game(),n=P(G);toMeeting(G);while(G.pending.type!=='meeting')E.choose(G,null);n.money=200;
  assert.equal(E.rerollCost(G),0);assert.ok(E.rerollMeeting(G));assert.equal(n.money,200);assert.equal(E.rerollCost(G),50);
  assert.ok(E.rerollMeeting(G));assert.equal(n.money,150);assert.equal(G.pending.cards.length,3);assert.equal(new Set(G.pending.cards.map(E.conceptOf)).size,3);
  n.money=49;assert.equal(E.rerollMeeting(G),false);n.money=100;n.debt=1;assert.equal(E.rerollMeeting(G),false);
  n.debt=0;clear(G);assert.equal(E.rerollMeeting(G),false);
});
test('🏭 공장 왕국: 강점 산업·공장 늘리기·산업 혁명',()=>{
  let G=game(),n=P(G),lv=n.levels[n.main];take(G,'grow');assert.equal(n.levels[n.main],lv+1);
  const [A,B]=twin('plains',G=>take(G,'factory'));assert.equal(P(B).levels[0],P(A).levels[0]+1);toSeason(A);toSeason(B);assert.equal(P(B).year.prod[0]-P(A).year.prod[0],E.produces(B,P(B),0)-E.produces(A,P(A),0)+1);
  const [C,D]=twin('plains',G=>take(G,'revolution'));assert.equal(P(D).levels.reduce((a,b)=>a+b)-P(C).levels.reduce((a,b)=>a+b),3);assert.equal(P(D).levels[0],P(C).levels[0]+2);
  toSeason(C);toSeason(D);assert.equal(P(D).year.prod[0]-P(C).year.prod[0],E.produces(D,P(D),0)-E.produces(C,P(C),0)+2);
});
test('⛵ 바다의 개척자: 항해사·큰 배·배 한 척 더·대선단',()=>{
  const G=game('plains'),n=P(G),o=G.nations[1],k=E.slotsOf(G,n,o);assert.equal(n.bigShip,false);take(G,'bigShip');assert.equal(E.slotsOf(G,n,o),k+2);
  const N=game('plains'),m=P(N);take(N,'navigator');assert.equal(E.tripTime(N,m,'world'),3);
  const ships=m.ships.length;take(N,'moreShip');assert.equal(m.ships.length,ships+1);assert.equal(E.slotsOf(N,m,N.world),X.shipSlots+1,'2장 모으면 짐칸 +1');take(N,'armada');assert.equal(E.slotsOf(N,m,N.world),X.shipSlots+2,'대선단 +1');
  const H=game(),h=P(H),far=H.nations.slice(1).find(o=>H.dist[o.id]===3),near=H.nations.slice(1).find(o=>H.dist[o.id]===2),s0=h.ships.length,k0=E.slotsOf(H,h,near);
  take(H,'armada');assert.equal(h.ships.length,s0+1);assert.equal(E.slotsOf(H,h,near),k0+1);assert.equal(E.tripTime(H,h,far.id),2);assert.equal(E.tripTime(H,h,near.id),2);assert.equal(E.tripTime(H,h,'world'),3);
  for(const id of ['daon','port']){const M=game(id),m=P(M),start=m.ships.length;assert.equal(start,id==='port'?4:3);days(M,365);assert.equal(m.ships.length,start);while(m.ships.length<E.maxShips(m))take(M,'moreShip');M.pending={type:'meeting',cards:['moreShip']};M.queue=[M.pending];assert.equal(E.choose(M,'moreShip'),false);assert.equal(m.ships.length,id==='port'?6:5);}
});
test('💰 큰 상인: 비상금·수출 장려금·복리 금고',()=>{
  const G=game(),n=P(G),money=n.money;take(G,'fund');assert.equal(n.money,money+150);
  for(const [id,per] of [['bonus',3],['interest',2]]){const H=game('forest'),h=P(H);take(H,id);h.box[h.main][3]=100;h.money=9000;const m=h.money;E.setRoute(H,0,{to:'world',give:one(h.main,2),get:null});const s=h.ships[0];days(H,s.arrive);assert.equal(h.money-m,s.cargo.earned+s.cargo.sold[h.main]*per,id);}
  for(const [cash,debt] of [[1000,0],[400,0],[1000,10000]]){const H=game('plains'),p=P(H);take(H,'interest');p.money=cash;p.debt=debt;toSeason(H);const tax=p.pop*X.taxPerPop;assert.equal(p.money,debt?cash:cash+tax+Math.min(60,Math.floor((cash+tax)*.08)));}
});
test('🤝 외교관: 친선 사절·단골 무역·자유 무역 지대(♥1 바닥)',()=>{
  const G=game(),n=P(G),others=G.nations.slice(1),before=others.map(o=>E.rel(G,n,o));take(G,'envoy');assert.deepEqual(others.map(o=>E.rel(G,n,o)),before.map(r=>Math.min(3,r+1)));
  const H=game(),h=P(H),o=H.nations.slice(1).find(o=>E.sells(H,o,0));h.money=9000;take(H,'regular');h.signedWith[o.id]=1;E.setRoute(H,0,{to:o.id,give:null,get:one(0,1)});assert.equal(h.ships[0].route.bp[0],Math.round(E.price(H,o,h,0)*.95));
  h.signedWith[o.id]=99;E.setRoute(H,1,{to:o.id,give:null,get:one(0,1)});assert.equal(h.ships[1].route.bp[0],Math.round(E.price(H,o,h,0)*.85));
  const F=game('plains'),f=P(F);take(F,'fta2');assert.equal(f.fta.length,2);
  const rest=F.nations.slice(1).find(o=>!f.fta.includes(o.id)&&E.buys(F,o,f.main));F.rel[f.id][rest.id]=F.rel[rest.id][f.id]=1;f.box[f.main][3]=50;
  E.setRoute(F,0,{to:rest.id,give:one(f.main,1),get:null});days(F,E.tripDays(F,E.tripTime(F,f,rest.id)));E.breakContract(F,0);days(F,1);assert.equal(E.rel(F,f,rest),1,'♥1 아래로 안 떨어짐');
});
test('✨ 명품 장인: 품질 높이기·장인 학교·세계적 브랜드',()=>{
  const G=game('plains'),n=P(G),q=n.quality[n.main];take(G,'quality');assert.equal(n.quality[n.main],Math.min(3,q+1));
  const H=game('plains'),h=P(H);h.quality=[1,1,2,1,2,2];take(H,'school');assert.deepEqual(h.quality.slice(0,4),[2,2,2,1],'⭐가 가장 낮은 생활 물건 두 가지');
  const B=game('plains'),b=P(B),o=B.nations[1],buyers=B.nations.filter(o=>o!==b&&E.buys(B,o,b.main)).length;b.quality[b.main]=3;const p=E.price(B,b,o,b.main);
  take(B,'brand');assert.equal(b.quality[b.main],3);assert.equal(E.price(B,b,o,b.main),Math.max(1,Math.round(p*1.2))||E.price(B,b,o,b.main));assert.ok(E.price(B,b,o,b.main)>=Math.round(p*1.19));
  assert.equal(B.nations.filter(o=>o!==b&&E.buys(B,o,b.main)).length,Math.min(4,buyers+1));
});
test('🏚 비축가: 비축 창고·곡간 관리·풍요의 나라',()=>{
  const G=game('plains'),n=P(G),c0=E.cap(G,n,0);take(G,'warehouse');assert.ok(n.warehouse);assert.equal(E.cap(G,n,0)-E.produces(G,n,0),(c0-E.produces(G,n,0))*2);
  const setup=G=>{const n=P(G);for(const g of E.CONSUMER){n.levels[g]=0;n.box[g]=[0,0,0,E.needs(G,n)[g]+Math.ceil(E.needs(G,n)[g]/2)];}};
  const [A,B]=twin('plains',G=>take(G,'granaryKeep'),setup);toSeason(A);toSeason(B);
  for(const [H,keep] of [[A,1],[B,V.keepHalf]]){const m=P(H);for(const b of m.last.abundanceBy)assert.equal(b.need,Math.max(1,Math.ceil(E.needs(H,m)[b.good]*keep)));assert.equal(m.last.abundance,stockPoints(m.last)+V.abundancePort[E.homeStage(m)]);}
  const full=G=>{const n=P(G);for(const g of E.CONSUMER){n.levels[g]=0;n.box[g]=[0,0,0,E.needs(G,n)[g]*2];}n.box[0][3]=E.needs(G,n)[0]*2;};
  const [C,D]=twin('plains',G=>take(G,'plenty'),G=>{const n=P(G);for(const g of E.CONSUMER){n.levels[g]=0;n.box[g]=[0,0,0,0];}n.box[0]=[0,0,0,E.needs(G,n)[0]*2];});
  toSeason(C);toSeason(D);assert.equal(P(C).last.abundance,V.abundanceGood);assert.equal(P(D).last.abundance,V.abundanceGood*V.plentyMult);
  const F=game('plains'),f=P(F),c1=E.cap(F,f,0)-E.produces(F,f,0);take(F,'plenty');assert.equal(E.cap(F,f,0)-E.produces(F,f,0),c1*3);
  const M=game('plains');full(M);take(M,'plenty');for(const g of E.CONSUMER)P(M).levels[g]=10;toSeason(M);assert.equal(P(M).last.abundance,(stockPoints(P(M).last)+V.abundancePort[E.homeStage(P(M))])*V.plentyMult);
});
test('🛡 자립: 지키기·자급자족·자립 경제',()=>{
  const G=game(),n=P(G),lv=[...n.levels];take(G,'protect',0);assert.equal(n.levels[0],lv[0]+1);assert.equal(n.protect[0],E.FOREVER);
  const H=game('ironland'),h=P(H),l2=[...h.levels];take(H,'selfReliance');const up=E.GOODS.filter(g=>h.levels[g]!==l2[g]);assert.equal(up.length,1);assert.equal(h.levels[up[0]]-l2[up[0]],2);assert.ok(E.CONSUMER.includes(up[0]));
  const A=game('ironland'),a=P(A),lack=E.CONSUMER.filter(g=>E.produces(A,a,g)<E.needs(A,a)[g]),l3=[...a.levels],o=A.nations.find(o=>o!==a&&E.sells(A,o,0)),p=E.price(A,o,a,0),w=E.price(A,A.world,a,0);
  assert.ok(lack.length);take(A,'autarky');for(const g of E.GOODS)assert.equal(a.levels[g],l3[g]+(lack.includes(g)?1:0));
  assert.ok(Math.abs(E.price(A,o,a,0)-p*1.2)<=1);assert.ok(Math.abs(E.price(A,A.world,a,0)-w*1.2)<=1);
});
test('🔬 기술 강국: 새 산업·공장 자동화·기술 혁신(재료 없이 1단계)',()=>{
  const G=game(),n=P(G),lv=n.levels[3];take(G,'climb');assert.equal(n.levels[3],lv+1);
  const H=game(),h=P(H),need=E.inputNeed(H,h,5);take(H,'automation');assert.ok(E.inputNeed(H,h,5)<=Math.ceil(need/2)+1&&E.inputNeed(H,h,5)<need);
  const [A,B]=twin('market',G=>take(G,'innovation'),G=>{const n=P(G);n.box[5]=[0,0,0,0];n.box[3]=[0,0,0,0];n.levels[5]=0;});
  assert.equal(P(B).levels[3],P(A).levels[3]+2);assert.equal(P(B).quality[3],Math.min(3,P(A).quality[3]+1));
  toSeason(A);toSeason(B);assert.equal(P(A).year.prod[3],0);assert.equal(P(B).year.prod[3],E.S.goods[3].load);
});
test('🌱 녹색 성장: 전등·재생 에너지·녹색 혁명(생활 +2)',()=>{
  for(const [id,cut] of [['lamps',1],['renewable',2],['greenRev',3]]){const G=game('market'),n=P(G),o=E.needs(G,n)[1];take(G,id);assert.equal(E.needs(G,n)[1],Math.max(1,o-cut),id);}
  const [A,B]=twin('market',G=>take(G,'greenRev'));toSeason(A);toSeason(B);assert.equal(P(B).last.extra-P(A).last.extra,2);
});
test('🎲 모험가: 행운의 부적·시장 조사·보물선(빚 가능, 1년 뒤 300~500억)',()=>{
  const share=charm=>{const G=game();if(charm)take(G,'charm');let good=0,all=0;for(let i=0;i<1500;i++){clear(G);G.small.next=E.today(G)+1;E.tickDay(G);const e=G.small.log.at(-1);if(!e)continue;all++;good+=V.goodSmall.includes(e.id);G.small.log=[];}return good/all;};
  const plain=share(false),lucky=share(true),odds=p=>p/(1-p);assert.ok(odds(lucky)/odds(plain)>1.3,`${plain} → ${lucky}`);   // 7.9c 단추 돌발이 잦아 비율로 비교
  const G=game(),n=P(G),o=G.nations.slice(1).find(o=>E.sells(G,o,0)),base=E.price(G,o,n,0);take(G,'survey');assert.equal(E.price(G,o,n,0),Math.round(base*.95));assert.equal(E.priceSignal(G,0).horizon,2);
  const T=game('forest'),t=P(T);t.money=0;take(T,'treasure');assert.equal(t.debt,150);assert.equal(t.investment.length,1);const back=t.investment[0].money;assert.ok(back>=300&&back<=500);
  days(T,366);assert.equal(t.investment.length,0);assert.ok(T.news.some(x=>x.text.includes('보물선')));
});
test('특성 8장: 반도체·곡물 저장고·정유·쇼핑·생태 관광·중계 창고·명품 거리·제철소',()=>{
  const G=game(),n=P(G);take(G,'semiconductor');n.levels[5]=0;n.box[5]=[0,0,1,0];n.box[3]=[0,0,0,0];toSeason(G);assert.equal(n.year.prod[3],3);
  const H=game('plains'),p=P(H);take(H,'granary');p.trait.weather=2;H.month=2;H.day=31;const made=p.year.prod[0],want=E.produces(H,p,0);E.tickDay(H);assert.equal(p.year.prod[0]-made,want);
  const O=game('oil'),o=P(O);o.trait.stage=2;const prod=E.produces(O,o,1),price=E.price(O,o,O.world,1);take(O,'refinery');assert.equal(E.produces(O,o,1),prod+3);assert.ok(E.price(O,o,O.world,1)>price);
  const M=game('market'),m=P(M);take(M,'shopping');m.levels[0]=0;m.box[0]=[0,0,0,0];toSeason(M);assert.equal(m.last.empty,2);
  const F=game('forest'),f=P(F);for(const x of F.nations.slice(1))F.rel[f.id][x.id]=F.rel[x.id][f.id]=2;const tour=E.traitInfo(F,f).value;take(F,'ecotour');assert.equal(E.traitInfo(F,f).value,Math.round(tour*1.5));
  const R=game('port'),r=P(R),g=E.GOODS.find(g=>E.isRelay(R,r,g)&&R.nations.slice(1).some(o=>E.buys(R,o,g))),b=R.nations.slice(1).find(o=>E.buys(R,o,g));
  take(R,'relayStore');r.box[g][3]=100;assert.ok(E.allowed(R,r,{to:b.id,give:one(g,E.slotsOf(R,r,b)+1),get:null}));
  const A=Array.from({length:20},(_,k)=>game('artisan',79+k)).find(G=>G.nations.slice(1).some(o=>E.buys(G,o,2))),a=P(A),buyer=A.nations.slice(1).find(o=>E.buys(A,o,2));take(A,'luxStreet');assert.ok(E.allowed(A,a,{to:buyer.id,give:one(2,3),get:null}));
  const I=game('ironland'),i=P(I),level=i.levels[5];take(I,'modernSteel');assert.equal(i.levels[5],level+1);
  assert.equal(E.concepts(i).find(c=>c.id==='factory').count,1,'특성 카드는 콘셉트 한 장');
});
test('모으기 2장: 공장·바다·상인·외교·명품·비축·자립·기술·녹색·모험',()=>{
  const two=(id,a,b)=>{const G=game(id);take(G,a);take(G,b);assert.ok(E.concepts(P(G)).find(c=>c.id===E.conceptOf(a)).bonus2.on);return G;};
  {const G=game('plains'),n=P(G),o=G.nations[1];take(G,'grow');const p=E.price(G,n,o,n.main);take(G,'factory');assert.ok(Math.abs(E.price(G,n,o,n.main)-p*1.1)<=1);}
  {const G=game(),n=P(G),o=G.nations[1];take(G,'navigator');const k=E.slotsOf(G,n,o);take(G,'armada');assert.equal(E.slotsOf(G,n,o),k+2);}
  {const [A,B]=twin('plains',G=>{take(G,'fund');take(G,'bonus');},G=>{P(G).money=0;});toSeason(A);toSeason(B);const pa=P(A),pb=P(B);assert.equal(pb.money-pa.money,150+Math.round(pa.pop*X.taxPerPop*.5));}
  {const G=game(),n=P(G),o=G.nations.slice(1).find(o=>E.sells(G,o,0));G.rel[n.id][o.id]=G.rel[o.id][n.id]=2;const p=E.price(G,o,n,0);take(G,'envoy');G.rel[n.id][o.id]=G.rel[o.id][n.id]=2;take(G,'regular');assert.ok(E.price(G,o,n,0)<p,'♥2에서 ♥3 혜택');}
  {const f=G=>{const n=P(G);n.quality=[1,1,1,1,1,1];for(const g of E.CONSUMER){n.levels[g]=0;n.box[g]=[0,E.needs(G,n)[g],0,0];}};const A=game('plains'),B=game('plains');f(A);f(B);A.nations[0].augments=['quality'];B.nations[0].augments=['quality','school'];toSeason(A);toSeason(B);assert.equal(P(B).last.qual-P(A).last.qual,2,'품질 점수 +2');}
  {const f=G=>{const n=P(G);for(const g of E.CONSUMER){n.levels[g]=0;n.box[g]=[0,0,0,0];}n.box[0]=[0,0,0,E.needs(G,n)[0]*2];};const [A,B]=twin('plains',G=>{take(G,'warehouse');take(G,'granaryKeep');},G=>{f(G);});toSeason(A);toSeason(B);assert.equal(P(B).last.abundance-P(A).last.abundance,stockPoints(P(B).last)-stockPoints(P(A).last)+V.c2.hoarder);}
  {const [A,B]=twin('daon',G=>{take(G,'selfReliance');},G=>{take(G,'protect',0);});toSeason(A);toSeason(B);assert.ok(P(A).last.unrest>0);assert.equal(P(B).last.unrest,0);}
  {const G=game('market'),n=P(G),o=G.nations[1];take(G,'climb');const p=E.price(G,n,o,3);take(G,'automation');assert.ok(Math.abs(E.price(G,n,o,3)-p*1.15)<=1);}
  {const crisis=G=>{const n=P(G);G.crises.push({goods:[1],w:1,until:G.month+6});n.year.imp[1]={world:20};n.year.prod[1]=0;n.lastYear=null;};const [A,B]=twin('market',G=>{take(G,'lamps');take(G,'renewable');},crisis);toSeason(A);toSeason(B);assert.ok(P(A).last.crisis>0);assert.equal(P(B).last.crisis,0);}
  {const G=game(),n=P(G),f=n.meetings.free;take(G,'charm');take(G,'survey');assert.equal(n.meetings.free,f+1);}
  two('daon','climb','semiconductor');
});
test('모으기 3장: 대표 산업 +1·모든 왕복 −1달·판매 +10%·위약금 절반·생활 물건 ⭐2·위기 절반·공급 끊김 무사·첨단 +1·환경 사건·돈 절반',()=>{
  {const G=game('plains'),n=P(G),lv=n.levels[n.main];take(G,'grow');take(G,'factory');take(G,'revolution');assert.equal(n.levels[n.main],lv+1+1+2+1);}
  {const G=game(),n=P(G),near=G.nations.slice(1).find(o=>G.dist[o.id]===2);take(G,'navigator');take(G,'bigShip');take(G,'armada');assert.equal(E.tripTime(G,n,near.id),1);assert.equal(E.tripTime(G,n,'world'),1);}
  {const G=game('plains'),n=P(G),o=G.nations[1];take(G,'fund');take(G,'bonus');const p=E.price(G,n,o,n.main),w=E.price(G,n,G.world,n.main);take(G,'interest');assert.ok(Math.abs(E.price(G,n,o,n.main)-p*1.1)<=1);assert.ok(Math.abs(E.price(G,n,G.world,n.main)-w*1.1)<=1);}
  {const pen=dip=>{const G=game('plains'),n=P(G),o=G.nations.slice(1).find(o=>E.buys(G,o,n.main));if(dip)['envoy','regular','fta2'].forEach(id=>take(G,id));G.rel[n.id][o.id]=G.rel[o.id][n.id]=2;n.box[n.main]=[0,0,1,0];E.setRoute(G,0,{to:o.id,give:one(n.main,4),get:null});const x=n.ships[0].cargo.penaltyOut[0],gp=n.ships[0].route.gp[n.main];return [x.amount,Math.max(x.qty,Math.ceil(x.qty*gp*.3))];};for(const dip of [false,true]){const [amount,full]=pen(dip);assert.equal(amount,dip?Math.ceil(full/2):full);}}
  {const G=game('plains'),n=P(G);n.quality=[1,1,1,1,1,1];take(G,'quality');take(G,'school');take(G,'brand');for(const g of E.CONSUMER)assert.ok(n.quality[g]>=2);}
  {const crisis=G=>{const n=P(G);G.crises.push({goods:[2],w:1,until:G.month+6});n.year.imp[2]={world:20};n.year.prod[2]=0;n.lastYear=null;};const A=game('market');crisis(A);['warehouse','granaryKeep','lamps'].forEach(id=>take(A,id));
    const B3=game('market');crisis(B3);['warehouse','granaryKeep','plenty'].forEach(id=>take(B3,id));toSeason(A);toSeason(B3);assert.ok(P(A).last.crisis>0&&Math.abs(P(B3).last.crisis-P(A).last.crisis/2)<=.5,`${P(A).last.crisis} → ${P(B3).last.crisis}`);}   // 7.9c 위기 점수가 작아 반올림 허용
  {const G=game(),n=P(G),o=G.nations.slice(1).find(o=>E.sells(G,o,o.main));['protect','selfReliance','autarky'].forEach(id=>take(G,id));n.money=9000;G.cut={source:o.id,good:o.main,until:G.month+6};o.box[o.main][2]=50;
    const before=n.money;E.setRoute(G,0,{to:o.id,give:null,get:one(o.main,2)});days(G,n.ships[0].arrive);assert.equal(n.ships[0].cargo.get[o.main],2,'공급 끊김에도 다 받음');}
  {const G=game('market'),n=P(G),lv=n.levels[3];['climb','automation','innovation'].forEach(id=>take(G,id));assert.equal(n.levels[3],lv+1+2+1);}
  {const G=game('market'),n=P(G);['lamps','renewable','greenRev'].forEach(id=>take(G,id));const lv=n.levels[0];G.pending={type:'event',id:'forestFire',until:G.month+6};G.queue=[G.pending];E.choose(G,1);assert.equal(E.levelOf(G,n,0),lv,'산불 피해 없음');}
  {const G=game('market'),n=P(G);['charm','survey','treasure'].forEach(id=>take(G,id));n.money=500;n.debt=0;G.pending={type:'event',id:'techBoom',until:G.month+6};G.queue=[G.pending];const m=n.money;E.choose(G,0);assert.equal(m-n.money,75);}
  {const G=game('ironland'),n=P(G);['modernSteel','grow','factory'].forEach(id=>take(G,id));assert.ok(E.concepts(n).find(c=>c.id==='factory').bonus3.on);assert.equal(E.mainConcept(n).id,'factory');}
});
test('작은 돌발 20종·20~34일 평균 27(7.9c)·큰 사건 같은 주 회피·멈춤 없음, 큰 사건 4~5번',()=>{
  assert.equal(E.S.smallEvents.length,20);let gaps=[],actions=0,count=0;
  for(let seed=1;seed<=40;seed++){
    const G=E.runBot(seed,'plains','focus');let last=0;
    assert.ok(G.plan.length>=4&&G.plan.length<=5);
    for(const e of G.small.log){const gap=e.day-last;assert.ok(gap>=20&&gap<=41,`간격 ${gap}`);gaps.push(gap);last=e.day;count++;actions+=!!e.action;assert.ok(!G.plan.some(p=>Math.floor(E.dayNo(p.month,1)/7)===Math.floor(e.day/7)));}
  }
  const mean=gaps.reduce((a,b)=>a+b,0)/gaps.length;assert.ok(mean>25&&mean<30,`평균 ${mean}`);assert.ok(actions/count>.55&&actions/count<.8,`단추 ${actions/count}`);console.log(`돌발 ${count}번 · 평균 ${mean.toFixed(2)}일 · 단추 ${(100*actions/count).toFixed(2)}%`);
  const G=game();for(const e of E.S.smallEvents){const before=G.pending;E.smallEvent(G,e.id);assert.equal(G.pending,before);assert.ok(G.news.at(-1).text.includes(e.name));}
});
test('단추 선택은 한 번·7일 안·기본은 지나감·저장 복원',()=>{
  const G=game(),n=P(G);n.box[n.main][3]=20;const money=n.money,a=E.smallEvent(G,'merchant');assert.ok(E.takeSmallAction(G,a.day));assert.equal(n.money,money+2*E.worldPrice(G,n.main));assert.equal(E.takeSmallAction(G,a.day),false);
  days(G,1);const b=E.smallEvent(G,'request'),before=E.count(n,n.main);days(G,8);assert.equal(E.takeSmallAction(G,b.day),false);assert.equal(E.count(n,n.main),before);
  const H=E.newGame(19);clear(H);E.smallEvent(H,'merchant');const L=E.loadGame(E.saveGame(H));assert.ok(L);assert.deepEqual(E.smallActions(L),E.smallActions(H));
});
test('품질·풍요 한도 없이 모든 가감점의 원점수·초과 점수·누적 순위',()=>{
  const G=game('plains'),n=P(G);n.levels=E.GOODS.map(()=>10);n.quality=E.GOODS.map(()=>3);for(const g of E.GOODS)n.box[g]=[0,0,0,200];n.levels[0]+=5;toSeason(G);
  assert.equal(n.last.slots,E.CONSUMER.length*X.slotPoints);assert.equal(n.last.qual,E.CONSUMER.length*X.qualityPoints[3]);assert.equal(n.last.abundance,stockPoints(n.last)+V.abundancePort[E.homeStage(n)]);assert.ok(n.last.raw>V.overFrom);assert.equal(n.last.score,E.overScore(n.last.raw));
  for(let seed=1;seed<=8;seed++){
    const H=E.runBot(seed,'market');
    for(const m of H.nations)for(const h of m.history)for(const s of h.seasons){
      assert.ok(s.slots<=E.CONSUMER.length*X.slotPoints);
      for(const b of s.abundanceBy)assert.equal(b.points,abundance(Math.floor(b.stock/Math.max(1,b.need))));
      assert.equal(s.raw,Math.round(s.slots+s.qual+s.abundance-s.unrest+s.extra-s.crisis-s.empty-s.pollution-s.debt));assert.equal(s.score,E.overScore(s.raw));
    }
    assert.ok(E.ranking(H).every((n,i,a)=>!i||a[i-1].score>=n.score));
    for(let year=1;year<=5;year++){
      const r=E.yearReport(H,year),totals=H.nations.map(m=>({id:m.id,score:m.years.slice(0,year).reduce((a,b)=>a+b,0)})).sort((a,b)=>b.score-a.score);
      assert.deepEqual(r.totals,totals);assert.equal(r.total,totals.find(m=>m.id===P(H).id).score);assert.equal(r.totalRank,totals.findIndex(m=>m.id===P(H).id)+1);assert.equal(r.scoreParts.basketMax,E.CONSUMER.length*X.slotPoints);
      for(const key of ['weight','weightedRank','weightedScore'])assert.ok(!(key in r),key);
    }
  }
  assert.equal(E.totalScore({years:[0,0,0,0,100]}),100);
});
test('여섯 달 값·추세·싼 정도·실제로 오는 소문',()=>{
  const G=game();days(G,260);for(const a of G.priceHistory){assert.equal(a.length,6);assert.equal(a.at(-1).month,G.month);}
  G.priceHistory[0]=[20,22,24,26,28,30].map((price,month)=>({price,month}));assert.equal(E.priceSignal(G,0,20).cheapness,'싼 편');assert.equal(E.priceSignal(G,0,25).cheapness,'보통');assert.equal(E.priceSignal(G,0,30).cheapness,'비싼 편');assert.equal(E.priceSignal(G,0).arrow,'▲');
  const e=E.smallEvent(G,'rumor'),p=G.pricePulses.at(-1);assert.ok(e.text.includes(E.goodName(p.good)));const H=JSON.parse(JSON.stringify(G));H.pricePulses=[];G.month=E.dateOf(p.from).month;G.day=1;H.month=G.month;H.day=1;assert.ok(E.worldPrice(G,p.good)>E.worldPrice(H,p.good));
});
test('저장: 지금 저장은 그대로 이어지고, 옛 저장(7.9 이전)은 조용히 거절, 씨앗 결정성',()=>{
  const G=E.newGame(79,'oil');while(G.month<30){E.botTurn(G,'focus');E.tick(G);}
  const s=E.saveGame(G),L=E.loadGame(s);assert.ok(L);assert.deepEqual(JSON.parse(JSON.stringify(L)),JSON.parse(JSON.stringify(G)));
  while(!G.over){E.botTurn(G,'focus');E.tick(G);}while(!L.over){E.botTurn(L,'focus');E.tick(L);}assert.deepEqual(L.nations.map(n=>n.score),G.nations.map(n=>n.score));
  for(const old of [{...E.saveGame(G),saveVersion:2},{...E.saveGame(G),version:6},(()=>{const o=E.saveGame(G);delete o.saveVersion;return o;})(),{saveVersion:2,version:6,month:3},null,'x'])assert.equal(E.loadGame(old),null);
  for(const damage of [s=>s.small.next='bad',s=>s.priceHistory[0][0].price=-1,s=>s.nations[0].meetings.free=-1,s=>s.nations[0].augments=['bad'],s=>s.nations[0].money=-5,s=>{delete s.nations[0].meetings;}]){const s=E.saveGame(G);damage(s);assert.equal(E.loadGame(s),null);}
  const M=E.newGame(5,'daon');clear(M);toMeeting(M);const ms=E.saveGame(M),ML=E.loadGame(ms);assert.ok(ML);assert.deepEqual(ML.pending,M.pending);
  const bad=E.saveGame(M);bad.queue.find(p=>p.type==='meeting').cards=['grow','quality','factory'];bad.pending=bad.queue[0];assert.equal(E.loadGame(bad),null,'같은 콘셉트가 겹친 회의는 거절');
  assert.deepEqual(E.runBot(17,'forest','random'),E.runBot(17,'forest','random'));
});
test('초과 점수: 99·100·101·140·음수와 설정 경계값',()=>{
  for(const raw of [99,100,101,140,-5,V.overFrom-1,V.overFrom,V.overFrom+1])assert.equal(E.overScore(raw),Math.max(0,Math.round(raw<=V.overFrom?raw:V.overFrom+(raw-V.overFrom)*V.overRate)),`원점수 ${raw}`);
});
test('풍요: 같은 물건 필요량 1배·2배·상한 배수 초과와 모자란 재고',()=>{
  for(const k of [0,1,2,V.abundanceTimes+3]){
    const G=game('plains'),n=P(G),g=E.CONSUMER[0];n.levels=E.GOODS.map(()=>0);n.box=E.GOODS.map(()=>[0,0,0,0]);
    const need=E.needs(G,n)[g];n.box[g][3]=need*(k+1);toSeason(G);
    const b=n.last.abundanceBy.find(b=>b.good===g);assert.equal(b.stock,need*k);assert.equal(b.need,need);assert.equal(b.points,abundance(k));assert.equal(n.last.abundance,abundance(k)+V.abundancePort[E.homeStage(n)]);
  }
});
test('한 판 끝 모든 나라의 최종 점수는 해마다 점수의 합',()=>{
  const G=E.runBot(80,'daon','focus');assert.ok(G.over);
  for(const n of G.nations){assert.equal(n.years.length,5);assert.equal(n.score,n.years.reduce((a,b)=>a+b,0));assert.equal(E.totalScore(n),n.score);}
});
test('옛 도감 점수는 반올림해 5배 변환·두 번 불러도 유지',()=>{
  const old={nations:{daon:{best:72.37},plains:{best:0},oil:{games:1}},records:{bestScore:91.23},last:{score:64.57}},c=E.codexNormalize(JSON.parse(JSON.stringify(old)));
  assert.equal(c.sumScore,true);for(const id of ['daon','plains'])assert.equal(c.nations[id].best,Math.round(old.nations[id].best*5));assert.equal(c.nations.oil.best,undefined);assert.equal(c.records.bestScore,Math.round(old.records.bestScore*5));assert.equal(c.last.score,Math.round(old.last.score*5));
  const before=JSON.parse(JSON.stringify(c));assert.deepEqual(E.codexNormalize(c),before);assert.deepEqual(E.codexNormalize(JSON.parse(JSON.stringify(c))),before);
});
console.log(`\n${passed}개 통과`);
