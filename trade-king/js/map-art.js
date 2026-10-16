/* 다온시와 같은 3/4 시점·세 단계 명암으로 그린 종이 해도. */
window.TradeArt = (() => {
  const C = { ink: '#24212B', paper: '#FFFDF8', sea: '#BFE0E3', gold: '#F5C542' };
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mix(hex, amt) { const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, a = Math.abs(amt), ch = v => Math.round(v + (t - v) * a); return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1); }
  const rect = (x, y, w, h, f, r = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" rx="${r}"/>`;
  function cube(x, y, w, h, dep, col) { const dx = dep * .62, dy = dep * -.48; return `<path d="M${x} ${y}l${dx} ${dy}h${w}l${-dx} ${-dy}Z" fill="${mix(col, .28)}"/><path d="M${x + w} ${y}l${dx} ${dy}v${h}l${-dx} ${-dy}Z" fill="${mix(col, -.2)}"/>` + rect(x, y, w, h, col); }
  const svg = (body, box = '0 0 100 100', cls = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" class="${cls}" aria-hidden="true" focusable="false">${body}</svg>`;
  const line = (d, color = C.ink, w = 5) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  function body(id, color = '#3B6FE0') {
    const shapes = {
      grain: line('M50 88V18m0 20L30 24m20 30 20-15M50 68 30 53M50 79l20-15', '#BB8B24', 9),
      oil: `<path d="M50 7Q12 48 18 68a33 30 0 0 0 64 0Q87 48 50 7Z" fill="#D9A21E"/>` + line('M32 62q-2 15 14 18', '#FFF3C2', 6),
      iron: `<path d="M13 69 28 30l36-14 25 32-13 37-44 8Z" fill="#89909C"/><path d="m28 30 25 20-21 43-19-24Z" fill="#B1BBC7"/><path d="m53 50 36-2-13 37-44 8Z" fill="#677382"/>`,
      lithium: `<path d="M25 26 62 12l24 46-29 33-43-23Z" fill="#C04F8A"/><path d="m25 26 18 29 19-43Z" fill="#E2A3C6"/><path d="m43 55 43 3-29 33Z" fill="#983668"/>`,
      rare: `<path d="M50 8 87 46 64 90H30L12 46Z" fill="#7B52D3"/><path d="m50 8-8 44H12Z" fill="#BC9FEF"/><path d="m42 52 22 38H30L12 46Z" fill="#9675DC"/>`,
      rubber: `<ellipse cx="50" cy="53" rx="35" ry="39" fill="#4A4352"/><ellipse cx="50" cy="53" rx="19" ry="24" fill="#FFFDF8"/>` + line('M28 28 19 40m60-4 6 12m-4 26-8 10M25 78l9 7', '#7B7383', 7),
      chip: cube(22, 27, 53, 46, 12, '#4D75BE') + rect(34, 38, 27, 24, '#BFE3F2', 3) + [22, 38, 54, 70].map(x => line(`M${x} 18v9M${x} 74v10`, '#5B5566', 5)).join(''),
      phone: cube(30, 15, 37, 70, 8, '#404352') + rect(35, 22, 27, 49, '#9CC9E6', 3) + `<circle cx="49" cy="79" r="3" fill="#FFFDF8"/>`,
      car: `<path d="M12 70V50l18-21h40l18 21v20Z" fill="${color}"/><path d="M34 35h12v18H22ZM53 35h14l14 18H53Z" fill="#BFE3F2"/><circle cx="30" cy="72" r="12" fill="#24212B"/><circle cx="72" cy="72" r="12" fill="#24212B"/><circle cx="30" cy="72" r="5" fill="#BBC0CA"/><circle cx="72" cy="72" r="5" fill="#BBC0CA"/>`,
      ev: `<path d="M12 70V50l18-21h40l18 21v20Z" fill="#2E9E6B"/><path d="M34 35h12v18H22ZM53 35h14l14 18H53Z" fill="#BFE3F2"/><circle cx="30" cy="72" r="12" fill="#24212B"/><circle cx="72" cy="72" r="12" fill="#24212B"/><path d="m56 42-9 15h9l-7 15 18-20H56Z" fill="#F5C542"/>`,
      ship: `<ellipse cx="50" cy="86" rx="43" ry="8" fill="#679AA3"/><path d="M7 65h86L76 86H28Z" fill="#8A5C3B"/><path d="M50 9v58h33Z" fill="#FFFDF8"/><path d="M44 22 16 58h28Z" fill="#E0533C"/>` + line('M49 10v56', '#695747', 4),
      factory: cube(13, 44, 68, 42, 15, '#8495AA') + `<path d="M13 44V25l24 19V25l24 19V25l20 19Z" fill="#3B6FE0"/>` + rect(65, 12, 9, 28, '#657287') + rect(22, 57, 13, 12, '#FFF3C2') + rect(46, 57, 13, 12, '#FFF3C2'),
      coin: `<circle cx="50" cy="50" r="39" fill="#D9A21E"/><circle cx="47" cy="46" r="34" fill="#F5C542"/>` + line('M47 25v43m13-33H40q-13 12 9 14t-8 17', '#A77B19', 6),
      star: `<path d="m50 5 13 27 31 5-22 22 5 32-27-15-28 15 6-32L5 37l32-5Z" fill="${color}"/>`,
      heart: `<path d="M50 87 13 49C-9 12 34-2 50 28 66-2 109 12 87 49Z" fill="${color}"/>`,
      gear: `<g fill="#6B7A8F">${[0, 45, 90, 135].map(a => `<rect x="40" y="4" width="20" height="92" rx="5" transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="35"/></g><circle cx="50" cy="50" r="13" fill="#FFFDF8"/>`,
      home: `<path d="m9 43 41-33 41 33-9 10-8-6v42H26V47l-8 6Z" fill="#3B6FE0"/>` + rect(43, 59, 17, 30, '#FFFDF8', 2),
      menu: line('M20 25h60M20 50h60M20 75h60', C.ink, 8),
      close: line('M25 25 75 75M75 25 25 75', C.ink, 9),
      wave: line('M10 33q20-18 40 0t40 0M10 58q20-18 40 0t40 0M10 83q20-18 40 0t40 0', '#2BA3B5', 8),
      basket: `<path d="M10 38h80L77 88H23Z" fill="#A681BF"/>` + line('M30 42 50 12l20 30M35 55v21m15-21v21m15-21v21', '#6A4297', 7),
      anchor: line('M50 19v60M29 44h42M17 63q33 54 66 0M17 63v17m66-17v17', color, 8) + `<circle cx="50" cy="18" r="10" fill="none" stroke="${color}" stroke-width="7"/>`,
      tree: rect(44, 45, 12, 46, '#8A5C3B') + `<circle cx="50" cy="37" r="30" fill="#2E9E6B"/><circle cx="32" cy="49" r="23" fill="#3BB77F"/>`,
      snow: [0, 60, 120].map(a => `<g transform="rotate(${a} 50 50)">${line('M50 10v80M36 19l14 14 14-14M36 81l14-14 14 14', '#7FB5DA', 6)}</g>`).join('')
    };
    return shapes[id] || window.SamgwonArt.iconBody?.(id, color) || shapes.chip;
  }
  const icon = (id, color) => svg(body(id, color), '0 0 100 100', 'ico');
  const emblem = id => { const d = window.TRADE.countries[id]; return svg(`<circle cx="50" cy="50" r="47" fill="${mix(d.color, .8)}"/><g transform="translate(15 15) scale(.7)">${body(({ drop: 'oil', wheat: 'grain', crystal: 'lithium' })[d.emblem] || d.emblem, d.color)}</g>`); };
  const stars = n => `<span class="stars" aria-label="별 ${n}개, 최대 5개">${Array.from({ length: 5 }, (_, i) => icon('star', i < n ? C.gold : '#D8CDB8')).join('')}</span>`;
  // 그림이 준비되기 전·실패한 뒤에도 같은 위치의 SVG를 남깁니다.
  const raster = (path, fallback, x, y, width, height, cls = '', style = '') => `<g class="chart-art"><g class="chart-fallback" style="visibility:${window.GameAssets?.isReady(`../shared-art/trade/${path}.webp`) ? 'hidden' : 'visible'}">${fallback}</g><image class="${cls}" style="${style}" href="../shared-art/trade/${path}.webp" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" onload="this.previousElementSibling.style.visibility='hidden'" onerror="this.previousElementSibling.style.visibility='visible';this.remove()"/></g>`;
  let serial = 0, lastChart = { key: '', known: [], reveals: {} };
  function map(s, miniature = false, overlay = '') {
    const w = s.world, T = window.TRADE, uid = `chart-${++serial}`, known = s.known;
    const key = `${w.seed}/${w.mapId}/${w.flip}`, now = Date.now();
    if (!miniature) {
      if (lastChart.key !== key || lastChart.known.some(slot => !known.includes(slot))) lastChart = { key, known: known.slice(), reveals: {} };
      for (const slot of known) if (!lastChart.known.includes(slot)) lastChart.reveals[slot] = now;
      lastChart.known = known.slice();
    }
    const segments = w.lanes.map(([a, b]) => { const [x, y] = w.slots[a], [xx, yy] = w.slots[b]; return line(`M${x} ${y} ${xx} ${yy}`, '#000', 33); }).join('');
    const keep = Object.values(w.slots).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="38" fill="#fff"/>`).join('');
    const lands = w.lands.map((group, gi) => {
      const points = group.map(p => w.slots[p.slot]);
      const bridges = points.length > 1 ? `<path d="M${points.map(p => p.join(' ')).join('L')}" fill="none" stroke="#D6DEC0" stroke-width="88" stroke-linecap="round" stroke-linejoin="round"/>` : '';
      const blobs = group.map(p => { const [x, y] = w.slots[p.slot]; const pts = p.wobble.map((v, i) => [x + Math.cos(i * Math.PI / 4) * p.radius * v, y + Math.sin(i * Math.PI / 4) * p.radius * v * .78]); const d = pts.map((v, i) => { const next = pts[(i + 1) % pts.length]; return `Q${v[0]} ${v[1]} ${(v[0] + next[0]) / 2} ${(v[1] + next[1]) / 2}`; }).join(''); const start = [(pts.at(-1)[0] + pts[0][0]) / 2, (pts.at(-1)[1] + pts[0][1]) / 2]; return `<path d="M${start.join(' ')}${d}Z" fill="${gi % 2 ? '#D8DEBD' : '#E7DAB5'}"/>`; }).join('');
      return `<g mask="url(#${uid}-land)"><g transform="translate(0 9)" opacity=".3">${bridges}${blobs}</g>${bridges}${blobs}</g>`;
    }).join('');
    const lanes = w.lanes.filter(([a, b]) => miniature || known.includes(a) || known.includes(b)).map(([a, b, type]) => {
      const [x, y] = w.slots[a], [xx, yy] = w.slots[b], mx = (x + xx) / 2, my = (y + yy) / 2;
      const blocked = s.mods?.some(m => m.key === 'block' && m.value[0] === type), ice = [a, b].some(k => w.countries[k]?.id === 'northIce') && T.countries.northIce.frozenYears.includes(s.year);
      const color = blocked ? '#C66B65' : ice ? '#78AACC' : '#75989C';
      return `<path d="M${x} ${y}L${xx} ${yy}" stroke="${color}" stroke-width="${type === 'strait' ? 5 : 3}" stroke-dasharray="${type === 'far' ? '16 10' : '5 8'}" fill="none"/>${type === 'strait' ? `<g transform="translate(${mx - 17} ${my - 20})">${cube(0, 0, 8, 40, 7, '#8495AA')}${cube(32, 0, 8, 40, 7, '#8495AA')}<path d="M8 6h24" stroke="#657287" stroke-width="6"/></g>` : type === 'storm' ? `<g transform="translate(${mx - 18} ${my - 18}) scale(.4)">${line('M20 60q-16-48 30-45t30 52-44 15-10-34 30 2', '#89ACB2', 6)}</g>` : ''}${ice ? `<g transform="translate(${mx - 17} ${my - 17}) scale(.34)">${body('snow')}</g>` : ''}`;
    }).join('');
    const ports = Object.entries(w.slots).map(([slot, [x, y]], index) => {
      const fog = `<g transform="translate(${x} ${y})">${raster(`fog_${index % 3 + 1}`, '<ellipse rx="63" ry="34" fill="#EFF3EE" opacity=".9"/><ellipse cx="-24" cy="-10" rx="32" ry="26" fill="#F9F8EE"/><ellipse cx="22" cy="-15" rx="39" ry="26" fill="#F9F8EE"/>', -76, -51, 152, 96)}</g>`;
      if (!known.includes(slot)) return `<g class="fog">${fog}</g>`;
      const c = w.countries[slot], col = slot === w.home ? '#3B6FE0' : c ? T.countries[c.id].color : '#88998C';
      const fallback = `<g transform="translate(${x - 22} ${y - 30})">${cube(0, 0, 36, 23, 14, col)}${rect(5, 7, 8, 8, '#FFFDF8', 1)}${rect(20, 7, 8, 8, '#FFFDF8', 1)}<path d="M0 30h50" stroke="#8A7660" stroke-width="7" stroke-linecap="round"/><circle cx="22" cy="44" r="6" fill="${col}"/></g>`;
      const port = slot === w.home || c ? raster(`port_${slot === w.home ? 'home' : c.id}`, fallback, x - 58, y - 73, 116, 88, 'port-art') : fallback;
      const elapsed = now - (lastChart.reveals[slot] ?? -Infinity);
      return port + (!miniature && elapsed < 1200 ? `<g class="fog-clearing" style="animation-delay:-${elapsed}ms">${fog}</g>` : '');
    }).join('');
    const positions = (s.voyages || []).filter(v => !v.contract).map(v => { const progress = (v.total - v.left + .45) / v.total, points = [w.home, ...v.path].map(k => w.slots[k]), segment = Math.min(points.length - 2, Math.floor(progress * (points.length - 1))), t = progress * (points.length - 1) - segment, [x, y] = points[segment], [xx, yy] = points[segment + 1]; return { v, x: x + (xx - x) * t, y: y + (yy - y) * t }; });
    const boats = miniature ? positions.map(({ x, y }) => raster('ship', `<g transform="translate(${x - 20} ${y - 25}) scale(.48)">${body('ship')}</g>`, x - 27, y - 22, 54, 44)).join('') : '';
    const background = raster(`map_${w.mapId}`, `${rect(0, 0, 1000, 640, '#C3E0DF', 24)}${lands}`, 0, 0, 1000, 640, 'chart-map', `transform:scale(${w.flip & 1 ? -1 : 1},${w.flip & 2 ? -1 : 1});transform-origin:500px 320px`);
    const chart = svg(`<defs><pattern id="${uid}-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#6F654E" stroke-width="1" opacity=".2"/></pattern><radialGradient id="${uid}-paper"><stop offset="55%" stop-color="#F3E4BF" stop-opacity=".07"/><stop offset="100%" stop-color="#D8BC85" stop-opacity=".6"/></radialGradient><mask id="${uid}-land">${rect(0, 0, 1000, 640, '#fff')}${segments}${keep}</mask></defs>${background}${rect(0, 0, 1000, 640, `url(#${uid}-paper)`, 24)}${rect(0, 0, 1000, 640, `url(#${uid}-grid)`, 24)}<g class="chart-ports">${ports}</g><g class="chart-lanes">${lanes}</g>${boats}<g class="chart-compass" transform="translate(940 52)"><circle r="31" fill="#F3E4BF" opacity=".85"/><circle r="27" fill="none" stroke="#8D7754"/><path d="m0-24 7 17 17 7-17 7-7 17-7-17-17-7 17-7Z" fill="#F9F0D7" stroke="#8D7754"/><path d="M0-24v48l7-17Z" fill="#92744A"/><circle r="3" fill="#6B624F"/><text y="-34" font-size="18" text-anchor="middle" fill="#6B624F">N</text></g><g class="chart-frame" fill="none"><rect x="12" y="12" width="976" height="616" rx="16" stroke="#DCC393" stroke-width="24"/><rect x="23" y="23" width="954" height="594" rx="10" stroke="#8D7754" stroke-width="2"/><rect x="29" y="29" width="942" height="582" rx="8" stroke="#8D7754" stroke-width="1" stroke-dasharray="3 7"/></g><g opacity=".35">${[70, 310, 640, 910].map((x, i) => line(`M${x} ${580 - i * 55}q15-14 30 0t30 0`, '#6B959C', 2)).join('')}</g>`, '0 0 1000 640', 'chart');
    if (miniature) return chart;
    const pins = Object.entries(w.slots).map(([slot, [x, y]]) => { const c = w.countries[slot], seen = known.includes(slot), name = slot === w.home ? '다온국' : seen ? c ? T.countries[c.id].name : '무인도' : '안개 속 항구'; return `<button class="map-pin ${seen ? 'met' : 'unknown'} ${y > 500 ? 'south' : ''} ${slot === w.home ? 'home-pin' : ''}" style="left:${x / 10}%;top:${y / 6.4}%" data-action="port" data-slot="${slot}" aria-label="${name}"><span class="pin-symbol">${slot === w.home ? icon('home') : seen && c ? emblem(c.id) : seen ? icon('tree') : '<span>?</span>'}</span><span class="pin-name">${name}</span></button>`; }).join('');
    const markers = positions.map(({ v, x, y }, index) => {
      const points = [w.home, ...v.path].map(k => w.slots[k]), start = (v.total - v.left) / v.total, end = (v.total - v.left + .9) / v.total;
      const steps = [start, ...points.map((_, i) => i / (points.length - 1)).filter(t => t > start && t < end), end];
      const frames = steps.map(t => { const segment = Math.min(points.length - 2, Math.floor(t * (points.length - 1))), f = t * (points.length - 1) - segment, [a, b] = points[segment], [aa, bb] = points[segment + 1]; return `${(t - start) / (end - start) * 100}%{left:${(a + (aa - a) * f) / 10}%;top:${(b + (bb - b) * f) / 6.4}%}`; }).join('');
      return `<style>@keyframes ${uid}-boat-${index}{${frames}}</style><span class="boat-marker" style="left:${x / 10}%;top:${y / 6.4}%;animation:${uid}-boat-${index} 2.5s linear both" role="img" aria-label="${v.explore ? '탐험선' : '무역선'}, 도착까지 ${v.left}년">${window.Paint.scene('trade/ship', icon('ship'), '', 'eager')}<b>${v.left}</b></span>`;
    }).join('');
    return `<div class="map-wrap">${chart}${overlay}<div class="map-pins">${pins}</div>${markers}</div>`;
  }
  function layoutPins() {
    const wrap = document.querySelector('.map-wrap');
    if (!wrap) return;
    const bounds = wrap.getBoundingClientRect(), pins = [...wrap.querySelectorAll('.map-pin')], placed = [];
    const symbols = pins.map(pin => pin.querySelector('.pin-symbol').getBoundingClientRect());
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    for (const pin of pins) {
      const label = pin.querySelector('.pin-name');
      if (!label.getClientRects().length) continue;
      const p = pin.getBoundingClientRect(), { width, height } = label.getBoundingClientRect();
      const candidates = [[p.left + (p.width - width) / 2, p.bottom + 3], [p.left + (p.width - width) / 2, p.top - height - 3], [p.right + 4, p.top + (p.height - height) / 2], [p.left - width - 4, p.top + (p.height - height) / 2], [p.right + 4, p.bottom + 3], [p.left - width - 4, p.bottom + 3], [p.right + 4, p.top - height - 3], [p.left - width - 4, p.top - height - 3]].map(([x, y]) => {
        const left = Math.max(bounds.left + 4, Math.min(x, bounds.right - width - 4)), top = Math.max(bounds.top + 4, Math.min(y, bounds.bottom - height - 4));
        const box = { left, top, right: left + width, bottom: top + height };
        return { ...box, score: [...symbols, ...placed].reduce((n, b) => n + overlap(box, b), 0) };
      });
      const best = candidates.reduce((a, b) => b.score < a.score ? b : a);
      Object.assign(label.style, { left: `${best.left - p.left}px`, top: `${best.top - p.top}px`, bottom: 'auto', transform: 'none' });
      placed.push(best);
    }
  }
  return { esc, mix, cube, icon, emblem, stars, map, layoutPins };
})();
