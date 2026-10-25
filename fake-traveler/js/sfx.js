/* 사용자 동작 이후에만 만드는 작은 합성 효과음.
   음표: [주파수, 시작(초), 길이(초), 파형='triangle', 세기=.1, 끝 주파수(미끄러지기)] */
window.SFX = (() => {
  /* 7.4 녹음 효과음(../shared/sfx, CC0)이 어울리는 것은 파일로, 나머지(멜로디 신호음)는 아래 합성음 그대로 */
  const FILES = {tap: ['click.mp3', .6], pop: ['pop.mp3', .7], paper: ['paper.mp3', .8], card: ['card.mp3', .8], stamp: ['stamp.mp3', .8]};
  window.SfxFiles?.preload(Object.values(FILES).map(f => f[0]));
  let ctx, noise;
  const T = 'triangle', Q = 'square', W = 'sawtooth', S = 'sine';
  const notes = {
    tap: [[660, 0, .06, T, .08], [990, .02, .05, S, .04]],
    pop: [[520, 0, .08, S, .09, 880]],
    paper: [[180, 0, .09], [260, .08, .08]],
    objection: [[330, 0, .09], [440, .09, .09], [660, .18, .22]],
    wrong: [[155, 0, .12, W, .08], [110, .12, .18, W, .08]],
    crack: [[1100, 0, .035, W], [220, .035, .09, W], [70, .12, .12, W]],
    stamp: [[75, 0, .15]], star: [[740, 0, .08], [1100, .08, .10]],
    clear: [[392, 0, .12], [494, .12, .12], [587, .24, .12], [784, .36, .35]],
    /* 내가 고른 사람에게 표 꽝 */
    vote: [[98, 0, .18, S, .16, 60], [392, 0, .1, T, .06]],
    /* 결과 발표 전 두근두근 */
    drum: [[110, 0, .1, S, .12, 70], [110, .5, .1, S, .12, 70], [110, .75, .1, S, .14, 70], [110, .9, .1, S, .16, 70]],
    /* 진짜 여행자들이 라이어를 잡음: 짠짠짠 짜잔! */
    caught: [[523, 0, .12, Q, .04], [523, .13, .08, Q, .04], [523, .22, .08, Q, .04], [784, .32, .5, Q, .045],
      [523, .32, .8, T, .07], [659, .32, .8, T, .06], [784, .32, .8, T, .06], [1047, .62, .6, S, .07]],
    /* 라이어가 빠져나감: 살금살금 미끄러지듯 사라짐 */
    escaped: [[392, 0, .1, T, .08], [370, .14, .1, T, .08], [349, .28, .1, T, .08], [330, .42, .1, T, .08],
      [880, .6, .45, S, .06, 1760], [220, .6, .5, T, .06, 110]],
    /* 내가 라이어인데 들킴: 뿌-뿌-뿌-뿌우~ */
    busted: [[311, 0, .28, W, .05, 294], [294, .3, .28, W, .05, 277], [277, .6, .28, W, .05, 262], [262, .9, .9, W, .055, 220]],
    /* 내가 라이어인데 안 들킴: 히히 작전 성공 */
    sneak: [[330, 0, .08, Q, .035], [392, .1, .08, Q, .035], [494, .2, .08, Q, .035], [659, .3, .08, Q, .035],
      [587, .45, .08, Q, .035], [784, .55, .4, Q, .04], [392, .55, .5, T, .07], [494, .55, .5, T, .06]]
  };
  function play(name, enabled) {
    if (!enabled) return;
    if (FILES[name] && window.SfxFiles?.play(...FILES[name])) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      ctx ||= new Audio();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      if (name === 'card') {
        noise ||= (() => { const b = ctx.createBuffer(1, ctx.sampleRate * .15, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); return b; })();
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 2200; g.gain.value = .25;
        s.connect(f).connect(g).connect(ctx.destination); s.start(now);
        return;
      }
      for (const [hz, at, duration, wave = T, peak = .1, end] of notes[name] || notes.tap) {
        const osc = ctx.createOscillator(), gain = ctx.createGain(), t = now + at;
        osc.type = wave;
        osc.frequency.setValueAtTime(hz, t);
        if (end) osc.frequency.exponentialRampToValueAtTime(end, t + duration);
        gain.gain.setValueAtTime(.0001, t);
        gain.gain.exponentialRampToValueAtTime(peak, t + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + duration + .02);
      }
    } catch (_) { /* 소리를 지원하지 않아도 수사는 계속한다. */ }
  }
  return { play };
})();
