/* 이야기 그림만 덮어 씌우고, 로드 실패 때는 원래 SVG를 남깁니다. */
window.Paint = (() => {
  const esc = window.SamgwonArt.esc;
  const source = path => `../shared-art/${path}.webp`;
  const available = new Set(['president', 'reporter', 'teacher', ...Object.keys(window.TRADE.countries)]);
  function picture(path, fallback, alt, loading, kind, width, height) {
    if (window.GameAssets?.isFailed(source(path))) return fallback;
    return `<span class="paint paint-${kind}${window.GameAssets?.isReady(source(path)) ? ' loaded' : ''}" style="aspect-ratio:${width}/${height}"><span class="paint-fallback">${fallback}</span><img src="${esc(source(path))}" width="${width}" height="${height}" alt="${esc(alt)}" decoding="async" loading="${loading}" draggable="false" onload="this.parentElement.classList.add('loaded')" onerror="this.parentElement.classList.remove('loaded');this.remove()"></span>`;
  }
  function person(id, fallback) {
    if (!available.has(id) && !/^p\d_/.test(id)) return fallback;
    const path = id.startsWith('p') && /^p\d_/.test(id) ? `players/${id}` : `people/${id}`;
    return picture(path, fallback, '', 'eager', 'person', 300, 360);
  }
  function scene(path, fallback, alt = '', loading = 'lazy') {
    const square = /\/(prop_|st_)/.test(path);
    if (path === 'trade/title') return picture(path, fallback, alt, loading, 'scene', 1600, 900);
    return picture(path, fallback, alt, loading, 'scene', square ? 256 : 1200, square ? 256 : 800);
  }
  function preload(id) {
    if (id === 'trucker') return;
    const img = new Image(); img.decoding = 'async';
    img.src = source(/^p\d_/.test(id) ? `players/${id}` : `people/${id}`);
  }
  return { person, scene, preload };
})();
