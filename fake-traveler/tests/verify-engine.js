/* 실행: node fake-traveler/tests/verify-engine.js — 규칙을 바꾸지 않는 명령·view 회귀 검사 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({});ctx.window=ctx;
for(const file of ['data.js','bank.js','replay.js','liar.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),ctx);
const L=ctx.Liar,counts={caught:0,escaped:0,humanCaught:0,humanEscaped:0};
for(const stage of Object.keys(L.CFG.stages))for(let seed=1;seed<=40;seed++){
  let s=L.newContest({stage,seed});
  while(s.phase!=='end'){
    s=L.apply(s,{type:'start'}).state;
    for(const x of s.seats){
      assert.equal(x.hand.length,L.CFG.handSize,'손패 5장 유지');
      assert.equal(new Set(x.hand.map(c=>c.id)).size,x.hand.length,'한 손패 안의 카드 중복 없음');
      if(x.role==='liar') assert(x.hand.filter(c=>!c.neutral && L.verdict(c,s.claim).v!=='lie' && L.verdict(c,s.liarClimate).v!=='lie').length>=2,'라이어에게 두 여행지에서 통하는 실제 증거 최소 2장');
    }
    while(s.phase==='play'||s.phase==='vote'){
      const original=JSON.stringify(s),copy=JSON.parse(original);
      assert.equal(JSON.stringify(copy),original,'상태 직렬화 일치');
      for(let seat=0;seat<s.seats.length;seat++){
        const view=L.view(s,seat);
        assert.equal(JSON.stringify(s),original,'view는 원본 상태를 수정하지 않음');
        for(let i=0;i<s.seats.length;i++)if(i!==seat){
          assert(view.seats[i].hand.every(c=>c===null),'상대 손패 비공개');
          assert.equal(view.seats[i].role,null,'상대 역할 비공개');
        }
        assert(view.liarSeat===null&&view.liarPlan===null&&view.liarClimate===null,'라이어 정답 비공개');
      }
      const seat=s.phase==='play'?L.current(s):s.seats.findIndex(x=>x.vote===null);
      const cmd=s.phase==='play'?{type:'play',seat,card:s.seats[seat].hand[0].id}:{type:'vote',seat,target:seed%2===0&&seat!==s.liarSeat?s.liarSeat:(seat+1)%s.seats.length};
      const result=L.apply(s,cmd);assert(!result.error,result.error);
      assert.equal(JSON.stringify(s),original,'명령은 원본 상태를 수정하지 않음');
      assert.equal(JSON.stringify(L.apply(copy,cmd)),JSON.stringify(result),'불러온 상태에서 같은 명령의 결과 일치');
      const duplicate=L.apply(result.state,cmd);
      assert.equal(JSON.stringify(duplicate.state),JSON.stringify(result.state),'같은 카드·투표 연타는 상태를 바꾸지 않음');
      s=result.state;
    }
    const r=s.results.at(-1);counts[r.caught?'caught':'escaped']++;
    if(r.liar===0)counts[r.caught?'humanCaught':'humanEscaped']++;
    for(let i=0;i<s.seats.length;i++)assert.equal(s.seats[i].chips,L.CFG.startChips+s.results.reduce((sum,r)=>sum+r.delta[i],0),'칩 합계 일치');
  }
  assert.equal(s.results.length,L.CFG.rounds,'5라운드 종료');
}
assert(Object.values(counts).every(n=>n>0),'잡힘·탈출·내 역할 결과 모두 확인');
let voting=L.apply(L.newContest({seed:9}),{type:'start'}).state;
while(voting.phase==='play') {
  const seat=L.current(voting);
  voting=L.apply(voting,{type:'play',seat,card:voting.seats[seat].hand[0].id}).state;
}
for(const cmd of [{type:'vote',seat:99,target:1},{type:'vote',seat:0,target:'1'},{type:'vote',seat:0,target:0}]) {
  const result=L.apply(voting,cmd);
  assert(result.error,'잘못된 투표 거부');assert.equal(JSON.stringify(result.state),JSON.stringify(voting));
}
voting=L.apply(voting,{type:'vote',seat:0,target:1}).state;
const revote=L.apply(voting,{type:'vote',seat:0,target:2});
assert(revote.error,'이미 투표한 자리의 재투표 거부');assert.equal(JSON.stringify(revote.state),JSON.stringify(voting));
console.log(JSON.stringify({contests:120,rounds:600,endings:counts,commandView:'통과'},null,2));
