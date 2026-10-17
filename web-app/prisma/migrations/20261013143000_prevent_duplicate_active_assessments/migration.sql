-- Prevent repeated submissions from creating more than one active assessment
-- for the same client while preserving unlimited finalized history.
CREATE UNIQUE INDEX "Assessment_one_active_per_client_idx"
ON "Assessment"("clientId")
WHERE "status" IN ('DRAFT', 'IN_PROGRESS');
