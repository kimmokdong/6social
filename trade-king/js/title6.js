/* 무역왕 7.1 시작 화면(나무 탁자 위 보드판 장면 · 게임 시작/도감/설정)과 오프닝 영상.
   시안 title-mock.html을 게임에 옮겼다. 대본(자막·내레이션 파일)은 js/opening6.js, 모양은 css/title6.css.
   game6.js가 TradeTitle.init({play, resume, saveSummary, codex, apply})로 연결한다. */
(() => {
  'use strict';
  const OP = window.TRADE_OPENING || {shots: []};
  const KEY = 'trade6.settings', SEEN = 'trade6.opening';
  const DEF = {sound: true, music: 'on', musicVol: 'normal', pace: 'normal', text: 'big', motion: 'on', voice: true, pauseIdle: 'on', pauseDrop: 'on', pauseChoice: 'on'};   // 7.4 소리는 처음부터 켜짐(저장한 선택은 그대로)
  const store = {get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: k => { try { localStorage.removeItem(k); } catch {} }};
  let S = (() => { try { return {...DEF, ...JSON.parse(store.get(KEY) || '{}')}; } catch { return {...DEF}; } })();
  const save = () => store.set(KEY, JSON.stringify(S));
  const calm = () => S.motion === 'less';   // 7.3 OS 움직임 줄이기는 따르지 않고 게임 설정만
  let hooks = {play() {}, resume() {}, saveSummary() { return null; }, codex() {}, apply() {}};

  // ---------- 시작 화면 ----------
  const SHIP = k => `../shared-art/trade/v6/ships/ship_${k}.webp`, GOOD = g => `../shared-art/trade/v6/goods/${g}.webp`;
  const el = Object.assign(document.createElement('div'), {id: 'title', hidden: true});
  el.innerHTML = `<div class="scene" aria-hidden="true"><div class="rig">
      <div class="table"></div>
      <div class="coins" style="left:760px;top:120px">${Array.from({length: 7}, (_, k) => `<i style="--k:${k}"></i>`).join('')}${Array.from({length: 4}, (_, k) => `<i style="--k:${k};left:52px;top:10px"></i>`).join('')}</div>
      <div class="card back" style="left:-920px;top:-160px;--r:-14deg"></div><div class="card back" style="left:-900px;top:-150px;--r:-6deg"></div>
      <div class="card" style="left:-880px;top:-130px;--r:4deg"><span>발전 회의</span><b>🏭</b><span>공장 +1</span></div>
      ${[['food', 770, -200], ['oil', 850, -150], ['tech', 790, -90], ['steel', 880, -40], ['cloth', -860, 150], ['ore', -790, 200]].map(([g, x, y]) => `<div class="token" style="left:${x}px;top:${y}px"><img src="${GOOD(g)}" alt=""></div>`).join('')}
      <div class="board"><div class="edge"></div>
        <svg class="routes" viewBox="0 0 1400 516" preserveAspectRatio="none"><path class="mine" d="M680,470 C640,400 520,360 470,280"/><path class="mine" d="M690,470 C760,400 880,360 930,280"/><path d="M700,480 C900,470 1150,470 1260,400"/><path d="M660,480 C460,480 230,470 130,410"/><path d="M480,250 C600,180 800,180 920,250"/></svg>
        <div class="stand flag home" style="left:690px;top:470px"><div class="up">🏠 우리 나라</div></div>
        <div class="stand flag" style="left:450px;top:240px"><div class="up">숲의 나라</div></div><div class="stand flag" style="left:960px;top:240px"><div class="up">석유 왕국</div></div>
        <div class="stand flag" style="left:1270px;top:380px"><div class="up">철의 나라</div></div><div class="stand flag" style="left:120px;top:390px"><div class="up">큰 시장국</div></div>
        <div class="stand ship" style="--t:13s;offset-path:path('M680,470 C640,400 520,360 470,280')"><span class="base"></span><div class="up"><img src="${SHIP(0)}" alt=""></div></div>
        <div class="stand ship" style="--t:15s;--d:-6s;offset-path:path('M690,470 C760,400 880,360 930,280')"><span class="base"></span><div class="up"><img src="${SHIP(1)}" alt=""></div></div>
        <div class="stand ship" style="--t:19s;--d:-3s;offset-path:path('M700,480 C900,470 1150,470 1260,400')"><span class="base"></span><div class="up"><img src="${SHIP(2)}" alt=""></div></div>
        <div class="stand ship" style="--t:17s;--d:-9s;offset-path:path('M480,250 C600,180 800,180 920,250')"><span class="base"></span><div class="up"><img src="${SHIP('npc')}" alt="" style="width:110px"></div></div>
      </div></div></div>
    <div class="dof"></div><div class="lamp"></div><div class="dust">${Array.from({length: 26}, (_, i) => `<i style="--x:${(i * 37) % 100}%;--y:${20 + (i * 53) % 70}%;--t:${7 + i % 6}s;--d:-${i * .7}s"></i>`).join('')}</div><div class="grain"></div><div class="fade"></div>
    <div class="hud"><div class="logo"><small>6학년 사회 · 무역 보드게임</small><h1>무역왕</h1><p>배를 띄워라, 나라를 키워라!</p></div>
      <nav class="menu" aria-label="시작 메뉴"><button class="resume" data-t="resume" hidden>▶ 이어하기<small></small></button><button class="play" data-t="play">▶ 게임 시작</button>
        <button class="item" data-t="codex">📖 도감 <small class="codex-rank">모은 나라·사건·배지</small></button><a class="item" href="../guides/trade.html">📘 게임 설명서 <small>규칙·꿀팁</small></a><button class="item" data-t="set">⚙️ 설정</button></nav></div>
    <div class="panel" role="dialog" aria-modal="true" aria-label="설정"></div>`;
  document.body.append(el);
  const panel = el.querySelector('.panel');
  const helperVal = () => store.get('trade6.helper') === 'off' ? 'off' : 'on';
  const ROWS = [['sound', '🔊 효과음', [['on', '켜기'], ['off', '끄기']]], ['music', '🎵 배경음악', [['on', '켜기'], ['off', '끄기']]], ['musicVol', '🎚 음악 크기', [['small', '작게'], ['normal', '보통'], ['big', '크게']]], ['pace', '⏩ 시간 흐름', [['slow', '천천히'], ['normal', '보통'], ['fast', '빠르게']]],
    ['text', '🔠 글자 크기', [['big', '크게'], ['huge', '아주 크게']]], ['motion', '🎬 화면 움직임', [['on', '켜기'], ['less', '줄이기']]], ['helper', '🧭 도우미 설명', [['on', '켜기'], ['off', '끄기']]],
    ['pauseIdle', '⏸ 배가 쉬면 멈추기', [['on', '켜기'], ['off', '끄기']]], ['pauseDrop', '⏸ 예상 점수 10점↓ 멈추기', [['on', '켜기'], ['off', '끄기']]],
    ['pauseChoice', '⏸ 1년째 고를 일이 오면 멈추기', [['on', '켜기'], ['off', '끄기']]]];   // 8.5 단추 돌발·계약 요청 · 7.9b 자동 멈춤은 게임 안 ⚙️에서만
  const valueOf = k => k === 'sound' ? (S.sound ? 'on' : 'off') : k === 'helper' ? helperVal() : S[k];
  function drawPanel() {
    panel.innerHTML = `<h2>⚙️ 설정</h2>${ROWS.filter(([k]) => !k.startsWith('pause')).map(([k, name, opts]) => `<div class="row">${name}<span class="seg" role="group" aria-label="${name}">${opts.map(([v, t]) => `<button data-set="${k}" data-v="${v}" class="${valueOf(k) === v ? 'on' : ''}" aria-pressed="${valueOf(k) === v}">${t}</button>`).join('')}</span></div>`).join('')}
      <div class="row">🎬 오프닝 영상<span class="seg"><button data-t="replay">다시 보기</button></span></div>
      <p class="tnote">도우미를 다시 켜면 다음 판에 처음부터 알려 줘요.</p><button class="close" data-t="close">닫기</button>`;
  }
  function setValue(k, v) {
    if (k === 'helper') {
      if (v === 'off') store.set('trade6.helper', 'off');
      else if (helperVal() === 'off') { store.del('trade6.helper'); for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key?.startsWith('trade6.helper.')) { store.del(key); i--; } } }
    } else { S[k] = k === 'sound' ? v === 'on' : v; save(); }
    hooks.apply(S); if (panel.classList.contains('on')) drawPanel();
  }
  const openPanel = () => { drawPanel(); panel.classList.add('on'); panel.querySelector('button')?.focus(); };
  const closePanel = () => { panel.classList.remove('on'); el.querySelector('[data-t="set"]')?.focus(); };
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.set) return setValue(b.dataset.set, b.dataset.v);
    const t = b.dataset.t;
    if (t === 'play') return startGame();
    if (t === 'resume') { if (hooks.resume()) hide(); else show(); return; }
    if (t === 'codex') return hooks.codex();
    if (t === 'set') return openPanel();
    if (t === 'close') return closePanel();
    if (t === 'replay') { panel.classList.remove('on'); return playOpening(null); }
  });
  let introTimer = 0;
  // 7.2 도감 단추에 선장 칭호와 채움 비율(엔진 codexStats)
  function codexRank() {
    const E = window.TradeEngine6, sm = el.querySelector('.codex-rank'); if (!E?.codexStats || !sm) return;
    let c = {}; try { c = JSON.parse(store.get('trade6.codex')) || {}; } catch {}
    const st = E.codexStats(c); sm.textContent = `${st.rank.icon} ${st.rank.name} · ${st.percent}%`;
  }
  function show() {
    const s = hooks.saveSummary(), r = el.querySelector('[data-t="resume"]'), p = el.querySelector('[data-t="play"]');
    r.hidden = !s; p.classList.toggle('new-game', !!s); p.textContent = s ? '새 게임' : '▶ 게임 시작';
    if (s) r.querySelector('small').textContent = `${s.nation} · ${s.date}`;
    codexRank();
    clearTimeout(introTimer);
    el.hidden = false; el.classList.remove('go', 'out'); el.classList.add('bars');
    if (!calm()) { el.classList.add('intro'); introTimer = setTimeout(() => el.classList.remove('intro'), 3300); }
    setTimeout(() => el.querySelector('[data-t="resume"]:not([hidden]), .play')?.focus({preventScroll: true}), calm() ? 0 : 2600);
    setTimeout(preload, 1200);
  }
  function hide() { el.classList.add('out'); setTimeout(() => { el.hidden = true; el.classList.remove('out', 'go'); }, 450); }
  // 게임 시작: 처음 한 번은 오프닝 영상 → 카메라가 보드판으로 내려가며 나라 고르기
  function startGame() { if (!store.get(SEEN) && OP.shots.length) return playOpening(toNations); toNations(); }
  function toNations() { hooks.play(); el.classList.add('go'); setTimeout(hide, calm() ? 0 : 1100); }

  // ---------- 오프닝 영상 ----------
  const A = '../shared-art/trade/';
  const SPECIAL = {
    clouds: `<div class="pic" style="background-image:url(${A}map_archipelago.webp)"></div><img class="cloud l" src="${A}fog_1.webp" alt=""><img class="cloud r" src="${A}fog_2.webp" alt="">`,
    sea: `<div class="pic" style="background-image:url(${A}v6/map6.webp)"></div><div class="fleet"><img src="${SHIP(0)}" alt="" data-m="-20,62,40,42"><img src="${SHIP(1)}" alt="" data-m="105,55,60,28" data-f="-1"><img src="${SHIP(2)}" alt="" data-m="30,95,18,55"><img src="${SHIP(3)}" alt="" data-m="70,92,82,62" style="width:11vw"><img src="${SHIP('npc')}" alt="" data-m="-10,20,20,22" style="width:9vw"></div>`,
    grow: `<div class="pic" style="background-image:url(${A}v6/home_1.webp)"></div><div class="pic p2" style="background-image:url(${A}v6/home_2.webp);opacity:0"></div><div class="pic p3" style="background-image:url(${A}v6/home_3.webp);opacity:0"></div><div class="tint" style="background:linear-gradient(#ff9a4a40,#7a3a8a30)"></div>`,
    title: `<div class="pic" style="background-image:url(${A}title.webp)"></div><div class="endlogo"><h1>무역왕</h1></div>`
  };
  const SH = OP.shots;
  let cine = null, shots = [], fx, line, chapter, lens = [], timers = [], anims = [], done = null, voices = [], speaking = null;
  // 7.1d 배경음악·효과음(opening6.js의 music·sfx, 폴더 soundDir). 파일이 없으면 조용히 건너뛴다.
  const VOL = Object.assign({music: .5, duck: .2, sfx: .7, track: .8, trackDuck: .35}, OP.volume);
  let tracks = [], effects = [], nowTrack = null, ducked = false, single = null;
  let SFXO = {};   // 효과음 실험용 덮어쓰기(sfx-demo.html): enabled, pick(i), mark(화면 표시), onPlay(i, 이름, 초)   // single: 음악+효과음을 섞은 한 파일(있으면 우선)
  const level = t => t === single ? (ducked ? VOL.trackDuck : VOL.track) : (ducked ? VOL.duck : VOL.music);
  const IO = 'cubic-bezier(.45,.05,.55,.95)', OUT = 'cubic-bezier(.2,.7,.3,1)';
  const later = (sec, f) => timers.push(setTimeout(f, sec * 1000));
  const anim = (node, kf, o) => { const a = node.animate(kf, Object.assign({fill: 'both'}, o)); anims.push(a); return a; };
  const tf = ([sc, x, y]) => `translate(${x}%,${y}%) scale(${sc})`;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function ensureCine() {
    if (cine) return;
    cine = Object.assign(document.createElement('div'), {id: 'cine', className: 'cine'});
    cine.setAttribute('role', 'dialog'); cine.setAttribute('aria-label', '오프닝 영상');
    cine.innerHTML = `<div class="shots">${SH.map(x => `<div class="shot"><div class="cam">${x.kind ? SPECIAL[x.kind] : `<div class="pic" style="background-image:url(${x.img})"></div>`}</div></div>`).join('')}</div>
      <div class="fx"></div><div class="vig"></div><p class="chapter"></p><p class="sub-line" aria-live="polite"></p><div class="cbar"></div>
      <button class="skip voice" data-c="voice"></button><button class="skip" data-c="skip">건너뛰기 ▶▶<kbd>Esc</kbd></button>`;
    document.body.append(cine);
    shots = [...cine.querySelectorAll('.shot')]; fx = cine.querySelector('.fx'); line = cine.querySelector('.sub-line'); chapter = cine.querySelector('.chapter');
    cine.addEventListener('click', e => { const c = e.target.closest('[data-c]')?.dataset.c; if (c === 'skip') endCine(false); if (c === 'voice') { S.voice = !S.voice; save(); voiceBtn(); if (!S.voice) { hush(); quiet(); } else if (nowTrack === single) playSingle(); else if (nowTrack?.ok) { nowTrack.audio.play().catch(() => {}); fadeTo(nowTrack.audio, level(nowTrack), 600); } } });
    voiceBtn();
  }
  const voiceBtn = () => { const b = cine.querySelector('[data-c="voice"]'); b.setAttribute('aria-pressed', S.voice); b.textContent = S.voice ? '🔊 소리 켬' : '🔇 자막만'; b.setAttribute('aria-label', S.voice ? '내레이션·음악 끄기' : '내레이션·음악 켜기'); };
  function overlay(css, kf, o) { const d = document.createElement('div'); d.className = 'ov'; d.style.cssText = css; fx.append(d); anim(d, kf, o).onfinish = () => d.remove(); return d; }
  function particles(n, make) { for (let i = 0; i < n; i++) { const d = document.createElement('i'); d.className = 'pt'; fx.append(d); const [css, kf, o] = make(i); d.style.cssText = css; anim(d, kf, o).onfinish = () => d.remove(); } }
  const showIn = (node, d, from = 0, to = 1, at0 = 0, at1 = 1) => anim(node, [{opacity: 0, offset: 0}, {opacity: 0, offset: at0}, {opacity: 1, offset: at1}, {opacity: 1, offset: 1}], {duration: d * 1000, easing: 'linear'});
  // 방향 있는 페이드: 두 컷이 겹친 채 서서히 바뀌고, 같은 방향으로 살짝만 흘러간다
  function strip(i, o, d, axis, dir) {
    const T = v => `translate${axis}(${v * dir}%)`, ms = d * 1000;
    anim(i, [{opacity: 0}, {opacity: 1}], {duration: ms, easing: IO});
    anim(i.firstChild, [{transform: T(7)}, {transform: T(0)}], {duration: ms * 1.4, easing: OUT});
    if (o) anim(o.firstChild, [{transform: T(0)}, {transform: T(-7)}], {duration: ms * 1.4, easing: 'cubic-bezier(.3,0,.7,1)'});
  }
  function shake(node, sec) { anim(node, Array.from({length: 9}, (_, k) => ({transform: k === 8 ? 'translate(0,0)' : `translate(${rnd(-9, 9)}px,${rnd(-7, 7)}px)`})), {duration: sec * 1000, easing: 'linear', composite: 'add'}); }
  function sparkle(n, d) { particles(n, () => { const s = rnd(4, 9); return [`left:${rnd(5, 95)}%;top:${rnd(15, 80)}%;width:${s}px;height:${s}px;background:#fff6d8;box-shadow:0 0 12px 4px #ffd25a`, [{transform: 'scale(0)', opacity: 0}, {transform: 'scale(1.4)', opacity: 1, offset: .4}, {transform: 'scale(0)', opacity: 0}], {duration: rnd(.8, 1.4) * 1000, delay: rnd(.2, d) * 1000, easing: 'ease-out'}]; }); }
  function burst(xPct, yPct, color, size) { particles(26, k => { const ang = k / 26 * Math.PI * 2, r = rnd(14, 22) * size; return [`left:${xPct}%;top:${yPct}%;width:6px;height:6px;background:${color};box-shadow:0 0 10px 3px ${color}`, [{transform: 'translate(0,0) scale(1)', opacity: 1}, {transform: `translate(${Math.cos(ang) * r}vw,${Math.sin(ang) * r}vh) scale(.4)`, opacity: 0}], {duration: 1100, easing: 'cubic-bezier(.1,.8,.3,1)'}]; }); }
  const TRANS = {
    fadeblack: (i, o, d) => showIn(i, d),
    dissolve: (i, o, d) => anim(i, [{opacity: 0}, {opacity: 1}], {duration: d * 1000, easing: IO}),
    slowdip: (i, o, d) => { anim(i, [{opacity: 0}, {opacity: 1}], {duration: d * 1000, easing: IO}); if (o) anim(o.firstChild, [{filter: 'saturate(1) brightness(1)'}, {filter: 'saturate(.5) brightness(.6)'}], {duration: d * 1000, easing: IO}); },
    zoomthrough: (i, o, d) => { anim(i, [{opacity: 0}, {opacity: 1}], {duration: d * 1000, easing: 'ease-out'}); anim(i.firstChild, [{transform: 'scale(.72)'}, {transform: 'scale(1)'}], {duration: d * 1000, easing: OUT}); if (o) anim(o.firstChild, [{transform: 'scale(1)'}, {transform: 'scale(1.9)'}], {duration: d * 1000, easing: 'cubic-bezier(.5,0,.75,1)'}); },
    whip: (i, o, d) => strip(i, o, d, 'X', 1),
    push: (i, o, d) => strip(i, o, d, 'X', 1),
    tiltup: (i, o, d) => strip(i, o, d, 'Y', -1),
    pullback: (i, o, d) => { showIn(i, d, 0, 1, .1, .75); anim(i.firstChild, [{transform: 'scale(2.3)'}, {transform: 'scale(1)'}], {duration: d * 1000, easing: OUT}); if (o) anim(o.firstChild, [{transform: 'scale(1)', opacity: 1}, {transform: 'scale(.4)', opacity: .2}], {duration: d * 1000, easing: 'cubic-bezier(.4,0,.6,1)'}); },
    glow: (i, o, d, x) => { overlay(`inset:-20%;mix-blend-mode:screen;background:radial-gradient(closest-side,${x.c},#0000)`, x.c2 ? [{opacity: 0, background: `radial-gradient(closest-side,${x.c},#0000)`}, {opacity: .95, offset: .45}, {opacity: 0, background: `radial-gradient(closest-side,${x.c2},#0000)`}] : [{opacity: 0}, {opacity: .95, offset: .45}, {opacity: 0}], {duration: d * 1000, easing: 'ease-in-out'}); showIn(i, d, 0, 1, .35, .6); },
    lightning: (i, o, d) => { overlay('inset:0;background:#eef4ff', [{opacity: 0}, {opacity: .9, offset: .06}, {opacity: 0, offset: .2}, {opacity: .55, offset: .3}, {opacity: 0, offset: .55}], {duration: d * 1000, easing: 'linear'}); showIn(i, d, 0, 1, .05, .07); shake(i.firstChild, .8); },
    fog: (i, o, d) => { for (const [k, img] of [[0, 'fog_1'], [1, 'fog_2']]) overlay(`left:0;top:${10 + k * 30}%;width:170%;height:70%;background:url(${A}${img}.webp) center/contain no-repeat;filter:brightness(.85)`, [{transform: 'translateX(70%) scale(1.4)', opacity: 0}, {opacity: .95, offset: .35}, {opacity: .9, offset: .65}, {transform: 'translateX(-95%) scale(1.6)', opacity: 0}], {duration: d * 1000 * (1 + k * .15), easing: 'linear'}); overlay('inset:0;background:#8a96a0', [{opacity: 0}, {opacity: .5, offset: .45}, {opacity: 0}], {duration: d * 1000}); showIn(i, d, 0, 1, .38, .68); },
    smoke: (i, o, d) => { overlay('left:-20%;right:-20%;top:20%;height:120%;background:radial-gradient(40% 35% at 30% 60%,#2a1a10e0,#0000),radial-gradient(45% 40% at 70% 55%,#3a2416d0,#0000),radial-gradient(60% 50% at 50% 80%,#1a0e08f0,#0000)', [{transform: 'translateY(60%)', opacity: 0}, {opacity: 1, offset: .4}, {opacity: .9, offset: .6}, {transform: 'translateY(-70%)', opacity: 0}], {duration: d * 1000, easing: 'ease-in-out'}); particles(36, () => { const x = rnd(5, 95), s = rnd(3, 7); return [`left:${x}%;bottom:-2%;width:${s}px;height:${s}px;background:#ffb04a;box-shadow:0 0 8px 2px #ff7a1a`, [{transform: 'translate(0,0)', opacity: 0}, {opacity: 1, offset: .2}, {transform: `translate(${rnd(-60, 60)}px,-${rnd(50, 90)}vh)`, opacity: 0}], {duration: rnd(1.2, 2.2) * 1000, delay: rnd(0, .6) * 1000, easing: 'ease-out'}]; }); showIn(i, d, 0, 1, .35, .62); },
    sunray: (i, o, d) => { overlay('left:-150%;top:-20%;width:300%;height:140%;mix-blend-mode:screen;background:linear-gradient(100deg,#0000 38%,#ffe9a0aa 47%,#fff6d8ee 50%,#ffe9a0aa 53%,#0000 62%)', [{transform: 'translateX(-35%)'}, {transform: 'translateX(55%)'}], {duration: d * 1000, easing: 'cubic-bezier(.4,0,.3,1)'}); showIn(i, d, 0, 1, .3, .6); anim(i.firstChild, [{filter: 'brightness(1.7)'}, {filter: 'brightness(1)'}], {duration: d * 1000, easing: 'ease-out'}); sparkle(28, d); },
    confetti: (i, o, d) => { anim(i, [{opacity: 0}, {opacity: 1}], {duration: d * 1000, easing: IO}); const cols = ['#e2533f', '#2b86d6', '#2e9e52', '#9a55cf', '#f2b632', '#ffffff']; particles(46, k => { const x = rnd(0, 100), w = rnd(6, 11); return [`left:${x}%;top:-4%;width:${w}px;height:${w * 1.6}px;border-radius:2px;background:${cols[k % cols.length]}`, [{transform: 'translate(0,0) rotate(0)'}, {transform: `translate(${rnd(-80, 80)}px,${rnd(80, 105)}vh) rotate(${rnd(360, 900)}deg)`}], {duration: rnd(1.6, 2.6) * 1000, delay: rnd(0, .5) * 1000, easing: 'cubic-bezier(.3,.1,.6,1)'}]; }); },
    firework: (i, o, d) => { burst(50, 30, '#ffe08a', 1); overlay('inset:0;background:radial-gradient(circle at 50% 30%,#fff3c8,#0000 60%)', [{opacity: 0}, {opacity: .85, offset: .18}, {opacity: 0}], {duration: d * 1000}); showIn(i, d, 0, 1, .15, .45); later(.5, () => burst(25, 22, '#ff8ab0', .8)); later(.8, () => burst(76, 26, '#8ad8ff', .8)); },
    warm: (i, o, d) => { overlay('inset:-10%;mix-blend-mode:screen;background:radial-gradient(closest-side,#ffb45a,#0000)', [{opacity: 0}, {opacity: .7, offset: .5}, {opacity: 0}], {duration: d * 1000, easing: 'ease-in-out'}); anim(i, [{opacity: 0}, {opacity: 1}], {duration: d * 1000, easing: IO}); }
  };
  function inner(node, x, i) {
    const dur = (lens[i] + (SH[i + 1]?.tin.d || 1.4) + .3) * 1000;
    node.querySelectorAll('.pic').forEach(p => { p.style.transformOrigin = x.o || '50% 50%'; if (x.grade) p.style.filter = x.grade; });
    if (!calm()) node.querySelectorAll('.pic').forEach(p => anim(p, [{transform: tf(x.cam[0])}, {transform: tf(x.cam[1])}], {duration: dur, easing: lens[i] < 3 ? 'linear' : IO}));
    if (x.kind === 'clouds') { anim(node.querySelector('.cloud.l'), [{transform: 'translateX(12%) scale(1.3)', opacity: .95}, {transform: 'translateX(-85%) scale(1.7)', opacity: 0}], {duration: 5600, easing: 'ease-in'}); anim(node.querySelector('.cloud.r'), [{transform: 'translateX(-12%) scale(1.3)', opacity: .95}, {transform: 'translateX(85%) scale(1.7)', opacity: 0}], {duration: 5600, easing: 'ease-in'}); }
    if (x.kind === 'sea') node.querySelectorAll('.fleet img').forEach((im, k) => { const [x0, y0, x1, y1] = im.dataset.m.split(',').map(Number), f = im.dataset.f || 1; anim(im, [{transform: `translate(${x0}vw,${y0}vh) scaleX(${f})`}, {transform: `translate(${x1}vw,${y1}vh) scaleX(${f})`}], {duration: dur, delay: k * 120, easing: IO}); });
    if (x.kind === 'grow') { const g = lens[i] / 7; anim(node.querySelector('.p2'), [{opacity: 0}, {opacity: 1}], {duration: 1100, delay: 2100 * g, easing: IO}); anim(node.querySelector('.p3'), [{opacity: 0}, {opacity: 1}], {duration: 1100, delay: 4300 * g, easing: IO}); anim(node.querySelector('.tint'), [{opacity: 0}, {opacity: 1}], {duration: 6500 * g, easing: 'linear'}); }
    if (x.again && !calm()) later(x.again, () => { overlay('inset:0;background:#eef4ff', [{opacity: 0}, {opacity: .7, offset: .1}, {opacity: 0, offset: .3}, {opacity: .35, offset: .4}, {opacity: 0}], {duration: 700}); shake(node.firstChild, .5); });
    if (x.kind === 'title') {
      if (!calm()) [[1, 28, 26, '#ffe08a'], [2.1, 72, 22, '#8ad8ff'], [3.2, 40, 18, '#ff8ab0'], [4.4, 62, 30, '#ffe08a']].forEach(([t, bx, by, c]) => later(t, () => burst(bx, by, c, 1)));
      later(2.6, () => anim(node.querySelector('.endlogo'), [{opacity: 0, transform: 'scale(2.2)'}, {opacity: 1, transform: 'scale(.94)', offset: .7}, {opacity: 1, transform: 'scale(1)'}], {duration: 900, easing: 'cubic-bezier(.2,1.2,.4,1)'}));
    }
  }
  const textDelay = x => Math.min(.6, x.tin.d * .5);
  function setText(node, text, delay, i) {
    if (text == null) return;
    later(0, () => anim(node, [{opacity: getComputedStyle(node).opacity}, {opacity: 0, transform: 'translateX(-50%) translateY(-6px)'}], {duration: 280, easing: 'ease-in'}));
    if (text) later(delay, () => { node.textContent = text; anim(node, [{opacity: 0, transform: 'translateX(-50%) translateY(10px)'}, {opacity: 1, transform: 'translateX(-50%) translateY(0)'}], {duration: 700, easing: OUT}); if (node === line) speak(i); });
  }
  // ---------- 내레이션: 자막 한 줄 = 파일 하나(opening6.js의 voice). 없으면 브라우저 음성, 그것도 없으면 자막만 ----------
  function loadVoices() {
    const dir = OP.voiceDir || '';
    voices = SH.map(x => {
      if (!x.voice || !x.line) return null;
      const a = new Audio(); a.preload = 'auto';
      const v = {audio: a, ok: false, dur: 0};
      v.ready = new Promise(res => { a.addEventListener('loadedmetadata', () => { v.ok = true; v.dur = a.duration || 0; res(); }, {once: true}); a.addEventListener('error', () => res(), {once: true}); });
      a.src = dir + x.voice;
      return v;
    });
    const sd = OP.soundDir || '';
    tracks = (OP.music || []).map(m => Object.assign(clip(sd + m.file, true), {from: m.from, to: m.to}));
    effects = SH.map(x => x.sfx ? clip(sd + x.sfx, false) : null);
    single = OP.soundtrack ? clip(sd + OP.soundtrack, false, true) : null;
    const all = [...voices, ...tracks, ...effects, single].filter(Boolean).map(v => v.ready);
    return Promise.race([Promise.all(all), new Promise(r => setTimeout(r, 1500))]);
  }
  // whole=true: 파일 전체를 먼저 받아 메모리에서 재생한다(서버가 구간 요청을 몰라도 원하는 초로 건너뛸 수 있게)
  function clip(src, loop, whole) {
    const a = new Audio(); a.preload = 'auto'; a.loop = loop;
    const v = {audio: a, ok: false, dur: 0};
    v.ready = new Promise(res => { a.addEventListener('loadedmetadata', () => { v.ok = true; v.dur = a.duration || 0; res(); }, {once: true}); a.addEventListener('error', () => res(), {once: true}); });
    if (!whole) { a.src = src; return v; }
    a.addEventListener('error', () => { v.bad = true; }, {once: true});
    fetch(src).then(r => r.ok ? r.blob() : Promise.reject()).then(bl => { a.src = URL.createObjectURL(bl); }, () => a.dispatchEvent(new Event('error')));
    return v;
  }
  // 소리 크기를 ms 동안 부드럽게(HTMLAudio에는 램프가 없어서 직접)
  function fadeTo(a, target, ms, then) {
    clearInterval(a._fade); const from = a.volume, t0 = performance.now();
    if (ms <= 0) { a.volume = target; then?.(); return; }
    a._fade = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (target - from) * k)); if (k >= 1) { clearInterval(a._fade); then?.(); } }, 30);
  }
  // 파트가 바뀌면 앞 음악은 1.4초 동안 줄이고 새 음악은 1초 동안 키운다
  function musicAt(i) {
    if (single && !single.bad) {
      // 한 파일: 첫 컷에서 시계를 잡고, 아직 덜 받았으면 다 받는 대로 그 시각부터 튼다
      if (i === 0) { nowTrack = single; single.t0 = performance.now(); if (single.ok) playSingle(); else single.ready.then(() => { if (nowTrack === single) playSingle(); }); }
      return;
    }
    const t = tracks.find(t => t.from === i); if (!t) return;
    const old = nowTrack; nowTrack = t;
    if (old?.ok) fadeTo(old.audio, 0, 1400, () => old.audio.pause());
    if (!t.ok || !S.voice) return;
    t.audio.currentTime = 0; t.audio.volume = 0; t.audio.play().catch(() => {});
    fadeTo(t.audio, level(t), 1000);
  }
  // 영상 시작 뒤 흐른 시간에 맞춰 튼다. 재생이 실제로 시작되기까지 걸린 틈(0.3~0.5초)도 'playing'에서 다시 맞춘다.
  function playSingle() {
    const a = single.audio; if (!single.ok || !S.voice || !cine?.classList.contains('on')) return;
    const at = () => (performance.now() - single.t0) / 1000;
    if (at() >= single.dur) return;
    a.addEventListener('playing', () => { if (Math.abs(a.currentTime - at()) > .08) a.currentTime = at(); }, {once: true});
    a.currentTime = at(); a.volume = 0; a.play().catch(() => {}); fadeTo(a, level(single), 600);
    // 시작 직후 브라우저가 늦게 따라오는 만큼을 1초·3초 뒤에 한 번 더 맞춘다
    for (const t of [1, 3]) later(t, () => { if (!a.paused && Math.abs(a.currentTime - at()) > .1) a.currentTime = at(); });
  }
  function sfxAt(i) {
    const e = effects[i]; if (!e?.ok || !S.voice) return;
    // 사운드트랙(한 파일)과 함께 틀지는 opening6.js의 sfxWithTrack, 빼는 효과음은 sfxOff. sfx-demo.html은 SFXO.pick으로 덮어쓴다.
    const allow = SFXO.enabled ?? (OP.sfxWithTrack !== false || !(single && !single.bad));
    const pick = SFXO.pick || (i => !(OP.sfxOff || []).includes(SH[i].sfx));
    if (!allow || !pick(i)) return;
    later(SH[i].sfxAt || 0, () => { if (!S.voice) return; e.audio.currentTime = 0; e.audio.volume = VOL.sfx; e.audio.play().catch(() => {}); mark(i, e); });
    later(lens[i] + .8, () => { if (!e.audio.paused) fadeTo(e.audio, 0, 900, () => e.audio.pause()); });   // 긴 효과음은 컷이 끝나면 잦아든다
  }
  // 지금 어떤 효과음이 나는지 알린다(데모용): 왼쪽 아래 빨간 표시 + onPlay 콜백
  function mark(i, e) {
    const name = (OP.sfxNames || {})[SH[i].sfx] || SH[i].sfx, dur = Math.min(e.dur || 2, lens[i] + .8);
    SFXO.onPlay?.(i, name, dur);
    if (!SFXO.mark) return;
    let box = cine.querySelector('.sfx-now'); if (!box) { box = document.createElement('div'); box.className = 'sfx-now'; cine.append(box); }
    const chip = document.createElement('span'); chip.textContent = `🔊 ${name}`; box.append(chip);
    anim(chip, [{opacity: 0, transform: 'translateX(-12px)'}, {opacity: 1, transform: 'none', offset: .06}, {opacity: 1, offset: .85}, {opacity: 0}], {duration: dur * 1000, easing: 'linear'}).onfinish = () => chip.remove();
  }
  // 내레이션이 나오는 동안 음악을 낮춘다
  function duck(on) { ducked = on; if (nowTrack?.ok && !nowTrack.audio.paused) fadeTo(nowTrack.audio, level(nowTrack), on ? 250 : 700); }
  function quiet(ms = 0) {
    for (const t of [...tracks, single]) if (t?.ok && !t.audio.paused) fadeTo(t.audio, 0, ms, () => t.audio.pause());
    for (const e of effects) if (e?.ok && !e.audio.paused) fadeTo(e.audio, 0, ms, () => e.audio.pause());
  }
  // 녹음이 자막 구간보다 길면 그 구간의 마지막 컷을 늘린다(다음 자막이 녹음을 끊지 않게)
  function fitLengths() {
    lens = SH.map(x => x.len);
    SH.forEach((x, i) => {
      const v = voices[i]; if (!x.line || !v?.ok) return;
      let j = i + 1; while (j < SH.length && !SH[j].line) j++;
      const span = lens.slice(i, j).reduce((a, b) => a + b, 0), need = textDelay(x) + v.dur + .5;
      if (need > span) lens[j - 1] += need - span;
    });
  }
  function hush() { if (speaking) { speaking.pause(); speaking = null; } if ('speechSynthesis' in window) speechSynthesis.cancel(); duck(false); }
  function speak(i) {
    if (!S.voice) return;
    hush();
    const v = voices[i];
    if (v?.ok) { speaking = v.audio; duck(true); v.audio.onended = () => { if (speaking === v.audio) { speaking = null; duck(false); } }; v.audio.currentTime = 0; v.audio.play().catch(() => {}); return; }
    if (!('speechSynthesis' in window)) return;
    const ko = speechSynthesis.getVoices().find(x => x.lang.startsWith('ko')); if (!ko) return;
    const u = new SpeechSynthesisUtterance(SH[i].line); u.voice = ko; u.lang = 'ko-KR'; u.rate = OP.rate || .9; u.pitch = .9; u.onend = () => duck(false); duck(true); speechSynthesis.speak(u);
  }
  async function playOpening(after) {
    ensureCine(); stopAll(); done = after; nowTrack = null; ducked = false;
    cine.style.opacity = 1; cine.classList.add('on');
    const wait = Object.assign(document.createElement('p'), {className: 'loading', textContent: '영상을 준비하고 있어요…'}); cine.append(wait);
    await loadVoices(); wait.remove();
    if (!cine.classList.contains('on')) return;   // 준비 중에 건너뛰었다
    fitLengths();
    const total = lens.reduce((a, b) => a + b, 0) + 2.6;
    cine.style.setProperty('--total', total + 's'); cine.classList.remove('on'); void cine.offsetWidth; cine.classList.add('on');
    cine.querySelector('[data-c="skip"]').focus({preventScroll: true});
    let t = 0;
    SH.forEach((x, i) => {
      later(t, () => {
        const node = shots[i], prev = shots[i - 1];
        node.style.zIndex = i + 1; node.style.visibility = 'visible';
        inner(node, x, i); musicAt(i); sfxAt(i);
        (calm() ? TRANS.dissolve : TRANS[x.tin.t])(node, prev, x.tin.d, x.tin);
        if (prev) later(x.tin.d * 1.45 + .1, () => { prev.style.visibility = 'hidden'; prev.getAnimations({subtree: true}).forEach(a => a.cancel()); });
        if (x.ch != null) setText(chapter, x.ch, .35);
        if (x.line) setText(line, x.line, textDelay(x), i);
      });
      t += lens[i];
    });
    later(t - .4, () => overlay('inset:-30%;mix-blend-mode:screen;background:radial-gradient(closest-side,#fff6d8,#ffd25a88 40%,#0000)', [{opacity: 0, transform: 'scale(.4)'}, {opacity: 1, transform: 'scale(1.3)', offset: .55}, {opacity: 0, transform: 'scale(1.6)'}], {duration: 1600, easing: 'ease-in-out'}));
    later(t + .5, () => endCine(true));
  }
  function stopAll() {
    timers.forEach(clearTimeout); timers = []; anims.forEach(a => a.cancel()); anims = []; hush(); quiet();
    if (!cine) return;
    fx.innerHTML = ''; cine.querySelector('.loading')?.remove(); cine.querySelector('.sfx-now')?.remove();
    shots.forEach(s => { s.style.visibility = 'hidden'; s.getAnimations({subtree: true}).forEach(a => a.cancel()); }); line.style.opacity = 0; chapter.style.opacity = 0;
  }
  // soft: 끝까지 봤을 때는 천천히 걷히고, 건너뛰기는 빠르게. 어느 쪽이든 '봄'으로 적어 다음부터는 바로 나라 고르기.
  function endCine(soft) {
    if (!cine?.classList.contains('on')) return;
    store.set(SEEN, '1'); hush(); quiet(soft ? 1300 : 400);
    timers.forEach(clearTimeout); timers = [];
    const d = done; done = null;
    const fade = cine.animate([{opacity: 1}, {opacity: 0}], {duration: soft ? 1300 : 450, easing: 'ease-in-out', fill: 'forwards'});
    if (d) setTimeout(d, soft ? 500 : 150); else setTimeout(() => el.querySelector('.play')?.focus(), 500);
    fade.onfinish = () => { stopAll(); cine.classList.remove('on'); fade.cancel(); };
  }
  let preloaded = false;
  function preload() { if (preloaded || el.hidden) return; preloaded = true; for (const x of SH) if (x.img) new Image().src = x.img; for (const f of ['map_archipelago', 'fog_1', 'fog_2', 'title']) new Image().src = `${A}${f}.webp`; }
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (cine?.classList.contains('on')) { e.stopPropagation(); endCine(false); }
    else if (!el.hidden && panel.classList.contains('on')) closePanel();
  }, true);

  window.TradeTitle = {
    init(h) { hooks = {...hooks, ...h}; },
    show, hide, playOpening,
    settings: () => ({...S}),
    settingRows: ROWS, settingValue: valueOf, setSetting: setValue,   // 7.7 게임 안 설정 창(⚙️)이 같은 줄·값을 쓴다
    set(k, v) { S[k] = v; save(); },
    sfx(o) { SFXO = {...o}; },   // 효과음 실험(sfx-demo.html)
    get visible() { return !el.hidden; }, get playing() { return !!cine?.classList.contains('on'); },
    peek: () => ({lens: [...lens], voices: voices.map(v => v && {ok: v.ok, dur: Math.round(v.dur * 10) / 10}), speaking: !!speaking && !speaking.paused,
      music: tracks.map(t => ({ok: t.ok, playing: !t.audio.paused, vol: Math.round(t.audio.volume * 100) / 100})),
      single: single && {ok: single.ok, playing: !single.audio.paused, vol: Math.round(single.audio.volume * 100) / 100, clock: single.t0 ? Math.round((performance.now() - single.t0) / 100) / 10 : 0, at: Math.round(single.audio.currentTime * 10) / 10}, sfx: effects.map(e => e && {ok: e.ok, played: e.audio.currentTime > 0, playing: !e.audio.paused})})   // 검사용
  };
})();
