-- Persist the color associated with each assessment. Existing records retain
-- the colors previously derived from their chronological position.
ALTER TABLE "Assessment" ADD COLUMN "trackingColor" VARCHAR(7);

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "clientId"
      ORDER BY COALESCE("evaluationCompletedAt", "createdAt"), "createdAt", id
    ) AS position
  FROM "Assessment"
)
UPDATE "Assessment" AS assessment
SET "trackingColor" = CASE ordered.position
  WHEN 1 THEN '#365F4A'
  WHEN 2 THEN '#C67A5A'
  WHEN 3 THEN '#557A95'
  WHEN 4 THEN '#9A7AA0'
  WHEN 5 THEN '#B08A3E'
  WHEN 6 THEN '#487F78'
  WHEN 7 THEN '#8A5F55'
  WHEN 8 THEN '#667A48'
  WHEN 9 THEN '#B04A6F'
  WHEN 10 THEN '#3F78A8'
  WHEN 11 THEN '#A26935'
  WHEN 12 THEN '#6F63A6'
  WHEN 13 THEN '#2F877C'
  WHEN 14 THEN '#A84F45'
  WHEN 15 THEN '#718AA8'
  WHEN 16 THEN '#7B6A39'
  ELSE NULL
END
FROM ordered
WHERE assessment.id = ordered.id;

CREATE UNIQUE INDEX "Assessment_clientId_trackingColor_key"
ON "Assessment"("clientId", "trackingColor");
