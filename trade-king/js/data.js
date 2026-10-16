/* 무역왕 — 콘텐츠·규칙 데이터
 * 2022 개정 6학년 사회: 세계 여러 나라와의 경제 교류(무역이 필요한 까닭, 서로 기대는 경제, 무역 갈등과 해결)
 * 플레이어: 다온국의 무역 대표. 자원은 거의 없고 기술(반도체)이 있는 나라.
 * 목표: 12년 동안 국민 행복(밥상·불빛·일자리)을 가득 채우기. 돈과 신뢰는 목표가 아니라 수단이다. */
window.TRADE = {
  years: 8,                                        // 8년: 수업 25분 안에 한 판
  actionsPerYear: 3,
  start: { money: 200, ships: 2, factory: 2, gauges: { food: 2, energy: 2, jobs: 2 }, trustMet: 2, trustNew: 1 },
  shipCost: 60, maxShips: 4, shipLoad: 4,          // 배 한 척이 한 번에 싣는 양
  factory: { cost: 50, max: 4 },                   // 한 해에 조립할 수 있는 완성품 수(투자로 +1)
  tech: { cost: 70, chipPerYear: 1 },              // 기술 개발: 반도체 생산 +1 (한 번만)
  home: { chipPerYear: 2 },                        // 우리 기술: 해마다 반도체 2개

  /* 물건: price = 기준값(동전) */
  goods: {
    grain:   { name: '곡물',      price: 5,  icon: 'grain' },
    oil:     { name: '석유',      price: 6, icon: 'oil' },
    iron:    { name: '철광석',    price: 8,  icon: 'iron' },
    lithium: { name: '리튬',      price: 12, icon: 'lithium' },
    rare:    { name: '희귀 금속', price: 15, icon: 'rare' },
    rubber:  { name: '고무',      price: 8,  icon: 'rubber' },
    chip:    { name: '반도체',    price: 20, icon: 'chip' }
  },
  /* 완성품: 부품 3개(서로 다른 나라에서 와야 함) → 우리 공장에서 조립 */
  products: {
    phone: { name: '스마트폰', parts: ['chip', 'rare', 'lithium'], price: 80, icon: 'phone' },
    car:   { name: '자동차',   parts: ['chip', 'iron', 'rubber'],  price: 65, icon: 'car' },
    ev:    { name: '전기차',   parts: ['chip', 'lithium', 'iron'], price: 70, icon: 'ev' }
  },
  /* 판마다 하나: 다온국의 특기 — 그 완성품은 값 +15, 일자리 2배 */
  specialties: {
    phone: { name: '스마트폰 강국', bonus: 15 },
    car:   { name: '자동차 강국',   bonus: 15 },
    ev:    { name: '전기차 강국',   bonus: 15 }
  },

  /* 국민에게 해마다 필요한 것 (from: 몇 년째부터) */
  needs: [                                          // 1년째는 준비하는 해: 국민이 아직 창고를 쓰지 않음
    { from: 2, grain: 2, oil: 2 },
    { from: 5, grain: 3, oil: 2 }
  ],
  /* 주문서: 해마다 사 주는 나라가 완성품을 주문. 기한 안에 배달하면 보너스 돈 + 일자리 별 */
  orders: { max: 2, years: 3, bonus: 0.6, jobs: 1 },
  /* 행복 게이지(0~5): 해마다 끝에 바뀜 */
  gaugeRules: {
    need: { full: 2, half: 1, little: -1, none: -2 },        // 필요한 만큼 / 절반 이상 / 조금 / 하나도 없음
    jobs: [{ made: 2, d: 2 }, { made: 1, d: 1 }, { made: 0, d: -1 }]  // 이번 해 조립한 완성품 수(특기는 2배로 셈)
  },

  /* 나라 카드 10종 — 판마다 6개(해협형 지도에선 해협 섬나라 고정)
   * sells: 해마다 팔 수 있는 양 / buys: 해마다 사 주는 완성품 수 / market: 완성품 사 주는 값 배율 */
  countries: {
    oilKingdom:  { name: '석유 왕국',     emblem: 'drop',    color: '#D9A21E', sells: { oil: 4 },               buys: { car: 2, phone: 1 },     market: 1.0,  trait: 'resource', traitText: '석유값을 마음대로 올려요' },
    plains:      { name: '대평원국',      emblem: 'wheat',   color: '#8DB34A', sells: { grain: 5, rubber: 1 },  buys: { car: 2 },               market: 1.0,  trait: 'fta',      traitText: 'FTA를 좋아해요' },
    factoryIsle: { name: '공장 섬',       emblem: 'gear',    color: '#6B7A8F', sells: { rubber: 2, iron: 2 },   buys: {},                       market: 1.0,  trait: 'assembly', traitText: '싸게 대신 만들어 준대요' },
    chipLand:    { name: '반도체 강국',   emblem: 'chip',    color: '#3B6FE0', sells: { chip: 2, rare: 1 },     buys: { phone: 1 },             market: 0.9,  trait: 'rival',    traitText: '우리와 경쟁하는 나라' },
    straitIsle:  { name: '해협 섬나라',   emblem: 'wave',    color: '#2BA3B5', sells: { grain: 1 },             buys: { phone: 1 },             market: 1.0,  trait: 'strait',   traitText: '해협을 지키고 통행료를 받아요' },
    bigMarket:   { name: '큰 시장국',     emblem: 'basket',  color: '#7B52D3', sells: { grain: 2, iron: 2 },    buys: { phone: 3, car: 3, ev: 3 }, market: 1.2, trait: 'tariff',  traitText: '많이 사 주지만 관세를 좋아해요' },
    hubCity:     { name: '무역항 도시국', emblem: 'anchor',  color: '#E0533C', sells: { any: 2 },               buys: { any: 2 },               market: 0.85, trait: 'hub',      traitText: '무엇이든 사고팔지만 수수료가 붙어요', anyMarkup: 1.25 },
    forest:      { name: '숲의 나라',     emblem: 'tree',    color: '#2E9E6B', sells: { rubber: 3, grain: 1 },  buys: { ev: 2 },                market: 1.1,  trait: 'green',    traitText: '깨끗한 물건을 좋아해요' },
    lithiumHigh: { name: '리튬 고원국',   emblem: 'crystal', color: '#C04F8A', sells: { lithium: 3, rare: 1 },  buys: { phone: 2 },             market: 1.0,  trait: 'credit',   traitText: '외상 거래를 잘 해 줘요' },
    northIce:    { name: '얼음 북방국',   emblem: 'snow',    color: '#7FB5DA', sells: { rare: 3, oil: 1 },      buys: { car: 1, ev: 1 },        market: 1.1,  trait: 'frozen',   traitText: '겨울엔 바닷길이 얼어요', frozenYears: [3, 6, 9, 12] }
  },
  countriesPerGame: 6,
  /* 판을 만들 때 꼭 있어야 하는 것: 곡물·석유를 파는 나라, 완성품 2종 이상의 부품, 완성품을 사 주는 곳 */
  coverage: { needGoods: ['grain', 'oil'], minProducts: 2, minBuyers: 2 },

  /* 나라 성격 — 판마다 나라마다 무작위
   * ask: 우리에게 팔 때 부르는 값 배율, bid: 우리 물건을 살 때 주는 값 배율 */
  personalities: {
    /* haggle: '깎기'가 통하는 믿음(♥) 수. 변덕쟁이는 홀수 해에만 통함 */
    loyal:  { name: '의리파',   hint: '약속을 지키면 값을 잘 깎아 줘요', ask: 0.95, bid: 1.05, trustStep: 0.06, memory: 2, haggle: 2 },
    tough:  { name: '깐깐이',   hint: '흥정이 어려워요',               ask: 1.1,  bid: 0.9,  trustStep: 0.04, memory: 1, haggle: 4 },
    fickle: { name: '변덕쟁이', hint: '해마다 기분이 달라요',          ask: [0.85, 1.25], bid: [0.8, 1.2], trustStep: 0.05, memory: 1, haggle: 3 },
    proud:  { name: '자존심파', hint: '존중하면 잘 대해 줘요',         ask: 1.0,  bid: 1.0,  trustStep: 0.07, memory: 3, haggle: 3 }
  },
  /* 흥정: 아이가 고르는 3단계 값. 나라가 받아들이는지는 숨겨진 값(ask·bid × 신뢰)과 비교 */
  offers: { low: 0.8, fair: 1.0, high: 1.2 },
  trust: { max: 5, dealsPerHeart: 2 },             // 거래 2번 성공마다 신뢰 +1
  contract: { years: 3, discount: 0.9 },           // 3년 계약: 해마다 자동 배송, 값 10% 할인

  /* 지도 틀 4종 — 1000×640 해도 위의 항구 자리와 항로. 판마다 좌우·상하 뒤집기도 무작위.
   * lanes: [자리, 자리, 종류]  종류: 기본(1년) far(먼바다 2년) storm(폭풍 바다: 태풍 철엔 +1년) strait(해협: 통행료, 봉쇄될 수 있음)
   * lands: 같은 땅덩이에 있는 자리 묶음(그림용) / home: 다온국이 시작할 수 있는 자리 / fixed: 꼭 들어갈 나라 */
  maps: {
    archipelago: { name: '섬 군도', slots: { a: [223, 445], b: [234, 130], c: [338, 97], d: [444, 326], e: [503, 232], f: [574, 436], g: [739, 119], h: [755, 357], i: [828, 491] },
      lanes: [['a', 'b'], ['a', 'd'], ['b', 'c'], ['b', 'd'], ['c', 'd'], ['c', 'e', 'far'], ['d', 'e', 'storm'], ['d', 'f'], ['e', 'f'], ['e', 'g'], ['e', 'h'], ['f', 'h'], ['g', 'h'], ['h', 'i'], ['f', 'i', 'storm']],
      lands: [['a'], ['b'], ['c'], ['d'], ['e'], ['f'], ['g'], ['h'], ['i']], home: ['a', 'b', 'f'] },
    strait: { name: '해협', slots: { w1: [228, 250], w2: [230, 493], w3: [326, 365], s: [540, 329], e1: [618, 174], e2: [789, 354], e3: [628, 467], n: [517, 92], so: [499, 532] },
      lanes: [['w1', 'w2'], ['w1', 'w3'], ['w2', 'w3'], ['w3', 's', 'strait'], ['s', 'e1', 'strait'], ['s', 'e3', 'strait'], ['e1', 'e2'], ['e2', 'e3'], ['w1', 'n', 'far'], ['n', 'e1', 'far'], ['w2', 'so', 'far'], ['so', 'e3', 'far']],
      lands: [['w1', 'w2', 'w3'], ['e1', 'e2', 'e3'], ['s'], ['n'], ['so']], home: ['w1', 'w2'], fixed: { s: 'straitIsle' } },
    inland: { name: '가운데 바다', slots: { n: [502, 104], ne: [766, 144], e: [856, 319], se: [734, 439], s: [484, 460], sw: [234, 421], w: [165, 257], nw: [258, 129], c: [499, 244] },
      lanes: [['n', 'ne'], ['ne', 'e'], ['e', 'se'], ['se', 's'], ['s', 'sw'], ['sw', 'w'], ['w', 'nw'], ['nw', 'n'], ['n', 'c'], ['e', 'c', 'storm'], ['s', 'c'], ['w', 'c']],
      lands: [['nw', 'n', 'ne'], ['e'], ['se', 's', 'sw'], ['w'], ['c']], home: ['w', 'sw', 'nw'] },
    continent: { name: '큰 대륙', slots: { cw: [246, 367], cn: [566, 283], ce: [649, 352], i1: [156, 107], i2: [114, 481], i3: [907, 133], i4: [870, 504], i5: [517, 488], i6: [281, 491] },
      lanes: [['cw', 'cn', 'far'], ['cn', 'ce', 'far'], ['cw', 'i1'], ['cw', 'i2'], ['cn', 'i1'], ['cn', 'i3'], ['ce', 'i3'], ['ce', 'i4'], ['cw', 'i6'], ['i6', 'i5'], ['i5', 'ce', 'storm'], ['i2', 'i6'], ['i4', 'i5']],
      lands: [['cw', 'cn', 'ce'], ['i1'], ['i2'], ['i3'], ['i4'], ['i5'], ['i6']], home: ['i1', 'i2', 'i6'] }
  },
  laneYears: { normal: 1, far: 2, storm: 1, strait: 1 },
  stormSeason: [4, 5, 10, 11],      // 태풍 철: 폭풍 바다 +1년 (지도에 미리 보여 줌)
  toll: 5,                          // 해협 통행료(한 번 지날 때)

  /* 대통령의 꿈 — 판마다 하나, 이루면 보너스 별 */
  dreams: [
    { id: 'phones',   name: '스마트폰 강국',    goal: '스마트폰 4대 만들기' },
    { id: 'friends',  name: '모두와 친구',      goal: '3나라와 믿음 ♥3 이상' },
    { id: 'fullFood', name: '배부른 나라',      goal: '8년째 밥상 별 5개' },
    { id: 'explorer', name: '바다의 탐험가',    goal: '5년 안에 모든 나라 만나기' },
    { id: 'partners', name: '무역 친구 다섯',   goal: '4나라와 두 번 이상 거래' },
    { id: 'evs',      name: '깨끗한 자동차',    goal: '전기차 3대 만들기' }
  ],

  /* ───── 해마다 나오는 세계 소식 ─────
   * 첫해는 소식 없음. needs: 이 나라가 판에 있어야 나옴.
   * 효과: price:{물건,배율,해수} buy:{완성품,배율,해수} storm / block:{종류,해수} gauge:{food|energy|jobs} money trust:{나라|all|buyers, 값} next:[사건, 몇 년 뒤] */
  news: {
    oilSpike:   { title: '석유값 폭등!',       text: '석유가 모자라 값이 크게 올랐어요.',      needsAny: ['oilKingdom', 'northIce'], price: ['oil', 1.6, 2] },
    harvest:    { title: '곡물 풍년',          text: '올해는 곡물이 넉넉해요.',                price: ['grain', 0.7, 1] },
    drought:    { title: '가뭄',              text: '비가 안 와서 곡물값이 올랐어요.',         price: ['grain', 1.5, 2] },
    phoneBoom:  { title: '스마트폰 열풍',      text: '세계가 새 스마트폰을 원해요!',            buy: ['phone', 1.3, 2] },
    carSlump:   { title: '자동차 인기 시들',   text: '자동차가 잘 안 팔려요.',                  buy: ['car', 0.8, 1] },
    evBoom:     { title: '전기차 바람',        text: '깨끗한 자동차가 인기예요!',               buy: ['ev', 1.3, 2] },
    typhoon:    { title: '태풍 소식',          text: '폭풍 바다는 조심해서 돌아가요.',           storm: 1 },

    /* 정답 없는 위기 (공정·불공정과 상관없음) */
    exportBan:  { title: '수출 규제!', needsAny: ['chipLand', 'lithiumHigh'], char: 'country', text: '우리 희귀 금속은 2년 동안 다른 나라에 안 팔겠어요.',
      choice: [
        { key: 'a', label: '비싸게 미리 사 두기', stock: { rare: 3 }, fx: { money: -70 }, say: '희귀 금속 3개를 비싸게 사 뒀어요.' },
        { key: 'b', label: '다른 나라 찾기',      say: '다른 나라에서 구해 봐요.' },
        { key: 'c', label: '기술 개발하기',        fx: { money: -50 }, recipeSwap: ['phone', 'rare', 'chip'], say: '희귀 금속 대신 반도체를 하나 더 쓰는 기술을 만들었어요.' }],
      effect: { embargo: ['rare', 2] } },
    fta:        { title: 'FTA 제안', needsAny: ['plains', 'bigMarket'], char: 'country', text: '서로 관세를 없애고 마음껏 사고팔아요!',
      choice: [
        { key: 'a', label: '좋아요', fta: true, gauge: { jobs: -1 }, say: '수출은 쉬워졌지만, 값싼 곡물이 들어와 우리 농부들이 힘들어해요.' },
        { key: 'b', label: '조금 더 생각할게요', say: '지금처럼 지내요.' }] },
    blockade:   { title: '해협 봉쇄!', needsAny: ['straitIsle'], needsLane: 'strait', char: 'straitIsle', text: '2년 동안 해협을 막겠어요. 지나가려면 통행료를 세 배로 내요!',
      choice: [
        { key: 'a', label: '비싸도 해협으로',   tollMult: [3, 2], say: '통행료가 세 배예요.' },
        { key: 'b', label: '먼 길로 돌아가기', block: ['strait', 2], say: '해협을 피해 먼 길로 다녀요.' },
        { key: 'c', label: '협상하기',          fx: { money: -30 }, trust: { straitIsle: 1 }, say: '선물을 주고 해협을 다시 열었어요.' }] },
    outsource:  { title: '공장 섬의 제안', needsAny: ['factoryIsle'], char: 'factoryIsle', text: '우리가 대신 싸게 만들어 줄게요. 부품 하나는 빼 줄게요!',
      choice: [
        { key: 'a', label: '맡길게요', outsource: 3, say: '3년 동안 공장 섬에서 만들어요. 우리 공장은 조용해졌어요.' },
        { key: 'b', label: '우리가 만들래요', say: '우리 공장에서 계속 만들어요.' }] },
    creditOffer: { title: '외상 거래 제안', needsAny: ['lithiumHigh'], char: 'lithiumHigh', text: '리튬 3개를 먼저 줄게요. 2년 뒤에 스마트폰 1대로 갚아요!',
      choice: [
        { key: 'a', label: '고마워요!', stock: { lithium: 3 }, next: ['creditDue', 2], say: '리튬 3개를 받았어요. 2년 뒤에 갚아야 해요.' },
        { key: 'b', label: '괜찮아요', say: '지금은 필요 없어요.' }] },

    /* 사슬의 시작(공격적·불공정한 선택) — 그 자리에서 벌을 주지 않는다 */
    tariff: { title: '관세 소식', needsAny: ['bigMarket'], char: 'bigMarket', text: '우리 자동차 회사를 지키려고 다온국 자동차·전기차에 관세를 매기겠어요!',
      effect: { tariff: ['bigMarket', ['car', 'ev'], 0.7, 2] },
      choice: [
        { key: 'a', label: '우리도 관세로 맞서기', unfair: true, gauge: { jobs: 1 }, next: ['tariff2', 1], say: '우리 공장을 지켰다며 사람들이 박수를 쳐요!' },
        { key: 'b', label: '대화로 풀기',          fx: { money: -20 }, removeTariff: 'bigMarket', say: '조금 양보하고 관세를 없앴어요.' },
        { key: 'c', label: '다른 시장 찾기',        say: '큰 시장국 말고 다른 나라에 팔아 봐요.' }] },
    defect: { title: '수상한 부품', needsAny: ['factoryIsle'], char: 'factoryIsle', text: '조금 불량이지만 아주 싼 부품이 있어요. 올해 두 번까지 조립할 때 부품 하나를 덜 써요. 공장 칸 수는 그대로예요!',
      choice: [
        { key: 'a', label: '싸니까 써요', unfair: true, freePart: 2, next: ['recall', 1], say: '올해 두 번까지 조립할 때 부품 하나를 덜 써요. 공장 칸 수는 그대로예요.' },
        { key: 'b', label: '불량은 안 돼요', say: '좋은 부품만 써요.' }] },
    creditDue: { title: '갚을 때예요', char: 'lithiumHigh', text: '약속한 스마트폰 1대를 보내 줄래요?', chainStart: true,
      choice: [
        { key: 'a', label: '약속 지키기', payBack: 'phone', say: '약속을 지켰어요.' },
        { key: 'b', label: '아직 없다고 미루기', unfair: true, next: ['promiseAngry', 1], say: '내년에 주겠다고 했어요.' }] }
  },
  /* 첫해 뒤 해마다 하나씩, 판에 있는 나라에 맞는 소식 중에서 섞어 뽑는다. 사슬 시작 사건은 6년째 안에 나온다 */
  newsPlan: { chainRoots: ['tariff', 'defect', 'creditOffer'], chainBy: 6, crises: ['exportBan', 'fta', 'blockade', 'outsource'], market: ['oilSpike', 'harvest', 'drought', 'phoneBoom', 'carSlump', 'evBoom', 'typhoon'] },

  /* 사건 사슬 — 떡볶이 타이쿤과 같은 원칙: 어느 갈래로 가도 결국 처음 얻은 것보다 더 잃는다 */
  chains: {
    tariff:   { name: '관세 맞불', icon: 'tariff', branch: 'tariff2',
      lesson: '관세로 맞서면 상대도 또 맞서서 둘 다 손해를 봐요(무역 분쟁). 그래서 나라들은 대화와 국제기구로 갈등을 풀려고 해요.' },
    defect:   { name: '불량 부품', icon: 'gear', branch: 'recall',
      lesson: '나쁜 물건을 팔면 산 나라의 믿음을 잃어요. 믿음을 잃으면 다음 거래가 어려워져요.' },
    creditDue: { name: '외상 약속', icon: 'handshake', branch: 'promiseAngry',
      lesson: '약속을 어기면 그 나라뿐 아니라 소문을 들은 다른 나라도 거래를 꺼려요. 무역은 믿음으로 이어져요.' }
  },
  nodes: {
    /* 사슬은 '한 번 내고 끝'이 아니라 오래 남는 손해로 이어진다(시장이 움츠러듦·믿음을 잃어 장기 계약 거절).
     * noContract: [해수] — 그동안 어느 나라도 다온국과 새 장기 계약을 하지 않음 */
    tariff2: { chain: 'tariff', char: 'bigMarket', title: '관세 더 올림', text: '흥, 관세를 더 올리겠소! 3년 동안 우리 나라에선 다온국 완성품이 반값이오. 다툼이 커지자 세계 시장도 움츠러들어, 3년 동안 모든 나라가 다온국 물건을 반값으로만 사요.',
      effect: { tariff: ['bigMarket', ['car', 'ev', 'phone'], 0.5, 3] }, buy: ['all', 0.5, 3],
      options: [
        { key: 'a', label: '우리도 더 올리기', next: ['tradeWar', 1], say: '양쪽 다 관세를 높였어요. 다른 나라들도 걱정스럽게 지켜봐요.' },
        { key: 'b', label: '이제라도 대화',   fx: { money: -60 }, removeTariff: 'bigMarket', gauge: { jobs: -1 }, say: '협상비로 동전 60까지 내고 관세를 없앴어요. 일자리 별도 하나 줄었어요. 세계 시장 위축은 이어져요.' },
        { key: 'c', label: '다른 시장 찾기', fx: { money: -40 }, trust: { bigMarket: -2 }, say: '다른 시장을 찾는 준비비로 동전 40까지 썼어요. 큰 시장국의 신뢰가 두 칸 줄었어요. 관세와 세계 시장 위축은 정해진 기간까지 이어져요.' }] },
    tradeWar: { chain: 'tariff', char: 'bigMarket', title: '무역 전쟁', text: '무역 전쟁! 2년 동안 큰 시장국과 거래가 끊겨요. 세계 시장도 얼어붙어 3년 동안 모든 나라가 사 주는 값이 반값이 돼요. 일자리 별도 하나 줄어요.', effect: { closed: ['bigMarket', 2] }, buy: ['all', 0.5, 3], gauge: { jobs: -1 }, next: ['warEnd', 2] },
    warEnd:   { chain: 'tariff', char: 'bigMarket', title: '휴전', text: '큰 시장국의 관세와 거래 중단이 끝났어요. 다시 거래해요. 세계 시장의 위축은 남은 기간까지 이어져요.', removeTariff: 'bigMarket' },

    recall: { chain: 'defect', char: 'buyer', title: '불량 신고', text: '다온국 물건이 고장 났어요! 검사비로 30을 썼어요. 어떻게 할 거예요? 산 나라들의 믿음이 한 칸 줄고, 3년 동안 모든 나라가 우리 물건을 60% 값으로만 사요. 공장 일감이 줄어 일자리 별도 하나 내려가요.', fx: { money: -30 }, trust: { buyers: -1 }, buy: ['all', 0.6, 3], gauge: { jobs: -1 },
      options: [
        { key: 'a', label: '모두 바꿔 주기(리콜)', recall: 30, say: '판 물건마다 새것으로 바꿔 줬어요. 공장이 한동안 멈췄어요.' },
        { key: 'b', label: '모른 척하기',          next: ['badRumor', 1], say: '대답하지 않았어요.' },
        { key: 'c', label: '공장 섬 탓하기',        trust: { factoryIsle: -5, buyers: -2 }, say: '공장 섬이 화가 나서 거래를 끊었어요.' }] },
    badRumor: { chain: 'defect', char: 'reporter', title: '나쁜 소문', text: '[세계 신문] 다온국 물건, 믿어도 될까? 모든 나라의 믿음이 한 칸 줄고, 3년 동안 새 계약을 받아 주지 않아요.', trust: { all: -1 }, buy: ['all', 0.6, 3], noContract: 3 },

    promiseAngry: { chain: 'creditDue', char: 'lithiumHigh', title: '화난 리튬 고원국', text: '약속을 안 지켰군요! 외상으로 준 리튬값 60을 지금 받아 가겠어요. 다른 나라들도 다 알게 되어 믿음이 두 칸 줄고, 3년 동안 우리 물건을 60% 값으로만 사며 우리에게 파는 값은 30% 올려 불러요. 새 계약도 받아 주지 않고, 일감이 줄어 일자리 별도 하나 내려가요.', fx: { money: -60 }, trust: { all: -2 }, buy: ['all', 0.6, 3], price: ['all', 1.3, 3], noContract: 3, gauge: { jobs: -1 },
      options: [
        { key: 'a', label: '늦게라도 갚기',   fx: { money: -40 }, trust: { all: 1 }, say: '늦게라도 스마트폰 값을 갚았어요. 믿음이 조금 돌아왔지만 소문은 남았어요.' },
        { key: 'b', label: '계속 버티기',     trust: { lithiumHigh: -5 }, noContract: 3, say: '리튬 고원국이 거래를 끊었어요.' },
        { key: 'c', label: '반만 갚기',       fx: { money: -20 }, trust: { lithiumHigh: -2 }, say: '반만 갚았어요. 믿음은 돌아오지 않았어요.' }] }
  },

  /* 엔딩 — 위에서부터 먼저 맞는 것 */
  endings: [
    { id: 'king',      when: 'allGauges>=4 && partners>=2', name: '무역왕', legend: true, story: '국민 모두 배부르고 따뜻하고, 일자리도 넉넉해요!',
      note: '우리에게 없는 것은 다른 나라에서, 우리가 잘 만드는 것은 다른 나라로. 서로 기대며 함께 잘 살아요.' },
    { id: 'war',       when: 'tradeWar && avgGauge<3.5', name: '무역 전쟁의 늪', story: '관세 싸움에 지쳐 모두가 가난해졌어요.',
      note: '무역 갈등은 대화와 약속으로 풀어야 모두에게 이로워요.' },
    { id: 'richAlone', when: 'money>=200 && (avgGauge<3 || partners<=1)', name: '고립된 부자', story: '돈은 많이 모았지만, 국민 생활이 부족하거나 함께할 친구 나라가 적어요.',
      note: '돈이 있어도 사 올 곳(믿을 수 있는 나라)이 없으면 소용없어요.' },
    { id: 'island',    when: 'deals<=3', name: '자급자족의 섬', story: '다른 나라와 거의 거래하지 않았어요. 모자란 게 너무 많아요.',
      note: '자원이 부족한 나라는 무역이 꼭 필요해요.' },
    { id: 'rawOnly',   when: 'made<=1', name: '재료만 파는 나라', story: '물건을 사고팔기만 하고 만들지는 못했어요.',
      note: '부품을 모아 완성품을 만들면 일자리와 이익이 커져요(가공 무역).' },
    { id: 'normal',    when: 'else', name: '평범한 무역국', story: '12년 동안 열심히 사고팔았어요.',
      note: '어느 나라와 무엇을 사고팔지 잘 고르면 더 잘 살 수 있어요.' }
  ],

  /* 도전 배지 */
  badges: [
    { id: 'king',      name: '무역왕',        goal: '무역왕 엔딩 보기' },
    { id: 'explorer',  name: '바다 탐험가',   goal: '한 판에서 모든 나라 만나기' },
    { id: 'allMaps',   name: '지도 박사',     goal: '지도 4종 모두 해 보기' },
    { id: 'allLands',  name: '나라 박사',     goal: '나라 10종 모두 만나기' },
    { id: 'honest',    name: '약속 지킴이',   goal: '불공정한 선택 없이 8년 마치기' },
    { id: 'chain',     name: '공급망 박사',   goal: '한 판에 완성품 3종 모두 만들기' },
    { id: 'dream',     name: '꿈을 이룬 대표', goal: '대통령의 꿈 이루기' },
    { id: 'allEndings', name: '무역 박사',    goal: '엔딩 6개 모두 보기' }
  ]
};
