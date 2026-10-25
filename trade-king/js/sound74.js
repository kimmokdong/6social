/* 무역왕 7.4 게임 배경음악·효과음(녹음 파일, 모두 CC0 — shared-art/trade/v6/sound/ui/CREDITS.txt).
   효과음 바꾸기: sfx-demo.html '🎮 게임 효과음 고르기'에서 듣고 고른 뒤 [설정 복사] → 아래 pick·gain에 붙여 넣기.
   배경음악 바꾸기: Suno 곡을 sound 폴더에 넣고 music의 이름만 바꾸기(SUNO-bgm74.md). null이면 그 장면은 평소 곡을 작게. */
window.TradeSound74 = {
  dir: '../shared-art/trade/v6/sound/',
  music: {sail: 'bgm_sail.mp3', storm: null, end: 'bgm_theme.mp3'},   // sail = Suno 평소 항해 곡(2026-10-25, 원본 sound/src). 위기 곡이 오면 storm에 이름을
  musicLevel: {small: .18, normal: .32, big: .5}, sfxVolume: .8, duck: .45,
  // 고른 후보(0~2)와 소리 크기(0~1.5)
  pick: {click: 0, pickup: 1, hover: 2, contract: 0, cancel: 2, depart: 1, arrive: 1, settle: 0, crisis: 1, problem: 2, opportunity: 0, meeting: 0, buy: 2, error: 2, page: 1, rankup: 0, end: 0},   // 2026-10-25 사용자가 고름
  gain: {click: .6, pickup: .8, hover: .35, contract: .9, cancel: .6, depart: .7, arrive: .7, settle: .7, crisis: .9, problem: .8, opportunity: .8, meeting: .7, buy: .8, error: .6, page: .6, rankup: .8, end: .8},
  events: [
    ['click', '버튼 누르기', ['ui/click.mp3', 'ui/kenney-interface-click-001.mp3', 'ui/kenney-interface-select-003.mp3']],
    ['pickup', '배 집어 들기', ['ui/kenney-interface-pluck-001.mp3', 'ui/fs-447910-plop.mp3', 'ui/pop.mp3']],
    ['hover', '끄는 중 섬 위에 올리기', ['ui/tick.mp3', 'ui/fs528561.mp3', 'ui/kenney-ui-rollover2.mp3']],
    ['contract', '계약하기', ['ui/stamp1.mp3', 'ui/kenney-interface-confirmation-001.mp3', 'ui/kenney-interface-drop-002.mp3']],
    ['cancel', '취소·되돌리기', ['ui/kenney-interface-toggle-002.mp3', 'ui/kenney-digital-pepsound2.mp3', 'ui/kenney-ui-rollover1.mp3']],
    ['depart', '배 출항', ['ui/fs-127197-fast-simple-chop-5-aif.mp3', 'ui/whoosh.mp3', 'sfx_horn.mp3']],
    ['arrive', '배 도착·판매', ['ui/kenney-interface-confirmation-002.mp3', 'ui/fs-571513-soft-notifications-bell-ding-d.mp3', 'ui/kenney-interface-glass-001.mp3']],
    ['settle', '3달 정산', ['sfx_bell.mp3', 'ui/kenney-digital-threetone1.mp3', 'ui/kenney-interface-confirmation-003.mp3']],
    ['crisis', '위기 사건', ['ui/kenney-impact-impactsoft-heavy-000.mp3', 'sfx_thunder.mp3', 'ui/fs524817.mp3']],
    ['problem', '무역 문제 사건', ['ui/kenney-digital-twotone1.mp3', 'ui/kenney-interface-bong-001.mp3', 'ui/fs745291.mp3']],
    ['opportunity', '기회 사건', ['sfx_sparkle.mp3', 'ui/kenney-interface-maximize-001.mp3', 'ui/kenney-digital-threetone2.mp3']],
    ['meeting', '발전 회의 열림', ['ui/kenney-interface-glass-002.mp3', 'sfx_crowd.mp3', 'ui/kenney-interface-maximize-002.mp3']],
    ['buy', '카드 사기', ['sfx_crates.mp3', 'ui/kenney-interface-drop-003.mp3', 'ui/stamp1.mp3']],
    ['error', '안 돼요(돈 부족·막힌 단추)', ['ui/kenney-interface-glitch-002.mp3', 'ui/kenney-digital-pepsound3.mp3', 'ui/kenney-ui-rollover4.mp3']],
    ['page', '책 넘기기·탭', ['ui/fs393811.mp3', 'ui/fs830856.mp3', 'ui/kenney-interface-select-001.mp3']],
    ['rankup', '순위·칭호 오름', ['sfx_fanfare.mp3', 'ui/kenney-interface-confirmation-003.mp3', 'sfx_sparkle.mp3']],
    ['end', '게임 끝(결과 책)', ['sfx_cheer.mp3', 'sfx_fanfare.mp3', 'sfx_bell.mp3']]]
};

