-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "club_rules" (
    "club_id" UUID NOT NULL,
    "start_on" DATE NOT NULL,
    "attendance_minutes" INTEGER NOT NULL,
    "absence_days_for_bugs" INTEGER NOT NULL,
    "minutes_per_bug" INTEGER NOT NULL,
    "max_session_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_rules_pkey" PRIMARY KEY ("club_id","start_on")
);

-- CreateTable
CREATE TABLE "club_member_daily_goals" (
    "member_id" UUID NOT NULL,
    "start_on" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_member_daily_goals_pkey" PRIMARY KEY ("member_id","start_on")
);

-- CreateTable
CREATE TABLE "club_member_study_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "member_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_member_study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_member_day_settlements" (
    "member_id" UUID NOT NULL,
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

    CONSTRAINT "club_member_day_settlements_pkey" PRIMARY KEY ("member_id","day")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "min_level" INTEGER NOT NULL DEFAULT 1,
    "room_size" INTEGER,
    "placeable_kind" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_member_items" (
    "member_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "price" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_member_items_pkey" PRIMARY KEY ("member_id","item_id")
);

-- CreateTable
CREATE TABLE "club_member_rooms" (
    "member_id" UUID NOT NULL,
    "room_size_item_id" UUID NOT NULL,
    "wallpaper_item_id" UUID NOT NULL,
    "guestbook_checked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_member_rooms_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "club_member_room_items" (
    "member_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_member_room_items_pkey" PRIMARY KEY ("member_id","item_id")
);

-- CreateTable
CREATE TABLE "club_member_room_placements" (
    "member_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_member_room_placements_pkey" PRIMARY KEY ("member_id","kind")
);

-- CreateTable
CREATE TABLE "club_member_likes" (
    "member_id" UUID NOT NULL,
    "liker_member_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_member_likes_pkey" PRIMARY KEY ("member_id","liker_member_id")
);

-- CreateTable
CREATE TABLE "club_member_guestbook_entries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "member_id" UUID NOT NULL,
    "author_member_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_member_guestbook_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_notices" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "club_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID,
    "author_member_id" UUID,
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
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

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
CREATE INDEX "club_member_study_sessions_member_id_started_at_idx" ON "club_member_study_sessions"("member_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");

-- CreateIndex
CREATE INDEX "club_member_items_item_id_idx" ON "club_member_items"("item_id");

-- CreateIndex
CREATE INDEX "club_member_rooms_room_size_item_id_idx" ON "club_member_rooms"("room_size_item_id");

-- CreateIndex
CREATE INDEX "club_member_rooms_wallpaper_item_id_idx" ON "club_member_rooms"("wallpaper_item_id");

-- CreateIndex
CREATE INDEX "club_member_room_items_item_id_idx" ON "club_member_room_items"("item_id");

-- CreateIndex
CREATE INDEX "club_member_likes_liker_member_id_idx" ON "club_member_likes"("liker_member_id");

