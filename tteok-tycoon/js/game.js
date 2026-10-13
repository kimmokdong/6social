/* 떡볶이 타이쿤 — 화면과 조작 */
(() => {
  'use strict';
  const T = window.TTEOK, E = window.TteokEngine, A = window.TycoonArt, P = window.SamgwonArt, S = window.TteokSfx;
  const KEY = 'tteok-tycoon-v1', GAME_KEY = 'tteok-tycoon-v2-game', UP = T.upgrades;
  const app = document.getElementById('app'), layer = document.getElementById('layer');
  const debug = new URLSearchParams(location.search).has('debug');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 120) : ms));
  const esc = v => String(v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const won = n => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n)).toLocaleString('ko-KR')}원`;
  const PEOPLE = { tycoon: '왕부자 회장', reporter: '나팩트 기자', ad_agent: '광고 회사', ftc_officer: '공정거래위원회', kid: '도윤', teacher: '다정 선생님', police: '박든든 경찰관', grandma: '봉순 할머니', trucker: '푸드트럭 사장님' };
  const BADGE_ICON = { best: 'star', honest: 'scale', allProfit: 'coin', noWaste: 'check', bulk: 'bowl', fullHouse: 'kid', rivals: 'crown', allEndings: 'bulb' };
  const UP_ICON = { cheese: 'cheese', sundae: 'sundae', chairs: 'chairs', staff: 'staff', clean: 'clean', flyer: 'flyer' };
  const UP_FX = { cheese: '맛 +1 · 재료비 +300원/그릇', sundae: '맛 +0.5 · 지나가는 아이 +10% · 재료비 +100원/그릇', chairs: '판매 한도 +15그릇', staff: '판매 한도 +25그릇 · 하루 15,000원', clean: '평판 +0.5', flyer: '오늘 지나가는 아이 +30%' };
  const HINTS = { closed: '돈이 바닥나면…', best: '맛·돈·믿음 모두', greedy: '돈만 쫓으면…', kind: '이웃을 생각하면…', rich: '장사를 잘하면…', normal: '평범하게 10일' };

  if (location.protocol !== 'file:' && navigator.onLine) {
    for (const href of ['https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Nanum+Myeongjo:wght@800&display=swap', 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css']) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; document.head.appendChild(link);
    }
  }

  /* ───── 저장 ───── */
  const fresh = () => ({ endings: [], badges: [], rivals: [], found: [], tutorialSeen: false, sound: false, best: 0 });
  function loadProgress() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null'), f = fresh();
      if (!s || typeof s !== 'object') return f;
      f.endings = Array.isArray(s.endings) ? s.endings.filter(id => T.endings.some(e => e.id === id)) : [];
      f.badges = Array.isArray(s.badges) ? s.badges.filter(id => T.badges.some(b => b.id === id)) : [];
      f.rivals = Array.isArray(s.rivals) ? s.rivals.filter(id => T.rivals[id]) : [];
      f.found = Array.isArray(s.found) ? s.found.filter(k => typeof k === 'string' && T.chains[k.split(':')[0]]) : [];
      f.tutorialSeen = s.tutorialSeen === true; f.sound = s.sound === true; f.best = Number(s.best) || 0;
      return f;
    } catch (_) { return fresh(); }
  }
  let progress = loadProgress();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_) {} };
  const saveGame = () => { try { localStorage.setItem(GAME_KEY, JSON.stringify({ G, plan, resume })); } catch (_) {} };
  const clearGame = () => { try { localStorage.removeItem(GAME_KEY); } catch (_) {} };
  function savedGame() {
    try { const v = JSON.parse(localStorage.getItem(GAME_KEY) || 'null'); if (v && v.G && typeof v.G.day === 'number' && Array.isArray(v.G.schedule) && !v.G.ended) return v; } catch (_) {}
    return null;
  }
  S.setEnabled(progress.sound);

  let G = null, plan = null, resume = null, screen = '', busy = false, skip = false, toastTimer = 0;
  let layerOpener = null;

  /* ───── 부품 ───── */
  const icon = (n, cls = '') => A.icon(n, cls);
  const btn = (action, html, cls = '', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${html}</button>`;
  const iconBtn = (n, label, action) => `<button type="button" class="icon-btn" data-action="${action}" aria-label="${label}">${icon(n)}</button>`;
  const soundBtn = () => `<button type="button" class="icon-btn" data-action="sound" aria-label="소리 ${progress.sound ? '끄기' : '켜기'}" aria-pressed="${progress.sound}">${P.icon(progress.sound ? 'sound' : 'mute')}</button>`;
  function setScreen(name, html) {
    const active = document.activeElement, action = active?.dataset.action, up = active?.dataset.up;
    document.querySelector('.toast')?.classList.remove('show');
    screen = name; app.className = `screen-${name}`; app.innerHTML = html; window.scrollTo(0, 0); debugBar();
    const focus = action ? app.querySelector(`[data-action="${action}"]:not(:disabled)`) : up ? app.querySelector(`[data-up="${up}"]`) : null;
    (focus || app.querySelector('button:not(:disabled),a'))?.focus({ preventScroll: true });
  }
  function toast(html) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }
  function openLayer(html, cls = '') {
    if (layer.hidden) layerOpener = document.activeElement;
    layer.innerHTML = `<div class="backdrop ${cls}"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
    layer.hidden = false; app.inert = true; setTimeout(() => layer.querySelector('.sheet button:not([disabled])')?.focus({ preventScroll: true }), 30);
  }
  function closeLayer() {
    layer.hidden = true; layer.innerHTML = ''; app.inert = false;
    (layerOpener?.isConnected ? layerOpener : app.querySelector('button:not(:disabled),a'))?.focus({ preventScroll: true });
    layerOpener = null;
  }
  const topbar = () => `<header class="topbar">${iconBtn('menu', '메뉴', 'menu')}<div class="day"><strong>${G.day + 1}일째</strong><div class="dots">${G.schedule.map((_, i) => `<i class="${i < G.day ? 'done' : i === G.day ? 'now' : ''}"></i>`).join('')}</div></div>
    <div class="res"><span class="res-item money" aria-label="가진 돈">${icon('coin')}<b>${won(G.money)}</b></span><span class="res-item" aria-label="평판">${A.stars(G.rep)}</span></div></header>`;

  /* ───── 타이틀 ───── */
  function title() {
    const saved = savedGame();
    setScreen('title', `<header class="tbar"><span class="title-left"><a class="title-guide" href="../guides/tteok.html">게임 설명서</a><span class="title-credit">만든이 현승쌤</span></span><div class="tools">${soundBtn()}${iconBtn('gear', '설정', 'settings')}</div></header>
      <section class="title-main"><div class="title-scene">${Paint.scene('tteok/title', A.scene({ chairs: true }), '학교 앞 떡볶이 가게', 'eager')}</div><h1 class="logo">떡볶이 <span>타이쿤</span></h1>
      <div class="title-buttons">${saved ? btn('continue', `이어하기 ${icon('play')}`, 'primary big') + btn('new', '새로 시작', 'secondary') : btn('new', `시작 ${icon('play')}`, 'primary big')}${btn('endings', `엔딩 도감 <b class="count">${progress.endings.length}/${T.endings.length}</b>`, 'secondary')}</div></section>`);
  }

  /* ───── 하루 시작 ───── */
  async function startDay() {
    const events = E.morningEvents(G);
    if (G.day === 0) Paint.preload('tycoon');
    events.forEach(ev => Paint.preload(ev.node.char));
    const nextChoice = E.morningChoice(G);
    if (nextChoice) Paint.preload(nextChoice.char);
    plan = { price: G.lockedPrice || G.lastPlan.price, portions: Math.min(G.lastPlan.portions, 80), upgrade: null };
    resume = { phase: 'morning', events };
    morning();
    saveGame();
    if (!progress.tutorialSeen && G.day === 0) { await tutorial(); }
    if (G.day === 0) await rivalCard();
    await finishMorning();
  }

  async function finishMorning() {
    while (resume.events.length) {
      const ev = resume.events[0];
      if (ev.node.options) await choiceCard(ev.node, k => {
        const picked = E.chooseNode(G, ev, k); resume.events.shift(); return picked;
      });
      else { await infoCard(ev); resume.events.shift(); }
      morning();
    }
    const mc = E.morningChoice(G);
    if (mc) { await choiceCard(mc, k => E.choose(G, k)); morning(); }
    if (G.money < 30000) toast(`${icon('coin')} 돈이 얼마 남지 않았어요!`);
  }

  /* ───── 아침 준비 ───── */
  function morning() {
    const d = E.day(G), preview = E.plannedState(G, plan), vis = E.expectedVisitors(G, plan), cap = E.capacity(G, plan);
    const locked = !!G.lockedPrice, later = d.choice && d.choice.at === 'evening'; // 저녁 사건은 미리 알려 주지 않음
    const up = plan.upgrade ? UP[plan.upgrade] : null;
    const spend = plan.portions * preview.ingredient + T.rent + E.wages(G, plan) + (up && E.canBuy(G, plan.upgrade) ? up.cost : 0);
    setScreen('morning', `<section class="morning">${topbar()}
      <div class="m-main">
        <aside class="news"><div class="news-icon">${newsIcon(d) === 'kid' ? `<div class="crowd">${A.kid(1)}${A.kid(4)}${A.kid(2)}</div>` : icon(newsIcon(d))}</div><h2>${later ? '오늘도 장사!' : d.title}</h2>${d.news && !later ? `<p>${esc(d.news)}</p>` : ''}
          ${G.rivalNews && !G.lockedPrice ? `<p class="rival-news">${esc(G.rivalNews)}</p>` : ''}
          <div class="chips"><span class="chip">${A.kid(3)}<b>지나가는 아이 ${vis}명</b></span><span class="chip rival${G.rivalPrice < G.rivalBase ? ' sale' : ''}" aria-label="왕떡볶이 가격">${icon('crown')}<b>${won(G.rivalPrice)} · 맛 ${E.rivalTaste(G).toFixed(1)}</b></span>${G.truck ? `<span class="chip truck" aria-label="푸드트럭 가격">${icon('truck')}<b>${won(T.truck.price)}</b></span>` : ''}<span class="chip warn">${icon('bowl')}<b>1그릇 재료비 ${won(preview.ingredient)}</b></span></div></aside>
        <div class="plan">
          <div class="plan-stats" aria-live="polite"><span>맛 ${G.taste.toFixed(1)}${preview.taste !== G.taste ? ` → ${preview.taste.toFixed(1)}` : ''}</span><span>평판 ★${G.rep.toFixed(1)}${preview.rep !== G.rep ? ` → ★${preview.rep.toFixed(1)}` : ''}</span></div>
          <div class="row${locked ? ' locked' : ''}"><span class="row-label">${icon('coin')}가격</span>
            ${btn('price-down', icon('minus'), 'step', `aria-label="가격 내리기" ${locked || plan.price <= T.prices[0] ? 'disabled' : ''}`)}<b class="val">${won(locked ? G.lockedPrice : plan.price)}</b>${btn('price-up', icon('plus'), 'step', `aria-label="가격 올리기" ${locked || plan.price >= T.prices[T.prices.length - 1] ? 'disabled' : ''}`)}
            ${locked ? `<span class="lock-note">${icon('lock')}약속한 가격</span>` : ''}</div>
          <div class="row"><span class="row-label">${icon('bowl')}재료</span>
            ${btn('por-down', icon('minus'), 'step', `aria-label="재료 줄이기" ${plan.portions <= T.portions[0] ? 'disabled' : ''}`)}<b class="val">${plan.portions}그릇</b>${btn('por-up', icon('plus'), 'step', `aria-label="재료 늘리기" ${plan.portions >= T.portions[T.portions.length - 1] ? 'disabled' : ''}`)}
            <span class="cap-note${plan.portions > cap ? ' over' : ''}">최대 ${cap}그릇 판매</span></div>
          ${plan.portions > cap ? `<p class="waste" role="status">${plan.portions - cap}그릇은 만들어도 못 팔아요 (버려요)</p>` : ''}
          <div class="ups" role="group" aria-label="오늘의 투자">${G.offers.map(id => {
            const u = UP[id], can = E.canBuy(G, id);
            return `<button type="button" class="up${plan.upgrade === id ? ' sel' : ''}" data-up="${id}" aria-pressed="${plan.upgrade === id}" ${can ? '' : 'disabled'}><div class="up-ico">${Paint.scene(`tteok/st_${id}`, icon(UP_ICON[id]))}</div><b>${u.name}</b><span class="up-cost">${u.cost ? won(u.cost) : '무료'}</span><span class="up-fx">${UP_FX[id]}</span></button>`;
          }).join('')}</div>
          ${yesterday()}
          <div class="go-row"><span class="spend">${icon('coin')}오늘 쓸 돈 <b>${won(spend)}</b></span>${btn('open', `장사 시작! ${icon('play')}`, 'primary go')}</div>
        </div></div></section>`);
    saveGame();
  }

  const newsIcon = d => d.mood < 1 ? 'rain' : d.youtuber ? 'camera' : d.rivalSale ? 'crown' : d.ingredient ? 'bowl' : d.mood > 1.3 ? 'kid' : 'sun';

  /* 어제 결과: 오늘 결정을 고치는 데 쓰는 짧은 요약 */
  function yesterday() {
    const h = G.history[G.history.length - 1];
    if (!h) return '';
    return `<div class="yday"><span class="yd-label">어제</span><span>${icon('coin')}${won(h.price)}</span><span>${icon('bowl')}${h.served}그릇 판매</span>${h.turned ? `<span class="bad">${icon('cross')}${h.turned}명 못 삼</span>` : ''}${h.leftover ? `<span class="bad">${icon('trash')}${h.leftover}그릇 버림</span>` : ''}<b class="${h.profit >= 0 ? 'plus' : 'minus'}">${h.profit >= 0 ? '+' : ''}${won(h.profit)}</b></div>`;
  }

  /* ───── 장사 ───── */
  async function business() {
    if (busy || screen !== 'morning' || !layer.hidden) return;
    busy = true; skip = false; closeLayer();
    const before = { rep: G.rep, money: G.money };
    const res = E.simulate(G, plan);
    // 장사가 계산된 뒤에는 새로고침해도 같은 날을 다시 팔지 않습니다.
    resume = { phase: 'evening', res, before }; saveGame();
    const d = G.schedule[res.day];
    S.play('whoosh');
    setScreen('business', `<section class="business"><div class="biz-top"><strong>${res.day + 1}일째 장사 중</strong>
      <div class="counts"><span class="cnt mine">${icon('bowl')}<b data-c="mine">0</b></span><span class="cnt rival">${icon('crown')}<b data-c="rival">0</b></span>${res.truck ? `<span class="cnt truck">${icon('truck')}<b data-c="truck">0</b></span>` : ''}<span class="cnt none">${A.kid(5)}<b data-c="none">0</b></span><span class="cnt soldout">${icon('cross')}<b data-c="soldout">0</b></span></div>
      ${btn('skip', '빨리 보기', 'secondary small')}</div>
      <div class="stage"><div class="scene-wrap">${A.scene({ rain: d.mood < 1, chairs: !!G.owned.chairs, staff: !!G.owned.staff, clean: !!G.owned.clean, cheese: !!G.owned.cheese, truck: res.truck }, true)}<div class="kids"></div><div class="shop-bubbles" aria-hidden="true">${['mine', 'rival', 'truck', 'road'].map(k => `<div class="bubble-stack ${k}" data-bubbles="${k}"></div>`).join('')}</div></div></div></section>`);
    const wrap = app.querySelector('.kids'), counters = {};
    await Promise.all([...app.querySelectorAll('.street-art img')].map(img => img.decode().catch(() => {})));
    const painted = !!app.querySelector('.street-art.loaded:not(.failed)');
    wrap.classList.toggle('painted-kids', painted);
    app.querySelector('.shop-bubbles').classList.toggle('painted-bubbles', painted);
    app.querySelectorAll('[data-c]').forEach(el => counters[el.dataset.c] = el);
    const shown = { mine: 0, rival: 0, none: 0, soldout: 0, ...(res.truck ? { truck: 0 } : {}) }, total = { ...res.counts, none: res.counts.none + res.counts.budget };
    const kids = res.kids.map(k => k === 'budget' ? 'none' : k);
    const sample = Math.min(kids.length, 42), step = kids.length / sample;
    const target = painted
      ? { mine: [15.5, 71], rival: [84.5, 71], truck: [49, 76], soldout: [29, 75], none: [106, 88] }
      : { mine: [21, 84], rival: [80, 84], truck: [52, 86], soldout: [30, 92], none: [50, 104] };
    // 두 가게는 같은 깊이이며, 앞쪽 인도로 나오는 아이만 조금 크게 보입니다.
    const depth = { start: 1.22, mine: 1.15, soldout: 1.2, rival: 1.15, truck: 1.2, none: 1.3 };
    for (let n = 0; n < sample && !skip; n++) {
      const k = kids[Math.floor(n * step)], el = document.createElement('div');
      el.className = `kid go-${k}`; el.innerHTML = painted ? A.walkingKid(n) : A.kid(n);
      const tx = target[k][0] + (Math.random() * (painted ? 2 : 8) - (painted ? 1 : 4)), ty = target[k][1] + (Math.random() * 2 - 1);
      el.style.left = `${50 + (n % 3 - 1) * 4}%`; el.style.top = painted ? '82%' : '78%';
      if (painted) el.style.setProperty('--s', depth.start);
      if (Math.random() < .4) {
        const decision = res.decisions[Math.floor(n * step)];
        const stack = app.querySelector(`[data-bubbles="${k === 'none' ? 'road' : k === 'soldout' ? 'mine' : k}"]`);
        const limit = matchMedia('(max-width: 600px)').matches ? 2 : 3;
        while (stack.children.length >= limit) stack.firstElementChild.remove();
        const bubble = document.createElement('span'); bubble.className = 'bubble-s';
        bubble.textContent = T.reasonThoughts[decision.reason]; stack.appendChild(bubble);
        setTimeout(() => bubble.remove(), 3400);
      }
      wrap.appendChild(el);
      el.style.zIndex = String(Math.round(ty));
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.left = `${tx}%`; el.style.top = `${ty}%`; if (painted) el.style.setProperty('--s', depth[k]); }));
      setTimeout(() => el.classList.add('arrived'), 900);
      setTimeout(() => { el.classList.add('leaving'); if (k === 'soldout') el.style.left = `${tx + 10}%`; }, 1250);
      setTimeout(() => el.remove(), 2250);
      const until = Math.round((n + 1) / sample * kids.length);
      for (const key of Object.keys(shown)) shown[key] = kids.slice(0, until).filter(x => x === key).length;
      for (const key of Object.keys(shown)) counters[key].textContent = shown[key];
      if (k === 'mine') S.play('coin');
      await wait(n < 6 ? 260 : 150);
    }
    for (const key of Object.keys(shown)) counters[key].textContent = total[key];
    await wait(skip ? 50 : 3400);
    busy = false;
    evening(res, before);
  }

  /* ───── 저녁 정산 ───── */
  async function evening(res, before) {
    const dRep = Math.round((G.rep - before.rep) * 10) / 10, sum = res.visitors || 1;
    const ec = E.eveningChoice(G), totalProfit = res.profit - res.upCost;
    const seg = k => Math.max(0, (k === 'none' ? res.counts.none + res.counts.budget : res.counts[k]) / sum * 100);
    setScreen('evening', `<section class="evening">${topbar()}<div class="e-main">
      <article class="receipt"><h2>${res.day + 1}일째 장사 결과</h2>
        <div class="profit ${totalProfit >= 0 ? 'plus' : 'minus'}">${totalProfit >= 0 ? '+' : ''}${won(totalProfit)}</div>
        <ul class="lines">
          <li>${icon('bowl')}<span>${res.served}그릇 × ${won(res.price)}</span><b class="plus">+${won(res.revenue)}</b></li>
          <li>${icon('cheese')}<span>재료 ${res.portions}그릇 × ${won(res.ingredient || res.ingredientCost / res.portions)}</span><b class="minus">−${won(res.ingredientCost)}</b></li>
          <li>${icon('home2')}<span>가게 임대료</span><b class="minus">−${won(res.rent)}</b></li>
          ${res.wage ? `<li>${icon('staff')}<span>알바비</span><b class="minus">−${won(res.wage)}</b></li>` : ''}
          ${res.upCost ? `<li>${icon(UP_ICON[res.upgrade])}<span>${UP[res.upgrade].name}</span><b class="minus">−${won(res.upCost)}</b></li>` : ''}
        </ul>
        ${res.leftover > 0 ? `<p class="waste">${icon('trash')}${res.leftover}그릇 남아서 버렸어요</p>` : ''}
        ${res.turned > 0 ? `<p class="waste">${icon('cross')}${res.turned}명이 못 사고 돌아갔어요</p>` : ''}
        ${res.youtuber ? `<p class="waste yt ${res.youtuber}">${icon('camera')}${res.youtuber === 'good' ? '유튜버: “진짜 맛있어요!”' : '유튜버: “음… 그냥 그래요”'}</p>` : ''}
        <div class="bank">${icon('coin')}<span>통장</span><b>${won(G.money)}</b></div></article>
      <div class="e-side">
        <div class="panel"><h3>지나간 아이 ${res.visitors}명은 어디로?</h3><div class="mind">${['mine', 'rival', 'truck', 'none', 'soldout'].map(k => `<span class="mseg ${k}" style="flex:${seg(k)}"></span>`).join('')}</div>
          <div class="mind-legend"><span class="mine">${icon('bowl')}우리 가게 ${res.counts.mine}</span><span class="rival">${icon('crown')}왕떡볶이 ${res.counts.rival}</span>${res.truck ? `<span class="truck">${icon('truck')}푸드트럭 ${res.counts.truck}</span>` : ''}<span class="none">${A.kid(5)}안 사 먹음 ${res.counts.none + res.counts.budget}</span><span class="soldout">${icon('cross')}다 팔려서 못 삼 ${res.counts.soldout}</span></div>
          <div class="choice-summary">${E.choiceSummary(res).map(d => `<p>${esc(d.text)}</p>`).join('')}</div></div>
        <div class="panel"><h3>평판</h3><div class="rep-row">${A.stars(G.rep)}<b class="${dRep >= 0 ? 'plus' : 'minus'}">${dRep >= 0 ? '+' : ''}${dRep}</b></div></div>
        <div class="panel"><h3>가격과 손님</h3><p class="chart-note">왼쪽부터 날짜별 판 그릇 수, 아래는 그날 가격이에요.</p><div class="chart">${G.history.map(h => `<div class="bar-col"><span class="b" style="height:${Math.min(100, h.served / 80 * 100)}%"><i>${h.served}</i></span><em>${h.price / 1000}천</em></div>`).join('')}</div></div>
      </div></div>
      <div class="e-foot">${btn('next', G.day >= T.dayCount - 1 ? `결과 보기 ${icon('play')}` : `다음 날 ${icon('play')}`, 'primary go', ec ? 'disabled' : '')}</div></section>`);
    S.play(res.profit >= 0 ? 'up' : 'down');
    if (ec) Paint.preload(ec.char);
    if (ec) { await wait(700); await choiceCard(ec, k => E.choose(G, k)); evening(res, before); }
  }

  /* ───── 사건 카드 ───── */
  const speaker = c => `<div class="ev-card"><div class="ev-portrait">${Paint.person(c.char, P.portrait(c.char))}</div><b class="ev-name">${c.name || PEOPLE[c.char] || ''}</b></div>`;
  function choiceCard(ch, pick) {
    return new Promise(resolve => {
      S.play('event');
      openLayer(`<div class="event"><div class="bubble">${esc(ch.text)}</div>${speaker(ch)}
        <div class="choices n${ch.options.length}">${ch.options.map(o => btn('choose', esc(o.label), 'choice', `data-k="${o.key}"`)).join('')}</div><div class="note-out" aria-live="polite"></div></div>`, 'event-layer');
      layer.querySelectorAll('[data-action="choose"]').forEach(b => b.addEventListener('click', async () => {
        const picked = pick(b.dataset.k);
        layer.querySelectorAll('.choice').forEach(x => { x.disabled = true; x.classList.toggle('picked', x === b); });
        const chips = fxChips(picked.fx);
        layer.querySelector('.note-out').innerHTML = `${picked.say ? `<p class="say">${esc(picked.say)}</p>` : ''}${chips}${picked.say || chips.includes('fx ') ? btn('ok', '알겠어요', 'primary') : ''}`;
        saveGame();
        const ok = layer.querySelector('[data-action="ok"]');
        if (!ok) { await wait(900); closeLayer(); resolve(); return; }
        ok.addEventListener('click', () => { closeLayer(); resolve(); }, { once: true });
        ok.focus();
      }, { once: true }));
    });
  }
  /* 정보 사건: 사슬이 이어진 결과 (설명 없이 일어난 일만) */
  function infoCard(ev) {
    const c = ev.node, fx = ev.fx || {}, bad = (fx.money || 0) < 0 || (fx.rep || 0) < 0;
    return new Promise(resolve => {
      S.play(bad ? 'down' : 'event');
      openLayer(`<div class="event${bad ? ' problem' : ''}"><div class="bubble">${esc(c.text)}</div>${speaker(c)}
        <div class="note-out">${fxChips(fx)}${c.note ? `<div class="learn">${icon('bulb')}<p>${esc(c.note)}</p></div>` : ''}</div>${btn('ok', '알겠어요', 'primary big')}</div>`, 'event-layer');
      layer.querySelector('[data-action="ok"]').addEventListener('click', () => { closeLayer(); resolve(); }, { once: true });
    });
  }
  /* 첫날: 이번 판의 왕떡볶이 소개 */
  function rivalCard() {
    const rv = E.rivalOf(G);
    return new Promise(resolve => {
      S.play('event');
      openLayer(`<div class="event rival-intro"><div class="bubble">${esc(rv.line)}</div><div class="ev-card"><div class="ev-portrait">${Paint.person('tycoon', P.portrait('tycoon'))}</div><b class="ev-name">${PEOPLE.tycoon}</b></div>
        <h2 class="rv-name">${icon('crown')}${esc(rv.name)}</h2><div class="fx-row"><span class="fx rv">${icon('coin')}<b>${won(rv.price)}</b></span><span class="fx rv">맛 ${A.stars(rv.taste, '맛')}<b>${rv.taste.toFixed(1)}</b></span></div>
        ${btn('ok', '이겨 볼게요!', 'primary big')}</div>`, 'event-layer');
      layer.querySelector('[data-action="ok"]').addEventListener('click', () => { closeLayer(); resolve(); }, { once: true });
    });
  }
  function fxChips(fx) {
    fx = fx || {};
    const out = [];
    if (fx.money) out.push(`<span class="fx ${fx.money > 0 ? 'up' : 'down'}">${icon('coin')}<b>${fx.money > 0 ? '+' : ''}${won(fx.money)}</b></span>`);
    if (fx.rep) out.push(`<span class="fx ${fx.rep > 0 ? 'up' : 'down'}">${icon('star')}<b>${fx.rep > 0 ? '+' : ''}${fx.rep}</b></span>`);
    return `<div class="fx-row">${out.join('')}</div>`;
  }

  /* ───── 엔딩 ───── */
  function ending() {
    clearGame();
    const end = T.endings.find(e => e.id === G.ended);
    const isNew = !progress.endings.includes(end.id);
    if (isNew) progress.endings.push(end.id);
    if (!progress.rivals.includes(G.rivalId)) progress.rivals.push(G.rivalId);
    const got = E.badgesFor(G, progress), fresh = got.filter(id => !progress.badges.includes(id));
    progress.badges.push(...fresh);
    const newFound = G.found.filter(k => !progress.found.includes(k));
    progress.found.push(...newFound);
    progress.best = Math.max(progress.best, G.money); save();
    S.play(end.legend ? 'fanfare' : 'paper');
    setScreen('ending', `<section class="ending-page"><article class="final-paper${end.legend ? ' legend' : ''}"><div class="masthead">다온일보 호외</div><div class="dateline"><span>다온초 앞 떡볶이 가게</span><span>엔딩 ${progress.endings.length}/${T.endings.length}</span></div>
      ${isNew ? '<span class="new-stamp">NEW!</span>' : ''}<h2>${end.name}</h2><p class="story">${end.story}</p>
      <div class="final-body"><div class="final-scene">${Paint.scene(`tteok/end_${end.id}`, A.scene({ chairs: !!G.owned.chairs, staff: !!G.owned.staff, clean: !!G.owned.clean, cheese: !!G.owned.cheese, rain: end.id === 'closed' }), end.name, 'eager')}</div>
        <div class="final-side"><div class="stat">${icon('coin')}<span>남은 돈</span><b>${won(G.money)}</b></div><div class="stat">${A.stars(G.rep)}</div><div class="stat">${icon('scale')}<span>공정 점수</span><b>${G.fair}</b></div>
          <div class="chart small">${G.history.map(h => `<div class="bar-col"><span class="b ${h.profit < 0 ? 'neg' : ''}" style="height:${Math.min(100, Math.abs(h.profit) / 80000 * 100)}%"></span><em>${h.day + 1}</em></div>`).join('')}</div></div></div>
      <div class="note">${icon('bulb')}<p>${end.note}</p></div>
      ${trailMap(newFound)}
      ${got.length ? `<div class="got-badges">${got.map(id => medal(id, fresh.includes(id))).join('')}</div>` : ''}
      <div class="end-btns">${btn('new', `다시 하기 ${icon('play')}`, 'primary')}${btn('endings', '엔딩 도감', 'secondary')}${btn('title', '처음으로', 'secondary')}</div></article>
      ${end.legend ? '<div class="confetti" aria-hidden="true">' + Array.from({ length: 40 }, (_, i) => `<i style="--x:${(i * 37) % 100};--d:${(i % 7) * .35}s;--c:${['#F5C542', '#E0533C', '#2E9E6B', '#3B6FE0', '#F2994A'][i % 5]}"></i>`).join('') + '</div>' : ''}</section>`);
  }
  /* 사건 연결도: 이번 판에 이어진 사건들을 화살표로만 보여 준다(설명 없음) */
  function trailMap(newFound) {
    const groups = {};
    for (const t of G.trail) (groups[t.root] = groups[t.root] || []).push(t);
    const rows = Object.entries(groups).filter(([, list]) => list.length > 1);
    if (!rows.length) return '';
    const step = t => `<div class="t-step${t.start ? ' start' : ''}"><i>${t.day + 1}일째</i><b>${esc(t.title)}</b>${t.pick ? `<em>${esc(t.pick)}</em>` : ''}${t.fx && t.fx.money ? `<span class="${t.fx.money < 0 ? 'minus' : 'plus'}">${t.fx.money > 0 ? '+' : ''}${won(t.fx.money)}</span>` : ''}</div>`;
    return `<section class="trail"><h3>사건은 이렇게 이어졌어요</h3>${rows.map(([root, list]) => `<div class="t-row">${list.map(step).join('<span class="t-arrow" aria-hidden="true">→</span>')}${newFound.some(k => k.startsWith(root + ':')) ? '<span class="t-new">새 갈래 발견!</span>' : ''}</div>`).join('')}</section>`;
  }
  /* 도감: 사건 사슬 — 갈래를 모두 겪으면 그때 배움이 열린다 */
  function chainCard(id) {
    const ch = T.chains[id], opts = T.nodes[ch.branch].options, found = opts.filter(o => progress.found.includes(`${id}:${o.key}`)), done = found.length === opts.length;
    return `<article class="chain-card${done ? ' done' : ''}${found.length ? '' : ' locked'}"><div class="ch-head"><div class="ch-ico">${found.length ? icon(ch.icon) : '<span class="q">?</span>'}</div><h3>${found.length ? esc(ch.name) : '???'}</h3><b class="count">${found.length}/${opts.length}</b></div>
      <ul class="ch-branches">${opts.map(o => progress.found.includes(`${id}:${o.key}`) ? `<li class="got">${icon('check')}${esc(o.label)}</li>` : '<li>???</li>').join('')}</ul>
      ${done ? `<div class="learn">${icon('bulb')}<p><b>어느 길로 가도 손해였어요.</b> ${esc(ch.lesson)}</p></div>` : ''}</article>`;
  }
  const medal = (id, isNew = false, locked = false) => { const b = T.badges.find(x => x.id === id);
    return `<div class="medal${locked ? ' locked' : ''}${isNew ? ' new' : ''}"><div class="m-ico">${locked ? '<span class="q">?</span>' : icon(BADGE_ICON[id])}</div><b>${b.name}</b><span class="goal">${b.goal}</span>${isNew ? '<i class="m-new">NEW</i>' : ''}</div>`; };
  function endings() {
    setScreen('endings', `<header class="tbar">${iconBtn('home2', '처음으로', 'title')}<h1>엔딩 도감</h1><b class="count">${progress.endings.length}/${T.endings.length}</b></header>
      <section class="ending-grid">${T.endings.map(e => { const got = progress.endings.includes(e.id);
        return `<article class="end-card${got ? '' : ' locked'}${e.legend ? ' legend' : ''}"><div class="mini-mast">다온일보 호외</div>${got ? `<div class="end-photo">${Paint.scene(`tteok/end_${e.id}`, icon(e.id === 'closed' ? 'trash' : e.id === 'greedy' ? 'crown' : e.id === 'kind' ? 'bulb' : 'bowl'), e.name)}</div><h3>${e.name}</h3><p>${e.story}</p>` : `<div class="end-ico q">?</div><p class="hint">${HINTS[e.id]}</p>`}</article>`; }).join('')}</section>
      <h2 class="sec-title">${icon('bulb')}사건 사슬 <b class="count">${Object.keys(T.chains).reduce((a, id) => a + T.nodes[T.chains[id].branch].options.filter(o => progress.found.includes(`${id}:${o.key}`)).length, 0)}/${Object.keys(T.chains).reduce((a, id) => a + E.branchCount(id), 0)}</b></h2>
      <section class="chain-wall">${Object.keys(T.chains).map(chainCard).join('')}</section>
      <h2 class="sec-title">${icon('star')}도전 배지 <b class="count">${progress.badges.length}/${T.badges.length}</b></h2>
      <section class="badge-wall">${T.badges.map(b => medal(b.id, false, !progress.badges.includes(b.id))).join('')}</section>
      ${progress.best ? `<p class="best">${icon('coin')} 최고 기록 <b>${won(progress.best)}</b></p>` : ''}`);
  }

  /* ───── 안내·메뉴·설정 ───── */
  function tutorial() {
    return new Promise(resolve => {
      const steps = [[Paint.scene('tteok/st_coin', icon('coin')), '가격을 정하고'], [Paint.scene('tteok/st_bowl', icon('bowl')), '재료를 준비하고'], [A.kid(2), '장사 시작!']];
      const show = i => {
        openLayer(`<div class="tut"><div class="tut-art">${steps[i][0]}</div><h2>${steps[i][1]}</h2><div class="tdots">${steps.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>${btn('tnext', i < 2 ? '다음' : '해 볼게요!', 'primary big')}${btn('tskip', '건너뛰기', 'text-btn')}</div>`, 'tut-layer');
        layer.querySelector('[data-action="tnext"]').onclick = () => { if (i < 2) show(i + 1); else done(); };
        layer.querySelector('[data-action="tskip"]').onclick = done;
      };
      const done = () => { progress.tutorialSeen = true; save(); closeLayer(); resolve(); };
      show(0);
    });
  }
  function menu() { openLayer(`<div class="menu"><h2>잠깐!</h2>${btn('close', '계속하기', 'primary big')}${btn('settings', '설정', 'secondary')}${btn('to-title', '처음으로', 'secondary')}</div>`); }
  function settings(confirm = false) {
    openLayer(`<div class="menu"><h2>설정</h2>${btn('sound', `${P.icon(progress.sound ? 'sound' : 'mute')} 소리 ${progress.sound ? '켜짐' : '꺼짐'}`, 'secondary', `aria-pressed="${progress.sound}"`)}
      ${confirm ? `<div class="confirm"><h3>정말 지울까요?</h3>${btn('reset', '모두 지우기', 'danger')}${btn('settings', '취소', 'secondary')}</div>` : btn('reset-ask', '기록 모두 지우기', 'text-btn')}${btn('close', '닫기', 'primary')}</div>`);
  }
  function debugBar() {
    if (!debug) return;
    let bar = document.querySelector('.debug');
    if (!bar) { bar = document.createElement('div'); bar.className = 'debug'; document.body.appendChild(bar); }
    bar.innerHTML = `DEBUG ${btn('dbg-money', '+10만')}${btn('dbg-end', '끝까지')}`;
  }
  async function autoEnd() {
    const fair = c => c.options.find(o => !o.unfair).key;
    const opened = !!G && screen !== 'title';
    if (!G) G = E.newGame();
    closeLayer();
    // 이미 시작한 날은 아침 사건·장사를 다시 하지 않음
    const today = G.day, sold = G.history.some(h => h.day === today);
    while (!G.ended) {
      const first = G.day === today;
      if (!(first && opened)) for (const ev of E.morningEvents(G)) if (ev.node.options) E.chooseNode(G, ev, ev.node.options[0].key);
      const mc = E.morningChoice(G); if (mc) E.choose(G, fair(mc));
      if (!(first && sold)) E.simulate(G, { price: 3000, portions: 40, upgrade: G.offers.find(id => id === 'cheese' && E.canBuy(G, id)) || null });
      const ec = E.eveningChoice(G); if (ec) E.choose(G, fair(ec));
      E.endDay(G);
    }
    ending();
  }

  /* ───── 조작 연결 ───── */
  function act(a, el) {
    switch (a) {
      case 'new': clearGame(); G = E.newGame(); S.play('tick'); startDay(); break;
      case 'continue': {
        const v = savedGame();
        if (v) {
          G = v.G; plan = v.plan; resume = v.resume || { phase: 'morning', events: [] };
          if (resume.phase === 'evening') evening(resume.res, resume.before);
          else { morning(); finishMorning(); }
        } else title();
        break;
      }
      case 'endings': endings(); break;
      case 'title': closeLayer(); title(); break;
      case 'to-title': closeLayer(); title(); break;
      case 'menu': menu(); break;
      case 'settings': settings(); break;
      case 'reset-ask': settings(true); break;
      case 'reset': progress = fresh(); save(); clearGame(); S.setEnabled(false); closeLayer(); title(); break;
      case 'close': closeLayer(); break;
      case 'sound': progress.sound = !progress.sound; save(); S.setEnabled(progress.sound); S.play('tick'); if (!layer.hidden) settings(); else el.outerHTML = soundBtn(); break;
      case 'price-up': plan.price = T.prices[Math.min(T.prices.length - 1, T.prices.indexOf(plan.price) + 1)]; S.play('tick'); morning(); break;
      case 'price-down': plan.price = T.prices[Math.max(0, T.prices.indexOf(plan.price) - 1)]; S.play('tick'); morning(); break;
      case 'por-up': plan.portions = T.portions[Math.min(T.portions.length - 1, T.portions.indexOf(plan.portions) + 1)]; S.play('tick'); morning(); break;
      case 'por-down': plan.portions = T.portions[Math.max(0, T.portions.indexOf(plan.portions) - 1)]; S.play('tick'); morning(); break;
      case 'open': business(); break;
      case 'skip': skip = true; app.querySelectorAll('.bubble-s').forEach(el => el.remove()); break;
      case 'next': if (busy || screen !== 'evening' || !layer.hidden || E.eveningChoice(G)) break; E.endDay(G); if (G.ended) ending(); else startDay(); break;
      case 'dbg-money': if (G) { G.money += 100000; if (screen === 'morning') morning(); } break;
      case 'dbg-end': autoEnd(); break;
    }
  }
  document.addEventListener('click', e => {
    const up = e.target.closest('[data-up]');
    if (up && !up.disabled && screen === 'morning') { plan.upgrade = plan.upgrade === up.dataset.up ? null : up.dataset.up; S.play('tick'); morning(); return; }
    const a = e.target.closest('[data-action]');
    if (a && !a.disabled && !['choose', 'ok', 'tnext', 'tskip'].includes(a.dataset.action)) act(a.dataset.action, a);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !layer.hidden) {
      const buttons = [...layer.querySelectorAll('button:not(:disabled)')], first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    if (e.key === 'Escape' && !layer.hidden && layer.querySelector('.menu')) closeLayer();
    if (screen !== 'morning' || !layer.hidden || G.lockedPrice) return;
    if (e.key === 'ArrowUp') act('price-up'); if (e.key === 'ArrowDown') act('price-down');
  });

  title();
})();
