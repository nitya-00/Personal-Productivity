DROP INDEX IF EXISTS "ChallengeDay_challengeId_dayNumber_key";
DROP INDEX IF EXISTS "ChallengeDay_challengeId_date_key";
CREATE INDEX IF NOT EXISTS "ChallengeDay_challengeId_dayNumber_idx" ON "ChallengeDay"("challengeId", "dayNumber");
CREATE INDEX IF NOT EXISTS "ChallengeDay_challengeId_date_idx" ON "ChallengeDay"("challengeId", "date");
