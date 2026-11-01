-- club: what neither the Prisma schema nor the contract states.

ALTER TABLE "clubs" ADD CONSTRAINT "clubs_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "club_parts" ADD CONSTRAINT "club_parts_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "club_notice_categories" ADD CONSTRAINT "club_notice_categories_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "club_notice_category_subcategories" ADD CONSTRAINT "club_notice_category_subcategories_name_check"
  CHECK (btrim("name") <> '');

-- One "전체공지" per club.
CREATE UNIQUE INDEX "club_notice_categories_club_id_preset_key" ON "club_notice_categories"("club_id") WHERE "preset";

-- One role given to a club's creator, one to an approved applicant.
CREATE UNIQUE INDEX "roles_assigned_on_create_key" ON "roles"("assigned_on_create") WHERE "assigned_on_create";
CREATE UNIQUE INDEX "roles_assigned_on_join_key" ON "roles"("assigned_on_join") WHERE "assigned_on_join";

-- An application is decided exactly when it is no longer pending; one pending application per club and user. A
-- pending one keeps its part (deleting a part in use is refused); a decided one outlives its part (B-16 needs it).
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_decided_at_check"
  CHECK (("state" = 'PENDING') = ("decided_at" IS NULL));
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_part_id_check"
  CHECK ("state" <> 'PENDING' OR "part_id" IS NOT NULL);
CREATE UNIQUE INDEX "club_applications_club_id_user_id_pending_key" ON "club_applications"("club_id", "user_id")
  WHERE "state" = 'PENDING';
