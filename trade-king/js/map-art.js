/* 무역왕의 작은 그림: 재료·수출품·버튼 아이콘(SVG). 섬 그림은 shared-art/trade의 webp를 쓴다. */
window.TradeArt = (() => {
  const C = { ink: '#24212B', paper: '#FFFDF8', gold: '#F5C542' };
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mix(hex, amt) { const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, a = Math.abs(amt), ch = v => Math.round(v + (t - v) * a); return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1); }
  const rect = (x, y, w, h, f, r = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" rx="${r}"/>`;
  function cube(x, y, w, h, dep, col) { const dx = dep * .62, dy = dep * -.48; return `<path d="M${x} ${y}l${dx} ${dy}h${w}l${-dx} ${-dy}Z" fill="${mix(col, .28)}"/><path d="M${x + w} ${y}l${dx} ${dy}v${h}l${-dx} ${-dy}Z" fill="${mix(col, -.2)}"/>` + rect(x, y, w, h, col); }
  const svg = (body, box = '0 0 100 100', cls = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" class="${cls}" aria-hidden="true" focusable="false">${body}</svg>`;
  const line = (d, color = C.ink, w = 5) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  function body(id, color = '#3B6FE0') {
    const shapes = {
      grain: line('M50 88V18m0 20L30 24m20 30 20-15M50 68 30 53M50 79l20-15', '#BB8B24', 9),
      plantOil: `<path d="M34 30h32v10l8 8v40a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V48l8-8Z" fill="#8DB34A"/>` + rect(40, 14, 20, 14, '#5E8A2A', 3) + `<path d="M50 52c-14 10-10 26 0 28 10-2 14-18 0-28Z" fill="#FFF3C2"/>`,
      iron: `<path d="M13 69 28 30l36-14 25 32-13 37-44 8Z" fill="#89909C"/><path d="m28 30 25 20-21 43-19-24Z" fill="#B1BBC7"/><path d="m53 50 36-2-13 37-44 8Z" fill="#677382"/>`,
      lithium: `<path d="M25 26 62 12l24 46-29 33-43-23Z" fill="#C04F8A"/><path d="m25 26 18 29 19-43Z" fill="#E2A3C6"/><path d="m43 55 43 3-29 33Z" fill="#983668"/>`,
      rubber: `<ellipse cx="50" cy="53" rx="35" ry="39" fill="#4A4352"/><ellipse cx="50" cy="53" rx="19" ry="24" fill="#FFFDF8"/>` + line('M28 28 19 40m60-4 6 12m-4 26-8 10M25 78l9 7', '#7B7383', 7),
      chip: cube(22, 27, 53, 46, 12, '#4D75BE') + rect(34, 38, 27, 24, '#BFE3F2', 3) + [22, 38, 54, 70].map(x => line(`M${x} 18v9M${x} 74v10`, '#5B5566', 5)).join(''),
      ramen: `<path d="M12 46h76l-6 30a14 14 0 0 1-14 12H32a14 14 0 0 1-14-12Z" fill="#E0533C"/>` + rect(12, 42, 76, 10, '#FFFDF8', 5) + line('M26 40c4-14 8-14 12 0s8 14 12 0 8-14 12 0 8 14 12 0', '#F5C542', 6) + line('M62 14 42 44', '#8A5C3B', 5),
      cosmetic: rect(30, 30, 40, 58, '#D4537E', 10) + rect(36, 12, 28, 22, '#F4C0D1', 6) + rect(38, 50, 24, 22, '#FFFDF8', 4) + `<circle cx="50" cy="61" r="5" fill="#D4537E"/>`,
      phone: cube(30, 15, 37, 70, 8, '#404352') + rect(35, 22, 27, 49, '#9CC9E6', 3) + `<circle cx="49" cy="79" r="3" fill="#FFFDF8"/>`,
      car: `<path d="M12 70V50l18-21h40l18 21v20Z" fill="${color}"/><path d="M34 35h12v18H22ZM53 35h14l14 18H53Z" fill="#BFE3F2"/><circle cx="30" cy="72" r="12" fill="#24212B"/><circle cx="72" cy="72" r="12" fill="#24212B"/><circle cx="30" cy="72" r="5" fill="#BBC0CA"/><circle cx="72" cy="72" r="5" fill="#BBC0CA"/>`,
      ship: `<ellipse cx="50" cy="86" rx="43" ry="8" fill="#679AA3"/><path d="M7 65h86L76 86H28Z" fill="#8A5C3B"/><path d="M50 9v58h33Z" fill="#FFFDF8"/><path d="M44 22 16 58h28Z" fill="#E0533C"/>` + line('M49 10v56', '#695747', 4),
      boat: `<path d="M8 60h84L74 82H26Z" fill="#2F4E7A"/><path d="M8 60h84l-6 8H14Z" fill="#E0533C"/>` + rect(36, 38, 30, 22, '#FFFDF8', 4) + rect(42, 44, 8, 8, '#9CC9E6', 2) + rect(30, 50, 10, 10, '#D9A21E', 2) + rect(68, 50, 12, 10, '#3B6FE0', 2),
      factory: cube(13, 44, 68, 42, 15, '#8495AA') + `<path d="M13 44V25l24 19V25l24 19V25l20 19Z" fill="#3B6FE0"/>` + rect(65, 12, 9, 28, '#657287') + rect(22, 57, 13, 12, '#FFF3C2') + rect(46, 57, 13, 12, '#FFF3C2'),
      coin: `<circle cx="50" cy="50" r="39" fill="#D9A21E"/><circle cx="47" cy="46" r="34" fill="#F5C542"/>` + line('M47 25v43m13-33H40q-13 12 9 14t-8 17', '#A77B19', 6),
      star: `<path d="m50 5 13 27 31 5-22 22 5 32-27-15-28 15 6-32L5 37l32-5Z" fill="${color}"/>`,
      heart: `<path d="M50 87 13 49C-9 12 34-2 50 28 66-2 109 12 87 49Z" fill="${color}"/>`,
      gear: `<g fill="#6B7A8F">${[0, 45, 90, 135].map(a => `<rect x="40" y="4" width="20" height="92" rx="5" transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="35"/></g><circle cx="50" cy="50" r="13" fill="#FFFDF8"/>`,
      home: `<path d="m9 43 41-33 41 33-9 10-8-6v42H26V47l-8 6Z" fill="#3B6FE0"/>` + rect(43, 59, 17, 30, '#FFFDF8', 2),
      menu: line('M20 25h60M20 50h60M20 75h60', C.ink, 8),
      close: line('M25 25 75 75M75 25 25 75', C.ink, 9),
      pause: rect(25, 17, 17, 66, C.ink, 5) + rect(58, 17, 17, 66, C.ink, 5),
      play: `<path d="M30 15 82 50 30 85Z" fill="${C.ink}"/>`,
      basket: `<path d="M10 38h80L77 88H23Z" fill="#A681BF"/>` + line('M30 42 50 12l20 30M35 55v21m15-21v21m15-21v21', '#6A4297', 7),
      stamp: `<circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="7"/><circle cx="50" cy="50" r="28" fill="none" stroke="${color}" stroke-width="4"/>` + line('M34 52l11 11 22-24', color, 9),
      check: line('M22 52l17 17 39-40', '#2E9E6B', 12),
      arrowIn: line('M20 50h50M50 28l20 22-20 22', '#1F7A47', 10),
      arrowOut: line('M80 50H30M50 28 30 50l20 22', '#B8434F', 10),
      banana: `<path d="M20 30c-4 30 14 56 48 58 10 1 18-4 22-10-30 2-50-14-56-50-2-8-12-6-14 2Z" fill="#F5C542"/><path d="M26 30c4 24 20 42 48 48" fill="none" stroke="#C99A1E" stroke-width="5" stroke-linecap="round"/>`,
      oil: rect(26, 14, 48, 74, '#E8761E', 8) + rect(26, 30, 48, 8, '#B5561A') + rect(26, 62, 48, 8, '#B5561A') + `<ellipse cx="50" cy="14" rx="24" ry="7" fill="#F2A35A"/>`,
      shirt: `<path d="M34 14 50 22l16-8 22 14-10 16-8-4v48H26V40l-8 4L8 28Z" fill="#D86A8E"/><path d="M34 14c4 10 28 10 32 0l-6 14H40Z" fill="#B24A6C"/>` + rect(44, 50, 12, 6, '#FFD5E1', 2),
      robot: rect(20, 30, 60, 46, '#6F8FC8', 10) + rect(30, 42, 14, 12, '#FFFDF8', 3) + rect(56, 42, 14, 12, '#FFFDF8', 3) + `<circle cx="37" cy="48" r="4" fill="#24212B"/><circle cx="63" cy="48" r="4" fill="#24212B"/>` + rect(36, 62, 28, 6, '#24212B', 3) + line('M50 30V16', '#24212B', 5) + `<circle cx="50" cy="13" r="6" fill="#E0533C"/>` + rect(8, 40, 10, 24, '#4D6CA8', 4) + rect(82, 40, 10, 24, '#4D6CA8', 4) + rect(28, 76, 14, 12, '#4D6CA8', 3) + rect(58, 76, 14, 12, '#4D6CA8', 3),
      steel: rect(14, 52, 72, 14, '#B9C2CE', 3) + rect(20, 38, 72, 14, '#D2D9E2', 3) + rect(8, 66, 72, 14, '#98A3B1', 3),
      battery: rect(18, 26, 60, 50, '#2E9E6B', 8) + rect(78, 40, 8, 22, '#24212B', 2) + rect(26, 34, 14, 34, '#A8E6C4', 3) + rect(44, 34, 14, 34, '#A8E6C4', 3),
      box: cube(18, 36, 56, 44, 14, '#3B6FE0') + rect(40, 36, 12, 44, '#F5C542') + rect(18, 52, 56, 10, '#F5C542'),
      boot: `<path d="M30 14h26v40l26 14v14H30Z" fill="#8A5C3B"/>` + rect(30, 70, 52, 12, '#4A3A2A', 3) + rect(36, 22, 14, 6, '#F5C542', 2) + rect(36, 34, 14, 6, '#F5C542', 2),
      person: `<circle cx="50" cy="30" r="18" fill="#F2C9A4"/><path d="M14 92c2-26 16-38 36-38s34 12 36 38Z" fill="#3B6FE0"/>` + rect(44, 60, 12, 32, '#FFFDF8', 4),
      truck: `<path d="M10 64V36h44v28Z" fill="#2E9E6B"/><path d="M54 44h20l14 12v8H54Z" fill="#8DB34A"/><rect x="62" y="48" width="12" height="9" fill="#BFE3F2"/><circle cx="26" cy="68" r="9" fill="#24212B"/><circle cx="74" cy="68" r="9" fill="#24212B"/>`
    };
    if (id === 'ev') return shapes.car; if (id === 'wheat') return shapes.grain;
    return shapes[id] || window.SamgwonArt?.iconBody?.(id, color) || shapes.chip;
  }
  const icon = (id, color) => svg(body(id, color), '0 0 100 100', 'ico');
  const stars = (n, max = 3) => `<span class="stars" aria-label="별 ${n}개, 최대 ${max}개">${Array.from({ length: max }, (_, i) => icon('star', i < n ? C.gold : '#D8CDB8')).join('')}</span>`;
  return { esc, mix, cube, icon, stars };
})();
