/* 8.1 판마다 거리 비대칭·항로 개성: node trade-king/tests/rules81.js */
const assert=require('node:assert/strict'),E=require('../js/engine6'),P=E.player,V=E.S.rules79,X=E.X;
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
const clear=G=>{while(G.pending)E.choose(G,G.pending.type==='event'?0:null);};
const days=(G,k)=>{while(k--&&!G.over){clear(G);E.tickDay(G);}};
const game=(id='daon',seed=81)=>{const G=E.newGame(seed,id);clear(G);G.plan=[];G.small.next=1e9;for(const n of G.nations.slice(1))n.ships=[];P(G).augments=[];return G;};
const one=(g,k)=>E.GOODS.map(x=>x===g?k:0);
const copy=G=>JSON.parse(JSON.stringify(G));
const sum=a=>a.reduce((a,b)=>a+b,0);
const pair=lane=>{
  const A=game(),n=P(A),o=A.nations.slice(1).find(o=>E.sells(A,o,0));
  A.lanes={};A.dist[o.id]=2;n.money=9000;o.box[0]=[0,0,100,0];
  const B=copy(A);B.lanes={[o.id]:lane};
  for(const G of [A,B]){assert.ok(E.setRoute(G,0,{to:o.id,give:null,get:one(0,2)}));assert.equal(P(G).ships[0].state,'sea');}
  return [A,B];
};

test('씨앗 1~60: 거리 네 개는 설정 묶음 중 하나이고 서로 다른 두 묶음 모두 나온다',()=>{
  const sets=new Set(X.tripSets.map(a=>[...a].sort((a,b)=>a-b).join(','))),seen=new Set();
  assert.equal(sets.size,2);
  for(let seed=1;seed<=60;seed++){
    const G=E.newGame(seed),dist=Object.values(G.dist),key=[...dist].sort((a,b)=>a-b).join(',');
    assert.deepEqual(Object.keys(G.dist).sort(),G.nations.slice(1).map(n=>n.id).sort());
    assert.equal(dist.length,4);assert.ok(sets.has(key),`씨앗 ${seed}: ${key}`);seen.add(key);
  }
  assert.deepEqual(seen,sets);
});

test('씨앗 1~60: 서로 다른 NPC 섬 두 곳에 좋은 특징 하나·위험한 특징 하나',()=>{
  for(let seed=1;seed<=60;seed++){
    const G=E.newGame(seed),ids=Object.keys(G.lanes),npc=G.nations.slice(1).map(n=>n.id);
    assert.equal(ids.length,2);assert.equal(new Set(ids).size,2);assert.ok(ids.every(id=>npc.includes(id)));
    const traits=Object.values(G.lanes).map(id=>E.S.laneTraits.find(t=>t.id===id));
    assert.ok(traits.every(Boolean));assert.deepEqual(traits.map(t=>t.kind).sort(),['good','risk']);
  }
});

test('해적에게 사면 10% 할인·폭풍에 팔면 10% 할증, 반대 방향·NPC끼리 값은 그대로',()=>{
  const G=game(),n=P(G),[o,rival]=G.nations.slice(1);
  assert.equal(V.lanePrice,.1);
  for(const lane of ['pirates','storm']){
    G.lanes={};
    const buy=E.GOODS.map(g=>E.price(G,o,n,g)),sell=E.GOODS.map(g=>E.price(G,n,o,g));
    const npc=E.GOODS.map(g=>[E.price(G,o,rival,g),E.price(G,rival,o,g)]);
    G.lanes={[o.id]:lane};
    for(const g of E.GOODS){
      assert.ok(Math.abs(E.price(G,o,n,g)-buy[g]*(lane==='pirates'?1-V.lanePrice:1))<=1);
      assert.ok(Math.abs(E.price(G,n,o,g)-sell[g]*(lane==='storm'?1+V.lanePrice:1))<=1);
      assert.deepEqual([E.price(G,o,rival,g),E.price(G,rival,o,g)],npc[g]);
      if(lane==='pirates')assert.equal(E.price(G,n,o,g),sell[g]);else assert.equal(E.price(G,o,n,g),buy[g]);
    }
  }
});

test('해류는 같은 판의 학생 배 왕복을 laneFast일 줄이고 최소 2일을 지킨다',()=>{
  const [A,B]=pair('current'),a=P(A).ships[0],b=P(B).ships[0];
  assert.equal(a.T-b.T,V.laneFast);assert.ok(b.T>=2);assert.equal(b.arrive,Math.ceil(b.T/2));
});

test('해류가 붙어도 NPC 배의 출항 시간은 그대로',()=>{
  const A=E.newGame(81),B=copy(A);A.lanes={};B.lanes=Object.fromEntries(B.nations.map(n=>[n.id,'current']));
  clear(A);clear(B);E.tickDay(A);E.tickDay(B);let ships=0;   // 8.4 NPC는 첫날 끝에 계약하고 떠난다
  for(let i=1;i<A.nations.length;i++)for(let k=0;k<A.nations[i].ships.length;k++){
    const a=A.nations[i].ships[k],b=B.nations[i].ships[k];
    if(a.state==='sea'){ships++;assert.equal(b.state,'sea');assert.equal(b.route.to,a.route.to);assert.equal(b.T,a.T);}
  }
  assert.ok(ships>0);
});

