/* 떡볶이 타이쿤 — 경제 엔진 (화면 없이 node 에서도 돌아감) */
(function (root) {
  'use strict';
  const T = root.TTEOK;
  const UP = T.upgrades;

  /* 같은 씨앗이면 같은 판(테스트·재현용) */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const clampRep = v => Math.max(0, Math.min(5, Math.round(v * 10) / 10));
  const clampFair = v => Math.max(0, Math.min(100, Math.round(v)));
  const shuffle = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* 판마다 다른 10일 일정: 첫날·마지막 날 고정, 가운데 8일은 사건 묶음에서 뽑아 섞기 */
  function makeSchedule(seed) {
    const r = rng(seed * 7 + 3), P = T.pools, slots = Array(T.middleDays).fill(null);
    const others = shuffle(Object.keys(P.choices).filter(id => !P.always.includes(id)), r).slice(0, P.pickChoices);
    for (const id of [...P.always, ...others]) {
      const [lo, hi] = P.choices[id].range;
      const free = shuffle(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).filter(d => d <= T.middleDays && !slots[d - 1]), r);
      const at = free.length ? free[0] : slots.findIndex(x => !x) + 1;
      slots[at - 1] = { id, ...P.choices[id] };
    }
    const demand = shuffle(Object.keys(P.demand), r);
    for (let i = 0; i < slots.length; i++) if (!slots[i]) { const id = demand.shift(); slots[i] = { id, ...P.demand[id] }; }
    return [{ id: 'first', ...T.firstDay }, ...slots, { id: 'last', ...T.lastDay }];
  }

  function newGame(seed = (Math.random() * 1e9) | 0) {
    const ids = Object.keys(T.rivals), rivalId = ids[Math.floor(rng(seed + 11)() * ids.length)], rival = T.rivals[rivalId];
    const s = {
      seed, day: 0, money: T.start.money, taste: T.start.taste, rep: T.start.rep, fair: T.start.fair,
      owned: {}, rivalId, rivalBase: rival.price, rivalPrice: rival.price, rivalCut: 0, rivalSale: 0, rivalSaleLeft: 0, truck: false,
      ingredient: T.ingredient, visitorsToday: 0, mods: [], lockedPrice: null, choiceDone: -1,
      pending: [], trail: [], found: [], cartelRev: 0,
      schedule: makeSchedule(seed), history: [], ended: null, lastPlan: { price: 3000, portions: 40, upgrade: null },
      stats: { wasted: 0, lossDays: 0, maxServed: 0, bulk: false, unfair: 0 }
    };
    s.offers = makeOffers(s);
    return s;
  }
  const day = s => s.schedule[s.day];
  const rivalOf = s => T.rivals[s.rivalId];
  function makeOffers(s) {
    const r = rng(s.seed + s.day * 7919);
    return shuffle(Object.keys(UP).filter(id => !(UP[id].once && s.owned[id])), r).slice(0, 3);
  }
  const capacity = (s, plan) => T.capacity + Object.keys(plan ? plannedState(s, plan).owned : s.owned).reduce((a, id) => a + (UP[id].cap || 0), 0);
  const wages = (s, plan) => Object.keys(plan ? plannedState(s, plan).owned : s.owned).reduce((a, id) => a + (UP[id].wage || 0), 0);
  /* 원래 상태는 그대로 두고 선택한 투자의 효과만 미리 계산한다. */
  function plannedState(s, plan) {
    const next = { ...s, owned: { ...s.owned } };
    const id = plan?.upgrade;
    if (id && canBuy(s, id)) {
      const u = UP[id]; next.money -= u.cost;
      if (u.once) next.owned[id] = true;
      else next.visitorsToday += u.visitors || 0;
      next.taste = Math.round((next.taste + (u.taste || 0)) * 10) / 10;
      next.rep = clampRep(next.rep + (u.rep || 0));
    }
    updateIngredient(next);
    return next;
  }
  function visitorMult(s, plan) {
    if (plan) s = plannedState(s, plan);
    let m = 1 + Object.keys(s.owned).reduce((a, id) => a + (UP[id].visitors || 0), 0) + s.visitorsToday + s.mods.reduce((a, x) => a + (x.visitors || 0), 0);
    return Math.max(0.2, m);
  }
  const expectedVisitors = (s, plan) => Math.round(T.baseVisitors * day(s).mood * visitorMult(s, plan));
  /* 재료비 = 기본값 + 시장 변화(쌀값 등) + 사슬 효과 — 서로 덮어쓰지 않고 더해진다 */
  function addIngredient(s, price, days, tag) { s.mods.push({ ingredient: price - T.ingredient, left: days, tag }); updateIngredient(s); }
  function updateIngredient(s) { s.ingredient = Math.max(200, T.ingredient + s.mods.reduce((a, x) => a + (x.ingredient || 0), 0)) + Object.keys(s.owned).reduce((a, id) => a + (UP[id].ingredient || 0), 0); }
  /* 가격 전쟁과 경쟁 대응 중 큰 할인 하나에 행사 할인을 더한다. 담합이 최우선이다. */
  function updateRival(s) { s.rivalPrice = s.lockedPrice || Math.max(T.rivalResponse.floor, s.rivalBase - Math.max(s.rivalCut, s.responseCut || 0) - (s.rivalSaleLeft > 0 ? s.rivalSale : 0)); }
  const rivalTaste = s => Math.min(T.rivalResponse.tasteMax, rivalOf(s).taste + (s.responseTaste || 0));
  function respondRival(s) {
    s.rivalNews = '';
    if (s.lockedPrice || s.rivalCut || s.rivalSaleLeft > 0) { s.leadDays = 0; return; }
    const h = s.history[s.history.length - 1], R = T.rivalResponse;
    if (!h || h.mineShare === undefined) return;
    const lead = h.mineShare - h.rivalShare;
    // R.from 일째 장사부터 손님 비율을 센다(처음 며칠은 대응하지 않음)
    if (s.day + 1 < (R.from || 1)) { s.leadDays = 0; return; }
    s.leadDays = lead > R.lead ? (s.leadDays || 0) + 1 : 0;
    if (s.leadDays >= R.days) {
      const priceFirst = s.rivalId === 'discount' || (s.rivalId === 'normal' && !(s.responseTurns % 2));
      const cut = Math.min(R.cutMax, s.rivalBase - R.floor, (s.responseCut || 0) + R.cutStep);
      const taste = Math.min(R.tasteMax - rivalOf(s).taste, (s.responseTaste || 0) + R.tasteStep);
      if (priceFirst && cut > (s.responseCut || 0)) {
        s.rivalNews = `왕떡볶이가 값을 ${cut - (s.responseCut || 0)}원 내렸어요!`; s.responseCut = cut;
      } else if (!priceFirst && taste > (s.responseTaste || 0)) {
        s.responseTaste = taste; s.rivalNews = '왕떡볶이에 신메뉴가 나왔어요!';
      }
      s.responseTurns = (s.responseTurns || 0) + 1; s.leadDays = 0;
    } else if (lead < -R.lead && ((s.responseCut || 0) || (s.responseTaste || 0))) {
      s.responseCut = Math.max(0, (s.responseCut || 0) - R.cutStep);
      s.responseTaste = Math.max(0, (s.responseTaste || 0) - R.tasteStep);
      s.rivalNews = '왕떡볶이가 원래 값과 메뉴로 조금 돌아갔어요.';
    }
  }
  function applyFx(s, fx) {
    if (!fx) return;
    if (fx.money) s.money += fx.money;
    if (fx.rep) s.rep = clampRep(s.rep + fx.rep);
    if (fx.fair) s.fair = clampFair(s.fair + fx.fair);
  }

  /* 선택지·사건이 가진 효과를 한 번에 적용 (rootId: 이 사슬을 시작한 사건) */
  function applyEffects(s, o, rootId) {
    const fx = { ...(o.fx || {}) };
    if (o.fine) fx.money = (fx.money || 0) - Math.round((o.fine[0] + o.fine[1] * s.cartelRev) / 1000) * 1000;
    applyFx(s, fx);
    if (o.unfair) s.stats.unfair++;
    if (o.lock) { s.lockedPrice = o.lock; s.rivalSaleLeft = 0; }
    if (o.unlock) { s.lockedPrice = null; s.rivalCut = 0; }
    if (o.truck !== undefined) { s.truck = o.truck; s.truckLeft = o.truck ? T.truck.days : 0; } // 푸드트럭은 며칠 장사하고 떠남
    if (o.rivalCut) s.rivalCut = o.rivalCut;
    if (o.rivalReset) s.rivalCut = 0;
    if (o.visitorsToday) s.visitorsToday = o.visitorsToday;
    if (o.visitors) s.mods.push({ visitors: o.visitors[0], left: o.visitors[1] });
    if (o.ingredient) addIngredient(s, o.ingredient[0], o.ingredient[1], rootId);
    if (o.clearIngredient) { s.mods = s.mods.filter(m => !(m.ingredient && m.tag === rootId)); updateIngredient(s); }
    if (o.taste) s.taste = Math.round((s.taste + o.taste) * 10) / 10;
    if (o.next) s.pending.push({ id: o.next[0], day: Math.min(T.dayCount - 1, s.day + o.next[1]), root: rootId });
    updateRival(s);
    return Object.keys(fx).length ? fx : null;
  }

  /* 하루 시작: 그날의 수요·공급 변화 적용, 오늘 일어날 사슬 사건 꺼내기(정보 사건은 바로 적용) */
  function morningEvents(s) {
    const d = day(s);
    if (d.ingredient) addIngredient(s, d.ingredient, d.ingredientDays, d.id);
    if (d.rivalSale && !s.lockedPrice) { s.rivalSale = d.rivalSale; s.rivalSaleLeft = d.rivalSaleDays; }
    const due = s.pending.filter(p => p.day <= s.day);
    s.pending = s.pending.filter(p => p.day > s.day);
    const out = [];
    for (const p of due) {
      const node = T.nodes[p.id];
      const { options, ...self } = node;
      const fx = applyEffects(s, self, p.root);
      if (!options) s.trail.push({ day: s.day, root: p.root, id: p.id, title: node.title, fx });
      out.push({ id: p.id, root: p.root, node, fx });
    }
    updateRival(s);
    return out;
  }
  /* 사슬 사건에서 고르기 */
  function chooseNode(s, ev, key) {
    const o = ev.node.options.find(x => x.key === key);
    const fx = applyEffects(s, o, ev.root);
    const ch = T.chains[ev.root];
    if (ch && ch.branch === ev.id && !s.found.includes(`${ev.root}:${key}`)) s.found.push(`${ev.root}:${key}`);
    s.trail.push({ day: s.day, root: ev.root, id: ev.id, title: ev.node.title, pick: o.label, fx });
    return { ...o, fx };
  }
  /* 그날의 선택 사건 고르기 */
  function choose(s, key) {
    const d = day(s), o = d.choice.options.find(x => x.key === key);
    s.choiceDone = s.day;
    const fx = applyEffects(s, o, d.id);
    s.trail.push({ day: s.day, root: d.id, id: d.id, title: d.title, pick: o.label, fx, start: true });
    return { ...o, fx };
  }

  function canBuy(s, id) {
    const u = UP[id];
    if (!u || (u.once && s.owned[id])) return false;
    return s.money >= u.cost;
  }

  /* 장사: 아이 한 명 한 명이 가게를 고른다 */
  function simulate(s, plan) {
    const r = rng(s.seed * 31 + s.day * 104729 + 17);
    const price = s.lockedPrice || plan.price, C = T.customer, rv = rivalOf(s), d = day(s);
    if (!canBuy(s, plan.upgrade)) plan = { ...plan, upgrade: null };
    const upCost = plan.upgrade ? UP[plan.upgrade].cost : 0;
    Object.assign(s, plannedState(s, plan));
    const V = expectedVisitors(s), cap = capacity(s);
    const others = [{ key: 'rival', price: s.rivalPrice, taste: rivalTaste(s), rep: rv.rep }];
    if (s.truck) others.push({ key: 'truck', ...T.truck });
    const kids = [], decisions = []; let want = 0;
    const counts = { mine: 0, rival: 0, truck: 0, none: 0, soldout: 0, budget: 0 };
    const cartel = !!s.lockedPrice, outside = cartel ? C.cartelOutside : C.outside;
    const pickBudget = () => { let x = r(); for (const [b, p] of C.budgets) { if ((x -= p) < 0) return b; } return C.budgets[C.budgets.length - 1][0]; };
    const gauss = () => (r() + r() + r() - 1.5) * C.noise * 1.4;
    for (let i = 0; i < V; i++) {
      let roll = r();
      const profile = C.profiles.find(p => (roll -= p.share) < 0) || C.profiles[C.profiles.length - 1];
      const budget = pickBudget(), pw = (C.priceW[0] + r() * (C.priceW[1] - C.priceW[0])) * profile.price, tw = C.tasteW * profile.taste;
      // 가격·용돈·푸드트럭 유무가 달라도 같은 아이의 취향은 그대로다.
      const noise = [gauss(), gauss(), gauss()], cartelPick = r();
      const mine = { key: 'mine', price, taste: s.taste, rep: s.rep };
      let uMine = price <= budget ? s.taste * tw + s.rep * C.repW - pw * price / 1000 + noise[0] : -Infinity;
      const us = others.map((o, j) => o.price <= budget ? o.taste * tw + o.rep * C.repW - pw * o.price / 1000 + (o.key === 'rival' ? profile.loyalty : 0) + noise[j + 1] : -Infinity);
      let bi = us.indexOf(Math.max(...us)), uBest = us[bi];
      /* 담합 중: 값이 같으니 두 가게가 손님을 반씩 나눈다 (푸드트럭은 따로 경쟁) */
      if (cartel) {
        const u = Math.max(uMine, us[0]), truckU = us.length > 1 ? us[1] : -Infinity;
        if (cartelPick < .5) { uMine = u; uBest = truckU; bi = 1; } else { uMine = -Infinity; uBest = Math.max(u, truckU); bi = truckU > u ? 1 : 0; }
      }
      const best = others[bi] || others[0];
      let choice;
      if (Math.max(uMine, uBest) < outside) choice = (price > budget && others.every(o => o.price > budget)) ? 'budget' : 'none';
      else choice = uMine >= uBest ? 'mine' : best.key;
      let reason = choice === 'budget' ? 'budget' : choice === 'none' ? 'expensive' : 'preference';
      let saving = 0;
      if (!['budget', 'none'].includes(choice)) {
        const chosen = choice === 'mine' ? mine : best;
        const alternative = choice === 'mine' ? best : mine;
        const factors = [
          ['taste', (chosen.taste - alternative.taste) * tw],
          ['price', (alternative.price - chosen.price) * pw / 1000],
          ['reputation', (chosen.rep - alternative.rep) * C.repW],
          ['loyalty', chosen.key === 'rival' ? profile.loyalty : 0],
          ['preference', choice === 'mine' ? noise[0] - noise[bi + 1] : noise[bi + 1] - noise[0]]
        ].sort((a, b) => b[1] - a[1]);
        reason = cartel && choice !== 'truck' ? 'cartel' : alternative.price > budget && chosen.price < alternative.price ? 'price' : factors[0][1] > 0 ? factors[0][0] : 'preference';
        if (reason === 'price') saving = alternative.price - chosen.price;
      }
      if (choice === 'mine') { want++; if (want > Math.min(plan.portions, cap)) choice = 'soldout'; }
      if (choice === 'soldout') reason = 'soldout';
      counts[choice]++;
      kids.push(choice);
      decisions.push({ choice, reason, profile: profile.id, budget, saving });
    }
    const served = counts.mine, turned = counts.soldout;
    const revenue = served * price, ingredientCost = plan.portions * s.ingredient, wage = wages(s);
    const profit = revenue - ingredientCost - T.rent - wage;
    s.money += profit;
    if (s.lockedPrice) s.cartelRev += revenue;
    const R = T.repRules;
    let dRep = R.tastePer * (s.taste - 3) - Math.min(R.turnedAwayMax, turned * R.turnedAwayEach);
    if (price <= 2500) dRep += R.cheapBonus;
    if (price >= 4000) dRep -= R.pricyPenalty * (price - 3500) / 1000;
    /* 유튜버: 맛이 4 이상이면 칭찬, 아니면 아쉬운 후기 */
    let youtuber = null;
    if (d.youtuber && served > 0) { youtuber = s.taste >= 4 ? 'good' : 'bad'; dRep += youtuber === 'good' ? 0.5 : -0.2; }
    s.rep = clampRep(s.rep + dRep);
    const leftover = plan.portions - served;
    s.stats.wasted += leftover;
    s.stats.maxServed = Math.max(s.stats.maxServed, served);
    if (profit - upCost < 0) s.stats.lossDays++;
    if (price <= 2000 && served > 40) s.stats.bulk = true;
    const res = { day: s.day, price, portions: plan.portions, upgrade: plan.upgrade, upCost, visitors: V, cap, counts, served, turned,
      leftover, revenue, ingredientCost, ingredient: s.ingredient, rent: T.rent, wage, profit, money: s.money, rep: s.rep, kids, decisions, rivalPrice: s.rivalPrice, truck: s.truck, cartel, youtuber };
    s.history.push({ day: s.day, price, served, profit, rep: s.rep, visitors: V, rivalPrice: s.rivalPrice, turned, leftover, portions: plan.portions, mineShare: want / V, rivalShare: counts.rival / V });
    s.lastPlan = { price: plan.price, portions: plan.portions, upgrade: null };
    return res;
  }

  /* 하루 끝: 다음 날로 */
  function choiceSummary(res) {
    const groups = {};
    for (const d of res.decisions || []) {
      const key = `${d.choice}:${d.reason}:${d.saving}`;
      if (!groups[key]) groups[key] = { ...d, count: 0 };
      groups[key].count++;
    }
    const lines = [];
    for (const choices of [['mine'], ['rival', 'truck'], ['none', 'budget', 'soldout']]) {
      const d = Object.values(groups).filter(g => choices.includes(g.choice)).sort((a, b) => b.count - a.count)[0];
      if (!d) continue;
      const shop = { mine: '우리 가게', rival: '왕떡볶이', truck: '푸드트럭' }[d.choice];
      const why = { taste: '맛이 더 좋아서', reputation: '평판이 더 좋아서', loyalty: '왕떡볶이 단골이라서', price: `${d.saving.toLocaleString('ko-KR')}원 더 싸서`, preference: '친구 따라', cartel: '두 가게가 같은 값이라서' };
      const text = d.reason === 'budget' ? '용돈이 모자라 안 사 먹었어요' : d.reason === 'expensive' ? '값에 비해 만족이 낮아 안 사 먹었어요' : d.reason === 'soldout' ? '다 팔려서 못 샀어요' : `${why[d.reason]} ${shop}로 갔어요`;
      lines.push({ ...d, text: `${text} (${d.count}명)` });
    }
    return lines;
  }
  function endDay(s) {
    respondRival(s);
    s.visitorsToday = 0;
    if (s.rivalSaleLeft > 0) s.rivalSaleLeft--;
    s.mods = s.mods.filter(m => --m.left > 0);
    if (s.truck && --s.truckLeft <= 0) s.truck = false;
    updateIngredient(s);
    updateRival(s);
    if (s.money < 0) { s.ended = 'closed'; return false; }
    if (s.day >= T.dayCount - 1) { s.ended = endingId(s); return false; }
    s.day++;
    s.offers = makeOffers(s);
    return true;
  }
  function endingId(s) {
    if (s.money < 0) return 'closed';
    const ok = {
      'money>=400000 && rep>=4 && fair>=80': s.money >= 400000 && s.rep >= 4 && s.fair >= 80,
      'money>=200000 && fair<60': s.money >= 200000 && s.fair < 60,
      'fair>=90 && rep>=3.5': s.fair >= 90 && s.rep >= 3.5,
      'money>=300000': s.money >= 300000,
      bankrupt: false, else: true
    };
    return T.endings.find(e => ok[e.when]).id;
  }
  /* 판이 끝났을 때 얻는 배지 — progress(지난 기록)는 이번 판 엔딩·경쟁 가게까지 합친 것 */
  function badgesFor(s, progress) {
    const done = s.ended && s.ended !== 'closed', got = [];
    if (s.ended === 'best') got.push('best');
    if (done && s.stats.unfair === 0) got.push('honest');
    if (done && s.stats.lossDays === 0) got.push('allProfit');
    if (done && s.stats.wasted <= 20) got.push('noWaste');
    if (s.stats.bulk) got.push('bulk');
    if (s.stats.maxServed > 70) got.push('fullHouse');
    if (Object.keys(T.rivals).every(id => (progress.rivals || []).includes(id))) got.push('rivals');
    if (T.endings.every(e => (progress.endings || []).includes(e.id))) got.push('allEndings');
    return got;
  }
  /* 사슬마다 갈래 수 */
  const branchCount = chainId => T.nodes[T.chains[chainId].branch].options.length;
  /* 저녁 선택 사건 (위생 점검을 했으면 머리카락 사건은 없음) */
  function eveningChoice(s) {
    const d = day(s);
    if (!d.choice || d.choice.at !== 'evening' || s.choiceDone === s.day) return null;
    if (d.cleanSkip && s.owned.clean) return null;
    return d.choice;
  }
  const morningChoice = s => (day(s).choice && day(s).choice.at === 'morning' && s.choiceDone !== s.day) ? day(s).choice : null;

  root.TteokEngine = { rng, newGame, makeSchedule, day, rivalOf, morningEvents, morningChoice, eveningChoice, choose, chooseNode, applyFx, canBuy, simulate, endDay,
    endingId, badgesFor, branchCount, capacity, wages, expectedVisitors, visitorMult, plannedState, rivalTaste, choiceSummary };
})(typeof window !== 'undefined' ? window : globalThis);
