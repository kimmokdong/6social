/* 무역왕 7.6 규칙 엔진: 일 단위 항해. DOM 없음(node에서 봇·테스트).
   tick = 다음 달 1일, advance/tickDay = 일 단위. 계절(3달)마다 생산·소비·점수·세계 값, 해(12달)마다 산업 쇠퇴·연말.
   학생 선택이 필요하면 G.pending에 걸고 멈춘다(choose로 풀기). */
(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./data.js') : root.TRADE, node ? require('./data6.js') : root.TRADE6);
  if (node) module.exports = api; else root.TradeEngine6 = api;
})(globalThis, function (T, S) {
  'use strict';
  const GOODS = S.goods.map((x, g) => g), RAW = GOODS.filter(g => S.goods[g].tier === 1), FOREVER = 1e9;   // RAW = 1차 물건(식량·석유·철광석)
  const X = S.economy, GN = g => S.goods[g].name;
  const V = S.rules79, card = id => S.cards.find(c=>c.id===id), owned = (n,id) => !!n.augments?.includes(id);
  // 7.9 콘셉트 모으기(SPEC-v79 3.3): 같은 콘셉트 카드 수(특성 카드도 한 장). on(n,'sea',2) = 2장 이상
  const CON = Object.fromEntries(S.cards.filter(c=>c.concept).map(c=>[c.id,c.concept]));
  const conCount = (n,c) => (n.augments||[]).filter(id=>CON[id]===c).length, on = (n,c,k) => !!n && !n.world && conCount(n,c)>=k;
  function concepts(n) {
    return S.concepts.map(c=>{const k=conCount(n,c.id);return {...c,count:k,cards:n.augments.filter(id=>CON[id]===c.id),bonus2:{text:c.b2,on:k>=2},bonus3:{text:c.b3,on:k>=3}};});
  }
  const mainConcept = n => concepts(n).filter(c=>c.count>=3).sort((a,b)=>b.count-a.count)[0]||null;
  const maxShips = n => X.maxShips + (S.countries[n.id].extraShip ? 1 : 0);
  // 8.4 항구 성장 점수에 무역량 길: 지금까지 사고판 상자 tradeGrow개마다 1점(tradeGrowMax점까지)
  const tradedBoxes = n => sum(n.exported || []) + sum(Object.values(n.importedFrom || {}));
  const tradeGrowth = n => Math.min(V.tradeGrowMax, Math.floor(tradedBoxes(n) / V.tradeGrow));
  const grownPoints = n => tradeGrowth(n)+sum(n.levels)-sum(n.startLevels||n.levels)+Math.max(0,n.ships.length-X.openShips-(S.countries[n.id].extraShip?1:0))+(n.warehouse?1:0)+(n.bigShip&&!S.countries[n.id].bigShip?1:0);
  const homeStage = n => Math.min(3,grownPoints(n)>=5?3:grownPoints(n)>=2?2:1);
  // 8.0 계절 점수는 100점까지 그대로, 100점 위는 overRate만큼만 쌓인다. 최종 점수 = 해마다 점수의 누적 합
  const overScore = raw => Math.max(0, Math.round(raw <= V.overFrom ? raw : V.overFrom + (raw - V.overFrom) * V.overRate));
  const totalScore = n => sum(n.years);
  // 풍요: 필요량 1배를 쌓으면 abundanceGood, 그 위로 1배마다 abundanceMore(효율이 떨어진다). 대표 물건은 창고가 생산량만큼 커서 abundanceTimes배까지만 센다
  const abundancePoints = k => k < 1 ? 0 : V.abundanceGood + (Math.min(k, V.abundanceTimes) - 1) * V.abundanceMore;
  const freshMeetings = () => ({years:[],free:1,traitSeen:false,offers:[]});
  const freshSmallBonus = () => ({tech:0,quality:0,cloth:0,score:0});
  const zeros = () => GOODS.map(() => 0);
  const sum = a => a.reduce((s, v) => s + v, 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function random(G) { G.rng = (Math.imul(G.rng, 1664525) + 1013904223) >>> 0; return G.rng / 4294967296; }
  function shuffle(G, a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random(G) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const pick = (G, a) => a[Math.floor(random(G) * a.length)];
  const step = g => Math.round(S.goods[g].price * .1);
  const event = id => S.events.find(e => e.id === id);
  const freshYear = () => ({prod: zeros(), imp: GOODS.map(() => ({})), exp: zeros(), tradeImp: zeros(), tradeExp: zeros(), moneyIn: 0, moneyOut: 0, penaltyIn: 0, penaltyOut: 0, penaltyDebt: 0, seasons: []});
  const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], monthDays = m => DAYS[m % 12];
  function cash(G, n, amount) {
    if (n.world) { n.money += amount; return 0; }
    const before = n.debt, paid = amount < 0 ? Math.min(n.money, -amount) : Math.min(n.debt, amount);
    if (amount < 0) { n.money -= paid; n.debt += -amount - paid; n.year.moneyOut += paid; }
    else { n.debt -= paid; n.money += amount - paid; n.year.moneyIn += amount; n.year.moneyOut += paid; }
    if (!before && n.debt) news(G, `${n.name}, 금고가 모자라 ${n.debt}억은 빚이 됐어요. 들어오는 돈으로 먼저 갚고, 빚이 남으면 정산 때 생활 점수가 깎여요.`, 'warn');
    if (before && !n.debt) news(G, `${n.name}, 빚을 모두 갚았어요!`, 'big');
    return Math.max(0, n.debt - before);
  }
  const debtLoss = n => Math.min(X.debtMax, Math.ceil((n.debt || 0) / X.debtStep) * X.debtPoints);
  const forecasts = new WeakMap();   // 저장 데이터와 난수는 건드리지 않는다
  // 출항일에서 실제 달 길이만큼 간다. 없는 날짜는 마지막 날(1월 31일 → 2월 28일).
  function daysFrom(m, d, months) { let days = 0; for (let i = 0; i < months; i++) days += monthDays(m + i); return days + Math.min(d, monthDays(m + months)) - d; }
  const tripDays = (G, months) => daysFrom(G.month, G.day, months);
  // 7.7 날짜 번호(1년째 1월 1일 = 0). 계약은 맺은 날부터 1년: 3월 5일에 맺으면 다음 해 3월 4일까지.
  const CUM = DAYS.map((_, i) => DAYS.slice(0, i).reduce((a, b) => a + b, 0));
  const dayNo = (m, d) => Math.floor(m / 12) * 365 + CUM[m % 12] + d - 1, today = G => dayNo(G.month, G.day);
  const dateOf = k => { let r = k % 365, m = 0; while (r >= DAYS[m]) r -= DAYS[m++]; return {month: Math.floor(k / 365) * 12 + m, day: r + 1}; };
  const dayText = k => { const {month, day} = dateOf(k); return `${Math.floor(month / 12) + 1}년째 ${month % 12 + 1}월 ${day}일`; };
  // 7.0 나라 특성(NATIONS-v7.md). 숫자는 data6 economy.trait. 나라 id로 켠다(NPC도 같은 규칙).
  const XT = S.economy.trait || {};
  const has = (n, id) => !!n && !n.world && n.id === id;
  const freshTrait = id => ({idleRun: 0, stops: 0, rusts: 0, weather: 1, next: 1, aids: 0, reserve: id === 'oil' ? XT.oilReserve : 0, stage: 0,
    empties: 0, tourism: 0, relay: 0, relayYear: 0, lux: 0, pollution: 0, cleaner: false});
  const oilStage = r => (XT.oilStages || []).filter(t => r < t).length;   // 160~81: 0 · 80~41: 1 · 40~1: 2 · 0: 3

  // ---------- 나라 ----------
  function makeNation(id, npc) {
    const c = T.countries.find(c => c.id === id), e = S.countries[id];
    return {id, npc, name: c.name, pop: c.workers, quality: GOODS.map(g => (e.quality || c.quality)[g] ?? 2), levels: [...e.levels], startLevels: [...e.levels], main: e.main, bonus: e.bonus,
      money: X.startMoney, debt: 0, box: GOODS.map(() => [0, 0, 0, 0]), protect: zeros(), fta: [], mods: [], ships: [],
      warehouse: false, bigShip: !!e.bigShip, expo: false, closed: GOODS.map(() => false), detour: 0, year: freshYear(), declineRun: zeros(), short: {}, exported: zeros(),
      history: [], importedFrom: {}, exportedTo: {}, earnedTotal: 0, spentTotal: 0,   // 6.6 결과 책용 기록
      trait: freshTrait(id), renewable: false, augments:[], meetings:freshMeetings(), investment:[], signedWith:{}, brandBuyer:null, smallBonus:freshSmallBonus(),
      seasons: [], years: [], score: 0, strategy: null};
  }
  const makeWorld = () => ({id: 'world', world: true, npc: true, name: S.world?.name || '먼 바다 상인', quality: GOODS.map(() => 2), money: FOREVER, fta: [], mods: [], bonus: null, bought: {}});
  const player = G => G.nations[0];
  const nation = (G, id) => id === 'world' ? G.world : G.nations.find(n => n.id === id);
  const rel = (G, a, b) => G.rel[a.id ?? a]?.[b.id ?? b] ?? 0;
  function addRel(G, a, b, d) {
    const x = a.id ?? a, y = b.id ?? b;
    if (x === 'world' || y === 'world' || x === y) return;
    if (d < 0 && nation(G, x).fta.includes(y)) return;
    if (d > 0 && G.rel[x][y] === 0) return;   // 거래 거절은 새해에만 푼다
    const floor = [x, y].some(id => owned(nation(G, id), 'fta2')) ? V.ftaFloor : 0;   // 자유 무역 지대: ♥1 아래로 안 떨어짐
    G.rel[x][y] = G.rel[y][x] = clamp(G.rel[x][y] + d, Math.min(floor, G.rel[x][y]), X.relMax);
  }
  const active = (m, G) => m.until > G.month && (m.from ?? 0) <= G.month;
  const modSum = (G, n, kind, g) => sum(n.mods.filter(m => m.kind === kind && m.g === g && active(m, G)).map(m => m.v));
  const isProtected = (G, n, g) => !n.world && n.protect[g] > G.month;

  const baseNeed = (pop, g) => S.goods[g].need > 0 ? Math.max(1, Math.round(S.goods[g].need * (3 + pop / 2))) : 0;
  // 국민 필요량. 비율이 0인 물건(철광석·철강)은 국민이 안 쓴다(공장만 쓴다). 바구니 점수도 그 물건은 세지 않는다.
  const CONSUMER = GOODS.filter(g => S.goods[g].need > 0);
  function needs(G, n) { return S.goods.map((x, g) => x.need > 0 ? Math.max(1, baseNeed(n.pop, g) + modSum(G, n, 'need', g)) : 0); }
  function levelOf(G, n, g) {
    const lv = Math.max(0, n.levels[g] + modSum(G, n, 'level', g));
    // 유전이 바닥나면(3단계) 석유 산업을 키워도 1단계(3상자)만 나온다
    if (!has(n, 'oil') || g !== 1 || !n.trait.stage) return lv;
    const st = Math.max(0,n.trait.stage-(owned(n,'refinery')?V.refineryStages:0));
    return st >= 3 ? Math.min(1, lv) : Math.max(Math.min(1, lv), lv - st);
  }
  const produces = (G, n, g) => levelOf(G, n, g) * S.goods[g].load;
  // 6.4 투입 사다리(economy.chain = [[재료, 제품], ...]): 제품 공장은 계절마다 만들 상자 수 × inputPer만큼 재료를 쓴다. 국민 필요량과 따로 센다.
  const CHAIN = X.chain || [], PER = X.inputPer || 0, PRODUCTS = CHAIN.map(c => c[1]);
  const inputOf = p => { const c = CHAIN.find(c => c[1] === p); return c ? c[0] : null; };
  const perOf = (n, p) => (n && n.id === 'daon' && p === 3 ? owned(n,'semiconductor')?V.semiconductorPer:XT.daonPer??PER : PER)*(owned(n,'automation')?V.automation:1);
  const productsOf = m => CHAIN.filter(c => c[0] === m).map(c => c[1]);
  // 창고가 차면 공장이 쉬므로(factoryIdle) 실제로 쓰는 재료는 "만들 수 있는 양"과 "창고 빈자리" 중 작은 쪽 기준이다.
  // (제품 창고 한도는 국민 필요량 기준으로 따로 센다. cap → uses → inputNeed → cap 순환을 피한다.)
  const roomOf = (G, n, p) => X.factoryIdle ? Math.max(0, capOf(G, n, p, needs(G, n)[p]) - count(n, p)) : produces(G, n, p);
  const planned = (G, n, p) => Math.min(produces(G, n, p), roomOf(G, n, p));
  const inputNeed = (G, n, g) => n.world ? 0 : sum(productsOf(g).map(p => Math.ceil(planned(G, n, p) * perOf(n, p))));
  // 쓰는 양 = 국민 필요량 + 공장 투입. 남는 물건·모자란 물건·팔 수 있는 양은 모두 이 기준이다.
  const uses = (G, n) => needs(G, n).map((q, g) => q + inputNeed(G, n, g));
  const count = (n, g) => n.world ? 999 : sum(n.box[g]);
  function add(n, g, qty, q) { if (!n.world && qty > 0) n.box[g][clamp(q, 1, 3)] += qty; }
  function take(n, g, qty, best = false) {
    let left = qty, qsum = 0;
    for (const q of best ? [3, 2, 1] : [1, 2, 3]) { const t = Math.min(left, n.box[g][q]); n.box[g][q] -= t; left -= t; qsum += t * q; }
    return {qty: qty - left, qsum};
  }
  const capOf = (G, n, g, q) => q * (owned(n, 'plenty') ? V.plentySeasons : n.warehouse ? X.warehouseSeasons : X.storeSeasons) + produces(G, n, g);
  const cap = (G, n, g) => capOf(G, n, g, uses(G, n)[g]);
  // 구조적으로 남는 물건(팔아요) / 모자란 물건(필요해요)
  const sells = (G, n, g) => n.world || produces(G, n, g) > uses(G, n)[g];
  const buys = (G, n, g) => n.world || uses(G, n)[g] > produces(G, n, g) || G.nations.some(o=>o!==n && o.brandBuyer===n.id && o.main===g);
  const isDump = (G, buyer, g) => !buyer.world && !buys(G, buyer, g);
  const dumpPrice = (G, seller, buyer, g) => Math.max(1, Math.floor(price(G, buyer, seller, g) / 2));
  const exportPrice = (G, seller, buyer, g) => isDump(G, buyer, g) ? dumpPrice(G, seller, buyer, g) : price(G, seller, buyer, g);
  // 팔 수 있는 양: 이번 계절 생산으로 못 채우는 몫만 남겨 둔다.
  const exportable = (G, n, g) => n.world ? 999 : Math.max(0, count(n, g) - Math.max(0, uses(G, n)[g] - produces(G, n, g)));
  // 7.0 중계 무역: 항구 섬나라는 사 온 물건(안 남는 물건)도 다른 섬에 되팔 수 있다. 되판 상자는 값 +15%.
  const isRelay = (G, n, g) => has(n, 'port') && !sells(G, n, g);
  const canGive = (G, n, g) => sells(G, n, g) || isRelay(G, n, g) && (count(n, g) > 0 || n.ships.some(s => s.route?.give[g]));
  function room(G, buyer, seller, g) {
    if (buyer.world) return Math.max(0, X.worldLimit - (buyer.bought[seller.id]?.[g] || 0));
    return Math.max(0, cap(G, buyer, g) - count(buyer, g));
  }

  // ---------- 값 ----------
  function worldPrice(G, g) {
    const mult = G.mods.filter(m => (m.g === g || m.g === -1) && active(m, G)).reduce((p, m) => p * m.mult, 1);
    const pulse = (G.pricePulses||[]).filter(p=>p.good===g && p.from<=today(G) && p.until>today(G)).reduce((a,p)=>a*p.mult,1);
    const floor=Math.max(0,...(G.pricePulses||[]).filter(p=>p.good===g&&p.from<=today(G)&&p.until>today(G)).map(p=>p.minPrice||0));
    return Math.max(1, floor, Math.round(G.base[g] * mult * pulse));
  }
  // seller가 buyer에게 g 한 상자를 파는 계약값
  function price(G, seller, buyer, g) {
    let p = worldPrice(G, g);
    if (seller.world) return Math.max(1,Math.round(p * X.worldSell * ((G.northSaleUntil||0)>today(G)?V.small.north:1) * (owned(buyer,'survey')?1-V.survey:1) * (owned(buyer,'autarky')?V.autarkyPrice:1)));
    // 7.0 특성 값: 석유 왕국 석유 +20%, 중계 +15%(상인에게도), 명품 +30%(나라에게만), 큰 시장국에 팔면 −10%
    const tm = (has(seller, 'oil') && g === 1 ? XT.oilSell*(owned(seller,'refinery')?1+V.refinery:1) : 1) * (isRelay(G, seller, g) ? XT.relayBonus*(owned(seller,'relayStore')?1+V.relay:1) : 1) * (g===seller.main?(on(seller,'factory',2)?1+V.c2.factory:1)*(owned(seller,'brand')?1+V.brandPrice:1):1) * (g===3&&on(seller,'tech',2)?1+V.c2.tech:1) * (on(seller,'merchant',3)?1+V.c3.merchant:1);
    if (buyer.world) return Math.max(1, Math.round(p * X.worldBuy * tm * (owned(seller,'survey')?1+V.survey:1)));
    const s = step(g), r = benefitRel(G,seller,buyer);
    p += s * (seller.quality[g] - 2) + (seller.expo && g === seller.main ? s : 0);
    if (isProtected(G, buyer, g) && !buyer.fta.includes(seller.id)) p += 2 * s;
    if (r >= 3) p -= s * (seller.bonus === 'discount' ? 2 : 1);
    if (modSum(G, buyer, 'exchange', -1)) p = p * 1.5;
    if (modSum(G, seller, 'exchange', -1)) p = p * 1.2;
    if (modSum(G, seller, 'retaliated', -1)) p = p * .9;
    p *= laneMul(G, seller, buyer) * tm * (has(seller, 'artisan') && seller.quality[g] === 3 ? XT.luxBonus : 1) * (has(buyer, 'market') ? XT.marketDiscount : 1) * (owned(seller,'survey')?1+V.survey:1) * (owned(buyer,'survey')?1-V.survey:1) * (owned(buyer,'autarky')?V.autarkyPrice:1);
    return Math.max(1, Math.round(p));
  }
  // 8.1 항로 특징(우리 배만): 해적 바다 섬에서 사면 싸고, 폭풍 바다 섬에 팔면 비싸다
  const laneOf = (G, n, to) => n === player(G) ? G.lanes?.[to] || null : null;
  const laneMul = (G, seller, buyer) => laneOf(G, buyer, seller.id) === 'pirates' ? 1 - V.lanePrice : laneOf(G, seller, buyer.id) === 'storm' ? 1 + V.lanePrice : 1;
  const benefitRel = (G,a,b) => rel(G,a,b)>=2&&(on(a,'diplomat',2)||on(b,'diplomat',2))?3:rel(G,a,b);
  // 7.9 달마다 실제 세계값 여섯 개만 보관한다.
  function recordPrices(G) { for(const g of GOODS){ const a=G.priceHistory[g], p={month:G.month,price:worldPrice(G,g)}; if(a.at(-1)?.month===G.month)a[a.length-1]=p;else a.push(p);while(a.length>6)a.shift(); } }
  function priceSignal(G,g,p=worldPrice(G,g),n=player(G)) {
    const a=(G.priceHistory?.[g]||[]).map(x=>x.price), lo=Math.min(...a,p), hi=Math.max(...a,p), trend=a.length>1?Math.sign(a.at(-1)-a.at(-2)):0;
    const cheapness=hi===lo?'보통':p<=lo+(hi-lo)/3?'싼 편':p>=hi-(hi-lo)/3?'비싼 편':'보통';
    const horizon=owned(n,'survey')?2:1, upcoming=(G.pricePulses||[]).filter(x=>x.good===g&&x.from>today(G)&&x.from<=today(G)+horizon*31).map(x=>({day:x.from,mult:x.mult}));
    return {trend,arrow:trend>0?'▲':trend<0?'▼':'',cheapness,text:`최근 6달 중 ${cheapness}`,upcoming,horizon};
  }
  function updatePrices(G) {
    G.trend = GOODS.map(g => {
      const have = sum(G.nations.map(n => count(n, g))), need = sum(G.nations.map(n => uses(G, n)[g]));
      G.drift[g] = clamp(G.drift[g] + (random(G) - .5) * X.drift, -1, 1);
      // 아무도 안 쓰는 물건(공장이 다 쉴 때의 철광석·철강)은 재고가 있으면 남아도는 것으로 본다.
      const ratio = need ? have / need : have ? 2 : 1;
      const f = clamp((X.priceTarget ?? 1) - ratio + G.drift[g], -1, 1.5), old = G.base[g];
      G.base[g] = Math.max(1, Math.round(S.goods[g].price * (1 + S.goods[g].vol * f)));
      return Math.sign(G.base[g] - old);
    });
  }

  // ---------- 배와 계약 ----------
  // 항로 = {to, give:[물건별 상자], get:[물건별 상자]}. 배 한 척은 가는 길·오는 길 각각 slots칸, 1칸 = 1상자.
  const none = () => zeros();
  const boxes = (v, k) => v == null ? none() : Array.isArray(v) ? GOODS.map(g => Math.max(0, Math.floor(v[g] || 0))) : GOODS.map(g => g === v ? k : 0);
  // 물건 하나만 주면(옛 방식) 그 물건으로 칸을 다 채운다.
  function norm(G, n, r) { const o = r && nation(G, r.to), k = slotsOf(G, n, o); return r && {to: r.to, give: boxes(r.give, k), get: boxes(r.get, k)}; }
  const firstGood = a => a.findIndex(v => v > 0);
  function tripTime(G, n, to) {
    // 대선단: 3달 넘게 걸리는 항로 −1달 · 바다의 개척자 3장: 모든 왕복 −1달
    const cut = base => (owned(n,'armada')&&base>=V.armadaFrom?1:0)+(on(n,'sea',3)?V.c3.sea:0);
    if (to === 'world') return Math.max(1,X.worldTrip-(owned(n,'navigator')?V.navigator:0)-cut(X.worldTrip)+modSum(G,n,'trip',-1));
    const o = nation(G, to), base = n === player(G) ? G.dist[to] : o === player(G) ? G.dist[n.id] : 2 + (G.nations.indexOf(n) + G.nations.indexOf(o)) % 2;
    return Math.max(1, base + (n.npc ? X.npcTripExtra : 0) - cut(base) - (benefitRel(G, n, o) >= 3 && (o.bonus === 'fast' || n.bonus === 'fast') ? 1 : 0) + modSum(G, n, 'trip', -1));
  }
  const slotsOf = (G, n, o) => X.shipSlots + homeStage(n) - 1 + (n.bigShip ? X.bigShipSlots : 0) + (owned(n,'armada')?V.armadaSlots:0) + (on(n,'sea',2)?V.c2.sea:0) + (o && o.bonus === 'bigBuyer' && benefitRel(G, n, o) >= 3 ? 1 : 0);
  // 8.3 상대가 지킬 수 있는 양(왕복마다 상자): 계절마다 남는 양(만듦 − 씀 − 다른 배들이 이미 약속받은 양 − 자기 배가 내보내는 양)에
  // 지금 재고를 1년(4계절)에 나눠 더한다. 판매 나라는 이 양까지만 계약을 받아 준다(NPC도 같은 셈으로 계약한다).
  // shortcut: 재고 몫(재고/4)은 같은 날 맺는 여러 계약이 함께 쓸 수 있다. 위약금이 다시 자주 나오면 재고 약속도 따로 센다.
  function supplyCap(G, n, ship, o, g, seller = o) {
    if (seller.world) return 99;
    const on = (m, s) => s !== ship && s.route;
    const flow = (m, dir, to) => sum(m.ships.filter(s => on(m, s) && (!to || s.route.to === to)).map(s => s.route[dir][g] * 3 / (s.tripMonths || tripTime(G, m, s.route.to))));
    const spare = produces(G, seller, g) - uses(G, seller)[g] - sum(G.nations.map(m => flow(m, 'get', seller.id))) - flow(seller, 'give');
    return Math.max(0, Math.floor((spare + exportable(G, seller, g) / 4) * tripTime(G, n, o.id) / 3));
  }
  function allowed(G, n, r, ship) {
    const o = r && nation(G, r.to);
    if (!o || o === n || !o.world && rel(G, n, o) === 0) return false;
    const {give, get} = norm(G, n, r), k = slotsOf(G, n, o);
    if (!sum(give) && !sum(get) || sum(give) > k + (owned(n,'relayStore')&&GOODS.some(g=>give[g]&&isRelay(G,n,g))?V.relaySlots:0) || sum(get) > k) return false;
    if (has(n, 'artisan') && GOODS.some(g => give[g] > (owned(n,'luxStreet')?V.luxMax:XT.luxMax) && n.quality[g] === 3 && !o.world)) return false;
    return GOODS.every(g => !(give[g] && get[g]) && (!give[g] || (canGive(G, n, g) || n === player(G) && !o.world) && (buys(G, o, g) || n === player(G))) && (!get[g] || sells(G, o, g) && get[g] <= supplyCap(G, n, ship, o, g)));
  }
  function sign(G, n, ship, r) {
    if (!allowed(G, n, r, ship)) return false;
    const o = nation(G, r.to), {give, get} = norm(G, n, r);
    // 7.7 계약은 맺은 날부터 1년(철의 나라 철광석·철강 계약은 2년), 그동안 값 고정. 중계·명품 상자는 계약할 때 표시해 둔다(기록용).
    const long = (has(n, 'ironland') || has(o, 'ironland')) && [4, 5].some(g => give[g] || get[g]);
    const repeat=n.signedWith[o.id]||0, discount=owned(n,'regular')?Math.min(V.regularMax,repeat*V.regular):0;
    ship.route = {to: r.to, give, get, gp: GOODS.map(g => give[g] ? exportPrice(G, n, o, g) : 0), bp: GOODS.map(g => get[g] ? price(G, o, n, g) : 0), dump: GOODS.map(g => !!give[g] && isDump(G, o, g)),
      until: today(G) + 365 * (long ? XT.longYears || 2 : 1) - 1, trips: 0, done: 0, signedDay: today(G), signed: G.month + (G.day - 1) / monthDays(G.month) + random(G) * .0001, traded: 0, stake: 0,
      relay: GOODS.map(g => !!give[g] && isRelay(G, n, g)), lux: GOODS.map(g => !!give[g] && has(n, 'artisan') && n.quality[g] === 3 && !o.world)};
    ship.route.trips = fitTrips(G, n, ship.route);
    ship.route.gp=ship.route.gp.map(p=>Math.max(p?1:0,Math.round(p*(1+discount))));
    ship.route.bp=ship.route.bp.map(p=>Math.max(p?1:0,Math.round(p*(1-discount))));
    n.signedWith[o.id]=repeat+1;
    const g = firstGood(get) >= 0 ? firstGood(get) : firstGood(give);
    if (n !== player(G) && !o.world && random(G) < .5) news(G, `${n.name}, ${o.name}와 ${GN(g)} 계약!`, 'npc');
  }
  // 7.7 끝나는 날(until)까지 다녀올 수 있는 왕복 수(오늘 떠난다고 보고 센다). 끝난 다음 날 아침 도착까지 친다: 2달 왕복 × 6번 = 꼭 1년
  function fitTrips(G, n, r, k = today(G)) {
    const months = tripTime(G, n, r.to); let c = 0;
    if (!Number.isInteger(r.until)) return 0;
    for (;;) { const {month, day} = dateOf(k), T = daysFrom(month, day, months); if (k + T > r.until + 1) return c; c++; k += T; }
  }
  // 8.2 계약서 창고 전망: 오늘부터 이 계약이 끝날 때까지 하루씩 따라가며 물건마다 만듦·씀·다른 계약·이 계약을 더하고,
  // 창고가 처음 모자라는 날을 찾는다. 사건·폭풍·상대 재고 같은 우연은 빼고 지금 계약 그대로 센다.
  function outlook(G, n, ship, r, from, until) {
    const t0 = today(G), flow = GOODS.map(() => new Map()), mine = none(), others = none(), o = nation(G, r.to);
    // 끝난 다음 날 아침 도착까지 이 계약으로 친다(fitTrips와 같음). 그날 밤 마지막 정산이 이어진다
    const at = (k, g, q) => { if (q && k <= until + 1) flow[g].set(k, (flow[g].get(k) || 0) + q); };
    // 한 계약의 남은 왕복: 떠나는 날 수출을 빼고 돌아오는 날 수입을 더한다(fitTrips와 같은 날짜 셈)
    const run = (R, k, end, sink) => {
      const months = tripTime(G, n, R.to); let trips = 0;
      for (;;) {
        const {month, day} = dateOf(k), T = daysFrom(month, day, months);
        if (k + T > end + 1) return {trips, k};
        for (const g of GOODS) {
          const out = R.dump?.[g] ? Math.min(2, R.give[g]) : R.give[g];
          at(k, g, -out); at(k + T, g, R.get[g]);
          if (k <= until) sink[g] -= out;
          if (k + T <= until + 1) sink[g] += R.get[g];
        }
        trips++; k += T;
      }
    };
    for (const s of n.ships) {
      if (!s.route) continue;
      let k = t0;
      if (s.state === 'sea') {   // 바다에 있는 배는 돌아오는 날 수입을 내려놓고 그날부터 남은 왕복을 이어 간다
        k = t0 + s.T - s.t;
        const got = s.cargo && s.t >= s.arrive ? s.cargo.get : s.route.get;
        for (const g of GOODS) { at(k, g, got[g]); if (k <= until + 1) others[g] += got[g]; }
      }
      const last = run(s.route, k, s.route.until, others);
      if (s.next && s !== ship) run(s.next, last.k, last.k + 364, others);
    }
    const trips = run({...r, dump: GOODS.map(g => !!r.give[g] && isDump(G, o, g))}, from, until, mine).trips;
    // 3·6·9·12월 말 정산은 다음 날로 넘어갈 때 그날 배가 오간 뒤에 한다(tickDay 순서)
    const use = uses(G, n), settle = new Set();
    for (let k = t0; k <= until; k++) { const {month, day} = dateOf(k); if (day === monthDays(month) && month % 3 === 2) settle.add(k + 1); }
    return {trips, seasons: settle.size, goods: GOODS.map(g => {
      // 정산 날은 배가 오간 뒤 만든 것을 넣고 쓰는 양을 빼고, 창고 한도를 넘친 만큼 버린다(season과 같은 순서). short = 모자란 상자 합계
      const net = produces(G, n, g) - use[g], top = cap(G, n, g), days = [...new Set([...flow[g].keys(), ...settle])].sort((a, b) => a - b);
      let stock = count(n, g), short = 0, lowDay = null, waste = 0;
      for (const k of days) {
        stock += flow[g].get(k) || 0;
        if (settle.has(k)) { stock += net; if (stock > top) { waste += stock - top; stock = top; } }
        if (stock < 0) { short -= stock; lowDay ??= settle.has(k) ? k - 1 : k; stock = 0; }   // 모자란 만큼은 못 싣거나 못 써요(빚처럼 이어지지 않음)
      }
      return {stock: count(n, g), made: produces(G, n, g) * settle.size, used: use[g] * settle.size, others: others[g], mine: mine[g], waste, end: stock, short, shortDay: lowDay};
    })};
  }
  function endContract(G, n, ship, broken) {
    const r = ship.route, o = nation(G, r.to);
    // 8.3 상대가 약속을 못 지킨 계약(r.failed)은 깨도 신뢰가 줄지 않는다
    if (broken) { if (!r.failed) { addRel(G, n, o, -1); if (n === player(G)) G.stats.breaks++; } }
    else if (r.traded > 0 && !o.world) {
      // 7.0 대평원 원조: 받아 올 것 없이 보내기만 한 계약은 끝나면 ♥+2
      const aid = has(n, 'plains') && !sum(r.get) && sum(r.give) > 0;
      // 8.3 계약으로 오르는 ♥는 두 나라 사이에 1년(1~12월)에 한 번만. 배 여러 척 계약이 같은 해에 끝나도 한 번
      const key = [n.id, o.id].sort().join('|'), y = Math.floor(G.month / 12);
      if ((G.relYear ??= {})[key] !== y) { G.relYear[key] = y; addRel(G, n, o, aid ? XT.aidRel : 1); }
      if (aid) n.trait.aids++;
    }
    if (n === player(G)) G.contracts.push({stake: r.stake, broken, done: r.done});
    const next = ship.next;
    ship.route = null; ship.next = null; ship.breaking = false;
    const renew = r => allowed(G, n, r, ship) && GOODS.every(g => !r.give[g] || !isDump(G, nation(G, r.to), g) || r.dump?.[g]);
    if (next && !nation(G, next.to)?.world && rel(G, n, next.to) === 0) { ship.retry = G.month + 1; news(G, `${n.name}의 예약을 취소했어요. ${nation(G, next.to).name}와 거래 거절 · 새해에 다시 거래해요. 배는 쉬어요.`, 'warn'); }
    else if (next && renew(next)) sign(G, n, ship, next);   // 예약한 새 계약(그날부터 1년, 그날 값)
    // NPC는 계약이 끝나면 그날 끝(npcPick)에 시장을 보고 다시 고른다
    // 7.7 학생 계약은 자동으로 다시 맺지 않는다: 1년마다 주변 나라 값을 다시 살펴보게
    else if (n === player(G)) news(G, broken ? `배 ${n.ships.indexOf(ship) + 1}이 쉬고 있어요. 새 항로를 정해 주세요.` : `배 ${n.ships.indexOf(ship) + 1}의 계약이 끝났어요(${dayText(r.until)}). 주변 나라 값을 다시 살펴보고 새 계약을 맺어요.`, 'warn');
  }
  function sellable(G, o, buyer, g, base = exportable(G, o, g)) {
    const cut = G.cut;
    if (o.world) return cut && cut.until > G.month && cut.good === g ? 0 : 999;
    if (!cut || cut.until <= G.month || cut.source !== o.id || cut.good !== g || on(buyer, 'self', 3)) return base;
    // 분쟁 중에는 ♥3 나라와 '돌아가는 길'을 고른 나라만 절반을 받는다. crisisKeep 혜택이면 ♥3에 다 받는다.
    if (benefitRel(G, buyer, o) >= 3 && o.bonus === 'crisisKeep') return base;
    return benefitRel(G, buyer, o) >= 3 || buyer.detour > G.month ? Math.floor(base / 2) : 0;
  }
  const eventShort = (G, n, g) => !!(G.cut && G.cut.until > G.month && G.cut.good === g && (n.world || G.cut.source === n.id)) || !n.world && modSum(G, n, 'level', g) < 0;
  function penalty(G, seller, buyer, g, qty, p, list) {
    if (qty <= 0 || seller.world || buyer.world || eventShort(G, seller, g)) return;
    const amount = Math.ceil(Math.max(qty, Math.ceil(qty * p * .3)) * (on(seller, 'diplomat', 3) ? V.c3.penalty : 1)), reason = '재고 부족';
    const debt = cash(G, seller, -amount); cash(G, buyer, amount); seller.year.penaltyOut += amount; buyer.year.penaltyIn += amount;
    seller.year.penaltyDebt += debt;
    list.push({good: g, qty, amount, reason, ...(debt ? {debt} : {})});
    news(G, buyer === player(G) ? `${seller.name}이 ${GN(g)} ${qty}상자를 못 줘서 위약금 +${amount}억을 받았어요.` : seller === player(G) ? `${GN(g)} ${qty}상자를 못 실어 ${buyer.name}에 위약금 −${amount}억을 냈어요.` : `${seller.name}이 ${buyer.name}에 ${GN(g)} ${qty}상자 부족 위약금 ${amount}억을 냈어요.` + (debt ? ` 금고가 모자라 ${debt}억은 빚이 됐어요.` : ''), 'warn');
  }
  function depart(G, n, ship) {
    const r = ship.route, o = nation(G, r.to);
    const load = GOODS.map(g => Math.min(r.give[g], sellable(G, n, o, g, n === player(G) && !o.world && !canGive(G, n, g) ? count(n, g) : exportable(G, n, g)))), penaltyOut = [];
    // 수출을 약속했는데 한 상자도 못 실으면 기다린다(두 번 놓치면 ♥−1). 조금이라도 있으면 실을 만큼 싣고 떠난다.
    if (sum(r.give) && !sum(load)) {
      if (ship.retry > G.month) return;
      ship.waited++;
      ship.retry = G.month + 1;
      if (ship.waited === X.missLimit) { addRel(G, n, o, -1); if (n === player(G)) { G.stats.misses++; news(G, `${GN(firstGood(r.give))} 부족으로 배가 두 번 못 떠났어요. ${o.name}이 서운해해요. 신뢰 −1 · ♥0이 되면 새해까지 거래를 안 해요.`, 'warn'); } }
      return;
    }
    for (const g of GOODS) if (r.give[g]) penalty(G, n, o, g, Math.max(0, Math.min(r.give[g], o.world ? 999 : Math.floor(o.money / r.gp[g])) - load[g]), r.gp[g], penaltyOut);
    ship.cargo = {give: GOODS.map(g => take(n, g, load[g]).qty), get: none(), q: GOODS.map(() => 2), sold: none(), earned: 0, spent: 0, shortages: [], penaltyIn: [], penaltyOut};
    ship.retry = 0;
    ship.waited = 0; ship.state = 'sea'; ship.t = 0; ship.tripMonths = tripTime(G, n, r.to); ship.T = tripDays(G, ship.tripMonths);
    const lane = laneOf(G, n, r.to);
    if (lane === 'current') ship.T = Math.max(2, ship.T - V.laneFast);
    if (lane === 'storm' && random(G) < V.stormChance) { ship.T += V.stormDelay; ship.cargo.laneNotes = [`⛈ 폭풍을 만나 ${V.stormDelay}일 늦어요`]; news(G, `⛈ ${o.name} 가는 길에 폭풍! 배가 ${V.stormDelay}일 늦어요.`, 'warn'); }
    ship.arrive = Math.ceil(ship.T / 2);
  }
  function trade(G, n, ship) {
    const r = ship.route, o = nation(G, r.to), c = ship.cargo;
    for (const g of GOODS) if (c.give[g]) {
      const qty = Math.max(0, Math.min(c.give[g], r.dump?.[g] ? 2 : room(G, o, n, g), o.world ? 999 : Math.floor(o.money / r.gp[g])));
      cash(G, o, -qty * r.gp[g]); cash(G, n, qty * r.gp[g]); add(o, g, qty, n.quality[g]); c.give[g] -= qty; n.year.exp[g] += qty; n.exported[g] += qty;
      n.year.tradeExp[g] += qty; if (!o.world) o.year.tradeImp[g] += qty;
      n.exportedTo[o.id] = (n.exportedTo[o.id] || 0) + qty; n.earnedTotal += qty * r.gp[g];
      if (r.relay?.[g]) { n.trait.relay += qty * r.gp[g]; n.trait.relayYear += qty * r.gp[g]; }
      if (r.lux?.[g]) n.trait.lux += qty;
      c.sold[g] += qty; c.earned += qty * r.gp[g];
      if(exportBonus(n))cash(G,n,qty*exportBonus(n));
      if (o.world) { (o.bought[n.id] ??= none())[g] += qty; if (n === player(G) && o.bought[n.id][g] >= X.worldLimit && G.stats) G.stats.worldCap = true; }
      r.traded += qty; r.stake += Math.abs(r.gp[g] - exportPrice(G, n, o, g)) * qty;
    }
    for (const g of GOODS) if (r.get[g]) {
      const supply = sellable(G, o, n, g), affordable = Math.floor(n.money / r.bp[g]);
      const qty = Math.max(0, Math.min(r.get[g], supply, affordable));
      penalty(G, o, n, g, Math.max(0, Math.min(r.get[g], affordable) - qty), r.bp[g], c.penaltyIn);
      if (supply < r.get[g]) r.failed = true;
      if (qty < r.get[g]) {
        const reasons = [];
        if (supply < r.get[g]) reasons.push(supply < exportable(G, o, g) ? '공급 끊김' : '상대 재고 부족');
        if (affordable < Math.min(r.get[g], supply)) reasons.push('우리 금고 부족');
        c.shortages.push({good: g, qty: r.get[g] - qty, reason: reasons.join(' · ')});
      }
      if (!o.world) take(o, g, qty);
      cash(G, o, qty * r.bp[g]); cash(G, n, -qty * r.bp[g]); c.get[g] = qty; c.q[g] = o.quality[g];
      if (!o.world) o.year.tradeExp[g] += qty;
      if(!o.world&&exportBonus(o))cash(G,o,qty*exportBonus(o));
      c.spent += qty * r.bp[g];
      r.traded += qty; r.stake += Math.abs(r.bp[g] - price(G, o, n, g)) * qty;
    }
    const got = GOODS.filter(g => c.get[g] > 0);
    if (laneOf(G, n, r.to) === 'pirates' && got.length && random(G) < V.pirateChance) {
      const g = pick(G, got); c.get[g]--;
      (c.laneNotes ??= []).push(`🏴‍☠️ 해적에게 ${GN(g)} 1상자를 빼앗겼어요`); news(G, `🏴‍☠️ ${o.name}에서 오는 길에 해적! ${GN(g)} 1상자를 빼앗겼어요.`, 'warn');
    }
  }
  const exportBonus = n => (owned(n,'bonus')?V.bonus:0)+(owned(n,'interest')?V.interestBonus:0);
  function comeHome(G, n, ship) {
    const r = ship.route, c = ship.cargo;
    // 계약 예정량과 실제 받은 양을 구분하고, 같은 날 재출항·새 계약 뒤에도 결과를 남긴다.
    if (laneOf(G, n, r.to) === 'fish') { add(n, 0, V.laneFish, 2); (c.laneNotes ??= []).push(`🐟 어장에서 식량 ${V.laneFish}상자를 잡았어요`); }
    if (n === player(G)) ship.delivery = {month: G.month, day: G.day, to: r.to, get: [...c.get], sold: [...c.sold], earned: c.earned, spent: c.spent, shortages: c.shortages, penaltyIn: c.penaltyIn, penaltyOut: c.penaltyOut, laneNotes: c.laneNotes || []};
    for (const g of GOODS) {
      add(n, g, c.give[g], n.quality[g]);   // 못 판 짐은 다시 창고로
      if (c.get[g]) { add(n, g, c.get[g], c.q[g]); n.year.tradeImp[g] += c.get[g]; n.year.imp[g][r.to] = (n.year.imp[g][r.to] || 0) + c.get[g]; n.importedFrom[r.to] = (n.importedFrom[r.to] || 0) + c.get[g]; n.spentTotal += c.get[g] * r.bp[g]; }
    }
    ship.state = 'port'; ship.cargo = null; r.done++;
    if (ship.breaking) endContract(G, n, ship, true);   // 끝나는 날을 넘기는지는 바로 뒤 startShips가 본다
  }
  function moveShips(G) {
    const arrivals = [], homes = [];
    for (const n of G.nations) for (const s of n.ships) if (s.state === 'sea') { s.t++; if (s.t === s.arrive) arrivals.push([n, s]); if (s.t === s.T) homes.push([n, s]); }
    // 같은 날 도착하면 ♥3이 먼저, 그다음 학생 배(8.4), 그다음 먼저 계약한 배가 먼저 산다.
    arrivals.sort((a, b) => (benefitRel(G, b[0], nation(G,b[1].route.to)) >= 3) - (benefitRel(G, a[0], nation(G,a[1].route.to)) >= 3) || (b[0] === player(G)) - (a[0] === player(G)) || a[1].route.signed - b[1].route.signed);
    for (const [n, s] of arrivals) trade(G, n, s);
    for (const [n, s] of homes) comeHome(G, n, s);
    startShips(G);
  }
  function startShips(G) {
    for (const n of G.nations) for (const s of n.ships) {
      // 7.7 항구에 있는 배: 끝나는 날 안에 한 번 더 못 다녀오면 계약 끝(학생 배는 쉰다)
      if (s.state === 'port' && s.route && !s.breaking) { s.route.trips = s.route.done + fitTrips(G, n, s.route); if (s.route.trips === s.route.done) endContract(G, n, s, false); }
      if (s.state === 'port' && s.route && s.breaking) endContract(G, n, s, true);
      if (s.state === 'port' && s.route && !(s.repair > G.month)) depart(G, n, s);
    }
  }
  const newShip = () => ({state: 'port', route: null, next: null, breaking: false, waited: 0, t: 0, T: 0, tripMonths: 0, arrive: 0, cargo: null, retry: 0});

  // ---------- 계절·해 ----------
  function season(G) {
    for (const n of G.nations) {
      const need = needs(G, n); need[2]+=n.smallBonus.cloth;
      let slots = 0, qual = 0; const slotsBy = [];
      // 생산: 재료가 안 드는 물건부터, 그다음 사다리 순서대로(철광석 → 철강 → 첨단기기) 창고의 재료만큼만 만든다(공장이 국민보다 먼저 재료를 가져간다).
      const T7 = n.trait;
      for (const g of GOODS) if (!PRODUCTS.includes(g)) {
        let made = produces(G, n, g);
        if (has(n, 'plains') && g === 0) made = Math.round(made * Math.max(owned(n,'granary')?V.granaryFloor:0,XT.harvest[T7.weather]));
        add(n, g, made, n.quality[g]); n.year.prod[g] += made;
        if (has(n, 'oil') && g === 1) {   // 7.0 유전이 늙는다: 캔 만큼 매장량이 줄고, 단계가 바뀌면 모두에게 소식
          T7.reserve = Math.max(0, T7.reserve - made);
          const st = oilStage(T7.reserve);
          if (st > T7.stage) { T7.stage = st; news(G, st >= 3 ? `${n.name} 유전이 거의 바닥났어요. 석유값이 오를 수 있어요.` : `${n.name} 유전이 늙어 가요. 석유값이 오를 수 있어요.`, 'warn'); }
        }
      }
      n.short = {};
      for (const [m, p] of CHAIN) {
        // 창고가 차면 공장이 쉰다(factoryIdle): 팔 데 없는 제품을 만들려고 재료를 태우지 않는다.
        const want = planned(G, n, p), per = perOf(n, p);
        const withMat = Math.min(want, per ? Math.floor(count(n, m) / per) : want);
        const made = p === 3 && owned(n, 'innovation') ? Math.max(withMat, Math.min(want, S.goods[p].load)) : withMat;   // 기술 혁신: 재료 없이도 1단계만큼
        if (per) take(n, m, Math.ceil(withMat * per));
        add(n, p, made, n.quality[p]); n.year.prod[p] += made;
        if (has(n, 'daon') && p === 3) {   // 7.0 가공 무역: 공장이 2계절 연속 멈추면 첨단기기 산업이 1단계 녹슨다
          if (want > 0 && made === 0) {
            T7.stops++;
            if (++T7.idleRun >= XT.rustSeasons) { T7.idleRun = 0; if (n.levels[3] > 1) { n.levels[3]--; T7.rusts++; if (n === player(G)) news(G, '철강이 끊겨 첨단기기 공장이 녹슬었어요. (첨단기기 산업 −1단계)', 'warn'); } }
          } else if (made > 0) T7.idleRun = 0;
        }
        const short = want - made;   // 재료가 모자라 못 만든 상자(창고가 차서 쉰 것은 제외)
        if (short > 0) { n.short[p] = short; if (n === player(G) && G.stats) G.stats.shortMade = (G.stats.shortMade || 0) + 1; if (n === player(G)) news(G, `${GN(m)} 부족으로 ${GN(p)}를 ${made}상자만 만들었어요. (공장에 ${GN(m)} ${want * PER}상자 필요)`, 'warn'); }
      }
      if(n.smallBonus.tech){add(n,3,n.smallBonus.tech,n.quality[3]);n.year.prod[3]+=n.smallBonus.tech;}
      const extraBoxes=(owned(n,'factory')?V.factoryBoxes:0)+(owned(n,'revolution')?V.revolutionBoxes:0);   // 공장 늘리기·산업 혁명
      if(extraBoxes){add(n,n.main,extraBoxes,n.quality[n.main]);n.year.prod[n.main]+=extraBoxes;}
      let emptyN = 0;
      for (const g of CONSUMER) {
        const got = take(n, g, need[g], true);
        const points = X.slotPoints * Math.min(1, got.qty / need[g]); slots += points;
        slotsBy.push({good: g, got: got.qty, need: need[g], points, max: X.slotPoints});
        if (got.qty >= need[g]) qual += X.qualityPoints[Math.round(got.qsum / got.qty)];
        if (!got.qty) emptyN++;
      }
      // 7.0 특성 점수·돈: 큰 시장국 빈 칸 −5 · 철의 나라 공해 · 숲 관광 수입
      const empty = has(n, 'market') ? emptyN * (owned(n,'shopping')?V.shopping:XT.emptyPenalty) : 0;
      if (empty) T7.empties += emptyN;
      let pollution = 0, tour = 0;
      if (has(n, 'ironland')) { pollution = Math.floor((levelOf(G, n, 4) + levelOf(G, n, 5)) / XT.pollutionPer); if (T7.cleaner) pollution = Math.floor(pollution / 2); pollution=Math.max(0,pollution-(owned(n,'modernSteel')?V.pollutionReduction:0)); T7.pollution += pollution; }
      if (has(n, 'forest')) { tour = forestTour(G, n); cash(G, n, tour); T7.tourism += tour; }
      qual+=n.smallBonus.quality+(on(n,'artisan',2)?V.c2.artisan:0);
      // 풍요: 먹고 남은 물건이 다음 계절 필요량 이상(곡간 관리는 절반) · 비축가 2장 +2.5 · 풍요의 나라 2배
      const keep=owned(n,'granaryKeep')?V.keepHalf:1, abundanceBy=CONSUMER.map(g=>({good:g,stock:count(n,g),need:Math.ceil(needs(G,n)[g]*keep),points:abundancePoints(Math.floor(count(n,g)/Math.max(1,Math.ceil(needs(G,n)[g]*keep))))})), abundancePort=V.abundancePort[homeStage(n)];
      // 8.0 풍요는 합계 한도 없이 물건마다 다음 계절 필요량의 몇 배를 쌓았는지로 센다
      const abundance=(sum(abundanceBy.map(x=>x.points))+abundancePort+(on(n,'hoarder',2)?V.c2.hoarder:0))*(owned(n,'plenty')?V.plentyMult:1);
      const unrest = on(n,'self',2) ? 0 : X.unrest * GOODS.filter(g => isProtected(G, n, g)).length, extra = modSum(G, n, 'score', -1)+n.smallBonus.score+(owned(n,'greenRev')?V.greenScore:0), crisis = crisisDamage(G, n);
      const debt = debtLoss(n);
      const raw = Math.round(slots + qual + abundance - unrest + extra - crisis - empty - pollution - debt), score = overScore(raw);
      n.seasons.push(score); n.last = {slots, slotsBy, slotsMax: CONSUMER.length * X.slotPoints, qual, abundance, abundanceBy, abundancePort, unrest, extra, crisis, empty, pollution, debt, tour, raw, score};
      n.year.seasons.push(n.last);
      n.smallBonus=freshSmallBonus();
      if (has(n, 'plains')) { T7.weather = T7.next; T7.next = weatherDraw(G, n); }   // 다음 계절 날씨는 한 계절 미리 알려 준다
      for (const g of GOODS) { const over = count(n, g) - cap(G, n, g); if (over > 0) take(n, g, over); }
      cash(G, n, Math.round(n.pop * X.taxPerPop * (on(n,'merchant',2)?V.c2.merchant:1)));
      if(owned(n,'interest')&&!n.debt)cash(G,n,Math.min(V.interestMax,Math.floor(n.money*V.interest)));
    }
    updatePrices(G);
  }
  // 7.0 대평원 날씨: 판의 씨앗과 달로 정한다(공용 난수 순서를 흔들지 않게). 0 풍년 · 1 보통 · 2 흉년
  function weatherDraw(G, n) {
    let h = (Math.imul(G.seed ^ 0x9e3779b9, 2654435761) ^ Math.imul(G.month + 7, 40503)) >>> 0;
    h = Math.imul(h ^ h >>> 15, 2246822519) >>> 0; h = (h ^ h >>> 13) >>> 0;
    const r = h / 4294967296, w = XT.weather;
    return r < w[0] ? 0 : r < w[0] + w[1] ? 1 : 2;
  }
  // 7.0 숲 관광: ♥2 이상 나라 하나당 20원, 식량 말고 다른 산업이 시작보다 오른 단계마다 15원 줄어든다
  const grownBesides = (n, keep) => sum(GOODS.map(g => g === keep ? 0 : Math.max(0, n.levels[g] - n.startLevels[g])));
  const forestTour = (G, n) => Math.round(Math.max(0, XT.tourPerFriend * G.nations.filter(o => o !== n && rel(G, n, o) >= 2).length - XT.tourCut * grownBesides(n, 0))*(owned(n,'ecotour')?V.ecotour:1));
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
      if (c.cut && on(n, 'self', 3) || g === 1 && on(n, 'green', 2) || c.env && on(n, 'green', 3)) continue;   // 자립 3장 · 녹색 2장(석유) · 녹색 3장(환경 사건)
      if (on(n, 'hoarder', 3)) k *= V.c3.hoarder;
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
            if (n === player(G)) { G.stats.declines++; news(G, `값싼 수입품에 우리 ${GN(g)} 공장이 문을 닫았어요.`, 'warn'); }
          }
        } else n.declineRun[g] = 0;
      }
      // 6.6 해마다 기록(결과 책): 산업 단계·배·창고·수입·수출·돈·점수
      n.history.push({year: y, levels: [...n.levels], ships: n.ships.length, warehouse: n.warehouse, bigShip: n.bigShip, money: n.money, debt: n.debt,
        imp: GOODS.map(g => sum(Object.values(n.year.imp[g]))), exp: [...n.year.exp], tradeImp: [...n.year.tradeImp], tradeExp: [...n.year.tradeExp],
        traded: tradedBoxes(n), moneyIn: n.year.moneyIn, moneyOut: n.year.moneyOut, penaltyIn: n.year.penaltyIn, penaltyOut: n.year.penaltyOut, penaltyDebt: n.year.penaltyDebt,
        seasons: n.year.seasons, score: n.years[n.years.length - 1], trait: traitValue(n)});
      n.trait.relayYear = 0;
      n.lastYear = n.year; n.year = freshYear();
    }
    // 8.3 연말 순위는 그해까지 쌓은 점수(누적)로 매긴다(최종 순위와 같은 기준)
    const order = [...G.nations].sort((a, b) => totalScore(b) - totalScore(a) || (b === player(G)) - (a === player(G)));
    order.forEach((n, i) => { const h = n.history[y - 1]; h.rank = i + 1; h.rankChange = y > 1 ? n.history[y - 2].rank - h.rank : 0; });
    G.world.bought = {};
    if (y === 5) return finish(G);
    ask(G, {type: 'yearEnd', year: y});
  }
  function finish(G) {
    G.over = true;
    for (const n of G.nations) n.score = totalScore(n);
  }
  const ranking = G => [...G.nations].sort((a, b) => b.score - a.score || (b === player(G)) - (a === player(G)));
  function yearReport(G, year) {
    const rows = G.nations.map(n => { const h = n.history.find(h => h.year === year); return h && {id: n.id, name: n.name, ...h}; }).filter(Boolean);
    const p = rows.find(n => n.id === player(G).id); if (!p) return null;
    const avg = key => sum(p.seasons.map(s => s[key] || 0)) / p.seasons.length;
    const top = a => GOODS.filter(g => a[g]).map(g => ({good: g, name: GN(g), qty: a[g]})).sort((a, b) => b.qty - a.qty || a.good - b.good);
    const legacy=p.seasons.some(s=>s.abundance==null),basketMax=avg('slotsMax'),qualityMax=sum(p.seasons.map(s=>s.abundance==null?20:CONSUMER.length*X.qualityPoints[3]))/p.seasons.length;
    const cumulative=G.nations.map(n=>({id:n.id,score:totalScore({years:n.years.slice(0,year)})})).sort((a,b)=>b.score-a.score);
    return JSON.parse(JSON.stringify({year, legacy, totalRank:cumulative.findIndex(n=>n.id===player(G).id)+1, total:totalScore({years:player(G).years.slice(0,year)}), totals:cumulative, score: p.score, rank: p.rank, rankChange: p.rankChange, ranks: rows.sort((a, b) => a.rank - b.rank).map(n => ({id: n.id, name: n.name, score: n.score, total: totalScore({years: nation(G, n.id).years.slice(0, year)}), rank: n.rank, change: n.rankChange})),
      scoreParts: {basket: avg('slots'), basketMax, quality: avg('qual'), qualityMax, abundance:avg('abundance'), abundanceMax:legacy?sum(p.seasons.map(s=>s.abundance==null?0:15))/p.seasons.length:15, priceBurden: avg('unrest'), eventBonus: avg('extra'), crisisLoss: avg('crisis'), emptyLoss: avg('empty'), pollutionLoss: avg('pollution'), debtLoss: avg('debt')},
      slotsBy: CONSUMER.map(g => ({good: g, name: GN(g), got: sum(p.seasons.map(s => s.slotsBy.find(b => b.good === g).got)), need: sum(p.seasons.map(s => s.slotsBy.find(b => b.good === g).need)), points: sum(p.seasons.map(s => s.slotsBy.find(b => b.good === g).points)) / p.seasons.length, max: sum(p.seasons.map(s=>s.slotsBy.find(b=>b.good===g).max))/p.seasons.length})),
      exports: [...p.tradeExp], imports: [...p.tradeImp], topExports: top(p.tradeExp), topImports: top(p.tradeImp), moneyIn: p.moneyIn, moneyOut: p.moneyOut, penalties: {in: p.penaltyIn, out: p.penaltyOut, debt: p.penaltyDebt || 0}, nations: rows}));
  }

  // ---------- 멈춤(학생 선택) ----------
  // pauses는 멈춤 창 수, stops는 실제로 시간이 멈춘 횟수(연말 카드 바로 뒤 회의는 한 번으로 센다)
  function ask(G, p) { if (!G.queue.length) G.stats.stops++; G.queue.push(p); G.stats.pauses++; G.pending = G.queue[0]; if (G.small && p.type !== 'open') G.small.lastAsk = today(G); }
  function news(G, text, kind = 'info') { G.news.push({month: G.month, text, kind}); if (G.news.length > 40) G.news.shift(); }
  // 7.7 우리 나라 창 '고른 효과': 고르기 전후를 견줘 실제로 바뀐 것만 남긴다(돈·산업·품질·지키기·기간 효과·세계 값·신뢰·배)
  const snap = (G, n) => ({money: n.money, debt: n.debt, levels: [...n.levels], quality: [...n.quality], protect: [...n.protect], mods: n.mods.length, gmods: G.mods.length, box: GOODS.map(g => count(n, g)),
    rel: Object.fromEntries([...G.nations, G.world].filter(o => o && o !== n && !o.world).map(o => [o.id, rel(G, n, o)])), detour: n.detour, ships: n.ships.length, repair: n.ships.map(s => s.repair || 0), fta: [...n.fta],
    flags: [n.expo, n.warehouse, n.bigShip, !!n.renewable, !!n.trait.cleaner], augments:[...n.augments]});
  function effects(G, n, a) {
    const b = snap(G, n), fx = {}, vec = k => { const d = GOODS.map(g => b[k][g] - a[k][g]); if (d.some(Boolean)) fx[k] = d; };
    if(b.augments.length>a.augments.length)fx.augments=b.augments.slice(a.augments.length);
    if (b.money !== a.money) fx.money = b.money - a.money;
    if (b.debt !== a.debt) fx.debt = b.debt - a.debt;
    vec('levels'); vec('quality'); vec('box');
    const pr = GOODS.filter(g => b.protect[g] !== a.protect[g]).map(g => ({g, until: b.protect[g]})); if (pr.length) fx.protect = pr;
    if (b.mods > a.mods) fx.mods = n.mods.slice(a.mods).map(m => ({...m}));
    if (b.gmods > a.gmods) fx.gmods = G.mods.slice(a.gmods).map(m => ({...m}));
    const rl = Object.keys(b.rel).filter(id => b.rel[id] !== a.rel[id]).map(id => ({id, d: b.rel[id] - a.rel[id]})); if (rl.length) fx.rel = rl;
    if (b.detour !== a.detour) fx.detour = b.detour;
    ['expo', 'warehouse', 'bigShip', 'renewable', 'cleaner'].forEach((k, i) => { if (b.flags[i] !== a.flags[i]) fx[k] = 1; });
    if (b.ships !== a.ships) fx.ships = b.ships - a.ships;
    const rp = n.ships.find((s, i) => (s.repair || 0) !== (a.repair[i] || 0)); if (rp) fx.repair = rp.repair;
    const ft = n.fta.filter(id => !a.fta.includes(id)); if (ft.length) fx.fta = ft;
    return fx;
  }
  function choose(G, value, target) {
    forecasts.delete(G);
    const p = G.pending;
    if (!p) return false;
    if (p.type === 'event') { const me = player(G), a = snap(G, me); applyEvent(G, me, p, value); G.story.push({month: G.month, id: p.id, k: value, source: p.source || null, target: p.target || null, good: p.good ?? null, until: p.until ?? null, fx: effects(G, me, a)}); }
    if (p.type === 'meeting' && p.tier && value==null) value=pickCard(G,player(G),p.cards,'focus');
    if (p.type === 'meeting' && value) {
      const a = snap(G, player(G));
      if (!p.cards.includes(value) || !applyCard(G, player(G), value, target)) return false;
      p.bought = 1;
      if (G.stats.cardIds) { G.stats.cards++; G.stats.cardIds.push(value); (G.stats.cardLog ??= []).push({id: value, month: G.month, tier:card(value).tier||'silver', fx: effects(G, player(G), a)}); }
    }
    G.queue.shift(); G.pending = G.queue[0] || null;
    if (p.type === 'open') startShips(G);
    return true;
  }
  function startMonth(G) {
    const m = G.month, P = player(G);
    if (m > 0 && m % 12 === 0) {
      for (let i = 0; i < G.nations.length; i++) for (const o of G.nations.slice(i + 1)) {
        const n = G.nations[i];
        if (rel(G, n, o) === 0) { G.rel[n.id][o.id] = G.rel[o.id][n.id] = 1; news(G, n === P ? `새해를 맞아 ${o.name}와 다시 거래할 수 있어요 ♥1` : `${n.name}, 새해를 맞아 ${o.name}와 다시 거래할 수 있어요 ♥1`, 'big'); }
      }
      for(const n of G.nations) for(const i of n.investment.filter(i=>i.month<=m)){ cash(G,n,i.money); news(G,n===P?`보물선이 돌아왔어요! 금고 +${i.money}억`:`${n.name}, 보물선이 돌아와 +${i.money}억!`,'big'); }
      for(const n of G.nations)n.investment=n.investment.filter(i=>i.month>m);
      for (const n of G.nations.slice(1)) npcCard(G, n);
      ask(G, makeMeeting(G,P));
    }
    for (const e of G.plan) {
      const ev = event(e.id);
      if (ev.warn && m === e.month - ev.warn) warn(G, e);
      if (m === e.month) startEvent(G, e);
    }
  }
  // 8.4 NPC는 하루가 끝날 때(다음 날로 넘어가기 직전) 계약을 고르고 떠난다. 그래서 같은 날이면 학생 계약이 언제나 먼저다.
  function npcPick(G) {
    for (const n of G.nations) if (n.npc) for (const s of n.ships) if (s.state === 'port' && !s.route && !s.offer && !(s.retry > G.month)) {
      npcRoute(G, n, s, s.skip); s.skip = null;
      if (s.route && !(s.repair > G.month)) depart(G, n, s);
    }
  }
  function tickDay(G) {
    if (G.pending || G.over) return false;
    npcPick(G);
    // 월초에만 난수를 써서 달 길이가 세계 난수열을 바꾸지 않게 한다.
    if (G.day === 1) shuffle(G, G.nations);
    const boundary = G.day === monthDays(G.month);
    G.day = boundary ? 1 : G.day + 1;
    if (boundary) G.month++;
    moveShips(G);
    if (boundary) {
      G.month--;   // 정산은 끝난 달 기준(기존 사건·생산 만료 규칙 유지).
      if (G.month % 3 === 2) season(G);
      if (G.month % 12 === 11) { yearEnd(G); if (G.over) { G.month++; return true; } }
      G.month++; startMonth(G); startShips(G);
      recordPrices(G);
    }
    smallTick(G); offerTick(G);
    return true;
  }
  function advance(G, days = 1) { if (!Number.isInteger(days) || days < 0) return false; let moved = false; while (days-- > 0 && tickDay(G)) moved = true; return moved; }
  function tick(G) { return advance(G, monthDays(G.month) - G.day + 1); }

  // ---------- 사건 ----------
  const bigWeek=(G,d)=>G.plan.some(e=>Math.floor(dayNo(e.month,1)/7)===Math.floor(d/7));
  function nextSmallDay(G,from){const days=[];for(let d=from+V.smallMin;d<=from+V.smallMax;d++)if(!bigWeek(G,d))days.push(d);return pick(G,days);}
  function smallTick(G){
    if(!G.small||today(G)<G.small.next)return;
    if(bigWeek(G,today(G))){G.small.next=nextSmallDay(G,G.small.last);return;}
    // 7.9c 조용한 날이 길면(회의·사건·단추 없이 quietMax일) 단추 달린 돌발을 낸다
    const quiet=today(G)-Math.max(G.small.lastAction||0,G.small.lastAsk||0),action=random(G)<V.smallActionChance||quiet>=V.quietMax,n=player(G),pool=S.smallEvents.filter(e=>!!e.action===action&&(e.id!=='mice'||count(n,0)>needs(G,n)[0])&&(e.id!=='misunderstanding'||G.nations.some(o=>o!==n&&rel(G,n,o)>=2)));
    const weighted=owned(n,'charm')?pool.flatMap(e=>V.goodSmall.includes(e.id)?Array(V.charm).fill(e):[e]):pool;   // 행운의 부적: 좋은 돌발 두 배
    smallEvent(G,pick(G,weighted).id);G.small.last=today(G);G.small.next=nextSmallDay(G,today(G));
  }
  // 작은 돌발은 선택 큐에 넣지 않는다. 단추를 안 누르면 그대로 지나간다.
  function smallEvent(G,id){
    const e=S.smallEvents.find(e=>e.id===id);if(!e)return false;
    const n=player(G),sea=n.ships.filter(s=>s.state==='sea'),o=pick(G,G.nations.filter(o=>o!==n&&(id!=='misunderstanding'||rel(G,n,o)>=2))),g=pick(G,CONSUMER),d=today(G),b=n.smallBonus;
    const v=V.small;
    const item={id,day:d,until:d+V.actionDays,good:g,target:o?.id||null,action:e.action,done:false,text:e.text};
    const delay=(s,k)=>{if(!s)return;const t=Math.max(s.t+1,s.T+k);if(s.t<s.arrive)s.arrive=Math.min(t,Math.max(s.t+1,s.arrive+Math.ceil(k/2)));s.T=t;};
    if(id==='tailwind')delay(pick(G,sea),v.tailwind);
    if(id==='headwind')delay(pick(G,sea),v.headwind);
    if(id==='fog')sea.forEach(s=>delay(s,v.fog));
    if(id==='lost')add(n,2,v.lost,n.quality[2]);
    if(id==='fish')add(n,0,v.fish,n.quality[0]);
    if(id==='mice'&&count(n,0)>needs(G,n)[0])take(n,0,v.mice);
    if(id==='exchangeTech')b.tech+=v.tech;
    if(id==='donation')cash(G,n,v.donation);
    if(id==='repair')cash(G,n,-v.repair);
    if(['spark','sale','rumor'].includes(id)){
      const from=id==='rumor'?dayNo(G.month+1,1):d;
      G.pricePulses.push({good:g,from,until:from+v.priceDays,mult:id==='sale'?v.down:v.up,...(id==='rumor'?{minPrice:Math.ceil(worldPrice(G,g)*v.up)}:{})});
      item.text=id==='rumor'?`다음 달 ${GN(g)} 값이 15% 오를 거래요`:`${GN(g)} ${id==='sale'?'값 −15%':'값 +15%'} · 30일`;
    }
    if(id==='northSale')G.northSaleUntil=d+v.priceDays;
    if(id==='match'&&o)addRel(G,n,o,1);
    if(id==='misunderstanding'&&o&&rel(G,n,o)>=2)addRel(G,n,o,-1);
    if(id==='craftsman')b.quality+=v.quality;
    if(id==='festivalPrep')b.cloth+=v.cloth;
    if(id==='students')b.score+=v.score;
    G.small.log.push(item);if(e.action){G.small.actions.push({...item});G.small.lastAction=d;}
    news(G,`${e.name} · ${item.text}${e.action?` · ${e.action}(7일 안에)` : ''}`,'small');forecasts.delete(G);return item;
  }
  const smallActions=G=>(G.small?.actions||[]).filter(a=>!a.done&&a.until>=today(G));
  function takeSmallAction(G,day){
    const a=smallActions(G).find(a=>a.day===day),n=player(G);if(!a)return false;
    const q=a.id==='merchant'?V.small.merchant:V.small.request;if(count(n,n.main)<q)return false;
    take(n,n.main,q);cash(G,n,a.id==='merchant'?q*worldPrice(G,n.main):V.small.requestMoney);
    const o=a.id==='request'?nation(G,a.target):G.world;
    if(a.id==='request'){addRel(G,n,o,1);add(o,n.main,q,n.quality[n.main]);}
    n.year.exp[n.main]+=q;n.year.tradeExp[n.main]+=q;n.exported[n.main]+=q;n.exportedTo[o.id]=(n.exportedTo[o.id]||0)+q;
    if(exportBonus(n))cash(G,n,q*exportBonus(n));
    a.done=true;const log=G.small.log.find(x=>x.day===a.day&&x.id===a.id);if(log)log.done=true;news(G,`${S.smallEvents.find(e=>e.id===a.id).name} · ${a.action} 완료!`,'small');forecasts.delete(G);return true;
  }
  function planEvents(G) {
    const P=player(G),plan=[],cy=2+Math.floor(random(G)*2),crises=shuffle(G,S.events.filter(e=>e.crisis&&!e.only&&e.minYear<=cy));
    const at=y=>(y-1)*12+3+Math.floor(random(G)*6);
    plan.push({id:crises[0].id,month:at(cy)},{id:pick(G,S.events.filter(e=>e.crisis&&!e.only&&e.id!==crises[0].id)).id,month:at(5)});
    plan.push({id:S.events.find(e=>e.only===P.id).id,month:at(4)});
    plan.push({id:pick(G,S.events.filter(e=>!e.extra&&e.minYear===1)).id,month:at(1)});
    if(random(G)<.5){const e=pick(G,S.events.filter(e=>!e.crisis&&!e.only&&!plan.some(p=>p.id===e.id)));let m=at(Math.max(2,e.minYear));while(plan.some(p=>p.month===m))m++;plan.push({id:e.id,month:m});}
    plan.sort((a,b)=>a.month-b.month);
    return G.calm ? plan.filter(p => !event(p.id).crisis) : plan;
  }
  function cutSource(G) {
    const P = player(G), npcs = G.nations.slice(1).filter(n => sells(G, n, n.main));
    const score = n => sum(Object.values(P.year.imp[n.main]).concat(P.lastYear ? [P.lastYear.imp[n.main][n.id] || 0] : [])) + (P.ships.some(s => s.route?.to === n.id) ? 5 : 0);
    if (G.cutTarget) return nation(G, G.cutTarget);
    return npcs.sort((a, b) => score(b) - score(a))[0] || G.nations[1];
  }
  function warn(G, e) {
    if (e.id === 'supplyCut') { const s = cutSource(G); e.source = s.id; G.mods.push({g: s.main, mult: 1.15, from: G.month, until: e.month}); news(G, `${s.name}에 분쟁 조짐! ${GN(s.main)} 값이 들썩여요.`, 'warn'); }
    if (e.id === 'recession') { for (const g of RAW) G.mods.push({g, mult: X.recessionWarnRaw ?? .9, from: G.month, until: e.month}); news(G, `세계 경제가 흔들려요. ${RAW.map(GN).join('·')} 값이 먼저 내려가요.`, 'warn'); }
  }
  function startEvent(G, e) {
    const P = player(G), until = G.month + 6;
    let id = e.id;
    if (id === 'retaliation' && !GOODS.some(g => isProtected(G, P, g))) id = 'dumping';
    if (id === 'fta' && !G.nations.slice(1).some(o => rel(G, P, o) >= 3)) id = 'invention';
    const ev = event(id), p = {type: 'event', id, until};
    if (id === 'supplyCut') { const s = e.source ? nation(G, e.source) : cutSource(G), end = G.month + X.cutMonths; p.until = end; G.cut = {source: s.id, good: s.main, until: end}; p.source = s.id; p.good = s.main; G.mods.push({g: s.main, mult: 1.3, from: G.month, until: end}); }
    if (id === 'storm') { for (const n of G.nations) if (!on(n, 'green', 3)) n.mods.push({kind: 'level', g: 0, v: -1, until}); G.mods.push({g: 0, mult: 1.3, from: G.month, until}); }
    // 6.3: 위기 때 원자재는 반토막, 만든 물건은 조금만. 원자재에 기댄 나라가 더 흔들린다(이미 맺은 계약값은 그대로).
    if (id === 'recession') for (const g of GOODS) G.mods.push({g, mult: RAW.includes(g) ? X.recessionRaw ?? .5 : X.recessionMade ?? .85, from: G.month, until});
    if (id === 'dumping') G.mods.push({g: 2, mult: .7, from: G.month, until});
    if (id === 'retaliation') { const g = GOODS.find(g => isProtected(G, P, g)); p.source = (G.nations.slice(1).find(o => o.main === g) || G.nations[1]).id; }
    if (id === 'fta') p.target = G.nations.slice(1).sort((a, b) => rel(G, P, b) - rel(G, P, a))[0].id;
    // 6.5 덤 사건·나라별 사건의 공통 효과(선택과 상관없는 것)
    if (id === 'blackout') { for (const n of G.nations) if (!on(n, 'green', 3)) n.mods.push({kind: 'level', g: 1, v: -1, until}); G.mods.push({g: 1, mult: 1.4, from: G.month, until}); }
    if (id === 'techBoom') G.mods.push({g: 3, mult: 1.3, from: G.month, until});
    if (id === 'tariffWar') G.mods.push({g: -1, mult: 1.15, from: G.month, until});
    if (id === 'bigOrder') p.qty = Math.floor(exportable(G, P, P.main) / 2);
    const all = GOODS;
    const extraCrisis = {blackout: {goods: [1], w: 1, until, env: true}, tariffWar: {goods: all, w: .3, until, only: P.id}, forestFire: {goods: [0], w: .6, until, only: P.id, env: true},
      portStorm: {goods: all, w: .2, until, only: P.id}, mineAccident: {goods: [4], w: .6, until, only: P.id, env: true}};
    if (ev.crisis) G.crises.push(extraCrisis[id] || (id === 'supplyCut' ? {goods: [p.good], w: 1, until: p.until, cut: true} : id === 'storm' ? {goods: [0], w: 1, until}
      : {goods: all, w: .4, until, only: id === 'exchange' ? P.id : null}));
    if (ev.crisis) { G.stats.crises++; if (!ev.only) for (const n of G.nations.slice(1)) applyEvent(G, n, p, npcOption(G, n, p)); }
    G.seen.push(id);
    news(G, `${ev.name}!`, ev.crisis ? 'crisis' : 'big');
    ask(G, p);
  }
  function mostImported(G, n) { const need = uses(G, n); return GOODS.reduce((b, g) => need[g] - produces(G, n, g) > need[b] - produces(G, n, b) ? g : b, 0); }
  function applyEvent(G, n, p, k) {
    const u = p.until, id = p.id;
    const pay = c => { c = Math.round(c * (on(n, 'adventurer', 3) ? V.c3.adventurer : 1)); if (n.money < c) return false; cash(G, n, -c); return true; }, green = on(n, 'green', 3);
    if (id === 'supplyCut') { if (k === 0) { if (pay(100)) n.detour = u; } else { n.mods.push({kind: 'need', g: p.good, v: -1, until: u}, {kind: 'score', g: -1, v: -3, until: u}); } }
    if (id === 'storm' && k === 1) for (const o of G.nations) if (o !== n && rel(G, n, o) >= 2) { const t = take(o, 0, Math.min(2, exportable(G, o, 0))); add(n, 0, t.qty, o.quality[0]); }
    if (id === 'recession' && k === 1 && pay(100)) n.mods.push({kind: 'score', g: -1, v: 4, until: u});
    if (id === 'exchange') { if (n === player(G)) n.mods.push({kind: 'exchange', g: -1, v: 1, until: u}); if (k === 0) n.mods.push({kind: 'level', g: n.main, v: 1, until: u}); else n.mods.push({kind: 'need', g: mostImported(G, n), v: -1, until: u}, {kind: 'score', g: -1, v: -3, until: u}); }
    if (id === 'expo' && k === 0 && pay(60)) n.expo = true;
    if (id === 'invention') { if (k === 0) n.levels[n.main]++; else for (const o of G.nations) addRel(G, n, o, 1); }
    if (id === 'voice') { if (k === 0) n.protect[0] = Math.max(n.protect[0], G.month + 12); else n.mods.push({kind: 'score', g: -1, v: 2, until: G.month + 12}); }
    if (id === 'dumping' && k === 1) n.protect[2] = Math.max(n.protect[2], G.month + 12);
    if (id === 'retaliation') { if (k === 0) n.protect = zeros(); else if (k === 1) n.mods.push({kind: 'retaliated', g: -1, v: 1, until: u}); else if (pay(60)) addRel(G, n, p.source, 1); }
    if (id === 'fta' && k === 0) makeFta(G, n, nation(G, p.target));
    // 6.5 덤 사건
    if (id === 'pirates' && !(k === 0 && pay(80))) n.mods.push({kind: 'trip', g: -1, v: 1, until: u});
    if (id === 'bigOrder' && k === 0) { const q = Math.min(p.qty ?? 0, exportable(G, n, n.main)); if (q > 0) { take(n, n.main, q); cash(G, n, Math.round(q * worldPrice(G, n.main) * 1.5)); } }
    if (id === 'blackout' && k === 1) n.mods.push({kind: 'need', g: 1, v: -1, until: u}, ...green ? [] : [{kind: 'score', g: -1, v: -2, until: u}]);
    if (id === 'techBoom' && k === 0 && pay(150)) n.levels[3]++;
    if (id === 'strike' && !(k === 0 && pay(100))) n.mods.push({kind: 'level', g: n.main, v: -1, until: u});
    if (id === 'festival' && k === 0 && pay(40)) { const o = G.nations.filter(o => o !== n).sort((a, b) => rel(G, n, a) - rel(G, n, b))[0]; if (o) addRel(G, n, o, 2); }
    if (id === 'shipwreck' && !(k === 0 && pay(80))) { const s = n.ships.find(s => s.state === 'port') || n.ships[0]; if (s) s.repair = G.month + 3; }
    if (id === 'tourists') { if (k === 0) cash(G, n, n.pop * 15); else n.mods.push({kind: 'score', g: -1, v: 2, until: u}); }
    if (id === 'tariffWar' && k === 1 && pay(100)) { const o = G.nations.filter(o => o !== n).sort((a, b) => rel(G, n, b) - rel(G, n, a))[0]; if (o) makeFta(G, n, o); }
    // 6.5 나라별 특별 사건
    if (id === 'daonLaunch') { if (k === 0 && pay(100)) n.quality[3] = Math.min(3, n.quality[3] + 1); else if (k === 1) G.mods.push({g: 3, mult: 1.2, from: G.month, until: u}); }
    if (id === 'plainsHarvest') { if (k === 0) add(n, 0, 8, n.quality[0]); else for (const o of G.nations) if (o !== n && rel(G, n, o) >= 2) addRel(G, n, o, 1); }
    if (id === 'oilFind') { if (k === 0 && pay(150)) n.levels[1]++; else if (k === 1) G.mods.push({g: 1, mult: 1.25, from: G.month, until: u}); }
    if (id === 'marketFair') { if (k === 0) cash(G, n, 200); else n.mods.push({kind: 'score', g: -1, v: 3, until: u}); }
    if (id === 'forestFire' && !green && !(k === 0 && pay(100))) n.mods.push({kind: 'level', g: 0, v: -1, until: u});
    if (id === 'portStorm' && !(k === 0 && pay(120))) n.mods.push({kind: 'trip', g: -1, v: 1, until: u});
    if (id === 'artisanMaster') { const g = k === 0 ? 2 : 3; n.quality[g] = Math.min(3, n.quality[g] + 1); }
    if (id === 'mineAccident' && !green && !(k === 0 && pay(120))) n.mods.push({kind: 'level', g: 4, v: -1, until: u});
  }
  // ---------- 6.5 도감(여러 판의 기록): 끝난 판 G를 기록에 더한 새 기록을 돌려준다. 순수 함수(저장은 화면이 localStorage에). ----------
  // ---------- 7.2 도감(BOOK-v72.md): 한 판 끝에 기록 → 배지·상식 판정 → 채움 비율·칭호 ----------
  const anyOf = (o, ids) => ids.some(id => o?.[id]);
  const AUG_CARDS = S.cards.filter(c => c.concept);
  // 예전(6.5~7.1) 기록에도 새 칸을 붙인다. 상식 카드는 기록만으로 판정하므로 예전 판도 열린다.
  function codexNormalize(codex) {
    const c = codex || {};
    for (const k of ['nations', 'events', 'goods', 'badges', 'friends', 'imports', 'star3', 'sold', 'choices', 'lessons', 'flags', 'cards', 'records']) c[k] = c[k] || {};
    c.games = c.games || 0; c.lastNew = c.lastNew || [];
    // 8.0 옛 기록(5년 가중 평균, 100점 기준)을 누적 점수 기준으로 옮긴다: ×5
    if (!c.sumScore) {
      for (const r of Object.values(c.nations)) if (r?.best) r.best = Math.round(r.best * 5);
      if (c.records.bestScore != null) c.records.bestScore = Math.round(c.records.bestScore * 5);
      if (c.last?.score != null) c.last.score = Math.round(c.last.score * 5);
      c.sumScore = true;
    }
    const ev = c.events, f = c.flags, n = c.nations, b = c.badges, ch = c.choices;
    const rule = {
      trade: c.games >= 1, expimp: Object.keys(c.goods).length > 0, special: !!f.mainExport20,
      tariff: anyOf(ev, ['retaliation', 'tariffWar']) || !!f.worldCap, protect: !!c.cards.protect || anyOf(ev, ['dumping', 'retaliation']),
      fta: !!ev.fta || !!ch.tariffWar?.[1], dumping: !!ev.dumping, exchange: !!ev.exchange, chain: anyOf(ev, ['supplyCut', 'blackout']) || !!f.shortMade,
      aid: !!b.giver || !!f.aid, crisis: !!ev.recession, process: anyOf(n, ['daon', 'ironland']), relay: !!n.port || !!f.relay,
      resource: !!n.oil || !!ev.blackout || !!c.cards.renewable, environment: anyOf(n, ['ironland', 'forest']) || !!c.cards.cleaner, depend: anyOf(b, ['explorer', 'friend'])};
    for (const l of S.lessons) if (rule[l.id]) c.lessons[l.id] = true;
    return c;
  }
  // 도감의 모든 칸: 'tab:id' 열쇠 목록(채운 것만). 사건은 고른 선택지마다 한 칸(선택 기록이 없는 예전 판은 본 것만으로 한 칸).
  function codexSlots(codex) {
    const c = codexNormalize(JSON.parse(JSON.stringify(codex || {}))), out = [];
    for (const x of T.countries) { if (c.nations[x.id]) out.push('nation:' + x.id); if (c.friends[x.id]) out.push('friend:' + x.id); }
    for (const g of GOODS) { if (c.goods[g]) out.push('exp:' + g); if (c.imports[g]) out.push('imp:' + g); if (c.star3[g]) out.push('star:' + g); }
    for (const e of S.events) {
      const k = (c.choices[e.id] || []).map((v, i) => v ? i : -1).filter(i => i >= 0);
      if (k.length) for (const i of k) out.push(`event:${e.id}:${i}`); else if (c.events[e.id]) out.push(`event:${e.id}:0`);
    }
    for (const b of S.badges) if (c.badges[b.id]) out.push('badge:' + b.id);
    for (const l of S.lessons) if (c.lessons[l.id]) out.push('lesson:' + l.id);
    for (const a of AUG_CARDS) if (c.cards[a.id]) out.push('aug:' + a.id);   // 7.9 증강체 모음(콘셉트 30칸 + 특성 8장)
    return out;
  }
  function codexStats(codex) {
    const total = T.countries.length * 2 + GOODS.length * 3 + S.events.reduce((a, e) => a + e.options.length, 0) + S.badges.length + S.lessons.length + AUG_CARDS.length;
    const filled = codexSlots(codex).length, percent = Math.floor(filled / total * 100);
    const rank = [...S.ranks].reverse().find(r => percent >= r.min);
    return {filled, total, percent, rank};
  }
  function codexAdd(codex, G) {
    const before = codexSlots(codex), rankFrom = codexStats(codex).rank.n;
    const c = codexNormalize(JSON.parse(JSON.stringify(codex || {})));
    c.games++;
    const P = player(G), rank = ranking(G).indexOf(P) + 1, n = c.nations[P.id] || {games: 0, best: 0, wins: 0};
    const others = G.nations.filter(o => o !== P), hist = P.history || [];
    n.games++; n.best = Math.max(n.best, P.score); n.wins += rank === 1 ? 1 : 0; n.lastRank = rank; c.nations[P.id] = n;
    if (traitResult(G, P).good) n.trait = (n.trait || 0) + 1;   // 7.0 나라 특성 배지(특성을 잘 살린 판 수)
    for (const id of G.seen) c.events[id] = true;
    for (const st of G.story || []) {
      if (typeof st.k !== 'number') continue;
      const e = event(st.id); if (!e) continue;
      const a = c.choices[st.id] || e.options.map(() => false); a[st.k] = true; c.choices[st.id] = a;
    }
    const impBy = GOODS.map(g => sum(hist.map(h => h.imp?.[g] || 0))), expBy = GOODS.map(g => sum(hist.map(h => h.exp?.[g] || 0)));
    for (const g of GOODS) {
      if (P.exported[g]) c.goods[g] = true;
      if (impBy[g] > 0) c.imports[g] = true;
      if (P.exported[g] > 0 && P.quality[g] >= 3) c.star3[g] = true;
      c.sold[g] = (c.sold[g] || 0) + (P.exported[g] || 0);
    }
    for (const o of others) if (rel(G, P, o) >= X.relMax) c.friends[o.id] = (c.friends[o.id] || 0) + 1;
    for (const id of G.stats.cardIds || []) c.cards[id] = (c.cards[id] || 0) + 1;
    const f = c.flags;
    if ((P.exported[P.main] || 0) > 20) f.mainExport20 = true;
    if (G.stats.worldCap) f.worldCap = true;
    if (G.stats.shortMade) f.shortMade = true;
    if (P.trait?.aids > 0) f.aid = true;
    if (P.trait?.relay > 0) f.relay = true;
    const story = (id, k) => (G.story || []).some(x => x.id === id && x.k === k);
    const traded = new Set([...Object.keys(P.exportedTo || {}).filter(k => P.exportedTo[k] > 0), ...Object.keys(P.importedFrom || {}).filter(k => P.importedFrom[k] > 0)]);
    const expAll = sum(expBy), impAll = sum(impBy);
    const gains = hist.map((h, i) => h.money - (i ? hist[i - 1].money : X.startMoney));
    const got = [];
    if (rank === 1) got.push('king');
    const perYear = P.score / Math.max(1, P.years.length);   // 배지 기준은 한 해 평균 점수
    if (perYear >= V.richYear) got.push('rich');
    if (!G.stats.breaks) got.push('honest');
    if (others.every(o => rel(G, P, o) >= 2)) got.push('friend');
    if (GOODS.every(g => c.goods[g])) got.push('allGoods');
    if (T.countries.every(x => c.nations[x.id])) got.push('allNations');
    if (others.every(o => traded.has(o.id))) got.push('explorer');
    if ((P.exportedTo?.world || 0) + (P.importedFrom?.world || 0) >= 30) got.push('continent');
    if (G.stats.crises >= 2 && perYear >= V.survivorYear) got.push('survivor');
    if (story('tariffWar', 1) || story('retaliation', 2)) got.push('peace');
    if (mainConcept(P)) got.push('inventor');   // 7.9 같은 콘셉트 3장
    if (expAll >= 20 && impAll >= 20 && Math.abs(expAll - impAll) / Math.max(expAll, impAll) <= .1) got.push('balance');
    if (gains.some(v => v >= 300)) got.push('boom');
    if (others.filter(o => rel(G, P, o) >= X.relMax).length >= 3) got.push('loyal');
    if (story('tourists', 0)) got.push('guest');
    if (story('storm', 1) || story('invention', 1) || story('plainsHarvest', 1) || story('festival', 0) || P.trait?.aids > 0) got.push('giver');
    for (const b of got) c.badges[b] = (c.badges[b] || 0) + 1;
    // 기록(📜): 최고·연속·누적
    const r = c.records, best = Math.max(0, ...gains);
    r.newBest = P.score > (r.bestScore ?? -1); if (r.newBest) { r.bestScore = P.score; r.bestNation = P.id; }
    r.streak = rank === 1 ? (r.streak || 0) + 1 : 0; r.bestStreak = Math.max(r.bestStreak || 0, r.streak);
    if (best > (r.bestYear ?? 0)) { r.bestYear = best; r.bestYearNation = P.id; }
    r.exp = (r.exp || 0) + expAll; r.imp = (r.imp || 0) + impAll; r.wins = (r.wins || 0) + (rank === 1 ? 1 : 0);
    codexNormalize(c);
    const had = new Set(before);
    c.lastNew = codexSlots(c).filter(k => !had.has(k));
    c.last = {nation: P.id, rank, score: P.score, badges: got, rankFrom, rankTo: codexStats(c).rank.n};
    return c;
  }
  function makeFta(G, a, b) { if (rel(G, a, b) === 0) return; if (!a.fta.includes(b.id)) { a.fta.push(b.id); b.fta.push(a.id); } G.rel[a.id][b.id] = G.rel[b.id][a.id] = X.relMax; }
  // 6.5 덤 사건의 선택지 값: [0번 값, 1번 값]. 봇·NPC는 금고에 150원 이상 남을 때만 돈 드는 쪽을 고른다.
  const COST = {pirates: [80, 0], strike: [100, 0], shipwreck: [80, 0], techBoom: [150, 0], festival: [40, 0], tariffWar: [0, 100], daonLaunch: [100, 0], oilFind: [150, 0], forestFire: [100, 0], portStorm: [120, 0], mineAccident: [120, 0]};
  function npcOption(G, n, p) {
    if (p.id === 'supplyCut') return n.money >= 100 && buys(G, n, p.good) ? 0 : 1;
    if (COST[p.id]) { const [a, b] = COST[p.id]; return a <= b ? (n.money - a >= 150 ? 0 : 1) : (n.money - a >= 150 ? 0 : 1); }
    if (event(p.id).extra) return 0;
    if (p.id === 'recession') return n.money >= 300 ? 1 : 0;
    if (p.id === 'storm') return 1;
    return n.strategy === 'balanced' ? 1 : 0;
  }

  // ---------- 발전 회의 ----------
  const cardCost = (n, id) => card(id)?.cost||0;
  function dependence(G, n, g) {
    const imp = n.lastYear ? sum(Object.values(n.lastYear.imp[g])) : 0, need = uses(G, n)[g] * 4;
    return need ? imp / need : 0;
  }
  const weakest = (G, n) => GOODS.filter(g => g !== n.main).sort((a, b) => dependence(G, n, b) - dependence(G, n, a) || n.levels[a] - n.levels[b])[0];
  const lacking = (G, n) => CONSUMER.filter(g => produces(G, n, g) < needs(G, n)[g]);
  function applyCard(G, n, id, target) {
    const c = card(id), cost = cardCost(n, id);
    if(!c||c.only&&c.only!==n.id||id==='moreShip'&&n.ships.length>=maxShips(n)||id==='protect'&&target!=null&&!GOODS.includes(target))return false;
    const before = c.concept ? conCount(n, c.concept) : 0;
    cash(G, n, -cost);
    n.augments.push(id);
    const up = (g, k = V.industryStep) => { n.levels[g] += k; n.closed[g] = false; };
    if (id === 'grow') up(n.main);
    if (id === 'factory') up(n.main);
    if (id === 'revolution') { up(n.main, V.revolution); up(weakest(G, n)); }
    if (id === 'climb') up(3);
    if (id === 'protect') {
      const g = target ?? weakest(G, n);
      up(g); n.protect[g] = FOREVER;   // 약한 산업을 한 단계 키우고 문 닫지 않게 지킨다
      for (const o of G.nations) if (o !== n && o.main === g) addRel(G, n, o, -1);
    }
    if (id === 'selfReliance') up(CONSUMER.filter(g => g !== n.main).sort((a, b) => dependence(G, n, b) - dependence(G, n, a) || (needs(G, n)[b] - produces(G, n, b)) - (needs(G, n)[a] - produces(G, n, a)))[0], V.selfReliance);
    if (id === 'autarky') for (const g of lacking(G, n)) up(g);
    if (id === 'warehouse') n.warehouse = true;
    if (id === 'bigShip') n.bigShip = true;
    if (id === 'moreShip') n.ships.push(newShip());
    if (id === 'armada' && n.ships.length < maxShips(n)) n.ships.push(newShip());
    if (id === 'quality') n.quality[n.main] = Math.min(3, n.quality[n.main] + V.qualityStep);
    if (id === 'school') for (const g of CONSUMER.filter(g => n.quality[g] < 3).sort((a, b) => n.quality[a] - n.quality[b] || a - b).slice(0, V.schoolGoods)) n.quality[g]++;
    if (id === 'brand') { n.quality[n.main] = V.brandQuality; const o = G.nations.filter(o => o !== n && !buys(G, o, n.main)).sort((a, b) => rel(G, n, b) - rel(G, n, a))[0]; n.brandBuyer = o?.id || null; }
    if (id === 'innovation') { up(3, V.innovation); n.quality[3] = Math.min(3, n.quality[3] + 1); }
    if (id === 'lamps') n.mods.push({kind: 'need', g: 1, v: -V.lamps, until: FOREVER});
    if (id === 'renewable') { n.renewable = true; n.mods.push({kind: 'need', g: 1, v: -XT.renewNeed, until: FOREVER}); }
    if (id === 'greenRev') n.mods.push({kind: 'need', g: 1, v: -V.greenRev, until: FOREVER});
    if (id === 'cleaner') n.trait.cleaner = true;
    if (id === 'fund') cash(G, n, V.fund);
    if (id === 'envoy') for (const o of G.nations) if (o !== n) addRel(G, n, o, V.envoyRel);
    if (id === 'fta2') for (const o of G.nations.filter(o => o !== n).sort((a, b) => rel(G, n, b) - rel(G, n, a)).slice(0, V.ftaPartners)) makeFta(G, n, o);
    if (id === 'treasure') n.investment.push({month: (Math.floor(G.month / 12) + 1) * 12, money: V.treasureMin + Math.floor(random(G) * (V.treasureMax - V.treasureMin + 1))});
    if (id === 'modernSteel') up(5, V.modernSteelLevel);
    if (id === 'relayStore' && V.relaySteel) up(5, V.relaySteel);   // 7.9c 항구 섬나라: 첨단기기 공장에 쓸 철강을 조금 만든다
    // 콘셉트를 2·3장 모은 순간 한 번 생기는 효과
    const k = c.concept ? conCount(n, c.concept) : 0;
    if (before < 3 && k >= 3) {
      if (c.concept === 'factory') up(n.main, V.c3.factory);
      if (c.concept === 'tech') up(3, V.c3.tech);
      if (c.concept === 'artisan') for (const g of CONSUMER) n.quality[g] = Math.max(V.c3.artisan, n.quality[g]);
    }
    if (before < 2 && k >= 2 && c.concept === 'adventurer') n.meetings.free += V.c2.adventurer;
    return true;
  }
  // 7.0 나라별 회의 습관(NPC·봇): 정화 시설·재생 에너지 먼저, 석유 왕국은 3년째부터 다른 산업(첨단기기)
  function npcCard(G, n) {
    const p=makeMeeting(G,n);applyCard(G,n,pickCard(G,n,p.cards,n.strategy));
  }
  // 회의에 나올 수 있는 카드: 아직 안 고른 것, 효과가 남는 것. 5년째는 바로 효과 나는 카드만.
  function cardsFor(G,n,tier=null){
    return S.cards.filter(c=>c.tier&&c.concept&&(!tier||c.tier===tier)&&(!c.only||c.only===n.id)&&!owned(n,c.id)&&
      !(c.id==='warehouse'&&(n.warehouse||owned(n,'plenty')))&&!(c.id==='bigShip'&&n.bigShip)&&!(c.id==='moreShip'&&n.ships.length>=maxShips(n))&&
      !(c.id==='quality'&&n.quality[n.main]>=3)&&!(c.id==='school'&&CONSUMER.every(g=>n.quality[g]>=3))&&!(c.id==='autarky'&&!lacking(G,n).length)&&
      !(G.month>=48&&!c.immediate)).map(c=>c.id);
  }
  // 한 회의 = 같은 등급, 서로 다른 콘셉트 세 장(⛵ 골드는 큰 배·배 한 척 더 중 하나)
  function makeMeeting(G,n,reroll=false,old=null){
    const year=Math.floor(G.month/12)+1,mt=n.meetings,rank=n.history.at(-1)?.rank||0,catchup=rank>=4,odds=V.odds[year-1];
    if(!reroll){mt.years.push(year);if(catchup)mt.free++;}
    const ok=t=>new Set(cardsFor(G,n,t).map(id=>CON[id])).size>=3;
    let r=random(G),i=0;while(i<2&&r>=odds[i])r-=odds[i++];
    if(catchup&&random(G)<V.catchupChance)i=Math.min(2,i+1);
    if(year>=4&&!mt.traitSeen&&S.cards.some(c=>c.only===n.id))i=1;   // 늦어도 4년째에 특성 카드
    // shortcut: 콘셉트가 셋 미만인 등급은 남은 등급 확률로 다시 뽑는다.
    if(!ok(V.tiers[i])){const valid=V.tiers.map((t,k)=>({k,w:ok(t)?odds[k]||.01:0})),total=sum(valid.map(x=>x.w));let r=random(G)*total;i=valid.find(x=>(r-=x.w)<0)?.k??0;}
    const tier=V.tiers[i],pool=cardsFor(G,n,tier),trait=!mt.traitSeen&&pool.find(id=>card(id).only===n.id),offered=[];
    if(trait){offered.push(trait);mt.traitSeen=true;}
    for(const id of shuffle(G,pool.filter(id=>!card(id).only)))if(offered.length<3&&!offered.some(x=>CON[x]===CON[id]))offered.push(id);
    const cards=shuffle(G,offered);
    mt.offers.push({year,tier,cards:[...cards],reroll,day:today(G)});
    return {type:'meeting',year,tier,cards,catchup,rerolls:old?(old.rerolls||0)+1:0};
  }
  const rerollCost=G=>player(G).meetings.free>0?0:V.rerollCost;
  function rerollMeeting(G){
    const n=player(G),p=G.pending,cost=rerollCost(G);
    if(p?.type!=='meeting'||!p.tier||n.debt||n.money<cost)return false;
    if(cost)cash(G,n,-cost);else n.meetings.free--;
    Object.assign(p,makeMeeting(G,n,true,p));forecasts.delete(G);return true;
  }
  // 봇·NPC: 특성 카드 → 이미 모은 콘셉트 → 우리 나라 콘셉트(특성 카드의 콘셉트) → 나머지. 'random'은 처음 하는 학생 흉내.
  function pickCard(G,n,cards,mode){
    if(mode==='random')return pick(G,cards);
    const home=CON[S.cards.find(c=>c.only===n.id)?.id];
    const value=id=>card(id).only===n.id?100:conCount(n,CON[id])?50+conCount(n,CON[id]):CON[id]===home?40:0;
    const best=Math.max(...cards.map(value));
    return pick(G,cards.filter(id=>value(id)===best));
  }

  // ---------- 항로 고르기(NPC·봇 공용) ----------
  // 1점 = W원으로 보고 "수입해서 채우는 생활 점수 − 내는 돈 + 수출로 버는 돈"이 크게 칸을 채운다.
  const W = 18;
  function committed(n, g, dir, except, to) {
    return sum(n.ships.filter(s => s !== except && s.route && (!to || s.route.to === to)).map(s => s.route[dir][g] * 3 / (s.tripMonths || 3)));   // 떠나기 전 배는 3달로 본다(NPC 계획 셈은 그대로)
  }
  // 다른 나라 배들이 이미 그 섬과 같은 물건을 계약한 양(계절당)
  const rivals = (G, n, o, g, dir, except) => sum(G.nations.filter(m => m !== n).map(m => committed(m, g, dir, except, o.id))) + committed(n, g, dir, except, o.id);
  // 한 섬에 대해 칸을 욕심쟁이로 채운다: 가는 칸은 비싼 남는 물건부터, 오는 칸은 점수에 비해 싼 모자란 물건부터.
  function planFor(G, n, ship, o, opts = {}) {
    const tps = 3 / tripTime(G, n, o.id), need = uses(G, n), k = slotsOf(G, n, o), give = none(), get = none();
    const oNeed = o.world ? null : uses(G, o);
    const oGap = g => o.world ? X.worldLimit / 4 : oNeed[g] - produces(G, o, g) - rivals(G, n, o, g, 'give', ship);
    const oSpare = g => o.world ? 99 : produces(G, o, g) - oNeed[g] - rivals(G, n, o, g, 'get', ship);
    let v = 0, left = k, earn = 0, relayExtra=false;
    for (const g of GOODS.filter(g => canGive(G, n, g) && buys(G, o, g)).sort((a, b) => price(G, n, o, b) - price(G, n, o, a))) {
      // 중계 물건은 생산이 아니라 창고에 쌓인 여분(사 온 것)만큼 되판다
      const spare = isRelay(G, n, g) ? Math.floor(exportable(G, n, g) * tps / 2) : produces(G, n, g) - need[g];
      if(!relayExtra&&owned(n,'relayStore')&&isRelay(G,n,g)){left+=V.relaySlots;relayExtra=true;}
      const flow = Math.min(spare - committed(n, g, 'give', ship), oGap(g));
      let q = Math.min(left, Math.ceil(flow / tps), isRelay(G, n, g) ? 99 : supplyCap(G, n, ship, o, g, n));
      if (has(n, 'artisan') && n.quality[g] === 3 && !o.world) q = Math.min(q, owned(n,'luxStreet')?V.luxMax:XT.luxMax);
      if (q <= 0) continue;
      give[g] = q; left -= q; v += Math.min(q * tps, flow) * price(G, n, o, g); earn += q * price(G, n, o, g);
    }
    // 균형 전략은 필요량의 1.2배를 목표로 사 와서 창고에 쌓아 둔다(비축).
    // 재료(철광석·철강)는 바구니 점수가 아니라 "그걸로 만들 제품을 먼 바다에 팔 때 값"으로 친다.
    const matWorth = g => { const p = productsOf(g)[0]; return p == null ? 0 : worldPrice(G, p) * X.worldBuy / (PER || 1); };
    const worth = g => (need[g] ? S.goods[g].need > 0 ? W * X.slotPoints / need[g] : matWorth(g) : 0) - price(G, o, n, g) + (o.quality[g] === 3 ? 5 : 0);
    let budget = n.money + Math.max(0, earn - n.debt), got = false;
    left = k;
    for (const g of GOODS.filter(g => !give[g] && sells(G, o, g) && worth(g) > 0).sort((a, b) => worth(b) - worth(a))) {
      // 7.0 항구 섬나라는 되팔 손님(다른 나라)이 있는 물건을 1.5배까지 사 와서 쌓는다
      const relayBuy = has(n, 'port') && isRelay(G, n, g) && G.nations.some(m => m !== n && m !== o && buys(G, m, g));
      const mult = Math.max(opts.spread ? 1.2 : 1, relayBuy ? XT.relayStock : 1);
      const p = price(G, o, n, g), flow = Math.min(Math.round(need[g] * mult) - produces(G, n, g) - committed(n, g, 'get', ship), oSpare(g));
      const q = Math.min(left, Math.ceil(flow / tps), Math.floor(budget / p), supplyCap(G, n, ship, o, g));
      if (q <= 0) continue;
      get[g] = q; left -= q; budget -= q * p; got = true; v += Math.min(q * tps, flow) * worth(g);
    }
    if (got && opts.spread && n.ships.some(s => s !== ship && s.route?.to === o.id)) v *= .6;
    return {r: {to: o.id, give, get}, v};
  }
  function bestRoute(G, n, ship, opts = {}) {
    let best = null, bv = 0;
    // NPC 배는 ♥2 이상인 학생 나라에만 찾아온다(신뢰를 쌓으면 손님 배가 늘어난다).
    const partners = opts.only ? [nation(G, opts.only), G.world] : [...G.nations.filter(o => o !== n && o.id !== opts.skip && (o.npc || !n.npc || rel(G, n, o) >= X.visitRel || on(o, 'diplomat', 3) && rel(G, n, o) > 0)), G.world];
    for (const o of partners) {
      const {r, v} = planFor(G, n, ship, o, opts), w = v * (o.world ? .8 : 1);
      if (w > bv && allowed(G, n, r, ship)) { bv = w; best = r; }
    }
    return best;
  }
  // 8.3 NPC 계약 요청: NPC 배가 우리 나라와 계약하고 싶으면 바로 맺지 않고 요청을 걸어 둔다(배는 항구에서 기다림).
  // 학생이 actionDays일 안에 수락하면 계약, 거절하거나 기한이 지나면 그 배는 다른 나라를 고른다.
  function npcRoute(G, n, ship, skip) {
    const r = bestRoute(G, n, ship, {spread: n.strategy === 'balanced', skip});
    if (!r) return;
    if (r.to !== player(G).id || G.bot) return void sign(G, n, ship, r);   // 봇 판은 8.2까지처럼 바로 맺는다
    ship.offer = true;
    (G.offers ??= []).push({id: G.offerSeq = (G.offerSeq || 0) + 1, from: n.id, ship: n.ships.indexOf(ship), r, until: today(G) + V.actionDays});
  }
  function answerOffer(G, id, yes) {
    const f = (G.offers || []).find(f => f.id === id), n = f && nation(G, f.from), ship = n?.ships[f.ship];
    if (!ship) return false;
    G.offers = G.offers.filter(x => x !== f); ship.offer = false;
    if (yes && sign(G, n, ship, f.r) !== false) { news(G, `${n.name} 배와 1년 계약을 맺었어요.`); return true; }
    if (yes) news(G, `${n.name}의 요청은 지금 조건으로 맺을 수 없어요(재고·금고가 바뀜).`, 'warn');
    ship.skip = player(G).id;   // 그날 끝에 우리 말고 다른 나라를 고른다
    return false;
  }
  const offerTick = G => { for (const f of (G.offers || []).filter(f => f.until < today(G))) answerOffer(G, f.id, false); };

  // ---------- 학생 조작 ----------
  function setRoute(G, i, r) {
    const n = player(G), s = n.ships[i];
    if (!s || !allowed(G, n, r, s)) return false;
    forecasts.delete(G); G.stats.routeSets++;
    if (!s.route) { sign(G, n, s, r); if (s.state === 'port' && !(s.repair > G.month)) depart(G, n, s); }
    else { s.next = norm(G, n, r); s.next.dump = GOODS.map(g => !!s.next.give[g] && isDump(G, nation(G, r.to), g)); }
    return true;
  }
  function breakContract(G, i) {
    const s = player(G).ships[i];
    if (!s?.route || s.breaking) return false;
    forecasts.delete(G); s.breaking = true;
    if (s.state === 'port') endContract(G, player(G), s, true);
    return true;
  }

  // ---------- 새 판 ----------
  function newGame(seed = 1, countryId = 'daon', opts = {}) {
    const G = {version: S.version, seed, rng: (seed >>> 0) || 1, month: 0, day: 1, nations: [], rel: {}, base: S.goods.map(g => g.price), trend: zeros(), drift: zeros(),
      mods: [], cut: null, crises: [], queue: [], pending: null, news: [], over: false, calm: !!opts.calm, cutTarget: opts.cutTarget || null, contracts: [], seen: [], story: [],
      stats: {pauses: 0, stops: 0, routeSets: 0, breaks: 0, misses: 0, declines: 0, crises: 0, cards: 0, cardIds: [], shortMade: 0, worldCap: false}};   // 7.2 cards~worldCap: 도감용
    for (let i = 0; i < 3; i++) random(G);
    // NPC 4곳 뽑기: 우리가 모자란 물건마다 파는 나라가 1곳 이상, 그리고 모자란 물건의 2/3 이상은 2곳 이상이 되게 다시 뽑는다.
    // 쓰는 양 = 국민 필요량 + 공장 투입(사다리)
    const useOf = (id, g) => baseNeed(T.countries.find(c => c.id === id).workers, g) + sum(productsOf(g).map(p => Math.ceil(S.countries[id].levels[p] * S.goods[p].load * perOf({id}, p))));
    const me = T.countries.find(c => c.id === countryId), lacks = GOODS.filter(g => S.countries[countryId].levels[g] * S.goods[g].load < useOf(countryId, g));
    const sellerCount = (ids, g) => ids.filter(id => S.countries[id].levels[g] * S.goods[g].load > useOf(id, g)).length;
    const good = (ids, strict) => lacks.every(g => sellerCount(ids, g) >= 1) && (!strict || lacks.filter(g => sellerCount(ids, g) >= 2).length * 3 >= lacks.length * 2);
    let others, tries = 0;
    do others = shuffle(G, T.countries.map(c => c.id).filter(id => id !== countryId)).slice(0, 4); while (!good(others, tries < 40) && ++tries < 80);
    G.nations = [makeNation(countryId, false), ...others.map(id => makeNation(id, true))];
    G.world = makeWorld();
    for (const n of G.nations) if (has(n, 'plains')) n.trait.next = weatherDraw(G, n);
    for (const a of G.nations) { G.rel[a.id] = {}; for (const b of G.nations) if (a !== b) G.rel[a.id][b.id] = X.relStart; }
    for (const n of G.nations) n.strategy = n.npc ? (random(G) < .5 ? 'focus' : 'balanced') : null;
    const slots = shuffle(G, pick(G, X.tripSets));
    G.dist = Object.fromEntries(others.map((id, k) => [id, slots[k]]));
    // 8.1 항로 개성: 섬 두 곳에 좋은 특징 하나와 위험한 특징 하나
    const kinds = k => S.laneTraits.filter(t => t.kind === k).map(t => t.id), [a, b] = shuffle(G, others);
    G.lanes = {[a]: pick(G, kinds('good')), [b]: pick(G, kinds('risk'))};
    G.startShips = opts.startShips ?? X.openShips;
    const P = player(G);
    for (let k = 0; k < shipsAt(G, 0); k++) P.ships.push(newShip());
    for (const n of G.nations.slice(1)) for (let k = 0; k < X.npcShips + (S.countries[n.id].extraShip ? 1 : 0); k++) n.ships.push(newShip());
    G.plan = planEvents(G);
    G.priceHistory=GOODS.map(()=>[]);G.pricePulses=[];G.northSaleUntil=0;G.small={last:0,next:nextSmallDay(G,0),log:[],actions:[],lastAction:0,lastAsk:0};
    // 처음부터 항구가 열려 있다. 첫 출항에 실을 짐이 있게 한 계절 생산만큼 창고를 채워 둔다.
    // 7.9c 생활 물건(대표 물건 빼고)은 처음 창고를 덜 채운다: 첫해는 배 3척으로 채워 가는 해(점수 곡선이 커 가게)
    for (const n of G.nations) for (const g of GOODS) add(n, g, Math.round(produces(G, n, g) * (CONSUMER.includes(g) && g !== n.main ? V.startStock : 1)), n.quality[g]);
    // 8.4 NPC 첫 계약도 첫날 끝에(npcPick) 맺는다: 학생이 첫날 먼저 고른다
    recordPrices(G);   // 7.9 발전 회의는 2·3·4·5년째 1월 1일(첫해는 배 3척으로 무역 익히기)
    ask(G, {type: 'open'});
    return G;
  }
  // 7.3 저장은 순수 데이터. pending만 queue 첫 항목과 같은 객체로 되살린다.
  const SAVE_VERSION = 3;   // 7.9 이전 저장은 이어하지 않는다(SPEC-v79 10.5)
  const saveGame = G => ({saveVersion: SAVE_VERSION, ...JSON.parse(JSON.stringify(G))});
  function loadGame(obj) {
    try {
      const plain = v => v === null || ['string', 'boolean'].includes(typeof v) || typeof v === 'number' && Number.isFinite(v) || typeof v === 'object' && (Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype) && Object.entries(v).every(([k, x]) => !['__proto__', 'constructor', 'prototype'].includes(k) && plain(x));
      if (!plain(obj) || obj?.saveVersion !== SAVE_VERSION || obj.version !== S.version || !Number.isInteger(obj.month) || obj.month < 0 || obj.month >= 60 || !Number.isInteger(obj.day) || obj.day < 1 || obj.day > monthDays(obj.month) || !Number.isInteger(obj.rng) || obj.rng < 0 || obj.rng > 0xffffffff) return null;
      const G = JSON.parse(JSON.stringify(obj)); delete G.saveVersion;
      const shape = (v, t) => t === null ? true : Array.isArray(t) ? Array.isArray(v) && (!t.length || v.length === t.length && v.every((x, i) => shape(x, t[i]))) : typeof t === 'object' ? v && typeof v === 'object' && !Array.isArray(v) && Object.keys(t).every(k => Object.hasOwn(v, k) && shape(v[k], t[k])) : typeof v === typeof t;
      if (!Array.isArray(G.nations) || G.nations.length !== 5 || new Set(G.nations.map(n => n?.id)).size !== 5 || G.nations.some(n => !S.countries[n?.id])) return null;
      const base = newGame(G.seed, G.nations[0].id);
      for (const k of ['nations', 'dist', 'rel', 'queue', 'pending', 'plan', 'lanes']) delete base[k];
      // 8.1 항로 특징: 8.0 저장에는 없으니 빈 것으로 받는다
      G.lanes ??= {};
      if (!G.lanes || typeof G.lanes !== 'object' || Array.isArray(G.lanes) || Object.entries(G.lanes).some(([id, t]) => !G.nations.slice(1).some(n => n.id === id) || !S.laneTraits.some(x => x.id === t))) return null;
      base.news = [];base.priceHistory=GOODS.map(()=>[]);
      if (!shape(G, base) || !shape(G.world, makeWorld())) return null;
      const ids = G.nations.map(n => n.id), target = id => id === 'world' || ids.includes(id), vector = a => Array.isArray(a) && a.length === GOODS.length && a.every(x => typeof x === 'number' && x >= 0);
      const route = r => r === null || r && target(r.to) && vector(r.give) && vector(r.get);
      for (const n of G.nations) {
        if(!Array.isArray(n.augments)||n.augments.some(id=>!card(id))||!Number.isInteger(n.meetings?.free)||n.meetings.free<0||!Array.isArray(n.meetings.years)||!Array.isArray(n.meetings.offers)||n.meetings.offers.some(p=>!V.tiers.includes(p.tier)||!Array.isArray(p.cards)||p.cards.length!==3||p.cards.some(id=>!card(id)||card(id).tier!==p.tier)))return null;
        if(!Object.values(n.smallBonus).every(v=>Number.isInteger(v)&&v>=0)||!Array.isArray(n.investment)||n.investment.some(i=>!Number.isInteger(i.month)||!Number.isInteger(i.money)||i.money<1)||!Object.values(n.signedWith).every(v=>Number.isInteger(v)&&v>=0)||n.brandBuyer!==null&&!ids.includes(n.brandBuyer))return null;
        if (!Number.isInteger(n.debt) || n.debt < 0 || !Number.isInteger(n.money) || n.money < 0) return null;
        if ([n.year, n.lastYear].filter(Boolean).some(y => !Number.isInteger(y.penaltyDebt) || y.penaltyDebt < 0)) return null;
        for (const h of n.history || []) if (![h.debt, h.penaltyDebt].every(v => Number.isInteger(v) && v >= 0)) return null;
        if (!shape(n, makeNation(n.id, n.npc)) || n.npc !== (n !== G.nations[0]) || !n.ships.length || n.ships.length > maxShips(n) || !G.rel?.[n.id]) return null;
        for (const o of G.nations) if (o !== n && (!Number.isInteger(G.rel[n.id][o.id]) || G.rel[n.id][o.id] < 0 || G.rel[n.id][o.id] > X.relMax)) return null;
        if (n !== G.nations[0] && ![1, 2, 3, 4].includes(G.dist?.[n.id])) return null;
        for (const s of n.ships) {
          if (!shape(s, newShip()) || !['port', 'sea'].includes(s.state) || !route(s.route) || !route(s.next) || !Number.isInteger(s.retry) || s.retry < 0 || !Number.isInteger(s.tripMonths) || s.tripMonths < 0) return null;
          if (s.route && (!vector(s.route.gp) || !vector(s.route.bp) || !Number.isInteger(s.route.done) || s.route.done < 0 || !Number.isInteger(s.route.trips) || s.route.trips < 0 || !Number.isInteger(s.route.until) || !['signed', 'traded', 'stake'].every(k => typeof s.route[k] === 'number'))) return null;
          if (s.state === 'sea' && (!s.route || !Number.isInteger(s.t) || !Number.isInteger(s.T) || s.t < 0 || s.t >= s.T || (!Number.isInteger(s.arrive)||s.arrive<1||s.arrive>s.T) || !s.cargo || !['give', 'get', 'q', 'sold'].every(k => vector(s.cargo[k])) || !['earned', 'spent'].every(k => typeof s.cargo[k] === 'number') || !Array.isArray(s.cargo.shortages))) return null;
          const penalties = a => Array.isArray(a) && a.every(p => GOODS.includes(p.good) && Number.isInteger(p.qty) && p.qty > 0 && Number.isInteger(p.amount) && p.amount >= p.qty && typeof p.reason === 'string' && (p.debt == null || Number.isInteger(p.debt) && p.debt >= 0 && p.debt <= p.amount));
          if (s.cargo && (!penalties(s.cargo.penaltyIn) || !penalties(s.cargo.penaltyOut))) return null;
          for (const r of [s.route, s.next]) if (r && (!Array.isArray(r.dump) || r.dump.length !== GOODS.length || r.dump.some(v => typeof v !== 'boolean'))) return null;
        }
      }
      if(!Array.isArray(G.priceHistory)||G.priceHistory.length!==GOODS.length||G.priceHistory.some(a=>!Array.isArray(a)||a.length>6||a.some(p=>!Number.isInteger(p.month)||!Number.isInteger(p.price)||p.price<1))||!Array.isArray(G.pricePulses)||G.pricePulses.some(p=>!GOODS.includes(p.good)||!Number.isInteger(p.from)||!Number.isInteger(p.until)||p.until<=p.from||typeof p.mult!=='number'||p.mult<=0||(p.minPrice!=null&&(!Number.isInteger(p.minPrice)||p.minPrice<1))))return null;
      const smallValid=a=>a&&S.smallEvents.some(e=>e.id===a.id)&&Number.isInteger(a.day)&&Number.isInteger(a.until)&&a.until>=a.day&&GOODS.includes(a.good)&&(a.target===null||ids.includes(a.target))&&typeof a.done==='boolean'&&(a.action===null||['판다','보낸다'].includes(a.action))&&typeof a.text==='string';
      if(!Number.isInteger(G.small.last)||!Number.isInteger(G.small.next)||!Number.isInteger(G.small.lastAction)||!Number.isInteger(G.small.lastAsk)||G.small.next<G.small.last||!Array.isArray(G.small.log)||!Array.isArray(G.small.actions)||![...G.small.log,...G.small.actions].every(smallValid))return null;
      // 8.3 NPC 계약 요청: 보낸 나라·배·짐 모양만 확인한다
      if(G.offers!=null&&(!Array.isArray(G.offers)||!G.offers.every(f=>Number.isInteger(f.id)&&Number.isInteger(f.until)&&G.nations.some(n=>n.npc&&n.id===f.from&&n.ships[f.ship])&&f.r&&['give','get'].every(k=>Array.isArray(f.r[k])&&f.r[k].length===GOODS.length&&f.r[k].every(v=>Number.isInteger(v)&&v>=0)))))return null;
      const prompt = p => p && (!p.source || target(p.source)) && (!p.target || target(p.target)) && (p.good == null || GOODS.includes(p.good)) && (p.type === 'open' || p.type === 'yearEnd' && Number.isInteger(p.year) || p.type === 'meeting' && Array.isArray(p.cards) && p.cards.every(id => S.cards.some(c => c.id === id)) || p.type === 'event' && !!event(p.id) && typeof p.until === 'number');
      if (!Array.isArray(G.plan) || G.plan.some(p => !event(p.id) || !Number.isInteger(p.month)) || !Array.isArray(G.queue) || G.queue.some(p => !prompt(p)) || JSON.stringify(G.pending) !== JSON.stringify(G.queue[0] || null)) return null;
      if(G.queue.some(p=>p.type==='meeting'&&(!V.tiers.includes(p.tier)||p.cards.length!==3||new Set(p.cards.map(id=>CON[id])).size!==3||p.cards.some(id=>card(id).tier!==p.tier))))return null;
      G.pending = G.queue[0] || null;
      return G;
    } catch { return null; }
  }
  // 7.8 현재 계약 그대로 다음 정산까지 진행. 선택은 사건 0번, 나머지는 넘긴다.
  function forecast(G) {
    const key = today(G), hit = forecasts.get(G);
    if (hit?.day === key) return hit.value;
    const C = JSON.parse(JSON.stringify(G)), n = player(C), len = n.seasons.length;
    C.pending = C.queue[0] || null;
    while (!C.over && n.seasons.length === len) {
      while (C.pending) choose(C, C.pending.type === 'event' ? 0 : null);
      tickDay(C);
    }
    const last = n.last, slotsBy = last ? last.slotsBy : [], causes = slotsBy.filter(b => b.got < b.need).map(b => ({loss: b.max - b.points, text: `${GN(b.good)} ${b.need - b.got}상자 부족`}));
    for (const [k, t] of [['debt', '빚 때문에'], ['unrest', '물가 오름'], ['crisis', '위기 피해'], ['empty', '빈 칸'], ['pollution', '공장 연기']]) if (last?.[k]) causes.push({loss: last[k], text: `${t} −${last[k]}점`});
    if (last?.extra < 0) causes.push({loss: -last.extra, text: `사건의 불편 ${last.extra}점`});
    const reasons = causes.sort((a, b) => b.loss - a.loss).map(c => c.text);
    if (!reasons.length) reasons.push('다 채워요');
    const value = {score: last?.score || 0, slotsBy, reasons, debt: last?.debt || 0, qual: last?.qual || 0, abundance:last?.abundance||0, raw: last?.raw ?? last?.score ?? 0,
      unrest: last?.unrest || 0, extra: last?.extra || 0, crisis: last?.crisis || 0, empty: last?.empty || 0, pollution: last?.pollution || 0};
    forecasts.set(G, {day: key, value}); return value;
  }
  // 학생 배 수: 처음 3척(항구 섬나라 4척). 늘리는 길은 '배 한 척 더'·'대선단' 카드뿐.
  function shipsAt(G, m) { return G.startShips + (S.countries[player(G).id].extraShip ? 1 : 0); }

  // ---------- 봇 ----------
  function botTurn(G, mode, opts) {
    const P = player(G), p = G.pending;
    if (p) {
      if (p.type === 'event') choose(G, mode === 'random' ? Math.floor(random(G) * event(p.id).options.length) : mode === 'balanced' || event(p.id).extra ? npcOption(G, P, p) : p.id === 'supplyCut' ? 1 : 0);
      else if (p.type === 'meeting') {
        choose(G,pickCard(G,P,p.cards,mode));
      } else choose(G, null);
      return;
    }
    if (mode === 'self') return;
    const ro = {spread: mode === 'balanced', only: mode === 'one' ? opts.oneTarget : null};
    P.ships.forEach((s, i) => {
      if (!s.route) {
        let r = bestRoute(G, P, s, ro);
        if (mode === 'random') { const all = []; for (const o of [...G.nations.slice(1), G.world]) for (const give of [null, ...GOODS]) for (const get of [null, ...GOODS]) if ((give == null || canGive(G, P, give) && buys(G, o, give)) && allowed(G, P, {to: o.id, give, get})) all.push({to: o.id, give, get}); r = all.length ? pick(G, all) : null; }
        if (r) setRoute(G, i, r);
        return;
      }
      if (s.next || s.breaking || mode === 'random') return;
      if (s.route.done >= s.route.trips - 1) {   // 7.7 자동 갱신이 없으니 마지막 왕복 때 새 계약을 예약
        const r = bestRoute(G, P, s, ro);
        if (r) setRoute(G, i, r);
      }
      if (mode === 'opportunist') {
        const o = nation(G, s.route.to), r = s.route;
        const better = GOODS.some(g => r.get[g] && price(G, o, P, g) <= r.bp[g] * .85 || r.give[g] && price(G, P, o, g) >= r.gp[g] * 1.15);
        if (better && r.done < r.trips - 1 && GOODS.every(g => !r.give[g] || buys(G, o, g))) { setRoute(G, i, r); breakContract(G, i); }
      }
    });
  }
  function runBot(seed, id, mode = 'focus', opts = {}) {
    const G = newGame(seed, id, opts);
    G.bot = true;
    let guard = 0;
    while (!G.over && guard++ < 5000) { botTurn(G, mode, opts); tick(G); }
    return G;
  }

  // ---------- 7.0 화면용: 나라 칸(traitInfo)과 엔딩 한 줄(traitResult) ----------
  // 결과 책 그래프에 쓸 해마다 값: 석유는 남은 매장량, 다온은 철강 재고, 나머지는 쌓인 값(관광·중계 수입, 명품 상자, 공해, 빈 칸, 원조)
  function traitValue(n) {
    const t = n.trait;
    return {daon: count(n, 5), plains: t.aids, oil: t.reserve, market: t.empties, forest: t.tourism, port: t.relay, artisan: t.lux, ironland: t.pollution}[n.id] ?? 0;
  }
  const WEATHER = [['☀️', '풍년'], ['⛅', '보통'], ['🌧', '흉년']];
  function traitInfo(G, n) {
    const c = S.countries[n.id], tr = c.trait, t = n.trait, need = needs(G, n);
    const base = {id: n.id, trait: tr.id, name: tr.name, icon: tr.icon, short: tr.short, level: tr.level, main: n.main};
    const selected=S.cards.find(c=>c.only===n.id&&owned(n,c.id));if(selected)base.short=selected.text;
    if (n.id === 'daon') {
      const use = Math.max(1, Math.ceil(produces(G, n, 3) * perOf(n, 3))), k = Math.floor(count(n, 5) / use);
      return {...base, value: k, text: `철강 ${k}계절치`, warn: t.idleRun > 0 || k === 0 ? 'bad' : k === 1 ? 'warn' : 'ok', frac: Math.min(1, k / 3),
        tip: t.idleRun > 0 ? '공장이 철강이 없어 멈췄어요. 한 계절 더 멈추면 첨단기기 산업이 녹슬어요!' : `창고 철강 ${count(n, 5)}상자로 공장을 ${k}계절 돌릴 수 있어요.`};
    }
    if (n.id === 'plains') {
      const [ic, w] = WEATHER[t.next];
      return {...base, icon: ic, value: t.next, text: `다음 계절 ${w}`, warn: t.next === 2 ? 'bad' : t.next === 0 ? 'ok' : 'ok',
        tip: `다음 계절은 ${w}이에요. ${t.next === 0 ? '식량이 1.5배! 남는 식량을 원조로 보내면 ♥+2예요.' : t.next === 2&&!owned(n,'granary') ? '식량이 절반만 나와요. 식량을 아껴 두세요.' : '식량이 평소만큼 나와요.'} 원조 ${t.aids}번`};
    }
    if (n.id === 'oil') {
      const nextAt = (XT.oilStages || []).find(x => t.reserve >= x), left = nextAt == null ? 0 : t.reserve - nextAt + 1;
      return {...base, value: t.reserve, text: `매장량 ${t.reserve}`, frac: t.reserve / XT.oilReserve, warn: t.stage >= 3 ? 'bad' : nextAt != null && left <= 12 ? 'warn' : 'ok',
        tip: nextAt == null ? '유전이 바닥났어요. 석유는 3상자씩만 나와요. 다른 산업으로 먹고살아야 해요.' : `남은 석유 ${t.reserve}상자 · ${left}상자 더 캐면 생산이 줄어요. 지금 석유 생산 ${produces(G, n, 1)}상자/계절`};
    }
    if (n.id === 'market') {
      const risk = CONSUMER.filter(g => count(n, g) + produces(G, n, g) < need[g]).length;
      return {...base, value: risk, text: `큰손 −10% · 빈 칸 ${risk}`, warn: risk ? 'bad' : 'ok',
        tip: risk ? `이대로면 바구니 ${risk}칸이 비어 생활 점수가 ${risk * (owned(n,'shopping')?V.shopping:XT.emptyPenalty)}점 더 깎여요. 배를 나눠 보내세요.` : '바구니가 다 찰 것 같아요. 다른 나라들이 10% 깎아 줘요.'};
    }
    if (n.id === 'forest') {
      const v = forestTour(G, n), friends = G.nations.filter(o => o !== n && rel(G, n, o) >= 2).length, cut = grownBesides(n, 0);
      return {...base, value: v, text: `관광 +${v}억`, warn: v ? 'ok' : 'warn',
        tip: `♥2 이상 친구 ${friends}나라 × ${XT.tourPerFriend}억${cut ? ` − 공장 ${cut}단계 × ${XT.tourCut}억` : ''} = 계절마다 ${v}억${owned(n,'ecotour')?' (생태 관광 +50%)':''}`};
    }
    if (n.id === 'port') return {...base, value: t.relayYear, text: `중계 +${t.relayYear}억`, warn: 'ok', tip: `올해 사 온 물건을 되팔아 ${t.relayYear}억을 벌었어요(지금까지 ${t.relay}억). 되판 상자는 값 +${Math.round((XT.relayBonus*(owned(n,'relayStore')?1+V.relay:1)-1)*1000)/10}%예요.`};
    if (n.id === 'artisan') {
      const k = GOODS.filter(g => n.quality[g] === 3 && sells(G, n, g)).length;
      return {...base, value: k, text: `명품 ${k}종`, warn: k ? 'ok' : 'warn', tip: `⭐3 물건 ${k}가지를 ${Math.round((XT.luxBonus - 1) * 100)}% 비싸게 팔아요. 한 항로에 ${owned(n,'luxStreet')?V.luxMax:XT.luxMax}상자까지만 실을 수 있어요. 지금까지 ${t.lux}상자 팔았어요.`};
    }
    if (n.id === 'ironland') {
      let v = Math.floor((levelOf(G, n, 4) + levelOf(G, n, 5)) / XT.pollutionPer); if (t.cleaner) v = Math.floor(v / 2);v=Math.max(0,v-(owned(n,'modernSteel')?V.pollutionReduction:0));
      return {...base, value: v, text: `공해 −${v}점`, warn: v >= 4 ? 'bad' : v >= 2 ? 'warn' : 'ok',
        tip: `철광석·철강 산업 ${levelOf(G, n, 4) + levelOf(G, n, 5)}단계 ÷ ${XT.pollutionPer}${t.cleaner ? ' ÷ 2(정화 시설)' : ''} = 계절마다 생활 −${v}점${t.cleaner ? '' : ' · 발전 회의의 정화 시설로 절반이 돼요'}`};
    }
    return {...base, value: 0, text: '', warn: 'ok', tip: ''};
  }
  function traitResult(G, n) {
    const t = n.trait, k = XT.good || {};
    const r = {
      daon: [t.stops <= k.daon, `🏭 공장 멈춤 ${t.stops}번 · 녹슮 ${t.rusts}번`],
      plains: [t.aids >= k.plains, `🤝 원조 ${t.aids}번`],
      oil: [grownBesides(n, 1) >= k.oil, `⛽ 매장량 ${t.reserve}상자 남기고 다른 산업 ${grownBesides(n, 1)}단계 키움`],
      market: [t.empties <= k.market, `🛒 빈 칸 ${t.empties}번`],
      forest: [t.tourism >= k.forest, `🏝 관광 수입 ${t.tourism}억`],
      port: [t.relay >= k.port, `🔁 중계 수입 ${t.relay}억`],
      artisan: [t.lux >= k.artisan, `✨ 명품 ${t.lux}상자 판매`],
      ironland: [t.cleaner, `💨 공해 −${t.pollution}점${t.cleaner ? ' · 정화 시설' : ''}`]
    }[n.id] || [false, ''];
    return {good: !!r[0], line: r[1]};
  }

  return {tradedBoxes, tradeGrowth, supplyCap, answerOffer, outlook, cap, homeStage, grownPoints, overScore, totalScore, concepts, mainConcept, conceptOf: id => CON[id] || null, maxShips, rerollCost, rerollMeeting, priceSignal, smallActions, takeSmallAction, smallEvent, forecast, debtLoss, FOREVER, modActive: active, advance, tickDay, tripDays, monthDays, dayNo, dateOf, dayText, today, fitTrips, yearReport, isDump, dumpPrice, exportPrice, saveGame, loadGame, traitInfo, traitResult, canGive, isRelay, T, S, X, GOODS, RAW, CHAIN, CONSUMER, codexAdd, codexNormalize, codexSlots, codexStats, planEvents, goodName: GN, inputOf, newGame, tick, choose, setRoute, breakContract, allowed, price, worldPrice, needs, uses, inputNeed, levelOf, produces, count, exportable,
    sells, buys, tripTime, slotsOf, rel, player, nation, ranking, cardsFor, cardCost, dependence, bestRoute, plan: (G, n, ship, o) => planFor(G, n, ship, o).r, runBot, botTurn, isProtected};
});
