/* 무역왕 5.0 — 화면 없는 규칙 엔진. 화면·봇·테스트가 같은 코드를 쓴다. 모든 수는 정수다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else root.TradeEngine = factory(root.TRADE);
})(globalThis, function (T) {
  'use strict';
  const K = T.goods.length, E5 = T.economy, CAP = 6;
  const zeros = () => Array(K).fill(0);
  const sum = a => a.reduce((s, v) => s + v, 0);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const country = id => T.countries.find(c => c.id === id);
  const event = id => T.events.find(e => e.id === id);
  const goodIndex = g => typeof g === 'number' ? g : T.goods.findIndex(x => x.id === g);

  function random(G) { G.rng = (Math.imul(G.rng, 1664525) + 1013904223) >>> 0; return G.rng / 4294967296; }
  function shuffle(G, a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random(G) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function unlocked(p = {}) {
    const endings = p.endings || [], events = p.events || [], badges = p.badges || [];
    return T.countries.filter(c => ({forest: endings.length > 0, ironland: events.length >= 8, port: endings.includes('power'), artisan: badges.length >= 3}[c.id] ?? true)).map(c => c.id);
  }

  // 창고: 상자를 품질별로 센다. box[i] = [0, ⭐1, ⭐2, ⭐3]
  const emptyBoxes = () => T.goods.map(() => [0, 0, 0, 0]);
  const count = (n, i) => sum(n.box[i]);
  function addBoxes(n, i, qty, q) { n.box[i][clamp(q, 1, 3)] += qty; }
  // 낮은 품질부터 꺼낸다(좋은 상자는 국민 몫으로 남긴다). 꺼낸 품질 내역을 돌려준다.
  function takeBoxes(n, i, qty, best = false) {
    const out = [0, 0, 0, 0], order = best ? [3, 2, 1] : [1, 2, 3];
    for (const q of order) { const t = Math.min(qty, n.box[i][q]); n.box[i][q] -= t; out[q] += t; qty -= t; }
    return out;
  }

  function makeNation(G, id, npc) {
    const c = country(id);
    return {
      id, npc, workers: c.workers, production: [...c.production], quality: [...c.quality],
      need: T.goods.map(g => Math.max(1, Math.round(c.workers * g.rate))),
      allocation: zeros(), idle: zeros(), closed: T.goods.map(() => false), protect: T.goods.map(() => false),
      box: emptyBoxes(), money: E5.startMoney, ships: (id === 'port' ? 4 : 3) - (npc ? 1 : 0), warehouse: false, fta: [], grown: zeros(),
      strategy: npc ? ['smart', 'friendly', 'quality'][Math.floor(random(G) * 3)] : null,
      history: [], score: 0, mods: null, used: 0, voyages: [], imports: T.goods.map(() => ({})), dep: T.goods.map(() => null),
      volume: {}, income: 0, lowBought: {}, retaliationPending: null, retaliations: 0, dependHit: false, fair: 0,
      totals: {sold: zeros(), soldTop: 0, maxIncome: 0, partners: [], imported: 0, crisisFood: false}
    };
  }

  function tradeOpen(G) { return G.year > 1 && !(G.challenge === 'double-closed' && G.year === 2); }

  function newGame(seed = 1, countryId = 'daon', progress = {}, challenge = null) {
    const G = {version: T.version, seed, rng: (seed >>> 0) || 1, playerId: countryId, year: 1, phase: 'event', nations: [], rel: {},
      eventPlan: [], event: null, crises: 0, progress: JSON.parse(JSON.stringify(progress)), challenge, prices: T.goods.map(g => g.price), report: null, npcRoutes: []};
    for (let i = 0; i < 3; i++) random(G);
    const others = shuffle(G, T.countries.map(c => c.id).filter(id => id !== countryId)).slice(0, 4);
    G.nations = [makeNation(G, countryId, false), ...others.map(id => makeNation(G, id, true))];
    G.world = makeWorld();
    for (const a of G.nations) { G.rel[a.id] = {}; for (const b of G.nations) if (a !== b) G.rel[a.id][b.id] = E5.relStart; }
    // 1년째는 기회, 2~4년째 중 한 해와 5년째는 위기, 나머지는 문제·기회 카드다.
    const opp = T.events.filter(e => e.minYear === 1).map(e => e.id), crisis = shuffle(G, T.events.filter(e => e.crisis).map(e => e.id));
    const calm = shuffle(G, T.events.filter(e => !e.crisis && !['fta', 'retaliation', 'defect'].includes(e.id) && !opp.includes(e.id)).map(e => e.id));
    const middle = [calm[0], calm[1], crisis[0]], at = 1 + Math.floor(random(G) * 3);
    G.eventPlan = [shuffle(G, opp)[0], calm[0], calm[1], random(G) < .5 ? 'fta' : calm[2], crisis[1]];
    G.eventPlan[at] = crisis[0];
    if (G.eventPlan[at] === 'recession' && at === 1) G.eventPlan[at] = crisis[2];
    // 2년째에는 아직 3년째부터 나오는 사건이 나오지 않게 한다.
    // 바꿀 때는 같은 종류(위기는 위기, 아니면 평범한 카드)로 바꿔 위기 수가 두 번으로 유지되게 한다.
    G.eventPlan = G.eventPlan.map((id, y) => event(id).minYear > y + 1 ? ((event(id).crisis ? crisis : calm).find(c => event(c).minYear <= y + 1 && !G.eventPlan.includes(c)) || 'expo') : id);
    startYear(G);
    return G;
  }

  const player = G => G.nations[0];
  const nation = (G, id) => id === 'world' ? G.world : G.nations.find(n => n.id === id);
  // 먼 바다 상인: 언제나 사고팔지만 값이 불리하다(사기 +2원, 팔기 절반 값).
  const makeWorld = () => ({id: 'world', npc: true, world: true, quality: [2, 2, 2, 2, 2], money: 1e9, fta: [], mods: freshMods(), box: T.goods.map(() => [0, 0, 999, 0]), bought: {}});
  const rel = (G, a, b) => G.rel[a.id ?? a]?.[b.id ?? b] ?? 0;
  function addRel(G, a, b, d) { const x = a.id ?? a, y = b.id ?? b; if (x === 'world' || y === 'world') return; if (d < 0 && nation(G, x).fta.includes(y)) return; G.rel[x][y] = G.rel[y][x] = clamp(G.rel[x][y] + d, 0, E5.relMax); }
  function best(n) { return n.production.reduce((b, v, i) => !n.closed[i] && (v > n.production[b] || v === n.production[b] && T.goods[i].price > T.goods[b].price) ? i : b, n.closed.findIndex(c => !c)); }
  const freshMods = () => ({sellAdd: 0, sellHalf: false, buyMul: 1, goodMul: [1, 1, 1, 1, 1], buyAdd: zeros(), prodAdd: zeros(), needAdd: zeros(), bonus: 0, qualityPenalty: 0, cut: null, bypass: false, freeProtect: T.goods.map(() => false), expo: -1, shipAdd: 0});

  function startYear(G) {
    G.phase = 'event'; G.report = null; G.world = makeWorld();
    for (const n of G.nations) { if (G.year > 1) n.money += Math.round(n.workers * (E5.tax || 0)); n.mods = freshMods(); n.used = 0; n.voyages = []; n.imports = T.goods.map(() => ({})); n.volume = {}; n.income = 0; n.allocation = zeros(); }
    const p = player(G), npcs = G.nations.slice(1);
    let id = G.eventPlan[G.year - 1];
    if (p.retaliationPending) id = 'retaliation';
    else if (G.year >= 3 && sum(Object.values(p.lowBought)) >= 3 && random(G) < .5) id = 'defect';
    if (id === 'fta' && (G.year < 4 || !npcs.some(n => rel(G, p, n) >= 2 && !p.fta.includes(n.id)))) id = G.year >= 3 ? 'voices' : 'expo';
    let source = npcs[Math.floor(random(G) * npcs.length)].id, good = null;
    if (id === 'retaliation') source = p.retaliationPending;
    if (id === 'fta') source = npcs.filter(n => !p.fta.includes(n.id)).sort((a, b) => rel(G, p, b) - rel(G, p, a))[0].id;
    if (id === 'dumping') source = [...npcs].sort((a, b) => b.production[2] - a.production[2])[0].id;
    if (id === 'defect') source = Object.entries(p.lowBought).sort((a, b) => b[1] - a[1])[0][0];
    if (id === 'dependence' && G.forceSource) source = G.forceSource;
    if (id === 'dependence') good = best(nation(G, source));
    if (id === 'restriction') { const top = Object.entries(p.volume).sort((a, b) => b[1] - a[1])[0]; if (top) source = top[0]; }
    G.event = {id, source, good};
    if (event(id).crisis) G.crises++;
    p.retaliationPending = null;
    if (G.year === 1) p.lowBought = {};
  }

  // ---------- 사건 ----------
  function applyEvent(G, n, choice) {
    const {id, source, good} = G.event, m = n.mods, src = nation(G, source), pay = c => n.money >= c ? (n.money -= c, true) : false;
    const top = best(n);
    if (id === 'restriction') { if (!(choice === 0 && pay(4))) m.sellAdd -= Object.keys(n.volume).length <= 1 && G.year > 2 ? 2 : 1; }
    if (id === 'retaliation' && !n.npc) {
      n.retaliations++;
      if (choice === 0) n.protect = n.protect.map(() => false);
      else if (choice === 2 && pay(3)) { addRel(G, n, src, 1); n.fair++; }
      else m.sellAdd -= 1;
    }
    if (id === 'exchange') {
      m.buyMul = 2; m.sellAdd += 1;
      if (choice === 0) m.prodAdd[top] += 1;
      else { const most = n.need.map((v, i) => sum(Object.values(n.imports[i] || {}))).reduce((b, v, i, a) => v > a[b] ? i : b, 0); m.needAdd[most] -= 1; m.bonus -= 3; }
    }
    if (id === 'recession') { m.sellHalf = true; if (choice === 1 && pay(3)) m.bonus += 4; }
    if (id === 'dependence' && n.id !== source) {
      m.cut = {source, good}; m.goodMul[good] = 2;
      if (n.dep[good]?.from === source && n.dep[good].share > .7) { m.cut.hard = true; n.dependHit = true; }
      if (choice === 0 && pay(5)) m.bypass = true;
      else if (choice === 1) { m.needAdd[good] -= 1; m.bonus -= 3; }
    }
    if (id === 'storm') {
      m.prodAdd[0] -= 1; m.goodMul[0] = 2; if (n.id === 'port') m.shipAdd -= 1;
      if (choice === 1) for (const o of G.nations) if (o !== n && rel(G, n, o) >= 2) addBoxes(n, 0, 1, o.quality[0]);
    }
    if (id === 'dumping') { m.buyAdd[2] -= 1; if (choice === 1) m.freeProtect[2] = true; }
    if (id === 'defect' && !n.npc) { if (choice === 0) { addRel(G, n, src, -1); addBoxes(n, best(src), 1, 2); } else m.qualityPenalty += 2; n.lowBought = {}; }
    if (id === 'fta' && !n.npc && choice === 0) makeFta(G, n, src);
    if (id === 'expo' && choice === 0 && pay(2)) m.expo = top;
    if (id === 'invention') { if (choice === 0) n.production[top] += 1; else { for (const o of G.nations) if (o !== n) addRel(G, n, o, 1); n.fair++; } }
    if (id === 'voices') { if (choice === 0) m.freeProtect[0] = true; else m.bonus += 4; }
  }
  function makeFta(G, a, b) { if (!a.fta.includes(b.id)) { a.fta.push(b.id); b.fta.push(a.id); } G.rel[a.id][b.id] = G.rel[b.id][a.id] = E5.relMax; }
  function npcChoice(G, n) {
    const e = event(G.event.id), last = e.choices.length - 1;
    if (n.strategy === 'friendly') return n.money >= 5 ? 0 : Math.min(1, last);
    return e.kind === 'opportunity' ? 0 : Math.min(1, last);
  }
  function chooseEvent(G, index) {
    const e = event(G.event.id);
    if (G.phase !== 'event' || !Number.isInteger(index) || index < 0 || index >= e.choices.length) return false;
    G.nations.forEach(n => applyEvent(G, n, n.npc ? npcChoice(G, n) : index));
    G.lastChoice = index; G.phase = 'make'; return true;
  }

  // ---------- 만들기 ----------
  const perWorker = (n, i) => n.closed[i] ? 0 : Math.max(0, n.production[i] + n.mods.prodAdd[i]);
  const output = n => n.allocation.map((w, i) => w * perWorker(n, i));
  const needs = n => n.need.map((v, i) => Math.max(1, v + (n.mods?.needAdd[i] || 0)));
  function assign(G, i, value) {
    const n = player(G); i = goodIndex(i);
    if (G.phase !== 'make' || i < 0 || i >= K || !Number.isInteger(value) || value < 0 || n.closed[i] && value > 0) return false;
    if (sum(n.allocation) - n.allocation[i] + value > n.workers) return false;
    n.allocation[i] = value; return true;
  }
  function produce(G) { for (const n of G.nations) output(n).forEach((q, i) => q && addBoxes(n, i, q, n.quality[i])); }

  // 1년째(혼자)와 봇이 쓰는 배치 계획
  function slotScore(have, need) { return E5.slotPoints * Math.min(1, have / need); }
  function planSelf(n) {
    const a = zeros(), have = n.box.map((b, i) => sum(b)), nd = needs(n);
    for (let w = 0; w < n.workers; w++) {
      let bi = -1, gain = -1;
      for (let i = 0; i < K; i++) { const p = perWorker(n, i); if (!p) continue; const g = slotScore(have[i] + p, nd[i]) - slotScore(have[i], nd[i]) + (have[i] === 0 ? 4 : 0); if (g > gain + 1e-9) { gain = g; bi = i; } }
      if (bi < 0) break; a[bi]++; have[bi] += perWorker(n, bi);
    }
    return a;
  }
  // 무역할 때의 배치: 일꾼마다 "사 오는 값을 아끼거나 팔아서 버는 값"이 가장 큰 공장에 놓는다.
  function planTrade(n, mode, G) {
    if (mode === 'self') return planSelf(n);
    // 효율 봇: 잘하는 것 하나에만 몰아 만든다. 균형 봇은 평소엔 같고, 위기 해에는 따져서 나눈다.
    if (mode === 'efficient' || mode === 'one' || mode === 'balanced' && !event(G.event.id).crisis) { const a = zeros(); a[best(n)] = n.workers; return a; }
    const a = zeros(), have = n.box.map(b => sum(b)), nd = needs(n);
    const sellCap = T.goods.map((g, i) => Math.round(sum(G.nations.filter(o => o !== n).map(o => o.need[i])) * .25) + 6);
    const m = n.mods, worth = (i, h) => { const g = T.goods[i].price; return h < nd[i] ? (g + 2) * m.buyMul * m.goodMul[i] + m.buyAdd[i] : h < nd[i] + sellCap[i] ? g + (n.quality[i] === 3 ? 1 : 0) : .3; };
    for (let w = 0; w < n.workers; w++) {
      let bi = -1, bv = -1;
      for (let i = 0; i < K; i++) { const p = perWorker(n, i); if (!p) continue; let v = 0; for (let k = 0; k < p; k++) v += worth(i, have[i] + k); if (v > bv) { bv = v; bi = i; } }
      if (bi < 0) break; a[bi]++; have[bi] += perWorker(n, bi);
    }
    if (mode === 'balanced' && E5.balancedFloor) {
      // 균형: 가장 많이 필요한 물건 두 가지는 국내에서 절반쯤 만들어 둔다(위기 대비).
      const keys = [0, 1, 2, 3, 4].filter(i => perWorker(n, i) > 0).sort((x, y) => nd[y] * T.goods[y].price - nd[x] * T.goods[x].price).slice(0, 1);
      for (const i of keys) {
        while (have[i] < nd[i] / 2) {
          const from = a.map((v, k) => [v, k]).filter(([v, k]) => v > 0 && !keys.includes(k)).sort((x, y) => y[0] - x[0])[0];
          if (!from || a[from[1]] <= 1) break;
          a[from[1]]--; have[from[1]] -= perWorker(n, from[1]); a[i]++; have[i] += perWorker(n, i);
        }
      }
    }
    if (mode === 'quality') {
      const empty = [0, 1, 2, 3, 4].filter(i => !a[i] && perWorker(n, i) > 0).sort((x, y) => n.need[y] * T.goods[y].price - n.need[x] * T.goods[x].price)[0];
      const from = a.indexOf(Math.max(...a));
      if (empty !== undefined && a[from] > 1) { a[from]--; a[empty]++; }
    }
    return a;
  }

  // ---------- 값 ----------
  function surplus(n, i) { return n.world ? 99 : Math.max(0, count(n, i) - needs(n)[i]); }
  function deficit(n, i) { return n.world ? 99 : Math.max(0, needs(n)[i] - count(n, i)); }
  // 위기로 귀해진 물건: 상인은 팔지 않고, 섬들은 남는 것의 절반만 판다.
  function scarce(G, i) { const e = G.event; return !!e && (e.id === 'dependence' && e.good === i || e.id === 'storm' && i === 0); }
  function available(G, o, i) { const q = surplus(o, i); return scarce(G, i) ? (o.world ? 0 : Math.floor(q / 2)) : q; }
  // 먼 바다 상인은 나라마다 물건별로 한 해 4상자까지만 사 간다.
  const WORLD_BUY = 4;
  function room(G, seller, buyer, i) { return buyer.world ? Math.max(0, WORLD_BUY - (buyer.bought[seller.id]?.[i] || 0)) : deficit(buyer, i); }
  function setPrices(G) {
    G.prices = T.goods.map((g, i) => {
      const S = sum(G.nations.map(n => surplus(n, i))), D = sum(G.nations.map(n => deficit(n, i)));
      return clamp(Math.round(g.price * (D + 6) / (S + 6)), Math.max(1, g.price - 1), g.price + 2);
    });
  }
  // buyer가 seller에게서 good 1상자를 살 때 값
  function buyPrice(G, buyer, seller, i) {
    const m = buyer.mods, q = seller.quality[i], fta = buyer.fta.includes(seller.id);
    let p = seller.world ? T.goods[i].price + 2 : G.prices[i] + (q === 3 ? 1 : q === 1 ? -1 : 0) - (rel(G, buyer, seller) >= 3 ? 1 : 0) - (fta ? 1 : 0);
    if ((buyer.protect[i] || m.freeProtect[i]) && !fta) p += 1;
    p = p * m.buyMul * m.goodMul[i] + m.buyAdd[i];
    if (m.cut && m.cut.source === seller.id && m.cut.good === i && !m.bypass) p += m.cut.hard ? 2 : 1;
    return Math.max(1, p);
  }
  // seller가 buyer에게 good 1상자를 팔 때 받는 값
  function sellPrice(G, seller, buyer, i) {
    const m = seller.mods, q = seller.quality[i], base = T.goods[i].price;
    // 먼 바다 상인은 절반 값에 산다(대평원국 식량은 제값).
    if (buyer.world) return Math.max(1, Math.floor((base - (seller.id === 'plains' && i === 0 ? 0 : 1) + (q === 3 ? 1 : 0)) * (m.sellHalf ? .5 : 1)) + m.sellAdd);
    let p = G.prices[i] + (q === 3 ? 1 : 0) + m.sellAdd + (m.expo === i ? 1 : 0);
    if (seller.id === 'artisan' && q === 3) p += 1;
    if (seller.id === 'oil' && i === 1 && G.prices[1] > base) p += 1;
    if (seller.id === 'forest' && i === 0 && seller.fair) p += 1;
    if (seller.id === 'ironland' && i === 4 && seller.grown[4]) p += 1;
    if (m.sellHalf) p = Math.floor(p / 2);
    return Math.max(1, p);
  }
  // 공급 끊김: seller가 buyer에게 이 물건을 팔 수 있나
  function blocked(G, buyer, seller, i) {
    const c = buyer.mods.cut;
    return !!c && c.source === seller.id && c.good === i && !buyer.mods.bypass && (rel(G, buyer, seller) <= 1 || c.hard);
  }
  const shipsTotal = n => Math.max(0, n.ships + n.mods.shipAdd);
  const shipsLeft = n => shipsTotal(n) - n.used;

  // 섬이 보여 주는 것: 팔아요(남는 것) / 필요해요(모자란 것)
  // 만들기 단계에서는 그 나라가 올해 만들 몫까지 더한 예상치를 보여 준다.
  function island(G, viewer, other) {
    const made = G.phase === 'make' && !other.world ? output(other) : zeros(), nd = other.world ? null : needs(other);
    const sell = i => other.world ? available(G, other, i) : (q => scarce(G, i) ? Math.floor(q / 2) : q)(Math.max(0, count(other, i) + made[i] - nd[i]));
    const need = i => other.world ? room(G, viewer, other, i) : Math.max(0, nd[i] - count(other, i) - made[i]);
    return {
      sells: T.goods.map((g, i) => ({i, qty: sell(i), quality: other.quality[i], price: buyPrice(G, viewer, other, i), blocked: blocked(G, viewer, other, i)})).filter(s => s.qty > 0),
      needs: T.goods.map((g, i) => ({i, qty: need(i), price: sellPrice(G, viewer, other, i)})).filter(s => s.qty > 0),
      rel: rel(G, viewer, other), fta: viewer.fta.includes(other.id)
    };
  }

  // ---------- 배 보내기 ----------
  // give/get: [[물건, 상자 수], ...]. 실제로 할 수 있는지 계산만 한다.
  function quoteVoyage(G, from, to, give, get) {
    const n = typeof from === 'string' ? nation(G, from) : from, o = typeof to === 'string' ? nation(G, to) : to;
    const res = {ok: false, income: 0, cost: 0, reason: ''};
    if (!o || o === n) return {...res, reason: '갈 수 없는 나라예요.'};
    const gv = sum(give.map(x => x[1])), gt = sum(get.map(x => x[1]));
    if (give.some(([i, q]) => !Number.isInteger(q) || q < 0) || get.some(([i, q]) => !Number.isInteger(q) || q < 0)) return {...res, reason: '상자 수가 이상해요.'};
    if (gv + gt === 0) return {...res, reason: '실을 물건을 골라요.'};
    if (gv > CAP || gt > CAP) return {...res, reason: `배 한 척에는 ${CAP}상자까지 실어요.`};
    for (const [i, q] of give) { if (q > surplus(n, i)) return {...res, reason: '국민 몫까지 팔 수는 없어요.'}; if (q > room(G, n, o, i)) return {...res, reason: '그 나라에 필요한 만큼만 팔 수 있어요.'}; res.income += q * sellPrice(G, n, o, i); }
    for (const [i, q] of get) { if (q && blocked(G, n, o, i)) return {...res, reason: '분쟁 때문에 이 물건은 살 수 없어요.'}; if (q > available(G, o, i)) return {...res, reason: '그 나라가 내놓은 만큼만 살 수 있어요.'}; res.cost += q * buyPrice(G, n, o, i); }
    if (n.money + res.income < res.cost) return {...res, reason: '돈이 모자라요.'};
    if (o.money + res.cost < res.income) return {...res, reason: '그 나라 돈이 모자라요. 그 나라 물건을 함께 사 오면 돼요.'};
    return {...res, ok: true};
  }
  function voyageFor(G, n, o, give, get) {
    if (!tradeOpen(G) || shipsLeft(n) <= 0) return false;
    give = give.filter(x => x[1] > 0); get = get.filter(x => x[1] > 0);
    const q = quoteVoyage(G, n, o, give, get); if (!q.ok) return false;
    const record = {to: o.id, give: [], get: [], income: q.income, cost: q.cost};
    for (const [i, k] of give) { const out = takeBoxes(n, i, k); out.forEach((c, qq) => c && addBoxes(o, i, c, qq)); record.give.push([i, k, out]); if (o.world) { o.bought[n.id] ||= zeros(); o.bought[n.id][i] += k; } n.totals.sold[i] += k; if (n.quality[i] === 3) n.totals.soldTop += k; }
    for (const [i, k] of get) {
      const out = takeBoxes(o, i, k, true); out.forEach((c, qq) => c && addBoxes(n, i, c, qq)); record.get.push([i, k, out]);
      n.imports[i][o.id] = (n.imports[i][o.id] || 0) + k; n.totals.imported += k;
      if (o.quality[i] === 1) n.lowBought[o.id] = (n.lowBought[o.id] || 0) + k;
    }
    n.money += q.income - q.cost; o.money += q.cost - q.income; n.income += q.income;
    n.volume[o.id] = (n.volume[o.id] || 0) + sum(give.map(x => x[1])) + sum(get.map(x => x[1]));
    if (!o.world && !n.totals.partners.includes(o.id)) n.totals.partners.push(o.id);
    for (const port of G.nations) if (port.id === 'port' && port !== n && port !== o) port.money += E5.portFee;
    n.used++; n.voyages.push(record); return record;
  }
  function voyage(G, to, give, get) { return G.phase === 'ship' ? !!voyageFor(G, player(G), nation(G, to), give, get) : false; }
  // 출항 되돌리기(해 끝 전까지)
  function undoVoyage(G, index) {
    const n = player(G), r = n.voyages[index]; if (G.phase !== 'ship' || !r) return false;
    const o = nation(G, r.to);
    for (const [i, k, out] of r.get) { out.forEach((c, q) => { n.box[i][q] -= c; o.box[i][q] += c; }); n.imports[i][o.id] -= k; n.totals.imported -= k; if (o.quality[i] === 1) n.lowBought[o.id] -= k; }
    for (const [i, k, out] of r.give) { out.forEach((c, q) => { o.box[i][q] -= c; n.box[i][q] += c; }); if (o.world) o.bought[n.id][i] -= k; n.totals.sold[i] -= k; if (n.quality[i] === 3) n.totals.soldTop -= k; }
    n.money -= r.income - r.cost; o.money -= r.cost - r.income; n.income -= r.income;
    n.volume[o.id] -= sum(r.give.map(x => x[1])) + sum(r.get.map(x => x[1]));
    for (const port of G.nations) if (port.id === 'port' && port !== n && port !== o) port.money -= E5.portFee;
    n.voyages.splice(index, 1); n.used--; return true;
  }

  // 봇·NPC의 배: 실제로 얻는 상자와 돈을 따져 상대를 고른다.
  function voyageValue(G, n, o, mode, p) {
    const got = sum(p.get.map(x => x[1])), cost = sum(p.get.map(([i, q]) => q * buyPrice(G, n, o, i))), income = sum(p.give.map(([i, q]) => q * sellPrice(G, n, o, i)));
    let v = got * 12 - cost + income * .6;
    if (mode === 'quality') v += sum(p.get.map(([i, q]) => q * (o.quality[i] - 2) * 4));
    if ((mode === 'balanced' || mode === 'friendly') && !o.world) v += rel(G, n, o) * 2 - n.voyages.filter(x => x.to === o.id).length * 6;
    if (mode === 'one' && G.oneTarget) v += o.id === G.oneTarget ? 1000 : 0;
    return v;
  }
  function plan(G, n, o, mode) {
    const give = [], get = []; let space = CAP;
    for (const i of [0, 1, 2, 3, 4].sort((a, b) => sellPrice(G, n, o, b) - sellPrice(G, n, o, a))) {
      const q = Math.min(surplus(n, i), room(G, n, o, i), space); if (q > 0) { give.push([i, q]); space -= q; }
    }
    const income = () => sum(give.map(([i, q]) => q * sellPrice(G, n, o, i))), cost = () => sum(get.map(([i, q]) => q * buyPrice(G, n, o, i)));
    let roomGet = CAP, budget = n.money + income();
    const extra = mode === 'balanced' && !event(G.event.id).crisis ? 1 : 0;
    for (const i of [0, 1, 2, 3, 4].sort((a, b) => deficit(n, b) * T.goods[b].price - deficit(n, a) * T.goods[a].price)) {
      if (blocked(G, n, o, i)) continue;
      // 균형 봇은 평온한 해에 필요량의 절반을 더 사서 다음 해 비축으로 남긴다.
      const p = buyPrice(G, n, o, i), want = deficit(n, i) + (extra ? Math.ceil(n.need[i] / 2) : 0);
      const q = Math.min(want, available(G, o, i), roomGet, Math.floor(budget / p)); if (q > 0) { get.push([i, q]); roomGet -= q; budget -= q * p; }
    }
    // 상대 금고가 모자라면 파는 양을 줄이고, 우리 금고가 모자라면 사는 양을 줄인다.
    let guard = 0;
    while (guard++ < 40) {
      if (income() > o.money + cost()) { const g = give.at(-1); if (!g) break; g[1]--; if (!g[1]) give.pop(); continue; }
      if (n.money + income() < cost()) { const g = get.at(-1); if (!g) break; g[1]--; if (!g[1]) get.pop(); continue; }
      break;
    }
    return {give, get};
  }
  function autoShips(G, n, mode, partners = null) {
    if (!tradeOpen(G)) return;
    let guard = 0;
    while (shipsLeft(n) > 0 && guard++ < 8) {
      const others = partners || [...G.nations.filter(o => o !== n), G.world];
      let pick, p;
      if (mode === 'random') {
        pick = others[Math.floor(random(G) * others.length)]; p = plan(G, n, pick, 'efficient');
        p.give = p.give.map(([i, q]) => [i, Math.floor(random(G) * (q + 1))]); p.get = p.get.map(([i, q]) => [i, Math.floor(random(G) * (q + 1))]);
      } else {
        const options = others.map(o => { const pl = plan(G, n, o, mode); return [o, pl, voyageValue(G, n, o, mode, pl)]; }).filter(x => x[1].give.length + x[1].get.length).sort((a, b) => b[2] - a[2]);
        if (!options.length || options[0][2] <= 0) break;
        [pick, p] = options[0];
      }
      if (!voyageFor(G, n, pick, p.give, p.get) && mode !== 'random') { if (!others.includes(G.world) || pick === G.world) break; }
    }
  }

  // ---------- 보호 ----------
  function setProtect(G, good, on) {
    const n = player(G), i = goodIndex(good);
    if (!['make', 'ship'].includes(G.phase) || G.year < 3 || G.challenge === 'no-protect' || i < 0 || n.protect[i] === !!on) return false;
    n.protect[i] = !!on;
    if (on) {
      const hurt = G.nations.slice(1).filter(o => best(o) === i && !n.fta.includes(o.id));
      hurt.forEach(o => addRel(G, n, o, -1));
      if (hurt.length && random(G) < .4) n.retaliationPending = hurt[0].id;
    }
    return true;
  }

  // ---------- 해 끝 ----------
  function settleNation(G, n) {
    const nd = needs(n), full = zeros(); let slot = 0, quality = 0;
    nd.forEach((v, i) => {
      const used = takeBoxes(n, i, Math.min(v, count(n, i)), true), got = sum(used);
      slot += slotScore(got, v);
      if (got >= v) { full[i] = 1; const avg = Math.round((used[1] + used[2] * 2 + used[3] * 3) / got); quality += E5.qualityPoints[avg]; }
    });
    // 위기 피해: 그 물건을 올해 수입에 기댄 만큼 깎인다(남겨 둔 상자와 국내 생산은 안전).
    // 그 물건 공장이 문을 닫았다면 1.5배: 국내에서 버틸 힘이 없기 때문이다.
    const share = i => Math.min(1, sum(Object.values(n.imports[i])) / nd[i]) * (n.closed[i] ? 1.5 : 1), ev = G.event.id, m = n.mods;
    let crisisLoss = 0;
    if (ev === 'dependence' && m.cut) { const g = m.cut.good; crisisLoss = 24 * Math.min(1, (n.imports[g][m.cut.source] || 0) / nd[g]) * (n.closed[g] ? 1.5 : 1) * (m.cut.hard ? 2 : 1); }
    if (ev === 'storm') crisisLoss = 24 * share(0);
    if (ev === 'exchange') crisisLoss = 24 * sum(nd.map((v, i) => share(i) * v)) / sum(nd);
    if (m.bypass) crisisLoss /= 2;
    crisisLoss = Math.round(crisisLoss);
    const protectedCount = n.protect.filter((p, i) => p && !n.mods.freeProtect[i]).length;
    const unrest = protectedCount * E5.unrest;
    const score = clamp(Math.round(slot + quality - unrest - crisisLoss + n.mods.bonus - n.mods.qualityPenalty), 0, 100);
    // 남은 상자는 다음 해로(필요량까지, 창고는 두 배). 넘치면 낮은 품질부터 버린다.
    n.need.forEach((v, i) => { const keep = v * (n.warehouse ? 2 : 1) * (n.id === 'plains' && i === 0 ? 2 : 1), extra = count(n, i) - keep; if (extra > 0) takeBoxes(n, i, extra); });
    // 공장 문 닫힘
    n.allocation.forEach((w, i) => {
      if (w > 0 || n.protect[i] || n.mods.freeProtect[i]) n.idle[i] = 0; else n.idle[i]++;
      if (n.idle[i] >= E5.closeAfter && n.production[i] > 0 && !n.closed[i]) n.closed[i] = true;
    });
    // 사이: 한 해에 3상자 이상 오가면 ♥+1
    for (const [id, v] of Object.entries(n.volume)) if (v >= E5.relTrade && id !== 'world') addRel(G, n, id, 1);
    n.lastImports = n.imports.map(m => ({...m}));
    // 의존: 한 물건을 한 나라에서 70% 넘게 샀는지
    n.dep = n.imports.map(m => { const e = Object.entries(m).filter(x => x[1] > 0), t = sum(e.map(x => x[1])); if (t < 2) return null; const top = e.sort((a, b) => b[1] - a[1])[0]; return {from: top[0], share: top[1] / t}; });
    n.totals.maxIncome = Math.max(n.totals.maxIncome, n.income);
    n.history.push({year: G.year, score, slot: Math.round(slot), quality, unrest, crisisLoss, bonus: n.mods.bonus - n.mods.qualityPenalty, crisis: event(G.event.id).crisis, full, imported: sum(n.imports.map(m => sum(Object.values(m))))});
    n.score = Math.round(sum(n.history.map(h => h.score)) / n.history.length);
    return score;
  }
  // NPC끼리 배를 주고받는다(우리 출항이 끝난 뒤).
  function npcShips(G) {
    G.npcRoutes = [];
    const before = G.nations.slice(1).map(n => n.voyages.length);
    for (const n of shuffle(G, G.nations.slice(1))) {
      if (!tradeOpen(G)) break;
      autoShips(G, n, n.strategy, G.nations.filter(o => o !== n && o.npc));
      // 남는 것은 먼 바다 상인에게 팔고, 빈 칸은 상인에게서 비싸게라도 메운다(배 없이 계산만).
      // NPC도 남은 배만큼만 먼 바다 상인과 거래한다.
      autoShips(G, n, n.strategy, [G.world]);
    }
    G.nations.slice(1).forEach((n, k) => n.voyages.slice(before[k] || 0).forEach(v => G.npcRoutes.push([n.id, v.to])));
  }
  function npcPolicies(G) {
    for (const n of G.nations.slice(1)) {
      const closed = n.closed.findIndex(Boolean);
      if (closed >= 0 && n.money >= 4) { n.money -= 4; n.closed[closed] = false; n.idle[closed] = 0; }
      else if (n.money >= 6 + 3) { n.money -= n.id === 'daon' ? 3 : 6; n.production[best(n)] += 1; n.grown[best(n)]++; }
    }
  }
  function settle(G) {
    const p = player(G), before = ranking(G).find(r => r.id === p.id).rank;
    if (tradeOpen(G)) npcShips(G);
    G.nations.forEach(n => settleNation(G, n));
    const h = p.history.at(-1);
    if (h.crisis && h.full[0]) p.totals.crisisFood = true;
    G.report = {year: G.year, score: h.score, slot: h.slot, quality: h.quality, unrest: h.unrest, crisisLoss: h.crisisLoss, bonus: h.bonus, alone: p.history[0].score, rankBefore: before, rank: ranking(G).find(r => r.id === p.id).rank, money: p.money};
    G.phase = 'yearEnd';
  }

  // ---------- 정책 ----------
  function policyCost(n, id) { const p = T.policies.find(p => p.id === id); return id === 'grow' && n.id === 'daon' ? Math.ceil(p.cost / 2) : p.cost; }
  function policyChoices(G) {
    const n = player(G); if (G.year < 3) return [];
    const list = [];
    if (n.closed.some(Boolean)) list.push('reopen');
    if (G.year >= 4 && G.nations.slice(1).some(o => rel(G, n, o) >= 3 && !n.fta.includes(o.id))) list.push('fta');
    const rest = ['grow', 'ships', 'warehouse', 'friends'].filter(id => !(id === 'ships' && n.ships >= 5) && !(id === 'warehouse' && n.warehouse) && !(id === 'friends' && !G.nations.slice(1).some(o => rel(G, n, o) <= 1)));
    // 해마다 같은 3장이 나오지 않게 해 번호로 돌린다.
    const r = G.year % rest.length;
    return [...list, ...rest.slice(r), ...rest.slice(0, r)].slice(0, 3);
  }
  function applyPolicy(G, n, id, target) {
    const cost = policyCost(n, id); if (n.money < cost) return false;
    if (id === 'grow') { const i = goodIndex(target); if (i < 0 || n.closed[i]) return false; n.production[i] += 1; n.grown[i]++; }
    else if (id === 'reopen') { const i = goodIndex(target); if (i < 0 || !n.closed[i]) return false; n.closed[i] = false; n.idle[i] = 0; }
    else if (id === 'warehouse') { if (n.warehouse) return false; n.warehouse = true; }
    else if (id === 'ships') { if (n.ships >= 5) return false; n.ships++; }
    else if (id === 'fta') { const o = nation(G, target); if (!o || o === n || rel(G, n, o) < 3 || n.fta.includes(o.id)) return false; makeFta(G, n, o); }
    else if (id === 'friends') { G.nations.filter(o => o !== n && rel(G, n, o) <= 1).forEach(o => addRel(G, n, o, 1)); n.fair++; }
    else return false;
    n.money -= cost; return true;
  }
  function choosePolicy(G, id, target) {
    if (G.phase !== 'yearEnd' || G.year < 3 || !policyChoices(G).includes(id) || !applyPolicy(G, player(G), id, target)) return false;
    advanceYear(G); return true;
  }

  function advanceYear(G) {
    npcPolicies(G);
    if (G.year >= T.years) { G.phase = 'ending'; finish(G); return; }
    G.year++; startYear(G);
  }
  function endPhase(G) {
    if (G.phase === 'make') { produce(G); if (tradeOpen(G)) { setPrices(G); G.phase = 'ship'; } else settle(G); return true; }
    if (G.phase === 'ship') { settle(G); return true; }
    if (G.phase === 'yearEnd') { advanceYear(G); return true; }
    return false;
  }

  // NPC는 사건 고르기 다음에 바로 일꾼을 놓는다.
  function npcMake(G) { for (const n of G.nations.slice(1)) n.allocation = tradeOpen(G) ? planTrade(n, n.strategy, G) : planSelf(n); }
  const _chooseEvent = chooseEvent;

  // 화면용 예상: 지금 상자(만들기 단계면 생산 예정 포함)로 해를 끝내면 몇 점일까
  function preview(G, n = player(G)) {
    const nd = needs(n), add = G.phase === 'make' ? output(n) : zeros();
    const rows = nd.map((v, i) => {
      const b = [...n.box[i]]; b[clamp(n.quality[i], 1, 3)] += add[i];
      const have = sum(b), used = [0, 0, 0, 0]; let left = Math.min(v, have);
      for (const q of [3, 2, 1]) { const t = Math.min(left, b[q]); used[q] = t; left -= t; }
      const got = sum(used), avg = got ? Math.round((used[1] + used[2] * 2 + used[3] * 3) / got) : 0;
      return {have, need: v, add: add[i], avg, full: got >= v};
    });
    const slot = sum(rows.map(r => slotScore(Math.min(r.have, r.need), r.need)));
    const quality = sum(rows.map(r => r.full ? E5.qualityPoints[r.avg] : 0));
    const unrest = n.protect.filter((p, i) => p && !n.mods.freeProtect[i]).length * E5.unrest;
    return {rows, slot: Math.round(slot), quality, unrest, score: clamp(Math.round(slot + quality - unrest + n.mods.bonus - n.mods.qualityPenalty), 0, 100)};
  }
  function ranking(G) {
    return [...G.nations].sort((a, b) => b.score - a.score || (a.npc ? 1 : -1)).map((n, k) => ({id: n.id, score: n.score, rank: k + 1}));
  }
  function dependency(n, i) { return n.dep[i] || {from: null, share: 0}; }
  // 지금 이 해에 실제로 사 온 비율(지도의 빨간 항로)
  function liveDependency(n, i) { const e = Object.entries(n.imports[i]).filter(x => x[1] > 0), t = sum(e.map(x => x[1])); if (t < 2) return null; const top = e.sort((a, b) => b[1] - a[1])[0]; return {from: top[0], share: top[1] / t}; }

  function finish(G) {
    const n = player(G), rank = ranking(G).find(r => r.id === n.id).rank, friends = G.nations.slice(1).filter(o => rel(G, n, o) >= 3).length;
    const prot = n.protect.filter(Boolean).length, avg = n.score;
    let ending = 'balanced';
    if (n.totals.imported < 5) ending = 'alone';
    else if (n.retaliations >= 2 || n.retaliations >= 1 && prot >= 2) ending = 'war';
    else if (n.dependHit) ending = 'dependent';
    else if (rank === 1 && n.totals.partners.length >= 3) ending = 'power';
    else if (friends >= 3 || n.fair >= 2) ending = 'fair';
    else if (avg >= 55 && G.crises >= 2 && !n.closed.some(Boolean)) ending = 'balanced';
    else ending = rank <= 2 ? 'power' : 'balanced';
    G.ending = ending;
    const goals = {
      'daon-A': n.totals.sold[3] >= 40, 'daon-B': n.totals.crisisFood,
      'plains-A': n.totals.sold[0] >= 40, 'plains-B': n.grown[2] + n.grown[3] > 0,
      'oil-A': n.totals.maxIncome >= 30, 'oil-B': n.grown[0] + n.grown[2] + n.grown[3] + n.grown[4] > 0,
      'market-A': n.totals.sold[2] >= 60, 'market-B': n.grown[3] > 0,
      'forest-A': n.totals.sold[0] >= 30, 'forest-B': friends >= 2,
      'port-A': n.totals.partners.length >= 4, 'port-B': friends >= 3,
      'artisan-A': n.totals.soldTop >= 40, 'artisan-B': !n.closed.some(Boolean) && avg >= 60,
      'ironland-A': n.totals.sold[4] >= 40, 'ironland-B': n.grown[4] > 0
    };
    G.badges = Object.entries(goals).filter(([id, ok]) => ok && id.startsWith(n.id + '-')).map(([id]) => id);
    const p = G.progress;
    p.endings = [...new Set([...(p.endings || []), ending])];
    p.events = [...new Set([...(p.events || []), ...G.eventLog || []])];
    p.badges = [...new Set([...(p.badges || []), ...G.badges])];
    p.countryEndings = p.countryEndings || {}; p.countryEndings[n.id] = [...new Set([...(p.countryEndings[n.id] || []), ending])];
    p.best = p.best || {}; p.best[n.id] = Math.min(p.best[n.id] || 9, rank);
  }

  // 화면이 쓰는 명령: 사건을 고르면 NPC 배치까지 끝내고, 사건 기록을 남긴다.
  function choose(G, index) {
    if (!_chooseEvent(G, index)) return false;
    G.eventLog = [...new Set([...(G.eventLog || []), G.event.id])];
    npcMake(G);
    return true;
  }

  // 봇: 화면 없이 한 단계씩 진행한다.
  function botTurn(G, mode = 'balanced') {
    const n = player(G);
    if (G.phase === 'event') { const e = event(G.event.id); const idx = mode === 'random' ? Math.floor(random(G) * e.choices.length) : mode === 'balanced' ? (n.money >= 5 ? 0 : Math.min(1, e.choices.length - 1)) : e.kind === 'opportunity' ? 0 : Math.min(1, e.choices.length - 1); choose(G, idx); }
    else if (G.phase === 'make') {
      if (mode === 'balanced' && G.year >= 3 && G.challenge !== 'no-protect') {
        const top = best(n), weak = [0, 1, 2, 3, 4].filter(i => i !== top && n.production[i] > 0 && !n.closed[i]).sort((a, b) => n.need[b] * T.goods[b].price - n.need[a] * T.goods[a].price);
        for (const w of weak.slice(0, 2)) if (n.protect.filter(Boolean).length < 2) setProtect(G, w, true);
      }
      n.allocation = mode === 'random' ? (() => { const a = zeros(); for (let w = 0; w < n.workers; w++) { const open = [0, 1, 2, 3, 4].filter(i => !n.closed[i]); a[open[Math.floor(random(G) * open.length)]]++; } return a; })() : tradeOpen(G) ? planTrade(n, mode, G) : planSelf(n);
      endPhase(G);
    }
    else if (G.phase === 'ship') { if (mode !== 'self') { if (mode === 'one' && !G.oneTarget) G.oneTarget = G.nations[1].id; autoShips(G, n, mode); } endPhase(G); }
    else if (G.phase === 'yearEnd') {
      if (G.year >= 3 && mode !== 'self' && mode !== 'random') {
        const choices = policyChoices(G), top = best(n);
        const order = mode === 'balanced' ? ['reopen', 'warehouse', 'fta', 'grow', 'ships'] : ['reopen', 'grow', 'ships', 'fta'];
        const pick = order.find(id => choices.includes(id) && n.money >= policyCost(n, id));
        const target = pick === 'fta' ? G.nations.slice(1).find(o => rel(G, n, o) >= 3 && !n.fta.includes(o.id))?.id : pick === 'reopen' ? n.closed.findIndex(Boolean) : top;
        if (!pick || !choosePolicy(G, pick, target)) endPhase(G);
      } else endPhase(G);
    }
    return G;
  }
  function runBot(seed, id, mode, options = {}) {
    const G = newGame(seed, id, options.progress || {}, options.challenge || null);
    if (options.calm) { G.eventPlan = G.eventPlan.map(e => event(e).crisis ? 'expo' : e); G.crises = 0; G.event.id = G.eventPlan[0]; }
    if (options.oneTarget) G.oneTarget = options.oneTarget;
    // 한 섬 봇 검사: 3·5년째 공급 끊김을 그 섬에 건다.
    if (options.cutTarget) { G.eventPlan[2] = G.eventPlan[4] = 'dependence'; G.forceSource = options.oneTarget; if (options.effOnly) G.oneTarget = null; }
    while (G.phase !== 'ending') botTurn(G, mode);
    return G;
  }

  return {T, K, CAP, preview, available, scarce, room, slotScore, country, event, unlocked, newGame, player, nation, rel, best, tradeOpen, chooseEvent: choose, assign, endPhase, perWorker, output, needs, count,
    surplus, deficit, island, buyPrice, sellPrice, blocked, quoteVoyage, voyage, undoVoyage, shipsLeft, shipsTotal, setProtect, policyChoices, policyCost, choosePolicy,
    ranking, dependency, liveDependency, planSelf, botTurn, runBot, random};
});
