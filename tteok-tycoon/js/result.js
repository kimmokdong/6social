/* 플레이 기록으로만 계산하는 결과 분석 — 화면과 node에서 함께 사용 */
(function (root) {
  'use strict';
  const T = root.TTEOK, D = T.result, E = root.TteokEngine;
  const slots = ['role', 'household', 'freedom', 'responsibility'];
  const num = n => Number(n).toLocaleString('ko-KR');
  const fill = (text, values) => text.replace(/\{([^}]+)\}|\[([^\]]+)\]|\b[NMABCDXY]\b/g, (all, a, b) => values[a || b || all] ?? all).replace(/일째 (에|,)/g, '일째$1');
  const average = (xs, key) => xs.length ? xs.reduce((n, x) => n + x[key], 0) / xs.length : 0;
  const rivalCount = h => Math.round(h.rivalShare * h.visitors);
  const scheduleDay = (g, day) => {
    const d = g.schedule[day];
    return typeof d === 'string' ? { id: d, ...(T.pools.choices[d] || T.pools.demand[d] || (d === 'first' ? T.firstDay : T.lastDay)) } : d;
  };
  // 날씨·행사·첫날·마지막 날만 '소식'으로 쓴다(제안 사건 이름은 소식이 아님).
  const news = (g, day) => { const d = scheduleDay(g, day); return T.pools.demand[d.id] || d.id === 'first' || d.id === 'last' ? d.title.replace(/!/g, '') : ''; };
  const changed = (h, i, hs) => i > 0 && h.price !== hs[i - 1].price;
  const why = g => !g ? '' : ({ taste: '맛이 더 좋아서', reputation: '평판이 더 좋아서', loyalty: '왕떡볶이 단골이라서', price: `${num(g.saving)}원 더 싸서`, preference: '친구 따라', cartel: '두 가게가 같은 값이라서' }[g.reason] || '');
  function questionsFor(G, shuffleOptions) {
    const hs = G.history || [], trail = G.trail || [];
    if (!hs.length) return [];
    const max = (xs, score) => xs.reduce((a, b) => !a || score(b) > score(a) ? b : a, null);
    const picks = [];
    const add = (id, h, values = {}, event = null) => {
      const q = D.questions.find(q => q.id === id);
      const v = { N: h.day + 1, 소식: news(G, h.day), ...values };
      const options = q.options.map(o => ({ ...o }));
      if (shuffleOptions) {
        let hash = G.seed >>> 0;
        for (const c of id) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
        const r = E.rng(hash);
        for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
      }
      picks.push({ id, slot: q.slot, day: h.day, text: fill(q.template, v), options, values: v, event });
    };
    let h = max(hs.filter(h => h.turned > 10 && h.portions < h.cap), h => h.turned);
    if (h) add('B1', h, { A: h.turned });
    else if ((h = max(hs.filter(h => h.leftover > 15), h => h.leftover))) add('B2', h, { A: h.leftover });
    else if ((h = hs.find((h, i) => i && h.price > hs[i - 1].price && h.served < hs[i - 1].served && h.visitors <= hs[i - 1].visitors))) {
      const prev = hs[hs.indexOf(h) - 1]; add('B3', h, { X: num(prev.price), Y: num(h.price), A: prev.served, B: h.served });
    } else if ((h = hs.find(h => h.upgrade))) add('B4', h, { 투자: T.upgrades[h.upgrade].name, A: num(T.upgrades[h.upgrade].cost) });
    else { h = hs.find((h, i) => i && h.visitors !== hs[i - 1].visitors) || hs[0]; add('B5', h, { A: h.portions }); }
    h = max(hs.filter(h => rivalCount(h) > h.served && h.rivalReason), h => rivalCount(h) - h.served);
    if (h) add('G1', h, { A: rivalCount(h), B: h.served });
    else if ((h = max(hs.filter(h => h.mineReason), h => h.served))) add('G2', h, { A: h.served });
    const locked = hs.filter(h => h.locked), changes = hs.filter(changed).length;
    if (locked.length) add('F1', locked[0], { N: locked.length });
    else if (changes) add('F2', hs[0], { N: changes });
    else add('F3', hs[0], { N: hs.length, X: num(hs[0].price) });
    const starts = trail.filter(t => t.start);
    const key = t => T.pools.choices[t.root]?.choice.options.find(o => o.label === t.pick)?.key;
    const bad = starts.find(t => T.pools.choices[t.root]?.choice.options.find(o => o.label === t.pick)?.unfair);
    const ev = bad || starts.find(t => t.root === 'donation' && key(t) === 'a') || starts.find(t => t.root === 'complaint' && key(t) === 'a') || starts.find(t => t.root === 'cartel' && key(t) === 'b');
    if (ev) {
      const truck = trail.find(t => t.id === 'truck');
      const id = bad ? ({ cartel: truck ? 'S1' : 'S2', fakeAd: 'S3', fakeOrigin: 'S4', complaint: 'S5' }[ev.root]) : ({ donation: 'S6', complaint: 'S7', cartel: 'S8' }[ev.root]);
      add(id, hs.find(h => h.day === ev.day) || hs[0], { N: ev.day + 1, M: truck ? truck.day + 1 : '' }, ev);
    }
    return picks;
  }
  const interview = G => questionsFor(G, true);
  function tableFor(plays) {
    return Object.entries(T.pools.choices).map(([id, d]) => {
      const branches = d.choice.options.map(o => {
        const records = plays.flatMap((p, i) => (p.trail || []).filter(t => t.start && t.root === id && t.pick === o.label).map(t => ({ p, t, i })));
        return { key: o.key, label: o.label, seen: records.length > 0, count: records.length,
          consequences: records.map(({ p, t, i }) => { const steps = (p.trail || []).filter(x => x.root === id && !x.start && x.day >= t.day).map(x => `${x.day + 1}일째 ${x.title}${x.pick ? ` · ${x.pick}` : ''}${x.fx?.money ? ` · ${num(x.fx.money)}원` : ''}`); return steps.length ? `${i + 1}판 · ${steps.join(' → ')}` : ''; }).filter(Boolean) };
      });
      return { id, title: d.title, branches, both: branches.every(b => b.seen) };
    });
  }
  function analyze(G, answers = {}, pastPlays = []) {
    const hs = G.history || [], qs = questionsFor(G, false), n = hs.length;
    const ok = slot => { const q = qs.find(q => q.slot === slot); return !!q?.options.find(o => o.id === answers[q.id] && o.ok); };
    const portions = hs.filter((h, i) => i && Math.abs(h.portions - hs[i - 1].portions) > 10).length;
    const price = average(hs, 'price') - average(hs, 'rivalPrice'), upgrades = hs.filter(h => h.upgrade).length;
    const axes = D.axes.map((a, i) => ({ ...a, value: [portions, price, upgrades][i], high: [portions, price, upgrades][i] >= a.threshold }));
    const type = D.types[(axes[0].high ? 4 : 0) + (axes[1].high ? 2 : 0) + (axes[2].high ? 1 : 0)];
    const demand = hs.filter((h, i) => i && Math.abs(h.mood - hs[i - 1].mood) > .2 + 1e-9);
    const dk = demand.filter(h => { const p = hs[hs.indexOf(h) - 1]; return (h.mood - p.mood) * (h.portions - p.portions) > 0; }).length;
    const signals = hs.filter((h, i) => i && !h.locked && ((rivalCount(hs[i - 1]) > hs[i - 1].served && hs[i - 1].price > hs[i - 1].rivalPrice) || h.rivalPrice !== hs[i - 1].rivalPrice));
    const pk = signals.filter(h => h.price !== hs[hs.indexOf(h) - 1].price).length;
    const early = hs.find(h => h.day < 5 && T.upgrades[h.upgrade]?.once);
    const passed = [demand.length > 0 && dk / demand.length >= .6, signals.length > 0 && pk / signals.length >= .5, !!early];
    const role = passed.filter(Boolean).length;
    const changedDays = hs.filter((h, i) => (i ? h.price !== hs[i - 1].price || h.taste !== hs[i - 1].taste : h.taste !== T.start.taste) && i < n - 1);
    const hk = changedDays.filter(h => { const next = hs[hs.indexOf(h) + 1]; return Math.abs(next.portions - h.served - h.turned) <= 5; }).length; // 바꾼 날의 손님 수(판매+못 산 손님)에 다음 날 재료를 맞췄는지
    const household = changedDays.length > 0 && hk / changedDays.length >= .5;
    const free = hs.filter(h => !h.locked), p = hs.filter((h, i, a) => !h.locked && changed(h, i, a)).length, u = free.filter(h => h.upgrade).length;
    const table = tableFor([...pastPlays, G]), both = table.filter(t => t.both).length, branches = table.reduce((n, t) => n + t.branches.filter(b => b.seen).length, 0);
    const experience = [role === 3 ? 2 : role ? 1 : 0, household ? 1 : 0, p + u >= 4 && p + u >= free.length / 2 ? 2 : p + u >= 2 ? 1 : 0, both >= 2 ? 2 : both || branches >= 4 ? 1 : 0];
    const c = D.comments;
    const roleLine = passed[0] ? fill(c['역할'][0], { n: demand.length, k: dk }) : passed[1] ? fill(c['역할'][1], { n: signals.length, k: pk }) : early ? fill(c['역할'][2], { d: early.day + 1, 투자: T.upgrades[early.upgrade].name }) : fill(c['역할'][3], { n: demand.length, k: dk });
    const lines = [roleLine, ok('household') ? c['가계'][1] : changedDays.length ? fill(c['가계'][0], { n: changedDays.length, k: hk }) : c['가계'][2], fill(c['자유'][0], { f: free.length, p, u }), both ? fill(c['책임'][0], { n: both }) : fill(c['책임'][1], { k: branches })];
    const stars = slots.map((slot, i) => { const reason = ok(slot) ? (i === 1 ? 2 : 1) : 0, total = experience[i] + reason; const q = qs.find(q => q.slot === slot), rl = D.reasonLines;
      // 해 본 것(플레이 기록)과 까닭 알기(인터뷰)를 각자의 문장과 짝지어 보여 준다.
      const expLine = i === 1 ? (changedDays.length ? fill(c['가계'][0], { n: changedDays.length, k: hk }) : c['가계'][2]) : lines[i];
      const reasonLine = !q ? rl.none : ok(slot) ? (i === 1 ? c['가계'][1] : rl.ok) : i === 2 ? D.freedom[q.id] : rl.other;
      return { slot, label: D.labels[i], experience: experience[i], reason, expMax: i === 1 ? 1 : 2, reasonMax: i === 1 ? 2 : 1, value: total >= 3 ? 3 : total === 2 ? 2 : 1, line: lines[i], expLine, reasonLine,
        checks: i === 0 ? D.roleChecks.map((name, j) => ({ name, ok: passed[j] })) : null }; });
    const locked = hs.filter(h => h.locked), f = qs.find(q => q.slot === 'freedom');
    const freedomLine = f ? ok('freedom') ? D.rightAnswer : D.freedom[f.id] : '';
    const lockedLine = locked.length ? fill(c['자유'][1], { a: locked[0].day + 1, b: locked[locked.length - 1].day + 1, n: locked.length }) : '';
    const cards = qs.filter(q => q.slot !== 'freedom').map(q => makeCard(G, q, answers[q.id]));
    const last = pastPlays[pastPlays.length - 1];
    const previous = last ? analyze(last, last.answers || {}, pastPlays.slice(0, -1)) : null;
    const compare = previous ? { type: previous.type, changes: stars.flatMap((s, i) => s.value === previous.stars[i].value ? [] : [{ label: s.label, before: previous.stars[i].value, after: s.value, arrow: s.value > previous.stars[i].value ? '▲' : '▼' }]) } : null;
    const lowest = stars.reduce((a, b) => b.value < a.value ? b : a), at = slots.indexOf(lowest.slot);
    const untried = table.find(t => !t.both);
    const challenge = at === 0 ? c['다음 판 도전'][passed[0] ? passed[1] ? 2 : 1 : 0] : at === 1 ? c['다음 판 도전'][3] : at === 2 ? c['다음 판 도전'][4] : untried ? fill(c['다음 판 도전'][5], { '사건 제목': untried.title }) : '';
    return { type, axes, stars, cards, freedomLine, lockedLine, compare, challenge, table, hygiene: hygieneLine([...pastPlays, G]), evidence: { passed, demand: { n: demand.length, k: dk }, price: { n: signals.length, k: pk }, household: { n: changedDays.length, k: hk } } };
  }
  // 카드 조사: 숫자 끝소리가 영·삼·육이면 '으로'
  function hygieneLine(plays) {
    const i = plays.findIndex(p => (p.history || []).some(h => h.upgrade === 'clean'));
    if (i < 0) return '위생 점검: 아직 해 보지 않았어요.';
    const p = plays[i], hadComplaint = (p.schedule || []).some(d => (d.id || d) === 'complaint'), skipped = hadComplaint && !(p.trail || []).some(t => t.root === 'complaint');
    return `위생 점검: ${i + 1}판째에 함${skipped ? ' → 그 판에는 머리카락 불만이 없었어요.' : ''}`;
  }
  function makeCard(G, q, answer) {
    const h = G.history.find(h => h.day === q.day), prev = G.history[G.history.indexOf(h) - 1], d = D.cards[q.id];
    const trail = (G.trail || []).filter(t => t.root === q.event?.root && !t.start);
    const following = trail.map(t => `${t.day + 1}일째 ${t.title}${t.pick ? ` · ${t.pick}` : ''}${t.fx?.money ? ` · ${num(t.fx.money)}원` : ''}`).join(' → ');
    const v = { ...q.values, A: h.portions, B: h.served, C: h.leftover, D: num(h.leftover * h.ingredient), X: num(h.price), Y: Number(h.taste).toFixed(1), '이어진 일': following, 'trail 이어진 일: 예) 5일째 푸드트럭 등장 → 6일째 신고, 과징금 4만 원': following };
    if (q.id === 'B1') v.B = h.turned;
    if (q.id === 'B3') Object.assign(v, { X: num(prev.price), Y: num(h.price), A: prev.served, B: h.served });
    if (q.id === 'B4') {
      const up = T.upgrades[h.upgrade], before = G.history.filter(x => x.day < h.day), after = G.history.filter(x => x.day >= h.day);
      Object.assign(v, { A: num(up.cost), B: average(before, 'served').toFixed(1), C: average(after, 'served').toFixed(1) });
      v['맛 3.0 → 4.0 / 판매 한도 40 → 55그릇 / 평판 / 지나가는 아이 등 실제 바뀐 것'] = up.taste ? `맛 ${((h.taste || T.start.taste) - up.taste).toFixed(1)} → ${h.taste.toFixed(1)}` : up.cap ? `판매 한도 ${h.cap - up.cap} → ${h.cap}그릇` : up.rep ? `평판 +${up.rep}` : `지나가는 아이 +${up.visitors * 100}%`;
    }
    if (q.id === 'B5') Object.assign(v, { B: h.visitors, C: h.served });
    if (q.slot === 'household') { const g = q.id === 'G1' ? h.rivalReason : h.mineReason; Object.assign(v, { A: q.id === 'G1' ? rivalCount(h) : h.served, B: g.count, '까닭 1위': why(g) }); }
    if (q.id === 'S4') v.M = trail.find(t => t.id === 'grandmaAsk')?.day + 1;
    if (q.id === 'S8') v.M = trail.find(t => t.id === 'warEnd')?.day + 1;
    const option = q.options.find(o => o.id === answer);
    let event = fill(d.event, v);
    if (q.id === 'B2' && !Number.isFinite(h.ingredient)) event = '';
    // 아직 이어지지 않은 사건은 실제로 확인한 기록까지만 보여 준다.
    if (['S3', 'S4', 'S5', 'S8'].includes(q.id) && !trail.length || ['S4', 'S8'].includes(q.id) && !Number.isFinite(v.M)) event = following;
    // 확정 문장의 고정 수치와 실제 효과가 다르면 기록만 쓰고 새 문장은 만들지 않는다.
    if (q.id === 'S4' && (G.history.filter(x => x.day >= h.day && x.day < h.day + 3).length < 3 || G.history.some(x => x.day >= h.day && x.day < h.day + 3 && x.ingredient !== 500))) event = following;
    if (q.id === 'S6' && h.rep > 4.2 || q.id === 'S7' && h.rep > 4.7) event = '';
    return { id: q.id, slot: q.slot, action: fill(d.action, v).replace(/([0-9])로 장사/, (m, n) => `${n}${'036'.includes(n) ? '으로' : '로'} 장사`), event, concept: d.concept, last: option ? fill(option.ok ? D.cardOk : D.cardOther, { 보기: option.text, '실제 까닭': fill(d.reason, v) }) : '', answer: option?.text || '' };
  }
  function record(G, answers) {
    const now = new Date(), date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return JSON.parse(JSON.stringify({ seed: G.seed, rivalId: G.rivalId, ended: G.ended, history: G.history, trail: G.trail, schedule: G.schedule.map(d => typeof d === 'string' ? d : d.id), answers, date }));
  }
  root.TteokResult = { interview, analyze, record };
})(typeof window !== 'undefined' ? window : globalThis);
