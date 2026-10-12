/* 규칙은 DOM과 분리해서 같은 코드로 실제 게임과 검증을 실행합니다. */
window.SamgwonRules = (() => {
  const data = window.SAMGWON;
  const clamp = value => Math.max(0, Math.min(100, value));
  function createRun(role) {
    return { role, turn: 1, resolved: 0, gauges: { p: 50, m: 50, l: 50, w: 50 }, used: new Set(), queue: [], flags: new Set(), previous: null, card: null, ended: null };
  }
  function eligible(run) {
    return data.cards.filter(card => card.role === run.role && !card.first && !card.chain && !run.used.has(card.id) && Object.entries(card.when || {}).every(([key, [min, max]]) => run.gauges[key] >= min && run.gauges[key] <= max));
  }
  function selectCard(run, random = Math.random) {
    let card;
    if (run.turn === 1) card = data.cards.find(c => c.role === run.role && c.first);
    else {
      run.queue.sort((a, b) => a.turn - b.turn);
      const due = run.queue.findIndex(item => item.turn <= run.turn);
      if (due !== -1) {
        const scheduled = run.queue.splice(due, 1)[0];
        card = data.cards.find(c => c.id === scheduled.id);
      }
      else {
        let pool = eligible(run);
        const others = pool.filter(c => c.char !== run.previous);
        if (others.length) pool = others;
        let weight = random() * pool.reduce((sum, c) => sum + (c.when ? 3 : 1), 0);
        card = pool.find(c => (weight -= c.when ? 3 : 1) < 0) || pool[pool.length - 1];
      }
    }
    if (!card) throw new Error('선택 가능한 카드가 없습니다.');
    run.card = card;
    run.used.add(card.id);
    run.previous = card.char;
    return card;
  }
  function endingFor(role, type) {
    return Object.keys(data.endings).find(id => data.endings[id].role === role && data.endings[id].type === type);
  }
  function gaugeEnding(gauges) {
    if (gauges.w >= 100) return 'w100';
    if (gauges.w <= 0) return 'w0';
    if (gauges.p <= 0) return 'p0';
    if (gauges.m <= 0) return 'm0';
    if (gauges.l <= 0) return 'l0';
    return null;
  }
  function resolve(run, side) {
    if (run.ended || !run.card || !['left', 'right'].includes(side)) return null;
    const card = run.card, choice = card[side];
    for (const key of Object.keys(run.gauges)) run.gauges[key] = clamp(run.gauges[key] + (choice.fx?.[key] || 0));
    if (choice.flag) run.flags.add(choice.flag);
    if (choice.next) run.queue.push({ id: choice.next.id, turn: run.turn + choice.next.in });
    run.resolved++;
    const death = gaugeEnding(run.gauges);
    let ending = choice.ending || (death && endingFor(run.role, death));
    if (!ending && run.resolved === data.turnsPerTerm) {
      const { p, m, l, w } = run.gauges;
      ending = endingFor(run.role, p >= 60 && m >= 60 && l >= 60 && w >= 35 && w <= 65 ? 'legend' : 'complete');
    }
    run.ended = ending || null;
    const powers = [...new Set([card.power, choice.power, ...(ending ? data.endings[ending].powers || [] : [])].filter(Boolean))];
    run.card = null;
    if (!ending) run.turn++;
    return { ending: ending || null, death: choice.ending ? null : death, powers, stamp: choice.stamp || null, fx: choice.fx || {} };
  }
  function snapshot(run) {
    return { ...run, card: run.card.id, used: [...run.used], flags: [...run.flags] };
  }
  function restoreRun(saved) {
    if (!saved || !Object.hasOwn(data.roles, saved.role) || saved.ended) return null;
    const card = data.cards.find(c => c.id === saved.card && c.role === saved.role);
    const validCard = id => data.cards.some(c => c.id === id && c.role === saved.role);
    if (!card || !Number.isInteger(saved.resolved) || saved.resolved < 0 || saved.resolved >= data.turnsPerTerm || saved.turn !== saved.resolved + 1) return null;
    if (!saved.gauges || !Object.keys(data.gauges).every(k => Number.isFinite(saved.gauges[k]) && saved.gauges[k] >= 0 && saved.gauges[k] <= 100) || gaugeEnding(saved.gauges)) return null;
    if (!Array.isArray(saved.used) || !saved.used.every(validCard) || !saved.used.includes(card.id) || saved.previous !== card.char) return null;
    if (!Array.isArray(saved.queue) || !saved.queue.every(q => q && validCard(q.id) && data.cards.find(c => c.id === q.id).chain && Number.isInteger(q.turn) && q.turn > 0)) return null;
    if (!Array.isArray(saved.flags) || !saved.flags.every(flag => typeof flag === 'string')) return null;
    return { ...createRun(saved.role), turn: saved.turn, resolved: saved.resolved, gauges: Object.fromEntries(Object.keys(data.gauges).map(k => [k, saved.gauges[k]])), used: new Set(saved.used), queue: saved.queue.map(q => ({ id: q.id, turn: q.turn })), flags: new Set(saved.flags), previous: card.char, card };
  }
  return { createRun, eligible, selectCard, resolve, gaugeEnding, endingFor, clamp, snapshot, restoreRun };
})();

