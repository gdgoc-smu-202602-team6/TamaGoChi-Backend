-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL,
    "image" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ,
    "refresh_token_expires_at" TIMESTAMPTZ,
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_device_tokens" (
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_device_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_parts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "club_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_notice_categories" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "club_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "preset" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_notice_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_notice_category_subcategories" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_notice_category_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "assigned_on_create" BOOLEAN NOT NULL DEFAULT false,
    "assigned_on_join" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission")
);

-- CreateTable
CREATE TABLE "club_members" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "club_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "part_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "notifications_on" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_applications" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "club_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "part_id" UUID NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "decided_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_goals" (
    "user_id" TEXT NOT NULL,
    "start_on" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_goals_pkey" PRIMARY KEY ("user_id","start_on")
);

-- CreateTable
CREATE TABLE "user_study_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_day_settlements" (
    "user_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "studied_seconds" INTEGER NOT NULL,
    "attended" BOOLEAN NOT NULL,
    "goal_met" BOOLEAN NOT NULL,
    "hearts" INTEGER NOT NULL,
    "bugs" INTEGER NOT NULL,
    "bug_progress_seconds" INTEGER NOT NULL,
    "attendance_streak" INTEGER NOT NULL,
    "absence_streak" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_day_settlements_pkey" PRIMARY KEY ("user_id","day")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "min_level" INTEGER NOT NULL DEFAULT 1,
    "default_owned" BOOLEAN NOT NULL DEFAULT false,
    "room_size" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_items" (
    "user_id" TEXT NOT NULL,
    "item_id" UUID NOT NULL,
    "price" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_items_pkey" PRIMARY KEY ("user_id","item_id")
);

