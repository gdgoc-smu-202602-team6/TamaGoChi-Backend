-- Roles and what each role may do. Data, not schema (object.md 0.2): the permission keys are code, which role holds
-- which key is here. Idempotent: running it again gives the same rows.

INSERT INTO "roles" ("name", "assigned_on_create", "assigned_on_join") VALUES
  ('운영진', true, false),
  ('부원', false, true)
ON CONFLICT ("name") DO UPDATE SET
  "assigned_on_create" = EXCLUDED."assigned_on_create",
  "assigned_on_join" = EXCLUDED."assigned_on_join";

-- The seeded roles end up with exactly these permissions; 부원 has none.
WITH "wanted" ("role_name", "permission") AS (
  VALUES
    ('운영진', 'club.update'),
    ('운영진', 'parts.manage'),
    ('운영진', 'noticeCategories.manage'),
    ('운영진', 'applications.decide'),
    ('운영진', 'members.manage'),
    ('운영진', 'notices.write')
),
"removed" AS (
  DELETE FROM "role_permissions" rp
  USING "roles" r
  WHERE rp."role_id" = r."id"
    AND r."name" IN ('운영진', '부원')
    AND NOT EXISTS (
      SELECT 1 FROM "wanted" w WHERE w."role_name" = r."name" AND w."permission" = rp."permission"
    )
)
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT r."id", w."permission"
FROM "wanted" w JOIN "roles" r ON r."name" = w."role_name"
ON CONFLICT ("role_id", "permission") DO NOTHING;
