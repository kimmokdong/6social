/* 첫 화면은 완성된 그림으로 열고, 해당 게임의 나머지 그림도 시작 전에 준비합니다. */
(() => {
  'use strict';
  const game = document.currentScript.dataset.game;
  const theme = {
    'samgwon-swipe': ['삼권 스와이프', '취임 준비 중…', '서류와 대표님 사진을 준비하고 있어요.', '서류'],
    'fake-traveler': ['가짜 여행자를 찾아라!', '여행 증거 정리 중…', '여행 사진과 증거 카드를 펼치고 있어요.', '사진'],
    'daon-city': ['다온시 70년', '도시 계획을 펼치는 중…', '우리 도시의 풍경을 준비하고 있어요.', '도시'],
    'tteok-tycoon': ['떡볶이 타이쿤', '오늘의 영업 준비 중…', '손님과 가게의 하루를 준비하고 있어요.', '냄비'],
    'trade-king': ['무역왕', '출항 준비 중…', '지도와 항구에 짐을 싣고 있어요.', '배']
  }[game];
  const plan = window.GAME_IMAGE_LIST[game], loaded = new Set(), failed = new Set(), pictures = [];
  const absolute = path => new URL(path, location.href).href;
  const urls = [...new Set([...plan.home, ...plan.all])], deadline = Date.now() + 12000;
  let completed = 0, finished = false;
  const panel = document.createElement('aside');
  panel.className = 'game-preparation'; panel.dataset.game = game;
  panel.setAttribute('role', 'status');
  panel.innerHTML = `<div class="prep-card"><div class="prep-art" aria-label="${theme[3]}"><span></span><span></span><span></span></div><p class="prep-name">${theme[0]}</p><h1>${theme[1]}</h1><p class="prep-copy">${theme[2]}</p><progress max="${urls.length}" value="0" aria-label="게임 이미지 준비"></progress><p class="prep-count">0 / ${urls.length}</p></div>`;
  panel.querySelector('progress').setAttribute('aria-label', '게임 이미지 준비');
  document.body.classList.add('game-preparing'); document.body.append(panel);
  const starts = 'button[data-action="new"],button[data-action="continue"],button[data-action="start"],button[data-action="resume"],button[data-action="liar"],button[data-action="passport"]';
  function blockStarts() {
    if (finished) return;
    document.querySelectorAll(starts).forEach(button => {
      if (!button.disabled) { button.disabled = true; button.dataset.startupBlocked = ''; }
    });
  }
  const observer = new MutationObserver(blockStarts);
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
  function load(path) {
    const url = absolute(path);
    if (Date.now() >= deadline) { failed.add(url); completed++; update(); return Promise.resolve(); }
    return new Promise(resolve => {
      const img = new Image(); pictures.push(img);
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        (ok ? loaded : failed).add(url); completed++; update(); resolve();
      };
      const timer = setTimeout(() => { finish(false); img.src = ''; }, Math.max(0, deadline - Date.now()));
      img.onload = () => img.decode().then(() => finish(true), () => finish(false));
      img.onerror = () => finish(false);
      img.src = url;
    });
  }
  function update() {
    panel.querySelector('progress').value = completed;
    panel.querySelector('.prep-count').textContent = `${completed} / ${urls.length}`;
  }
  const home = Promise.all(plan.home.map(load));
  let cursor = 0;
  const rest = urls.filter(path => !plan.home.includes(path));
  async function worker() { while (cursor < rest.length) await load(rest[cursor++]); }
  const ready = Promise.all([home, ...Array.from({ length: 6 }, worker)]).then(() => {
    finished = true; observer.disconnect();
    document.querySelectorAll('[data-startup-blocked]').forEach(button => { button.disabled = false; delete button.dataset.startupBlocked; });
    document.body.classList.remove('game-preparing');
    if (failed.size) {
      panel.classList.add('prep-home', 'prep-failed');
      panel.querySelector('h1').textContent = '일부 그림은 기본 그림으로 시작해요';
      panel.querySelector('.prep-copy').textContent = '그림을 받지 못해도 게임은 계속할 수 있어요.';
    } else panel.remove();
  });
  home.then(() => { document.body.classList.remove('game-preparing'); panel.classList.add('prep-home'); });
  window.GameAssets = { ready, get finished() { return finished; }, isReady: path => loaded.has(absolute(path)), isFailed: path => failed.has(absolute(path)) };
})();
