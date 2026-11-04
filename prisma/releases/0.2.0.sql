-- 0.1.0 → 0.2.0: placement policies in the item catalog, and placements on a surface (the floor or one of two walls).
-- Every placement stored before this release stands on the floor.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER DOMAIN "placement_target" DROP CONSTRAINT "placement_target_check";
ALTER DOMAIN "placement_target" ADD CONSTRAINT "placement_target_check"
  CHECK (VALUE IN ('CLOCK', 'WINDOW', 'DESK', 'LAMP', 'PLANT', 'BOOKSHELF', 'RUG', 'WALLPAPER', 'HEAD', 'FACE', 'NECK', 'ROOM', 'CHARACTER'));
CREATE DOMAIN "surface" AS text CHECK (VALUE IN ('FLOOR', 'LEFT_WALL', 'RIGHT_WALL'));
CREATE DOMAIN "surface_kind" AS text CHECK (VALUE IN ('FLOOR', 'WALL'));

CREATE TABLE "item_placement_policies" (
    "item_id" UUID NOT NULL,
    "surface_kind" "surface_kind" NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "step" DOUBLE PRECISION,
    "solid" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_placement_policies_pkey" PRIMARY KEY ("item_id")
);
ALTER TABLE "item_placement_policies" ADD CONSTRAINT "item_placement_policies_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_placement_policies" ADD CONSTRAINT "item_placement_policies_size_check"
  CHECK ("width" >= 1 AND "height" >= 1);
ALTER TABLE "item_placement_policies" ADD CONSTRAINT "item_placement_policies_step_check"
  CHECK ("step" IS NULL OR "step" > 0);

-- The table is built again so that "surface" stands after "target", as in a new database. Its rows wait in a
-- temporary table while it is dropped, so that the new table's constraints get the names they get in a new database.
CREATE TEMPORARY TABLE "user_room_placements_0_1_0" ON COMMIT DROP AS TABLE "user_room_placements";
DROP TABLE "user_room_placements";
CREATE TABLE "user_room_placements" (
    "user_id" TEXT NOT NULL,
    "target" "placement_target" NOT NULL,
    "surface" "surface" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_room_placements_pkey" PRIMARY KEY ("user_id","target")
);
INSERT INTO "user_room_placements" ("user_id", "target", "surface", "x", "y", "created_at")
  SELECT "user_id", "target", 'FLOOR', "x", "y", "created_at" FROM "user_room_placements_0_1_0";
ALTER TABLE "user_room_placements" ADD CONSTRAINT "user_room_placements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_rooms"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
