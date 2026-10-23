/* 무역왕 6.0 화면 시제품(2단계): 흐르는 시간, 지도 위 배, 항로 끌기, 항로 카드, 뉴스, 멈춤 창.
   저장·단계 안내·엔딩 그림은 3단계에서 붙인다. */
(() => {
  'use strict';
  const E = window.TradeEngine6, T = E.T, X = E.X, A = window.TradeArt;
  const ART = new URL('../shared-art/trade/', location.href).href;
  const $ = s => document.querySelector(s);
  const esc = A.esc, sum = a => a.reduce((s, v) => s + v, 0);
  const ico = g => A.icon(T.goods[g].icon);
  const gname = g => T.goods[g].name;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 지도 자리(%): 가까운 섬 2곳(왕복 2달)은 우리 항구 옆, 먼 섬 2곳(3달)은 위쪽, 상인은 맨 위
  const NEAR = [[20, 62], [80, 62]], FAR = [[16, 23], [84, 23]], HOME = [50, 78], WORLD = [50, 7];
  const GOODS = [0, 1, 2, 3, 4], first = a => { const g = a ? a.findIndex(v => v > 0) : -1; return g < 0 ? null : g; };
  // 바닷길: 지도 그림(shared-art/trade/v6/map6.webp)에서 바다인 갈림목(%)을 잇고, 두 곳 사이는 가장 짧은 길을 부드럽게 휘어 간다.
  const NODES = {H: HOME, NL: NEAR[0], NR: NEAR[1], FL: FAR[0], FR: FAR[1], W: WORLD,
    hub: [50, 64], sl: [35, 72], sr: [65, 72], lb: [44.5, 52], lt: [44.5, 22], rb: [55.8, 52], rt: [55.8, 22], tl: [28, 15], tr: [72, 15], tm: [50, 15]};
  const EDGES = 'H-hub H-sl H-sr sl-NL sr-NR sl-hub sr-hub hub-lb hub-rb lb-lt rb-rt lt-tm rt-tm tm-W lt-tl rt-tr tl-FL tr-FR tl-tm tr-tm'.split(' ').map(e => e.split('-'));
  // 우리 배 1~5의 색: 항로선·지도 번호·배 카드에 같은 색을 써서 어느 배가 어디 가는지 한눈에 보이게 한다.
  const SHIP_COLORS = ['#e2533f', '#2b86d6', '#2e9e52', '#9a55cf', '#e89a10'], tint = k => `--c:${SHIP_COLORS[k % SHIP_COLORS.length]}`;
  const ASPECT = 2.72;   // 지도 그림 가로:세로. %좌표 거리를 화면 거리로 바꿀 때 쓴다.
  const app = $('#app'), layer = $('#layer'), ticker = $('#ticker');
  let G = null, speed = 0, resume = 1, acc = 0, last = 0, sel = null, dock = null, drag = null, slot = {}, laneCache = {};

  const P = () => E.player(G);
  const nameOf = id => id === 'world' ? '먼 바다 상인' : E.nation(G, id).name;
  const hearts = r => '♥'.repeat(r) + `<i>${'♥'.repeat(3 - r)}</i>`;
  const avg = a => a.length ? Math.round(sum(a) / a.length) : 0;
  const monthMs = () => X.monthSeconds * 1000;

  // ---------- 시작 ----------
  function title() {
    G = null; speed = 0; layer.hidden = true; ticker.hidden = true; ticker.dataset.key = '';
    app.innerHTML = `<section class="start">
      <div><p class="eyebrow">6학년 사회 · 무역 · 시제품</p><h1>무역왕 6.0</h1>
      <p>시간이 흐르는 세계 지도에서 배 세 척으로 무역 항로를 정해요. 잘 만드는 건 팔고, 모자란 건 사 오고, 위기에 대비하세요.</p>
      <p class="muted">나라를 고르세요.</p></div>
      <div class="pick">${T.countries.map(c => {
        const lv = E.S.countries[c.id].levels;
        return `<button class="nation" data-start="${c.id}" style="--tint:${c.color}">
          <img src="${ART}port_${c.portrait}.webp" alt=""><b>${esc(c.name)}</b><small>${esc(c.condition)}</small>
          <span class="lv">${lv.map((l, g) => `<span title="${gname(g)} ${l}단계">${ico(g)}${l}</span>`).join('')}</span></button>`;
      }).join('')}</div></section>`;
  }
  function start(id) {
    G = E.newGame((Math.random() * 1e9) >>> 0, id);
    slot = {[P().id]: 'H', world: 'W'}; laneCache = {};
    const near = Object.keys(G.dist).filter(k => G.dist[k] === 2), far = Object.keys(G.dist).filter(k => G.dist[k] !== 2);
    near.forEach((k, i) => slot[k] = ['NL', 'NR'][i]); far.forEach((k, i) => slot[k] = ['FL', 'FR'][i]);
    speed = 0; resume = 1; acc = 0; sel = null; dock = null;   // 첫 화면은 개항 창으로 멈춰 있다
    render();
  }

  // ---------- 화면 ----------
  function rankRows() {
    return [...G.nations].map(n => ({n, s: n.years.length ? avg(n.years) : avg(n.seasons)})).sort((a, b) => b.s - a.s);
  }
  // 섬 카드는 우리 기준으로만: 여기서 사 올 수 있는 모자란 물건, 여기에 팔 수 있는 물건
  function island(o) {
    const [x, y] = NODES[slot[o.id]], me = P(), far = G.dist[o.id] !== 2;
    const getG = GOODS.filter(g => E.sells(G, o, g) && E.buys(G, me, g)), giveG = GOODS.filter(g => E.sells(G, me, g) && E.buys(G, o, g));
    const trend = g => G.trend[g] > 0 ? '<em class="up">▲</em>' : G.trend[g] < 0 ? '<em class="down">▼</em>' : '';
    const cut = G.cut && G.cut.until > G.month && G.cut.source === o.id;
    const busy = G.nations.filter(n => n !== me && n !== o && n.ships.some(s => s.route?.to === o.id)).length >= 2;
    return `<button class="isle${far ? ' far' : ''}${sel !== null ? ' target' : ''}" data-drop="${o.id}" style="left:${x}%;top:${y}%"
        aria-label="${esc(o.name)}, 왕복 ${E.tripTime(G, me, o.id)}달">
      <span class="isle-head"><img src="${ART}port_${T.countries.find(c => c.id === o.id).portrait}.webp" alt="">
        <span><b>${esc(o.name)}</b><span class="hearts">${hearts(E.rel(G, me, o))}</span><small>⛵${E.tripTime(G, me, o.id)}달 · 대표 ${ico(o.main)}${busy ? ' · <span class="busy">👥붐벼요</span>' : ''}</small></span></span>
      ${cut ? '<span class="cut">🚫 분쟁 중</span>' : ''}
      <span class="chips"><span class="buy">📥 살 것 ${getG.map(g => `<span title="${gname(g)}">${ico(g)}${trend(g)}</span>`).join('') || '<small>없음</small>'}</span>
      <span class="sell">📤 팔 것 ${giveG.map(g => `<span title="${gname(g)}">${ico(g)}${trend(g)}</span>`).join('') || '<small>없음</small>'}</span></span></button>`;
  }
  // 갈림목 그래프에서 가장 짧은 길(지도 비율로 잰 거리) → 부드러운 곡선 점 목록
  function route(a, b) {
    const dist = {[a]: 0}, prev = {}, todo = new Set(Object.keys(NODES)), d = k => dist[k] ?? Infinity;
    while (todo.size) {
      const u = [...todo].reduce((m, v) => d(v) < d(m) ? v : m);
      todo.delete(u);
      if (u === b) break;
      for (const [p, q] of EDGES) for (const [x, y] of [[p, q], [q, p]]) if (x === u && todo.has(y)) {
        const w = d(u) + Math.hypot((NODES[u][0] - NODES[y][0]) * ASPECT, NODES[u][1] - NODES[y][1]);
        if (w < d(y)) { dist[y] = w; prev[y] = u; }
      }
    }
    const keys = [b]; while (keys[0] !== a) keys.unshift(prev[keys[0]]);
    const pts = keys.map(k => NODES[k]), out = [];
    for (let i = 0; i < pts.length - 1; i++) {   // Catmull-Rom 곡선
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      for (let t = 0; t < 1; t += .1) out.push([0, 1].map(c => .5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t * t * t)));
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function lane(from, to) {
    const k = from + '>' + to;
    if (!laneCache[k]) {
      const pts = route(slot[from], slot[to]), acc = [0];
      for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot((pts[i][0] - pts[i - 1][0]) * ASPECT, pts[i][1] - pts[i - 1][1]));
      laneCache[k] = {pts, acc, d: 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L')};
    }
    return laneCache[k];
  }
  function along(l, u) {
    const d = u * l.acc[l.acc.length - 1];
    let i = 1; while (i < l.acc.length - 1 && l.acc[i] < d) i++;
    const f = (d - l.acc[i - 1]) / ((l.acc[i] - l.acc[i - 1]) || 1);
    return [0, 1].map(c => l.pts[i - 1][c] + (l.pts[i][c] - l.pts[i - 1][c]) * f);
  }
  function lanes() {
    const npc = new Set(), me = P();
    for (const n of G.nations.slice(1)) for (const s of n.ships) if (s.route && slot[s.route.to]) npc.add(lane(n.id, s.route.to).d);
    // 우리 배는 배마다 한 줄씩. 같은 항로를 둘이 쓰면 점선을 어긋나게 해서 두 색이 번갈아 보인다.
    return [...npc].map(d => `<path class="npc" d="${d}"/>`).join('') + me.ships.map((s, k) => s.route && slot[s.route.to]
      ? `<path class="mine" style="${tint(k)};stroke-dashoffset:${k * 9}" d="${lane(me.id, s.route.to).d}"/>` : '').join('');
  }
  function shipCard(s, i) {
    const r = s.route, me = P();
    let body = '<span class="hint">👉 섬으로 끌어 보세요</span>';
    if (r) {
      const o = E.nation(G, r.to), gs = a => GOODS.filter(g => a[g]);
      // 지금 값으로 다시 계약할 때보다 이득이면 유리(+), 손해면 불리(−)
      const edge = sum(GOODS.map(g => r.give[g] * (r.gp[g] - (r.give[g] ? E.price(G, me, o, g) : 0)) + r.get[g] * ((r.get[g] ? E.price(G, o, me, g) : 0) - r.bp[g])));
      const line = (a, p, sign) => gs(a).length ? `<span class="deal">${sign === '+' ? '📤' : '📥'}${gs(a).map(g => `${ico(g)}<i>${a[g]}</i>`).join('')}<b class="${sign === '+' ? 'plus' : 'neg'}">${sign}${sum(GOODS.map(g => a[g] * p[g]))}</b></span>` : '';
      body = `<span class="who">${esc(nameOf(r.to))}${s.state === 'sea' ? ' ⛵' : ' ⚓'}</span>
        ${s.breaking ? '' : `<button class="mini" data-break="${i}" title="계약 깨기">깨기</button>`}
        ${line(r.give, r.gp, '+')}${line(r.get, r.bp, '−')}
        <span class="foot"><span class="pips" aria-label="${r.done}/${r.trips}번 왕복">${'●'.repeat(r.done)}${'○'.repeat(Math.max(0, r.trips - r.done))}</span>
        ${s.waited ? `<span class="bad">⚠ ${gname(first(r.give))} 모자람</span>` : edge > 0 ? '<span class="good">▲ 유리</span>' : edge < 0 ? '<span class="bad">▼ 불리</span>' : ''}
        ${s.next || s.breaking ? `<small>${s.next ? `다음 ➜ ${esc(nameOf(s.next.to))}` : '계약 깨는 중'}</small>` : ''}</span>`;
    }
    return `<div class="shipcard${sel === i ? ' sel' : ''}${r ? '' : ' idle'}" style="${tint(i)}" data-ship="${i}" data-drag tabindex="0" role="button" aria-label="배 ${i + 1}">
      <span class="no"><img src="${ART}ship.webp" alt="" draggable="false"><b class="num">${i + 1}</b></span>${body}</div>`;
  }
  function render() {
    if (!G) return title();
    const me = P(), need = E.needs(G, me), y = Math.floor(G.month / 12) + 1, m = G.month % 12 + 1;
    const rows = rankRows(), rank = rows.findIndex(r => r.n === me) + 1;
    app.innerHTML = `<header class="bar">
        <b class="brand">무역왕</b>
        <span class="when"><b>${y}년째 ${m}월</b><span class="track"><span style="width:${(G.month / 60) * 100}%"></span></span></span>
        <span class="speed" role="group" aria-label="시간">
          <button data-speed="0" aria-pressed="${!speed}" title="멈춤 (Space)">⏸</button>
          <button data-speed="1" aria-pressed="${speed === 1}" title="재생">▶</button>
          <button data-speed="2" aria-pressed="${speed === 2}" title="빠르게">▶▶</button></span>
        <span class="stat main" title="우리 대표 물건">대표 ${ico(me.main)}<b class="name">${gname(me.main)}</b></span>
        <span class="stat" title="금고">💰<b>${me.money}</b>원</span>
        <span class="stat" title="생활 점수">😊<b>${me.last ? me.last.score : '–'}</b>점</span>
        <span class="stat" title="순위">🏆<b>${rank}</b>등</span>
      </header>
      <section class="map" id="map">
        <svg class="lanes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lanes()}</svg>
        <button class="isle world" data-drop="world" style="left:${WORLD[0]}%;top:${WORLD[1]}%"><b>🧭 먼 바다 상인</b><small>⛵4달 · 비싸요</small></button>
        ${G.nations.slice(1).map(island).join('')}
        <div class="home" style="left:${HOME[0]}%;top:${HOME[1]}%"><img src="${ART}port_home.webp" alt=""><b>${esc(me.name)} · 대표 ${ico(me.main)}</b></div>
        <div id="ships">${G.nations.flatMap(n => n.ships.map((s, k) => `<span class="ship ${n === me ? 'mine' : 'npc'}" data-n="${n.id}" data-k="${k}"${n === me ? ` style="${tint(k)}" data-drag data-ship="${k}" title="배 ${k + 1}: 섬으로 끌어 보세요"` : ''}><img src="${ART}ship.webp" alt="" draggable="false"><i></i>${n === me ? `<b>${k + 1}</b>` : ''}</span>`)).join('')}</div>
        ${dock ? dockPanel() : ''}
      </section>
      <footer class="dock">
        <div class="cards">${me.ships.map(shipCard).join('')}</div>
        <div class="basket" aria-label="창고와 계절 필요량">${need.map((q, g) => { const c = E.count(me, g), p = E.produces(G, me, g);
          // 배지: 대표 물건 / 생산이 필요보다 적어 늘 수입해야 하는 물건. 빨간 칸은 이번 계절에 모자랄 물건.
          const tag = g === me.main ? '<em class="tag main">대표</em>' : E.buys(G, me, g) ? '<em class="tag lack">모자라요</em>' : '';
          return `<span class="${c + p < q ? 'short' : ''}" title="${gname(g)}: 창고 ${c}, 계절 생산 ${p}, 필요 ${q}">${tag}${ico(g)}<b>${c}</b><small>필요 ${q}</small></span>`; }).join('')}</div>
      </footer>`;
    news();
    if (G.pending) showPending(); else if (G.over) showEnd(); else layer.hidden = true;
    placeShips();
  }
  // 하단 뉴스 티커: 새 소식이 올 때만 다시 그려서 흐름이 끊기지 않게 한다.
  function news() {
    const items = G.news.slice(-6).reverse(), key = items.map(n => n.month + n.text).join('|');
    ticker.hidden = false;
    if (ticker.dataset.key === key) return;
    ticker.dataset.key = key;
    const chars = sum(items.map(n => n.text.length + 6));
    ticker.innerHTML = `<span class="roll" style="--dur:${Math.round((chars * 20 + innerWidth) / 110)}s">${items.map((n, i) => `<span class="${n.kind}${i ? ' old' : ''}">📰 ${esc(n.text)}</span>`).join('')}</span>`;
  }

  // ---------- 항로 정하기(부두 창) ----------
  function openDock(i, to) {
    const me = P(), s = me.ships[i];
    if (!s) return;
    // 처음엔 이 섬 기준 추천(가장 모자란 물건부터)으로 칸을 채워 두고, 학생이 −/＋로 고친다.
    const fit = E.plan(G, me, s, E.nation(G, to));
    dock = {i, to, give: [...fit.give], get: [...fit.get]};
    if (speed) { resume = speed; speed = 0; }
    sel = null; render();
  }
  function dockPanel() {
    const me = P(), o = E.nation(G, dock.to), s = me.ships[dock.i], k = E.slotsOf(G, me, o);
    const gives = GOODS.filter(g => E.sells(G, me, g) && E.buys(G, o, g));
    const gets = GOODS.filter(g => E.sells(G, o, g)).sort((a, b) => E.buys(G, me, b) - E.buys(G, me, a));
    const ok = E.allowed(G, me, {to: o.id, give: dock.give, get: dock.get});
    const used = d => sum(dock[d]), cost = d => sum(GOODS.map(g => dock[d][g] * (d === 'give' ? E.price(G, me, o, g) : E.price(G, o, me, g))));
    // 짐칸: 채운 칸은 그 물건 아이콘이 든 상자(물건 순서대로 상자 수만큼), 빈 칸은 점선
    const boxes = d => { const full = GOODS.flatMap(g => Array(dock[d][g]).fill(g));
      return `<span class="slots" aria-label="${used(d)}/${k}칸">${full.map(g => `<i class="box">${ico(g)}</i>`).join('')}${'<i class="empty"></i>'.repeat(Math.max(0, k - full.length))}</span>`; };
    const row = (d, g) => {
      const n = dock[d][g], other = d === 'give' ? 'get' : 'give', p = d === 'give' ? E.price(G, me, o, g) : E.price(G, o, me, g);
      const tag = d === 'get' && E.buys(G, me, g) ? '<em class="tag lack">모자라요</em>' : d === 'give' && g === me.main ? '<em class="tag main">대표</em>' : '';
      return `<div class="step${n ? ' on' : ''}">${ico(g)}<span class="what"><b>${gname(g)}</b>${tag}<small>1상자 ${p}원${d === 'get' && !o.world ? ` ${'⭐'.repeat(o.quality[g])}` : ''}</small></span>
        <button data-step="${d}" data-g="${g}" data-d="-1" ${n ? '' : 'disabled'} aria-label="${gname(g)} 한 상자 빼기">−</button><b class="n">${n}</b>
        <button data-step="${d}" data-g="${g}" data-d="1" ${used(d) < k && !dock[other][g] ? '' : 'disabled'} aria-label="${gname(g)} 한 상자 더하기">＋</button></div>`;
    };
    const short = cost('get') > me.money + cost('give');
    return `<div class="dockpanel" role="dialog" aria-label="항로 정하기">
      <h3>배 ${dock.i + 1} → ${esc(o.name)} <small>왕복 ${E.tripTime(G, me, o.id)}달 · 1칸에 1상자 · ${X.contractTrips}번 왕복 · 값은 계약하는 날 고정</small></h3>
      <div class="cols"><div><p>📤 싣고 갈 것 ${boxes('give')}</p>${gives.map(g => row('give', g)).join('') || '<small>여기에 팔 수 있는 게 없어요</small>'}</div>
      <div><p>📥 받아 올 것 ${boxes('get')}</p>${gets.map(g => row('get', g)).join('') || '<small>여기서 살 수 있는 게 없어요</small>'}</div></div>
      <p class="sum">한 번 왕복마다 <span class="plus">+${cost('give')}원</span> · <span class="neg">−${cost('get')}원</span>${short ? ' <span class="warn">금고가 모자라요</span>' : ''}</p>
      ${s.route ? '<p class="muted">지금 계약을 마치면 이 항로로 바뀌어요(예약).</p>' : ''}
      <div class="actions"><button class="primary" data-sign ${ok ? '' : 'disabled'}>${s.route ? '다음 항로로 예약' : '계약하기'}</button><button data-close>취소</button></div></div>`;
  }

  // ---------- 멈춤 창 ----------
  const EVT = {
    supplyCut: p => `${nameOf(p.source)}에 분쟁이 생겨 ${gname(p.good)} 수출이 9달 동안 줄어요. ♥3인 나라와 '돌아가는 길'을 고른 나라만 절반을 받아요.`,
    storm: () => '태풍으로 모든 나라의 식량 생산이 6달 동안 줄고 식량 값이 올라요.',
    recession: () => '세계 경제가 얼어붙어 6달 동안 물건 값이 내려가요. 이미 맺은 계약 값은 그대로예요.',
    exchange: () => '우리 돈 값이 떨어져서 6달 동안 새로 맺는 수입 계약은 비싸지고, 수출은 조금 비싸게 팔려요.',
    expo: () => '세계 박람회에 우리 대표 물건을 내놓을 수 있어요.',
    invention: () => '새 기술이 나왔어요. 우리가 쓸까요, 나눌까요?',
    voice: () => '농민은 "농업을 지켜 주세요", 소비자는 "물가를 낮춰 주세요"라고 해요.',
    dumping: () => '어떤 나라가 생활용품을 아주 싸게 팔기 시작했어요(6달).',
    retaliation: p => `우리가 보호를 걸자 ${nameOf(p.source)}이 맞서 우리 물건에 세금을 붙이려 해요.`,
    fta: p => `${nameOf(p.target)}이 서로 관세를 없애는 FTA를 맺자고 해요.`
  };
  // 선택지마다 고르면 생기는 일 한 줄(engine6.js applyEvent와 같은 순서). 비어 있으면 "그대로".
  const RESULT = {
    supplyCut: ['💰−100 · 📦 그 나라 물건 절반은 받음 · 위기 피해 ½', '📉 그 물건 필요 −1 · 😊−3 (9달)'],
    storm: [null, '🤝 ♥2 이상 나라마다 식량 최대 2상자'],
    recession: [null, '💰−100 · 😊+4 (6달)'],
    exchange: ['🏭 대표 산업 +1단계 (6달)', '📉 가장 많이 사는 물건 필요 −1 · 😊−3 (6달)'],
    expo: ['💰−60 · 📈 대표 물건 새 계약 값 오름', null],
    invention: ['🏭 대표 산업 +1단계', '🤝 모든 나라 ♥+1'],
    voice: ['🛡 식량 지키기 1년 · 😊−2/계절', '😊+2 (1년)'],
    dumping: [null, '🛡 생활용품 지키기 1년 · 😊−2/계절'],
    retaliation: ['🛡 지키기 모두 풀기', '📉 6달 동안 우리 수출 값 −10%', '💰−60 · ♥+1'],
    fta: ['🤝 FTA · 그 나라와 ♥3 고정', null]
  };
  function modal(html) { layer.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`; layer.hidden = false; layer.querySelector('button')?.focus(); }
  function showPending() {
    const p = G.pending, me = P();
    if (p.type === 'open') return modal(`<h2>⚓ 항구가 열렸어요!</h2><p>아래 배 카드를 섬으로 끌어다 놓아 항로를 정하세요. 배는 정한 항로를 ${X.contractTrips}번 왕복하며 저절로 사고팔아요.</p>
      <p class="muted">항로를 다 정하면 ▶를 눌러 시간을 흐르게 하세요.</p><div class="actions"><button class="primary" data-ok="open">배 보내러 가기</button></div>`);
    if (p.type === 'event') {
      const ev = E.S.events.find(e => e.id === p.id);
      return modal(`<p class="eyebrow">${ev.crisis ? '위기' : ev.kind === 'problem' ? '무역 문제' : '기회'}</p><h2>${esc(ev.name)}</h2><p>${esc(EVT[p.id](p))}</p>
        <div class="options">${ev.options.map((t, k) => `<button data-opt-event="${k}"><b>${esc(t.split(':')[0])}</b><small class="result">${(RESULT[p.id]?.[k] || '➖ 그대로')}</small></button>`).join('')}</div>`);
    }
    if (p.type === 'meeting') {
      return modal(`<p class="eyebrow">${Math.floor(G.month / 12) + 1}년째 발전 회의</p><h2>무엇에 투자할까요?</h2><p>금고 <b>${me.money}원</b> · 원하는 만큼 사세요(카드마다 한 번).</p>
        <div class="options">${p.cards.map(id => { const c = E.S.cards.find(c => c.id === id), cost = E.cardCost(me, id);
          return `<button data-card="${id}" ${me.money < cost ? 'disabled' : ''}><b>${esc(c.name)} · ${cost}원</b><small>${esc(c.text)}</small></button>`; }).join('')}</div>
        <div class="actions"><button class="primary" data-card="">회의 마치기</button></div>`);
    }
    if (p.type === 'yearEnd') {
      const y = p.year, l = me.last;
      return modal(`<p class="eyebrow">${y}년째 끝</p><h2>올해 생활 점수 <span class="big">${me.years[y - 1]}</span>점</h2>
        <p class="muted">마지막 계절: 바구니 ${l.slots} + 품질 ${l.qual}${l.unrest ? ` − 물가 ${l.unrest}` : ''}${l.crisis ? ` − 위기 ${l.crisis}` : ''}${l.extra ? ` ${l.extra > 0 ? '+' : '−'} 사건 ${Math.abs(l.extra)}` : ''}</p>
        <ol class="rank">${rankRows().map(r => `<li class="${r.n === me ? 'me' : ''}">${esc(r.n.name)} <b>${r.s}점</b></li>`).join('')}</ol>
        <div class="actions"><button class="primary" data-ok="year">다음 해로</button></div>`);
    }
  }
  function showEnd() {
    const rows = E.ranking(G), me = P(), rank = rows.indexOf(me) + 1;
    modal(`<p class="eyebrow">다섯 해가 끝났어요</p><h2>${rank === 1 ? '🏆 무역왕!' : `${rank}등`} · 5년 평균 ${me.score}점</h2>
      <ol class="rank">${rows.map(n => `<li class="${n === me ? 'me' : ''}">${esc(n.name)} <b>${n.score}점</b></li>`).join('')}</ol>
      <p class="muted">계약 깨기 ${G.stats.breaks}번 · 출항 놓침 ${G.stats.misses}번 · 문 닫은 공장 ${G.stats.declines}곳</p>
      <div class="actions"><button class="primary" data-ok="again">다시 하기</button></div>`);
  }
  function resolved() { if (!G.pending) { layer.hidden = true; speed = resume; } render(); }

  // ---------- 배 위치(매 프레임) ----------
  function placeShips() {
    if (!G) return;
    const f = reduce ? 0 : Math.min(1, acc / monthMs());
    document.querySelectorAll('#ships .ship').forEach(el => {
      const n = E.nation(G, el.dataset.n), k = +el.dataset.k, s = n.ships[k];
      let [x, y] = NODES[slot[n.id]] || HOME, good = null;
      if (s && s.state === 'sea' && s.route && slot[s.route.to]) {
        const prog = Math.min(1, (s.t + f) / s.T), u = prog <= .5 ? prog * 2 : 2 - prog * 2;
        [x, y] = along(lane(n.id, s.route.to), u);
        good = first(prog <= .5 ? s.route.give : s.route.get);
      } else { x += (k - 1) * 3.2; y -= 6; }
      el.hidden = n !== P() && !(s && s.state === 'sea');   // 항구에 선 NPC 배는 섬 카드를 가리지 않게 숨긴다
      el.style.left = x + '%'; el.style.top = y + '%';
      el.querySelector('i').innerHTML = good != null ? ico(good) : '';
    });
  }
  function frame(ts) {
    const dt = Math.min(250, ts - (last || ts)); last = ts;
    if (G && !G.over && !G.pending && speed && !dock && !drag) {
      acc += dt * speed;
      if (acc >= monthMs()) { acc = 0; E.tick(G); render(); }
    }
    placeShips();
    requestAnimationFrame(frame);
  }

  // ---------- 조작 ----------
  function toast(t) { G && G.news.push({month: G.month, text: t, kind: 'tip'}); render(); }
  app.addEventListener('click', e => {
    const b = e.target.closest('button, [data-ship]');
    if (!b) return;
    if (b.dataset.start) return start(b.dataset.start);
    if (b.dataset.speed != null) { speed = +b.dataset.speed; if (speed) resume = speed; return render(); }
    if (b.dataset.break != null) { E.breakContract(G, +b.dataset.break); return render(); }
    if (b.dataset.step) { const a = dock[b.dataset.step], g = +b.dataset.g; a[g] = Math.max(0, a[g] + +b.dataset.d); return render(); }
    if (b.hasAttribute('data-sign')) { E.setRoute(G, dock.i, {to: dock.to, give: dock.give, get: dock.get}); dock = null; speed = resume; return render(); }
    if (b.hasAttribute('data-close')) { dock = null; speed = resume; return render(); }
    if (b.dataset.drop) {
      const i = sel ?? P().ships.findIndex(s => !s.route);
      return openDock(i < 0 ? 0 : i, b.dataset.drop);
    }
    if (b.dataset.ship != null && !drag?.moved) { sel = sel === +b.dataset.ship ? null : +b.dataset.ship; render(); }
  });
  app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.ship != null) e.target.click(); });
  layer.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ok === 'again') return title();
    if (b.dataset.ok === 'open') { E.choose(G, null); layer.hidden = true; speed = 0; resume = 1; return render(); }
    if (b.dataset.ok === 'year') { E.choose(G, null); return resolved(); }
    if (b.dataset.optEvent != null) { E.choose(G, +b.dataset.optEvent); return resolved(); }
    if (b.dataset.card != null) { E.choose(G, b.dataset.card || null); return resolved(); }
  });
  // 끌어다 놓기: 배 카드를 섬에 놓으면 부두 창이 열린다(6px 넘게 움직여야 끌기)
  app.addEventListener('dragstart', e => e.preventDefault());
  app.addEventListener('pointerdown', e => {
    const card = e.target.closest('[data-drag]');
    if (!card || e.target.closest('button')) return;
    e.preventDefault();
    drag = {i: +card.dataset.ship, x: e.clientX, y: e.clientY, moved: false, ghost: null};
  });
  addEventListener('pointercancel', () => { drag?.ghost?.remove(); app.classList.remove('dragging'); drag = null; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
      drag.moved = true;
      drag.ghost = Object.assign(document.createElement('img'), {src: ART + 'ship.webp', className: 'ghost', alt: ''});
      document.body.append(drag.ghost); app.classList.add('dragging');
    }
    if (drag.ghost) { drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; }
  });
  addEventListener('pointerup', e => {
    if (!drag) return;
    const d = drag;
    d.ghost?.remove(); app.classList.remove('dragging');
    setTimeout(() => { drag = null; });
    if (!d.moved) return;
    const drop = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]');
    if (drop) openDock(d.i, drop.dataset.drop);
  });
  addEventListener('keydown', e => {
    if (!G || e.target.closest?.('input')) return;
    if (e.key === ' ' && layer.hidden && !dock) { e.preventDefault(); speed = speed ? 0 : resume; render(); }
    if (e.key === 'Escape' && dock) { dock = null; speed = resume; render(); }
  });

  title();
  requestAnimationFrame(frame);
  if (new URLSearchParams(location.search).has('debug')) window.TK6 = {get G() { return G; }, E, render, start};
})();
