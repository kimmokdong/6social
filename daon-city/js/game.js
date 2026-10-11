/* 다온시 70년 — 화면과 조작 */
(() => {
  'use strict';
  const D = window.DAON_CITY, E = window.DaonEngine, A = window.CityArt, P = window.SamgwonArt, S = window.CitySfx;
  const B = D.buildings, KEY = 'daon-city-v1', GAME_KEY = 'daon-city-v1-game';
  const app = document.getElementById('app'), layer = document.getElementById('layer');
  const params = new URLSearchParams(location.search), debug = params.has('debug');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 150) : ms));
  const esc = v => String(v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const GK = ['econ', 'life', 'env', 'fair'], GICON = { econ: 'chart', life: 'home', env: 'tree', fair: 'scale' };
  const PEOPLE = { tycoon: '왕부자 회장', reporter: '나팩트 기자', kid: '도윤', teacher: '다정 선생님', activist: '초록 활동가', shopkeeper: '떡볶이 사장님', grandma: '봉순 할머니' };
  const REPR = { light: 'textile', heavy: 'steel', carElec: 'car', semi: 'semi', it: 'it', content: 'content', battery: 'battery' };
  const HINTS = { together: '모두 60 이상으로', gray: '수출만 쫓으면…', unfair: '일하는 사람을 잊으면…', green: '환경만 챙기면…', stuck: '배움을 잊으면…', grown: '평범하게 70년' };
  const ENDING_ICON = { together: 'tree', gray: 'smog', unfair: 'scale', green: 'tree', stuck: 'lock', grown: 'chart' };

  /* 글꼴은 온라인일 때만 불러옴(오프라인이면 시스템 글꼴) */
  if (location.protocol !== 'file:' && navigator.onLine) {
    for (const href of ['https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Nanum+Myeongjo:wght@800&display=swap', 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css']) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; document.head.appendChild(link);
    }
  }

  /* ───── 저장 ───── */
  const fresh = () => ({ endings: [], badges: [], tutorialSeen: false, sound: false });
  function loadProgress() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null'), f = fresh();
      if (!s || typeof s !== 'object') return f;
      f.endings = Array.isArray(s.endings) ? s.endings.filter(id => D.endings.some(e => e.id === id)) : [];
      f.badges = Array.isArray(s.badges) ? s.badges.filter(id => D.badges.some(b => b.id === id)) : [];
      f.tutorialSeen = s.tutorialSeen === true; f.sound = s.sound === true;
      return f;
    } catch (_) { return fresh(); }
  }
  let progress = loadProgress();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_) {} };
  const saveGame = () => { try { localStorage.setItem(GAME_KEY, JSON.stringify(G)); } catch (_) {} };
  const clearGame = () => { try { localStorage.removeItem(GAME_KEY); } catch (_) {} };
  function savedGame() {
    try {
      const g = JSON.parse(localStorage.getItem(GAME_KEY) || 'null');
      if (g && Array.isArray(g.tiles) && g.tiles.length === E.W * E.H &&
          (g.phase === 'build' || (g.phase === 'events' && g.last && g.records?.[g.d]))) return g;
    } catch (_) {}
    return null;
  }
  S.setEnabled(progress.sound);

  let G = null, sel = null, busy = false, pop = null, screen = '', cursor = 0, drag = null, toastTimer = 0, layerFocus = null;

  /* ───── 작은 부품 ───── */
  const icon = (name, cls = '') => name === 'gear' ? P.icon(name) : A.icon(name, cls);
  const btn = (action, html, cls = '', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${html}</button>`;
  const iconBtn = (name, label, action) => `<button type="button" class="icon-btn" data-action="${action}" aria-label="${label}">${icon(name)}</button>`;
  const soundBtn = () => `<button type="button" class="icon-btn" data-action="sound" aria-label="소리 ${progress.sound ? '끄기' : '켜기'}" aria-pressed="${progress.sound}">${P.icon(progress.sound ? 'sound' : 'mute')}</button>`;
  const era = d => D.eras[d];
  function focusSelector(el) {
    const key = ['action', 'card', 'tile'].find(k => el?.dataset?.[k] !== undefined);
    return key ? `[data-${key}="${CSS.escape(el.dataset[key])}"]` : null;
  }
  function setScreen(name, html) {
    const focus = app.contains(document.activeElement) ? focusSelector(document.activeElement) : null;
    screen = name; app.className = `screen-${name}`; app.innerHTML = html; app.scrollTop = 0; window.scrollTo(0, 0);
    debugBar();
    if (focus) (app.querySelector(focus) || app.querySelector('button:not([disabled]),a'))?.focus({ preventScroll: true });
  }
  function toast(html) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
  }
  function openLayer(html, cls = '') {
    if (layer.hidden) layerFocus = focusSelector(document.activeElement);
    layer.innerHTML = `<div class="backdrop ${cls}"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
    layer.hidden = false; app.inert = true;
    const bar = document.querySelector('.debug'); if (bar) bar.inert = true;
    setTimeout(() => layer.querySelector('.sheet button:not([disabled])')?.focus({ preventScroll: true }), 30);
  }
  function closeLayer() {
    layer.hidden = true; layer.innerHTML = ''; app.inert = false;
    const bar = document.querySelector('.debug'); if (bar) bar.inert = false;
    if (layerFocus) app.querySelector(layerFocus)?.focus({ preventScroll: true });
    layerFocus = null;
  }

  /* 효과 아이콘 줄: 카드에 표시 */
  function effects(id) {
    const b = B[id], out = [], d = G ? G.d : 0;
    const exp = b.exp ? Math.max(...b.exp.slice(d)) : 0;
    if (exp) out.push(['chart', 'up', exp >= 12 ? '++' : '+']);
    if (b.boost) out.push(['chart', 'up', '×']);
    if (b.money) out.push(['coin', 'up', '+']);
    if (b.tech) out.push(['star', 'up', b.tech > 1 ? '++' : '+']);
    if (b.life) out.push(['home', 'up', b.life > 3 ? '++' : '+']);
    if (b.env) out.push(['tree', 'up', b.env > 4 ? '++' : '+']);
    if (b.pol) out.push(['tree', 'down', b.pol >= 4 ? '−−−' : b.pol >= 2 ? '−−' : '−']);
    if (b.fair) out.push(['scale', 'up', b.fair > 4 ? '++' : '+']);
    if (b.unfair) out.push(['scale', 'down', '−']);
    if (b.power) out.push(['bolt', 'up', '']);
    return out.map(([ic, dir, s]) => `<span class="fx ${dir}">${icon(ic)}${s ? `<b>${s}</b>` : ''}</span>`).join('');
  }
  function needs(id) {
    const b = B[id], out = [];
    if (b.coastal) out.push(`<span class="need" title="해안">${icon('wave')}</span>`);
    if (b.needPower) out.push(`<span class="need" title="전기">${icon('bolt')}</span>`);
    if (b.techReq) out.push(`<span class="need">${icon('star')}<b>${b.techReq}</b></span>`);
    return out.join('');
  }
  const reasonHtml = (reason, id) => ({
    money: `${icon('coin')}<b>부족</b>`,
    tech: `${icon('star')}<b>${B[id]?.techReq ?? ''}</b>`,
    power: `${icon('bolt')}<b>필요</b>`,
    era: `${icon('lock')}<b>${B[id] ? era(B[id].era).label : ''}</b>`,
    slots: `${icon('hammer')}<b>끝</b>`,
    coast: `${icon('wave')}<b>해안만</b>`,
    tile: `${icon('cross')}`
  }[reason] || '');

  /* ───── 지도 ───── */
  function tileHtml(i, readonly = false) {
    const t = G.tiles[i], coastal = E.coastal(t.x, t.y), id = t.b;
    const placedNow = G.placed.includes(i);
    let cls = `tile t-${t.t}${coastal ? ' coast' : ''}${id ? ' built' : ''}${placedNow ? ' now' : ''}`;
    let badge = '';
    if (!readonly && sel) {
      const can = E.canPlace(G, sel, i);
      if (can.ok) {
        cls += ' can';
        const boost = E.boostAt(G, i, sel);
        if (boost > 1) badge += `<span class="badge boost">×${boost}</span>`;
        const ns = E.neighbors(i).map(j => G.tiles[j].b);
        const smoky = ((B[sel].pol || 0) >= 2 && ns.includes('house')) || (sel === 'house' && ns.some(n => n && (B[n].pol || 0) >= 2));
        if (smoky) badge += `<span class="badge bad">${icon('mask')}</span>`;
        if (sel === 'park' && ns.some(n => n && B[n].pol)) badge += `<span class="badge good">${icon('tree')}</span>`;
      } else if (E.buildable(t.x, t.y) && !id) cls += ' cannot';
    }
    let art = '';
    if (id) {
      const polNow = E.pollutionAt(G, i), boost = E.boostAt(G, i), ex = E.exportOf(G, i);
      art = `<div class="b${polNow > 0 ? ' smoky' : ''}${B[id].pol && !polNow ? ' clean' : ''}">${A.building(id, { d: G.d })}</div>`;
      if (boost > 1 && ex > 0) art += `<span class="badge boost on">×${boost}</span>`;
    }
    const name = id ? B[id].name : t.t === 'S' ? '바다' : t.t === 'M' ? '산' : coastal ? '해안 빈 땅' : '빈 땅';
    const tag = readonly ? 'div' : 'button';
    return `<${tag} ${readonly ? '' : 'type="button"'} class="${cls}" data-tile="${i}" ${readonly ? '' : `aria-label="${name}" tabindex="${i === cursor ? 0 : -1}"`}>${A.terrain(t.t, coastal, i)}${art}${badge}</${tag}>`;
  }
  const mapHtml = (readonly = false) => `<div class="map${readonly ? ' mini' : ''}" style="--cols:${E.W};--rows:${E.H}">${G.tiles.map((_, i) => tileHtml(i, readonly)).join('')}</div>`;
  function fitMap() {
    const wrap = app.querySelector('.map-wrap'), map = wrap?.querySelector('.map');
    if (!wrap || !map) return;
    const r = wrap.getBoundingClientRect(), gap = 4;
    const size = Math.floor(Math.min((r.width - 12 - gap * (E.W - 1)) / E.W, (r.height - 12 - gap * (E.H - 1)) / E.H));
    map.style.setProperty('--tile', `${Math.max(44, size)}px`);
  }
  addEventListener('resize', () => { fitMap(); positionPop(); });

  /* ───── 게이지 ───── */
  function gaugesHtml(g, cls = '') {
    return `<div class="gauges ${cls}">${GK.map(k => `<div class="gauge${g[k] <= 25 ? ' low' : ''}" data-g="${k}"><div class="g-icon">${A.gauge(k, GICON[k], g[k])}</div><span class="g-label">${D.gauges[k].label}</span><b class="g-num">${g[k]}</b></div>`).join('')}</div>`;
  }

  /* ───── 타이틀 ───── */
  function title() {
    sel = null; pop = null;
    const saved = savedGame();
    setScreen('title', `<header class="tbar"><a class="icon-btn" href="../index.html" aria-label="게임 목록">${icon('home2')}</a><div class="tools">${soundBtn()}${iconBtn('gear', '설정', 'settings')}</div></header>
      <section class="title-main"><div class="skyline" aria-hidden="true">${A.skyline()}</div><h1 class="logo">다온시 <span>70년</span></h1>
      <div class="title-buttons">${saved ? btn('continue', `이어하기 ${icon('play')}`, 'primary big') + btn('new', '새로 시작', 'secondary') : btn('new', `시작 ${icon('play')}`, 'primary big')}${btn('endings', `엔딩 도감 <b class="count">${progress.endings.length}/${D.endings.length}</b>`, 'secondary')}</div></section>`);
  }

  /* ───── 시대 신문 ───── */
  function eraPaper() {
    const d = G.d, news = Object.entries(B).filter(([, b]) => b.era === d);
    S.play('paper');
    setScreen('paper', `<section class="paper-stage"><article class="paper"><div class="masthead">다온일보</div><div class="dateline"><span>${era(d).label}</span><span>${d + 1} / ${D.eras.length}</span></div><h2>${era(d).headline}</h2>
      <div class="paper-body"><div class="paper-map">${Paint.scene(`daon/era${d}`, mapHtml(true), `${era(d).label} 다온시 풍경`)}</div><div class="paper-news">${news.length ? `<span class="new-tag">NEW</span><div class="new-list">${news.map(([id, b]) => `<div class="new-item">${A.building(id, { d })}<b>${b.name}</b></div>`).join('')}</div>` : ''}</div></div>
      ${btn('start-build', `건설 시작 ${icon('play')}`, 'primary big')}</article></section>`);
  }

  /* ───── 건설 화면 ───── */
  function build() {
    const d = G.d, g = E.gauges(G, d), slots = E.slotsLeft(G), total = D.rules.buildsPerDecade[d];
    const cards = Object.keys(B).filter(id => B[id].era <= d + 1).sort((a, b) => (B[b].era === d) - (B[a].era === d) || B[a].era - B[b].era);
    const smog = g.env < 40 ? Math.min(.55, (40 - g.env) / 60) : 0;
    setScreen('build', `<section class="build era-${d}" style="--smog:${smog}">
      <header class="topbar">${iconBtn('menu', '메뉴', 'menu')}<div class="decade"><strong>${era(d).label}</strong><div class="timeline">${D.eras.map((e, i) => `<i class="${i < d ? 'done' : i === d ? 'now' : ''}"></i>`).join('')}</div></div>
        <div class="res"><span class="res-item" aria-label="돈 ${G.money}">${icon('coin')}<b>${G.money}</b></span><span class="res-item" aria-label="기술 ${G.tech}">${icon('star')}<b>${G.tech}</b></span><span class="res-item slots" aria-label="남은 건설 ${slots}번">${Array.from({ length: total }, (_, i) => `<span class="slot${i < slots ? '' : ' used'}">${icon('hammer')}</span>`).join('')}</span></div></header>
      ${gaugesHtml(g)}
      <div class="main"><div class="map-wrap">${mapHtml()}${smog ? `<div class="smog" aria-hidden="true"></div>` : ''}</div>
        <aside class="tray"><div class="cards" role="list">${cards.map(cardHtml).join('')}</div>
        <div class="tray-foot">${btn('undo', icon('undo'), 'icon-btn', `aria-label="되돌리기" ${G.placed.length ? '' : 'disabled'}`)}${btn('advance', `10년 보내기 ${icon('play')}`, 'primary go')}</div></aside></div>
      ${pop !== null ? popHtml() : ''}</section>`);
    fitMap(); positionPop();
    app.querySelector('.card.sel')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (!progress.tutorialSeen && d === 0) tutorial(0);
  }
  function cardHtml(id) {
    const b = B[id], st = E.cardStatus(G, id), future = b.era > G.d;
    const isNew = b.era === G.d && G.d > 0;
    return `<button type="button" role="listitem" class="card${sel === id ? ' sel' : ''}${st.ok ? '' : ' locked'}${future ? ' future' : ''}" data-card="${id}" aria-label="${b.name}, ${b.cost}원" aria-pressed="${sel === id}" ${future ? 'disabled' : ''}>
      <div class="c-icon">${A.building(id, { d: G.d })}</div><div class="c-name">${b.name}</div>
      <div class="c-row"><span class="cost">${icon('coin')}<b>${b.cost}</b></span>${needs(id)}</div><div class="c-fx">${effects(id)}</div>
      ${!st.ok ? `<span class="c-lock">${reasonHtml(st.reason, id)}</span>` : ''}${isNew ? '<span class="c-new">NEW</span>' : ''}</button>`;
  }
  /* 지은 건물 누르면: 이번 시대 → 되돌리기 / 예전 → 철거 */
  function popHtml() {
    const t = G.tiles[pop];
    if (!t || !t.b) return '';
    const now = G.placed.includes(pop), dem = E.canDemolish(G, pop);
    return `<div class="pop" role="dialog" aria-label="${B[t.b].name}"><div class="pop-head">${A.building(t.b, { d: G.d })}<b>${B[t.b].name}</b></div>
      ${now ? btn('pop-undo', `${icon('undo')} 되돌리기`, 'secondary') : btn('pop-demolish', `철거 ${icon('coin')}${D.rules.demolishCost}`, 'danger', dem.ok ? '' : 'disabled')}
      ${btn('pop-close', icon('cross'), 'icon-btn', 'aria-label="닫기"')}</div>`;
  }
  function positionPop() {
    const el = app.querySelector('.pop'), tile = pop !== null && app.querySelector(`[data-tile="${pop}"]`);
    if (!el || !tile) return;
    const r = tile.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let x = r.left + r.width / 2 - w / 2, y = r.top - h - 8;
    if (y < 8) y = r.bottom + 8;
    x = Math.max(8, Math.min(innerWidth - w - 8, x)); y = Math.max(8, Math.min(innerHeight - h - 8, y));
    el.style.left = `${x}px`; el.style.top = `${y}px`;
  }
  function selectCard(id) {
    if (busy) return;
    const st = E.cardStatus(G, id);
    if (B[id].era > G.d) return;
    pop = null;
    if (sel === id) sel = null;
    else if (!st.ok) { S.play('no'); toast(`${A.building(id, { d: G.d })}${reasonHtml(st.reason, id)}`); return; }
    else sel = id;
    S.play('tick'); build();
  }
  function tapTile(i) {
    if (busy) return;
    cursor = i;
    const t = G.tiles[i];
    if (sel) {
      const can = E.canPlace(G, sel, i);
      if (can.ok) {
        E.place(G, sel, i); S.play('place'); saveGame();
        if (!E.cardStatus(G, sel).ok) sel = null;
        build();
        app.querySelector(`[data-tile="${i}"]`)?.classList.add('pop-in');
        if (E.slotsLeft(G) === 0) toast(`${icon('hammer')}<b>10년 보내기!</b>`);
      } else {
        if (t.b) { pop = i; sel = null; build(); return; }
        S.play('no');
        const el = app.querySelector(`[data-tile="${i}"]`); el?.classList.remove('shake'); void el?.offsetWidth; el?.classList.add('shake');
        if (E.buildable(t.x, t.y)) toast(reasonHtml(can.reason, sel));
      }
      return;
    }
    if (t.b) { pop = pop === i ? null : i; S.play('tick'); build(); }
  }

  /* 끌어다 놓기 (터치·마우스) */
  function startDrag(e, id) {
    if (busy || B[id].era > G.d) return;
    drag = { id, x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId, ghost: null, over: null,
      scroll: e.pointerType === 'touch' && matchMedia('(orientation: portrait)').matches };
  }
  function moveDrag(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 12) {
      if (drag.scroll && Math.abs(e.clientX - drag.x) > Math.abs(e.clientY - drag.y)) { drag = null; return; }
      if (!E.cardStatus(G, drag.id).ok) { drag = null; return; }
      drag.moved = true; sel = drag.id; pop = null; build();
      drag.ghost = document.createElement('div'); drag.ghost.className = 'drag-ghost'; drag.ghost.innerHTML = A.building(drag.id, { d: G.d });
      document.body.appendChild(drag.ghost);
    }
    if (!drag.moved) return;
    e.preventDefault();
    drag.ghost.style.transform = `translate(${e.clientX - 40}px, ${e.clientY - 60}px)`;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-tile]');
    app.querySelectorAll('.tile.hover').forEach(t => t.classList.remove('hover'));
    drag.over = el ? Number(el.dataset.tile) : null;
    if (el) el.classList.add('hover');
  }
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag; drag = null;
    d.ghost?.remove();
    if (d.moved) { if (d.over !== null) tapTile(d.over); else build(); }
  }
  app.addEventListener('pointerdown', e => { const c = e.target.closest('[data-card]'); if (c && screen === 'build') startDrag(e, c.dataset.card); });
  addEventListener('pointermove', moveDrag, { passive: false });
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', e => { if (drag) { drag.ghost?.remove(); drag = null; } });

  /* ───── 10년 보내기 ───── */
  async function advance() {
    if (busy) return;
    busy = true; sel = null; pop = null; closeLayer();
    const d = G.d, chips = G.tiles.map((t, i) => [i, E.exportOf(G, i)]).filter(([, v]) => v > 0);
    Paint.preload(era(d).event.char);
    const res = E.advance(G);
    saveGame();
    if (res.problem) Paint.preload(res.problem.char);
    build();
    app.querySelector('.build').classList.add('timelapse');
    const year = document.createElement('div'); year.className = 'year-roll'; year.setAttribute('aria-live', 'polite');
    app.querySelector('.map-wrap').appendChild(year);
    S.play('whoosh');
    for (const [i, v] of chips) {
      const tile = app.querySelector(`[data-tile="${i}"]`);
      if (tile) tile.insertAdjacentHTML('beforeend', `<span class="coin-chip">${icon('coin')}+${Math.round(v * D.rules.income.exportRate)}</span>`);
    }
    for (let y = 0; y <= 9; y++) { year.textContent = `${1960 + d * 10 + y}`; await wait(140); }
    S.play('coin');
    const moneyEl = app.querySelector('.res-item b'), techEl = app.querySelectorAll('.res-item b')[1];
    if (moneyEl) moneyEl.textContent = G.money;
    if (techEl) techEl.textContent = G.tech;
    year.innerHTML = `<span class="gain">${icon('coin')}+${res.income}</span>${res.techGain ? `<span class="gain">${icon('star')}+${res.techGain}</span>` : ''}`;
    await wait(1300);
    await finishDecade();
  }
  async function finishDecade() {
    busy = true;
    const d = G.d, res = G.last;
    if (res.problem && G.records[d].choices.length === 0) await eventCard(res.problem, true);
    if (G.records[d].choices.length < (res.problem ? 2 : 1)) await eventCard(era(d).event, false);
    await historyCard(d);
    busy = false;
    if (d >= E.LAST) { E.nextDecade(G); ending(); return; }
    E.nextDecade(G); saveGame(); eraPaper();
  }

  /* 사건 카드: 선택하면 효과가 아이콘으로 날아감 */
  function eventCard(ev, problem) {
    return new Promise(resolve => {
      S.play('event');
      openLayer(`<div class="event${problem ? ' problem' : ''}"><span class="ev-tag">${problem ? `${icon('cross')} 문제 발생!` : `${icon('news')} ${era(G.d).label}`}</span>
        <div class="bubble">${esc(ev.text)}</div>
        <div class="ev-card"><div class="ev-portrait">${Paint.person(ev.char, P.portrait(ev.char))}</div><b class="ev-name">${PEOPLE[ev.char] || ''}</b></div>
        <div class="choices">${btn('choose', esc(ev.a.label), 'choice', 'data-k="a"')}${btn('choose', esc(ev.b.label), 'choice', 'data-k="b"')}</div><div class="fx-out" aria-live="polite"></div></div>`, 'event-layer');
      layer.querySelectorAll('[data-action="choose"]').forEach(b => b.addEventListener('click', async () => {
        const k = b.dataset.k, choice = ev[k];
        layer.querySelectorAll('.choice').forEach(x => { x.disabled = true; x.classList.toggle('picked', x === b); });
        E.applyFx(G, choice.fx, choice.label);
        saveGame();
        const out = layer.querySelector('.fx-out');
        out.innerHTML = Object.entries(choice.fx).map(([key, v]) => {
          const ic = key === 'money' ? 'coin' : key === 'tech' ? 'star' : GICON[key];
          return `<span class="fx ${v > 0 ? 'up' : 'down'}">${icon(ic)}<b>${v > 0 ? '+' : '−'}${Math.abs(v)}</b></span>`;
        }).join('') || `<span class="fx">${icon('check')}</span>`;
        S.play(Object.values(choice.fx).some(v => v < 0) ? 'down' : 'up');
        const g = E.gauges(G);
        app.querySelector('.gauges').outerHTML = gaugesHtml(g);
        app.querySelectorAll('.res-item b')[0].textContent = G.money;
        app.querySelectorAll('.res-item b')[1].textContent = G.tech;
        await wait(1300); closeLayer(); build(); app.querySelector('.build')?.classList.add('timelapse'); resolve();
      }, { once: true }));
    });
  }
  function historyCard(d) {
    return new Promise(resolve => {
      const rec = G.records[d], cat = era(d).real;
      openLayer(`<div class="hist"><span class="hist-tag">그때 우리나라는?</span><h3>${era(d).label}</h3>
        <div class="hist-row"><div class="hist-ico">${A.building(REPR[cat])}</div><p>${esc(era(d).realText)}</p></div>
        <div class="hist-me ${rec.match ? 'yes' : 'no'}">${icon(rec.match ? 'check' : 'cross')}<b>${rec.match ? '나도 같은 길!' : '나는 다른 길'}</b><span class="mine">${rec.built.map(id => A.building(id, { d })).join('')}</span></div>
        ${btn('hist-next', d < E.LAST ? `다음 10년 ${icon('play')}` : `70년사 보기 ${icon('play')}`, 'primary big')}</div>`, 'hist-layer');
      layer.querySelector('[data-action="hist-next"]').addEventListener('click', () => { closeLayer(); resolve(); }, { once: true });
    });
  }

  /* ───── 엔딩: 다온시 70년사 ───── */
  function ending() {
    clearGame();
    const end = E.ending(G), g = E.gauges(G, E.LAST), score = E.historyScore(G);
    const isNew = !progress.endings.includes(end.id);
    if (isNew) progress.endings.push(end.id);
    const earned = [];
    const award = id => { if (!progress.badges.includes(id)) { progress.badges.push(id); earned.push(id); } };
    if (score === D.eras.length) award('history');
    if (end.id === 'together') award('together');
    if (progress.endings.length === D.endings.length) award('allEndings');
    save();
    S.play(end.legend ? 'fanfare' : 'paper');
    setScreen('ending', `<section class="ending-page">
      <article class="final-paper${end.legend ? ' legend' : ''}"><div class="masthead">다온일보 호외</div><div class="dateline"><span>다온시 70년사</span><span>엔딩 ${progress.endings.length}/${D.endings.length}</span></div>
        ${isNew ? '<span class="new-stamp">NEW!</span>' : ''}<h2>${end.name}</h2><p class="story">${end.story}</p>
        <div class="final-body"><div class="final-map">${Paint.scene(`daon/end_${end.id}`, mapHtml(true), end.name, 'eager')}</div><div class="final-side">${gaugesHtml(g, 'big')}
          <div class="hist-score">${icon('news')}<span>실제 역사와 <b>${score}/${D.eras.length}</b> 같은 길</span></div></div></div>
        <div class="note">${P.icon('bulb')}<p>${end.note}${end.legend ? '' : `<br><span class="sub">${D.finalNote}</span>`}</p></div>
        ${earned.length ? `<div class="earned">${earned.map(id => `<span class="badge-chip">${icon('star')}${D.badges.find(b => b.id === id).name}</span>`).join('')}</div>` : ''}
        <div class="end-btns">${btn('new', `다시 하기 ${icon('play')}`, 'primary')}${btn('endings', '엔딩 도감', 'secondary')}${btn('title', '처음으로', 'secondary')}</div></article>
      <h3 class="papers-title">70년 신문 모음</h3>
      <div class="papers">${G.records.map(r => `<article class="mini-paper"><div class="mini-mast">다온일보 · ${era(r.d).label}</div><h4>${era(r.d).headline}</h4>
        <div class="mini-photo">${Paint.scene(`daon/era${r.d}`, `<span class="mini-built">${r.built.map(id => A.building(id, { d: r.d })).join('')}</span>`, `${era(r.d).label} 다온시 풍경`)}</div>
        <div class="mini-built">${r.built.length ? r.built.map(id => A.building(id, { d: r.d })).join('') : '<span class="empty">—</span>'}</div>
        <div class="mini-g">${GK.map(k => `<span class="bar" data-g="${k}"><i style="width:${r.gauges[k]}%"></i></span>`).join('')}</div>
        <div class="mini-match ${r.match ? 'yes' : 'no'}">${icon(r.match ? 'check' : 'cross')}</div></article>`).join('')}</div>
      ${end.legend ? '<div class="confetti" aria-hidden="true">' + Array.from({ length: 40 }, (_, i) => `<i style="--x:${(i * 37) % 100};--d:${(i % 7) * .35}s;--c:${['#F5C542', '#2E9E6B', '#3B6FE0', '#E5484D', '#7B52D3'][i % 5]}"></i>`).join('') + '</div>' : ''}
    </section>`);
  }

  /* ───── 엔딩 도감 ───── */
  function endings() {
    setScreen('endings', `<header class="tbar">${iconBtn('home2', '처음으로', 'title')}<h1>엔딩 도감</h1><b class="count">${progress.endings.length}/${D.endings.length}</b></header>
      <section class="ending-grid">${D.endings.map(e => {
        const got = progress.endings.includes(e.id);
        return `<article class="end-card${got ? '' : ' locked'}${e.legend ? ' legend' : ''}"><div class="mini-mast">다온일보 호외</div>${got ? `<div class="end-photo">${Paint.scene(`daon/end_${e.id}`, icon(ENDING_ICON[e.id]), e.name)}</div><h3>${e.name}</h3><p>${e.story}</p>` : `<div class="end-ico q">?</div><p class="hint">${HINTS[e.id]}</p>`}</article>`;
      }).join('')}</section>
      <h2 class="badge-title">배지</h2><section class="badge-row">${D.badges.map(b => {
        const got = progress.badges.includes(b.id);
        return `<article class="bdg${got ? '' : ' locked'}">${icon(got ? 'star' : 'lock')}<h3>${b.name}</h3><p>${b.goal}</p></article>`;
      }).join('')}</section>`);
  }

  /* ───── 안내(처음 한 번) ───── */
  function tutorial(step) {
    const art = [
      `<div class="tut-art">${A.building('house')}<span class="tut-arrow">${icon('play')}</span><div class="tut-tile">${A.terrain('F')}</div></div>`,
      `<div class="tut-art"><div class="tut-tile">${A.terrain('F', true)}${A.building('port')}</div><div class="tut-tile">${A.terrain('F')}${A.building('textile')}<span class="badge boost on">×1.5</span></div></div>`,
      `<div class="tut-art"><div class="tut-tile">${A.terrain('F')}<div class="b smoky">${A.building('steel')}</div></div><div class="tut-tile">${A.terrain('F')}${A.building('park')}</div></div>`
    ];
    const caps = ['골라서 놓기!', '항구·고속도로 옆은 수출 UP!', '공원은 오염을 줄여요!'];
    openLayer(`<div class="tut">${art[step]}<h2>${caps[step]}</h2><div class="dots">${[0, 1, 2].map(i => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>
      ${btn('tut-next', step < 2 ? '다음' : '해 볼게요!', 'primary big', `data-step="${step}"`)}${btn('tut-skip', '건너뛰기', 'text-btn')}</div>`, 'tut-layer');
  }

  /* ───── 메뉴·설정 ───── */
  function menu() {
    openLayer(`<div class="menu"><h2>잠깐!</h2>${btn('close', '계속하기', 'primary big')}${btn('settings', '설정', 'secondary')}${btn('to-title', '처음으로', 'secondary')}</div>`);
  }
  function settings(confirm = false) {
    openLayer(`<div class="menu"><h2>설정</h2>${btn('sound', `${P.icon(progress.sound ? 'sound' : 'mute')} 소리 ${progress.sound ? '켜짐' : '꺼짐'}`, 'secondary', `aria-pressed="${progress.sound}"`)}
      ${confirm ? `<div class="confirm"><h3>정말 지울까요?</h3>${btn('reset', '모두 지우기', 'danger')}${btn('settings', '취소', 'secondary')}</div>` : btn('reset-ask', '기록 모두 지우기', 'text-btn')}${btn('close', '닫기', 'primary')}</div>`);
  }

  /* ───── 디버그 ───── */
  function debugBar() {
    if (!debug) return;
    let bar = document.querySelector('.debug');
    if (!bar) { bar = document.createElement('div'); bar.className = 'debug'; document.body.appendChild(bar); }
    bar.innerHTML = `DEBUG ${btn('dbg-money', '+💰50')}${btn('dbg-tech', '+⭐10')}${btn('dbg-bot', '봇 끝까지')}`;
  }
  async function botToEnd(policy = 'a') {
    const plan = [['port', 'textile', 'school', 'school'], ['power', 'steel', 'school', 'park'], ['car', 'univ', 'park', 'welfare'], ['semi', 'elec', 'welfare', 'park'], ['it', 'green', 'cleaner', 'semi'], ['content', 'semi', 'park', 'cleaner'], ['battery', 'it', 'welfare', 'park']];
    if (!G) G = E.newGame();
    while (G.phase !== 'end') {
      for (const id of plan[G.d]) {
        if (E.slotsLeft(G) <= 0) break;
        let best = -1, score = -1e9;
        G.tiles.forEach((t, i) => {
          if (!E.canPlace(G, id, i).ok) return;
          const ns = E.neighbors(i).map(j => G.tiles[j].b); let v = 0;
          if (B[id].factory) v += (ns.includes('port') ? 5 : 0) + (ns.includes('road') ? 5 : 0) - (ns.includes('house') ? 3 : 0);
          if (id === 'park') v += ns.reduce((a, n) => a + (n ? (B[n].pol || 0) : 0), 0) * 3;
          if (!B[id].coastal && E.coastal(t.x, t.y)) v -= 2;
          if (v > score) { score = v; best = i; }
        });
        if (best >= 0) E.place(G, id, best);
      }
      const r = E.advance(G);
      if (r.problem) E.applyFx(G, r.problem[policy].fx, r.problem[policy].label);
      E.applyFx(G, era(G.d).event[policy].fx, era(G.d).event[policy].label);
      E.nextDecade(G);
    }
    ending();
  }

  /* ───── 조작 연결 ───── */
  async function act(a, el) {
    switch (a) {
      case 'new': clearGame(); G = E.newGame(); saveGame(); sel = null; pop = null; S.play('tick'); eraPaper(); break;
      case 'continue': G = savedGame(); if (G) { build(); if (G.phase === 'events') { app.querySelector('.build').classList.add('timelapse'); finishDecade(); } } else title(); break;
      case 'start-build': build(); break;
      case 'endings': endings(); break;
      case 'title': closeLayer(); title(); break;
      case 'to-title': closeLayer(); if (G && G.phase === 'build') saveGame(); title(); break;
      case 'menu': menu(); break;
      case 'settings': settings(); break;
      case 'reset-ask': settings(true); break;
      case 'reset': progress = fresh(); save(); clearGame(); S.setEnabled(false); closeLayer(); title(); break;
      case 'close': closeLayer(); break;
      case 'sound': progress.sound = !progress.sound; save(); S.setEnabled(progress.sound); S.play('tick'); if (!layer.hidden) settings(); else el.outerHTML = soundBtn(); break;
      case 'undo': if (G.placed.length) { const r = E.undo(G, G.placed[G.placed.length - 1]); if (!r.ok) { toast(reasonHtml(r.reason)); break; } S.play('undo'); saveGame(); build(); } break;
      case 'pop-undo': { const r = E.undo(G, pop); if (!r.ok) toast(reasonHtml(r.reason)); else { S.play('undo'); saveGame(); } pop = null; build(); break; }
      case 'pop-demolish': if (E.demolish(G, pop).ok) { S.play('thud'); saveGame(); } pop = null; build(); break;
      case 'pop-close': pop = null; build(); break;
      case 'advance': advance(); break;
      case 'tut-next': { const s = Number(el.dataset.step); if (s < 2) tutorial(s + 1); else { progress.tutorialSeen = true; save(); closeLayer(); } break; }
      case 'tut-skip': progress.tutorialSeen = true; save(); closeLayer(); break;
      case 'dbg-money': if (G) { G.money += 50; build(); } break;
      case 'dbg-tech': if (G) { G.tech += 10; build(); } break;
      case 'dbg-bot': closeLayer(); botToEnd(); break;
    }
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (a && !busy && !a.disabled && a.dataset.action !== 'choose' && a.dataset.action !== 'hist-next') { act(a.dataset.action, a); return; }
    if (screen !== 'build' || busy) return;
    const card = e.target.closest('[data-card]');
    if (card) { if (!drag) selectCard(card.dataset.card); return; }
    const tile = e.target.closest('[data-tile]');
    if (tile) { tapTile(Number(tile.dataset.tile)); return; }
    if (pop !== null && !e.target.closest('.pop')) { pop = null; build(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !layer.hidden) {
      const buttons = [...layer.querySelectorAll('button:not([disabled])')], first = buttons[0], last = buttons[buttons.length - 1];
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (e.key === 'Escape') { if (!layer.hidden && !layer.querySelector('.event,.hist')) { if (layer.querySelector('.tut')) { progress.tutorialSeen = true; save(); } closeLayer(); return; } if (sel || pop !== null) { sel = null; pop = null; build(); } return; }
    if (screen !== 'build' || busy || !layer.hidden) return;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -E.W, ArrowDown: E.W };
    const active = document.activeElement?.closest?.('[data-tile]');
    if (moves[e.key] !== undefined && active) {
      e.preventDefault();
      const n = Number(active.dataset.tile) + moves[e.key];
      if (n >= 0 && n < E.W * E.H && !(Math.abs(moves[e.key]) === 1 && Math.floor(n / E.W) !== Math.floor(Number(active.dataset.tile) / E.W))) {
        cursor = n; const el = app.querySelector(`[data-tile="${n}"]`); app.querySelectorAll('[data-tile]').forEach(t => t.tabIndex = -1); el.tabIndex = 0; el.focus();
      }
    }
  });

  title();
})();
