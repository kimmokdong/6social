/* 교실에서는 조용하게 시작해요. 소리는 사용자의 첫 조작 뒤에만 생성합니다. */
window.SamgwonSfx = (() => {
  /* 7.4 녹음 효과음(../shared/sfx, CC0)이 어울리는 것은 파일로, 나머지(멜로디 신호음)는 아래 합성음 그대로 */
  const FILES = {tick: ['click.mp3', .6], select: ['select.mp3', .7], swipe: ['swipe.mp3', .7], flip: ['paper.mp3', .8], stamp: ['stamp.mp3', .8], power: ['sparkle.mp3', .7]};
  window.SfxFiles?.preload(Object.values(FILES).map(f => f[0]));
  let context, enabled = false;
  const tunes = {
    tick: [[520, 0, .045]], flip: [[320, 0, .07], [480, .04, .08]],
    up: [[620, 0, .08], [820, .06, .1]], down: [[300, 0, .08], [180, .06, .1]],
    power: [[523, 0, .14], [659, .1, .14], [784, .2, .25]],
    newspaper: [[392, 0, .15], [523, .12, .15], [659, .24, .15], [784, .36, .3]],
    /* 역할 고르기·임기 시작 */
    select: [[523, 0, .09, 'triangle'], [784, .07, .14, 'triangle']],
    begin: [[392, 0, .5, 'triangle', .07], [523, 0, .5, 'triangle', .06], [659, 0, .5, 'triangle', .05], [784, .18, .5, 'sine', .07]],
    /* 엔딩: 전설(팡파르) · 완주(밝게) · 게이지 바닥(쓸쓸하게) · 스캔들(긴장) */
    legend: [[523, 0, .14, 'square', .035], [523, .14, .1, 'square', .035], [523, .26, .1, 'square', .035], [698, .38, .45, 'square', .04],
      [523, .38, .9, 'triangle', .06], [659, .38, .9, 'triangle', .05], [880, .38, .9, 'triangle', .05], [1047, .8, .7, 'sine', .06], [784, .8, .7, 'triangle', .05]],
    complete: [[523, 0, .16, 'triangle'], [659, .13, .16, 'triangle'], [784, .26, .16, 'triangle'], [1047, .39, .5, 'triangle'], [659, .39, .5, 'sine', .05]],
    fail: [[392, 0, .28, 'triangle'], [370, .26, .28, 'triangle'], [349, .52, .28, 'triangle'], [311, .78, .8, 'triangle', .07], [233, .78, .8, 'sine', .05]],
    scandal: [[220, 0, .18, 'sawtooth', .03], [233, .18, .18, 'sawtooth', .03], [220, .36, .18, 'sawtooth', .03], [174, .54, .7, 'sawtooth', .035], [349, .54, .7, 'triangle', .04]]
  };
  function play(name) {
    if (!enabled) return;
    if (FILES[name] && window.SfxFiles?.play(...FILES[name])) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      context ||= new Audio();
      if (context.state === 'suspended') context.resume().catch(() => {});
      const start = context.currentTime;
      if (name === 'swipe' || name === 'stamp') {
        const duration = name === 'stamp' ? .2 : .16;
        const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
        const values = buffer.getChannelData(0);
        for (let i = 0; i < values.length; i++) values[i] = (Math.random() * 2 - 1) * (1 - i / values.length);
        const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
        source.buffer = buffer;
        filter.type = 'lowpass'; filter.frequency.value = name === 'stamp' ? 160 : 1500;
        gain.gain.value = .15;
        source.connect(filter).connect(gain).connect(context.destination);
        source.start(start); source.stop(start + duration);
        return;
      }
      for (const [frequency, offset, duration, wave = 'sine', peak = .09] of tunes[name] || tunes.tick) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = wave; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001, start + offset);
        gain.gain.exponentialRampToValueAtTime(peak, start + offset + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, start + offset + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start + offset); oscillator.stop(start + offset + duration + .02);
      }
    } catch (_) { /* 오디오가 차단된 환경에서도 게임은 계속됩니다. */ }
  }
  return { play, setEnabled(value) { enabled = !!value; } };
})();
