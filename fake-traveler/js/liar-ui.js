/* 라이어 여행단 — 화면 (규칙은 liar.js). game.js 의 도우미(window.FT)를 빌려 같은 모양으로 그린다.
 * 사람 자리는 지금은 0번 하나. 멀티플레이를 붙일 땐 humanSeats 와 view() 만 바꾸면 된다. */
(() => {
  'use strict';
  const L = window.Liar, D = window.FAKE;
  const F = () => window.FT;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 80) : ms));
  const P = who => D.travelers[who], C = id => D.climates[id];
  const STAGES = Object.keys(L.CFG.stages);
  const KEY = 'fake-traveler-v1-liar';
  let S = null, me = 0, sel = null, busy = false, epoch = 0, shownVotes = new Set(), lastFeed = null, introStep = 0;

  function saveContest() {
    try { localStorage.setItem(KEY, JSON.stringify({ state: S, intro: introStep })); } catch (_) {}
  }
  function discardContest() { try { localStorage.removeItem(KEY); } catch (_) {} }
  function savedContest() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY)), s = saved?.state;
      if (s?.v !== 1 || !STAGES.includes(s.stage) || !['play', 'vote', 'reveal', 'end'].includes(s.phase)
        || !Number.isInteger(s.round) || s.round < 0 || s.round >= L.CFG.rounds || !C(s.claim)
        || ![0, 1, 2].includes(saved.intro) || (saved.intro && (s.phase !== 'play' || s.turn !== 0))
        || !Array.isArray(s.seats) || s.seats.length !== 4 || s.seats[0].kind !== 'human'
        || s.seats.some((x, i) => !P(x.who) || (i && (x.kind !== 'ai' || !L.CFG.personas[x.persona]))
          || !C(x.climate) || !['liar', 'innocent'].includes(x.role) || !Number.isFinite(x.chips) || !x.stats
          || !Array.isArray(x.hand) || !Array.isArray(x.played) || x.hand.length + x.played.length !== L.CFG.handSize
          || [...x.hand, ...x.played].some(c => !c || typeof c.id !== 'string' || !['photo', 'temp', 'quote', 'item'].includes(c.type)
            || (!c.neutral && !Array.isArray(c.tags))) || (x.vote !== null && (!Number.isInteger(x.vote) || x.vote < 0 || x.vote > 3 || x.vote === i)))
        || !Array.isArray(s.order) || [...s.order].sort().join() !== '0,1,2,3'
        || !Number.isInteger(s.turn) || s.turn < 0 || s.turn > 4 * L.CFG.laps || !Number.isInteger(s.rng)
        || !Array.isArray(s.log) || s.log.length !== s.turn || !Array.isArray(s.feed) || !Array.isArray(s.results)
        || s.results.length !== s.round + (['reveal', 'end'].includes(s.phase) ? 1 : 0)
        || (['reveal', 'end'].includes(s.phase) && !s.results.at(-1)?.lesson)) return null;
      return saved;
    } catch (_) { return null; }
  }
  function resume() {
    const saved = savedContest();
    if (!saved) { lobby(); return; }
    epoch++; S = saved.state; me = 0; sel = null; busy = false; introStep = saved.intro;
    shownVotes = new Set(S.seats.map((x, i) => x.vote !== null ? i : -1).filter(i => i >= 0));
    lastFeed = S.feed[0] || null;
    if (introStep) roundIntro(introStep);
    else if (S.phase === 'play') flow();
    else if (S.phase === 'vote' && S.seats[me].vote !== null) myVote();
    else { table(); if (S.phase !== 'vote') reveal(); }
  }

  const prog = () => F().progress().liar;
  const stageOpen = id => id === 'town' || prog().unlocked.includes(id);
  const nameOf = i => P(S.seats[i].who).name;
  const climateChip = id => `<span class="chip" style="--group:${D.groups[C(id).group].color}">${C(id).name}</span>`;

  /* ───── 로비 ───── */
  function lobby() {
    const f = F(), lp = prog(), who = lp.me || 'haneul', saved = savedContest();
    S = null; epoch++; busy = false;
    f.setScreen('liar-lobby', `${f.top('라이어 여행단', 'title')}
      <section class="ll">
        <ol class="ll-how">
          <li>${f.icon('eye')}<b>여행지 확인</b><span>모두 같은 곳에 다녀왔대요</span></li>
          <li>${f.icon('photo')}<b>증거 카드 3장</b><span>돌아가며 한 장씩 내요</span></li>
          <li>${f.icon('glass')}<b>라이어 지목</b><span>한 명은 닮은 기후에서 왔어요</span></li>
          <li class="ll-twist">${f.icon('twin')}<b>내가 라이어라면?</b><span>들키지 않게 카드를 골라요</span></li>
        </ol>
        <h2 class="ll-h">나는 누구?</h2>
        <div class="ll-me" role="group" aria-label="내 여행자 고르기">${Object.keys(D.travelers).map(w => f.button('liar-me', `<span class="polaroid">${f.image(P(w).img, 'people', P(w).name)}</span><b>${P(w).name}</b>`, `ll-face ${w === who ? 'sel' : ''}`, `data-who="${w}" aria-pressed="${w === who}"`)).join('')}</div>
        <h2 class="ll-h">대회 고르기</h2>
        ${saved ? f.button('liar-resume', `이어하기 · ${L.CFG.stages[saved.state.stage].name} · 라운드 ${saved.state.round + 1} ${f.icon('arrow')}`, 'primary') : ''}
        <div class="ll-stages">${STAGES.map(id => {
          const st = L.CFG.stages[id], open = stageOpen(id), best = lp.best[id];
          return f.button('liar-start', `<strong>${st.name}</strong><span class="ll-ai">${st.ai.map(p => `<i class="persona p-${p}">${L.CFG.personas[p].name}</i>`).join('')}</span><span class="ll-best">${open ? (best ? `최고 ${best}등${best === 1 ? ' 🏆' : ''}` : '도전!') : `${f.icon('lock')} 앞 대회 2등 안에 들면`}</span>`, `ll-stage s-${id}`, `data-stage="${id}" ${open ? '' : 'disabled'}`);
        }).join('')}</div>
        <p class="ll-multi">${f.button('liar-multi', `${f.icon('twin')} 친구와 하기 <small>준비 중</small>`, 'text-button', 'disabled')}</p>
      </section>`);
  }

  /* ───── 대회·라운드 ───── */
  function start(stage) {
    const who = prog().me || 'haneul';
    S = L.newContest({ stage, me: who });
    me = 0; sel = null; busy = false; shownVotes = new Set();
    next();
  }
  function next() {
    S = L.apply(S, { type: 'start' }).state;
    if (S.phase === 'end') { finish(); return; }
    sel = null; shownVotes = new Set(); lastFeed = null;
    roundIntro(1);
  }
  function roundIntro(step) {
    introStep = step; saveContest();
    const f = F(), X = S.claim, seat = S.seats[me], liar = seat.role === 'liar';
    f.play('paper');
    if (step === 1) {
      f.showModal(`<div class="lri"><span class="eyebrow">라운드 ${S.round + 1} / ${L.CFG.rounds}</span><h2>이번 여행지</h2>
        <figure class="polaroid lri-photo">${f.image(C(X).img, 'scenes', C(X).name)}<span class="tape"></span></figure>
        <h3 class="lri-name">${C(X).name} <span class="chip" style="--group:${D.groups[C(X).group].color}">${D.groups[C(X).group].name}</span></h3>${facts(X)}
        <p class="lri-confuse">라이어는 이 중 한 곳에서 왔어요: ${C(X).confuse.map(climateChip).join(' ')}</p>
        ${f.button('liar-role', `내 역할 보기 ${f.icon('arrow')}`, 'primary')}</div>`, 'liar-modal liar-lock');
      return;
    }
    const Lc = seat.climate;
    f.showModal(`<div class="lri role ${liar ? 'is-liar' : 'is-true'}"><div class="role-card">${liar
      ? `<span class="role-tag">라이어</span><figure class="polaroid lri-photo small">${f.image(C(Lc).img, 'scenes', C(Lc).name)}</figure><h2>사실은 ${C(Lc).name}!</h2>${facts(Lc)}<p>${C(X).name}에 다녀온 척, <b>들키지 마세요!</b></p>`
      : `<span class="role-tag">진짜 여행자</span><h2>나도 ${C(X).name}!</h2><p>증거로 <b>진짜</b>임을 보여 주고<br>라이어를 찾아요!</p>`}</div>
      ${f.button('liar-go', `시작! ${f.icon('arrow')}`, 'primary')}</div>`, 'liar-modal liar-lock');
  }
  function facts(id) {
    const f = F(), c = C(id);
    return `<div class="facts">${[['temp', c.temp], ['rain', c.rain], ['eye', c.look]].map(([k, v]) => `<div>${f.icon(k)}<span>${f.esc(v)}</span></div>`).join('')}</div>`;
  }

  /* ───── 테이블 ───── */
  function table(highlight) {
    const f = F(), v = L.view(S, me), X = S.claim, mine = v.seats[me], cur = L.current(S), myTurn = cur === me && !busy;
    const vote = S.phase === 'vote' && mine.vote === null && !busy;
    const seatHtml = i => {
      const x = v.seats[i], p = P(x.who), turn = cur === i;
      const votedFor = shownVotes.has(i) && x.vote !== null ? `<span class="vote-tag">${f.icon('glass')} ${nameOf(x.vote)}</span>` : '';
      return `<article class="seat ${turn ? 'turn' : ''} ${i === me ? 'mine' : ''}" data-seat="${i}">
        <div class="seat-head"><span class="polaroid portrait">${f.image(p.img, 'people', p.name)}</span><div class="seat-id"><b>${p.name}${i === me ? ' (나)' : ''}</b>${x.persona ? `<i class="persona p-${x.persona}">${L.CFG.personas[x.persona].name}</i>` : ''}<span class="seat-chips">${f.icon('star')}${x.chips}</span></div></div>
        <div class="seat-cards">${[0, 1, 2].map(k => x.played[k] ? `<div class="mini-ev ev-${x.played[k].type} ${highlight === x.played[k].id ? 'new' : ''}">${f.evidence(x.played[k])}</div>` : '<div class="mini-ev empty"></div>').join('')}</div>
        <div class="seat-bubble"></div>${votedFor}
        ${vote && i !== me ? f.button('liar-vote', `이 사람! ${f.icon('glass')}`, 'vote-btn danger', `data-seat="${i}"`) : ''}
      </article>`;
    };
    const others = S.seats.map((_, i) => i).filter(i => i !== me);
    window.GameMusic?.theme(S.phase === 'play' ? 'mystery' : S.phase === 'vote' ? 'suspense' : null);
    const prompt = S.phase !== 'play' && S.phase !== 'vote' ? (busy ? `<b class="lt-call">투표 끝!</b>` : f.button('liar-unpeek', `${f.icon('book')} 결과 다시 보기`, 'primary'))
      : S.phase === 'vote'
      ? (mine.vote === null ? `<b class="lt-call">라이어는 누구? 위에서 한 명을 골라요</b>` : `<b class="lt-call">투표 중…</b>`)
      : myTurn ? (sel ? f.button('liar-play', `이 카드 내기 ${f.icon('arrow')}`, 'primary') : `<b class="lt-call">내 차례! 낼 카드를 골라요 (${L.lap(S) + 1}/${L.CFG.laps}바퀴)</b>`)
      : cur === me ? `<b class="lt-call">내 차례!</b>` : `<span class="lt-wait">${nameOf(cur)} 차례…</span>`;
    f.setScreen('liar', `<header class="lt-top">${f.button('liar-quit', f.icon('back'), 'icon-button', 'aria-label="대회 그만하기"')}
        <div class="lt-round"><b>라운드 ${S.round + 1}</b><span>${Array.from({ length: L.CFG.rounds }, (_, k) => `<i class="${k < S.round ? 'done' : k === S.round ? 'now' : ''}"></i>`).join('')}</span></div>
        ${f.button('liar-topic', `여행지 <b>${C(X).name}</b> ${f.icon('book')}`, 'claim-chip')}
        ${f.button('liar-myrole', mine.role === 'liar' ? `나: 라이어 <small>(${C(mine.climate).name})</small>` : '나: 진짜 여행자', `lt-role ${mine.role === 'liar' ? 'is-liar' : 'is-true'}`)}</header>
      <section class="lt">
        <div class="lt-seats">${others.map(seatHtml).join('')}</div>
        <div class="lt-me">${seatHtml(me)}
          <div class="lt-handbox"><div class="lt-hand" role="group" aria-label="내 증거 카드">${mine.hand.map(c => f.button('liar-card', `<span class="evidence ev-${c.type}">${f.evidence(c)}</span>`, `hand-card ${sel === c.id ? 'sel' : ''}`, `data-card="${c.id}" aria-pressed="${sel === c.id}" ${myTurn ? '' : 'disabled'}`)).join('')}</div>
          <div class="lt-prompt">${prompt}</div></div>
        </div>
      </section>`, true);
    if (lastFeed) bubble(lastFeed);
  }
  function bubble(fd) {
    const el = F().app.querySelector(`.seat[data-seat="${fd.seat}"] .seat-bubble`);
    if (!el) return;
    el.textContent = fd.text; el.className = `seat-bubble show k-${fd.kind}`;
  }

  /* AI 차례를 보여 주며 진행 */
  async function flow() {
    const my = epoch;
    busy = true;
    while (S && S.phase === 'play' && L.current(S) !== me) {
      table(); await wait(650); if (my !== epoch) return;
      const who = L.current(S), cmd = L.decide(S, who);
      S = L.apply(S, cmd).state; lastFeed = S.feed[0] || null;
      saveContest();
      F().play('card'); table(cmd.card); if (lastFeed) setTimeout(() => my === epoch && F().play('pop'), 250);
      await wait(lastFeed ? 2600 : 900); if (my !== epoch) return;
    }
    busy = false;
    if (S.phase === 'vote') { lastFeed = null; F().play('stamp'); }
    table();
  }
  async function myPlay() {
    if (!sel || busy) return;
    const my = epoch;
    S = L.apply(S, { type: 'play', seat: me, card: sel }).state;
    saveContest();
    const card = sel; sel = null; lastFeed = S.feed[0] || null;
    F().play('card'); busy = true; table(card); await wait(lastFeed ? 1800 : 700);
    if (my !== epoch) return;
    busy = false;
    flow();
  }
  async function myVote(target) {
    if (busy || S.phase !== 'vote') return;
    const my = epoch;
    if (S.seats[me].vote === null) {
      S = L.apply(S, { type: 'vote', seat: me, target }).state; saveContest();
    }
    shownVotes.add(me);
    busy = true; F().play('vote'); table();
    for (const i of S.seats.map((x, k) => k !== me && x.vote === null ? k : -1).filter(k => k >= 0)) {
      await wait(1500); if (my !== epoch) return;
      if (S.seats[i].vote === null) S = L.apply(S, L.decide(S, i)).state;
      saveContest();
      shownVotes.add(i); lastFeed = { seat: i, kind: 'vote', text: L.voteLine(S, i, S.seats[i].vote) };
      F().play('vote'); table();
    }
    await wait(1600); if (my !== epoch) return;
    F().play('drum'); await wait(1200); if (my !== epoch) return;
    busy = false; reveal();
  }

  /* ───── 결과 ───── */
  function reveal(again = false) {
    const f = F(), r = S.results.at(-1), liar = S.seats[r.liar], lp = P(liar.who), X = r.claim, Lc = r.liarClimate;
    if (!again) f.play(r.liar === me ? (r.caught ? 'busted' : 'sneak') : r.caught ? 'caught' : 'escaped');
    const meDelta = r.delta[me];
    const line = c => c.kind === 'caught' ? `<b class="k-bad">들킨 카드</b> ${f.esc(c.why)}` : c.kind === 'same' ? `<b class="k-same">같은 점</b> ${f.esc(c.why)}` : `<b class="k-dodge">얼버무린 말</b>`;
    f.showModal(`<div class="lr ${r.caught ? 'caught' : 'escaped'}">
      <h2>${r.liar === me ? (r.caught ? '들켰다!' : '안 들켰다!') : r.caught ? '라이어를 잡았다!' : '라이어가 빠져나갔다!'}</h2>
      <div class="lr-liar"><span class="polaroid">${f.image(lp.img, 'people', lp.name)}<span class="liar-stamp">라이어</span></span>
        <p><b>${lp.name}${r.liar === me ? '(나)' : ''}</b>는 사실<br>${climateChip(Lc)}에 다녀왔어요</p></div>
      ${voteBoard(r)}
      <div class="lr-chips">${S.seats.map((x, i) => `<span class="${i === me ? 'mine' : ''}">${P(x.who).name} <b class="${r.delta[i] > 0 ? 'up' : r.delta[i] < 0 ? 'down' : ''}">${r.delta[i] > 0 ? '+' : ''}${r.delta[i]}</b></span>`).join('')}</div>
      <p class="lr-me">${meDelta > 0 ? `내 칩 +${meDelta}!` : meDelta < 0 ? `내 칩 ${meDelta}` : '내 칩 그대로'}${r.accused === me && r.liar !== me ? ' · 억울하게 지목됐어요' : ''}</p>
      ${whyLine(r)}
      <div class="lr-learn"><h3>${f.icon('book')} 배움 카드</h3>
        ${r.lesson.liarCards.map(c => `<div class="lr-card"><div class="mini-ev ev-${c.card.type}">${f.evidence(c.card)}</div><p>${line(c)}</p></div>`).join('')}
        ${r.lesson.proofCard ? `<div class="lr-card proof"><div class="mini-ev ev-${r.lesson.proofCard.card.type}">${f.evidence(r.lesson.proofCard.card)}</div><p><b class="k-diff">다른 점</b> ${f.esc(r.lesson.proofCard.why)} <small>${r.lesson.proofCard.seat === null ? `(진짜 ${C(X).name} 여행자라면 낼 수 있던 카드)` : `(${P(S.seats[r.lesson.proofCard.seat].who).name}의 카드)`}</small></p></div>` : ''}
      </div>
      <div class="lr-actions">${f.button('liar-peek', `${f.icon('eye')} 카드 다시 보기`, 'secondary')}${f.button(S.phase === 'end' ? 'liar-finish' : 'liar-next', S.phase === 'end' ? `대회 결과 ${f.icon('arrow')}` : `다음 라운드 ${f.icon('arrow')}`, 'primary')}</div></div>`, 'liar-modal liar-lock');
    if (!again) learn(X, Lc);
  }
  /* 누가 누구를 찍었는지 + 최종 지목 (동점이면 아무도 지목되지 않아 라이어가 빠져나감) */
  function voteBoard(r) {
    const f = F(), voted = r.voted || S.seats.map(x => x.vote), top = Math.max(...r.votes);
    const tied = r.votes.map((v, i) => v === top ? i : -1).filter(i => i >= 0);
    const verdict = r.accused !== null
      ? `<b>${nameOf(r.accused)}${r.accused === me ? '(나)' : ''}</b> ${top}표로 지목! ${r.accused === r.liar ? '→ 라이어 맞음!' : '→ 라이어가 아니었어요'}`
      : `<b>${tied.map(i => nameOf(i) + (i === me ? '(나)' : '')).join('·')}</b> ${top}표씩 동점! → 아무도 지목 못 해서 라이어가 빠져나갔어요`;
    return `<div class="lr-votes"><div class="lr-vote-row">${voted.map((t, i) => `<span class="${i === me ? 'mine' : ''}"><b>${nameOf(i)}${i === me ? '(나)' : ''}</b> ${f.icon('arrow')} <b class="${t === r.liar ? 'hit' : ''}">${t === null ? '?' : nameOf(t)}</b></span>`).join('')}</div>
      <p class="lr-verdict ${r.caught ? 'ok' : 'no'}">${verdict}</p></div>`;
  }
  /* 나를 왜 의심했는지 한 줄 — 나를 지목한 AI 중 가장 크게 의심한 사람과 그 카드 */
  function whyLine(r) {
    const f = F(), X = r.claim, mine = (r.reasons || []).filter(x => x.target === me);
    if (!mine.length) return `<p class="lr-why ok">${f.icon('check')} 아무도 나를 의심하지 않았어요</p>`;
    const top = [...mine].sort((a, b) => b.d - a.d)[0], who = nameOf(top.voter);
    const card = top.card ? S.seats[me].played.find(c => c.id === top.card) : null;
    let why;
    if (!card) why = '확실한 카드 없이 느낌으로 골랐대요';
    else {
      const v = L.verdict(card, X);
      if (v.v === 'lie') why = v.why;
      else if (v.v === 'trap') why = `이상해 보였지만 사실은 진짜예요. ${v.why}`;
      else if (card.neutral) why = '두루뭉술한 말이라 뭔가 숨기는 것 같았대요';
      else {
        const also = C(X).confuse.filter(c => L.verdict(card, c).v !== 'lie').map(c => C(c).name);
        why = also.length ? `${also.join('·')}에도 있는 거라 증거가 약했대요` : '증거가 약해 보였대요';
      }
    }
    const framed = top.voter === r.liar ? ` <b class="lr-framed">그런데 ${who}이(가) 바로 라이어!</b>` : '';
    return `<div class="lr-why">${card ? `<div class="mini-ev ev-${card.type}">${f.evidence(card)}</div>` : ''}<p><b>${who}이(가) 나를 의심한 이유</b> ${f.esc(why)}${framed}</p></div>`;
  }
  /* 도감: 라이어 판에서 본 기후도 열어 줌 */
  function learn(X, Lc) {
    const p = F().progress();
    for (const id of [X, Lc]) if (!p.climates.includes(id)) p.climates.push(id);
    F().save();
  }
  function finish() {
    discardContest();
    const f = F(), rank = L.ranking(S), my = rank.indexOf(me) + 1, st = S.stage, lp = prog(), x = S.seats[me];
    lp.played = (lp.played || 0) + 1;
    lp.best[st] = Math.min(lp.best[st] || 9, my);
    if (my <= 2 && L.CFG.stages[st].next && !lp.unlocked.includes(L.CFG.stages[st].next)) lp.unlocked.push(L.CFG.stages[st].next);
    const titles = [];
    if (x.stats.caught >= 3) titles.push(['명탐정', '라이어를 3번 이상 맞혔어요']);
    if (x.stats.escaped >= 1) titles.push(['변장의 달인', '라이어일 때 들키지 않았어요']);
    if (x.stats.accused === 0) titles.push(['믿음직한 여행자', '한 번도 억울하게 지목되지 않았어요']);
    if (x.stats.accused >= 2) titles.push(['억울한 여행자', '진짜인데 두 번 이상 지목됐어요']);
    const fresh = [];
    const award = id => { if (!lp.badges.includes(id)) { lp.badges.push(id); fresh.push(id); } };
    if (my === 1) award('win');
    if (my === 1 && st === 'world') award('world');
    if (x.stats.escaped >= 1) award('escape');
    if (x.stats.caught >= 3) award('detective');
    F().save();
    const nextStage = L.CFG.stages[st].next;
    f.play(my === 1 ? 'clear' : 'paper');
    f.setScreen('liar-end', `${f.top('대회 결과', 'liar')}
      <section class="le"><h2>${my === 1 ? '우승!' : `${my}등`}</h2><p class="le-stage">${L.CFG.stages[st].name}</p>
        <div class="podium">${rank.map((i, k) => `<div class="pod p${k + 1} ${i === me ? 'mine' : ''}"><span class="polaroid">${f.image(P(S.seats[i].who).img, 'people', P(S.seats[i].who).name)}</span><b>${P(S.seats[i].who).name}</b><span class="pod-chips">${f.icon('star')}${S.seats[i].chips}</span><em>${k + 1}등</em></div>`).join('')}</div>
        ${titles.length ? `<div class="le-titles">${titles.map(([t, d]) => `<div class="le-title"><b>${t}</b><span>${d}</span></div>`).join('')}</div>` : ''}
        ${fresh.length ? `<p class="le-new">새 배지: ${fresh.map(id => BADGES[id]).join(', ')}</p>` : ''}
        <div class="le-actions">${f.button('liar-again', `다시 도전 ${f.icon('arrow')}`, 'primary', `data-stage="${st}"`)}${nextStage && stageOpen(nextStage) ? f.button('liar-start', `${L.CFG.stages[nextStage].name} ${f.icon('arrow')}`, 'secondary', `data-stage="${nextStage}"`) : ''}${f.button('liar', '대회 고르기', 'secondary')}</div>
      </section>`);
  }
  const BADGES = { win: '첫 우승', world: '세계 대회 우승', escape: '변장의 달인', detective: '명탐정' };

  /* ───── 버튼 ───── */
  function action(b) {
    const f = F(), a = b.dataset.action;
    switch (a) {
      case 'liar': if (S) discardContest(); f.closeModal(false); lobby(); return true;
      case 'liar-resume': f.closeModal(false); resume(); return true;
      case 'liar-me': prog().me = b.dataset.who; f.save(); f.play('tap'); lobby(); return true;
      case 'liar-start': f.closeModal(false); epoch++; start(b.dataset.stage); return true;
      case 'liar-again': epoch++; start(b.dataset.stage); return true;
      case 'liar-role': roundIntro(2); return true;
      case 'liar-go': introStep = 0; saveContest(); f.closeModal(false); flow(); return true;
      case 'liar-card': if (busy || L.current(S) !== me) return true; sel = sel === b.dataset.card ? null : b.dataset.card; f.play('tap'); table(); return true;
      case 'liar-play': myPlay(); return true;
      case 'liar-vote': myVote(Number(b.dataset.seat)); return true;
      case 'liar-next': f.closeModal(false); next(); return true;
      case 'liar-peek': f.closeModal(false); table(); return true;
      case 'liar-unpeek': reveal(true); return true;
      case 'liar-finish': f.closeModal(false); finish(); return true;
      case 'liar-topic': f.showModal(`<div class="lri"><h2>${C(S.claim).name}</h2><figure class="polaroid lri-photo">${f.image(C(S.claim).img, 'scenes', C(S.claim).name)}</figure>${facts(S.claim)}<p class="lri-confuse">라이어는 이 중 한 곳에서: ${C(S.claim).confuse.map(climateChip).join(' ')}</p>${f.modalClose()}</div>`, 'liar-modal'); return true;
      case 'liar-myrole': { const x = S.seats[me]; f.showModal(`<div class="lri"><h2>${x.role === 'liar' ? `나는 라이어 — 사실은 ${C(x.climate).name}` : `나는 진짜 ${C(x.climate).name} 여행자`}</h2>${facts(x.climate)}${f.modalClose()}</div>`, 'liar-modal'); return true; }
      case 'liar-quit': f.showModal(`<div class="lri"><h2>대회를 그만할까요?</h2><p>지금까지의 칩은 사라져요.</p><div class="modal-actions">${f.button('liar', '그만하기', 'danger')}${f.button('close', '계속하기', 'secondary')}</div></div>`, 'liar-modal'); return true;
    }
    return false;
  }
  window.LiarUI = { lobby, action };
})();
