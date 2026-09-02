-- TeamMembership.role
ALTER TABLE "TeamMembership" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member';

-- Backfill: the earliest-joined member of each team is the owner.
UPDATE "TeamMembership" tm
SET "role" = 'owner'
FROM (
  SELECT DISTINCT ON ("teamId") "id"
  FROM "TeamMembership"
  ORDER BY "teamId", "joinedAt" ASC
) first_join
WHERE tm."id" = first_join."id";

-- Team.inviteCodeNormalized — add nullable, backfill, then constrain.
ALTER TABLE "Team" ADD COLUMN "inviteCodeNormalized" TEXT;

UPDATE "Team"
SET "inviteCodeNormalized" = regexp_replace(upper("inviteCode"), '[^A-Z0-9]', '', 'g');

ALTER TABLE "Team" ALTER COLUMN "inviteCodeNormalized" SET NOT NULL;
ALTER TABLE "Team" ALTER COLUMN "inviteCodeNormalized" SET DEFAULT '';
CREATE UNIQUE INDEX "Team_inviteCodeNormalized_key" ON "Team"("inviteCodeNormalized");
