/* 떡볶이 타이쿤의 그림 — 다온시 70년과 같은 3/4 시점 페이퍼컷 규칙(cube, gable) */
window.TycoonArt = (() => {
  const C = { ink: '#24212B', paper: '#FFFDF8', red: '#E0533C', sauce: '#D93A2B', gold: '#F5C542', orange: '#F2994A', green: '#2E9E6B', blue: '#3B6FE0', purple: '#7B52D3', glass: '#9CC9E6', wood: '#B78357' };
  function mix(hex, amt) {
    const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, a = Math.abs(amt);
    const ch = v => Math.round(v + (t - v) * a);
    return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1);
  }
  const r = (x, y, w, h, f, rx = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"/>`;
  const c = (x, y, rad, f) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${f}"/>`;
  const e = (x, y, rx, ry, f) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"/>`;
  const p = (d, f) => `<path d="${d}" fill="${f}"/>`;
  const line = (d, s, w = 2) => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const svg = (body, box = '0 0 100 100', cls = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" class="${cls}" aria-hidden="true" focusable="false">${body}</svg>`;
  const DX = .62, DY = -.48;
  function cube(x, y, w, h, dep, col, o = {}) {
    const dx = dep * DX, dy = dep * DY;
    return p(`M${x} ${y}l${dx} ${dy}h${w}l${-dx} ${-dy}Z`, o.top || mix(col, .28)) + p(`M${x + w} ${y}l${dx} ${dy}v${h}l${-dx} ${-dy}Z`, o.side || mix(col, -.2)) + r(x, y, w, h, col);
  }
  const win = (x, y, w, h, f = C.glass) => r(x, y, w, h, f, 1.5) + r(x + 1, y + 1, Math.max(1, w * .3), h - 2, mix(f, .45), 1);

  /* 떡볶이 그릇 */
  const bowlBody = (x = 50, y = 58, s = 1) => e(x, y, 34 * s, 10 * s, '#FFFFFF') + p(`M${x - 34 * s} ${y}q${34 * s} ${44 * s} ${68 * s} 0Z`, '#F6F1E6') + e(x, y, 30 * s, 8 * s, C.sauce)
    + [[-14, -2], [-2, 1], [10, -3], [18, 2], [-20, 2]].map(([dx, dy]) => `<rect x="${x + dx * s - 5 * s}" y="${y + dy * s - 2.5 * s}" width="${11 * s}" height="${5 * s}" rx="${2.5 * s}" fill="#F7E6CF" transform="rotate(${dx} ${x + dx * s} ${y + dy * s})"/>`).join('')
    + c(x + 4 * s, y - 2 * s, 3 * s, '#F2C14E') + p(`M${x - 34 * s} ${y}q${34 * s} ${44 * s} ${68 * s} 0`, 'none');
  const steam = (x, y) => `<g class="steam">${[0, 1, 2].map(i => `<path class="s s${i}" d="M${x - 10 + i * 10} ${y}q-5-8 0-14t0-14" fill="none" stroke="#FFFFFFCC" stroke-width="3" stroke-linecap="round"/>`).join('')}</g>`;

  const icons = {
    bowl: `<g stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"><path d="M7 36Q10 90 50 94Q90 90 93 36Z" fill="${C.paper}"/><ellipse cx="50" cy="35" rx="43" ry="24" fill="${C.sauce}"/></g>`
      + [[24, 22, -20], [48, 19, 15], [65, 33, -25], [34, 38, 12]].map(([x, y, angle]) => `<rect x="${x}" y="${y}" width="13" height="24" rx="6" fill="#FFE7BA" transform="rotate(${angle} ${x + 6} ${y + 12})"/>`).join('')
      + line('M24 67q26 20 52 0', '#D7C5AB', 5) + c(73, 21, 4, C.green),
    cheese: p('M10 66 74 30l16 10v32L10 82Z', '#F7C948') + p('M10 66 74 30l16 10L26 76Z', '#FBDD7A') + c(40, 66, 5, '#E3AE24') + c(64, 62, 4, '#E3AE24') + c(76, 54, 3, '#E3AE24'),
    sundae: p('M14 58q8-26 36-22t36 18q-4 22-36 20T14 58Z', '#6B3B3B') + [26, 40, 54, 68].map(x => c(x, 54, 5, '#8E5A5A')).join('') + line('M20 56q30 12 60 0', '#4A2626', 2),
    chairs: [12, 54].map(x => r(x, 24, 34, 30, '#D9895B', 5) + r(x - 4, 54, 42, 9, C.wood, 3) + r(x + 1, 63, 6, 26, '#8A5C3B') + r(x + 29, 63, 6, 26, '#8A5C3B')).join(''),
    staff: c(50, 30, 16, '#F0C6A7') + p('M34 24q16-18 32 0v-6q-16-12-32 0Z', '#3A2E2A') + c(44, 30, 2, C.ink) + c(56, 30, 2, C.ink) + line('M44 37q6 4 12 0', C.ink, 2)
      + p('M22 92q0-34 28-38t28 38Z', C.red) + p('M38 56h24v36H38Z', C.paper) + p('M30 20h40l-4-8H34Z', C.paper),
    clean: r(36, 40, 28, 50, '#7EC0E3', 6) + r(40, 26, 20, 16, C.paper, 3) + r(58, 30, 18, 6, C.paper, 2) + p('M80 22l4 8 8 2-8 3-4 8-3-8-8-3 8-2Z', C.gold) + p('M86 50l3 5 5 1-5 2-3 5-2-5-5-2 5-1Z', C.gold) + r(42, 56, 16, 14, C.paper, 2),
    flyer: `<g transform="rotate(-8 50 50)">${r(20, 12, 60, 78, C.paper, 4)}${r(28, 20, 44, 26, '#FFE1D6', 3)}${bowlBody(50, 34, .45)}${r(28, 54, 44, 6, C.red, 2)}${r(28, 66, 32, 5, '#C9C5BE', 2)}${r(28, 76, 38, 5, '#C9C5BE', 2)}</g>`,
    coin: c(50, 50, 40, C.gold) + c(50, 50, 30, '#E3AE24') + p('m50 28 6 14 15 1-11 10 4 15-14-8-14 8 4-15-11-10 15-1Z', C.gold),
    star: p('m50 6 13 28 30 3-23 20 7 30-27-15-27 15 7-30L7 37l30-3Z', C.gold),
    starOff: p('m50 6 13 28 30 3-23 20 7 30-27-15-27 15 7-30L7 37l30-3Z', '#DCD3C2'),
    scale: r(46, 14, 8, 72, C.purple, 4) + r(18, 26, 64, 8, C.purple, 4) + r(28, 84, 44, 9, C.purple, 4) + c(50, 14, 8, C.purple) + p('M22 34 8 62h28ZM78 34 64 62h28Z', C.purple) + p('M6 66h32q-16 22-32 0M62 66h32q-16 22-32 0', C.purple),
    kid: c(50, 30, 16, '#F0C6A7') + p('M34 26q16-20 32 0v-4q-16-14-32 0Z', '#3A2E2A') + p('M26 94q0-38 24-42t24 42Z', C.blue),
    crown: p('M12 72 18 30l18 20 14-30 14 30 18-20 6 42Z', C.gold) + r(12, 72, 76, 12, '#E3AE24', 3),
    lock: r(22, 44, 56, 44, '#5B5566', 8) + `<path d="M34 44V32a16 16 0 0 1 32 0v12" fill="none" stroke="#5B5566" stroke-width="9"/>` + c(50, 64, 6, C.paper),
    home2: p('M50 10 90 46H78v42H58V64H42v24H22V46H10Z', C.ink),
    gear: `<g fill="${C.ink}">${[0, 45, 90, 135].map(a => `<rect x="40" y="4" width="20" height="92" rx="5" transform="rotate(${a} 50 50)"/>`).join('')}</g>` + c(50, 50, 35, C.ink) + c(50, 50, 13, C.paper),
    menu: r(14, 22, 72, 10, C.ink, 5) + r(14, 45, 72, 10, C.ink, 5) + r(14, 68, 72, 10, C.ink, 5),
    play: p('M24 12 84 50 24 88Z', 'currentColor'),
    minus: r(16, 42, 68, 16, 'currentColor', 8),
    plus: r(16, 42, 68, 16, 'currentColor', 8) + r(42, 16, 16, 68, 'currentColor', 8),
    check: p('M12 52 24 40l16 16 36-36 12 12-48 48Z', C.green),
    cross: p('m22 12 28 28 28-28 10 10-28 28 28 28-10 10-28-28-28 28-10-10 28-28-28-28Z', C.red),
    bulb: c(50, 37, 28, C.gold) + r(39, 57, 22, 22, C.ink, 5) + r(42, 82, 16, 7, C.ink, 3),
    rain: p('M14 48q2-22 24-22 8-16 26-12 18 2 22 20 14 2 14 14H14Z', '#A9B4C2') + [24, 44, 64, 84].map(x => line(`M${x} 66l-5 14`, '#5FA8D3', 4)).join(''),
    sun: c(50, 50, 20, C.gold) + [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="47" y="8" width="6" height="14" rx="3" fill="${C.gold}" transform="rotate(${a} 50 50)"/>`).join(''),
    truck: r(6, 34, 58, 40, '#2E9E6B', 6) + r(64, 46, 28, 28, '#237B53', 5) + r(70, 50, 16, 12, '#BFE3F2', 2) + r(14, 40, 36, 16, '#FFF1E2', 3) + p('M6 34h58l-6-12H12Z', '#F5C542') + c(24, 78, 9, C.ink) + c(76, 78, 9, C.ink) + c(24, 78, 4, '#9A95A0') + c(76, 78, 4, '#9A95A0'),
    camera: r(10, 30, 62, 46, '#E0533C', 8) + p('M72 44 92 32v42L72 62Z', '#B8402E') + c(41, 53, 13, C.paper) + c(41, 53, 7, C.ink) + c(22, 38, 4, C.gold),
    trash: r(28, 30, 44, 60, '#8C8F99', 6) + r(22, 22, 56, 10, '#6E717C', 4) + r(42, 14, 16, 8, '#6E717C', 3) + line('M40 42v38M50 42v38M60 42v38', '#B7B9C2', 3)
  };
  const icon = (name, cls = '') => svg(icons[name] || icons.star, '0 0 100 100', `ico ${cls}`);
  const stars = (v, label = '평판 별') => `<span class="stars" aria-label="${label} ${v}${label === '평판 별' ? '개' : '점'}">${[0, 1, 2, 3, 4].map(i => `<span class="st">${icon(v >= i + 1 ? 'star' : 'starOff')}${v > i && v < i + 1 ? `<span class="half" style="width:${(v - i) * 100}%">${icon('star')}</span>` : ''}</span>`).join('')}</span>`;

  /* ───── 거리 장면 (장사 화면·타이틀) 1000 × 560 ───── */
  function myShop(o = {}) {
    const chairs = o.chairs ? [0, 1, 2].map(i => r(70 + i * 46, 470, 30, 8, C.wood, 3) + r(80 + i * 46, 478, 8, 26, '#8A5C3B')).join('') : '';
    return cube(40, 250, 300, 240, 70, '#FFF1E2') + r(40, 250, 300, 18, C.red)
      + [0, 1, 2, 3, 4, 5].map(i => p(`M${40 + i * 50} 268h50l-6 54h-38Z`, i % 2 ? C.paper : C.red)).join('') + p('M340 268l43.4-33.6-6 54L334 322Z', mix(C.red, -.2))
      + r(90, 180, 200, 66, C.paper, 12) + r(90, 180, 200, 66, 'none', 12) + `<g transform="translate(118 168) scale(.9)">${bowlBody(50, 46, .9)}</g>` + r(200, 198, 70, 12, C.red, 6) + r(200, 218, 52, 10, '#F2A08F', 5)
      + r(60, 360, 260, 130, C.wood, 6) + r(60, 360, 260, 14, '#D9A06C', 6) + `<g transform="translate(118 300)">${e(60, 64, 56, 16, '#3A3442')}${r(4, 40, 112, 26, '#4A4352', 6)}${e(60, 40, 56, 14, C.sauce)}${[20, 40, 60, 80, 100].map((x, i) => r(x - 8, 34 + (i % 2) * 6, 18, 7, '#F7E6CF', 3.5)).join('')}</g>` + steam(178, 300)
      + (o.staff ? `<g transform="translate(236 278) scale(.9)">${icons.staff}</g>` : '') + chairs
      + (o.clean ? `<g transform="translate(300 300) scale(.5)">${icons.clean}</g>` : '') + (o.cheese ? `<g transform="translate(70 384) scale(.6)">${icons.cheese}</g>` : '');
  }
  function rivalShop() {
    return cube(630, 220, 330, 270, 70, '#2D2A33', { top: '#4A4552', side: '#1B1920' }) + r(630, 220, 330, 22, C.gold)
      + r(660, 150, 270, 70, C.gold, 12) + `<g transform="translate(676 156) scale(.58)">${icons.crown}</g>` + r(740, 168, 170, 14, '#2D2A33', 7) + r(740, 192, 120, 12, '#2D2A33', 6)
      + win(660, 270, 120, 90, '#F7D774') + win(800, 270, 130, 90, '#F7D774') + r(760, 380, 60, 110, '#E3AE24', 4) + c(808, 438, 4, '#2D2A33')
      + `<g transform="translate(672 286) scale(.55)">${bowlBody(50, 46, 1)}</g>` + `<g transform="translate(820 286) scale(.55)">${bowlBody(50, 46, 1)}</g>`;
  }
  function foodTruck() {
    return `<g class="food-truck">${cube(420, 380, 170, 96, 34, '#2E9E6B', { top: '#58B98A', side: '#237B53' })}${p('M410 380h190l-14-30H424Z', '#F5C542')}${[0, 1, 2, 3].map(i => p(`M${412 + i * 46} 380h46l-4 18h-38Z`, i % 2 ? C.paper : '#F5C542')).join('')}
      ${r(436, 404, 100, 44, '#FFF1E2', 6)}<g transform="translate(452 398) scale(.7)">${bowlBody(50, 46, .8)}</g>${r(546, 404, 30, 40, '#BFE3F2', 4)}${c(456, 480, 15, C.ink)}${c(560, 480, 15, C.ink)}${c(456, 480, 6, '#9A95A0')}${c(560, 480, 6, '#9A95A0')}</g>`;
  }
  function street(o = {}) {
    return r(0, 0, 1000, 560, '#BFE3F2') + c(840, 70, 34, '#FFF3C2')
      + [[120, 60], [380, 40], [620, 70]].map(([x, y]) => e(x, y, 48, 16, '#FFFFFF') + e(x + 30, y - 8, 30, 14, '#FFFFFF')).join('')
      // 학교(배경)
      + cube(390, 120, 220, 120, 40, '#FFE3A1') + r(390, 120, 220, 10, '#E8B44C') + cube(476, 80, 48, 42, 16, '#FFD27A') + c(500, 98, 12, C.paper) + line('M500 90v8l5 4', C.ink, 3)
      + [404, 444, 548, 588].map(x => win(x - 6, 150, 26, 26)).join('') + r(486, 186, 28, 54, '#8A5C3B', 3) + r(330, 232, 340, 12, '#C9B9A2', 4)
      // 길
      + r(0, 490, 1000, 70, '#8F8A93') + [40, 200, 360, 520, 680, 840].map(x => r(x, 522, 90, 8, '#F7F2E6', 4)).join('') + r(0, 486, 1000, 8, '#CFC5B3')
      + (o.rain ? `<g class="rain-fx">${Array.from({ length: 36 }, (_, i) => line(`M${(i * 53) % 1000} ${(i * 97) % 480}l-8 22`, '#7FB5DA', 3)).join('')}</g>` : '')
      + myShop(o) + rivalShop() + (o.truck ? foodTruck() : '');
  }
  function scene(o = {}, painted = false) {
    const fallback = svg(street(o), '0 0 1000 560', 'scene');
    if (!painted) return fallback;
    const placement = {
      chairs: 'left:2.5%;bottom:25%;width:11%',
      staff: 'left:20.6%;bottom:31%;width:7.2%',
      cheese: 'left:10.5%;bottom:42%;width:8%',
      clean: 'left:23.4%;top:45.5%;width:3.3%',
      truck: 'left:39%;bottom:26%;width:25%'
    };
    const props = ['chairs', 'staff', 'cheese', 'clean', 'truck'].filter(id => o[id]).map(id =>
      `<img class="street-prop prop-${id}" style="${placement[id]}" src="../shared-art/tteok/sp_${id}.webp" alt="" draggable="false" onerror="this.closest('.street-art').classList.add('failed');this.remove()">`).join('');
    return `<div class="street-art${o.rain ? ' wet' : ''}"><div class="street-fallback">${fallback}</div><div class="street-paint"><img class="street-bg" src="../shared-art/tteok/street.webp" width="1600" height="900" alt="학교 앞 우리 떡볶이 가게와 왕떡볶이" draggable="false" onload="this.closest('.street-art').classList.add('loaded')" onerror="this.closest('.street-art').classList.add('failed');this.remove()">${props}</div>${o.rain ? '<div class="street-rain" aria-hidden="true"></div>' : ''}</div>`;
  }

  /* 손님 아이: 피부·머리·옷 색이 조금씩 다름 */
  const SKIN = ['#F0C6A7', '#E2AC83', '#C88762', '#A66B4F'], HAIR = ['#2D2830', '#4A3428', '#6B4A2E', '#1E1B22'], SHIRT = ['#3B6FE0', '#2E9E6B', '#F2994A', '#7B52D3', '#E65C8B', '#F5C542', '#4DB6AC'];
  function kid(i = 0) {
    const s = SKIN[i % 4], h = HAIR[(i >> 1) % 4], t = SHIRT[i % 7], bag = SHIRT[(i + 3) % 7];
    return svg(r(36, 70, 9, 24, '#3A3442', 4) + r(55, 70, 9, 24, '#3A3442', 4) + r(30, 40, 40, 36, t, 12) + r(24, 44, 12, 26, bag, 5)
      + c(50, 26, 16, s) + p('M34 24q16-20 32 0v-3q-16-15-32 0Z', h) + c(44, 27, 2, '#24212B') + c(56, 27, 2, '#24212B') + line('M45 34q5 3 10 0', '#24212B', 1.6), '0 0 100 100', 'kid-art');
  }

  function walkingKid(i) {
    return `<span class="walking-kid"><span class="walking-fallback">${kid(i)}</span><img src="../shared-art/tteok/kid_${i % 8}.webp" alt="" draggable="false" onload="this.parentElement.classList.add('loaded')" onerror="this.remove()"></span>`;
  }

  return { C, icon, stars, scene, kid, walkingKid, bowl: () => svg(icons.bowl, '0 0 100 100', 'ico') };
})();
