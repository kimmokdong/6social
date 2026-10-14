/* 라이어 여행단과 도감이 함께 사용하는 기후 증거 판정. */
(() => {
  'use strict';
  const D = window.FAKE, B = window.FAKE_BANK;
  function verdict(ev, claim) {
    const r = B.rules[claim];
    for (const tag of ev.tags) {
      if (r.allowed.includes(tag)) continue;
      const t = B.tags[tag], cat = t.cat === 'life' ? 'land' : t.cat;
      return { v: 'lie', why: t.why ? t.why.replaceAll('{T}', r.topic) : t.cat === 'animal' ? `${t.name} ${r.place} 살지 않아요!` : `${r.topic} ${r.facts[cat]}!` };
    }
    const trap = ev.type === 'item' ? ev.trapFor?.[claim] : ev.home === claim && ev.trap;
    return { v: trap ? 'trap' : 'ok', why: trap || (ev.type === 'item' ? ev.okWhy?.[claim] : ev.okWhy) || `${D.climates[claim].name}에서도 볼 수 있어요!` };
  }
  window.Replay = { verdict };
})();
