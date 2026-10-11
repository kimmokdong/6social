/* 이야기 그림만 덮어 씌우고, 로드 실패 때는 원래 SVG를 남깁니다. */
window.Paint = (() => {
  const esc = window.SamgwonArt.esc;
  const source = path => `../shared-art/${path}.webp`;
  function picture(path, fallback, alt, loading, kind, width, height) {
    return `<span class="paint paint-${kind}" style="aspect-ratio:${width}/${height}"><span class="paint-fallback">${fallback}</span><img src="${esc(source(path))}" width="${width}" height="${height}" alt="${esc(alt)}" decoding="async" loading="${loading}" draggable="false" onload="this.parentElement.classList.add('loaded')" onerror="this.parentElement.classList.remove('loaded');this.remove()"></span>`;
  }
  function person(id, fallback) {
    if (id === 'trucker') return fallback;
    const path = id.startsWith('p') && /^p\d_/.test(id) ? `players/${id}` : `people/${id}`;
    return picture(path, fallback, '', 'eager', 'person', 300, 360);
  }
  function scene(path, fallback, alt = '', loading = 'lazy') {
    const square = /\/(prop_|st_)/.test(path);
    return picture(path, fallback, alt, loading, 'scene', square ? 256 : 1200, square ? 256 : 800);
  }
  function preload(id) {
    if (id === 'trucker') return;
    const img = new Image(); img.decoding = 'async';
    img.src = source(/^p\d_/.test(id) ? `players/${id}` : `people/${id}`);
  }
  return { person, scene, preload };
})();
