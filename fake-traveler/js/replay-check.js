/* 실행: node fake-traveler/js/replay-check.js — 시드 고정, 화면 없는 공정성 검증 */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const context=vm.createContext({window:{}});
for(const file of ['data.js','bank.js','replay.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),context);
const {FAKE:D,FAKE_BANK:B,Replay:R}=context.window;
function expected(e,c) {
  const r=B.rules[c],bad=e.tags.find(t=>!r.allowed.includes(t));
  if(bad){const t=B.tags[bad];return {v:'lie',why:t.why?t.why.replaceAll('{T}',r.topic):t.cat==='animal'?`${t.name} ${r.place} 살지 않아요!`:`${r.topic} ${r.facts[t.cat==='life'?'land':t.cat]}!`};}
  const trap=e.type==='item'?e.trapFor?.[c]:e.home===c&&e.trap;
  return {v:trap?'trap':'ok',why:trap||(e.type==='item'?e.okWhy?.[c]:e.okWhy)||`${D.climates[c].name}에서도 볼 수 있어요!`};
}
const rng=R.seeded('20261010'),counts={0:0,1:0,2:0},claims={},pairs={},sizes={3:0,4:0};
let previous;
for(let i=0;i<2000;i++){
  const c=R.generate(rng,previous,10),k=c.travelers.filter(t=>t.fake).length;
  assert(R.validate(c),`사건 ${i} 유효성`);assert.notEqual(c.claim,previous);
  claims[c.claim]=(claims[c.claim]||0)+1;counts[k]++;sizes[c.travelers.length]++;
  const photos=[],people=[],neutrals=[];
  for(const t of c.travelers){
    people.push(t.who);photos.push(t.ev[0].img);
    assert(D.climates[t.fake||c.claim].gallery.includes(t.ev[0].img));
    for(const e of t.ev){assert.equal(e.v,expected(e,c.claim).v);assert.equal(e.why,expected(e,c.claim).why);if(B.neutralQuotes.includes(e.text))neutrals.push(e);}
    if(t.fake){
      const pair=`${c.claim}>${t.fake}`;pairs[pair]=(pairs[pair]||0)+1;
      assert(D.climates[c.claim].confuse.includes(t.fake));assert(t.ev.filter(e=>e.v==='lie').length>=2);assert.equal(t.ev[0].v,'lie');
      for(const e of t.ev)assert.notEqual(expected(e,t.fake).v,'lie');
      assert(t.options.includes(t.fake));assert(!t.options.includes(c.claim));assert.equal(t.options.length,3);
    }else for(const e of t.ev)assert.notEqual(expected(e,c.claim).v,'lie');
  }
  assert.equal(new Set(photos).size,photos.length);assert.equal(new Set(people).size,people.length);assert(neutrals.length<=1);
  previous=c.claim;
}
for(const [c,cl] of Object.entries(D.climates)){assert(claims[c]>0);for(const f of cl.confuse)assert(pairs[`${c}>${f}`]>0);}
// 3명은 0/1 가중치를 정규화한다. 4명에서만 2명이 가능하며 해양성 4명·가짜0은 사진 부족으로 재추첨한다.
const p4=.7,expectedRatio=[.3*20/75+p4*.2,.3*55/75+p4*.55,p4*.25];
for(let k=0;k<3;k++)assert(Math.abs(counts[k]/2000-expectedRatio[k])<.06,`가짜 ${k}명 비율`);
assert(Math.abs(sizes[4]/2000-.7)<.06,'4명 비율');
const a=R.generate(R.seeded('reproduce'),undefined,0),b=R.generate(R.seeded('reproduce'),undefined,0);
assert.equal(JSON.stringify(a),JSON.stringify(b));
const corrupt=JSON.parse(JSON.stringify(a));corrupt.travelers[0].ev[0].why='변조';assert.equal(R.validate(corrupt),false);
console.log(JSON.stringify({cases:2000,seed:'20261010',counts,sizes,claims,pairs,reproducible:true,unfairRejected:true},null,2));
