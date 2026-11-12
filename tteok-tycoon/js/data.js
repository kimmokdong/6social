/* 떡볶이 타이쿤 — 콘텐츠·경제 규칙 데이터
 * 무대: 다온초등학교 앞. 플레이어는 '떡볶이 사장님', 길 건너엔 왕부자 회장의 체인점 '왕떡볶이'.
 * 하루: 아침 준비(가격·재료·투자) → 장사(손님이 가게를 고름) → 저녁 정산 → 사건
 */
window.TTEOK = {
  dayCount: 10,
  start: { money: 130000, taste: 3, rep: 3, fair: 100 },
  rent: 25000,            // 하루 가게 임대료
  ingredient: 800,        // 떡볶이 1인분 재료비
  prices: [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
  portions: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
  baseVisitors: 70,       // 학교 앞을 지나는 아이들
  capacity: 40,           // 하루에 만들어 팔 수 있는 최대 그릇 수(의자·알바로 늘어남)

  /* 손님(가계)의 선택: 용돈 안에서 만족이 가장 큰 곳을 고른다
   * 만족 = 맛 × tasteW + 평판 × repW − (가격 / 1000) × 가격 민감도 + 작은 무작위
   * 어느 가게의 만족도 outside 보다 낮거나 용돈이 모자라면 사 먹지 않는다 */
  customer: {
    budgets: [[2000, 0.08], [3000, 0.22], [4000, 0.35], [5000, 0.35]],
    tasteW: 0.8, repW: 0.75, priceW: [0.7, 1.2], outside: 0.6, noise: 0.9,
    profiles: [
      { id: 'value', share: 0.20, taste: 0.7, price: 1.4, loyalty: 0 },
      { id: 'taste', share: 0.30, taste: 1.4, price: 0.8, loyalty: 0 },
      { id: 'loyal', share: 0.15, taste: 1, price: 1, loyalty: 1.4 },
      { id: 'normal', share: 0.35, taste: 1, price: 1, loyalty: 0 }
    ],
    cartelOutside: -0.5   // 담합 중: 두 가게가 똑같이 비싸서 다른 데가 없으니 비싸도 사 먹는다
  },

  /* 평판(별) 변화: 맛, 가격, 다 팔려서 돌아간 손님, 사건 */
  repRules: { tastePer: 0.15, cheapBonus: 0.15, pricyPenalty: 0.2, turnedAwayEach: 0.02, turnedAwayMax: 0.4 },

  /* 투자 카드: 하루에 하나. once = 한 번 사면 계속 효과 */
  upgrades: {
    cheese:  { name: '치즈 토핑',   cost: 30000, taste: 1, ingredient: 300, once: true },
    sundae:  { name: '순대 메뉴',   cost: 35000, taste: 0.5, ingredient: 100, visitors: 0.1, once: true },
    chairs:  { name: '의자 추가',   cost: 25000, cap: 15,    once: true },
    staff:   { name: '알바 고용',   cost: 0,     cap: 25,    wage: 15000, once: true },
    clean:   { name: '위생 점검',   cost: 15000, rep: 0.5,   once: true },
    flyer:   { name: '전단지 광고', cost: 15000, visitors: 0.3 }
  },

  /* 날마다 일어나는 일 — 첫날·마지막 날은 고정, 2~9일째는 판마다 사건 묶음에서 뽑아 섞는다
   * mood: 지나가는 아이 수 배율 / ingredient: 재료비 변경(며칠간) / choice: 선택 사건(at: 아침·저녁) */
  firstDay: { title: '개업 첫날!', news: '다온초 앞에 떡볶이 가게 오픈!', mood: 1 },
  lastDay: { title: '마지막 날', news: '내일은 방학! 오늘이 마지막 장사예요.', mood: 1.2 },
  middleDays: 8,
  pools: {
    /* 선택 사건: cartel 은 매번(2~4일째), 나머지에서 3개. range 는 뒤따르는 사슬이 끝날 수 있는 날짜까지만 */
    always: ['cartel'],
    choices: {
      cartel: { range: [1, 3], title: '왕부자 회장의 제안', news: '길 건너 왕떡볶이 회장님이 찾아왔어요.', mood: 1,
        choice: { at: 'morning', char: 'tycoon', text: '우리 둘 다 4,000원으로 올리고, 손님은 반씩 나눕시다. 허허!', options: [
          { key: 'a', label: '좋아요!', fx: { fair: -40 }, lock: 4000, unfair: true, next: ['truck', 2], say: '약속! 두 가게 모두 4,000원, 손님은 반씩!' },
          { key: 'b', label: '안 돼요!', fx: { fair: 5 }, refuse: true, next: ['priceWar', 1], say: '회장님이 씩씩거리며 돌아갔어요…' }] } },
      fakeAd: { range: [1, 6], title: '광고 회사의 제안', news: '', mood: 1,
        choice: { at: 'morning', char: 'ad_agent', text: "'세계 1등 떡볶이!' 전단지를 공짜로 뿌려 드릴게요!", options: [
          { key: 'a', label: '좋아요!', fx: { fair: -20 }, visitorsToday: 0.4, unfair: true, next: ['adAngry', 1], say: '전단지가 쫙 뿌려졌어요! 오늘 손님이 많을 거예요.' },
          { key: 'b', label: '거짓말은 싫어요', fx: { fair: 5 }, refuse: true, say: '광고 회사 직원이 돌아갔어요.' }] } },
      fakeOrigin: { range: [1, 6], title: '수상한 재료 장수', news: '', mood: 1,
        choice: { at: 'morning', char: 'tycoon', text: '외국산 떡을 국산이라고 써 붙이면 재료비가 싸진다오. 어때요?', options: [
          { key: 'a', label: '싸니까 좋아요', fx: { fair: -20 }, ingredient: [500, 3], unfair: true, next: ['grandmaAsk', 2], say: '3일 동안 재료비가 500원으로 내려가요!' },
          { key: 'b', label: '정직하게 할래요', fx: { fair: 5 }, refuse: true, say: '그대로 국산 떡을 써요.' }] } },
      complaint: { range: [1, 7], title: '손님의 불만', news: '', mood: 1, cleanSkip: true,
        choice: { at: 'evening', char: 'kid', text: '떡볶이에서 머리카락이 나왔어요!', options: [
          { key: 'a', label: '사과하고 환불', fx: { money: -3000, rep: 0.3 }, say: '사과하고 돈을 돌려줬어요.' },
          { key: 'b', label: '모른 척', fx: { fair: -10 }, unfair: true, next: ['mom', 1], say: '…못 들은 척했어요.' }] } },
      donation: { range: [1, 8], title: '아동센터의 부탁', news: '', mood: 1,
        choice: { at: 'evening', char: 'teacher', text: '지역 아동센터 아이들에게 떡볶이를 나눠 줄 수 있을까요?', options: [
          { key: 'a', label: '기부할게요', fx: { money: -30000, rep: 0.8, fair: 15 }, say: '아이들이 아주 좋아했어요!' },
          { key: 'b', label: '어려워요', say: '다음에 꼭 도울게요.' }] } }
    },
    pickChoices: 3,
    /* 손님 수·재료비가 바뀌는 날(수요와 공급) */
    demand: {
      rain: { title: '비 오는 날', news: '비가 와서 지나가는 아이가 적어요.', mood: 0.6, icon: 'rain' },
      trip: { title: '현장 체험 학습', news: '많은 반이 체험 학습을 가서 학교가 조용해요.', mood: 0.5, icon: 'rain' },
      exam: { title: '시험 기간', news: '시험 기간이라 간식 찾는 아이가 많아요!', mood: 1.5 },
      sports: { title: '운동회 날', news: '운동회 날이라 배고픈 아이들이 몰려와요!', mood: 2 },
      festival: { title: '학교 축제', news: '학교 축제! 손님이 아주 많아요!', mood: 1.8 },
      rice: { title: '쌀값 폭등', news: '쌀 농사가 안 돼서 떡값이 올랐어요.', mood: 1, ingredient: 1200, ingredientDays: 3 },
      sauce: { title: '고추장값 하락', news: '고추가 풍년이라 재료비가 내려갔어요!', mood: 1, ingredient: 600, ingredientDays: 2 },
      rivalSale: { title: '왕떡볶이 할인 행사', news: '왕떡볶이가 이틀 동안 500원 할인해요!', mood: 1, rivalSale: 500, rivalSaleDays: 2 },
      youtuber: { title: '유튜버 방문', news: '맛집 유튜버가 우리 가게에 왔어요!', mood: 1.2, youtuber: true }
    },
    pickDemand: 5
  },

  /* 왕떡볶이 성격: 판마다 하나 */
  rivals: {
    discount: { name: '싸게 파는 왕떡볶이', price: 2500, taste: 2.8, rep: 3, line: '우린 싸게 많이 판다오! 허허!' },
    premium: { name: '맛있는 왕떡볶이', price: 3500, taste: 3.6, rep: 3.2, line: '비싸도 맛있으면 사 먹는 법이지!' },
    normal: { name: '보통 왕떡볶이', price: 3000, taste: 3.1, rep: 3.1, line: '어디 한번 붙어 봅시다! 허허!' }
  },
  rivalResponse: { from: 1, lead: 0.15, days: 2, cutStep: 500, cutMax: 500, floor: 1500, tasteStep: 0.3, tasteMax: 4.2 },
  /* 담합으로 값이 비싸지면 새로 들어오는 경쟁자 */
  truck: { name: '꼬마 푸드트럭', price: 2500, taste: 2.9, rep: 2.8, days: 3 },

  /* 사건 사슬 — 불공정한 선택은 그 자리에서 벌을 주지 않는다.
   * 며칠 뒤 다른 사건으로 이어지고, 거기서 무엇을 골라도 결국 처음에 얻은 것보다 더 잃는다.
   * 여러 판을 하며 갈래를 모두 겪으면 '처음 선택'이 문제였다는 걸 스스로 알아차리게 한다.
   * 효과: fx(돈·평판·숨은 공정 점수) lock/unlock(담합 가격) truck(푸드트럭) rivalCut/rivalReset(왕떡볶이 가격)
   *       fine:[기본, 담합 기간 매출 비율] (과징금은 담합으로 판 매출에 비례)
   *       visitors:[배율, 날수] ingredient:[재료비, 날수] taste next:[다음 사건, 며칠 뒤] say(고른 뒤 한 줄) */
  chains: {
    cartel: { name: '가격 약속', icon: 'crown', branch: 'truck',
      lesson: '가격 담합을 하면 손님은 비싸게 사야 해요. 그래서 새 경쟁자가 들어오고, 신고와 배신이 이어져요. 담합은 법으로 금지된 불공정 거래예요.' },
    fakeAd: { name: '세계 1등 전단지', icon: 'flyer', branch: 'adAngry',
      lesson: '사실이 아닌 과장 광고는 손님을 속여요. 한번 속은 손님의 믿음은 무엇을 해도 되찾기 어려워요.' },
    fakeOrigin: { name: '수상한 떡', icon: 'bowl', branch: 'grandmaAsk',
      lesson: '원산지를 속이면 소비자가 알 권리를 빼앗아요. 거짓말은 또 다른 거짓말이나 손해를 불러요.' },
    complaint: { name: '머리카락', icon: 'cross', branch: 'mom',
      lesson: '소비자는 안전한 상품을 쓸 권리가 있어요. 문제를 숨기면 더 크게 돌아와요.' }
  },
  nodes: {
    /* 담합 → 값이 비싸니 푸드트럭이 들어옴 */
    truck: { chain: 'cartel', char: 'trucker', title: '푸드트럭 등장', text: '여기 떡볶이가 비싸다길래 왔어요! 우린 2,500원!', truck: true, options: [
      { key: 'a', label: '회장님이랑 쫓아내기', fx: { fair: -20 }, truck: false, next: ['report', 1], say: '푸드트럭이 떠났어요.' },
      { key: 'b', label: '약속 깨고 값 내리기', unlock: true, next: ['betray', 1], say: '이제 가격을 마음대로 정할 수 있어요.' },
      { key: 'c', label: '4,000원 버티기', next: ['article', 1], say: '약속대로 4,000원!' }] },
    report: { chain: 'cartel', char: 'ftc_officer', title: '신고', text: '푸드트럭 사장님이 신고했어요. 담합하고 경쟁 가게까지 쫓아냈군요!', fine: [30000, 0.1], fx: { rep: -0.6 }, unlock: true },
    betray: { chain: 'cartel', char: 'ftc_officer', title: '회장의 배신', text: '왕부자 회장이 먼저 자진 신고했어요. 회장님은 벌금 면제, 사장님만 과징금!', fine: [20000, 0.1], fx: { rep: -0.4 } },
    article: { chain: 'cartel', char: 'reporter', title: '신문 기사', text: '[다온일보] 두 가게가 똑같이 4,000원… 수상하다!', fx: { rep: -0.4 }, unlock: true, next: ['fine', 1] },
    fine: { chain: 'cartel', char: 'ftc_officer', title: '조사', text: '기사를 보고 조사했어요. 가격 담합이 맞군요!', fine: [20000, 0.1], fx: { rep: -0.3 } },

    /* 과장 광고 → 기대한 손님의 실망 */
    adAngry: { chain: 'fakeAd', char: 'kid', title: '실망한 손님', text: '세계 1등이라더니 광고랑 다르잖아요!', options: [
      { key: 'a', label: '진짜 1등 맞거든!', next: ['rumor', 1], say: '도윤이가 고개를 갸웃하며 갔어요.' },
      { key: 'b', label: '광고 회사가 쓴 거야', next: ['adBill', 1], say: '광고 회사 탓을 했어요.' },
      { key: 'c', label: '진짜 1등으로 만들게!', fx: { money: -70000 }, next: ['stillMeh', 1], say: '최고급 재료를 7만 원어치 사 왔어요!' }] },
    rumor: { chain: 'fakeAd', char: 'kid', title: '소문', text: '반 단톡방에 "거짓말 가게"라는 소문이 퍼졌어요…', fx: { rep: -0.5 }, visitors: [-0.3, 2] },
    adBill: { chain: 'fakeAd', char: 'ad_agent', title: '광고비 청구서', text: '공짜는 첫날만이었어요~ 광고비 8만 원 내세요!', fx: { money: -80000, rep: -0.2 } },
    stillMeh: { chain: 'fakeAd', char: 'kid', title: '그래도 실망', text: '비싼 재료를 써도 세계 1등은 아니네요…', fx: { rep: -0.3 } },

    /* 원산지 속이기 → 할머니의 질문 */
    grandmaAsk: { chain: 'fakeOrigin', char: 'grandma', title: '할머니의 질문', text: '이 떡 국산 맞지? 우리 손주 먹일 거라서.', options: [
      { key: 'a', label: '그럼요, 국산이에요!', next: ['caught', 1], say: '할머니가 고맙다며 가셨어요.' },
      { key: 'b', label: '사실은… 외국산이에요', fx: { money: -50000, rep: -0.1 }, clearIngredient: true, say: '남은 떡을 버리고 표시를 바로 고쳤어요.' },
      { key: 'c', label: '맛있게 드세요~', next: ['crackdown', 1], say: '대답을 슬쩍 넘겼어요.' }] },
    caught: { chain: 'fakeOrigin', char: 'grandma', title: '들통', text: '쌀집 사장님한테 다 들었다! 외국산이라며? 돈 돌려줘!', fx: { money: -20000, rep: -0.5 }, visitors: [-0.3, 2] },
    crackdown: { chain: 'fakeOrigin', char: 'ftc_officer', name: '원산지 단속반', title: '단속', text: '원산지 표시를 단속하러 나왔어요. 과태료를 내야 해요!', fx: { money: -90000, rep: -0.4 } },

    /* 머리카락 모른 척 → 다음 날 다시 옴 */
    mom: { chain: 'complaint', char: 'kid', title: '다시 온 손님', text: '엄마가 그러는데, 이건 꼭 사과해야 하는 거래요!', options: [
      { key: 'a', label: '늦었지만 사과하고 환불', fx: { money: -10000, rep: -0.2 }, say: '환불하고 한 그릇을 더 드렸어요.' },
      { key: 'b', label: '그런 적 없어요', next: ['classChat', 1], say: '도윤이가 화가 나서 갔어요.' }] },
    classChat: { chain: 'complaint', char: 'kid', title: '단톡방 사진', text: '반 단톡방에 "머리카락 떡볶이" 사진이 올라왔어요…', fx: { rep: -0.4 }, visitors: [-0.25, 2] },

    /* 담합을 거절하면: 가격 전쟁 (실력으로 이겨 낼 수 있는 사슬) */
    priceWar: { char: 'tycoon', title: '가격 전쟁', text: '흥, 그럼 우린 500원 내리겠소! 손님 다 데려가겠소!', rivalCut: 500, next: ['warEnd', 2], options: [
      { key: 'a', label: '맛으로 승부!', fx: { money: -15000 }, taste: 0.3, say: '양념을 더 맛있게 바꿨어요!' },
      { key: 'b', label: '단골 쿠폰 주기', fx: { money: -10000, rep: 0.4 }, say: '단골 손님이 늘었어요!' },
      { key: 'c', label: '그냥 버티기', say: '우리 방식대로 갈래요.' }] },
    warEnd: { char: 'tycoon', title: '전쟁 끝', text: '에잇, 우리도 손해라 원래 가격으로 돌아가겠소!', rivalReset: true,
      note: '가게끼리 경쟁하는 동안 손님들은 더 싸게 사 먹었어요.' }
  },

  /* 도전 배지 */
  badges: [
    { id: 'best', name: '동네 최고 맛집', goal: '동네 최고 맛집 엔딩 보기' },
    { id: 'honest', name: '정직한 사장님', goal: '불공정한 제안을 모두 거절하고 10일 마치기' },
    { id: 'allProfit', name: '10일 연속 흑자', goal: '하루도 손해 보지 않기' },
    { id: 'noWaste', name: '알뜰 사장님', goal: '버린 재료를 모두 합쳐 20그릇 이하로' },
    { id: 'bulk', name: '박리다매', goal: '2,000원 이하로 하루 40그릇 넘게 팔기' },
    { id: 'fullHouse', name: '대박 장사', goal: '하루 70그릇 넘게 팔기' },
    { id: 'rivals', name: '라이벌 박사', goal: '세 가지 왕떡볶이를 모두 상대하기' },
    { id: 'allEndings', name: '떡볶이 박사', goal: '엔딩 6개 모두 보기' }
  ],

  endings: [
    { id: 'closed', when: 'bankrupt', name: '문 닫은 가게', story: '돈이 바닥나 가게 문을 닫았어요.',
      note: '기업은 비용보다 수입이 많아야(이윤) 계속 장사할 수 있어요.' },
    { id: 'best', when: 'money>=400000 && rep>=4 && fair>=80', name: '동네 최고 맛집', legend: true, story: '맛도, 돈도, 믿음도 모두 잡았어요!',
      note: '합리적으로 선택하고 공정하게 경쟁하는 기업이 오래 사랑받아요.' },
    { id: 'greedy', when: 'money>=200000 && fair<60', name: '돈만 아는 가게', story: '돈은 벌었지만 손님들이 등을 돌리기 시작했어요.',
      note: '담합이나 과장 광고 같은 불공정한 방법은 결국 소비자에게 피해를 줘요.' },
    { id: 'kind', when: 'fair>=90 && rep>=3.5', name: '착한 가게', story: '돈은 조금 덜 벌었지만 모두가 좋아하는 가게예요.',
      note: '기업의 사회적 책임: 이윤만큼 소비자와 이웃도 생각해요.' },
    { id: 'rich', when: 'money>=300000', name: '장사의 달인', story: '가격과 재료를 척척! 돈을 많이 벌었어요.',
      note: '기업은 가격과 생산량을 잘 정해 이윤을 늘리려고 해요.' },
    { id: 'normal', when: 'else', name: '평범한 분식집', story: '10일 동안 열심히 장사했어요.',
      note: '손님이 무엇을 원하는지 살피면 더 좋은 가게가 될 수 있어요.' }
  ],

  // 손님 생각 말풍선
  reasonThoughts: {
    taste: '여기 맛있어!', price: '더 싸다!', loyalty: '난 원래 왕떡볶이!',
    reputation: '믿고 먹는 가게야!', preference: '친구 따라 왔어!',
    budget: '용돈 부족', expensive: '너무 비싸…', soldout: '다 팔렸대…', cartel: '다 같은 값이네…'
  },
  thoughts: {
    mine: ['맛있어!', '여기 최고!', '또 올래!'],
    rival: ['저기가 더 싸네', '왕떡볶이 갈래'],
    truck: ['푸드트럭 갈래!', '트럭이 싸다!'],
    cartel: ['비싸지만 어쩔 수 없지…', '다른 데도 4,000원이야…'],
    none: ['용돈이 모자라…', '너무 비싸…', '그냥 집에 갈래'],
    soldout: ['다 팔렸대…', '줄이 너무 길어']
  }
};

/* 확정된 플레이 결과 문장과 표시 기준 */
TTEOK.result = {
  "questions": [
    {
      "id": "B1",
      "slot": "role",
      "template": "N일째 [소식]에 재료가 모자라 A명이 그냥 돌아갔어요. 왜 그랬을까요?",
      "options": [
        {
          "id": "a",
          "text": "사려는 손님이 많을 것을 덜 헤아리고 재료를 적게 준비했어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "그냥 운이 나빴어요",
          "ok": false
        },
        {
          "id": "c",
          "text": "손님들이 너무 많이 먹어서요",
          "ok": false
        }
      ]
    },
    {
      "id": "B2",
      "slot": "role",
      "template": "N일째 [소식]에 A그릇이 남아서 버렸어요. 왜 그랬을까요?",
      "options": [
        {
          "id": "a",
          "text": "사려는 손님 수보다 재료를 많이 준비했어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "그냥 운이 나빴어요",
          "ok": false
        },
        {
          "id": "c",
          "text": "손님들이 배가 불러서요",
          "ok": false
        }
      ]
    },
    {
      "id": "B3",
      "slot": "role",
      "template": "N일째에 값을 X원에서 Y원으로 올렸더니 판 그릇이 A그릇에서 B그릇으로 줄었어요. 왜 그랬을까요?",
      "options": [
        {
          "id": "a",
          "text": "값이 오르면 용돈 안에서 사려는 사람이 줄어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "그날 날씨가 나빠서요",
          "ok": false
        },
        {
          "id": "c",
          "text": "손님들이 떡볶이에 질려서요",
          "ok": false
        }
      ]
    },
    {
      "id": "B4",
      "slot": "role",
      "template": "N일째에 [투자]에 A원을 썼어요. 그날 돈이 줄었는데도 투자한 까닭은 무엇인가요?",
      "options": [
        {
          "id": "a",
          "text": "돈을 먼저 써서 손님이나 판매를 늘리려고요",
          "ok": true
        },
        {
          "id": "b",
          "text": "돈이 남아서 그냥 썼어요",
          "ok": false
        },
        {
          "id": "c",
          "text": "투자하면 그날 바로 돈이 생겨서요",
          "ok": false
        }
      ]
    },
    {
      "id": "B5",
      "slot": "role",
      "template": "N일째 [소식]에 재료를 A그릇 준비했어요. 재료 수를 정할 때 무엇을 살펴야 할까요?",
      "options": [
        {
          "id": "a",
          "text": "오늘 소식을 보고 사려는 손님 수를 미리 헤아려야 해요",
          "ok": true
        },
        {
          "id": "b",
          "text": "어제와 똑같이 하면 돼요",
          "ok": false
        },
        {
          "id": "c",
          "text": "재료는 많을수록 좋아요",
          "ok": false
        }
      ]
    },
    {
      "id": "G1",
      "slot": "household",
      "template": "N일째에 A명은 왕떡볶이로, B명은 우리 가게로 왔어요. 손님들이 왕떡볶이를 더 많이 고른 까닭은 무엇일까요?",
      "options": [
        {
          "id": "a",
          "text": "용돈 안에서 값·맛·평판을 따져 보니 그날은 왕떡볶이가 더 낫다고 느꼈어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "그냥 운이 나빴어요",
          "ok": false
        },
        {
          "id": "c",
          "text": "왕떡볶이 간판이 더 크고 멋져서요",
          "ok": false
        }
      ]
    },
    {
      "id": "G2",
      "slot": "household",
      "template": "N일째에 A명이나 우리 가게에 왔어요. 손님들이 우리 가게를 고른 까닭은 무엇일까요?",
      "options": [
        {
          "id": "a",
          "text": "값에 비해 맛과 평판이 좋아서 더 만족스러울 거라 여겼어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "손님이 많은 날이라 아무 데나 들어갔어요",
          "ok": false
        },
        {
          "id": "c",
          "text": "제가 운이 좋았어요",
          "ok": false
        }
      ]
    },
    {
      "id": "F1",
      "slot": "freedom",
      "template": "N일 동안 값이 4,000원에 묶여 있었어요. 그동안 오늘 소식이나 손님 수에 맞춰 값을 바꿀 수 있었나요?",
      "options": [
        {
          "id": "a",
          "text": "아니요, 약속 때문에 값을 스스로 정할 수 없었어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "네, 언제든 바꿀 수 있었어요",
          "ok": false
        },
        {
          "id": "c",
          "text": "값은 원래 나라에서 정해 줘요",
          "ok": false
        }
      ]
    },
    {
      "id": "F2",
      "slot": "freedom",
      "template": "이번 판에 값을 N번 바꿨어요. 가게가 값을 스스로 바꿀 수 있는 까닭은 무엇일까요?",
      "options": [
        {
          "id": "a",
          "text": "시장경제에서는 기업이 값을 스스로 정할 자유가 있어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "왕떡볶이가 허락해 줘서요",
          "ok": false
        },
        {
          "id": "c",
          "text": "나라에서 정해 준 대로 한 거예요",
          "ok": false
        }
      ]
    },
    {
      "id": "F3",
      "slot": "freedom",
      "template": "N일 내내 값을 X원으로 두었어요. 값을 바꿀 수도 있었을까요?",
      "options": [
        {
          "id": "a",
          "text": "네, 가게는 상황에 맞게 값을 스스로 정할 수 있어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "아니요, 처음 정한 값은 못 바꿔요",
          "ok": false
        },
        {
          "id": "c",
          "text": "왕떡볶이와 값이 같아야 해요",
          "ok": false
        }
      ]
    },
    {
      "id": "S1",
      "slot": "responsibility",
      "template": "N일째에 왕떡볶이와 값을 4,000원으로 맞췄죠. M일째에 푸드트럭이 나타난 까닭은 무엇이라고 생각하세요?",
      "options": [
        {
          "id": "a",
          "text": "두 가게가 다 비싸서 싼 가게가 들어올 틈이 생겼어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "그냥 운이 나빴어요",
          "ok": false
        },
        {
          "id": "c",
          "text": "우리 떡볶이가 맛이 없어서요",
          "ok": false
        }
      ]
    },
    {
      "id": "S2",
      "slot": "responsibility",
      "template": "N일째에 왕떡볶이와 값을 4,000원으로 맞췄죠. 손님들에게는 어떤 일이 생겼을까요?",
      "options": [
        {
          "id": "a",
          "text": "고를 가게가 없어서 비싼 값을 내야 했어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "손님에게는 아무 상관 없었어요",
          "ok": false
        },
        {
          "id": "c",
          "text": "두 가게 값이 같아서 고르기 편했어요",
          "ok": false
        }
      ]
    },
    {
      "id": "S3",
      "slot": "responsibility",
      "template": "N일째에 '세계 1등 떡볶이!' 전단지를 뿌렸죠. 다음 날 손님이 실망한 까닭은 무엇일까요?",
      "options": [
        {
          "id": "a",
          "text": "사실이 아닌 광고라 손님이 속았다고 느꼈어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "손님이 너무 까다로워서요",
          "ok": false
        },
        {
          "id": "c",
          "text": "그냥 운이 나빴어요",
          "ok": false
        }
      ]
    },
    {
      "id": "S4",
      "slot": "responsibility",
      "template": "N일째에 외국산 떡을 국산이라고 써 붙였죠. 할머니가 '국산 맞지?' 하고 물어본 까닭은 무엇일까요?",
      "options": [
        {
          "id": "a",
          "text": "손님은 무엇을 먹는지 제대로 알고 고를 권리가 있어서요",
          "ok": true
        },
        {
          "id": "b",
          "text": "할머니가 그냥 궁금해서요",
          "ok": false
        },
        {
          "id": "c",
          "text": "외국산 떡은 원래 몸에 나빠서요",
          "ok": false
        }
      ]
    },
    {
      "id": "S5",
      "slot": "responsibility",
      "template": "N일째에 머리카락이 나왔다는 말을 못 들은 척했죠. 다음 날 그 손님이 다시 찾아온 까닭은 무엇일까요?",
      "options": [
        {
          "id": "a",
          "text": "손님은 안전한 음식을 먹을 권리가 있어서 사과를 받아야 해요",
          "ok": true
        },
        {
          "id": "b",
          "text": "떡볶이를 또 먹고 싶어서요",
          "ok": false
        },
        {
          "id": "c",
          "text": "그냥 트집을 잡으려고요",
          "ok": false
        }
      ]
    },
    {
      "id": "S6",
      "slot": "responsibility",
      "template": "N일째에 아동센터에 떡볶이를 나눠 주느라 3만 원을 썼어요. 가게가 돈을 쓰면서도 이런 일을 하는 까닭은 무엇일까요?",
      "options": [
        {
          "id": "a",
          "text": "가게도 이웃과 함께 사는 사회의 한 사람이라서요",
          "ok": true
        },
        {
          "id": "b",
          "text": "손해니까 사실은 안 하는 게 맞아요",
          "ok": false
        },
        {
          "id": "c",
          "text": "별(평판)을 올리려고만 하는 거예요",
          "ok": false
        }
      ]
    },
    {
      "id": "S7",
      "slot": "responsibility",
      "template": "N일째에 머리카락 불만에 사과하고 3,000원을 돌려줬어요. 돈까지 돌려준 까닭은 무엇일까요?",
      "options": [
        {
          "id": "a",
          "text": "손님은 안전한 음식을 먹을 권리가 있고, 가게는 잘못을 책임져야 해서요",
          "ok": true
        },
        {
          "id": "b",
          "text": "사실은 안 돌려줘도 됐어요",
          "ok": false
        },
        {
          "id": "c",
          "text": "그 손님이 울까 봐서요",
          "ok": false
        }
      ]
    },
    {
      "id": "S8",
      "slot": "responsibility",
      "template": "N일째에 회장님의 가격 약속을 거절했죠. 그 뒤 가격 전쟁 동안 손님들에게는 어떤 일이 있었을까요?",
      "options": [
        {
          "id": "a",
          "text": "가게끼리 경쟁해서 손님은 더 싸게 사 먹었어요",
          "ok": true
        },
        {
          "id": "b",
          "text": "손님에게는 아무 상관 없었어요",
          "ok": false
        },
        {
          "id": "c",
          "text": "두 가게가 싸워서 손님이 불편했어요",
          "ok": false
        }
      ]
    }
  ],
  "types": [
    {
      "id": 0,
      "name": "차곡차곡 알뜰 사장님",
      "description": "재료를 늘 비슷하게 준비하고, 값은 낮게 두고, 번 돈은 아껴 모았어요. 꾸준히 같은 방식으로 가게를 지켰어요."
    },
    {
      "id": 1,
      "name": "문 활짝 동네 사장님",
      "description": "값을 낮게 두고 가게를 키우는 데 돈을 썼어요. 많은 손님을 맞이할 준비를 한 판이었어요."
    },
    {
      "id": 2,
      "name": "한결같은 장인 사장님",
      "description": "정한 값과 재료를 크게 바꾸지 않고 제값을 받았어요. 내 방식을 믿고 꾸준히 밀고 나갔어요."
    },
    {
      "id": 3,
      "name": "정성 가득 맛집 사장님",
      "description": "가게에 돈을 들이고 그만큼 제값을 받았어요. 맛과 가게를 키워 손님을 맞으려 했어요."
    },
    {
      "id": 4,
      "name": "날씨 읽는 알뜰 사장님",
      "description": "그날그날 재료 수를 바꾸며 값은 낮게 두었어요. 돈은 아껴 모으는 쪽을 골랐어요."
    },
    {
      "id": 5,
      "name": "발 빠른 도전 사장님",
      "description": "재료도 바꾸고 투자도 해 보며 이것저것 시도했어요. 값을 낮춰 손님을 많이 모으려 했어요."
    },
    {
      "id": 6,
      "name": "꼼꼼한 계산 사장님",
      "description": "날마다 재료 수를 따져 바꾸고 제값을 받았어요. 돈을 쓰는 데는 신중했어요."
    },
    {
      "id": 7,
      "name": "척척 기획 사장님",
      "description": "재료·값·투자를 모두 적극적으로 정했어요. 가게를 키우며 제값을 받는 계획을 세웠어요."
    }
  ],
  "axes": [
    {
      "id": "portions",
      "label": "재료",
      "left": "재료를 늘 비슷하게",
      "right": "날마다 바꿔 보기",
      "min": 0,
      "max": 9,
      "threshold": 3,
      "value": "재료를 10그릇 넘게 바꾼 날 {v}일"
    },
    {
      "id": "price",
      "label": "가격",
      "left": "값을 낮춰 많이 팔기",
      "right": "값을 높여 제값 받기",
      "min": -1500,
      "max": 1500,
      "threshold": 0,
      "value": "왕떡볶이보다 평균 {v}"
    },
    {
      "id": "upgrades",
      "label": "돈 쓰기",
      "left": "돈을 아껴 모으기",
      "right": "돈을 써서 가게 키우기",
      "min": 0,
      "max": 4,
      "threshold": 2,
      "value": "투자 {v}번"
    }
  ],
  "cards": {
    "B1": {
      "action": "N일째 [소식], 재료를 A그릇 준비했어요.",
      "event": "B명이 못 사고 돌아가서 별이 깎였어요.",
      "concept": "사려는 사람의 양을 **수요**라고 해요. 수요를 헤아려 만들 양을 정하는 것이 **기업**이 하는 일이에요.",
      "reason": "그날은 지나가는 아이가 많은 날이었어요. 손님이 늘 것을 미리 헤아려 재료를 늘렸다면 더 팔 수 있었어요."
    },
    "B2": {
      "action": "N일째 [소식], 재료를 A그릇 준비했어요.",
      "event": "B그릇만 팔리고 C그릇을 버려 재료비 D원을 잃었어요.",
      "concept": "사려는 사람의 양을 **수요**라고 해요. 수요보다 많이 만들면 남아서 손해예요.",
      "reason": "그날 사려는 손님은 B명쯤이었어요. 소식을 보고 재료를 줄였다면 버리는 돈이 적었을 거예요."
    },
    "B3": {
      "action": "N일째에 값을 X원에서 Y원으로 올렸어요.",
      "event": "판 그릇이 A그릇에서 B그릇으로 줄었어요.",
      "concept": "값이 오르면 사려는 사람이 줄어요. 기업은 **가격**과 손님 수를 함께 따져 값을 정해요.",
      "reason": "손님은 정해진 용돈 안에서 사요. 값이 오르면 덜 사거나 더 싼 가게로 가요."
    },
    "B4": {
      "action": "N일째에 [투자]에 A원을 썼어요.",
      "event": "그 뒤 [맛 3.0 → 4.0 / 판매 한도 40 → 55그릇 / 평판 / 지나가는 아이 등 실제 바뀐 것], 하루 평균 판 그릇이 B그릇에서 C그릇이 됐어요.",
      "concept": "앞으로 더 벌려고 지금 돈을 쓰는 것을 **투자**라고 해요.",
      "reason": "투자는 그날 바로 돈이 생기는 게 아니라, 가게를 키워 다음 날부터 더 팔기 위한 거예요."
    },
    "B5": {
      "action": "N일째 [소식]에 재료를 A그릇 준비했어요.",
      "event": "지나간 아이 B명 가운데 C명이 우리 가게에 왔어요.",
      "concept": "사려는 사람의 양을 **수요**라고 해요. 기업은 수요를 미리 헤아려 만들 양을 정해요.",
      "reason": "날씨나 행사에 따라 지나가는 아이 수가 달라져요. 오늘 소식을 보고 재료를 정하면 덜 남기고 덜 모자라요."
    },
    "G1": {
      "action": "N일째에 값 X원, 맛 Y로 장사했어요.",
      "event": "A명이 왕떡볶이로 갔어요. 가장 많은 까닭은 '{까닭 1위}'(B명)였어요.",
      "concept": "손님 같은 **가계**는 정해진 돈 안에서 값·맛·평판을 따져 가장 만족스러운 곳을 골라요. 이것을 **합리적 선택**이라고 해요.",
      "reason": "손님은 운이 아니라 까닭이 있어서 골라요. 그날 B명은 '{까닭 1위}' 왕떡볶이를 골랐어요."
    },
    "G2": {
      "action": "N일째에 값 X원, 맛 Y로 장사했어요.",
      "event": "A명이 우리 가게에 왔어요. 가장 많은 까닭은 '{까닭 1위}'(B명)였어요.",
      "concept": "손님 같은 **가계**는 정해진 돈 안에서 값·맛·평판을 따져 가장 만족스러운 곳을 골라요. 이것을 **합리적 선택**이라고 해요.",
      "reason": "손님은 아무 데나 가지 않아요. 그날 B명은 '{까닭 1위}' 우리 가게를 골랐어요."
    },
    "S1": {
      "action": "N일째에 왕떡볶이와 값을 4,000원으로 맞췄어요.",
      "event": "{이어진 일}",
      "concept": "가게끼리 몰래 값을 함께 정하는 것을 **담합**이라고 해요. 손님이 고를 기회를 빼앗고 **경쟁**을 막아서 법으로 금지해요.",
      "reason": "두 가게가 다 비싸면 싸게 팔 가게가 들어올 틈이 생겨요. 푸드트럭은 그 틈을 보고 온 거예요."
    },
    "S2": {
      "action": "N일째에 왕떡볶이와 값을 4,000원으로 맞췄어요.",
      "event": "담합하는 동안 손님들은 다른 데가 없어서 비싸도 사 먹었어요.",
      "concept": "가게끼리 몰래 값을 함께 정하는 것을 **담합**이라고 해요. 손님이 고를 기회를 빼앗고 **경쟁**을 막아서 법으로 금지해요.",
      "reason": "두 가게 값이 같으면 손님은 더 싼 곳을 고를 수 없어요. 그래서 비싼 값을 그대로 내야 해요."
    },
    "S3": {
      "action": "N일째에 '세계 1등 떡볶이!' 전단지를 뿌렸어요.",
      "event": "그날 손님이 늘었지만 다음 날 '광고랑 다르잖아요!' {이어진 일}",
      "concept": "사실과 다르게 부풀린 광고를 **과장 광고**라고 해요. 손님을 속여서 법으로 막아요.",
      "reason": "손님은 광고를 믿고 왔다가 실제와 달라서 속았다고 느낀 거예요."
    },
    "S4": {
      "action": "N일째에 외국산 떡을 국산이라고 써 붙였어요.",
      "event": "3일 동안 재료비가 500원이 됐고, M일째 할머니가 '국산 맞지?' 물었어요. {이어진 일}",
      "concept": "재료가 어디서 났는지 바르게 알리는 것을 **원산지 표시**라고 해요. 손님이 알고 고를 **소비자의 권리**를 지키려고 속이는 것을 막아요.",
      "reason": "외국산 떡이 나쁜 게 아니에요. 문제는 속인 거예요. 손님은 무엇을 먹는지 알고 고를 권리가 있어요."
    },
    "S5": {
      "action": "N일째에 머리카락이 나왔다는 말을 못 들은 척했어요.",
      "event": "다음 날 그 손님이 다시 왔어요. {이어진 일}",
      "concept": "손님이 안전한 음식을 먹고 피해를 보상받을 수 있는 것을 **소비자의 권리**라고 해요. 문제를 책임지는 것이 기업의 **사회적 책임**이에요.",
      "reason": "손님은 트집을 잡은 게 아니에요. 안전한 음식을 먹을 권리가 있어서 사과를 받으러 온 거예요."
    },
    "S6": {
      "action": "N일째에 아동센터에 떡볶이를 나눠 주느라 3만 원을 썼어요.",
      "event": "그날 별이 0.8 올랐어요.",
      "concept": "이윤만이 아니라 이웃과 사회를 생각하는 것을 기업의 **사회적 책임**이라고 해요.",
      "reason": "별이 오른 것도 맞지만 그게 다가 아니에요. 가게도 마을 사람들과 함께 살기 때문에 이웃을 돕는 거예요."
    },
    "S7": {
      "action": "N일째에 머리카락 불만에 사과하고 3,000원을 돌려줬어요.",
      "event": "그날 별이 0.3 올랐고, 더 이어진 일은 없었어요.",
      "concept": "손님은 피해를 보상받을 **소비자의 권리**가 있어요. 잘못을 바로 책임지는 것이 기업의 **사회적 책임**이에요.",
      "reason": "돈을 돌려준 건 손님이 울까 봐가 아니라, 손님에게 피해를 보상받을 권리가 있기 때문이에요."
    },
    "S8": {
      "action": "N일째에 회장님의 가격 약속을 거절했어요.",
      "event": "왕떡볶이가 500원을 내려 가격 전쟁이 벌어졌다가 M일째에 끝났어요.",
      "concept": "가게끼리 손님을 두고 겨루는 것을 **경쟁**이라고 해요. 경쟁하는 동안 손님은 더 싸게 살 수 있어요.",
      "reason": "가격 전쟁은 두 가게에는 힘들었지만, 손님은 그동안 더 싸게 사 먹었어요."
    }
  },
  "freedom": {
    "F1": "담합 약속을 하면 값을 스스로 정할 수 없게 돼요. 원래 가게는 상황에 맞게 값을 정할 **기업의 자유**가 있어요.",
    "F2": "값은 왕떡볶이나 나라가 정해 주지 않아요. 시장경제에서는 가게가 스스로 정해요. 이것이 **기업의 자유**예요.",
    "F3": "값은 한 번 정하면 끝이 아니에요. 가게는 날마다 상황에 맞게 값을 바꿀 수 있어요. 이것이 **기업의 자유**예요."
  },
  "comments": {
    "역할": [
      "날씨나 행사가 달라진 날 {n}번 중 {k}번, 재료를 알맞게 바꿨어요.",
      "왕떡볶이 값이 바뀌거나 손님을 더 많이 데려간 날 {n}번 중 {k}번, 내 값을 다시 정했어요.",
      "{d}일째에 {투자}에 투자해 가게를 키웠어요.",
      "날씨나 행사가 달라진 날 {n}번 중 {k}번만 재료를 바꿨어요."
    ],
    "가계": [
      "값이나 맛을 바꾼 날 {n}번 중 {k}번, 다음 날 손님 수에 맞춰 재료를 고쳤어요.",
      "인터뷰에서 손님이 값·맛·평판을 따져 가게를 고른다는 것을 짚었어요.",
      "값이나 맛을 바꿔 본 날이 없어서 손님 반응을 살펴볼 기회가 적었어요."
    ],
    "자유": [
      "스스로 정할 수 있던 {f}일 동안 값을 {p}번 바꾸고 투자를 {u}번 했어요.",
      "{a}일째~{b}일째({n}일)는 약속 때문에 값을 스스로 정할 수 없었던 날이에요."
    ],
    "책임": [
      "사건 5개 중 {n}개에서 받아들였을 때와 거절했을 때를 모두 확인했어요.",
      "지금까지 사건 갈래를 {k}개 확인했어요."
    ],
    "다음 판 도전": [
      "날씨나 행사 소식을 보고 재료 수를 바꿔 보세요.",
      "왕떡볶이 값이나 어제 손님 수를 보고 값을 다시 정해 보세요.",
      "5일째 전에 오래가는 투자를 해 보세요.",
      "값을 바꾼 다음 날, 손님 수를 보고 재료를 고쳐 보세요.",
      "값과 투자를 상황에 맞게 직접 바꿔 보세요.",
      "'{사건 제목}'에서 아직 골라 보지 않은 쪽을 고르면 무슨 일이 이어질까요?"
    ]
  },
  "labels": [
    "기업의 역할",
    "가계의 선택",
    "기업의 자유",
    "사회적 책임"
  ],
  "typeNote": "이 유형은 이번 판 10일 동안의 모습이에요. 다음 판에 다르게 해 보면 다른 사장님이 될 수 있어요.",
  "starNote": "이 별은 이번 판에서 해 본 것과 알아본 것을 보여 줘요. 다시 하면 달라져요.",
  "starHow": "해 본 것과 까닭 알기의 ● 개수를 더한 만큼 별을 받아요. ●가 하나도 없어도 별 1개는 있어요.",
  "roleChecks": ["수요 읽기", "가격 정하기", "투자"],
  "reasonLines": {
    "ok": "인터뷰에서 까닭을 짚었어요.",
    "other": "인터뷰에서는 다른 까닭을 골랐어요. '내 플레이 속 사회 공부'에서 실제 까닭을 볼 수 있어요.",
    "none": "이번 판에는 이 항목 질문이 없었어요."
  },
  "achievement": "[6사11-01] 시장경제에서 가계와 기업의 역할을 이해하고 근로자의 권리와 기업의 자유 및 사회적 책임을 탐색한다.",
  "studentAchievement": "사회 시간에 배우는 것: 시장에서 가계(손님)와 기업(가게)이 하는 일, 기업이 스스로 정할 수 있는 자유, 그리고 기업이 이웃과 사회를 위해 지켜야 할 책임이에요.",
  "excluded": "근로자의 권리는 이 게임에서 다루지 않아요.",
  "rightAnswer": "인터뷰에서도 까닭을 짚었어요.",
  "cardOk": "인터뷰에서 '{보기}'라고 답했죠. 바로 그 까닭이에요!",
  "cardOther": "인터뷰에서 '{보기}'라고 답했죠. 그렇게 볼 수도 있어요. 그런데 실제 까닭은 이거예요. {실제 까닭}"
};
