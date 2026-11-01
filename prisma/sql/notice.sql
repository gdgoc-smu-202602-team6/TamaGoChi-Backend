-- notice: what neither the Prisma schema nor the contract states.

ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_title_check" CHECK (btrim("title") <> '');
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_body_check" CHECK (btrim("body") <> '');

-- The notices still waiting to be sent.
CREATE INDEX "club_notices_notification_state_pending_idx" ON "club_notices"("notification_state")
  WHERE "notification_state" = 'PENDING';
