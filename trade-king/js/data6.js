/* 무역왕 6.0 — 실시간 경제 수치. 나라 이름·품질·그림·엔딩 글은 data.js(TRADE)를 그대로 쓴다. 모든 수는 정수(상자·원)다. */
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.TRADE6 = data;
})(globalThis, function () {
  'use strict';
  // 6.4 물건 6종을 산업 단계로 나눈다. 순서(번호)는 옛 5종과 호환되게 두고 철강을 5번에 더했다.
  //   1차(캐고 기르는 것): 식량 0, 석유 1, 철광석 4 · 2차(만든 것): 옷 2, 철강 5 · 3차(첨단): 첨단기기 3
  //   사다리: 철광석 → 철강 → 첨단기기 (economy.chain). 철강 1상자에 철광석 1상자, 첨단기기 1상자에 철강 1상자(economy.inputPer).
  // [id, 이름, 아이콘(map-art), 색, 기본 값(원), 배 한 번 적재량(=산업 1단계 계절 생산), 값 출렁임, 국민 필요량 비율, 단계]
  // 계절 필요량 = 비율 × (3 + 인구/2)를 반올림(최소 1). 철광석·철강은 국민이 아니라 공장만 쓴다(비율 0): 바구니(점수)에는 식량·석유·옷·첨단기기 4가지만 들어간다.
  const goods = [
    ['food',  '식량',   'wheat', '#cda034', 20, 4, .25, 1.3, 1],
    ['oil',   '석유',   'oil',   '#d4773f', 30, 3, .4,   .9, 1],   // 7.7b 계획 C: 거의 모든 판의 석유 부족 완화
    ['cloth', '옷',     'shirt', '#c56581', 35, 3, .15, 1.0, 2],
    ['tech',  '첨단기기', 'robot', '#5889bc', 120, 1, .1, .25, 3],
    ['ore',   '철광석', 'iron',  '#87959c', 20, 4, .3,  0, 1],
    ['steel', '철강',   'steel', '#6b7f99', 35, 3, .2,  0, 2]
  ].map(([id, name, icon, color, price, load, vol, need, tier]) => ({id, name, icon, color, price, load, vol, need, tier}));
  // 시작 산업 단계(식·석유·옷·기기·광석·강), 품질 ⭐(같은 순서), 대표 물건, ♥3 나라별 혜택. 인구는 data.js 일꾼 수.
  // 7.7b 봇 검사로 맞춘 것: 대표 물건이 가장 많이 남고, 모든 나라에 생활품 두 가지가 모자라게 둔다.
  // 1차: 대평원·숲(식량), 석유 왕국(석유) · 2차: 철의 나라(철광석→철강), 큰 시장(옷·철강), 장인(명품 옷) · 3차: 다온·항구(철강을 사 와 첨단기기).
  // 석유 공급은 여러 나라로 나눈다. 공장 재료는 철광석→철강→첨단기기 사슬을 유지한다.
  const countries = {
    // 다온국은 큰 배(짐칸 6칸)로 시작한다(6.3): 철강을 사 와야 하는 첨단기기 나라의 짐칸 부담을 덜어 준다.
    // 6.4 봇 검사로 맞춘 것: 다온 식량 1→2(수입 4가지를 3가지로), 장인 옷 2→3·첨단기기 2→3(팔 게 없던 나라), 철강 값 45→35. 몰빵 봇 68~79점, 1등 쏠림 최대 35%.
    // 7.7b 식량 2→1·석유 1→2: 석유 공급 분산, 식량·옷은 계속 사 온다.
    // 8.0 옷 1→2: 누적 점수에서 1등 4%로 너무 어려워 생활 바구니 보완(봇 960판, SPEC-v79 8.0 절)
    daon:     {levels: [1, 2, 2, 6, 0, 0], quality: [2, 1, 2, 3, 2, 2], main: 3, bonus: 'discount',   bonusText: '♥3이면 계약값을 한 번 더 깎아 줘요', bigShip: true},
    plains:   {levels: [4, 1, 2, 0, 3, 2], quality: [2, 2, 1, 1, 2, 1], main: 0, bonus: 'crisisKeep', bonusText: '♥3이면 태풍·분쟁 때도 계약 물건을 보내 줘요'},
    // 7.0 석유 왕국 옷 2 → 1: 모자란 게 첨단기기뿐이라 고민이 없던 나라(봇 1등 53% → 40%)
    // 7.7b 석유 4→5(계획 C), 식·석유·옷 품질 1·2·1→2·3·2: 기기 부족은 남기고 생활·수출 수입 보완.
    oil:      {levels: [2, 5, 1, 0, 0, 0], quality: [2, 3, 2, 1, 2, 2], main: 1, bonus: 'crisisKeep', bonusText: '♥3이면 분쟁 때도 석유를 보내 줘요'},
    // 큰 시장국 식량 3 → 2(6.3): 인구가 많아 식량을 사 와야 한다. 봇 1등 60% → 25%로 쏠림 완화.
    // 7.7b 석유 1→2(계획 C), 기기 3→2·품질 2→1: 큰 시장의 자급·고품질 우세 완화.
    market:   {levels: [2, 2, 4, 2, 0, 2], quality: [2, 1, 2, 1, 1, 1], main: 2, bonus: 'bigBuyer',   bonusText: '♥3이면 우리 물건을 한 번에 1상자 더 사 줘요'},
    // 7.7b 석유 1→2·옷 2→1: 곡창·관광은 유지하고 옷·기기를 수입한다.
    forest:   {levels: [4, 2, 1, 0, 0, 0], quality: [3, 1, 2, 1, 1, 1], main: 0, bonus: 'crisisKeep', bonusText: '♥3이면 태풍 때도 식량을 보내 줘요'},
    // 7.7b 식량·석유 품질 1→2: 중계국의 낮은 생활 품질 보완, 두 수입품은 그대로.
    // 8.0 식량 1→2: 누적 점수에서 1등 2%로 너무 어려워 생활 바구니 보완(석유·기기는 계속 수입)
    port:     {levels: [2, 1, 2, 3, 0, 0], quality: [2, 2, 2, 2, 1, 1], main: 3, bonus: 'fast',       bonusText: '♥3이면 그 나라 뱃길이 한 달 짧아져요', extraShip: true},   // 항구 섬나라는 배가 1척 많다
    // 7.7b 석유 0→1(계획 C)→2·기기 3→0: 명품 옷에 특화, 식량·기기를 사 와 과한 자급 우세 완화.
    artisan:  {levels: [1, 2, 3, 0, 0, 0], quality: [1, 1, 3, 3, 2, 2], main: 2, bonus: 'discount',   bonusText: '♥3이면 계약값을 한 번 더 깎아 줘요'},
    // 7.7b 석유 2→3(계획 C)·기기 0→1: 철강을 조금 가공해 기기 부족 보완, 식량·옷은 수입.
    ironland: {levels: [1, 3, 1, 1, 4, 4], quality: [2, 2, 1, 1, 3, 3], main: 5, bonus: 'crisisKeep', bonusText: '♥3이면 분쟁 때도 철강·석유를 보내 줘요'}
  };
  // 7.0 나라 특성(NATIONS-v7.md): 그 나라에만 늘 켜져 있는 규칙 하나. NPC도 같은 특성으로 돈다. 숫자는 economy.trait.
  const traits = {
    daon:     {id: 'process', name: '가공 무역', icon: '🏭', short: '철강 1상자로 첨단기기 2상자 · 철강이 2계절 끊기면 공장이 녹슬어요', level: '어려움'},
    plains:   {id: 'granary', name: '곡창과 원조', icon: '🌾', short: '풍년엔 식량 1.5배, 흉년엔 절반 · 받아 올 것 없이 보내면 원조(♥+2)', level: '쉬움'},
    oil:      {id: 'resource', name: '자원 부국', icon: '⛽', short: '석유를 40% 비싸게 팔아요 · 캘수록 유전이 늙어 덜 캐요', level: '보통'},
    market:   {id: 'consumer', name: '소비 대국', icon: '🛒', short: '다른 나라가 10% 깎아 줘요 · 바구니 한 칸이 비면 −5점 더', level: '쉬움'},   // 8.0b 난이도 = 처음 하는 학생 흉내(무작위 봇) 한 해 평균: 큰 시장 81.0·대평원 77.8 쉬움, 다온 74.1·장인 71.7 어려움, 나머지 75.8~76.5 보통
    forest:   {id: 'tourism', name: '관광과 환경', icon: '🏝', short: '♥2 친구 하나당 계절마다 관광 15억 · 공장을 키우면 관광이 줄어요', level: '보통'},
    port:     {id: 'relay', name: '중계 무역', icon: '🔁', short: '사 온 물건을 다른 섬에 되팔 수 있어요 · 되팔면 +15%', level: '보통'},
    artisan:  {id: 'luxury', name: '명품', icon: '✨', short: '⭐3 물건을 30% 비싸게 · 한 항로에 2상자까지만', level: '어려움'},
    ironland: {id: 'heavy', name: '중공업', icon: '💨', short: '철광석·철강 계약은 2년 동안 값 고정 · 공장이 클수록 공해로 생활 점수가 깎여요', level: '보통'}
  };
  for (const [id, t] of Object.entries(traits)) countries[id].trait = t;
  // 발전 회의 카드: [id, 이름, 비용, 효과]
  const cards = [
    ['grow', '강점 산업 키우기', 240, '대표 물건 산업 +1단계'],
    ['climb', '새 산업 키우기', 240, '첨단기기 산업 +1단계'],
    ['protect', '약한 산업 지키기 🛡', 160, '고른 물건 +1단계 · 수입값 +20% · 생활 −2 · 상대 신뢰 −1'],
    ['warehouse', '비축 창고', 160, '창고에 두 배까지 쌓아 둠'],
    ['bigShip', '큰 배', 200, '배마다 짐칸 +2칸'],
    ['moreShip', '배 한 척 더', 200, '배 +1척 (최대 5척)'],
    ['quality', '품질 높이기', 200, '대표 물건 ⭐+1 · 새 계약부터 값 +10%'],
    // 7.0 특성 카드: 재생 에너지(세계 석유값이 기본의 1.3배를 넘으면 모든 나라), 정화 시설(철의 나라)
    ['renewable', '재생 에너지 🌱', 200, '석유 필요 −2 (영구)'],
    ['cleaner', '정화 시설 🌳', 160, '공해 감점 절반 (영구)']
  ].map(([id, name, cost, text]) => ({id, name, cost, text}));
  // 7.9 증강체 = 콘셉트 10가지 × 실버·골드·프리즘(SPEC-v79 3.2). [id, 이름, 콘셉트, 등급, 투자금, 효과, 마지막 해에도 나옴, 그 나라만]
  // cleaner는 옛 도감 기록용으로만 남긴다(회의에 안 나옴).
  const concepts = [
    ['factory','🏭','공장 왕국','대표 물건을 많이 만들어요','대표 물건 수출값 +10%','대표 산업 +1 더'],
    ['sea','⛵','바다의 개척자','배와 항로로 앞서요','배마다 짐칸 +1','모든 왕복 −1달(최소 1달)'],
    ['merchant','💰','큰 상인','돈이 돈을 벌어요','세금 +50%','모든 판매값 +10%'],
    ['diplomat','🤝','외교관','친구가 힘이에요','♥3 혜택을 ♥2부터','♥1에도 계약 요청이 와요 · 위약금 절반'],
    ['artisan','✨','명품 장인','적게 팔아도 비싸게','품질 점수 +2','모든 생활 물건 ⭐2 이상'],
    ['hoarder','🏚','비축가','창고를 가득 채워요','풍요 점수 +2.5','위기 피해 절반'],
    ['self','🛡','자립','우리 것은 우리가','지키기 생활 벌점 없음','공급 끊김 피해 없음'],
    ['tech','🔬','기술 강국','첨단기기로 가요','첨단기기 값 +15%','첨단기기 산업 +1'],
    ['green','🌱','녹색 성장','석유에서 벗어나요','석유 위기 피해 없음','숲·환경 사건에서 늘 좋은 쪽'],
    ['adventurer','🎲','모험가','위험을 걸고 크게','다시 뽑기 +1번','큰 사건의 돈 드는 선택 절반 값']
  ].map(([id,icon,name,motto,b2,b3])=>({id,icon,name,motto,b2,b3}));
  const augment = [
    ['grow','강점 산업 키우기','factory','silver',0,'대표 산업 +1단계',1],
    ['factory','공장 늘리기','factory','gold',0,'대표 산업 +1 · 정산마다 대표 물건 +1상자',1],
    ['revolution','산업 혁명','factory','prism',0,'대표 산업 +2 · 정산마다 대표 물건 +2상자 · 가장 약한 산업 +1',1],
    ['navigator','노련한 항해사','sea','silver',0,'북쪽 대륙 왕복 −1달',1],
    ['bigShip','큰 배','sea','gold',0,'배마다 짐칸 +2',1],
    ['moreShip','배 한 척 더','sea','gold',0,'배 +1척 · 최대 5척(항구 6척)',1],
    ['armada','대선단','sea','prism',0,'배 +1척 · 모든 배 짐칸 +1 · 3달 넘게 걸리는 항로 −1달',1],
    ['fund','비상금','merchant','silver',0,'금고 +150억',1],
    ['bonus','수출 장려금','merchant','gold',0,'수출 1상자마다 +3억',1],
    ['interest','복리 금고','merchant','prism',0,'정산마다 금고의 8% 이자(최대 60억, 빚이면 없음) · 수출 1상자마다 +2억',0],
    ['envoy','친선 사절','diplomat','silver',0,'이웃 나라 모두 ♥+1',1],
    ['regular','단골 무역','diplomat','gold',0,'같은 나라와 다시 계약할 때마다 값 5% 유리 · 최대 15%',0],
    ['fta2','자유 무역 지대','diplomat','prism',0,'♥가 가장 높은 두 나라와 FTA · 신뢰가 ♥1 아래로 안 떨어짐',1],
    ['quality','품질 높이기','artisan','silver',0,'대표 물건 ⭐+1',1],
    ['school','장인 학교','artisan','gold',0,'생활 물건 두 가지 ⭐+1',1],
    ['brand','세계적 브랜드','artisan','prism',0,'대표 물건 ⭐3 · 그 물건 값 +20% · 사려는 나라 +1',1],
    ['warehouse','비축 창고','hoarder','silver',0,'창고에 두 배까지 쌓아요',1],
    ['granaryKeep','곳간 관리','hoarder','gold',0,'다음 계절 필요량의 절반만 남아도 풍요로 쳐요',1],
    ['plenty','풍요의 나라','hoarder','prism',0,'풍요 점수 2배 · 창고 세 배',1],
    ['protect','약한 산업 지키기','self','silver',0,'고른 산업 +1 · 수입값 +20% · 생활 −2',1],
    ['selfReliance','자급자족','self','gold',0,'가장 많이 사 오는 생활 물건 +2단계',1],
    ['autarky','자립 경제','self','prism',0,'모자란 생활 물건마다 +1단계 · 대신 수입값 +20%',1],
    ['climb','새 산업 키우기','tech','silver',0,'첨단기기 산업 +1단계',1],
    ['automation','공장 자동화','tech','gold',0,'철강·첨단기기 재료 절반',1],
    ['innovation','기술 혁신','tech','prism',0,'첨단기기 +2단계 · ⭐+1 · 재료가 없어도 1단계만큼은 만들어요',1],
    ['lamps','전등 바꾸기','green','silver',0,'석유 필요 −1',1],
    ['renewable','재생 에너지','green','gold',0,'석유 필요 −2',1],
    ['greenRev','녹색 혁명','green','prism',0,'석유 필요 −3 · 정산마다 생활 +2점',1],
    ['charm','행운의 부적','adventurer','silver',0,'좋은 작은 돌발이 두 배 자주 와요',1],
    ['survey','시장 조사','adventurer','gold',0,'값 신호 2달 앞까지 · 계약값 5% 유리',1],
    ['treasure','보물선 탐험','adventurer','prism',150,'150억을 내면 1년 뒤 300~500억이 돌아와요(빚이 생길 수 있어요)',0],
    ['semiconductor','반도체 공장','tech','gold',0,'철강 1상자로 첨단기기 3상자',1,'daon'],
    ['granary','곡물 저장고','hoarder','gold',0,'흉년에도 식량이 평소만큼',1,'plains'],
    ['refinery','정유 공장','merchant','gold',0,'유전 노후 한 단계 늦춤 · 석유 수출 +10%',1,'oil'],
    ['shopping','쇼핑 축제','diplomat','gold',0,'빈 칸 벌점 −5 → −2',1,'market'],
    ['ecotour','생태 관광','green','gold',0,'관광 수입 +50%',1,'forest'],
    ['relayStore','중계 창고','sea','gold',0,'되팔기 +25% · 되팔 짐칸 +1 · 철강 산업 +2',1,'port'],
    ['luxStreet','명품 거리','artisan','gold',0,'명품을 한 항로에 3상자까지',1,'artisan'],
    ['modernSteel','제철소 현대화','factory','gold',0,'공해 −1점 · 철강 +1단계',1,'ironland']
  ].map(([id,name,concept,tier,cost,text,immediate,only=null])=>({id,name,concept,tier,cost,text,immediate:!!immediate,only}));
  for(const c of augment){const old=cards.find(x=>x.id===c.id);if(old)Object.assign(old,c);else cards.push(c);}
  // 8.1 항로 개성: 판마다 섬 두 곳의 항로에 좋은 특징 하나(good) + 값과 위험을 맞바꾸는 특징 하나(risk)를 붙인다. 우리 배에만 적용
  const laneTraits = [
    {id: 'current', icon: '🌊', name: '해류', kind: 'good', text: '물살을 타고 가요 · 왕복 15일 빨라요'},
    {id: 'fish', icon: '🐟', name: '어장', kind: 'good', text: '지나는 길에 고기를 잡아요 · 돌아올 때마다 식량 +1상자'},
    {id: 'pirates', icon: '🏴‍☠️', name: '해적 바다', kind: 'risk', text: '다른 상인이 꺼려 사는 값 10% 싸요 · 5번 중 1번 받은 상자 1개를 빼앗겨요'},
    {id: 'storm', icon: '⛈', name: '폭풍 바다', kind: 'risk', text: '오는 배가 드물어 파는 값 10% 비싸요 · 4번 중 1번 15일 늦어요'}
  ];
  const smallEvents = [
    ['tailwind','순풍','배 하나 3일 일찍 도착'],['headwind','역풍','배 하나 5일 늦음'],['fog','짙은 안개','모든 배 2일 늦음'],
    ['lost','유실물','옷 +1상자'],['fish','풍어','식량 +2상자'],['mice','창고 쥐','식량 −1상자'],['exchangeTech','기술 교류','다음 정산 첨단기기 +1상자'],
    ['donation','기부금','금고 +20억'],['repair','수리비','금고 −15억'],['merchant','상인 방문','대표 물건 2상자를 세계값에 팔아요','판다'],
    ['spark','값 반짝','한 물건 세계값 +15% · 30일'],['sale','할인 장터','한 물건 세계값 −15% · 30일'],['northSale','북쪽 대륙 특가','북쪽 대륙 값 −10% · 30일'],
    ['rumor','소문','다음 달 한 물건 값이 올라요'],['match','친선 경기','한 나라 ♥+1'],['misunderstanding','작은 오해','한 나라 ♥−1'],
    ['request','급한 부탁','대표 물건 1상자 보내면 ♥+1 · +20억','보낸다'],['craftsman','숙련공','다음 정산 품질 +1점'],
    ['festivalPrep','축제 준비','다음 정산 옷 필요 +1'],['students','견학 온 학생들','다음 정산 생활 +1점']
  ].map(([id,name,text,action=null])=>({id,name,text,action}));
  const rules79 = {tiers:['silver','gold','prism'],tierNames:{silver:'실버',gold:'골드',prism:'프리즘'},odds:[[1,0,0],[.4,.5,.1],[.1,.6,.3],[.1,.5,.4],[.2,.6,.2]],
    overFrom:100,overRate:.5,laneFast:15,laneFish:1,lanePrice:.1,pirateChance:.2,stormChance:.25,stormDelay:15,richYear:92,survivorYear:82,tradeGrow:80,tradeGrowMax:2,rerollCost:50,catchupChance:.5,fund:150,bonus:3,interestBonus:2,survey:.05,navigator:1,regular:.05,regularMax:.15,
    revolution:2,factoryBoxes:1,revolutionBoxes:2,armadaSlots:1,armadaFrom:3,interest:.08,interestMax:60,brandPrice:.2,refinery:.1,shopping:2,ecotour:1.5,relay:.25,
    industryStep:1,qualityStep:1,envoyRel:1,automation:.5,semiconductorPer:1/3,granaryFloor:1,refineryStages:1,luxMax:3,modernSteelLevel:1,pollutionReduction:1,relaySlots:1,brandQuality:3,ftaPartners:2,ftaFloor:1,
    schoolGoods:2,selfReliance:2,autarkyPrice:1.2,innovation:2,lamps:1,greenRev:3,greenScore:2,charm:2,treasure:150,treasureMin:300,treasureMax:500,keepHalf:.5,plentyMult:2,plentySeasons:6,
    // 콘셉트 모으기 보너스(3.3): c2 = 2장, c3 = 3장
    c2:{factory:.1,sea:1,merchant:1.5,artisan:2,hoarder:2.5,tech:.15,adventurer:1},c3:{factory:1,sea:1,merchant:.1,penalty:.5,artisan:2,hoarder:.5,tech:1,adventurer:.5},
    abundanceGood:2.5,abundanceMore:1.25,abundanceTimes:4,abundancePort:[0,0,2.5,5],smallMin:20,smallMax:34,smallActionChance:.6,actionDays:30,quietMax:38,startStock:.5,relaySteel:2,   // 7.9c 재미 조정(tuning-7.9c.md)
    
    goodSmall:['tailwind','lost','fish','exchangeTech','donation','merchant','match','request','craftsman','students'],
    small:{tailwind:-3,headwind:5,fog:2,lost:1,fish:2,mice:1,tech:1,donation:20,repair:15,merchant:2,request:1,requestMoney:20,up:1.15,down:.85,north:.9,priceDays:30,quality:1,cloth:1,score:1}};
  // 사건: [id, 이름, 종류, 위기, 징조(달 전), 처음 나오는 해, 선택지]
  const events = [
    ['supplyCut', '공급 끊김', 'crisis', true, 3, 2, ['돌아가는 길 · 100억: 그 나라에서 절반은 받아 옴', '아껴 쓰기: 9달 동안 그 물건 필요 −1, 생활 −3']],
    ['storm', '태풍과 흉년', 'crisis', true, 0, 2, ['비싸게라도 사기', '이웃에 도움 청하기: ♥2 이상 나라마다 식량 2상자']],
    ['recession', '세계 경제 위기', 'crisis', true, 3, 3, ['그래도 팔기', '나라가 돕기 · 100억: 6달 동안 생활 +4']],
    ['exchange', '환율 급등', 'crisis', true, 0, 2, ['수출에 힘쓰기: 6달 동안 대표 산업 +1단계', '아껴 쓰기: 많이 사는 물건 필요 −1, 생활 −3']],
    ['expo', '국제 박람회', 'opportunity', false, 0, 1, ['출품 · 60억: 대표 물건 새 계약 +10%', '안 함']],
    ['invention', '신기술 발명', 'opportunity', false, 0, 1, ['도입하기: 대표 산업 +1단계', '기술 나누기: ♥0을 뺀 나라 ♥+1']],
    ['voice', '국민 목소리', 'opportunity', false, 0, 3, ['농민 편: 식량 지키기 1년 무료', '소비자 편: 1년 동안 생활 +2']],
    ['dumping', '덤핑', 'problem', false, 0, 2, ['싸게 사기', '옷 지키기 1년 무료']],
    ['retaliation', '보복 관세', 'problem', false, 0, 3, ['보호 모두 풀기', '버티기: 6달 동안 팔 때 −10%', '대화하기 · 60억: ♥+1']],
    ['fta', 'FTA 제안', 'opportunity', false, 0, 4, ['♥가 가장 높은 나라와 FTA', '거절']],
    // 6.5 덤 사건(extra): 해마다 하나씩 더 뽑힌다. 위기는 한 판에 하나만.
    ['pirates', '해적 출몰', 'problem', false, 0, 2, ['호위 붙이기 · 80억: 그대로 다님', '돌아서 가기: 6달 동안 왕복 +1달'], true],
    ['bigOrder', '급한 주문', 'opportunity', false, 0, 2, ['급히 보내기: 대표 물건 재고 절반을 세계값 1.5배에 팖', '평소대로 팔기'], true],
    ['blackout', '에너지 부족', 'crisis', true, 0, 2, ['비싸게라도 사기', '아껴 쓰기: 6달 동안 석유 필요 −1, 생활 −2'], true],
    ['techBoom', '첨단기기 붐', 'opportunity', false, 0, 2, ['공장 올리기 · 150억: 첨단기기 +1단계', '구경만 하기'], true],
    ['strike', '파업', 'problem', false, 0, 2, ['임금 올려 주기 · 100억', '거절: 6달 동안 대표 산업 −1단계'], true],
    ['festival', '이웃 섬 축제', 'opportunity', false, 0, 1, ['선물 보내기 · 40억: ♥ 가장 낮은 나라 ♥+2', '안 가기'], true],
    ['shipwreck', '배 고장', 'problem', false, 0, 2, ['수리 · 80억: 바로 고침', '수리 안 함: 그 배 3달 쉬기'], true],
    ['tourists', '관광객 몰림', 'opportunity', false, 0, 2, ['맞이하기: 금고 +인구×15억', '조용히 지내기: 6달 동안 생활 +2'], true],
    ['tariffWar', '관세 전쟁', 'crisis', true, 0, 3, ['버티기', '협상 · 100억: ♥ 가장 높은 나라와 FTA'], true],
    // 6.5 나라별 특별 사건(only): 그 나라로 할 때만 나온다.
    ['daonLaunch', '신제품 발표회', 'opportunity', false, 0, 2, ['발표회 열기 · 100억: 첨단기기 ⭐+1', '조용히 팔기: 6달 동안 첨단기기 값 +20%'], true, 'daon'],
    ['plainsHarvest', '대풍년', 'opportunity', false, 0, 2, ['창고에 쌓기: 식량 +8상자', '이웃에 나누기: ♥2 이상 나라마다 ♥+1'], true, 'plains'],
    ['oilFind', '새 유전 발견', 'opportunity', false, 0, 2, ['개발 · 150억: 석유 +1단계', '아껴 팔기: 6달 동안 석유 값 +25%'], true, 'oil'],
    ['marketFair', '큰 장날', 'opportunity', false, 0, 2, ['장 크게 열기: 금고 +200억', '세금 깎아 주기: 6달 동안 생활 +3'], true, 'market'],
    ['forestFire', '산불', 'crisis', true, 0, 2, ['불 끄기 · 100억: 피해 없음', '버티기: 6달 동안 식량 −1단계'], true, 'forest'],
    ['portStorm', '항구 태풍', 'crisis', true, 0, 2, ['방파제 쌓기 · 120억: 피해 없음', '버티기: 6달 동안 왕복 +1달'], true, 'port'],
    ['artisanMaster', '명인 탄생', 'opportunity', false, 0, 2, ['옷 ⭐+1', '첨단기기 ⭐+1'], true, 'artisan'],
    ['mineAccident', '광산 사고', 'crisis', true, 0, 2, ['안전 공사 · 120억: 피해 없음', '버티기: 6달 동안 철광석 −1단계'], true, 'ironland']
  ].map(([id, name, kind, crisis, warn, minYear, options, extra = false, only = null]) => ({id, name, kind, crisis, warn, minYear, options, extra, only}));
  // 6.5 도감 배지: [id, 이름, 조건]
  const badges = [
    // [id, 이모지, 이름, 조건(잠겨 있어도 보임), 숨김이면 조건 대신 보이는 힌트]
    ['king', '👑', '무역왕', '5년 누적 점수 1등'], ['rich', '💰', '풍요의 나라', '한 해 평균 92점 이상'], ['honest', '📜', '약속의 나라', '계약을 한 번도 안 깸'],
    ['friend', '💞', '모두의 친구', '끝날 때 모든 이웃과 ♥2 이상 · 계약 요청이 와요'], ['allGoods', '📦', '여섯 물건 장수', '물건 6가지를 다 수출해 봄(여러 판 합쳐서)'], ['allNations', '🗺', '여덟 나라 여행', '여덟 나라로 다 해 봄'],
    // 7.2 새 배지(BOOK-v72.md 2장)
    ['explorer', '🧭', '바다의 탐험가', '한 판에 이웃 일곱 나라와 모두 거래함'], ['continent', '🏔', '대륙 상인', '한 판에 북쪽 대륙과 30상자 넘게 거래'],
    ['survivor', '🌪', '위기를 이긴 나라', '위기를 2번 겪고도 한 해 평균 82점 이상'], ['peace', '🕊', '대화의 나라', '관세 전쟁이나 보복 관세를 대화로 풂'],
    ['inventor', '🧩', '콘셉트 장인', '한 판에 같은 콘셉트 발전 카드 3장을 모음'], ['balance', '⚖', '균형 무역', '5년 수출과 수입 상자 차이가 10% 안'],
    ['boom', '🔥', '벼락부자', '한 해 금고 +300억 초과 · 생활 물건을 살 밑천'], ['loyal', '🤝', '단골 부자', '끝날 때 ♥3 나라 셋 이상 · 할인·먼저 받기'],
    ['guest', '🎪', '손님 맞이', '관광객 몰림 때 맞이하기를 고름', '바다 저편 손님을 반갑게 맞아 보세요'],
    ['giver', '💝', '나눌수록 커지는 것', '이웃에 식량·기술을 나누거나 원조를 보냄', '어려울 때 이웃에게 나눠 보세요']
  ].map(([id, emoji, name, text, hint = null]) => ({id, emoji, name, text, hidden: !!hint, hint}));
  // 7.2 무역 상식 카드(도감 📘). 설명은 6학년 사회 '세계 여러 나라와의 경제 교류' 수준. how = 잠겨 있을 때 보이는 힌트.
  const lessons = [
    ['trade', '🚢', '무역', '나라끼리 물건이나 서비스를 사고파는 것이에요. 이 게임의 목표는 생활 점수예요. 돈으로 생활 물건을 채우고, 빚은 먼저 갚아요.', '한 판을 끝까지 해 보세요'],
    ['expimp', '📦', '수출과 수입', '다른 나라에 물건을 파는 것은 수출, 다른 나라에서 사 오는 것은 수입이에요.', '물건을 한 번 수출해 보세요'],
    ['special', '🏭', '잘하는 것에 힘 모으기', '나라마다 잘 만드는 물건에 힘을 모으고 나머지는 사 오면, 모두가 더 많이 가질 수 있어요.', '대표 물건을 한 판에 20상자 넘게 수출해 보세요'],
    ['tariff', '🛃', '관세', '다른 나라에서 들어오는 물건에 매기는 세금이에요. 관세가 오르면 그 물건 값이 비싸져요.', '관세 전쟁·보복 관세 사건, 또는 북쪽 대륙에 한도까지 팔아 보세요'],
    ['protect', '🛡', '보호 무역', '우리 산업을 지키려고 수입을 막거나 관세를 높이는 것이에요. 상대 나라가 똑같이 맞설 수도 있어요.', '약한 산업 지키기 카드나 덤핑·보복 관세 사건'],
    ['fta', '🤝', '자유 무역 협정(FTA)', '두 나라가 서로 관세를 낮추거나 없애기로 한 약속이에요.', 'FTA 제안 사건, 또는 관세 전쟁에서 협상'],
    ['dumping', '📉', '덤핑', '물건을 제값보다 아주 싸게 다른 나라에 파는 것이에요. 그 나라 공장이 어려워질 수 있어요.', '덤핑 사건'],
    ['exchange', '💱', '환율', '우리 돈과 다른 나라 돈을 바꾸는 비율이에요. 환율이 오르면 수출에는 유리하고 수입품은 비싸져요.', '환율 급등 사건'],
    ['chain', '🔗', '공급망', '원료에서 완성품까지 여러 나라를 거쳐 물건이 만들어지는 흐름이에요. 한 곳이 끊기면 모두 어려워져요.', '공급 끊김·에너지 부족 사건, 또는 원료가 모자라 공장이 덜 만들 때'],
    ['aid', '💝', '원조와 협력', '도움과 약속으로 신뢰를 쌓아요. ♥0 거래 거절 · ♥2 계약 요청 · ♥3 할인·먼저 받기. ♥0은 새해에 ♥1로 돌아와요.', '이웃에게 나누거나 원조를 보내 보세요'],
    ['crisis', '🌧', '세계 경제 위기', '한 나라의 경제가 흔들리면 무역으로 이어진 다른 나라들도 함께 어려워져요.', '세계 경제 위기 사건'],
    ['process', '🏭', '가공 무역', '원료를 사 와서 물건으로 만든 뒤 다시 다른 나라에 파는 무역이에요.', '다온국이나 철의 나라로 해 보세요'],
    ['relay', '🔁', '중계 무역', '다른 나라에서 사 온 물건을 또 다른 나라에 되파는 무역이에요.', '항구 섬나라로 해 보세요'],
    ['resource', '⛽', '자원과 에너지', '석유 같은 자원은 나는 곳이 정해져 있어서, 값이 오르면 세계가 함께 영향을 받아요.', '석유 왕국으로 해 보거나 에너지 부족 사건'],
    ['environment', '🌳', '환경과 무역', '공장이 늘면 공해가 생길 수 있어요. 무역과 환경을 함께 생각해야 해요.', '철의 나라나 숲의 나라로 해 보세요'],
    ['depend', '🌐', '서로 기대어 사는 세계', '나라들은 필요한 것을 주고받으며 서로 기대어 살아요. 한 나라만으로는 모든 것을 만들 수 없어요.', '바다의 탐험가나 모두의 친구 배지를 얻어 보세요']
  ].map(([id, icon, name, text, how]) => ({id, icon, name, text, how}));
  // 7.2 선장 칭호: 도감 채움 비율(%) 이상이면 그 칭호
  const ranks = [[0, '🪢', '견습 선원'], [15, '🧭', '항해사'], [40, '☸', '선장'], [70, '👑', '무역왕']].map(([min, icon, name], k) => ({n: k + 1, min, icon, name}));
  // 7.2 사건 신문 그림(있는 것만, 오프닝 장면 그림을 다시 쓴다)
  const eventArt = {storm: 'ev_storm', pirates: 'ev_pirates', forestFire: 'ev_fire', invention: 'ev_invention', techBoom: 'ev_invention', marketFair: 'ev_market', bigOrder: 'ev_market', festival: 'ev_festival'};
  // 6.4c 먼 바다 상인 → 북쪽 대륙: 지도 위쪽 가장자리에 걸친, 고를 수 없는 큰 나라. 규칙(worldBuy·worldSell·worldLimit·worldTrip)은 그대로다.
  const world = {name: '북쪽 대륙', title: '뭐든 다 있는 큰 나라', lines: [
    '우리 물건은 싸게 사고, 자기 물건은 비싸게 팔아요.',
    '너무 커서 작은 섬나라 하나는 기억하지 않아요. ♥가 안 쌓여요.',
    '관세 때문에 한 해에 물건 한 가지당 8상자까지만 받아 줘요.'
  ]};
  return {
    version: 7, goods, countries, cards, concepts, smallEvents, rules79, laneTraits, events, badges, lessons, ranks, eventArt, world,
    economy: {
      debtStep: 50, debtPoints: 2, debtMax: 10,   // 빚 50억마다(올림) 정산 감점, 최대 10점
      startMoney: 200, taxPerPop: 10, contractTrips: 4, tripMonths: [2, 2, 3, 3], tripSets: [[2, 2, 3, 3], [1, 2, 3, 4], [1, 2, 3, 4]], worldTrip: 4,   // 8.1 판마다 거리 묶음 하나를 뽑는다(합 10 유지)
      cutMonths: 9, crisisPoints: 15, relStart: 1, relMax: 3, visitRel: 2, missLimit: 2, storeSeasons: 2, warehouseSeasons: 4, declineYears: 1,
      worldBuy: .7, worldSell: 1.4, worldLimit: 8, shipSlots: 3, bigShipSlots: 2,   // 8.4 기본 짐칸 3칸, 항구 단계마다 +1(커진 항구 4·무역 도시 5)
       playerShips: 3, openShips: 3, npcShips: 3, npcTripExtra: 2, maxShips: 5,
      // 8.4 점수: 생활 물건 4가지 × 20 = 80 + 좋은 품질(⭐3) 4가지 × 5 = 20 → 100점, 풍요는 그 위 보너스
      drift: .6, priceTarget: 1, slotPoints: 20, qualityPoints: [0, 0, 2, 5], unrest: 2, monthSeconds: 10, pauseSeconds: 20,
      // 6.4 투입 사다리: [재료, 제품] 순서대로 만든다. 제품 1상자에 재료 inputPer상자. 재료가 모자라면 그만큼만 만든다(공장이 국민보다 먼저 가져간다).
      chain: [[4, 5], [5, 3]], inputPer: 1, factoryIdle: true,   // factoryIdle: 제품 창고가 차면 공장이 쉰다(재료를 헛되이 쓰지 않는다)
      // 6.3 세계 경제 위기: 1차 물건(식량·석유·철광석) 값은 반토막, 만든 물건(옷·철강·첨단기기)은 조금만 내린다. 징조 때는 1차 물건만 먼저 흔들린다.
      recessionRaw: .5, recessionMade: .85, recessionWarnRaw: .8,
      // 7.7b 매장량 160→200·경계 81·41→101·51: 생산 증가에도 노후 시점 유지(15→12→9→3상자).
      // 석유 수출 +20→40%: 원자재로 벌어 기기를 살 여유 보완(첫 회의 구매 검사도 유지).
      // 중계 비축 1.5→1.2배: 되팔 짐을 과하게 사느라 국민 물건이 비던 항구 봇 보완.
      trait: {daonPer: .5, rustSeasons: 2, weather: [.3, .5, .2], harvest: [1.5, 1, .5], aidRel: 2, oilSell: 1.4, oilReserve: 200, oilStages: [101, 51, 1],
        renewAt: 1.3, renewNeed: 2, marketDiscount: .9, emptyPenalty: 5, tourPerFriend: 15, tourCut: 15, relayBonus: 1.15, relayStock: 1.2,
        luxBonus: 1.3, luxMax: 2, longYears: 2, pollutionPer: 3,
        good: {daon: 2, plains: 4, oil: 2, market: 2, forest: 750, port: 300, artisan: 20}}
    }
  };
});
