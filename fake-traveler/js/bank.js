/* 가짜 여행자를 찾아라 — 2단계(무한 수사) 증거 은행
 * 증거는 '태그'를 갖고, 각 기후는 허용 태그(allowed)를 가진다.
 *   증거의 태그가 모두 기후 C의 allowed 안에 있으면 → C에서 '진짜'
 *   하나라도 벗어나면 → C에서 '거짓'. 이유(why)는 아래 규칙으로 만든다.
 *     '벗어난 첫 태그' = 증거의 tags 배열 순서에서 처음으로 allowed 밖인 태그 (순서가 곧 우선순위)
 *     1) 벗어난 첫 태그에 tags[tag].why 가 있으면 그것 ({T} = 기후의 topic)
 *     2) 동물 태그면  `${tags[tag].name} ${place} 살지 않아요!`   (place 에 '~에'가 이미 들어 있음)
 *     3) 아니면       `${topic} ${facts[tags[tag].cat]}!`  (life 분류는 land 사실로)
 * 함정(trap)은 '자기 고향 기후'에서만 쓰는 증거 단위 표시. 아이템은 trapFor 로 기후별 함정.
 * 짝(confuse)은 data.js 의 climates[*].confuse 를 쓴다. 가짜는 항상 주장 기후의 confuse 중 하나에서 온다.
 */
