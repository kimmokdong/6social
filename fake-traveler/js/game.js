/* 콘텐츠는 data.js에서만 읽는다. file://에서도 실행되는 정적 게임. */
(() => {
  'use strict';
  const D = window.FAKE, app = document.querySelector('#app'), modal = document.querySelector('#modal');
  const KEY = 'fake-traveler-v1', debug = new URLSearchParams(location.search).get('debug') === '1';
  const climateIds = Object.keys(D.climates);
  const allPhotos = [...new Set(climateIds.flatMap(id=>D.climates[id].gallery))];
  const liarBadges = () => window.LiarUI?.BADGES || [];
  const fresh = () => ({ sound: false, music: true, debugUnlocked: false, badgeSeen:[], photos:[], climates:[], liar:{me:null,unlocked:[],best:{},badges:[],played:0,xp:0,chars:[]} });
  let progress = fresh(), screen = 'title', busy = false, epoch = 0;
  let bookTab = 'cards', galleryIndex = 0, galleryClimate, returnFocus;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === 'object') {
      progress.sound = saved.sound === true;
      progress.music = saved.music !== false;
      progress.debugUnlocked = saved.debugUnlocked === true;
      const nonnegative = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
      const badgeIds = liarBadges().map(b=>b.id);
      for(const key of ['badgeSeen','photos','climates']) progress[key] = [...new Set(Array.isArray(saved[key]) ? saved[key].filter(id=>(key==='photos'?allPhotos:key==='climates'?climateIds:badgeIds).includes(id)) : [])];
      const l = saved.liar && typeof saved.liar === 'object' ? saved.liar : {}, stages = ['town','nation','world'];
      progress.liar = { me: D.travelers[l.me] ? l.me : null, unlocked: Array.isArray(l.unlocked) ? l.unlocked.filter(x=>stages.includes(x)) : [],
        best: Object.fromEntries(Object.entries(l.best && typeof l.best === 'object' ? l.best : {}).filter(([k,v])=>stages.includes(k) && Number.isInteger(v) && v>=1 && v<=4)),
        badges: Array.isArray(l.badges) ? [...new Set(l.badges.filter(x=>badgeIds.includes(x)))] : [], played: nonnegative(l.played), xp: nonnegative(l.xp), chars: Array.isArray(l.chars) ? [...new Set(l.chars.filter(w=>D.travelers[w]))] : [] };
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
  function top(title, back = 'title') { return `<header class="topbar">${button(back, icon('back'), 'icon-button', 'aria-label="뒤로"')}<h1>${title}</h1><div class="top-actions">${soundButton()}${button('settings', icon('gear'), 'icon-button', 'aria-label="설정"')}</div></header>`; }
  function unlockedClimates() {
    const set = new Set(progress.climates);
    if (progress.debugUnlocked) climateIds.forEach(id => set.add(id));
    return set;
  }
  function liarCard() {
    const l = progress.liar;
    return `<div class="title-record">${window.LiarUI ? LiarUI.lvBar(l.xp) : ''}<span>대회 ${l.played}번 · 배지 ${l.badges.length}/${liarBadges().length}</span></div>`;
  }
  function badgeStamps() {
    window.LiarUI?.syncBadges();
    const got = progress.liar.badges, all = liarBadges(), groups = [...new Set(all.map(b=>b.group))];
    const stamp = (b,i) => { const has = got.includes(b.id), n = !has && window.LiarUI.badgeCount(b);
      return `<article class="badge-stamp ${has?'':'badge-locked'} ${b.who?'badge-who':''}" style="--stamp:${Object.values(D.groups)[i%6].color}"><span class="badge-seal">${b.who?image(D.travelers[b.who].img,'people',D.travelers[b.who].name,true,'badge-face'):icon(b.icon)}</span><div class="badge-text"><h3>${b.name}</h3><p>${b.goal}</p>${has?'<b class="badge-got">획득!</b>':n?`<span class="badge-prog"><progress max="${n[1]}" value="${Math.min(n[0],n[1])}" aria-label="${b.name} 진행"></progress><small class="badge-count">${Math.min(n[0],n[1])}/${n[1]}</small></span>`:''}</div>${has&&!progress.badgeSeen.includes(b.id)?'<span class="badge-new">NEW</span>':''}</article>`; };
    return `<p class="badge-total">${icon('star')} 모은 배지 ${got.length}/${all.length}</p>${groups.map(g=>{ const list = all.filter(b=>b.group===g); return `<section class="badge-section"><h2>${g} <small>${list.filter(b=>got.includes(b.id)).length}/${list.length}</small></h2><div class="badge-grid">${list.map((b,k)=>stamp(b,all.indexOf(b))).join('')}</div></section>`; }).join('')}`;
  }
  function play(name) { SFX.play(name, progress.sound); }
  function announce(text) { document.querySelector('#announcer').textContent = text; }
  function debugBar() { return debug ? `<aside class="debug">${button('unlock', '전체 열기')}</aside>` : ''; }
  function setScreen(name, html, keepView = false) {
    if(!keepView) closeModal(false); screen = name; app.className = `screen screen-${name}`;
    if(name !== 'liar') window.GameMusic?.theme('mystery');
    app.innerHTML = natural(html) + debugBar();
    if(!modal.open) app.focus({preventScroll:true});
    if(!keepView) window.scrollTo(0,0);
  }
  function title() {
    setScreen('title', `<header class="title-top"><a class="title-guide" href="../guides/traveler.html">게임 설명서</a><div class="top-actions">${soundButton()}${button('settings', icon('gear'), 'icon-button', 'aria-label="설정"')}</div></header><section class="title-layout"><div class="title-copy"><h1>가짜 여행자를<br><span>찾아라!</span>${icon('glass', 'logo-glass')}</h1>${liarCard()}<div class="title-buttons">${button('liar', `라이어 여행단 ${icon('arrow')}`, 'primary')}${button('book', `${icon('book')} 기후 도감 <span class="count">${unlockedClimates().size}/${climateIds.length}</span>`, 'secondary')}</div></div><figure class="cover polaroid">${image('cover')}<span class="tape"></span></figure>${image('owl_point','people','탐정 부엉이',false,'title-owl')}</section>`);
  }
  function facts(c) { return `<div class="facts">${[['temp',c.temp],['rain',c.rain],['eye',c.look]].map(([k,v]) => `<div>${icon(k)}<span>${esc(v)}</span></div>`).join('')}</div>`; }
  function evidence(e) {
    const cap = e.cap ? `<span class="cap">${e.cap}</span>` : '';
    if(e.type === 'photo') return `<span class="photo-wrap">${image(e.img)}<span class="tape"></span>${cap}</span>`;
    if(e.type === 'quote') return `<span class="speech">${esc(e.text)}</span>`;
    if(e.type === 'item') return `<span class="item-wrap">${image(e.item,'items',D.items[e.item])}<strong>${D.items[e.item]}</strong></span>`;
    const value = Number((e.text.match(/-?\d+/)||[0])[0]), fill = Math.max(8,Math.min(92,(value+35)/85*100));
    return `<span class="temp-wrap" style="--mercury:${value<12?'#4B91BA':'#D9412E'}"><svg class="thermometer" viewBox="0 0 40 100" aria-hidden="true"><path d="M12 72V12a8 8 0 0 1 16 0v60a15 15 0 1 1-16 0" fill="#FBF5EA" stroke="#6B5F52" stroke-width="2.5"/><rect x="16" y="${74-fill*.65}" width="8" height="${fill*.65+5}" rx="4" fill="var(--mercury)"/><circle cx="20" cy="84" r="9" fill="var(--mercury)"/><path d="M30 20h5m-5 13h3m-3 13h5m-5 13h3" stroke="#6B5F52" stroke-width="2"/></svg><strong>${esc(e.text)}</strong>${cap}</span>`;
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
  function book() {
    const unlocked=unlockedClimates();
    setScreen('book',`${top('기후 도감','book-back')}<div class="book-tabs" role="tablist" aria-label="도감 보기">${button('tab-cards','기후 카드','tab',`role="tab" aria-selected="${bookTab==='cards'}"`)}${button('tab-ladder','구별법','tab',`role="tab" aria-selected="${bookTab==='ladder'}"`)}${button('tab-badges','배지','tab',`role="tab" aria-selected="${bookTab==='badges'}"`)}<span>${unlocked.size}/${climateIds.length}</span><span class="photo-total">${icon('photo')} ${progress.photos.length}/${allPhotos.length}</span></div>${bookTab==='cards'?`<section class="collection">${Object.entries(D.groups).map(([group,g])=>`<div class="climate-group" style="--group:${g.color}"><h2>${g.name}</h2><div>${climateIds.filter(id=>D.climates[id].group===group).map(id=>button('detail',`${image(D.climates[id].img,'scenes',unlocked.has(id)?D.climates[id].name:'잠긴 기후 카드',true)}<strong>${unlocked.has(id)?D.climates[id].name:'?'}</strong>${unlocked.has(id)?`<span class="photo-count">${D.climates[id].gallery.filter(img=>progress.photos.includes(img)).length}/${D.climates[id].gallery.length}</span>`:''}${!unlocked.has(id)?icon('lock','card-lock'):''}`,'collection-card polaroid '+(!unlocked.has(id)?'card-locked':''),`data-climate="${id}" ${!unlocked.has(id)?'disabled aria-label="잠긴 기후 카드"':''}`)).join('')}</div></div>`).join('')}</section>`:bookTab==='badges'?badgeStamps():ladder()}`);
    if(bookTab==='badges'){progress.badgeSeen=[...progress.liar.badges];save();}
  }
  function ladder() {
    const unlocked=unlockedClimates();
    const leaf=id=>`<span class="ladder-leaf ${unlocked.has(id)?'':'leaf-locked'}" style="--group:${D.groups[D.climates[id].group].color}">${image(D.climates[id].img,'scenes',unlocked.has(id)?D.climates[id].name:'잠긴 기후',true)}<strong>${unlocked.has(id)?D.climates[id].name:'?'}</strong></span>`;
    return `<section class="ladder" aria-label="기후 구별 흐름도">${D.ladder.map((step,i)=>`<div class="ladder-step"><h2>${icon(['mountain','rain','temp'][i])}${step.q}</h2>${step.yes?`<span class="flow-line" aria-hidden="true">↳</span><div class="ladder-leaves">${step.yes.map(leaf).join('')}</div>`:`<div class="branches">${step.branches.map(b=>`<div><span>${b.label}</span><span class="flow-line" aria-hidden="true">↓</span>${b.groups.map(g=>`<strong class="group-end" style="--group:${D.groups[g].color}">${D.groups[g].name}</strong><div class="branch-climates">${climateIds.filter(id=>D.climates[id].group===g).map(leaf).join('')}</div>`).join('')}</div>`).join('')}</div>`}</div>`).join('')}</section>`;
  }
  function detail(id, index) {
    if(!unlockedClimates().has(id)) return;
    galleryClimate=id;const c=D.climates[id];if(index===undefined)index=Math.max(0,c.gallery.findIndex(img=>progress.photos.includes(img)));galleryIndex=(index+c.gallery.length)%c.gallery.length;
    showModal(`<header class="detail-header"><h2>${c.name}</h2>${chip(id)}${modalClose()}</header><div class="detail-layout"><div class="gallery"><div class="gallery-photo">${progress.photos.includes(c.gallery[galleryIndex])?image(c.gallery[galleryIndex],'scenes',c.name):'<div class="blank-photo" aria-label="아직 모으지 않은 사진">?</div>'}</div><div class="gallery-controls">${button('gallery-prev',icon('back'),'icon-button','aria-label="이전 사진"')}<span aria-live="polite">${galleryIndex+1} / ${c.gallery.length}</span><div class="photo-count">수집 ${c.gallery.filter(img=>progress.photos.includes(img)).length}/${c.gallery.length}</div>${button('gallery-next',icon('arrow'),'icon-button','aria-label="다음 사진"')}</div><div class="gallery-thumbs">${c.gallery.map((img,i)=>button('gallery',progress.photos.includes(img)?image(img,'scenes',c.name,true):'<span class="blank-photo">?</span>',i===galleryIndex?'active':'',`data-index="${i}" aria-label="${i+1}번째 사진" aria-pressed="${i===galleryIndex}"`)).join('')}</div></div><div class="detail-info">${facts(c)}<p class="where">${c.where}</p><h3>헷갈리는 친구</h3><div class="confuse">${c.confuse.map(other=>button('detail',`${D.climates[other].name}${unlockedClimates().has(other)?icon('arrow'):icon('lock')}`,'secondary',`data-climate="${other}" ${!unlockedClimates().has(other)?'disabled':''}`)).join('')}</div></div></div>`,'detail-modal');
  }
  function settings(confirm=false) {
    showModal(`<header class="detail-header"><h2>탐정의 설정</h2>${modalClose()}</header><div class="settings-body">${button('sound',`${icon(progress.sound?'sound':'muted')} 소리 ${progress.sound?'켜짐':'꺼짐'}`,'secondary',`aria-pressed="${progress.sound}"`)}${button('music',`${icon(progress.sound&&progress.music?'sound':'muted')} 배경 음악 ${progress.sound&&progress.music?'켜짐':'꺼짐'}`,'secondary',`aria-pressed="${progress.music}" ${progress.sound?'':'disabled'}`)}${button('menu-title','처음 화면','secondary')}${confirm?`<div class="reset-confirm"><h3>정말 지울까요?</h3><p>대회 기록·배지·사진·도감이 모두 지워져요.</p>${button('reset','모두 지우기','danger')}${button('settings','취소','secondary')}</div>`:button('reset-confirm','진행 기록 초기화','text-button')}</div>`,'settings-modal');
  }
  function syncMusic() { window.GameMusic?.setEnabled(progress.sound && progress.music); }
  function toggleSound() {
    progress.sound=!progress.sound;save();syncMusic();play('tap');
    if(modal.open && modal.classList.contains('settings-modal')) settings();
    else {const b=app.querySelector('[data-action="sound"]');if(b){b.innerHTML=icon(progress.sound?'sound':'muted');b.setAttribute('aria-label','소리 '+(progress.sound?'끄기':'켜기'));b.setAttribute('aria-pressed',progress.sound);}}
  }
  function renderCurrent() { ({title,book}[screen] || title)(); }
  async function action(b) {
    if(busy||b.disabled)return;
    const a=b.dataset.action;play('tap');
    switch(a) {
      case 'title':case 'menu-title': epoch++;play('paper');title();break;
      case 'close':closeModal();break;
      case 'book':bookTab='cards';book();break;
      case 'badges':bookTab='badges';book();break;
      case 'tab-badges':bookTab='badges';book();break;
      case 'book-back':title();break;
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
      case 'reset':epoch++;progress=fresh();save();title();break;
      case 'unlock':if(debug){progress.debugUnlocked=true;save();renderCurrent();}break;
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
    closeModal();
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
