CREATE TYPE "AssessmentLanguage" AS ENUM ('EN', 'ES');

ALTER TABLE "Assessment"
ADD COLUMN "language" "AssessmentLanguage" NOT NULL DEFAULT 'EN';
