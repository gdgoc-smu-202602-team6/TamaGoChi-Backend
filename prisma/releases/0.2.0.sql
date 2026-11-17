-- 0.1.0 → 0.2.0: the character is an item of a CHARACTER slot, and a placement's target is a slot.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER DOMAIN "slot" DROP CONSTRAINT "slot_check";
ALTER DOMAIN "slot" ADD CONSTRAINT "slot_check"
  CHECK (VALUE IN ('CLOCK', 'WINDOW', 'DESK', 'LAMP', 'PLANT', 'BOOKSHELF', 'RUG', 'WALLPAPER', 'HEAD', 'FACE', 'NECK', 'ROOM', 'CHARACTER'));
ALTER TABLE "user_room_placements" ALTER COLUMN "target" TYPE "slot";
DROP DOMAIN "placement_target";
