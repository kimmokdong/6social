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
  let glassMode = false, bet = 1, lastHeat = 0;

  function saveContest() {
    try { localStorage.setItem(KEY, JSON.stringify({ state: S, intro: introStep })); } catch (_) {}
  }
  function discardContest() { try { localStorage.removeItem(KEY); } catch (_) {} }
  function savedContest() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY)), s = saved?.state;
      if (s?.v !== 2 || !STAGES.includes(s.stage) || !['play', 'vote', 'reveal', 'end'].includes(s.phase)
        || !Number.isInteger(s.round) || s.round < 0 || s.round >= L.CFG.rounds || !C(s.claim)
        || ![0, 1, 2].includes(saved.intro) || (saved.intro && (s.phase !== 'play' || s.turn !== 0))
        || !Array.isArray(s.seats) || s.seats.length !== 4 || s.seats[0].kind !== 'human'
        || s.seats.some((x, i) => !P(x.who) || (i && (x.kind !== 'ai' || !L.CFG.personas[x.persona]))
          || !C(x.climate) || !['liar', 'innocent'].includes(x.role) || !Number.isFinite(x.chips) || !x.stats
          || !x.chances || ![0, 1, 2].includes(x.chances.glass) || ![0, 1, 2].includes(x.chances.swap) || !Array.isArray(x.glassed) || !Number.isInteger(x.streak)
          || (x.bet !== null && !(Number.isInteger(x.bet) && x.bet >= 1 && x.bet <= L.maxBet(x)))
          || !Array.isArray(x.hand) || !Array.isArray(x.played) || x.hand.length + x.played.length !== L.CFG.handSize
          || [...x.hand, ...x.played].some(c => !c || typeof c.id !== 'string' || !['photo', 'temp', 'range', 'crop', 'quote', 'item'].includes(c.type)
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
    epoch++; S = saved.state; me = 0; sel = null; busy = false; introStep = saved.intro; glassMode = false; bet = 1; lastHeat = L.heat(S, me);
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
  const perkOf = who => L.CFG.perks[who] || { icon: '', name: '', text: '' };
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
        <ul class="ll-extras"><li>🔍 <b>돋보기</b> 남의 카드 1장 확인 (−1점)</li><li>🔄 <b>바꾸기</b> 내 카드 1장 교체</li><li>🎯 <b>베팅</b> 진짜는 맞힐 자신, 라이어는 탈출 자신만큼 걸어요</li><li>🔥 <b>콤보</b> 연속으로 맞히면 +1점</li></ul>
        <h2 class="ll-h">나는 누구?</h2>
        <div class="ll-me" role="group" aria-label="내 여행자 고르기">${Object.keys(D.travelers).map(w => f.button('liar-me', `<span class="polaroid">${f.image(P(w).img, 'people', P(w).name)}</span><b>${P(w).name}</b><small class="perk-mini">${perkOf(w).icon} ${perkOf(w).name}</small>`, `ll-face ${w === who ? 'sel' : ''}`, `data-who="${w}" aria-pressed="${w === who}"`)).join('')}</div>
        <p class="ll-perk">${perkOf(who).icon} <b>${P(who).name} · ${perkOf(who).name}</b> ${perkOf(who).text}</p>
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
    me = 0; sel = null; busy = false; shownVotes = new Set(); lastHeat = 0;
    next();
  }
  function next() {
    S = L.apply(S, { type: 'start' }).state;
    if (S.phase === 'end') { finish(); return; }
    sel = null; shownVotes = new Set(); lastFeed = null; glassMode = false; bet = 1; lastHeat = L.heat(S, me);
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
      <p class="ll-perk">${perkOf(seat.who).icon} <b>내 능력 · ${perkOf(seat.who).name}</b> ${perkOf(seat.who).text}</p>
      ${S.round === 0 && !prog().played ? '<p class="book-help">내 차례에 카드 한 장을 골라 내요. 3바퀴 뒤 라이어를 지목해요. 두 기후에서 통하는 카드만으로는 정체를 단정할 수 없어요.</p>' : ''}
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
    const canGlass = !busy && mine.chances.glass > 0 && (S.phase === 'play' || vote) && S.seats.some((x, i) => i !== me && x.played.length);
    if (!canGlass) glassMode = false;
    const h = L.heat(S, me), hl = h >= L.CFG.heat.hot ? 'hot' : h >= L.CFG.heat.calm ? 'warm' : 'calm', jump = h - lastHeat >= 15 && !reduce;
    lastHeat = h;
    const stamp = (i, c) => { const g = mine.glassed.find(g => g.target === i && g.card === c.id); return g ? `<span class="glass-stamp ${g.lie ? 'lie' : 'ok'}">${g.lie ? '거짓!' : '맞아요'}</span>` : ''; };
    const seatHtml = i => {
      const x = v.seats[i], p = P(x.who), turn = cur === i;
      const votedFor = shownVotes.has(i) && x.vote !== null ? f.button('liar-reason', `${f.icon('glass')} ${nameOf(x.vote)}`, 'vote-tag', `data-seat="${i}" aria-label="${p.name}의 지목 이유 보기"`) : '';
      return `<article class="seat ${turn ? 'turn' : ''} ${i === me ? 'mine' : ''}" data-seat="${i}">
        <div class="seat-head"><span class="polaroid portrait">${f.image(p.img, 'people', p.name)}</span><div class="seat-id"><b>${p.name}${i === me ? ' (나)' : ''}</b>${x.persona ? `<i class="persona p-${x.persona}">${L.CFG.personas[x.persona].name}</i>` : ''}<i class="perk" title="${perkOf(x.who).text}">${perkOf(x.who).icon} ${perkOf(x.who).name}</i><span class="seat-chips">${f.icon('star')}${x.chips}</span></div></div>
        <div class="seat-cards">${[0, 1, 2].map(k => { const c = x.played[k]; if (!c) return '<div class="mini-ev empty"></div>';
          const aim = glassMode && i !== me && !mine.glassed.some(g => g.card === c.id);
          return f.button(aim ? 'liar-glass' : 'liar-evidence', f.evidence(c) + stamp(i, c), `mini-ev ev-${c.type} ${highlight?.seat === i && highlight.card === c.id ? 'new' : ''} ${aim ? 'aim' : ''}`, `data-seat="${i}" data-index="${k}" aria-label="${p.name}의 ${k + 1}번째 증거 ${aim ? '돋보기로 확인' : '크게 보기'}"`); }).join('')}</div>
        <div class="seat-bubble"></div>${votedFor}
        ${vote && i !== me ? f.button('liar-vote', `이 사람! ${f.icon('glass')}`, 'vote-btn danger', `data-seat="${i}"`) : ''}
      </article>`;
    };
    const others = S.seats.map((_, i) => i).filter(i => i !== me);
    window.GameMusic?.theme(S.phase === 'play' ? 'mystery' : S.phase === 'vote' ? 'suspense' : null);
    const prompt = S.phase !== 'play' && S.phase !== 'vote' ? (busy ? `<b class="lt-call">투표 끝!</b>` : f.button('liar-unpeek', `${f.icon('book')} 결과 다시 보기`, 'primary'))
      : S.phase === 'vote'
      ? (mine.vote === null ? (glassMode ? `<b class="lt-call">돋보기로 볼 카드를 골라요</b>` : `<b class="lt-call">${mine.role === 'liar' ? '누구에게 덮어씌울까? 탈출할 자신만큼 걸어요' : '라이어는 누구? 확신만큼 걸어요'}</b><span class="lt-bet" role="group" aria-label="${mine.role === 'liar' ? '탈출 베팅' : '확신 베팅'}">${Array.from({ length: L.maxBet(mine) }, (_, k) => k + 1).map(n => f.button('liar-bet', `${n}점`, bet === n ? 'sel' : '', `data-bet="${n}" aria-pressed="${bet === n}"`)).join('')}</span>`) : `<b class="lt-call">투표 중…</b>`)
      : glassMode ? `<b class="lt-call">돋보기로 볼 카드를 골라요</b>`
      : myTurn ? (sel ? f.button('liar-play', `이 카드 내기 ${f.icon('arrow')}`, 'primary') : `<b class="lt-call">내 차례! 낼 카드를 골라요 (${L.lap(S) + 1}/${L.CFG.laps}바퀴)</b>`)
      : cur === me ? `<b class="lt-call">내 차례!</b>` : `<span class="lt-wait">${nameOf(cur)} 차례…</span>`;
    f.setScreen('liar', `<header class="lt-top">${f.button('liar-quit', f.icon('back'), 'icon-button', 'aria-label="대회 그만하기"')}
        <div class="lt-round"><b>라운드 ${S.round + 1}</b><span>${Array.from({ length: L.CFG.rounds }, (_, k) => `<i class="${k < S.round ? 'done' : k === S.round ? 'now' : ''}"></i>`).join('')}</span></div>
        ${f.button('liar-topic', `여행지 <b>${C(X).name}</b> ${f.icon('book')}`, 'claim-chip')}
        ${f.button('liar-myrole', mine.role === 'liar' ? `나: 라이어 <small>(${C(mine.climate).name})</small>` : '나: 진짜 여행자', `lt-role ${mine.role === 'liar' ? 'is-liar' : 'is-true'}`)}</header>
      <section class="lt">
        <div class="lt-seats">${others.map(seatHtml).join('')}</div>
        <div class="lt-me">${seatHtml(me)}
          <div class="lt-handbox"><div class="heat ${hl} ${jump ? 'jump' : ''}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${h}" aria-label="내게 쏠린 의심"><span>내게 쏠린 의심</span><i><b style="width:${h}%"></b></i></div><div class="lt-hand" role="group" aria-label="내 증거 카드">${mine.hand.map(c => f.button('liar-card', `<span class="evidence ev-${c.type}">${f.evidence(c)}</span>`, `hand-card ${sel === c.id ? 'sel' : ''}`, `data-card="${c.id}" aria-pressed="${sel === c.id}" ${myTurn ? '' : 'disabled'}`)).join('')}</div>
          <div class="lt-prompt">${prompt}</div>
          <div class="lt-chances">${f.button('liar-chance-glass', glassMode ? '🔍 돋보기 취소' : `🔍 돋보기 <small>−1점 · ${mine.chances.glass}번</small>`, `chance ${glassMode ? 'sel' : ''}`, `aria-pressed="${glassMode}" ${canGlass ? '' : 'disabled'}`)}${f.button('liar-chance-swap', `🔄 ${sel ? '고른 카드 바꾸기' : '카드 바꾸기'} <small>${mine.chances.swap}번</small>`, 'chance', myTurn && sel && mine.chances.swap > 0 ? '' : 'disabled')}</div></div>
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
      const who = L.current(S); let cmd = L.decide(S, who);
      if (cmd.type === 'swap') { S = L.apply(S, cmd).state; cmd = L.decide(S, who); }
      S = L.apply(S, cmd).state; lastFeed = S.feed[0] || null;
      saveContest();
      F().play('card'); table({ seat: who, card: cmd.card }); if (lastFeed) setTimeout(() => my === epoch && F().play('pop'), 250);
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
    F().play('card'); busy = true; table({ seat: me, card }); await wait(lastFeed ? 1800 : 700);
    if (my !== epoch) return;
    busy = false;
    flow();
  }
  async function myVote(target) {
    if (busy || S.phase !== 'vote') return;
    const my = epoch;
    if (S.seats[me].vote === null) {
      S = L.apply(S, { type: 'vote', seat: me, target, bet }).state; saveContest();
    }
    shownVotes.add(me);
    busy = true; F().play('vote'); table();
    for (const i of S.seats.map((x, k) => k !== me && x.vote === null ? k : -1).filter(k => k >= 0)) {
      await wait(1500); if (my !== epoch) return;
      for (let guard = 0; S.seats[i].vote === null && guard < 3; guard++) {
        const cmd = L.decide(S, i), r = L.apply(S, cmd);
        if (r.error) break;
        S = r.state;
        if (cmd.type === 'glass') { lastFeed = { seat: i, kind: 'glass', text: `돋보기로 ${nameOf(cmd.target)} 카드 확인!` }; F().play('pop'); table(); await wait(1300); if (my !== epoch) return; }
      }
      saveContest();
      shownVotes.add(i); lastFeed = { seat: i, kind: 'vote', text: L.voteLine(S, i, S.seats[i].vote) };
      F().play('vote'); table();
    }
    await wait(1600); if (my !== epoch) return;
    F().play('drum'); await wait(1200); if (my !== epoch) return;
    busy = false; reveal();
  }

  /* ───── 결과 ───── */
  function reveal(again = false, tab = 'result', voter = me) {
    if (!S || !['reveal', 'end'].includes(S.phase)) return;
    const f = F(), r = S.results.at(-1), liar = S.seats[r.liar], lp = P(liar.who), X = r.claim, Lc = r.liarClimate;
    if (!again) { table(); f.play(r.liar === me ? (r.caught ? 'busted' : 'sneak') : r.caught ? 'caught' : 'escaped'); }
    const meDelta = r.delta[me], Sc = L.CFG.score;
    const line = c => c.kind === 'caught' ? `<b class="k-bad">들킨 카드</b> ${f.esc(c.why)}` : c.kind === 'same' ? `<b class="k-same">같은 점</b> ${f.esc(c.why)}` : `<b class="k-dodge">얼버무린 말</b>`;
    let content;
    if (tab === 'reason') {
      content = `<div class="lr-people">${S.seats.map((x, i) => f.button('liar-reason', nameOf(i) + (i === me ? '(나)' : ''), i === voter ? 'selected' : '', `data-seat="${i}" aria-pressed="${i === voter}"`)).join('')}</div>${whyLine(r, voter)}`;
    } else if (tab === 'learn') {
      content = `<div class="lr-learn">${r.lesson.liarCards.map(c => `<div class="lr-card"><div class="mini-ev ev-${c.card.type}">${f.evidence(c.card)}</div><p>${line(c)}</p></div>`).join('')}
        ${r.lesson.proofCard ? `<div class="lr-card proof"><div class="mini-ev ev-${r.lesson.proofCard.card.type}">${f.evidence(r.lesson.proofCard.card)}</div><p><b class="k-diff">다른 점</b> ${f.esc(r.lesson.proofCard.why)}</p></div>` : ''}</div>`;
    } else {
      content = `${voteBoard(r)}<div class="lr-chips">${S.seats.map((x, i) => `<span class="${i === me ? 'mine' : ''}">${nameOf(i)} <b class="${r.delta[i] > 0 ? 'up' : r.delta[i] < 0 ? 'down' : ''}">${r.delta[i] > 0 ? '+' : ''}${r.delta[i]}점</b>${r.streaks?.[i] >= 2 ? `<em class="combo">🔥 ${r.streaks[i]}연속!</em>` : ''}</span>`).join('')}</div>
        <p class="lr-me">${meDelta > 0 ? `내 점수 +${meDelta}!` : meDelta < 0 ? `내 점수 ${meDelta}` : '내 점수 그대로'} · 현재 ${S.seats[me].chips}점</p>
        <p class="lr-score-rule">진짜: 맞히면 +${Sc.catch} · 틀리면 ${Sc.miss} (건 점수만큼 더 얻거나 잃어요)<br>2연속부터 맞힐 때마다 콤보 +${Sc.combo} · 돋보기 ${Sc.glass}<br>억울한 최종 지목: 추가 ${Sc.accused}<br>라이어: 탈출 +${Sc.escape} · 들킴 0 (건 점수만큼 더 얻거나 잃어요)<br>동점은 탈출 · 최저 0점<br>캐릭터 능력이 있으면 그만큼 달라져요</p>`;
    }
    f.showModal(`<div class="lr ${r.caught ? 'caught' : 'escaped'}">
      <header class="lr-header"><h2>${r.liar === me ? (r.caught ? '들켰다!' : '안 들켰다!') : r.caught ? '라이어를 잡았다!' : '라이어가 빠져나갔다!'}</h2>${f.button('liar-peek', f.icon('close'), 'icon-button', 'aria-label="닫기"')}</header>
      <div class="lr-liar"><span class="polaroid">${f.image(lp.img, 'people', lp.name)}</span><p><b>${lp.name}${r.liar === me ? '(나)' : ''}</b>가 라이어!<br>실제 여행지: ${climateChip(Lc)}</p></div>
      <nav class="lr-tabs" aria-label="라운드 결과 보기">${[['result', '결과'], ['reason', '의심 이유'], ['learn', '배움 카드']].map(([id, label]) => f.button('liar-result-tab', label, tab === id ? 'selected' : '', `data-tab="${id}" aria-pressed="${tab === id}"`)).join('')}</nav>
      <section class="lr-panel" aria-label="${tab === 'reason' ? '지목한 이유' : tab === 'learn' ? '배움 카드' : '투표와 점수'}">${content}</section>
      <div class="lr-actions">${f.button('liar-peek', `${f.icon('eye')} 카드 다시 보기`, 'secondary')}${f.button(S.phase === 'end' ? 'liar-finish' : 'liar-next', S.phase === 'end' ? `대회 결과 ${f.icon('arrow')}` : `다음 라운드 ${f.icon('arrow')}`, 'primary')}</div></div>`, 'liar-modal liar-result');
    if (!again) learn(X, Lc);
  }
  /* 누가 누구를 찍었는지 + 최종 지목 (동점이면 아무도 지목되지 않아 라이어가 빠져나감) */
  function voteBoard(r) {
    const f = F(), voted = r.voted || S.seats.map(x => x.vote), top = Math.max(...r.votes);
    const tied = r.votes.map((v, i) => v === top ? i : -1).filter(i => i >= 0);
    const verdict = r.accused !== null
      ? `<b>${nameOf(r.accused)}${r.accused === me ? '(나)' : ''}</b> ${top}표로 지목! ${r.accused === r.liar ? '→ 라이어 맞음!' : '→ 라이어가 아니었어요'}`
      : `<b>${tied.map(i => nameOf(i) + (i === me ? '(나)' : '')).join('·')}</b> ${top}표 동점 → 라이어 탈출!`;
    return `<div class="lr-votes"><div class="lr-vote-row">${voted.map((t, i) => f.button('liar-reason', `<b>${nameOf(i)}${i === me ? '(나)' : ''}</b> ${f.icon('arrow')} <b class="${t === r.liar ? 'hit' : ''}">${t === null ? '?' : nameOf(t)}</b>${r.bets?.[i] > 1 ? ` <i class="bet-tag">×${r.bets[i]}</i>` : ''}`, i === me ? 'mine' : '', `data-seat="${i}"`)).join('')}</div>
      <p class="lr-verdict ${r.caught ? 'ok' : 'no'}">${verdict}</p></div>`;
  }
  /* 실제 투표 때 저장한 근거를 사용한다. 사람의 생각은 임의로 추측하지 않는다. */
  function whyLine(r, voter) {
    const f = F(), X = r.claim, target = (r.voted || S.seats.map(x => x.vote))[voter], who = nameOf(voter);
    const top = (r.reasons || []).find(x => x.voter === voter);
    const card = top?.card ? S.seats[target].played.find(c => c.id === top.card) : null;
    let why;
    if (voter === me) why = '내가 직접 선택한 여행자예요. 제출된 증거를 다시 보며 내 판단을 확인해요.';
    else if (!card) why = '확실한 카드 없이 느낌으로 골랐대요';
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
    const framed = voter === r.liar ? ` <b class="lr-framed">그런데 ${who}이(가) 바로 라이어!</b>` : '';
    return `<div class="lr-why">${card ? `<div class="mini-ev ev-${card.type}">${f.evidence(card)}</div>` : ''}<p><b>${who} → ${nameOf(target)}${target === r.liar ? ' · 라이어 맞힘!' : ' · 다른 사람을 지목했어요'}</b> ${f.esc(why)}${framed}</p></div>`;
  }
  /* 도감: 라이어 판에서 본 기후도 열어 줌 */
  function learn(X, Lc) {
    const p = F().progress();
    for (const id of [X, Lc]) if (!p.climates.includes(id)) p.climates.push(id);
    /* 이번 라운드에 나온 사진 카드와 두 기후의 대표 사진을 사진첩에 모음 */
    const shots = [...S.seats.flatMap(x => x.played.filter(c => c.type === 'photo').map(c => c.img)), C(X).img, C(Lc).img];
    for (const img of shots) if (Object.values(D.climates).some(c => c.gallery.includes(img)) && !p.photos.includes(img)) p.photos.push(img);
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
    if (!lp.chars.includes(x.who)) lp.chars.push(x.who);
    const fresh = [], ctx = { x, my, st, lp, p: f.progress(), who: x.who, innocent: L.CFG.rounds - x.stats.liar };
    for (const b of BADGES) if (!lp.badges.includes(b.id) && b.test(ctx)) { lp.badges.push(b.id); fresh.push(b.id); }
    const oldLv = level(lp.xp || 0), gain = Math.max(0, x.chips) + ([5, 3, 1][my - 1] || 0);
    lp.xp = (lp.xp || 0) + gain;
    const lv = level(lp.xp);
    F().save();
    const nextStage = L.CFG.stages[st].next;
    f.play(my === 1 ? 'clear' : 'paper');
    f.setScreen('liar-end', `${f.top('대회 결과', 'liar')}
      <section class="le"><h2>${my === 1 ? '우승!' : `${my}등`}</h2><p class="le-stage">${L.CFG.stages[st].name}</p>
        <div class="podium">${rank.map((i, k) => `<div class="pod p${k + 1} ${i === me ? 'mine' : ''}"><span class="polaroid">${f.image(P(S.seats[i].who).img, 'people', P(S.seats[i].who).name)}</span><b>${P(S.seats[i].who).name}</b><span class="pod-chips">${f.icon('star')}${S.seats[i].chips}</span><em>${k + 1}등</em></div>`).join('')}</div>
        <div class="le-xp"><b>경험치 +${gain}</b>${lvBar(lp.xp)}${lv.name !== oldLv.name ? `<p class="rank-up" role="status">${f.icon('star')} 등급 상승! <strong>${lv.name}</strong></p>` : ''}</div>
        ${titles.length ? `<div class="le-titles">${titles.map(([t, d]) => `<div class="le-title"><b>${t}</b><span>${d}</span></div>`).join('')}</div>` : ''}
        ${fresh.length ? `<p class="le-new">새 배지: ${fresh.map(id => BADGES.find(b => b.id === id).name).join(', ')}</p>` : ''}
        <div class="le-actions">${f.button('liar-again', `다시 도전 ${f.icon('arrow')}`, 'primary', `data-stage="${st}"`)}${nextStage && stageOpen(nextStage) ? f.button('liar-start', `${L.CFG.stages[nextStage].name} ${f.icon('arrow')}`, 'secondary', `data-stage="${nextStage}"`) : ''}${f.button('liar', '대회 고르기', 'secondary')}</div>
      </section>`);
  }
  /* 배지: group 으로 도감 배지 탭에서 묶어 보여 줌. count 가 있으면 잠긴 배지에 진행도 표시 */
  const allPhotos = [...new Set(Object.values(D.climates).flatMap(c => c.gallery))];
  const hot = L.CFG.heat.hot, as = who => c => c.who === who;
  const BADGES = [
    { group: '대회', id: 'win', name: '첫 우승', goal: '대회에서 1등 하기', icon: 'star', test: c => c.my === 1 },
    { group: '대회', id: 'nation', name: '전국 챔피언', goal: '전국 대회에서 1등 하기', icon: 'home', test: c => c.my === 1 && c.st === 'nation' },
    { group: '대회', id: 'world', name: '세계 대회 우승', goal: '세계 대회에서 1등 하기', icon: 'mountain', test: c => c.my === 1 && c.st === 'world' },
    { group: '대회', id: 'veteran', name: '단골 여행자', goal: '대회 10번 참가하기', icon: 'book', count: c => [c.lp.played, 10], test: c => c.lp.played >= 10 },
    { group: '대회', id: 'team', name: '세계 일주 팀', goal: '여행자 8명 모두로 대회 참가하기', icon: 'twin', count: c => [c.lp.chars.length, 8], test: c => c.lp.chars.length >= 8 },
    { group: '수사', id: 'detective', name: '명탐정', goal: '한 대회에서 라이어 3번 맞히기', icon: 'glass', test: c => c.x.stats.caught >= 3 },
    { group: '수사', id: 'perfect', name: '완벽한 눈', goal: '한 대회에서 진짜일 때 라이어를 한 번도 놓치지 않기 (3라운드 이상)', icon: 'eye', test: c => c.innocent >= 3 && c.x.stats.caught === c.innocent },
    { group: '수사', id: 'combo', name: '연속 적중', goal: '라이어를 3번 연속 맞히기', icon: 'flame', test: c => c.x.stats.bestStreak >= 3 },
    { group: '수사', id: 'glass', name: '돋보기 수사관', goal: '돋보기로 거짓 카드 찾기', icon: 'glass', test: c => c.x.stats.glassHit >= 1 },
    { group: '수사', id: 'allin', name: '올인 성공', goal: '3점 이상 걸고 라이어 맞히기', icon: 'bolt', test: c => c.x.stats.allin >= 1 },
    { group: '라이어', id: 'escape', name: '변장의 달인', goal: '라이어일 때 들키지 않기', icon: 'twin', test: c => c.x.stats.escaped >= 1 },
    { group: '라이어', id: 'escape2', name: '두 얼굴', goal: '한 대회에서 라이어로 2번 탈출하기', icon: 'twin', test: c => c.x.stats.escaped >= 2 },
    { group: '라이어', id: 'ghost', name: '그림자 여행자', goal: '라이어일 때 의심 게이지를 빨강 아래로 지키고 탈출', icon: 'check', test: c => c.x.stats.ghost >= 1 },
    { group: '여행자', who: 'haneul', id: 'c-haneul', name: '매의 눈', goal: '하늘로 한 대회에서 돋보기 2번 모두 거짓 카드 찾기', test: c => as('haneul')(c) && c.x.stats.glassHit >= 2 },
    { group: '여행자', who: 'junho', id: 'c-junho', name: '특종 사진', goal: '준호로 돋보기를 써서 거짓 카드 찾고 2등 안에 들기', test: c => as('junho')(c) && c.x.stats.glassHit >= 1 && c.my <= 2 },
    { group: '여행자', who: 'miso', id: 'c-miso', name: '짐 싸기 달인', goal: '미소로 바꾸기 2번을 다 쓰고 2등 안에 들기', test: c => as('miso')(c) && c.x.chances.swap === 0 && c.my <= 2 },
    { group: '여행자', who: 'leo', id: 'c-leo', name: '대박 승부', goal: '레오로 4점을 걸고 성공하기', test: c => as('leo')(c) && c.x.stats.big >= 1 },
    { group: '여행자', who: 'ara', id: 'c-ara', name: '불꽃 연승', goal: '아라로 라이어를 4번 연속 맞히기', test: c => as('ara')(c) && c.x.stats.bestStreak >= 4 },
    { group: '여행자', who: 'park', id: 'c-park', name: '흔들림 없는 어른', goal: '박 할아버지로 억울하게 지목되고도 우승하기', test: c => as('park')(c) && c.x.stats.accused >= 1 && c.my === 1 },
    { group: '여행자', who: 'sophie', id: 'c-sophie', name: '명배우', goal: '소피로 한 대회에서 라이어 2번 탈출하기', test: c => as('sophie')(c) && c.x.stats.escaped >= 2 },
    { group: '여행자', who: 'taeyang', id: 'c-taeyang', name: '모두의 친구', goal: '태양으로 의심 게이지가 한 번도 빨강이 되지 않고 우승하기', test: c => as('taeyang')(c) && (c.x.stats.maxPeak || 0) < hot && c.my === 1 },
    { group: '수집', id: 'dex', name: '기후 박사', goal: '기후 도감 모두 열기', icon: 'book', count: c => [c.p.climates.length, Object.keys(D.climates).length], test: c => c.p.climates.length >= Object.keys(D.climates).length },
    { group: '수집', id: 'photo20', name: '사진 수집가', goal: '여행 사진 20장 모으기', icon: 'photo', count: c => [c.p.photos.length, 20], test: c => c.p.photos.length >= 20 },
    { group: '수집', id: 'photoAll', name: '세계 사진첩', goal: '여행 사진 모두 모으기', icon: 'photo', count: c => [c.p.photos.length, allPhotos.length], test: c => allPhotos.every(img => c.p.photos.includes(img)) },
    { group: '수집', id: 'collector', name: '배지 사냥꾼', goal: '배지 15개 모으기', icon: 'star', count: c => [c.lp.badges.length, 15], test: c => c.lp.badges.length >= 15 }
  ];
  /* 레벨: 경험치 기준값 + 기존 등급 이름 */
  const LEVELS = [0, 20, 60, 120, 220].map((xp, i) => ({ xp, name: window.FAKE_BANK.ranks[i].name }));
  const level = xp => LEVELS.filter(l => l.xp <= xp).at(-1);
  function lvBar(xp) {
    const l = level(xp), n = LEVELS[LEVELS.indexOf(l) + 1];
    return `<div class="rank-card"><strong>${l.name}</strong><span>경험치 ${xp}${n ? ` · 다음 등급까지 ${n.xp - xp}` : ''}</span><progress max="${n ? n.xp - l.xp : 1}" value="${n ? xp - l.xp : 1}" aria-label="다음 등급까지 진행"></progress></div>`;
  }

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
      case 'liar-bet': bet = Number(b.dataset.bet); f.play('tap'); table(); return true;
      case 'liar-chance-glass': glassMode = !glassMode; f.play('tap'); table(); return true;
      case 'liar-glass': {
        if (!glassMode || busy) return true;
        const r = L.apply(S, { type: 'glass', seat: me, target: Number(b.dataset.seat), index: Number(b.dataset.index) });
        if (r.error) return true;
        S = r.state; glassMode = false; saveContest();
        f.play(r.lie ? 'objection' : 'stamp'); table();
        F().app.querySelector('.glass-stamp')?.closest('button')?.focus();
        return true;
      }
      case 'liar-chance-swap': {
        if (busy || !sel || L.current(S) !== me) return true;
        const r = L.apply(S, { type: 'swap', seat: me, card: sel });
        if (r.error) return true;
        S = r.state; sel = r.card; saveContest(); f.play('paper'); table();
        return true;
      }
      case 'liar-vote': myVote(Number(b.dataset.seat)); return true;
      case 'liar-next': f.closeModal(false); next(); return true;
      case 'liar-peek': f.closeModal(false); table(); return true;
      case 'liar-unpeek': reveal(true); return true;
      case 'liar-result-tab': reveal(true, b.dataset.tab); return true;
      case 'liar-reason': if (['reveal', 'end'].includes(S?.phase) && !busy) reveal(true, 'reason', Number(b.dataset.seat)); return true;
      case 'liar-evidence': {
        const seat = S?.seats[Number(b.dataset.seat)], card = seat?.played[Number(b.dataset.index)];
        if (card) f.showModal(`<header class="zoom-header"><h2>${P(seat.who).name}의 증거</h2>${f.modalClose()}</header><div class="zoom-evidence ev-${card.type}">${f.evidence(card)}</div>`, 'liar-modal liar-evidence-modal');
        return true;
      }
      case 'liar-finish': f.closeModal(false); finish(); return true;
      case 'liar-topic': f.showModal(`<div class="lri"><h2>${C(S.claim).name}</h2><figure class="polaroid lri-photo">${f.image(C(S.claim).img, 'scenes', C(S.claim).name)}</figure>${facts(S.claim)}<p class="lri-confuse">라이어는 이 중 한 곳에서: ${C(S.claim).confuse.map(climateChip).join(' ')}</p>${f.modalClose()}</div>`, 'liar-modal'); return true;
      case 'liar-myrole': { const x = S.seats[me]; f.showModal(`<div class="lri"><h2>${x.role === 'liar' ? `나는 라이어 — 사실은 ${C(x.climate).name}` : `나는 진짜 ${C(x.climate).name} 여행자`}</h2>${facts(x.climate)}${f.modalClose()}</div>`, 'liar-modal'); return true; }
      case 'liar-quit': f.showModal(`<div class="lri"><h2>대회를 그만할까요?</h2><p>지금까지의 점수는 사라져요.</p><div class="modal-actions">${f.button('liar', '그만하기', 'danger')}${f.button('close', '계속하기', 'secondary')}</div></div>`, 'liar-modal'); return true;
    }
    return false;
  }
  window.LiarUI = { lobby, action, BADGES, level, lvBar, badgeCount: b => b.count?.({ lp: prog(), p: F().progress() }), syncBadges };
  /* 수집·누적 배지(count 가 있는 것)는 대회가 끝나지 않아도 조건을 채우면 바로 지급 */
  function syncBadges() {
    const lp = prog(), c = { lp, p: F().progress() }, fresh = BADGES.filter(b => b.count && !lp.badges.includes(b.id) && b.test(c));
    if (fresh.length) { lp.badges.push(...fresh.map(b => b.id)); F().save(); }
    return fresh;
  }
})();
