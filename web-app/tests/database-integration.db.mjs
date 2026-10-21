import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import "dotenv/config";
import pg from "pg";

const content = JSON.parse(readFileSync(new URL("../lib/ablls-content.v1.json", import.meta.url), "utf8"));
const approved = new Set(content.sections.filter((section) => section.assessmentApproved).map((section) => section.code));
const excluded = new Set(content.sections.filter((section) => section.permanentlyExcluded).map((section) => section.code));

function availability(settings) {
  const allApproved = settings.includes("SCHOOL") || settings.includes("CLINIC_BASED");
  return content.sections.map((section) => {
    const homeLocked = !allApproved && ["M", "N"].includes(section.code);
    return {
      code: section.code,
      enabled: section.assessmentApproved && !homeLocked,
      reason: section.permanentlyExcluded ? "PERMANENT" : homeLocked ? "SERVICE_SETTING" : null,
    };
  });
}

test("assessment persistence, ownership, snapshots, locks, history, and finalization", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("BEGIN");
  try {
    const token = randomUUID();
    const ownerA = `itest-owner-a-${token}`;
    const ownerB = `itest-owner-b-${token}`;
    const clientA = `itest-client-a-${token}`;
    const clientB = `itest-client-b-${token}`;
    const assessmentHome = `itest-assessment-home-${token}`;
    const assessmentSchool = `itest-assessment-school-${token}`;
    const assessmentClinic = `itest-assessment-clinic-${token}`;
    const assessmentMixed = `itest-assessment-mixed-${token}`;
    const identifierA = `PV-${token.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    const identifierB = `PV-${token.replaceAll("-", "").slice(6, 12).toUpperCase()}`;
    const now = new Date();

    await client.query(
      `INSERT INTO "User" (id, email, "displayName", "emailVerified", "createdAt", "updatedAt") VALUES
       ($1, $2, 'Integration Owner A', false, $5, $5),
       ($3, $4, 'Integration Owner B', false, $5, $5)`,
      [ownerA, `integration-a-${token}@example.invalid`, ownerB, `integration-b-${token}@example.invalid`, now],
    );
    await client.query(
      `INSERT INTO "Client" (id, "ownerId", name, identifier, "serviceSettings", "createdAt", "updatedAt") VALUES
       ($1, $2, 'Cliente ficticio A', $6, ARRAY['HOME']::"ServiceSetting"[], $5, $5),
       ($3, $4, 'Cliente ficticio B', $7, ARRAY['SCHOOL']::"ServiceSetting"[], $5, $5)`,
      [clientA, ownerA, clientB, ownerB, now, identifierA, identifierB],
    );

    await client.query("SAVEPOINT duplicate_client_identifier");
    await assert.rejects(
      client.query(
        `INSERT INTO "Client" (id, "ownerId", name, identifier, "createdAt", "updatedAt") VALUES ($1, $2, 'Duplicate fictitious ID', $3, $4, $4)`,
        [`itest-client-duplicate-${token}`, ownerB, identifierA, now],
      ),
      (error) => error.code === "23505",
    );
    await client.query("ROLLBACK TO SAVEPOINT duplicate_client_identifier");

    await client.query(`UPDATE "Client" SET name = 'Renamed fictitious client' WHERE id = $1 AND "ownerId" = $2`, [clientA, ownerA]);
    const identifierAfterRename = await client.query(`SELECT identifier FROM "Client" WHERE id = $1 AND "ownerId" = $2`, [clientA, ownerA]);
    assert.equal(identifierAfterRename.rows[0].identifier, identifierA);

    const cases = [
      [assessmentHome, ["HOME"], "IN_PROGRESS", "#C67A5A"],
      [assessmentSchool, ["SCHOOL"], "FINALIZED", "#557A95"],
      [assessmentClinic, ["CLINIC_BASED"], "FINALIZED", "#9A7AA0"],
      [assessmentMixed, ["HOME", "SCHOOL"], "FINALIZED", "#B08A3E"],
    ];
    for (const [assessmentId, settings, status, trackingColor] of cases) {
      await client.query(
        `INSERT INTO "Assessment" (id, "clientId", "ownerId", status, "evaluationStartedAt", "protocolVersion", "serviceSettingsSnapshot", "trackingColor", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $7::"AssessmentStatus", $4, $5, $6::"ServiceSetting"[], $8, $4, $4)`,
        [assessmentId, clientA, ownerA, now, content.version, settings, status, trackingColor],
      );
      const rows = availability(settings);
      for (const row of rows) {
        await client.query(
          `INSERT INTO "AssessmentSection" (id, "assessmentId", "sectionCode", "defaultEnabled", enabled, "lockReason", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $4, $5, $6, $6)`,
          [`itest-section-${assessmentId}-${row.code}`, assessmentId, row.code, row.enabled, row.reason, now],
        );
      }
      const stored = await client.query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE enabled)::int AS enabled FROM "AssessmentSection" WHERE "assessmentId" = $1`,
        [assessmentId],
      );
      assert.equal(stored.rows[0].total, 25);
      assert.equal(stored.rows[0].enabled, settings.length === 1 && settings[0] === "HOME" ? 16 : 18);
    }

    const locked = await client.query(
      `SELECT "sectionCode", "lockReason" FROM "AssessmentSection" WHERE "assessmentId" = $1 AND NOT enabled ORDER BY "sectionCode"`,
      [assessmentHome],
    );
    assert.deepEqual(locked.rows.filter((row) => row.lockReason === "SERVICE_SETTING").map((row) => row.sectionCode), ["M", "N"]);
    assert.deepEqual(locked.rows.filter((row) => row.lockReason === "PERMANENT").map((row) => row.sectionCode), [...excluded]);

    await client.query(`UPDATE "Client" SET "serviceSettings" = ARRAY['CLINIC_BASED']::"ServiceSetting"[] WHERE id = $1`, [clientA]);
    const snapshot = await client.query(`SELECT "serviceSettingsSnapshot" FROM "Assessment" WHERE id = $1`, [assessmentHome]);
    assert.equal(snapshot.rows[0].serviceSettingsSnapshot, "{HOME}");
    const legacyLanguage = await client.query(`SELECT language FROM "Assessment" WHERE id = $1`, [assessmentHome]);
    assert.equal(legacyLanguage.rows[0].language, "EN");

    const task = content.tasks.find((item) => item.id === "A1");
    await client.query(
      `INSERT INTO "AssessmentScore" (id, "assessmentId", "skillIdentifier", score, "maxScore", "observedAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, 0, $4, $5, $5, $5)`,
      [`itest-score-${token}`, assessmentHome, task.id, task.maxScore, now],
    );
    await client.query(
      `INSERT INTO "AssessmentNote" (id, "assessmentId", "skillIdentifier", content, "createdAt", "updatedAt") VALUES ($1, $2, $3, 'Nota ficticia de integración', $4, $4)`,
      [`itest-note-${token}`, assessmentHome, task.id, now],
    );
    await client.query(`UPDATE "AssessmentSection" SET enabled = true WHERE "assessmentId" = $1 AND "sectionCode" = 'M'`, [assessmentHome]);
    await client.query(`UPDATE "AssessmentSection" SET enabled = false WHERE "assessmentId" = $1 AND "sectionCode" = 'M'`, [assessmentHome]);
    const persisted = await client.query(
      `SELECT s.score, s."maxScore", n.content FROM "AssessmentScore" s JOIN "AssessmentNote" n ON n."assessmentId" = s."assessmentId" AND n."skillIdentifier" = s."skillIdentifier" WHERE s."assessmentId" = $1 AND s."skillIdentifier" = $2`,
      [assessmentHome, task.id],
    );
    assert.deepEqual(persisted.rows[0], { score: 0, maxScore: task.maxScore, content: "Nota ficticia de integración" });

    const switchedLanguage = await client.query(`UPDATE "Assessment" SET language = 'ES' WHERE id = $1 AND "ownerId" = $2 RETURNING language`, [assessmentHome, ownerA]);
    assert.equal(switchedLanguage.rows[0].language, "ES");
    const crossOwnerLanguage = await client.query(`UPDATE "Assessment" SET language = 'EN' WHERE id = $1 AND "ownerId" = $2 RETURNING language`, [assessmentHome, ownerB]);
    assert.equal(crossOwnerLanguage.rowCount, 0);
    const preservedAfterLanguageSwitch = await client.query(
      `SELECT a.language, s.score, n.content FROM "Assessment" a JOIN "AssessmentScore" s ON s."assessmentId" = a.id JOIN "AssessmentNote" n ON n."assessmentId" = a.id AND n."skillIdentifier" = s."skillIdentifier" WHERE a.id = $1 AND s."skillIdentifier" = $2`,
      [assessmentHome, task.id],
    );
    assert.deepEqual(preservedAfterLanguageSwitch.rows[0], { language: "ES", score: 0, content: "Nota ficticia de integración" });

    const decreaseTask = content.tasks.find((item) => item.id === "A3");
    assert.ok(decreaseTask.maxScore >= 2);
    await client.query(
      `INSERT INTO "AssessmentScore" (id, "assessmentId", "skillIdentifier", score, "maxScore", "observedAt", "createdAt", "updatedAt") VALUES
       ($1, $3, $5, $7, $6, $9, $9, $9),
       ($2, $4, $5, $8, $6, $10, $10, $10)`,
      [`itest-score-history-a-${token}`, `itest-score-history-b-${token}`, assessmentSchool, assessmentClinic, decreaseTask.id, decreaseTask.maxScore, decreaseTask.maxScore, 2, new Date("2026-01-01T00:00:00Z"), new Date("2026-02-01T00:00:00Z")],
    );
    const historicalScores = await client.query(
      `SELECT "assessmentId", score FROM "AssessmentScore" WHERE "assessmentId" IN ($1, $2) AND "skillIdentifier" = $3 ORDER BY "observedAt"`,
      [assessmentSchool, assessmentClinic, decreaseTask.id],
    );
    assert.deepEqual(historicalScores.rows, [{ assessmentId: assessmentSchool, score: decreaseTask.maxScore }, { assessmentId: assessmentClinic, score: 2 }], "a later lower score remains individually retrievable from its own assessment");

    const crossOwner = await client.query(
      `SELECT c.id FROM "Client" c WHERE c.id = $1 AND c."ownerId" = $2`,
      [clientA, ownerB],
    );
    assert.equal(crossOwner.rowCount, 0);

    await client.query("SAVEPOINT duplicate_active");
    await assert.rejects(
      client.query(
        `INSERT INTO "Assessment" (id, "clientId", "ownerId", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, 'IN_PROGRESS', $4, $4)`,
        [`itest-duplicate-${token}`, clientA, ownerA, now],
      ),
      (error) => error.code === "23505",
    );
    await client.query("ROLLBACK TO SAVEPOINT duplicate_active");

    await client.query("SAVEPOINT duplicate_color");
    await assert.rejects(
      client.query(
        `INSERT INTO "Assessment" (id, "clientId", "ownerId", status, "trackingColor", "createdAt", "updatedAt") VALUES ($1, $2, $3, 'FINALIZED', '#C67A5A', $4, $4)`,
        [`itest-duplicate-color-${token}`, clientA, ownerA, now],
      ),
      (error) => error.code === "23505",
    );
    await client.query("ROLLBACK TO SAVEPOINT duplicate_color");

    const temporary = `itest-finalize-${token}`;
    await client.query(
      `INSERT INTO "Assessment" (id, "clientId", "ownerId", status, "trackingColor", "createdAt", "updatedAt") VALUES ($1, $2, $3, 'IN_PROGRESS', '#C67A5A', $4, $4)`,
      [temporary, clientB, ownerB, now],
    );
    const finalized = await client.query(
      `UPDATE "Assessment" SET status = 'FINALIZED', "evaluationCompletedAt" = $2, "updatedAt" = $2 WHERE id = $1 AND "ownerId" = $3 AND status = 'IN_PROGRESS' RETURNING status`,
      [temporary, now, ownerB],
    );
    assert.equal(finalized.rows[0].status, "FINALIZED");
    const immutable = await client.query(
      `UPDATE "Assessment" SET "updatedAt" = $2 WHERE id = $1 AND "ownerId" = $3 AND status = 'IN_PROGRESS' RETURNING id`,
      [temporary, new Date(), ownerB],
    );
    assert.equal(immutable.rowCount, 0);
    assert.equal(approved.size, 18);
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
});
