/* 가짜 여행자를 찾아라 — 게임 콘텐츠 데이터
 * 증거(ev) 종류: photo(사진) / temp(기온) / quote(한마디) / item(짐)
 * v: 'ok'   진짜 증거. 수상하다고 하면 틀림 → why 가 있으면 why, 없으면 기본 문장
 *    'trap' 수상해 보이지만 진짜 증거(헷갈리는 함정). why 필수
 *    'lie'  가짜 증거. why = 들통난 이유
 * cap: 사진·기온에 붙는 아주 짧은 꼬리표(계절 등)
 */
window.FAKE = {
  okWhy: '{claim}에서도 볼 수 있어요!',

  groups: {
    tropical:  { name: '열대', color: '#E8664A' },
    dry:       { name: '건조', color: '#D9A441' },
    temperate: { name: '온대', color: '#4BA36B' },
    subarctic: { name: '냉대', color: '#3C8C9E' },
    polar:     { name: '한대', color: '#6FA8DC' },
    highland:  { name: '고산', color: '#8A7BB8' }
  },

  climates: {
    rainforest:    { name: '열대우림',     group: 'tropical',  img: 'rf_jungle',   temp: '1년 내내 더워요', rain: '거의 매일 비 (스콜)', look: '빽빽한 밀림', where: '아마존 · 콩고 · 동남아', confuse: ['savanna', 'highland'], gallery: ['rf_jungle', 'rf_rain', 'rf_house', 'rf_parrot', 'rf_fruit'] },
    savanna:       { name: '사바나',       group: 'tropical',  img: 'sv_giraffe',  temp: '1년 내내 더워요', rain: '건기 ↔ 우기', look: '긴 풀 초원, 드문드문 나무', where: '동아프리카', confuse: ['rainforest', 'steppe'], gallery: ['sv_giraffe', 'sv_waterhole', 'sv_wetseason', 'sv_huts', 'sv_lion'] },
    desert:        { name: '사막',         group: 'dry',       img: 'ds_dunes',    temp: '낮엔 뜨겁고 밤엔 추워요', rain: '비가 거의 없어요', look: '모래 언덕 · 오아시스', where: '사하라 · 아라비아', confuse: ['steppe'], gallery: ['ds_dunes', 'ds_oasis', 'ds_house', 'ds_night'] },
    steppe:        { name: '스텝',         group: 'dry',       img: 'st_grass',    temp: '여름 덥고 겨울 매우 추워요', rain: '비가 적어요', look: '짧은 풀 초원 · 유목', where: '몽골 · 중앙아시아', confuse: ['desert', 'savanna'], gallery: ['st_grass', 'st_ger', 'st_winter', 'st_horse'] },
    mediterranean: { name: '지중해 주변 지역',     group: 'temperate', img: 'md_village',  temp: '여름 덥고 겨울 따뜻해요', rain: '여름엔 건조, 겨울에 비', look: '올리브 · 포도', where: '지중해 주변', confuse: ['marine'], gallery: ['md_village', 'md_olive', 'md_vineyard', 'md_winterrain'] },
    marine:        { name: '서부 유럽', group: 'temperate', img: 'wm_pasture',  temp: '여름 선선, 겨울 따뜻', rain: '1년 내내 고르게 비', look: '푸른 목초지 · 젖소', where: '서부 유럽', confuse: ['mediterranean'], gallery: ['wm_pasture', 'wm_street', 'wm_cheese'] },
    taiga:         { name: '타이가',       group: 'subarctic', img: 'tg_forest',   temp: '겨울 길고 매우 추움, 여름은 따뜻', rain: '보통', look: '끝없는 침엽수림', where: '러시아 · 캐나다', confuse: ['tundra'], gallery: ['tg_forest', 'tg_cabin', 'tg_snow', 'tg_summerlake', 'tg_moose'] },
    tundra:        { name: '툰드라',       group: 'polar',     img: 'td_reindeer', temp: '가장 따뜻한 달 평균도 10℃ 아래', rain: '적어요', look: '이끼 · 순록, 나무 없음', where: '북극해 주변', confuse: ['taiga', 'icecap'], gallery: ['td_reindeer', 'td_summer', 'td_winter', 'td_stilts'] },
    icecap:        { name: '빙설',         group: 'polar',     img: 'ic_icesheet', temp: '1년 내내 평균 0℃ 아래', rain: '눈이 조금 와요', look: '끝없는 얼음 · 나무도 풀도 없음', where: '남극 · 그린란드 안쪽', confuse: ['tundra'], gallery: ['ic_icesheet', 'ic_station', 'ic_penguin', 'ic_blizzard'] },
    highland:      { name: '고산',         group: 'highland',  img: 'al_city',     temp: '1년 내내 봄 날씨', rain: '높이에 따라 달라요', look: '높은 산 위 도시 · 희박한 공기 · 라마 · 감자', where: '안데스 (에콰도르 · 페루)', confuse: ['rainforest'], gallery: ['al_city', 'al_llama', 'al_potato', 'al_terrace'] }
  },

  // 라이어가 오가는 닮은 기후끼리 같은 점과 구분할 특징을 비교한다.
  comparisons: [
    { pair: ['rainforest', 'savanna'], same: '두 곳 모두 1년 내내 더워요.', diff: '열대우림은 비가 잦은 밀림, 사바나는 건기·우기가 있는 초원이에요.' },
    { pair: ['rainforest', 'highland'], same: '비에 젖은 초록 식물이나 안개 낀 산비탈을 볼 수 있어요.', diff: '열대우림은 늘 덥고, 열대 고산은 높이 올라가 봄처럼 선선해요.' },
    { pair: ['savanna', 'steppe'], same: '마른 풀밭과 풀을 뜯는 가축을 볼 수 있어요.', diff: '사바나는 늘 덥고, 스텝은 겨울에 매우 추워요.' },
    { pair: ['desert', 'steppe'], same: '비가 적고 마른 땅이나 키 작은 덤불을 볼 수 있어요.', diff: '사막은 식물이 드물고, 스텝은 비가 더 내려 짧은 풀이 자라요.' },
    { pair: ['mediterranean', 'marine'], same: '겨울이 비교적 따뜻하고 돌담 집이나 항구를 볼 수 있어요.', diff: '지중해는 여름에 덥고 건조해요. 서부 유럽은 선선하고 비가 고르게 와요.' },
    { pair: ['taiga', 'tundra'], same: '겨울이 춥고 눈 덮인 땅이나 이끼 낀 바위를 볼 수 있어요.', diff: '타이가는 침엽수림, 툰드라는 큰 나무 없이 이끼·낮은 풀이 자라요.' },
    { pair: ['tundra', 'icecap'], same: '눈과 얼음이 덮인 땅이나 얼어붙은 바닷가를 볼 수 있어요.', diff: '툰드라는 여름에 이끼·풀이 자라고, 빙설은 1년 내내 얼음으로 덮여요.' }
  ],

  items: {
    raincoat: '우비', umbrella: '우산', puffer: '패딩', beanie: '털모자',
    sunglasses: '선글라스', sunscreen: '선크림', bugspray: '모기약', canteen: '물통',
    binoculars: '망원경', robe: '헐렁한 옷', boots: '장화', handwarmer: '손난로',
    oxygen: '산소캔', camera: '카메라', hikingboots: '등산화', tshirt: '반팔 티'
  },

  travelers: {
    haneul:  { name: '하늘',      img: 't_haneul' },
    junho:   { name: '준호',      img: 't_junho' },
    miso:    { name: '미소',      img: 't_miso' },
    leo:     { name: '레오',      img: 't_leo' },
    ara:     { name: '아라',      img: 't_ara' },
    park:    { name: '박 할아버지', img: 't_park' },
    sophie:  { name: '소피',      img: 't_sophie' },
    taeyang: { name: '태양',      img: 't_taeyang' }
  }
};
