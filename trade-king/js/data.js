/* 무역왕 5.0 — 화면과 봇이 함께 쓰는 규칙 데이터. 모든 수는 정수(상자·원)다. */
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.TRADE = data;
})(globalThis, function () {
  'use strict';
  // [id, 이름, 아이콘, 기본 값(원), 일꾼 1명당 필요량, 색]
  const goods = [
    ['food', '식량', 'wheat', 3, 1, '#cda034'], ['energy', '에너지', 'oil', 3, .7, '#d4773f'],
    ['life', '생활용품', 'box', 2, .7, '#c56581'], ['tech', '기술제품', 'chip', 4, .5, '#5889bc'], ['iron', '철', 'iron', 2, .3, '#87959c']
  ].map(([id, name, icon, price, rate, color]) => ({id, name, icon, price, rate, color}));
  // 생산: 일꾼 1명이 만드는 상자 수. 품질: 1~3(⭐).
  const countries = [
    ['daon', '다온국', 'chipLand', 6, [1,0,2,5,1], [2,1,2,3,2], '자원 적음 · 기술 높음', '기술 개발', '공장 키우기 비용 반값', '식량과 에너지를 사 와야 해요.', ['기술 수출국','식량 지키기'], [2,1,5,3], '#b8d9f0'],
    ['plains', '대평원국', 'plains', 5, [8,1,2,1,2], [2,2,1,1,2], '땅 넓음 · 곡물 풍부', '곡물 수출국', '먼 바다 상인에게 식량을 제값에 팔고, 남은 식량을 두 배까지 넘겨요', '기술제품을 잘 못 만들어요.', ['곡물 수출 대국','가공 산업'], [5,3,2,3], '#e7dfa5'],
    ['oil', '석유 왕국', 'oilKingdom', 3, [1,4,1,0,1], [1,2,1,1,2], '석유 많음 · 인구 적음', '석유 부자', '에너지 값이 기본보다 높으면 팔 때 +1원', '일손이 적고 석유 말고는 약해요.', ['팔 때를 노려라','석유 이후 준비'], [2,5,2,1], '#f1d1a1'],
    ['market', '큰 시장국', 'bigMarket', 9, [2,1,7,3,1], [2,1,2,2,1], '인구 많음 · 큰 공장', '많은 일손', '일꾼이 가장 많아요', '바구니가 커서 많이 사야 해요.', ['세계의 공장','기술로 올라가기'], [4,2,3,5], '#e4bdd5'],
    ['forest', '숲의 나라', 'forest', 5, [5,1,2,1,1], [3,1,2,1,1], '덥고 비 많음 · 열대 농장', '열대 과일', '공정무역 약속 뒤 식량 팔 때 +1원', '기술과 에너지가 약해요.', ['농장 수출','공정무역'], [4,4,1,3], '#b5d9be'],
    ['port', '항구 섬나라', 'hubCity', 4, [1,1,3,4,1], [1,1,2,2,1], '작은 땅 · 길목 항구', '길목 항구', '다른 나라끼리 거래할 때마다 수수료를 받아요', '태풍이 오면 크게 흔들려요.', ['세계의 항구','친구 많은 섬'], [1,2,3,2], '#b4dfe0'],
    ['artisan', '장인의 나라', 'straitIsle', 5, [1,1,3,3,1], [1,1,3,3,2], '자원 부족 · 솜씨 좋음', '장인 솜씨', '⭐3 물건을 팔 때 +1원', '식량과 에너지를 사 와야 해요.', ['명품 수출','골고루 자급'], [3,3,5,3], '#cfcae8'],
    ['ironland', '철의 나라', 'factoryIsle', 4, [1,2,1,1,7], [2,2,1,1,3], '광물 풍부 · 제철 산업', '광물 많음', '철 공장을 키우면 철 팔 때 +1원', '원자재만 팔면 값이 낮아요.', ['원자재 수출','가공해서 팔기'], [3,5,2,2], '#c7d2d8']
  ].map(([id,name,portrait,workers,production,quality,condition,ability,abilityText,weakness,strategies,stats,color]) => ({id,name,portrait,workers,production,quality,condition,ability,abilityText,weakness,strategies,stats,color,art:`country-${id}`}));
  // [id, 이름, 아이콘, 종류, 위기, 처음 나오는 해, 설명, 무역 노트, 선택지]
  const events = [
    ['restriction','갑작스러운 수입 제한','ship','problem',false,2,'{source}이 다른 나라 물건 수입을 줄였어요. 올해 팔 때 1원 덜 받아요. 작년에 한 나라에만 팔았다면 2원 덜 받아요.','여러 나라에 팔면 한 시장이 닫혀도 버틸 수 있어요.',['새 시장 찾기 · 4원: 피해 없음','그냥 버티기: 팔 때 값 깎임']],
    ['retaliation','보복 관세','factory','problem',false,3,'우리가 보호를 켜자 {source}이 맞서 우리 물건에 세금을 붙였어요.','관세 싸움은 두 나라 국민 모두를 힘들게 할 수 있어요.',['보호 모두 끄기: 보복 멈춤','버티기: 올해 팔 때 1원 덜 받음','대화하기 · 3원: 보복 멈춤, ♥+1']],
    ['exchange','환율 급등','coin','problem',true,2,'외국 돈 값이 크게 올랐어요. 올해 수입값이 두 배예요. 대신 팔 때는 1원 더 받아요.','환율이 오르면 수입은 비싸지고 수출은 유리해져요.',['수출에 힘쓰기: 대표 공장 1명당 +1','아껴 쓰기: 가장 많이 사는 칸 필요량 −1, 생활 −3']],
    ['recession','세계 경제 위기','coin','problem',true,3,'세계 사람들이 지갑을 닫았어요. 올해 팔 때 값이 절반이에요.','세계가 이어져 있어 한 곳의 위기가 모두에게 번져요.',['그래도 팔기','나라가 돕기 · 3원: 생활 수준 +4']],
    ['dependence','공급 끊김','oil','problem',true,2,'{source}에 분쟁이 생겨 {good} 수출을 줄였어요. 사이가 ♥1 이하인 나라에는 팔지 않고, 다른 나라에는 1원 비싸게 팔아요. 작년에 {good}을 거의 다 {source}에서 샀다면 피해가 더 커요.','한 나라에 너무 기대면, 그 나라에 일이 생길 때 크게 흔들려요.',['돌아가는 길 찾기 · 5원: 끊김 피해 없음','아껴 쓰기: {good} 필요량 −1, 생활 −3']],
    ['storm','태풍과 흉년','ship','problem',true,2,'태풍이 와서 올해 식량 공장 1명당 생산이 1 줄고, 식량 사는 값이 2원 올라요.','날씨와 바닷길도 무역에 영향을 줘요. 남겨 둔 상자는 보험이에요.',['비싸게라도 사기','이웃에 도움 청하기: ♥2 이상인 나라마다 식량 1상자']],
    ['dumping','덤핑 공세','box','problem',false,2,'{source}이 생활용품을 아주 싸게 팔아요. 올해 생활용품 값이 1원 내려요.','싼 수입품은 소비자에게 좋지만 우리 공장을 흔들 수 있어요.',['싸게 사기','우리 공장 지원: 생활용품 보호를 올해 무료로']],
    ['defect','불량품 소동','box','problem',false,3,'작년에 산 ⭐1 물건 중에 불량품이 나왔어요.','싼 물건만 고르면 품질 문제가 생길 수 있어요.',['바꿔 달라 하기: 판 나라 ♥−1, 1상자 받기','그냥 쓰기: 올해 품질 점수 −2']],
    ['fta','FTA 제안','check','opportunity',false,4,'{source}이 자유 무역 협정(FTA)을 맺자고 해요.','FTA는 서로 관세를 없애고 거래를 쉽게 하는 약속이에요.',['협정 맺기: 서로 보호 없음, 1원 할인','이번에는 거절']],
    ['expo','국제 박람회','star','opportunity',false,1,'우리 대표 상품이 세계 박람회에 초대받았어요.','우리 상품을 알리면 새로운 손님을 만나요.',['출품하기 · 2원: 대표 상품 팔 때 +1원','안 하기']],
    ['invention','신기술 발명','chip','opportunity',false,1,'새 도구가 대표 공장의 일을 도와줘요.','기술이 발전하면 같은 일손으로 더 많이 만들어요.',['도입하기: 대표 공장 1명당 +1','기술 나누기: 모든 나라와 ♥+1']],
    ['voices','국민 목소리','person','opportunity',false,3,'농민은 "우리 농사를 지켜 주세요", 소비자는 "싸게 사고 싶어요"라고 해요.','생산자 보호와 소비자 물가 사이에는 선택이 필요해요.',['농민 편: 식량 보호를 올해 무료로','소비자 편: 올해 생활 수준 +4']]
  ].map(([id,name,icon,kind,crisis,minYear,text,note,choices]) => ({id,name,icon,kind,crisis,minYear,text,note,choices,rarity:crisis?'위기':kind==='opportunity'?'기회':'문제',art:`event-${id}`}));
  // [id, 이름, 비용, 설명]
  const policies = [
    ['grow','공장 키우기',6,'고른 공장 1명당 +1상자'],
    ['reopen','공장 다시 열기',4,'문 닫은 공장을 다시 열어요'],
    ['warehouse','비상 창고',4,'남은 상자를 필요량의 두 배까지 넘겨요'],
    ['ships','배 늘리기',5,'해마다 보낼 수 있는 배 +1척 (최대 5척)'],
    ['fta','FTA 맺기',3,'♥3 나라와 서로 보호 없음 · 1원 할인'],
    ['friends','새 친구 찾기',3,'♥1 이하 나라 모두 ♥+1']
  ].map(([id,name,cost,text]) => ({id,name,cost,text}));
  const endings = [
    ['power','무역 강국','잘 만드는 것을 나누고 여러 나라와 연결했어요.','교역 상대가 많으면 어떤 점이 좋을까요?','ship'],
    ['dependent','수입에 기댄 나라','평소에는 넉넉했지만 한 나라가 흔들리자 크게 흔들렸어요.','수입이 끊길 때 어떤 준비가 필요할까요?','oil'],
    ['alone','혼자 사는 나라','스스로 만들었지만 바구니를 모두 채우기는 어려웠어요.','우리에게 없는 것을 어떻게 구할 수 있을까요?','home'],
    ['balanced','균형 잡힌 나라','무역하면서도 약한 공장을 지켜 위기를 넘겼어요.','보호에 드는 비용은 언제 감수할 만할까요?','basket'],
    ['war','관세 전쟁','서로 세금을 올리는 동안 물가와 사이가 흔들렸어요.','관세 싸움을 멈추려면 무엇이 필요할까요?','factory'],
    ['fair','친구 많은 나라','대화와 약속으로 여러 나라와 사이좋게 지냈어요.','사이좋은 무역 친구는 왜 중요할까요?','check']
  ].map(([id,name,note,question,icon]) => ({id,name,note,question,icon,art:`ending-${id}`}));
  const unlocks = {daon:'처음부터',plains:'처음부터',oil:'처음부터',market:'처음부터',forest:'엔딩 1개 발견',ironland:'사건 8종 발견',port:'무역 강국 엔딩 발견',artisan:'전략 배지 3개 획득'};
  const badgeGoals = {
    daon:['기술제품 40상자 이상 팔기','위기 해에 식량 칸 가득'], plains:['식량 40상자 이상 팔기','생활용품이나 기술 공장 키우기'],
    oil:['한 해 30원 이상 벌기','에너지 말고 다른 공장 키우기'], market:['생활용품 60상자 이상 팔기','기술 공장 키우기'],
    forest:['식량 30상자 이상 팔기','♥3 친구 2곳 이상'], port:['4나라 모두와 거래하기','♥3 친구 3곳 이상'],
    artisan:['⭐3 물건 40상자 이상 팔기','모든 공장 열어 둔 채 평균 60점 이상'], ironland:['철 40상자 이상 팔기','철 공장 키우기']
  };
  const badges = countries.flatMap(c => c.strategies.map((name,i) => ({id:`${c.id}-${i?'B':'A'}`,name,country:c.id,text:badgeGoals[c.id][i]})));
  const challenges=[{id:'no-protect',name:'보호 금지'},{id:'double-closed',name:'국경 닫힘 2년'}];
  return {version:5,years:5,goods,countries,events,policies,endings,unlocks,badges,challenges,
    economy:{startMoney:8,tax:2,slotPoints:16,qualityPoints:[0,0,2,4],unrest:2,closeAfter:2,relStart:1,relMax:3,relTrade:3,portFee:2}};
});
