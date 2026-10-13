/* 다온시 70년 — 화면과 조작 */
(() => {
  'use strict';
  const D = window.DAON_CITY, E = window.DaonEngine, A = window.CityArt, P = window.SamgwonArt, S = window.CitySfx;
  const B = D.buildings, KEY = 'daon-city-v2', GAME_KEY = 'daon-city-v2-game';
  const app = document.getElementById('app'), layer = document.getElementById('layer');
  const params = new URLSearchParams(location.search), debug = params.has('debug');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 150) : ms));
  const esc = v => String(v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const GK = ['econ', 'life', 'env', 'fair'], GICON = { econ: 'chart', life: 'home', env: 'tree', fair: 'scale' };
  const PEOPLE = { tycoon: '왕부자 회장', reporter: '나팩트 기자', kid: '도윤', teacher: '다정 선생님', activist: '초록 활동가', shopkeeper: '떡볶이 사장님', grandma: '봉순 할머니' };
  const REPR = { light: 'textile', heavy: 'steel', carElec: 'car', semi: 'semi', it: 'it', content: 'content', battery: 'battery' };
  const HINTS = Object.fromEntries(D.endings.map(e => [e.id, e.hint]));

  /* 글꼴은 온라인일 때만 불러옴(오프라인이면 시스템 글꼴) */
  if (location.protocol !== 'file:' && navigator.onLine) {
    for (const href of ['https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Nanum+Myeongjo:wght@800&display=swap', 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css']) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; document.head.appendChild(link);
    }
  }

  /* ───── 저장 ───── */
  const fresh = () => ({ endings: [], badges: [], tutorialSeen: false, sound: false });
  function loadProgress() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null'), f = fresh();
      if (!s || typeof s !== 'object') return f;
      f.endings = Array.isArray(s.endings) ? s.endings.filter(id => D.endings.some(e => e.id === id)) : [];
      f.badges = Array.isArray(s.badges) ? s.badges.filter(id => D.badges.some(b => b.id === id)) : [];
      f.tutorialSeen = s.tutorialSeen === true; f.sound = s.sound === true;
      return f;
    } catch (_) { return fresh(); }
  }
  let progress = loadProgress();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_) {} };
  const saveGame = () => { if (practice) return; try { localStorage.setItem(GAME_KEY, JSON.stringify(G)); } catch (_) {} };
  const clearGame = () => { try { localStorage.removeItem(GAME_KEY); } catch (_) {} };
  function savedGame() {
    try {
      const g = JSON.parse(localStorage.getItem(GAME_KEY) || 'null');
      if (E.valid(g) && g.phase !== 'end') return g;
    } catch (_) {}
    return null;
  }
  S.setEnabled(progress.sound);

  let practice = null;
  let lens = 'industry', trayMode = 'industry', relocating = null, viewPlan = null;
  let G = null, sel = null, busy = false, pop = null, screen = '', cursor = 0, drag = null, toastTimer = 0, layerFocus = null;

  /* ───── 작은 부품 ───── */
  const icon = (name, cls = '') => name === 'gear' ? P.icon(name) : A.icon(name, cls);
  const btn = (action, html, cls = '', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${html}</button>`;
  const iconBtn = (name, label, action) => `<button type="button" class="icon-btn" data-action="${action}" aria-label="${label}">${icon(name)}</button>`;
  const soundBtn = () => `<button type="button" class="icon-btn" data-action="sound" aria-label="소리 ${progress.sound ? '끄기' : '켜기'}" aria-pressed="${progress.sound}">${P.icon(progress.sound ? 'sound' : 'mute')}</button>`;
  const era = d => D.eras[d];
  function focusSelector(el) {
    const key = ['action', 'card', 'tile'].find(k => el?.dataset?.[k] !== undefined);
    const qualifier = ['lens', 'tray', 'help'].find(k => el?.dataset?.[k]);
    return key ? `[data-${key}="${CSS.escape(el.dataset[key])}"]${qualifier ? `[data-${qualifier}="${CSS.escape(el.dataset[qualifier])}"]` : ''}` : null;
  }
  function setScreen(name, html) {
    const focus = app.contains(document.activeElement) ? focusSelector(document.activeElement) : null;
    screen = name; app.className = `screen-${name}`; app.innerHTML = html; app.scrollTop = 0; window.scrollTo(0, 0);
    debugBar();
    if (focus) (app.querySelector(focus) || app.querySelector('button:not([disabled]),a'))?.focus({ preventScroll: true });
  }
  function toast(html) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
  }
  function openLayer(html, cls = '') {
    if (layer.hidden) layerFocus = focusSelector(document.activeElement);
    layer.innerHTML = `<div class="backdrop ${cls}"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
    layer.hidden = false; app.inert = true;
    const bar = document.querySelector('.debug'); if (bar) bar.inert = true;
    setTimeout(() => layer.querySelector('.sheet button:not([disabled])')?.focus({ preventScroll: true }), 30);
  }
  function closeLayer() {
    layer.hidden = true; layer.innerHTML = ''; app.inert = false;
    const bar = document.querySelector('.debug'); if (bar) bar.inert = false;
    if (layerFocus) app.querySelector(layerFocus)?.focus({ preventScroll: true });
    layerFocus = null;
  }

  /* 같은 숫자라도 돈·사람·평가 점수를 구분해서 읽게 한다. */
  const num = v => Number.isInteger(v) ? String(v) : v.toFixed(1);
  const moneyCost = n => `<span class="action-cost">${icon('coin')}도시 돈 ${n} 사용</span>`;
  const landCount = land => G.tiles.filter((t, i) => E.buildable(t.x, t.y) && E.isOpen({ land }, i)).length;
  function effects(id) {
    const b = B[id], text = b.exp ? `일자리 ${b.jobs}개` : b.homes ? `${b.homes}명 거주` : b.education ? `${b.education}명 교육` : b.supply ? `전력 ${b.supply} 공급` : b.cleaning ? '오염 줄이기' : b.logistics ? '이웃 산업 지원' : '주민 생활 지원';
    return `<span class="fx"><b>${text}</b></span>`;
  }
  function needs(id) {
    const b = B[id]; return b.coastal ? '<span class="need" title="바다 바로 위 땅에 지어요">해안</span>' : '';
  }
  const reasonHtml = (reason, id) => ({
    money: '도시 돈이 부족해요', era: `${B[id] ? era(B[id].era).label : '다음 시대'}부터`,
    land: '먼저 땅을 넓혀요', phase: '건설 시간에 바꿀 수 있어요', coast: '바다 바로 위에 지어요', tile: '빈 땅을 골라요'
  }[reason] || '지금은 할 수 없어요');
  function buildingInfo(id, i = null) {
    const b = B[id], row = i === null ? null : E.production(G).rows.find(r => r.i === i), l = i === null ? 1 : E.level(G.tiles[i]);
    const main = [], detail = [];
    if (i === null) main.push(`짓는 비용: 도시 돈 ${b.cost}`);
    main.push(b.upkeep ? `10년 동안 운영하는 비용: 도시 돈 ${b.upkeep * l}` : '운영비가 들지 않아요.');
    if (b.era > G.d) main.push(`${era(b.era).label}부터 지을 수 있어요.`);
    if (b.exp) {
      main.push(`일할 사람 ${b.jobs * l}명과 전력 ${b.energy * l}이 필요해요.`);
      main.push(b.skilled ? `그중 ${b.skilled * l}명은 기술을 배운 사람이어야 해요.` : '배운 기술이 없어도 일할 수 있어요.');
      if (row) main.push(`<b>${Math.round(row.rate * 100)}% 가동 중</b> · ${row.rate >= .99 ? '사람과 전력이 충분해요.' : '사람·기술·전력이 모자라 덜 만들어요.'}`);
      detail.push(`수출 실적: ${row ? num(row.exports) : b.exp[G.d] * l}점${row ? ' (운영 조건과 주문을 반영한 값)' : ' (도움 없이 모두 가동할 때)'}`);
      detail.push(`같은 산업끼리 나눠 갖는 수출 기회: ${D.rules.demand[b.cat][G.d]}점`);
      if (row?.market < .99) detail.push('같은 산업의 주문을 나눠 받아요. 공장을 더 지어도 그만큼 더 팔리지는 않아요.');
      if (b.links) detail.push(`${b.links.map(x => B[x].name).join('·')}가 2칸 안에 있으면 협업해요.`);
      detail.push(`최대 오염 배출: ${(b.pol || 0) * l} · 환경 보기에서 피해 주택을 살펴요.`);
    }
    if (b.homes) main.push(`<b>${b.homes * l}명까지 살 수 있어요.</b> 일자리가 생기면 주민이 들어와요.`);
    if (b.education) { main.push(`<b>주변 주민 ${b.education * l}명이 기술을 배울 수 있어요.</b>`); main.push('학교를 지은 뒤 10년을 보내야 배운 사람이 늘어요.'); detail.push(`가로·세로로 ${b.range}칸 안의 주택에 교육이 닿아요. 대각선은 가로와 세로 칸 수를 더해요.`); }
    if (b.supply) main.push(`<b>산업이 쓸 전력 ${b.supply * l}을 공급해요.</b>`);
    if (b.logistics) { main.push('바로 옆 산업이 상품을 더 잘 수출하도록 도와요.'); detail.push(`수출 지원은 최대 ${b.logistics * l}점까지 가까운 산업끼리 나눠 받아요.`); }
    if (b.cleaning) { main.push('가까운 공장의 오염을 줄여요.'); detail.push(`${b.range}칸 안의 오염을 최대 ${b.cleaning * l}까지 나누어 처리해요.`); }
    if (b.service) { main.push(`가까운 주민 ${b.capacity * l}명의 생활을 도와요.`); detail.push(`가로·세로로 ${b.range}칸 안의 주택에 닿아요.${id === 'park' ? ' 공원은 공장 폐수를 없애지는 않아요.' : ''}`); }
    if (b.coastal) main.push('바다 바로 위 해안 땅에 지어요.');
    return `<div class="info-lines">${main.map(v => `<p>${v}</p>`).join('')}${detail.length ? `<details><summary>수출·범위 등 자세히 보기</summary>${detail.map(v => `<p>${v}</p>`).join('')}</details>` : ''}</div>`;
  }
  function capacityChange(id, from = 1, to = 2) {
    const b = B[id];
    if (b.homes) return `살 수 있는 사람 ${b.homes * from}명 → ${b.homes * to}명`;
    if (b.education) return `교육받을 수 있는 사람 ${b.education * from}명 → ${b.education * to}명`;
    if (b.supply) return `공급하는 전력 ${b.supply * from} → ${b.supply * to}`;
    if (b.exp) return `일자리 ${b.jobs * from}개 → ${b.jobs * to}개 · 운영비도 늘어요`;
    if (b.cleaning) return `줄일 수 있는 오염 ${b.cleaning * from} → ${b.cleaning * to}`;
    if (b.logistics) return `수출 지원 한도 ${b.logistics * from} → ${b.logistics * to}`;
    return `생활 지원 ${b.capacity * from}명 → ${b.capacity * to}명`;
  }
  function comparison(aLabel, a, bLabel, b, unit = '') {
    return `<div class="help-compare"><div><span>${aLabel}</span><strong>${num(a)}${unit}</strong></div><div><span>${bLabel}</span><strong>${num(b)}${unit}</strong></div></div>`;
  }
  function help(key) {
    const p = E.production(G), g = E.gauges(G);
    let title, meaning, visual, status, advice, details = '', mapLink = '';
    if (key === 'people') {
      title = '일할 사람과 일자리'; meaning = '사람은 산업에서 일할 수 있는 주민, 일자리는 산업이 필요로 하는 사람 수예요.';
      visual = comparison('일할 수 있는 사람', p.workers, '산업에 필요한 사람', p.jobs, '명');
      status = p.jobs > p.workers ? `${p.jobs - p.workers}명이 부족해요. 그래서 공장이 덜 돌아가요.` : p.workers > p.jobs ? `사람은 충분해요. 일자리가 ${p.jobs}개여서 ${p.workers - p.jobs}명은 아직 일할 곳이 없어요.` : '사람 수와 일자리가 맞아요.';
      advice = p.jobs > p.workers ? '집을 짓거나 키워 살 곳을 늘려 주세요. 일자리가 있으면 주민이 들어와요.' : '집만 많이 지어도 주민이 계속 늘지는 않아요. 사람·전력·교육을 살피며 산업을 키워 주세요.';
      details = `지금 집에는 최대 ${p.housing}명이 살 수 있어요.
이 숫자는 현재 건설 계획대로 산업을 운영할 때의 예상 인원을 포함해요.`;
    } else if (key === 'tech') {
      title = '기술을 배운 사람'; meaning = '기술 인력은 학교·대학교에서 기술을 배운 주민이에요. 일할 사람 안에 포함돼요.';
      visual = comparison('지금 일할 수 있는 기술 인력', p.skilled, '산업에 필요한 기술 인력', p.skilledNeed, '명');
      status = p.skilledNeed === 0 ? '지금 지은 산업은 기술 인력이 없어도 운영할 수 있어요.' : p.skilledNeed > p.skilled ? `${p.skilledNeed - p.skilled}명이 부족해서 새 산업이 덜 돌아가요.` : '이 산업에 필요한 기술 인력이 충분해요.';
      advice = p.techGain ? `10년을 보내면 ${p.techGain}명이 새로 기술을 배워요. 학교를 지었다고 바로 늘지는 않아요.` : p.education === 0 ? '교육이 주택에 닿지 않아요. 학교를 주택 가까이 지어 주세요.' : '지금 학교가 가르칠 수 있는 주민은 이미 배웠어요. 다음 산업에 기술 인력이 더 필요해지면 학교를 키우거나 더 지어 주세요.';
      details = `일할 사람 ${p.workers}명 중 기술 인력은 ${p.skilled}명이에요.
교육은 가로·세로 2칸 안의 실제 주민에게 닿아요. 한 시대에 최대 2명을 새로 가르쳐요.`;
      mapLink = btn('help-map', '지도에서 교육 범위 보기', 'secondary', 'data-lens="people"');
    } else if (key === 'power') {
      title = '전기가 충분한가요?'; meaning = '전력은 산업을 움직이는 전기예요. 공급이 필요한 양보다 적으면 공장이 덜 돌아가요.';
      visual = comparison('도시가 공급하는 전력', p.supply, '산업에 필요한 전력', p.energy);
      status = p.supply < p.energy ? `전력이 ${p.energy - p.supply} 부족해요.` : `전력이 충분해요. ${p.supply - p.energy}만큼 더 쓸 수 있어요.`;
      advice = p.supply < p.energy ? '발전소를 짓거나 기존 발전소를 키워 주세요.' : '산업을 더 지을 때 필요한 전력이 늘어나요. 짓기 전에 필요한 양을 확인해요.';
      details = '처음 마을이 공급하는 전력은 2예요.\n화력 발전소는 8, 친환경 발전소는 10을 공급해요. 게임에서 비교하는 전력량이에요.';
    } else if (key === 'money') {
      title = '건물을 짓는 도시의 돈'; meaning = '도시 돈은 건물을 짓고, 키우고, 옮기는 데 써요. 비용만큼 가지고 있는 돈이 줄어요.';
      visual = comparison('지금 가진 돈', G.money, '10년 뒤 예상 돈', Math.max(0, G.money + p.income));
      status = `10년 운영 후 돈이 ${Math.abs(p.income)} ${p.income >= 0 ? '늘어날' : '줄어들'} 예정이에요.`;
      advice = '새 건물의 짓는 비용과 운영비를 함께 살펴요. 되돌리기를 누르면 이번 계획에 쓴 돈을 돌려받아요.';
      details = `기본 지원 +${p.base}
수출로 번 돈 +${p.exportIncome}
시장에서 번 돈 +${p.marketIncome}
10년 운영비 −${p.upkeep}
운영비를 뺀 결과 ${p.income >= 0 ? '+' : ''}${p.income}${G.money + p.income < 0 ? '\n돈이 모자라는 만큼 긴급 지원을 받아 0으로 시작해요.' : ''}`;
    } else {
      const descriptions = {
        econ: ['경제: 산업이 얼마나 자랐나요?', '산업이 해외에 상품을 많이 팔수록 경제 평가가 높아져요.', `이번 10년의 수출 실적은 ${p.exports}점이에요.`, '사람·전력·교육을 준비해 산업이 잘 돌아가게 해요. 같은 산업만 늘리면 주문을 나눠 받아요.'],
        life: ['생활: 주민이 살기 좋은가요?', '일자리와 가까운 시장·공원·복지관이 생활을 돕고, 오염 피해는 생활을 나쁘게 해요.', `주민 ${p.workers}명 중 ${p.service}명에게 생활 지원이 닿아요.`, '생활 시설을 주택 가까이 놓고, 피해를 받는 주택을 살펴요.'],
        env: ['환경: 오염이 얼마나 적나요?', '환경 점수가 높을수록 깨끗해요. 공장·발전소의 배출이 남으면 점수가 내려가요.', `오염 피해를 받는 주택은 ${p.exposed.length}곳이에요.`, '환경 보기의 😷 주택을 확인해요. 공장을 옮겨 피해를 피하거나 정화 시설로 배출을 줄일 수 있어요.'],
        fair: ['공정: 성장의 혜택이 닿았나요?', '일자리와 생활 지원의 혜택이 주민에게 잘 닿는지 보여 줘요.', `실제로 일할 수 있는 주민은 약 ${num(p.employed)}명, 생활 지원을 받는 주민은 ${p.service}명이에요.`, '일하지 못하는 주민과 생활 지원을 받지 못하는 주택을 줄여 보세요. 시대의 선택도 영향을 줘요.']
      }[key];
      if (!descriptions) return;
      [title, meaning, status, advice] = descriptions;
      visual = `<div class="help-score"><strong>${g[key]}<small> / 100점</small></strong><meter min="0" max="100" value="${g[key]}" aria-label="${D.gauges[key].label} 평가"></meter><span>점수가 높을수록 좋아요</span></div>`;
      if (key === 'econ') details = `이번 시대의 성장 기준은 수출 ${D.rules.exportTarget[G.d]}점이에요. 기준만큼 수출하면 경제 70점, 더 성장하면 최대 100점이에요.
수출 실적 × 0.8을 반올림한 만큼 도시 돈을 벌어요.`;
      if (key === 'env') { details = `남은 오염 배출은 ${num(p.pollution)}이에요.
공원은 주민 생활을 돕고, 공장 폐수를 없애는 것은 정화 시설이에요.`; mapLink = btn('help-map', '지도에서 피해 주택 보기', 'secondary', 'data-lens="env"'); }
    }
    openLayer(`<div class="help help-clear"><h2>${title}</h2><p class="help-meaning">${meaning}</p>${visual}<p class="help-status">${status}</p><div class="help-advice"><b>이렇게 해 보세요</b><p>${advice}</p></div>${details ? `<details><summary>자세한 숫자와 규칙 보기</summary>${details.split('\n').map(v => `<p>${v}</p>`).join('')}</details>` : ''}<div class="help-buttons">${mapLink}${btn('close', '도시로 돌아가기', 'primary')}</div></div>`);
  }
  function tileHtml(i, readonly = false) {
    const t = G.tiles[i], id = t.b, coastal = E.coastal(t.x, t.y), row = viewPlan?.rows.find(r => r.i === i), open = !E.buildable(t.x, t.y) || E.isOpen(G, i);
    let cls = `tile t-${t.t}${id ? ' built' : ''}${G.placed.includes(i) ? ' now' : ''}${open ? '' : ' unopened'}`, art = '', badge = '';
    if (id) {
      art = `<div class="b${row?.pollution > 0 ? ' smoky' : ''}" style="--smoke-opacity:${Math.min(.8, .2 + (row?.pollution || 0) * .15)}">${A.building(id, { d: G.d, level: E.level(t), pol: row?.pollution || 0 })}</div>`;
      if (E.level(t) === 2) badge += '<span class="tile-level">Ⅱ</span>';
      if (!readonly && row?.b.exp) badge += `<span class="tile-status ${row.rate < .99 ? 'short' : ''}">${Math.round(row.rate * 100)}%</span>`;
      if (!readonly && viewPlan?.exposed.includes(i)) badge += '<span class="tile-alert" aria-label="오염 피해">😷</span>';
    }
    if (practice && !practice.pending && i === (relocating !== null ? PRACTICE[practice.step].to : PRACTICE[practice.step].tile)) cls += ' lesson-target';
    if (!readonly && lens === 'people' && id === 'house') { const taught = new Map(viewPlan?.educated).get(i) || 0; if (taught) cls += ' lens-good'; badge += `<span class="tile-status">👷${new Map(viewPlan?.residents).get(i) || 0} 🎓${taught}</span>`; }
    if (!readonly && lens === 'env' && row?.pollution > 0) { cls += ' lens-bad'; badge += `<span class="tile-status short">배출 ${row.pollution.toFixed(0)}</span>`; }
    if (sel && E.canPlace(G, sel, i).ok) cls += ' can';
    if (sel && id && E.canConvert(G, sel, i).ok) { cls += ' can-convert'; badge += '<span class="tile-status">전환 가능</span>'; }
    if (relocating !== null && !id && open && E.buildable(t.x, t.y) && (!B[G.tiles[relocating].b].coastal || coastal)) cls += ' can';
    const source = pop !== null ? G.tiles[pop].b : sel;
    const anchor = pop !== null ? pop : null;
    if (!readonly && anchor !== null && source && B[source].range && E.distance(anchor, i) <= B[source].range) cls += ' in-range';
    const name = id ? B[id].name : t.t === 'S' ? '바다' : t.t === 'M' ? '산' : open ? (coastal ? '해안 빈 땅' : '빈 땅') : '확장할 땅';
    const tag = readonly ? 'div' : 'button';
    return `<${tag} ${readonly ? '' : 'type="button"'} class="${cls}" data-tile="${i}" ${readonly ? '' : `aria-label="${name}${row?.b.exp ? `, 가동 ${Math.round(row.rate * 100)}%` : ''}${viewPlan?.exposed.includes(i) ? ', 오염 피해' : ''}" tabindex="${i === cursor ? 0 : -1}"`}>${A.terrain(t.t, coastal, i, G.d)}${art}${badge}${!open && E.buildable(t.x, t.y) ? '<span class="land-lock">🔒</span>' : ''}</${tag}>`;
  }
  function mapHtml(readonly = false) {
    viewPlan = G.phase === 'events' ? G.last : E.production(G);
    return `<div class="map${readonly ? ' mini' : ''}" style="--cols:${E.W};--rows:${E.H}">${G.tiles.map((_, i) => tileHtml(i, readonly)).join('')}</div>`;
  }
  function fitMap() {
    const wrap = app.querySelector('.map-wrap'), map = wrap?.querySelector('.map');
    if (!wrap || !map) return;
    const r = wrap.getBoundingClientRect(), gap = 4, css = getComputedStyle(wrap), padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
    const size = Math.floor(Math.min((r.width - 12 - gap * (E.W - 1)) / E.W, (r.height - padding - 12 - gap * (E.H - 1)) / E.H));
    map.style.setProperty('--tile', `${Math.max(32, size)}px`);
  }
  addEventListener('resize', () => { fitMap(); positionPop(); });

  /* ───── 게이지 ───── */
  function gaugesHtml(g, cls = '') {
    return `<div class="gauges ${cls}">${GK.map(k => `<button type="button" class="gauge${g[k] <= 25 ? ' low' : ''}" data-g="${k}" data-action="help" data-help="${k}" aria-label="${D.gauges[k].label} ${g[k]}, 도움말"><div class="g-icon">${A.gauge(k, GICON[k], g[k])}</div><span class="g-label">${D.gauges[k].label}</span><b class="g-num">${g[k]}<small>/100점</small></b></button>`).join('')}</div>`;
  }

  function oldSaveExists() { try { return !!localStorage.getItem('daon-city-v1-game'); } catch (_) { return false; } }
  /* ───── 타이틀 ───── */
  function title() {
    sel = null; pop = null;
    const saved = savedGame();
    setScreen('title', `<header class="tbar"><span class="title-left"><a class="title-guide" href="../guides/daon.html">게임 설명서</a><span class="title-credit">만든이 현승쌤</span></span><div class="tools">${soundBtn()}${iconBtn('gear', '설정', 'settings')}</div></header>
      <section class="title-main"><div class="skyline" aria-hidden="true">${A.skyline()}</div><h1 class="logo">다온시 <span>70년</span></h1><p class="v2-title-note">산업을 골라, 나만의 발전을 만들어요</p>${oldSaveExists() ? '<p class="legacy-note">새 산업 규칙으로 시작해요. 이전 버전의 저장은 보관되어 있어요.</p>' : ''}
      <div class="title-buttons">${saved ? btn('continue', `이어하기 ${icon('play')}`, 'primary big') + btn('new', '새로 시작', 'secondary') : btn('new', `시작 ${icon('play')}`, 'primary big')}${btn('practice', '연습 도시로 배우기', 'secondary practice-entry')}${btn('endings', `엔딩 도감 <b class="count">${progress.endings.length}/${D.endings.length}</b>`, 'secondary')}</div></section>`);
  }

  /* ───── 시대 신문 ───── */
  function eraPaper() {
    const d = G.d, news = Object.entries(B).filter(([, b]) => b.era === d);
    S.play('paper');
    setScreen('paper', `<section class="paper-stage"><article class="paper"><div class="masthead">다온일보</div><div class="dateline"><span>${era(d).label}</span><span>${d + 1} / ${D.eras.length}</span></div><h2>${era(d).headline}</h2>
      <div class="paper-body"><div class="paper-map">${Paint.scene(`daon/era${d}`, mapHtml(true), `${era(d).label} 다온시 풍경`)}</div><div class="paper-news">${news.length ? `<span class="new-tag">NEW</span><div class="new-list">${news.map(([id, b]) => `<div class="new-item">${A.building(id, { d })}<b>${b.name}</b></div>`).join('')}</div>` : ''}</div></div>
      ${btn('start-build', `건설 시작 ${icon('play')}`, 'primary big')}</article></section>`);
  }

  /* ───── 건설 화면 ───── */
  function build() {
    const d = G.d, g = E.gauges(G), forecast = G.phase === 'events' ? G.last : E.production(G);
    const cards = practice ? (PRACTICE[practice.step].card && !!B[PRACTICE[practice.step].card].exp === (trayMode === 'industry') ? [PRACTICE[practice.step].card] : []) : Object.keys(B).filter(id => B[id].era <= d + 1 && (!!B[id].exp === (trayMode === 'industry'))).sort((a, b) => (B[b].era === d) - (B[a].era === d) || B[a].era - B[b].era);
    const leaders = Object.entries(forecast.categories).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0);
    const nowLand = landCount(G.land), nextLand = landCount(Math.min(2, G.land + 1));
    const expansion = G.land < 2 ? `땅 넓히기${moneyCost(D.rules.expandCost[G.land])}<small>${nowLand}칸 → ${nextLand}칸${d < (G.land === 0 ? 1 : 3) ? ` · ${era(G.land === 0 ? 1 : 3).label}부터` : ''}</small>` : `땅 확장 완료<small>최대 ${nowLand}칸</small>`;
    const metric = (key, title, available, need, unit, supplyLabel = '가능') => btn('help', `<span class="metric-title">${title}</span><span class="metric-numbers"><span>${supplyLabel} <b>${num(available)}${unit}</b></span><span>필요 <b>${num(need)}${unit}</b></span></span><small class="${available < need ? 'short' : ''}">${available < need ? `${num(need - available)}${unit} 부족` : need === 0 ? '아직 필요한 산업 없음' : '충분해요'}</small>`, 'readiness-card', `data-help="${key}"`);
    setScreen('build', `<section class="build era-${d} city-v2${practice ? ' practice-city' : ''}" ${practice ? `data-lesson-kind="${PRACTICE[practice.step].kind}"` : ''}>
      <header class="topbar">${iconBtn('menu', '메뉴', 'menu')}<div class="decade"><strong>${era(d).label}</strong><div class="timeline">${D.eras.map((e, i) => `<i class="${i < d ? 'done' : i === d ? 'now' : ''}"></i>`).join('')}</div></div>
        <div class="res"><button data-action="help" data-help="money" class="res-item money-res" aria-label="도시 돈 ${G.money}, 도움말">${icon('coin')}<span>도시 돈 <b class="money-amount">${G.money}</b></span></button>${btn('expand', expansion, 'expand-btn', G.land >= 2 || d < (G.land === 0 ? 1 : 3) || G.money < D.rules.expandCost[G.land] ? 'disabled' : '')}</div></header>
      <div class="city-readiness">${metric('people', '👷 일할 사람', forecast.workers, forecast.jobs, '명')}${metric('tech', '🎓 기술 인력', forecast.skilled, forecast.skilledNeed, '명')}${metric('power', '⚡ 전력', forecast.supply, forecast.energy, '', '공급')}${gaugesHtml(g)}</div>${practice ? practicePanel() : ''}
      <div class="main"><div class="map-wrap"><div class="map-toolbar">${relocating !== null ? btn('cancel-move', '옮기기 취소', 'secondary') : [['industry', '산업'], ['people', '사람·교육'], ['env', '환경']].map(([id, label]) => btn('lens', label, lens === id ? 'active' : '', `data-lens="${id}" aria-pressed="${lens === id}"`)).join('')}</div>${mapHtml()}<div class="city-warnings" role="status">${relocating !== null ? '빈 땅을 누르면 건물이 옮겨져요 · 도시 돈 2 사용' : forecast.warnings.map(v => `<p>${esc(v)}</p>`).join('') || '<p>도시의 기반이 준비됐어요. 산업의 기회를 살펴봐요.</p>'}</div></div>
      <aside class="tray">${practice ? '' : `<div class="industry-opportunity"><b>이번 시대: ${D.categories[era(d).real].name}</b><p>내 주력: ${leaders.length ? D.categories[leaders[0][0]].name : '첫 산업을 준비해요'}</p></div>`}${practice ? '' : `<div class="forecast"><button data-action="help" data-help="money">10년 뒤 도시 돈 <b>${G.money} → ${Math.max(0, G.money + forecast.income)}</b><small>운영비를 뺀 뒤 ${forecast.income >= 0 ? '+' : ''}${forecast.income}</small></button><button data-action="help" data-help="tech">새로 기술을 배울 사람 <b>${forecast.techGain}명</b></button></div>
      <div class="tray-tabs">${btn('tray', '산업 키우기', trayMode === 'industry' ? 'active' : '', 'data-tray="industry"')}${btn('tray', '기반 준비', trayMode === 'support' ? 'active' : '', 'data-tray="support"')}</div>`}
      ${sel && !practice ? `<section class="building-info"><strong>${B[sel].name}</strong>${buildingInfo(sel)}</section>` : practice ? '' : '<div class="info-hint">카드·건물·숫자를 누르면 뜻과 할 일을 알려 줘요.</div>'}<div class="cards" role="list">${practice ? practiceNumbers() : ''}${cards.map(cardHtml).join('')}</div>
      <div class="tray-foot">${btn('undo', `${icon('undo')}<small>되돌리기</small>`, 'icon-btn undo-labeled', `aria-label="계획 되돌리기, 쓴 돈 돌려받기" ${G.actions.length && !practice ? '' : 'disabled'}`)}${btn('advance', `10년 보내기 ${icon('play')}`, 'primary go')}</div></aside></div>${pop !== null ? popHtml() : ''}</section>`);
    fitMap(); positionPop(); if (matchMedia('(orientation: portrait)').matches) { const c = app.querySelector('.card.sel'), cards = app.querySelector('.cards'); if (c && cards) cards.scrollLeft = c.offsetLeft - cards.offsetLeft; }
    if (practice) { app.querySelector('[data-action="expand"]').disabled ||= practice.pending || PRACTICE[practice.step].kind !== 'expand'; app.querySelector('[data-action="advance"]').disabled = practice.pending || PRACTICE[practice.step].kind !== 'advance'; checkPractice(); }
    else if (!progress.tutorialSeen && d === 0) tutorial();
  }
  function cardHtml(id) {
    const b = B[id], st = E.cardStatus(G, id), future = b.era > G.d;
    const isNew = b.era === G.d && G.d > 0;
    return `<button type="button" role="listitem" class="card${sel === id ? ' sel' : ''}${st.ok ? '' : ' locked'}${future ? ' future' : ''}" data-card="${id}" aria-label="${b.name}, 짓는 비용 도시 돈 ${b.cost}" aria-pressed="${sel === id}">
      <div class="c-icon">${A.building(id, { d: G.d })}</div><div class="c-name">${b.name}</div>
      <div class="c-row"><span class="cost">${icon('coin')}짓는 돈 <b>${b.cost}</b></span>${needs(id)}</div><div class="c-fx">${effects(id)}</div>
      ${!st.ok ? `<span class="c-lock">${reasonHtml(st.reason, id)}</span>` : ''}${isNew ? '<span class="c-new">NEW</span>' : ''}</button>`;
  }
  /* 지은 건물에서 증축·이전·산업 전환을 고른다. */
  function popHtml() {
    const t = G.tiles[pop]; if (!t?.b) return '';
    const up = E.canUpgrade(G, pop), conversion = sel && E.canConvert(G, sel, pop);
    const action = (name, title, cost, result, enabled, extra = '') => btn(name, `<strong>${title}</strong>${moneyCost(cost)}<small>${result}</small>`, 'operation', `${enabled ? '' : 'disabled'} ${extra}`);
    return `<div class="pop" role="dialog" aria-label="${B[t.b].name} 관리"><div class="pop-head">${A.building(t.b, { d: G.d, level: E.level(t) })}<b>${B[t.b].name}${E.level(t) === 2 ? ' · 크게 지은 상태' : ''}</b>${btn('pop-close', icon('cross'), 'icon-btn', 'aria-label="건물 안내 닫기"')}</div>${buildingInfo(t.b, pop)}<div class="pop-actions">
      ${conversion?.ok ? action('pop-convert', `${B[sel].name}로 바꾸기`, conversion.cost, '같은 땅에서 다른 산업을 시작해요', true, `data-id="${sel}"`) : ''}
      ${E.level(t) === 2 ? '<p class="upgrade-done">✓ 이 건물은 최대 크기예요.</p>' : action('pop-upgrade', '건물 키우기 (증축)', up.cost, capacityChange(t.b), up.ok)}
      ${action('pop-move', '다른 땅으로 옮기기', 2, '다음에 누르는 빈 땅으로 옮겨요', G.money >= 2)}
      ${action('pop-demolish', '건물 없애기 (철거)', D.rules.demolishCost, '이 땅을 비워요 · 돈을 돌려받지는 않아요', E.canDemolish(G, pop).ok)}</div><p class="operation-note">이번 건설 시간의 변경은 되돌리기로 취소할 수 있어요.</p></div>`;
  }
  function positionPop() {
    const el = app.querySelector('.pop'), tile = pop !== null && app.querySelector(`[data-tile="${pop}"]`);
    if (!el || !tile) return;
    const r = tile.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let x = r.left + r.width / 2 - w / 2, y = r.top - h - 8;
    if (y < 8) y = r.bottom + 8;
    x = Math.max(8, Math.min(innerWidth - w - 8, x)); y = Math.max(8, Math.min(innerHeight - h - 8, y));
    el.style.left = `${x}px`; el.style.top = `${y}px`;
  }
  function selectCard(id) {
    if (busy) return;
    if (practice && (practice.pending || PRACTICE[practice.step].card !== id)) return;
    const st = E.cardStatus(G, id);
    pop = null;
    if (sel === id) sel = null;
    else { sel = id; if (!st.ok) { S.play('no'); toast(`${A.building(id, { d: G.d })}${reasonHtml(st.reason, id)}`); } }
    S.play('tick'); build();
  }
  function tapTile(i) {
    if (busy) return;
    cursor = i;
    if (practice && (practice.pending || i !== (relocating !== null ? PRACTICE[practice.step].to : PRACTICE[practice.step].tile))) { toast('연습에서는 빛나는 땅을 눌러 보세요.'); return; }
    if (relocating !== null) { const result = E.move(G, relocating, i); if (result.ok) { relocating = null; saveGame(); build(); } else toast('비어 있는 열린 땅을 골라요. 해안 조건도 확인해요.'); return; }
    const t = G.tiles[i];
    if (sel) {
      const can = E.canPlace(G, sel, i);
      if (can.ok) {
        E.place(G, sel, i); S.play('place'); saveGame();
        if (!E.cardStatus(G, sel).ok) sel = null;
        build();
        app.querySelector(`[data-tile="${i}"]`)?.classList.add('pop-in');
        if (E.slotsLeft(G) === 0) toast('땅이 찼어요. 증축·전환이나 도시 확장을 살펴요.');
      } else {
        if (t.b) { pop = i; build(); return; }
        S.play('no');
        const el = app.querySelector(`[data-tile="${i}"]`); el?.classList.remove('shake'); void el?.offsetWidth; el?.classList.add('shake');
        if (E.buildable(t.x, t.y)) toast(reasonHtml(can.reason, sel));
      }
      return;
    }
    if (t.b) { pop = pop === i ? null : i; S.play('tick'); build(); }
  }

  function previewTile(el) {
    if (screen !== 'build' || busy || !sel || !layer.hidden) return;
    const i = Number(el?.dataset.tile), panel = app.querySelector('.city-warnings');
    if (!el || !E.canPlace(G, sel, i).ok) return;
    const p = E.preview(G, sel, i), current = E.production(G), row = p.rows.find(r => r.i === i), b = B[sel];
    const diff = p.exports - current.exports, harm = p.exposed.length - current.exposed.length;
    app.querySelectorAll('.tile').forEach(t => t.classList.toggle('preview-range', !!b.range && E.distance(i, Number(t.dataset.tile)) <= b.range));
    panel.innerHTML = `<p><b>${b.name} 배치 예상</b>${b.exp ? ` · 가동 ${Math.round(row.rate * 100)}%` : ''}</p><p>도시 수출 ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} · 피해 주택 ${harm >= 0 ? '+' : ''}${harm} · 순수입 ${p.income >= 0 ? '+' : ''}${p.income}</p>`;
  }
  app.addEventListener('pointerover', e => previewTile(e.target.closest('[data-tile]')));
  app.addEventListener('focusin', e => previewTile(e.target.closest('[data-tile]')));
  app.addEventListener('pointerout', e => {
    if (!e.target.closest('.map') || e.relatedTarget?.closest('.map') || screen !== 'build' || busy) return;
    app.querySelectorAll('.preview-range').forEach(t => t.classList.remove('preview-range'));
    const panel = app.querySelector('.city-warnings');
    panel.innerHTML = E.production(G).warnings.map(v => `<p>${esc(v)}</p>`).join('') || '<p>도시의 기반이 준비됐어요.</p>';
  });

  /* 끌어다 놓기 (터치·마우스) */
  function startDrag(e, id) {
    if (busy || (practice && (practice.pending || PRACTICE[practice.step].card !== id)) || B[id].era > G.d) return;
    drag = { id, x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId, ghost: null, over: null,
      scroll: e.pointerType === 'touch' && matchMedia('(orientation: portrait)').matches };
  }
  function moveDrag(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 12) {
      if (drag.scroll && Math.abs(e.clientX - drag.x) > Math.abs(e.clientY - drag.y)) { drag = null; return; }
      if (!E.cardStatus(G, drag.id).ok) { drag = null; return; }
      drag.moved = true; sel = drag.id; pop = null; build();
      drag.ghost = document.createElement('div'); drag.ghost.className = 'drag-ghost'; drag.ghost.innerHTML = A.building(drag.id, { d: G.d });
      document.body.appendChild(drag.ghost);
    }
    if (!drag.moved) return;
    e.preventDefault();
    drag.ghost.style.transform = `translate(${e.clientX - 40}px, ${e.clientY - 60}px)`;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-tile]');
    app.querySelectorAll('.tile.hover').forEach(t => t.classList.remove('hover'));
    drag.over = el ? Number(el.dataset.tile) : null;
    if (el) el.classList.add('hover');
  }
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag; drag = null;
    d.ghost?.remove();
    if (d.moved) { if (d.over !== null) tapTile(d.over); else build(); }
  }
  app.addEventListener('pointerdown', e => { const c = e.target.closest('[data-card]'); if (c && screen === 'build') startDrag(e, c.dataset.card); });
  addEventListener('pointermove', moveDrag, { passive: false });
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', e => { if (drag) { drag.ghost?.remove(); drag = null; } });

  /* ───── 10년 보내기 ───── */
  async function advance() {
    if (busy) return;
    busy = true; sel = null; pop = null; closeLayer();
    relocating = null;
    const d = G.d, chips = G.tiles.map((t, i) => [i, E.exportOf(G, i)]).filter(([, v]) => v > 0);
    Paint.preload(era(d).event.char);
    const res = E.advance(G);
    saveGame();
    if (res.problem) Paint.preload(res.problem.char);
    build();
    const climate = app.querySelector('.build');
    climate.classList.add('timelapse', 'city-running');
    const oldEnv = G.records[d - 1]?.gauges.env ?? 80;
    const haze = app.querySelectorAll('.sky-haze,.water-haze');
    haze.forEach(el => { el.style.transition = 'none'; el.style.opacity = (100 - oldEnv) / 100; });
    void climate.offsetWidth;
    haze.forEach(el => { el.style.transition = reduce ? 'none' : 'opacity 1.4s linear'; el.style.opacity = (100 - res.gauges.env) / 100; });
    const year = document.createElement('div'); year.className = 'year-roll'; year.setAttribute('aria-live', 'polite');
    app.querySelector('.map-wrap').appendChild(year);
    S.play('whoosh');
    for (const [i, v] of chips) {
      const tile = app.querySelector(`[data-tile="${i}"]`);
      if (tile) tile.insertAdjacentHTML('beforeend', `<span class="coin-chip">${icon('coin')}+${Math.round(v * D.rules.income.exportRate)}</span>`);
    }
    for (let y = 0; y <= 9; y++) { year.textContent = `${1960 + d * 10 + y}`; await wait(140); }
    S.play('coin');
    const moneyEl = app.querySelector('.money-amount');
    if (moneyEl) moneyEl.textContent = G.money;
    year.innerHTML = `<span class="gain">${icon('coin')}${res.income >= 0 ? '+' : ''}${res.income}</span>${res.techGain ? `<span class="gain">${icon('star')}+${res.techGain}</span>` : ''}`;
    await wait(1300);
    climate.classList.remove('city-running');
    await finishDecade();
  }
  async function finishDecade() {
    busy = true;
    const d = G.d, res = G.last;
    if (res.problem && G.records[d].choices.length === 0) await eventCard(res.problem, true);
    if (G.records[d].choices.length < (res.problem ? 2 : 1)) await eventCard(era(d).event, false);
    await historyCard(d);
    busy = false;
    if (d >= E.LAST) { E.nextDecade(G); ending(); return; }
    E.nextDecade(G); saveGame(); eraPaper();
  }

  /* 사건 카드: 선택하면 효과가 아이콘으로 날아감 */
  function eventCard(ev, problem) {
    return new Promise(resolve => {
      S.play('event');
      openLayer(`<div class="event${problem ? ' problem' : ''}"><span class="ev-tag">${problem ? `${icon('cross')} 문제 발생!` : `${icon('news')} ${era(G.d).label}`}</span>
        <div class="bubble">${esc(ev.text)}</div>
        <div class="ev-card"><div class="ev-portrait">${Paint.person(ev.char, P.portrait(ev.char))}</div><b class="ev-name">${PEOPLE[ev.char] || ''}</b></div>
        <div class="choices">${btn('choose', esc(ev.a.label), 'choice', 'data-k="a"')}${btn('choose', esc(ev.b.label), 'choice', 'data-k="b"')}</div><div class="fx-out" aria-live="polite"></div></div>`, 'event-layer');
      layer.querySelectorAll('[data-action="choose"]').forEach(b => b.addEventListener('click', async () => {
        const k = b.dataset.k, choice = ev[k], fx = E.choiceEffects(G, ev, k);
        layer.querySelectorAll('.choice').forEach(x => { x.disabled = true; x.classList.toggle('picked', x === b); });
        E.applyFx(G, fx, choice.label);
        saveGame();
        const out = layer.querySelector('.fx-out');
        out.innerHTML = Object.entries(fx).map(([key, v]) => {
          const ic = key === 'money' ? 'coin' : key === 'tech' ? 'star' : GICON[key];
          return `<span class="fx ${v > 0 ? 'up' : 'down'}">${icon(ic)}<b>${v > 0 ? '+' : '−'}${Math.abs(v)}</b></span>`;
        }).join('') || `<span class="fx">${icon('check')}</span>`;
        S.play(Object.values(fx).some(v => v < 0) ? 'down' : 'up');
        const g = E.gauges(G);
        app.querySelector('.gauges').outerHTML = gaugesHtml(g);
        app.querySelector('.money-amount').textContent = G.money;
        await wait(1300); closeLayer(); build(); app.querySelector('.build')?.classList.add('timelapse'); resolve();
      }, { once: true }));
    });
  }
  function historyCard(d) {
    return new Promise(resolve => {
      const rec = G.records[d], cat = era(d).real;
      openLayer(`<div class="hist"><span class="hist-tag">그때 우리나라는?</span><h3>${era(d).label}</h3>
        <div class="hist-row"><div class="hist-ico">${A.building(REPR[cat])}</div><p>${esc(era(d).realText)}</p></div>
        <div class="hist-me ${rec.match ? 'yes' : 'no'}">${icon(rec.match ? 'check' : 'compass')}<b>${rec.match ? '시대 산업을 활용했어요' : '다온시는 다른 산업을 키웠어요'}</b><span class="mine">${rec.built.map(id => A.building(id, { d })).join('')}</span></div>
        <div class="era-report"><b>내 도시의 성과</b><p>수출 ${rec.exports} · 순수입 ${rec.income >= 0 ? '+' : ''}${rec.income}</p><p>${Object.entries(rec.categories || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => `${D.categories[id].name} ${v.toFixed(1)}`).join(' · ') || '운영할 산업을 준비해요'}</p>${(rec.warnings || []).map(v => `<p>${esc(v)}</p>`).join('')}${rec.relief ? '<p>적자를 긴급 지원으로 메웠어요. 운영비를 줄여 봐요.</p>' : ''}</div>${btn('hist-next', d < E.LAST ? `다음 10년 ${icon('play')}` : `70년사 보기 ${icon('play')}`, 'primary big')}</div>`, 'hist-layer');
      layer.querySelector('[data-action="hist-next"]').addEventListener('click', () => { closeLayer(); resolve(); }, { once: true });
    });
  }

  /* ───── 엔딩: 다온시 70년사 ───── */
  function ending() {
    clearGame();
    const end = E.ending(G), g = E.gauges(G, E.LAST), score = E.historyScore(G);
    const isNew = !progress.endings.includes(end.id);
    if (isNew) progress.endings.push(end.id);
    const earned = [];
    const award = id => { if (!progress.badges.includes(id)) { progress.badges.push(id); earned.push(id); } };
    if (G.records.length === D.eras.length) award('history');
    if (end.id === 'together') award('together');
    if (progress.endings.length === D.endings.length) award('allEndings');
    save();
    S.play(end.legend ? 'fanfare' : 'paper');
    setScreen('ending', `<section class="ending-page">
      <article class="final-paper${end.legend ? ' legend' : ''}"><div class="masthead">다온일보 호외</div><div class="dateline"><span>다온시 70년사</span><span>엔딩 ${progress.endings.length}/${D.endings.length}</span></div>
        ${isNew ? '<span class="new-stamp">NEW!</span>' : ''}<h2>${end.name}</h2><p class="story">${end.story}</p>
        <div class="final-body"><div class="final-map">${mapHtml(true)}</div><div class="final-side">${gaugesHtml(g, 'big')}
          <div class="hist-score">${icon('news')}<span>시대 산업 운영 <b>${score}/${D.eras.length}</b> · 나의 발전 경로</span></div></div></div>
        <div class="note">${P.icon('bulb')}<p>${end.note}${end.legend ? '' : `<br><span class="sub">${D.finalNote}</span>`}</p></div>
        ${earned.length ? `<div class="earned">${earned.map(id => `<span class="badge-chip">${icon('star')}${D.badges.find(b => b.id === id).name}</span>`).join('')}</div>` : ''}
        <div class="end-btns">${btn('new', `다시 하기 ${icon('play')}`, 'primary')}${btn('endings', '엔딩 도감', 'secondary')}${btn('title', '처음으로', 'secondary')}</div></article>
      <h3 class="papers-title">70년 신문 모음</h3>
      <div class="papers">${G.records.map(r => `<article class="mini-paper"><div class="mini-mast">다온일보 · ${era(r.d).label}</div><h4>${era(r.d).headline}</h4>
        <div class="mini-photo">${Paint.scene(`daon/era${r.d}`, `<span class="mini-built">${r.built.map(id => A.building(id, { d: r.d })).join('')}</span>`, `${era(r.d).label} 다온시 풍경`)}</div>
        <div class="mini-built"><p class="industry-record">${Object.entries(r.categories || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => D.categories[id].name).join(' + ') || '기반 준비'}</p>${r.built.length ? r.built.map(id => A.building(id, { d: r.d })).join('') : '<span class="empty">—</span>'}</div>
        <div class="mini-g">${GK.map(k => `<span class="bar" data-g="${k}"><i style="width:${r.gauges[k]}%"></i></span>`).join('')}</div>
        <div class="mini-match ${r.match ? 'yes' : 'no'}" aria-label="${r.match ? '같은 길' : '다온시는 다른 길로!'}">${icon(r.match ? 'check' : 'compass')}</div></article>`).join('')}</div>
      ${end.legend ? '<div class="confetti" aria-hidden="true">' + Array.from({ length: 40 }, (_, i) => `<i style="--x:${(i * 37) % 100};--d:${(i % 7) * .35}s;--c:${['#F5C542', '#2E9E6B', '#3B6FE0', '#E5484D', '#7B52D3'][i % 5]}"></i>`).join('') + '</div>' : ''}
    </section>`);
  }

  /* ───── 엔딩 도감 ───── */
  function endings() {
    setScreen('endings', `<header class="tbar">${iconBtn('home2', '처음으로', 'title')}<h1>엔딩 도감</h1><b class="count">${progress.endings.length}/${D.endings.length}</b></header>
      <section class="ending-grid">${D.endings.map(e => {
        const got = progress.endings.includes(e.id);
        return `<article class="end-card${got ? '' : ' locked'}${e.legend ? ' legend' : ''}"><div class="mini-mast">다온일보 호외</div>${got ? `<div class="end-photo">${A.building(({ export: 'port', tech: 'semi', creative: 'content', together: 'univ', gray: 'steel', unfair: 'welfare', stuck: 'textile', grown: 'house' })[e.id])}</div><h3>${e.name}</h3><p>${e.story}</p>` : `<div class="end-ico q">?</div><p class="hint">${HINTS[e.id]}</p>`}</article>`;
      }).join('')}</section>
      <h2 class="badge-title">배지</h2><section class="badge-row">${D.badges.map(b => {
        const got = progress.badges.includes(b.id);
        return `<article class="bdg${got ? '' : ' locked'}">${icon(got ? 'star' : 'lock')}<h3>${b.name}</h3><p>${b.goal}</p></article>`;
      }).join('')}</section>`);
  }

  /* ───── 기존 도시와 저장을 건드리지 않는 직접 조작 연습 ───── */
  const PRACTICE = [
    { kind: 'place', card: 'textile', tile: 21, title: '돈을 써서 첫 산업 짓기', task: '섬유 공장 카드를 고른 뒤 빛나는 땅을 눌러요. 짓는 돈 3이 무슨 뜻인지 확인해요.' },
    { kind: 'place', card: 'school', tile: 7, title: '학교로 다음 산업 준비하기', task: '학교 카드를 골라 주택 옆 빛나는 땅에 지어요. 기술은 배우는 시간이 필요해요.' },
    { kind: 'upgrade', tile: 8, title: '같은 땅에서 집 키우기', task: '빛나는 주택을 누르고 건물 키우기를 골라요. 쓸 돈과 늘어나는 인원은 서로 다른 숫자예요.' },
    { kind: 'advance', title: '10년 운영한 결과 보기', task: '10년 보내기를 눌러요. 산업이 돈을 벌고, 학교의 주민이 기술을 배워요.' },
    { kind: 'place', card: 'steel', tile: 22, title: '새 산업에 필요한 전력 읽기', task: '1970년대의 제철소를 빛나는 땅에 지어요. 가능한 사람과 필요한 전력을 비교해요.' },
    { kind: 'place', card: 'power', tile: 28, title: '부족한 전력 채우기', task: '화력 발전소 카드를 골라 빛나는 땅에 지어요. 공장이 얼마나 돌아가는지 다시 확인해요.' },
    { kind: 'move', tile: 22, to: 30, title: '오염 피해 주택 지키기', task: '😷 주택 가까이 있는 빛나는 제철소를 누르고 다른 땅으로 옮기기를 골라요. 새로 빛나는 빈 땅으로 옮겨요.' },
    { kind: 'expand', title: '돈과 땅의 칸 수 구분하기', task: '땅 넓히기를 눌러요. 도시 돈 5를 쓰면 땅이 5칸 늘어나는 것인지 확인해요.' }
  ];
  function tutorial() {
    openLayer(`<div class="help welcome"><h2>산업이 자라는 도시를 만들어요</h2><p>도시 돈은 건물을 짓는 데 쓰고, 사람·기술·전력은 산업을 움직여요.</p><p>연습 도시에서 직접 지으며 숫자를 읽어 볼까요?</p><div class="help-buttons">${btn('practice', '연습 도시로 배우기', 'primary')}${btn('tut-skip', '바로 도시 만들기', 'secondary')}</div></div>`, 'tut-layer');
  }
  function beginPractice() {
    closeLayer(); practice = { step: 0, pending: false, returnGame: G };
    G = E.newGame(); sel = null; pop = null; relocating = null; lens = 'industry'; trayMode = 'industry'; busy = false;
    practice.before = { money: G.money, plan: E.production(G), land: landCount(G.land) }; build();
  }
  function endPractice() {
    closeLayer(); G = practice.returnGame; practice = null; sel = null; pop = null; relocating = null; busy = false; title();
  }
  function practicePanel() {
    const step = PRACTICE[practice.step];
    return `<section class="practice-panel" aria-label="연습 안내"><div class="practice-heading"><b>연습 ${practice.step + 1}/${PRACTICE.length}</b>${btn('practice-exit', '연습 나가기', 'text-btn')}</div><strong>${step.title}</strong><small>연습용 도시예요. 내 도시 저장과 엔딩 도감은 그대로예요.</small>${practice.pending ? btn('practice-next', '다음 연습으로', 'primary') : ''}</section>`;
  }
  function practiceNumbers() {
    const p = E.production(G), steel = p.industries.find(r => r.id === 'steel');
    const focus = [
      [['지금 가진 도시 돈', G.money], ['공장 짓는 비용', `${B.textile.cost} 사용`], '돈은 건물을 짓는 비용이에요. 일자리 2개는 공장에서 일할 사람 수예요.'],
      [['지금 기술을 배운 사람', `${p.skilled}명`], ['학교의 교육 자리', `${B.school.education}명`], '학교를 지은 뒤 10년을 보내야 주민이 기술을 배워요.'],
      [['이 주택의 살 곳', `${B.house.homes * E.level(G.tiles[8])}명`], ['집 키우는 비용', `${B.house.cost} 사용`], '살 곳을 늘리면 더 많은 주민이 살 수 있어요. 일자리도 함께 준비해요.'],
      [['10년 뒤 받을 도시 돈', `${p.income >= 0 ? '+' : ''}${p.income}`], ['새로 기술을 배울 사람', `${p.techGain}명`], '산업이 번 돈에서 운영비를 뺀 결과예요. 배운 기술은 다음 산업의 준비가 돼요.'],
      [['공급하는 전력', p.supply], ['공장이 쓰는 전력', p.energy], '제철소를 지은 뒤 두 숫자를 비교해요. 전력이 부족하면 생산량이 줄어요.'],
      [['제철소가 돌아가는 정도', `${Math.round((steel?.rate || 0) * 100)}%`], ['오염 피해 주택', `${p.exposed.length}곳`], '발전소로 생산량을 늘려요. 😷 표시가 뜨는 주택의 피해도 함께 확인해요.'],
      [['오염 피해 주택', `${p.exposed.length}곳`], ['공장을 옮기는 비용', '2 사용'], '공장을 주택에서 멀리 옮겨요. 피해 주택 수가 어떻게 바뀌는지 살펴요.'],
      [['지금 건설 가능한 땅', `${landCount(G.land)}칸`], ['땅을 넓히는 비용', `${D.rules.expandCost[0]} 사용`], '5는 쓸 돈이에요. 땅의 넓이는 칸으로 읽어요. 비용과 효과를 구분해요.']
    ][practice.step];
    return `<section class="practice-numbers" role="listitem" aria-label="지금 볼 숫자"><h3>지금 볼 숫자</h3><div>${focus.slice(0, 2).map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div><p>${PRACTICE[practice.step].task}</p><details><summary>이 숫자의 뜻</summary><p>${focus[2]}</p></details></section>`;
  }
  function checkPractice() {
    if (practice.pending) return;
    const step = PRACTICE[practice.step];
    const done = step.kind === 'place' ? G.tiles[step.tile].b === step.card : step.kind === 'upgrade' ? E.level(G.tiles[step.tile]) === 2 : step.kind === 'advance' ? G.d === 1 : step.kind === 'move' ? G.tiles[step.to].b === 'steel' && !G.tiles[step.tile].b : G.land === 1;
    if (!done) return;
    practice.pending = true; const p = E.production(G), before = practice.before;
    const lessons = [
      [`도시 돈 ${before.money} → ${G.money}`, '공장 짓는 돈 3을 썼어요. 일자리 2개는 비용이 아니라 공장이 필요로 하는 사람 수예요.'],
      ['학교를 지어도 기술 인력은 아직 0명', '10년을 보내면 2명이 새로 배워요. 학교의 교육 숫자는 지금 배운 사람 수가 아니라 가르칠 수 있는 사람 수예요.'],
      ['도시 돈 2 사용 · 살 곳 2명 → 4명', '같은 땅에서 집을 더 크게 지었어요. 살 곳이 늘어도 일자리가 없으면 주민이 바로 늘지는 않아요.'],
      [`돈 ${before.money} → ${G.money} · 기술을 배운 사람 2명`, '10년 운영비를 뺀 돈을 받았고, 학교에 다닌 주민이 기술을 배웠어요. 본 게임에서는 시대의 사건과 실제 역사도 만나게 돼요.'],
      [`공급 전력 ${p.supply} · 필요한 전력 ${p.energy}`, '사람은 충분하지만 전력이 모자라서 공장이 50%만 돌아가요. 건물을 짓는 것과 잘 운영하는 것은 달라요.'],
      ['전력이 충분해져 공장이 100% 가동해요', '그런데 😷 주택은 오염 피해를 받아요. 생산 조건과 주민의 피해를 함께 살펴야 해요.'],
      [`피해 주택 ${before.plan.exposed.length}곳 → ${p.exposed.length}곳`, '도시 돈 2를 써서 공장을 옮겼어요. 주민의 피해는 피했지만 공장이 내보내는 오염 자체가 사라진 것은 아니에요.'],
      [`도시 돈 5 사용 · 땅 ${before.land}칸 → ${landCount(G.land)}칸`, '5는 비용이에요. 이번에는 건설 가능한 땅이 8칸 늘었어요. 비용과 효과를 따로 읽으면 선택하기 쉬워요.']
    ];
    pop = null; sel = null;
    app.querySelector('.practice-panel').outerHTML = practicePanel();
    app.querySelector('[data-action="advance"]').disabled = true; app.querySelector('[data-action="expand"]').disabled = true; fitMap();
    openLayer(`<div class="help practice-feedback"><span class="lesson-success">✓ 직접 해 봤어요</span><h2>${lessons[practice.step][0]}</h2><p>${lessons[practice.step][1]}</p><div class="help-buttons">${btn('practice-next', practice.step === PRACTICE.length - 1 ? '연습 마치기' : '다음 연습', 'primary')}${btn('practice-exit', '연습 나가기', 'secondary')}</div></div>`);
  }
  function nextPractice() {
    closeLayer();
    if (practice.step === PRACTICE.length - 1) {
      openLayer(`<div class="help practice-complete"><h2>이제 나만의 도시를 만들어요!</h2><p>돈은 비용, 명은 사람 수, 칸은 땅의 넓이예요. 건물을 고르기 전에 비용과 바뀔 모습을 함께 살펴요.</p><p>모르는 숫자는 누르면 뜻과 해결 방법이 나와요. 연습은 언제든 다시 할 수 있어요.</p>${btn('practice-finish', savedGame() ? '내 도시 이어하기' : '본 게임 시작하기', 'primary')}${btn('practice-exit', '게임 홈으로', 'secondary')}</div>`); return;
    }
    practice.step++; practice.pending = false; sel = null; pop = null; relocating = null;
    const step = PRACTICE[practice.step]; trayMode = step.card && !B[step.card].exp ? 'support' : 'industry';
    lens = step.kind === 'move' ? 'env' : 'industry';
    practice.before = { money: G.money, plan: E.production(G), land: landCount(G.land) }; build();
  }
  function practiceAllows(action) {
    if (!practice) return true;
    if (['practice-next', 'practice-exit', 'practice-finish', 'help', 'help-map', 'close', 'menu', 'pop-close', 'cancel-move', 'lens', 'tray', 'to-title', 'title'].includes(action)) return true;
    const step = PRACTICE[practice.step];
    return !practice.pending && ((step.kind === 'upgrade' && action === 'pop-upgrade' && pop === step.tile) || (step.kind === 'move' && action === 'pop-move' && pop === step.tile) || (step.kind === 'advance' && action === 'advance') || (step.kind === 'expand' && action === 'expand'));
  }
  function menu() {
    openLayer(`<div class="menu"><h2>${practice ? '연습 중이에요' : '잠깐!'}</h2>${btn('close', '계속하기', 'primary big')}${practice ? btn('practice-exit', '연습 나가기', 'secondary') : `${btn('practice', '연습 도시로 배우기', 'secondary')}${btn('settings', '설정', 'secondary')}${btn('to-title', '처음으로', 'secondary')}`}</div>`);
  }

  function settings(confirm = false) {
    openLayer(`<div class="menu"><h2>설정</h2>${btn('sound', `${P.icon(progress.sound ? 'sound' : 'mute')} 소리 ${progress.sound ? '켜짐' : '꺼짐'}`, 'secondary', `aria-pressed="${progress.sound}"`)}
      ${confirm ? `<div class="confirm"><h3>정말 지울까요?</h3>${btn('reset', '모두 지우기', 'danger')}${btn('settings', '취소', 'secondary')}</div>` : btn('reset-ask', '기록 모두 지우기', 'text-btn')}${btn('close', '닫기', 'primary')}</div>`);
  }

  /* ───── 디버그 ───── */
  function debugBar() {
    if (!debug) return;
    let bar = document.querySelector('.debug');
    if (!bar) { bar = document.createElement('div'); bar.className = 'debug'; document.body.appendChild(bar); }
    bar.innerHTML = `DEBUG ${btn('dbg-money', '+💰50')}${btn('dbg-tech', '+⭐10')}${btn('dbg-bot', '봇 끝까지')}`;
  }
  async function botToEnd(policy = 'a') {
    const plan = [['port', 'textile', 'school', 'school'], ['power', 'steel', 'school', 'park'], ['car', 'univ', 'park', 'welfare'], ['semi', 'elec', 'welfare', 'park'], ['it', 'green', 'cleaner', 'semi'], ['content', 'semi', 'park', 'cleaner'], ['battery', 'it', 'welfare', 'park']];
    if (!G) G = E.newGame();
    while (G.phase !== 'end') {
      for (const id of plan[G.d]) {
        if (E.slotsLeft(G) <= 0 && G.land < 2) E.expand(G);
        let best = -1, score = -1e9;
        G.tiles.forEach((t, i) => {
          if (!E.canPlace(G, id, i).ok) return;
          const ns = E.neighbors(i).map(j => G.tiles[j].b); let v = 0;
          if (B[id].factory) v += (ns.includes('port') ? 5 : 0) + (ns.includes('road') ? 5 : 0) - (ns.includes('house') ? 3 : 0);
          if (id === 'park') v += ns.reduce((a, n) => a + (n ? (B[n].pol || 0) : 0), 0) * 3;
          if (!B[id].coastal && E.coastal(t.x, t.y)) v -= 2;
          if (v > score) { score = v; best = i; }
        });
        if (best >= 0) E.place(G, id, best);
      }
      const r = E.advance(G);
      if (r.problem) E.applyFx(G, E.choiceEffects(G, r.problem, policy), r.problem[policy].label);
      E.applyFx(G, E.choiceEffects(G, era(G.d).event, policy), era(G.d).event[policy].label);
      E.nextDecade(G);
    }
    ending();
  }

  /* ───── 조작 연결 ───── */
  async function act(a, el) {
    if (!practiceAllows(a)) { toast('이번 연습의 빛나는 버튼·땅을 눌러 보세요.'); return; }
    switch (a) {
      case 'new': clearGame(); lens = 'industry'; trayMode = 'industry'; relocating = null; G = E.newGame(); saveGame(); sel = null; pop = null; S.play('tick'); eraPaper(); break;
      case 'continue': G = savedGame(); if (G) { build(); if (G.phase === 'events') { app.querySelector('.build').classList.add('timelapse'); finishDecade(); } } else title(); break;
      case 'start-build': build(); break;
      case 'endings': endings(); break;
      case 'title': if (practice) endPractice(); else { closeLayer(); title(); } break;
      case 'to-title': if (practice) { endPractice(); break; } closeLayer(); if (G && G.phase === 'build') saveGame(); title(); break;
      case 'menu': menu(); break;
      case 'settings': settings(); break;
      case 'reset-ask': settings(true); break;
      case 'reset': progress = fresh(); save(); clearGame(); S.setEnabled(false); closeLayer(); title(); break;
      case 'close': closeLayer(); break;
      case 'help': if (G) help(el.dataset.help); break;
      case 'sound': progress.sound = !progress.sound; save(); S.setEnabled(progress.sound); S.play('tick'); if (!layer.hidden) settings(); else el.outerHTML = soundBtn(); break;
      case 'undo': if (G.actions.length) { const r = E.undo(G); if (!r.ok) { toast(reasonHtml(r.reason)); break; } S.play('undo'); saveGame(); build(); } break;
      case 'pop-undo': { const r = E.undo(G); if (!r.ok) toast(reasonHtml(r.reason)); else { S.play('undo'); saveGame(); } pop = null; build(); break; }
      case 'pop-demolish': if (E.demolish(G, pop).ok) { S.play('thud'); saveGame(); } pop = null; build(); break;
      case 'pop-upgrade': if (E.upgrade(G, pop).ok) { saveGame(); pop = null; build(); } break;
      case 'pop-convert': if (E.convert(G, el.dataset.id, pop).ok) { saveGame(); pop = null; sel = null; build(); } break;
      case 'pop-move': relocating = pop; pop = null; sel = null; build(); break;
      case 'expand': if (E.expand(G).ok) { saveGame(); build(); } break;
      case 'lens': lens = el.dataset.lens; pop = null; build(); break;
      case 'tray': trayMode = el.dataset.tray; sel = null; pop = null; build(); break;
      case 'pop-close': pop = null; build(); break;
      case 'advance': if (practice) { E.advance(G); E.nextDecade(G); build(); } else advance(); break;
      case 'practice': beginPractice(); break;
      case 'practice-next': nextPractice(); break;
      case 'practice-exit': endPractice(); break;
      case 'practice-finish': { progress.tutorialSeen = true; save(); const next = savedGame() ? 'continue' : 'new'; endPractice(); act(next); break; }
      case 'help-map': closeLayer(); lens = el.dataset.lens; pop = null; build(); break;
      case 'cancel-move': relocating = null; build(); break;
      case 'tut-skip': progress.tutorialSeen = true; save(); closeLayer(); break;
      case 'dbg-money': if (G) { G.money += 50; build(); } break;
      case 'dbg-tech': if (G) { G.tech += 10; build(); } break;
      case 'dbg-bot': closeLayer(); botToEnd(); break;
    }
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (a && !busy && !a.disabled && a.dataset.action !== 'choose' && a.dataset.action !== 'hist-next') { act(a.dataset.action, a); return; }
    if (screen !== 'build' || busy) return;
    const card = e.target.closest('[data-card]');
    if (card) { if (!drag) selectCard(card.dataset.card); return; }
    const tile = e.target.closest('[data-tile]');
    if (tile) { tapTile(Number(tile.dataset.tile)); return; }
    if (pop !== null && !e.target.closest('.pop')) { pop = null; build(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !layer.hidden) {
      const buttons = [...layer.querySelectorAll('button:not([disabled])')], first = buttons[0], last = buttons[buttons.length - 1];
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (e.key === 'Escape') { if (!layer.hidden && !layer.querySelector('.event,.hist')) { if (layer.querySelector('.welcome')) { progress.tutorialSeen = true; save(); } closeLayer(); return; } if (sel || pop !== null || relocating !== null) { sel = null; pop = null; relocating = null; build(); } return; }
    if (screen !== 'build' || busy || !layer.hidden) return;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -E.W, ArrowDown: E.W };
    const active = document.activeElement?.closest?.('[data-tile]');
    if (moves[e.key] !== undefined && active) {
      e.preventDefault();
      const n = Number(active.dataset.tile) + moves[e.key];
      if (n >= 0 && n < E.W * E.H && !(Math.abs(moves[e.key]) === 1 && Math.floor(n / E.W) !== Math.floor(Number(active.dataset.tile) / E.W))) {
        cursor = n; const el = app.querySelector(`[data-tile="${n}"]`); app.querySelectorAll('[data-tile]').forEach(t => t.tabIndex = -1); el.tabIndex = 0; el.focus();
      }
    }
  });

  title();
})();
