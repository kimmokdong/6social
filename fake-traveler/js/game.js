/* 콘텐츠는 data.js에서만 읽는다. file://에서도 실행되는 정적 게임. */
(() => {
  'use strict';
  const D = window.FAKE, app = document.querySelector('#app'), modal = document.querySelector('#modal');
  const KEY = 'fake-traveler-v1', debug = new URLSearchParams(location.search).get('debug') === '1';
  const climateIds = Object.keys(D.climates), types = ['photo', 'temp', 'quote', 'item'];
  const labels = ['사진', '기온', '한마디', '짐'];
  const B = window.FAKE_BANK, allPhotos = [...new Set(climateIds.flatMap(id=>D.climates[id].gallery))];
  const fresh = () => ({ stars: Array(D.cases.length).fill(0), sound: false, music: true, debugUnlocked: false, endless:{best:0,streak:0}, endlessStars:0, badges:[], badgeSeen:[], photos:[], climates:[], counters:{solved:0,perfect:0,trap:0}, liar:{me:null,unlocked:[],best:{},badges:[],played:0} });
  const params = new URLSearchParams(location.search);
  let rng = debug && params.has('seed') ? Replay.seeded(params.get('seed')) : Math.random, endlessCase, previousClaim;
  const currentCase = () => endlessCase || D.cases[caseIndex];
  let progress = fresh(), screen = 'title', caseIndex = 0, run, selected, busy = false, epoch = 0;
  let bookTab = 'cards', bookFrom = 'title', galleryIndex = 0, galleryClimate, returnFocus;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.stars)) {
      progress.stars = progress.stars.map((_, i) => Number.isInteger(saved.stars[i]) && saved.stars[i] >= 0 && saved.stars[i] <= 3 ? saved.stars[i] : 0);
      progress.sound = saved.sound === true;
      progress.music = saved.music !== false;
      progress.debugUnlocked = saved.debugUnlocked === true;
      const nonnegative = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
      progress.endless = {best:nonnegative(saved.endless?.best),streak:nonnegative(saved.endless?.streak)};
      progress.endless.best = Math.max(progress.endless.best, progress.endless.streak);
      progress.endlessStars = nonnegative(saved.endlessStars);
      for(const key of ['badges','badgeSeen','photos','climates']) progress[key] = [...new Set(Array.isArray(saved[key]) ? saved[key].filter(id=>(key==='photos'?allPhotos:key==='climates'?climateIds:B.badges.map(b=>b.id)).includes(id)) : [])];
      for(const key of Object.keys(progress.counters)) progress.counters[key] = nonnegative(saved.counters?.[key]);
      const l = saved.liar && typeof saved.liar === 'object' ? saved.liar : {}, stages = ['town','nation','world'];
      progress.liar = { me: D.travelers[l.me] ? l.me : null, unlocked: Array.isArray(l.unlocked) ? l.unlocked.filter(x=>stages.includes(x)) : [],
        best: Object.fromEntries(Object.entries(l.best && typeof l.best === 'object' ? l.best : {}).filter(([k,v])=>stages.includes(k) && Number.isInteger(v) && v>=1 && v<=4)),
        badges: Array.isArray(l.badges) ? l.badges.filter(x=>['win','world','escape','detective'].includes(x)) : [], played: nonnegative(l.played) };
    }
  } catch (_) { /* 차단되거나 손상된 저장소는 빈 여권으로 시작한다. */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_) {} }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function particle(word, pair) { const n=word.trim().charCodeAt(word.trim().length-1)-0xAC00; return word + pair.split('/')[n>=0 && n<=11171 && n%28 ? 0 : 1]; }
  function natural(text) { return text.replace(/서안 해양성 기후/g,'서부 유럽의 기후').replace(/지중해성 기후/g,'지중해 주변 지역의 기후').replace(/서안 해양성/g,'서부 유럽').replace(/지중해성/g,'지중해 주변 지역').replace(/([가-힣]+)(은\(는\)|이\(가\)|을\(를\)|과\(와\)|\(는\)|\(이\)|\(을\))/g,(_,word,p)=>particle(word,{'은(는)':'은/는','이(가)':'이/가','을(를)':'을/를','과(와)':'과/와','(는)':'은/는','(이)':'이/가','(을)':'을/를'}[p])); }
  const paths = {
    home: '<path d="m2 11 10-8 10 8M5 9v12h14V9M9 21v-8h6v8"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
    twin: '<circle cx="8" cy="8" r="3.5"/><circle cx="16.5" cy="8" r="3.5"/><path d="M2 21q0-7 6-7t6 7M12 15q1.5-1 4.5-1 5.5 0 5.5 7"/>',
    flame: '<path d="M12 22c-4.4 0-7-2.8-7-6.6C5 11 9 9 9 4.5 12 6 13 8.5 13 11c1-1 1.6-2.4 1.7-3.7C17.5 9.6 19 12.6 19 15.4 19 19.2 16.4 22 12 22Z"/><path d="M12 22c-1.9 0-3-1.3-3-3 0-2.4 3-3.4 3-6 2 1.6 3 3.6 3 6 0 1.7-1.1 3-3 3Z"/>',
    glass: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M6 8q1-3 4-3"/>',
    photo: '<path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/>',
    temp: '<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M12 8v10m6-12h3m-3 4h2"/>',
    quote: '<path d="M3 4h18v13H10l-5 4v-4H3Z"/><path d="M7 9h10M7 13h6"/>',
    item: '<rect x="4" y="7" width="16" height="14" rx="3"/><path d="M9 7V3h6v4M8 8v12m8-12v12"/>',
    rain: '<path d="M3 13a9 9 0 0 1 18 0q-3-4-6 0-3-4-6 0-3-4-6 0Zm9-10v16q0 4-3 2M4 3l-1 2m17-2-1 2"/>',
    eye: '<path d="M2 12q10-13 20 0-10 13-20 0Z"/><circle cx="12" cy="12" r="3"/>',
    mountain: '<path d="m2 21 10-18 10 18ZM8 10l4 3 4-3"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
    gear: '<path d="m9 3 6 0 1 3 3 1 2 5-2 3-3 1-1 5H9l-1-5-3-1-2-3 2-5 3-1Z"/><circle cx="12" cy="12" r="3"/>',
    sound: '<path d="M3 9h4l5-5v16l-5-5H3Zm13-2q6 5 0 10m3-13q9 8 0 16"/>',
    muted: '<path d="M3 9h4l5-5v16l-5-5H3Zm13 0 5 6m0-6-5 6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    check: '<path d="m4 12 5 6L20 5"/>',
    star: '<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
    book: '<path d="M12 5Q6 1 2 4v16q5-3 10 0 5-3 10 0V4q-4-3-10 1Zm0 0v15"/>'
  };
  function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.glass}</svg>`; }
  function image(id, kind = 'scenes', alt = '여행 사진', lazy = false, cls = '') {
    const path = id === 'cover' ? 'assets/img/cover.webp' : `assets/img/${kind}/${id}.webp`;
    return `<img src="${path}" alt="${esc(alt)}" ${lazy ? 'loading="lazy"' : ''} draggable="false" class="${cls}">`;
  }
  function button(action, text, cls = '', extra = '') { return `<button type="button" data-action="${action}" class="${cls}" ${extra}>${text}</button>`; }
  function chip(id) { const c = D.climates[id], g = D.groups[c.group]; return `<span class="chip" style="--group:${g.color}">${g.name}</span>`; }
  function soundButton() { return button('sound', icon(progress.sound ? 'sound' : 'muted'), 'icon-button', `aria-label="소리 ${progress.sound ? '끄기' : '켜기'}" aria-pressed="${progress.sound}"`); }
  function top(title, back = 'passport') { return `<header class="topbar">${button(back, icon('back'), 'icon-button', 'aria-label="뒤로"')}<h1>${title}</h1><div class="top-actions">${soundButton()}${button('settings', icon('gear'), 'icon-button', 'aria-label="설정"')}</div></header>`; }
  function stars(n, animated = false) { return `<span class="stars ${animated ? 'pop-stars' : ''}" aria-label="별 ${n}개">${[0,1,2].map(i => icon('star', i < n ? 'earned' : 'empty')).join('')}</span>`; }
  function unlockedCase(i) { return i === 0 || progress.debugUnlocked || progress.stars[i - 1] > 0; }
  function unlockedClimates() {
    const set = new Set(progress.climates);
    D.cases.forEach((c, i) => { if (progress.stars[i]) { set.add(c.claim); c.travelers.forEach(t => { if (t.fake) set.add(t.fake); }); } });
    if (progress.debugUnlocked) climateIds.forEach(id => set.add(id));
    return set;
  }
  function totalStars() { return progress.stars.reduce((a,b)=>a+b,0)+progress.endlessStars; }
  function rank() { return B.ranks.filter(r=>r.stars<=totalStars()).at(-1); }
  function rankCard() {
    const r=rank(), next=B.ranks[B.ranks.indexOf(r)+1], total=totalStars();
    return `<div class="rank-card"><strong>${r.name}</strong><span>★ ${total}${next?` · 다음 등급까지 ${next.stars-total}`:''}</span><progress max="${next?next.stars-r.stars:1}" value="${next?total-r.stars:1}" aria-label="다음 탐정 등급까지 진행"></progress></div>`;
  }
  function endlessUnlocked() { return progress.debugUnlocked || progress.stars.at(-1)>0; }
  function badgeStamps() { return `<section class="badge-grid">${B.badges.map((b,i)=>`<article class="badge-stamp ${progress.badges.includes(b.id)?'':'badge-locked'}" style="--stamp:${Object.values(D.groups)[i%6].color}">${icon({first:'glass',perfect:'star',trap:'eye',speed:'bolt',nofake:'check',twin:'twin',streak:'flame',dex:'book',photo:'photo'}[b.id]||'star')}<h3>${b.name}</h3><p>${progress.badges.includes(b.id)?'획득!':b.goal}</p>${progress.badges.includes(b.id)&&!progress.badgeSeen.includes(b.id)?'<span class="badge-new">NEW</span>':''}</article>`).join('')}</section>`; }
  function play(name) { SFX.play(name, progress.sound); }
  function announce(text) { document.querySelector('#announcer').textContent = text; }
  function debugBar() { return debug ? `<aside class="debug">${button('unlock', '전체 열기')}${button('seed', '시드 사건')}${button('answer','정답 보기','',!run?'disabled':'')}${button('solve', '현재 사건 해결', '', !run || !['board','intro','reveal'].includes(screen) ? 'disabled' : '')}</aside>` : ''; }
  function setScreen(name, html, keepView = false) {
    if(!keepView) closeModal(false); screen = name; app.className = `screen screen-${name}`;
    if(name !== 'liar') window.GameMusic?.theme('mystery');
    app.innerHTML = natural(html) + debugBar();
    if(!modal.open) app.focus({preventScroll:true});
    if(!keepView) window.scrollTo(0,0);
  }
  function title() {
    setScreen('title', `<header class="title-top"><a class="title-guide" href="../guides/traveler.html">게임 설명서</a><div class="top-actions">${soundButton()}${button('settings', icon('gear'), 'icon-button', 'aria-label="설정"')}</div></header><section class="title-layout"><div class="title-copy"><h1>가짜 여행자를<br><span>찾아라!</span>${icon('glass', 'logo-glass')}</h1>${rankCard()}<div class="title-buttons">${button('liar', `라이어 여행단 ${icon('arrow')}`, 'primary')}${button('passport', `${icon('glass')} 탐정 연습`, 'secondary')}${button('book', `${icon('book')} 기후 도감 <span class="count">${unlockedClimates().size}/${climateIds.length}</span>`, 'secondary')}</div></div><figure class="cover polaroid">${image('cover')}<span class="tape"></span></figure>${image('owl_point','people','탐정 부엉이',false,'title-owl')}</section>`);
  }
  function passport() {
    const next = progress.stars.findIndex(s => !s);
    setScreen('passport', `${top('탐정 연습','title')}${rankCard()}<section class="passport"><div class="passport-heading"><span>${progress.stars.filter(Boolean).length}/${D.cases.length} 사건 해결</span></div><div class="stamp-grid">${D.cases.map((c,i) => {
      const cl = D.climates[c.claim], locked = !unlockedCase(i), n = progress.stars[i];
      return button('case', `<span class="case-no">사건 ${c.id.toString().padStart(2,'0')}${c.final ? ' · 최종' : ''}</span><div class="stamp-scene">${image(cl.img,'scenes',cl.name)}${locked ? icon('lock','lock-overlay') : ''}</div><strong>${cl.name}</strong>${n ? `<span class="solved-stamp" style="--group:${D.groups[cl.group].color}">수사 완료 ${stars(n)}</span>` : `<span class="slot-state">${locked ? '앞 사건을 해결해 줘' : '수사하러 가기 '+icon('arrow')}</span>`}`, `stamp-slot ${locked ? 'locked' : ''} ${i === next ? 'next-case' : ''}`, `data-index="${i}" ${locked ? 'disabled' : ''}`);
    }).join('')}</div><div class="endless-page">${button('endless',`${endlessUnlocked()?icon('glass'):icon('lock')}<strong>무한 수사</strong><span>${endlessUnlocked()?`최고 연속 ${progress.endless.best}건`:'사건 10을 해결하면 열려요'}</span>`,'endless-slot',endlessUnlocked()?'':'disabled')}</div><span class="passport-seam" aria-hidden="true"></span></section><footer class="page-footer">${button('book',icon('book')+' 기후 도감','secondary')}${button('badges','배지','secondary')}</footer>`);
  }
  function facts(c) { return `<div class="facts">${[['temp',c.temp],['rain',c.rain],['eye',c.look]].map(([k,v]) => `<div>${icon(k)}<span>${esc(v)}</span></div>`).join('')}</div>`; }
  function tutorial(at) {
    if (!run || !currentCase().tutorial || run.hints.has(at)) return '';
    const t = D.tutorial.find(t => t.at === at);
    return button('hint', `${image(t.owl,'people','탐정 부엉이')}<span>${t.text}</span>${icon('check')}`, 'tutorial', `data-at="${at}" aria-label="${t.text} 안내 닫기"`);
  }
  function newCase(i) {
    if (!unlockedCase(i)) return;
    endlessCase=null; epoch++; busy = false; caseIndex = i; run = { started:0, awarded:false, trapObjected:false, lives:3, caught:new Set(), revealed:new Set(), checked:new Set(), lies:new Set(), rejected:{}, hints:new Set(), options:{} }; intro();
  }
  function newEndless(retry=false) {
    if(!endlessUnlocked())return;
    epoch++;busy=false;
    try {
      if(!retry || !endlessCase) endlessCase=Replay.generate(rng,previousClaim,progress.endless.streak);
      previousClaim=endlessCase.claim;
    } catch (_) {
      setScreen('loading',`<div class="loading-state">${image('owl_shock','people','탐정 부엉이')}<h2>사건을 다시 준비하자.</h2>${button('endless','다시 준비','primary')}${button('passport','여권','secondary')}</div>`);return;
    }
    run={lives:3,caught:new Set(),revealed:new Set(),checked:new Set(),lies:new Set(),rejected:{},hints:new Set(),options:{},started:0,awarded:false,trapObjected:false};
    startBoard();
  }
  function optionPhoto(id) {
    const c=currentCase(), used=new Set(c.travelers.flatMap(t=>t.ev.filter(e=>e.type==='photo').map(e=>e.img)));
    const choices=D.climates[id].gallery.filter(img=>!used.has(img));
    return choices.length ? choices[(c.endless?climateIds.indexOf(c.claim):caseIndex)%choices.length] : null;
  }
  function intro() {
    const c = currentCase(), cl = D.climates[c.claim], count = c.travelers.filter(t=>t.fake).length;
    setScreen('intro', `${top(`사건 ${c.id.toString().padStart(2,'0')}`)}<section class="intro-layout"><figure class="intro-photo polaroid">${image(cl.img,'scenes',cl.name)}<span class="tape"></span></figure><div class="intro-info"><div>${chip(c.claim)}<span class="eyebrow">모두 이곳에 다녀왔대!</span></div><h2>${cl.name}</h2>${facts(cl)}<div class="intro-travelers">${c.travelers.map(t=>`<figure>${image(D.travelers[t.who].img,'people',D.travelers[t.who].name)}<figcaption>${D.travelers[t.who].name}</figcaption></figure>`).join('')}</div><p class="mission">가짜가 <strong>${count}명</strong> 숨어 있어!</p>${button('start',`수사 시작 ${icon('arrow')}`,'primary')}</div></section>${tutorial('intro')}`);
  }
  async function startBoard() {
    const token = ++epoch, c = currentCase(), sources = new Set();
    c.travelers.forEach(t => {
      sources.add(`assets/img/people/${D.travelers[t.who].img}.webp`);
      if(t.real) sources.add(`assets/img/scenes/${t.real}.webp`);
      (t.options || []).forEach(id=>{const img=optionPhoto(id);if(img)sources.add(`assets/img/scenes/${img}.webp`);});
      t.ev.forEach(e=>{ if(e.img) sources.add(`assets/img/scenes/${e.img}.webp`); if(e.item) sources.add(`assets/img/items/${e.item}.webp`); });
    });
    setScreen('loading', `<div class="loading-state">${image('owl_point','people','탐정 부엉이')}<h1>증거를 펼치는 중…</h1></div>`);
    await Promise.all([...sources].map(src => new Promise(resolve => {
      const img = new Image(), timeout = setTimeout(()=>resolve(false),8000);
      img.onload = ()=>{clearTimeout(timeout);resolve(true);}; img.onerror = ()=>{clearTimeout(timeout);resolve(false);}; img.src=src;
    })));
    if(token !== epoch) return;
    if(!run.started)run.started=performance.now();
    board();
  }
  function lives(cracked = false) { return `<span class="lives" aria-label="남은 돋보기 ${run.lives}개">${[0,1,2].map(i=>`<span class="glass ${i>=run.lives ? 'spent' : ''} ${cracked && i===run.lives ? 'cracking' : ''}">${icon('glass')}${cracked && i===run.lives ? '<svg class="fracture" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 3 4 6-4 3 5 4"/></svg>' : ''}</span>`).join('')}</span>`; }
  function evidence(e) {
    const cap = e.cap ? `<span class="cap">${e.cap}</span>` : '';
    if(e.type === 'photo') return `<span class="photo-wrap">${image(e.img)}<span class="tape"></span>${cap}</span>`;
    if(e.type === 'quote') return `<span class="speech">${esc(e.text)}</span>`;
    if(e.type === 'item') return `<span class="item-wrap">${image(e.item,'items',D.items[e.item])}<strong>${D.items[e.item]}</strong></span>`;
    const value = Number((e.text.match(/-?\d+/)||[0])[0]), fill = Math.max(8,Math.min(92,(value+35)/85*100));
    return `<span class="temp-wrap" style="--mercury:${value<12?'#4B91BA':'#D9412E'}"><svg class="thermometer" viewBox="0 0 40 100" aria-hidden="true"><path d="M12 72V12a8 8 0 0 1 16 0v60a15 15 0 1 1-16 0" fill="#FBF5EA" stroke="#6B5F52" stroke-width="2.5"/><rect x="16" y="${74-fill*.65}" width="8" height="${fill*.65+5}" rx="4" fill="var(--mercury)"/><circle cx="20" cy="84" r="9" fill="var(--mercury)"/><path d="M30 20h5m-5 13h3m-3 13h5m-5 13h3" stroke="#6B5F52" stroke-width="2"/></svg><strong>${esc(e.text)}</strong>${cap}</span>`;
  }
  function board() {
    const c = currentCase(), total = c.travelers.filter(t=>t.fake).length;
    if(!c.endless && run.revealed.size===total) {clearCase();return;}
    setScreen('board', `<header class="board-header"><span class="case-label">${c.endless?'무한 수사':`사건 ${c.id.toString().padStart(2,'0')}`}</span>${button('claim',D.climates[c.claim].name+icon('book'),'claim-chip',`style="--group:${D.groups[D.climates[c.claim].group].color}" aria-label="${D.climates[c.claim].name} 기후 카드 보기"`)}${lives()}<strong class="fake-count">가짜 ${c.endless?'?명':`${run.revealed.size}/${total}`}</strong>${c.endless?`<span class="streak-count">연속 ${progress.endless.streak}건</span>`:''}${button('settings',icon('gear'),'icon-button','aria-label="메뉴와 설정"')}</header><section class="lineup" aria-label="여행자의 증거 비교표" style="--rows:${c.travelers.length}"><div class="column-head"><span>여행자</span>${types.map((t,i)=>`<span>${icon(t)}${labels[i]}</span>`).join('')}</div>${c.travelers.map((t,i)=>{
      const person = D.travelers[t.who], caught = run.caught.has(i), revealed = run.revealed.has(i);
      return `<div class="traveler-row ${caught?'caught':''} ${i===0 && c.tutorial && !run.hints.has('board')?'hint-row':''}" data-traveler="${i}"><div class="traveler"><div class="portrait polaroid">${image(person.img,'people',person.name)}${caught?'<span class="caught-stamp">가짜!</span>':''}</div><strong>${person.name}</strong>${revealed?`<span class="real-badge" style="--group:${D.groups[D.climates[t.fake].group].color}">${D.climates[t.fake].name}</span>`:''}</div>${t.ev.map((e,j)=>{
        const key = `${i}-${j}`, checked=run.checked.has(key), lie=run.lies.has(key);
        return button('evidence',`${evidence(e)}${checked?`<span class="evidence-check">${icon('check')}<span class="sr-only">확인한 진짜 증거</span></span>`:''}${lie?'<span class="lie-stamp">거짓!</span>':''}`,`evidence ev-${e.type} ${lie?'marked-lie':''}`,`data-traveler="${i}" data-evidence="${j}" aria-label="${person.name}의 ${labels[j]}${checked?' · 진짜 증거 확인됨':''}"`);
      }).join('')}</div>`;
    }).join('')}</section><footer class="board-footer"><div class="pending-reveals">${c.travelers.map((t,i)=>run.caught.has(i)&&!run.revealed.has(i)?button('reveal',`${D.travelers[t.who].name} 정체 밝히기`,'danger',`data-traveler="${i}"`):'').join('') || (tutorial('board')?'':`<span>${icon('glass')} 수상한 증거를 눌러 봐!</span>`)}</div>${c.endless?button('finish','수사 끝! 나머지는 진짜','primary finish-button'):''}${button('passport',icon('book')+' 여권','text-button')}</footer>${tutorial('board')}`);
  }
  function showModal(html, cls = '') {
    returnFocus = modal.open ? returnFocus : document.activeElement;
    modal.className = cls; modal.innerHTML = natural(html);
    if(!modal.open) modal.showModal();
    modal.querySelector('button:not([disabled])')?.focus({preventScroll:true});
    modal.scrollTop = 0;
  }
  function closeModal(restore = true) {
    if(modal.open) modal.close();
    if(restore) (returnFocus?.isConnected ? returnFocus : app).focus({preventScroll:true});
  }
  function modalClose() { return button('close',icon('close'),'icon-button modal-close','aria-label="닫기"'); }
  function zoom(i,j) {
    run.hints.add('board');app.querySelector('[data-action="hint"]')?.remove();app.querySelector('.hint-row')?.classList.remove('hint-row');
    selected={i,j}; const t=currentCase().travelers[i], e=t.ev[j], p=D.travelers[t.who], key=`${i}-${j}`;
    const settled = run.caught.has(i) || run.checked.has(key);
    showModal(`<header class="zoom-header">${image(p.img,'people',p.name)}<h2>${p.name}의 ${labels[j]}</h2>${modalClose()}</header><div class="zoom-evidence ev-${e.type} ${run.lies.has(key)?'marked-lie':''}">${evidence(e)}</div>${settled?`<p class="reason">${run.checked.has(key)?'확인한 진짜 증거야.':run.revealed.has(i)?'정체를 밝혀낸 여행자야!':'가짜 여행자를 찾아냈어!'}</p>`:''}<footer class="modal-actions">${settled?button('close','계속','primary'):button('accuse',icon('glass')+' 수상해!','danger')}${!settled?button('close','통과','secondary'):''}</footer>`,'evidence-modal');
  }
  async function animateResult(name) {
    busy=true; modal.classList.add('animating'); play(name); const token=epoch;
    await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?100:700));
    if(token!==epoch) return false;
    busy=false; modal.classList.remove('animating'); modal.querySelectorAll('[data-after-animation]').forEach(b=>b.disabled=false);modal.querySelector('[data-after-animation]')?.focus({preventScroll:true}); return true;
  }
  async function accuse() {
    if(!selected || busy) return;
    const {i,j}=selected, c=currentCase(), t=c.travelers[i], e=t.ev[j], key=`${i}-${j}`;
    if(run.caught.has(i) || run.checked.has(key)) return;
    const correct=e.v==='lie';
    if(e.v==='trap')run.trapObjected=true;
    if(correct) {run.caught.add(i);run.lies.add(key);} else {run.checked.add(key);run.lives--;}
    board();
    const why=e.why || D.okWhy.replace('{claim}',D.climates[c.claim].name);
    showModal(`<div class="result-top">${lives(!correct)}<span>${D.travelers[t.who].name}의 증거</span></div><div class="burst ${correct?'objection':'wrong-burst'}">${correct?'이의 있음!':'앗!'}</div>${!correct?'<h2 class="wrong-title">진짜 증거야</h2>':''}<div class="result-evidence ev-${e.type} ${correct?'marked-lie':''}">${evidence(e)}${correct?'<span class="lie-stamp">거짓!</span>':`<span class="evidence-check">${icon('check')}</span>`}</div><p class="reason">${why}</p><footer class="modal-actions">${button(correct?'reveal':'continue',correct?'정체 밝히기':'계속',correct?'danger':'primary',`data-traveler="${i}" data-after-animation disabled`)}</footer>`,'result-modal');
    announce(`${correct?'이의 있음!':'앗! 진짜 증거야.'} ${why}`);
    if(!correct) {play('crack');} await animateResult(correct?'objection':'wrong');
  }
  function shuffle(values) { const a=[...values]; for(let i=a.length-1;i>0;i--) { const j=Math.floor((currentCase().endless?rng():Math.random())*(i+1));[a[i],a[j]]=[a[j],a[i]]; } return a; }
  function reveal(i) {
    selected={i}; const t=currentCase().travelers[i];
    if(!run.caught.has(i) || run.revealed.has(i)) {board();return;}
    run.options[i] ||= shuffle(t.options); run.rejected[i] ||= new Set();
    setScreen('reveal',`${top('정체 밝히기','board')}<section class="reveal-layout"><div class="reveal-question">${image(D.travelers[t.who].img,'people',D.travelers[t.who].name)}<h2>${D.travelers[t.who].name}의<br>진짜 여행지는?</h2>${lives()}${run.rejected[i].size?'<p class="reveal-error" role="status">앗! 다른 곳을 골라 봐.</p>':''}</div><div class="option-grid">${run.options[i].map(id=>button('option',`${optionPhoto(id)?image(optionPhoto(id),'scenes',D.climates[id].name):'<span class="blank-photo">?</span>'}<div>${chip(id)}<h3>${D.climates[id].name}</h3></div>${run.rejected[i].has(id)?'<span class="option-wrong">다른 곳이야</span>':''}`,'climate-option polaroid',`data-climate="${id}" ${run.rejected[i].has(id)?'disabled':''}`)).join('')}</div></section>${tutorial('reveal')}`);
  }
  async function choose(id) {
    if(busy || !selected) return;
    const i=selected.i, t=currentCase().travelers[i];
    if(!t.options.includes(id) || run.rejected[i].has(id) || run.revealed.has(i)) return;
    if(id!==t.fake) {
      run.rejected[i].add(id);run.lives--; reveal(i);play('crack');announce('다른 곳이야. 남은 돋보기 '+run.lives+'개');
      app.querySelector('.glass.spent')?.classList.add('cracking');
      if(!run.lives) {busy=true;const token=epoch;await new Promise(r=>setTimeout(r,650));if(token!==epoch)return;busy=false;fail();}
      return;
    }
    run.revealed.add(i); play('stamp');
    setScreen('revealed',`${top('들켰다!','board')}<section class="revealed-layout"><div class="flip-record"><figure class="old-portrait polaroid">${image(D.travelers[t.who].img,'people',D.travelers[t.who].name)}<figcaption>${D.travelers[t.who].name}</figcaption></figure><figure class="real-photo polaroid">${image(t.real)}<figcaption>${D.climates[t.fake].name}</figcaption><span class="big-stamp" style="--group:${D.groups[D.climates[t.fake].group].color}">들켰다!</span><span class="tape"></span></figure></div><h2>${particle(D.travelers[t.who].name,'은/는')} 사실<br><span class="climate-name">${D.climates[t.fake].name}</span>에 다녀왔어!</h2>${button('after-reveal',currentCase().endless?'수사 계속 '+icon('arrow'):run.revealed.size===currentCase().travelers.filter(t=>t.fake).length?'사건 해결!':'다음 가짜 찾기 '+icon('arrow'),'primary')}</section>`);
  }
  function clearCase() {
    if(run.awarded)return;
    run.awarded=true;
    const c=currentCase(), before=unlockedClimates(), oldRank=rank(), n=run.lives;
    if(c.endless) { progress.endlessStars+=n;progress.endless.streak++;progress.endless.best=Math.max(progress.endless.best,progress.endless.streak); }
    else progress.stars[caseIndex]=Math.max(progress.stars[caseIndex],n);
    progress.climates=[...new Set([...progress.climates,c.claim,...c.travelers.filter(t=>t.fake).map(t=>t.fake)])];
    progress.photos=[...new Set([...progress.photos,...c.travelers.flatMap((t,i)=>[...t.ev.filter(e=>e.type==='photo').map(e=>e.img),...(t.real && run.revealed.has(i)?[t.real]:[])])])];
    progress.counters.solved++;if(n===3)progress.counters.perfect++;
    if(c.travelers.some(t=>t.ev.some(e=>e.v==='trap'))&&!run.trapObjected)progress.counters.trap++;
    const k=c.travelers.filter(t=>t.fake).length;
    const earned={first:true,perfect:progress.counters.perfect>=5,trap:progress.counters.trap>=5,speed:run.started>0 && performance.now()-run.started<=30000,nofake:c.endless&&k===0,twin:c.endless&&k===2,streak:progress.endless.streak>=10,dex:unlockedClimates().size===climateIds.length,photo:allPhotos.every(img=>progress.photos.includes(img))};
    const newBadges=B.badges.filter(b=>earned[b.id]&&!progress.badges.includes(b.id));
    progress.badges.push(...newBadges.map(b=>b.id));save();
    const newly=[...unlockedClimates()].filter(id=>!before.has(id));
    play('clear');
    setScreen('clear',`${top('수사 기록','passport')}<section class="end-layout"><div class="end-hero">${image('owl_happy','people','기뻐하는 탐정 부엉이')}<div><h2>사건 해결!</h2>${stars(n,true)}${c.endless?`<p class="mission">연속 ${progress.endless.streak}건 · 최고 ${progress.endless.best}건</p>`:''}<span class="clear-stamp" style="--group:${D.groups[D.climates[c.claim].group].color}">${D.climates[c.claim].name}<br>수사 완료</span></div></div>${rank()!==oldRank?`<div class="rank-up" role="status">${icon('star')} 등급 상승! <strong>${rank().name}</strong></div>`:''}${newBadges.length?`<div class="earned-badges">${newBadges.map(b=>button('badges',`${icon('star')}${b.name} 배지!`,'secondary')).join('')}</div>`:''}${newly.length?`<div class="new-cards"><h3>새 기후 카드!</h3><div>${newly.map(id=>button('detail',`${image(D.climates[id].img,'scenes',D.climates[id].name)}<strong>${D.climates[id].name}</strong>`,'new-card polaroid',`data-climate="${id}"`)).join('')}</div></div>`:''}<p class="photo-total">${icon('photo')} 모은 사진 ${progress.photos.length}/${allPhotos.length}</p><div class="end-actions">${c.endless || caseIndex<D.cases.length-1?button('next','다음 사건 '+icon('arrow'),'primary'):button('book','기후 도감 '+icon('book'),'primary')}${button('passport','여권','secondary')}</div></section>`);
    const token=epoch;[0,1,2].forEach(i=>{if(i<n)setTimeout(()=>{if(token===epoch&&screen==='clear')play('star');},400+i*180);});
    announce(`사건 해결! 별 ${n}개`);
  }
  function fail(missed=false) {
    busy=false;play('wrong');
    const c=currentCase(), lost=progress.endless.streak;
    if(c.endless){progress.endless.streak=0;save();}
    setScreen('fail',`${top('수사 기록')}<section class="fail-layout">${image('owl_shock','people','놀란 탐정 부엉이')}<h2>${missed?'가짜를 놓쳤어!':'가짜가 도망쳤어!'}</h2>${c.endless?`<p>연속 ${lost}건 → 0건 · 최고 ${progress.endless.best}건</p>`:'<p>단서를 다시 살펴보자.</p>'}${missed?`<div class="missed-evidence">${c.travelers.map((t,i)=>t.fake&&!run.revealed.has(i)?`<article><h3>${particle(D.travelers[t.who].name,'은/는')} ${D.climates[t.fake].name}에 다녀왔어!</h3><div>${t.ev.filter(e=>e.v==='lie').map(e=>`<figure><div class="missed-tile ev-${e.type} marked-lie">${evidence(e)}</div><figcaption>${e.why}</figcaption></figure>`).join('')}</div></article>`:'').join('')}</div>`:''}<div class="end-actions">${button('retry','다시 도전 '+icon('arrow'),'primary')}${button('passport','여권','secondary')}</div></section>`);announce(missed?'가짜를 놓쳤어!':'가짜가 도망쳤어! 다시 도전할 수 있어.');
  }
  function book() {
    const unlocked=unlockedClimates();
    setScreen('book',`${top('기후 도감','book-back')}<div class="book-tabs" role="tablist" aria-label="도감 보기">${button('tab-cards','기후 카드','tab',`role="tab" aria-selected="${bookTab==='cards'}"`)}${button('tab-ladder','구별법','tab',`role="tab" aria-selected="${bookTab==='ladder'}"`)}${button('tab-badges','배지','tab',`role="tab" aria-selected="${bookTab==='badges'}"`)}<span>${unlocked.size}/${climateIds.length}</span><span class="photo-total">${icon('photo')} ${progress.photos.length}/${allPhotos.length}</span></div>${bookTab==='cards'?`<section class="collection">${Object.entries(D.groups).map(([group,g])=>`<div class="climate-group" style="--group:${g.color}"><h2>${g.name}</h2><div>${climateIds.filter(id=>D.climates[id].group===group).map(id=>button('detail',`${image(D.climates[id].img,'scenes',unlocked.has(id)?D.climates[id].name:'잠긴 기후 카드',true)}<strong>${unlocked.has(id)?D.climates[id].name:'?'}</strong>${unlocked.has(id)?`<span class="photo-count">${D.climates[id].gallery.filter(img=>progress.photos.includes(img)).length}/${D.climates[id].gallery.length}</span>`:''}${!unlocked.has(id)?icon('lock','card-lock'):''}`,'collection-card polaroid '+(!unlocked.has(id)?'card-locked':''),`data-climate="${id}" ${!unlocked.has(id)?'disabled aria-label="잠긴 기후 카드"':''}`)).join('')}</div></div>`).join('')}</section>`:bookTab==='badges'?badgeStamps():ladder()}`);
    if(bookTab==='badges'){progress.badgeSeen=[...progress.badges];save();}
  }
  function ladder() {
    const unlocked=unlockedClimates();
    const leaf=id=>`<span class="ladder-leaf ${unlocked.has(id)?'':'leaf-locked'}" style="--group:${D.groups[D.climates[id].group].color}">${image(D.climates[id].img,'scenes',unlocked.has(id)?D.climates[id].name:'잠긴 기후',true)}<strong>${unlocked.has(id)?D.climates[id].name:'?'}</strong></span>`;
    return `<section class="ladder" aria-label="기후 구별 흐름도">${D.ladder.map((step,i)=>`<div class="ladder-step"><h2>${icon(['mountain','rain','temp'][i])}${step.q}</h2>${step.yes?`<span class="flow-line" aria-hidden="true">↳</span><div class="ladder-leaves">${step.yes.map(leaf).join('')}</div>`:`<div class="branches">${step.branches.map(b=>`<div><span>${b.label}</span><span class="flow-line" aria-hidden="true">↓</span>${b.groups.map(g=>`<strong class="group-end" style="--group:${D.groups[g].color}">${D.groups[g].name}</strong><div class="branch-climates">${climateIds.filter(id=>D.climates[id].group===g).map(leaf).join('')}</div>`).join('')}</div>`).join('')}</div>`}</div>`).join('')}</section>`;
  }
  function detail(id, index) {
    if(!unlockedClimates().has(id) && !(screen==='board' && id===currentCase().claim)) return;
    galleryClimate=id;const c=D.climates[id];if(index===undefined)index=Math.max(0,c.gallery.findIndex(img=>progress.photos.includes(img)));galleryIndex=(index+c.gallery.length)%c.gallery.length;
    showModal(`<header class="detail-header"><h2>${c.name}</h2>${chip(id)}${modalClose()}</header><div class="detail-layout"><div class="gallery"><div class="gallery-photo">${screen==='board' && id===currentCase().claim?image(c.img,'scenes',c.name):progress.photos.includes(c.gallery[galleryIndex])?image(c.gallery[galleryIndex],'scenes',c.name):'<div class="blank-photo" aria-label="아직 모으지 않은 사진">?</div>'}</div><div class="gallery-controls">${button('gallery-prev',icon('back'),'icon-button','aria-label="이전 사진"')}<span aria-live="polite">${galleryIndex+1} / ${c.gallery.length}</span><div class="photo-count">수집 ${c.gallery.filter(img=>progress.photos.includes(img)).length}/${c.gallery.length}</div>${button('gallery-next',icon('arrow'),'icon-button','aria-label="다음 사진"')}</div><div class="gallery-thumbs">${c.gallery.map((img,i)=>button('gallery',progress.photos.includes(img)?image(img,'scenes',c.name,true):'<span class="blank-photo">?</span>',i===galleryIndex?'active':'',`data-index="${i}" aria-label="${i+1}번째 사진" aria-pressed="${i===galleryIndex}"`)).join('')}</div></div><div class="detail-info">${facts(c)}<p class="where">${c.where}</p><h3>헷갈리는 친구</h3><div class="confuse">${c.confuse.map(other=>button('detail',`${D.climates[other].name}${unlockedClimates().has(other)?icon('arrow'):icon('lock')}`,'secondary',`data-climate="${other}" ${!unlockedClimates().has(other)?'disabled':''}`)).join('')}</div></div></div>`,'detail-modal');
  }
  function settings(confirm=false) {
    showModal(`<header class="detail-header"><h2>탐정의 설정</h2>${modalClose()}</header><div class="settings-body">${button('sound',`${icon(progress.sound?'sound':'muted')} 소리 ${progress.sound?'켜짐':'꺼짐'}`,'secondary',`aria-pressed="${progress.sound}"`)}${button('music',`${icon(progress.sound&&progress.music?'sound':'muted')} 배경 음악 ${progress.sound&&progress.music?'켜짐':'꺼짐'}`,'secondary',`aria-pressed="${progress.music}" ${progress.sound?'':'disabled'}`)}${run&&['board','reveal','intro','revealed'].includes(screen)?button('menu-passport',icon('book')+' 여권으로','secondary'):''}${button('menu-title','처음 화면','secondary')}${confirm?`<div class="reset-confirm"><h3>정말 지울까요?</h3><p>별·배지·사진·수사 기록이 모두 지워져요.</p>${button('reset','모두 지우기','danger')}${button('settings','취소','secondary')}</div>`:button('reset-confirm','진행 기록 초기화','text-button')}</div>`,'settings-modal');
  }
  function syncMusic() { window.GameMusic?.setEnabled(progress.sound && progress.music); }
  function toggleSound() {
    progress.sound=!progress.sound;save();syncMusic();play('tap');
    if(modal.open && modal.classList.contains('settings-modal')) settings();
    else {const b=app.querySelector('[data-action="sound"]');if(b){b.innerHTML=icon(progress.sound?'sound':'muted');b.setAttribute('aria-label','소리 '+(progress.sound?'끄기':'켜기'));b.setAttribute('aria-pressed',progress.sound);}}
  }
  function renderCurrent() { ({title,passport,intro,board,book}[screen] || title)(); }
  async function action(b) {
    if(busy||b.disabled)return;
    const a=b.dataset.action;play('tap');
    switch(a) {
      case 'title':case 'menu-title': epoch++;play('paper');title();break;
      case 'passport':case 'menu-passport': epoch++;play('paper');passport();break;
      case 'case':newCase(Number(b.dataset.index));break;
      case 'endless':newEndless();break;
      case 'finish':if(currentCase().endless && screen==='board' && !run.awarded){if(currentCase().travelers.every((t,i)=>!t.fake || run.revealed.has(i)))clearCase();else fail(true);}break;
      case 'start':await startBoard();break;
      case 'board':board();break;
      case 'evidence':zoom(Number(b.dataset.traveler),Number(b.dataset.evidence));break;
      case 'accuse':await accuse();break;
      case 'continue':closeModal();if(!run.lives)fail();break;
      case 'close':closeModal();break;
      case 'reveal':reveal(Number(b.dataset.traveler));break;
      case 'option':await choose(b.dataset.climate);break;
      case 'after-reveal':if(!currentCase().endless && run.revealed.size===currentCase().travelers.filter(t=>t.fake).length)clearCase();else board();break;
      case 'next':if(currentCase().endless)newEndless();else newCase(caseIndex+1);break;
      case 'retry':if(currentCase().endless)newEndless(true);else newCase(caseIndex);break;
      case 'claim':detail(currentCase().claim);break;
      case 'hint':run.hints.add(b.dataset.at);b.remove();app.querySelector('.hint-row')?.classList.remove('hint-row');break;
      case 'book':bookFrom=screen;bookTab='cards';book();break;
      case 'badges':bookFrom=screen;bookTab='badges';book();break;
      case 'tab-badges':bookTab='badges';book();break;
      case 'book-back':if(bookFrom==='title')title();else passport();break;
      case 'tab-cards':bookTab='cards';book();break;
      case 'tab-ladder':bookTab='ladder';book();break;
      case 'detail':detail(b.dataset.climate);break;
      case 'gallery-prev':detail(galleryClimate,galleryIndex-1);break;
      case 'gallery-next':detail(galleryClimate,galleryIndex+1);break;
      case 'gallery':detail(galleryClimate,Number(b.dataset.index));break;
      case 'settings':settings();break;
      case 'sound':toggleSound();break;
      case 'music':progress.music=!progress.music;save();syncMusic();settings();break;
      case 'reset-confirm':settings(true);break;
      case 'reset':epoch++;progress=fresh();run=null;endlessCase=null;save();title();break;
      case 'unlock':if(debug){progress.debugUnlocked=true;save();renderCurrent();}break;
      case 'seed':if(debug){showModal(`<header class="detail-header"><h2>시드로 사건 만들기</h2>${modalClose()}</header><label class="seed-label">시드 <input id="case-seed" value="${esc(params.get('seed')||'20261010')}"></label>${button('seed-start','무한 수사 시작','primary')}`,'seed-modal');}break;
      case 'seed-start':if(debug){rng=Replay.seeded(modal.querySelector('input').value);progress.debugUnlocked=true;previousClaim=undefined;newEndless();}break;
      case 'answer':if(debug&&run){const c=currentCase();showModal(`<h2>숨은 정답</h2>${c.travelers.filter(t=>t.fake).map(t=>`<p class="reason">${D.travelers[t.who].name} → ${D.climates[t.fake].name}</p>`).join('')||'<p class="reason">모두 진짜!</p>'}${modalClose()}`);}break;
      case 'solve':if(debug&&run){currentCase().travelers.forEach((t,i)=>{if(t.fake){run.caught.add(i);run.revealed.add(i);}});clearCase();}break;
      default: if (window.LiarUI) LiarUI.action(b);
    }
  }
  document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(b)action(b);});
  document.addEventListener('keydown',e=>{
    if(busy || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    const tab=e.target.closest('[role="tab"]');
    if(tab && !modal.open){
      const tabs=[...app.querySelectorAll('[role="tab"]')],i=tabs.indexOf(tab);
      const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      e.preventDefault();const a=tabs[next].dataset.action;action(tabs[next]);app.querySelector(`[data-action="${a}"]`).focus({preventScroll:true});
    }else if(modal.open && modal.classList.contains('detail-modal') && e.key.startsWith('Arrow')){
      e.preventDefault();const direction=e.key==='ArrowRight'?'next':'prev';detail(galleryClimate,galleryIndex+(direction==='next'?1:-1));modal.querySelector(`[data-action="gallery-${direction}"]`).focus({preventScroll:true});
    }
  });
  // 그림을 못 불러와도 카드와 버튼은 남겨 둔다. 기존 사진 아이콘을 대체 표시한다.
  document.addEventListener('error', e => {
    const img=e.target;
    if(!(img instanceof HTMLImageElement) || img.dataset.fallback)return;
    img.dataset.fallback='true';img.alt+=' (사진을 불러오지 못했어요)';
    img.src='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" fill="#eee3d2"/><g transform="translate(48 28)" fill="none" stroke="#6b5f52" stroke-width="1.8">${paths.photo}</g></svg>`);
  }, true);
  modal.addEventListener('cancel',e=>{
    e.preventDefault();if(busy||modal.classList.contains('liar-lock'))return;
    if(modal.classList.contains('result-modal') && !run.lives){closeModal();fail();}else closeModal();
  });
  modal.addEventListener('keydown',e=>{if(busy){e.preventDefault();return;}if(e.key==='Tab'){
    const buttons=[...modal.querySelectorAll('button:not([disabled])')], first=buttons[0], last=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }});
  let touchX;
  modal.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});
  modal.addEventListener('touchend',e=>{if(modal.classList.contains('detail-modal')&&e.target.closest('.gallery-photo')){const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>50)detail(galleryClimate,galleryIndex+(dx<0?1:-1));}},{passive:true});
  /* 라이어 여행단(js/liar-ui.js)이 같은 모양으로 그리도록 도우미를 빌려 줌 */
  window.FT = { app, esc, icon, image, button, top, setScreen, showModal, closeModal, modalClose, play, evidence, progress: () => progress, save };
  syncMusic();
  title();
})();
