/* 무역왕 6.0 규칙 엔진: 달 단위로 흐르는 실시간 무역. DOM 없음(node에서 봇·테스트).
   한 번 tick = 한 달. 계절(3달)마다 생산·소비·점수·세계 값, 해(12달)마다 산업 쇠퇴·연말.
   학생 선택이 필요하면 G.pending에 걸고 멈춘다(choose로 풀기). */
(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./data.js') : root.TRADE, node ? require('./data6.js') : root.TRADE6);
  if (node) module.exports = api; else root.TradeEngine6 = api;
})(globalThis, function (T, S) {
  'use strict';
  const X = S.economy, GOODS = [0, 1, 2, 3, 4], FOREVER = 1e9;
  const sum = a => a.reduce((s, v) => s + v, 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function random(G) { G.rng = (Math.imul(G.rng, 1664525) + 1013904223) >>> 0; return G.rng / 4294967296; }
  function shuffle(G, a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random(G) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const pick = (G, a) => a[Math.floor(random(G) * a.length)];
  const step = g => Math.round(S.goods[g].price * .1);
  const event = id => S.events.find(e => e.id === id);
  const freshYear = () => ({prod: [0, 0, 0, 0, 0], imp: GOODS.map(() => ({})), exp: [0, 0, 0, 0, 0]});

  // ---------- 나라 ----------
  function makeNation(id, npc) {
    const c = T.countries.find(c => c.id === id), e = S.countries[id];
    return {id, npc, name: c.name, pop: c.workers, quality: [...c.quality], levels: [...e.levels], main: e.main, bonus: e.bonus,
      money: X.startMoney, box: GOODS.map(() => [0, 0, 0, 0]), protect: [0, 0, 0, 0, 0], fta: [], mods: [], ships: [],
      warehouse: false, bigShip: false, expo: false, closed: [false, false, false, false, false], detour: 0, year: freshYear(), declineRun: [0, 0, 0, 0, 0],
      seasons: [], years: [], score: 0, strategy: null};
  }
  const makeWorld = () => ({id: 'world', world: true, npc: true, name: '먼 바다 상인', quality: [2, 2, 2, 2, 2], money: FOREVER, fta: [], mods: [], bonus: null, bought: {}});
  const player = G => G.nations[0];
  const nation = (G, id) => id === 'world' ? G.world : G.nations.find(n => n.id === id);
  const rel = (G, a, b) => G.rel[a.id ?? a]?.[b.id ?? b] ?? 0;
  function addRel(G, a, b, d) {
    const x = a.id ?? a, y = b.id ?? b;
    if (x === 'world' || y === 'world' || x === y) return;
    if (d < 0 && nation(G, x).fta.includes(y)) return;
    G.rel[x][y] = G.rel[y][x] = clamp(G.rel[x][y] + d, 0, X.relMax);
  }
  const active = (m, G) => m.until > G.month && (m.from ?? 0) <= G.month;
  const modSum = (G, n, kind, g) => sum(n.mods.filter(m => m.kind === kind && m.g === g && active(m, G)).map(m => m.v));
  const isProtected = (G, n, g) => !n.world && n.protect[g] > G.month;

  const baseNeed = (pop, g) => Math.max(1, Math.round(S.goods[g].need * (3 + pop / 2)));
  function needs(G, n) { return S.goods.map((x, g) => Math.max(1, baseNeed(n.pop, g) + modSum(G, n, 'need', g))); }
  const levelOf = (G, n, g) => Math.max(0, n.levels[g] + modSum(G, n, 'level', g));
  const produces = (G, n, g) => levelOf(G, n, g) * S.goods[g].load;
  const count = (n, g) => n.world ? 999 : sum(n.box[g]);
  function add(n, g, qty, q) { if (!n.world && qty > 0) n.box[g][clamp(q, 1, 3)] += qty; }
  function take(n, g, qty, best = false) {
    let left = qty, qsum = 0;
    for (const q of best ? [3, 2, 1] : [1, 2, 3]) { const t = Math.min(left, n.box[g][q]); n.box[g][q] -= t; left -= t; qsum += t * q; }
    return {qty: qty - left, qsum};
  }
  const cap = (G, n, g) => needs(G, n)[g] * (n.warehouse ? X.warehouseSeasons : X.storeSeasons) + produces(G, n, g);
  // 구조적으로 남는 물건(팔아요) / 모자란 물건(필요해요)
  const sells = (G, n, g) => n.world || produces(G, n, g) > needs(G, n)[g];
  const buys = (G, n, g) => n.world || needs(G, n)[g] > produces(G, n, g);
  // 팔 수 있는 양: 이번 계절 생산으로 못 채우는 몫만 남겨 둔다.
  const exportable = (G, n, g) => n.world ? 999 : Math.max(0, count(n, g) - Math.max(0, needs(G, n)[g] - produces(G, n, g)));
  function room(G, buyer, seller, g) {
    if (buyer.world) return Math.max(0, X.worldLimit - (buyer.bought[seller.id]?.[g] || 0));
    return Math.max(0, cap(G, buyer, g) - count(buyer, g));
  }

  // ---------- 값 ----------
  function worldPrice(G, g) {
    const mult = G.mods.filter(m => (m.g === g || m.g === -1) && active(m, G)).reduce((p, m) => p * m.mult, 1);
    return Math.max(1, Math.round(G.base[g] * mult));
  }
  // seller가 buyer에게 g 한 상자를 파는 계약값
  function price(G, seller, buyer, g) {
    let p = worldPrice(G, g);
    if (seller.world) return Math.round(p * X.worldSell);
    if (buyer.world) return Math.max(1, Math.round(p * X.worldBuy));
    const s = step(g), r = rel(G, seller, buyer);
    p += s * (seller.quality[g] - 2) + (seller.expo && g === seller.main ? s : 0);
    if (isProtected(G, buyer, g) && !buyer.fta.includes(seller.id)) p += 2 * s;
    if (r >= 3) p -= s * (seller.bonus === 'discount' ? 2 : 1);
    if (modSum(G, buyer, 'exchange', -1)) p = p * 1.5;
    if (modSum(G, seller, 'exchange', -1)) p = p * 1.2;
    if (modSum(G, seller, 'retaliated', -1)) p = p * .9;
    return Math.max(1, Math.round(p));
  }
  function updatePrices(G) {
    G.trend = GOODS.map(g => {
      const have = sum(G.nations.map(n => count(n, g))), need = sum(G.nations.map(n => needs(G, n)[g]));
      G.drift[g] = clamp(G.drift[g] + (random(G) - .5) * X.drift, -1, 1);
      const f = clamp((X.priceTarget ?? 1) - have / need + G.drift[g], -1, 1.5), old = G.base[g];
      G.base[g] = Math.max(1, Math.round(S.goods[g].price * (1 + S.goods[g].vol * f)));
      return Math.sign(G.base[g] - old);
    });
  }

  // ---------- 배와 계약 ----------
  // 항로 = {to, give:[물건별 상자], get:[물건별 상자]}. 배 한 척은 가는 길·오는 길 각각 slots칸, 1칸 = 1상자.
  const none = () => [0, 0, 0, 0, 0];
  const boxes = (v, k) => v == null ? none() : Array.isArray(v) ? GOODS.map(g => Math.max(0, Math.floor(v[g] || 0))) : GOODS.map(g => g === v ? k : 0);
  // 물건 하나만 주면(옛 방식) 그 물건으로 칸을 다 채운다.
  function norm(G, n, r) { const o = r && nation(G, r.to), k = slotsOf(G, n, o); return r && {to: r.to, give: boxes(r.give, k), get: boxes(r.get, k)}; }
  const firstGood = a => a.findIndex(v => v > 0);
  function tripTime(G, n, to) {
    if (to === 'world') return X.worldTrip;
    const o = nation(G, to), base = n === player(G) ? G.dist[to] : o === player(G) ? G.dist[n.id] : 2 + (G.nations.indexOf(n) + G.nations.indexOf(o)) % 2;
    return Math.max(1, base + (n.npc ? X.npcTripExtra : 0) - (rel(G, n, o) >= 3 && (o.bonus === 'fast' || n.bonus === 'fast') ? 1 : 0));
  }
  const slotsOf = (G, n, o) => X.shipSlots + (n.bigShip ? X.bigShipSlots : 0) + (o && o.bonus === 'bigBuyer' && rel(G, n, o) >= 3 ? 1 : 0);
  function allowed(G, n, r) {
    const o = r && nation(G, r.to);
    if (!o || o === n) return false;
    const {give, get} = norm(G, n, r), k = slotsOf(G, n, o);
    if (!sum(give) && !sum(get) || sum(give) > k || sum(get) > k) return false;
    return GOODS.every(g => !(give[g] && get[g]) && (!give[g] || sells(G, n, g) && buys(G, o, g)) && (!get[g] || sells(G, o, g)));
  }
  function sign(G, n, ship, r) {
    const o = nation(G, r.to), {give, get} = norm(G, n, r);
    ship.route = {to: r.to, give, get, gp: GOODS.map(g => give[g] ? price(G, n, o, g) : 0), bp: GOODS.map(g => get[g] ? price(G, o, n, g) : 0),
      trips: X.contractTrips, done: 0, signed: G.month + random(G) * .01, traded: 0, stake: 0};
    const g = firstGood(get) >= 0 ? firstGood(get) : firstGood(give);
    if (n !== player(G) && !o.world && random(G) < .5) news(G, `${n.name}, ${o.name}와 ${T.goods[g].name} 계약!`, 'npc');
  }
  function endContract(G, n, ship, broken) {
    const r = ship.route, o = nation(G, r.to);
    if (broken) { addRel(G, n, o, -1); if (n === player(G)) G.stats.breaks++; }
    else if (r.traded > 0 && !o.world) addRel(G, n, o, 1);
    if (n === player(G)) G.contracts.push({stake: r.stake, broken, done: r.done});
    const next = ship.next;
    ship.route = null; ship.next = null; ship.breaking = false;
    if (next && allowed(G, n, next)) sign(G, n, ship, next);
    else if (n.npc) npcRoute(G, n, ship);                         // NPC는 계약이 끝날 때마다 시장을 보고 다시 고른다
    else if (!broken && allowed(G, n, r)) sign(G, n, ship, r);   // 학생은 예약이 없으면 같은 나라와 새 값으로 자동 갱신
    else if (n === player(G)) news(G, `배 ${n.ships.indexOf(ship) + 1}이 쉬고 있어요. 새 항로를 정해 주세요.`, 'warn');
  }
  function sellable(G, o, buyer, g) {
    const base = exportable(G, o, g), cut = G.cut;
    if (o.world) return cut && cut.until > G.month && cut.good === g ? 0 : 999;
    if (!cut || cut.until <= G.month || cut.source !== o.id || cut.good !== g) return base;
    // 분쟁 중에는 ♥3 나라와 '돌아가는 길'을 고른 나라만 절반을 받는다. crisisKeep 혜택이면 ♥3에 다 받는다.
    if (rel(G, buyer, o) >= 3 && o.bonus === 'crisisKeep') return base;
    return rel(G, buyer, o) >= 3 || buyer.detour > G.month ? Math.floor(base / 2) : 0;
  }
  function depart(G, n, ship) {
    const r = ship.route, o = nation(G, r.to);
    const load = GOODS.map(g => Math.min(r.give[g], exportable(G, n, g)));
    // 수출을 약속했는데 한 상자도 못 실으면 기다린다(두 번 놓치면 ♥−1). 조금이라도 있으면 실을 만큼 싣고 떠난다.
    if (sum(r.give) && !sum(load)) {
      ship.waited++;
      if (ship.waited === X.missLimit) { addRel(G, n, o, -1); if (n === player(G)) { G.stats.misses++; news(G, `${T.goods[firstGood(r.give)].name}이 모자라 배가 두 번 못 떠났어요. ${o.name}이 서운해해요.`, 'warn'); } }
      return;
    }
    ship.cargo = {give: GOODS.map(g => take(n, g, load[g]).qty), get: none(), q: [2, 2, 2, 2, 2]};
    ship.waited = 0; ship.state = 'sea'; ship.t = 0; ship.T = tripTime(G, n, r.to); ship.arrive = Math.ceil(ship.T / 2);
  }
  function trade(G, n, ship) {
    const r = ship.route, o = nation(G, r.to), c = ship.cargo;
    for (const g of GOODS) if (c.give[g]) {
      const qty = Math.min(c.give[g], room(G, o, n, g), o.world ? 999 : Math.floor(o.money / r.gp[g]));
      o.money -= qty * r.gp[g]; n.money += qty * r.gp[g]; add(o, g, qty, n.quality[g]); c.give[g] -= qty; n.year.exp[g] += qty;
      if (o.world) (o.bought[n.id] ??= none())[g] += qty;
      r.traded += qty; r.stake += Math.abs(r.gp[g] - price(G, n, o, g)) * qty;
    }
    for (const g of GOODS) if (r.get[g]) {
      const qty = Math.max(0, Math.min(r.get[g], sellable(G, o, n, g), Math.floor(n.money / r.bp[g])));
      if (!o.world) take(o, g, qty);
      o.money += qty * r.bp[g]; n.money -= qty * r.bp[g]; c.get[g] = qty; c.q[g] = o.quality[g];
      r.traded += qty; r.stake += Math.abs(r.bp[g] - price(G, o, n, g)) * qty;
    }
  }
  function comeHome(G, n, ship) {
    const r = ship.route, c = ship.cargo;
    for (const g of GOODS) {
      add(n, g, c.give[g], n.quality[g]);   // 못 판 짐은 다시 창고로
      if (c.get[g]) { add(n, g, c.get[g], c.q[g]); n.year.imp[g][r.to] = (n.year.imp[g][r.to] || 0) + c.get[g]; }
    }
    ship.state = 'port'; ship.cargo = null; r.done++;
    if (ship.breaking) endContract(G, n, ship, true);
    else if (r.done >= r.trips) endContract(G, n, ship, false);
  }
  function moveShips(G) {
    const arrivals = [], homes = [];
    for (const n of shuffle(G, G.nations)) for (const s of n.ships) if (s.state === 'sea') { s.t++; if (s.t === s.arrive) arrivals.push([n, s]); if (s.t === s.T) homes.push([n, s]); }
    // 같은 달에 도착하면 ♥3이 먼저, 그다음 먼저 계약한 배가 먼저 산다.
    arrivals.sort((a, b) => (rel(G, b[0], b[1].route.to) >= 3) - (rel(G, a[0], a[1].route.to) >= 3) || a[1].route.signed - b[1].route.signed);
    for (const [n, s] of arrivals) trade(G, n, s);
    for (const [n, s] of homes) comeHome(G, n, s);
    for (const n of G.nations) for (const s of n.ships) {
      if (n.npc && s.state === 'port' && !s.route) npcRoute(G, n, s);
      if (s.state === 'port' && s.route && s.breaking) endContract(G, n, s, true);
      if (s.state === 'port' && s.route) depart(G, n, s);
    }
  }
  const newShip = () => ({state: 'port', route: null, next: null, breaking: false, waited: 0, t: 0, T: 0, arrive: 0, cargo: null});

  // ---------- 계절·해 ----------
  function season(G) {
    for (const n of G.nations) {
      const need = needs(G, n);
      let slots = 0, qual = 0;
      for (const g of GOODS) {
        const made = produces(G, n, g); add(n, g, made, n.quality[g]); n.year.prod[g] += made;
        const got = take(n, g, need[g], true);
        slots += X.slotPoints * Math.min(1, got.qty / need[g]);
        if (got.qty >= need[g]) qual += X.qualityPoints[Math.round(got.qsum / got.qty)];
      }
      const unrest = X.unrest * GOODS.filter(g => isProtected(G, n, g)).length, extra = modSum(G, n, 'score', -1), crisis = crisisDamage(G, n);
      const score = clamp(Math.round(slots + qual - unrest + extra - crisis), 0, 100);
      n.seasons.push(score); n.last = {slots: Math.round(slots), qual, unrest, extra, crisis, score};
      for (const g of GOODS) { const over = count(n, g) - cap(G, n, g); if (over > 0) take(n, g, over); }
      n.money += n.pop * X.taxPerPop;
    }
    updatePrices(G);
  }
  // 위기 피해: 위기가 덮친 물건을 수입에 기댄 비율만큼 깎는다. 지키기·비축 창고·돌아가는 길은 각각 절반으로 줄인다.
  function importShare(n, g) {
    const imp = sum(Object.values(n.year.imp[g])) + (n.lastYear ? sum(Object.values(n.lastYear.imp[g])) : 0);
    const prod = n.year.prod[g] + (n.lastYear ? n.lastYear.prod[g] : 0);
    return imp + prod ? imp / (imp + prod) : 0;
  }
  function crisisDamage(G, n) {
    let d = 0;
    for (const c of G.crises) if (c.until > G.month && (!c.only || c.only === n.id)) for (const g of c.goods) {
      let k = X.crisisPoints * c.w * importShare(n, g);
      if (isProtected(G, n, g)) k /= 2;
      if (n.warehouse) k /= 2;
      if (c.cut && n.detour > G.month) k /= 2;
      d += k;
    }
    return Math.round(d);
  }
  function yearEnd(G) {
    const y = Math.floor(G.month / 12) + 1;
    for (const n of G.nations) {
      n.years.push(Math.round(sum(n.seasons.slice(-4)) / 4));
      for (const g of GOODS) {
        const imp = sum(Object.values(n.year.imp[g]));
        if (imp > n.year.prod[g] && !isProtected(G, n, g) && n.levels[g] > 0) {
          if (++n.declineRun[g] >= X.declineYears) {
            n.levels[g]--; n.declineRun[g] = 0; if (!n.levels[g]) n.closed[g] = true;
            if (n === player(G)) { G.stats.declines++; news(G, `값싼 수입품에 우리 ${T.goods[g].name} 공장이 문을 닫았어요.`, 'warn'); }
          }
        } else n.declineRun[g] = 0;
      }
      n.lastYear = n.year; n.year = freshYear();
    }
    G.world.bought = {};
    if (y === 5) return finish(G);
    ask(G, {type: 'yearEnd', year: y});
  }
  function finish(G) {
    G.over = true;
    for (const n of G.nations) n.score = Math.round(sum(n.years) / n.years.length);
  }
  const ranking = G => [...G.nations].sort((a, b) => b.score - a.score || (b === player(G)) - (a === player(G)));

  // ---------- 멈춤(학생 선택) ----------
  // pauses는 멈춤 창 수, stops는 실제로 시간이 멈춘 횟수(연말 카드 바로 뒤 회의는 한 번으로 센다)
  function ask(G, p) { if (!G.queue.length) G.stats.stops++; G.queue.push(p); G.stats.pauses++; G.pending = G.queue[0]; }
  function news(G, text, kind = 'info') { G.news.push({month: G.month, text, kind}); if (G.news.length > 40) G.news.shift(); }
  function choose(G, value, target) {
    const p = G.pending;
    if (!p) return false;
    if (p.type === 'event') applyEvent(G, player(G), p, value);
    if (p.type === 'meeting' && value) {
      if (!p.cards.includes(value) || !applyCard(G, player(G), value, target)) return false;
      p.cards = p.cards.filter(c => c !== value); p.bought = (p.bought || 0) + 1;
      if (p.cards.length) return true;   // 남은 카드를 더 살 수 있다. null로 회의를 마친다.
    }
    G.queue.shift(); G.pending = G.queue[0] || null;
    return true;
  }
  function startMonth(G) {
    const m = G.month, P = player(G);
    if (m > 0 && m % 12 === 0) {
      while (P.ships.length < shipsAt(G, m)) { P.ships.push(newShip()); news(G, '새 배가 들어왔어요!', 'big'); }
      for (const n of G.nations.slice(1)) npcCard(G, n);
      ask(G, {type: 'meeting', cards: cardsFor(G, P)});
    }
    for (const e of G.plan) {
      const ev = event(e.id);
      if (ev.warn && m === e.month - ev.warn) warn(G, e);
      if (m === e.month) startEvent(G, e);
    }
  }
  function tick(G) {
    if (G.pending || G.over) return false;
    moveShips(G);
    if (G.month % 3 === 2) season(G);
    if (G.month % 12 === 11) { yearEnd(G); if (G.over) return true; }
    G.month++;
    startMonth(G);
    return true;
  }

  // ---------- 사건 ----------
  function planEvents(G) {
    const pool = id => S.events.filter(e => e.id === id)[0];
    const crises = shuffle(G, S.events.filter(e => e.crisis)), calm = shuffle(G, S.events.filter(e => !e.crisis && e.minYear > 1 && e.id !== 'fta'));
    const cy = 2 + Math.floor(random(G) * 3), plan = [];
    const month = y => (y - 1) * 12 + 4 + Math.floor(random(G) * 6);
    plan.push({id: pick(G, S.events.filter(e => e.minYear === 1)).id, month: 2 + 3 + Math.floor(random(G) * 4)});
    for (let y = 2; y <= 4; y++) {
      if (y === cy) plan.push({id: crises.find(e => e.minYear <= y).id, month: month(y)});
      else plan.push({id: (y === 4 && random(G) < .5 ? pool('fta') : calm.find(e => e.minYear <= y && !plan.some(p => p.id === e.id))).id, month: month(y)});
    }
    plan.push({id: crises.find(e => !plan.some(p => p.id === e.id)).id, month: 48 + 3 + Math.floor(random(G) * 5)});
    return G.calm ? plan.filter(p => !event(p.id).crisis) : plan;
  }
  function cutSource(G) {
    const P = player(G), npcs = G.nations.slice(1).filter(n => sells(G, n, n.main));
    const score = n => sum(Object.values(P.year.imp[n.main]).concat(P.lastYear ? [P.lastYear.imp[n.main][n.id] || 0] : [])) + (P.ships.some(s => s.route?.to === n.id) ? 5 : 0);
    if (G.cutTarget) return nation(G, G.cutTarget);
    return npcs.sort((a, b) => score(b) - score(a))[0] || G.nations[1];
  }
  function warn(G, e) {
    if (e.id === 'supplyCut') { const s = cutSource(G); e.source = s.id; G.mods.push({g: s.main, mult: 1.15, from: G.month, until: e.month}); news(G, `${s.name}에 분쟁 조짐! ${T.goods[s.main].name} 값이 들썩여요.`, 'warn'); }
    if (e.id === 'recession') { G.mods.push({g: -1, mult: .9, from: G.month, until: e.month}); news(G, '세계 경제가 흔들려요. 물건이 덜 팔려요.', 'warn'); }
  }
  function startEvent(G, e) {
    const P = player(G), until = G.month + 6;
    let id = e.id;
    if (id === 'retaliation' && !GOODS.some(g => isProtected(G, P, g))) id = 'dumping';
    if (id === 'fta' && !G.nations.slice(1).some(o => rel(G, P, o) >= 3)) id = 'invention';
    const ev = event(id), p = {type: 'event', id, until};
    if (id === 'supplyCut') { const s = e.source ? nation(G, e.source) : cutSource(G), end = G.month + X.cutMonths; p.until = end; G.cut = {source: s.id, good: s.main, until: end}; p.source = s.id; p.good = s.main; G.mods.push({g: s.main, mult: 1.3, from: G.month, until: end}); }
    if (id === 'storm') { for (const n of G.nations) n.mods.push({kind: 'level', g: 0, v: -1, until}); G.mods.push({g: 0, mult: 1.3, from: G.month, until}); }
    if (id === 'recession') G.mods.push({g: -1, mult: .7, from: G.month, until});
    if (id === 'dumping') G.mods.push({g: 2, mult: .7, from: G.month, until});
    if (id === 'retaliation') { const g = GOODS.find(g => isProtected(G, P, g)); p.source = (G.nations.slice(1).find(o => o.main === g) || G.nations[1]).id; }
    if (id === 'fta') p.target = G.nations.slice(1).sort((a, b) => rel(G, P, b) - rel(G, P, a))[0].id;
    const all = [0, 1, 2, 3, 4];
    if (ev.crisis) G.crises.push(id === 'supplyCut' ? {goods: [p.good], w: 1, until: p.until, cut: true} : id === 'storm' ? {goods: [0], w: 1, until}
      : {goods: all, w: .4, until, only: id === 'exchange' ? P.id : null});
    if (ev.crisis) { G.stats.crises++; for (const n of G.nations.slice(1)) applyEvent(G, n, p, npcOption(G, n, p)); }
    news(G, `${ev.name}!`, ev.crisis ? 'crisis' : 'big');
    ask(G, p);
  }
  function mostImported(G, n) { const need = needs(G, n); return GOODS.reduce((b, g) => need[g] - produces(G, n, g) > need[b] - produces(G, n, b) ? g : b, 0); }
  function applyEvent(G, n, p, k) {
    const u = p.until, id = p.id;
    const pay = c => { if (n.money < c) return false; n.money -= c; return true; };
    if (id === 'supplyCut') { if (k === 0) { if (pay(100)) n.detour = u; } else { n.mods.push({kind: 'need', g: p.good, v: -1, until: u}, {kind: 'score', g: -1, v: -3, until: u}); } }
    if (id === 'storm' && k === 1) for (const o of G.nations) if (o !== n && rel(G, n, o) >= 2) { const t = take(o, 0, Math.min(2, exportable(G, o, 0))); add(n, 0, t.qty, o.quality[0]); }
    if (id === 'recession' && k === 1 && pay(100)) n.mods.push({kind: 'score', g: -1, v: 4, until: u});
    if (id === 'exchange') { if (n === player(G)) n.mods.push({kind: 'exchange', g: -1, v: 1, until: u}); if (k === 0) n.mods.push({kind: 'level', g: n.main, v: 1, until: u}); else n.mods.push({kind: 'need', g: mostImported(G, n), v: -1, until: u}, {kind: 'score', g: -1, v: -3, until: u}); }
    if (id === 'expo' && k === 0 && pay(60)) n.expo = true;
    if (id === 'invention') { if (k === 0) n.levels[n.main]++; else for (const o of G.nations) addRel(G, n, o, 1); }
    if (id === 'voice') { if (k === 0) n.protect[0] = Math.max(n.protect[0], G.month + 12); else n.mods.push({kind: 'score', g: -1, v: 2, until: G.month + 12}); }
    if (id === 'dumping' && k === 1) n.protect[2] = Math.max(n.protect[2], G.month + 12);
    if (id === 'retaliation') { if (k === 0) n.protect = [0, 0, 0, 0, 0]; else if (k === 1) n.mods.push({kind: 'retaliated', g: -1, v: 1, until: u}); else if (pay(60)) addRel(G, n, p.source, 1); }
    if (id === 'fta' && k === 0) makeFta(G, n, nation(G, p.target));
  }
  function makeFta(G, a, b) { if (!a.fta.includes(b.id)) { a.fta.push(b.id); b.fta.push(a.id); } G.rel[a.id][b.id] = G.rel[b.id][a.id] = X.relMax; }
  function npcOption(G, n, p) {
    if (p.id === 'supplyCut') return n.money >= 100 && buys(G, n, p.good) ? 0 : 1;
    if (p.id === 'recession') return n.money >= 300 ? 1 : 0;
    if (p.id === 'storm') return 1;
    return n.strategy === 'balanced' ? 1 : 0;
  }

  // ---------- 발전 회의 ----------
  const cardCost = (n, id) => id === 'grow' && n.id === 'daon' ? 120 : S.cards.find(c => c.id === id).cost;
  function dependence(G, n, g) {
    const imp = n.lastYear ? sum(Object.values(n.lastYear.imp[g])) : 0, need = needs(G, n)[g] * 4;
    return imp / need;
  }
  const weakest = (G, n) => GOODS.filter(g => g !== n.main).sort((a, b) => dependence(G, n, b) - dependence(G, n, a) || n.levels[a] - n.levels[b])[0];
  function cardsFor(G, n) {
    const rest = ['warehouse', 'bigShip', 'moreShip', 'quality', 'climb'].filter(id =>
      !(id === 'warehouse' && n.warehouse) && !(id === 'bigShip' && n.bigShip) && !(id === 'moreShip' && n.ships.length >= X.maxShips) &&
      !(id === 'quality' && n.quality[n.main] >= 3) && !(id === 'climb' && n.main === 3));
    const list = ['grow'];
    if (GOODS.some(g => g !== n.main && (dependence(G, n, g) > .4 || n.closed[g]))) list.push('protect');
    return list.concat(shuffle(G, rest)).slice(0, 3);
  }
  function applyCard(G, n, id, target) {
    const cost = cardCost(n, id);
    if (n.money < cost) return false;
    n.money -= cost;
    if (id === 'grow') n.levels[n.main]++;
    if (id === 'climb') n.levels[3]++;
    if (id === 'protect') {
      const g = target ?? weakest(G, n);
      n.levels[g]++; n.closed[g] = false;   // 약한 산업을 한 단계 키우고 문 닫지 않게 지킨다
      n.protect[g] = FOREVER;
      for (const o of G.nations) if (o !== n && o.main === g) addRel(G, n, o, -1);
    }
    if (id === 'warehouse') n.warehouse = true;
    if (id === 'bigShip') n.bigShip = true;
    if (id === 'moreShip') n.ships.push(newShip());
    if (id === 'quality') n.quality[n.main] = Math.min(3, n.quality[n.main] + 1);
    return true;
  }
  function npcCard(G, n) {
    const cards = cardsFor(G, n), want = n.strategy === 'balanced' && cards.includes('protect') && !GOODS.some(g => isProtected(G, n, g)) ? 'protect' : random(G) < .5 ? 'grow' : cards[1] || 'grow';
    // NPC는 회의마다 한 장만 산다(난이도 조절).
    if (n.money - cardCost(n, want) >= 150) applyCard(G, n, want);
  }

  // ---------- 항로 고르기(NPC·봇 공용) ----------
  // 1점 = W원으로 보고 "수입해서 채우는 생활 점수 − 내는 돈 + 수출로 버는 돈"이 크게 칸을 채운다.
  const W = 18;
  function committed(n, g, dir, except, to) {
    return sum(n.ships.filter(s => s !== except && s.route && (!to || s.route.to === to)).map(s => s.route[dir][g] * 3 / (s.T || 3)));
  }
  // 다른 나라 배들이 이미 그 섬과 같은 물건을 계약한 양(계절당)
  const rivals = (G, n, o, g, dir, except) => sum(G.nations.filter(m => m !== n).map(m => committed(m, g, dir, except, o.id))) + committed(n, g, dir, except, o.id);
  // 한 섬에 대해 칸을 욕심쟁이로 채운다: 가는 칸은 비싼 남는 물건부터, 오는 칸은 점수에 비해 싼 모자란 물건부터.
  function planFor(G, n, ship, o, opts = {}) {
    const tps = 3 / tripTime(G, n, o.id), need = needs(G, n), k = slotsOf(G, n, o), give = none(), get = none();
    const oNeed = o.world ? null : needs(G, o);
    const oGap = g => o.world ? X.worldLimit / 4 : oNeed[g] - produces(G, o, g) - rivals(G, n, o, g, 'give', ship);
    const oSpare = g => o.world ? 99 : produces(G, o, g) - oNeed[g] - rivals(G, n, o, g, 'get', ship);
    let v = 0, left = k, earn = 0;
    for (const g of GOODS.filter(g => sells(G, n, g) && buys(G, o, g)).sort((a, b) => price(G, n, o, b) - price(G, n, o, a))) {
      const flow = Math.min(produces(G, n, g) - need[g] - committed(n, g, 'give', ship), oGap(g)), q = Math.min(left, Math.ceil(flow / tps));
      if (q <= 0) continue;
      give[g] = q; left -= q; v += Math.min(q * tps, flow) * price(G, n, o, g); earn += q * price(G, n, o, g);
    }
    // 균형 전략은 필요량의 1.2배를 목표로 사 와서 창고에 쌓아 둔다(비축).
    const worth = g => W * X.slotPoints / need[g] - price(G, o, n, g) + (o.quality[g] === 3 ? 5 : 0);
    let budget = n.money + earn, got = false;
    left = k;
    for (const g of GOODS.filter(g => !give[g] && sells(G, o, g) && worth(g) > 0).sort((a, b) => worth(b) - worth(a))) {
      const p = price(G, o, n, g), flow = Math.min(Math.round(need[g] * (opts.spread ? 1.2 : 1)) - produces(G, n, g) - committed(n, g, 'get', ship), oSpare(g));
      const q = Math.min(left, Math.ceil(flow / tps), Math.floor(budget / p));
      if (q <= 0) continue;
      get[g] = q; left -= q; budget -= q * p; got = true; v += Math.min(q * tps, flow) * worth(g);
    }
    if (got && opts.spread && n.ships.some(s => s !== ship && s.route?.to === o.id)) v *= .6;
    return {r: {to: o.id, give, get}, v};
  }
  function bestRoute(G, n, ship, opts = {}) {
    let best = null, bv = 0;
    // NPC 배는 ♥2 이상인 학생 나라에만 찾아온다(신뢰를 쌓으면 손님 배가 늘어난다).
    const partners = opts.only ? [nation(G, opts.only), G.world] : [...G.nations.filter(o => o !== n && (o.npc || !n.npc || rel(G, n, o) >= X.visitRel)), G.world];
    for (const o of partners) {
      const {r, v} = planFor(G, n, ship, o, opts), w = v * (o.world ? .8 : 1);
      if (w > bv && allowed(G, n, r)) { bv = w; best = r; }
    }
    return best;
  }
  function npcRoute(G, n, ship) { const r = bestRoute(G, n, ship, {spread: n.strategy === 'balanced'}); if (r) sign(G, n, ship, r); }

  // ---------- 학생 조작 ----------
  function setRoute(G, i, r) {
    const n = player(G), s = n.ships[i];
    if (!s || !allowed(G, n, r)) return false;
    G.stats.routeSets++;
    if (!s.route) sign(G, n, s, r); else s.next = norm(G, n, r);
    return true;
  }
  function breakContract(G, i) {
    const s = player(G).ships[i];
    if (!s?.route || s.breaking) return false;
    s.breaking = true;
    if (s.state === 'port') endContract(G, player(G), s, true);
    return true;
  }

  // ---------- 새 판 ----------
  function newGame(seed = 1, countryId = 'daon', opts = {}) {
    const G = {version: S.version, seed, rng: (seed >>> 0) || 1, month: 0, nations: [], rel: {}, base: S.goods.map(g => g.price), trend: [0, 0, 0, 0, 0], drift: [0, 0, 0, 0, 0],
      mods: [], cut: null, crises: [], queue: [], pending: null, news: [], over: false, calm: !!opts.calm, cutTarget: opts.cutTarget || null, contracts: [],
      stats: {pauses: 0, stops: 0, routeSets: 0, breaks: 0, misses: 0, declines: 0, crises: 0}};
    for (let i = 0; i < 3; i++) random(G);
    // NPC 4곳 뽑기: 우리가 모자란 물건마다 파는 나라가 1곳 이상, 그리고 모자란 물건의 2/3 이상은 2곳 이상이 되게 다시 뽑는다.
    const me = T.countries.find(c => c.id === countryId), lacks = GOODS.filter(g => S.countries[countryId].levels[g] * S.goods[g].load < baseNeed(me.workers, g));
    const sellerCount = (ids, g) => ids.filter(id => S.countries[id].levels[g] * S.goods[g].load > baseNeed(T.countries.find(c => c.id === id).workers, g)).length;
    const good = (ids, strict) => lacks.every(g => sellerCount(ids, g) >= 1) && (!strict || lacks.filter(g => sellerCount(ids, g) >= 2).length * 3 >= lacks.length * 2);
    let others, tries = 0;
    do others = shuffle(G, T.countries.map(c => c.id).filter(id => id !== countryId)).slice(0, 4); while (!good(others, tries < 40) && ++tries < 80);
    G.nations = [makeNation(countryId, false), ...others.map(id => makeNation(id, true))];
    G.world = makeWorld();
    for (const a of G.nations) { G.rel[a.id] = {}; for (const b of G.nations) if (a !== b) G.rel[a.id][b.id] = X.relStart; }
    for (const n of G.nations) n.strategy = n.npc ? (random(G) < .5 ? 'focus' : 'balanced') : null;
    const slots = shuffle(G, X.tripMonths);
    G.dist = Object.fromEntries(others.map((id, k) => [id, slots[k]]));
    G.startShips = opts.startShips ?? X.openShips;
    const P = player(G);
    for (let k = 0; k < shipsAt(G, 0); k++) P.ships.push(newShip());
    for (const n of G.nations.slice(1)) for (let k = 0; k < X.npcShips + (n.id === 'port' ? 1 : 0); k++) n.ships.push(newShip());
    G.plan = planEvents(G);
    // 처음부터 항구가 열려 있다. 첫 출항에 실을 짐이 있게 한 계절 생산만큼 창고를 채워 둔다.
    for (const n of G.nations) for (const g of GOODS) add(n, g, produces(G, n, g), n.quality[g]);
    for (const n of G.nations.slice(1)) for (const s of n.ships) npcRoute(G, n, s);
    news(G, '항구가 열렸어요! 배를 섬으로 보내 보세요.', 'big');
    ask(G, {type: 'open'});
    return G;
  }
  // 학생 배 수: 1년째는 개항 배 수, 2년째부터 기본 3척. 항구 섬나라는 +1척.
  function shipsAt(G, m) { return (m < 12 ? G.startShips : Math.max(G.startShips, X.playerShips)) + (player(G).id === 'port' ? 1 : 0); }

  // ---------- 봇 ----------
  function botTurn(G, mode, opts) {
    const P = player(G), p = G.pending;
    if (p) {
      if (p.type === 'event') choose(G, mode === 'random' ? Math.floor(random(G) * event(p.id).options.length) : mode === 'balanced' ? npcOption(G, P, p) : p.id === 'supplyCut' ? 1 : 0);
      else if (p.type === 'meeting') {
        const order = mode === 'self' ? ['protect', 'grow', 'warehouse'] : mode === 'balanced' ? (GOODS.some(g => isProtected(G, P, g)) ? ['warehouse', 'grow', 'moreShip', 'bigShip', 'quality'] : ['protect', 'warehouse', 'grow'])
          : mode === 'random' ? shuffle(G, p.cards) : ['grow', 'moreShip', 'bigShip', 'quality', 'climb', 'warehouse'];
        const id = order.find(id => p.cards.includes(id) && P.money - cardCost(P, id) >= (mode === 'self' ? 0 : 150));
        if (!id || !choose(G, id)) choose(G, null);
      } else choose(G, null);
      return;
    }
    if (mode === 'self') return;
    const ro = {spread: mode === 'balanced', only: mode === 'one' ? opts.oneTarget : null};
    P.ships.forEach((s, i) => {
      if (!s.route) {
        let r = bestRoute(G, P, s, ro);
        if (mode === 'random') { const all = []; for (const o of [...G.nations.slice(1), G.world]) for (const give of [null, ...GOODS]) for (const get of [null, ...GOODS]) if (allowed(G, P, {to: o.id, give, get})) all.push({to: o.id, give, get}); r = all.length ? pick(G, all) : null; }
        if (r) setRoute(G, i, r);
        return;
      }
      if (s.next || s.breaking || mode === 'random') return;
      if (s.route.done === s.route.trips - 1) {
        const r = bestRoute(G, P, s, ro), key = x => x.to + x.give + '|' + x.get;
        if (r && key(r) !== key(s.route)) setRoute(G, i, r);
      }
      if (mode === 'opportunist') {
        const o = nation(G, s.route.to), r = s.route;
        const better = GOODS.some(g => r.get[g] && price(G, o, P, g) <= r.bp[g] * .85 || r.give[g] && price(G, P, o, g) >= r.gp[g] * 1.15);
        if (better && r.done < r.trips - 1) { setRoute(G, i, r); breakContract(G, i); }
      }
    });
  }
  function runBot(seed, id, mode = 'focus', opts = {}) {
    const G = newGame(seed, id, opts);
    let guard = 0;
    while (!G.over && guard++ < 5000) { botTurn(G, mode, opts); tick(G); }
    return G;
  }

  return {T, S, X, newGame, tick, choose, setRoute, breakContract, allowed, price, worldPrice, needs, levelOf, produces, count, exportable,
    sells, buys, tripTime, slotsOf, rel, player, nation, ranking, cardsFor, cardCost, dependence, bestRoute, plan: (G, n, ship, o) => planFor(G, n, ship, o).r, runBot, botTurn, isProtected};
});
