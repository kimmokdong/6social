무역왕 오프닝 배경음악·효과음 넣는 곳

[한 파일 방식] soundtrack.mp3 하나에 배경음악과 효과음을 섞어 넣기
- 이 폴더에 soundtrack.mp3가 있으면 아래 따로 파일 방식(m1~m6, sfx_*)은 쓰지 않습니다.
- 0:00 = 영상 첫 장면이 시작되는 순간(검은 화면에서 밝아지기 시작). 파일 길이는 1:33.4 정도(끝에서 1.3초 동안 저절로 줄어듦).
- 내레이션이 나오는 동안에는 파일 전체 소리가 0.8 → 0.35로 작아집니다. 효과음을 내레이션과 겹치지 않게 두면 더 잘 들립니다.
- 시각은 지금 녹음(op_01~16) 기준입니다. 녹음을 바꾸면 장면 길이가 달라질 수 있으니, 그때는 새 시각표를 다시 받으세요.

시각	장면(효과음 자리)	내레이션 시작	음악 파트
0:00.0	구름 걷히는 바다	0:00.6 아주 오래전, 넓은 바다 …	▶ 바다의 시대
0:07.3	작은 항구 마을	0:07.9 나라마다 잘하는 일이 달랐…	
0:12.4	식량 거두기	0:12.8 땅에서 기르고, 캐내고,…	▶ 기르고·만들고
0:14.4	석유 퍼 올리기		
0:16.4	철광석 캐기		
0:18.4	옷 짜기	0:18.8 만들고, 다듬었습니다.…	
0:20.4	철강 녹이기(주황 빛)		
0:22.5	첨단기기(파랑 빛)		
0:24.8	혼자인 섬(쓸쓸)	0:25.4 하지만 필요한 것을 모두 …	
0:32.4	계약 악수·도장	0:32.9 그래서 사람들은 약속을 맺…	▶ 무역
0:37.2	배에 짐 싣기	0:37.7 남는 것을 배에 실어…	
0:40.2	항해	0:40.8 먼 바다를 건넜습니다.…	
0:43.9	도착	0:44.4 그리고 모자란 것을 사 왔…	
0:48.2	수많은 배	0:48.8 수많은 배가 바다를 오갔습…	
0:53.0	태풍(번개 번쩍)	0:53.5 바다는 늘 평온하지 않았습…	▶ 시련
	  └ 번개 번쩍 0:53.0, 한 번 더 0:54.5
0:55.5	해적(안개)		
0:58.0	화재(연기·불씨)		
1:00.5	발명(햇살·반짝)	1:01.1 하지만 뜻밖의 기회도 찾아…	▶ 기회
1:02.8	시장(색종이)		
1:04.9	축제(불꽃놀이)		
	  └ 불꽃 1:04.9 · 1:05.4 · 1:05.7
1:07.4	항구가 도시로	1:08.0 배가 오갈수록 작은 항구는…	▶ 번영~끝
1:14.4	풍요로운 식탁	1:15.0 사람들의 식탁은 풍요로워졌…	
1:19.1	바다의 무역왕	1:19.7 무역으로 함께 자란 나라.…	
1:25.1	제목 무역왕 등장	1:25.7 이제, 당신의 나라가 바다…	
	  └ 불꽃 1:26.1 · 1:27.2 · 1:28.3 · 1:29.5
	  └ 제목 글자 쾅 1:27.7
1:31.2	금빛 빛 번짐(마지막)
1:32.1	영상이 걷히기 시작 → 1:33.4 끝

[따로 파일 방식]

- 아래 파일 이름 그대로 이 폴더에 넣으면 영상이 저절로 씁니다(mp3 권장, wav도 주시면 mp3로 바꿔 드림).
- 없는 파일은 조용히 건너뜁니다. 몇 개만 먼저 넣어도 됩니다.
- 음악은 파트가 바뀔 때 1~1.4초 동안 겹쳐 넘어가고, 내레이션이 나오는 동안 저절로 작아집니다.
- 음악이 파트 길이보다 짧으면 반복합니다. 끝과 처음이 자연스럽게 이어지는(루프) 곡이면 가장 좋습니다.
- 효과음은 그 장면이 끝나고 0.8초 뒤부터 잦아들며 꺼집니다. 2~5초짜리가 알맞습니다.
- 소리 크기 비율은 js/opening6.js의 volume(음악 0.5, 내레이션 중 음악 0.2, 효과음 0.7)에서 바꿉니다.
- 음악을 한 곡(약 92초)으로 쓰고 싶으면 js/opening6.js의 music을 {file: '한곡.mp3', from: 0, to: 23} 하나로 바꾸면 됩니다.

[구하는 곳]
- AI 음악 생성기(구글 AI 스튜디오의 음악 생성, Suno, Udio 등): 아래 영어 설명을 그대로 넣고 "instrumental, no vocals"로 만드세요.
- 무료 소리 모음: Pixabay(음악·효과음, 출처 표기 없이 사용 가능), freesound.org(검색 필터에서 라이선스 Creative Commons 0만 고르기).
- 어느 쪽이든 학교 수업에 써도 되는지 그 서비스의 이용 조건을 한 번 확인하세요.

