/* 떡볶이 타이쿤 — 콘텐츠·경제 규칙 데이터
 * 무대: 다온초등학교 앞. 플레이어는 '떡볶이 사장님', 길 건너엔 왕부자 회장의 체인점 '왕떡볶이'.
 * 하루: 아침 준비(가격·재료·투자) → 장사(손님이 가게를 고름) → 저녁 정산 → 사건
 */
window.TTEOK = {
  dayCount: 10,
  start: { money: 100000, taste: 3, rep: 3, fair: 100 },
  rent: 25000,            // 하루 가게 임대료
  ingredient: 800,        // 떡볶이 1인분 재료비
  prices: [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
  portions: [20, 30, 40, 50, 60, 70, 80],
  baseVisitors: 70,       // 학교 앞을 지나는 아이들
  capacity: 40,           // 하루에 만들어 팔 수 있는 최대 그릇 수(의자·알바로 늘어남)

  /* 손님(가계)의 선택: 용돈 안에서 만족이 가장 큰 곳을 고른다
   * 만족 = 맛 × tasteW + 평판 × repW − (가격 / 1000) × 가격 민감도 + 작은 무작위
   * 어느 가게의 만족도 outside 보다 낮거나 용돈이 모자라면 사 먹지 않는다 */
  customer: {
    budgets: [[2000, 0.08], [3000, 0.22], [4000, 0.35], [5000, 0.35]],
    tasteW: 1, repW: 0.6, priceW: [0.6, 1.3], outside: 0.8, noise: 0.9,
    cartelOutside: -0.5   // 담합 중: 두 가게가 똑같이 비싸서 다른 데가 없으니 비싸도 사 먹는다
  },

  /* 평판(별) 변화: 맛, 가격, 다 팔려서 돌아간 손님, 사건 */
  repRules: { tastePer: 0.25, cheapBonus: 0.15, pricyPenalty: 0.2, turnedAwayEach: 0.02, turnedAwayMax: 0.4 },

  /* 투자 카드: 하루에 하나. once = 한 번 사면 계속 효과 */
  upgrades: {
    cheese:  { name: '치즈 토핑',   cost: 30000, taste: 1,   once: true },
    sundae:  { name: '순대 메뉴',   cost: 35000, taste: 0.5, visitors: 0.1, once: true },
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
    normal: { name: '보통 왕떡볶이', price: 3000, taste: 3, rep: 3, line: '어디 한번 붙어 봅시다! 허허!' }
  },
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
  thoughts: {
    mine: ['맛있어!', '여기 최고!', '또 올래!'],
    rival: ['저기가 더 싸네', '왕떡볶이 갈래'],
    truck: ['푸드트럭 갈래!', '트럭이 싸다!'],
    cartel: ['비싸지만 어쩔 수 없지…', '다른 데도 4,000원이야…'],
    none: ['용돈이 모자라…', '너무 비싸…', '그냥 집에 갈래'],
    soldout: ['다 팔렸대…', '줄이 너무 길어']
  }
};
