/* 사회 게임 공용: 녹음 효과음 파일(shared/sfx/*.mp3, 모두 CC0 — shared/sfx/CREDITS.txt).
   게임의 sfx.js가 SfxFiles.play('파일 이름', 크기)로 부른다. 파일을 불러 두었으면 틀고 true, 아직이면 false → 원래 합성음.
   SfxFiles.preload([...])는 첫 터치·클릭 때 미리 불러 둔다(브라우저 규칙상 그 전에는 소리를 만들지 않음). */
window.SfxFiles = (() => {
  const DIR = (document.currentScript?.src || '').replace(/[^/]*$/, '') + 'sfx/';
  let ctx = null; const bufs = {}, want = new Set();
  function boot() {
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; try { ctx = new A(); } catch { return false; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    for (const f of want) load(f);
    return true;
  }
  function load(f) {
    if (bufs[f] !== undefined) return; bufs[f] = null;
    fetch(DIR + f).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(a => new Promise((ok, no) => ctx.decodeAudioData(a, ok, no))).then(b => { bufs[f] = b; }).catch(() => { bufs[f] = false; });
  }
  for (const t of ['pointerdown', 'keydown', 'touchstart']) addEventListener(t, boot, {capture: true, passive: true});
  return {
    preload(files) { files.filter(Boolean).forEach(f => want.add(f)); if (ctx) boot(); },
    play(f, vol = .8) {
      if (!f || !boot() || !bufs[f]) { if (f && ctx) load(f); return false; }
      const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufs[f]; g.gain.value = vol; s.connect(g).connect(ctx.destination); s.start(); return true;
    }
  };
})();
