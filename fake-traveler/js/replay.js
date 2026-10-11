/* 증거 은행을 그대로 판정한다. 생성과 검증은 화면 없이도 실행할 수 있다. */
(() => {
  'use strict';
  const D = window.FAKE, B = window.FAKE_BANK, ids = Object.keys(D.climates);
  function verdict(ev, claim) {
    const r = B.rules[claim];
    for (const tag of ev.tags) {
      if (r.allowed.includes(tag)) continue;
      const t = B.tags[tag], cat = t.cat === 'life' ? 'land' : t.cat;
      return { v: 'lie', why: t.why ? t.why.replaceAll('{T}', r.topic) : t.cat === 'animal' ? `${t.name} ${r.place} 살지 않아요!` : `${r.topic} ${r.facts[cat]}!` };
    }
    const trap = ev.type === 'item' ? ev.trapFor?.[claim] : ev.home === claim && ev.trap;
    return { v: trap ? 'trap' : 'ok', why: trap || (ev.type === 'item' ? ev.okWhy?.[claim] : ev.okWhy) || `${D.climates[claim].name}에서도 볼 수 있어요!` };
  }
  function seeded(seed) {
    let n = 2166136261;
    for (const c of String(seed)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return () => { n += 0x6D2B79F5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const pools = {
    photo: Object.entries(B.photos).map(([img, e]) => ({ ...e, img, type: 'photo' })),
    temp: B.temps.map(e => ({ ...e, type: 'temp' })),
    quote: B.quotes.map(e => ({ ...e, type: 'quote' })),
    item: Object.entries(B.items).map(([item, e]) => ({ ...e, item, type: 'item' }))
  };
  const neutral = B.neutralQuotes.map(text => ({ type: 'quote', text, tags: [] }));
  function validate(c) {
    if (!ids.includes(c.claim) || ![3,4].includes(c.travelers.length)) return false;
    const photos = [], people = new Set();
    const fakes = c.travelers.filter(t => t.fake);
    if (fakes.length > 2 || (fakes.length === 2 && c.travelers.length !== 4)) return false;
    for (const t of c.travelers) {
      if (people.has(t.who) || !D.travelers[t.who]) return false;
      people.add(t.who);
      if (t.ev.length !== 4 || t.ev.some((e,i) => e.type !== ['photo','temp','quote','item'][i] || e.v !== verdict(e,c.claim).v || e.why !== verdict(e,c.claim).why)) return false;
      photos.push(t.ev[0].img);
      if (!t.fake) { if (t.ev.some(e => e.v === 'lie')) return false; }
      else {
        if (!D.climates[c.claim].confuse.includes(t.fake) || t.ev[0].v !== 'lie' || t.ev.filter(e => e.v === 'lie').length < 2) return false;
        if (t.ev.some(e => verdict(e,t.fake).v === 'lie' || (e.v !== 'lie' && e.v !== 'ok'))) return false;
        if (!t.options.includes(t.fake) || t.options.includes(c.claim) || new Set(t.options).size !== t.options.length) return false;
      }
    }
    return new Set(photos).size === photos.length;
  }
  function generate(rng = Math.random, previous, streak = 0) {
    const pick = a => a.length ? a[Math.floor(rng()*a.length)] : undefined;
    const shuffle = a => { a = [...a]; for (let i=a.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
    const claim = pick(ids.filter(id => id !== previous));
    for (let attempt=0;attempt<500;attempt++) {
      const n = rng() < (streak >= B.endless.travelers.fourFrom ? .7 : .3) ? B.endless.travelers.max : B.endless.travelers.min;
      const weights = Object.entries(B.endless.fakeWeights).filter(([k]) => +k !== 2 || n === 4);
      let roll = rng()*weights.reduce((s,[,w])=>s+w,0), k = +weights.at(-1)[0];
      for (const [count,w] of weights) { roll -= w; if (roll<0) { k=+count;break; } }
      const used = new Set(), travelers = [], who = shuffle(Object.keys(D.travelers));
      let neutralUsed = false, failed = false;
      for (let i=0;i<n;i++) {
        const fake = i<k ? pick(D.climates[claim].confuse) : undefined, home = fake || claim;
        const trueHere = e => verdict(e,claim).v !== 'lie';
        const lies = e => verdict(e,claim).v === 'lie';
        const homePool = type => pools[type].filter(e => type==='item' ? verdict(e,home).v !== 'lie' : e.home===home);
        const photo = pick(homePool('photo').filter(e=>!used.has(e.img) && (fake ? lies(e) : trueHere(e))));
        if (!photo) { failed=true;break; } used.add(photo.img);
        const ev = [photo];
        const lieType = fake ? pick(['temp','quote','item'].filter(type=>homePool(type).some(lies))) : null;
        if (fake && !lieType) { failed=true;break; }
        for (const type of ['temp','quote','item']) {
          let choices;
          if (!fake) {
            choices = homePool(type).filter(trueHere);
            if (type==='quote' && !neutralUsed && rng()<.2) choices=neutral;
          } else if (type===lieType) choices=homePool(type).filter(lies);
          else {
            choices = type==='quote' ? (!neutralUsed ? neutral : []) : homePool(type).filter(e=>verdict(e,claim).v==='ok');
            if (!choices.length) choices=homePool(type).filter(lies);
          }
          const e=pick(choices); if (!e) { failed=true;break; }
          if (neutral.includes(e)) neutralUsed=true;
          ev.push(e);
        }
        if (failed) break;
        const options = fake ? shuffle([fake,...shuffle(D.climates[claim].confuse.filter(id=>id!==fake && id!==claim)),...shuffle(ids.filter(id=>id!==claim && id!==fake && !D.climates[claim].confuse.includes(id)))].slice(0,3)) : undefined;
        travelers.push({ who:who[i], fake, real:fake ? pick(D.climates[fake].gallery.filter(img=>img!==photo.img)) : undefined, options, ev:ev.map(e=>({...e,...verdict(e,claim)})) });
      }
      if (failed) continue;
      if (rng()<B.endless.forceTrapChance && !travelers.some(t=>!t.fake && t.ev.some(e=>e.v==='trap'))) {
        const candidates=[];
        travelers.forEach((t,i)=>{ if(t.fake)return; ['photo','temp','quote','item'].forEach((type,j)=>{
          pools[type].filter(e=>(type==='item'||e.home===claim) && verdict(e,claim).v==='trap' && (type!=='photo'||e.img===t.ev[0].img||!used.has(e.img))).forEach(e=>candidates.push({i,j,e}));
        }); });
        const slot=pick(candidates); if(slot) travelers[slot.i].ev[slot.j]={...slot.e,...verdict(slot.e,claim)};
      }
      const c={ id:'∞', endless:true, claim, travelers:shuffle(travelers) };
      if(validate(c)) return c;
    }
    throw new Error('공정한 사건을 만들지 못했습니다.');
  }
  window.Replay = { verdict, seeded, generate, validate };
})();
