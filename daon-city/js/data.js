/* 다온시 70년 — 게임 콘텐츠·규칙 데이터
 * 배경: 실제 우리나라의 시대 흐름(1960~2020년대) 속 가상 도시 '다온시'. 플레이어는 시장.
 * 산업 중심 규칙과 검증 결과는 DESIGN-V2.md에 기록한다.
 */
window.DAON_CITY = {
  rules: {
    startMoney: 18, demolishCost: 1, expandCost: [5, 8],
    income: { base: [12, 12, 12, 10, 8, 6, 4], exportRate: 0.8 },
    exportTarget: [6, 15, 25, 35, 45, 55, 65],
    demand: {
      light: [10, 12, 12, 10, 10, 8, 8], heavy: [0, 18, 24, 26, 25, 24, 24],
      carElec: [0, 0, 22, 28, 30, 32, 34], semi: [0, 0, 0, 22, 30, 38, 44],
      it: [0, 0, 0, 0, 20, 26, 30], content: [0, 0, 0, 0, 0, 22, 28], battery: [0, 0, 0, 0, 0, 0, 28]
    }
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
   * homes 거주 공간, jobs 일자리, skilled 기술 인력, supply/energy 전력, education 교육 수용량, upkeep 운영비
   * coastal 해안에만, factory 공장(수출 증가·주택 오염 판정 대상), links 가까운 연관 산업과 협업
   */
  buildings: {
    house:   { name: '주택',         era: 0, cost: 2,  life: 4, homes: 2, upkeep: 0 },
    school:  { name: '학교',         era: 0, cost: 3,  tech: 1, life: 2, fair: 1, education: 2, range: 2, upkeep: 1 },
    market:  { name: '시장',         era: 0, cost: 3,  money: 2, life: 2, service: true, range: 2, capacity: 4, upkeep: 1 },
    park:    { name: '공원',         era: 0, cost: 2,  env: 4, life: 2, parkAdj: true, service: true, range: 1, capacity: 4, upkeep: 0 },
    port:    { name: '항구',         era: 0, cost: 5,  coastal: true, boost: true, logistics: 6, range: 1, upkeep: 1 },
    power:   { name: '화력 발전소',  era: 0, cost: 4,  power: true, pol: 2, supply: 8, upkeep: 1 },
    textile: { name: '섬유 공장',    era: 0, cost: 3,  cat: 'light', factory: true, exp: [4, 5, 5, 4, 4, 3, 3], pol: 1, unfair: 1, jobs: 2, energy: 1, skilled: 0, upkeep: 1 },
    road:    { name: '고속도로',     era: 1, cost: 4,  boost: true, logistics: 6, range: 1, upkeep: 1 },
    steel:   { name: '제철소',       era: 1, cost: 9,  cat: 'heavy', factory: true, needPower: true, exp: [0, 7, 8, 8, 8, 8, 9], pol: 4, unfair: 1, jobs: 3, energy: 3, skilled: 0, upkeep: 2 },
    ship:    { name: '조선소',       era: 1, cost: 8,  cat: 'heavy', factory: true, needPower: true, coastal: true, exp: [0, 6, 7, 8, 8, 9, 10], pol: 2, unfair: 1, jobs: 3, energy: 2, skilled: 0, upkeep: 2 },
    chem:    { name: '석유 화학',    era: 1, cost: 8,  cat: 'heavy', factory: true, needPower: true, coastal: true, exp: [0, 6, 7, 8, 8, 9, 10], pol: 4, unfair: 1, jobs: 3, energy: 3, skilled: 0, upkeep: 2 },
    car:     { name: '자동차 공장',  era: 2, cost: 8,  cat: 'carElec', factory: true, needPower: true, steelBonus: 2, exp: [0, 0, 6, 8, 9, 11, 14], pol: 2, unfair: 1, jobs: 3, energy: 2, skilled: 1, upkeep: 2, links: ['steel'] },
    elec:    { name: '전자 공장',    era: 2, cost: 7,  cat: 'carElec', factory: true, needPower: true, exp: [0, 0, 6, 7, 8, 10, 12], pol: 1, unfair: 1, jobs: 2, energy: 2, skilled: 1, upkeep: 1 },
    univ:    { name: '대학교',       era: 2, cost: 6,  tech: 2, life: 2, fair: 1, education: 4, range: 2, upkeep: 2 },
    welfare: { name: '복지관',       era: 2, cost: 4,  fair: 7, life: 2, service: true, range: 2, capacity: 6, upkeep: 1 },
    semi:    { name: '반도체 공장',  era: 3, cost: 12, cat: 'semi', factory: true, needPower: true, exp: [0, 0, 0, 12, 15, 18, 22], pol: 1, jobs: 2, energy: 3, skilled: 2, upkeep: 3, links: ['elec'] },
    cleaner: { name: '정화 시설',    era: 3, cost: 4,  env: 6, cleaning: 4, range: 2, upkeep: 1 },
    it:      { name: 'IT 회사',      era: 4, cost: 8,  cat: 'it', exp: [0, 0, 0, 0, 10, 12, 14], life: 2, jobs: 2, energy: 1, skilled: 2, upkeep: 2, links: ['semi'] },
    green:   { name: '친환경 발전소', era: 4, cost: 6,  power: true, env: 3, supply: 10, upkeep: 1 },
    content: { name: '콘텐츠 회사',  era: 5, cost: 7,  cat: 'content', exp: [0, 0, 0, 0, 0, 12, 15], life: 3, jobs: 2, energy: 1, skilled: 1, upkeep: 1, links: ['it'] },
    battery: { name: '배터리 공장',  era: 6, cost: 12, cat: 'battery', factory: true, needPower: true, exp: [0, 0, 0, 0, 0, 0, 22], jobs: 2, energy: 3, skilled: 2, upkeep: 3, links: ['chem'] }
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
        b: { label: '그대로 생산', fx: { money: -6 }, energyCost: true } } },
    { label: '1980년대', headline: '세계로 달리는 자동차!', real: 'carElec',
      realText: '자동차와 텔레비전 같은 전자 제품 수출이 늘었어요.',
      event: { char: 'kid', text: '서울 올림픽이 열려요! 도시를 단장할까요?',
        a: { label: '공원·길 단장', fx: { money: -3, life: 6, env: 4 } },
        b: { label: '공장에 투자', fx: { money: 3 } } } },
    { label: '1990년대', headline: '작은 칩이 큰돈을!', real: 'semi',
      realText: '반도체와 컴퓨터 산업이 크게 자랐어요.',
      event: { char: 'reporter', text: '[속보] 외환 위기! 나라에 쓸 수 있는 달러가 모자라요!',
        a: { label: '금 모으기 운동', fx: { money: 4, fair: 6 } },
        b: { label: '비용 줄이기', fx: { money: 8, fair: -10, life: -5 } } } },
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
    { id: 'labor', gauge: 'fair', below: 40, char: 'shopkeeper', text: '성장의 혜택이 닿지 않는 이웃이 있어요. 일자리와 안전한 일터를 함께 살필까요?',
      a: { label: '들어준다', fx: { money: -4, fair: 12 } },
      b: { label: '거절', fx: { fair: -5, life: -3 } } },
    { id: 'housing', gauge: 'life', below: 40, char: 'grandma', text: '집이 모자라요! 집값이 너무 비싸요.',
      a: { label: '주거 지원', fx: { money: 4 } },
      b: { label: '기다리자', fx: { life: -4 } } }
  ],

  // 산업 경로와 주민의 실제 상태로 결정하는 8개 엔딩.
  endings: [
    { id: 'together', name: '모두의 도시', hint: '여러 산업과 주민의 삶을 함께 발전시키면…', story: '성장과 생활, 환경을 함께 지켰어요!', note: '여러 산업이 서로 돕고 주민의 삶도 나아지는 발전을 만들었어요.', legend: true },
    { id: 'export', name: '세계로 뻗은 수출 도시', hint: '항구와 제조업을 잘 연결하면…', story: '우리 도시의 제품이 세계로 나가요!', note: '제조업과 물류의 기반을 함께 키워 수출 경쟁력을 높였어요.' },
    { id: 'tech', name: '기술로 여는 미래 도시', hint: '교육을 미리 준비하고 첨단 산업을 키우면…', story: '배운 사람들이 새로운 산업을 이끌어요!', note: '교육과 기술 인력이 새로운 산업으로 전환할 힘이 되었어요.' },
    { id: 'creative', name: '이야기가 빛나는 문화 도시', hint: 'IT와 콘텐츠의 협업을 키우면…', story: '우리 도시의 이야기가 세계를 만나요!', note: '기술과 문화 콘텐츠를 연결해 새로운 가치를 만들었어요.' },
    { id: 'gray', name: '잿빛 수출왕', hint: '성장하면서 오염 피해를 방치하면…', story: '수출은 늘었지만 주민 곁에 오염이 남았어요.', note: '실제로 피해를 받는 지역을 살피고 배출을 줄여야 해요.' },
    { id: 'unfair', name: '소외된 이웃의 도시', hint: '일자리와 생활 지원이 이웃에게 닿지 않으면…', story: '도시의 성장에서 소외된 주민이 있어요.', note: '일자리와 교육·생활 서비스를 주민에게 고르게 연결해야 해요.' },
    { id: 'stuck', name: '멈춰 버린 산업 도시', hint: '공장은 있지만 돌아갈 준비가 없다면…', story: '산업을 운영할 사람과 기반이 부족했어요.', note: '산업을 짓는 것과 운영하는 것은 달라요. 기반을 먼저 준비해 봐요.' },
    { id: 'grown', name: '다음 도전을 준비한 도시', hint: '70년의 선택을 끝까지 이어가면…', story: '도시를 키우며 나만의 발전 방향을 찾았어요.', note: '산업 변화 기록을 보고 다음에는 다른 발전 경로에도 도전해 봐요.' }
  ],

  finalNote: '빠르게 성장하면서 환경 오염, 빈부 격차, 노동 문제 같은 숙제도 생겼어요.',

  badges: [
    { id: 'history', name: '역사 탐험가', goal: '7개 시대의 산업 변화 기록 남기기' },
    { id: 'together', name: '모두의 시장', goal: '모두의 도시 엔딩 보기' },
    { id: 'allEndings', name: '다온시 박사', goal: '엔딩 8개 모두 보기' }
  ]
};
