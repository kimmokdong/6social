/* 다온시 70년 — 게임 콘텐츠·규칙 데이터
 * 배경: 실제 우리나라의 시대 흐름(1960~2020년대) 속 가상 도시 '다온시'. 플레이어는 시장.
 * 숫자는 밸런스 시뮬레이션을 거친 값이므로 SPEC.md 의 공식과 함께 그대로 쓸 것.
 */
window.DAON_CITY = {
  rules: {
    startMoney: 15,
    buildsPerDecade: [3, 3, 4, 4, 4, 4, 4],   // 1980년대부터 도시가 커져 4개
    demolishCost: 1,
    income: { base: 6, exportRate: 0.7, perMarket: 2 },
    exportTarget: [5, 14, 26, 40, 56, 72, 90], // 경제 게이지 70 = 목표 달성
    boost: { one: 1.5, both: 2 },              // 공장이 항구 또는 고속도로 옆: ×1.5, 둘 다: ×2
    housePollutionPenalty: 4                   // 오염 2 이상 건물 옆 주택 1채당 생활 -4
  },

  gauges: {
    econ: { label: '경제', icon: 'chart' },
    life: { label: '생활', icon: 'home' },
    env:  { label: '환경', icon: 'tree' },
    fair: { label: '공정', icon: 'scale' }
  },

  categories: {
    light:   { name: '경공업' },
    heavy:   { name: '중화학 공업' },
    carElec: { name: '자동차·전자' },
    semi:    { name: '반도체' },
    it:      { name: '정보 통신' },
    content: { name: '문화 콘텐츠' },
    battery: { name: '첨단 산업' }
  },

  // 지도 7열 × 6행. M 산(못 지음) / F 논밭(지을 수 있음) / V 마을(처음부터 주택) / S 바다
  // 바다 바로 위 줄(4행)이 해안 → 항구·조선소·석유 화학은 해안에만
  map: [
    'MMFFFFM',
    'FVVFFFF',
    'FFFFFFF',
    'FFFFFFF',
    'FFFFFFF',
    'SSSSSSS'
  ],

  /* 건물
   * era 등장 시대(0=1960년대), cost 비용, exp 시대별 수출(7칸), pol 오염, unfair 불공정, fair·life·env 플러스 효과
   * tech 10년마다 쌓이는 기술, techReq 필요한 기술, needPower 발전소 필요, power 전기 공급, boost 옆 공장 수출 증가
   * coastal 해안에만, factory 공장(수출 증가·주택 오염 판정 대상), steelBonus 도시에 제철소가 있으면 수출 +
   */
  buildings: {
    house:   { name: '주택',         era: 0, cost: 2,  life: 4 },
    school:  { name: '학교',         era: 0, cost: 3,  tech: 1, life: 2, fair: 1 },
    market:  { name: '시장',         era: 0, cost: 3,  money: 2, life: 2 },
    park:    { name: '공원',         era: 0, cost: 2,  env: 4, life: 2, parkAdj: true },
    port:    { name: '항구',         era: 0, cost: 5,  coastal: true, boost: true },
    power:   { name: '화력 발전소',  era: 0, cost: 4,  power: true, pol: 2 },
    textile: { name: '섬유 공장',    era: 0, cost: 3,  cat: 'light', factory: true, exp: [4, 4, 2, 1, 0, 0, 0], pol: 1, unfair: 1 },
    road:    { name: '고속도로',     era: 1, cost: 4,  boost: true },
    steel:   { name: '제철소',       era: 1, cost: 9,  cat: 'heavy', factory: true, needPower: true, exp: [0, 7, 7, 6, 4, 3, 2], pol: 4, unfair: 1 },
    ship:    { name: '조선소',       era: 1, cost: 8,  cat: 'heavy', factory: true, needPower: true, coastal: true, exp: [0, 6, 6, 6, 5, 4, 3], pol: 2, unfair: 1 },
    chem:    { name: '석유 화학',    era: 1, cost: 8,  cat: 'heavy', factory: true, needPower: true, coastal: true, exp: [0, 6, 6, 6, 4, 3, 2], pol: 4, unfair: 1 },
    car:     { name: '자동차 공장',  era: 2, cost: 8,  cat: 'carElec', factory: true, needPower: true, steelBonus: 2, exp: [0, 0, 6, 8, 7, 6, 5], pol: 2, unfair: 1 },
    elec:    { name: '전자 공장',    era: 2, cost: 7,  cat: 'carElec', factory: true, needPower: true, exp: [0, 0, 6, 7, 5, 4, 3], pol: 1, unfair: 1 },
    univ:    { name: '대학교',       era: 2, cost: 6,  tech: 2, life: 2, fair: 1 },
    welfare: { name: '복지관',       era: 2, cost: 4,  fair: 7, life: 2 },
    semi:    { name: '반도체 공장',  era: 3, cost: 12, cat: 'semi', factory: true, needPower: true, techReq: 6, exp: [0, 0, 0, 12, 15, 18, 22], pol: 1 },
    cleaner: { name: '정화 시설',    era: 3, cost: 4,  env: 6 },
    it:      { name: 'IT 회사',      era: 4, cost: 8,  cat: 'it', techReq: 9, exp: [0, 0, 0, 0, 10, 12, 14], life: 2 },
    green:   { name: '친환경 발전소', era: 4, cost: 6,  power: true, env: 3 },
    content: { name: '콘텐츠 회사',  era: 5, cost: 7,  cat: 'content', techReq: 11, exp: [0, 0, 0, 0, 0, 12, 15], life: 3 },
    battery: { name: '배터리 공장',  era: 6, cost: 12, cat: 'battery', factory: true, needPower: true, techReq: 13, exp: [0, 0, 0, 0, 0, 0, 22] }
  },

  // 시대: 신문(시작) → 건설 → 10년 보내기 → 조건 사건(있으면) → 시대 사건 → 그때 우리나라는?
  eras: [
    { label: '1960년대', headline: '수출로 살길을 찾자!', real: 'light',
      realText: '섬유·신발·가발 같은 가벼운 물건을 만들어 수출했어요.',
      event: { char: 'tycoon', text: '공장 지을 땅이 필요해요. 논밭을 공업 단지로 바꿀까요?',
        a: { label: '공업 단지로', fx: { money: 4, env: -3 } },
        b: { label: '천천히 하자', fx: { life: 4 } } } },
    { label: '1970년대', headline: '공업의 힘을 키우자!', real: 'heavy',
      realText: '제철·조선·석유 화학 같은 중화학 공업을 키웠어요.',
      event: { char: 'reporter', text: '[속보] 석유 파동! 기름값이 몇 배로 올랐어요!',
        a: { label: '에너지 아끼기', fx: { life: -3, money: -1 } },
        b: { label: '그대로 생산', fx: { money: -6 } } } },
    { label: '1980년대', headline: '세계로 달리는 자동차!', real: 'carElec',
      realText: '자동차와 텔레비전 같은 전자 제품 수출이 늘었어요.',
      event: { char: 'kid', text: '서울 올림픽이 열려요! 도시를 단장할까요?',
        a: { label: '공원·길 단장', fx: { money: -3, life: 6, env: 4 } },
        b: { label: '공장에 투자', fx: { money: 3 } } } },
    { label: '1990년대', headline: '작은 칩이 큰돈을!', real: 'semi',
      realText: '반도체와 컴퓨터 산업이 크게 자랐어요.',
      event: { char: 'reporter', text: '[속보] 외환 위기! 나라에 쓸 수 있는 달러가 모자라요!',
        a: { label: '금 모으기 운동', fx: { money: 4, fair: 6 } },
        b: { label: '공장 문 닫기', fx: { money: 8, fair: -10, life: -5 } } } },
    { label: '2000년대', headline: '인터넷 세상이 왔다!', real: 'it',
      realText: '초고속 인터넷과 휴대 전화 같은 정보 통신 산업이 발달했어요.',
      event: { char: 'kid', text: '초고속 인터넷이 들어왔어요! 온 도시에 깔까요?',
        a: { label: '인터넷 깔기', fx: { money: -5, tech: 4 } },
        b: { label: '아직 일러', fx: { money: 2 } } } },
    { label: '2010년대', headline: '한류가 세계로!', real: 'content',
      realText: '케이팝·드라마·게임 같은 문화 콘텐츠가 세계로 퍼졌어요.',
      event: { char: 'teacher', text: '케이팝과 드라마가 세계로! 문화에 투자할까요?',
        a: { label: '문화에 투자', fx: { money: -4, life: 5 } },
        b: { label: '공장에 집중', fx: { money: 4, life: -2 } } } },
    { label: '2020년대', headline: '지구도 지키고 성장도!', real: 'battery',
      realText: '반도체·배터리·바이오 같은 첨단 산업과 친환경 에너지를 키우고 있어요.',
      event: { char: 'activist', text: '지구가 뜨거워져요. 탄소를 줄일까요?',
        a: { label: '친환경 전환', fx: { money: -8, env: 12 } },
        b: { label: '다음에 하자', fx: { env: -8 } } } }
  ],

  // 조건 사건: 10년 보내기 직후 게이지가 조건 이하이면 등장(한 시대에 1개, 우선순위 env > fair > life, 게임 전체에서 같은 사건 최대 2번)
  problems: [
    { id: 'pollution', gauge: 'env', below: 40, char: 'activist', text: '공장 폐수로 강이 오염됐어요!',
      a: { label: '정화하기', fx: { money: -5, env: 10 } },
      b: { label: '모른 척', fx: { life: -8 } } },
    { id: 'labor', gauge: 'fair', below: 40, char: 'shopkeeper', text: '일하는 사람들이 쉬는 날과 안전을 요구해요.',
      a: { label: '들어준다', fx: { money: -4, fair: 12 } },
      b: { label: '거절', fx: { fair: -5, life: -3 } } },
    { id: 'housing', gauge: 'life', below: 40, char: 'grandma', text: '집이 모자라요! 집값이 너무 비싸요.',
      a: { label: '아파트 짓기', fx: { money: -4, life: 10 } },
      b: { label: '기다리자', fx: { life: -4 } } }
  ],

  // 엔딩: 위에서부터 처음 맞는 것
  endings: [
    { id: 'together', when: 'all60', name: '모두의 도시', story: '성장도, 환경도, 공정도 지켰어요!',
      note: '경제 성장과 함께 환경과 공정을 지키는 것이 지속 가능한 발전이에요.', legend: true },
    { id: 'gray', when: 'econ>=70 && env<40', name: '잿빛 수출왕', story: '수출은 1등! 하지만 하늘이 잿빛이에요.',
      note: '우리나라도 빠르게 성장하면서 환경 오염 문제를 겪었어요.' },
    { id: 'unfair', when: 'econ>=60 && fair<40', name: '불공평한 부자 도시', story: '도시는 부자가 됐지만 일하는 사람들은 힘들어요.',
      note: '성장 과정에서 빈부 격차와 노동 문제가 생겼어요. 복지와 공정한 분배가 필요해요.' },
    { id: 'green', when: 'env>=70 && econ<50', name: '조용한 초록 마을', story: '공기는 맑지만 일자리가 부족해요.',
      note: '경제 성장은 일자리와 생활 수준을 높이는 데 꼭 필요해요.' },
    { id: 'stuck', when: 'econ<45 || noEdu', name: '멈춰 버린 도시', story: '새 산업을 키우지 못해 도시가 멈췄어요.',
      note: '기술과 교육에 투자해야 새로운 산업으로 나아갈 수 있어요.' },
    { id: 'grown', when: 'else', name: '열심히 자란 도시', story: '70년 동안 쉬지 않고 자랐어요.',
      note: '우리나라는 국민·기업·정부가 함께 노력해 빠르게 성장했어요.' }
  ],

  finalNote: '빠르게 성장하면서 환경 오염, 빈부 격차, 노동 문제 같은 숙제도 생겼어요.',

  badges: [
    { id: 'history', name: '역사 탐험가', goal: '7개 시대 모두 실제 우리나라와 같은 산업 키우기' },
    { id: 'together', name: '모두의 시장', goal: '모두의 도시 엔딩 보기' },
    { id: 'allEndings', name: '다온시 박사', goal: '엔딩 6개 모두 보기' }
  ]
};
