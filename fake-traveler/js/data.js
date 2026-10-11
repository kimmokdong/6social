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
    mediterranean: { name: '지중해성',     group: 'temperate', img: 'md_village',  temp: '여름 덥고 겨울 따뜻해요', rain: '여름엔 건조, 겨울에 비', look: '올리브 · 포도', where: '지중해 주변', confuse: ['marine'], gallery: ['md_village', 'md_olive', 'md_vineyard', 'md_winterrain'] },
    marine:        { name: '서안 해양성', group: 'temperate', img: 'wm_pasture',  temp: '여름 선선, 겨울 따뜻', rain: '1년 내내 고르게 비', look: '푸른 목초지 · 젖소', where: '서유럽', confuse: ['mediterranean'], gallery: ['wm_pasture', 'wm_street', 'wm_cheese'] },
    taiga:         { name: '타이가',       group: 'subarctic', img: 'tg_forest',   temp: '겨울 길고 매우 추움, 여름은 따뜻', rain: '보통', look: '끝없는 침엽수림', where: '러시아 · 캐나다', confuse: ['tundra'], gallery: ['tg_forest', 'tg_cabin', 'tg_snow', 'tg_summerlake', 'tg_moose'] },
    tundra:        { name: '툰드라',       group: 'polar',     img: 'td_reindeer', temp: '가장 따뜻한 달 평균도 10℃ 아래', rain: '적어요', look: '이끼 · 순록, 나무 없음', where: '북극해 주변', confuse: ['taiga', 'icecap'], gallery: ['td_reindeer', 'td_summer', 'td_winter', 'td_stilts'] },
    icecap:        { name: '빙설',         group: 'polar',     img: 'ic_icesheet', temp: '1년 내내 평균 0℃ 아래', rain: '눈이 조금 와요', look: '끝없는 얼음 · 나무도 풀도 없음', where: '남극 · 그린란드 안쪽', confuse: ['tundra'], gallery: ['ic_icesheet', 'ic_station', 'ic_penguin', 'ic_blizzard'] },
    highland:      { name: '고산',         group: 'highland',  img: 'al_city',     temp: '1년 내내 봄 날씨', rain: '높이에 따라 달라요', look: '높은 산 위 도시 · 희박한 공기 · 라마 · 감자', where: '안데스 (에콰도르 · 페루)', confuse: ['rainforest'], gallery: ['al_city', 'al_llama', 'al_potato', 'al_terrace'] }
  },

  // 기후 구별 사다리 (도감의 '구별법' 화면)
  ladder: [
    { q: '높은 산 위?', yes: ['highland'] },
    { q: '비가 아주 적어?', yes: ['desert', 'steppe'] },
    { q: '얼마나 추워?', branches: [
      { label: '늘 여름', groups: ['tropical'] },
      { label: '사계절', groups: ['temperate'] },
      { label: '겨울이 길고 매우 추움', groups: ['subarctic'] },
      { label: '여름이 거의 없음', groups: ['polar'] }
    ] }
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
  },

  // 튜토리얼 대사(사건 1에서만)
  tutorial: [
    { at: 'intro', owl: 'owl_point', text: '이 중에 가짜가 있어!' },
    { at: 'board', owl: 'owl_point', text: '수상한 증거를 눌러 봐!' },
    { at: 'reveal', owl: 'owl_happy', text: '진짜로 다녀온 곳을 맞혀 봐!' }
  ],

  cases: [
    { id: 1, claim: 'rainforest', tutorial: true,
      travelers: [
        { who: 'haneul', ev: [
          { type: 'photo', img: 'rf_jungle', v: 'ok' },
          { type: 'temp', text: '30℃', v: 'ok' },
          { type: 'quote', text: '땀이 줄줄 났어!', v: 'ok' },
          { type: 'item', item: 'bugspray', v: 'ok' } ] },
        { who: 'junho', ev: [
          { type: 'photo', img: 'rf_rain', cap: '오후', v: 'ok' },
          { type: 'temp', text: '28℃', v: 'ok' },
          { type: 'quote', text: '매일 소나기가 와!', v: 'ok' },
          { type: 'item', item: 'raincoat', v: 'ok' } ] },
        { who: 'leo', fake: 'tundra', real: 'td_winter', options: ['tundra', 'desert', 'savanna'], ev: [
          { type: 'photo', img: 'td_reindeer', v: 'lie', why: '나무 없는 땅의 순록! 추운 곳이에요.' },
          { type: 'temp', text: '8℃', cap: '7월', v: 'lie', why: '열대우림은 1년 내내 더워요!' },
          { type: 'quote', text: '나무가 하나도 없어!', v: 'lie', why: '열대우림은 나무가 빽빽해요!' },
          { type: 'item', item: 'puffer', v: 'lie', why: '열대우림에선 패딩이 필요 없어요!' } ] }
      ] },

    { id: 2, claim: 'rainforest',
      travelers: [
        { who: 'miso', ev: [
          { type: 'photo', img: 'rf_parrot', v: 'ok' },
          { type: 'temp', text: '29℃', v: 'ok' },
          { type: 'quote', text: '1년 내내 여름이야', v: 'ok' },
          { type: 'item', item: 'binoculars', v: 'ok' } ] },
        { who: 'ara', ev: [
          { type: 'photo', img: 'rf_fruit', v: 'ok' },
          { type: 'temp', text: '31℃', v: 'ok' },
          { type: 'quote', text: '비가 거의 매일 와', v: 'ok' },
          { type: 'item', item: 'boots', v: 'ok' } ] },
        { who: 'park', ev: [
          { type: 'photo', img: 'rf_house', v: 'ok', why: '강가 습지라 집을 높이 지었어요!' },
          { type: 'temp', text: '30℃', v: 'ok' },
          { type: 'quote', text: '습해서 빨래가 안 말라', v: 'ok' },
          { type: 'item', item: 'raincoat', v: 'ok' } ] },
        { who: 'taeyang', fake: 'savanna', real: 'sv_huts', options: ['savanna', 'steppe', 'desert'], ev: [
          { type: 'photo', img: 'sv_giraffe', v: 'lie', why: '기린은 탁 트인 초원에 살아요!' },
          { type: 'temp', text: '28℃', v: 'ok' },
          { type: 'quote', text: '건기라 풀이 누렇더라', v: 'lie', why: '열대우림엔 건기가 없어요!' },
          { type: 'item', item: 'camera', v: 'ok' } ] }
      ] },

    { id: 3, claim: 'savanna',
      travelers: [
        { who: 'haneul', ev: [
          { type: 'photo', img: 'sv_lion', v: 'ok' },
          { type: 'temp', text: '30℃', v: 'ok' },
          { type: 'quote', text: '풀이 내 키보다 커!', v: 'ok' },
          { type: 'item', item: 'binoculars', v: 'ok' } ] },
        { who: 'leo', ev: [
          { type: 'photo', img: 'sv_wetseason', cap: '우기', v: 'trap', why: '사바나도 우기엔 비가 많이 와요!' },
          { type: 'temp', text: '27℃', v: 'ok' },
          { type: 'quote', text: '비 오는 계절이었어', v: 'trap', why: '사바나도 우기엔 비가 많이 와요!' },
          { type: 'item', item: 'raincoat', v: 'trap', why: '우기엔 우비가 필요해요!' } ] },
        { who: 'sophie', ev: [
          { type: 'photo', img: 'sv_waterhole', cap: '건기', v: 'ok', why: '건기엔 동물들이 물가에 모여요!' },
          { type: 'temp', text: '32℃', v: 'ok' },
          { type: 'quote', text: '동물들이 물가에 모여', v: 'ok' },
          { type: 'item', item: 'sunglasses', v: 'ok' } ] },
        { who: 'junho', fake: 'rainforest', real: 'rf_parrot', options: ['rainforest', 'mediterranean', 'steppe'], ev: [
          { type: 'photo', img: 'rf_jungle', v: 'lie', why: '빽빽한 밀림은 열대우림이에요!' },
          { type: 'temp', text: '30℃', v: 'ok' },
          { type: 'quote', text: '1년 내내 매일 비가 와', v: 'lie', why: '사바나엔 건기가 있어요!' },
          { type: 'item', item: 'bugspray', v: 'ok' } ] }
      ] },

    { id: 4, claim: 'desert',
      travelers: [
        { who: 'ara', ev: [
          { type: 'photo', img: 'ds_oasis', v: 'ok' },
          { type: 'temp', text: '낮 42℃', v: 'ok' },
          { type: 'quote', text: '대추야자 맛있어!', v: 'ok', why: '대추야자는 오아시스에서 자라요!' },
          { type: 'item', item: 'canteen', v: 'ok' } ] },
        { who: 'miso', ev: [
          { type: 'photo', img: 'ds_night', cap: '밤', v: 'trap', why: '사막은 밤에 추워요. 일교차가 커요!' },
          { type: 'temp', text: '밤 5℃', v: 'trap', why: '사막은 밤에 추워요. 일교차가 커요!' },
          { type: 'quote', text: '밤엔 패딩 입었어', v: 'trap', why: '사막은 밤에 추워요. 일교차가 커요!' },
          { type: 'item', item: 'sunscreen', v: 'ok' } ] },
        { who: 'park', ev: [
          { type: 'photo', img: 'ds_house', v: 'ok', why: '두꺼운 흙벽이 더위를 막아요!' },
          { type: 'temp', text: '낮 40℃', v: 'ok' },
          { type: 'quote', text: '비가 거의 안 와', v: 'ok' },
          { type: 'item', item: 'robe', v: 'ok', why: '헐렁한 옷은 햇빛과 모래를 막아요!' } ] },
        { who: 'taeyang', fake: 'steppe', real: 'st_ger', options: ['steppe', 'savanna', 'tundra'], ev: [
          { type: 'photo', img: 'st_grass', v: 'lie', why: '끝없는 풀밭은 스텝이에요!' },
          { type: 'temp', text: '25℃', v: 'ok' },
          { type: 'quote', text: '말 타고 풀밭을 달렸어', v: 'lie', why: '끝없는 풀밭은 스텝이에요!' },
          { type: 'item', item: 'canteen', v: 'ok' } ] }
      ] },

    { id: 5, claim: 'steppe',
      travelers: [
        { who: 'leo', ev: [
          { type: 'photo', img: 'st_ger', v: 'ok', why: '게르는 옮기기 쉬운 유목민의 집이에요!' },
          { type: 'temp', text: '22℃', cap: '7월', v: 'ok' },
          { type: 'quote', text: '나무가 하나도 없어', v: 'trap', why: '스텝은 짧은 풀만 자라는 초원이에요!' },
          { type: 'item', item: 'hikingboots', v: 'ok' } ] },
        { who: 'haneul', ev: [
          { type: 'photo', img: 'st_winter', cap: '1월', v: 'trap', why: '몽골 스텝은 겨울에 아주 추워요!' },
          { type: 'temp', text: '-20℃', cap: '1월', v: 'trap', why: '몽골 스텝은 겨울에 아주 추워요!' },
          { type: 'quote', text: '말이 입김을 뿜어', v: 'ok' },
          { type: 'item', item: 'puffer', v: 'ok' } ] },
        { who: 'sophie', ev: [
          { type: 'photo', img: 'st_horse', v: 'ok' },
          { type: 'temp', text: '25℃', cap: '7월', v: 'ok' },
          { type: 'quote', text: '짧은 풀이 끝없이!', v: 'ok' },
          { type: 'item', item: 'sunscreen', v: 'ok' } ] },
        { who: 'ara', fake: 'desert', real: 'ds_oasis', options: ['desert', 'savanna', 'tundra'], ev: [
          { type: 'photo', img: 'ds_dunes', v: 'lie', why: '풀 하나 없는 모래 언덕은 사막이에요!' },
          { type: 'temp', text: '35℃', cap: '7월', v: 'ok' },
          { type: 'quote', text: '오아시스에서 쉬었어', v: 'lie', why: '오아시스는 사막에 있어요!' },
          { type: 'item', item: 'robe', v: 'ok' } ] }
      ] },

    { id: 6, claim: 'mediterranean',
      travelers: [
        { who: 'junho', ev: [
          { type: 'photo', img: 'md_village', cap: '7월', v: 'ok' },
          { type: 'temp', text: '32℃', cap: '7월', v: 'ok' },
          { type: 'quote', text: '여름 내내 쨍쨍!', v: 'ok' },
          { type: 'item', item: 'sunglasses', v: 'ok' } ] },
        { who: 'ara', ev: [
          { type: 'photo', img: 'md_olive', v: 'ok', why: '올리브는 여름에 건조한 곳에서 잘 자라요!' },
          { type: 'temp', text: '30℃', cap: '7월', v: 'ok' },
          { type: 'quote', text: '올리브가 진짜 맛있어', v: 'ok' },
          { type: 'item', item: 'sunscreen', v: 'ok' } ] },
        { who: 'park', ev: [
          { type: 'photo', img: 'md_winterrain', cap: '1월', v: 'trap', why: '지중해성 기후는 겨울에 비가 와요!' },
          { type: 'temp', text: '12℃', cap: '1월', v: 'ok', why: '지중해의 겨울은 따뜻한 편이에요!' },
          { type: 'quote', text: '겨울엔 비가 자주 와', v: 'trap', why: '지중해성 기후는 겨울에 비가 와요!' },
          { type: 'item', item: 'umbrella', v: 'trap', why: '겨울엔 비가 와서 우산이 필요해요!' } ] },
        { who: 'miso', fake: 'marine', real: 'wm_street', options: ['marine', 'rainforest', 'taiga'], ev: [
          { type: 'photo', img: 'wm_pasture', cap: '7월', v: 'lie', why: '여름에 흐리고 푸른 목장은 서안 해양성!' },
          { type: 'temp', text: '18℃', cap: '7월', v: 'lie', why: '지중해의 여름은 덥고 건조해요!' },
          { type: 'quote', text: '한여름에도 비가 와', v: 'lie', why: '지중해의 여름은 비가 거의 없어요!' },
          { type: 'item', item: 'raincoat', v: 'ok' } ] }
      ] },

    { id: 7, claim: 'taiga',
      travelers: [
        { who: 'haneul', ev: [
          { type: 'photo', img: 'tg_forest', v: 'ok' },
          { type: 'temp', text: '20℃', cap: '7월', v: 'ok' },
          { type: 'quote', text: '나무가 끝도 없어!', v: 'ok' },
          { type: 'item', item: 'camera', v: 'ok' } ] },
        { who: 'leo', ev: [
          { type: 'photo', img: 'tg_summerlake', cap: '7월', v: 'trap', why: '냉대도 여름은 따뜻해요!' },
          { type: 'temp', text: '24℃', cap: '7월', v: 'trap', why: '냉대도 여름은 따뜻해요!' },
          { type: 'quote', text: '호수에서 수영했어', v: 'trap', why: '냉대도 여름은 따뜻해요!' },
          { type: 'item', item: 'bugspray', v: 'trap', why: '냉대 숲은 여름에 모기가 많아요!' } ] },
        { who: 'sophie', ev: [
          { type: 'photo', img: 'tg_snow', cap: '1월', v: 'ok' },
          { type: 'temp', text: '-30℃', cap: '1월', v: 'ok' },
          { type: 'quote', text: '겨울이 엄청 길어', v: 'ok' },
          { type: 'item', item: 'handwarmer', v: 'ok' } ] },
        { who: 'taeyang', fake: 'tundra', real: 'td_summer', options: ['tundra', 'steppe', 'marine'], ev: [
          { type: 'photo', img: 'td_reindeer', v: 'lie', why: '나무 없이 이끼만 있는 땅은 툰드라예요!' },
          { type: 'temp', text: '6℃', cap: '7월', v: 'lie', why: '타이가의 여름은 따뜻해요!' },
          { type: 'quote', text: '나무가 한 그루도 없어', v: 'lie', why: '타이가는 침엽수 숲이 끝없이 펼쳐져요!' },
          { type: 'item', item: 'beanie', v: 'ok' } ] }
      ] },

    { id: 8, claim: 'icecap',
      travelers: [
        { who: 'sophie', ev: [
          { type: 'photo', img: 'ic_icesheet', v: 'ok' },
          { type: 'temp', text: '-30℃', v: 'ok' },
          { type: 'quote', text: '1년 내내 얼음뿐이야', v: 'ok' },
          { type: 'item', item: 'handwarmer', v: 'ok' } ] },
        { who: 'park', ev: [
          { type: 'photo', img: 'ic_station', v: 'trap', why: '빙설 지역에도 연구 기지가 있어요!' },
          { type: 'temp', text: '-20℃', v: 'ok' },
          { type: 'quote', text: '기지에서 연구했어', v: 'trap', why: '빙설 지역에도 연구 기지가 있어요!' },
          { type: 'item', item: 'puffer', v: 'ok' } ] },
        { who: 'miso', ev: [
          { type: 'photo', img: 'ic_penguin', v: 'ok', why: '남극 바닷가 얼음 위엔 펭귄이 살아요!' },
          { type: 'temp', text: '-10℃', v: 'ok' },
          { type: 'quote', text: '나무도 풀도 없어', v: 'ok' },
          { type: 'item', item: 'sunglasses', v: 'trap', why: '얼음에 반사된 햇빛이 아주 강해요!' } ] },
        { who: 'leo', fake: 'tundra', real: 'td_stilts', options: ['tundra', 'taiga', 'steppe'], ev: [
          { type: 'photo', img: 'td_summer', v: 'lie', why: '여름에 이끼와 꽃이 피는 곳은 툰드라예요!' },
          { type: 'temp', text: '8℃', cap: '7월', v: 'lie', why: '빙설은 여름에도 평균 0℃ 아래예요!' },
          { type: 'quote', text: '순록 떼를 만났어', v: 'lie', why: '빙설엔 순록이 먹을 이끼가 없어요!' },
          { type: 'item', item: 'camera', v: 'ok' } ] }
      ] },

    { id: 9, claim: 'highland',
      travelers: [
        { who: 'miso', ev: [
          { type: 'photo', img: 'al_llama', v: 'ok' },
          { type: 'temp', text: '15℃', v: 'ok' },
          { type: 'quote', text: '1년 내내 봄 같아', v: 'ok' },
          { type: 'item', item: 'oxygen', v: 'ok', why: '높은 곳은 공기가 희박해요!' } ] },
        { who: 'junho', ev: [
          { type: 'photo', img: 'al_terrace', v: 'ok', why: '산비탈에 계단 모양 밭을 만들어요!' },
          { type: 'temp', text: '14℃', v: 'ok' },
          { type: 'quote', text: '감자 종류가 엄청 많아', v: 'ok' },
          { type: 'item', item: 'sunscreen', v: 'ok', why: '높은 곳은 햇빛이 강해요!' } ] },
        { who: 'park', ev: [
          { type: 'photo', img: 'al_city', v: 'ok' },
          { type: 'temp', text: '13℃', v: 'ok' },
          { type: 'quote', text: '적도인데 쌀쌀했어', v: 'trap', why: '고산 기후는 적도라도 높아서 시원해요!' },
          { type: 'item', item: 'beanie', v: 'ok' } ] },
        { who: 'ara', fake: 'rainforest', real: 'rf_fruit', options: ['rainforest', 'desert', 'mediterranean'], ev: [
          { type: 'photo', img: 'rf_house', v: 'lie', why: '강가 밀림 마을은 열대우림이에요!' },
          { type: 'temp', text: '35℃', v: 'lie', why: '고산 도시는 1년 내내 시원해요!' },
          { type: 'quote', text: '푹푹 찌고 습했어', v: 'lie', why: '고산 도시는 1년 내내 시원해요!' },
          { type: 'item', item: 'bugspray', v: 'ok' } ] }
      ] },

    { id: 10, claim: 'savanna', final: true,
      travelers: [
        { who: 'haneul', ev: [
          { type: 'photo', img: 'sv_wetseason', cap: '우기', v: 'trap', why: '사바나는 우기엔 푸르러요!' },
          { type: 'temp', text: '26℃', v: 'ok' },
          { type: 'quote', text: '우기엔 초원이 초록색!', v: 'trap', why: '사바나는 우기엔 푸르러요!' },
          { type: 'item', item: 'raincoat', v: 'ok' } ] },
        { who: 'sophie', ev: [
          { type: 'photo', img: 'sv_huts', v: 'ok' },
          { type: 'temp', text: '31℃', v: 'ok' },
          { type: 'quote', text: '건기엔 강이 말랐어', v: 'ok', why: '사바나는 건기에 비가 거의 없어요!' },
          { type: 'item', item: 'binoculars', v: 'ok' } ] },
        { who: 'park', ev: [
          { type: 'photo', img: 'sv_waterhole', cap: '건기', v: 'ok' },
          { type: 'temp', text: '33℃', v: 'ok' },
          { type: 'quote', text: '얼룩말을 봤어!', v: 'ok' },
          { type: 'item', item: 'sunglasses', v: 'ok' } ] },
        { who: 'leo', fake: 'rainforest', real: 'rf_parrot', options: ['rainforest', 'steppe', 'desert'], ev: [
          { type: 'photo', img: 'rf_rain', v: 'lie', why: '밀림 속 마을은 열대우림이에요!' },
          { type: 'temp', text: '29℃', v: 'ok' },
          { type: 'quote', text: '건기가 없더라', v: 'lie', why: '사바나엔 건기가 있어요!' },
          { type: 'item', item: 'boots', v: 'ok' } ] },
        { who: 'taeyang', fake: 'steppe', real: 'st_horse', options: ['steppe', 'tundra', 'marine'], ev: [
          { type: 'photo', img: 'st_winter', cap: '1월', v: 'lie', why: '사바나엔 눈이 오지 않아요!' },
          { type: 'temp', text: '-15℃', cap: '1월', v: 'lie', why: '사바나는 1년 내내 더워요!' },
          { type: 'quote', text: '양 떼를 몰았어', v: 'ok' },
          { type: 'item', item: 'camera', v: 'ok' } ] }
      ] }
  ]
};
