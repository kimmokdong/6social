/* 교실에서는 조용하게 시작해요(기본 꺼짐). 소리는 첫 조작 뒤에만 만듭니다. */
window.TteokSfx = (() => {
  /* 7.4 녹음 효과음(../shared/sfx, CC0)이 어울리는 것은 파일로, 나머지(멜로디 신호음)는 아래 합성음 그대로 */
  const FILES = {tick: ['click.mp3', .6], whoosh: ['swipe.mp3', .7], event: ['popup.mp3', .7]};
  window.SfxFiles?.preload(Object.values(FILES).map(f => f[0]));
  let context, enabled = false;
  const tunes = {
    tick: [[520, 0, .045]],
    place: [[196, 0, .09], [262, .05, .1]],
    undo: [[392, 0, .06], [262, .05, .08]],
    coin: [[988, 0, .06], [1319, .05, .12]],
    up: [[620, 0, .08], [820, .06, .1]],
    down: [[300, 0, .08], [180, .06, .1]],
    event: [[440, 0, .1], [554, .08, .12]],
    paper: [[392, 0, .15], [523, .12, .15], [659, .24, .15], [784, .36, .3]],
    fanfare: [[523, 0, .15], [659, .14, .15], [784, .28, .15], [1047, .42, .45]],
    no: [[220, 0, .12], [196, .1, .14]]
  };
  function noise(duration, cutoff) {
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate), v = buffer.getChannelData(0);
    for (let i = 0; i < v.length; i++) v[i] = (Math.random() * 2 - 1) * (1 - i / v.length);
    const src = context.createBufferSource(), f = context.createBiquadFilter(), g = context.createGain();
    src.buffer = buffer; f.type = 'lowpass'; f.frequency.value = cutoff; g.gain.value = .14;
    src.connect(f).connect(g).connect(context.destination); src.start(); src.stop(context.currentTime + duration);
  }
  function play(name) {
    if (!enabled) return;
    if (FILES[name] && window.SfxFiles?.play(...FILES[name])) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      context ||= new Audio();
      if (context.state === 'suspended') context.resume().catch(() => {});
      if (name === 'whoosh') return noise(.35, 900);
      if (name === 'thud') return noise(.18, 170);
      const start = context.currentTime;
      for (const [freq, offset, duration] of tunes[name] || tunes.tick) {
        const o = context.createOscillator(), g = context.createGain();
        o.type = name === 'coin' ? 'triangle' : 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(.0001, start + offset);
        g.gain.exponentialRampToValueAtTime(.09, start + offset + .008);
        g.gain.exponentialRampToValueAtTime(.0001, start + offset + duration);
        o.connect(g).connect(context.destination);
        o.start(start + offset); o.stop(start + offset + duration + .02);
      }
    } catch (_) { /* 오디오가 막힌 환경에서도 게임은 계속됩니다. */ }
  }
  return { play, setEnabled(v) { enabled = !!v; } };
})();
