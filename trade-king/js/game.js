/* 무역왕 5.0 — 화면은 명령만 보내고 계산은 공용 엔진에 맡긴다. */
(() => {
  'use strict';
  const T = window.TRADE, E = window.TradeEngine, A = window.TradeArt, S = window.TteokSfx;
  const app = document.getElementById('app'), layer = document.getElementById('layer');
  const GAME = 'trade-king-v4-game', PROGRESS = 'trade-king-v4-progress';
  const debug = new URLSearchParams(location.search).get('debug') === '1';
  const icon = A.icon, sum = a => a.reduce((s, v) => s + v, 0);
  const btn = (action, text, extra = '', cls = '') => `<button type="button" data-action="${action}" class="${cls}" ${extra}>${text}</button>`;
  const portrait = id => id === 'world' ? `<span class="portrait merchant" aria-hidden="true">${icon('ship')}</span>` : `<img class="portrait" src="../shared-art/people/${E.country(id).portrait}.webp" alt="${E.country(id).name} 대표" draggable="false">`;
  const ART = new URL('../shared-art/trade/', location.href).href, SHIP = ART + 'ship.webp', portArt = id => `${ART}port_${E.country(id).portrait}.webp`;
  const endArt = {power: 'king', dependent: 'rawOnly', alone: 'richAlone', balanced: 'island', war: 'war', fair: 'normal'};
  const shipImg = '<img class="ship-img" src="' + SHIP + '" alt="" draggable="false">';
  const nameOf = id => id === 'world' ? '먼 바다 상인' : E.country(id).name;
  const stars = q => `<span class="q" aria-label="품질 별 ${q}개">${'★'.repeat(q)}<i>${'★'.repeat(3 - q)}</i></span>`;
  const hearts = r => `<span class="hearts" aria-label="사이 하트 ${r}개">${'♥'.repeat(r)}<i>${'♥'.repeat(3 - r)}</i></span>`;
  const G_ = i => T.goods[i];
  // 받침에 따라 조사를 고른다(이/가, 을/를, 은/는).
  const josa = (word, pair) => { const c = word.charCodeAt(word.length - 1) - 0xac00; const has = c >= 0 && c <= 11171 && c % 28 > 0; return word + (has ? pair[0] : pair[1]); };
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { toast('저장 공간을 쓸 수 없어 기록을 저장하지 못했어요.'); } }
  function removeSave() { try { localStorage.removeItem(GAME); } catch (_) { /* 저장 공간이 막혀 있으면 지울 것도 없다 */ } }
  let progress = {endings: [], events: [], badges: [], countryEndings: {}, best: {}, sound: false, tutorialEnabled: true, tutorialComplete: false};
  const stored = read(PROGRESS);
  if (stored && typeof stored === 'object') {
    for (const key of ['endings', 'events', 'badges']) if (Array.isArray(stored[key])) progress[key] = stored[key].filter(v => typeof v === 'string');
    for (const key of ['countryEndings', 'best']) if (stored[key] && typeof stored[key] === 'object' && !Array.isArray(stored[key])) progress[key] = stored[key];
    progress.sound = stored.sound === true;
    progress.tutorialComplete = stored.tutorialComplete === true;
    progress.tutorialEnabled = typeof stored.tutorialEnabled === 'boolean' ? stored.tutorialEnabled : !progress.tutorialComplete;
  }
  let G = null, selected = 0, workerPicked = false, shipPicked = false, toastTimer, screen = 'title', albumTab = 'events', albumPage = 0, albumBack = 'title', countryPage = 0;
  let savedYear = 0, focusBefore = null, challenge = null, cargo = null, coach = null, coachStop = false;
  let guide = {enabled: false, done: new Set()}, holdSheet = false;
  const fxLayer = document.createElement('div'); fxLayer.className = 'fx-layer'; fxLayer.hidden = true; fxLayer.title = '누르면 건너뛰어요'; document.body.append(fxLayer);
  const coachRoot = document.createElement('div'); coachRoot.id = 'coach'; coachRoot.hidden = true; document.body.append(coachRoot);
  S.setEnabled(progress.sound);

  function toast(message) { const el = document.getElementById('toast'); el.textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.textContent = '', 2600); }
  function savedGame() { const s = read(GAME); return s?.version === T.version && s.phase === 'event' && s.year >= 1 && s.year <= 5 && Array.isArray(s.nations) && s.nations.length === 5 && s.nations.every(n => E.country(n.id) && Array.isArray(n.box)) && s.event ? s : null; }
  function closeSheet() { layer.hidden = true; layer.innerHTML = ''; app.inert = false; if (focusBefore?.isConnected) focusBefore.focus({preventScroll: true}); }
  function fitSheet() { const s = layer.querySelector('.sheet'); if (!s) return; s.style.zoom = '1'; const r = s.getBoundingClientRect(), pad = parseFloat(getComputedStyle(layer).paddingLeft) * 2; s.style.zoom = String(Math.floor(Math.min(1, (innerHeight - pad) / r.height, (innerWidth - pad) / r.width) * 100) / 100); }
  function openSheet(title, content, dismiss = false, cls = '') {
    if (layer.hidden) focusBefore = document.activeElement;
    layer.hidden = false; layer.className = 'sheet-backdrop'; layer.dataset.dismiss = String(dismiss);
    layer.innerHTML = `<section class="sheet ${cls}" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1"><div class="row"><span class="eyebrow">세계를 잇는 다섯 해</span>${dismiss ? btn('close', '닫기', '', 'small') : ''}</div><h2 id="sheet-title">${title}</h2>${content}</section>`;
    app.inert = true; fitSheet(); (layer.querySelector('.sheet [data-autofocus]') || layer.querySelector('button:not(:disabled)') || layer.querySelector('.sheet')).focus({preventScroll: true});
  }
  function setScreen(name, html) { closeSheet(); clearCoach(); screen = name; app.innerHTML = html; window.scrollTo(0, 0); app.querySelector('button:not(:disabled)')?.focus({preventScroll: true}); }

  // ---------- 타이틀·나라 고르기 ----------
  function tutorialChoice() { return `<div class="tutorial-choice" role="group" aria-label="처음 하는 친구를 위한 안내">${btn('tutorial-choice', '처음이에요 (안내 켜기)', `data-enabled="true" aria-pressed="${progress.tutorialEnabled}"`)}${btn('tutorial-choice', '안내 끄기', `data-enabled="false" aria-pressed="${!progress.tutorialEnabled}"`)}</div>`; }
  function title() {
    setScreen('title', `<section class="screen title-screen" style="--bg:url(${ART}title.webp)"><div class="title-panel"><span class="eyebrow">세계 무역 전략 보드게임</span><h1>무역왕</h1><h2>배를 띄워 세계를 잇는 다섯 해</h2><div class="title-step"><span>📜 소식</span><span>🧑‍🏭 만들기</span><span>⛵ 배 보내기</span><span>🏆 해 끝</span></div><div class="actions">${btn('new', '나라 고르기', '', 'primary')}${savedGame() ? btn('continue', '이어하기') : ''}${btn('album', '도감')}${btn('sound', progress.sound ? '소리 끄기' : '소리 켜기')}</div>${tutorialChoice()}</div><div class="title-ships" aria-hidden="true">${shipImg}${shipImg}</div></section>`);
  }
  function countries() {
    const unlocked = E.unlocked(progress);
    setScreen('countries', `<section class="screen country-screen"><header class="screen-head"><div><span class="eyebrow">다른 조건, 다른 전략</span><h1>어느 나라를 이끌까요?</h1></div>${unlocked.length === 8 ? `<label class="challenge">도전 규칙 <select id="challenge"><option value="">기본 규칙</option>${T.challenges.map(c => `<option value="${c.id}" ${challenge === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>` : ''}${btn('title', '처음으로')}</header><div class="country-grid">${T.countries.map((c, i) => {
      const top = c.production.indexOf(Math.max(...c.production)), open = unlocked.includes(c.id);
      return `<button class="country-card ${open ? '' : 'locked'}" ${innerWidth <= 600 && Math.floor(i / 2) !== countryPage ? 'hidden' : ''} data-action="country" data-id="${c.id}" style="--tint:${c.color}" ${open ? '' : 'disabled'} title="${c.condition} · ${c.weakness}"><span class="cc-art"><img src="${portArt(c.id)}" alt="" draggable="false">${portrait(c.id)}<span class="cc-workers">${icon('person')}×${c.workers}</span></span><span class="cc-name">${c.name}</span><span class="made">${c.production.map((v, g) => `<span class="${g === top ? 'top' : ''}" title="${G_(g).name} 1명당 ${v}상자">${icon(G_(g).icon)}<b>${v}</b></span>`).join('')}</span><span class="cc-ability">✨ ${c.ability}<small>${c.abilityText}</small></span>${open ? '' : `<span class="cc-lock">🔒 ${T.unlocks[c.id]}</span>`}</button>`;
    }).join('')}</div><div class="row country-pages">${btn('country-prev', '이전', countryPage === 0 ? 'disabled' : '')}<span>${countryPage + 1} / 4</span>${btn('country-next', '다음', countryPage === 3 ? 'disabled' : '')}</div></section>`);
  }
  function start(id) { if (!E.unlocked(progress).includes(id)) return; G = E.newGame(Date.now() >>> 0, id, progress, challenge); savedYear = 0; selected = 0; resetGuide(); render(); }
  function saveYear() { if (G.phase === 'event' && savedYear !== G.year) { write(GAME, G); savedYear = G.year; } }

  // ---------- 판 ----------
  const phases = ['event', 'make', 'ship', 'yearEnd'], phaseNames = ['소식', '만들기', '배 보내기', '해 끝'];
  function phaseBar() {
    const cur = phases.indexOf(G.phase), closed = !E.tradeOpen(G);
    return `<nav class="phase-bar" aria-label="한 해의 순서">${phaseNames.map((name, i) => {
      const done = i < cur, skip = i === 2 && closed;
      return `<div class="phase-step ${i === cur ? 'current' : ''} ${done ? 'done' : ''} ${skip ? 'locked' : ''}" data-step="${phases[i]}" ${i === cur ? 'aria-current="step"' : ''}><b>${done ? '✓' : ['①', '②', '③', '④'][i]} ${name}</b>${skip ? '<small>국경 닫힘</small>' : ''}</div>`;
    }).join('<span class="arrow" aria-hidden="true">→</span>')}</nav>`;
  }
  const panelHelp = id => btn('panel-help', '?', `data-panel="${id}" aria-label="${{factory: '우리 나라 공장', world: '세계 지도', basket: '국민 바구니', ranking: '순위', money: '금고'}[id]} 설명"`, 'panel-help');
  // 일꾼 말: 만들기 단계에서는 끌어서 옮길 수 있다.
  const meeple = (from, live) => `<span class="meeple" ${live ? `data-drag="worker" data-from="${from}"` : ''} aria-hidden="true">${icon('person')}</span>`;
  function factoryPanel(n) {
    const idle = n.workers - sum(n.allocation), make = G.phase === 'make', canProtect = G.year >= 3 && G.challenge !== 'no-protect' && ['make', 'ship'].includes(G.phase);
    return `<section class="panel factory-panel"><div class="panel-heading"><h3>우리 나라 공장</h3>${panelHelp('factory')}</div><div class="workers ${workerPicked ? 'picked' : ''}" data-drop="pool">${btn('worker', `남은 일꾼 <b>${idle}</b>명`, `aria-pressed="${workerPicked}" ${make ? '' : 'disabled'}`, 'pool-btn')}<span class="pool-meeples">${Array.from({length: idle}, () => meeple('pool', make)).join('')}${make && idle ? '<small>끌어서 공장에 놓아요</small>' : ''}</span></div>${T.goods.map((g, i) => {
      const per = E.perWorker(n, i), made = n.allocation[i] * per;
      return `<div class="factory ${selected === i ? 'active' : ''} ${n.closed[i] ? 'closed' : ''} ${n.protect[i] ? 'protected' : ''}" data-industry="${i}" ${make && !n.closed[i] ? `data-drop="factory" data-i="${i}"` : ''}><div class="factory-name">${icon(g.icon)}<span><strong>${g.name}</strong><small>${n.closed[i] ? '문 닫음' : `1명당 ${per}상자`} ${stars(n.quality[i])}</small></span></div>${btn('minus', '−', `data-i="${i}" data-focus="minus-${i}" aria-label="${g.name} 공장 일꾼 빼기" ${make && n.allocation[i] > 0 ? '' : 'disabled'}`)}<span class="tray" aria-label="${g.name} 일꾼 ${n.allocation[i]}명">${Array.from({length: n.allocation[i]}, () => meeple(i, make)).join('')}<b class="count">${n.allocation[i] || ''}</b></span>${btn('plus', '+', `data-i="${i}" data-focus="plus-${i}" aria-label="${g.name} 공장 일꾼 더하기" ${make && !n.closed[i] && idle > 0 ? '' : 'disabled'}`)}${G.year >= 3 ? btn('protect', '🛡', `data-i="${i}" data-focus="protect-${i}" aria-pressed="${n.protect[i]}" aria-label="${g.name} 보호 ${n.protect[i] ? '끄기' : '켜기'}" ${canProtect ? '' : 'disabled'}`, 'shield' + (G.year === 3 ? ' new-feature' : '')) : '<span class="shield-slot" aria-hidden="true"></span>'}<span class="made-preview">${make && made ? `+${made}` : ''}</span></div>`;
    }).join('')}</section>`;
  }
  // 섬 위치(지도 안 %): 우리 항구는 가운데, 상인은 오른쪽 가장자리
  const spots = [[50, 48], [17, 17], [83, 17], [17, 80], [83, 80]], merchantSpot = [50, 3];
  function islandCard(n, o, k) {
    const is = E.island(G, n, o), open = E.tradeOpen(G), ship = G.phase === 'ship', drop = ship ? 'data-drop="island"' : '', tab = ship ? '' : 'tabindex="-1"';
    const docked = n.voyages.filter(v => v.to === o.id).length;
    if (o.world) return `<button type="button" class="merchant-island ${ship && E.shipsLeft(n) ? 'target' : ''}" data-action="island" data-id="world" ${drop} style="left:${merchantSpot[0]}%;top:${merchantSpot[1]}%" ${tab} title="무엇이든 사고팔지만 값은 불리해요" aria-label="먼 바다 상인${ship ? '에게 배 보내기' : ''} — 무엇이든 사고팔지만 값은 불리해요">${shipImg}<strong>먼 바다 상인${docked ? ' ⚓' : ''}</strong></button>`;
    const token = (s, need) => `<span class="chip ${need ? 'need' : ''} ${s.blocked ? 'blocked' : ''}" title="${G_(s.i).name} ${s.qty}상자 · 1상자 ${s.price}원" style="--c:${G_(s.i).color}">${icon(G_(s.i).icon)}<b>${Math.min(s.qty, 99)}</b><em>${s.price}원</em></span>`;
    const sells = [...is.sells].sort((a, b) => b.qty - a.qty).slice(0, 3).map(s => token(s, false)).join(''), needs = is.needs.slice(0, 3).map(s => token(s, true)).join('');
    const pos = spots[k];
    return `<button type="button" class="island ${ship && E.shipsLeft(n) ? 'target' : ''} ${is.fta ? 'fta' : ''}" data-action="island" data-id="${o.id}" ${drop} style="left:${pos[0]}%;top:${pos[1]}%;--tint:${E.country(o.id).color}" ${tab} aria-label="${nameOf(o.id)}${ship ? '으로 배 보내기' : ''}"><span class="isl-art"><img src="${portArt(o.id)}" alt="" draggable="false">${portrait(o.id)}${docked ? `<span class="docked" aria-label="정박한 배 ${docked}척">${shipImg}${docked > 1 ? `<b>${docked}</b>` : ''}</span>` : ''}</span><span class="isl-name"><strong>${nameOf(o.id)}</strong>${hearts(is.rel)}</span><span class="trade-row ${open ? '' : 'dim'}"><small class="tag sell">팔아요</small>${sells || '<i class="none">—</i>'}</span><span class="trade-row ${open ? '' : 'dim'}"><small class="tag buy">사요</small>${needs || '<i class="none">—</i>'}</span></button>`;
  }
  function worldPanel(n) {
    const open = E.tradeOpen(G), others = G.nations.slice(1);
    const route = (from, to, cls) => `<line class="route ${cls}" x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}"/>`;
    const pos = id => id === 'world' ? merchantSpot : spots[G.nations.findIndex(x => x.id === id)];
    const mine = [...new Set(n.voyages.map(v => v.to))].map(id => { const d = id !== 'world' && T.goods.some((g, i) => { const l = E.liveDependency(n, i); return l && l.from === id && l.share > .7; }); return route(spots[0], pos(id), d ? 'danger' : n.fta.includes(id) ? 'fta' : 'mine'); }).join('');
    const npc = (G.npcRoutes || []).map(([a, b]) => b !== 'world' && pos(a) && pos(b) ? route(pos(a), pos(b), 'npc') : '').join('');
    const left = E.shipsLeft(n);
    return `<section class="panel world-panel ${G.phase === 'ship' ? 'shipping' : ''}"><div class="world-head row"><h3>세계 지도</h3>${panelHelp('world')}<span class="pill">${open ? (G.phase === 'ship' ? `배 ${left}척 남음` : '무역 가능') : '국경 닫힘 · 2년째부터 출항'}</span></div><div class="world ${cargo ? 'docking' : ''}">${cargo ? tradeTable(n) : `<svg class="routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${npc}${mine}</svg>${others.map((o, k) => islandCard(n, o, k + 1)).join('')}${open ? islandCard(n, G.world, 0) : ''}<div class="home" style="left:${spots[0][0]}%;top:${spots[0][1]}%"><span class="home-art"><img src="${portArt(n.id)}" alt="" draggable="false">${portrait(n.id)}</span><strong>우리 항구</strong><span class="fleet" aria-label="출항할 수 있는 배 ${left}척">${Array.from({length: E.shipsTotal(n)}, (_, i) => i < left ? btn('ship', shipImg, `${G.phase === 'ship' ? 'data-drag="ship"' : 'disabled'} aria-pressed="${shipPicked}" aria-label="배 고르기 — 섬으로 끌어다 놓아요"`, 'ship-token') : '<span class="ship-token gone" aria-hidden="true">⚓</span>').join('')}</span></div>`}</div><div class="voyages">${n.voyages.length ? n.voyages.map((v, k) => `<span class="voyage">⛵ ${nameOf(v.to)} · ${v.give.map(([i, q]) => G_(i).name + ' ' + q).join('+') || '빈 배'} → ${v.get.map(([i, q]) => G_(i).name + ' ' + q).join('+') || '돈'} ${G.phase === 'ship' ? btn('undo', '되돌리기', `data-i="${k}" aria-label="${nameOf(v.to)} 출항 되돌리기"`, 'small link') : ''}</span>`).join('') : `<span class="map-note"><b class="key sell">팔아요</b> <b class="key buy">사요</b> · 흰 항로: 우리 배 · 빨강: 한 나라에 너무 기댐 · 초록: FTA</span>`}</div></section>`;
  }
  const list = o => Object.entries(o).map(([i, q]) => [+i, q]).filter(x => x[1]);
  // 지금 배에 실은 대로 출항하면 바구니가 어떻게 될지(복사본에서 미리 해 본다)
  function preview(n) {
    const pv = E.preview(G, n); if (!cargo) return pv;
    const C = structuredClone(G);
    if (!E.voyage(C, cargo.to, list(cargo.give), list(cargo.get))) return pv;
    const after = E.preview(C, E.player(C));
    after.rows.forEach((r, i) => { r.add = Math.max(0, r.have - pv.rows[i].have); }); return after;
  }
  function basketPanel(n) {
    const pv = preview(n);
    return `<section class="panel basket-panel"><div class="panel-heading"><h3>국민 바구니</h3>${panelHelp('basket')}</div><div class="life"><span>생활 점수 ${G.phase === 'yearEnd' ? '' : '(예상)'}</span><b>${pv.score}</b></div>${pv.rows.map((r, i) => {
      const filled = Math.min(r.have, r.need), extra = Math.max(0, r.have - r.need);
      return `<div class="basket-line ${r.have === 0 ? 'empty' : r.full ? 'full' : ''}" data-good="${i}"><span class="bl-name">${icon(G_(i).icon)}${G_(i).name}</span><span class="boxes" aria-hidden="true">${Array.from({length: r.need}, (_, k) => `<i class="${k < filled - r.add && k < filled ? 'on' : k < filled ? 'new' : ''}" style="--c:${G_(i).color}"></i>`).join('')}</span><span class="bl-count">${filled}/${r.need}${extra ? ` <em>+${extra}</em>` : ''}</span><span class="bl-mark">${r.full ? '✓' : r.have === 0 ? '빈칸!' : ''}</span></div>`;
    }).join('')}<p class="keep-note">남는 상자는 다음 해로 넘어가요${n.warehouse ? ' (비상 창고: 두 배)' : ''}.</p></section>`;
  }
  function render() {
    if (!G) return title();
    if (G.phase === 'ending') { clearCoach(); progress = {...G.progress, sound: progress.sound, tutorialEnabled: progress.tutorialEnabled, tutorialComplete: progress.tutorialComplete}; write(PROGRESS, progress); removeSave(); return ending(); }
    saveYear();
    const n = E.player(G), focus = document.activeElement?.dataset.focus;
    if (G.phase !== 'ship') cargo = null;
    closeSheet();
    screen = 'board';
    app.innerHTML = `<section class="board" data-phase="${G.phase}" data-closed="${!E.tradeOpen(G)}"><header class="topbar"><div class="logo"><h1>무역왕</h1><p><span class="year-dots" aria-label="${G.year}년째, 모두 5년">${[1, 2, 3, 4, 5].map(y => `<i class="${y <= G.year ? 'filled' : ''}"></i>`).join('')}</span> ${G.year}년째</p></div>${phaseBar()}<div class="money">${panelHelp('money')}<span>${icon('coin')}<b>${n.money}</b>원</span></div></header><div class="ranking">${panelHelp('ranking')}${E.ranking(G).map(r => `<div class="rank ${r.id === n.id ? 'you' : ''} ${r.rank === 1 ? 'first' : ''}">${portrait(r.id)}<div><strong>${r.rank}위 ${E.country(r.id).name}${r.id === n.id ? ' (우리)' : ''}</strong><span>평균 ${r.score}점</span></div></div>`).join('')}</div><div class="board-middle">${factoryPanel(n)}${worldPanel(n)}${basketPanel(n)}</div><footer class="board-footer">${todoCard(n)}<div class="actions">${btn('title', '처음으로', '', 'small')}${btn('help', '도움말', '', 'small')}${debug ? btn('debug-year', '한 해 넘기기', '', 'small debug') : ''}${btn('next', G.phase === 'make' ? (E.tradeOpen(G) ? '만들고 ③ 배 보내기 →' : '만들고 ④ 해 끝 →') : G.phase === 'ship' ? '④ 해 끝내기 →' : G.phase === 'event' ? '① 소식 카드 보기' : '해 끝 카드 보기', '', 'primary')}</div></footer></section>`;
    if (focus) app.querySelector(`[data-focus="${focus}"]:not(:disabled)`)?.focus({preventScroll: true});
    if (holdSheet) return;
    if (G.phase === 'event') eventSheet(); else if (G.phase === 'yearEnd') yearEndSheet();
    maybeGuide();
  }
  function todoCard(n) {
    let rows = [];
    const pv = E.preview(G, n), empty = pv.rows.map((r, i) => r.have < r.need ? `${G_(i).name} ${r.need - r.have}` : null).filter(Boolean);
    if (G.phase === 'make') {
      const idle = n.workers - sum(n.allocation);
      rows = [[!idle, `일꾼 ${n.workers}명을 공장에 놓기 (남은 ${idle}명)`], [!empty.length, empty.length ? `바구니 빈 곳: ${empty.slice(0, 3).join(' · ')}${empty.length > 3 ? ` 외 ${empty.length - 3}칸` : ''}` : '바구니 다섯 칸이 다 차요']];
      if (G.year === 1) rows.push([false, '1년째는 혼자서 다섯 칸을 채워 봐요']);
    } else if (G.phase === 'ship') {
      const left = E.shipsLeft(n), extra = pv.rows.filter(r => r.have > r.need).length;
      if (cargo) { const g = sum(Object.values(cargo.give)), t = sum(Object.values(cargo.get)); rows = [[g > 0, '남는 상자를 ‘싣고 갈 짐’ 칸으로 끌어 놓기'], [t > 0, '모자란 상자를 ‘받아 올 짐’ 칸으로 끌어 놓기'], [false, '⛵ 출항 누르기 (배 돌리기로 취소)']]; return `<aside class="todo-card" aria-label="지금 할 일" aria-live="polite"><strong>지금 할 일 · ③ ${josa(nameOf(cargo.to), ['과', '와'])} 거래</strong><ul>${rows.map(([done, text]) => `<li class="${done ? 'checked' : ''}"><span>${done ? '✓' : '□'}</span> <span>${text}</span></li>`).join('')}</ul></aside>`; }
      rows = [[!left, left ? `배 ${left}척 — 배를 섬으로 끌어다 놓아요(섬을 눌러도 돼요)` : '배를 모두 보냈어요'], [!empty.length, empty.length ? `모자란 것: ${empty.slice(0, 3).join(' · ')}${empty.length > 3 ? ` 외 ${empty.length - 3}칸` : ''}` : '바구니가 다 찼어요'], [!extra, extra ? '남는 물건은 필요한 섬에 팔 수 있어요' : '남는 물건 정리 끝']];
    } else rows = [[false, {event: '소식 카드에서 우리 나라의 선택을 골라요.', yearEnd: G.year >= 3 ? '해 끝 카드를 보고 정책을 골라요.' : '해 끝 카드를 보고 다음 해로 가요.'}[G.phase]]];
    return `<aside class="todo-card" aria-label="지금 할 일" aria-live="polite"><strong>지금 할 일 · ${['①', '②', '③', '④'][phases.indexOf(G.phase)]} ${phaseNames[phases.indexOf(G.phase)]}</strong><ul>${rows.map(([done, text]) => `<li class="${done ? 'checked' : ''}"><span>${done ? '✓' : '□'}</span> <span>${text}</span></li>`).join('')}</ul></aside>`;
  }

  // ---------- 카드 창 ----------
  function eventText(text) { const e = G.event; return text.replace(/\{source\}(이|을|은)?/g, (m, j) => { const w = nameOf(e.source); return j ? josa(w, {이: ['이', '가'], 을: ['을', '를'], 은: ['은', '는']}[j]) : w; }).replace(/\{good\}(을|이)?/g, (m, j) => { const w = e.good === null ? '' : G_(e.good).name; return j ? josa(w, {을: ['을', '를'], 이: ['이', '가']}[j]) : w; }); }
  function eventSheet() {
    const e = E.event(G.event.id);
    openSheet(e.name, `<span class="pill ${e.crisis ? 'crisis' : e.kind}">${G.year}년째 · ${e.rarity}</span><div class="art-block" data-art="${e.art}">${icon(e.icon)}${G.event.source && /\{source\}/.test(e.text) ? portrait(G.event.source) : ''}</div><p>${eventText(e.text)}</p><div class="choice-list">${e.choices.map((text, i) => btn('event', `${i + 1}. ${eventText(text)}`, `data-i="${i}"`)).join('')}</div><div class="note">무역 노트 · ${e.note}</div>`, false, 'event-sheet');
  }
  function yearEndSheet() {
    const r = G.report, n = E.player(G), choices = E.policyChoices(G);
    const line = (label, v, cls = '') => v ? `<span class="pt ${cls}">${label} <b>${v > 0 ? '+' : ''}${v}</b></span>` : '';
    const bar = (label, v, cls) => `<div class="bar ${cls}"><span>${label}</span><i style="width:${Math.max(4, v)}%"></i><b>${v}점</b></div>`;
    const rankText = r.year === 1 ? `지금 ${r.rank}위` : r.rank < r.rankBefore ? `${r.rankBefore}위 → ${r.rank}위로 올랐어요!` : r.rank > r.rankBefore ? `${r.rankBefore}위 → ${r.rank}위로 내려갔어요.` : `${r.rank}위를 지켰어요.`;
    const target = id => id === 'grow' ? `<select data-target="grow" aria-label="키울 공장">${T.goods.map((g, i) => n.closed[i] ? '' : `<option value="${i}" ${i === E.best(n) ? 'selected' : ''}>${g.name}</option>`).join('')}</select>` : id === 'reopen' ? `<select data-target="reopen" aria-label="다시 열 공장">${T.goods.map((g, i) => n.closed[i] ? `<option value="${i}">${g.name}</option>` : '').join('')}</select>` : id === 'fta' ? `<select data-target="fta" aria-label="FTA 상대">${G.nations.slice(1).filter(o => E.rel(G, n, o) >= 3 && !n.fta.includes(o.id)).map(o => `<option value="${o.id}">${o.id && E.country(o.id).name}</option>`).join('')}</select>` : '';
    const policy = G.year >= 3 ? `<h3 class="policy-title">정책 카드 한 장 고르기</h3><div class="policy-list">${choices.map(id => { const p = T.policies.find(p => p.id === id), cost = E.policyCost(n, id); return `<div class="policy-card" data-policy="${id}"><b>${p.name}</b><small>${p.text}</small>${target(id)}${btn('policy', `${cost}원 내고 고르기`, `data-id="${id}" ${n.money < cost ? 'disabled' : ''}`, 'small')}</div>`; }).join('')}</div>${btn('next', '정책 없이 다음 해로 →')}` : btn('next', G.year >= 5 ? '마지막 결과 보기 →' : '다음 해 ① 소식 →', 'data-autofocus', 'primary');
    openSheet(`${r.year}년째 해 끝`, `<div class="score-big"><span>${portrait(n.id)}</span><b>${r.score}<small>점</small></b><span class="rank-move">${r.year === 1 ? '' : r.rank < r.rankBefore ? '▲' : r.rank > r.rankBefore ? '▼' : '●'} ${rankText}</span></div><div class="breakdown">${line('📦 칸 채움', r.slot)}${line('★ 품질', r.quality)}${line('🛡 물가', -r.unrest, 'cost')}${line('⚡ 위기 피해', -r.crisisLoss, 'cost')}${line('📜 사건', r.bonus)}</div>${r.year >= 2 ? `<div class="comparison">${bar('혼자 만든 1년째', r.alone, 'alone')}${bar(E.tradeOpen(G) ? '배를 보낸 올해' : '혼자 만든 올해', r.score, 'now')}</div>` : ''}${policy}`, false, 'year-sheet');
  }
  // 부두 교환대: 상자를 끌어다 배에 싣는다(누르면 한 상자씩).
  function tradeTable(n) {
    const o = E.nation(G, cargo.to), is = E.island(G, n, o), give = list(cargo.give), get = list(cargo.get);
    const q = E.quoteVoyage(G, n, o, give, get), after = n.money + q.income - q.cost, loaded = sum(give.map(x => x[1])), taken = sum(get.map(x => x[1]));
    const name = nameOf(o.id), full = k => (k === 'give' ? loaded : taken) >= 6;
    const stack = (kind, i, left, price, extra, why) => {
      const src = kind === 'give' ? 'mine' : 'theirs', ok = !why && left > 0 && !full(kind);
      return btn('load', `${icon(G_(i).icon)}<b class="stack-n">${why || `×${Math.min(left, 99)}`}</b><small>${kind === 'give' ? '+' : '−'}${price}원${extra}</small>`, `data-kind="${kind}" data-i="${i}" data-focus="load-${kind}-${i}" ${ok ? `data-drag="box" data-src="${src}"` : 'disabled'} aria-label="${G_(i).name} 1상자 ${kind === 'give' ? `싣기, 1상자에 ${price}원 받음` : `받기, 1상자에 ${price}원 냄`}${why ? ` — ${why}` : ''}" style="--c:${G_(i).color}"`, 'stack');
    };
    const mine = T.goods.map((g, i) => ({i, sur: E.surplus(n, i), room: E.room(G, n, o, i), price: E.sellPrice(G, n, o, i)})).filter(r => r.sur > 0)
      .map(r => stack('give', r.i, Math.min(r.sur, r.room) - (cargo.give[r.i] || 0), r.price, '', r.room ? '' : '안 사요')).join('');
    const theirs = is.sells.map(s => stack('get', s.i, s.qty - (cargo.get[s.i] || 0), s.price, o.world ? '' : ` ${'★'.repeat(s.quality)}`, s.blocked ? '🚫막힘' : '')).join('');
    const hold = kind => { const boxes = list(cargo[kind]).flatMap(([i, k]) => Array(k).fill(i)); return Array.from({length: 6}, (_, k) => boxes[k] === undefined ? '<span class="slot" aria-hidden="true"></span>' : btn('unload', icon(G_(boxes[k]).icon), `data-kind="${kind}" data-i="${boxes[k]}" data-drag="box" data-src="${kind}" aria-label="${G_(boxes[k]).name} 1상자 내리기" style="--c:${G_(boxes[k]).color}"`, 'slot box')).join(''); };
    const summary = `${give.map(([i, k]) => `${G_(i).name} ${k}`).join(' + ') || '빈 배'} → ${get.map(([i, k]) => `${G_(i).name} ${k}`).join(' + ') || '돈만'}`;
    const info = o.world ? '값은 불리하지만 언제나 거래해요' : `${hearts(is.rel)} ${is.fta ? 'FTA · 1원 할인' : is.rel >= 3 ? '♥3 · 1원 할인' : '3상자 넘게 오가면 ♥+1'}`;
    return `<div class="trade-table" data-to="${o.id}"><div class="tt-head">${portrait(o.id)}<div><strong>${josa(name, ['으로', '로'])} 가는 배</strong><small>${info}</small></div>${btn('dock-cancel', '배 돌리기', '', 'small')}</div><div class="tt-body"><section class="tt-side tt-mine" data-drop="mine"><h4>우리 항구 · 남는 것</h4><div class="stacks">${mine || '<p class="muted">남는 상자가 없어요.</p>'}</div></section><section class="tt-ship"><div class="hold hold-give" data-drop="give"><h4>싣고 갈 짐 ${loaded}/6 →</h4><div class="slots">${hold('give')}</div></div><div class="hull" aria-hidden="true">⛵</div><div class="hold hold-get" data-drop="get"><h4>← 받아 올 짐 ${taken}/6</h4><div class="slots">${hold('get')}</div></div></section><section class="tt-side tt-theirs" data-drop="theirs"><h4>${josa(name, ['이', '가'])} 파는 것</h4><div class="stacks">${theirs || '<p class="muted">파는 물건이 없어요.</p>'}</div></section></div><div class="tt-foot"><div class="tt-sum"><b>${summary}</b><span>금고 ${n.money}원 → <b class="${after < 0 ? 'neg' : ''}">${after}원</b>${q.ok || !(give.length + get.length) ? '' : ` · <em class="warn">${q.reason}</em>`}</span></div>${btn('sail', '⛵ 출항', q.ok ? '' : 'disabled', 'primary')}</div></div>`;
  }
  function ending() {
    const n = E.player(G), e = T.endings.find(e => e.id === G.ending), rank = E.ranking(G).find(r => r.id === n.id).rank;
    setScreen('ending', `<section class="screen ending-screen"><article class="ending-card"><div class="ending-art" data-art="${e.art}" style="--bg:url(${ART}end_${endArt[e.id] || 'normal'}.webp)">${portrait(n.id)}<b>${E.country(n.id).name}</b></div><div><span class="eyebrow">다섯 해가 만든 나라</span><h1>${e.name}</h1><span class="pill">${rank}위 · 평균 생활 ${n.score}점</span><div class="note">무역 노트 · ${e.note}<br><b>함께 이야기해요</b><br>${e.question}</div><p class="history">${n.history.map(h => `${h.year}년 ${h.score}점`).join(' → ')}</p><p>얻은 배지: ${G.badges.map(id => T.badges.find(b => b.id === id)?.name).join(' · ') || '다음 도전에서 만나요'}</p><div class="actions">${btn('album', '도감 보기', '', 'primary')}${btn('new', '다른 나라 도전')}${btn('title', '처음으로')}</div></div></article></section>`);
  }
  function album() {
    const items = albumTab === 'events' ? T.events : albumTab === 'countries' ? T.countries : T.badges, pages = Math.ceil(items.length / 4); albumPage = Math.min(albumPage, pages - 1);
    const cards = items.slice(albumPage * 4, albumPage * 4 + 4).map(item => {
      if (albumTab === 'events') { const found = progress.events.includes(item.id); return `<article class="collection-card ${found ? '' : 'locked'}"><span class="pill">${item.rarity}</span>${icon(found ? item.icon : 'home')}<h3>${found ? item.name : '아직 만나지 않은 사건'}</h3><p>${found ? item.note : '새로운 선택 속에서 발견해 보세요.'}</p></article>`; }
      if (albumTab === 'countries') { const endings = Array.isArray(progress.countryEndings[item.id]) ? progress.countryEndings[item.id] : []; return `<article class="collection-card">${portrait(item.id)}<h3>${item.name} · ${progress.best[item.id] ? `최고 ${progress.best[item.id]}위` : '아직 기록 없음'}</h3><div class="ending-grid">${T.endings.map(e => `<span class="${endings.includes(e.id) ? 'discovered' : 'muted'}">${endings.includes(e.id) ? '●' : '○'} ${e.name}</span>`).join('')}</div></article>`; }
      const found = progress.badges.includes(item.id); return `<article class="collection-card ${found ? '' : 'locked'}">${icon('star', found ? '#d8aa45' : '#a1a795')}<h3>${found ? '얻음 · ' : ''}${item.name}</h3><p>${E.country(item.country).name}</p><p>${item.text}</p></article>`;
    }).join('');
    setScreen('album', `<section class="screen"><div class="collection"><header class="screen-head"><div><span class="eyebrow">선택이 쌓이는 곳</span><h1>무역 도감</h1></div>${btn('album-back', '돌아가기')}</header><nav class="tabs">${[['events', '사건 카드'], ['countries', '나라 × 엔딩'], ['badges', '전략 배지']].map(([id, name]) => btn('album-tab', name, `data-id="${id}" aria-pressed="${albumTab === id}"`)).join('')}</nav><div class="collection-grid">${cards}</div><div class="row">${btn('album-prev', '이전', albumPage === 0 ? 'disabled' : '')}<span>${albumPage + 1} / ${pages} · 엔딩 ${progress.endings.length}/6</span>${btn('album-next', '다음', albumPage === pages - 1 ? 'disabled' : '')}</div></div></section>`);
  }

  // ---------- 단계별 안내 (해 보면서 배우기) ----------
  function resetGuide() { clearCoach(); guide = {enabled: progress.tutorialEnabled, done: new Set()}; }
  function clearCoach() {
    document.querySelectorAll('.guide-target').forEach(el => el.classList.remove('guide-target'));
    coach = null; coachStop = false; coachRoot.hidden = true; coachRoot.innerHTML = ''; layer.inert = false; app.inert = !layer.hidden;
    layer.querySelector('.sheet')?.setAttribute('aria-modal', 'true');
  }
  function completeGuide() { progress.tutorialComplete = true; progress.tutorialEnabled = false; write(PROGRESS, progress); }
  function bestIsland(n) {
    // 우리가 가장 많이 채울 수 있는 섬
    let bestId = null, score = -1;
    for (const o of [...G.nations.slice(1), G.world]) { const is = E.island(G, n, o); const get = sum(is.sells.filter(s => !s.blocked).map(s => Math.min(s.qty, E.deficit(n, s.i)))), give = sum(is.needs.map(s => Math.min(s.qty, E.surplus(n, s.i))));
      // 싣고 가기와 받아 오기를 둘 다 배울 수 있는 섬을 먼저 고른다.
      const v = get * 2 + give + (get && give ? 100 : 0) - (o.world ? 50 : 0); if (v > score) { score = v; bestId = o.id; } }
    return bestId;
  }
  function guideSteps() {
    const n = E.player(G), idle = n.workers - sum(n.allocation), top = E.best(n), name = G_(top).name, steps = [];
    const add = (id, phase, target, title, text, done = null, possible = true, free = false) => steps.push({id, phase, target, title, text, done, possible, free});
    const sheetOpen = () => !!cargo;
    if (G.year === 1) {
      add('y1-order', 'event', '.phase-bar', '한 해의 순서', '한 해는 ① 소식 → ② 만들기 → ③ 배 보내기 → ④ 해 끝 순서로 흘러가요.');
      add('y1-event', 'event', '#layer .choice-list', '소식 고르기', '올해 세계에 일이 생겼어요. 하나를 골라 보세요.', () => G.phase !== 'event');
      add('y1-basket', 'make', '.basket-panel', '국민 바구니', '국민에게 필요한 다섯 가지예요. 칸을 많이 채울수록 생활 점수가 올라가요.');
      add('y1-plus', 'make', '[data-industry="0"], .workers', '식량부터 만들어요', '일꾼 말을 끌어서 식량 공장에 놓아 봐요. (+ 를 눌러도 돼요)', () => n.allocation[0] > 0, !n.closed[0] && idle > 0 && E.perWorker(n, 0) > 0);
      add('y1-result', 'make', '.basket-line[data-good="0"]', '바구니가 찼어요', `일꾼 1명이 식량 ${E.perWorker(n, 0)}상자를 만들어요. 바구니 식량 칸이 채워졌죠?`, null, n.allocation[0] > 0);
      add('y1-best', 'make', `[data-industry="${top}"] .factory-name`, '우리가 잘 만드는 것', `‘1명당’ 숫자가 클수록 잘 만드는 물건이에요. 우리 나라는 ${josa(name, ['을', '를'])} 1명당 ${E.perWorker(n, top)}상자나 만들어요!`);
      add('y1-assign', 'make', '.factory-panel', '남은 일꾼 놓기', `남은 일꾼 ${idle}명을 원하는 공장으로 끌어다 모두 놓아 보세요. 공장끼리 옮길 수도 있어요.`, () => sum(n.allocation) === n.workers);
      add('y1-make', 'make', '#app [data-action="next"]', '만들어요', '다 놓았으면 만들어요! 1년째는 국경이 닫혀 배를 보낼 수 없어요.', () => G.phase !== 'make');
      add('y1-score', 'yearEnd', '#layer .score-big', '혼자 만든 점수', `혼자 만든 생활 점수는 ${G.report?.score}점이에요. 이 점수를 기억해요!`);
      add('y1-next', 'yearEnd', '#layer [data-action="next"]', '다음 해로', '다음 해에는 국경이 열려요. 배를 보낼 준비!', () => G.year > 1);
    }
    if (G.year === 2) {
      add('y2-event', 'event', '#layer .choice-list', '올해의 소식', '소식 카드에서 하나를 골라요.', () => G.phase !== 'event');
      // 우리 몫 + 섬들이 필요한 만큼을 만들 일꾼 수(팔 곳보다 많이 만들면 남아서 버려진다)
      const per = E.perWorker(n, top), demand = sum(G.nations.slice(1).map(o => E.island(G, n, o).needs.filter(s => s.i === top).reduce((a, s) => a + s.qty, 0)));
      const k = per ? Math.max(1, Math.min(n.workers - 1, Math.ceil((Math.max(0, E.needs(n)[top] - E.count(n, top)) + demand) / per))) : 0;
      add('y2-best', 'make', '.world', '누가 무엇이 필요할까?', `이제 국경이 열려요. 섬마다 ‘필요해요’를 보세요. 다른 나라들이 ${josa(name, ['을', '를'])} 모두 ${demand}상자 필요해요. 그만큼 더 만들면 팔 수 있어요!`, null, G.year === 2 && demand > 0);
      add('y2-assign', 'make', '.factory-panel', '잘하는 공장에 모으기', `${name} 공장에 일꾼 ${k}명을 놓으면 우리 몫과 팔 몫이 나와요. 남은 일꾼은 모자란 것을 만들어요.`, () => n.allocation[top] >= k && sum(n.allocation) === n.workers, !n.closed[top] && k > 0);
      add('y2-make', 'make', '#app [data-action="next"]', '만들고 출항 준비', '만들고 배 보내기로 가요.', () => G.phase !== 'make');
      add('y2-map', 'ship', '.world', '세계 지도 읽기', '섬마다 ‘팔아요’는 그 나라가 남는 것, ‘필요해요’는 그 나라가 모자란 것이에요. 우리 남는 것을 필요한 섬을 찾아요!');
      const target = bestIsland(n);
      add('y2-island', 'ship', `[data-action="island"][data-id="${target}"], .fleet`, '배 보내기', `항구의 배(⛵)를 끌어서 ${nameOf(target || 'world')}에 놓아 봐요. (섬을 눌러도 돼요)`, () => sheetOpen() || n.voyages.length > 0, !!target && E.shipsLeft(n) > 0);
      add('y2-give', 'ship', '.tt-mine, .hold-give', '싣고 갈 짐', '우리가 남는 상자를 끌어서 배의 ‘싣고 갈 짐’ 칸에 놓아요. 그 나라가 돈을 줘요. (상자를 눌러도 실려요)', () => sum(Object.values(cargo?.give || {})) > 0 || n.voyages.length > 0, sheetOpen() && !!document.querySelector('.tt-mine [data-action="load"]:not(:disabled)'));
      add('y2-get', 'ship', '.tt-theirs, .hold-get', '받아 올 짐', '바구니에 모자란 상자를 ‘받아 올 짐’ 칸으로 끌어 와요. 바구니에 점선 상자가 미리 보여요. 별(★)은 품질이에요.', () => sum(Object.values(cargo?.get || {})) > 0 || n.voyages.length > 0, sheetOpen() && !!document.querySelector('.tt-theirs [data-action="load"]:not(:disabled)'));
      add('y2-sail', 'ship', '[data-action="sail"]', '출항!', '‘출항’을 누르면 배가 떠나요.', () => n.voyages.length > 0, sheetOpen());
      add('y2-more', 'ship', '.world', '남은 배도 보내요', '남은 배로 다른 섬에 가서 빈 칸을 채워요. 한 섬에만 몰리면 항로가 빨개져요! 다 했으면 ‘해 끝내기’를 눌러요.', () => G.phase !== 'ship', true, true);
      add('y2-compare', 'yearEnd', '#layer .comparison', '혼자일 때와 비교', G.report && G.report.score > G.report.alone ? `배를 보낸 올해 ${G.report.score}점, 혼자 만든 1년째 ${G.report.alone}점! 잘하는 걸 만들어 바꾸면 더 잘살 수 있어요.` : '이번엔 혼자일 때보다 낮았어요. 빈 칸이 남으면 점수가 크게 깎여요. 다음 해엔 배를 모두 보내 빈 칸을 채워 봐요.', null, G.year >= 2);
    }
    if (G.year >= 3 && G.challenge !== 'no-protect') {
      add('protect', 'make', '.factory-panel .shield:not(:disabled)', '🛡 보호', '이제 공장을 보호할 수 있어요. 보호한 공장은 일꾼이 없어도 문을 닫지 않고, 위기 때 버틸 힘이 돼요.');
      add('protect-cost', 'make', '.factory-panel .shield:not(:disabled)', '보호에는 비용이 있어요', '대신 그 물건을 사 올 때 1원 비싸지고, 국민 불만으로 점수가 2점 깎여요. 상대 나라와 사이도 나빠질 수 있어요. 켤지 말지는 여러분이 정해요.');
      add('policy', 'yearEnd', '#layer .policy-list', '정책 카드', '해 끝마다 나라 정책을 한 장 고를 수 있어요. 돈이 들지만 오래 도움이 돼요.');
    }
    if (G.year >= 4) add('fta', 'yearEnd', '#layer [data-policy="fta"]', 'FTA', 'FTA는 사이 좋은(♥3) 나라와 서로 보호 없이 싸게 거래하기로 한 약속이에요.', null, !!layer.querySelector('[data-policy="fta"]'));
    return steps;
  }
  function specialStep(n) {
    const e = E.event(G.event.id);
    if (G.phase === 'event' && e.crisis && !guide.done.has('crisis')) return {id: 'crisis', target: '#sheet-title', title: '위기예요!', text: '위기 때는 수입에 기댄 만큼 생활 점수가 깎여요. 남겨 둔 상자, 우리 공장, 여러 나라 친구가 힘이 돼요.'};
    const risky = T.goods.findIndex((g, i) => { const l = E.liveDependency(n, i); return l && l.share > .7 && l.from !== 'world'; });
    if (G.phase === 'ship' && risky >= 0 && !guide.done.has('dependence') && layer.hidden) return {id: 'dependence', target: '.route.danger', title: '한 나라에 너무 기대면?', text: `${G_(risky).name}을 한 나라에서만 사고 있어요. 그 나라에 일이 생기면 크게 흔들려요. 빨간 항로를 조심해요!`};
    if (G.phase === 'make' && n.idle.some((v, i) => v >= 1 && !n.closed[i] && !n.protect[i] && n.production[i] > 0) && G.year >= 2 && !guide.done.has('closing')) return {id: 'closing', target: '.factory-panel', title: '공장이 문을 닫을 수 있어요', text: '일꾼이 2년 연속 없는 공장은 문을 닫아요. 닫히면 다시 열 때 돈이 들어요. 일꾼 1명을 두거나 3년째부터 🛡 보호를 켜면 지킬 수 있어요.'};
    return null;
  }
  function maybeGuide() {
    if (screen !== 'board' || !G || coach?.id === 'panel' || coachStop) return;
    if (coach?.done) { if (coach.done() || coach.phase !== G.phase) { guide.done.add(coach.id); clearCoach(); } }
    else if (coach && coach.phase && coach.phase !== G.phase) { clearCoach(); }
    if (!guide.enabled) { if (coach && coach.id !== 'panel') clearCoach(); return; }
    const n = E.player(G);
    if (!coach) {
      const special = specialStep(n);
      if (special && document.querySelector(special.target)) coach = special;
      else for (const step of guideSteps()) {
        if (guide.done.has(step.id) || step.phase !== G.phase) continue;
        if (!step.possible || step.done?.()) { guide.done.add(step.id); continue; }
        if (!document.querySelector(step.target)) continue;
        coach = step; break;
      }
    } else if (coach.done) { const fresh = guideSteps().find(s => s.id === coach.id); if (fresh) coach = fresh; }
    if (coach) showCoach();
  }
  function showCoach() {
    document.querySelectorAll('.guide-target').forEach(el => el.classList.remove('guide-target'));
    const target = document.querySelector(coach.target); if (!target) { clearCoach(); return; }
    coachRoot.hidden = false; coachRoot.dataset.free = String(!!coach.free); target.classList.add('guide-target');
    app.inert = false; layer.inert = false; layer.querySelector('.sheet')?.setAttribute('aria-modal', 'false');
    coachRoot.innerHTML = `<div class="coach-highlight" aria-hidden="true"></div><span class="coach-pointer" aria-hidden="true">☞</span><section class="coach-bubble" aria-live="polite" aria-atomic="true" data-guide="${coach.id}" data-kind="${coach.done ? 'action' : 'confirm'}"><div class="coach-heading">${G ? portrait(G.playerId) : ''}<div><small>${coach.done ? '함께 해 봐요' : '길잡이'}</small><h2>${coach.title}</h2></div></div><p>${coach.text}</p><div class="actions">${coach.done ? '' : btn('coach-next', coach.id === 'panel' ? '닫기' : '알겠어요', '', 'primary')}${coach.id === 'panel' ? '' : btn('coach-skip', '건너뛰기') + btn('coach-off', '안내 끄기')}</div><small>${coach.done ? (coach.free ? '자유롭게 해 봐요' : '반짝이는 곳을 눌러요') : 'Enter 알겠어요'} · Esc ${coach.id === 'panel' ? '닫기' : '안내 끄기'}</small></section>`;
    positionCoach();
    const focus = coach.done ? (target.matches('button,select') ? target : target.querySelector('button:not(:disabled):not([data-action="panel-help"]),select:not(:disabled)')) : coachRoot.querySelector('[data-action="coach-next"]');
    if (!coach.free) focus?.focus({preventScroll: true});
  }
  function positionCoach() {
    if (!coach) return;
    const target = document.querySelector(coach.target), bubble = coachRoot.querySelector('.coach-bubble'); if (!target || !bubble) return;
    // 대상이 여러 곳이면(예: 일꾼 자리 + 공장) 모두 감싸는 테두리를 그린다.
    const rs = [...document.querySelectorAll(coach.target)].map(el => el.getBoundingClientRect()), ring = coachRoot.querySelector('.coach-highlight'), gap = 10, pad = 8;
    const box = {left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)), top: Math.min(...rs.map(r => r.top)), bottom: Math.max(...rs.map(r => r.bottom))};
    bubble.style.width = Math.min(340, innerWidth - 2 * pad) + 'px';
    const b = bubble.getBoundingClientRect();
    const x = Math.max(pad, Math.min(innerWidth - b.width - pad, box.left)), y = Math.max(pad, Math.min(innerHeight - b.height - pad, box.top));
    const candidates = [{left: box.right + gap, top: y}, {left: box.left - b.width - gap, top: y}, {left: x, top: box.bottom + gap}, {left: x, top: box.top - b.height - gap}];
    let pos = candidates.find(p => p.left >= pad && p.left + b.width <= innerWidth - pad && p.top >= pad && p.top + b.height <= innerHeight - pad);
    // 큰 영역(지도 등)은 안쪽 구석에 둔다.
    if (!pos) pos = {left: Math.max(pad, Math.min(innerWidth - b.width - pad, box.right - b.width - gap)), top: Math.max(pad, Math.min(innerHeight - b.height - pad, box.bottom - b.height - gap))};
    Object.assign(bubble.style, {left: pos.left + 'px', top: pos.top + 'px'});
    Object.assign(ring.style, {left: box.left + 'px', top: box.top + 'px', width: Math.max(0, box.right - box.left) + 'px', height: Math.max(0, box.bottom - box.top) + 'px'});
    const br = bubble.getBoundingClientRect(), pointer = coachRoot.querySelector('.coach-pointer');
    const right = br.left >= box.right, left = br.right <= box.left, above = br.bottom <= box.top, inside = !right && !left && !above && br.top < box.bottom;
    pointer.hidden = inside;
    pointer.textContent = right ? '☜' : left ? '☞' : above ? '☟' : '☝';
    const px = right ? box.right : left ? box.left - 30 : Math.max(box.left, Math.min(box.right - 28, br.left + br.width / 2));
    const py = right || left ? box.top : above ? box.top - 30 : box.bottom;
    Object.assign(pointer.style, {left: Math.max(0, Math.min(innerWidth - 32, px)) + 'px', top: Math.max(0, Math.min(innerHeight - 32, py)) + 'px'});
  }
  function advanceCoach() { if (!coach || coach.done) return; const id = coach.id; if (id !== 'panel') guide.done.add(id); clearCoach(); if (id === 'fta') completeGuide(); maybeGuide(); }
  function stopGuide() {
    coachStop = true;
    coachRoot.querySelector('.coach-bubble').innerHTML = `<h2>안내를 끌까요?</h2><p>이 판의 안내를 마쳐요. 도움말에서 지금 단계부터 다시 켤 수 있어요.</p><div class="actions">${btn('coach-stay', '계속 안내받기', '', 'primary')}${btn('coach-stop', '안내 끄기')}</div>`;
    positionCoach(); coachRoot.querySelector('button').focus({preventScroll: true});
  }
  function shakeCoach() { const b = coachRoot.querySelector('.coach-bubble'); b?.classList.remove('shake'); void b?.offsetWidth; b?.classList.add('shake'); }
  function guideAllows(target) {
    if (!coach) return true;
    if (target.closest('#coach')) return true;
    if (coachStop || !coach.done) return false;
    if (coach.free) return true;
    if (target.closest('[data-action="panel-help"]')) return false;
    // 안내 대상은 여러 곳일 수 있다(예: 일꾼 자리와 공장).
    return !!target.closest?.(coach.target);
  }
  for (const type of ['click', 'pointerdown', 'change']) document.addEventListener(type, event => {
    if (!guideAllows(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); shakeCoach(); }
  }, true);
  function explainPanel(id) {
    const panels = {
      factory: ['.factory-panel', '우리 나라 공장', '일꾼 말을 끌어서 공장에 놓으면 물건(상자)이 생겨요. ‘1명당’은 일꾼 한 명이 만드는 상자 수, 별(★)은 품질이에요. 🛡은 3년째부터 켜는 보호 버튼이에요.'],
      world: ['.world-panel', '세계 지도', '섬마다 ‘팔아요’(남는 것)와 ‘필요해요’(모자란 것)가 보여요. 항구의 배를 섬으로 끌어다 놓으면 부두 교환대가 펼쳐지고, 상자를 끌어서 배에 실어요. 하트(♥)는 사이, 빨간 항로는 한 나라에 너무 기댄다는 뜻이에요.'],
      basket: ['.basket-panel', '국민 바구니', '네모 한 칸이 한 상자예요. 다섯 칸을 채울수록, 좋은 품질일수록 생활 점수가 올라가요. 남는 상자는 다음 해로 넘어가요.'],
      ranking: ['.ranking', '순위', '다섯 나라의 생활 점수 평균이에요. 5년이 끝났을 때 1등을 노려요.'],
      money: ['.money', '나라 금고', '물건을 팔면 돈이 들어오고, 사 오거나 정책을 고를 때 돈을 써요. 해마다 세금도 조금 들어와요.']
    };
    const [target, title, text] = panels[id]; clearCoach(); coach = {id: 'panel', target, title, text}; showCoach();
  }

  // ---------- 조작 ----------
  function changeWorker(i, delta) { if (!G || G.phase !== 'make') return; selected = i; const n = E.player(G); if (E.assign(G, i, n.allocation[i] + delta)) { S.play(delta > 0 ? 'place' : 'undo'); render(); } else toast('남은 일꾼이 없거나 문 닫은 공장이에요.'); }
  function next(confirmed = false) {
    const n = E.player(G), idle = n.workers - sum(n.allocation);
    if (G.phase === 'event') return eventSheet();
    if (cargo && !confirmed) { cargo = null; render(); }
    if (G.phase === 'yearEnd') { if (!layer.querySelector('.year-sheet')) return yearEndSheet(); E.endPhase(G); S.play('paper'); return render(); }
    let message = '';
    if (G.phase === 'make' && idle) message = `일꾼 ${idle}명이 쉬어요. 그래도 만들까요?`;
    if (G.phase === 'ship' && E.shipsLeft(n)) message = `항구에 배 ${E.shipsLeft(n)}척이 남았어요. 그래도 해를 끝낼까요?`;
    if (message && !confirmed) { openSheet('다음 단계로 갈까요?', `<p>${message}</p><div class="actions">${btn('close', '돌아가서 살펴보기')}${btn('confirm-next', '그래도 넘어가기', '', 'primary')}</div>`, true); if (coach?.done && !coach.free) { coach.target = '#layer [data-action="confirm-next"]'; showCoach(); } return; }
    closeSheet();
    const before = G.phase, made = before === 'make' ? E.output(n) : null, voyages = before === 'ship' ? n.voyages.map(v => ({to: v.to, get: v.get.map(x => x[0]), give: v.give.map(x => x[0])})) : null;
    E.endPhase(G); holdSheet = true; render();
    const steps = [];
    if (made) steps.push(produceFx(made));
    if (G.phase === 'yearEnd') { steps.push(voyageFx(voyages || [])); steps.push(scoreFx()); }
    playFx(steps, () => { holdSheet = false; if (G.phase === 'yearEnd') yearEndSheet(); maybeGuide(); });
  }
  // ---------- 연출: 기물이 판 위를 움직인다 (누르면 건너뛰기) ----------
  const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  function piece(html, cls) { const el = document.createElement('div'); el.className = 'fx-piece ' + cls; el.innerHTML = html; fxLayer.append(el); return el; }
  function move(el, points, duration, delay = 0, extra = {}) {
    const w = el.offsetWidth / 2, h = el.offsetHeight / 2;
    return el.animate(points.map(([x, y, o = 1, f = 1]) => ({transform: `translate(${x - w}px,${y - h}px) scaleX(${f})`, opacity: o})), {duration, delay, easing: 'ease-in-out', fill: 'both', ...extra}).finished;
  }
  // 공장 받침대에서 큐브가 바구니 칸으로 날아간다.
  function produceFx(made) {
    return () => Promise.all(made.flatMap((q, i) => {
      const a = app.querySelector(`.factory[data-industry="${i}"] .tray`), b = app.querySelector(`.basket-line[data-good="${i}"] .boxes`);
      if (!q || !a || !b) return [];
      const [x1, y1] = center(a), [x2, y2] = center(b);
      return Array.from({length: Math.min(q, 6)}, (_, k) => move(piece(icon(G_(i).icon), 'cube'), [[x1, y1, 0], [x1, y1 - 30], [x2, y2, .2]], 650, i * 120 + k * 70));
    }));
  }
  // 우리 배는 섬에 다녀오고, 다른 나라 배는 항로를 따라 오간다.
  function voyageFx(voyages) {
    return () => {
      const at = id => app.querySelector(`[data-action="island"][data-id="${id}"]`), home = app.querySelector('.home .home-art');
      if (!home) return Promise.resolve();
      const runs = voyages.map((v, k) => {
        const isl = at(v.to); if (!isl) return null;
        const [x1, y1] = center(home), [x2, y2] = center(isl), f = x2 < x1 ? -1 : 1, ship = piece(shipImg + (v.get[0] !== undefined ? `<span class="cargo">${icon(G_(v.get[0]).icon)}</span>` : ''), 'ship mine');
        return move(ship, [[x1, y1, 0, f], [x1, y1, 1, f], [x2, y2, 1, f], [x2, y2, 1, -f], [x1, y1, 1, -f], [x1, y1, 0, -f]], 1700, k * 260);
      });
      (G.npcRoutes || []).slice(0, 10).forEach(([a, b], k) => {
        const A = at(a), B = at(b); if (!A || !B) return;
        const [x1, y1] = center(A), [x2, y2] = center(B), f = x2 < x1 ? -1 : 1;
        runs.push(move(piece(shipImg, 'ship npc'), [[x1, y1, 0, f], [x1, y1, .9, f], [x2, y2, .9, f], [x2, y2, 0, f]], 1300, 300 + k * 140));
      });
      return Promise.all(runs.filter(Boolean));
    };
  }
  // 올해 점수가 바구니에서 순위판으로 날아간다.
  function scoreFx() {
    return () => {
      const a = app.querySelector('.basket-panel .life'), b = app.querySelector('.rank.you');
      if (!a || !b || !G.report) return Promise.resolve();
      const [x1, y1] = center(a), [x2, y2] = center(b);
      return move(piece(`${G.report.score}점`, 'score-pop'), [[x1, y1, 0], [x1, y1 - 20, 1], [x1, y1 - 20, 1], [x2, y2, .3]], 1100);
    };
  }
  function playFx(steps, done) {
    const finish = () => { if (!fxLayer.hidden) { fxLayer.hidden = true; fxLayer.innerHTML = ''; fxLayer.getAnimations({subtree: true}).forEach(a => a.cancel()); done(); } };
    if (!steps.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
    fxLayer.hidden = false; fxLayer.onclick = finish;
    steps.reduce((p, step) => p.then(() => fxLayer.hidden ? null : step()), Promise.resolve()).then(finish, finish);
  }
  function openCargo(id) {
    const n = E.player(G);
    if (G.phase !== 'ship') return toast(E.tradeOpen(G) ? '배는 ③ 배 보내기 단계에서 보내요.' : '1년째는 국경이 닫혀 있어요.');
    if (!E.shipsLeft(n)) return toast('항구에 남은 배가 없어요.');
    shipPicked = false; cargo = {to: id, give: {}, get: {}}; S.play('place'); render();
    app.querySelector('.trade-table [data-action="load"]:not(:disabled)')?.focus({preventScroll: true});
  }
  // 상자 한 개를 싣거나(d=1) 내린다(d=-1). 배 한 척은 짐마다 6상자까지.
  function loadBox(kind, i, d) {
    if (!cargo) return;
    const n = E.player(G), o = E.nation(G, cargo.to), now = cargo[kind][i] || 0, total = sum(Object.values(cargo[kind]));
    if (d > 0) {
      const max = kind === 'give' ? Math.min(E.surplus(n, i), E.room(G, n, o, i)) : (E.island(G, n, o).sells.find(s => s.i === i && !s.blocked)?.qty || 0);
      if (now >= max || total >= 6) return toast(total >= 6 ? '한 칸에 6상자까지 실어요.' : kind === 'give' ? '더 실을 수 없어요.' : '그 나라가 더 팔지 않아요.');
    } else if (!now) return;
    cargo[kind][i] = now + d; S.play(d > 0 ? 'place' : 'undo'); render();
  }
  function moveWorker(from, to) {
    const n = E.player(G);
    if (!E.assign(G, from, n.allocation[from] - 1)) return;
    if (!E.assign(G, to, n.allocation[to] + 1)) { E.assign(G, from, n.allocation[from] + 1); return toast('문 닫은 공장이에요.'); }
    selected = to; S.play('place'); render();
  }
  // 배가 섬으로 떠나는 모습
  function sailFx(to) {
    const a = app.querySelector('.home .portrait'), b = app.querySelector(`[data-action="island"][data-id="${to}"]`);
    if (!a || !b || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect(), fx = document.createElement('span');
    fx.className = 'sail-fx'; fx.innerHTML = shipImg; fx.setAttribute('aria-hidden', 'true');
    Object.assign(fx.style, {left: r1.left + r1.width / 2 - 16 + 'px', top: r1.top + r1.height / 2 - 16 + 'px'});
    document.body.append(fx);
    requestAnimationFrame(() => requestAnimationFrame(() => { fx.style.transform = `translate(${r2.left + r2.width / 2 - r1.left - r1.width / 2}px,${r2.top + r2.height / 2 - r1.top - r1.height / 2}px)`; fx.style.opacity = '.3'; }));
    setTimeout(() => fx.remove(), 900);
  }

  // ---------- 끌어다 놓기 (마우스·터치 공통, 6px 넘게 움직여야 끌기) ----------
  let drag = null, dragClick = false;
  function dropOk(el, zone) {
    if (!zone) return false;
    const k = el.dataset.drag, z = zone.dataset.drop, src = el.dataset.src ?? el.dataset.from;
    if (k === 'worker') return z === 'factory' ? zone.dataset.i !== src : z === 'pool' && src !== 'pool';
    if (k === 'ship') return z === 'island';
    return src === 'mine' ? z === 'give' : src === 'theirs' ? z === 'get' : z !== src;
  }
  function drop(el, zone) {
    const k = el.dataset.drag, src = el.dataset.src ?? el.dataset.from, z = zone?.dataset.drop;
    if (zone && coach && !guideAllows(zone)) return shakeCoach();
    if (k === 'worker') {
      if (src === 'pool' && z === 'factory') return changeWorker(+zone.dataset.i, 1);
      if (src !== 'pool' && z === 'pool') return changeWorker(+src, -1);
      if (src !== 'pool' && z === 'factory' && zone.dataset.i !== src) return moveWorker(+src, +zone.dataset.i);
    }
    if (k === 'ship' && z === 'island') return openCargo(zone.dataset.id);
    if (k === 'box') {
      const i = +el.dataset.i;
      if (src === 'mine' && z === 'give') return loadBox('give', i, 1);
      if (src === 'theirs' && z === 'get') return loadBox('get', i, 1);
      if ((src === 'give' || src === 'get') && z !== src) return loadBox(src, i, -1);
    }
  }
  function endDrag(event, cancel) {
    const d = drag; drag = null; if (!d?.ghost) return;
    d.ghost.remove(); d.el.classList.remove('dragging'); delete document.body.dataset.drag;
    document.querySelectorAll('.drop-hover').forEach(z => z.classList.remove('drop-hover'));
    // 끌기 뒤에 따라오는 click은 누르기로 치지 않는다.
    dragClick = true; setTimeout(() => { dragClick = false; }, 0);
    if (!cancel) drop(d.el, document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop]'));
  }
  document.addEventListener('click', event => { if (dragClick) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  document.addEventListener('pointerdown', event => {
    const el = event.target.closest('[data-drag]');
    if (event.button > 0 || !el || el.disabled || !G || screen !== 'board' || !guideAllows(el)) return;
    drag = {el, x: event.clientX, y: event.clientY, ghost: null};
  });
  document.addEventListener('pointermove', event => {
    if (!drag) return;
    if (!drag.ghost) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
      const r = drag.el.getBoundingClientRect(), ghost = drag.el.cloneNode(true);
      ghost.className += ' drag-ghost'; ghost.removeAttribute('data-action'); ghost.setAttribute('aria-hidden', 'true');
      Object.assign(ghost.style, {width: r.width + 'px', height: r.height + 'px'});
      drag.ghost = ghost; drag.w = r.width; drag.h = r.height; document.body.append(ghost);
      drag.el.classList.add('dragging'); document.body.dataset.drag = drag.el.dataset.src || drag.el.dataset.drag;
    }
    drag.ghost.style.transform = `translate(${event.clientX - drag.w / 2}px,${event.clientY - drag.h / 2}px)`;
    const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop]');
    document.querySelectorAll('.drop-hover').forEach(z => z !== zone && z.classList.remove('drop-hover'));
    if (zone && dropOk(drag.el, zone)) zone.classList.add('drop-hover');
  });
  document.addEventListener('pointerup', event => endDrag(event, false));
  document.addEventListener('pointercancel', event => endDrag(event, true));
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el) { const row = event.target.closest('[data-industry]'); if (row && workerPicked) { workerPicked = false; changeWorker(+row.dataset.industry, 1); } return; }
    const action = el.dataset.action, i = +el.dataset.i;
    if (action === 'coach-next') return advanceCoach();
    if (action === 'coach-skip') { if (coach) { guide.done.add(coach.id); clearCoach(); maybeGuide(); } return; }
    if (action === 'coach-off') return stopGuide();
    if (action === 'coach-stay') { coachStop = false; return showCoach(); }
    if (action === 'coach-stop') { guide.enabled = false; completeGuide(); return clearCoach(); }
    if (action === 'panel-help') return explainPanel(el.dataset.panel);
    if (action === 'tutorial-choice') { progress.tutorialEnabled = el.dataset.enabled === 'true'; write(PROGRESS, progress); return title(); }
    if (action === 'replay') { closeSheet(); guide.enabled = true; progress.tutorialEnabled = true; write(PROGRESS, progress); return render(); }
    if (action === 'confirm-next') return next(true);
    if (action === 'title') { guide.enabled = false; clearCoach(); return title(); }
    if (action === 'new') { countryPage = 0; return countries(); }
    if (action === 'country') return start(el.dataset.id);
    if (action === 'country-prev' || action === 'country-next') { countryPage = Math.max(0, Math.min(3, countryPage + (action === 'country-next' ? 1 : -1))); return countries(); }
    if (action === 'continue') { G = savedGame(); if (!G) return toast('이어 할 기록이 없어요.'); savedYear = G.year; resetGuide(); return render(); }
    if (action === 'sound') { progress.sound = !progress.sound; S.setEnabled(progress.sound); write(PROGRESS, progress); return title(); }
    if (action === 'album') { albumBack = screen === 'ending' ? 'ending' : 'title'; albumTab = 'events'; albumPage = 0; return album(); }
    if (action === 'album-back') return albumBack === 'ending' ? ending() : title();
    if (action === 'album-tab') { albumTab = el.dataset.id; albumPage = 0; return album(); }
    if (action === 'album-prev' || action === 'album-next') { albumPage += action === 'album-next' ? 1 : -1; return album(); }
    if (action === 'close') { const wasConfirm = !!layer.querySelector('[data-action="confirm-next"]'); closeSheet(); if (coach && !coach.free) { clearCoach(); } maybeGuide(); return wasConfirm; }
    if (action === 'help') return openSheet('무역왕 도움말', `${btn('replay', '안내 다시 켜기', '', 'primary')}<p><b>한 해의 순서</b><br>① 소식 카드 고르기 → ② 일꾼을 공장에 놓기 → ③ 섬에 배 보내기 → ④ 해 끝 카드</p><p><b>일꾼 놓기</b><br>일꾼 말을 끌어서 공장에 놓아요. 공장끼리 옮기거나 ‘남은 일꾼’ 자리로 되돌릴 수도 있어요.</p><p><b>배 보내기</b><br>항구의 배를 섬으로 끌어다 놓으면 부두 교환대가 펼쳐져요. 남는 상자는 ‘싣고 갈 짐’으로, 모자란 상자는 ‘받아 올 짐’으로 끌어 놓고 출항해요. 짐마다 6상자까지 실어요.</p><p><b>누르기·키보드</b><br>끌기 대신 눌러도 돼요(상자를 누르면 한 개씩 실려요). 숫자 1~5로 공장 고르기, +/−로 일꾼 놓기, Esc로 배 돌리기.</p><div class="note">위기 때는 수입에 기댄 만큼 점수가 깎여요. 남겨 둔 상자, 열려 있는 공장, 여러 나라 친구가 힘이 돼요. 기록은 해가 시작될 때 저장돼요.</div>`, true);
    if (!G) return;
    if (action === 'worker') { workerPicked = !workerPicked; return render(); }
    if (action === 'plus' || action === 'minus') return changeWorker(i, action === 'plus' ? 1 : -1);
    if (action === 'protect') { const n = E.player(G); if (!E.setProtect(G, i, !n.protect[i])) toast('보호는 3년째 만들기·배 보내기 단계에서 바꿀 수 있어요.'); else S.play(n.protect[i] ? 'up' : 'down'); return render(); }
    if (action === 'event') { E.chooseEvent(G, i); S.play('event'); closeSheet(); return render(); }
    if (action === 'next') return next();
    if (action === 'ship') { shipPicked = !shipPicked; el.setAttribute('aria-pressed', String(shipPicked)); return toast(shipPicked ? '배를 보낼 섬을 눌러요.' : ''); }
    if (action === 'island') return openCargo(el.dataset.id);
    if (action === 'load') return loadBox(el.dataset.kind, i, 1);
    if (action === 'unload') return loadBox(el.dataset.kind, i, -1);
    if (action === 'dock-cancel') { cargo = null; S.play('undo'); return render(); }
    if (action === 'sail') {
      const give = list(cargo.give), get = list(cargo.get), to = cargo.to;
      if (!E.voyage(G, to, give, get)) return toast(E.quoteVoyage(G, E.player(G), to, give, get).reason || '출항할 수 없어요.');
      cargo = null; S.play('coin'); toast(`⛵ ${josa(nameOf(to), ['으로', '로'])} 배가 떠났어요!`); render(); return sailFx(to);
    }
    if (action === 'undo') { if (E.undoVoyage(G, i)) { S.play('undo'); render(); } return; }
    if (action === 'policy') { const id = el.dataset.id, sel = layer.querySelector(`[data-target="${id}"]`), target = sel ? (id === 'fta' ? sel.value : +sel.value) : null; if (!E.choosePolicy(G, id, target)) return toast('돈이나 조건을 확인해 주세요.'); S.play('up'); closeSheet(); return render(); }
    if (action === 'debug-year' && debug) { closeSheet(); clearCoach(); const y = G.year; while (G.year === y && G.phase !== 'ending') E.botTurn(G, 'smart'); return render(); }
  });
  document.addEventListener('change', event => { if (event.target.id === 'challenge') challenge = event.target.value || null; });
  document.addEventListener('keydown', event => {
    if (coach) {
      if (event.key === 'Escape') { event.preventDefault(); if (coach.id === 'panel') { clearCoach(); maybeGuide(); } else if (coachStop) { coachStop = false; showCoach(); } else stopGuide(); return; }
      if (event.key === 'Enter' && !coach.done && !document.activeElement.closest('#coach')) { event.preventDefault(); advanceCoach(); return; }
      if (event.key === 'Tab' && (!coach.free || coachStop)) {
        const target = document.querySelector(coach.target), nodes = [...(coach.done && !coach.free && target ? [target, ...target.querySelectorAll('button,select')] : []).filter(el => el.matches('button:not(:disabled):not([data-action="panel-help"]),select:not(:disabled)')), ...coachRoot.querySelectorAll('button')];
        if (nodes.length) { event.preventDefault(); const k = nodes.indexOf(document.activeElement), d = event.shiftKey ? -1 : 1; nodes[(k + d + nodes.length) % nodes.length].focus({preventScroll: true}); }
        return;
      }
      if (!guideAllows(document.activeElement) && !['+', '=', '-', '_', '1', '2', '3', '4', '5'].includes(event.key)) { event.preventDefault(); shakeCoach(); return; }
      if (coachStop || !coach.done) return;
    }
    if (layer.hidden && cargo && event.key === 'Escape') { event.preventDefault(); cargo = null; return render(); }
    if (!layer.hidden) {
      if (event.key === 'Escape' && layer.dataset.dismiss === 'true') { event.preventDefault(); closeSheet(); maybeGuide(); }
      if (event.key === 'Tab') { const nodes = [...layer.querySelectorAll('button:not(:disabled),select,[tabindex="0"]')], first = nodes[0], last = nodes.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
      return;
    }
    if (screen !== 'board' || G?.phase !== 'make' || event.target.matches('input,select')) return;
    if (/^[1-5]$/.test(event.key)) { selected = +event.key - 1; event.preventDefault(); render(); app.querySelector(`[data-focus="plus-${selected}"]`)?.focus({preventScroll: true}); }
    if (['+', '=', '-', '_'].includes(event.key)) {
      event.preventDefault();
      // 안내 중에는 강조한 공장에서만 허용한다.
      if (coach && !coach.free) { const target = document.querySelector(coach.target), ctl = document.querySelector(`[data-action="${['-', '_'].includes(event.key) ? 'minus' : 'plus'}"][data-i="${coach.id === 'y1-plus' ? 0 : selected}"]`); if (!ctl || !(target === ctl || target?.contains(ctl))) return shakeCoach(); if (coach.id === 'y1-plus') selected = 0; }
      changeWorker(selected, ['-', '_'].includes(event.key) ? -1 : 1);
    }
  });
  document.addEventListener('error', event => { if (event.target.matches?.('img.portrait')) { event.target.removeAttribute('src'); event.target.alt = '나라 대표'; } }, true);
  window.addEventListener('resize', () => { if (screen === 'countries') countries(); fitSheet(); if (coach) positionCoach(); });
  if (debug) window.TK = {get G() { return G; }, E, T, render, get cargo() { return cargo; }, get coach() { return coach; }};
  title();
})();
