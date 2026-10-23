/* 무역왕 6.0 — 실시간 경제 수치. 나라 이름·품질·그림·엔딩 글은 data.js(TRADE)를 그대로 쓴다. 모든 수는 정수(상자·원)다. */
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.TRADE6 = data;
})(globalThis, function () {
  'use strict';
  // 물건 순서는 data.js와 같다: 식량, 에너지, 생활용품, 기술제품, 철.
  // [기본 값(원), 배 한 번 적재량(=산업 1단계 계절 생산), 값 출렁임, 필요량 비율]
  // 계절 필요량 = 비율 × (3 + 인구/2)를 반올림. 인구가 많아도 필요량이 너무 커지지 않게 해 큰 나라·작은 나라의 수입 부담(배 왕복 수)을 비슷하게 맞췄다.
  const goods = [[20, 4, .25, 1.3], [30, 3, .4, 1.0], [35, 3, .15, 1.0], [120, 1, .1, .25], [20, 4, .3, .6]]
    .map(([price, load, vol, need]) => ({price, load, vol, need}));
  // 시작 산업 단계(식·에·생·기·철), 대표 물건, ♥3 나라별 혜택. 인구는 data.js 일꾼 수.
  // 시작 자급 점수 45~55, 수입에 필요한 왕복이 계절당 2.5~3.5번이 되게 맞췄다(봇 검사).
  // 식량은 대평원·숲·큰 시장, 에너지는 석유·철의 나라, 생활용품은 큰 시장·석유·항구, 기술은 다온·항구·장인·큰 시장, 철은 대평원·철의 나라가 남겨 판다.
  const countries = {
    daon:     {levels: [1, 1, 1, 6, 1], main: 3, bonus: 'discount',   bonusText: '♥3이면 계약값을 한 번 더 깎아 줘요'},
    plains:   {levels: [4, 1, 2, 0, 2], main: 0, bonus: 'crisisKeep', bonusText: '♥3이면 태풍·분쟁 때도 계약 물건을 보내 줘요'},
    oil:      {levels: [2, 4, 2, 0, 0], main: 1, bonus: 'crisisKeep', bonusText: '♥3이면 분쟁 때도 에너지를 보내 줘요'},
    market:   {levels: [3, 1, 4, 3, 0], main: 2, bonus: 'bigBuyer',   bonusText: '♥3이면 우리 물건을 한 번에 1상자 더 사 줘요'},
    forest:   {levels: [4, 1, 2, 0, 0], main: 0, bonus: 'crisisKeep', bonusText: '♥3이면 태풍 때도 식량을 보내 줘요'},
    port:     {levels: [1, 1, 2, 3, 0], main: 3, bonus: 'fast',       bonusText: '♥3이면 그 나라 뱃길이 한 달 짧아져요'},
    artisan:  {levels: [1, 0, 2, 2, 0], main: 2, bonus: 'discount',   bonusText: '♥3이면 계약값을 한 번 더 깎아 줘요'},
    ironland: {levels: [1, 3, 1, 0, 3], main: 4, bonus: 'crisisKeep', bonusText: '♥3이면 분쟁 때도 철·에너지를 보내 줘요'}
  };
  // 발전 회의 카드: [id, 이름, 비용, 효과]
  const cards = [
    ['grow', '강점 산업 키우기', 240, '대표 물건 산업 +1단계'],
    ['climb', '새 산업 키우기', 240, '기술제품 산업 +1단계'],
    ['protect', '약한 산업 지키기 🛡', 160, '고른 물건 +1단계, 문 닫지 않음 · 그 물건 수입값 +20% · 생활 −2'],
    ['warehouse', '비축 창고', 160, '창고에 두 배까지 쌓아 둠'],
    ['bigShip', '큰 배', 200, '배마다 짐칸 +2칸'],
    ['moreShip', '배 한 척 더', 200, '배 +1척 (최대 5척)'],
    ['quality', '품질 높이기', 200, '대표 물건 ⭐+1 · 새 계약부터 값 +10%']
  ].map(([id, name, cost, text]) => ({id, name, cost, text}));
  // 사건: [id, 이름, 종류, 위기, 징조(달 전), 처음 나오는 해, 선택지]
  const events = [
    ['supplyCut', '공급 끊김', 'crisis', true, 3, 2, ['돌아가는 길 · 100원: 그 나라에서 절반은 받아 옴', '아껴 쓰기: 9달 동안 그 물건 필요 −1, 생활 −3']],
    ['storm', '태풍과 흉년', 'crisis', true, 0, 2, ['비싸게라도 사기', '이웃에 도움 청하기: ♥2 이상 나라마다 식량 2상자']],
    ['recession', '세계 경제 위기', 'crisis', true, 3, 3, ['그래도 팔기', '나라가 돕기 · 100원: 6달 동안 생활 +4']],
    ['exchange', '환율 급등', 'crisis', true, 0, 2, ['수출에 힘쓰기: 6달 동안 대표 산업 +1단계', '아껴 쓰기: 많이 사는 물건 필요 −1, 생활 −3']],
    ['expo', '국제 박람회', 'opportunity', false, 0, 1, ['출품 · 60원: 대표 물건 새 계약 +10%', '안 함']],
    ['invention', '신기술 발명', 'opportunity', false, 0, 1, ['도입하기: 대표 산업 +1단계', '기술 나누기: 모든 나라 ♥+1']],
    ['voice', '국민 목소리', 'opportunity', false, 0, 3, ['농민 편: 식량 지키기 1년 무료', '소비자 편: 1년 동안 생활 +2']],
    ['dumping', '덤핑', 'problem', false, 0, 2, ['싸게 사기', '생활용품 지키기 1년 무료']],
    ['retaliation', '보복 관세', 'problem', false, 0, 3, ['보호 모두 풀기', '버티기: 6달 동안 팔 때 −10%', '대화하기 · 60원: ♥+1']],
    ['fta', 'FTA 제안', 'opportunity', false, 0, 4, ['♥가 가장 높은 나라와 FTA', '거절']]
  ].map(([id, name, kind, crisis, warn, minYear, options]) => ({id, name, kind, crisis, warn, minYear, options}));
  return {
    version: 6, goods, countries, cards, events,
    economy: {
      startMoney: 200, taxPerPop: 10, contractTrips: 4, tripMonths: [2, 2, 3, 3], worldTrip: 4,
      cutMonths: 9, crisisPoints: 45, relStart: 1, relMax: 3, visitRel: 2, missLimit: 2, storeSeasons: 2, warehouseSeasons: 4, declineYears: 1,
      worldBuy: .7, worldSell: 1.4, worldLimit: 8, shipSlots: 4, bigShipSlots: 2, playerShips: 3, openShips: 2, npcShips: 2, npcTripExtra: 2, maxShips: 5,
      drift: .6, priceTarget: 1, slotPoints: 16, qualityPoints: [0, 0, 2, 4], unrest: 2, monthSeconds: 10, pauseSeconds: 20
    }
  };
});
