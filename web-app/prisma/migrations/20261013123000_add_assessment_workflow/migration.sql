ALTER TYPE "AssessmentStatus" ADD VALUE IF NOT EXISTS 'FINALIZED';

CREATE TYPE "ServiceSetting" AS ENUM ('HOME', 'SCHOOL', 'CLINIC_BASED');

ALTER TABLE "Client"
ADD COLUMN "serviceSettings" "ServiceSetting"[] NOT NULL DEFAULT ARRAY[]::"ServiceSetting"[];

ALTER TABLE "Assessment"
ADD COLUMN "protocolVersion" TEXT,
ADD COLUMN "serviceSettingsSnapshot" "ServiceSetting"[] NOT NULL DEFAULT ARRAY[]::"ServiceSetting"[];

CREATE TABLE "AssessmentSection" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sectionCode" TEXT NOT NULL,
    "defaultEnabled" BOOLEAN NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "lockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentSection_assessmentId_sectionCode_key"
ON "AssessmentSection"("assessmentId", "sectionCode");

CREATE INDEX "AssessmentSection_assessmentId_enabled_idx"
ON "AssessmentSection"("assessmentId", "enabled");

ALTER TABLE "AssessmentSection"
ADD CONSTRAINT "AssessmentSection_assessmentId_fkey"
FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
