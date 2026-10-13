/* 다온시의 지도·건물·아이콘 — 3/4 시점 페이퍼컷(앞면·옆면·윗면 3단 명암)
 * 모든 건물은 같은 입체 규칙(cube, gable)으로 그려서 화풍이 하나로 맞춰진다. */
window.CityArt = (() => {
  const C = {
    ink: '#24212B', paper: '#FFFDF8', cream: '#F4EEE2', gold: '#F5C542', red: '#E5484D', orange: '#F2994A',
    blue: '#3B6FE0', green: '#2E9E6B', purple: '#7B52D3', gray: '#8C8F99', dark: '#5B5566', glass: '#9CC9E6'
  };
  /* 색 섞기: amt > 0 밝게, < 0 어둡게 */
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

  /* 입체 상자: (x,y) 앞면 왼쪽 위, 깊이 dep 만큼 오른쪽 위로 */
  const DX = .62, DY = -.48;
  function cube(x, y, w, h, dep, col, o = {}) {
    const dx = dep * DX, dy = dep * DY;
    return p(`M${x} ${y}l${dx} ${dy}h${w}l${-dx} ${-dy}Z`, o.top || mix(col, .28))
      + p(`M${x + w} ${y}l${dx} ${dy}v${h}l${-dx} ${-dy}Z`, o.side || mix(col, -.2))
      + r(x, y, w, h, col);
  }
  /* 박공지붕: 앞면 상자(x,y,w) 위에 높이 rise */
  function gable(x, y, w, rise, dep, wall, roof) {
    const dx = dep * DX, dy = dep * DY, mx = x + w / 2;
    return p(`M${mx} ${y - rise}l${dx} ${dy}L${x + w + dx} ${y + dy}L${x + w} ${y}Z`, mix(roof, -.08))
      + p(`M${x} ${y}L${mx} ${y - rise}L${x + w} ${y}Z`, wall)
      + line(`M${x - 2} ${y + 1}L${mx} ${y - rise - 1}L${x + w + 2} ${y + 1}`, roof, 4);
  }
  const win = (x, y, w, h, f = C.glass) => r(x, y, w, h, f, 1.2) + r(x + .8, y + .8, Math.max(1, w * .32), h - 1.6, mix(f, .45), .8);
  const wins = (xs, ys, w, h, f) => ys.map(y => xs.map(x => win(x, y, w, h, f)).join('')).join('');
  const door = (x, y, w, h, f = '#8A5C3B') => r(x, y, w, h, f, 1.5) + c(x + w - 2.2, y + h / 2, .9, C.gold);
  const ground = (w = 74, x = 50) => e(x, 90, w / 2, 5.5, '#24212B24');
  const smoke = (x, y, n = 3) => `<g class="smoke">${Array.from({ length: n }, (_, i) => `<circle class="puff p${i}" cx="${x}" cy="${y}" r="${4.5 + i * 2}" fill="#D3CFC8"/>`).join('')}</g>`;
  const chimney = (x, y, w, h, col = '#7A7E89') => r(x, y, w, h, col) + r(x + w * .62, y, w * .38, h, mix(col, -.18)) + r(x - .5, y, w + 1, 3, mix(col, -.3));
  const tree = (x, y, s = 1, col = C.green) => r(x - 1.4 * s, y, 2.8 * s, 7 * s, '#8A5C3B', 1) + c(x, y - 2 * s, 7 * s, col) + c(x - 2.4 * s, y - 4 * s, 3.4 * s, mix(col, .25));
  const pine = (x, y, s = 1) => p(`M${x} ${y - 12 * s}l${6 * s} ${11 * s}h${-12 * s}Z`, '#2F7D57') + p(`M${x} ${y - 12 * s}l${6 * s} ${11 * s}h${-6 * s}Z`, '#246747') + r(x - 1, y - 1 * s, 2, 3 * s, '#7B5236');

  /* ───── 시대별 집: 초가집 → 양옥 → 아파트 ───── */
  function house(d = 0) {
    if (d <= 1) {
      // 초가집: 흙벽 + 둥근 볏짚 지붕 + 돌담
      // 지붕은 앞쪽 둥근 볏짚 + 깊이만큼 뒤로 밀린 같은 모양(어둡게)으로 입체를 만든다
      const dx = 16 * DX, dy = 16 * DY;
      return ground(70) + cube(22, 62, 46, 24, 16, '#E7CFA6', { top: '#F0DCB9', side: '#CDB088' })
        + p(`M${14 + dx} ${66 + dy}Q${45 + dx} ${26 + dy} ${76 + dx} ${66 + dy}Z`, '#A97B2C')
        + p(`M76 66L${76 + dx} ${66 + dy}L${60 + dx} ${46 + dy}L62 48Z`, '#B98A36')
        + p('M14 66Q45 26 76 66Z', '#D8A84E')
        + line('M22 58Q45 40 68 58M28 50Q45 37 62 50M45 40v24M33 46l-4 16M57 46l4 16', '#B98A36', 1.6)
        + door(40, 70, 11, 16) + r(25, 70, 8, 8, '#B98A36', 1) + r(26, 71, 6, 6, '#F3E5C6')
        + p('M6 86h22v4H6Z', '#A9A29C') + c(9, 85, 3, '#BDB6AE') + c(15, 84, 3.2, '#A9A29C') + c(22, 85, 3, '#BDB6AE');
    }
    if (d <= 3) {
      // 양옥: 하얀 벽 2층 + 빨간 기와 + 굴뚝
      return ground(72) + cube(20, 46, 50, 40, 20, '#FFF6E8') + gable(20, 46, 50, 20, 20, '#FFEBD2', '#D9534F')
        + chimney(56, 24, 6, 14, '#B57C5A') + wins([26, 56], [52, 68], 9, 9) + door(40, 68, 11, 18, '#3B6FE0') + r(18, 84, 56, 3, '#C9B9A2');
    }
    // 아파트: 높은 상자 + 창문 격자
    return ground(66) + cube(24, 18, 42, 70, 22, '#F1EDE4', { top: '#FFFFFF', side: '#D2CABC' })
      + r(24, 18, 42, 4, '#B9AE99') + wins([28, 40, 52], [26, 37, 48, 59, 70], 8, 7, '#8FC3E4')
      + p('M66 26l13.6-10.6v8l-13.6 10.6Z', '#BFB6A7') + r(38, 81, 14, 7, '#8A5C3B', 1);
  }

  const B = {
    house,
    school: () => ground(84) + cube(12, 48, 64, 38, 20, '#FFE3A1') + r(12, 48, 64, 4, '#E8B44C')
      + cube(36, 30, 16, 18, 8, '#FFD27A') + p('M34 30l10-10 10 10Z', C.orange) + c(44, 38, 5, C.paper) + line('M44 35v3l2 1.5', C.ink, 1.4)
      + wins([16, 28, 56, 66], [56, 70], 7, 8) + door(39, 70, 10, 16, '#8A5C3B') + r(82, 14, 2, 30, C.ink) + p('M84 14h12l-3 4 3 4H84Z', C.red)
      + e(88, 88, 9, 3, '#E6C79A'),
    market: () => ground(84) + cube(16, 56, 60, 30, 16, '#FFF6E8') + r(20, 72, 52, 14, '#B78357', 2)
      + p('M10 40h72l-6 16H16Z', C.red) + [16, 32, 48, 64].map(x => p(`M${x} 40h8l-1.5 16h-7Z`, C.paper)).join('') + p('M82 40l10-8-2 14-8 10Z', mix(C.red, -.2))
      + c(28, 70, 5, C.orange) + c(38, 69, 5, C.gold) + c(48, 70, 5, C.red) + c(58, 69, 5, '#7BC67E') + c(66, 70, 4, C.orange),
    park: () => e(50, 76, 46, 16, '#8FCB7A') + e(50, 74, 42, 13, '#A3D88C') + p('M10 82q30-16 80-4', '#E8D9B0') + line('M12 84q34-14 76-6', '#D8C79A', 3)
      + tree(28, 64, 1.5) + tree(70, 62, 1.3, '#3E9E6E') + tree(52, 54, 1.1, '#4CBB7F')
      + r(38, 74, 18, 3, '#B78357', 1) + r(40, 77, 2, 5, '#8A5C3B') + r(52, 77, 2, 5, '#8A5C3B')
      + c(16, 74, 2.5, C.red) + c(84, 76, 2.5, C.gold) + c(80, 70, 2, '#E65C8B'),
    port: () => r(0, 76, 100, 24, '#4F9CCB') + line('M6 86q5-3 10 0t10 0M60 92q5-3 10 0t10 0', '#8CC3E3', 2)
      + p('M2 62h70l12-10H14Z', '#C4996C') + r(2, 62, 70, 12, '#9B6B47') + [8, 22, 36, 50, 64].map(x => r(x, 62, 2, 12, '#7B5236')).join('')
      + cube(10, 44, 14, 10, 8, C.blue) + cube(10, 34, 14, 10, 8, C.orange) + cube(26, 44, 14, 10, 8, C.red)
      + r(58, 14, 4, 50, '#E3AE24') + r(76, 8, 4, 44, '#E3AE24') + r(54, 12, 32, 5, C.gold) + line('M66 17v18', C.ink, 1.5) + r(62, 35, 8, 5, C.ink, 1)
      + p('M54 78h40l-6 10H60Z', C.paper) + r(66, 72, 14, 6, '#DDE3EA'),
    power: () => ground(86) + cube(8, 50, 52, 36, 16, '#9A9DA8') + r(14, 58, 40, 7, '#B7B9C2', 1) + r(14, 70, 18, 16, '#7A7E89', 1)
      + p('M40 70h8l-3 6h5l-9 10 3-8h-5Z', C.gold)
      + chimney(66, 18, 9, 68) + r(66, 26, 9, 4, C.red) + r(66, 40, 9, 4, C.red) + chimney(80, 30, 8, 56) + r(80, 38, 8, 4, C.red)
      + smoke(70, 12) + smoke(84, 24, 2),
    textile: () => ground(88) + cube(6, 52, 72, 34, 18, '#A9B7C9')
      + [6, 24, 42, 60].map(x => p(`M${x} 52V38l18 14Z`, '#8496AD') + p(`M${x + 18} 52l11.2 -8.6V29.4L${x + 18} 38Z`, '#6E7F96')).join('')
      + wins([12, 30, 48], [62], 12, 9) + r(64, 64, 12, 22, '#6E7F96', 1) + c(26, 78, 5, C.red) + c(26, 78, 2, C.paper)
      + chimney(84, 22, 6, 30, '#6E7F96') + smoke(87, 16, 2),
    road: () => p('M0 30h100v44H0Z', '#6F6A73') + r(0, 30, 100, 4, '#9C97A0') + r(0, 70, 100, 4, '#9C97A0')
      + [4, 30, 56, 82].map(x => r(x, 50, 14, 3.5, C.gold, 1)).join('') + tree(8, 22, .9) + tree(90, 22, .9) + tree(50, 86, .9)
      + cube(14, 38, 22, 8, 6, C.blue) + win(17, 39, 6, 4) + c(18, 47, 2.6, C.ink) + c(32, 47, 2.6, C.ink)
      + cube(58, 56, 30, 10, 6, C.red) + r(58, 56, 9, 10, '#C4383D') + c(64, 67, 2.6, C.ink) + c(82, 67, 2.6, C.ink),
    steel: () => ground(88) + cube(6, 58, 44, 28, 14, '#6A6372') + p('M8 70h40l-6 6H14Z', C.orange)
      + p('M54 88V44q0-10 10-14h8q10 4 10 14v44Z', '#4A4352') + p('M76 88V44q0-10-4-14 10 4 10 14v44Z', '#3A3442')
      + r(60, 50, 16, 12, C.orange, 3) + r(63, 53, 10, 6, C.gold, 2) + chimney(66, 8, 7, 24, '#4A4352')
      + line('M20 58L50 34', '#8B8394', 4) + line('M24 58L54 36', '#6A6372', 2) + smoke(69, 2, 3),
    ship: () => r(0, 72, 100, 28, '#4F9CCB') + line('M8 84q5-3 10 0t10 0M64 90q5-3 10 0', '#8CC3E3', 2)
      + p('M6 56h70l-10 20H16Z', C.red) + p('M76 56l8-6-8 26-10 0Z', mix(C.red, -.25)) + r(10, 50, 66, 7, C.ink, 1) + p('M76 50l8-6v6l-8 6Z', '#3A3442')
      + cube(48, 34, 18, 16, 8, C.paper) + win(51, 38, 4, 4) + win(58, 38, 4, 4)
      + r(86, 6, 5, 66, '#E3AE24') + r(54, 6, 37, 5, C.gold) + line('M62 11v14', C.ink, 1.5),
    chem: () => ground(90) + e(26, 62, 18, 7, '#F7F6F2') + r(8, 62, 36, 26, '#ECEAE4') + r(36, 62, 8, 26, '#D2CEC6') + e(26, 88, 18, 5, '#ECEAE4')
      + r(8, 72, 36, 3, C.green) + e(62, 58, 14, 6, '#F7F6F2') + r(48, 58, 28, 30, '#ECEAE4') + r(70, 58, 6, 30, '#D2CEC6') + r(48, 70, 28, 3, C.blue)
      + chimney(84, 18, 5, 70, '#9C97A0') + p('M86.5 4q7 7 0 15-7-8 0-15Z', C.orange) + p('M86.5 9q3 4 0 8-3-4 0-8Z', C.gold)
      + line('M44 70h4M76 66h8M20 56v-8h40v4', '#9C97A0', 3) + smoke(86, 0, 2),
    car: () => ground(88) + cube(8, 40, 64, 30, 18, '#8EA7DD') + [8, 24, 40, 56].map(x => p(`M${x} 40V30l16 10Z`, C.blue)).join('')
      + wins([14, 30, 46], [48], 10, 8, C.paper) + r(8, 70, 80, 18, '#6E83B8', 1)
      + p('M18 84v-7l7-6h22l8 6h10v7Z', C.red) + p('M27 72h8v5h-11ZM38 72h8l5 5H38Z', C.glass) + c(28, 85, 4.5, C.ink) + c(58, 85, 4.5, C.ink) + c(28, 85, 1.8, '#9C97A0') + c(58, 85, 1.8, '#9C97A0'),
    elec: () => ground(86) + cube(10, 46, 66, 40, 18, '#C9D4EA') + r(10, 46, 66, 5, C.blue)
      + r(24, 18, 38, 26, C.ink, 3) + r(27, 21, 32, 20, '#5FA8D3', 2) + p('M39 25l9 6-9 6Z', C.paper) + r(41, 44, 4, 4, C.ink)
      + wins([16, 30, 44, 58], [58, 72], 9, 8) + door(68, 70, 6, 16, C.blue),
    univ: () => ground(88) + cube(10, 50, 70, 36, 16, '#ECE6F7') + gable(10, 50, 70, 18, 16, '#E1D8F2', C.purple)
      + [16, 30, 52, 66].map(x => r(x, 56, 7, 28, C.paper, 1) + r(x + 5, 56, 2, 28, '#D8D0E8')).join('') + door(40, 66, 10, 20, '#6B4FB0') + r(8, 84, 76, 4, '#B9A8DD')
      + p('M30 12l15-7 15 7-15 7Z', C.ink) + r(43, 12, 4, 8, C.ink) + line('M58 12v10', C.gold, 2) + c(58, 23, 2, C.gold),
    welfare: () => ground(80) + cube(16, 50, 56, 36, 16, '#FFE0C2') + gable(16, 50, 56, 18, 16, '#FFD2AA', C.orange)
      + p('M44 78 32 66q-5-7 2-11 6-3 10 3 4-6 10-3 7 4 2 11Z', C.red) + win(22, 58, 8, 9) + win(58, 58, 8, 9) + door(56, 72, 8, 14)
      + c(12, 84, 3, '#E65C8B') + c(18, 86, 3, C.gold) + c(80, 85, 3, '#E65C8B'),
    semi: () => ground(92) + cube(4, 44, 76, 42, 20, '#F4F7FB', { top: '#FFFFFF', side: '#D5DEEC' }) + r(4, 44, 76, 7, C.blue) + r(4, 74, 76, 3, '#C7D3E8')
      + p('M28 36l6-5h24l-6 5Z', '#C7D3E8') + r(26, 54, 30, 18, C.ink, 3) + r(31, 58, 20, 10, '#5FA8D3', 1.5)
      + [28, 34, 40, 46, 52].map(x => r(x, 50.5, 2, 3.5, C.gray) + r(x, 72, 2, 3.5, C.gray)).join('') + wins([8, 64], [56], 10, 12)
      + cube(84, 26, 6, 18, 4, '#C7D3E8'),
    cleaner: () => e(30, 68, 24, 12, '#9DB7C9') + e(30, 66, 20, 9, '#5FA8D3') + e(72, 74, 22, 11, '#9DB7C9') + e(72, 72, 18, 8.5, '#7EC0E3')
      + line('M20 66q5-4 10 0t10 0M62 72q5-4 10 0t10 0', C.paper, 2.5) + cube(56, 32, 18, 16, 8, '#E8EEF2') + win(60, 36, 5, 5) + win(67, 36, 5, 5)
      + p('M22 20q10 12 0 19-10-7 0-19Z', '#5FA8D3') + p('M22 26q4 5 0 9-4-4 0-9Z', '#BFE1F2'),
    it: () => ground(66) + cube(22, 10, 38, 78, 18, '#A9D3EC', { top: '#E2F2FA', side: '#7EB6D8' })
      + [16, 26, 36, 46, 56, 66].map(y => r(25, y, 32, 6, '#D6ECF7', 1) + r(25, y, 32, 1.5, '#F1F9FD')).join('') + r(36, 78, 10, 10, '#4F7FA6', 1)
      + line('M68 12q7-7 14 0M71 15q4-4 8 0', C.blue, 3) + c(75, 18, 2, C.blue) + r(73.5, 20, 3, 8, '#7EB6D8'),
    green: () => e(50, 88, 46, 6, '#8FCB7A') + r(24, 26, 3.5, 62, C.paper) + r(26, 26, 1.5, 62, '#DAD6CF')
      + `<g class="spin" style="transform-origin:25.8px 24px">${p('M25.8 24 22 0l6 1Z', C.paper)}${p('M25.8 24 47 34l-3 4Z', C.paper)}${p('M25.8 24 6 38l-2-4Z', C.paper)}</g>` + c(25.8, 24, 3, C.gray)
      + p('M44 86l8-20h40l-8 20Z', '#2C4A7A') + line('M54 66l-8 20M64 66l-8 20M74 66l-8 20M84 66l-8 20M48 76h40', '#7FA6D6', 1.2) + r(62, 86, 3, 4, C.gray),
    content: () => ground(86) + cube(10, 40, 66, 46, 16, '#FFD6E2') + r(10, 40, 66, 6, '#E65C8B')
      + r(18, 50, 40, 26, C.ink, 3) + r(21, 53, 34, 20, '#5E4F9E', 2) + p('M33 57l11 6-11 6Z', C.paper)
      + p('m68 50 2.6 6 6.4.6-4.8 4.4 1.4 6.4-5.6-3.4-5.6 3.4 1.4-6.4-4.8-4.4 6.4-.6Z', C.gold) + door(62, 72, 9, 14, '#B83C6A')
      + line('M84 24v14M84 24l8-2v12', C.purple, 2.2) + c(81.5, 38, 2.6, C.purple) + c(89.5, 34, 2.6, C.purple),
    battery: () => ground(88) + cube(6, 48, 70, 38, 18, '#D9EFDF') + r(6, 48, 70, 6, C.green)
      + cube(28, 24, 28, 16, 10, C.ink, { top: '#4A4352', side: '#14121A' }) + r(31, 27, 14, 10, '#4CBB7F', 1.5) + p('M42 28l-6 6h4l-2 5 7-7h-4l2-4Z', C.paper) + r(56, 29, 3, 6, C.ink)
      + wins([12, 30, 48], [62], 10, 9) + door(62, 70, 10, 16, '#1F7A4F')
  };
  function building(id, opts = {}) {
    const draw = B[id] || B.house;
    const d = opts.d || 0;
    let body = id === 'house' ? house(d) : draw();
    if (id === 'road') {
      const start = body.indexOf(cube(14, 38, 22, 8, 6, C.blue));
      body = body.slice(0, start) + `<g class="traffic">${body.slice(start)}</g>`;
    }
    if (id === 'park') body = `<g class="park-trees">${body}</g>`;
    if (d >= 2 && ['school', 'market', 'textile', 'steel', 'car', 'elec'].includes(id)) {
      const color = id === 'school' ? C.orange : id === 'market' ? C.red : C.blue;
      body += cube(78, 64, 14, 22, 6, mix(color, .65)) + win(80, 68, 8, 7);
      if (d >= 4) body += p('M14 46l8-8h34l-8 8Z', '#2C4A7A') + line('M26 38l-8 8M38 38l-8 8M50 38l-8 8', C.glass, 1.5);
    }
    if (opts.level === 2) body += cube(74, 59, 16, 28, 7, '#A9CFE0') + win(77, 65, 9, 9) + r(77, 78, 9, 3, C.gold);
    // 굴뚝이 없는 오염 건물도 실제 오염량에 맞춰 연기를 보여 준다.
    if (opts.pol > 0 && !body.includes('class="smoke"')) body += smoke(78, 18, Math.min(3, opts.pol));
    return svg(body, '0 0 100 100', `bld bld-${id}${opts.cls ? ' ' + opts.cls : ''}`);
  }
  const construction = () => svg(line('M14 90V32h66v58M14 52h66M14 72h66M36 32v58M58 32v58M14 90l22-18 22 18 22-18', '#B78357', 3) + r(82, 10, 4, 78, C.gold) + r(42, 10, 48, 4, C.gold) + line('M46 14v22', C.ink, 2) + r(42, 36, 8, 5, C.ink));
  const boat = () => svg(p('M18 72h64l-12 14H30Z', C.paper) + cube(36, 56, 24, 16, 8, C.blue) + win(40, 59, 10, 7));

  /* ───── 지형 ───── */
  function terrain(t, coastal, seed = 0, d = 0) {
    if (t === 'S') return svg(r(0, 0, 100, 100, '#4F9CCB') + r(0, 0, 100, 20, '#6DB0D8')
      + `<g class="waves">${line('M-10 34q6-5 12 0t12 0 12 0', '#8CC3E3', 3)}${line('M40 62q6-5 12 0t12 0 12 0', '#8CC3E3', 3)}${line('M10 84q6-5 12 0t12 0', '#8CC3E3', 3)}</g>`
      + c(72 - seed % 5 * 6, 24, 1.6, '#DDF0FA'), '0 0 100 100', 'ter ter-sea');
    if (t === 'M') return svg(r(0, 0, 100, 100, '#B7D493')
      + p('M-6 98 30 22l36 76Z', '#8F9A80') + p('M30 22l36 76H30Z', '#76806A') + p('M30 22 20 42l6-2 4 5 4-5 6 3Z', C.paper)
      + p('M38 98 72 38l34 60Z', '#A3AD93') + p('M72 38l34 60H72Z', '#8A9479') + p('M72 38 64 52l5-2 3 4 3-4 5 2Z', C.paper)
      + pine(14, 98, .9) + pine(86, 98, .8) + pine(54, 99, .7), '0 0 100 100', 'ter ter-mountain');
    const rows = [14, 32, 50, 68].map((y, i) => [10, 34, 58].map((x, j) => r(x + ((i + seed) % 2) * 6, y, 20, 7, (i + j + seed) % 3 ? '#BBD58F' : '#AACB7C', 3.5)).join('')).join('');
    const sand = coastal ? p('M0 84q12 5 25 0t25 0 25 0 25 0v16H0Z', '#EAD9A6') + line('M0 84q12 5 25 0t25 0 25 0 25 0', '#F7EED3', 2.5) : '';
    if (t === 'F' && d >= 2) return svg(r(0, 0, 100, 100, d < 4 ? '#D8C5A5' : '#D8DADF')
      + (d < 4 ? line('M0 70L100 28M18 100L100 58', '#BCAB8D', 12) + c(18, 24, 3, '#AFA080')
        : line('M0 24h100M24 0v100M0 76h100M76 0v100', '#BEC3CB', 2) + r(0, 86, 100, 14, '#959AA4')) + sand, '0 0 100 100', 'ter ter-city');
    return svg(r(0, 0, 100, 100, '#CFE3A8') + rows + c(30 + seed % 4 * 12, 46, 1.6, '#F5C542') + sand, '0 0 100 100', 'ter ter-farm');
  }

  /* ───── 아이콘(채운 도형) ───── */
  const icons = {
    compass: c(50, 50, 40, '#DCE8EE') + c(50, 50, 30, '#FFFDF8') + p('M66 24 56 58 34 76 44 42Z', '#2B7A9B') + c(50, 50, 4, C.ink),
    coin: c(50, 50, 40, C.gold) + c(50, 50, 30, '#E3AE24') + p('m50 28 6 14 15 1-11 10 4 15-14-8-14 8 4-15-11-10 15-1Z', C.gold),
    star: p('m50 6 13 28 30 3-23 20 7 30-27-15-27 15 7-30L7 37l30-3Z', C.purple),
    hammer: `<g transform="rotate(-35 50 50)">${r(44, 34, 12, 62, '#8A5C3B', 4)}${r(22, 14, 56, 24, C.dark, 5)}</g>`,
    undo: p('M40 14 10 40l30 26V48q34-4 46 30 4-48-46-52Z', C.ink),
    play: p('M24 12 84 50 24 88Z', 'currentColor'),
    lock: r(22, 44, 56, 44, C.dark, 8) + `<path d="M34 44V32a16 16 0 0 1 32 0v12" fill="none" stroke="${C.dark}" stroke-width="9"/>` + c(50, 64, 6, C.paper),
    bolt: p('M58 4 18 56h26l-8 40 46-56H54Z', C.gold),
    wave: `<g fill="none" stroke="#3D8DC0" stroke-width="10" stroke-linecap="round"><path d="M8 40q10-12 21 0t21 0 21 0 21 0"/><path d="M8 68q10-12 21 0t21 0 21 0 21 0"/></g>`,
    check: p('M12 52 24 40l16 16 36-36 12 12-48 48Z', C.green),
    cross: p('m22 12 28 28 28-28 10 10-28 28 28 28-10 10-28-28-28 28-10-10 28-28-28-28Z', C.red),
    chart: r(10, 58, 16, 32, C.green, 3) + r(34, 42, 16, 48, C.green, 3) + r(58, 24, 16, 66, C.green, 3) + p('M8 40 36 18l18 12 32-22v14l-32 22-18-12-28 22Z', C.gold),
    home: p('M50 8 92 46H80v44H20V46H8Z', C.orange) + r(42, 62, 16, 28, C.paper, 3),
    tree: r(44, 60, 12, 34, '#8A5C3B', 4) + c(50, 38, 32, C.green) + c(34, 48, 16, '#4CBB7F') + c(66, 46, 16, '#4CBB7F'),
    scale: r(46, 14, 8, 72, C.purple, 4) + r(18, 26, 64, 8, C.purple, 4) + r(28, 84, 44, 9, C.purple, 4) + c(50, 14, 8, C.purple) + p('M22 34 8 62h28ZM78 34 64 62h28Z', C.purple) + p('M6 66h32q-16 22-32 0M62 66h32q-16 22-32 0', C.purple),
    menu: r(14, 22, 72, 10, C.ink, 5) + r(14, 45, 72, 10, C.ink, 5) + r(14, 68, 72, 10, C.ink, 5),
    home2: p('M50 10 90 46H78v42H58V64H42v24H22V46H10Z', C.ink),
    smog: c(30, 50, 22, '#9C97A0') + c(56, 42, 26, '#B4AFB8') + c(74, 58, 18, '#9C97A0') + r(10, 58, 80, 20, '#B4AFB8', 10),
    mask: p('M14 40q36-18 72 0v18q-36 26-72 0Z', '#DCE6F0') + `<path d="M4 38q4 14 14 14M96 38q-4 14-14 14" stroke="${C.dark}" stroke-width="5" fill="none"/>` + `<path d="M30 48h40M32 58h36" stroke="#9DB0C4" stroke-width="4"/>`,
    news: r(10, 14, 80, 72, C.paper, 6) + r(18, 24, 64, 10, C.ink, 2) + r(18, 42, 30, 34, '#C9C5BE', 2) + r(54, 42, 28, 6, C.dark, 2) + r(54, 54, 28, 6, C.dark, 2) + r(54, 66, 20, 6, C.dark, 2)
  };
  const icon = (name, cls = '') => svg(icons[name] || icons.star, '0 0 100 100', `ico ${cls}`);

  /* 게이지: 아이콘 모양 안을 아래부터 채움 + 60% 목표 점선 */
  let serial = 0;
  const fills = { econ: '#D6A332', life: C.orange, env: C.green, fair: C.purple };
  function gauge(key, name, value) {
    const id = `cg${++serial}`;
    return svg(`<defs><clipPath id="${id}">${icons[name]}</clipPath></defs><g opacity=".22">${icons[name]}</g><g clip-path="url(#${id})"><rect class="g-fill" x="0" y="0" width="100" height="100" fill="${fills[key]}" style="transform:scaleY(${value / 100})"/></g><path d="M0 40h100" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="6 5" opacity=".55"/>`, '0 0 100 100', 'gauge-art');
  }

  /* 타이틀 스카이라인: 초가집에서 첨단 도시까지 */
  function skyline() {
    const items = [['house', 0], ['textile'], ['house', 2], ['steel'], ['school'], ['car'], ['house', 5], ['semi'], ['it'], ['park'], ['content'], ['green']];
    return items.map(([id, d], i) => `<div class="sky-b" style="--i:${i}">${building(id, { d })}</div>`).join('');
  }

  return { C, mix, building, terrain, construction, boat, icon, gauge, skyline, list: Object.keys(B) };
})();
