/* 무역왕 오프닝 영상 대본 — 자막·내레이션은 이 파일만 고치면 된다.
   ┌ 고쳐도 되는 칸 ─────────────────────────────────────────────
   │ line  : 아래쪽 자막(내레이션과 같은 글). 줄을 바꾸려면 \n.
   │ ch    : 위쪽 장 제목(예: '무역'). 빈 글('')이면 제목을 지운다. 칸이 없으면 앞 제목을 그대로 둔다.
   │ voice : 내레이션 파일 이름. shared-art/trade/v6/voice/ 폴더에 넣는다(mp3·m4a·ogg).
   │         파일이 없으면 → 브라우저 음성(있을 때)으로 읽거나 자막만 나온다.
   │         녹음이 컷보다 길면 그 컷이 녹음 길이만큼 저절로 늘어난다(자막과 음성이 어긋나지 않게).
   │ len   : 컷 길이(초). 자막이 없는 컷은 앞 자막이 이어서 나온다.
   └ 화면(img·kind·cam·o·grade·tin·again)은 영상 연출이다. 바꾸지 않아도 된다.
   │ sfx   : 그 컷의 효과음 파일(shared-art/trade/v6/sound/). sfxAt = 컷 시작 몇 초 뒤에 낼지. 파일이 없으면 조용히 건너뛴다.
   │ music : 아래 music 목록. 파트마다 배경음악 하나, from~to 컷 동안 반복하며 다음 파트로 겹쳐 넘어간다.
   │         내레이션이 나오는 동안은 음악이 저절로 작아진다.
   녹음 대본은 아래 line들을 위에서부터 차례로 읽으면 된다(op_01 ~ op_16). */
