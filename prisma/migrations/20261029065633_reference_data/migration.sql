-- Reference data. Changing the catalog or the roles is a new migration (requirements R-53).

INSERT INTO "roles" ("name", "assigned_on_create", "assigned_on_join") VALUES
  ('운영진', true, false),
  ('부원', false, true);

INSERT INTO "role_permissions" ("role_id", "permission")
SELECT "id", p FROM "roles",
  unnest(ARRAY['club.update','parts.manage','noticeCategories.manage','applications.decide',
               'members.manage','rules.update','notices.write']) AS p
WHERE "name" = '운영진';

-- prd 8.2. Price 0 means owned by default; min_level 1 means no level limit (Q9: 포근 목도리 is 1).
INSERT INTO "items" ("code", "kind", "name", "grade", "price", "min_level", "room_size", "placeable_kind") VALUES
  ('sparkle_stand',            'FURNITURE', '반짝 스탠드',      'COMMON',  60,  1, NULL, NULL),
  ('green_plant',              'FURNITURE', '초록 화분',        'COMMON',  40,  1, NULL, 'PLANT'),
  ('bookshelf_of_knowledge',   'FURNITURE', '지식의 책장',      'EPIC',   120, 10, NULL, 'BOOKSHELF'),
  ('royal_rug',                'FURNITURE', '왕실 러그',        'RARE',    80,  5, NULL, 'RUG'),
  ('cream_grid_wallpaper',     'WALLPAPER', '크림 모눈 벽지',   'BASIC',    0,  1, NULL, NULL),
  ('mint_stripe_wallpaper',    'WALLPAPER', '민트 스트라이프',  'RARE',    50,  5, NULL, NULL),
  ('strawberry_dot_wallpaper', 'WALLPAPER', '딸기 도트 벽지',   'RARE',    50,  5, NULL, NULL),
  ('pompom_beanie',            'ACCESSORY', '방울 비니',        'RARE',    70,  5, NULL, NULL),
  ('study_glasses',            'ACCESSORY', '공부 안경',        'EPIC',    90, 10, NULL, NULL),
  ('cozy_scarf',               'ACCESSORY', '포근 목도리',      'COMMON',  60,  1, NULL, NULL),
  ('cozy_studio',              'ROOM_SIZE', '아늑한 원룸',      'BASIC',    0,  1, 5,    NULL),
  ('spacious_two_room',        'ROOM_SIZE', '넓은 투룸',        'RARE',   150,  5, 6,    NULL),
  ('dream_mansion',            'ROOM_SIZE', '꿈의 대저택',      'EPIC',   300, 10, 8,    NULL);
