-- game: what neither the Prisma schema nor the contract states.

-- One running session per user (merged 3.2).
ALTER TABLE "user_study_sessions" ADD CONSTRAINT "user_study_sessions_ended_at_check"
  CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at");
CREATE UNIQUE INDEX "user_study_sessions_user_id_running_key" ON "user_study_sessions"("user_id")
  WHERE "ended_at" IS NULL;

ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_level_check" CHECK ("level" >= 1);

ALTER TABLE "user_day_settlements" ADD CONSTRAINT "user_day_settlements_studied_seconds_check"
  CHECK ("studied_seconds" BETWEEN 0 AND 86400);
ALTER TABLE "user_day_settlements" ADD CONSTRAINT "user_day_settlements_hearts_check" CHECK ("hearts" BETWEEN 0 AND 4);
ALTER TABLE "user_day_settlements" ADD CONSTRAINT "user_day_settlements_bugs_check" CHECK ("bugs" BETWEEN 0 AND 3);
ALTER TABLE "user_day_settlements" ADD CONSTRAINT "user_day_settlements_streaks_check"
  CHECK ("bug_progress_seconds" >= 0 AND "attendance_streak" >= 0 AND "absence_streak" >= 0);

ALTER TABLE "items" ADD CONSTRAINT "items_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_]*$');
ALTER TABLE "items" ADD CONSTRAINT "items_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "items" ADD CONSTRAINT "items_price_check" CHECK ("price" >= 0);
ALTER TABLE "items" ADD CONSTRAINT "items_min_level_check" CHECK ("min_level" >= 1);
-- Only a house has a floor size.
ALTER TABLE "items" ADD CONSTRAINT "items_room_size_check"
  CHECK (("slot" = 'ROOM') = ("room_size" IS NOT NULL) AND ("room_size" IS NULL OR "room_size" BETWEEN 1 AND 20));

-- A placement policy is all of surface_kind, width, height and solid, or none; step only with one. A character is
-- always placed.
ALTER TABLE "items" ADD CONSTRAINT "items_placement_policy_check"
  CHECK (("surface_kind" IS NULL) = ("width" IS NULL) AND ("surface_kind" IS NULL) = ("height" IS NULL)
    AND ("surface_kind" IS NULL) = ("solid" IS NULL) AND ("surface_kind" IS NOT NULL OR "step" IS NULL));
ALTER TABLE "items" ADD CONSTRAINT "items_placement_size_check"
  CHECK (("width" IS NULL OR "width" >= 1) AND ("height" IS NULL OR "height" >= 1) AND ("step" IS NULL OR "step" > 0));
ALTER TABLE "items" ADD CONSTRAINT "items_character_placed_check"
  CHECK ("slot" <> 'CHARACTER' OR "surface_kind" IS NOT NULL);

ALTER TABLE "user_items" ADD CONSTRAINT "user_items_price_check" CHECK ("price" >= 0);

-- Nobody likes or writes in their own room.
ALTER TABLE "user_likes" ADD CONSTRAINT "user_likes_not_own_room_check" CHECK ("user_id" <> "liker_user_id");
ALTER TABLE "user_guestbook_entries" ADD CONSTRAINT "user_guestbook_entries_body_check" CHECK (btrim("body") <> '');
ALTER TABLE "user_guestbook_entries" ADD CONSTRAINT "user_guestbook_entries_not_own_room_check"
  CHECK ("author_user_id" IS NULL OR "author_user_id" <> "user_id");
