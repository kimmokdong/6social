/* 라이어 여행단 — 규칙 엔진과 AI (화면 없이 node 에서도 돌아감)
 * 더 지니어스 '라이어 게임' 방식: 모두 같은 기후에 다녀왔다고 말하지만, 한 명은 닮은 기후에 다녀온 라이어.
 * 자리(seat)는 사람(human)·AI(ai)·원격(remote) 어느 쪽이든 같은 명령(command)으로만 움직인다.
 * → 나중에 멀티플레이(한 기기 돌려 하기, 네트워크)를 붙일 때 엔진은 그대로 쓰고 명령만 주고받으면 된다.
 *   비밀 정보(손패·역할)는 view(state, seat) 로 자리마다 가려서 보여 준다. */
(function (root) {
  'use strict';
  const D = root.FAKE, B = root.FAKE_BANK, R = root.Replay;
  const ids = Object.keys(D.climates);

  const CFG = {
    rounds: 5, laps: 3, handSize: 5, startChips: 10,
    score: { catch: 2, miss: -1, accused: -2, escape: 4, glass: -1, combo: 1 },
    /* 찬스 카드: 대회마다 자리별 횟수 */
    chances: { glass: 1, swap: 1 },
    /* 의심 게이지 단계(0~100): 이 값 미만이면 초록, 그 위 노랑, 빨강 */
    heat: { calm: 40, hot: 70 },
    stages: {
      town:   { name: '동네 대회', ai: ['naive', 'naive', 'normal'], next: 'nation' },
      nation: { name: '전국 대회', ai: ['naive', 'normal', 'sharp'], next: 'world' },
      world:  { name: '세계 대회', ai: ['normal', 'sharp', 'sharp'], next: null }
    },
    /* notice: 거짓 증거를 알아챌 확률, trap: 진짜인데 이상해 보이는 증거에 품는 의심,
     * proof: 무엇을 '진짜 다녀온 증거'로 믿는가 — wide(다른 기후 대부분에 없으면), confuse(닮은 기후에 없어야) */
    personas: {
      /* bet: 가장 의심하는 사람과 두 번째의 차이가 [2점, 3점] 기준 이상이면 더 건다 */
      naive:  { name: '순진해요', notice: .55, trap: 26, proof: 'wide',    gut: 10, bet: [45, 999] },
      normal: { name: '차분해요', notice: .85, trap: 12, proof: 'mixed',   gut: 7,  bet: [30, 80] },
      sharp:  { name: '날카로워요', notice: 1, trap: 2,  proof: 'confuse', gut: 4,  bet: [20, 60] }
    },
    /* 여행자마다 어울리는 성격(대회 단계에 맞춰 뽑힘) */
    /* 캐릭터 고유 능력 (사람·AI 모두 같은 규칙) */
    perks: {
      haneul:  { icon: '🔍', name: '눈썰미', text: '돋보기를 2번 쓸 수 있어요', glass: 1 },
      junho:   { icon: '📸', name: '사진가', text: '돋보기를 써도 점수가 안 깎여요', freeGlass: true },
      miso:    { icon: '🔄', name: '짐 정리왕', text: '카드 바꾸기를 2번 할 수 있어요', swap: 1 },
      leo:     { icon: '🎯', name: '승부사', text: '확신 베팅을 4점까지 걸 수 있어요', maxBet: 4 },
      ara:     { icon: '🔥', name: '연승 체질', text: '콤보 점수가 +2점이에요', combo: 1 },
      park:    { icon: '🧓', name: '믿음직한 어른', text: '억울하게 지목돼도 점수가 안 깎여요', noAccuse: true },
      sophie:  { icon: '🎭', name: '연기파', text: '라이어로 탈출하면 +2점 더 받아요', escape: 2 },
      taeyang: { icon: '😊', name: '인기쟁이', text: '다들 처음엔 나를 덜 의심해요', calm: 8 }
    },
    characters: { junho: 'naive', park: 'naive', haneul: 'normal', miso: 'normal', taeyang: 'normal', leo: 'sharp', ara: 'sharp', sophie: 'sharp' },
    lines: {
      lie:     ['{c}? 이상한데…', '{c}라고? 수상해!', '어? {c}?'],
      trap:    ['{c}…? 좀 이상한데?', '음, {c}라니…'],
      proof:   ['오, 진짜 다녀왔구나!', '{c}! 확실하네.', '그건 {x}에만 있지!'],
      neutral: ['그게 다야?', '음… 뭔가 숨기는데?'],
      vote:    ['{n}, 수상해!', '나는 {n}!', '{n}일 것 같아.']
    }
  };

  const perk = seat => (seat && CFG.perks[seat.who]) || {};
  const maxBet = seat => perk(seat).maxBet || 3;

  /* ───── 카드 ───── */
  const itemName = k => D.items[k] || k;
  function pool(climate) {
    const photos = Object.entries(B.photos).filter(([, p]) => p.home === climate).map(([img, p]) => ({ ...p, img, type: 'photo', id: 'p:' + img }));
    const temps = B.temps.filter(t => t.home === climate).map(t => ({ ...t, type: 'temp', id: `t:${climate}:${t.text}` }));
    const quotes = B.quotes.filter(q => q.home === climate).map(q => ({ ...q, type: 'quote', id: 'q:' + q.text }));
    const items = Object.entries(B.items).map(([item, e]) => ({ ...e, item, type: 'item', id: 'i:' + item })).filter(c => c.tags.length && R.verdict(c, climate).v !== 'lie');
    return [...photos, ...temps, ...quotes, ...items];
  }
  const neutral = () => B.neutralQuotes.map(text => ({ type: 'quote', text, tags: [], neutral: true, id: 'n:' + text }));
  const verdict = (card, climate) => card.neutral ? { v: 'ok', why: '' } : R.verdict(card, climate);
  /* 다른 기후 중 몇 곳에서 거짓인가 (wide: 전체, confuse: 닮은 기후) */
  function proof(card, claim, mode) {
    if (card.neutral) return 0;
    const pick = mode === 'confuse' ? D.climates[claim].confuse : ids.filter(c => c !== claim);
    return pick.filter(c => verdict(card, c).v === 'lie').length / pick.length;
  }
  function cardName(card) {
    if (card.type === 'photo') return '그 사진';
    if (card.type === 'temp') return card.text;
    if (card.type === 'item') return itemName(card.item);
    return `"${card.text}"`;
  }

  /* ───── 씨앗 난수(상태 안에 저장 → 같은 명령이면 같은 결과) ───── */
  function rand(s) { let a = s.rng >>> 0; a = (a + 0x6D2B79F5) >>> 0; s.rng = a; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const pickOne = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
  function shuffle(s, arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ───── 대회 만들기 ─────
   * seats: [{ kind: 'human'|'ai'|'remote', who: 여행자 id }] — 비우면 사람 1 + AI 3 */
  function newContest({ seed = (Math.random() * 1e9) | 0, stage = 'town', me = 'haneul', seats } = {}) {
    const s = { v: 2, seed, rng: seed >>> 0 || 1, stage, round: -1, phase: 'lobby', seats: [], log: [], feed: [], results: [] };
    if (!seats) {
      const others = shuffle(s, Object.keys(D.travelers).filter(w => w !== me));
      const want = [...CFG.stages[stage].ai];
      const chosen = [];
      for (const p of want) { const i = others.findIndex(w => CFG.characters[w] === p && !chosen.includes(w)); chosen.push(i >= 0 ? others[i] : others.find(w => !chosen.includes(w))); }
      seats = [{ kind: 'human', who: me }, ...chosen.map((who, i) => ({ kind: 'ai', who, persona: want[i] }))];
    }
    s.seats = seats.map(x => ({ kind: x.kind, who: x.who, persona: x.persona || null, chips: CFG.startChips, hand: [], played: [], role: null, climate: null, vote: null, bet: null, susp: {}, chances: { glass: CFG.chances.glass + (perk(x).glass || 0), swap: CFG.chances.swap + (perk(x).swap || 0) }, glassed: [], streak: 0, peak: 0, stats: { caught: 0, escaped: 0, accused: 0, liar: 0, glassHit: 0, allin: 0, bestStreak: 0, ghost: 0 } }));
    /* 라이어 순서: 사람은 5라운드 중 1~2번 (여럿이면 고르게), 나머지는 AI */
    const humans = s.seats.map((x, i) => x.kind !== 'ai' ? i : -1).filter(i => i >= 0), ais = s.seats.map((x, i) => x.kind === 'ai' ? i : -1).filter(i => i >= 0);
    const plan = [];
    const humanTurns = humans.length > 1 ? humans.flatMap(h => [h]) : [humans[0], ...(rand(s) < .35 ? [humans[0]] : [])];
    for (let r = 0; r < CFG.rounds; r++) plan.push(null);
    const slots = shuffle(s, [1, 2, 3, 4, 0]).slice(0, humanTurns.length);
    humanTurns.forEach((h, k) => { plan[slots[k]] = h; });
    s.liarPlan = plan.map(x => x === null ? pickOne(s, ais) : x);
    return s;
  }

  /* 라운드 시작: 여행지·라이어·손패 */
  function deal(s) {
    s.round++; s.phase = 'play'; s.log = []; s.feed = [];
    const used = new Set(s.results.map(r => r.claim));
    const claims = shuffle(s, ids.filter(c => !used.has(c) && D.climates[c].confuse?.length));
    s.claim = claims[0] || pickOne(s, ids);
    s.liarSeat = s.liarPlan[s.round];
    s.liarClimate = pickOne(s, D.climates[s.claim].confuse);
    const taken = new Set();
    s.seats.forEach((seat, i) => {
      const liar = i === s.liarSeat;
      seat.role = liar ? 'liar' : 'innocent'; seat.climate = liar ? s.liarClimate : s.claim;
      seat.played = []; seat.vote = null; seat.bet = null; seat.susp = {}; seat.why = {}; seat.glassed = []; seat.peak = 0;
      seat.hand = liar ? liarHand(s, taken) : innocentHand(s, taken);
      seat.hand.forEach(c => taken.add(c.id));
      if (seat.kind === 'ai') s.seats.forEach((_, j) => { if (j !== i) seat.susp[j] = (rand(s) * 2 - 1) * CFG.personas[seat.persona].gut - (perk(s.seats[j]).calm || 0); });
    });
    s.order = Array.from({ length: s.seats.length }, (_, k) => (s.round + k) % s.seats.length);
    s.turn = 0;
    return s;
  }
  /* 다른 자리와 겹치지 않는 카드부터, 모자라면 겹쳐도 됨(같은 기후에 다녀왔으니 비슷한 기억이 있을 수 있음) */
  function draw(s, cards, n, taken) {
    const out = [], order = shuffle(s, cards);
    for (const c of order) { if (out.length >= n) break; if (!taken.has(c.id) && !out.some(x => x.id === c.id)) out.push(c); }
    for (const c of order) { if (out.length >= n) break; if (!out.some(x => x.id === c.id)) out.push(c); }
    return out;
  }
  /* 진짜 여행자 손패: '닮은 기후엔 없는' 증명 카드는 0~2장(무작위) → 증명이 없다고 꼭 라이어는 아니다.
   * 진짜인데 이상해 보이는 함정 카드도 한 장쯤 섞는다. */
  function innocentHand(s, taken) {
    const X = s.claim, P = pool(X), cp = c => proof(c, X, 'confuse');
    const strong = P.filter(c => cp(c) >= 1), traps = P.filter(c => verdict(c, X).v === 'trap'), plain = P.filter(c => cp(c) < 1 && verdict(c, X).v !== 'trap');
    const r = rand(s), nProof = r < .4 ? 0 : r < .85 ? 1 : 2;
    const hand = draw(s, strong, nProof, taken);
    if (traps.length && rand(s) < .6) hand.push(...draw(s, traps.filter(c => !hand.includes(c)), 1, taken));
    hand.push(...draw(s, plain.filter(c => !hand.some(h => h.id === c.id)), CFG.handSize - hand.length, taken));
    while (hand.length < CFG.handSize) hand.push(draw(s, [...strong, ...neutral()].filter(c => !hand.some(h => h.id === c.id)), 1, taken)[0]);
    return shuffle(s, hand).slice(0, CFG.handSize);
  }
  function liarHand(s, taken) {
    const P = pool(s.liarClimate), safe = P.filter(c => verdict(c, s.claim).v !== 'lie'), risky = P.filter(c => verdict(c, s.claim).v === 'lie');
    let hand = draw(s, safe, 3, taken);
    while (hand.length < 3) hand.push(draw(s, neutral(), 1, new Set(hand.map(c => c.id)))[0]);
    hand = [...hand, ...draw(s, risky.filter(c => !hand.some(h => h.id === c.id)), CFG.handSize - hand.length, taken)];
    while (hand.length < CFG.handSize) hand.push(draw(s, [...safe, ...neutral()].filter(c => !hand.some(h => h.id === c.id)), 1, taken)[0]);
    return shuffle(s, hand);
  }

  /* ───── 차례·명령 ───── */
  const current = s => s.phase === 'play' ? s.order[s.turn % s.seats.length] : null;
  const lap = s => Math.floor(s.turn / s.seats.length);
  function apply(state, cmd) {
    const s = clone(state);
    if (cmd.type === 'start') { if (s.phase !== 'lobby' && s.phase !== 'reveal') return { state, error: 'phase' }; if (s.round + 1 >= CFG.rounds) { s.phase = 'end'; return { state: s }; } deal(s); return { state: s }; }
    if (cmd.type === 'play') {
      if (s.phase !== 'play' || current(s) !== cmd.seat) return { state, error: 'turn' };
      const seat = s.seats[cmd.seat], k = seat.hand.findIndex(c => c.id === cmd.card);
      if (k < 0) return { state, error: 'card' };
      const [card] = seat.hand.splice(k, 1);
      seat.played.push(card); s.log.push({ seat: cmd.seat, card: card.id });
      s.feed = observe(s, cmd.seat, card);
      s.seats.forEach((x, i) => { x.peak = Math.max(x.peak || 0, heat(s, i)); });
      s.turn++;
      if (s.turn >= s.seats.length * CFG.laps) s.phase = 'vote';
      return { state: s };
    }
    /* 찬스 🔍 돋보기: 남이 낸 카드 한 장이 여행지와 맞는지 확인 (점수 1 차감) */
    if (cmd.type === 'glass') {
      const seat = s.seats[cmd.seat], card = s.seats[cmd.target]?.played[cmd.index];
      if (!['play', 'vote'].includes(s.phase) || !seat || !card || cmd.target === cmd.seat || !(seat.chances?.glass > 0) || (s.phase === 'vote' && seat.vote !== null)) return { state, error: 'glass' };
      const lie = verdict(card, s.claim).v === 'lie';
      seat.chances.glass--; seat.glassed.push({ target: cmd.target, card: card.id, lie });
      seat.chips = Math.max(0, seat.chips + (perk(seat).freeGlass ? 0 : CFG.score.glass));
      if (lie) seat.stats.glassHit++;
      if (seat.kind === 'ai') seat.susp[cmd.target] = (seat.susp[cmd.target] || 0) + (lie ? 100 : -20);
      return { state: s, lie };
    }
    /* 찬스 🔄 바꾸기: 내 차례에 손패 한 장을 새 카드로 (차례는 그대로) */
    if (cmd.type === 'swap') {
      const seat = s.seats[cmd.seat], k = seat ? seat.hand.findIndex(c => c.id === cmd.card) : -1;
      if (s.phase !== 'play' || current(s) !== cmd.seat || k < 0 || !(seat.chances?.swap > 0)) return { state, error: 'swap' };
      const have = new Set([...seat.hand, ...seat.played].map(c => c.id));
      const from = seat.role === 'liar' ? pool(s.liarClimate).filter(c => verdict(c, s.claim).v !== 'lie') : pool(s.claim);
      const fresh = from.filter(c => !have.has(c.id)), alt = neutral().filter(c => !have.has(c.id));
      const card = fresh.length ? pickOne(s, fresh) : pickOne(s, alt);
      seat.hand[k] = card; seat.chances.swap--;
      return { state: s, card: card.id };
    }
    if (cmd.type === 'vote') {
      const bet = cmd.bet === undefined ? 1 : cmd.bet;
      if (s.phase !== 'vote' || !Number.isInteger(cmd.seat) || !s.seats[cmd.seat] || s.seats[cmd.seat].vote !== null || !Number.isInteger(cmd.target) || cmd.target === cmd.seat || !s.seats[cmd.target] || !(Number.isInteger(bet) && bet >= 1 && bet <= maxBet(s.seats[cmd.seat]))) return { state, error: 'vote' };
      s.seats[cmd.seat].vote = cmd.target; s.seats[cmd.seat].bet = bet;
      if (s.seats.every(x => x.vote !== null)) resolve(s);
      return { state: s };
    }
    return { state, error: 'unknown' };
  }

  /* AI 들이 방금 나온 카드를 보고 의심을 고침 → 반응 한마디(가장 크게 반응한 한 명) */
  function observe(s, from, card) {
    const feed = []; let best = null;
    s.seats.forEach((seat, i) => {
      if (seat.kind !== 'ai' || i === from) return;
      const P = CFG.personas[seat.persona], v = verdict(card, s.claim).v;
      let d, kind;
      if (v === 'lie') { const seen = rand(s) < P.notice; d = seen ? 100 : 6; kind = seen ? 'lie' : null; }
      else if (v === 'trap') { d = P.trap; kind = P.trap >= 10 ? 'trap' : null; }
      else if (card.neutral) { d = seat.persona === 'naive' ? 4 : 12; kind = d >= 10 ? 'neutral' : null; }
      else {
        const pr = P.proof === 'wide' ? proof(card, s.claim, 'wide') : P.proof === 'confuse' ? proof(card, s.claim, 'confuse') : (proof(card, s.claim, 'wide') + proof(card, s.claim, 'confuse')) / 2;
        d = 8 - 45 * pr; kind = pr >= .6 ? 'proof' : null;
      }
      seat.susp[from] = (seat.susp[from] || 0) + d;
      /* 이 사람을 가장 크게 의심하게 만든 카드 — 결과 화면의 '의심한 이유' 한 줄에 씀 */
      const w = seat.why || (seat.why = {});
      if (d > 0 && (!w[from] || d > w[from].d)) w[from] = { card: card.id, d };
      if (kind && (!best || Math.abs(d) > Math.abs(best.d))) best = { seat: i, kind, d };
    });
    if (best) {
      const line = pickOne(s, CFG.lines[best.kind]).replace('{c}', cardName(card)).replace('{x}', D.climates[s.claim].name);
      feed.push({ seat: best.seat, to: from, kind: best.kind, text: line });
    }
    return feed;
  }

  /* 투표 결과와 칩 */
  function resolve(s) {
    const n = s.seats.length, votes = Array(n).fill(0);
    s.seats.forEach(x => votes[x.vote]++);
    const top = Math.max(...votes), tops = votes.map((v, i) => v === top ? i : -1).filter(i => i >= 0);
    const accused = tops.length === 1 ? tops[0] : null;
    const caught = accused === s.liarSeat, delta = Array(n).fill(0), Sc = CFG.score;
    s.seats.forEach((x, i) => {
      /* 라이어의 베팅 = 탈출 자신감: 탈출하면 더 얻고, 들키면 그만큼 잃음 */
      if (i === s.liarSeat) { const extra = (x.bet || 1) - 1; x.stats.maxPeak = Math.max(x.stats.maxPeak || 0, x.peak || 0);
        if (!caught) { delta[i] += Sc.escape + (perk(x).escape || 0) + extra; x.stats.escaped++; if (x.bet >= 4) x.stats.big = (x.stats.big || 0) + 1; if (x.peak < CFG.heat.hot) x.stats.ghost++; } else delta[i] -= extra; x.stats.liar++; return; }
      const extra = (x.bet || 1) - 1;
      x.stats.maxPeak = Math.max(x.stats.maxPeak || 0, x.peak || 0);
      if (x.vote === s.liarSeat) {
        delta[i] += Sc.catch + extra; x.stats.caught++; x.streak = (x.streak || 0) + 1;
        if (x.streak >= 2) delta[i] += Sc.combo + (perk(x).combo || 0);
        x.stats.bestStreak = Math.max(x.stats.bestStreak || 0, x.streak);
        if (x.bet >= 3) x.stats.allin++;
        if (x.bet >= 4) x.stats.big = (x.stats.big || 0) + 1;
      } else { delta[i] += Sc.miss - extra; x.streak = 0; }
      if (accused === i) { delta[i] += perk(x).noAccuse ? 0 : Sc.accused; x.stats.accused++; }
    });
    s.seats.forEach((x, i) => { x.chips = Math.max(0, x.chips + delta[i]); });
    /* AI 가 누구를 왜 지목했는지 (지목한 사람을 가장 의심하게 만든 카드, 없으면 느낌) */
    const reasons = s.seats.map((x, i) => x.kind === 'ai' && x.vote !== null ? { voter: i, target: x.vote, card: x.why?.[x.vote]?.card || null, d: x.why?.[x.vote]?.d || 0 } : null).filter(Boolean);
    s.results.push({ round: s.round, claim: s.claim, liar: s.liarSeat, liarClimate: s.liarClimate, votes, voted: s.seats.map(x => x.vote), bets: s.seats.map(x => x.bet), streaks: s.seats.map((x, i) => i === s.liarSeat ? 0 : x.vote === s.liarSeat ? x.streak : 0), accused, caught, delta, reasons, lesson: lesson(s) });
    s.phase = s.round + 1 >= CFG.rounds ? 'end' : 'reveal';
  }
  /* 배움 카드: 라이어의 카드(같은 점/들킨 점) + 진짜 여행자의 증명 카드(다른 점) */
  function lesson(s) {
    const liar = s.seats[s.liarSeat], X = s.claim, Lc = s.liarClimate;
    const liarCards = liar.played.map(c => { const v = verdict(c, X); return { id: c.id, card: c, kind: v.v === 'lie' ? 'caught' : c.neutral ? 'dodge' : 'same', why: v.v === 'lie' ? v.why : c.neutral ? '' : `${D.climates[Lc].name}에도 ${D.climates[X].name}에도 있어요` }; });
    let proofCard = null, bestP = 0;
    s.seats.forEach((x, i) => { if (i === s.liarSeat) return; for (const c of x.played) { const p = proof(c, X, 'confuse'); if (p > bestP) { bestP = p; proofCard = { seat: i, id: c.id, card: c, why: verdict(c, Lc).why } } } });
    /* 아무도 증명 카드를 안 냈으면, 진짜 여행자라면 가질 수 있던 카드로 '다른 점'을 보여 줌 */
    if (!proofCard) { const c = pool(X).find(c => verdict(c, Lc).v === 'lie'); if (c) proofCard = { seat: null, id: c.id, card: c, why: verdict(c, Lc).why }; }
    return { liarCards, proofCard };
  }

  /* 의심 게이지: AI 들이 이 자리를 의심하는 정도의 평균을 0~100 으로 (-20 이하 안심, 60 이상 들킴 직전) */
  function heat(s, seat) {
    const v = s.seats.map((x, i) => x.kind === 'ai' && i !== seat ? x.susp[seat] || 0 : null).filter(x => x !== null);
    if (!v.length) return 0;
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    return Math.round(Math.max(0, Math.min(100, (avg + 20) * 100 / 80)));
  }

  /* 대회 순위 (칩 → 라이어 맞힌 수) */
  const ranking = s => s.seats.map((x, i) => i).sort((a, b) => s.seats[b].chips - s.seats[a].chips || s.seats[b].stats.caught - s.seats[a].stats.caught || a - b);

  /* 자리마다 보이는 것만 (멀티플레이용) */
  function view(s, seat) {
    const v = clone(s);
    v.seats.forEach((x, i) => { if (i !== seat && s.phase !== 'reveal' && s.phase !== 'end') { x.hand = x.hand.map(() => null); x.role = null; x.climate = null; x.susp = {}; x.why = {}; x.glassed = []; x.peak = 0; } else if (i !== seat) { x.hand = x.hand.map(() => null); x.susp = {}; x.why = {}; } });
    if (s.phase !== 'reveal' && s.phase !== 'end') { v.liarSeat = null; v.liarClimate = null; v.liarPlan = null; }
    return v;
  }

  /* ───── AI 의 판단 ───── */
  function decide(s, seat) {
    const me = s.seats[seat], P = CFG.personas[me.persona || 'normal'];
    if (s.phase === 'play') {
      const X = s.claim;
      if (me.role === 'liar') {
        /* 낼 카드가 모두 들킬 카드면 바꾸기 찬스 */
        if (me.chances?.swap > 0 && me.hand.every(c => verdict(c, X).v === 'lie')) return { type: 'swap', seat, card: me.hand[0].id };
        const safe = me.hand.filter(c => verdict(c, X).v !== 'lie' && !c.neutral);
        const pickSafe = safe.sort((a, b) => proof(b, X, 'wide') - proof(a, X, 'wide'))[0];
        const card = pickSafe || me.hand.find(c => c.neutral) || pickOne(s, me.hand);
        return { type: 'play', seat, card: card.id };
      }
      const score = c => { const v = verdict(c, X).v, pr = proof(c, X, 'confuse'); return (v === 'trap' ? -1 : 0) + pr; };
      let card;
      if (me.persona === 'sharp') card = [...me.hand].sort((a, b) => score(b) - score(a))[0];
      else if (me.persona === 'normal') card = rand(s) < .6 ? [...me.hand].sort((a, b) => score(b) - score(a))[0] : pickOne(s, me.hand);
      else card = pickOne(s, me.hand);
      return { type: 'play', seat, card: card.id };
    }
    if (s.phase === 'vote') {
      const others = s.seats.map((_, i) => i).filter(i => i !== seat);
      if (me.role === 'liar') {
        /* 라이어는 가장 의심받기 쉬운 진짜 여행자를 지목 */
        const trapish = i => s.seats[i].played.reduce((a, c) => a + (verdict(c, s.claim).v === 'trap' ? 2 : 0) + (c.neutral ? 1 : 0), 0) + rand(s);
        /* 내게 쏠린 의심이 낮을수록 탈출에 많이 건다 */
        const h = heat(s, seat), want = h < 20 ? 4 : h < CFG.heat.calm ? 3 : h < CFG.heat.hot ? 2 : 1;
        return { type: 'vote', seat, target: others.sort((a, b) => trapish(b) - trapish(a))[0], bet: Math.min(want, maxBet(me)) };
      }
      const ranked = others.sort((a, b) => (me.susp[b] || 0) - (me.susp[a] || 0)), gap = (me.susp[ranked[0]] || 0) - (me.susp[ranked[1]] || 0);
      /* 날카로운 AI 는 헷갈릴 때 돋보기: 가장 의심하는 사람의 카드 중 증명력이 가장 약한 것 */
      if (me.persona === 'sharp' && me.chances?.glass > 0 && gap < 15) {
        const t = ranked[0], cards = s.seats[t].played.map((c, index) => ({ c, index })).filter(({ c }) => !me.glassed.some(g => g.card === c.id));
        if (cards.length) return { type: 'glass', seat, target: t, index: cards.sort((a, b) => proof(a.c, s.claim, 'confuse') - proof(b.c, s.claim, 'confuse'))[0].index };
      }
      const b = P.bet || [999, 999], want = gap >= b[1] * 1.5 ? 4 : gap >= b[1] ? 3 : gap >= b[0] ? 2 : 1;
      return { type: 'vote', seat, target: ranked[0], bet: Math.min(want, maxBet(me)) };
    }
    return null;
  }
  /* 사람 자리 말고 모두 AI 가 진행 (사람 차례나 투표에서 멈춤) */
  function runAI(s, onStep) {
    let guard = 0;
    while (guard++ < 200) {
      if (s.phase === 'play') { const who = current(s); if (s.seats[who].kind !== 'ai') break; s = apply(s, decide(s, who)).state; onStep && onStep(s); continue; }
      if (s.phase === 'vote') { const ai = s.seats.findIndex((x, i) => x.kind === 'ai' && x.vote === null); if (ai < 0) break; s = apply(s, decide(s, ai)).state; continue; }
      break;
    }
    return s;
  }
  const voteLine = (s, seat, target) => pickOne({ rng: (s.seed + seat * 31 + target) >>> 0 }, CFG.lines.vote).replace('{n}', D.travelers[s.seats[target].who].name);

  root.Liar = { CFG, pool, verdict, proof, cardName, newContest, apply, current, lap, view, decide, runAI, ranking, voteLine, itemName, heat, perk, maxBet };
})(typeof window !== 'undefined' ? window : globalThis);
