ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "legacyIdentifier" TEXT;

-- Preserve every noncanonical value and any globally duplicated canonical value.
WITH ranked AS (
  SELECT
    id,
    identifier,
    row_number() OVER (PARTITION BY identifier ORDER BY "createdAt", id) AS occurrence
  FROM "Client"
  WHERE identifier ~ '^PV-[A-Z0-9]{6}$'
)
UPDATE "Client" AS client
SET "legacyIdentifier" = client.identifier
WHERE client.identifier IS NOT NULL
  AND btrim(client.identifier) <> ''
  AND (
    client.identifier !~ '^PV-[A-Z0-9]{6}$'
    OR client.id IN (SELECT id FROM ranked WHERE occurrence > 1)
  )
  AND client."legacyIdentifier" IS NULL;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY identifier ORDER BY "createdAt", id) AS occurrence
  FROM "Client"
  WHERE identifier ~ '^PV-[A-Z0-9]{6}$'
)
UPDATE "Client" AS client
SET identifier = NULL
WHERE identifier IS NULL
  OR btrim(identifier) = ''
  OR identifier !~ '^PV-[A-Z0-9]{6}$'
  OR client.id IN (SELECT id FROM ranked WHERE occurrence > 1);

DO $$
DECLARE
  client_record RECORD;
  candidate TEXT;
BEGIN
  FOR client_record IN SELECT id FROM "Client" WHERE identifier IS NULL ORDER BY "createdAt", id LOOP
    LOOP
      candidate := 'PV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "Client" WHERE identifier = candidate);
    END LOOP;
    UPDATE "Client" SET identifier = candidate WHERE id = client_record.id AND identifier IS NULL;
  END LOOP;
END $$;

ALTER TABLE "Client"
  ALTER COLUMN identifier TYPE VARCHAR(9),
  ALTER COLUMN identifier SET NOT NULL;

ALTER TABLE "Client"
DROP CONSTRAINT IF EXISTS "Client_ownerId_identifier_key";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Client_identifier_key'
      AND conrelid = '"Client"'::regclass
  ) THEN
    ALTER TABLE "Client" ADD CONSTRAINT "Client_identifier_key" UNIQUE (identifier);
  END IF;
END $$;