/* 소리 장치: TradeAudio.sfx(id) · scene('sail'|'storm'|'end'|null) · duck(이유, 켬) · set({music, musicLevel, sfx}).
   Web Audio(GainNode)로 크기를 다룬다 — 아이패드 사파리는 audio.volume을 무시하기 때문. 첫 터치·클릭 전에는 소리를 만들지 않는다. */
window.TradeAudio = (() => {
  const C = window.TradeSound74, XF = 2.5, FADE = 1.5;
  const ev = Object.fromEntries(C.events.map(([id, , files]) => [id, files]));
  const fileOf = id => ev[id]?.[C.pick[id] || 0] || ev[id]?.[0];
  const MIN = {hover: 120, arrive: 300, settle: 400, click: 50};
  let ctx = null, musicBus, duckBus, sfxBus, on = {music: true, sfx: true}, level = 'normal';
  const bufs = {}, lastAt = {}, ducks = new Set(), log = [];
  let want = null, cur = null, hidden = false, lastSfx = 0;
  const now = () => ctx.currentTime;
  const ramp = (p, v, t = .4) => { p.cancelScheduledValues(now()); p.setValueAtTime(p.value, now()); p.linearRampToValueAtTime(v, now() + t); };
  function boot() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    try { ctx = new A(); } catch { return false; }
    musicBus = ctx.createGain(); duckBus = ctx.createGain(); sfxBus = ctx.createGain();
    musicBus.gain.value = on.music ? C.musicLevel[level] : 0; sfxBus.gain.value = C.sfxVolume;
    duckBus.connect(musicBus).connect(ctx.destination); sfxBus.connect(ctx.destination);
    if (want) scene(want, true);
    return true;
  }
  // 첫 사용자 동작에서 시작(브라우저 자동 재생 규칙)
  for (const t of ['pointerdown', 'keydown', 'touchstart']) addEventListener(t, () => boot(), {capture: true, passive: true});
  function load(file) {
    if (!bufs[file]) bufs[file] = fetch(C.dir + file).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).then(a => new Promise((ok, no) => ctx.decodeAudioData(a, ok, no))).catch(() => null);
    return bufs[file];
  }
  function sfx(id) {
    const file = fileOf(id), t = performance.now();
    if (!file || !on.sfx || t - (lastAt[id] || 0) < (MIN[id] || 60)) return;
    lastAt[id] = t; if (id !== 'click') lastSfx = t;
    log.push({id, file, t: Math.round(t)}); if (log.length > 200) log.shift();
    if (!ctx || ctx.state !== 'running' && !boot()) return;
    load(file).then(b => { if (!b) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = C.gain[id] ?? .8; s.connect(g).connect(sfxBus); s.start(); });
  }
  // 버튼 누르기: 같은 동작에 더 구체적인 소리가 나면 딸깍은 생략
  function click() { const t = performance.now(); setTimeout(() => { if (lastSfx < t) sfx('click'); }, 0); }

  // ---------- 배경음악: 장면마다 오디오 두 개를 번갈아 2.5초 겹치며 반복(끊김 없는 반복) ----------
  const slots = {};
  function slot(name) {
    const file = C.music[name]; if (!file) return null;
    if (slots[name]) return slots[name];
    const g = ctx.createGain(); g.gain.value = 0; g.connect(duckBus);
    const pair = [0, 1].map(() => { const a = new Audio(C.dir + file); a.preload = 'auto'; const n = ctx.createGain(); n.gain.value = 0; ctx.createMediaElementSource(a).connect(n).connect(g); return {a, n}; });
    return slots[name] = {name, g, pair, k: 0, loop: name !== 'end'};
  }
  const play = v => v.a.play().catch(() => {});
  function startSlot(s) { const v = s.pair[s.k]; v.a.currentTime = 0; v.n.gain.value = 1; s.pair[1 - s.k].n.gain.value = 0; s.pair[1 - s.k].a.pause(); if (!hidden) play(v); }
  function stopSlot(s) { ramp(s.g.gain, 0, FADE); setTimeout(() => { if (cur !== s) s.pair.forEach(v => v.a.pause()); }, FADE * 1000 + 50); }
  function scene(name, force) {
    const real = name && (C.music[name] ? name : name === 'storm' ? 'sail' : null);   // 위기 곡이 없으면 평소 곡을 그대로(작게)
    want = name;
    if (name === 'storm' && real === 'sail') ducks.add('storm'); else ducks.delete('storm');
    applyDuck();
    if (!ctx) return;
    const s = real && slot(real);
    if (s === cur && !force) return;
    if (cur && cur !== s) stopSlot(cur);
    cur = s; if (!s) return;
    if (name === 'end' || !s.pair.some(v => !v.a.paused)) startSlot(s);
    ramp(s.g.gain, 1, FADE);
  }
  setInterval(() => {
    if (!cur || hidden) return;
    const v = cur.pair[cur.k], d = v.a.duration;
    if (!cur.loop || !d || v.a.paused || v.a.currentTime < d - XF) return;
    const w = cur.pair[1 - cur.k]; w.a.currentTime = 0; play(w); ramp(w.n.gain, 1, XF); ramp(v.n.gain, 0, XF); cur.k = 1 - cur.k;
    setTimeout(() => v.a.pause(), XF * 1000 + 100);
  }, 200);
  function applyDuck() { if (ctx) ramp(duckBus.gain, ducks.size ? C.duck : 1, .4); }
  function duck(why, yes) { yes ? ducks.add(why) : ducks.delete(why); applyDuck(); }
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden; if (!cur) return;
    if (hidden) cur.pair.forEach(v => v.a.pause()); else play(cur.pair[cur.k]);
  });
  function set(o) {
    if ('music' in o) on.music = !!o.music; if ('sfx' in o) on.sfx = !!o.sfx; if (o.musicLevel) level = C.musicLevel[o.musicLevel] ? o.musicLevel : 'normal';
    if (ctx) ramp(musicBus.gain, on.music ? C.musicLevel[level] : 0, .3);
  }
  const state = () => ({ctx: ctx?.state || null, want, cur: cur?.name || null, playing: !!cur && cur.pair.some(v => !v.a.paused), time: cur ? cur.pair[cur.k].a.currentTime : 0,
    music: on.music, sfx: on.sfx, level, duck: [...ducks], duckGain: ctx ? +duckBus.gain.value.toFixed(2) : 1, musicGain: ctx ? +musicBus.gain.value.toFixed(2) : 0});
  const seek = t => { if (cur) { const a = cur.pair[cur.k].a; a.currentTime = t < 0 ? a.duration + t : t; } };   // 검사용: 반복 이음새 확인
  const voices = () => cur ? cur.pair.map(v => ({t: +v.a.currentTime.toFixed(1), on: !v.a.paused, g: +v.n.gain.value.toFixed(2)})) : [];
  return {sfx, click, scene, duck, set, boot, state, log, fileOf, seek, voices};
})();
