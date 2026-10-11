/* 다온 공화국의 모든 그림: 같은 도형과 비율을 사용하는 페이퍼컷 SVG. */
window.SamgwonArt = (() => {
  const colors = { citizen: '#F2994A', press: '#6B7A8F', business: '#E0B33A', gov: '#3B6FE0', president: '#3B6FE0', assembly: '#2E9E6B', court: '#7B52D3', ccourt: '#B8434F' };
  const groups = { citizen: '시민', press: '언론', business: '기업', gov: '정부', assembly: '국회', court: '법원', ccourt: '헌법재판소' };
  const ink = '#24212B', paper = '#FFFDF8';
  let serial = 0;
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const rect = (x, y, w, h, fill, r = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
  const circle = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  const path = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
  const svg = (body, box = '0 0 100 100', cls = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" class="${cls}" aria-hidden="true" focusable="false">${body}</svg>`;
  function flag() {
    return rect(0, 0, 42, 28, paper, 3) + circle(12, 14, 6, '#F5C542') + rect(23, 5, 14, 5, colors.assembly) + rect(23, 12, 14, 5, colors.gov) + rect(23, 19, 14, 5, colors.court);
  }
  function buildingBody(org) {
    const c = colors[org] || colors.court;
    let roof = org === 'assembly' ? path('M60 95a90 65 0 0 1 180 0Z', c) + rect(145, 18, 10, 24, c, 4)
      : org === 'president' || org === 'gov' ? rect(64, 60, 172, 35, c, 8) + rect(147, 18, 6, 45, ink, 2) + `<g transform="translate(153 18)">${flag()}</g>`
      : path('M40 100 150 35 260 100Z', c) + `<g transform="translate(125 61) scale(.5)">${iconBody('balance', paper)}</g>`;
    return roof + rect(40, 105, 220, 95, c, 5) + rect(30, 95, 240, 16, c, 5) + [60, 106, 152, 198].map(x => rect(x, 115, 25, 76, paper, 4)).join('') + rect(128, 151, 44, 49, org === 'assembly' ? '#216E4C' : ['president', 'gov'].includes(org) ? '#294B99' : org === 'ccourt' ? '#802F38' : '#50358D', 4) + rect(22, 200, 256, 13, c, 4) + rect(10, 216, 280, 12, c, 4);
  }
  function building(org) { return svg(buildingBody(org), '0 0 300 240', 'building-art'); }
  function iconBody(name, c = ink) {
    const shapes = {
      people: circle(50, 26, 17, c) + circle(18, 34, 12, c) + circle(82, 34, 12, c) + rect(3, 50, 29, 33, c, 14) + rect(68, 50, 29, 33, c, 14) + rect(27, 48, 46, 46, c, 20),
      money: path('M34 10h32L58 30Q95 48 88 77Q84 96 50 96T12 77Q5 48 42 30Z', c) + rect(30, 27, 40, 8, '#FFFDF855', 4) + path('M43 48h14v9h12v12H57v15H43V69H31V57h12Z', '#FFFDF8AA'),
      law: rect(19, 16, 63, 76, c, 8) + rect(11, 10, 65, 14, c, 7) + rect(32, 37, 36, 5, '#FFFDF8AA', 2) + rect(32, 51, 36, 5, '#FFFDF8AA', 2) + rect(32, 65, 25, 5, '#FFFDF8AA', 2),
      balance: rect(45, 12, 10, 73, c, 5) + rect(17, 29, 66, 8, c, 4) + rect(25, 85, 50, 9, c, 4) + circle(50, 13, 9, c) + path('M20 37 6 65h29ZM80 37 66 65h29Z', c) + path('M5 69h31q-15 24-31 0M65 69h31q-15 24-31 0', c),
      notebook: rect(18, 9, 69, 83, c, 10) + rect(27, 9, 7, 83, '#FFFDF855') + rect(43, 28, 30, 5, paper, 2) + rect(43, 41, 22, 5, paper, 2) + path('M52 59h17v28l-8-6-9 6Z', '#F5C542'),
      gear: `<g fill="${c}">${[0, 45, 90, 135].map(a => `<rect x="40" y="4" width="20" height="92" rx="5" transform="rotate(${a} 50 50)"/>`).join('')}</g>` + circle(50, 50, 35, c) + circle(50, 50, 13, paper),
      sound: path('M12 37h19L55 16v68L31 63H12Z', c) + path('M66 27q33 23 0 46v-11q17-12 0-24ZM65 43q10 7 0 14Z', c),
      mute: path('M12 37h19L55 16v68L31 63H12Z', c) + path('m68 30 25 33-7 6-25-33Zm18 0 7 6-25 33-7-6Z', c),
      pause: rect(25, 17, 17, 66, c, 5) + rect(58, 17, 17, 66, c, 5),
      close: path('m24 16 60 60-8 8-60-60Zm52 0 8 8-60 60-8-8Z', c),
      back: path('M48 15 12 50l36 35 9-10-20-19h50V44H37l20-19Z', c),
      bulb: circle(50, 37, 28, '#F5C542') + rect(39, 57, 22, 22, c, 5) + rect(42, 82, 16, 7, c, 3),
      hand: path('M32 92 17 65q-7-15 4-18l15 11V21q0-15 12-15t10 15v26q24-11 31 9l-8 36Z', '#E9B18C') + rect(30, 85, 52, 15, colors.gov, 5),
      spark: path('m50 5 11 33 34 12-34 12-11 33-11-33L5 50l34-12Z', '#F5C542')
    };
    return shapes[name] || shapes.balance;
  }
  const icon = (name, c) => svg(iconBody(name, c), '0 0 100 100', 'icon-art');
  function gauge(name, key, value) {
    const id = `gauge-${++serial}`;
    return svg(`<defs><clipPath id="${id}">${iconBody(name, ink)}</clipPath></defs><g>${iconBody(name, '#D6CEBF')}</g><g clip-path="url(#${id})"><rect class="gauge-fill" data-fill="${key}" x="0" y="0" width="100" height="100" style="transform:scaleY(${value / 100})" fill="${key === 'm' ? '#D6A332' : key === 'l' ? colors.court : colors.citizen}"/></g><g class="gauge-outline" fill="none" stroke="#746B5E" stroke-width="1.6" stroke-linejoin="round">${iconBody(name, 'none')}</g>`, '0 0 100 100', 'gauge-art');
  }
  const looks = {
    grandma: ['#EBC0A0', '#DDD9D6', '#CB7193', 'perm', 'glasses'],
    kid: ['#E2AC83', '#26232D', '#F2994A', 'messy', 'cap'],
    shopkeeper: ['#C88762', '#382B29', '#E5484D', 'short', 'bandana'],
    teacher: ['#E9B591', '#49352F', '#CAB69A', 'long', 'book'],
    activist: ['#AA7052', '#29252A', '#3C8B68', 'short', 'beanie'],
    reporter: ['#EBC09A', '#24212B', '#68788C', 'spiky', 'mic'],
    tycoon: ['#E2A77D', '#5E493C', '#4C4A5C', 'combover', 'mustache'],
    secretary: ['#B97E5F', '#24212B', '#283B63', 'part', 'tablet'],
    minister: ['#E4AD86', '#A9A29C', '#3A5175', 'part', 'folder'],
    police: ['#C58965', '#24212B', '#2D4164', 'short', 'police'],
    president: ['#E6B28D', '#D7D3C8', '#293D66', 'part', 'flag'],
    lawmaker: ['#DFA984', '#5B534A', '#5E796D', 'part', 'badge'],
    aide: ['#E4AE8B', '#39302F', '#568A71', 'pony', 'papers'],
    judge: ['#D39A77', '#302A32', '#2C2934', 'short', 'robe'],
    chief: ['#DCAA87', '#E6E2D7', '#2C2934', 'part', 'chief'],
    justice: ['#BA7E5E', '#4D4140', '#2C2934', 'part', 'justice']
  };
  const faces = [
    ['#E9B591', '#382C2B', 'part'], ['#A66B4F', '#24212B', 'curly'],
    ['#F0C6A7', '#624137', 'bob'], ['#CD906D', '#2D2830', 'pony']
  ];
  function portrait(character, options = {}) {
    const isPlayer = character === 'player', role = options.role || 'assembly';
    const face = faces[options.face || 0];
    const look = isPlayer ? [face[0], face[1], role === 'court' ? '#2C2934' : role === 'president' ? '#293D66' : colors.assembly, face[2], role === 'court' ? 'robe' : role === 'president' ? 'flag' : 'badge'] : looks[character] || looks.teacher;
    const [skin, hair, clothing, hairstyle, accessory] = look;
    const group = isPlayer ? role : window.SAMGWON.characters[character].group;
    const background = colors[group], mood = options.mood || 'neutral';
    let hairBack = ['long', 'bob'].includes(hairstyle) ? rect(67, 64, 166, 185, hair, 67) : hairstyle === 'pony' ? `<ellipse cx="234" cy="153" rx="31" ry="73" fill="${hair}"/>` : '';
    let topHair = path('M72 119Q60 57 109 49q90-30 120 47l-8 46-24-42q-55 32-111-1Z', hair);
    if (['perm', 'curly'].includes(hairstyle)) topHair = [80, 108, 139, 171, 204, 222].map((x, i) => circle(x, 84 + (i % 2) * 12, 28, hair)).join('');
    if (hairstyle === 'messy' || hairstyle === 'spiky') topHair = path('M65 120 76 65l27 10 9-34 35 19 27-24 12 32 35-10 17 66-30-25-29 7-18-20-30 22-26-6Z', hair);
    if (hairstyle === 'combover') topHair = path('M70 126q-8-36 18-51l9 59ZM96 73q50-39 110 4l-8 9q-56-21-102 0ZM210 92q30 6 20 48l-16-14Z', hair);
    let extras = '';
    if (['glasses', 'mic', 'folder', 'justice'].includes(accessory)) extras += `<g fill="${ink}"><rect x="85" y="133" width="54" height="37" rx="14"/><rect x="161" y="133" width="54" height="37" rx="14"/>${rect(136, 141, 28, 7, ink)}</g>${rect(91, 139, 42, 25, skin, 9)}${rect(167, 139, 42, 25, skin, 9)}`;
    if (accessory === 'cap') extras += path('M67 101q9-57 85-59t79 60Z', '#F5C542') + rect(56, 93, 176, 17, '#DDA82A', 8) + rect(202, 99, 55, 13, '#F5C542', 6);
    if (accessory === 'bandana') extras += path('M72 102q2-55 79-55t78 55Z', '#E5484D') + circle(110, 78, 5, paper) + circle(145, 68, 5, paper) + circle(181, 79, 5, paper) + path('m227 96 26 30-24-6Z', '#E5484D');
    if (accessory === 'beanie') extras += path('M69 96q2-69 81-69t81 69Z', '#2E9E6B') + rect(66, 87, 170, 27, '#237B53', 12);
    if (accessory === 'police') extras += path('M65 89 88 44h123l25 45Z', '#2D4164') + rect(60, 87, 180, 18, '#1D2D4C', 8) + path('m150 57 16 6-4 19-12 7-12-7-4-19Z', '#F5C542');
    if (accessory === 'papers') extras += `<g transform="rotate(-8 150 300)">${rect(109, 269, 91, 83, '#E9E0CF', 5)}${rect(102, 262, 91, 83, paper, 5)}${rect(114, 277, 64, 5, '#B9C7C0')}${rect(114, 289, 49, 5, '#B9C7C0')}</g>` + rect(113, 84, 28, 15, ink, 5) + rect(160, 84, 28, 15, ink, 5) + rect(138, 89, 27, 5, ink);
    if (accessory === 'book') extras += path('M92 279q30-8 58 7 28-15 58-7v67q-30-8-58 4-28-12-58-4Z', '#B8434F') + rect(147, 284, 6, 67, '#FFFDF844');
    if (accessory === 'tablet' || accessory === 'folder') extras += `<g transform="rotate(-8 197 310)">${rect(156, 266, 92, 90, accessory === 'tablet' ? ink : '#D6AA61', 10)}${rect(164, 274, 76, 67, accessory === 'tablet' ? '#A9C7DE' : paper, 4)}</g>`;
    if (accessory === 'tablet') extras += rect(227, 139, 7, 29, ink, 3);
    if (accessory === 'mic') extras += rect(223, 281, 12, 79, ink, 5) + `<ellipse cx="229" cy="280" rx="20" ry="28" fill="${ink}"/>` + rect(207, 301, 44, 25, paper, 4) + `<text x="229" y="320" text-anchor="middle" fill="${ink}" font-size="16" font-weight="900">기자</text>`;
    if (accessory === 'mustache') extras += path('M150 182q-20-21-38-3l-18 0q9 26 56 10 47 16 56-10l-18 0q-18-18-38 3Z', hair) + path('M136 262h28l-4 17 15 52-25 23-25-23 15-52Z', '#F5C542') + path('M120 218q30 12 60 0-27 24-60 0', '#BC815D');
    if (accessory === 'badge') extras += circle(204, 291, 13, '#F5C542') + `<g transform="translate(196 283) scale(.16)">${iconBody('law', '#956F22')}</g>`;
    if (accessory === 'flag') extras += path('M140 257h20l-3 15 12 65-19 17-19-17 12-65Z', '#B8434F') + `<g transform="translate(186 278) scale(.55)">${flag()}</g>`;
    if (['robe', 'chief', 'justice'].includes(accessory)) extras += path('M98 250 150 292l52-42 21 110h-36l-9-83-28 26-28-26-9 83H77Z', accessory === 'justice' ? '#B8434F' : colors.court) + (accessory === 'chief' ? rect(145, 301, 10, 59, '#F5C542') : '');
    if (character === 'activist') extras += path('M94 242h112l-13 30H107Z', '#E0B33A') + circle(200, 290, 14, '#A4D3C4') + path('m193 279 15 4-3 14-9 3-8-13Z', '#2E9E6B');
    if (character === 'kid') extras += rect(82, 264, 18, 96, '#D97532', 7) + rect(201, 264, 18, 96, '#D97532', 7);
    if (character === 'minister') extras += circle(105, 278, 8, '#F5C542');
    if (character === 'aide') extras += path('M115 251h7l-26 46-6-4Z', ink) + rect(78, 291, 31, 39, paper, 5) + rect(83, 297, 21, 11, '#A9C7DE', 2) + rect(84, 315, 18, 3, '#6B7A8F', 1);
    if (character === 'shopkeeper') extras += path('M101 252h98l10 108H91Z', '#E9E0CF') + rect(115, 297, 71, 38, '#D94E3D', 17) + rect(128, 305, 14, 19, '#F8D8A5', 5) + rect(153, 305, 14, 19, '#F8D8A5', 5);
    const smile = mood === 'sad' ? path('M129 205q21-22 42 0-21-11-42 0', ink) : mood === 'shock' ? `<ellipse cx="150" cy="196" rx="11" ry="15" fill="${ink}"/>` : mood === 'happy' || mood === 'proud' || ['kid', 'grandma'].includes(character) ? path('M122 186h56q-6 33-28 33t-28-33', ink) + path('M129 188h42l-5 9h-32Z', paper) : path('M131 193q20 13 39-3-15 23-39 3', ink);
    const eyes = [111, 188].map(x => `<ellipse cx="${x}" cy="151" rx="7" ry="${character === 'tycoon' ? 4 : mood === 'shock' ? 12 : 10}" fill="${ink}"/>` + circle(x + 2, character === 'tycoon' ? 150 : 148, 2.2, paper)).join('');
    const brows = [101, 178].map(x => rect(x, 123, 24, character === 'lawmaker' || character === 'activist' ? 9 : 5, hair, 3)).join('');
    let moodExtras = mood === 'shock' || character === 'shopkeeper' ? path('M243 136q-22 31-10 39t17-4q3-13-7-35Z', '#9FCBE3') : '';
    if (mood === 'proud') moodExtras += `<g transform="translate(20 37) scale(.35)">${iconBody('spark')}</g><g transform="translate(242 177) scale(.35)">${iconBody('spark')}</g>`;
    const body = `${options.background === false ? '' : rect(0, 0, 300, 360, background)}${options.standing ? path('M92 350h116l-8 104h-43l-7-71-7 71h-43Z', clothing) + rect(89, 449, 55, 20, ink, 7) + rect(156, 449, 55, 20, ink, 7) : ''}${hairBack}${path('M42 360v-49q0-57 71-65h74q71 8 71 65v49Z', clothing)}${path('M105 249 150 277l45-28-14-7h-62Z', paper)}${rect(125, 202, 50, 59, skin, 16)}${rect(125, 211, 50, 23, '#24212B15', 10)}${circle(76, 151, 17, skin)}${circle(224, 151, 17, skin)}${rect(76, 65, 148, 161, skin, 67)}${topHair}${brows}${circle(103, 178, 13, '#E9818138')}${circle(196, 178, 13, '#E9818138')}${rect(141, 157, 18, 20, '#24212B16', 9)}${extras}${eyes}${smile}${moodExtras}`;
    return svg(body, options.standing ? '0 0 300 480' : '0 0 300 360', 'portrait-art');
  }
  function prop(name) {
    const c = colors.court;
    const drawings = {
      trophy: path('M29 14h42v35q0 22-21 24-21-2-21-24Z', '#F5C542') + path('M14 18h16v9H23v19l15 8-5 10-19-13ZM70 18h16v33L67 64l-5-10 15-8V27h-7Z', '#DAA526') + rect(45, 68, 10, 16, '#DAA526') + rect(28, 83, 44, 12, '#F5C542', 5),
      flowers: path('m21 48 58 0-16 48H37Z', '#E9B18C') + [25, 50, 75].map((x, i) => rect(x - 2, 28, 4, 50, '#2E9E6B') + circle(x, 30 - i % 2 * 10, 18, i === 1 ? '#F5C542' : '#B8434F') + circle(x, 30 - i % 2 * 10, 7, paper)).join(''),
      emptySafe: rect(10, 13, 80, 78, '#6B7A8F', 9) + rect(21, 24, 53, 53, ink, 5) + path('M74 24 95 14v72L74 77Z', '#9CA6B4') + circle(84, 49, 6, paper),
      gavel: `<g transform="rotate(-28 50 50)">${rect(43, 26, 14, 65, '#825638', 4)}${rect(18, 12, 65, 27, '#B78357', 7)}</g>` + rect(35, 85, 56, 10, '#825638', 4),
      emptyChairs: [8, 56].map(x => rect(x, 20, 34, 35, '#B78357', 5) + rect(x - 3, 56, 40, 10, '#825638', 3) + rect(x + 2, 65, 6, 28, '#825638') + rect(x + 26, 65, 6, 28, '#825638')).join(''),
      scarecrow: rect(45, 26, 10, 73, '#B78357', 3) + rect(10, 44, 80, 9, '#B78357', 3) + circle(50, 26, 18, '#E9B18C') + path('M24 25 35 5h30l12 20Z', '#E0B33A') + path('M30 43h40l9 29H21Z', '#3B6FE0') + circle(44, 25, 3, ink) + circle(57, 25, 3, ink),
      brokenCrown: path('M9 28 26 42l11-24 15 31-10 30H17ZM60 29l10 11 20-16-7 49H54l8-15-9-12Z', '#F5C542') + rect(18, 82, 29, 8, '#DAA526', 3) + rect(55, 77, 30, 8, '#DAA526', 3),
      envelope: rect(8, 23, 84, 57, '#E0B33A', 7) + path('M8 23 50 57 92 23Z', '#F5C542') + circle(50, 58, 8, '#B8434F'),
      phone: rect(25, 5, 50, 91, ink, 11) + rect(31, 16, 38, 64, '#A9C7DE', 4) + circle(50, 88, 4, paper),
      ballot: rect(11, 42, 78, 50, colors.assembly, 7) + rect(25, 51, 50, 6, ink, 3) + `<g transform="rotate(-12 50 35)">${rect(33, 7, 34, 46, paper, 3)}${path('m40 26 8 8 12-15 5 4-16 20-14-13Z', colors.assembly)}</g>`,
      ferrisWheel: circle(50, 44, 35, '#D3A342') + circle(50, 44, 28, '#F4EEE2') + [0, 60, 120].map(a => `<g transform="rotate(${a} 50 44)">${rect(47, 11, 6, 66, '#D3A342')}</g>`).join('') + [0, 60, 120, 180, 240, 300].map(a => `<g transform="rotate(${a} 50 44)">${rect(42, 2, 16, 15, '#B8434F', 4)}</g>`).join('') + path('M47 42h6l26 54H67L50 59 33 96H21Z', '#6B7A8F'),
      brokenScale: `<g transform="rotate(-18 50 50)">${iconBody('balance', c)}</g>` + path('m50 16-7 22 15 8-11 15 12 4 5-21-13-10 8-18Z', paper)
    };
    return svg(drawings[name] || drawings.flowers, '0 0 100 100', 'prop-art');
  }
  function checks(obtained) {
    const points = { assembly: [450, 85], president: [140, 400], court: [760, 400] }, id = `arrows-${++serial}`;
    const lines = window.SAMGWON.checks.map(check => {
      const [x1, y1] = points[check.from], [x2, y2] = points[check.to], lit = check.powers.some(p => obtained.includes(p));
      const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy), offset = 24;
      const sx = x1 + dx * .22 - dy / length * offset, sy = y1 + dy * .22 + dx / length * offset;
      const ex = x2 - dx * .22 - dy / length * offset, ey = y2 - dy * .22 + dx / length * offset;
      const c = lit ? colors[check.from] : '#B9B3AC';
      return `<path d="M${sx} ${sy}L${ex} ${ey}" stroke="${c}" stroke-width="8" stroke-linecap="round" fill="none" ${lit ? '' : 'stroke-dasharray="9 12"'} marker-end="url(#${id}-${lit ? check.from : 'locked'})"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 490" class="checks-art" role="img" aria-label="국회, 정부, 법원의 여섯 방향 견제 관계"><defs>${[...Object.keys(points), 'locked'].map(org => `<marker id="${id}-${org}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="${colors[org] || '#B9B3AC'}"/></marker>`).join('')}</defs>${lines}${Object.entries(points).map(([org, [x, y]]) => `<g transform="translate(${x - 65} ${y - 55}) scale(.43)">${buildingBody(org)}</g><text x="${x}" y="${y + 68}" text-anchor="middle" font-size="30" font-weight="900" fill="${colors[org]}">${org === 'assembly' ? '국회' : org === 'president' ? '정부' : '법원'}</text>`).join('')}</svg>`;
  }
  return { colors, groups, esc, portrait, building, icon, gauge, prop, checks };
})();
