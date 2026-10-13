/* 다온시 70년 — 화면과 조작 */
(() => {
  'use strict';
  const D = window.DAON_CITY, E = window.DaonEngine, A = window.CityArt, P = window.SamgwonArt, S = window.CitySfx;
  const B = D.buildings, KEY = 'daon-city-v2', GAME_KEY = 'daon-city-v2-game';
  const app = document.getElementById('app'), layer = document.getElementById('layer');
  const params = new URLSearchParams(location.search), debug = params.has('debug');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 150) : ms));
  const esc = v => String(v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const GK = ['econ', 'life', 'env', 'fair'], GICON = { econ: 'chart', life: 'home', env: 'tree', fair: 'scale' };
  const PEOPLE = { tycoon: '왕부자 회장', reporter: '나팩트 기자', kid: '도윤', teacher: '다정 선생님', activist: '초록 활동가', shopkeeper: '떡볶이 사장님', grandma: '봉순 할머니' };
  const REPR = { light: 'textile', heavy: 'steel', carElec: 'car', semi: 'semi', it: 'it', content: 'content', battery: 'battery' };
  const HINTS = Object.fromEntries(D.endings.map(e => [e.id, e.hint]));
  const ENDING_ICON = { together: 'tree', export: 'port', tech: 'star', creative: 'content', gray: 'smog', unfair: 'scale', stuck: 'lock', grown: 'chart' };

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
      if (E.valid(g) && g.phase !== 'end') return g;
    } catch (_) {}
    return null;
  }
  S.setEnabled(progress.sound);

  let lens = 'industry', trayMode = 'industry', relocating = null, viewPlan = null;
  let G = null, sel = null, busy = false, pop = null, screen = '', cursor = 0, drag = null, toastTimer = 0, layerFocus = null;

  /* ───── 작은 부품 ───── */
  const icon = (name, cls = '') => name === 'gear' ? P.icon(name) : A.icon(name, cls);
  const btn = (action, html, cls = '', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${html}</button>`;
  const iconBtn = (name, label, action) => `<button type="button" class="icon-btn" data-action="${action}" aria-label="${label}">${icon(name)}</button>`;
  const soundBtn = () => `<button type="button" class="icon-btn" data-action="sound" aria-label="소리 ${progress.sound ? '끄기' : '켜기'}" aria-pressed="${progress.sound}">${P.icon(progress.sound ? 'sound' : 'mute')}</button>`;
  const era = d => D.eras[d];
  function focusSelector(el) {
    const key = ['action', 'card', 'tile'].find(k => el?.dataset?.[k] !== undefined);
    const qualifier = ['lens', 'tray', 'help'].find(k => el?.dataset?.[k]);
    return key ? `[data-${key}="${CSS.escape(el.dataset[key])}"]${qualifier ? `[data-${qualifier}="${CSS.escape(el.dataset[qualifier])}"]` : ''}` : null;
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
    const b = B[id];
    return `<span class="fx">${icon(b.exp ? 'chart' : b.homes ? 'home' : b.education ? 'star' : b.supply ? 'bolt' : b.cleaning ? 'tree' : 'scale')}<b>${b.exp ? `일자리 ${b.jobs}` : b.homes ? `주민 ${b.homes}` : b.education ? `교육 ${b.education}` : b.supply ? `전력 ${b.supply}` : b.logistics ? `물류 ${b.logistics}` : '주변 지원'}</b></span>`;
  }
  function needs(id) {
    const b = B[id]; return `${b.coastal ? `<span class="need">${icon('wave')}</span>` : ''}${b.skilled ? `<span class="need">${icon('star')}${b.skilled}</span>` : ''}`;
  }
  const reasonHtml = (reason, id) => ({
    money: `${icon('coin')}<b>부족</b>`,
    tech: `${icon('star')}<b>${B[id]?.techReq ?? ''}</b>`,
    power: `${icon('bolt')}<b>필요</b>`,
    era: `${icon('lock')}<b>${B[id] ? era(B[id].era).label : ''}</b>`,
    land: `${icon('lock')}<b>도시 확장 필요</b>`,
    phase: '계획은 건설 시간에 바꿔요',
    coast: `${icon('wave')}<b>해안만</b>`,
    tile: `${icon('cross')}`
  }[reason] || '');

  /* 숫자는 엔진의 현재 시대와 배율을 그대로 보여 준다. */
  function buildingInfo(id, i = null) {
    const b = B[id], row = i === null ? null : E.production(G).rows.find(r => r.i === i), l = i === null ? 1 : E.level(G.tiles[i]);
    const rows = [`${icon('coin')}신축 ${b.cost} · 운영비 ${b.upkeep * l}/10년`];
    if (b.era > G.d) rows.push(`${era(b.era).label}부터 가능해요.`);
    if (b.exp) {
      rows.push(`일자리 ${b.jobs * l} · 기술 인력 ${b.skilled * l} · 전력 ${b.energy * l}`);
      rows.push(`기본 생산 ${b.exp[G.d] * l} · 시대 수출 기회 ${D.rules.demand[b.cat][G.d]}`);
      if (row) rows.push(`<b>가동 ${Math.round(row.rate * 100)}% · 실제 수출 ${row.exports.toFixed(1)}</b>${row.market < .99 ? ' · 주문을 나눠 받아요' : ''}`);
      if (b.links) rows.push(`2칸 안에서 ${b.links.map(x => B[x].name).join('·')}와 협업`);
      rows.push(`물류 시설 가까이에서 수출 지원 · 오염 ${b.pol || 0}`);
    }
    if (b.homes) rows.push(`살 공간 ${b.homes * l} · 일자리가 있으면 주민이 들어와요`);
    if (b.education) rows.push(`${b.range}칸 안의 주민 ${b.education * l} 교육 · 다음 시대부터 기술 인력 양성`);
    if (b.supply) rows.push(`전력 ${b.supply * l} 공급 · 산업이 늘면 증축해요`);
    if (b.logistics) rows.push(`${b.range}칸 안의 산업에 수출 지원 최대 ${b.logistics * l}`);
    if (b.cleaning) rows.push(`${b.range}칸 안의 배출 ${b.cleaning * l}까지 처리`);
    if (b.service) rows.push(`${b.range}칸 안의 주민 ${b.capacity * l} 생활 지원${id === 'park' ? ' · 공원이 폐수를 정화하지는 않아요' : ''}`);
    if (b.coastal) rows.push('바다 바로 위 해안 칸에 지어요.');
    return `<div class="info-lines">${rows.map(v => `<p>${v}</p>`).join('')}</div>`;
  }
  function help(key) {
    const p = E.production(G), g = E.gauges(G);
    const texts = {
      money: ['도시 투자금', `기본 지원 ${p.base} + 수출 ${p.exportIncome} + 시장 ${p.marketIncome} − 운영비 ${p.upkeep} = ${p.income}`, '횟수 제한은 없어요. 운영비도 생각하며 신축·증축·산업 전환을 골라요.'],
      tech: ['사람과 기술 인력', `살 공간 ${p.housing} · 일할 사람 ${p.workers} / 일자리 ${p.jobs}`, `기술 인력 ${p.skilled} / 필요 ${p.skilledNeed} · 다음 시대 +${p.techGain}`, '학교·대학교를 주택 가까이 배치해요. 기술 인력은 일할 사람의 일부예요.'],
      power: ['전력 공급', `공급 ${p.supply} / 산업에 필요 ${p.energy}`, '처음 마을 전력은 2예요. 발전소는 공급량에 한도가 있고 증축할 수 있어요.'],
      econ: ['산업과 수출', `수출 ${p.exports} / 이번 시대 목표 ${D.rules.exportTarget[G.d]}`, '사람·기술·전력이 준비된 만큼 가동해요. 같은 산업은 수출 기회를 나눠 받아요.'],
      life: ['주민 생활', `생활 ${g.life} · 지원 주민 ${p.service}/${p.workers}`, '일자리·시장·공원·복지관이 실제 주민에게 닿아야 해요.'],
      env: ['환경과 피해 지역', `환경 ${g.env} · 남은 배출 ${p.pollution.toFixed(1)} · 피해 주택 ${p.exposed.length}곳`, '정화 시설은 가까운 배출을 처리해요. 환경 보기로 피해 주택을 찾아요.'],
      fair: ['성장의 혜택', `공정 ${g.fair}`, '일자리와 생활 지원에서 소외된 주민, 오염 피해, 시대 선택을 함께 살펴요.']
    }[key] || ['도시 도움말'];
    openLayer(`<div class="help"><h2>${texts[0]}</h2>${texts.slice(1).map(v => `<p>${esc(v)}</p>`).join('')}${btn('close', '닫기', 'primary')}</div>`);
  }
  function tileHtml(i, readonly = false) {
    const t = G.tiles[i], id = t.b, coastal = E.coastal(t.x, t.y), row = viewPlan?.rows.find(r => r.i === i), open = !E.buildable(t.x, t.y) || E.isOpen(G, i);
    let cls = `tile t-${t.t}${id ? ' built' : ''}${G.placed.includes(i) ? ' now' : ''}${open ? '' : ' unopened'}`, art = '', badge = '';
    if (id) {
      art = `<div class="b${row?.pollution > 0 ? ' smoky' : ''}" style="--smoke-opacity:${Math.min(.8, .2 + (row?.pollution || 0) * .15)}">${A.building(id, { d: G.d, level: E.level(t), pol: row?.pollution || 0 })}</div>`;
      if (E.level(t) === 2) badge += '<span class="tile-level">Ⅱ</span>';
      if (!readonly && row?.b.exp) badge += `<span class="tile-status ${row.rate < .99 ? 'short' : ''}">${Math.round(row.rate * 100)}%</span>`;
      if (!readonly && viewPlan?.exposed.includes(i)) badge += '<span class="tile-alert" aria-label="오염 피해">😷</span>';
    }
    if (!readonly && lens === 'people' && id === 'house') { const taught = new Map(viewPlan?.educated).get(i) || 0; if (taught) cls += ' lens-good'; badge += `<span class="tile-status">👷${new Map(viewPlan?.residents).get(i) || 0} 🎓${taught}</span>`; }
    if (!readonly && lens === 'env' && row?.pollution > 0) { cls += ' lens-bad'; badge += `<span class="tile-status short">배출 ${row.pollution.toFixed(0)}</span>`; }
    if (sel && E.canPlace(G, sel, i).ok) cls += ' can';
    if (sel && id && E.canConvert(G, sel, i).ok) { cls += ' can-convert'; badge += '<span class="tile-status">전환 가능</span>'; }
    if (relocating !== null && !id && open && E.buildable(t.x, t.y) && (!B[G.tiles[relocating].b].coastal || coastal)) cls += ' can';
    const source = pop !== null ? G.tiles[pop].b : sel;
    const anchor = pop !== null ? pop : null;
    if (!readonly && anchor !== null && source && B[source].range && E.distance(anchor, i) <= B[source].range) cls += ' in-range';
    const name = id ? B[id].name : t.t === 'S' ? '바다' : t.t === 'M' ? '산' : open ? (coastal ? '해안 빈 땅' : '빈 땅') : '확장할 땅';
    const tag = readonly ? 'div' : 'button';
    return `<${tag} ${readonly ? '' : 'type="button"'} class="${cls}" data-tile="${i}" ${readonly ? '' : `aria-label="${name}${row?.b.exp ? `, 가동 ${Math.round(row.rate * 100)}%` : ''}${viewPlan?.exposed.includes(i) ? ', 오염 피해' : ''}" tabindex="${i === cursor ? 0 : -1}"`}>${A.terrain(t.t, coastal, i, G.d)}${art}${badge}${!open && E.buildable(t.x, t.y) ? '<span class="land-lock">🔒</span>' : ''}</${tag}>`;
  }
  function mapHtml(readonly = false) {
    viewPlan = G.phase === 'events' ? G.last : E.production(G);
    return `<div class="map${readonly ? ' mini' : ''}" style="--cols:${E.W};--rows:${E.H}">${G.tiles.map((_, i) => tileHtml(i, readonly)).join('')}</div>`;
  }
  function fitMap() {
    const wrap = app.querySelector('.map-wrap'), map = wrap?.querySelector('.map');
    if (!wrap || !map) return;
    const r = wrap.getBoundingClientRect(), gap = 4, css = getComputedStyle(wrap), padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
    const size = Math.floor(Math.min((r.width - 12 - gap * (E.W - 1)) / E.W, (r.height - padding - 12 - gap * (E.H - 1)) / E.H));
    map.style.setProperty('--tile', `${Math.max(32, size)}px`);
  }
  addEventListener('resize', () => { fitMap(); positionPop(); });

  /* ───── 게이지 ───── */
  function gaugesHtml(g, cls = '') {
    return `<div class="gauges ${cls}">${GK.map(k => `<button type="button" class="gauge${g[k] <= 25 ? ' low' : ''}" data-g="${k}" data-action="help" data-help="${k}" aria-label="${D.gauges[k].label} ${g[k]}, 도움말"><div class="g-icon">${A.gauge(k, GICON[k], g[k])}</div><span class="g-label">${D.gauges[k].label}</span><b class="g-num">${g[k]}</b></button>`).join('')}</div>`;
  }

  function oldSaveExists() { try { return !!localStorage.getItem('daon-city-v1-game'); } catch (_) { return false; } }
  /* ───── 타이틀 ───── */
  function title() {
    sel = null; pop = null;
    const saved = savedGame();
    setScreen('title', `<header class="tbar"><a class="title-guide" href="../guides/daon.html">게임 설명서</a><div class="tools">${soundBtn()}${iconBtn('gear', '설정', 'settings')}</div></header>
      <section class="title-main"><div class="skyline" aria-hidden="true">${A.skyline()}</div><h1 class="logo">다온시 <span>70년</span></h1><p class="v2-title-note">산업을 골라, 나만의 발전을 만들어요</p>${oldSaveExists() ? '<p class="legacy-note">새 산업 규칙으로 시작해요. 이전 버전의 저장은 보관되어 있어요.</p>' : ''}
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
    const d = G.d, g = E.gauges(G), forecast = G.phase === 'events' ? G.last : E.production(G);
    const cards = Object.keys(B).filter(id => B[id].era <= d + 1 && (!!B[id].exp === (trayMode === 'industry'))).sort((a, b) => (B[b].era === d) - (B[a].era === d) || B[a].era - B[b].era);
    const leaders = Object.entries(forecast.categories).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0);
    setScreen('build', `<section class="build era-${d} city-v2">
      <header class="topbar">${iconBtn('menu', '메뉴', 'menu')}<div class="decade"><strong>${era(d).label}</strong><div class="timeline">${D.eras.map((e, i) => `<i class="${i < d ? 'done' : i === d ? 'now' : ''}"></i>`).join('')}</div></div>
        <div class="res"><button data-action="help" data-help="money" class="res-item" aria-label="투자금 도움말">${icon('coin')}<b>${G.money}</b></button><button data-action="help" data-help="tech" class="res-item" aria-label="기술 인력 도움말">${icon('star')}<b>${forecast.skilled}</b></button>${btn('expand', `땅 확장 ${G.land < 2 ? D.rules.expandCost[G.land] : '완료'}`, 'expand-btn', G.land >= 2 || d < (G.land === 0 ? 1 : 3) || G.money < D.rules.expandCost[G.land] ? 'disabled' : '')}</div></header>
      <div class="city-readiness"><button data-action="help" data-help="tech">👷 사람 <b>${forecast.workers}/${forecast.jobs}</b></button><button data-action="help" data-help="tech">🎓 기술 인력 <b>${forecast.skilled}/${forecast.skilledNeed}</b></button><button data-action="help" data-help="power">⚡ 전력 <b>${forecast.supply}/${forecast.energy}</b></button>${gaugesHtml(g)}</div>
      <div class="main"><div class="map-wrap"><div class="map-toolbar">${[['industry', '산업'], ['people', '사람·교육'], ['env', '환경']].map(([id, label]) => btn('lens', label, lens === id ? 'active' : '', `data-lens="${id}" aria-pressed="${lens === id}"`)).join('')}</div>${mapHtml()}<div class="city-warnings" role="status">${relocating !== null ? '이전할 빈 칸을 골라요 · 비용 2' : forecast.warnings.map(v => `<p>${esc(v)}</p>`).join('') || '<p>도시의 기반이 준비됐어요. 산업의 기회를 살펴봐요.</p>'}</div></div>
      <aside class="tray"><div class="industry-opportunity"><b>이번 시대: ${D.categories[era(d).real].name}</b><p>내 주력: ${leaders.length ? D.categories[leaders[0][0]].name : '첫 산업을 준비해요'}</p></div><div class="forecast">예상 순수입 ${forecast.income >= 0 ? '+' : ''}${forecast.income} · 교육 +${forecast.techGain}<small>수입 ${forecast.base + forecast.exportIncome + forecast.marketIncome} − 운영비 ${forecast.upkeep}</small></div>
      <div class="tray-tabs">${btn('tray', '산업 키우기', trayMode === 'industry' ? 'active' : '', 'data-tray="industry"')}${btn('tray', '기반 준비', trayMode === 'support' ? 'active' : '', 'data-tray="support"')}</div>
      ${sel ? `<section class="building-info"><strong>${B[sel].name}</strong>${buildingInfo(sel)}</section>` : '<div class="info-hint">카드와 건물을 눌러 운영 조건을 살펴요.</div>'}<div class="cards" role="list">${cards.map(cardHtml).join('')}</div>
      <div class="tray-foot">${btn('undo', icon('undo'), 'icon-btn', `aria-label="계획 되돌리기" ${G.actions.length ? '' : 'disabled'}`)}${btn('advance', `10년 보내기 ${icon('play')}`, 'primary go')}</div></aside></div>${pop !== null ? popHtml() : ''}</section>`);
    fitMap(); positionPop(); if (matchMedia('(orientation: portrait)').matches) { const c = app.querySelector('.card.sel'), cards = app.querySelector('.cards'); if (c && cards) cards.scrollLeft = c.offsetLeft - cards.offsetLeft; }
    if (!progress.tutorialSeen && d === 0) tutorial(0);
  }
  function cardHtml(id) {
    const b = B[id], st = E.cardStatus(G, id), future = b.era > G.d;
    const isNew = b.era === G.d && G.d > 0;
    return `<button type="button" role="listitem" class="card${sel === id ? ' sel' : ''}${st.ok ? '' : ' locked'}${future ? ' future' : ''}" data-card="${id}" aria-label="${b.name}, ${b.cost}원" aria-pressed="${sel === id}">
      <div class="c-icon">${A.building(id, { d: G.d })}</div><div class="c-name">${b.name}</div>
      <div class="c-row"><span class="cost">${icon('coin')}<b>${b.cost}</b></span>${needs(id)}</div><div class="c-fx">${effects(id)}</div>
      ${!st.ok ? `<span class="c-lock">${reasonHtml(st.reason, id)}</span>` : ''}${isNew ? '<span class="c-new">NEW</span>' : ''}</button>`;
  }
  /* 지은 건물에서 증축·이전·산업 전환을 고른다. */
  function popHtml() {
    const t = G.tiles[pop]; if (!t?.b) return '';
    const up = E.canUpgrade(G, pop), conversion = sel && E.canConvert(G, sel, pop);
    return `<div class="pop" role="dialog" aria-label="${B[t.b].name}"><div class="pop-head">${A.building(t.b, { d: G.d, level: E.level(t) })}<b>${B[t.b].name} ${E.level(t) === 2 ? '증축' : ''}</b></div>${buildingInfo(t.b, pop)}<div class="pop-actions">
      ${conversion?.ok ? btn('pop-convert', `${B[sel].name}로 전환 ${conversion.cost}`, 'primary', `data-id="${sel}"`) : ''}
      ${btn('pop-upgrade', `증축 ${up.cost || ''}`, 'secondary', up.ok ? '' : 'disabled')}${btn('pop-move', '이전 2', 'secondary', G.money < 2 ? 'disabled' : '')}${btn('pop-demolish', '철거 1', 'danger', E.canDemolish(G, pop).ok ? '' : 'disabled')}${btn('pop-close', icon('cross'), 'icon-btn', 'aria-label="닫기"')}</div></div>`;
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
    pop = null;
    if (sel === id) sel = null;
    else { sel = id; if (!st.ok) { S.play('no'); toast(`${A.building(id, { d: G.d })}${reasonHtml(st.reason, id)}`); } }
    S.play('tick'); build();
  }
  function tapTile(i) {
    if (busy) return;
    cursor = i;
    if (relocating !== null) { const result = E.move(G, relocating, i); if (result.ok) { relocating = null; saveGame(); build(); } else toast('비어 있는 열린 땅을 골라요. 해안 조건도 확인해요.'); return; }
    const t = G.tiles[i];
    if (sel) {
      const can = E.canPlace(G, sel, i);
      if (can.ok) {
        E.place(G, sel, i); S.play('place'); saveGame();
        if (!E.cardStatus(G, sel).ok) sel = null;
        build();
        app.querySelector(`[data-tile="${i}"]`)?.classList.add('pop-in');
        if (E.slotsLeft(G) === 0) toast('땅이 찼어요. 증축·전환이나 도시 확장을 살펴요.');
      } else {
        if (t.b) { pop = i; build(); return; }
        S.play('no');
        const el = app.querySelector(`[data-tile="${i}"]`); el?.classList.remove('shake'); void el?.offsetWidth; el?.classList.add('shake');
        if (E.buildable(t.x, t.y)) toast(reasonHtml(can.reason, sel));
      }
      return;
    }
    if (t.b) { pop = pop === i ? null : i; S.play('tick'); build(); }
  }

  function previewTile(el) {
    if (screen !== 'build' || busy || !sel || !layer.hidden) return;
    const i = Number(el?.dataset.tile), panel = app.querySelector('.city-warnings');
    if (!el || !E.canPlace(G, sel, i).ok) return;
    const p = E.preview(G, sel, i), current = E.production(G), row = p.rows.find(r => r.i === i), b = B[sel];
    const diff = p.exports - current.exports, harm = p.exposed.length - current.exposed.length;
    app.querySelectorAll('.tile').forEach(t => t.classList.toggle('preview-range', !!b.range && E.distance(i, Number(t.dataset.tile)) <= b.range));
    panel.innerHTML = `<p><b>${b.name} 배치 예상</b>${b.exp ? ` · 가동 ${Math.round(row.rate * 100)}%` : ''}</p><p>도시 수출 ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} · 피해 주택 ${harm >= 0 ? '+' : ''}${harm} · 순수입 ${p.income >= 0 ? '+' : ''}${p.income}</p>`;
  }
  app.addEventListener('pointerover', e => previewTile(e.target.closest('[data-tile]')));
  app.addEventListener('focusin', e => previewTile(e.target.closest('[data-tile]')));
  app.addEventListener('pointerout', e => {
    if (!e.target.closest('.map') || e.relatedTarget?.closest('.map') || screen !== 'build' || busy) return;
    app.querySelectorAll('.preview-range').forEach(t => t.classList.remove('preview-range'));
    const panel = app.querySelector('.city-warnings');
    panel.innerHTML = E.production(G).warnings.map(v => `<p>${esc(v)}</p>`).join('') || '<p>도시의 기반이 준비됐어요.</p>';
  });

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
    relocating = null;
    const d = G.d, chips = G.tiles.map((t, i) => [i, E.exportOf(G, i)]).filter(([, v]) => v > 0);
    Paint.preload(era(d).event.char);
    const res = E.advance(G);
    saveGame();
    if (res.problem) Paint.preload(res.problem.char);
    build();
    const climate = app.querySelector('.build');
    climate.classList.add('timelapse', 'city-running');
    const oldEnv = G.records[d - 1]?.gauges.env ?? 80;
    const haze = app.querySelectorAll('.sky-haze,.water-haze');
    haze.forEach(el => { el.style.transition = 'none'; el.style.opacity = (100 - oldEnv) / 100; });
    void climate.offsetWidth;
    haze.forEach(el => { el.style.transition = reduce ? 'none' : 'opacity 1.4s linear'; el.style.opacity = (100 - res.gauges.env) / 100; });
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
    if (techEl) techEl.textContent = E.production(G).skilled;
    year.innerHTML = `<span class="gain">${icon('coin')}${res.income >= 0 ? '+' : ''}${res.income}</span>${res.techGain ? `<span class="gain">${icon('star')}+${res.techGain}</span>` : ''}`;
    await wait(1300);
    climate.classList.remove('city-running');
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
        const k = b.dataset.k, choice = ev[k], fx = E.choiceEffects(G, ev, k);
        layer.querySelectorAll('.choice').forEach(x => { x.disabled = true; x.classList.toggle('picked', x === b); });
        E.applyFx(G, fx, choice.label);
        saveGame();
        const out = layer.querySelector('.fx-out');
        out.innerHTML = Object.entries(fx).map(([key, v]) => {
          const ic = key === 'money' ? 'coin' : key === 'tech' ? 'star' : GICON[key];
          return `<span class="fx ${v > 0 ? 'up' : 'down'}">${icon(ic)}<b>${v > 0 ? '+' : '−'}${Math.abs(v)}</b></span>`;
        }).join('') || `<span class="fx">${icon('check')}</span>`;
        S.play(Object.values(fx).some(v => v < 0) ? 'down' : 'up');
        const g = E.gauges(G);
        app.querySelector('.gauges').outerHTML = gaugesHtml(g);
        app.querySelectorAll('.res-item b')[0].textContent = G.money;
        app.querySelectorAll('.res-item b')[1].textContent = E.production(G).skilled;
        await wait(1300); closeLayer(); build(); app.querySelector('.build')?.classList.add('timelapse'); resolve();
      }, { once: true }));
    });
  }
  function historyCard(d) {
    return new Promise(resolve => {
      const rec = G.records[d], cat = era(d).real;
      openLayer(`<div class="hist"><span class="hist-tag">그때 우리나라는?</span><h3>${era(d).label}</h3>
        <div class="hist-row"><div class="hist-ico">${A.building(REPR[cat])}</div><p>${esc(era(d).realText)}</p></div>
        <div class="hist-me ${rec.match ? 'yes' : 'no'}">${icon(rec.match ? 'check' : 'compass')}<b>${rec.match ? '시대 산업을 활용했어요' : '다온시는 다른 산업을 키웠어요'}</b><span class="mine">${rec.built.map(id => A.building(id, { d })).join('')}</span></div>
        <div class="era-report"><b>내 도시의 성과</b><p>수출 ${rec.exports} · 순수입 ${rec.income >= 0 ? '+' : ''}${rec.income}</p><p>${Object.entries(rec.categories || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => `${D.categories[id].name} ${v.toFixed(1)}`).join(' · ') || '운영할 산업을 준비해요'}</p>${(rec.warnings || []).map(v => `<p>${esc(v)}</p>`).join('')}${rec.relief ? '<p>적자를 긴급 지원으로 메웠어요. 운영비를 줄여 봐요.</p>' : ''}</div>${btn('hist-next', d < E.LAST ? `다음 10년 ${icon('play')}` : `70년사 보기 ${icon('play')}`, 'primary big')}</div>`, 'hist-layer');
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
    if (G.records.length === D.eras.length) award('history');
    if (end.id === 'together') award('together');
    if (progress.endings.length === D.endings.length) award('allEndings');
    save();
    S.play(end.legend ? 'fanfare' : 'paper');
    setScreen('ending', `<section class="ending-page">
      <article class="final-paper${end.legend ? ' legend' : ''}"><div class="masthead">다온일보 호외</div><div class="dateline"><span>다온시 70년사</span><span>엔딩 ${progress.endings.length}/${D.endings.length}</span></div>
        ${isNew ? '<span class="new-stamp">NEW!</span>' : ''}<h2>${end.name}</h2><p class="story">${end.story}</p>
        <div class="final-body"><div class="final-map">${mapHtml(true)}</div><div class="final-side">${gaugesHtml(g, 'big')}
          <div class="hist-score">${icon('news')}<span>시대 산업 운영 <b>${score}/${D.eras.length}</b> · 나의 발전 경로</span></div></div></div>
        <div class="note">${P.icon('bulb')}<p>${end.note}${end.legend ? '' : `<br><span class="sub">${D.finalNote}</span>`}</p></div>
        ${earned.length ? `<div class="earned">${earned.map(id => `<span class="badge-chip">${icon('star')}${D.badges.find(b => b.id === id).name}</span>`).join('')}</div>` : ''}
        <div class="end-btns">${btn('new', `다시 하기 ${icon('play')}`, 'primary')}${btn('endings', '엔딩 도감', 'secondary')}${btn('title', '처음으로', 'secondary')}</div></article>
      <h3 class="papers-title">70년 신문 모음</h3>
      <div class="papers">${G.records.map(r => `<article class="mini-paper"><div class="mini-mast">다온일보 · ${era(r.d).label}</div><h4>${era(r.d).headline}</h4>
        <div class="mini-photo">${Paint.scene(`daon/era${r.d}`, `<span class="mini-built">${r.built.map(id => A.building(id, { d: r.d })).join('')}</span>`, `${era(r.d).label} 다온시 풍경`)}</div>
        <div class="mini-built"><p class="industry-record">${Object.entries(r.categories || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => D.categories[id].name).join(' + ') || '기반 준비'}</p>${r.built.length ? r.built.map(id => A.building(id, { d: r.d })).join('') : '<span class="empty">—</span>'}</div>
        <div class="mini-g">${GK.map(k => `<span class="bar" data-g="${k}"><i style="width:${r.gauges[k]}%"></i></span>`).join('')}</div>
        <div class="mini-match ${r.match ? 'yes' : 'no'}" aria-label="${r.match ? '같은 길' : '다온시는 다른 길로!'}">${icon(r.match ? 'check' : 'compass')}</div></article>`).join('')}</div>
      ${end.legend ? '<div class="confetti" aria-hidden="true">' + Array.from({ length: 40 }, (_, i) => `<i style="--x:${(i * 37) % 100};--d:${(i % 7) * .35}s;--c:${['#F5C542', '#2E9E6B', '#3B6FE0', '#E5484D', '#7B52D3'][i % 5]}"></i>`).join('') + '</div>' : ''}
    </section>`);
  }

  /* ───── 엔딩 도감 ───── */
  function endings() {
    setScreen('endings', `<header class="tbar">${iconBtn('home2', '처음으로', 'title')}<h1>엔딩 도감</h1><b class="count">${progress.endings.length}/${D.endings.length}</b></header>
      <section class="ending-grid">${D.endings.map(e => {
        const got = progress.endings.includes(e.id);
        return `<article class="end-card${got ? '' : ' locked'}${e.legend ? ' legend' : ''}"><div class="mini-mast">다온일보 호외</div>${got ? `<div class="end-photo">${A.building(({ export: 'port', tech: 'semi', creative: 'content', together: 'univ', gray: 'steel', unfair: 'welfare', stuck: 'textile', grown: 'house' })[e.id])}</div><h3>${e.name}</h3><p>${e.story}</p>` : `<div class="end-ico q">?</div><p class="hint">${HINTS[e.id]}</p>`}</article>`;
      }).join('')}</section>
      <h2 class="badge-title">배지</h2><section class="badge-row">${D.badges.map(b => {
        const got = progress.badges.includes(b.id);
        return `<article class="bdg${got ? '' : ' locked'}">${icon(got ? 'star' : 'lock')}<h3>${b.name}</h3><p>${b.goal}</p></article>`;
      }).join('')}</section>`);
  }

  /* ───── 안내(처음 한 번) ───── */
  function tutorial(step) {
    const art = [
      `<div class="tut-art">${A.building('textile')}<span class="tut-arrow">${icon('play')}</span><div class="tut-tile">${A.terrain('F')}</div></div>`,
      `<div class="tut-art"><div class="tut-tile">${A.terrain('F', true)}${A.building('school')}</div><div class="tut-tile">${A.terrain('F')}${A.building('house')}</div></div>`,
      `<div class="tut-art"><div class="tut-tile">${A.terrain('F')}<div class="b smoky">${A.building('steel')}</div></div><div class="tut-tile">${A.terrain('F')}${A.building('cleaner')}</div></div>`
    ];
    const caps = ['시대의 산업을 골라요!', '사람·교육·전력이 있어야 돌아가요!', '환경 보기에서 피해를 확인해요!'];
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
        if (E.slotsLeft(G) <= 0 && G.land < 2) E.expand(G);
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
      if (r.problem) E.applyFx(G, E.choiceEffects(G, r.problem, policy), r.problem[policy].label);
      E.applyFx(G, E.choiceEffects(G, era(G.d).event, policy), era(G.d).event[policy].label);
      E.nextDecade(G);
    }
    ending();
  }

  /* ───── 조작 연결 ───── */
  async function act(a, el) {
    switch (a) {
      case 'new': clearGame(); lens = 'industry'; trayMode = 'industry'; relocating = null; G = E.newGame(); saveGame(); sel = null; pop = null; S.play('tick'); eraPaper(); break;
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
      case 'help': if (G) help(el.dataset.help); break;
      case 'sound': progress.sound = !progress.sound; save(); S.setEnabled(progress.sound); S.play('tick'); if (!layer.hidden) settings(); else el.outerHTML = soundBtn(); break;
      case 'undo': if (G.actions.length) { const r = E.undo(G); if (!r.ok) { toast(reasonHtml(r.reason)); break; } S.play('undo'); saveGame(); build(); } break;
      case 'pop-undo': { const r = E.undo(G); if (!r.ok) toast(reasonHtml(r.reason)); else { S.play('undo'); saveGame(); } pop = null; build(); break; }
      case 'pop-demolish': if (E.demolish(G, pop).ok) { S.play('thud'); saveGame(); } pop = null; build(); break;
      case 'pop-upgrade': if (E.upgrade(G, pop).ok) { saveGame(); pop = null; build(); } break;
      case 'pop-convert': if (E.convert(G, el.dataset.id, pop).ok) { saveGame(); pop = null; sel = null; build(); } break;
      case 'pop-move': relocating = pop; pop = null; sel = null; build(); break;
      case 'expand': if (E.expand(G).ok) { saveGame(); build(); } break;
      case 'lens': lens = el.dataset.lens; pop = null; build(); break;
      case 'tray': trayMode = el.dataset.tray; sel = null; pop = null; build(); break;
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
    if (e.key === 'Escape') { if (!layer.hidden && !layer.querySelector('.event,.hist')) { if (layer.querySelector('.tut')) { progress.tutorialSeen = true; save(); } closeLayer(); return; } if (sel || pop !== null || relocating !== null) { sel = null; pop = null; relocating = null; build(); } return; }
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
