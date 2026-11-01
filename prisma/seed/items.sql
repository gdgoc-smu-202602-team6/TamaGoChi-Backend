-- The item catalog, the same for every user (merged 8.2). Data, not schema (object.md 0.2): developers change these
-- values without changing code. Running it again gives the same rows.
-- 크림 모눈 벽지 and 아늑한 원룸 are left out until their values are decided (object.md 12).

INSERT INTO "items" ("code", "slot", "name", "grade", "price", "min_level", "default_owned", "room_size") VALUES
  ('basic_clock',              'CLOCK',     '시계',            'BASIC',    0,  1, true,  NULL),
  ('basic_window',             'WINDOW',    '창문',            'BASIC',    0,  1, true,  NULL),
  ('basic_desk',               'DESK',      '책상',            'BASIC',    0,  1, true,  NULL),
  ('sparkle_stand',            'LAMP',      '반짝 스탠드',     'COMMON',  60,  1, false, NULL),
  ('green_plant',              'PLANT',     '초록 화분',       'COMMON',  40,  1, false, NULL),
  ('bookshelf_of_knowledge',   'BOOKSHELF', '지식의 책장',     'EPIC',   120, 10, false, NULL),
  ('royal_rug',                'RUG',       '왕실 러그',       'RARE',    80,  5, false, NULL),
  ('grubby_wall',              'WALLPAPER', '꼬질꼬질한 벽',   'BASIC',    0,  1, true,  NULL),
  ('mint_stripe_wallpaper',    'WALLPAPER', '민트 스트라이프', 'RARE',    50,  5, false, NULL),
  ('strawberry_dot_wallpaper', 'WALLPAPER', '딸기 도트 벽지',  'RARE',    50,  5, false, NULL),
  ('pompom_beanie',            'HEAD',      '방울 비니',       'RARE',    70,  5, false, NULL),
  ('study_glasses',            'FACE',      '공부 안경',       'EPIC',    90, 10, false, NULL),
  ('cozy_scarf',               'NECK',      '포근 목도리',     'COMMON',  60,  1, false, NULL),
  ('shabby_gosiwon',           'ROOM',      '허름한 고시원',   'BASIC',    0,  1, true,  3),
  ('spacious_two_room',        'ROOM',      '넓은 투룸',       'RARE',   150,  5, false, 6),
  ('dream_mansion',            'ROOM',      '꿈의 대저택',     'EPIC',   300, 10, false, 8)
ON CONFLICT ("code") DO UPDATE SET
  "slot" = EXCLUDED."slot",
  "name" = EXCLUDED."name",
  "grade" = EXCLUDED."grade",
  "price" = EXCLUDED."price",
  "min_level" = EXCLUDED."min_level",
  "default_owned" = EXCLUDED."default_owned",
  "room_size" = EXCLUDED."room_size";
