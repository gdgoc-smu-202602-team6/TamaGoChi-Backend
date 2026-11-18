-- The first item catalog, put into a new, empty database only (prisma/deploy.ts). After that the database is the
-- catalog's source of truth: developers change the rows there (db.md 1).
-- 크림 모눈 벽지 is left out until its values are decided (object.md 12).

INSERT INTO "items"
  ("code", "slot", "name", "grade", "price", "min_level", "default_owned", "room_size",
   "surface_kind", "width", "height", "step", "solid")
VALUES
  ('basic_clock',              'CLOCK',     '시계',            'BASIC',    0,  1, true,  NULL, 'WALL',  1, 1, 0.5,  true),
  ('basic_window',             'WINDOW',    '창문',            'BASIC',    0,  1, true,  NULL, 'WALL',  2, 2, 0.5,  true),
  ('basic_desk',               'DESK',      '책상',            'BASIC',    0,  1, true,  NULL, 'FLOOR', 2, 1, 0.5,  true),
  ('green_plant',              'PLANT',     '초록 화분',       'COMMON',  40,  1, false, NULL, 'FLOOR', 1, 1, NULL, true),
  ('bookshelf_of_knowledge',   'BOOKSHELF', '지식의 책장',     'EPIC',   120, 10, false, NULL, 'FLOOR', 1, 2, 0.5,  true),
  ('royal_rug',                'RUG',       '왕실 러그',       'RARE',    80,  5, false, NULL, 'FLOOR', 2, 2, NULL, false),
  ('grubby_wall',              'WALLPAPER', '꼬질꼬질한 벽',   'BASIC',    0,  1, true,  NULL, NULL,  NULL, NULL, NULL, NULL),
  ('mint_stripe_wallpaper',    'WALLPAPER', '민트 스트라이프', 'RARE',    50,  5, false, NULL, NULL,  NULL, NULL, NULL, NULL),
  ('strawberry_dot_wallpaper', 'WALLPAPER', '딸기 도트 벽지',  'RARE',    50,  5, false, NULL, NULL,  NULL, NULL, NULL, NULL),
  ('pompom_beanie',            'HEAD',      '방울 비니',       'RARE',    70,  5, false, NULL, NULL,  NULL, NULL, NULL, NULL),
  ('study_glasses',            'FACE',      '공부 안경',       'EPIC',    90, 10, false, NULL, NULL,  NULL, NULL, NULL, NULL),
  ('cozy_scarf',               'NECK',      '포근 목도리',     'COMMON',  60,  1, false, NULL, NULL,  NULL, NULL, NULL, NULL),
  ('shabby_gosiwon',           'ROOM',      '허름한 고시원',   'BASIC',    0,  1, true,  3,    NULL,  NULL, NULL, NULL, NULL),
  ('cozy_one_room',            'ROOM',      '아늑한 원룸',     'COMMON',  80,  1, false, 4,    NULL,  NULL, NULL, NULL, NULL),
  ('spacious_two_room',        'ROOM',      '넓은 투룸',       'RARE',   150,  5, false, 5,    NULL,  NULL, NULL, NULL, NULL),
  ('dream_mansion',            'ROOM',      '꿈의 대저택',     'EPIC',   300, 10, false, 6,    NULL,  NULL, NULL, NULL, NULL),
  ('robot',                    'CHARACTER', '로봇',            'BASIC',    0,  1, true,  NULL, 'FLOOR', 1, 1, NULL, true),
  ('hamster',                  'CHARACTER', '햄스터',          'COMMON',  60,  1, false, NULL, 'FLOOR', 1, 1, NULL, true),
  ('fox',                      'CHARACTER', '여우',            'RARE',   100,  5, false, NULL, 'FLOOR', 1, 1, NULL, true),
  ('frog',                     'CHARACTER', '개구리',          'EPIC',   200, 10, false, NULL, 'FLOOR', 1, 1, NULL, true);