(() => {
  if (typeof document === 'undefined') return;
  const D = window.SAMGWON, A = window.SamgwonArt, R = window.SamgwonRules, S = window.SamgwonSfx;
  const app = document.getElementById('app'), overlayRoot = document.getElementById('overlay-root');
  const storageKey = 'samgwon-swipe-v1';
  const roleIds = Object.keys(D.roles), gaugeIds = Object.keys(D.gauges);
  const debug = new URLSearchParams(location.search).get('debug') === '1';
  const defaults = () => ({ name: '', face: 0, profileSeen: false, sound: false, music: true, tutorialSeen: false, endings: [], powers: [], stamps: [], activeRun: null });
  let storageAvailable = true;
  function readProgress() {
    const clean = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!saved || typeof saved !== 'object') return clean;
      clean.name = typeof saved.name === 'string' ? Array.from(saved.name.trim()).slice(0, 6).join('') : '';
      clean.face = Number.isInteger(saved.face) && saved.face >= 0 && saved.face < 4 ? saved.face : 0;
      for (const key of ['profileSeen', 'sound', 'tutorialSeen']) clean[key] = saved[key] === true;
      clean.music = saved.music !== false;
      for (const [key, source] of [['endings', D.endings], ['powers', D.powers], ['stamps', D.stamps]]) clean[key] = Array.isArray(saved[key]) ? [...new Set(saved[key].filter(id => Object.hasOwn(source, id)))] : [];
      const active = R.restoreRun(saved.activeRun);
      if (active) clean.activeRun = R.snapshot(active);
    } catch (_) { storageAvailable = false; }
    return clean;
  }
  let progress = readProgress(), run = null, screen = '', locked = false, modal = null, freshPowers = [], collectionRole = 'assembly';
  const M = window.GameMusic;
  const syncMusic = () => M?.setEnabled(progress.sound && progress.music);
  S.setEnabled(progress.sound); syncMusic();
  function save() {
    if (run?.ended) progress.activeRun = null;
    else if (run?.card) progress.activeRun = R.snapshot(run);
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); storageAvailable = true; } catch (_) { storageAvailable = false; }
  }
  const name = () => progress.name || '새봄';
  const e = A.esc;
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  const player = (role, mood = 'happy', options = {}) => Paint.person(`p${options.face ?? progress.face}_${role}_${['happy', 'proud'].includes(mood) ? 'happy' : 'worried'}`, A.portrait('player', { role, mood, face: progress.face, ...options }));
  function paperScene(role, mood, prop) {
    const fallback = A.building(role) + A.portrait('player', { role, mood, face: progress.face, background: false, standing: true }) + (prop ? A.prop(prop) : '');
    if (!['assembly', 'president', 'court'].includes(role)) return fallback;
    return Paint.scene(`samgwon/bg_${role}`, fallback, `${D.roles[role].org} 앞 대표`, 'eager') + `<span class="paper-player">${player(role, mood, { background: false })}</span>` + (prop ? `<span class="paper-prop">${Paint.scene(`samgwon/prop_${prop}`, A.prop(prop), '', 'eager')}</span>` : '');
  }
  const iconButton = (icon, label, action, extra = '') => `<button class="icon-button" data-action="${action}" aria-label="${label}" ${extra}>${A.icon(icon)}</button>`;
  const announce = text => { document.getElementById('announcer').textContent = text; };
  function year() { return Math.min(D.roles[run.role].years, Math.floor((Math.min(run.turn, 20) - 1) * D.roles[run.role].years / D.turnsPerTerm) + 1); }
  function setScreen(id, html, role = 'assembly') {
    screen = id;
    M?.theme(id === 'ending' ? null : 'civic');
    document.documentElement.style.setProperty('--role', A.colors[role]);
    app.innerHTML = html;
    window.scrollTo(0, 0);
    const heading = app.querySelector('h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    updateDebug();
  }
  function header(title, back = 'title', counter = '') {
    return `<header class="screen-header"><div class="header-title">${iconButton('back', '돌아가기', back)}<h1>${title}</h1></div>${counter ? `<p class="counter">${counter}</p>` : ''}</header>`;
  }
  function title() {
    run = null; locked = false;
    setScreen('title', `<section class="screen title-screen"><a class="title-guide title-home" href="../guides/samgwon.html">게임 설명서</a><div class="title-tools">${iconButton(progress.sound ? 'sound' : 'mute', progress.sound ? '소리 끄기' : '소리 켜기', 'sound', `aria-pressed="${progress.sound}"`)}${iconButton('gear', '설정', 'settings')}</div><div class="fan" aria-hidden="true">${roleIds.map((role, face) => `<div class="fan-card">${player(role, 'happy', { face })}</div>`).join('')}</div><h1 class="title-logo">삼권<br><span>스와이프</span></h1><p class="title-subtitle">다온 공화국을 지켜라!</p><div class="title-actions">${progress.activeRun ? '<button class="primary title-start" data-action="resume">이어하기</button>' : ''}<button class="${progress.activeRun ? '' : 'primary'} title-start" data-action="start">${progress.activeRun ? '새로 시작' : '시작 <span aria-hidden="true">→</span>'}</button></div><div class="title-secondary"><button data-action="endings">엔딩 도감 <span class="counter">${progress.endings.length}/24</span></button><button data-action="notebook">권한 수첩 <span class="counter">${progress.powers.length}/18</span></button></div><div class="title-bottom">${roleIds.map(role => `<span class="mini-building">${A.building(role)}</span>`).join('')}</div></section>`);
  }
  function profileContent(edit = false) {
    return `<div class="profile-form"><h1>${edit ? '이름과 모습' : '반가워요, 대표님!'}</h1><label class="name-label">이름 <input id="player-name" type="text" maxlength="6" value="${e(progress.name)}" placeholder="새봄" autocomplete="off" aria-describedby="name-help"></label><span id="name-help" class="sr-only">최대 6글자. 비워 두면 새봄으로 시작해요.</span><div class="face-grid" role="group" aria-label="내 모습 선택">${[0, 1, 2, 3].map(face => `<button class="face-button" type="button" data-face="${face}" aria-label="모습 ${face + 1}" aria-pressed="${progress.face === face}">${Paint.person(`p${face}_casual_happy`, A.portrait('player', { role: 'assembly', mood: 'happy', face }))}</button>`).join('')}</div><button class="primary" data-action="save-profile">${edit ? '저장' : '다음'} →</button></div>`;
  }
  let profileReturn = null, draftFace = 0;
  function profile(edit = false) {
    draftFace = progress.face;
    if (edit) {
      profileReturn = () => { closeModal(); if (screen === 'title') title(); settings(); };
      openModal(profileContent(true), { className: 'with-close', label: '이름과 모습 바꾸기', closable: true });
    } else {
      profileReturn = roles;
      setScreen('profile', `<section class="screen profile-screen">${profileContent()}</section>`);
    }
  }
  function saveProfile() {
    progress.name = Array.from(document.getElementById('player-name').value.trim()).slice(0, 6).join('') || '새봄';
    progress.face = draftFace; progress.profileSeen = true; save();
    profileReturn();
  }
  function roles() {
    run = null; locked = false;
    setScreen('roles', `<section class="screen roles-screen">${header('어떤 역할을 맡을까요?')}<div class="role-grid">${roleIds.map(role => {
      const r = D.roles[role];
      return `<button class="role-card" data-role="${role}" style="--role:${A.colors[role]}">${A.building(role)}<h2>${r.title}</h2><p>${r.does}</p><span class="term">임기 ${r.years}년</span><span class="ending-dots" aria-label="엔딩 ${progress.endings.filter(id => D.endings[id].role === role).length}개 수집">${Object.entries(D.endings).filter(([, ending]) => ending.role === role).map(([id]) => `<i class="${progress.endings.includes(id) ? 'found' : ''}"></i>`).join('')}</span></button>`;
    }).join('')}</div></section>`);
  }
  function intro(role) {
    run = R.createRun(role); locked = false; S.play('select');
    const r = D.roles[role];
    Paint.preload(D.cards.find(card => card.role === role && card.first).char);
    setScreen('intro', `<section class="screen newspaper-screen"><article class="newspaper intro-paper"><div class="masthead">다온일보</div><div class="paper-date"><span>다온 공화국 · ${r.branch}</span><span>새로운 임기의 시작</span></div><h1>${e(r.headline.replace('{name}', name()))}</h1><div class="paper-scene">${paperScene(role, 'happy')}</div><p>${r.does} · 임기 ${r.years}년</p><div class="button-row"><button data-action="change-role">← 역할 바꾸기</button><button class="primary" data-action="begin">임기 시작!</button></div></article></section>`, role);
  }
  function begin() {
    S.play('begin');
    R.selectCard(run); game();
    if (!progress.tutorialSeen) tutorial(0);
  }
  function game() {
    save();
    const card = run.card, character = D.characters[card.char];
    const term = `임기 ${year()}년 차`;
    setScreen('game', `<section class="screen game-screen"><div class="gauges" aria-label="나라의 상태">${gaugeIds.map(key => {
      const g = D.gauges[key], value = run.gauges[key];
      return `<div class="gauge" data-gauge="${key}" role="meter" aria-label="${g.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" ${key === 'w' ? 'aria-valuetext="권력은 가운데가 안전해요"' : ''}><span class="gauge-dot"></span>${key === 'w' ? `<div class="power-meter" style="--value:${value}"><span class="power-marker"></span></div>` : A.gauge(g.icon, key, value)}<span class="gauge-label">${g.label}</span></div>`;
    }).join('')}</div><div class="speech"><span>${e(card.text)}</span></div><div class="arena"><button class="choice choice-left" data-choice="left"><span class="choice-arrow" aria-hidden="true">◀</span><span>${e(card.left.label)}</span></button><div class="character-card card-enter" id="character-card" tabindex="0" role="group" aria-label="${character.name}, 카드를 좌우로 밀거나 방향키로 결정하세요"><div class="card-choice"></div>${Paint.person(card.char, A.portrait(card.char))}<div class="nameplate"><span class="character-name">${character.name}</span><span class="group-chip" style="--group:${A.colors[character.group]}">${A.groups[character.group]}</span></div></div><button class="choice choice-right" data-choice="right"><span>${e(card.right.label)}</span><span class="choice-arrow" aria-hidden="true">▶</span></button></div><footer class="game-footer"><div class="term-progress"><span class="term-label">${term}</span><div class="ticks" aria-label="${run.resolved} / 20 결정 완료">${Array.from({ length: D.turnsPerTerm }, (_, i) => `<i class="${i < run.resolved ? 'done' : i === run.resolved ? 'current' : ''}"></i>`).join('')}</div></div><div class="footer-buttons">${iconButton('notebook', '권한 수첩', 'notebook')}${iconButton('pause', '잠깐 쉬기', 'pause')}</div></footer></section>`, run.role);
    locked = false;
    updateGauges(); updateBadge(); bindDrag();
    const cardElement = document.getElementById('character-card');
    cardElement.addEventListener('animationend', () => cardElement.classList.remove('card-enter'), { once: true });
    app.querySelectorAll('[data-choice]').forEach(button => {
      button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') preview(button.dataset.choice); });
      button.addEventListener('pointerleave', () => preview(null));
      button.addEventListener('focus', () => preview(button.dataset.choice));
      button.addEventListener('blur', () => preview(null));
    });
    announce(`${term}. ${character.name}: ${card.text}. 왼쪽 ${card.left.label}, 오른쪽 ${card.right.label}`);
  }
  function updateGauges(fx = {}) {
    for (const key of gaugeIds) {
      const element = app.querySelector(`[data-gauge="${key}"]`);
      if (!element) continue;
      const value = run.gauges[key];
      element.setAttribute('aria-valuenow', value);
      if (key === 'w') {
        element.querySelector('.power-meter').style.setProperty('--value', value);
        element.setAttribute('aria-valuetext', `${value} / 100. 가운데가 안전해요.`);
      } else element.querySelector('.gauge-fill').style.transform = `scaleY(${value / 100})`;
      element.classList.toggle('danger', key === 'w' ? value <= 15 || value >= 85 : value <= 20);
      if (fx[key]) {
        const sparkle = document.createElement('span');
        sparkle.className = `gauge-spark ${fx[key] < 0 ? 'negative' : ''}`;
        sparkle.textContent = fx[key] > 0 ? '+' : '−';
        sparkle.setAttribute('aria-hidden', 'true'); element.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 650);
      }
    }
  }
  function preview(side) {
    if (screen !== 'game' || !run.card || locked || modal) return;
    const fx = side ? run.card[side].fx || {} : {};
    for (const key of gaugeIds) {
      const dot = app.querySelector(`[data-gauge="${key}"] .gauge-dot`), magnitude = Math.abs(fx[key] || 0);
      dot.style.setProperty('--dot-size', `${magnitude <= 5 ? 7 : magnitude <= 10 ? 11 : 16}px`);
      dot.classList.toggle('visible', magnitude > 0);
    }
    app.querySelectorAll('[data-choice]').forEach(button => button.classList.toggle('preview', button.dataset.choice === side));
    const label = app.querySelector('.card-choice');
    label.classList.toggle('visible', !!side);
    label.textContent = side ? run.card[side].label : '';
  }
  function updateBadge() {
    const button = app.querySelector('[data-action="notebook"]');
    if (button && freshPowers.length && !button.querySelector('.notebook-badge')) button.insertAdjacentHTML('beforeend', '<span class="notebook-badge" aria-label="새 권한"></span>');
  }
  function grant(ids) {
    const added = ids.filter(id => D.powers[id] && !progress.powers.includes(id));
    progress.powers.push(...added); freshPowers.push(...added); save(); updateBadge();
    return added;
  }
  async function choose(side) {
    if (screen !== 'game' || locked || modal || !run.card) return;
    preview(null); locked = true;
    app.querySelectorAll('button').forEach(button => { button.disabled = true; });
    const card = document.getElementById('character-card');
    card.classList.remove('dragging', 'card-enter');
    card.style.transform = `translateX(${side === 'left' ? '-120vw' : '120vw'}) rotate(${side === 'left' ? -24 : 24}deg)`;
    card.style.opacity = '0'; S.play('swipe');
    await wait(230);
    const result = R.resolve(run, side);
    if (!result.ending) {
      const next = run.queue.find(item => item.turn <= run.turn);
      const cards = next ? [D.cards.find(card => card.id === next.id)] : R.eligible(run);
      [...new Set(cards.map(card => card.char))].forEach(Paint.preload);
      // 선택 결과와 다음 카드를 함께 저장해 전환 중 새로고침에도 중복 적용을 막습니다.
      R.selectCard(run);
    }
    const added = grant(result.powers);
    let isNew = false;
    if (result.ending) {
      isNew = !progress.endings.includes(result.ending);
      if (isNew) progress.endings.push(result.ending);
      save();
    }
    updateGauges(result.fx);
    if (Object.values(result.fx).some(v => v > 0)) S.play('up');
    if (Object.values(result.fx).some(v => v < 0)) S.play('down');
    updateDebug(); await wait(500);
    if (result.stamp) await stamp(result.stamp);
    for (const id of added) await powerModal(id);
    if (result.ending) {
      if (result.death) {
        const key = result.death[0];
        app.querySelector(`[data-gauge="${key}"]`).classList.add('death');
        announce(`${D.gauges[key].label}이 위험해요. 임기가 끝났어요.`);
        await wait(700);
      }
      endingPaper(result.ending, isNew);
    } else { S.play('flip'); game(); }
  }
  function bindDrag() {
    const card = document.getElementById('character-card');
    let drag = null;
    card.addEventListener('pointerdown', event => {
      if (locked || modal || (event.pointerType === 'mouse' && event.button !== 0)) return;
      card.classList.remove('card-enter');
      drag = { id: event.pointerId, x: event.clientX, time: performance.now(), dx: 0, lastX: event.clientX, lastTime: performance.now(), velocity: 0 };
      card.setPointerCapture(event.pointerId); card.classList.add('dragging');
      event.preventDefault();
    });
    card.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const now = performance.now(), elapsed = now - drag.lastTime;
      if (elapsed > 0) drag.velocity = (event.clientX - drag.lastX) / elapsed;
      drag.lastX = event.clientX; drag.lastTime = now; drag.dx = event.clientX - drag.x;
      const rotate = Math.max(-12, Math.min(12, drag.dx / card.offsetWidth * 20));
      card.style.transform = `translateX(${drag.dx}px) rotate(${rotate}deg)`;
      preview(Math.abs(drag.dx) > 12 ? drag.dx < 0 ? 'left' : 'right' : null);
    });
    function release(event, canceled) {
      if (!drag || drag.id !== event.pointerId) return;
      const { dx, velocity, lastTime } = drag;
      drag = null; card.classList.remove('dragging');
      if (card.hasPointerCapture(event.pointerId)) card.releasePointerCapture(event.pointerId);
      const flick = Math.abs(dx) > 24 && Math.abs(velocity) > .6 && performance.now() - lastTime < 100;
      if (!canceled && (Math.abs(dx) > card.offsetWidth * .3 || flick)) choose(dx < 0 ? 'left' : 'right');
      else { card.style.transform = ''; preview(null); }
    }
    card.addEventListener('pointerup', event => release(event, false));
    card.addEventListener('pointercancel', event => release(event, true));
    card.addEventListener('lostpointercapture', event => { if (drag) release(event, true); });
  }
  function openModal(content, options = {}) {
    if (modal) closeModal();
    const previousFocus = document.activeElement;
    overlayRoot.innerHTML = `<div class="overlay-backdrop${options.power ? ' power-backdrop' : ''}"><section style="${options.power ? `--role:${A.colors[options.org]}` : ''}" class="modal ${options.className || ''}" role="dialog" aria-modal="true" aria-label="${options.label || '알림'}">${options.closable ? iconButton('close', '닫기', 'close-modal') : ''}${content}</section></div>`;
    // 아이콘 버튼의 기본 클래스와 닫기 버튼 위치를 함께 유지합니다.
    overlayRoot.querySelector('.icon-button[data-action="close-modal"]')?.classList.add('modal-close');
    app.inert = true;
    let finish;
    const promise = new Promise(resolve => { finish = resolve; });
    modal = { options, previousFocus, finish, timer: null };
    const first = overlayRoot.querySelector('[data-confirm]') || overlayRoot.querySelector('button,input');
    first?.focus({ preventScroll: true });
    if (options.autoDismiss) modal.timer = setTimeout(() => closeModal(), options.autoDismiss);
    return promise;
  }
  function closeModal(value) {
    if (!modal) return;
    const old = modal; modal = null;
    clearTimeout(old.timer); overlayRoot.innerHTML = ''; app.inert = false;
    if (old.previousFocus?.isConnected) old.previousFocus.focus({ preventScroll: true });
    old.finish(value);
  }
  async function stamp(info) {
    const first = !progress.stamps.includes(info.type);
    if (first) { progress.stamps.push(info.type); save(); }
    const definition = D.stamps[info.type]; S.play('stamp');
    await openModal(`<div class="rubber-stamp ${info.type}">${definition.label}</div><p>${e(info.text)}</p>${first ? `<p class="meaning">${definition.meaning}</p>` : ''}`, { label: definition.label, className: 'stamp-modal', autoDismiss: 2400, dismissOnTap: true, escapable: true });
  }
  async function powerModal(id) {
    const p = D.powers[id]; S.play('power');
    // 수첩의 원문은 유지하고, 획득 카드에는 한 줄 요약만 표시합니다.
    const summaries = {
      A1: '법을 만들고 고치고 없애요.', A2: '나랏돈 계획을 심의해요.', A3: '정부 일을 조사해요.', A4: '탄핵 심판을 요구해요.', A5: '대법원장·대법관 임명에 동의해요.',
      G1: '법에 따라 나라 일을 해요.', G2: '나랏돈 계획을 짜요.', G3: '법을 국회로 돌려보내요.', G4: '국회에 법률안을 내요.', G5: '국회 동의로 대법원장·대법관을 임명해요.',
      C1: '다툼을 공정하게 판단해요.', C2: '정부의 위법 결정을 취소해요.', C3: '헌법에 맞는지 물어요.', C4: '세 번까지 재판받아요.', C5: '재판에 간섭할 수 없어요.', C6: '재판은 원칙적으로 공개해요.',
      K1: '헌법에 맞는지 결정해요.', K2: '파면할지 최종 결정해요.'
    };
    await openModal(`<div style="--role:${A.colors[p.org]}">${A.building(p.org)}<div class="eyebrow">새 권한 카드!</div><h2>${p.name}</h2><p>${summaries[id]}</p><button class="primary" data-action="collect-power" data-confirm>수첩에 넣기</button></div>`, { label: '새 권한 카드', className: 'power-modal', power: true, org: p.org });
  }
  let collecting = false;
  async function collectPower() {
    if (!modal?.options.power || collecting) return;
    collecting = true;
    const element = overlayRoot.querySelector('.power-modal');
    const target = app.querySelector('[data-action="notebook"]');
    if (target) {
      const from = element.getBoundingClientRect(), to = target.getBoundingClientRect();
      element.style.setProperty('--fly-x', `${to.x + to.width / 2 - from.x - from.width / 2}px`);
      element.style.setProperty('--fly-y', `${to.y + to.height / 2 - from.y - from.height / 2}px`);
    }
    element.classList.add('flying'); overlayRoot.querySelector('button').disabled = true;
    await wait(380); closeModal(); collecting = false;
  }
  function tutorial(step) {
    const captions = ['밀어서 결정!', '하나라도 바닥나면 끝!', '권력은 가운데가 안전!'];
    let art = step === 0 ? `<div class="tutorial-card">${Paint.person('kid', A.portrait('kid'))}</div><div class="tutorial-hand">${A.icon('hand')}</div>` : step === 1 ? ['people', 'money', 'law'].map((n, i) => `<div class="gauge tut-gauge" data-tut="${i}">${A.gauge(n, 'tutorial', [85, 75, 65][i])}</div>`).join('') : `<div class="power-meter tutorial-power" style="--value:50"><span class="power-marker"></span></div>`;
    openModal(`<div class="tutorial-art">${art}</div><h2>${captions[step]}</h2><div class="tutorial-dots">${[0, 1, 2].map(i => `<i class="${i === step ? 'active' : ''}"></i>`).join('')}</div><button class="primary" data-action="tutorial-next" data-step="${step}" data-confirm>${step === 2 ? '해 볼게요!' : '다음'}</button><br><button class="tutorial-skip" data-action="tutorial-skip">건너뛰기</button>`, { label: `게임 안내 ${step + 1} / 3`, className: 'tutorial-modal', tutorialStep: step, escapable: true });
    if (step === 1) {
      const box = overlayRoot.querySelector('.tut-gauge[data-tut="1"]'), fill = box.querySelector('.gauge-fill');
      setTimeout(() => { if (!fill.isConnected) return; fill.style.transition = 'transform 1.6s ease-in'; fill.style.transform = 'scaleY(.04)'; box.classList.add('danger'); S.play('down'); }, 500);
    }
  }
  function finishTutorial() { progress.tutorialSeen = true; save(); closeModal(); }
  function paperMarkup(id, isNew = false, detail = false) {
    const ending = D.endings[id], role = ending.role;
    const date = ['complete', 'legend'].includes(ending.type) ? '임기 완주!' : detail ? D.roles[role].title : `임기 ${year()}년 차`;
    return `<article class="newspaper ${ending.type === 'legend' ? 'legend' : ''}"><div class="masthead">다온일보 호외</div><div class="paper-date"><span>${date}</span><span>엔딩 ${progress.endings.length}/24</span></div>${isNew ? '<div class="new-badge">NEW!</div>' : ''}<h1>${ending.headline}</h1><div class="paper-scene">${paperScene(role, ending.art.mood, ending.art.prop)}</div><p class="paper-story">${ending.story}</p><div class="learning-note">${A.icon('bulb')}<strong>삼권분립 노트</strong><p>${ending.note}</p></div>${detail ? '<button data-action="close-modal" data-confirm>도감으로</button>' : `<div class="button-row"><button class="primary" data-action="retry" data-confirm>다시 하기</button><button data-action="roles">역할 바꾸기</button><button data-action="endings">엔딩 도감</button></div>`}</article>`;
  }
  function endingPaper(id, isNew) {
    locked = false;
    setScreen('ending', `<section class="screen newspaper-screen">${paperMarkup(id, isNew)}</section>`, D.endings[id].role);
    const type = D.endings[id].type;
    S.play(type === 'legend' ? 'legend' : type === 'complete' ? 'complete' : type === 'scandal' ? 'scandal' : 'fail'); announce(D.endings[id].headline);
    if (['complete', 'legend'].includes(D.endings[id].type)) confetti();
  }
  function confetti() {
    const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
    box.innerHTML = Array.from({ length: 38 }, (_, i) => `<i style="left:${(i * 37) % 100}%;background:${[A.colors.assembly, A.colors.gov, A.colors.court, '#F5C542'][i % 4]};animation-delay:${i % 9 * .09}s"></i>`).join('');
    document.body.appendChild(box); setTimeout(() => box.remove(), 4300);
  }
  let collectionReturn = title;
  function openCollection(type) {
    if (locked || modal) return;
    const origin = screen;
    collectionReturn = origin === 'game' ? game : origin === 'ending' ? () => endingPaper(run.ended, false) : origin === 'roles' ? roles : title;
    if (type === 'endings') endings(); else notebook();
  }
  function endings() {
    setScreen('endings', `<section class="screen collection-screen">${header('엔딩 도감', 'collection-back', `${progress.endings.length} / 24`)}<div class="tabs" role="tablist" aria-label="역할">${roleIds.map(role => `<button role="tab" aria-selected="${collectionRole === role}" data-tab="${role}" style="--role:${A.colors[role]}">${D.roles[role].title}</button>`).join('')}</div><div class="ending-grid" role="tabpanel" aria-label="${D.roles[collectionRole].title} 엔딩">${Object.entries(D.endings).filter(([, ending]) => ending.role === collectionRole).map(([id, ending]) => progress.endings.includes(id) ? `<button class="ending-thumb" data-ending="${id}"><span class="thumb-masthead">다온일보 호외</span><h3>${ending.headline}</h3><span class="thumb-prop">${Paint.scene(`samgwon/prop_${ending.art.prop}`, A.prop(ending.art.prop))}</span></button>` : `<div class="ending-thumb locked"><span class="thumb-masthead">다온일보 호외</span><span class="big-question">?</span><span class="ending-hint">${ending.hint}</span></div>`).join('')}</div></section>`, collectionRole);
  }
  function notebook() {
    const newly = [...freshPowers]; freshPowers = [];
    setScreen('notebook', `<section class="screen collection-screen">${header('권한 수첩', 'collection-back', `${progress.powers.length} / 18`)}<div class="notebook-diagram"><h2>서로 견제하며 균형을 지켜요</h2>${A.checks(progress.powers)}<div class="check-list">${D.checks.map(check => `<div class="check-row"><span>${D.roles[check.from].org} → ${D.roles[check.to].org}</span><strong style="color:${check.powers.some(id => progress.powers.includes(id)) ? A.colors[check.from] : '#A49C92'}">${check.powers.some(id => progress.powers.includes(id)) ? check.label : '?'}</strong></div>`).join('')}</div></div><div class="power-sections">${['assembly', 'president', 'court', 'ccourt'].map(org => `<section class="power-section" style="--role:${A.colors[org]}"><h2>${A.building(org)}${D.roles[org]?.org || '헌법재판소'}</h2>${Object.entries(D.powers).filter(([, power]) => power.org === org).map(([id, power]) => progress.powers.includes(id) ? `<article class="power-entry ${newly.includes(id) ? 'fresh' : ''}"><h3>${power.name}</h3><p>${power.desc}</p></article>` : `<div class="power-entry locked" aria-label="아직 얻지 못한 권한">?</div>`).join('')}</section>`).join('')}</div></section>`);
  }
  function sound() { progress.sound = !progress.sound; save(); S.setEnabled(progress.sound); syncMusic(); S.play('tick'); if (modal?.options.settings) settings(); else if (screen === 'title') title(); }
  function settings() {
    openModal(`<h2>설정</h2><div class="setting-row"><span>소리</span><button data-action="sound" aria-pressed="${progress.sound}">${A.icon(progress.sound ? 'sound' : 'mute')} ${progress.sound ? '켜짐' : '꺼짐'}</button></div><div class="setting-row"><span>배경 음악</span><button data-action="music" aria-pressed="${progress.music}" ${progress.sound ? '' : 'disabled'}>${A.icon(progress.music && progress.sound ? 'sound' : 'mute')} ${progress.music && progress.sound ? '켜짐' : '꺼짐'}</button></div><div class="setting-row"><span>${e(name())}</span><button data-action="edit-profile">이름 · 모습 바꾸기</button></div>${!storageAvailable ? '<p class="muted">이 환경에서는 기록을 저장할 수 없어요.</p>' : ''}<button class="reset-button" data-action="reset">모든 기록 초기화</button>`, { label: '설정', className: 'settings with-close', closable: true, settings: true });
  }
  function reset() {
    openModal('<h2>정말 지울까요?</h2><p>이름, 엔딩, 권한 수첩이 모두 지워져요.</p><div class="button-row"><button data-action="reset-cancel" data-confirm>취소</button><button class="danger-button" data-action="reset-confirm">모두 지우기</button></div>', { label: '모든 기록 초기화 확인', closable: true, className: 'with-close' });
  }
  function pause() {
    if (locked) return;
    preview(null);
    openModal('<h2>잠깐 쉬어 가요</h2><div class="button-row"><button class="primary" data-action="close-modal" data-confirm>계속하기</button><button data-action="pause-settings">설정</button><button data-action="leave">처음으로</button></div>', { label: '일시정지', closable: true, className: 'with-close' });
  }
  function updateDebug() {
    if (!debug) return;
    let panel = document.getElementById('debug-panel');
    if (!panel) {
      panel = document.createElement('details'); panel.id = 'debug-panel'; panel.className = 'debug-panel'; document.body.appendChild(panel);
      panel.innerHTML = `<summary>DEBUG · 테스트 도구</summary><div class="debug-content"><div class="debug-gauges">${gaugeIds.map(key => `<label>${D.gauges[key].label}<input type="number" min="0" max="100" data-debug-gauge="${key}" aria-label="디버그 ${D.gauges[key].label}"></label>`).join('')}</div><button data-action="debug-gauges">게이지 적용</button><select id="debug-ending" aria-label="엔딩 선택">${Object.entries(D.endings).map(([id, ending]) => `<option value="${id}">${D.roles[ending.role].title} · ${ending.headline}</option>`).join('')}</select><button data-action="debug-ending">엔딩으로 이동</button><select id="debug-card" aria-label="카드 선택">${D.cards.map(card => `<option value="${card.id}">${card.id} · ${card.text}</option>`).join('')}</select><button data-action="debug-card">카드로 이동</button><small id="debug-state"></small></div>`;
    }
    gaugeIds.forEach(key => { const input = panel.querySelector(`[data-debug-gauge="${key}"]`); if (document.activeElement !== input) input.value = run?.gauges[key] ?? 50; });
    panel.querySelector('#debug-state').textContent = `${screen} · ${run?.card?.id || '—'} · ${run?.resolved || 0}/20`;
  }
  async function debugEnding(id) {
    if (locked || modal || !D.endings[id]) return;
    run ||= R.createRun(D.endings[id].role);
    run.role = D.endings[id].role; run.ended = id; run.card = null;
    const isNew = !progress.endings.includes(id);
    if (isNew) progress.endings.push(id);
    const added = grant(D.endings[id].powers || []); save();
    locked = true;
    for (const power of added) await powerModal(power);
    endingPaper(id, isNew);
  }
  function debugCard(id) {
    if (locked || modal) return;
    const card = D.cards.find(c => c.id === id); if (!card) return;
    if (!run || run.role !== card.role || run.ended) run = R.createRun(card.role);
    run.card = card; run.used.add(card.id); run.previous = card.char; game();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) { if (modal?.options.dismissOnTap && event.target.closest('.overlay-backdrop')) closeModal(); return; }
    if (button.disabled) return;
    S.play('tick');
    if (button.dataset.choice) { choose(button.dataset.choice); return; }
    if (button.dataset.face !== undefined) {
      draftFace = Number(button.dataset.face);
      document.querySelectorAll('[data-face]').forEach(face => face.setAttribute('aria-pressed', face === button)); return;
    }
    if (button.dataset.role) { intro(button.dataset.role); return; }
    if (button.dataset.tab) { collectionRole = button.dataset.tab; endings(); app.querySelector(`[data-tab="${collectionRole}"]`).focus(); return; }
    if (button.dataset.ending) {
      openModal(paperMarkup(button.dataset.ending, false, true), { label: D.endings[button.dataset.ending].headline, className: 'paper-detail', closable: true }); return;
    }
    const action = button.dataset.action;
    const actions = {
      resume: () => { run = R.restoreRun(progress.activeRun); if (run) { game(); if (!progress.tutorialSeen) tutorial(0); } },
      title, start: () => progress.profileSeen ? roles() : profile(), 'save-profile': saveProfile, roles,
      'change-role': () => { run = null; progress.activeRun = null; save(); S.play('flip'); roles(); },
      begin, retry: () => intro(run.role), endings: () => openCollection('endings'), notebook: () => openCollection('notebook'),
      'collection-back': () => collectionReturn(), sound, settings,
      music: () => { progress.music = !progress.music; save(); syncMusic(); S.play('tick'); settings(); }, 'edit-profile': () => profile(true),
      'close-modal': () => closeModal(), 'collect-power': collectPower,
      'tutorial-next': () => { const step = Number(button.dataset.step); closeModal(); if (step === 2) finishTutorial(); else tutorial(step + 1); },
      'tutorial-skip': finishTutorial, reset, 'reset-cancel': settings,
      'reset-confirm': () => { closeModal(); progress = defaults(); freshPowers = []; save(); S.setEnabled(false); title(); },
      pause, 'pause-settings': settings,
      leave: () => openModal('<h2>임기를 그만둘까요?</h2><p>이번 임기는 끝나고, 모은 기록은 남아요.</p><div class="button-row"><button data-action="close-modal" data-confirm>계속하기</button><button data-action="leave-confirm">처음으로</button></div>', { label: '임기 그만두기', escapable: true }),
      'leave-confirm': () => { closeModal(); progress.activeRun = null; run = null; save(); title(); },
      'debug-gauges': () => { if (!run || locked || modal) return; for (const key of gaugeIds) { const value = Number(document.querySelector(`[data-debug-gauge="${key}"]`).value); if (Number.isFinite(value)) run.gauges[key] = R.clamp(value); } if (screen === 'game') updateGauges(); updateDebug(); },
      'debug-ending': () => debugEnding(document.getElementById('debug-ending').value),
      'debug-card': () => debugCard(document.getElementById('debug-card').value)
    };
    actions[action]?.();
  });
  document.addEventListener('keydown', event => {
    if (event.isComposing || event.repeat) return;
    if (event.key === 'Tab' && modal) {
      const focusable = [...overlayRoot.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')];
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !overlayRoot.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !overlayRoot.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      return;
    }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) { if (event.key !== 'Escape') return; }
    if (modal) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (modal.options.tutorialStep !== undefined) finishTutorial();
        else if (modal.options.power) collectPower();
        else if (modal.options.closable || modal.options.escapable) closeModal();
      } else if (['Enter', ' '].includes(event.key) && event.target.tagName !== 'BUTTON') {
        event.preventDefault();
        if (modal.options.dismissOnTap) closeModal();
        else overlayRoot.querySelector('[data-confirm]')?.click();
      }
      return;
    }
    if (screen === 'game') {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); choose(event.key === 'ArrowLeft' ? 'left' : 'right'); }
      else if (event.key === 'Escape') { event.preventDefault(); pause(); }
    } else if (['Enter', ' '].includes(event.key) && !['BUTTON', 'A'].includes(event.target.tagName)) {
      const target = app.querySelector('[data-confirm],.primary');
      if (target) { event.preventDefault(); target.click(); }
    } else if (event.key === 'Escape' && ['notebook', 'endings'].includes(screen)) collectionReturn();
  });
  // file://는 네트워크 없이도 실행합니다. 웹에서는 폰트만 선택적으로 불러옵니다.
  if (location.protocol !== 'file:' && navigator.onLine) {
    for (const href of ['https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Nanum+Myeongjo:wght@800&display=swap', 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css']) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; document.head.appendChild(link);
    }
  }
  if (debug) window.SamgwonDebug = { rules: R, get run() { return run; }, get progress() { return progress; }, get locked() { return locked; }, choose, card: debugCard, ending: debugEnding, game, intro, begin, grant };
  title();
})();