test('폭풍 확률 1은 stormDelay일 지연과 기록, 확률 0은 지연·기록 없음',()=>{
  const chance=V.stormChance;
  try{
    for(const p of [1,0]){
      V.stormChance=p;
      const [A,B]=pair('storm'),a=P(A).ships[0],b=P(B).ships[0];
      assert.equal(b.T-a.T,p*V.stormDelay);
      if(p)assert.ok(b.cargo.laneNotes.some(s=>s.includes('폭풍')&&s.includes(`${V.stormDelay}`)));
      else assert.deepEqual(b.cargo.laneNotes||[],[]);
      b.breaking=true;days(B,b.T);
      if(p)assert.ok(b.delivery.laneNotes.some(s=>s.includes('폭풍')));else assert.deepEqual(b.delivery.laneNotes,[]);
    }
  }finally{V.stormChance=chance;}
});

test('해적 확률 1은 받은 물건 중 1상자 손실과 기록, 확률 0은 손실·기록 없음',()=>{
  const chance=V.pirateChance;
  try{
    for(const p of [1,0]){
      V.pirateChance=p;
      const [A,B]=pair('pirates'),a=P(A).ships[0],b=P(B).ships[0];
      days(A,a.arrive);days(B,b.arrive);
      assert.equal(sum(a.cargo.get),2);assert.equal(sum(a.cargo.get)-sum(b.cargo.get),p);
      assert.ok(b.cargo.get.every((k,g)=>k>=0&&k<=a.cargo.get[g]));
      if(p)assert.ok(b.cargo.laneNotes.some(s=>s.includes('해적')));else assert.deepEqual(b.cargo.laneNotes||[],[]);
      b.breaking=true;days(B,b.T-b.t);
      assert.equal(sum(b.delivery.get),2-p);
      if(p)assert.ok(b.delivery.laneNotes.some(s=>s.includes('해적')));else assert.deepEqual(b.delivery.laneNotes,[]);
    }
  }finally{V.pirateChance=chance;}
});

test('어장은 귀항 때 식량 laneFish상자를 더하고 delivery에 기록한다',()=>{
  const [A,B]=pair('fish'),a=P(A).ships[0],b=P(B).ships[0];
  a.breaking=b.breaking=true;days(A,a.T);days(B,b.T);
  assert.equal(E.count(P(B),0)-E.count(P(A),0),V.laneFish);
  assert.deepEqual(b.delivery.get,a.delivery.get);
  assert.ok(b.delivery.laneNotes.some(s=>s.includes('어장')&&s.includes(`${V.laneFish}상자`)));
  assert.deepEqual(a.delivery.laneNotes,[]);
});

test('lanes 없는 판은 빈 특징 판과 같은 시간·값·식량으로 동작한다',()=>{
  const [A,B]=pair('fish'),a=P(A).ships[0],b=P(B).ships[0];delete B.lanes;
  const o=A.nations.find(n=>n.id===a.route.to),other=B.nations.find(n=>n.id===b.route.to);
  for(const g of E.GOODS){assert.equal(E.price(A,o,P(A),g),E.price(B,other,P(B),g));assert.equal(E.price(A,P(A),o,g),E.price(B,P(B),other,g));}
  assert.equal(b.T,a.T);a.breaking=b.breaking=true;days(A,a.T);days(B,b.T);
  assert.deepEqual(P(B).box,P(A).box);assert.deepEqual(b.delivery,a.delivery);
});

test('저장 데이터를 JSON 왕복해 불러오면 dist·lanes가 유지된다',()=>{
  const G=E.newGame(81),saved=E.saveGame(G),L=E.loadGame(copy(saved));
  assert.ok(L);assert.deepEqual(L.dist,G.dist);assert.deepEqual(L.lanes,G.lanes);
});

test('거리 1·4는 저장 복원되고 거리 5는 거부한다',()=>{
  const saved=E.saveGame(E.newGame(81)),ids=Object.keys(saved.dist);
  saved.dist[ids[0]]=1;saved.dist[ids[1]]=4;
  const L=E.loadGame(copy(saved));assert.ok(L);assert.deepEqual(L.dist,saved.dist);
  saved.dist[ids[0]]=5;assert.equal(E.loadGame(copy(saved)),null);
});

test('봇 한 판이 끝나고 모든 나라 금고는 0 이상이다',()=>{
  const G=E.runBot(81,'daon','focus');assert.ok(G.over);
  for(const n of G.nations)assert.ok(n.money>=0,`${n.id} 금고 ${n.money}`);
});

test('lanes 없는 옛 저장도 불러와지고 특징 효과 없이 계속된다',()=>{
  const saved=E.saveGame(E.newGame(81));delete saved.lanes;
  const L=E.loadGame(copy(saved));assert.ok(L,'lanes 없는 옛 저장을 받아야 한다');
  assert.deepEqual(L.lanes||{},{});clear(L);E.tickDay(L);assert.equal(L.day,2);
});

console.log(`\n${passed}개 통과`);
