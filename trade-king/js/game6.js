/* 무역왕 6.0 화면 시제품(2단계): 흐르는 시간, 지도 위 배, 항로 끌기, 항로 카드, 뉴스, 멈춤 창.
   7.3 저장·이어하기, 일 단위 시계와 연속 항해. */
(() => {
  'use strict';
  const E = window.TradeEngine6, T = E.T, X = E.X, A = window.TradeArt;
  const ART = new URL('../shared-art/trade/', location.href).href;
  const $ = s => document.querySelector(s);
  const esc = A.esc, sum = a => a.reduce((s, v) => s + v, 0);
  // 6.4d 그림 스위치: GOODS_ART = 물건 아이콘을 shared-art/trade/v6/goods/*.webp로, CONTINENT_ART = 북쪽 대륙 땅 그림, HOME_ART = 성장 항구 3장(Codex 결과를 확인한 뒤 켠다)
  const GOODS_ART = true, CONTINENT_ART = true;
  const ico = g => GOODS_ART ? `<img class="ico" src="${ART}v6/goods/${E.S.goods[g].id}.webp" alt="" draggable="false">` : A.icon(E.S.goods[g].icon);
  const gname = E.goodName;
  // 7.3 움직임은 게임 설정(⚙️ 화면 움직임 줄이기)으로만 정한다. Windows '애니메이션 효과 끄기'를 따르면 시작 화면 카메라·배가 멈춰 버림
  let reduce = false, pace = 1;   // 7.1 설정(시작 화면 ⚙️): 화면 움직임 줄이기 · 시간 흐름 빠르기
  // 지도 자리(%): 7.9까지 가까운 섬 2곳(2달)은 우리 항구 옆, 먼 섬 2곳(3달)은 위쪽, 상인은 맨 위. 8.1부터 거리마다 자리가 다르다(아래 SEATS)
  // 6.3d: 먼 섬은 타일이 커져서 23 → 30%로 내렸다(위 가장자리에 잘리지 않게). 지도 그림의 빈 바다(x9~23, y13~33)에 아직 들어간다.
  const NEAR = [[20, 66], [80, 66]], FAR = [[16, 26], [84, 26]], HOME = [50, 78], WORLD = [50, 7];
  const GOODS = E.GOODS, first = a => { const g = a ? a.findIndex(v => v > 0) : -1; return g < 0 ? null : g; };
  // 바닷길: 지도 그림(shared-art/trade/v6/map6.webp)에서 바다인 갈림목(%)을 잇고, 두 곳 사이는 가장 짧은 길을 부드럽게 휘어 간다.
  // 6.3b: 항로는 우리 섬 그림이 아니라 그 앞바다의 부두 받침 줄(H = 50,57)에서 시작한다. 배가 받침에서 떠나 수로(hub)를 지나 나간다.
  // 8.1 거리 비대칭: 왕복 달수마다 왼쪽(L)·오른쪽(R) 자리 하나씩. 한쪽에 가까운 섬 하나·먼 섬 하나라 겹치지 않는다(NL·NR·FL·FR은 옛 저장용 이름)
  const SEATS = {1: [31, 67], 2: NEAR[0], 3: FAR[0], 4: [12, 43]};   // 4달 자리 x 10이면 768px 폭에서 정보 단추가 1px 넘침
  const SEAT_NODES = Object.fromEntries(Object.entries(SEATS).flatMap(([m, [x, y]]) => [['L' + m, [x, y]], ['R' + m, [100 - x, y]]]));
  const NODES = {H: [50, 57], NL: NEAR[0], NR: NEAR[1], FL: FAR[0], FR: FAR[1], W: WORLD, ...SEAT_NODES,
    hub: [50, 64], sl: [35, 72], sr: [65, 72], lb: [44.5, 52], lt: [44.5, 22], rb: [55.8, 52], rt: [55.8, 22], tl: [28, 15], tr: [72, 15], tm: [50, 15]};
  const EDGES = 'H-hub sl-NL sr-NR sl-hub sr-hub hub-lb hub-rb lb-lt rb-rt lt-tm rt-tm tm-W lt-tl rt-tr tl-FL tr-FR tl-tm tr-tm sl-L1 sr-R1 sl-L2 sr-R2 tl-L3 tr-R3 sl-L4 sr-R4'.split(' ').map(e => e.split('-'));
  // 우리 배 1~5의 색: 항로선·지도 번호·배 카드에 같은 색을 써서 어느 배가 어디 가는지 한눈에 보이게 한다.
  const SHIP_COLORS = ['#e2533f', '#2b86d6', '#2e9e52', '#9a55cf', '#e89a10'], tint = k => `--c:${SHIP_COLORS[k % SHIP_COLORS.length]}`;
  // 6.7 배 피규어: 색 원판 대신 배 몸체 색으로 구분(빨강·파랑·초록·보라·노랑), 다른 나라 배는 회색
  const shipImg = k => `${ART}v6/ships/ship_${k == null ? 'npc' : k % SHIP_COLORS.length}.webp`;
  const ASPECT = 2.72;   // 지도 그림 가로:세로. %좌표 거리를 화면 거리로 바꿀 때 쓴다.
  const app = $('#app'), layer = $('#layer'), ticker = $('#ticker');
  let G = null, speed = 0, resume = 1, acc = 0, last = 0, sel = null, dock = null, drag = null, slot = {}, laneCache = {};
  let focusGood = null, report = null;
  let coach = null;   // 6.7 첫 판 도우미: {step, resumeSpeed}
  let resumed = false, shipViews = [], clock = {};
  let sheet = null;   // 7.7 설정 창·우리 나라 창: {kind: 'set'|'home', tab, page, per, fit, beforeSpeed}
  let tip = null, tipTimer = 0;   // 배 툴팁: {i, pinned}. 마우스를 올리면 잠깐, 누르면 고정.
  // 7.9b 작은 돌발 카드(지도 오른쪽 위 6초) · 자동 멈춤(배가 쉬게 될 때, 예상 점수가 10점 넘게 떨어질 때)
  let smallPop = null, smallSeen = 0, autoPause = {idle: true, drop: true}, pauseNote = null, lastForecast = null;

  const P = () => E.player(G);
  // 7.0 나라 특성(NATIONS-v7.md): 숫자는 엔진의 economy.trait, 글은 data6 countries[id].trait
  const XT = E.S.economy.trait, TR = id => E.S.countries[id].trait, pct = v => Math.round(Math.abs(v - 1) * 100);
  // 7.7 계약은 맺은 날부터 1년(철의 나라 철광석·철강 계약은 2년)
  const years = (me, o, a, b) => (me.id === 'ironland' || o.id === 'ironland') && [4, 5].some(g => a[g] || b[g]) ? XT.longYears || 2 : 1;
  // 날짜 번호 → 올해면 '3월 5일', 다음 해면 '다음 해 3월 4일', 그 뒤면 '4년째 3월 4일'(오늘 기준)
  const dshort = k => { const a = E.dateOf(k), y = Math.floor(a.month / 12), d = y - Math.floor(G.month / 12); return `${d === 1 ? '다음 해 ' : d > 1 ? `${y + 1}년째 ` : ''}${a.month % 12 + 1}월 ${a.day}일`; };
  let slotKey = '', slotFlash = 0;   // 나라 칸 값이 바뀌면 한 번 반짝
  // 7.6e 화면은 하루마다 다시 그린다. 나타나는 효과(도착 알림·받은 상자·나라 칸 반짝)는 처음 그릴 때 한 번만 붙여 깜빡이지 않게 한다.
  const played = new Set(), once = k => !played.has(k) && !!played.add(k);
  const nameOf = id => E.nation(G, id).name;
  const hearts = r => '♥'.repeat(r) + `<i>${'♥'.repeat(3 - r)}</i>`;
  const avg = a => a.length ? Math.round(sum(a) / a.length) : 0;
  const monthMs = () => X.monthSeconds * 1000 / pace;
  const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], dayMs = () => monthMs() / E.monthDays(G?.month || 0), fraction = () => Math.min(1, acc / dayMs());
  const dateText = G => `${Math.floor(G.month / 12) + 1}년째 ${G.month % 12 + 1}월 ${G.day}일`;
  // 7.3 속도는 저장하지 않는다. acc는 설정이 달라도 같은 날짜가 되도록 비율로 저장.
  function saveNow() {
    if (!G) return;
    try { if (G.over) localStorage.removeItem('trade6.save'); else localStorage.setItem('trade6.save', JSON.stringify({game: E.saveGame(G), slot, acc: fraction()})); } catch {}
  }
  function readSave() {
    try {
      const s = JSON.parse(localStorage.getItem('trade6.save')), game = E.loadGame(s?.game);
      if (!game || game.over || !Number.isFinite(s.acc) || s.acc < 0 || s.acc >= 1 || s.slot?.[E.player(game).id] !== 'H' || s.slot.world !== 'W') return null;
      const keys = game.nations.slice(1).map(n => s.slot[n.id]);
      const seatOk = (id, k) => k === 'L' + game.dist[id] || k === 'R' + game.dist[id] || (game.dist[id] === 2 ? ['NL', 'NR'] : game.dist[id] === 3 ? ['FL', 'FR'] : []).includes(k);
      if (new Set(keys).size !== 4 || game.nations.slice(1).some(n => !seatOk(n.id, s.slot[n.id]))) return null;
      return {...s, game};
    } catch { return null; }
  }
  function saveSummary() { const s = readSave(); return s && {nation: E.player(s.game).name, date: dateText(s.game, s.acc)}; }
  function continueGame() {
    const s = readSave(); if (!s) return false;
    G = s.game; slot = s.slot; laneCache = {}; acc = s.acc * dayMs(); last = 0; speed = 0; resume = G.pending ? 0 : 1; resetWatch();
    sel = dock = drag = focusGood = report = tip = coach = null; resumed = true; coachEl.hidden = true; endPage = 1; slotKey = ''; ticker.dataset.key = ''; lastPend = null;
    AU?.scene('sail'); render(); return true;
  }
  function updateClock() {
    if (!G || !clock.date) return;
    const f = (G.day - 1 + fraction()) / E.monthDays(G.month), m = G.month % 12, day = G.day;
    const text = dateText(G, f); if (clock.date.textContent !== text) clock.date.textContent = text;
    clock.track.style.width = `${(G.month + f) / 60 * 100}%`;
    let left = DAYS[m] - day + 1; for (let i = 1; i < 3 - G.month % 3; i++) left += DAYS[(m + i) % 12];
    const settle = `올해 ${Math.floor(m / 3) + 1}번째 정산까지 ${left}일`; if (clock.settle.textContent !== settle) clock.settle.textContent = settle;
  }
  addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  const signedMoney = n => n ? `${n > 0 ? '+' : '−'}${Math.abs(n)}억` : '±0억';
  // 7.6c 돈 단위는 '억'. 들어온·나간 돈이 0이면 '−0억' 대신 '없음'
  const amt = (n, s) => n ? `${s}${n}억` : '<span class="none">없음</span>';
  const cargoText = a => GOODS.filter(g => a[g]).map(g => `${gname(g)} ${a[g]}상자`).join(' · ') || '없음';
  // 7.6 받침에 맞는 조사: josa('다온국', '이', '가') → 다온국이, josa('숲의 나라', '이', '가') → 숲의 나라가
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 ? a : b); };
  // 7.6 철광석·철강이 공장에서 무엇이 되는지(economy.chain: [재료, 제품])
  const becomes = g => E.CHAIN.find(c => c[0] === g)?.[1] ?? null;
  const netText = v => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)}`;
  // 7.6 게임 툴팁(U7): 브라우저 title 대신 data-tip. html이 든 것은 data-tip-html도 붙인다.
  const tipA = (t, html) => ` data-tip="${esc(t)}"${html ? ' data-tip-html' : ''}`;
  // 6.3 값 라벨: 세계 값보다 10% 넘게 싸면 '싸요', 비싸면 '비싸요'. 섬 카드에는 라벨만, 부두 창에는 라벨과 숫자를 같이 보여 준다.
  function label(p, g) { const w = E.worldPrice(G, g); return p <= w * .9 ? {k: 'cheap', t: '싸요'} : p >= w * 1.1 ? {k: 'dear', t: '비싸요'} : {k: 'fair', t: '보통'}; }
  const lbl = (p, g) => { const l = label(p, g); return `<em class="lbl ${l.k}">${l.t}</em>`; };
  // 우리 섬의 성장 단계(1~3): 시작보다 늘어난 산업 단계·배·창고를 센다. 그림은 shared-art/trade/v6/home_{단계}.webp(없으면 port_home).
  const homeStage = E.homeStage;
  const STAGE = ['', '작은 항구', '커진 항구', '무역 도시'];
  // 7.0 우리 섬 장식(글 없이 특성 보여 주기): 석유 유전(멈춘 것은 회색), 철의 나라 연기, 숲 유람선. 그림 위에 얹기만 한다.
  function homeDeco(me) {
    const t = me.trait || {};
    if (me.id === 'oil') return `<span class="deco oil" aria-hidden="true">${[0, 1, 2, 3].map(k => `<i class="${k >= 4 - (t.stage || 0) ? 'off' : ''}">${ico(1)}</i>`).join('')}</span>`;
    if (me.id === 'ironland') { const v = E.traitInfo(G, me).value; return `<span class="deco smoke${t.cleaner ? ' clean' : ''}" aria-hidden="true" style="--o:${Math.min(1, .25 + v * .2).toFixed(2)}"><i></i><i></i><i></i></span>`; }
    if (me.id === 'forest') { const k = Math.min(4, G.nations.filter(o => o !== me && E.rel(G, me, o) >= 2).length); return k ? `<span class="deco boats" aria-hidden="true">${'<i>🛳</i>'.repeat(k)}</span>` : ''; }
    return '';
  }
  // 6.3 보드게임 기물: 우리 배는 항구 앞 물 위에 서 있고, 들어 올려 섬에 내려놓는다. 7.6 받침·정박 타원은 없앴다(자리만 계산).
  const PIER_Y = 57, padPos = (k, n) => [HOME[0] + (k - (n - 1) / 2) * 4.2, PIER_Y];
  // 7.4 소리: 녹음 효과음·배경음악(js/sound74.js). sound = 효과음, music = 배경음악
  const AU = window.TradeAudio; let sound = true, music = true, lastPend = null;
  const sfx = id => { try { AU?.sfx(id); } catch (_) {} };
  // Codex가 shared-art/trade/v6/home_1~3.webp(성장 단계 그림)를 그려 넣으면 true로 바꾼다. 그 전에는 port_home.webp 한 장을 쓴다(404를 내지 않기 위해).
  const HOME_ART = true;
  const homeImg = stage => HOME_ART ? `${ART}v6/home_${stage}.webp` : `${ART}port_home.webp`;
  // 이 섬과 무역할 때의 특징 2~3개: 거리, 살 물건 값, 품질, 붐빔, 단골. 모두 실제 규칙(왕복 달, 계약값, ⭐, 경쟁 계약, ♥)에서 나온다.
  function features(o, get, give = GOODS.map(() => 0)) {
    const me = P(), t = E.tripTime(G, me, o.id), out = [];
    out.push(t <= 2 ? `⛵ 가까워요 · 왕복 ${t}달` : t === 3 ? `⛵ 멀어요 · 왕복 ${t}달` : `⛵ 아주 멀어요 · 왕복 ${t}달`);
    // 7.0 특성 꼬리표: 이 항로에서 우리 나라(또는 상대) 특성이 작동하면 거리 다음에 먼저 보여 준다
    if (!o.world) {
      if (me.id === 'plains' && sum(give) && !sum(get)) out.push(`🤝 원조 · 끝나면 ♥+${XT.aidRel}`);
      if (me.id === 'market' && sum(get) || o.id === 'market' && sum(give)) out.push(`🛒 큰손 할인 −${pct(XT.marketDiscount)}%`);
      if (me.id === 'artisan' && GOODS.some(g => give[g] && me.quality[g] === 3)) out.push(`✨ 명품 +${pct(XT.luxBonus)}% · ${me.augments.includes('luxStreet')?E.S.rules79.luxMax:XT.luxMax}상자까지`);
    }
    if (GOODS.some(g => give[g] && E.isRelay(G, me, g))) out.push(`🔁 중계 +${pct(XT.relayBonus)}%`);
    if (years(me, o, give, get) > 1) out.push(`🏭 철 계약 · ${XT.longYears}년 값 고정`);
    if (me.id === 'oil' && give[1]) out.push(`⛽ 석유 +${pct(XT.oilSell)}%`);
    const g = GOODS.filter(g => get[g]).sort((a, b) => get[b] - get[a])[0];
    if (g != null) { const l = label(E.price(G, o, me, g), g); if (l.k !== 'fair') out.push(`${ico(g)} ${gname(g)} ${l.t}`); }
    if (!o.world && GOODS.some(g => get[g] && o.quality[g] === 3)) out.push('⭐ 품질이 좋아요');
    if (o.world) out.push('🗻 뭐든 사고팔지만 값이 나빠요');
    else if (G.nations.filter(n => n !== me && n !== o && n.ships.some(s => s.route?.to === o.id)).length >= 2) out.push('👥 다른 나라 배도 많이 와요');
    if (!o.world && E.rel(G, me, o) >= 3) out.push('♥ 단골 · 값을 깎아 줘요');
    return out.slice(0, 3);
  }
  const luxCap = (me, o, g) => me.id === 'artisan' && !o.world && me.quality[g] === 3;

  // ---------- 시작 ----------
  function title() {
    saveNow(); shipViews = []; clock = {}; coach = null; coachEl.hidden = true; AU?.scene(null);
    const codex = loadCodex();
    G = null; speed = 0; focusGood = null; report = null; layer.hidden = true; ticker.hidden = true; ticker.dataset.key = '';
    app.innerHTML = `<section class="start">
      <div class="pick-head"><p class="eyebrow">나라 고르기</p><h1>어느 나라로<br>할까요?</h1>
      <p>나라마다 잘 만드는 물건과<br>특성이 달라요.</p>
      <p class="muted">처음이라면 큰 시장국이나 대평원국으로 시작해 보세요.</p>
      <p class="pick-actions">${window.TradeTitle ? '<button class="codex-btn" data-home>◀ 처음 화면</button>' : ''}<button class="codex-btn" data-codex>📖 도감 보기</button></p>${saveSummary() ? '<p class="save-note">이어하던 게임은 새 게임을 시작하면 지워져요.</p>' : ''}</div>
      <div class="pick">${T.countries.map(c => {
        const lv = E.S.countries[c.id].levels, rec = codex.nations?.[c.id];
        return `<button class="nation" data-start="${c.id}" style="--tint:${c.color}">
          <img src="${ART}port_${c.portrait}.webp" alt=""><b>${esc(c.name)}</b>${rec ? `<em class="tag done">${rec.wins ? '🏆' : '✓'} ${rec.games}판 · 최고 ${rec.best}점</em>` : c.id === 'market' || c.id === 'plains' ? '<em class="tag main">첫 플레이 추천</em>' : ''}
          <small class="trait">${TR(c.id).icon} <b>${esc(TR(c.id).name)}</b><em class="diff d${['쉬움', '보통', '어려움'].indexOf(TR(c.id).level)}">${esc(TR(c.id).level)}</em></small><small class="tshort">${esc(TR(c.id).short)}</small>
          <span class="lv">${lv.map((l, g) => !l && !E.CONSUMER.includes(g) ? '' : `<span${tipA(`${gname(g)} ${l}단계`)}>${ico(g)}${l}</span>`).join('')}</span></button>`;
      }).join('')}</div></section>`;
  }
  function start(id) {
    resumed = false; lastPend = null; AU?.scene('sail');
    G = E.newGame((Math.random() * 1e9) >>> 0, id);
    slot = {[P().id]: 'H', world: 'W'}; laneCache = {};
    // 8.1 가까운 두 섬·먼 두 섬을 좌우에 하나씩 무작위로 나눈다
    const ids = Object.keys(G.dist).sort((a, b) => G.dist[a] - G.dist[b] || Math.random() - .5), flip = () => Math.random() < .5;
    for (const [a, b] of [ids.slice(0, 2), ids.slice(2)]) { const [l, r] = flip() ? [a, b] : [b, a]; slot[l] = 'L' + G.dist[l]; slot[r] = 'R' + G.dist[r]; }
    speed = 0; resume = 1; acc = 0; sel = null; dock = null; focusGood = null; report = null; endPage = 1; tip = null; slotKey = ''; resetWatch();
    // 7.0 도우미: 처음 하는 게임이면 공통 단계(+ 나라 소개), 다른 나라는 해 봤고 이 나라가 처음이면 나라 소개만
    coach = null;
    if (hintsOn()) {
      const intro = !natSeen(id).intro;
      if (helperWanted()) coach = {step: 0, common: true, list: COACH.flatMap((c, k) => k === 1 && intro ? [c, INTRO_STEP] : [c])};
      else if (intro) coach = {step: 0, list: [{...INTRO_STEP, last: true}]};
    }
    if (coach && G.pending?.type === 'open') E.choose(G, null);
    render();
  }

  // ---------- 화면 ----------
  function rankRows() {
    return [...G.nations].map(n => ({n, s: n.years.length ? E.totalScore(n) : avg(n.seasons)})).sort((a, b) => b.s - a.s);
  }
  function guidance() {
    const me = P(), idle = me.ships.findIndex(s => !s.route), need = E.needs(G, me);
    const lacking = GOODS.filter(g => E.buys(G, me, g)).sort((a, b) => (need[b] - E.produces(G, me, b)) / need[b] - (need[a] - E.produces(G, me, a)) / need[a]);
    const g = focusGood ?? lacking[0];
    let message = me.debt ? `빚 ${me.debt}억 · 들어오는 돈으로 먼저 갚아요. 지금 빚이면 정산 −${E.debtLoss(me)}점이에요.` : '다음 정산 예상을 보고, 모자란 생활 물건을 채워요.';
    if (sel !== null) message = `배 ${sel + 1}을 보낼 섬을 고르세요. 기존 계약이 있으면 다음 항로를 예약해요.`;
    else if (focusGood !== null) message = `${josa(gname(g), '을', '를')} 파는 섬을 골라 보세요. 가격과 왕복 시간을 비교하세요.`;
    else if (idle >= 0) message = `배 ${idle + 1}이 쉬고 있어요.${g != null ? ` ${josa(gname(g), '을', '를')} 사 올 항로를 찾아볼까요?` : ' 섬을 골라 항로를 정하세요.'}`;
    else if (G.month === 0) message = '항로 준비 완료! ▶ 출항하기를 누르면 배가 움직여요.';
    const action=E.smallActions(G)[0];
    // 작은 돌발 단추는 카드가 사라진 뒤에도 7일 동안 안내 줄에 남긴다. 자동 멈춤은 왜 멈췄는지 알려 준다.
    if(pauseNote&&!speed)return `<div class="note"><p>⏸ ${pauseNote}</p><div><button class="primary" data-speed="1">▶ 계속하기</button></div></div>`;
    if(action&&!smallCard().includes('data-small-action'))return `<div class="note"><p>${SMALL_ICON[action.id]||'📰'} ${E.S.smallEvents.find(e=>e.id===action.id).name} · ${action.text}</p><div><button data-small-action="${action.day}">${action.action} · ${action.until-E.today(G)}일 남음</button></div></div>`;
    return `<div class="note"><p>${message}</p><div>${focusGood !== null ? '<button data-clear-good>전체 보기</button>' : g != null && idle >= 0 ? `<button data-good="${g}">${ico(g)} 파는 섬 찾기</button>` : ''}${!speed && !G.pending ? '<button class="primary" data-speed="1">▶ 출항하기</button>' : ''}</div></div>`;
  }
  // 7.9b 작은 돌발: 시간을 멈추지 않고 6초 동안 카드로 떴다가 소식 줄로 들어간다. 단추가 붙으면 7일 안에 누를 수 있다(안내 줄에도 남음).
  const SMALL_ICON = {tailwind: '🌬', headwind: '🌪', fog: '🌫', lost: '🧳', fish: '🐟', mice: '🐭', exchangeTech: '🔧', donation: '🎁', repair: '🛠', merchant: '🧑‍💼', spark: '✨', sale: '🏷', northSale: '🗻', rumor: '📣', match: '⚽', misunderstanding: '💢', request: '🙏', craftsman: '🧑‍🎨', festivalPrep: '🎪', students: '🎒'};
  function watchSmall() {
    const log = G.small?.log || [];
    if (log.length <= smallSeen) return;
    smallSeen = log.length; smallPop = {item: log.at(-1), until: performance.now() + 6000};
    sfx('click'); setTimeout(() => { if (smallPop && performance.now() >= smallPop.until) { smallPop = null; if (G) render(); } }, 6100);
  }
  const resetWatch = () => { smallSeen = G.small?.log.length || 0; smallPop = null; pauseNote = null; lastForecast = null; };
  function smallCard() {
    if (!smallPop || performance.now() >= smallPop.until) return '';
    const it = smallPop.item, e = E.S.smallEvents.find(e => e.id === it.id), act = E.smallActions(G).find(a => a.day === it.day && a.id === it.id), good = E.S.rules79.goodSmall.includes(it.id);
    return `<div class="small-pop${good ? ' good' : ''}${once(`sp:${it.day}:${it.id}`) ? ' enter' : ''}" role="status"><span class="sp-ico" aria-hidden="true">${SMALL_ICON[it.id] || '📰'}</span><div><small>작은 돌발 · 시간은 그대로 흘러요</small><b>${esc(e.name)}</b><span>${esc(it.text)}</span></div>${act ? `<button data-small-action="${act.day}">${esc(act.action)}</button>` : ''}</div>`;
  }
  // 섬은 지도 위의 타일이다: 섬 그림 + 나무 이름판(이름·♥) + 작은 아이콘 줄(⛵n달, 살 것 아이콘은 싸요/비싸요 색 테두리, 팔 것 아이콘은 초록 점선).
  // 글로 된 정보는 전부 툴팁(마우스 올리기 · ⓘ 누르기)에 있다.
  const isleGoods = o => { const me = P(); return {getG: GOODS.filter(g => E.sells(G, o, g) && E.buys(G, me, g)), giveG: GOODS.filter(g => E.sells(G, me, g) && E.buys(G, o, g))}; };
  const isleBusy = o => G.nations.filter(n => n !== P() && n !== o && n.ships.some(s => s.route?.to === o.id)).length >= 2;
  const isleCut = o => !!(G.cut && G.cut.until > G.month && G.cut.source === o.id);
  function island(o) {
    const [x, y] = NODES[slot[o.id]], me = P(), far = G.dist[o.id] >= 3, {getG, giveG} = isleGoods(o), lt = laneTrait(o.id);
    const refused = E.rel(G, me, o) === 0, match = focusGood !== null && E.sells(G, o, focusGood), open = tip?.kind === 'isle' && tip.id === o.id;
    const g = (g, buy) => { const a = E.priceSignal(G, g).arrow; return `<span class="g ${buy ? label(E.price(G, o, me, g), g).k : 'sell'}">${ico(g)}${a ? `<i class="trend ${a === '▲' ? 'up' : 'down'}" aria-hidden="true">${a}</i>` : ''}</span>`; };
    return `<button class="isle${refused ? ' refused' : ''}${far ? ' far' : ''}${sel !== null ? ' target' : ''}${focusGood !== null ? match ? ' match' : ' dim' : ''}" data-drop="${o.id}" style="left:${x}%;top:${y}%"
        aria-label="${esc(o.name)}, 왕복 ${E.tripTime(G, me, o.id)}달${lt ? `, ${lt.name}: ${lt.text}` : ''}${refused ? ', 거래 거절 · 새해에 다시' : ''}${isleCut(o) ? ', 분쟁 중' : isleBusy(o) ? ', 다른 나라 배도 많이 와요' : ''}" aria-describedby="${open ? 'tip' : ''}">
      <span class="tile"><img src="${ART}port_${T.countries.find(c => c.id === o.id).portrait}.webp" alt="">
        ${isleCut(o) ? '<span class="badge cut" aria-hidden="true">🚫</span>' : isleBusy(o) ? '<span class="badge" aria-hidden="true">👥</span>' : ''}
        <span class="plank"><b>${esc(o.name)}</b><span class="hearts">${hearts(E.rel(G, me, o))}</span>${infoBtn(o.id, o.name, open && tip.pinned)}</span></span>
      ${refused ? '<span class="refusal">🚫 거래 거절 · 새해에 다시</span>' : match ? `<span class="quote">${ico(focusGood)} ${lbl(E.price(G, o, me, focusGood), focusGood)} <b>${E.price(G, o, me, focusGood)}억</b><small>재고 ${E.exportable(G, o, focusGood)}</small></span>`
        : `<span class="icons"><small>⛵${E.tripTime(G, me, o.id)}달${lt ? ` ${lt.icon}` : ''}</small>${getG.map(x => g(x, true)).join('')}${getG.length && giveG.length ? '<i class="sep"></i>' : ''}${giveG.map(x => g(x, false)).join('')}</span>`}</button>`;
  }
  // 7.6 ⓘ 단추: 동그라미 안 가운데 i(글꼴 i를 격자 가운데에)
  const infoBtn = (id, name, on) => `<span class="info" role="button" tabindex="0" data-info="${id}" aria-label="${esc(name)} 정보" aria-expanded="${!!on}"><i aria-hidden="true">i</i></span>`;
  // 7.6 섬 툴팁(U3): 그 나라 입장에서 읽는다. "○○이 수출해요"(= 우리가 살 수 있는 것) · "○○이 수입하고 싶어요"(= 우리가 팔 수 있는 것)
  function isleTip(o) {
    const me = P(), sec = (h, body) => `<div class="tsec"><p class="sub">${h}</p>${body}</div>`;
    const deal = (g, p, chip, note) => `<span class="deal${E.buys(G, me, g) ? ' need' : ''}">${ico(g)}<span class="nm"><b>${gname(g)}</b><small>${note}</small></span>${chip}<b class="pr">${p}억</b></span>`;
    const want = (g, p) => `<span class="want${E.sells(G, me, g) ? ' can' : ''}">${ico(g)}${gname(g)} <b>${p}억</b></span>`;
    if (o.world) {
      const W = E.S.world, buy = GOODS.filter(g => E.buys(G, me, g)), sell = GOODS.filter(g => E.sells(G, me, g));
      return `<span class="tip-head">🗻 ${esc(W.name)} <small>${esc(W.title)}</small></span>
        <p class="line"><span>⛵ 왕복 ${X.worldTrip}달</span><span>무엇이든 사고팔아요</span></p>
        ${W.lines.map(t => `<p class="wline2">${esc(t)}</p>`).join('')}
        ${sec(`${josa(W.name, '이', '가')} 팔아요 <small>우리에게 모자란 것</small>`, buy.map(g => deal(g, E.price(G, o, me, g), '<em class="lbl dear">비싸요</em>', '<span>⭐⭐</span><span>늘 있어요</span>')).join('') || '<small>지금 모자란 물건이 없어요</small>')}
        ${sec(`${josa(W.name, '이', '가')} 사 줘요 <small>값은 싸게 쳐요</small>`, sell.length ? `<span class="wants">${sell.map(g => want(g, E.price(G, me, o, g))).join('')}</span>` : '<small>남는 물건이 없어요</small>')}
        <small class="more-hint">이웃 섬과 계약하는 쪽이 늘 더 이득이에요.</small>`;
    }
    const sells = GOODS.filter(g => E.sells(G, o, g)), wants = GOODS.filter(g => E.buys(G, o, g)), bonus = E.S.countries[o.id].bonusText;
    return `<span class="tip-head">${esc(o.name)} <span class="hearts">${hearts(E.rel(G, me, o))}</span></span>
      <p class="trust-rule">${E.rel(G, me, o) === 0 ? '🚫 거래 거절 · 새해에 다시<br>지금 계약은 끝까지 이어져요.<br>' : ''}♥0 거래 거절 · ♥2 손님 배 · ♥3 할인·먼저 받기</p>
      <p class="line"><span>⛵ 왕복 ${E.tripTime(G, me, o.id)}달</span><span>${josa(gname(o.main), '을', '를')} 잘 만들어요</span>${isleBusy(o) ? '<span class="busy">👥 붐벼요</span>' : ''}${isleCut(o) ? '<span class="cut">🚫 분쟁 중</span>' : ''}</p>
      ${laneTrait(o.id) ? `<p class="lane-note ${laneTrait(o.id).kind}">${laneTrait(o.id).icon} <b>${laneTrait(o.id).name}</b> · ${laneTrait(o.id).text}</p>` : ''}
      ${sec(`${josa(o.name, '이', '가')} 수출해요 <small>우리가 살 수 있어요</small>`, sells.map(g => deal(g, E.price(G, o, me, g), lbl(E.price(G, o, me, g), g), `<span>${'⭐'.repeat(o.quality[g])}</span><span>재고 ${E.exportable(G, o, g)}상자</span>${E.buys(G, me, g) ? '<span class="needtag">우리에게 필요</span>' : ''}`)).join('') || '<small>지금 팔 물건이 없어요</small>')}
      ${sec(`${josa(o.name, '이', '가')} 수입하고 싶어요 <small>초록은 우리가 팔 수 있어요</small>`, wants.length ? `<span class="wants">${wants.map(g => want(g, E.price(G, me, o, g))).join('')}</span>` : '<small>지금 모자란 물건이 없어요</small>')}
      ${bonus ? `<p class="perk"><b>🎁 단골 혜택</b> ${esc(bonus)}</p>` : ''}
      <small class="more-hint">${E.rel(G, me, o) === 0 ? '새해가 되면 ♥1로 다시 거래해요.' : '배를 끌어 놓거나 섬을 누르면 계약서가 열려요.'}</small>`;
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
  // 8.1 항로 특징: 섬 꼬리표·지도 표시·계약서·툴팁이 같은 글을 쓴다
  const laneTrait = id => E.S.laneTraits.find(t => t.id === G.lanes?.[id]) || null;
  function laneMarks() {
    return G.nations.slice(1).filter(o => laneTrait(o.id) && slot[o.id]).map(o => {
      // 바닷길은 여러 섬이 함께 쓰므로, 표시는 그 섬 그림의 바다 쪽 위 모서리에 붙인다
      const t = laneTrait(o.id), [sx, sy] = NODES[slot[o.id]], x = sx + (sx < 50 ? -5 : 5), y = sy - 9;
      return `<span class="lane-mark ${t.kind}" style="left:${x}%;top:${y}%" tabindex="0"${tipA(`<b>${t.icon} ${t.name}</b> · ${esc(o.name)} 가는 길<br>${t.text}`, 1)} aria-label="${esc(o.name)} 가는 길 ${t.name}: ${t.text}">${t.icon}</span>`;
    }).join('');
  }
  function lanes() {
    const npc = new Set(), me = P();
    for (const n of G.nations.slice(1)) for (const s of n.ships) if (s.route && slot[s.route.to]) npc.add(lane(n.id, s.route.to).d);
    // 우리 배는 배마다 한 줄씩. 같은 항로를 둘이 쓰면 점선을 어긋나게 해서 두 색이 번갈아 보인다.
    return [...npc].map(d => `<path class="npc" d="${d}"/>`).join('') + me.ships.map((s, k) => s.route && slot[s.route.to]
      ? `<path class="mine" style="${tint(k)};stroke-dashoffset:${k * 9}" d="${lane(me.id, s.route.to).d}"/>` : '').join('');
  }
  // ---------- 하단 선착장: 배는 카드가 아니라 기물(말)이다. 7.6d 왕복이 5번 넘으면(철 계약) 점 대신 '왕복 3/8'로 짧게. 자세한 정보는 마우스를 올리거나 눌렀을 때 툴팁으로 ----------
  function shipToken(s, i) {
    const r = s.route, d = s.delivery, left = r && s.state === 'sea' ? Math.max(0, s.T - s.t) : 0;
    const strip = r
      ? `<b>${s.state === 'sea' ? '⛵' : '⚓'} ${esc(nameOf(r.to))}</b><span class="pips" aria-label="${r.done}/${r.trips}번 왕복">${r.trips > 4 ? `왕복 ${r.done}/${r.trips}` : '●'.repeat(r.done) + '○'.repeat(Math.max(0, r.trips - r.done))}</span>${s.waited ? '<span class="bad">⚠ 짐 부족</span>' : left ? `<span>${left}일 남음</span>` : ''}`
      : '<b>쉬는 중</b><span>섬에 끌어 놓기</span>';
    return `<div class="piece${sel === i ? ' sel' : ''}${r ? '' : ' idle'}${s.state === 'sea' ? ' sea' : ''}" style="${tint(i)}" data-ship="${i}" data-drag tabindex="0" role="button"
        aria-label="배 ${i + 1}${r ? ` · ${nameOf(r.to)}` : ' · 쉬는 중'}" aria-expanded="${tip?.kind === 'ship' && tip.i === i}" aria-describedby="${tip?.kind === 'ship' && tip.i === i ? 'tip' : ''}">
      <span class="fig"><img src="${shipImg(i)}" alt="" draggable="false"><b class="num">${i + 1}</b></span>
      <span class="strip">${strip}</span></div>`;   // 6.6b 최근 도착 단추는 툴팁으로(선착장 높이 밖으로 잘리던 문제)
  }
  // 회의의 '배 한 척 더'로 늘릴 자리.
  function futureSlots(me) {
    const max=X.maxShips+(E.S.countries[me.id].extraShip?1:0),out=[];
    for(let i=me.ships.length;i<max;i++)out.push(`<div class="piece slot" aria-label="배 ${i+1} 자리 · 회의 카드로 늘려요"><span class="fig"><b class="num">${i+1}</b></span><span class="strip"><b>배 한 척 더</b><span>발전 회의 카드</span></span></div>`);
    return out.join('');
  }
  // 툴팁: 예전 배 카드의 내용(상대, 짐, 계약 진행, 유리·불리, 깨기)을 담는다. 토큰 위에 고정 위치로 띄운다.
  function tipPanel() {
    if (!tip || !G) return '';
    if (tip.kind === 'isle') { const o = E.nation(G, tip.id); return o ? `<div class="tip isle-tip${tip.pinned ? ' pinned' : ''}" id="tip" role="tooltip">${isleTip(o)}<i class="arrow"></i></div>` : ''; }
    if (tip.kind === 'nation') return `<div class="tip nation-tip pinned" id="tip" role="tooltip">${nationTip(P())}<i class="arrow"></i></div>`;
    const i = tip.i, s = P().ships[i], me = P();
    if (!s) return '';
    const r = s.route;
    let body = '<p class="hint">지도의 배 말을 섬에 끌어 놓으세요.<br>섬을 눌러도 돼요.</p>';
    if (r) {
      const o = E.nation(G, r.to), gs = a => GOODS.filter(g => a[g]);
      // 지금 값으로 다시 계약할 때보다 이득이면 유리(+), 손해면 불리(−)
      const edge = sum(GOODS.map(g => r.give[g] * (r.gp[g] - (r.give[g] ? E.exportPrice(G, me, o, g) : 0)) + r.get[g] * ((r.get[g] ? E.price(G, o, me, g) : 0) - r.bp[g])));
      const line = (a, p, sign) => gs(a).length ? `<span class="deal">${sign === '+' ? '📤' : '📥'}${gs(a).map(g => `${ico(g)}<i>${a[g]}</i>`).join('')}<b class="${sign === '+' ? 'plus' : 'neg'}">${sign}${sum(GOODS.map(g => (sign === '+' && r.dump?.[g] ? Math.min(2, a[g]) : a[g]) * p[g]))}</b></span>` : '';
      body = `<span class="who">${esc(nameOf(r.to))}${s.state === 'sea' ? ` ⛵ ${s.T - s.t}일 남음` : ' ⚓ 항구'}</span>
        ${s.breaking ? '' : `<button class="mini" data-break="${i}"${tipA('계약 깨기 · 신뢰 −1 · ♥0이 되면 새해까지 거래를 안 해요')} aria-label="배 ${i + 1} 계약 깨기 · 신뢰 −1 · ♥0이 되면 새해까지 거래를 안 해요">깨기</button>`}
        ${line(r.give, r.gp, '+')}${line(r.get, r.bp, '−')}
        <span class="foot"><span class="pips" aria-label="${r.done}/${r.trips}번 왕복">${'●'.repeat(r.done)}${'○'.repeat(Math.max(0, r.trips - r.done))}</span>
        ${s.waited ? `<span class="bad"${tipA('두 번 못 떠나면 신뢰 −1 · ♥0이 되면 새해까지 거래를 안 해요')}>⚠ 수출품 부족</span>` : edge ? `<span class="${edge > 0 ? 'good' : 'bad'}"${tipA('지금 시세로 새 계약할 때와 비교한 왕복 차액')}>시세보다 ${Math.abs(edge)}억 ${edge > 0 ? '이득' : '손해'}</span>` : '<small>계약 예정량</small>'}
        ${s.next || s.breaking ? `<small>${s.next ? `다음 ➜ ${esc(nameOf(s.next.to))}` : '계약 깨는 중'}</small>` : `<small>계약 끝 ${dshort(r.until)}</small>`}</span>
        <small class="more-hint">다른 섬에 끌어 놓으면 다음 항로로 예약돼요.</small>`;
    }
    const d = s.delivery, last = d ? `<button class="mini delivery" data-report="${i}" aria-label="배 ${i + 1} 최근 도착 결과">📥 최근 도착 ${signedMoney(d.earned - d.spent)}${d.shortages.length ? ' ⚠' : ''}</button>` : '';
    return `<div class="tip${tip.pinned ? ' pinned' : ''}" id="tip" role="tooltip" style="${tint(i)}"><span class="tip-head"><b class="num">${i + 1}</b> 배 ${i + 1}${last}</span>${body}<i class="arrow"></i></div>`;
  }
  // 툴팁을 토큰 바로 위에 붙인다(화면 밖으로 나가지 않게).
  function placeTip() {
    const el = $('#tip'), tok = tip && (tip.kind === 'isle' ? $(`.isle[data-drop="${tip.id}"] .tile`) : tip.kind === 'nation' ? $('.nation-slot') : $(`.piece[data-ship="${tip.i}"] .fig`));
    if (!el || !tok) return;
    const r = tok.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    if (tip.kind === 'nation') {   // 위쪽 막대의 칸이라 아래로 띄운다
      el.classList.add('below'); el.style.left = left + 'px'; el.style.top = (r.bottom + 14) + 'px';
      el.style.setProperty('--ax', (r.left + r.width / 2 - left) + 'px'); return;
    }
    // 위에 자리가 모자라면(먼 섬) 옆으로 띄운다: 아래로 띄우면 가까운 섬을 가린다
    const side = r.top - h - 14 < 8;
    el.classList.remove('side-l', 'side-r', 'below');
    if (side) {
      const right = r.right + 14 + w <= innerWidth - 8;
      el.classList.add(right ? 'side-r' : 'side-l');
      el.style.left = (right ? r.right + 14 : r.left - w - 14) + 'px';
      const top = Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2));
      el.style.top = top + 'px'; el.style.setProperty('--ay', (r.top + r.height / 2 - top) + 'px'); return;
    }
    el.style.left = left + 'px'; el.style.top = (r.top - h - 14) + 'px';
    el.style.setProperty('--ax', (r.left + r.width / 2 - left) + 'px');
  }
  // ---------- 7.0 나라 칸: 대표 물건 + 그 나라 특성 값. 모든 나라가 같은 자리·같은 크기 ----------
  const SLOT_SHORT = {daon: t => `${t.value}계절`, plains: t => ['풍년', '보통', '흉년'][t.value], oil: t => `${t.value}`, market: t => `빈 ${t.value}`,
    forest: t => `+${t.value}`, port: t => `+${t.value}`, artisan: t => `${t.value}종`, ironland: t => `−${t.value}`};
  function nationSlot(me) {
    const t = E.traitInfo(G, me), key = `${t.text}|${t.warn}`;
    if (slotKey && slotKey !== key) slotFlash = 1;
    slotKey = key;
    const meter = t.frac != null ? `<i class="meter" aria-hidden="true"><i style="width:${Math.round(t.frac * 100)}%"></i></i>` : '';
    return `<button class="stat nation-slot ${t.warn}${slotFlash && !(slotFlash = 0) && !reduce ? ' flash' : ''}" data-nation-slot aria-label="우리 나라 특성 ${esc(t.name)}: ${esc(t.text)}" aria-expanded="${tip?.kind === 'nation'}">
      <span class="main-ico"${tipA(`대표 물건 · ${gname(me.main)}`)}>${ico(me.main)}</span><span class="tr"><b class="ti" aria-hidden="true">${t.icon}</b><span class="tv long">${esc(t.text)}</span><span class="tv short">${esc(SLOT_SHORT[me.id](t))}</span>${meter}</span></button>`;
  }
  function nationTip(me) {
    const t = E.traitInfo(G, me);
    return `<span class="tip-head">${t.icon} ${esc(t.name)} <small class="lvl">${esc(t.level)}</small></span><p class="rule">${esc(t.short)}</p><p class="now ${t.warn}">${esc(t.tip)}</p>
      <p class="mainline">대표 물건 ${ico(me.main)} <b>${gname(me.main)}</b> · 잘 만드는 이 물건을 팔아요</p>`;
  }
  function render() {
    if (!G) return title();
    const me = P(), need = E.needs(G, me);
    const rows = rankRows(), rank = rows.findIndex(r => r.n === me) + 1;
    app.innerHTML = `<header class="bar">
        <b class="brand">무역왕</b>
        <span class="when"><b>${dateText(G, fraction())}</b><span class="track"${tipA('5년 달력 · 눈금 하나 = 3달(정산)')}><span></span></span><small class="settle"></small><span class="settle-dots" aria-label="올해 ${me.seasons.length % 4}번 정산 마침">${[0, 1, 2, 3].map(k => `<i class="${k < me.seasons.length % 4 ? 'done' : ''}"></i>`).join('')}</span></span>
        <span class="speed" role="group" aria-label="시간">
          <button data-speed="0" aria-pressed="${!speed}" aria-label="멈춤"${tipA('멈춤 · Space')}>⏸</button>
          <button data-speed="1" aria-pressed="${speed === 1}" aria-label="재생"${tipA('재생')}>▶</button>
          <button data-speed="2" aria-pressed="${speed === 2}" aria-label="빠르게"${tipA('빠르게')}>▶▶</button>
          <button data-settings class="snd gear" aria-haspopup="dialog"${tipA('설정 · 소리·글자 크기·시작 화면')} aria-label="설정">⚙️</button></span>
        ${nationSlot(me)}
        <span class="stat score" tabindex="0" aria-label="생활 점수 ${me.last ? me.last.score : '–'}점"${tipA('<b>😊 생활 점수</b><br>3달마다 생활 물건·품질·풍요로 점수를 매겨요. 빚·위기 등은 감점돼요. 올해 점수는 4번의 평균이고, 5년 동안 쌓인 합계로 순위를 정해요. 100점 위는 절반만 쌓여요.', 1)}>😊<b>${me.last ? me.last.score : '–'}</b>점</span>
        ${forecastBox()}
        <span class="stat rankstat" tabindex="0" aria-label="순위 ${rank}등"${tipA('<b>🏆 순위</b><br>해마다 1·1·1.5·1.5·2배로 친 점수로 매겨요.', 1)}>🏆<b>${rank}</b>등</span>
      </header>
      <section class="map" id="map">
        <svg class="lanes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lanes()}</svg>
        ${laneMarks()}
        ${guidance()}
        ${smallCard()}
        <button class="isle world${focusGood !== null ? ' match' : ''}" data-drop="world" style="left:${WORLD[0]}%;top:${WORLD[1]}%" aria-label="${esc(E.S.world.name)}, ${esc(E.S.world.title)}, 왕복 ${X.worldTrip}달"><span class="land${CONTINENT_ART ? ' art' : ''}" aria-hidden="true"></span><span class="plank"><b>🗻 ${esc(E.S.world.name)}</b><small>${focusGood !== null ? `${gname(focusGood)} ${E.price(G, G.world, me, focusGood)}억 · ` : `${esc(E.S.world.title)} · `}⛵${X.worldTrip}달</small>${infoBtn('world', E.S.world.name, tip?.kind === 'isle' && tip.id === 'world' && tip.pinned)}</span></button>
        ${G.nations.slice(1).map(island).join('')}
        <div class="home stage${homeStage(me)}" style="left:${HOME[0]}%;top:${HOME[1]}%" data-home-info role="button" tabindex="0" aria-label="${esc(me.name)} · 우리 나라 정보 보기"${tipA('우리 나라 · 눌러서 산업·항구·고른 효과 보기')}><img src="${homeImg(homeStage(me))}" alt="">${homeDeco(me)}<b>${esc(me.name)} · 대표 ${ico(me.main)}</b><small>🏘 ${STAGE[homeStage(me)]}${Object.keys(me.short || {}).length ? ` · <span class="warn">${Object.keys(me.short).map(g => gname(E.inputOf(+g))).join('·')} 부족</span>` : ''}</small></div>
        <div id="ships">${G.nations.flatMap(n => n.ships.map((s, k) => `<span class="ship ${n === me ? 'mine' : 'npc'}" data-n="${n.id}" data-k="${k}"${n === me ? ` style="${tint(k)}" data-drag data-ship="${k}"${tipA(`배 ${k + 1} · 섬으로 끌어 보세요`)}` : ''}><img src="${shipImg(n === me ? k : null)}" alt="" draggable="false"><i>${GOODS.map(g => `<span hidden>${ico(g)}</span>`).join('')}</i>${n === me ? `<b>${k + 1}</b>` : ''}</span>`)).join('')}</div>
        ${me.ships.some(s => s.delivery && G.month - s.delivery.month <= 1) ? `<div class="arrival" role="status">${me.ships.map((s, i) => s.delivery && G.month - s.delivery.month <= 1 ? `<button data-report="${i}"${once(`arr${i}:${s.delivery.month}.${s.delivery.day}`) ? ' class="new"' : ''}>⚓ 배 ${i + 1} 도착! <b>${cargoText(s.delivery.get)}</b> <span>${signedMoney(s.delivery.earned - s.delivery.spent)} · 결과 보기 ›</span></button>` : '').join('')}</div>` : ''}
      </section>
      <footer class="dock">
        <div class="tray" role="group" aria-label="우리 배">${me.ships.map(shipToken).join('')}${futureSlots(me)}</div>
        <div class="coins${me.debt ? ' in-debt' : ''}" tabindex="0" aria-label="금고 ${me.money}억 · 빚 ${me.debt}억"${tipA(`<b>💰 금고 · 빚 ${me.debt}억</b><br>들어오는 돈으로 빚부터 갚아요 · 빚이 있으면 정산 때 생활 점수가 깎여요 (지금 −${E.debtLoss(me)}점)<br><small>${X.debtStep}억마다 −${X.debtPoints}점, 최대 −${X.debtMax}점 · 돈은 생활 물건을 사는 데 써요.</small>`, 1)}><span class="coin">💰</span><b>${me.money}</b><small>억${me.debt ? ` · <strong class="debt">빚 ${me.debt}억</strong>` : ''}</small></div>
        <div class="basket" aria-label="창고와 3달마다 쓰는 양">${E.uses(G, me).map((q, g) => { const c = E.count(me, g), p = E.produces(G, me, g), inp = E.inputNeed(G, me, g), net = p - q, mat = !E.CONSUMER.includes(g);
          if (mat && !c && !p && !q) return '';   // 안 만들고 안 쓰는 재료(철광석·철강)는 바구니에 안 보인다
          const got = me.ships.filter(s => s.delivery && G.month - s.delivery.month <= 1 && s.delivery.get[g]), arrived = got.length && once(`rcv${g}:${got.map(s => `${s.delivery.month}.${s.delivery.day}`).join()}`), ironShort = !!(me.short || {})[g];
          // 3달마다 생산 − 쓰는 양을 +n/−n으로. 0이면 ±0. 공장 투입이 든 물건은 🏭. 철광석·철강은 무엇이 되는지(➜ 철강 재료).
          return `<button data-good="${g}" class="stock${mat ? ' mat' : ''}${c + p < q || ironShort || me.id === 'market' && !mat && c + 2 * p < 2 * q ? ' short' : ''}${arrived ? ' received' : ''}" aria-pressed="${focusGood === g}" aria-label="${gname(g)} 파는 섬 찾기"${tipA(stockTip(me, g, c, p, need[g], inp, net), 1)}>${ico(g)}<b>${c}</b><small>${gname(g)}</small><small class="net ${net < 0 ? 'neg' : net > 0 ? 'plus' : ''}">${ironShort ? `<span class="warn">${gname(E.inputOf(g))} 부족!</span>` : mat && becomes(g) != null ? `<span class="net mat" aria-hidden="true">➜ ${ico(becomes(g))}</span>` : `${netText(net)}<em class="per"> / 3달</em>${inp ? ' 🏭' : ''}`}</small></button>`; }).join('')}</div>
      </footer>
      ${dock ? dockPanel() : ''}${sheet ? sheetPanel() : ''}${tipPanel()}`;
    news(); placeTip(); fitDock(); fitSheet();
    for (const child of app.children) child.inert = !!(dock || sheet) && !child.classList.contains('dockveil') || !!report;
    if (G.pending) showPending(); else if (G.over) showEnd(); else if (report) showDelivery(); else layer.hidden = true;
    clock = {date: $('.when b'), track: $('.track span'), settle: $('.when .settle')};
    shipViews = [...app.querySelectorAll('#ships .ship')].map(el => ({el, n: E.nation(G, el.dataset.n), k: +el.dataset.k, cargo: [...el.querySelectorAll('i > span')], good: null}));
    updateClock(); placeShips();
    coachTick();
    // 계속 도는 효과(배 흔들림·연기·도우미 손짓)는 문서 시계에 맞춰 이어 돌게(다시 그려도 처음부터 다시 시작하지 않게)
    for (const el of document.querySelectorAll('#app .piece.sea .fig img, #app .home .deco.smoke i, #coach .act')) for (const a of el.getAnimations()) a.startTime = 0;
    saveNow(); gtRefresh();
  }
  function forecastBox() {
    const f = E.forecast(G), losses = [['빚', f.debt], ['물가 오름', f.unrest], ['위기 피해', f.crisis], ['빈 칸', f.empty], ['공장 연기', f.pollution]];
    const text = f.slotsBy.map(b => `${gname(b.good)} ${b.got}/${b.need} ${b.got === b.need ? '✓' : '−' + Math.round((b.max - b.points) * 10) / 10 + '점'}`).join('<br>');
    const tt = `<b>다음 정산 예상 😊 ${f.score}점</b><br>${text}<br>품질 +${f.qual}점 · 풍요 +${f.abundance}점${f.raw > f.score ? `<br>원래 ${f.raw}점 · ${E.S.rules79.overFrom}점 위는 절반만 쌓여요` : ''}<br>사건 ${f.extra > 0 ? '+' : ''}${f.extra}점<br>${losses.map(([t, v]) => `${t} −${v}점`).join(' · ')}<br><small>지금 계약 그대로, 새 조작 없이 예상해요. 사건은 첫 선택, 회의는 추천으로 예상해요.</small>`;
    return `<span class="forecast" tabindex="0"${tipA(tt, 1)}><span>다음 정산 예상 😊 <b>${f.score}점</b></span><small>${esc(f.reasons[0])}</small></span>`;
  }
  // 7.6 창고 상자 툴팁: 무엇이 얼마나 있고 3달마다 어떻게 바뀌는지. 철광석·철강은 공장에서 무엇이 되는지 쉬운 말로
  function stockTip(me, g, c, p, use, inp, net) {
    const b = becomes(g), made = E.inputOf(g);
    if (b != null && !E.CONSUMER.includes(g)) return `<b>${ico(g)} ${gname(g)} ➜ 🏭 공장에서 ${josa(gname(b), '이', '가')} 돼요</b><br>창고 ${c}상자 · 3달마다 ${p ? `${made == null ? '캐는' : '만드는'} 양 ${p}, ` : ''}공장이 쓰는 양 ${inp}<br><small>누르면 ${josa(gname(g), '을', '를')} 파는 섬을 찾아요</small>`;
    return `<b>${ico(g)} ${gname(g)}</b><br>창고 ${c}상자 · 3달마다 ${netText(net)}<br><small>만드는 양 ${p} · 국민이 쓰는 양 ${use}${inp ? ` · 공장이 쓰는 양 ${inp}` : ''}${made != null && p ? ` · ${gname(made)}로 만들어요` : ''}</small><br><small>누르면 ${josa(gname(g), '을', '를')} 파는 섬을 찾아요</small>`;
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

  // ---------- 7.7 설정 창(⚙️) · 우리 나라 창(지도에서 우리 섬 누르기). 창이 열리면 시간이 멈추고, 닫으면 전 속도로 ----------
  function openSheet(kind, tab = 'ind') { if (!G) return; tip = null; sheet = {kind, tab, page: 0, per: 6, fit: 0, beforeSpeed: sheet ? sheet.beforeSpeed : speed}; speed = 0; render(); $('.sheet h3')?.focus(); }
  function closeSheet() { const k = sheet.kind; speed = sheet.beforeSpeed; sheet = null; render(); $(k === 'set' ? '[data-settings]' : '[data-home-info]')?.focus(); }
  function setSheet() {
    const TT = window.TradeTitle, rows = TT?.settingRows || [];
    return `<header class="sh-head"><div class="sh-title"><small class="chapter">게임 설정</small><h3 tabindex="-1">⚙️ 설정</h3></div><button class="x" data-sheet-close aria-label="설정 닫기">✕</button></header>
      <div class="sh-body set-rows">${rows.map(([k, name, opts]) => `<div class="row"><span>${name}</span><span class="seg" role="group" aria-label="${name}">${opts.map(([v, t]) => `<button data-setk="${k}" data-setv="${v}" class="${TT.settingValue(k) === v ? 'on' : ''}" aria-pressed="${TT.settingValue(k) === v}">${t}</button>`).join('')}</span></div>`).join('')}
        <div class="row exit"><span>🏠 시작 화면</span><button data-exit-title>시작 화면으로 나가기</button></div>
        <p class="tnote">지금까지 한 것은 저장돼요. 시작 화면에서 ‘이어하기’로 돌아와요.</p></div>
      <div class="sh-foot"><button class="primary" data-sheet-close>닫기</button></div>`;
  }
  // 항구 성장 점수: 시작보다 늘어난 산업 단계 + 4척째부터 배 + 비축 창고 + 큰 배(homeStage와 같은 셈)
  const growPoints = E.grownPoints;
  const monthText = m => `${Math.floor(m / 12) + 1}년째 ${m % 12 + 1}월`;
  function indTab(me) {
    const uses = E.uses(G, me), start = me.startLevels || me.levels, card = id => esc(E.S.cards.find(c => c.id === id).name);
    const rows = GOODS.map(g => {
      const lv = E.levelOf(G, me, g), base = start[g], made = E.produces(G, me, g), net = made - uses[g], tmp = lv - me.levels[g];
      if (!lv && !base && !made && !uses[g] && !E.count(me, g)) return '';
      return `<tr class="${g === me.main ? 'main' : ''}"><th>${ico(g)}<span>${gname(g)}${g === me.main ? '<em class="tag main">대표</em>' : ''}</span></th>
        <td class="lv"><span class="lvpips" aria-hidden="true">${Array.from({length: Math.max(lv, base, 1)}, (_, i) => `<i class="${i < Math.min(lv, base) ? 'on' : i < lv ? 'on up' : 'lost'}"></i>`).join('')}</span><b>${lv}단계</b>${lv !== base ? `<small class="${lv > base ? 'plus' : 'neg'}">${lv > base ? '▲' : '▼'}${Math.abs(lv - base)} · 처음 ${base}</small>` : ''}${tmp ? `<small class="neg">${tmp > 0 ? '+' : '−'}${Math.abs(tmp)} 잠깐</small>` : ''}</td>
        <td>${made}</td><td>${uses[g]}</td><td class="${net < 0 ? 'neg' : net > 0 ? 'plus' : ''}"><b>${netText(net)}</b></td><td class="q">${'⭐'.repeat(me.quality[g])}</td></tr>`;
    }).join('');
    const chain = E.CHAIN.filter(([a, b]) => E.levelOf(G, me, b) || me.levels[b]), short = Object.keys(me.short || {}).map(Number);
    return `<table class="ind"><thead><tr><th>물건</th><th>산업 단계</th><th>3달 생산</th><th>3달 사용</th><th>남거나 모자람</th><th>품질</th></tr></thead><tbody>${rows}</tbody></table>
      ${chain.length ? `<p class="chainline">🏭 공장: ${chain.map(([a, b]) => `${ico(a)} ${josa(gname(a), '이', '가')} 있어야 ${ico(b)} ${josa(gname(b), '을', '를')} 만들어요`).join(' · ')}${short.length ? ` <b class="warn">⚠ 지금 ${short.map(g => gname(E.inputOf(g))).join('·')} 부족</b>` : ''}</p>` : ''}
      ${abundanceLine(me)}
      <p class="howto"><b>어떻게 키우나요?</b> 2년째부터 해마다 1월 1일 발전 회의에서 증강체 한 장을 골라요. 🏭 공장 왕국·🔬 기술 강국·🛡 자립 카드가 산업을 키워요. 사건에서 고른 선택으로도 바뀌어요.</p>`;
  }
  // 8.0 풍요 조건: 정산 뒤 남은 생활 물건이 다음 계절 필요량의 1배면 +2.5점, 그 위로 1배마다 +1.25점(한도 없음) · 커진 항구 +2.5 · 무역 도시 +5
  function abundanceLine(me) {
    const need = E.needs(G, me), keep = me.augments.includes('granaryKeep') ? .5 : 1, R79 = E.S.rules79;
    const items = E.CONSUMER.map(g => { const want = Math.ceil(need[g] * keep), left = E.count(me, g) + E.produces(G, me, g) - need[g], k = Math.floor(left / Math.max(1, want)); return `<span class="${k ? 'ok' : ''}">${ico(g)}${k > 1 ? `✓×${k}` : k ? '✓' : `${Math.max(0, left)}/${want}`}</span>`; }).join('');
    return `<p class="abund"${tipA(`<b>📦 풍요 보너스</b><br>정산 때 쓰고 남은 생활 물건이 다음 계절 필요량${keep < 1 ? '의 절반' : ''} 만큼 남으면 물건마다 +${R79.abundanceGood}점, 그 위로 1배 더 쌓을 때마다 +${R79.abundanceMore}점(물건마다 ${R79.abundanceTimes}배까지)<br>항구가 커지면 +${R79.abundancePort[2]}점 · 무역 도시 +${R79.abundancePort[3]}점`, 1)}><b>📦 풍요 조건</b> 다음 정산 뒤 남을 양 ${items} <small>항구 +${R79.abundancePort[homeStage(me)]}점</small></p>`;
  }
  // 7.9b 증강체 칸(롤토체스 시너지처럼): 콘셉트 10가지, 모은 수와 2장·3장 보너스
  function augTab(me) {
    const cons = E.concepts(me), log = G.stats.cardLog || [], has = cons.filter(c => c.count), main = E.mainConcept(me);
    const tile = c => `<li class="con${c.count ? ' got' : ''}${c.bonus3.on ? ' full' : c.bonus2.on ? ' lit' : ''}"><span class="con-ico" aria-hidden="true">${c.icon}</span><div><b>${esc(c.name)}</b>
        <span class="pips" aria-label="${c.count}/3">${[1, 2, 3].map(j => `<i class="${j <= c.count ? 'on' : ''}"></i>`).join('')}</span>
        <small class="${c.bonus2.on ? 'on' : ''}">2장 · ${esc(c.b2)}</small><small class="${c.bonus3.on ? 'on' : ''}">3장 · ${esc(c.b3)}</small>
        ${c.count ? `<small class="picked">${c.cards.map(id => { const d = E.S.cards.find(x => x.id === id); return `<em class="tier ${d.tier}">${esc(d.name)}</em>`; }).join('')}</small>` : ''}</div></li>`;
    return `<p class="fx-sum"><b>고른 증강체 ${me.augments.length}장</b> · ${has.length ? `모은 콘셉트 ${has.map(c => `${c.icon} ${c.count}`).join(' · ')}` : '아직 없어요. 2년째 1월 1일 첫 발전 회의가 열려요.'}${main ? ` · <b>${main.icon} ${esc(main.name)}의 나라!</b>` : ''}</p>
      <ul class="con-grid">${[...cons].sort((a, b) => b.count - a.count || 0).map(tile).join('')}</ul>`;
  }
  function portTab(me) {
    const st = homeStage(me), pts = growPoints(me), next = st === 1 ? 2 : st === 2 ? 5 : null, others = G.nations.slice(1);
    const slots = X.shipSlots + (me.bigShip ? X.bigShipSlots : 0);
    const ship = (s, i) => `<li><b class="num" style="${tint(i)}">${i + 1}</b>${s.route ? `<span>${s.state === 'sea' ? '⛵' : '⚓'} ${esc(nameOf(s.route.to))}</span><small>계약 끝 ${dshort(s.route.until)}${s.next ? ` · 다음 ➜ ${esc(nameOf(s.next.to))}` : ''}</small>` : `<span>😴 쉬는 중</span><small>섬에 끌어 놓아 새 계약</small>`}</li>`;
    return `<div class="port-grid"><section class="stagebox"><p class="ribbon panel-label">🏘 항구 발전</p>
        <ol class="stages">${[1, 2, 3].map(k => `<li class="${k < st ? 'past' : k === st ? 'now' : ''}"><img src="${homeImg(k)}" alt=""><b>${STAGE[k]}</b></li>`).join('')}</ol>
        <p class="grow">성장 ${pts}점 · ${next ? `‘${STAGE[st + 1]}’까지 <b>${next - pts}점</b> 남았어요` : '가장 큰 단계예요!'}<br><small>산업 단계 +1, 4척째부터 배 한 척, 비축 창고, 큰 배가 1점씩</small></p></section>
      <section class="shipbox"><p class="ribbon panel-label get">⚓ 배와 창고</p><ul class="ships">${me.ships.map(ship).join('')}</ul>
        <p class="facts"><span>📦 배마다 짐칸 ${slots}칸${me.bigShip ? ' (큰 배)' : ''}</span><span>🏚 ${me.warehouse ? '비축 창고 있음 · 두 배까지' : '비축 창고 없음'}</span><span>💰 금고 ${me.money}억 · <b class="${me.debt ? 'neg' : ''}">빚 ${me.debt}억</b></span></p></section>
      <section class="relbox"><p class="ribbon panel-label">🤝 이웃 나라 신뢰</p><p class="trust-rule">♥0 거래 거절 · ♥2 손님 배 · ♥3 할인·먼저 받기</p><ul class="rels">${others.map(o => `<li><img src="${ART}port_${portraitOf(o.id)}.webp" alt=""><span>${esc(o.name)}</span><span class="hearts">${hearts(E.rel(G, me, o))}</span>${E.rel(G, me, o) === 0 ? '<small class="neg">🚫 거래 거절 · 새해에 다시</small>' : me.fta.includes(o.id) ? '<small>자유 무역</small>' : ''}</li>`).join('')}</ul></section>
      <section class="traitbox"><p class="ribbon panel-label">${TR(me.id).icon} 우리 나라 특성</p><div class="trait-body">${nationTip(me)}</div></section></div>`;
  }
  // 고른 효과 카드: 발전 회의 카드(G.stats.cardLog)와 사건 선택(G.story). fx는 엔진이 고르기 전후를 견줘 남긴 실제 변화
  const cardIcon = id => E.S.concepts.find(c => c.id === E.conceptOf(id))?.icon || (id === 'cleaner' ? '🌳' : '🃏');   // 7.9 증강체는 콘셉트 무늬
  function fxLines(fx = {}) {
    const out = [], left = u => u >= E.FOREVER ? 'forever' : u > G.month ? 'left' : 'done', line = (t, u) => out.push({t, k: u == null ? 'once' : left(u), u});
    const gd = g => `${ico(g)} ${gname(g)}`;
    GOODS.forEach(g => { const d = fx.levels?.[g]; if (d) line(`${gd(g)} 산업 ${d > 0 ? '+' : '−'}${Math.abs(d)}단계`, E.FOREVER); });
    GOODS.forEach(g => { const d = fx.quality?.[g]; if (d) line(`${gd(g)} 품질 ⭐${d > 0 ? '+' : '−'}${Math.abs(d)}`, E.FOREVER); });
    for (const p of fx.protect || []) line(p.until ? `🛡 ${gname(p.g)} 지키기 · 수입값 +20%` : `🛡 ${gname(p.g)} 지키기를 풀었어요`, p.until || null);
    for (const m of fx.mods || []) {
      const t = m.kind === 'level' ? `${gd(m.g)} 생산 ${m.v > 0 ? '+' : '−'}${Math.abs(m.v)}단계` : m.kind === 'need' ? `${gd(m.g)} 필요 ${m.v > 0 ? '+' : '−'}${Math.abs(m.v)}` : m.kind === 'score' ? `😊 생활 점수 ${m.v > 0 ? '+' : '−'}${Math.abs(m.v)}점 · 3달마다`
        : m.kind === 'trip' ? `⛵ 왕복 +${m.v}달` : m.kind === 'exchange' ? '💱 환율: 수입값 ×1.5 · 수출값 ×1.2' : m.kind === 'retaliated' ? '🧱 보복 관세: 우리 수출값 −10%' : '';
      if (t) line(t, m.until);
    }
    for (const m of fx.gmods || []) line(`🌐 세계 ${gname(m.g)} 값 ${m.mult > 1 ? '+' : '−'}${Math.round(Math.abs(m.mult - 1) * 100)}%`, m.until);
    for(const id of fx.augments||[])if(!['grow','climb','protect','warehouse','bigShip','moreShip','quality','renewable','lamps','fund','envoy','fta2','cleaner','modernSteel'].includes(id))line(`${cardIcon(id)} ${esc(E.S.cards.find(c=>c.id===id).text)}`,E.FOREVER);
    if (fx.detour) line('🧭 돌아가는 길: 끊긴 물건도 절반은 받아요', fx.detour);
    if (fx.expo) line('🎪 대표 물건 값 +10%', E.FOREVER);
    if (fx.warehouse) line('🏚 비축 창고: 두 배까지 쌓아요', E.FOREVER);
    if (fx.bigShip) line(`🚢 배마다 짐칸 +${X.bigShipSlots}칸`, E.FOREVER);
    if (fx.ships) line(`⛵ 배 +${fx.ships}척`, E.FOREVER);
    if (fx.cleaner) line('🌳 공해 감점 절반', E.FOREVER);
    if (fx.repair) line('🔧 배 한 척 수리 중', fx.repair);
    if (fx.fta?.length) line(`🤝 ${josa(fx.fta.map(id => nameOf(id)).join('·'), '과', '와')} 자유 무역 · ♥3`, E.FOREVER);
    if (fx.rel?.length) line(fx.rel.length > 2 && fx.rel.every(r => r.d === fx.rel[0].d) ? `♥ 이웃 나라 모두 ${fx.rel[0].d > 0 ? '+' : '−'}${Math.abs(fx.rel[0].d)}` : fx.rel.map(r => `${esc(nameOf(r.id))} ♥${r.d > 0 ? '+' : '−'}${Math.abs(r.d)}`).join(' · '), null);
    GOODS.forEach(g => { const d = fx.box?.[g]; if (d > 0) line(`${gd(g)} ${d}상자 받음`, null); });
    if (fx.money) line(`💰 ${fx.money > 0 ? '+' : '−'}${Math.abs(fx.money)}억`, null);
    if (fx.debt) line(`💸 빚 ${fx.debt > 0 ? '+' : '−'}${Math.abs(fx.debt)}억${fx.debt < 0 ? ' 갚음' : ''}`, null);
    return out;
  }
  function fxList(me) {
    const out = [], log = G.stats.cardLog || [];
    const rank = {left: 0, forever: 1, once: 2, done: 3, none: 4};
    const add = (icon, name, when, pick, fx) => {
      const lines = fxLines(fx), k = lines.some(l => l.k === 'left') ? 'left' : lines.some(l => l.k === 'forever') ? 'forever' : lines.some(l => l.k === 'done') ? 'done' : lines.length ? 'once' : 'none';
      const u = Math.max(...lines.filter(l => l.k === 'left').map(l => l.u), 0);
      out.push({icon, name, when, pick, lines, k, chip: {left: `${u - G.month}달 남음`, forever: '영구', once: '한 번', done: '끝났어요', none: '그대로'}[k]});
    };
    log.forEach(c => { const d = E.S.cards.find(x => x.id === c.id); add(cardIcon(c.id), d.name, `${monthText(c.month)} 발전 회의 · ${E.S.rules79.tierNames[c.tier] || ''}`, d.text, c.fx); });
    for (const s of G.story || []) {
      const e = E.S.events.find(x => x.id === s.id); if (!e) continue;
      add(e.crisis ? '🌪' : e.kind === 'problem' ? '⚓' : '✨', e.name, `${monthText(s.month)} 사건`, (e.options[s.k] || '').split(':')[0].trim(), s.fx || null);
    }
    return out.map((c, i) => ({...c, i})).sort((a, b) => rank[a.k] - rank[b.k] || b.i - a.i);
  }
  function fxTab(me) {
    const all = fxList(me), on = all.filter(c => c.k === 'left' || c.k === 'forever').length, forever = all.filter(c => c.k === 'forever').length;
    if (!all.length) return '<p class="empty-note">아직 고른 것이 없어요. 발전 회의 카드를 고르거나 사건에서 선택하면 여기에 카드로 모여요.</p>';
    const per = sheet.per, pages = Math.ceil(all.length / per), page = Math.min(sheet.page, pages - 1), list = all.slice(page * per, page * per + per);
    return `<p class="fx-sum"><b>지금 적용 중 ${on}개</b> · 영구 ${forever}개 · 고른 것 모두 ${all.length}개</p>
      <ul class="fx-cards">${list.map(c => `<li class="fx ${c.k}"><span class="fx-ico" aria-hidden="true">${c.icon}</span><div><b class="fx-name">${esc(c.name)}</b><small class="when">${esc(c.when)} · ${esc(c.pick)}</small>
        <ul class="fx-lines">${c.lines.length ? c.lines.map(l => `<li class="${l.k}">${l.t}</li>`).join('') : '<li class="none">➖ 바뀐 것이 없어요</li>'}</ul></div><em class="chip ${c.k}">${c.chip}</em></li>`).join('')}</ul>
      ${pages > 1 ? `<p class="pager"><button data-fx-page="-1" ${page ? '' : 'disabled'} aria-label="앞 쪽">◀</button><b>${page + 1} / ${pages}</b><button data-fx-page="1" ${page < pages - 1 ? '' : 'disabled'} aria-label="다음 쪽">▶</button></p>` : ''}`;
  }
  function homeSheet() {
    const me = P(), tabs = [['ind', '🏭 산업'], ['port', '⚓ 항구'], ['aug', '🧩 증강체'], ['fx', '🃏 고른 효과']], n = fxList(me).length;
    const body = sheet.tab === 'port' ? portTab(me) : sheet.tab === 'fx' ? fxTab(me) : sheet.tab === 'aug' ? augTab(me) : indTab(me);
    return `<header class="sh-head"><img class="dk-pic mine" src="${homeImg(homeStage(me))}" alt=""><div class="sh-title"><small class="chapter">🏠 우리 나라 · ${STAGE[homeStage(me)]}</small><h3 tabindex="-1">${esc(me.name)} · 대표 ${ico(me.main)} ${gname(me.main)}</h3></div><button class="x" data-sheet-close aria-label="우리 나라 창 닫기">✕</button></header>
      <nav class="sh-tabs" role="tablist" aria-label="우리 나라 정보">${tabs.map(([k, t]) => `<button role="tab" data-sheet-tab="${k}" aria-selected="${sheet.tab === k}" class="${sheet.tab === k ? 'on' : ''}">${t}${k === 'fx' && n ? `<small class="count">${n}</small>` : k === 'aug' && me.augments.length ? `<small class="count">${me.augments.length}</small>` : ''}</button>`).join('')}</nav>
      <div class="sh-body tab-${sheet.tab}">${body}</div>`;
  }
  const sheetPanel = () => `<div class="dockveil sheetveil"><div class="sheet sh-${sheet.kind}${sheet.fit ? ` fit${sheet.fit}` : ''}" role="dialog" aria-modal="true" aria-label="${sheet.kind === 'set' ? '설정' : '우리 나라'}">${sheet.kind === 'set' ? setSheet() : homeSheet()}</div></div>`;
  // 넘치면 한 단계씩 촘촘하게(fit1~3), 효과 카드는 한 쪽에 덜 담는다. 스크롤바는 쓰지 않는다.
  function fitSheet() {
    const over = () => { const b = $('.sheet .sh-body'); return b && b.scrollHeight > b.clientHeight + 1; };
    let guard = 0;
    while (sheet && over() && guard++ < 8) {
      if (sheet.tab === 'fx' && sheet.kind === 'home' && sheet.per > 2) sheet.per -= sheet.per > 4 ? 2 : 1;
      else if (sheet.fit < 3) sheet.fit++;
      else break;
      const el = $('.sheetveil'); el.outerHTML = sheetPanel();
    }
  }

  // ---------- 항로 정하기(부두 창) ----------
  function openDock(i, to) {
    const me = P(), s = me.ships[i];
    if (!s) return;
    if (to !== 'world' && E.rel(G, me, to) === 0) return toast(`${nameOf(to)}와 거래 거절 · 새해에 다시 거래해요. 지금 계약은 끝까지 이어져요.`);
    // 처음엔 이 섬 기준 추천(가장 모자란 물건부터)으로 칸을 채워 두고, 학생이 −/＋로 고친다.
    tip = null; clearTimeout(tipTimer);
    const fit = E.plan(G, me, s, E.nation(G, to));
    // 헐값은 추천이 비어 있어도 다 보기를 눌러야 나온다.
    dock = {i, to, give: [...fit.give], get: [...fit.get], beforeSpeed: speed, more: false};
    speed = 0;
    sel = null; render();
    $('.dockpanel h3').focus();
  }
  function closeDock() {
    const i = dock.i;
    speed = dock.beforeSpeed; dock = null; render();
    $(`.piece[data-ship="${i}"]`)?.focus();
  }
  function showDelivery() {
    const d = P().ships[report.i].delivery, o = nameOf(d.to), pen = sum(d.penaltyIn.map(p => p.amount)) - sum(d.penaltyOut.map(p => p.amount));
    const goods = a => GOODS.filter(g => a[g]).map(g => `<span>${ico(g)}<b>${a[g]}</b><small>${gname(g)}</small></span>`).join('');
    const notes = [...(d.laneNotes || []).map(t => `<li class="lane">${esc(t)}</li>`), ...d.shortages.map(s => `<li class="warn">⚠ ${gname(s.good)} ${s.qty}상자 덜 받음 · ${esc(s.reason)}</li>`),
      ...d.penaltyIn.map(p => `<li class="pin">📜 ${esc(josa(o, '이', '가'))} ${gname(p.good)} ${p.qty}상자를 못 줘서 위약금 <b class="plus">+${p.amount}억</b>을 받았어요${p.debt ? `<small> · 상대 금고가 모자라 ${p.debt}억은 빚이 됐어요</small>` : ''}</li>`),
      ...d.penaltyOut.map(p => `<li class="pout">📜 ${gname(p.good)} ${p.qty}상자를 못 실어 ${esc(o)}에 위약금 <b class="neg">−${p.amount}억</b>을 냈어요${p.debt ? `<small> · 금고가 모자라 ${p.debt}억은 빚이 됐어요</small>` : ''}</li>`)];
    modal(`<header class="rp-head"><span class="yr-seal" aria-hidden="true">⚓</span><div><p class="eyebrow">${Math.floor(d.month / 12) + 1}년째 ${d.month % 12 + 1}월 ${d.day}일 · ${esc(o)}</p><h2>배 ${report.i + 1}의 도착 결과</h2></div></header>
      <div class="rp-cols"><section><p class="ribbon panel-label get">📥 받아 온 물건 <small>창고에 들어왔어요</small></p><div class="receipt-goods">${goods(d.get) || '<p class="muted">이번에는 가져온 물건이 없어요.</p>'}</div></section>
        <section><p class="ribbon panel-label">📤 판 물건</p><div class="receipt-goods sold">${goods(d.sold) || '<p class="muted">이번에는 판 물건이 없어요.</p>'}</div></section></div>
      <p class="sum">받은 돈 <span class="plus">${amt(d.earned, '+')}</span> · 쓴 돈 <span class="neg">${amt(d.spent, '−')}</span>${pen ? ` · 위약금 <span class="${pen > 0 ? 'plus' : 'neg'}">${signedMoney(pen)}</span>` : ''}</p>
      ${notes.length ? `<ul class="rp-notes">${notes.join('')}</ul>` : ''}
      <p class="muted">상자는 도착할 때 창고에 들어왔어요. 받은 돈은 빚부터 갚아요.</p>
      <div class="actions"><button class="primary" data-close-report>확인</button></div>`, 'report-modal');
  }
  // 7.6 계약서(디자인 A): 수출(우리 ➜ 그 나라)·수입(그 나라 ➜ 우리) 두 칸. 물건마다 창고 줄: 지금 · 3달마다 변화 → 계약하면 3달 뒤
  function dockPanel() {
    const me = P(), o = E.nation(G, dock.to), s = me.ships[dock.i], k = E.slotsOf(G, me, o);
    const gives = GOODS.filter(g => o.world ? E.canGive(G, me, g) : true);   // 헐값은 다 보기에서만 담는다.
    const gets = GOODS.filter(g => E.sells(G, o, g)).sort((a, b) => E.buys(G, me, b) - E.buys(G, me, a));
    const ok = E.allowed(G, me, {to: o.id, give: dock.give, get: dock.get});
    const capacity=(d,g)=>k+(d==='give'&&me.augments.includes('relayStore')&&(g!=null&&E.isRelay(G,me,g)||GOODS.some(g=>dock.give[g]&&E.isRelay(G,me,g)))?E.S.rules79.relaySlots:0);
    const used = d => sum(dock[d]), cost = d => sum(GOODS.map(g => (d === 'give' && E.isDump(G, o, g) ? Math.min(2, dock[d][g]) : dock[d][g]) * (d === 'give' ? E.exportPrice(G, me, o, g) : E.price(G, o, me, g))));
    // 7.7 오늘 맺으면 오늘부터, 예약이면 지금 계약이 끝나는 날부터 1년. 그 안에 다녀올 수 있는 왕복 수
    const yrs = years(me, o, dock.give, dock.get), from = s.route ? s.route.until + 1 : E.today(G), until = from + 365 * yrs - 1;
    const trips = E.fitTrips(G, me, {to: o.id, until}, from), t = E.tripTime(G, me, o.id);
    // 짐칸: 채운 칸은 그 물건 아이콘이 든 상자(물건 순서대로 상자 수만큼), 빈 칸은 점선
    const boxes = d => { const full = GOODS.flatMap(g => Array(dock[d][g]).fill(g));
      return `<span class="slots" aria-hidden="true">${full.map(g => `<i class="box">${ico(g)}</i>`).join('')}${'<i class="empty"></i>'.repeat(Math.max(0, capacity(d) - full.length))}</span>`; };
    // 처음엔 추천 짐(상자 수 > 0)과 찾던 물건만 보인다. "다 보기"를 누르면 전부 펼친다.
    const shown = (d, g) => dock.more || dock[d][g] > 0 || (d === 'get' && focusGood === g);
    const hiddenCount = gives.filter(g => !shown('give', g)).length + gets.filter(g => !shown('get', g)).length;
    // 8.2 창고 줄: 계약이 끝날 때까지의 합계(만듦·씀·다른 계약·이 계약 n상자 × 왕복 수)와 처음 모자라는 달
    const look = E.outlook(G, me, s, {to: o.id, give: dock.give, get: dock.get}, from, until), span = !s.route && yrs === 1 ? '1년 동안' : `${dshort(until)}까지`;
    const stock = (d, g, n) => {
      const w = look.goods[g], out = d === 'give' && E.isDump(G, o, g) ? Math.min(2, n) : n, when = w.shortDay != null && E.dateOf(w.shortDay);
      return `<small class="wline${w.short ? ' short' : ''}"><span class="wl-sum">창고 ${w.stock} · ${span} 만듦 +${w.made} · 씀 −${w.used}${w.others ? ` · 다른 계약 ${netText(w.others)}` : ''}${w.waste ? ` · 넘쳐 버림 −${w.waste}` : ''}<br></span>
        ${n ? `이 계약 ${out}상자 × ${trips}번 = ${d === 'give' ? '−' : '+'}${out * trips}` : '계약 안 하면'} → 끝날 때 <strong>${Math.max(0, w.end)}</strong>${w.short ? ` <b>⚠ ${when.month % 12 + 1}월에 ${w.short}상자 모자라요</b>` : ''}</small>`;
    };
    const row = (d, g) => {
      if (!shown(d, g)) return '';
      const n = dock[d][g], other = d === 'give' ? 'get' : 'give', p = d === 'give' ? E.exportPrice(G, me, o, g) : E.price(G, o, me, g), w = E.worldPrice(G, g);
      const dump = d === 'give' && E.isDump(G, o, g), wanted = d === 'get' && focusGood === g;
      const tag = (d === 'get' && E.buys(G, me, g) ? '<em class="tag lack">우리에게 필요</em>' : d === 'give' && g === me.main ? '<em class="tag main">대표</em>' : '')
        + (d === 'give' && E.isRelay(G, me, g) ? `<em class="tag relay">🔁 중계 +${pct(XT.relayBonus)}%</em>` : '')
        + (d === 'give' && luxCap(me, o, g) ? `<em class="tag lux">✨ 명품 · ${me.augments.includes('luxStreet')?E.S.rules79.luxMax:XT.luxMax}상자</em>` : '');
      // 값 칩: 살 때는 싸요/보통/비싸요, 팔 때는 세계 값보다 잘 쳐주면 '잘 쳐줘요', 필요 없는 나라에 팔면 '헐값'
      const chip = dump ? '<em class="lbl dump">헐값</em>' : d === 'get' ? lbl(p, g) : p >= w * 1.1 ? '<em class="lbl cheap">잘 쳐줘요</em>' : p <= w * .9 ? '<em class="lbl dear">싸게 사요</em>' : '<em class="lbl fair">보통</em>';
      return `<div class="step${n ? ' on' : ''}${dump ? ' dump' : ''}${wanted ? ' wanted' : ''}"><div class="good-main">${ico(g)}<span class="what"><b>${gname(g)}${wanted ? ' · 찾던 물건' : ''}${tag}</b>
          <small class="price">${chip}<span>${p}억</span>${d === 'get' && !o.world ? `<span class="q">${'⭐'.repeat(o.quality[g])} · 재고 ${E.exportable(G, o, g)}</span>` : ''}${sixMonths(g, d)}</small></span>
        <span class="stepper"><button data-step="${d}" data-g="${g}" data-d="-1" ${n ? '' : 'disabled'} aria-label="${gname(g)} 한 상자 빼기">−</button><b class="n">${n}</b>
        <button data-step="${d}" data-g="${g}" data-d="1" ${used(d) < capacity(d,g) && !dock[other][g] && !(d === 'give' && luxCap(me, o, g) && n >= (me.augments.includes('luxStreet')?E.S.rules79.luxMax:XT.luxMax)) ? '' : 'disabled'} aria-label="${gname(g)} 한 상자 더하기">＋</button></span></div>
        ${stock(d, g, n)}${dump ? `<small class="dump-note">${esc(o.name)}${E.sells(G, o, g) ? '도 만들어요' : '에 넉넉해요'} · 값의 절반 · 한 번에 2상자까지</small>` : ''}</div>`;
    };
    const giveRows = gives.map(g => row('give', g)).join(''), getRows = gets.map(g => row('get', g)).join(''), nG = (giveRows.match(/class="step[ "]/g) || []).length, nR = (getRows.match(/class="step[ "]/g) || []).length;
    const short = cost('get') > me.money + Math.max(0, cost('give') - me.debt), feats = features(o, dock.get, dock.give).slice(1);
    const pic = o.world ? '<span class="dk-pic world" aria-hidden="true">🗻</span>' : `<img class="dk-pic" src="${ART}port_${portraitOf(o.id)}.webp" alt="">`;
    const col = (d, cls, title, sub, rows, n, empty) => `<section class="col ${cls}${n > 3 ? ' many' : ''}"><p class="ribbon panel-label"><span>${title}</span><span class="pill">배 칸 ${used(d)}/${capacity(d)}</span></p>
      <p class="section-sub"><span>${sub}</span>${boxes(d)}</p><div class="rows">${rows || `<small class="empty-note">${empty}</small>`}</div></section>`;
    return `<div class="dockveil"><div class="dockpanel" role="dialog" aria-modal="true" aria-label="무역 계약서">
      <header class="dk-head"><img class="dk-pic mine" src="${homeImg(homeStage(me))}" alt=""><div class="dk-title"><small class="chapter">📜 배 ${dock.i + 1} · 무역 계약서</small>
        <h3 tabindex="-1">🏠 ${esc(me.name)} ⇄ ${esc(o.name)} 무역 계약</h3>
        <ul class="features" aria-label="이 항로의 특징"><li class="route">📅 ${yrs}년 계약 · ${dshort(from)} ~ ${dshort(until)}</li><li class="route">⛵ 왕복 ${t}달 · 약 ${trips}번 왕복</li><li>🔒 계약 동안 가격 고정</li>${feats.map(f => `<li>${f}</li>`).join('')}</ul></div>${pic}</header>
      <div class="dockbody"><div class="trade-intro"><p class="muted">${s.route ? `지금 계약이 ${dshort(s.route.until)}에 끝나면 이 계약으로 떠나요. 예약할 때는 신뢰가 줄지 않아요.` : '추천 짐을 실어 뒀어요. 1년 동안 자동 왕복하고 끝나면 쉬어요. ♥0과는 새 계약을 못 해요.'}</p>${!o.world && laneTrait(o.id) ? `<p class="lane-note ${laneTrait(o.id).kind}">${laneTrait(o.id).icon} <b>${laneTrait(o.id).name}</b> · ${laneTrait(o.id).text}</p>` : ''}
        <span class="intro-btns"><button class="more" data-reco>추천대로</button>${hiddenCount || dock.more ? `<button class="more" data-more aria-expanded="${dock.more}">${dock.more ? '추천만 보기 ▴' : `다 보기 (${hiddenCount}) ▾`}</button>` : ''}</span></div>
      <div class="cols${nG > 3 ? ' wide-give' : ''}${nR > 3 ? ' wide-get' : ''}">
        ${col('give', 'give', `수출 · ${esc(me.name)} ➜ ${esc(o.name)}`, '우리가 보내요 · 1상자에 받을 값', giveRows, nG, gives.length ? '추천 짐이 없어요. "다 보기"에서 담을 수 있어요.' : '여기에 팔 수 있는 게 없어요')}
        ${col('get', 'get', `수입 · ${esc(o.name)} ➜ ${esc(me.name)}`, '우리가 받아요 · 1상자에 낼 값', getRows, nR, gets.length ? '추천 수입은 비어 있어요. 다른 계약·공급 여유·금고를 고려한 결과예요. "다 보기"에서 ＋로 담을 수 있어요.' : '여기서 살 수 있는 게 없어요')}</div>
      ${used('give') >= k || used('get') >= k ? '<p class="capacity-tip">꽉 찬 짐칸은 다른 상자를 −로 빼면 바꿔 실을 수 있어요.</p>' : ''}</div>
      <div class="dockactions"><div><p class="sum">한 번 왕복마다 예상: 번 돈 <span class="plus">${amt(cost('give'), '+')}</span> · 쓴 돈 <span class="neg">${amt(cost('get'), '−')}</span></p>
      <small>${short ? '<span class="warn">금고가 모자라 일부만 살 수 있어요</span>' : '재고·금고에 따라 덜 받아요. 빚은 수입으로 먼저 갚아요.'}</small></div>
      <div class="actions"><button class="primary" data-sign ${ok ? '' : 'disabled'}><span class="seal-icon" aria-hidden="true">계</span>${s.route ? '다음 항로로 예약' : '계약하기'}</button><button data-close>취소</button></div></div></div></div>`;
  }
  // 계약서가 화면보다 크면 한 단계씩 촘촘하게(fit1: 간격, fit2: 많은 칸은 두 줄, fit3: 안 담은 물건의 창고 줄 숨김, fit4: 안 담은 헐값 안내 숨김). 스크롤바는 만들지 않는다.
  function fitDock() {
    const p = $('.dockpanel'), b = p?.querySelector('.dockbody'); if (!b) return;
    const fit = () => { for (let k = 1; k <= 6 && b.scrollHeight > b.clientHeight + 1; k++) p.classList.add('fit' + k); };   // 7.9c fit5 · 8.2 fit6: 마지막 단계
    fit();
    // 7.9c 그림·글꼴이 늦게 들어와 줄이 커져도 다시 맞춘다
    if (!b.fitWatch && window.ResizeObserver) { b.fitWatch = new ResizeObserver(fit); for (const c of b.children) b.fitWatch.observe(c); }
  }

  // ---------- 멈춤 창 ----------
  const EVT = {
    supplyCut: p => `${nameOf(p.source)}에 분쟁이 생겨 ${gname(p.good)} 수출이 9달 동안 줄어요. ♥3인 나라와 '돌아가는 길'을 고른 나라만 절반을 받아요.`,
    storm: () => '태풍으로 모든 나라의 식량 생산이 6달 동안 줄고 식량 값이 올라요.',
    recession: () => '세계 경제가 얼어붙어 6달 동안 값이 내려가요. 식량·석유·철광석 같은 1차 물건은 반토막, 만든 물건은 조금만 내려요. 이미 맺은 계약 값은 그대로예요.',
    exchange: () => '우리 돈 값이 떨어져서 6달 동안 새로 맺는 수입 계약은 비싸지고, 수출은 조금 비싸게 팔려요.',
    expo: () => '세계 박람회에 우리 대표 물건을 내놓을 수 있어요.',
    invention: () => '새 기술이 나왔어요. 우리가 쓸까요, 나눌까요?',
    voice: () => '농민은 "농업을 지켜 주세요", 소비자는 "물가를 낮춰 주세요"라고 해요.',
    dumping: () => '어떤 나라가 옷을 아주 싸게 팔기 시작했어요(6달).',
    retaliation: p => `우리가 보호를 걸자 ${nameOf(p.source)}이 맞서 우리 물건에 세금을 붙이려 해요.`,
    fta: p => `${nameOf(p.target)}이 서로 관세를 없애는 FTA를 맺자고 해요.`,
    // 6.5 덤 사건
    pirates: () => '해적이 뱃길에 나타났어요. 6달 동안 배가 다니기 위험해요.',
    bigOrder: p => `이웃들이 우리 ${gname(P().main)}을 급히 원해요. 창고의 절반(${p.qty}상자)을 세계값의 1.5배에 바로 팔 수 있어요.`,
    blackout: () => '석유가 모자라 6달 동안 모든 나라의 석유 생산이 줄고 석유 값이 올라요.',
    techBoom: () => '첨단기기가 세계에서 인기예요. 6달 동안 첨단기기 값이 올라요.',
    strike: () => `우리 ${gname(P().main)} 공장 일꾼들이 임금을 올려 달래요.`,
    festival: () => '이웃 섬에서 축제가 열려요. 선물을 보내면 친해질 수 있어요.',
    shipwreck: () => '폭풍에 배 한 척이 부서졌어요. 고치지 않으면 한동안 못 떠나요.',
    tourists: () => '우리 섬에 관광객이 몰려와요. 어떻게 맞이할까요?',
    tariffWar: () => '큰 나라들이 서로 관세를 올려요. 6달 동안 모든 물건 값이 올라요.',
    // 6.5 나라별 특별 사건
    daonLaunch: () => '다온국의 새 기기가 세계에서 화제예요. 어떻게 팔까요?',
    plainsHarvest: () => '대평원에 대풍년이 들었어요! 곡식이 넘쳐요.',
    oilFind: () => '석유 왕국 앞바다에서 새 유전을 찾았어요.',
    marketFair: () => '큰 시장국의 큰 장날이에요. 장사꾼들이 몰려와요.',
    forestFire: () => '숲에 큰불이 났어요. 농장이 위험해요.',
    portStorm: () => '항구에 태풍이 들이닥쳤어요. 부두가 흔들려요.',
    artisanMaster: () => '장인의 나라에 명인이 나타났어요. 어느 솜씨를 배울까요?',
    mineAccident: () => '광산에 사고가 났어요. 캐는 양이 줄 수 있어요.'
  };
  // 선택지마다 고르면 생기는 일 한 줄(engine6.js applyEvent와 같은 순서). 비어 있으면 "그대로".
  const RESULT = {
    supplyCut: ['💰−100 · 📦 그 나라 물건 절반은 받음 · 위기 피해 ½', '📉 그 물건 필요 −1 · 😊−3 (9달)'],
    storm: [null, '🤝 ♥2 이상 나라마다 식량 최대 2상자'],
    recession: [null, '💰−100 · 😊+4 (6달)'],
    exchange: ['🏭 대표 산업 +1단계 (6달)', '📉 가장 많이 사는 물건 필요 −1 · 😊−3 (6달)'],
    expo: ['💰−60 · 📈 대표 물건 새 계약 값 오름', null],
    invention: ['🏭 대표 산업 +1단계', '🤝 ♥0을 뺀 나라 ♥+1'],
    voice: ['🛡 식량 지키기 1년 · 😊−2/3달', '😊+2 (1년)'],
    dumping: [null, '🛡 옷 지키기 1년 · 😊−2/3달'],
    retaliation: ['🛡 지키기 모두 풀기', '📉 6달 동안 우리 수출 값 −10%', '💰−60 · ♥+1'],
    fta: ['🤝 FTA · 그 나라와 ♥3 고정', null],
    pirates: ['💰−80', '⛵ 6달 동안 왕복 +1달'],
    bigOrder: ['📦 재고 절반 팔고 💰 세계값 ×1.5', null],
    blackout: [null, '📉 석유 필요 −1 · 😊−2 (6달)'],
    techBoom: ['💰−150 · 🏭 첨단기기 +1단계', null],
    strike: ['💰−100', '🏭 대표 산업 −1단계 (6달)'],
    festival: ['💰−40 · 🤝 ♥ 가장 낮은 나라 ♥+2', null],
    shipwreck: ['💰−80', '⛵ 배 한 척 3달 쉬기'],
    tourists: ['💰 +인구×15억', '😊+2 (6달)'],
    tariffWar: [null, '💰−100 · 🤝 ♥ 가장 높은 나라와 FTA'],
    daonLaunch: ['💰−100 · ⭐ 첨단기기 품질 +1', '📈 첨단기기 세계값 +20% (6달)'],
    plainsHarvest: ['📦 식량 +8상자', '🤝 ♥2 이상 나라마다 ♥+1'],
    oilFind: ['💰−150 · 🏭 석유 +1단계', '📈 석유 세계값 +25% (6달)'],
    marketFair: ['💰+200', '😊+3 (6달)'],
    forestFire: ['💰−100', '🏭 식량 −1단계 (6달) · 위기 피해'],
    portStorm: ['💰−120', '⛵ 6달 동안 왕복 +1달 · 위기 피해'],
    artisanMaster: ['⭐ 옷 품질 +1', '⭐ 첨단기기 품질 +1'],
    mineAccident: ['💰−120', '🏭 철광석 −1단계 (6달) · 위기 피해']
  };
  function modal(html, cls = '') {
    layer.innerHTML = `<div class="modal${cls ? ' ' + cls : ''}" role="dialog" aria-modal="true">${html}</div>`; layer.hidden = false;
    const m = layer.firstChild; for (let k = 1; k <= 3 && m.scrollHeight > m.clientHeight + 1; k++) m.classList.add('fit' + k);   // 7.6 넘치면 한 단계씩 촘촘하게
    layer.querySelector('button')?.focus({preventScroll: true}); gtRefresh();
  }
  // 7.1h 글 속 ♥를 화면의 하트와 같은 빨강으로: #app·#layer·#coach·#tip에 글이 바뀔 때마다 ♥ 글자를 <b class="hp">로 감싼다(.hearts 안은 제외)
  function heartify(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => n.textContent.includes('♥') && !n.parentElement.closest('.hearts, .hp, script, style') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP});
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) { const frag = document.createDocumentFragment(); for (const part of n.textContent.split(/(♥+)/)) { if (!part) continue; if (part[0] === '♥') { const b = document.createElement('b'); b.className = 'hp'; b.textContent = part; frag.append(b); } else frag.append(part); } n.replaceWith(frag); }
  }
  new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) heartify(n); else if (n.nodeType === 3 && n.parentElement) heartify(n.parentElement); }).observe(document.body, {childList: true, subtree: true});
  const portraitOf = id => T.countries.find(c => c.id === id)?.portrait;
  // 7.9b 값 신호: 세계값이 최근 6달 중 어디쯤인지(계약하면 1년 고정이니 '언제 맺느냐'가 전략). 소문이 있으면 곧 오를 날짜도
  function sixMonths(g, d) {
    const s = E.priceSignal(G, g), good = d === 'get' ? s.cheapness === '싼 편' : s.cheapness === '비싼 편', bad = d === 'get' ? s.cheapness === '비싼 편' : s.cheapness === '싼 편';
    const soon = s.upcoming[0], when = soon ? E.dateOf(soon.day) : null;
    return `<small class="six ${good ? 'good' : bad ? 'bad' : ''}"${tipA(`세계값이 지난 6달 중 ${s.cheapness}이에요${s.arrow ? ` · 요즘 ${s.arrow === '▲' ? '오르는' : '내리는'} 중` : ''}. 계약하면 1년 동안 값이 그대로예요.`)}>${s.arrow ? `<i class="trend ${s.arrow === '▲' ? 'up' : 'down'}">${s.arrow}</i>` : '<span class="six-ico">📈</span>'}<span class="six-lbl">최근 6달 중</span>&nbsp;<b>${s.cheapness}</b>${soon ? `<span class="soon">📣 ${when.month % 12 + 1}월부터 ${soon.mult > 1 ? '오른대요' : '내린대요'}</span>` : ''}</small>`;
  }
  // 7.0 회의 카드에 나라 특성 한 줄: 숲은 공장 경고, 석유 왕국은 새 산업 추천, 철의 나라는 공해
  function cardNote(me, id) {
    if (id === 'protect') {
      const g = GOODS.filter(g => g !== me.main).sort((a, b) => E.dependence(G, me, b) - E.dependence(G, me, a) || me.levels[a] - me.levels[b])[0];
      const no = G.nations.filter(o => o !== me && o.main === g && E.rel(G, me, o) === 1 && !me.fta.includes(o.id));
      if (no.length) return `<small class="cardnote warn">${no.map(o => esc(o.name)).join('·')} ♥0 → 새해까지 거래 거절${me.id === 'forest' ? ' · 관광도 줄어요' : ''}</small>`;
    }
    const raises = ['climb', 'protect', 'selfReliance', 'autarky', 'innovation', 'revolution'].includes(id) || ['grow', 'factory'].includes(id) && me.main !== 0;
    if (me.id === 'forest' && raises) return `<small class="cardnote warn">🏝 관광 수입 −${XT.tourCut}억 / 계절</small>`;
    if (me.id === 'oil' && ['climb', 'innovation'].includes(id) && (G.month >= 12 || me.trait.stage)) return '<small class="cardnote good">⭐ 추천 · 석유 다음 먹거리</small>';
    if (me.id === 'ironland' && ['grow', 'factory', 'revolution'].includes(id)) return '<small class="cardnote warn">💨 공장이 커지면 공해도 늘어요</small>';
    if (['lamps', 'renewable', 'greenRev'].includes(id)) return `<small class="cardnote good">🌱 지금 석유값 ${E.worldPrice(G, 1)}억 · 필요 ${E.needs(G, me)[1]}상자</small>`;
    if (id === 'moreShip' || id === 'armada') return `<small class="cardnote good">⛵ 지금 배 ${me.ships.length}척 · 최대 ${E.maxShips(me)}척</small>`;
    if (id === 'treasure') return '<small class="cardnote warn">🎲 1년 뒤에 돌아와요 · 그때까지 금고가 빠듯해요</small>';
    return '';
  }
  function showPending() {
    const p = G.pending, me = P();
    if (p !== lastPend) {
      lastPend = p;
      if (p.type === 'event') { const ev = E.S.events.find(e => e.id === p.id); sfx(ev.crisis ? 'crisis' : ev.kind === 'problem' ? 'problem' : 'opportunity'); AU?.scene(ev.crisis ? 'storm' : 'sail'); }
      if (p.type === 'meeting') sfx('meeting');
    }
    if (p.type === 'open') return modal(`<h2>⚓ 첫 무역을 시작해요!</h2><p>① 창고에서 사 올 물건 고르기<br>② 빛나는 섬을 눌러 짐 싣기<br>③ ▶ 출항하기</p><p class="muted">배 ${me.ships.length}척 중 한 척은 값이 좋아질 때까지 기다려도 돼요. 계약하면 1년 동안 자동으로 왕복해요. 1년이 지나면 배가 쉬어요.</p>
      <p class="muted">목표는 생활 점수예요. 3달마다 생활 물건·품질·풍요를 정산해요. 돈은 물건을 사는 수단, 빚은 감점이에요.</p><div class="actions"><button class="primary" data-ok="open">배 보내러 가기</button></div>`);
    if (p.type === 'event') {
      const ev = E.S.events.find(e => e.id === p.id);
      return modal(`<p class="eyebrow">${ev.only ? `${esc(T.countries.find(c => c.id === ev.only).name)} 특별 사건 · ` : ''}${ev.crisis ? '위기' : ev.kind === 'problem' ? '무역 문제' : '기회'}</p><h2>${esc(ev.name)}</h2><p>${esc(EVT[p.id](p))}${['invention', 'festival', 'retaliation', 'fta', 'tariffWar'].includes(p.id) && G.nations.some(o => o !== me && E.rel(G, me, o) === 0) ? ' ♥0인 나라는 새해까지 신뢰가 오르지 않아요.' : ''}</p>
        <div class="options">${ev.options.map((t, k) => `<button data-opt-event="${k}"><b>${esc(t.split(':')[0])}</b><small class="result">${(RESULT[p.id]?.[k] || '➖ 그대로')}</small></button>`).join('')}</div>`);
    }
    if (p.type === 'meeting') {
      // 7.9b 증강체 회의: 같은 등급·서로 다른 콘셉트 세 장. 카드마다 콘셉트 무늬, 모으기 진행(🏭 1/3 → 2/3)과 켜질 보너스
      const R79=E.S.rules79,tier=p.tier,cost=E.rerollCost(G),cons=E.concepts(me),flip=once(`meet:${p.year}:${p.rerolls}:${p.cards.join()}`),rank=me.history.at(-1)?.rank;
      const face=(id,i)=>{const c=E.S.cards.find(c=>c.id===id),k=cons.find(x=>x.id===c.concept),now=k.count,next=Math.min(3,now+1),money=E.cardCost(me,id);
        const turn=now<3&&next===3?k.b3:now<2&&next===2?k.b2:'';
        return `<button class="aug-card ${tier}${flip?' flip':''}" style="--d:${(i*.14).toFixed(2)}s" data-card="${id}" aria-label="${esc(`${k.name} ${c.name}: ${c.text}`)}">
          <span class="aug-top"><span class="aug-ico" aria-hidden="true">${k.icon}</span><small>${esc(k.name)}${c.only?' · <em>우리 나라 특성</em>':''}</small></span>
          <b class="aug-name">${esc(c.name)}</b><span class="aug-text">${esc(c.text)}</span>
          <span class="aug-prog"><span class="pips" aria-hidden="true">${[1,2,3].map(j=>`<i class="${j<=now?'on':j===next?'new':''}"></i>`).join('')}</span><span>${k.icon} ${now}/3 → <b>${next}/3</b>${turn?`<em>${next}장 보너스 · ${esc(turn)}</em>`:now>=3?'<em>이미 다 모았어요</em>':''}</span></span>
          ${money?`<small class="aug-cost">💰 투자 ${money}억 · 모자라면 빚이 생겨요</small>`:''}${cardNote(me,id)}</button>`;};
      const mine=cons.filter(c=>c.count).map(c=>`<span class="mine-con${c.count>=2?' lit':''}"${tipA(`${c.name} ${c.count}/3 · 2장: ${c.b2} · 3장: ${c.b3}`)}>${c.icon} ${c.count}/3</span>`).join('');
      return modal(`<p class="eyebrow">${p.year}년째 발전 회의 · <span class="tier-word ${tier}">${R79.tierNames[tier]}</span></p><h2>세 장 중 한 장을 골라요</h2>
        <p class="aug-lead">고르는 카드는 공짜예요${p.cards.some(id=>E.cardCost(me,id))?'(투자 카드만 돈을 내요)':''}. 같은 콘셉트를 2장·3장 모으면 보너스가 켜져요.${mine?`<span class="mine-cons">우리 콘셉트 ${mine}</span>`:''}</p>
        ${p.catchup&&rank?`<p class="catchup">🍀 작년 ${rank}등이라 좋은 카드가 나올 확률 ↑ · 공짜 다시 뽑기 +1</p>`:''}
        <div class="options aug-cards">${p.cards.map(face).join('')}</div>
        <div class="actions"><button data-reroll ${me.debt||me.money<cost?'disabled':''}>🎲 다시 뽑기 · ${cost?cost+'억':'공짜'}</button><span>${me.debt?'빚을 갚으면 다시 뽑을 수 있어요':me.meetings.free?`공짜 ${me.meetings.free}번 남음`:`금고 ${me.money}억`}</span></div>`,'meeting79');
    }
    if (p.type === 'yearEnd') return modal(yearEnd(p.year), 'year-modal');
  }

  // 7.6 1년 결과(디자인 A, U2): 올해 점수 = 3달마다 받은 네 번의 점수 평균. 점수 항목은 쉬운 말과 이유 한 줄로, 순위는 메달로
  function yearEnd(y) {
    const me = P(), R = E.yearReport(G, y);
    if (!R) return `<h2>${y}년째 끝</h2><div class="actions"><button class="primary" data-ok="year">다음 해로 ▶</button></div>`;
    const sp = R.scoreParts, seasons = R.nations.find(n => n.id === me.id).seasons, r1 = v => Math.round(v * 10) / 10, R79 = E.S.rules79;
    const prev = y > 1 ? me.years[y - 2] : null, diff = prev == null ? null : R.score - prev;
    const meter = (f, cls = '') => `<i class="meter${cls}"><i style="width:${Math.max(0, Math.min(100, Math.round(f * 100)))}%"></i></i>`;
    const row = (icon, name, why, pts, f, cls = '', extra = '') => `<div class="score-row${cls}"><span class="score-icon" aria-hidden="true">${icon}</span><span class="score-copy"><b>${name}</b><small>${why}</small></span><span class="score-points">${pts}${meter(f, cls.includes('minus') ? ' minus' : '')}</span>${extra}</div>`;
    const loss = (icon, name, why, v) => row(icon, name, why, v ? `−${r1(v)}점` : '0점', v / 10, v ? ' minus' : ' zero');
    const chips = `<span class="goods-chips">${R.slotsBy.map(b => `<span class="${b.points < b.max - .05 ? 'low' : ''}">${ico(b.good)}${b.name} ${r1(b.points)}/${b.max}</span>`).join('')}</span>`;
    const tour = sum(seasons.map(s => s.tour || 0));
    const rows = [row('🧺', '생활에 필요한 물건 채우기', '식량·옷·석유·첨단기기를 국민이 얼마나 넉넉히 썼는지', `${r1(sp.basket)} / ${sp.basketMax}점`, sp.basket / sp.basketMax, '', chips),
      row('⭐', '좋은 물건 보너스', R.legacy?'이전 규칙으로 받은 정산도 그대로 넣었어요':'쓴 물건이 ⭐2면 +2점, ⭐3이면 +3.75점', `+${r1(sp.quality)}점`, sp.quality / sp.qualityMax, sp.quality ? '' : ' zero'),
      row('📦','풍요 보너스',R.legacy?'새 규칙부터 비축과 항구 성장을 세요':`필요량만큼 쌓으면 +${R79.abundanceGood}, 1배 더마다 +${R79.abundanceMore}(${R79.abundanceTimes}배까지) · 항구`,`+${r1(sp.abundance)}점`,sp.abundance/15),
      loss('📈', '물가 오름', '수입을 막아 우리 물건을 지키면 물가가 올라요', sp.priceBurden),
      sp.eventBonus > 0 ? row('🎲', '사건의 도움', '사건에서 고른 것 덕분에 더해진 점수', `+${r1(sp.eventBonus)}점`, sp.eventBonus / 10) : loss('🎲', sp.eventBonus ? '사건의 불편' : '사건의 도움·불편', '사건에서 고른 것 때문에 더하거나 깎인 점수', -sp.eventBonus),
      loss('💸', '빚 때문에 깎인 점수', '나라 살림이 빠듯해 국민 생활이 힘들어요', sp.debtLoss),
      loss('🌪', '위기 피해', '위기 때 필요한 물건을 못 받으면 깎여요', sp.crisisLoss),
      me.id === 'market' ? loss('🛒', '생활 물건 빈 칸', `생활 물건 하나가 텅 비면 −${XT.emptyPenalty}점`, sp.emptyLoss) : '',
      me.id === 'ironland' ? loss('💨', '공장 연기', '공장이 클수록 깎여요 · 정화 시설로 절반', sp.pollutionLoss) : '',
      me.id === 'forest' ? row('🏝', '관광 수입', '♥2 이상 친구가 많을수록 와요 · 점수가 아닌 돈', `+${tour}억`, tour / 400, tour ? '' : ' zero') : ''].join('');
    const mark = r => `<span class="rank-mark ${['gold', 'silver', 'bronze'][r - 1] || 'plain'}" aria-label="${r}등"><span>${r}</span></span>`;
    const change = c => y === 1 ? '' : c > 0 ? `<small class="up">▲ ${c}계단</small>` : c < 0 ? `<small class="down">▼ ${-c}계단</small>` : '<small>그대로</small>';
    const ranks = R.ranks.map(n => `<li class="rank-row${n.id === me.id ? ' me' : ''}">${mark(n.rank)}<img class="rank-portrait" src="${ART}port_${portraitOf(n.id)}.webp" alt="">
      <span class="rank-name"><span><b>${esc(n.name)}</b>${n.id === me.id ? '<em class="my-tag">나</em>' : ''}</span>${meter(n.score / 100)}</span><span class="rank-score">${n.score}점${change(n.change)}</span></li>`).join('');
    const tops = a => a.slice(0, 2).map(x => `<span>${ico(x.good)}${x.name} ${x.qty}상자</span>`).join('') || '<span class="muted">없음</span>';
    const low = R.slotsBy.filter(b => b.points < b.max - .05).sort((a, b) => a.points / a.max - b.points / b.max)[0];
    const tipText = G.nations.some(o => o !== me && E.rel(G, me, o) === 0) ? '♥0 나라는 새해에 ♥1로 다시 거래해요. 신뢰를 지켜 생활 물건을 채워요.'
      : sp.debtLoss ? '들어오는 돈으로 빚부터 갚아요. 빚이 남으면 정산 때 생활 점수가 깎여요.'
      : low ? `${josa(low.name, '이', '가')} 모자랐어요. ${josa(low.name, '을', '를')} 파는 섬과 계약하면 점수가 올라요.`
      : R.penalties.out ? '약속한 상자를 못 실으면 위약금을 내요. 계약서의 창고 줄을 보고 실을 만큼만 담아요.'
      : sp.quality < 10 ? '⭐ 품질이 높은 물건을 사 오면 보너스 점수가 더 붙어요.' : '아주 잘했어요! 지금처럼 생활 물건을 가득 채워 봐요.';
    return `<header class="yr-head"><span class="yr-seal" aria-hidden="true">🏆</span><div><p class="eyebrow">${y}년째 끝 · 1년 결과 · 누적 ${R.total}점</p><h2>${esc(me.name)}의 한 해</h2></div>
        <p class="yr-score"><small>올해 생활 점수</small><b>${R.score}</b>점<span class="pill${diff > 0 ? ' green' : diff < 0 ? ' red' : ''}">${diff == null ? '첫 해' : diff ? `작년보다 ${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}점` : '작년과 같아요'}</span></p></header>
      <div class="yr-body"><div class="score-side">
        <p class="season-note">${seasons.map(s => `<b>${s.score}</b>`).join(' → ')}점 · 3달마다 받은 네 번의 점수를 평균했어요${seasons.some(s => s.raw > R79.overFrom) ? ` · ${R79.overFrom}점 위는 절반만 쌓여요` : ''}</p>
        <p class="breakdown-head">점수는 이렇게 나왔어요 <span class="pill">네 계절 평균</span></p>${rows}</div>
      <div class="ranking-side"><p class="section-heading">올해 순위 <small>누적 ${R.totalRank}등 · ${R.totalRank > 1 ? `앞 나라까지 ${Math.ceil(R.totals[R.totalRank - 2].score - R.total)}점` : '선두'}</small></p><ol class="rank-list">${ranks}</ol>
        <div class="year-trade"><p class="yt-title">올해 무역</p><div class="trade-totals">
          <p><b>📤 많이 판 것</b>${tops(R.topExports)}</p><p><b>📥 많이 사 온 것</b>${tops(R.topImports)}</p>
          <p><b>💰 들어온 돈</b><span class="plus">${amt(R.moneyIn, '+')}</span><b>나간 돈</b><span class="neg">${amt(R.moneyOut, '−')}</span></p>
          <p><b>📜 위약금</b>받은 돈 <span class="plus">${amt(R.penalties.in, '+')}</span> · 낸 돈 <span class="neg">${amt(R.penalties.out, '−')}</span>${R.penalties.debt ? `<small class="neg">금고가 모자라 ${R.penalties.debt}억은 빚이 됐어요</small>` : ''}</p></div></div></div></div>
      <footer class="yr-foot"><p class="tipline">💡 <b>다음 해 팁</b> ${tipText}</p><button class="primary" data-ok="year">다음 해로 ▶</button></footer>`;
  }

  // ---------- 6.7 첫 판 도우미: 실제 게임을 하면서 한 단계씩 밝혀 설명한다 ----------
  // at: 밝힐 곳, say: 말, until: 아이가 직접 해야 넘어가는 조건, wait: 그때가 올 때까지 숨어 있기, pause: 보여 줄 때 시간 멈춤
  const HELPER = {name: '바다', face: '🧑‍✈️', img: `${ART}v6/coach_bada.webp`};   // 7.1h 그림이 없으면 이모지로
  const helperWanted = () => /[?&]helper/.test(location.search) || !/[?&]debug/.test(location.search) && !localStorage.getItem('trade6.helper');
  // 7.0 나라별 도움말: 공통 단계를 끄지 않았으면 켜진다. 나라마다 본 것을 따로 기억한다(trade6.helper.<나라>).
  const hintsOn = () => /[?&](helper|hints)/.test(location.search) || !/[?&]debug/.test(location.search) && localStorage.getItem('trade6.helper') !== 'off';
  const natKey = id => `trade6.helper.${id}`;
  const natSeen = id => { try { return JSON.parse(localStorage.getItem(natKey(id))) || {}; } catch { return {}; } };
  const natMark = (id, k) => { const v = natSeen(id); v[k] = 1; try { localStorage.setItem(natKey(id), JSON.stringify(v)); } catch {} };
  const INTRO = {
    daon: '우리 공장은 철강 1상자로 첨단기기 2상자를 만들어. 철강이 2계절 끊기면 공장이 녹슬어!',
    plains: '다음 계절 날씨를 미리 알려 줘. 풍년엔 식량이 1.5배, 흉년엔 절반이야.',
    oil: `석유를 ${pct(XT.oilSell)}% 비싸게 팔 수 있어. 대신 캘수록 유전이 늙어 덜 캐게 돼.`,
    market: `사람이 많아 늘 많이 사야 해. 대신 다른 나라가 ${pct(XT.marketDiscount)}% 깎아 줘. 바구니 한 칸이 비면 −${XT.emptyPenalty}점!`,
    forest: `♥2 이상 친구 하나당 계절마다 관광객이 와서 ${XT.tourPerFriend}억을 벌어. 공장을 키우면 관광객이 줄어.`,
    port: `사 온 물건을 다른 섬에 되팔 수 있어. 되팔면 +${pct(XT.relayBonus)}%!`,
    artisan: `⭐3 명품은 값이 +${pct(XT.luxBonus)}%야. 대신 한 항로에 ${XT.luxMax}상자까지만 실을 수 있어.`,
    ironland: `공장이 클수록 공해로 생활 점수가 깎여. 대신 철광석·철강 계약은 ${XT.longYears}년 동안 값이 고정돼.`
  };
  const INTRO_STEP = {at: '.nation-slot', intro: true, say: me => `이 칸은 우리 나라만의 특성이야. 누르면 설명이 나와.<br>${TR(me.id).icon} <b>${esc(TR(me.id).name)}</b> · ${me.augments.some(id=>E.S.cards.find(c=>c.id===id)?.only===me.id)?E.traitInfo(G,me).short:INTRO[me.id]}`};
  // 때 맞춤 도움말(NATIONS-v7.md 6.4): 특성이 처음 실제로 일어나는 순간에 한 번, 시간을 멈추고 말풍선 하나
  const HINTS = [
    {key: 'steelLow', id: 'daon', at: '.nation-slot', when: me => E.traitInfo(G, me).warn === 'warn', say: () => '철강이 곧 떨어져. 철강 파는 섬에 배를 보내자.'},
    {key: 'stopped', id: 'daon', at: '.nation-slot', when: me => me.trait.idleRun > 0, say: () => '철강이 없어 공장이 멈췄어! 한 계절 더 멈추면 녹슬어!'},
    {key: 'badYear', id: 'plains', at: '.nation-slot', when: me => me.trait.next === 2, say: () => '다음 계절은 🌧 흉년이야. 식량을 팔지 말고 아껴 두자.'},
    {key: 'goodYear', id: 'plains', at: '.nation-slot', when: me => me.trait.weather === 0 && G.month >= 3, say: () => `☀️ 풍년이야! 남는 식량을 받아 올 것 없이 보내면 <b>원조</b>야. 끝나면 ♥+${XT.aidRel}!`},
    {key: 'aged', id: 'oil', at: '.nation-slot', when: me => me.trait.stage >= 1, say: () => '유전이 늙어서 석유가 덜 나와. 발전 회의에서 다른 산업을 키워 두자.'},
    {key: 'emptyRisk', id: 'market', at: '.basket', when: me => G.month >= 1 && E.traitInfo(G, me).value > 0, say: () => `빨간 칸이 비면 생활 점수가 −${XT.emptyPenalty}점 더 깎여. 배를 나눠 보내자.`},
    {key: 'tour', id: 'forest', at: '.nation-slot', when: me => me.last?.tour > 0, say: me => `관광 수입 ${me.last.tour}억이 들어왔어! ♥2 이상 친구가 늘수록 관광객이 더 와.`},
    {key: 'relay', id: 'port', at: '.basket', when: me => G.month >= 2 && GOODS.some(g => E.isRelay(G, me, g) && E.exportable(G, me, g) > 0), say: () => `사 온 물건이 창고에 남았어. 이걸 필요한 섬에 되팔면 +${pct(XT.relayBonus)}%!`},
    {key: 'luxFull', id: 'artisan', at: '.tray', when: me => me.ships.some(s => s.route && GOODS.some(g => s.route.give[g] >= XT.luxMax && me.quality[g] === 3)), say: me => `명품은 한 항로에 ${me.augments.includes('luxStreet')?E.S.rules79.luxMax:XT.luxMax}상자까지야. 여러 섬에 나눠 보내면 더 많이 팔 수 있어.`},
    {key: 'smog', id: 'ironland', at: '.nation-slot', when: me => me.last?.pollution > 0, say: me => `공장 연기 때문에 생활 점수가 ${me.last.pollution}점 깎였어. 발전 회의의 <b>제철소 현대화</b> 카드로 공해를 줄일 수 있어.`},
    {key: 'oilPrice', id: null, when: me => !me.augments.some(id => E.conceptOf(id) === 'green') && E.worldPrice(G, 1) > E.S.goods[1].price * XT.renewAt, say: () => `석유값이 ${E.worldPrice(G, 1)}억까지 올랐어. 발전 회의에서 🌱 <b>녹색 성장</b> 카드를 고르면 석유를 덜 써!`},
    // 7.9b 증강체·작은 돌발·값 신호 · 8.0 누적 점수
    {key: 'small79', id: null, at: '.small-pop', when: () => !!$('.small-pop'), say: () => '지도 오른쪽 위 카드는 <b>작은 돌발</b>이야. 시간은 그대로 흘러. 단추가 붙어 있으면 7일 안에 눌러 봐!'},
    {key: 'trend79', id: null, at: '.isle .trend', when: () => G.month >= 4 && !!$('.isle .trend'), say: () => '물건 그림 옆 <b>▲</b>는 요즘 오르는 값, <b>▼</b>는 내리는 값이야. 계약서에서 <b>최근 6달 중 싼 편</b>일 때 맺으면 1년 동안 싸게 사. 배 한 척은 잠깐 기다려도 돼.'},
    {key: 'lane81', id: null, at: '.lane-mark', when: () => G.month >= 1 && !!$('.lane-mark'), say: () => '바닷길 위 그림은 <b>항로의 특징</b>이야. 🌊 해류·🐟 어장은 좋은 길, 🏴‍☠️ 해적·⛈ 폭풍 바다는 값이 좋은 대신 가끔 손해를 봐. 그림을 눌러 봐!'},
    {key: 'sum80', id: null, at: '.forecast', when: () => G.month >= 12, say: () => `점수는 해마다 <b>쌓여</b>! 나라가 커지면 정산이 ${E.S.rules79.overFrom}점을 넘을 수도 있어. 다만 <b>${E.S.rules79.overFrom}점 위는 절반만</b> 쌓이니까 한 가지만 잔뜩 모으기보다 고루 채워 봐.`},
    {key: 'aug79', id: null, at: '.home', when: me => me.augments.length === 1, say: () => '고른 증강체는 우리 섬을 누르면 <b>🧩 증강체</b> 칸에 모여. 같은 콘셉트를 <b>2장·3장</b> 모으면 보너스가 켜져!'}
  ];
  function nextHint() {
    if (resumed || !hintsOn() || G.over || G.pending || dock || report || !layer.hidden) return null;
    const me = P(), seen = natSeen(me.id);
    return HINTS.find(h => (!h.id || h.id === me.id) && !seen[h.key] && h.when(me)) || null;
  }
  const COACH = [
    {say: me => `안녕! 나는 항해사 <b>${HELPER.name}</b>야. 오늘부터 <b>${esc(me.name)}</b>의 무역을 함께할게. 처음 몇 가지만 알려 줄게!`},
    {at: '.home', say: me => `여기가 우리 나라야. 대표 물건은 ${ico(me.main)} <b>${gname(me.main)}</b>. 잘 만드는 이 물건을 다른 나라에 팔 수 있어.`},
    {at: '.basket', say: () => `여기는 우리 <b>창고</b>야. 큰 숫자는 가진 상자 수, 아래 <b>+n / −n</b>은 3달마다 늘고 줄어드는 양이야. <b>빨간 칸</b>은 모자란 물건이라 사 와야 해!`},
    {at: '.isle[data-drop]:not(.world)', say: () => `바다 건너 <b>다른 나라</b>야. 섬 아래 그림은 그 나라와 사고팔 물건이고, <b>⛵달</b>은 다녀오는 데 걸리는 시간이야. 섬 자리와 거리는 판마다 달라져. 이름판의 <b>i</b> 단추를 누르면 그 나라가 무엇을 수출하고 수입하고 싶은지 볼 수 있어.`},
    {at: '.piece[data-ship="0"]', say: () => `이게 우리 <b>배 1번</b>(빨간 배)이야. 배를 <b>끌어서 섬 위에 놓아</b> 봐! 배를 누르고 섬을 눌러도 돼.`, until: () => !!dock, act: '👉 직접 해 보세요'},
    {at: '.dockpanel', say: () => `<b>계약서</b>야. 왼쪽은 <b>수출</b>(우리가 보내는 물건), 오른쪽은 <b>수입</b>(받아 오는 물건)이야. 물건마다 아래 줄에 <b>1년 동안 만들고 쓰는 양</b>과 <b>이 계약 상자 × 왕복 수</b>가 나와. 빨간 ⚠가 뜨면 그달에 창고가 모자란다는 뜻이야.`},
    {at: '[data-more]', say: () => `처음엔 <b>추천 짐</b>만 보여. <b>다 보기</b>를 누르면 이 섬과 사고팔 수 있는 물건이 모두 나와. 눌러 봐!`, until: () => !dock || dock.saw || !$('[data-more]'), act: '👉 다 보기를 눌러 보세요'},
    {at: '[data-reco]', say: () => `−/＋로 짐을 바꿔 봐도 돼. 헷갈리면 <b>추천대로</b>를 누르면 처음 추천 짐으로 돌아가. 눌러 봐!`, until: () => !dock || dock.reco, act: '👉 추천대로를 눌러 보세요'},
    {at: '[data-sign]', say: () => `이제 <b>계약하기</b>를 누르면 배가 떠나!`, until: () => !dock && P().ships.some(s => s.route), act: '👉 계약하기를 눌러 보세요'},
    {at: '.tray', say: me => `계약하면 배는 1년 동안 <b>자동으로 왕복</b>하고 끝나면 쉬어. ♥0 거래 거절 · ♥2 손님 배 · ♥3 할인·먼저 받기야. 배 ${me.ships.length}척 중 한 척은 값이 좋아질 때까지 기다려 봐도 돼.`},
    {at: '.speed', say: () => `준비됐으면 <b>▶</b>를 눌러 시간을 흐르게 해 봐!`, until: () => speed > 0, act: '👉 ▶를 눌러 보세요'},
    {wait: () => !!$('.arrival'), at: '.arrival', pause: true, say: () => `배가 돌아왔어! 눌러 보면 무엇을 팔고 무엇을 사 왔는지 볼 수 있어.`, until: () => !!report},
    {wait: () => !report && layer.hidden, at: '.stat.score', pause: true, say: () => `😊 <b>생활 점수</b>는 국민이 얼마나 넉넉하게 사는지야. 모자란 물건을 채울수록 올라가. 올해 점수는 4번 정산의 평균이고, 해마다 <b>쌓인 합계</b>로 순위를 정해. <b>빚은 감점</b>이고, 위의 <b>다음 정산 예상</b>으로 부족한 물건을 미리 보자!`},
    {pause: true, say: () => `이제 혼자서도 할 수 있어! <b>2년째부터</b> 해마다 1월 1일 <b>발전 회의</b>에서 증강체 카드를 한 장 골라. 가끔 <b>사건</b>이 생기면 어떻게 할지 고르고, 지도 위 <b>작은 돌발</b>도 살펴봐. 도움이 필요하면 설정에서 나를 다시 불러 줘.`, last: true},
  ];
  const coachEl = Object.assign(document.createElement('div'), {id: 'coach', hidden: true});
  coachEl.innerHTML = '<div class="spot"></div><div class="bubble" role="dialog" aria-live="polite"></div>';
  document.body.append(coachEl);
  function coachEnd(save) {
    if (coach?.resumeSpeed) speed = coach.resumeSpeed;
    const common = coach?.common;
    coach = null; coachEl.hidden = true;
    if (common || save === 'off') try { localStorage.setItem('trade6.helper', save); } catch (e) {}   // 나라 소개·때 맞춤만 본 것은 공통 기록을 바꾸지 않는다
    render();
  }
  function coachNext() {
    const c = coach.list[coach.step];
    if (c.last) return coachEnd('done');
    coach.step++; coach.shown = false;
    if (coach.resumeSpeed && !coach.list[coach.step].pause) { speed = coach.resumeSpeed; coach.resumeSpeed = 0; }
    render();
  }
  function coachTick() {
    if (!G) return;
    if (!coach) { const h = nextHint(); if (!h) return; coach = {step: 0, hint: h.key, list: [{...h, pause: true, last: true}]}; }
    let c = coach.list[coach.step];
    if (c.until && coach.shown && c.until()) { coach.step++; coach.shown = false; c = coach.list[coach.step]; }
    // 사건 창·결과 창이 떠 있거나 아직 때가 아니면 숨는다(단, 도착 결과를 기다리는 단계는 결과 창이 열리면 넘어간다)
    const hidden = c.wait && !c.wait() || !layer.hidden && !(c.until && report) || G.over;
    if (hidden) { coachEl.hidden = true; return; }
    if (!coach.shown) {
      coach.shown = true; if (c.pause && speed) { coach.resumeSpeed = speed; speed = 0; }
      if (c.intro) natMark(P().id, 'intro');
      if (coach.hint) natMark(P().id, coach.hint);
    }
    const me = P(), L = coach.list.length;
    coachEl.hidden = false;
    coachEl.querySelector('.bubble').innerHTML = `<span class="face" aria-hidden="true">${HELPER.img ? `<img src="${HELPER.img}" alt="" onerror="this.replaceWith('${HELPER.face}')">` : HELPER.face}</span>
      <div><small class="who">항해사 ${HELPER.name} · ${coach.hint ? `${TR(me.id).icon} ${esc(TR(me.id).name)} 도움말` : c.intro && L === 1 ? '새 나라 도움말' : `도움말 ${Math.min(coach.step + 1, L)}/${L}`}</small><p>${c.say(me)}</p>
      <div class="row">${c.act ? `<em class="act">${c.act}</em>` : `<button class="primary" data-coach-next>${coach.hint || L === 1 ? '알겠어 ▶' : c.last ? '시작하기 ▶' : '다음 ▶'}</button>`}<button data-coach-off>도움말 끄기</button></div></div>`;
    coachPlace(); clearTimeout(coach.t); coach.t = setTimeout(coachPlace, 420);   // 창이 열리는 움직임이 끝난 뒤 한 번 더 맞춘다
  }
  function coachPlace() {
    if (!coach || coachEl.hidden) return;
    const c = coach.list[coach.step], t = c.at && $(c.at), spot = coachEl.querySelector('.spot'), bub = coachEl.querySelector('.bubble');
    coachEl.classList.toggle('free', !t);
    bub.style.cssText = '';
    if (!t) { spot.style.cssText = 'display:none'; return; }
    const r = t.getBoundingClientRect(), pad = 8, W = innerWidth, H = innerHeight;
    spot.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
    const bw = Math.min(460, W - 32), bh = bub.offsetHeight || 170, cx = Math.max(16, Math.min(W - bw - 16, r.left + r.width / 2 - bw / 2));
    if (r.top - pad - bh - 14 > 8) bub.style.cssText = `left:${cx}px;top:${r.top - pad - bh - 14}px;width:${bw}px`;
    else if (r.bottom + pad + bh + 14 < H - 8) bub.style.cssText = `left:${cx}px;top:${r.bottom + pad + 14}px;width:${bw}px`;
    else bub.style.cssText = `left:16px;top:auto;bottom:16px;width:${bw}px`;   // 큰 창(계약서)은 왼쪽 아래 구석에
  }
  coachEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-coach-next')) coachNext();
    if (b.hasAttribute('data-coach-off')) coachEnd('off');
  });
  addEventListener('resize', () => coachPlace());
  window.TK6_coach = {on: () => { try { localStorage.removeItem('trade6.helper'); for (const c of T.countries) localStorage.removeItem(natKey(c.id)); } catch (e) {} }, state: () => coach && {...coach}};
  // ---------- 6.6 결과 책: 1쪽 시상식 · 2쪽 우리 나라 5년 · 3쪽 이번 판의 이야기 ----------
  let endPage = 1;
  const END_PAGES = ['시상식', '우리 나라 5년', '이번 판의 이야기'];
  function showEnd() {
    const rows = E.ranking(G), me = P(), rank = rows.indexOf(me) + 1;
    if (!G.codex) { G.codex = E.codexAdd(loadCodex(), G); saveCodex(G.codex); sfx('end'); AU?.scene('end'); if (G.codex.last?.rankTo > G.codex.last?.rankFrom) setTimeout(() => sfx('rankup'), 1600); }   // 한 판에 한 번만 도감에 적는다
    const page = Math.max(1, Math.min(3, endPage));
    const body = page === 1 ? endPage1(rows, me, rank) : page === 2 ? endPage2(me) : endPage3(me);
    const nav = `<nav class="endnav" aria-label="결과 책 쪽"><button data-endpage="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="앞 쪽">◀</button>
      <span class="pages">${END_PAGES.map((t, i) => `<button class="pg${i + 1 === page ? ' on' : ''}" data-endpage="${i + 1}" aria-current="${i + 1 === page}">${i + 1}. ${t}</button>`).join('')}</span>
      <button data-endpage="${page + 1}" ${page === 3 ? 'disabled' : ''} aria-label="다음 쪽">▶</button>
      <span class="endactions"><button class="primary" data-ok="again">다른 나라로 다시 하기</button><button data-ok="same">${esc(me.name)}으로 다시</button><button data-codex>📖 도감</button></span></nav>`;
    modal(`<div class="ending page${page}${rank === 1 && page === 1 ? ' win' : ''}">${body}</div>${nav}`, 'ending-modal');    requestAnimationFrame(() => { const st = $('.stage.story'); if (st && st.scrollHeight > st.clientHeight + 2) st.classList.add('dense'); });   // 사건이 많아 넘치면 촘촘하게
  }
  const barK = (a, y) => { const lo = Math.min(...a) - 8, hi = Math.max(...a); return (.25 + .75 * (y - lo) / Math.max(1, hi - lo)).toFixed(2); };
  // 7.9b 이번 판의 빌드: 고른 증강체 네 장(콘셉트 무늬·등급 색)과, 3장을 모았으면 'OO으로 키운 OO'
  function buildLine(me) {
    const main = E.mainConcept(me), cards = (G.stats.cardLog || []).map(c => E.S.cards.find(x => x.id === c.id));
    return `<p class="build">${main ? `<b class="con-nation">${main.icon} ${esc(main.name)}으로 키운 ${esc(me.name)}</b>` : '<b>🧩 우리 빌드</b>'}${cards.map(d => `<em class="tier ${d.tier}"${tipA(d.text)}>${cardIcon(d.id)} ${esc(d.name)}</em>`).join('')}</p>`;
  }
  // 7.0 엔딩 한 줄 평(NATIONS-v7.md 6.3): [특성을 잘 살렸을 때, 못 살렸을 때]
  const TRAIT_HEAD = {daon: ['공장이 멈추지 않은 가공 무역 나라', '철강이 끊겨 공장이 녹슨 나라'], plains: ['원조로 친구를 모은 곡창 나라', '흉년에 흔들린 곡창 나라'],
    oil: ['석유 너머로 나아간 나라', '유전이 늙자 흔들린 나라'], market: ['빈 칸 없이 국민을 채운 큰 시장', '빈 칸에 국민이 불만인 큰 시장'],
    forest: ['관광객이 끊이지 않는 초록 섬', '공장에 숲을 내준 섬'], port: ['바다 길목을 잡은 중계 무역 나라', '남의 물건만 기다린 항구'],
    artisan: ['이름난 명품의 나라', '명품을 못 키운 장인들'], ironland: ['맑은 하늘의 공업 나라', '연기에 가려진 공업 나라']};
  const TRAIT_TITLE = {daon: ['⚙️', '멈추지 않는 공장', '철강을 끊기지 않게 챙겨 공장을 계속 돌렸어요.'], plains: ['🌾', '이웃을 먹인 곡창', '남는 식량을 원조로 보내 친구를 모았어요.'],
    oil: ['🌱', '에너지 전환의 개척자', '석유가 바닥나기 전에 다른 산업을 키웠어요.'], market: ['🛒', '빈 칸 없는 큰 시장', '많은 국민의 바구니를 늘 채웠어요.'],
    forest: ['🏝', '초록 섬의 안내자', '숲을 지키며 관광객을 맞이했어요.'], port: ['🔁', '바다 길목의 중개인', '되판 돈으로 생활 물건을 채웠어요.'],
    artisan: ['✨', '이름난 명장', '적게 만들어도 귀한 명품을 많이 팔았어요.'], ironland: ['🌳', '맑은 하늘의 공업국', '정화 시설로 공장 연기를 줄였어요.']};
  // 특성 값 5년 그래프: 매장량·철강 재고는 해마다 값, 나머지(쌓인 값)는 그해에 늘어난 만큼
  const LEVEL_TRAIT = ['oil', 'daon'];
  function traitBars(me) {
    const h = me.history.map(x => x.trait ?? 0), v = LEVEL_TRAIT.includes(me.id) ? h : h.map((x, i) => x - (h[i - 1] ?? 0)), max = Math.max(1, ...v.map(Math.abs));
    return `<div class="tbars" aria-label="해마다 특성 값">${v.map((x, i) => `<span${tipA(`${i + 1}년째 ${x}`)}><b>${x}</b><i style="--h:${Math.round(Math.abs(x) / max * 100)}%"></i><small>${i + 1}년</small></span>`).join('')}</div>`;
  }
  // 7.2 결과 책 1쪽: 이번 판에 도감에 새로 적힌 것과 칭호
  function codexNews() {
    const c = G.codex, fresh = c.lastNew || [], ranks = E.S.ranks, up = c.last && c.last.rankTo > c.last.rankFrom;
    const unplayed = T.countries.filter(x => !c.nations?.[x.id]).length;
    return `<p class="codex-new">📖 도감에 새로 적힌 것 <b>${fresh.length}개</b>${fresh.length ? ` · ${fresh.slice(0, 3).map(k => esc(slotName(k))).join(' · ')}${fresh.length > 3 ? ' …' : ''}` : ''}
      ${up ? `<span class="rankup">${rankMark(ranks[c.last.rankTo - 1], 'sm')} 칭호가 올랐어요! ${esc(ranks[c.last.rankFrom - 1].name)} → <b>${esc(ranks[c.last.rankTo - 1].name)}</b></span>` : ''}
      <small>${unplayed ? `아직 안 해 본 나라 ${unplayed}곳 · ` : ''}▶ 다음 쪽: 우리 나라 5년</small></p>`;
  }
  function endPage1(rows, me, rank) {
    const got = G.codex.last?.badges || [], badge = id => E.S.badges.find(b => b.id === id);
    const line = rank === 1 ? '바다를 다스린 무역왕!' : rank === 2 ? '한 걸음만 더! 훌륭한 2등' : rank === 3 ? '당당한 3등!' : '다음 판엔 더 멀리 가 봐요';
    const top = rows.slice(0, 3), order = [1, 0, 2];   // 시상대: 2등 · 1등 · 3등 순서로 세운다
    const step = k => { const n = top[k]; return n ? `<div class="pstep p${k + 1}${n === me ? ' me' : ''}" style="--d:${[.5, .2, .8][k]}s"><img src="${ART}port_${portraitOf(n.id)}.webp" alt=""><b>${esc(n.name)}</b><small>${n.score}점</small><span class="block">${k + 1}</span></div>` : ''; };
    return `<div class="confetti" aria-hidden="true">${rank === 1 && !reduce ? Array.from({length: 28}, (_, i) => `<i style="--i:${i};--x:${(i * 37) % 100}%;--t:${2.6 + (i % 5) * .5}s;--w:${.3 + (i % 3) * .2}s"></i>`).join('') : ''}</div>
      <div class="stage">
        <p class="eyebrow">다섯 해가 끝났어요 · 시상식</p>
        <div class="podium" aria-label="순위 시상대">${order.map(step).join('')}</div>
        <ol class="others">${rows.slice(3).map((n, i) => `<li class="${n === me ? 'me' : ''}">${i + 4}. ${esc(n.name)} <b>${n.score}점</b></li>`).join('')}</ol>
      </div>
      <div class="result">
        <div class="stamp-row"><span class="stamp">${rank === 1 ? '<small>🏆</small>무역왕' : `${rank}등`}</span><div><h2>${esc(line)}</h2><p class="trait-head ${E.traitResult(G, me).good ? 'good' : 'bad'}">${TR(me.id).icon} ${esc(TRAIT_HEAD[me.id][E.traitResult(G, me).good ? 0 : 1])}</p><p class="avg"${tipA(`계약 깨기 ${G.stats.breaks}번 · 출항 놓침 ${G.stats.misses}번 · 문 닫은 공장 ${G.stats.declines}곳 · 금고 ${me.money}억 · 빚 ${me.debt}억`)}>${esc(me.name)} · 5년 누적 <b>${me.score}</b>점</p></div></div>
        <div class="years" aria-label="해마다 생활 점수">${me.years.map((y, i) => `<span style="--k:${barK(me.years, y)};--d:${.6 + i * .12}s"><b>${y}</b><i></i><small>${i + 1}년</small></span>`).join('')}</div>
        ${buildLine(me)}
        <p class="badges">${got.length ? got.map((id, i) => `<span class="badge-chip" style="--d:${1.2 + i * .25}s" ${tipA(badge(id).text)}>🎖 ${esc(badge(id).name)}</span>`).join('') : '<span class="muted">이번 판엔 새 배지가 없어요</span>'}</p>
        ${codexNews()}
      </div>`;
  }
  // 2쪽: 항구 성장 필름(1·3·5년째) + 산업 사다리 처음→끝 + 5년 무역 통계
  function endPage2(me) {
    const hist = me.history.length ? me.history : [{levels: me.levels, ships: me.ships.length, warehouse: me.warehouse, bigShip: me.bigShip, imp: GOODS.map(() => 0), exp: GOODS.map(() => 0)}];
    const at = i => hist[Math.min(i, hist.length - 1)], frames = [0, 2, 4].map(at);
    const stage = h => homeStage({levels: h.levels, startLevels: me.startLevels, ships: {length: h.ships}, warehouse: h.warehouse, bigShip: h.bigShip, id: me.id});
    const impTotal = GOODS.map(g => sum(hist.map(h => h.imp[g]))), expTotal = GOODS.map(g => sum(hist.map(h => h.exp[g])));
    const top = a => { const g = a.indexOf(Math.max(...a)); return a[g] > 0 ? g : null; };
    const gi = top(impTotal), ge = top(expTotal), s0 = stage(frames[0]), s2 = stage(frames[2]);
    const tiers = [[1, '1차 · 캐고 기르기'], [2, '2차 · 만들기'], [3, '3차 · 첨단']];
    return `<div class="stage growth">
      <p class="eyebrow">우리 나라 5년 · ${esc(me.name)}</p>
      <div class="film">${frames.map((h, i) => `<figure style="--d:${.15 + i * .35}s"><img src="${homeImg(stage(h))}" alt=""><figcaption><b>${[1, 3, 5][i]}년째</b><small>${STAGE[stage(h)]}</small></figcaption></figure>`).join('<i class="arrow" aria-hidden="true">➜</i>')}</div>
      <p class="film-note">${s2 > s0 ? `🏘 ${STAGE[s0]}에서 ${STAGE[s2]}로 자랐어요!` : '🏘 항구는 그대로였어요. 발전 회의 카드로 산업을 키우면 섬이 자라요.'}</p>
      <div class="money-line">💰 금고 ${hist.map((h, i) => `<span><small>${i + 1}년</small><b>${h.money}억${h.debt ? ` · 빚 ${h.debt}억` : ''}</b></span>`).join('')}</div>
    </div>
    <div class="result">
      <h3>산업 사다리 · 처음 → 끝</h3>
      <div class="ladder">${tiers.map(([t, name]) => `<div class="tier"><small>${name}</small><div>${GOODS.filter(g => E.S.goods[g].tier === t).map(g => { const a = me.startLevels[g], b = me.levels[g]; return `<span class="lvl${b > a ? ' up' : b < a ? ' down' : ''}">${ico(g)}<b>${a}</b><i>→</i><b>${b}</b>${b > a ? '<em>▲' + (b - a) + '</em>' : b < a ? '<em>▼</em>' : ''}</span>`; }).join('')}</div></div>`).join('')}</div>
      <div class="trait-result ${E.traitResult(G, me).good ? 'good' : ''}"><p><b>${esc(TR(me.id).name)}</b> ${esc(E.traitResult(G, me).line)}</p>${traitBars(me)}</div>
      <h3>5년 무역</h3>
      <div class="trade-stats">
        <span>${gi != null ? ico(gi) : '📦'}<b>${gi != null ? `${gname(gi)} ${impTotal[gi]}상자` : '없음'}</b><small>가장 많이 사 온 물건</small></span>
        <span>${ge != null ? ico(ge) : '📦'}<b>${ge != null ? `${gname(ge)} ${expTotal[ge]}상자` : '없음'}</b><small>가장 많이 판 물건</small></span>
        <span>💰<b>${amt(me.earnedTotal, '+')}</b><small>수출로 번 돈 · 빚부터 갚아요</small></span>
        <span>🧾<b>${amt(me.spentTotal, '−')}</b><small>수입에 쓴 돈 · 생활 물건 채우기</small></span>
      </div>
    </div>`;
  }
  // 3쪽: 사건·선택·결과 타임라인 + 칭호 + 단골 섬 + 이웃 소식
  function endPage3(me) {
    const ev = id => E.S.events.find(e => e.id === id), when = m => `${Math.floor(m / 12) + 1}년째 ${m % 12 + 1}월`;
    const rows = G.story.map(s => { const e = ev(s.id), opt = (e.options[s.k] || '').split(':')[0], res = RESULT[s.id]?.[s.k];
      return `<li class="${e.crisis ? 'crisis' : e.kind}"><small>${when(s.month)}</small><b>${esc(e.name)}</b><span>${esc(opt)}</span><em>${res || '➖ 그대로'}</em></li>`; });
    const partners = G.nations.slice(1).map(o => ({o, n: (me.importedFrom[o.id] || 0) + (me.exportedTo[o.id] || 0)})).sort((a, b) => b.n - a.n);
    const best = partners[0], world = (me.importedFrom.world || 0) + (me.exportedTo.world || 0), title = pickTitle(me, partners, world);
    const rank = E.ranking(G);
    const news = G.nations.slice(1).map(o => { const r = rank.indexOf(o) + 1;
      const t = r === 1 ? '바다의 왕이 됐어요 🏆' : r <= 2 ? `${gname(o.main)}으로 넉넉하게 살았어요` : r <= 4 ? `${gname(o.main)}을 팔며 지냈어요` : '힘든 5년을 보냈어요';
      return `<li><img src="${ART}port_${portraitOf(o.id)}.webp" alt=""><b>${esc(o.name)}</b><span>${t} · ${o.score}점</span></li>`; });
    return `<div class="stage story">
      <p class="eyebrow">이번 판의 이야기 · 일어난 일과 우리의 선택</p>
      <ol class="timeline">${rows.join('') || '<li><b>조용한 5년이었어요</b></li>'}</ol>
    </div>
    <div class="result">
      <div class="title-chip"><span class="stamp small">${title.emoji}</span><div><h3>${esc(title.name)}</h3><p>${esc(title.text)}</p></div></div>
      <h3>단골 섬</h3>
      ${best && best.n ? `<div class="partner"><img src="${ART}port_${portraitOf(best.o.id)}.webp" alt=""><div><b>${esc(best.o.name)}</b> <span class="hearts">${hearts(E.rel(G, me, best.o))}</span><small>상자 ${best.n}개를 주고받았어요${world ? ` · 북쪽 대륙과는 ${world}개` : ''}</small></div></div>` : '<p class="muted">계약한 섬이 없었어요.</p>'}
      <h3>이웃 소식</h3><ul class="neighbors">${news.join('')}</ul>
    </div>`;
  }
  function pickTitle(me, partners, world) {
    const imp = sum(Object.values(me.importedFrom)), exp = sum(Object.values(me.exportedTo)), done = G.contracts.filter(c => c.done).length;
    if (E.traitResult(G, me).good) { const [emoji, name, text] = TRAIT_TITLE[me.id]; return {emoji, name, text}; }   // 7.0 특성을 잘 살렸으면 나라 칭호가 먼저
    if (G.stats.breaks === 0 && done >= 6) return {emoji: '🤝', name: '약속의 상인', text: '약속을 지켜 거래 거절을 피하고 물건을 받았어요.'};
    if (world >= 24) return {emoji: '🧭', name: '먼바다 모험가', text: '북쪽 대륙까지 먼 뱃길을 자주 오갔어요.'};
    if (partners.filter(p => E.rel(G, me, p.o) >= 2).length >= 3) return {emoji: '💞', name: '모두의 친구', text: '♥2 손님 배, ♥3 할인으로 생활 물건을 채웠어요.'};
    if (exp > imp * 1.5 && exp >= 20) return {emoji: '📤', name: '수출왕', text: '사 온 것보다 판 것이 훨씬 많았어요.'};
    if (imp < 20) return {emoji: '🌾', name: '자급자족 농부', text: '밖에서 사 오는 것 없이 스스로 살림을 꾸렸어요.'};
    return {emoji: '⚖️', name: '균형의 상인', text: '사고팔기를 고르게 하며 살림을 꾸렸어요.'};
  }
  // ---------- 7.2 도감 = 선장의 항해 일지(BOOK-v72.md): 탭 6개 · 쪽 넘김 · NEW 리본 · 칭호 ----------
  const CODEX_KEY = 'trade6.codex';
  const loadCodex = () => { try { return E.codexNormalize(JSON.parse(localStorage.getItem(CODEX_KEY)) || {}); } catch { return E.codexNormalize({}); } };
  const saveCodex = c => { try { localStorage.setItem(CODEX_KEY, JSON.stringify(c)); } catch {} };
  const KIND = {crisis: '위기', opportunity: '기회', problem: '무역 문제'};
  const CX = `${ART}v6/codex/`;
  // 그림이 있으면 html에 art-○○ 표시 → CSS가 그림을 쓰고, 없으면 테두리·이모지로 대신한다
  for (const f of ['book', 'stamp_king', 'seal', 'medal_gold', 'medal_silver', 'medal_locked', 'news', 'shelf', 'crate', 'lesson', 'rank_1']) {
    const im = new Image(); im.onload = () => document.documentElement.classList.add('art-' + f.replace('_', '-')); im.src = `${CX}${f}.webp`;
  }
  const BOOK_TABS = [['nations', '⚓', '나라'], ['goods', '📦', '물건'], ['events', '📰', '사건'], ['augs', '🧩', '증강체'], ['badges', '🎖', '배지'], ['lessons', '📘', '상식'], ['records', '📜', '기록']];
  let book = {tab: 'nations', page: 0, fresh: new Set(), level: {}};
  // 새 칸 열쇠(엔진 codexSlots)를 사람이 읽는 이름으로
  function slotName(key) {
    const [t, id, k] = key.split(':'), cn = x => T.countries.find(c => c.id === x)?.name;
    if (t === 'nation') return `⚓ ${cn(id)}`;
    if (t === 'friend') return `♥ ${cn(id)} 단골`;
    if (t === 'exp' || t === 'imp' || t === 'star') return `📦 ${gname(+id)} ${{exp: '수출', imp: '수입', star: '⭐3 수출'}[t]}`;
    if (t === 'event') { const e = E.S.events.find(x => x.id === id); return `📰 ${e.name}`; }
    if (t === 'badge') { const b = E.S.badges.find(x => x.id === id); return `${b.emoji} ${b.name}`; }
    if (t === 'lesson') { const l = E.S.lessons.find(x => x.id === id); return `${l.icon} ${l.name}`; }
    if (t === 'aug') { const a = E.S.cards.find(x => x.id === id); return `${cardIcon(id)} ${a.name}`; }
    return key;
  }
  const tabOf = key => ({nation: 'nations', friend: 'nations', exp: 'goods', imp: 'goods', star: 'goods', event: 'events', badge: 'badges', lesson: 'lessons', aug: 'augs'})[key.split(':')[0]];
  const isNew = key => book.fresh.has(key);
  const ribbon = on => on ? '<em class="newrib">NEW</em>' : '';
  const rankMark = (r, cls = '') => `<span class="rankmark r${r.n} ${cls}" aria-hidden="true"><i>${r.icon}</i></span>`;
  // 쪽마다 칸 수 [칸, 가로 칸]: 탭을 열 때 큰 배치부터 그려 보고, 카드 글이 넘치면 한 단계씩 줄인다(화면·글자 크기에 맞춤)
  const FIT = {events: [[9, 3], [6, 3], [4, 2]], badges: [[8, 4], [6, 3], [4, 2]], lessons: [[8, 4], [6, 3], [4, 2]]};
  const fitOf = tab => FIT[tab]?.[book.level[tab] || 0];
  const perPage = tab => fitOf(tab)?.[0] || 99;
  const gridVars = tab => { const [n, cols] = fitOf(tab); return `style="--cols:${cols};--rows:${Math.ceil(n / cols)};--prows:${Math.ceil(n / 2)}"`; };
  const bookOverflows = () => { const page = layer.querySelector('.bk-page'); if (!page) return false; const pb = page.getBoundingClientRect();
    return [...page.querySelectorAll('li')].some(li => { const b = li.getBoundingClientRect(); if (b.bottom > pb.bottom + 2) return true;
      return [...li.querySelectorAll('b, small, p, span')].some(d => d.getBoundingClientRect().bottom > b.bottom + 2); }); };

  function bookNations(c) {
    return `<ul class="bk-stamps">${T.countries.map(n => {
      const r = c.nations[n.id], fr = c.friends[n.id], tr = TR(n.id);
      const fresh = isNew('nation:' + n.id) || isNew('friend:' + n.id);
      return `<li class="stampcard${r ? ' on' : ''}${fresh ? ' fresh' : ''}">${ribbon(fresh)}
        <span class="perf"><img src="${ART}port_${n.portrait}.webp" alt="">${r?.wins ? '<i class="mk king" data-tip="1등 해 봤어요"></i>' : ''}${r?.trait ? `<i class="mk seal"${tipA(TRAIT_TITLE[n.id][1])}></i>` : ''}</span>
        <b>${r ? esc(n.name) : '???'}</b>
        <small>${r ? `${r.games}판 · 최고 ${r.best}점${r.wins ? ` · 🏆${r.wins}` : ''}` : `${tr.icon} ${esc(tr.name)}`}</small>
        <small class="fr${fr ? ' on' : ''}">${fr ? `♥ 단골 ${fr}번` : '♡ 단골 도장'}</small></li>`;
    }).join('')}</ul>
    <p class="bk-note">우표: 그 나라로 해 보면 붙어요 · 👑 도장 = 1등 · 봉인 = 특성을 잘 살림 · ♥ 단골 도장 = 다른 나라로 할 때 그 나라와 ♥3으로 끝냄</p>`;
  }
  function bookGoods(c) {
    return `<div class="bk-shelf"><ul>${GOODS.map(g => {
      const st = [c.goods[g], c.imports[g], c.star3[g]], any = st.some(Boolean), fresh = ['exp', 'imp', 'star'].some(t => isNew(`${t}:${g}`));
      return `<li class="crate${any ? ' on' : ''}${fresh ? ' fresh' : ''}">${ribbon(fresh)}<span class="box">${ico(g)}</span><b>${any ? gname(g) : '???'}</b>
        <span class="steps"><i class="${st[0] ? 'on' : ''}">수출</i><i class="${st[1] ? 'on' : ''}">수입</i><i class="${st[2] ? 'on' : ''}">⭐3</i></span>
        <small>${c.sold[g] ? `모두 ${c.sold[g]}상자 팖` : '아직 안 팔았어요'}</small></li>`;
    }).join('')}</ul></div>
    <p class="bk-note">물건마다 세 칸: 수출해 보기 → 수입해 보기 → 품질 ⭐3으로 수출해 보기</p>`;
  }
  function bookEvents(c, page) {
    const order = ['crisis', 'problem', 'opportunity'], cname = id => T.countries.find(x => x.id === id).name;
    const ev = [...E.S.events].sort((a, b) => (!!a.only - !!b.only) || order.indexOf(a.kind) - order.indexOf(b.kind));
    const n = perPage('events'), list = ev.slice(page * n, page * n + n);
    return `<ul class="bk-news" ${gridVars('events')}>${list.map(e => {
      const seen = c.events[e.id], ch = c.choices[e.id] || [], all = seen && e.options.every((_, i) => ch[i]);
      const fresh = e.options.some((_, i) => isNew(`event:${e.id}:${i}`)), art = E.S.eventArt[e.id];
      const tag = e.only ? `${cname(e.only)} 특별` : KIND[e.kind];
      return `<li class="clip k-${e.kind}${seen ? ' on' : ''}${all ? ' full' : ''}${fresh ? ' fresh' : ''}">${ribbon(fresh)}
        <span class="pic${art && seen ? '' : ' emo'}">${seen ? (art ? `<img src="${ART}v6/cine/${art}.webp" alt="">` : `<i>${{crisis: '🌪', problem: '⚠️', opportunity: '✨'}[e.kind]}</i>`) : '<i>?</i>'}</span>
        <span class="txt"><small class="tag">${esc(tag)}</small><b>${seen ? esc(e.name) : '???'}</b>
        ${seen ? `<span class="opts">${e.options.map((t, i) => `<i class="${ch[i] ? 'on' : ''}">${ch[i] ? '☑' : '☐'} ${esc(t.split(/[:·]/)[0].trim())}</i>`).join('')}</span>` : '<small class="muted">아직 못 겪었어요</small>'}</span></li>`;
    }).join('')}</ul>
    <p class="bk-note">선택지를 모두 골라 보면 금색 테두리 — 같은 사건에서 다른 선택을 해 보세요</p>`;
  }
  function bookBadges(c, page) {
    const n = perPage('badges'), list = E.S.badges.slice(page * n, page * n + n);
    return `<ul class="bk-medals" ${gridVars('badges')}>${list.map(b => {
      const k = c.badges[b.id] || 0, fresh = isNew('badge:' + b.id);
      return `<li class="medal ${k > 1 ? 'gold' : k ? 'silver' : 'locked'}${fresh ? ' fresh' : ''}">${ribbon(fresh)}<span class="disc"><i>${k || !b.hidden ? b.emoji : '❔'}</i></span>
        <span class="mt"><b>${k || !b.hidden ? esc(b.name) : '숨은 배지'}</b><small>${k || !b.hidden ? esc(b.text) : `힌트: ${esc(b.hint)}`}</small>${k ? `<small class="cnt">${k}번</small>` : ''}</span></li>`;
    }).join('')}</ul>`;
  }
  // 7.9b 증강체 모음: 한 쪽에 콘셉트 5가지(실버·골드·프리즘), 마지막 쪽은 나라 특성 8장. 어느 판에서든 한 번 고르면 열려요.
  const AUG_PAGES = 3, AUGS = E.S.cards.filter(c => c.concept);
  function bookAugs(c, page) {
    const R79 = E.S.rules79, chip = a => { const on = c.cards[a.id], fresh = isNew('aug:' + a.id); return `<span class="ac ${a.tier}${on ? ' on' : ''}${fresh ? ' fresh' : ''}"${on ? tipA(a.text) : ''}>${fresh ? '<em class="newrib">NEW</em>' : ''}${on ? esc(a.name) : '🔒 ???'}${on > 1 ? `<small>×${on}</small>` : ''}</span>`; };
    if (page >= 2) return `<ul class="bk-augs traits">${AUGS.filter(a => a.only).map(a => `<li><span class="ci">${T.countries.find(x => x.id === a.only).name}</span>${chip(a)}<small>${cardIcon(a.id)} ${esc(E.S.concepts.find(k => k.id === a.concept).name)}로 쳐요</small></li>`).join('')}</ul>
      <p class="bk-note">🧩 나라 특성 카드는 그 나라로 할 때 한 판에 한 번은 꼭 나와요</p>`;
    return `<table class="bk-augs"><thead><tr><th>콘셉트</th>${R79.tiers.map(t => `<th class="${t}">${R79.tierNames[t]}</th>`).join('')}</tr></thead><tbody>${E.S.concepts.slice(page * 5, page * 5 + 5).map(k => `<tr><th><span class="ci">${k.icon}</span>${esc(k.name)}</th>${R79.tiers.map(t => `<td>${AUGS.filter(a => a.concept === k.id && a.tier === t && !a.only).map(chip).join('')}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <p class="bk-note">🧩 2년째부터 해마다 한 장씩 골라요. 같은 콘셉트를 2장·3장 모으면 보너스가 켜져요</p>`;
  }
  function bookLessons(c, page) {
    const n = perPage('lessons'), list = E.S.lessons.slice(page * n, page * n + n);
    return `<ul class="bk-lessons" ${gridVars('lessons')}>${list.map(l => {
      const on = c.lessons[l.id], fresh = isNew('lesson:' + l.id);
      return `<li class="lcard${on ? ' on' : ''}${fresh ? ' fresh' : ''}">${ribbon(fresh)}<span class="li">${on ? l.icon : '🔒'}</span><b>${on ? esc(l.name) : '???'}</b>
        <p>${on ? esc(l.text) : `열리는 때: ${esc(l.how)}`}</p></li>`;
    }).join('')}</ul>
    <p class="bk-note">📘 게임에서 겪은 일이 사회 시간에 배우는 낱말 카드로 열려요</p>`;
  }
  function bookRecords(c) {
    const r = c.records, cn = id => T.countries.find(x => x.id === id)?.name || '–';
    const sold = GOODS.map(g => c.sold[g] || 0), top = sold.indexOf(Math.max(...sold));
    const friend = Object.entries(c.friends).sort((a, b) => b[1] - a[1])[0];
    const cards = [
      ['🎮', '해 본 판', `${c.games}판`, ''], ['🏆', '1등', `${r.wins || 0}번`, r.bestStreak ? `연속 최고 ${r.bestStreak}번` : ''],
      ['⭐', '최고 점수', r.bestScore != null ? `${r.bestScore}점` : '–', r.bestNation ? cn(r.bestNation) : '', r.newBest && c.last],
      ['💰', '가장 많이 번 한 해', r.bestYear ? `+${r.bestYear}억` : '–', r.bestYearNation ? cn(r.bestYearNation) : ''],
      ['🚢', '모두 수출', `${r.exp || 0}상자`, ''], ['📥', '모두 수입', `${r.imp || 0}상자`, ''],
      ['📦', '가장 많이 판 물건', sold[top] ? gname(top) : '–', sold[top] ? `${sold[top]}상자` : ''],
      ['♥', '가장 친한 나라', friend ? cn(friend[0]) : '–', friend ? `단골 ${friend[1]}번` : '']];
    const last = c.last ? `${cn(c.last.nation)} · ${c.last.rank}등 · ${c.last.score}점` : '아직 끝낸 판이 없어요';
    return `<ul class="bk-records">${cards.map(([i, t, v, s, best]) => `<li>${best ? '<em class="newrib">최고!</em>' : ''}<span class="ri">${i}</span><small>${t}</small><b>${v}</b><small>${esc(s)}</small></li>`).join('')}</ul>
      <p class="bk-note">지난 판: ${esc(last)}</p>`;
  }
  function showCodex(tab, page) {
    const c = loadCodex(), st = E.codexStats(c);
    if (c.lastNew.length) { book.fresh = new Set(c.lastNew); c.lastNew = []; saveCodex(c); if (!tab) tab = tabOf([...book.fresh][0]); }   // NEW 리본은 한 번 보여 주고 지운다
    if (tab) { book.tab = tab; book.page = page || 0; book.level[tab] = 0; } else if (page != null) book.page = page;
    const count = {
      nations: [T.countries.filter(n => c.nations[n.id]).length + T.countries.filter(n => c.friends[n.id]).length, T.countries.length * 2],
      goods: [GOODS.reduce((a, g) => a + !!c.goods[g] + !!c.imports[g] + !!c.star3[g], 0), GOODS.length * 3],
      events: [E.S.events.reduce((a, e) => a + Math.max((c.choices[e.id] || []).filter(Boolean).length, c.events[e.id] ? 1 : 0), 0), E.S.events.reduce((a, e) => a + e.options.length, 0)],
      badges: [E.S.badges.filter(b => c.badges[b.id]).length, E.S.badges.length], lessons: [E.S.lessons.filter(l => c.lessons[l.id]).length, E.S.lessons.length], augs: [AUGS.filter(a => c.cards[a.id]).length, AUGS.length]};
    const pages = {events: Math.ceil(E.S.events.length / perPage('events')), badges: Math.ceil(E.S.badges.length / perPage('badges')), lessons: Math.ceil(E.S.lessons.length / perPage('lessons')), augs: AUG_PAGES}[book.tab] || 1;
    book.page = Math.max(0, Math.min(pages - 1, book.page));
    const body = {nations: bookNations, goods: bookGoods, events: bookEvents, badges: bookBadges, lessons: bookLessons, augs: bookAugs, records: bookRecords}[book.tab](c, book.page);
    const fresh = t => [...book.fresh].some(k => tabOf(k) === t);
    modal(`<div class="book">
      <header class="bk-head">${rankMark(st.rank)}<div class="bk-title"><small>📖 선장의 항해 일지 · ${c.games}판</small><b>${esc(st.rank.name)}</b></div>
        <span class="ring" style="--p:${st.percent}"${tipA(`${st.filled}/${st.total}칸 채움`)}><b>${st.percent}%</b><small>채움</small></span>
        <button class="bk-close" data-codex-close aria-label="도감 닫기">닫기 ✕</button></header>
      <nav class="bk-tabs" aria-label="도감 쪽">${BOOK_TABS.map(([id, i, t]) => `<button data-book-tab="${id}" class="${id === book.tab ? 'on' : ''}${fresh(id) ? ' has-new' : ''}" aria-current="${id === book.tab}"><i>${i}</i><span>${t}</span>${count[id] ? `<small>${count[id][0]}/${count[id][1]}</small>` : ''}</button>`).join('')}</nav>
      <section class="bk-page tab-${book.tab}">${body}</section>
      ${pages > 1 ? `<footer class="bk-pager"><button data-book-page="${book.page - 1}" ${book.page ? '' : 'disabled'} aria-label="앞 쪽">◀</button><span>${book.page + 1} / ${pages}</span><button data-book-page="${book.page + 1}" ${book.page < pages - 1 ? '' : 'disabled'} aria-label="다음 쪽">▶</button></footer>` : ''}
    </div>`, 'book-modal');
    if (FIT[book.tab] && (book.level[book.tab] || 0) < FIT[book.tab].length - 1 && bookOverflows()) { book.level[book.tab]++; book.page = 0; showCodex(null, 0); }
  }
  function resolved() { if (!G.pending) { layer.hidden = true; speed = resume; if (!resume) resume = 1; if (!G.over) AU?.scene('sail'); } render(); }

  // ---------- 배 위치(매 프레임) ----------
  function placeShips() {
    if (!G) return;
    const f = fraction();
    shipViews.forEach(v => {
      const {el, n, k} = v, s = n.ships[k];
      let [x, y] = NODES[slot[n.id]] || HOME, good = null;
      if (s && s.state === 'sea' && s.route && slot[s.route.to]) {
        const prog = Math.min(1, (s.t + f) / s.T), u = prog <= .5 ? prog * 2 : 2 - prog * 2;
        [x, y] = along(lane(n.id, s.route.to), u);
        // 우리 배는 부두 받침에서 떠나고 받침으로 돌아온다: 항로의 처음·끝 10%는 받침 자리와 섞는다.
        if (n === P() && u < .1) { const [px, py] = padPos(k, n.ships.length), m = u / .1; x = px + (x - px) * m; y = py + (y - py) * m; }
        good = first(prog <= .5 ? s.route.give : s.route.get);
      } else if (n === P()) [x, y] = padPos(k, n.ships.length);   // 항구의 우리 배는 부두 받침 위에 선다
      else { x += (k - 1) * 3.2; y -= 6; }
      el.hidden = n !== P() && !(s && s.state === 'sea');   // 항구에 선 NPC 배는 섬 카드를 가리지 않게 숨긴다
      el.classList.toggle('lifted', !!drag && drag.moved && n === P() && k === drag.i);   // 들어 올린 말의 자리는 비어 보인다
      el.style.left = x + '%'; el.style.top = y + '%';
      if (v.good !== good) { v.cargo.forEach((el, g) => el.hidden = g !== good); v.good = good; }
    });
  }
  // 실제 항해 날짜의 출항·도착, 월초 정산·순위 오름 소리.
  function tickSound(days) {
    const me = P(), before = me.ships.map(s => [s.state, s.delivery]), rank0 = rankRows().findIndex(r => r.n === me), month0 = G.month;
    if (days == null) E.tick(G); else E.advance(G, days);
    const back = me.ships.some((s, k) => s.delivery && s.delivery !== before[k]?.[1]), out = me.ships.some((s, k) => before[k]?.[0] !== 'sea' && s.state === 'sea');   // 도착 = 새 도착 기록
    if (back) sfx('arrive'); else if (out) sfx('depart');
    if (G.month !== month0 && G.month % 3 === 0 && !G.over) { const rank1 = rankRows().findIndex(r => r.n === me); sfx(rank1 < rank0 ? 'rankup' : 'settle'); }
  }
  // 7.9b 자동 멈춤(⚙️에서 끌 수 있음): 계약이 끝나 배가 쉬게 되면 · 다음 정산 예상이 10점 넘게 떨어지면
  function checkPause(idle0) {
    const me = P(), rest = me.ships.findIndex((s, k) => !s.route && !idle0[k]);
    if (autoPause.idle && rest >= 0 && G.month > 0) { speed = 0; pauseNote = `배 ${rest + 1}이 쉬게 됐어요. 주변 값을 살펴보고 새 계약을 맺거나, 값이 좋아질 때까지 기다려도 돼요.`; return; }
    if (!autoPause.drop || G.pending || G.over) return;
    const f = E.forecast(G).score, k = me.seasons.length;
    if (lastForecast?.k !== k) lastForecast = null;
    if (lastForecast != null && f < lastForecast.f - 10) { speed = 0; pauseNote = `다음 정산 예상이 ${lastForecast.f}점 → ${f}점으로 떨어졌어요. ${E.forecast(G).reasons[0]}`; }
    lastForecast = {f, k};
  }
  function frame(ts) {
    const dt = Math.min(250, ts - (last || ts)); last = ts;
    if (G && !G.over && !G.pending && speed && !dock && !report && !drag) {
      acc += dt * speed;
      let changed = false;
      while (acc >= dayMs() && !G.pending && !G.over && speed) { acc -= dayMs(); const idle0 = P().ships.map(s => !s.route); tickSound(1); changed = true; watchSmall(); checkPause(idle0); }
      if (changed && (G.pending || G.over)) acc = 0;   // 월초 선택 창은 그날부터 멈춰 저장한다.
      if (changed) render();
    }
    placeShips();
    updateClock();
    requestAnimationFrame(frame);
  }

  // ---------- 7.6 게임 툴팁(U7): data-tip을 가진 것에 마우스 250ms · 키보드 포커스 · 터치 길게 누르기 450ms ----------
  const gtip = Object.assign(document.createElement('div'), {id: 'gtip', className: 'gtip', hidden: true});
  gtip.setAttribute('role', 'tooltip'); document.body.append(gtip);
  let gtFor = null, gtTimer = 0, gtXY = null, gtLong = false;
  function gtShow(el) {
    clearTimeout(gtTimer);
    if (!el?.isConnected || drag || !el.dataset.tip) return gtHide();
    gtFor = el;
    if (el.hasAttribute('data-tip-html')) gtip.innerHTML = el.dataset.tip; else gtip.textContent = el.dataset.tip;
    gtip.hidden = false; gtPlace();
  }
  // 요소 바로 위(자리가 없으면 아래)에, 화면 안쪽으로
  function gtPlace() {
    if (!gtFor || gtip.hidden) return;
    const r = gtFor.getBoundingClientRect(), w = gtip.offsetWidth, h = gtip.offsetHeight;
    const left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)), below = r.top - h - 12 < 8;
    gtip.classList.toggle('below', below);
    gtip.style.left = left + 'px'; gtip.style.top = (below ? Math.min(innerHeight - h - 8, r.bottom + 12) : r.top - h - 12) + 'px';
    gtip.style.setProperty('--ax', Math.max(14, Math.min(w - 14, r.left + r.width / 2 - left)) + 'px');
  }
  function gtHide() { clearTimeout(gtTimer); gtFor = null; gtip.hidden = true; }
  // 하루마다 화면을 다시 그려 요소가 바뀌어도, 같은 자리의 새 요소에 다시 붙인다
  function gtRefresh() {
    if (!gtFor) return;
    if (gtFor.isConnected) return gtPlace();
    const el = gtXY && document.elementFromPoint(gtXY[0], gtXY[1])?.closest('[data-tip]');
    if (el) gtShow(el); else gtHide();
  }
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest?.('[data-tip]'); gtXY = [e.clientX, e.clientY];
    if (el === gtFor) return;
    clearTimeout(gtTimer);
    if (!el) return gtHide();
    if (!gtip.hidden) return gtShow(el);
    gtTimer = setTimeout(() => gtShow(el), 250);
  });
  document.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') gtXY = [e.clientX, e.clientY]; }, {passive: true});
  document.addEventListener('pointerout', e => { if (e.pointerType !== 'touch' && !e.relatedTarget?.closest?.('[data-tip]')) gtHide(); });
  document.addEventListener('focusin', e => { const el = e.target.closest?.('[data-tip]'); if (el && el.matches(':focus-visible')) gtShow(el); else if (gtFor && !el) gtHide(); });
  document.addEventListener('focusout', () => { if (gtFor && document.activeElement === gtFor) return; if (gtFor?.matches?.(':focus-visible')) gtHide(); });
  document.addEventListener('pointerdown', e => {
    gtLong = false;
    if (e.pointerType !== 'touch') return gtHide();
    const el = e.target.closest?.('[data-tip]'); clearTimeout(gtTimer); gtHide();
    if (el) { gtXY = [e.clientX, e.clientY]; gtTimer = setTimeout(() => { gtShow(el); gtLong = true; }, 450); }
  }, true);
  addEventListener('pointerup', e => { if (e.pointerType !== 'touch') return; clearTimeout(gtTimer); if (!gtip.hidden) gtTimer = setTimeout(gtHide, 1800); }, true);
  addEventListener('pointercancel', () => clearTimeout(gtTimer), true);
  document.addEventListener('click', e => { if (gtLong) { gtLong = false; e.preventDefault(); e.stopPropagation(); } }, true);   // 길게 눌러 본 것은 누르기로 치지 않는다
  addEventListener('scroll', gtHide, true); addEventListener('resize', gtHide);

  // ---------- 조작 ----------
  function toast(t) { G && G.news.push({month: G.month, text: t, kind: 'tip'}); render(); }
  app.addEventListener('click', e => {
    const info = e.target.closest('[data-info]');
    if (info) { const id = info.dataset.info, same = tip?.kind === 'isle' && tip.id === id && tip.pinned; tip = same ? null : {kind: 'isle', id, pinned: true}; render(); $(`[data-info="${id}"]`)?.focus(); return; }
    if (sheet && e.target.classList.contains('sheetveil')) return closeSheet();   // 창 바깥(어두운 곳)을 누르면 닫기
    if (e.target.closest('[data-home-info]') && !drag?.moved) return openSheet('home');
    const b = e.target.closest('button, [data-ship]');
    if (tip && !e.target.closest('.piece, #tip, [data-info], [data-nation-slot]')) { tip = null; render(); }   // 말·섬 밖을 누르면 툴팁을 닫는다
    if (!b) return;
    if (b.tagName === 'BUTTON') AU?.click();
    if (b.hasAttribute('data-nation-slot')) { tip = tip?.kind === 'nation' ? null : {kind: 'nation', pinned: true}; render(); return $('.nation-slot')?.focus(); }
    if (b.dataset.start) return start(b.dataset.start);
    if (b.dataset.codex != null) { sfx('page'); return showCodex(); }
    if(b.dataset.smallAction!=null){E.takeSmallAction(G,+b.dataset.smallAction);return render();}
    if (b.dataset.good != null) { focusGood = focusGood === +b.dataset.good ? null : +b.dataset.good; render(); return $(`.stock[data-good="${b.dataset.good}"]`)?.focus(); }
    if (b.hasAttribute('data-clear-good')) { focusGood = null; return render(); }
    if (b.dataset.report != null) { report = {i: +b.dataset.report, beforeSpeed: speed}; speed = 0; return render(); }
    if (b.dataset.speed != null) { speed = +b.dataset.speed; if (speed) { resume = speed; pauseNote = null; } return render(); }
    if (b.hasAttribute('data-settings')) return openSheet('set');
    if (b.hasAttribute('data-sheet-close')) return closeSheet();
    if (b.dataset.setk) { window.TradeTitle?.setSetting(b.dataset.setk, b.dataset.setv); render(); return $(`[data-setk="${b.dataset.setk}"][data-setv="${b.dataset.setv}"]`)?.focus(); }
    if (b.hasAttribute('data-exit-title')) { sheet = null; dock = null; tip = null; return home(); }   // title()이 먼저 저장한다
    if (b.dataset.sheetTab) { sheet.tab = b.dataset.sheetTab; sheet.page = 0; sheet.per = 6; sheet.fit = 0; render(); return $(`[data-sheet-tab="${sheet.tab}"]`)?.focus(); }
    if (b.dataset.fxPage) { sheet.page = Math.max(0, sheet.page + +b.dataset.fxPage); render(); return $(`[data-fx-page="${b.dataset.fxPage}"]:not(:disabled)`)?.focus() || $('.pager button:not(:disabled)')?.focus(); }
    if (b.hasAttribute('data-home')) return home();
    if (b.dataset.break != null) { sfx('cancel'); E.breakContract(G, +b.dataset.break); return render(); }
    if (b.dataset.step) {
      const a = dock[b.dataset.step], g = +b.dataset.g, scroll = $('.dockbody').scrollTop;
      a[g] = Math.max(0, a[g] + +b.dataset.d); render(); $('.dockbody').scrollTop = scroll;
      const control = $(`[data-step="${b.dataset.step}"][data-g="${g}"][data-d="${b.dataset.d}"]`);
      (control.disabled ? $(`[data-step="${b.dataset.step}"][data-g="${g}"]:not(:disabled)`) : control)?.focus({preventScroll: true});
      return;
    }
    if (b.hasAttribute('data-more')) { dock.more = !dock.more; dock.saw = true; render(); return $('[data-more]')?.focus(); }
    // 8.2 추천대로: 학생이 −/＋로 바꾼 짐을 처음 추천 짐으로 되돌린다
    if (b.hasAttribute('data-reco')) { const fit = E.plan(G, P(), P().ships[dock.i], E.nation(G, dock.to)); dock.give = [...fit.give]; dock.get = [...fit.get]; dock.reco = true; render(); return $('[data-reco]')?.focus(); }
    if (b.hasAttribute('data-sign')) { const s = P().ships[dock.i], was = s.state; if (E.setRoute(G, dock.i, {to: dock.to, give: dock.give, get: dock.get})) { sfx('contract'); if (was === 'port' && s.state === 'sea') sfx('depart'); focusGood = null; closeDock(); } else sfx('error'); return; }
    if (b.hasAttribute('data-close')) { sfx('cancel'); return closeDock(); }
    if (b.dataset.drop) {
      const i = sel ?? P().ships.findIndex(s => !s.route);
      return openDock(i < 0 ? 0 : i, b.dataset.drop);
    }
    if (b.dataset.ship != null && !drag?.moved) {
      const i = +b.dataset.ship, same = tip?.kind === 'ship' && tip.i === i && tip.pinned;
      sel = same ? null : i; tip = same ? null : {kind: 'ship', i, pinned: true}; render();
    }
  });
  app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.ship != null) e.target.click(); });
  document.addEventListener('click', e => { if (tip && G && !e.composedPath().some(el => el === app || el === layer || el.id === 'coach')) { tip = null; render(); } });   // 7.6 지도 밖(소식 줄 등)을 눌러도 툴팁을 닫는다
  const showTip = i => { clearTimeout(tipTimer); if (tip && (tip.kind === 'ship' && tip.i === i || tip.pinned)) return; tip = {kind: 'ship', i, pinned: false}; render(); };
  const showIsle = id => { clearTimeout(tipTimer); if (tip && (tip.kind === 'isle' && tip.id === id || tip.pinned)) return; tip = {kind: 'isle', id, pinned: false}; render(); };
  const hideTipSoon = () => { clearTimeout(tipTimer); tipTimer = setTimeout(() => { if (tip && !tip.pinned) { tip = null; render(); } }, 250); };
  // 마우스를 올린 툴팁은 말에서 벗어나면 사라진다(툴팁 위로 옮겨도). 누른(고정) 툴팁만 그 위에서 깨기 등을 누를 수 있다.
  app.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch' || drag) return;
    const piece = e.target.closest('.piece'), isle = e.target.closest('.isle'), over = e.target.closest('#tip');
    if (piece) showTip(+piece.dataset.ship); else if (isle) showIsle(isle.dataset.drop); else if (over && tip?.pinned) clearTimeout(tipTimer);
  });
  app.addEventListener('pointerout', e => {
    if (e.pointerType === 'touch') return;
    const from = e.target.closest('.piece, .isle, #tip'), to = e.relatedTarget?.closest?.('.piece, .isle, #tip');
    if (from && (!to || (to.id === 'tip' && !tip?.pinned))) hideTipSoon();
  });
  app.addEventListener('focusin', e => { const piece = e.target.closest?.('.piece'), isle = e.target.closest?.('.isle'); if (piece) showTip(+piece.dataset.ship); else if (isle) showIsle(isle.dataset.drop); });
  app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.info) { e.preventDefault(); e.stopPropagation(); e.target.click(); } }, true);
  layer.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    AU?.click();
    if (b.hasAttribute('data-close-report')) { const i = report.i; speed = report.beforeSpeed; report = null; render(); $(`[data-report="${i}"]`)?.focus(); return; }
    if (b.dataset.ok === 'again') return title();
    if (b.dataset.ok === 'same') return start(G.nations[0].id);
    if (b.dataset.endpage != null) { sfx('page'); endPage = +b.dataset.endpage; return showEnd(); }
    if (b.dataset.codex != null) { sfx('page'); return showCodex(); }
    if (b.dataset.codexClose != null) { book.fresh = new Set(); if (G?.over) return showEnd(); layer.hidden = true; return; }
    if (b.dataset.bookTab != null) { sfx('page'); return showCodex(b.dataset.bookTab, 0); }
    if (b.dataset.bookPage != null) { sfx('page'); return showCodex(null, +b.dataset.bookPage); }
    if (b.dataset.ok === 'open') { E.choose(G, null); layer.hidden = true; speed = 0; resume = 1; return render(); }
    if (b.dataset.ok === 'year') { E.choose(G, null); return resolved(); }
    if (b.dataset.optEvent != null) { E.choose(G, +b.dataset.optEvent); return resolved(); }
    if(b.hasAttribute('data-reroll')){E.rerollMeeting(G);return render();}
    if(b.dataset.smallAction!=null){E.takeSmallAction(G,+b.dataset.smallAction);return render();}
    if (b.dataset.card != null) { if (E.choose(G, b.dataset.card || null) && b.dataset.card) sfx('buy'); return resolved(); }
  });
  // 끌어다 놓기: 배 카드를 섬에 놓으면 부두 창이 열린다(6px 넘게 움직여야 끌기)
  app.addEventListener('dragstart', e => e.preventDefault());
  app.addEventListener('pointerdown', e => {
    const card = e.target.closest('[data-drag]');
    if (!card || e.target.closest('button')) return;
    e.preventDefault();
    drag = {i: +card.dataset.ship, x: e.clientX, y: e.clientY, moved: false, ghost: null};
  });
  // 들어 올린 말(ghost): 배 그림 + 번호가 들려 커지고 그림자가 깊어진다. 7.6 섬 위에 오면 네모 틀 없이 섬 그림만 빛난다.
  const endDrag = () => { drag?.over?.classList.remove('over'); app.classList.remove('dragging'); const d = drag; drag = null; placeShips(); return d; };
  addEventListener('pointercancel', () => { const d = endDrag(); d?.ghost?.remove(); });
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
      drag.moved = true;
      drag.ghost = Object.assign(document.createElement('span'), {className: 'ghost', style: `${tint(drag.i)}`});
      drag.ghost.innerHTML = `<img src="${shipImg(drag.i)}" alt="" draggable="false"><b>${drag.i + 1}</b>`;
      document.body.append(drag.ghost); app.classList.add('dragging'); sfx('pickup');
      if (tip) { tip = null; render(); } placeShips();
    }
    if (!drag.ghost) return;
    drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]') || null;
    if (over !== drag.over) { drag.over?.classList.remove('over'); over?.classList.add('over'); drag.over = over; if (over) sfx('hover'); }
  });
  // 놓기: 섬이면 섬 그림 가운데로 '탁' 내려앉은 뒤 계약서가 열린다. 빈 바다면 제자리로 되돌아간다.
  function settle(ghost, [x, y], done) {
    if (reduce) { ghost.remove(); return done(); }
    const a = ghost.animate([{left: ghost.style.left, top: ghost.style.top, scale: 1.2}, {left: x + 'px', top: y + 'px', scale: .95, offset: .8}, {left: x + 'px', top: y + 'px', scale: 1}], {duration: 220, easing: 'ease-out', fill: 'forwards'});
    a.onfinish = () => { ghost.remove(); done(); };
  }
  addEventListener('pointerup', e => {
    if (!drag) return;
    const drop = drag.moved ? document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]') : null;
    const spot = (drop?.querySelector('.tile img') || drop?.querySelector('.plank'))?.getBoundingClientRect();
    const d = endDrag();
    setTimeout(() => { /* 같은 클릭이 카드 누르기로 이어지지 않게 한 틱 뒤에 끝낸다 */ });
    if (!d.moved) return;
    if (drop) {
      sfx('click');
      settle(d.ghost, spot ? [spot.x + spot.width / 2, spot.y + spot.height / 2] : [e.clientX, e.clientY], () => openDock(d.i, drop.dataset.drop));
    } else {
      sfx('cancel');
      const home = document.querySelector(`.ship.mine[data-k="${d.i}"]`)?.getBoundingClientRect();
      settle(d.ghost, home ? [home.x + home.width / 2, home.y + home.height / 2] : [e.clientX, e.clientY], () => {});
    }
  });
  addEventListener('keydown', e => {
    if (!G || e.target.closest?.('input')) return;
    if (e.key === ' ' && layer.hidden && !dock && !sheet && !e.target.closest?.('button,[role="button"]')) { e.preventDefault(); speed = speed ? 0 : resume; if (speed) pauseNote = null; render(); }
    if (e.key === 'Escape' && sheet) { e.preventDefault(); return closeSheet(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('[data-home-info]')) { e.preventDefault(); return openSheet('home'); }
    if (e.key === 'Escape' && dock) { e.preventDefault(); sfx('cancel'); closeDock(); }
    if (e.key === 'Escape' && tip) { tip = null; render(); }
    if (e.key === 'Escape' && report) $('[data-close-report]').click();
    const dialog = sheet ? $('.sheet') : dock ? $('.dockpanel') : !layer.hidden ? layer.querySelector('.modal') : null;
    if (e.key === 'Tab' && dialog) {
      const buttons = [...dialog.querySelectorAll('button:not(:disabled)')], at = buttons.indexOf(document.activeElement);
      if (buttons.length && (e.shiftKey && at <= 0 || !e.shiftKey && (at === buttons.length - 1 || at === -1))) {
        e.preventDefault(); buttons[e.shiftKey ? buttons.length - 1 : 0].focus();
      }
    }
  });

  // 7.4 창(사건·회의·결과·도감)이나 도우미 말풍선이 떠 있으면 배경음악을 줄인다. 막힌 단추를 누르면 '안 돼요' 소리
  new MutationObserver(() => { AU?.duck('layer', !layer.hidden); AU?.duck('coach', !coachEl.hidden); }).observe(layer, {attributes: true, attributeFilter: ['hidden']});
  new MutationObserver(() => AU?.duck('coach', !coachEl.hidden)).observe(coachEl, {attributes: true, attributeFilter: ['hidden']});
  document.addEventListener('pointerdown', e => { if (G && e.target.closest?.('#app button:disabled, #layer button:disabled')) sfx('error'); }, true);
  // ---------- 7.1 시작 화면(js/title6.js)·설정 ----------
  function applySettings(s) {
    sound = !!s.sound; music = s.music !== 'off'; AU?.set({sfx: sound, music, musicLevel: s.musicVol});
    const f = fraction();
    pace = {slow: .75, normal: 1, fast: 1.35}[s.pace] || 1;
    acc = f * dayMs();
    reduce = s.motion === 'less'; autoPause = {idle: s.pauseIdle !== 'off', drop: s.pauseDrop !== 'off'};
    document.documentElement.classList.toggle('calm', s.motion === 'less');
    document.documentElement.classList.toggle('huge-text', s.text === 'huge');
    if (G) render();
  }
  // 처음 화면(보드판 장면·메뉴)으로: 뒤에는 나라 고르기를 깔아 두고, '게임 시작'이면 카메라가 내려가며 드러난다
  function home() { title(); window.TradeTitle?.show(); }
  const TT = window.TradeTitle, QS = new URLSearchParams(location.search);
  TT?.init({play: () => title(), resume: continueGame, saveSummary, codex: () => showCodex(), apply: applySettings});
  applySettings(TT ? TT.settings() : {});
  title();
  if (TT && (!QS.has('debug') || QS.has('title'))) TT.show();   // ?debug는 검사용으로 바로 나라 고르기(?title을 붙이면 시작 화면)
  requestAnimationFrame(frame);
  if (new URLSearchParams(location.search).has('debug')) window.TK6 = {get G() { return G; }, E, render, start, audio: AU, tick: () => { tickSound(); render(); }};
})();