-- CreateIndex
CREATE INDEX "club_member_guestbook_entries_member_id_created_at_id_idx" ON "club_member_guestbook_entries"("member_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "club_member_guestbook_entries_author_member_id_idx" ON "club_member_guestbook_entries"("author_member_id");

-- CreateIndex
CREATE INDEX "club_notices_club_id_pinned_created_at_id_idx" ON "club_notices"("club_id", "pinned" DESC, "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "club_notices_category_id_idx" ON "club_notices"("category_id");

-- CreateIndex
CREATE INDEX "club_notices_subcategory_id_idx" ON "club_notices"("subcategory_id");

-- CreateIndex
CREATE INDEX "club_notices_author_member_id_idx" ON "club_notices"("author_member_id");

-- CreateIndex
CREATE INDEX "club_notice_reads_member_id_idx" ON "club_notice_reads"("member_id");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_tokens" ADD CONSTRAINT "user_device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "club_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "club_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_rules" ADD CONSTRAINT "club_rules_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_daily_goals" ADD CONSTRAINT "club_member_daily_goals_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_study_sessions" ADD CONSTRAINT "club_member_study_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_day_settlements" ADD CONSTRAINT "club_member_day_settlements_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_items" ADD CONSTRAINT "club_member_items_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_items" ADD CONSTRAINT "club_member_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_rooms" ADD CONSTRAINT "club_member_rooms_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_rooms" ADD CONSTRAINT "club_member_rooms_room_size_item_id_fkey" FOREIGN KEY ("room_size_item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_rooms" ADD CONSTRAINT "club_member_rooms_wallpaper_item_id_fkey" FOREIGN KEY ("wallpaper_item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_room_items" ADD CONSTRAINT "club_member_room_items_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_member_rooms"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_room_items" ADD CONSTRAINT "club_member_room_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_room_placements" ADD CONSTRAINT "club_member_room_placements_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_member_rooms"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_likes" ADD CONSTRAINT "club_member_likes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_likes" ADD CONSTRAINT "club_member_likes_liker_member_id_fkey" FOREIGN KEY ("liker_member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_guestbook_entries" ADD CONSTRAINT "club_member_guestbook_entries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_member_guestbook_entries" ADD CONSTRAINT "club_member_guestbook_entries_author_member_id_fkey" FOREIGN KEY ("author_member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "club_notice_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "club_notice_category_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_author_member_id_fkey" FOREIGN KEY ("author_member_id") REFERENCES "club_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notice_reads" ADD CONSTRAINT "club_notice_reads_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "club_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_notice_reads" ADD CONSTRAINT "club_notice_reads_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ───────── Not expressible in the Prisma schema: CHECK constraints and partial unique indexes (db.md)

-- account
ALTER TABLE "user" ADD CONSTRAINT "user_name_check" CHECK ("name" = btrim("name") AND "name" <> '');

-- club
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_invite_code_check" CHECK ("invite_code" ~ '^[A-Z0-9]{8}$');
ALTER TABLE "club_parts" ADD CONSTRAINT "club_parts_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "club_parts" ADD CONSTRAINT "club_parts_color_check"
  CHECK ("color" IN ('RED','ORANGE','YELLOW','GREEN','BLUE','PURPLE','PINK','GRAY'));
ALTER TABLE "club_notice_categories" ADD CONSTRAINT "club_notice_categories_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "club_notice_categories" ADD CONSTRAINT "club_notice_categories_color_check"
  CHECK ("color" IN ('RED','ORANGE','YELLOW','GREEN','BLUE','PURPLE','PINK','GRAY'));
CREATE UNIQUE INDEX "club_notice_categories_club_id_preset_key" ON "club_notice_categories" ("club_id") WHERE "preset";
ALTER TABLE "club_notice_category_subcategories" ADD CONSTRAINT "club_notice_category_subcategories_name_check"
  CHECK (btrim("name") <> '');
CREATE UNIQUE INDEX "roles_assigned_on_create_key" ON "roles" ("assigned_on_create") WHERE "assigned_on_create";
CREATE UNIQUE INDEX "roles_assigned_on_join_key" ON "roles" ("assigned_on_join") WHERE "assigned_on_join";
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_check"
  CHECK ("permission" IN ('club.update','parts.manage','noticeCategories.manage','applications.decide',
                          'members.manage','rules.update','notices.write'));
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_state_check"
  CHECK ("state" IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_decided_at_check"
  CHECK (("state" = 'PENDING') = ("decided_at" IS NULL));
CREATE UNIQUE INDEX "club_applications_club_id_user_id_pending_key" ON "club_applications" ("club_id", "user_id")
  WHERE "state" = 'PENDING';

-- game
ALTER TABLE "club_rules" ADD CONSTRAINT "club_rules_attendance_minutes_check" CHECK ("attendance_minutes" BETWEEN 10 AND 180);
ALTER TABLE "club_rules" ADD CONSTRAINT "club_rules_absence_days_for_bugs_check" CHECK ("absence_days_for_bugs" BETWEEN 2 AND 14);
ALTER TABLE "club_rules" ADD CONSTRAINT "club_rules_minutes_per_bug_check" CHECK ("minutes_per_bug" BETWEEN 10 AND 180);
ALTER TABLE "club_rules" ADD CONSTRAINT "club_rules_max_session_minutes_check" CHECK ("max_session_minutes" BETWEEN 60 AND 720);
ALTER TABLE "club_member_daily_goals" ADD CONSTRAINT "club_member_daily_goals_minutes_check"
  CHECK ("minutes" BETWEEN 30 AND 720 AND "minutes" % 10 = 0);
ALTER TABLE "club_member_study_sessions" ADD CONSTRAINT "club_member_study_sessions_ended_at_check"
  CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at");
CREATE UNIQUE INDEX "club_member_study_sessions_member_id_running_key" ON "club_member_study_sessions" ("member_id")
  WHERE "ended_at" IS NULL;
ALTER TABLE "club_member_day_settlements" ADD CONSTRAINT "club_member_day_settlements_check" CHECK (
  "studied_seconds" BETWEEN 0 AND 86400 AND "hearts" BETWEEN 0 AND 4 AND "bugs" BETWEEN 0 AND 3
  AND "bug_progress_seconds" >= 0 AND "attendance_streak" >= 0 AND "absence_streak" >= 0);
ALTER TABLE "items" ADD CONSTRAINT "items_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_]*$');
ALTER TABLE "items" ADD CONSTRAINT "items_kind_check" CHECK ("kind" IN ('FURNITURE','WALLPAPER','ACCESSORY','ROOM_SIZE'));
ALTER TABLE "items" ADD CONSTRAINT "items_grade_check" CHECK ("grade" IN ('BASIC','COMMON','RARE','EPIC'));
ALTER TABLE "items" ADD CONSTRAINT "items_price_check" CHECK ("price" >= 0);
ALTER TABLE "items" ADD CONSTRAINT "items_min_level_check" CHECK ("min_level" >= 1);
ALTER TABLE "items" ADD CONSTRAINT "items_room_size_check"
  CHECK (("kind" = 'ROOM_SIZE') = ("room_size" IS NOT NULL) AND ("room_size" IS NULL OR "room_size" BETWEEN 1 AND 20));
ALTER TABLE "items" ADD CONSTRAINT "items_placeable_kind_check"
  CHECK ("placeable_kind" IS NULL OR ("kind" = 'FURNITURE' AND "placeable_kind" IN ('BOOKSHELF','PLANT','RUG')));
ALTER TABLE "club_member_items" ADD CONSTRAINT "club_member_items_price_check" CHECK ("price" >= 0);
ALTER TABLE "club_member_room_placements" ADD CONSTRAINT "club_member_room_placements_kind_check"
  CHECK ("kind" IN ('DESK','BOOKSHELF','PLANT','CHARACTER','RUG'));
ALTER TABLE "club_member_likes" ADD CONSTRAINT "club_member_likes_not_self_check" CHECK ("member_id" <> "liker_member_id");
ALTER TABLE "club_member_guestbook_entries" ADD CONSTRAINT "club_member_guestbook_entries_body_check" CHECK (btrim("body") <> '');
ALTER TABLE "club_member_guestbook_entries" ADD CONSTRAINT "club_member_guestbook_entries_not_self_check"
  CHECK ("member_id" <> "author_member_id");

-- notice
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_title_check" CHECK (btrim("title") <> '');
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_body_check" CHECK (btrim("body") <> '');
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_notification_state_check"
  CHECK ("notification_state" IN ('NONE','PENDING','SENT','FAILED'));
CREATE INDEX "club_notices_notification_state_pending_idx" ON "club_notices" ("notification_state")
  WHERE "notification_state" = 'PENDING';