-- CreateTable
CREATE TABLE "user_rooms" (
    "user_id" TEXT NOT NULL,
    "guestbook_checked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_rooms_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_room_items" (
    "user_id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "item_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_room_items_pkey" PRIMARY KEY ("user_id","slot")
);

-- CreateTable
CREATE TABLE "user_room_placements" (
    "user_id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_room_placements_pkey" PRIMARY KEY ("user_id","target")
);

-- CreateTable
CREATE TABLE "user_likes" (
    "user_id" TEXT NOT NULL,
    "liker_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_likes_pkey" PRIMARY KEY ("user_id","liker_user_id")
);

-- CreateTable
CREATE TABLE "user_guestbook_entries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" TEXT NOT NULL,
    "club_id" UUID NOT NULL,
    "author_user_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_guestbook_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_notices" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "club_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID,
    "author_user_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "notification_state" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_notice_reads" (
    "notice_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_notice_reads_pkey" PRIMARY KEY ("notice_id","member_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE INDEX "user_device_tokens_user_id_idx" ON "user_device_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_invite_code_key" ON "clubs"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "club_parts_club_id_name_key" ON "club_parts"("club_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "club_notice_categories_club_id_name_key" ON "club_notice_categories"("club_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "club_notice_category_subcategories_category_id_name_key" ON "club_notice_category_subcategories"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "club_members_user_id_idx" ON "club_members"("user_id");

-- CreateIndex
CREATE INDEX "club_members_part_id_idx" ON "club_members"("part_id");

-- CreateIndex
CREATE INDEX "club_members_role_id_idx" ON "club_members"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_members_club_id_user_id_key" ON "club_members"("club_id", "user_id");

-- CreateIndex
CREATE INDEX "club_applications_user_id_idx" ON "club_applications"("user_id");

-- CreateIndex
CREATE INDEX "club_applications_part_id_idx" ON "club_applications"("part_id");

-- CreateIndex
CREATE INDEX "club_applications_club_id_state_idx" ON "club_applications"("club_id", "state");

-- CreateIndex
CREATE INDEX "user_study_sessions_user_id_started_at_idx" ON "user_study_sessions"("user_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "items_id_slot_key" ON "items"("id", "slot");

-- CreateIndex
CREATE INDEX "user_items_item_id_idx" ON "user_items"("item_id");

-- CreateIndex
CREATE INDEX "user_room_items_item_id_slot_idx" ON "user_room_items"("item_id", "slot");

-- CreateIndex
CREATE INDEX "user_likes_liker_user_id_idx" ON "user_likes"("liker_user_id");

-- CreateIndex
CREATE INDEX "user_guestbook_entries_user_id_club_id_created_at_id_idx" ON "user_guestbook_entries"("user_id", "club_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "user_guestbook_entries_club_id_idx" ON "user_guestbook_entries"("club_id");

-- CreateIndex
CREATE INDEX "user_guestbook_entries_author_user_id_idx" ON "user_guestbook_entries"("author_user_id");

-- CreateIndex
CREATE INDEX "club_notices_club_id_pinned_created_at_id_idx" ON "club_notices"("club_id", "pinned" DESC, "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "club_notices_category_id_idx" ON "club_notices"("category_id");

-- CreateIndex
CREATE INDEX "club_notices_subcategory_id_idx" ON "club_notices"("subcategory_id");

-- CreateIndex
CREATE INDEX "club_notices_author_user_id_idx" ON "club_notices"("author_user_id");

-- CreateIndex
CREATE INDEX "club_notice_reads_member_id_idx" ON "club_notice_reads"("member_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_tokens" ADD CONSTRAINT "user_device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_parts" ADD CONSTRAINT "club_parts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notice_categories" ADD CONSTRAINT "club_notice_categories_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notice_category_subcategories" ADD CONSTRAINT "club_notice_category_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "club_notice_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "club_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "club_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_daily_goals" ADD CONSTRAINT "user_daily_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_study_sessions" ADD CONSTRAINT "user_study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_day_settlements" ADD CONSTRAINT "user_day_settlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rooms" ADD CONSTRAINT "user_rooms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_room_items" ADD CONSTRAINT "user_room_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_rooms"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_room_items" ADD CONSTRAINT "user_room_items_item_id_slot_fkey" FOREIGN KEY ("item_id", "slot") REFERENCES "items"("id", "slot") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_room_placements" ADD CONSTRAINT "user_room_placements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_rooms"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_likes" ADD CONSTRAINT "user_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_likes" ADD CONSTRAINT "user_likes_liker_user_id_fkey" FOREIGN KEY ("liker_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_guestbook_entries" ADD CONSTRAINT "user_guestbook_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_guestbook_entries" ADD CONSTRAINT "user_guestbook_entries_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_guestbook_entries" ADD CONSTRAINT "user_guestbook_entries_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "club_notice_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "club_notice_category_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notice_reads" ADD CONSTRAINT "club_notice_reads_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "club_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notice_reads" ADD CONSTRAINT "club_notice_reads_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints and partial unique indexes: Prisma's schema cannot express them (db.md).
-- Character limits are not here; the value objects count grapheme clusters.

ALTER TABLE "users" ADD CONSTRAINT "users_name_check" CHECK ("name" = btrim("name") AND "name" <> '');

ALTER TABLE "clubs" ADD CONSTRAINT "clubs_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_invite_code_check" CHECK ("invite_code" ~ '^[A-Z0-9]{8}$');

ALTER TABLE "club_parts" ADD CONSTRAINT "club_parts_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "club_parts" ADD CONSTRAINT "club_parts_color_check"
  CHECK ("color" IN ('RED','ORANGE','YELLOW','GREEN','BLUE','PURPLE','PINK','GRAY'));

ALTER TABLE "club_notice_categories" ADD CONSTRAINT "club_notice_categories_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "club_notice_categories" ADD CONSTRAINT "club_notice_categories_color_check"
  CHECK ("color" IN ('RED','ORANGE','YELLOW','GREEN','BLUE','PURPLE','PINK','GRAY'));
CREATE UNIQUE INDEX "club_notice_categories_club_id_preset_key" ON "club_notice_categories"("club_id") WHERE "preset";

ALTER TABLE "club_notice_category_subcategories" ADD CONSTRAINT "club_notice_category_subcategories_name_check"
  CHECK (btrim("name") <> '');

CREATE UNIQUE INDEX "roles_assigned_on_create_key" ON "roles"("assigned_on_create") WHERE "assigned_on_create";
CREATE UNIQUE INDEX "roles_assigned_on_join_key" ON "roles"("assigned_on_join") WHERE "assigned_on_join";

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_check"
  CHECK ("permission" IN ('club.update','parts.manage','noticeCategories.manage','applications.decide',
                          'members.manage','notices.write'));

ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_state_check"
  CHECK ("state" IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_decided_at_check"
  CHECK (("state" = 'PENDING') = ("decided_at" IS NULL));
CREATE UNIQUE INDEX "club_applications_club_id_user_id_pending_key" ON "club_applications"("club_id", "user_id")
  WHERE "state" = 'PENDING';

ALTER TABLE "user_daily_goals" ADD CONSTRAINT "user_daily_goals_minutes_check"
  CHECK ("minutes" BETWEEN 30 AND 720 AND "minutes" % 10 = 0);

ALTER TABLE "user_study_sessions" ADD CONSTRAINT "user_study_sessions_ended_at_check"
  CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at");
CREATE UNIQUE INDEX "user_study_sessions_user_id_running_key" ON "user_study_sessions"("user_id")
  WHERE "ended_at" IS NULL;

ALTER TABLE "user_day_settlements" ADD CONSTRAINT "user_day_settlements_studied_seconds_check"
  CHECK ("studied_seconds" BETWEEN 0 AND 86400);
ALTER TABLE "user_day_settlements" ADD CONSTRAINT "user_day_settlements_hearts_check" CHECK ("hearts" BETWEEN 0 AND 4);
ALTER TABLE "user_day_settlements" ADD CONSTRAINT "user_day_settlements_bugs_check" CHECK ("bugs" BETWEEN 0 AND 3);
ALTER TABLE "user_day_settlements" ADD CONSTRAINT "user_day_settlements_streaks_check"
  CHECK ("bug_progress_seconds" >= 0 AND "attendance_streak" >= 0 AND "absence_streak" >= 0);

ALTER TABLE "items" ADD CONSTRAINT "items_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_]*$');
ALTER TABLE "items" ADD CONSTRAINT "items_slot_check"
  CHECK ("slot" IN ('CLOCK','WINDOW','DESK','LAMP','PLANT','BOOKSHELF','RUG','WALLPAPER','HEAD','FACE','NECK','ROOM'));
ALTER TABLE "items" ADD CONSTRAINT "items_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "items" ADD CONSTRAINT "items_grade_check" CHECK ("grade" IN ('BASIC','COMMON','RARE','EPIC'));
ALTER TABLE "items" ADD CONSTRAINT "items_price_check" CHECK ("price" >= 0);
ALTER TABLE "items" ADD CONSTRAINT "items_min_level_check" CHECK ("min_level" >= 1);
ALTER TABLE "items" ADD CONSTRAINT "items_room_size_check"
  CHECK (("slot" = 'ROOM') = ("room_size" IS NOT NULL) AND ("room_size" IS NULL OR "room_size" BETWEEN 1 AND 20));

ALTER TABLE "user_items" ADD CONSTRAINT "user_items_price_check" CHECK ("price" >= 0);

ALTER TABLE "user_room_placements" ADD CONSTRAINT "user_room_placements_target_check"
  CHECK ("target" IN ('DESK','BOOKSHELF','PLANT','RUG','CHARACTER'));

ALTER TABLE "user_likes" ADD CONSTRAINT "user_likes_not_own_room_check" CHECK ("user_id" <> "liker_user_id");

ALTER TABLE "user_guestbook_entries" ADD CONSTRAINT "user_guestbook_entries_body_check" CHECK (btrim("body") <> '');
ALTER TABLE "user_guestbook_entries" ADD CONSTRAINT "user_guestbook_entries_not_own_room_check"
  CHECK ("author_user_id" IS NULL OR "author_user_id" <> "user_id");

ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_title_check" CHECK (btrim("title") <> '');
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_body_check" CHECK (btrim("body") <> '');
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_notification_state_check"
  CHECK ("notification_state" IN ('NONE','PENDING','SENT','FAILED'));
CREATE INDEX "club_notices_notification_state_pending_idx" ON "club_notices"("notification_state")
  WHERE "notification_state" = 'PENDING';