(function (root) {
  const A = '../shared-art/trade/', C = A + 'v6/cine/';
  root.TRADE_OPENING = {
    voiceDir: A + 'v6/voice/',
    rate: .9,          // 브라우저 음성(파일이 없을 때) 빠르기
    soundDir: A + 'v6/sound/',
    // 한 파일 방식: 배경음악과 효과음을 섞은 파일 하나(약 93초). 이 파일이 있으면 아래 music·sfx 대신 이것만 쓴다.
    // 영상 첫 장면과 함께 0초부터 재생된다. 장면별 시각표는 sound/README.txt.
    soundtrack: 'soundtrack.mp3',
    // 한 파일과 함께 효과음(sfx)도 틀지. 빼고 싶은 효과음은 sfxOff에 파일 이름을 적는다(예: ['sfx_harbor.mp3']). 2026-10-24: 24개 모두 넣기로 함.
    sfxWithTrack: true,
    sfxOff: [],
    // 소리 크기(0~1): 음악, 내레이션 중 음악, 효과음, 한 파일, 내레이션 중 한 파일
    volume: {music: .5, duck: .2, sfx: .7, track: .8, trackDuck: .35},
    // 효과음 이름(sfx-demo.html과 영상 속 '지금 나는 효과음' 표시에 쓴다)
    sfxNames: {'sfx_waves.mp3': '파도', 'sfx_harbor.mp3': '갈매기·항구', 'sfx_harvest.mp3': '낫질', 'sfx_oilpump.mp3': '펌프', 'sfx_pickaxe.mp3': '곡괭이', 'sfx_loom.mp3': '베틀',
      'sfx_forge.mp3': '대장간 망치', 'sfx_tech.mp3': '전자음', 'sfx_wind.mp3': '쓸쓸한 바람', 'sfx_stamp.mp3': '도장', 'sfx_crates.mp3': '상자 싣기', 'sfx_horn.mp3': '뱃고동',
      'sfx_bell.mp3': '배 종', 'sfx_sea.mp3': '항해하는 배들', 'sfx_thunder.mp3': '천둥', 'sfx_cannon.mp3': '대포', 'sfx_fire.mp3': '불길', 'sfx_sparkle.mp3': '반짝임',
      'sfx_crowd.mp3': '시장 소음', 'sfx_firework.mp3': '불꽃놀이', 'sfx_city.mp3': '공사·도시', 'sfx_cheer.mp3': '환호', 'sfx_fanfare.mp3': '팡파르', 'sfx_whoosh.mp3': '제목 효과'},
    // 파트별 배경음악: from~to = 컷 번호(0부터). 파일이 없으면 그 파트는 음악 없이.
    music: [
      {file: 'm1_sea.mp3', from: 0, to: 1},        // 바다의 시대: 신비롭고 잔잔하게
      {file: 'm2_work.mp3', from: 2, to: 8},       // 기르고·만들고: 일하는 리듬
      {file: 'm3_trade.mp3', from: 9, to: 13},     // 무역: 모험·항해
      {file: 'm4_trial.mp3', from: 14, to: 16},    // 시련: 긴장
      {file: 'm5_chance.mp3', from: 17, to: 19},   // 기회: 밝고 신나게
      {file: 'm6_glory.mp3', from: 20, to: 23}     // 번영~끝: 웅장한 주제
    ],
    shots: [
      {kind: 'clouds', len: 6.5, ch: '바다의 시대', line: '아주 오래전, 넓은 바다 위에 여러 나라가 있었습니다.', voice: 'op_01.mp3', sfx: 'sfx_waves.mp3', cam: [[1.25, 0, 4], [2.4, 0, -2]], o: '50% 58%', tin: {t: 'fadeblack', d: 1.6}},
      {img: A + 'v6/home_1.webp', len: 4.5, line: '나라마다 잘하는 일이 달랐습니다.', voice: 'op_02.mp3', sfx: 'sfx_harbor.mp3', cam: [[1, 0, 0], [1.2, -1, -2]], o: '52% 60%', tin: {t: 'zoomthrough', d: 1.5}},
      {img: C + 'res_food.webp', len: 2, ch: '기르고 · 캐내고', line: '땅에서 기르고, 캐내고,', voice: 'op_03.mp3', sfx: 'sfx_harvest.mp3', cam: [[1.15, 4, 0], [1.15, -3, 0]], tin: {t: 'whip', d: .8}},
      {img: C + 'res_oil.webp', len: 2, sfx: 'sfx_oilpump.mp3', cam: [[1.15, 4, 0], [1.15, -3, 0]], tin: {t: 'whip', d: .8}},
      {img: C + 'res_ore.webp', len: 2, sfx: 'sfx_pickaxe.mp3', cam: [[1.15, 4, 0], [1.15, -3, 0]], tin: {t: 'whip', d: .8}},
      {img: C + 'res_cloth.webp', len: 2, ch: '만들고 · 다듬고', line: '만들고, 다듬었습니다.', voice: 'op_04.mp3', sfx: 'sfx_loom.mp3', cam: [[1.12, 3, 0], [1.12, -3, 0]], tin: {t: 'whip', d: .8}},
      {img: C + 'res_steel.webp', len: 2.1, sfx: 'sfx_forge.mp3', cam: [[1.05, 0, 0], [1.22, 1, 1]], o: '45% 45%', tin: {t: 'glow', d: 1, c: '#ff8a1e'}},
      {img: C + 'res_tech.webp', len: 2.3, sfx: 'sfx_tech.mp3', cam: [[1.22, 0, 0], [1.05, 0, 0]], tin: {t: 'glow', d: 1.1, c: '#ffb24a', c2: '#4aa8ff'}},
      {img: A + 'end_island.webp', len: 4.8, ch: '', line: '하지만 필요한 것을 모두 혼자 만들 수 있는 나라는 없었습니다.', voice: 'op_05.mp3', sfx: 'sfx_wind.mp3', cam: [[1.12, 3, 0], [1.12, -2, 0]], grade: 'saturate(.68) brightness(.9)', tin: {t: 'slowdip', d: 1.9}},
      {img: C + 'trade_deal.webp', len: 3.4, ch: '무역', line: '그래서 사람들은 약속을 맺고,', voice: 'op_06.mp3', sfx: 'sfx_stamp.mp3', sfxAt: 0.6, cam: [[1.05, 0, 0], [1.38, 0, -6]], o: '50% 76%', tin: {t: 'dissolve', d: 1.1}},
      {img: C + 'trade_load.webp', len: 3, line: '남는 것을 배에 실어', voice: 'op_07.mp3', sfx: 'sfx_crates.mp3', cam: [[1.18, 0, -4], [1.18, 0, 4]], tin: {t: 'tiltup', d: 1}},
      {img: C + 'trade_voyage.webp', len: 3.4, line: '먼바다를 건넜습니다.', voice: 'op_08.mp3', sfx: 'sfx_horn.mp3', cam: [[1.2, 4, 0], [1.2, -4, 0]], tin: {t: 'push', d: 1.1}},
      {img: C + 'trade_arrive.webp', len: 3.4, line: '그리고 모자란 것을 사 왔습니다.', voice: 'op_09.mp3', sfx: 'sfx_bell.mp3', cam: [[1.2, 4, 0], [1.2, -3, 0]], tin: {t: 'push', d: 1.1}},
      {kind: 'sea', len: 4.2, line: '수많은 배가 바다를 오갔습니다.', voice: 'op_10.mp3', sfx: 'sfx_sea.mp3', cam: [[1, 0, 0], [1.07, 0, 0]], tin: {t: 'pullback', d: 1.4}},
      {img: C + 'ev_storm.webp', len: 2.5, ch: '시련', line: '바다는 늘 평온하지 않았습니다.', voice: 'op_11.mp3', sfx: 'sfx_thunder.mp3', cam: [[1.08, 0, 0], [1.2, 0, 0]], grade: 'brightness(.92)', tin: {t: 'lightning', d: 1}, again: 1.5},
      {img: C + 'ev_pirates.webp', len: 2.5, sfx: 'sfx_cannon.mp3', cam: [[1.05, 0, 0], [1.2, 2, 0]], o: '30% 40%', grade: 'brightness(.92)', tin: {t: 'fog', d: 1.7}},
      {img: C + 'ev_fire.webp', len: 2.5, sfx: 'sfx_fire.mp3', cam: [[1.15, -2, 0], [1.15, 2, 0]], tin: {t: 'smoke', d: 1.6}},
      {img: C + 'ev_invention.webp', len: 2.3, ch: '기회', line: '하지만 뜻밖의 기회도 찾아왔습니다.', voice: 'op_12.mp3', sfx: 'sfx_sparkle.mp3', cam: [[1.25, 0, 0], [1.05, 0, 0]], tin: {t: 'sunray', d: 1.5}},
      {img: C + 'ev_market.webp', len: 2.1, sfx: 'sfx_crowd.mp3', cam: [[1.15, 3, 0], [1.15, -3, 0]], tin: {t: 'confetti', d: .8}},
      {img: C + 'ev_festival.webp', len: 2.5, sfx: 'sfx_firework.mp3', sfxAt: 0.1, cam: [[1.05, 0, 0], [1.2, 0, -2]], o: '70% 25%', tin: {t: 'firework', d: 1}},
      {kind: 'grow', len: 7, ch: '번영', line: '배가 오갈수록 작은 항구는 도시가 되었고,', voice: 'op_13.mp3', sfx: 'sfx_city.mp3', cam: [[1, 0, 0], [1.12, 0, -1]], tin: {t: 'dissolve', d: 1.3}},
      {img: A + 'end_king.webp', len: 4, line: '사람들의 식탁은 풍요로워졌습니다.', voice: 'op_14.mp3', sfx: 'sfx_cheer.mp3', cam: [[1.05, 0, 0], [1.22, 0, 1]], tin: {t: 'warm', d: 1.3}},
      {img: C + 'finale.webp', len: 6, line: '무역으로 함께 자란 나라. 바다의 무역왕.', voice: 'op_15.mp3', sfx: 'sfx_fanfare.mp3', sfxAt: 0.8, cam: [[1.5, -4, 0], [1.03, 0, 0]], o: '60% 55%', tin: {t: 'dissolve', d: 1.6}},
      {kind: 'title', len: 6.5, ch: '', line: '이제, 당신의 나라가 바다로 나아갈 차례입니다.', voice: 'op_16.mp3', sfx: 'sfx_whoosh.mp3', sfxAt: 2.4, cam: [[1.25, 0, 2], [1.05, 0, 0]], tin: {t: 'dissolve', d: 1.3}}
    ]
  };
})(globalThis);
