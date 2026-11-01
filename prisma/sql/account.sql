-- account: what neither the Prisma schema nor the contract states. Length limits are the value objects', in
-- grapheme clusters.

ALTER TABLE "users" ADD CONSTRAINT "users_name_check" CHECK ("name" = btrim("name") AND "name" <> '');