[배경음악 6곡]  파일 이름 / 파트 / 길이 / 만들 때 넣을 설명
m1_sea.mp3     바다의 시대        약 12초   Mysterious calm opening, soft strings and harp, gentle ocean ambience, slowly rising, orchestral, instrumental, no vocals
m2_work.mp3    기르고·만들고      약 20초   Light rhythmic folk orchestra, plucked strings and wooden percussion, busy hardworking village mood, steady mid tempo, instrumental, no vocals
m3_trade.mp3   무역               약 21초   Adventurous sailing theme, brass and strings, waves of optimism, sea shanty feeling, mid-fast tempo, orchestral, instrumental, no vocals
m4_trial.mp3   시련               약 8초    Tense dark orchestral hit, low drums and cellos, storm and danger, short and dramatic, instrumental, no vocals
m5_chance.mp3  기회               약 7초    Bright joyful festive burst, glockenspiel and strings, celebration, upbeat, instrumental, no vocals
m6_glory.mp3   번영~끝            약 24초   Triumphant grand orchestral main theme, full brass and choir pad (no lyrics), heroic and warm, big ending swell at about 20 seconds, instrumental

[효과음 24개]  파일 이름 / 장면 / 장면 길이 / 검색어(Pixabay·freesound)
sfx_waves.mp3     구름 걷히는 바다      7초   ocean waves gentle, wind
sfx_harbor.mp3    작은 항구 마을        5초   harbor seagulls, small port ambience
sfx_harvest.mp3   식량 거두기           2초   wheat rustle, scythe
sfx_oilpump.mp3   석유 퍼 올리기        2초   oil pump machine, pumpjack
sfx_pickaxe.mp3   철광석 캐기           2초   pickaxe rock hit, mining
sfx_loom.mp3      옷 짜기               2초   loom weaving, sewing machine
sfx_forge.mp3     철강 녹이기           2초   furnace roar, metal hammer clang
sfx_tech.mp3      첨단기기              2초   electronic beep, sci-fi hum
sfx_wind.mp3      혼자인 섬(쓸쓸)       8초   lonely wind, low ambience
sfx_stamp.mp3     계약(악수·도장)       5초   paper stamp, handshake   (0.6초 뒤에 남)
sfx_crates.mp3    배에 짐 싣기          3초   wooden crates thud, crane
sfx_horn.mp3      항해                  4초   ship horn, sailing waves
sfx_bell.mp3      도착                  4초   harbor bell, ship bell
sfx_sea.mp3       수많은 배             5초   open sea, many ships
sfx_thunder.mp3   태풍                  2.5초 thunder strike, storm
sfx_cannon.mp3    해적                  2.5초 pirate cannon, wooden ship creak
sfx_fire.mp3      화재                  2.5초 fire crackle, flames
sfx_sparkle.mp3   발명                  2.3초 magic sparkle, idea ding
sfx_crowd.mp3     시장                  2초   market crowd chatter
sfx_firework.mp3  축제                  2.5초 firework burst     (0.1초 뒤에 남)
sfx_city.mp3      항구가 도시로         7초   city construction, busy town ambience
sfx_cheer.mp3     풍요로운 식탁         5초   happy crowd cheer, celebration
sfx_fanfare.mp3   바다의 무역왕         6초   victory fanfare, royal trumpet   (0.8초 뒤에 남)
sfx_whoosh.mp3    제목 등장             6.5초 cinematic whoosh, title impact   (2.4초 뒤, 제목이 커질 때 남)

──────────────────────────────────────────────
지금 들어 있는 soundtrack.mp3 (2026-10-24)
  원곡: src/Grand Sailing Theme.mp3 (3:14.8, 약 130 BPM)
  편집: 원곡 0:00~0:53.0 → 그대로 (바다의 시대·기르고·무역)
        원곡 2:27.85~ → 0:53.0부터 (잠잠해지는 부분 = 시련, 다시 오르는 부분 = 기회, 클라이맥스 = 번영)
        이음새는 박자에 맞춰 0.15초 겹침, 1:32.1부터 1.3초 페이드, 음량 약 -17 LUFS
  다른 곡으로 바꾸려면 soundtrack.mp3만 갈아 끼우면 된다.

──────────────────────────────────────────────
효과음 24개 (2026-10-24) — sfx_*.mp3
  출처: 모두 Freesound CC0 (목록·링크는 CREDITS.txt). 원본은 src/fs/, 장면 길이에 맞춰 자르고 음량(-18 LUFS)을 맞춘 것이 sfx_*.mp3.
  soundtrack.mp3가 있을 때 게임에서는 효과음이 기본으로 꺼져 있다. 어울리는지 보려면 trade-king/sfx-demo.html
  (하나씩 들어 보기 · 체크한 것만 넣어 오프닝 재생 · 영상 왼쪽 아래 빨간 '🔊 이름' = 지금 나는 효과음).
  마음에 드는 효과음이 정해지면 soundtrack.mp3에 섞어 넣거나(시각표 위), 게임에서 효과음을 켜 달라고 하면 된다.

[7.4 게임 중 소리]
- 효과음 후보: ui/*.mp3 (17가지 × 3개, 모두 CC0, 출처 ui/CREDITS.txt). 고르기: trade-king/game-sound-demo.html → [설정 복사] → trade-king/js/sound74.js의 pick·gain.
- 배경음악: bgm_theme.mp3(오프닝 원곡 전체). Suno 곡을 bgm_sail.mp3(평소)·bgm_storm.mp3(위기)로 넣고 sound74.js의 music에서 이름을 바꾸면 됩니다.