window.FAKE_BANK = {
  tags: {
    hot: { cat: 'temp' }, scorching: { cat: 'temp' }, coldnight: { cat: 'temp' }, mild: { cat: 'temp' },
    warmsummer: { cat: 'temp' }, coolsummer: { cat: 'temp' }, warmwinter: { cat: 'temp' }, equatorcool: { cat: 'temp' },
    needwarm: { cat: 'temp' }, hotwear: { cat: 'temp' },
    coldwinter: { cat: 'temp', why: '{T} 그렇게 꽁꽁 얼지 않아요!' },
    snow: { cat: 'temp', why: '{T} 눈이 쌓일 만큼 춥지 않아요!' },
    frozen: { cat: 'temp', why: '{T} 여름엔 얼음이 녹아요!' },
    rainyday: { cat: 'rain' }, wetseason: { cat: 'rain' }, dryseason: { cat: 'rain' }, norain: { cat: 'rain' },
    littlerain: { cat: 'rain' }, summerdry: { cat: 'rain' }, winterrain: { cat: 'rain' }, evenrain: { cat: 'rain' },
    jungle: { cat: 'land' }, tallgrass: { cat: 'land' }, shortgrass: { cat: 'land' }, sand: { cat: 'land' },
    conifer: { cat: 'land' }, moss: { cat: 'land' }, notrees: { cat: 'land' },
    // 한 장의 사진에 보이는 식생일 뿐, 밀림·초원이나 연중 기후를 뜻하지 않는다.
    localplants: { cat: 'land', why: '빙설 지역에는 풀·덤불 같은 식물이 자라지 않아요!' },
    ice: { cat: 'land', why: '끝없는 얼음 벌판은 빙설 지역이에요!' },
    oasis: { cat: 'land', why: '오아시스는 사막에 있어요!' },
    olive: { cat: 'land', why: '올리브와 포도는 여름이 건조한 곳에서 자라요!' },
    pasture: { cat: 'land', why: '젖소 목장은 1년 내내 비가 고르게 오는 곳에 많아요!' },
    mountain: { cat: 'land', why: '{T} 높은 산 위가 아니에요!' },
    savannaAnimals: { cat: 'animal', name: '기린·사자·얼룩말은' },
    parrot: { cat: 'animal', name: '앵무새는' },
    camel: { cat: 'animal', name: '낙타는' },
    reindeer: { cat: 'animal', name: '순록은' },
    penguin: { cat: 'animal', name: '펭귄은' },
    llama: { cat: 'animal', name: '라마는' },
    moose: { cat: 'animal', name: '무스는' },
    nomad: { cat: 'life', why: '게르는 초원 유목민의 집이에요!' },
    village: { cat: 'life', why: '빙설 지역엔 마을이 없어요!' },
    station: { cat: 'life' },
    thinair: { cat: 'life', why: '공기가 희박한 건 높은 산 위예요!' },
    mosquito: { cat: 'life', why: '{T} 모기가 살 수 없을 만큼 추워요!' }
  },

  // 기후별 규칙. topic = '~은/는', place = 동물 문장용 '~에'
  rules: {
    rainforest: { topic: '열대우림은', place: '열대우림에',
      facts: { temp: '1년 내내 더워요', rain: '1년 내내 비가 많이 와서 건기가 없어요', land: '나무가 빽빽한 밀림이에요' },
      allowed: ['hot', 'rainyday', 'jungle', 'parrot', 'mosquito', 'hotwear'] },
    savanna: { topic: '사바나는', place: '사바나에',
      facts: { temp: '1년 내내 더워요', rain: '건기와 우기가 있어요', land: '긴 풀 초원에 나무가 드문드문 있어요' },
      allowed: ['hot', 'warmsummer', 'dryseason', 'wetseason', 'tallgrass', 'savannaAnimals', 'parrot', 'mosquito', 'hotwear'] },
    desert: { topic: '사막은', place: '사막에',
      facts: { temp: '낮엔 뜨겁고 밤엔 추워요', rain: '비가 거의 안 와요', land: '모래·바위가 많고, 스텝 같은 풀밭은 드물어요' },
      allowed: ['hot', 'scorching', 'warmsummer', 'coldnight', 'needwarm', 'norain', 'littlerain', 'sand', 'oasis', 'camel', 'notrees', 'nomad', 'mosquito', 'hotwear'] },
    steppe: { topic: '스텝은', place: '스텝 초원에',
      facts: { temp: '여름은 덥고 겨울은 매우 추워요', rain: '비가 적어요', land: '나무 없이 짧은 풀만 자라요' },
      allowed: ['hot', 'warmsummer', 'scorching', 'coldnight', 'coldwinter', 'snow', 'needwarm', 'norain', 'littlerain', 'dryseason', 'shortgrass', 'notrees', 'nomad', 'camel', 'mosquito', 'hotwear'] },
    mediterranean: { topic: '지중해 주변 지역의 기후는', place: '지중해 지역에',
      facts: { temp: '여름은 덥고 겨울은 따뜻해요', rain: '여름엔 비가 거의 없고 겨울에 와요', land: '올리브와 포도가 잘 자라요' },
      allowed: ['hot', 'warmsummer', 'warmwinter', 'needwarm', 'summerdry', 'winterrain', 'olive', 'mosquito', 'hotwear'] },
    marine: { topic: '서부 유럽의 기후는', place: '서부 유럽에',
      facts: { temp: '여름은 선선하고 겨울은 따뜻한 편이에요', rain: '1년 내내 비가 고르게 와요', land: '푸른 목초지가 많아요' },
      allowed: ['mild', 'warmsummer', 'warmwinter', 'needwarm', 'evenrain', 'winterrain', 'pasture', 'mosquito', 'hotwear'] },
    taiga: { topic: '타이가는', place: '타이가에',
      facts: { temp: '겨울은 길고 매우 춥지만 여름은 따뜻해요', rain: '눈과 비가 적당히 와요', land: '침엽수 숲이 끝없이 펼쳐져요' },
      allowed: ['warmsummer', 'coldwinter', 'snow', 'needwarm', 'littlerain', 'conifer', 'moose', 'reindeer', 'village', 'mosquito', 'hotwear'] },
    tundra: { topic: '툰드라는', place: '툰드라에',
      facts: { temp: '가장 따뜻한 달 평균도 10℃ 아래예요', rain: '비와 눈이 적어요', land: '나무 없이 이끼만 자라요' },
      allowed: ['coolsummer', 'coldwinter', 'snow', 'needwarm', 'littlerain', 'moss', 'notrees', 'reindeer', 'moose', 'village', 'station', 'mosquito', 'hotwear'] },
    icecap: { topic: '빙설 지역은', place: '빙설 지역에',
      facts: { temp: '1년 내내 평균 0℃ 아래예요', rain: '눈이 조금 와요', land: '끝없는 얼음뿐, 식물이 없어요' },
      allowed: ['frozen', 'coldwinter', 'snow', 'needwarm', 'littlerain', 'ice', 'notrees', 'penguin', 'station'] },
    highland: { topic: '고산 기후는', place: '높은 산 위에',
      facts: { temp: '1년 내내 봄처럼 시원해요', rain: '비는 지역마다 달라요', land: '높은 산 위 서늘한 곳이에요' },
      allowed: ['mild', 'equatorcool', 'needwarm', 'rainyday', 'mountain', 'llama', 'parrot', 'thinair', 'mosquito', 'hotwear'] }
  },

  // 사진: 고향 기후의 gallery(data.js)와 짝을 이룸
  photos: {
    rf_jungle:     { home: 'rainforest', tags: ['jungle'] },
    rf_rain:       { home: 'rainforest', tags: ['rainyday', 'jungle'] },
    rf_house:      { home: 'rainforest', tags: ['jungle'], okWhy: '강가 습지라 집을 높이 지었어요!' },
    rf_parrot:     { home: 'rainforest', tags: ['parrot', 'jungle'] },
    rf_fruit:      { home: 'rainforest', tags: ['jungle', 'hot'] },
    sv_giraffe:    { home: 'savanna', tags: ['savannaAnimals', 'tallgrass', 'dryseason'] },
    sv_waterhole:  { home: 'savanna', tags: ['savannaAnimals', 'dryseason', 'tallgrass'], cap: '건기', okWhy: '건기엔 동물들이 물가에 모여요!' },
    sv_wetseason:  { home: 'savanna', tags: ['savannaAnimals', 'tallgrass', 'wetseason'], cap: '우기', trap: '사바나도 우기엔 비가 많이 와요!' },
    sv_huts:       { home: 'savanna', tags: ['tallgrass'] },
    sv_lion:       { home: 'savanna', tags: ['savannaAnimals', 'tallgrass'] },
    ds_dunes:      { home: 'desert', tags: ['sand', 'camel', 'notrees'] },
    ds_oasis:      { home: 'desert', tags: ['oasis', 'sand'] },
    ds_house:      { home: 'desert', tags: ['sand'], okWhy: '두꺼운 흙벽이 더위를 막아요!' },
    ds_night:      { home: 'desert', tags: ['coldnight', 'sand', 'camel'], cap: '밤', trap: '사막은 밤에 추워요. 일교차가 커요!' },
    st_grass:      { home: 'steppe', tags: ['shortgrass', 'notrees'] },
    st_ger:        { home: 'steppe', tags: ['nomad', 'shortgrass', 'notrees'], okWhy: '게르는 옮기기 쉬운 유목민의 집이에요!' },
    st_winter:     { home: 'steppe', tags: ['snow', 'coldwinter', 'nomad', 'shortgrass'], cap: '1월', trap: '몽골 같은 스텝은 겨울에 아주 추워요!' },
    st_horse:      { home: 'steppe', tags: ['shortgrass', 'notrees'] },
    md_village:    { home: 'mediterranean', tags: ['summerdry', 'hot'], cap: '7월' },
    md_olive:      { home: 'mediterranean', tags: ['olive', 'summerdry'] },
    md_vineyard:   { home: 'mediterranean', tags: ['olive', 'summerdry'] },
    md_winterrain: { home: 'mediterranean', tags: ['winterrain', 'warmwinter'], cap: '1월', trap: '지중해 주변 지역의 기후는 겨울에 비가 와요!' },
    wm_pasture:    { home: 'marine', tags: ['pasture', 'evenrain'], cap: '7월' },
    wm_street:     { home: 'marine', tags: ['evenrain'], cap: '7월' },
    wm_cheese:     { home: 'marine', tags: ['pasture'] },
    tg_forest:     { home: 'taiga', tags: ['conifer'] },
    tg_cabin:      { home: 'taiga', tags: ['conifer'] },
    tg_snow:       { home: 'taiga', tags: ['conifer', 'snow', 'coldwinter'], cap: '1월' },
    tg_summerlake: { home: 'taiga', tags: ['conifer', 'warmsummer'], cap: '7월', trap: '타이가의 여름은 따뜻해요!' },
    tg_moose:      { home: 'taiga', tags: ['conifer', 'moose'] },
    td_reindeer:   { home: 'tundra', tags: ['moss', 'notrees', 'reindeer'] },
    td_summer:     { home: 'tundra', tags: ['moss', 'notrees', 'coolsummer'], cap: '7월' },
    td_winter:     { home: 'tundra', tags: ['reindeer', 'snow', 'notrees'] },
    td_stilts:     { home: 'tundra', tags: ['village', 'snow', 'notrees'], okWhy: '언 땅이 녹지 않게 집을 띄워 지어요!' },
    ic_icesheet:   { home: 'icecap', tags: ['ice', 'frozen'] },
    ic_station:    { home: 'icecap', tags: ['station', 'ice'], trap: '빙설 지역에도 연구 기지가 있어요!' },
    ic_penguin:    { home: 'icecap', tags: ['penguin', 'ice'] },
    ic_blizzard:   { home: 'icecap', tags: ['ice', 'snow', 'frozen'] },
    al_city:       { home: 'highland', tags: ['mountain'] },
    al_llama:      { home: 'highland', tags: ['llama', 'mountain'] },
    al_potato:     { home: 'highland', tags: ['mountain'] },
    al_terrace:    { home: 'highland', tags: ['mountain'], okWhy: '산비탈에 계단 모양 밭을 만들어요!' },

    // also = 함께 실리는 도감. home은 손패 후보를 만드는 고향 하나로 유지한다.
    rf_puddles:    { home: 'rainforest', also: 'savanna', tags: ['hot', 'localplants'], cap: '비 온 뒤', okWhy: '열대우림에도 사바나에도 비 온 뒤 흙길에 웅덩이가 생겨요. 이 사진만으로 연중 강수량은 몰라요!' },
    sv_greenedge:  { home: 'savanna', also: 'rainforest', tags: ['hot', 'localplants'], okWhy: '뜨거운 햇볕과 작은 초록 들판은 두 기후 모두에서 볼 수 있어요. 들판 밖이 밀림인지 초원인지는 몰라요!' },
    rf_mistslope:  { home: 'rainforest', also: 'highland', tags: ['rainyday', 'localplants'], cap: '비 온 뒤', okWhy: '안개 낀 푸른 산비탈은 열대우림과 열대 고산 모두에서 볼 수 있어요. 사진만으로 높이는 몰라요!' },
    al_wetlane:    { home: 'highland', also: 'rainforest', tags: ['rainyday', 'localplants'], cap: '비 온 뒤', okWhy: '비에 젖은 큰 잎 식물이 있는 골목은 열대우림과 열대 고산 모두에 있어요!' },
    sv_dryplain:  { home: 'savanna', also: 'steppe', tags: ['dryseason', 'localplants'], cap: '건조한 때', okWhy: '비가 적게 오는 때에는 사바나와 스텝 모두 풀이 누렇게 마를 수 있어요!' },
    st_cattle:    { home: 'steppe', also: 'savanna', tags: ['dryseason', 'localplants'], cap: '건조한 때', okWhy: '사바나와 스텝 모두 소를 기르고, 마른 풀을 뜯는 소 떼를 볼 수 있어요!' },
    ds_gravel:    { home: 'desert', also: 'steppe', tags: ['littlerain', 'localplants'], okWhy: '사막에도 스텝에도 자갈 땅과 키 작은 덤불이 있어요. 사막이 모두 모래 언덕인 것은 아니에요!' },
    st_dustroad:  { home: 'steppe', also: 'desert', tags: ['scorching', 'localplants'], cap: '더운 낮', okWhy: '사막의 낮과 스텝의 더운 여름 모두 흙길에 먼지가 날릴 수 있어요!' },
    md_stonegarden: { home: 'mediterranean', also: 'marine', tags: ['warmsummer', 'localplants'], cap: '초여름', okWhy: '돌담 집과 꽃 핀 정원은 지중해 주변 지역과 서부 유럽 모두에 있어요!' },
    wm_harbor:    { home: 'marine', also: 'mediterranean', tags: ['warmsummer'], cap: '여름', okWhy: '작은 항구와 요트는 두 지역 해안 모두에서 볼 수 있어요. 맑은 하루가 여름 내내 건조하다는 뜻은 아니에요!' },
    tg_treeline:  { home: 'taiga', also: 'tundra', tags: ['snow', 'coldwinter'], cap: '겨울 · 숲 경계', okWhy: '타이가의 빈터와 숲 경계에 가까운 툰드라에서 이런 눈밭을 볼 수 있어요. 먼 침엽수는 툰드라 안이 아닌 숲 쪽에 있어요!' },
    td_mossrocks: { home: 'tundra', also: 'taiga', tags: ['localplants'], okWhy: '이끼 낀 바위와 낮은 덤불은 툰드라와 타이가 숲 바닥 모두에 있어요. 사진 밖에 나무가 있는지는 몰라요!' },
    td_snowrocks: { home: 'tundra', also: 'icecap', tags: ['snow', 'coldwinter', 'notrees'], cap: '겨울', okWhy: '겨울 툰드라와 빙설 지역 가장자리 모두 눈·얼음과 드러난 바위를 볼 수 있어요. 여름에도 얼음이 남는지는 몰라요!' },
    ic_frozencoast: { home: 'icecap', also: 'tundra', tags: ['snow', 'coldwinter', 'notrees'], cap: '겨울', okWhy: '극지의 얼어붙은 해안은 빙설 지역과 겨울 툰드라 모두에서 볼 수 있어요!' }
  },

  temps: [
    { home: 'rainforest', text: '30℃', tags: ['hot'] },
    { home: 'rainforest', text: '28℃', tags: ['hot'] },
    { home: 'rainforest', text: '31℃', tags: ['hot'] },
    { home: 'savanna', text: '30℃', tags: ['hot'] },
    { home: 'savanna', text: '32℃', tags: ['hot'] },
    { home: 'desert', text: '낮 42℃', tags: ['scorching'] },
    { home: 'desert', text: '낮 45℃', tags: ['scorching'] },
    { home: 'desert', text: '밤 5℃', tags: ['coldnight'], trap: '사막은 밤에 추워요. 일교차가 커요!' },
    { home: 'steppe', text: '25℃', cap: '7월', tags: ['warmsummer'] },
    { home: 'steppe', text: '-20℃', cap: '1월', tags: ['coldwinter'], trap: '몽골 같은 스텝은 겨울에 아주 추워요!' },
    { home: 'mediterranean', text: '32℃', cap: '7월', tags: ['hot'] },
    { home: 'mediterranean', text: '12℃', cap: '1월', tags: ['warmwinter'], okWhy: '지중해의 겨울은 따뜻한 편이에요!' },
    { home: 'marine', text: '18℃', cap: '7월', tags: ['mild'], trap: '서부 유럽의 기후는 여름에도 선선해요!' },
    { home: 'marine', text: '6℃', cap: '1월', tags: ['warmwinter'], okWhy: '서부 유럽의 겨울은 따뜻한 편이에요!' },
    { home: 'taiga', text: '22℃', cap: '7월', tags: ['warmsummer'], trap: '타이가의 여름은 따뜻해요!' },
    { home: 'taiga', text: '-30℃', cap: '1월', tags: ['coldwinter'] },
    { home: 'tundra', text: '7℃', cap: '7월', tags: ['coolsummer'] },
    { home: 'tundra', text: '-25℃', cap: '1월', tags: ['coldwinter'] },
    { home: 'icecap', text: '-10℃', cap: '7월', tags: ['frozen'] },
    { home: 'icecap', text: '-5℃', cap: '여름', tags: ['frozen'] },
    { home: 'icecap', text: '-30℃', cap: '1월', tags: ['coldwinter'] },
    { home: 'highland', text: '15℃', tags: ['mild'] },
    { home: 'highland', text: '14℃', tags: ['mild'] },
    { home: 'highland', text: '13℃', tags: ['mild'] }
  ],

  quotes: [
    { home: 'rainforest', text: '땀이 줄줄 났어!', tags: ['hot'] },
    { home: 'rainforest', text: '매일 소나기가 와!', tags: [] },
    { home: 'rainforest', text: '1년 내내 매일 비가 와', tags: ['rainyday'] },
    { home: 'rainforest', text: '건기가 없더라', tags: ['rainyday'] },
    { home: 'rainforest', text: '나무가 빽빽해서 어두워', tags: ['jungle'] },
    { home: 'rainforest', text: '습해서 빨래가 안 말라', tags: ['rainyday'] },
    { home: 'savanna', text: '풀이 내 키보다 커!', tags: ['tallgrass'] },
    { home: 'savanna', text: '건기라 풀이 누렇더라', tags: ['dryseason', 'tallgrass'] },
    { home: 'savanna', text: '우기엔 초원이 초록색!', tags: ['tallgrass', 'wetseason'], trap: '사바나는 우기엔 푸르러요!' },
    { home: 'savanna', text: '기린을 봤어!', tags: ['savannaAnimals'] },
    { home: 'savanna', text: '사자가 낮잠 자더라', tags: ['savannaAnimals'] },
    { home: 'desert', text: '비가 거의 안 와', tags: ['norain'] },
    { home: 'desert', text: '밤엔 패딩 입었어', tags: ['coldnight', 'needwarm'], trap: '사막은 밤에 추워요. 일교차가 커요!' },
    { home: 'desert', text: '낙타를 탔어!', tags: ['camel'] },
    { home: 'desert', text: '오아시스에서 쉬었어', tags: ['oasis'] },
    { home: 'desert', text: '모래바람이 불었어', tags: ['sand'] },
    { home: 'steppe', text: '나무가 하나도 없어', tags: ['notrees'], trap: '스텝은 짧은 풀만 자라는 초원이에요!' },
    { home: 'steppe', text: '짧은 풀이 끝없이!', tags: ['shortgrass'] },
    { home: 'steppe', text: '게르에서 잤어', tags: ['nomad'] },
    { home: 'steppe', text: '겨울엔 영하 20도!', tags: ['coldwinter'], trap: '몽골 같은 스텝은 겨울에 아주 추워요!' },
    { home: 'steppe', text: '양 떼가 풀을 뜯어', tags: ['shortgrass'] },
    { home: 'mediterranean', text: '여름 내내 쨍쨍!', tags: ['summerdry'] },
    { home: 'mediterranean', text: '올리브가 진짜 맛있어', tags: ['olive'] },
    { home: 'mediterranean', text: '겨울엔 비가 자주 와', tags: ['winterrain'], trap: '지중해 주변 지역의 기후는 겨울에 비가 와요!' },
    { home: 'mediterranean', text: '여름엔 비가 안 와', tags: ['summerdry'] },
    { home: 'marine', text: '한여름에도 비가 와', tags: ['evenrain'] },
    { home: 'marine', text: '여름인데 선선해', tags: ['mild'], trap: '서부 유럽의 기후는 여름에도 선선해요!' },
    { home: 'marine', text: '치즈랑 우유가 최고', tags: ['pasture'] },
    { home: 'marine', text: '1년 내내 흐리고 비 와', tags: ['evenrain'] },
    { home: 'taiga', text: '나무가 끝도 없어!', tags: ['conifer'] },
    { home: 'taiga', text: '겨울이 엄청 길어', tags: ['coldwinter'] },
    { home: 'taiga', text: '호수에서 수영했어', tags: ['warmsummer'], trap: '타이가의 여름은 따뜻해요!' },
    { home: 'taiga', text: '무스를 봤어!', tags: ['moose'] },
    { home: 'taiga', text: '여름엔 모기가 많아', tags: ['mosquito'], trap: '타이가는 여름에 모기가 많아요!' },
    { home: 'tundra', text: '나무가 한 그루도 없어', tags: ['notrees'] },
    { home: 'tundra', text: '여름인데 쌀쌀해', tags: ['coolsummer'] },
    { home: 'tundra', text: '순록 떼를 만났어', tags: ['reindeer'] },
    { home: 'tundra', text: '땅이 온통 이끼야', tags: ['moss'] },
    { home: 'tundra', text: '여름엔 모기 떼가!', tags: ['mosquito'], trap: '툰드라도 짧은 여름엔 모기가 많아요!' },
    { home: 'icecap', text: '1년 내내 얼음뿐이야', tags: ['ice', 'frozen'] },
    { home: 'icecap', text: '펭귄을 봤어!', tags: ['penguin'] },
    { home: 'icecap', text: '기지에서 연구했어', tags: ['station'], trap: '빙설 지역에도 연구 기지가 있어요!' },
    { home: 'icecap', text: '나무도 풀도 없어', tags: ['notrees'] },
    { home: 'highland', text: '1년 내내 봄 같아', tags: ['mild'] },
    { home: 'highland', text: '숨이 조금 찼어', tags: ['thinair'], okWhy: '높은 곳은 공기가 희박해요!' },
    { home: 'highland', text: '라마를 만났어!', tags: ['llama'] },
    { home: 'highland', text: '적도인데 쌀쌀했어', tags: ['mild', 'equatorcool'], trap: '고산 기후는 적도라도 높아서 시원해요!' },
    { home: 'highland', text: '계단 밭이 신기해', tags: ['mountain'] }
  ],

  // 어느 기후에서나 진짜인 평범한 한마디 (한 사건에 1개 이하로)
  neutralQuotes: ['정말 멋진 곳이었어!', '사진을 잔뜩 찍었어', '또 가고 싶어!', '현지 음식 최고!'],

  // 짐: 고향 없이 공용. trapFor = 기후별 함정, okWhy = 기후별 '진짜' 이유
  items: {
    raincoat:    { tags: [] },
    umbrella:    { tags: [] },
    puffer:      { tags: ['needwarm'], trapFor: { desert: '사막은 밤에 추워서 따뜻한 옷이 필요해요!' } },
    beanie:      { tags: ['needwarm'], trapFor: { desert: '사막은 밤에 추워서 따뜻한 옷이 필요해요!' } },
    handwarmer:  { tags: ['needwarm'] },
    sunglasses:  { tags: [], trapFor: { icecap: '얼음에 반사된 햇빛이 아주 강해요!' } },
    sunscreen:   { tags: [], okWhy: { highland: '높은 곳은 햇빛이 강해요!' } },
    bugspray:    { tags: ['mosquito'], trapFor: { taiga: '타이가는 여름에 모기가 많아요!', tundra: '툰드라도 짧은 여름엔 모기가 많아요!' } },
    canteen:     { tags: [] },
    binoculars:  { tags: [] },
    robe:        { tags: [], okWhy: { desert: '헐렁한 옷은 햇빛과 모래를 막아요!' } },
    boots:       { tags: [] },
    oxygen:      { tags: ['thinair'], okWhy: { highland: '높은 곳은 공기가 희박해요!' } },
    camera:      { tags: [] },
    hikingboots: { tags: [] },
    tshirt:      { tags: ['hotwear'] }
  },

  // 무한 수사 규칙
  endless: {
    travelers: { min: 3, max: 4, fourFrom: 3 },     // 연속 해결 3건부터 4명이 더 자주
    fakeWeights: { 0: 20, 1: 55, 2: 25 },           // 가짜 0~2명 (2명은 4명일 때만)
    forceTrapChance: 0.6                             // 진짜 여행자 중 함정 1개 이상 넣을 확률
  },

  ranks: [
    { stars: 0, name: '수습 탐정' },
    { stars: 10, name: '탐정' },
    { stars: 25, name: '베테랑 탐정' },
    { stars: 45, name: '명탐정' },
    { stars: 80, name: '전설의 기후 탐정' }
  ],

  badges: [
    { id: 'first',   name: '첫 사건 해결',  goal: '사건 1개 해결' },
    { id: 'perfect', name: '완벽한 수사',   goal: '별 3개로 5번 해결' },
    { id: 'trap',    name: '함정 탐지기',   goal: '함정을 하나도 의심하지 않고 5번 해결' },
    { id: 'speed',   name: '번개 수사',     goal: '30초 안에 해결' },
    { id: 'nofake',  name: '모두 진짜!',    goal: '가짜가 없는 사건을 맞히기' },
    { id: 'twin',    name: '쌍둥이 가짜',   goal: '무한 수사에서 가짜 2명 잡기' },
    { id: 'streak',  name: '연속 10건',     goal: '무한 수사 10연속 해결' },
    { id: 'dex',     name: '기후 박사',     goal: '기후 도감 완성' },
    { id: 'photo',   name: '여행 사진가',   goal: '사진 모두 모으기' }
  ]
};

// 기존 태그 허용 여부와 사건 데이터는 그대로 두고 새 관찰 태그·도감 사진만 확장한다.
for (const [climate, rule] of Object.entries(window.FAKE_BANK.rules)) {
  if (climate !== 'icecap') rule.allowed.push('localplants');
}
for (const [img, photo] of Object.entries(window.FAKE_BANK.photos)) {
  if (photo.also) for (const climate of [photo.home, photo.also]) window.FAKE.climates[climate].gallery.push(img);
}
