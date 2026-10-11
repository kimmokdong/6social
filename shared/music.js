/* 사회 게임 시리즈 공용 배경 음악 — 파일 없이 WebAudio 로 만드는 짧은 반복 곡.
   GameMusic.setEnabled(bool) 로 켜고 끄고, GameMusic.theme('이름' | null) 로 곡을 바꿔요.
   소리는 사용자가 한 번 누른 뒤에만 시작돼요(브라우저 규칙). */
window.GameMusic = (() => {
  let ctx, master, noise, timer = null, enabled = false, want = null, cur = null, step = 0, nextAt = 0;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const _ = null;
  /* 8분음표 32칸 = 4마디. chords: 마디별 화음(midi), bass: 칸별 베이스, mel: 칸별 멜로디 */
  const THEMES = {
    /* 삼권 스와이프: 밝고 씩씩한 행진 */
    civic: {
      bpm: 112, lead: 'triangle', leadGain: .05, leadLen: .9, padGain: .018, bassGain: .07, drums: 'march',
      chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
      bass: [48, _, 55, _, 48, _, 55, _, 45, _, 52, _, 45, _, 52, _, 41, _, 48, _, 41, _, 48, _, 43, _, 50, _, 43, _, 47, _],
      mel: [72, _, 76, 79, 76, _, 74, 72, 69, _, 72, 76, 74, 72, 71, _, 69, _, 72, 77, 76, 74, 72, _, 71, _, 74, 79, 77, 76, 74, _]
    },
    /* 삼권 스와이프 2절: 같은 분위기, 다른 선율 */
    civic2: {
      bpm: 112, lead: 'triangle', leadGain: .045, leadLen: .9, padGain: .018, bassGain: .07, drums: 'march',
      chords: [[53, 57, 60], [55, 59, 62], [60, 64, 67], [57, 60, 64]],
      bass: [41, _, 48, _, 41, _, 48, _, 43, _, 50, _, 43, _, 50, _, 48, _, 55, _, 48, _, 55, _, 45, _, 52, _, 45, _, 52, _],
      mel: [77, _, 76, _, 74, _, 72, _, 74, _, 76, 77, 79, _, _, _, 79, 77, 76, _, 72, _, 76, _, 76, _, 74, _, 72, _, _, _]
    },
    /* 라이어 여행단: 살금살금 장난스러운 탐정 */
    mystery: {
      bpm: 104, lead: 'square', leadGain: .022, leadLen: .45, padGain: .014, bassGain: .085, drums: 'tick', pluckBass: true,
      chords: [[57, 60, 64], [50, 53, 57], [52, 56, 59], [57, 60, 64]],
      bass: [45, _, 52, _, 48, _, 52, _, 38, _, 45, _, 41, _, 45, _, 40, _, 47, _, 44, _, 47, _, 45, _, 52, _, 45, 44, 43, 42],
      mel: [69, _, _, 72, _, 71, 69, _, 74, _, _, 77, _, 76, 74, _, 68, _, 71, _, 76, _, 74, 71, 69, _, 64, _, 69, _, _, _]
    },
    /* 라이어 투표: 두근두근 긴장 */
    suspense: {
      bpm: 88, lead: 'sine', leadGain: .04, leadLen: 1.6, padGain: .022, bassGain: .08, drums: 'heart',
      chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]],
      bass: [33, 33, 33, 33, 33, 33, 33, 33, 29, 29, 29, 29, 29, 29, 29, 29, 26, 26, 26, 26, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28],
      mel: [_, _, _, _, 76, _, _, _, _, _, _, _, 77, _, _, _, _, _, _, _, 74, _, _, _, _, _, _, _, 80, _, _, _]
    }
  };
  function init() {
    if (ctx) return true;
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return false;
    ctx = new A();
    const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 2600;
    master = ctx.createGain(); master.gain.value = 0;
    master.connect(warm).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * .3, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function tone(f, at, dur, type, peak, attack = .01) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, at);
    g.gain.linearRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(.0001, at + dur);
    o.connect(g).connect(master); o.start(at); o.stop(at + dur + .05);
  }
  function hit(at, dur, freq, peak, type = 'highpass') {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(peak, at); g.gain.exponentialRampToValueAtTime(.0001, at + dur);
    s.connect(f).connect(g).connect(master); s.start(at); s.stop(at + dur + .02);
  }
  function kick(at, peak) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, at); o.frequency.exponentialRampToValueAtTime(45, at + .12);
    g.gain.setValueAtTime(peak, at); g.gain.exponentialRampToValueAtTime(.0001, at + .18);
    o.connect(g).connect(master); o.start(at); o.stop(at + .2);
  }
  function play(t, i, at, len) {
    const bar = i >> 3, beat = i & 7;
    if (beat === 0) t.chords[bar].forEach(m => tone(hz(m), at, len * 8, 'sine', t.padGain, .25));
    if (t.bass[i] !== null) tone(hz(t.bass[i]), at, t.pluckBass ? len * .8 : len * 1.8, t.pluckBass ? 'triangle' : 'sine', t.bassGain);
    if (t.mel[i] !== null) tone(hz(t.mel[i]), at, len * 2 * t.leadLen, t.lead, t.leadGain);
    if (t.drums === 'march') { if (beat % 4 === 0) kick(at, .12); if (beat % 4 === 2) hit(at, .08, 1800, .05, 'bandpass'); if (beat % 2 === 1) hit(at, .03, 7000, .02); }
    if (t.drums === 'tick') { if (beat % 2 === 1) hit(at, .025, 6000, .03); if (beat === 0 || beat === 4) kick(at, .07); }
    if (t.drums === 'heart') { if (beat === 0 || beat === 1) kick(at, beat ? .08 : .13); }
  }
  function tick() {
    if (!cur) return;
    const t = THEMES[cur], len = 60 / t.bpm / 2;
    while (nextAt < ctx.currentTime + .3) {
      if (step % 8 === 0 && want !== cur) { switchNow(); if (!cur) return; return tick(); }
      play(t, step, nextAt, len);
      nextAt += len; step = (step + 1) % 32;
      /* 4마디가 끝나면 짝 곡(2절)이 있으면 번갈아 */
      if (step === 0 && THEMES[cur + '2'] && want === cur) { want = cur + '2'; }
      else if (step === 0 && cur.endsWith('2') && want === cur) want = cur.slice(0, -1);
    }
  }
  function switchNow() {
    cur = want; step = 0; nextAt = Math.max(nextAt, ctx.currentTime + .05);
    if (!cur) { clearInterval(timer); timer = null; }
  }
  function apply() {
    if (!enabled || !want) {
      if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, .25);
      if (timer) setTimeout(() => { if (!enabled || !want) { clearInterval(timer); timer = null; cur = null; } }, 900);
      return;
    }
    try {
      if (!init()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      master.gain.setTargetAtTime(1, ctx.currentTime, .4);
      if (!timer) { cur = want; step = 0; nextAt = ctx.currentTime + .1; timer = setInterval(tick, 90); }
    } catch (_) { /* 소리가 막혀도 게임은 계속 */ }
  }
  /* 첫 터치 때 다시 시도(자동 재생 제한), 다른 탭으로 가면 조용히 */
  addEventListener('pointerdown', () => { if (enabled && want && ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); else if (enabled && want && !ctx) apply(); }, true);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else if (enabled && want) ctx.resume().catch(() => {}); });
  return {
    setEnabled(v) { enabled = !!v; apply(); },
    theme(name) { const base = name && THEMES[name] ? name : null; if (base === want || (base && want === base + '2')) return; want = base; apply(); },
    get playing() { return !!(enabled && cur); }
  };
})();
