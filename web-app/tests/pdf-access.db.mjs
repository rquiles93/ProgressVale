import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import "dotenv/config";
import pg from "pg";
import ExcelJS from "exceljs";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const password = "Ficticia-PDF-2026-Segura1";
const keepTrackingQa = process.env.KEEP_TRACKING_QA === "1";

function sessionCookie(response) {
  const raw = response.headers.getSetCookie?.()[0] ?? response.headers.get("set-cookie") ?? "";
  return raw.split(";", 1)[0];
}

async function signUp(email, ip) {
  const response = await fetch(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { origin: baseURL, "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ name: "Cuenta PDF QA", email, password }),
  });
  assert.equal(response.status, 200);
  return sessionCookie(response);
}

test("PDF and CSV endpoints enforce session and cross-account ownership", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  const token = randomUUID();
  const emailA = `pdf-a-${token}@example.invalid`;
  const emailB = `pdf-b-${token}@example.invalid`;
  const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
  let qaPreserved = false;
  await database.connect();
  try {
    const cookieA = await signUp(emailA, "198.51.100.201");
    await signUp(emailB, "198.51.100.202");
    const owners = await database.query(`SELECT id, email FROM "User" WHERE email = ANY($1::text[])`, [[emailA, emailB]]);
    const ownerA = owners.rows.find((row) => row.email === emailA).id;
    const ownerB = owners.rows.find((row) => row.email === emailB).id;
    const now = new Date();
    const clientA = `pdf-client-a-${token}`;
    const clientB = `pdf-client-b-${token}`;
    const assessmentA = `pdf-assessment-a-${token}`;
    const assessmentB = `pdf-assessment-b-${token}`;
    await database.query(
      `INSERT INTO "Client" (id, "ownerId", name, identifier, "serviceSettings", "createdAt", "updatedAt") VALUES
       ($1, $2, 'Cliente PDF ficticio A', 'PDF-A', ARRAY['SCHOOL']::"ServiceSetting"[], $5, $5),
       ($3, $4, 'Cliente PDF ficticio B', 'PDF-B', ARRAY['SCHOOL']::"ServiceSetting"[], $5, $5)`,
      [clientA, ownerA, clientB, ownerB, now],
    );
    await database.query(
      `INSERT INTO "Assessment" (id, "clientId", "ownerId", status, "evaluationStartedAt", "evaluationCompletedAt", "protocolVersion", "serviceSettingsSnapshot", "createdAt", "updatedAt") VALUES
       ($1, $2, $3, 'FINALIZED', $7, $7, 'qa', ARRAY['SCHOOL']::"ServiceSetting"[], $7, $7),
       ($4, $5, $6, 'FINALIZED', $7, $7, 'qa', ARRAY['SCHOOL']::"ServiceSetting"[], $7, $7)`,
      [assessmentA, clientA, ownerA, assessmentB, clientB, ownerB, now],
    );
    await database.query(`UPDATE "Assessment" SET status = 'IN_PROGRESS', "evaluationCompletedAt" = NULL WHERE id = $1`, [assessmentA]);
    for (const [assessmentId, suffix] of [[assessmentA, "a"], [assessmentB, "b"]]) {
      await database.query(
        `INSERT INTO "AssessmentSection" (id, "assessmentId", "sectionCode", "defaultEnabled", enabled, "createdAt", "updatedAt") VALUES ($1, $2, 'A', true, true, $3, $3)`,
        [`pdf-section-${suffix}-${token}`, assessmentId, now],
      );
      await database.query(
        `INSERT INTO "AssessmentScore" (id, "assessmentId", "skillIdentifier", score, "maxScore", "createdAt", "updatedAt") VALUES ($1, $2, 'A1', 0, 2, $3, $3)`,
        [`pdf-score-${suffix}-${token}`, assessmentId, now],
      );
    }
    await database.query(
      `INSERT INTO "AssessmentSection" (id, "assessmentId", "sectionCode", "defaultEnabled", enabled, "lockReason", "createdAt", "updatedAt") VALUES
       ($1, $2, 'B', true, true, NULL, $5, $5),
       ($3, $2, 'M', false, false, 'SERVICE_SETTING', $5, $5),
       ($4, $2, 'Y', false, false, 'PERMANENT', $5, $5)`,
      [`pdf-section-extra-b-${token}`, assessmentA, `pdf-section-m-${token}`, `pdf-section-y-${token}`, now],
    );
    await database.query(
      `INSERT INTO "AssessmentScore" (id, "assessmentId", "skillIdentifier", score, "maxScore", "createdAt", "updatedAt") VALUES
       ($1, $2, 'B1', 3, 4, $4, $4),
       ($3, $2, 'Y1', NULL, 1, $4, $4)`,
      [`pdf-score-extra-b-${token}`, assessmentA, `pdf-score-y-${token}`, now],
    );
    const beforePreview = await database.query(`SELECT status, "updatedAt" FROM "Assessment" WHERE id = $1`, [assessmentA]);

    const anonymous = await fetch(`${baseURL}/api/assessments/${assessmentA}/pdf`);
    assert.equal(anonymous.status, 401);
    assert.match(anonymous.headers.get("cache-control") ?? "", /no-store/);
    const anonymousCsv = await fetch(`${baseURL}/api/assessments/${assessmentA}/csv`);
    assert.equal(anonymousCsv.status, 401);

    const owned = await fetch(`${baseURL}/api/assessments/${assessmentA}/pdf`, { headers: { cookie: cookieA } });
    assert.equal(owned.status, 200);
    assert.equal(owned.headers.get("content-type"), "application/pdf");
    assert.match(owned.headers.get("cache-control") ?? "", /private.*no-store/);
    assert.equal(Buffer.from(await owned.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");

    const foreignAssessment = await fetch(`${baseURL}/api/assessments/${assessmentB}/pdf`, { headers: { cookie: cookieA } });
    assert.equal(foreignAssessment.status, 404);
    const ownedCsv = await fetch(`${baseURL}/api/assessments/${assessmentA}/csv`, { headers: { cookie: cookieA } });
    assert.equal(ownedCsv.status, 200);
    assert.match(ownedCsv.headers.get("content-type") ?? "", /text\/csv/);
    assert.match(ownedCsv.headers.get("cache-control") ?? "", /private.*no-store/);
    assert.deepEqual([...Buffer.from(await ownedCsv.arrayBuffer()).subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    const foreignCsv = await fetch(`${baseURL}/api/assessments/${assessmentB}/csv`, { headers: { cookie: cookieA } });
    assert.equal(foreignCsv.status, 404);
    const foreignTracking = await fetch(`${baseURL}/api/clients/${clientB}/skills-tracking/pdf`, { headers: { cookie: cookieA } });
    assert.equal(foreignTracking.status, 404);
    const clientPage = await fetch(`${baseURL}/clientes/${clientA}`, { headers: { cookie: cookieA } });
    assert.equal(clientPage.status, 200);
    const clientHtml = await clientPage.text();
    assert.match(clientHtml, /Exportar Skills Tracking/);
    assert.match(clientHtml, /Otros reportes/);
    assert.match(clientHtml, new RegExp(`/api/clients/${clientA}/skills-tracking/pdf`));
    assert.match(clientHtml, new RegExp(`/api/clients/${clientA}/skills-tracking/xlsx`));
    assert.match(clientHtml, /Detalle — PDF/);
    assert.match(clientHtml, /Detalle — CSV/);
    const trackingPage = await fetch(`${baseURL}/clientes/${clientA}/seguimiento`, { headers: { cookie: cookieA } });
    assert.equal(trackingPage.status, 200);
    const trackingHtml = await trackingPage.text();
    assert.match(trackingHtml, /Vista provisional/);
    assert.match(trackingHtml, /Provisional/);
    const ownedTracking = await fetch(`${baseURL}/api/clients/${clientA}/skills-tracking/pdf`, { headers: { cookie: cookieA } });
    assert.equal(ownedTracking.status, 200);
    const trackingPdf = Buffer.from(await ownedTracking.arrayBuffer());
    assert.equal(trackingPdf.subarray(0, 5).toString(), "%PDF-");
    assert.equal((trackingPdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length, 5, "provisional route must return the five-page grid report");
    const anonymousXlsx = await fetch(`${baseURL}/api/clients/${clientA}/skills-tracking/xlsx`);
    assert.equal(anonymousXlsx.status, 401);
    const foreignXlsx = await fetch(`${baseURL}/api/clients/${clientB}/skills-tracking/xlsx`, { headers: { cookie: cookieA } });
    assert.equal(foreignXlsx.status, 404);
    const ownedXlsx = await fetch(`${baseURL}/api/clients/${clientA}/skills-tracking/xlsx`, { headers: { cookie: cookieA } });
    assert.equal(ownedXlsx.status, 200);
    assert.match(ownedXlsx.headers.get("content-type") ?? "", /spreadsheetml/);
    assert.match(ownedXlsx.headers.get("cache-control") ?? "", /private.*no-store/);
    const trackingXlsx = Buffer.from(await ownedXlsx.arrayBuffer());
    assert.equal(trackingXlsx.subarray(0, 2).toString(), "PK");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(trackingXlsx);
    assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Rejilla 1", "Rejilla 2", "Rejilla 3", "Rejilla 4", "Rejilla 5"]);
    assert.match(String(workbook.getWorksheet("Rejilla 1").getCell("C3").value), /PROVISIONAL/);
    assert.match(String(workbook.getWorksheet("Rejilla 1").getCell("A62").value), /^A ·/);
    assert.notEqual(workbook.getWorksheet("Rejilla 1").getCell("A1").value, "Section");
    const afterPreview = await database.query(`SELECT status, "updatedAt" FROM "Assessment" WHERE id = $1`, [assessmentA]);
    assert.equal(afterPreview.rows[0].status, "IN_PROGRESS");
    assert.equal(afterPreview.rows[0].updatedAt.toISOString(), beforePreview.rows[0].updatedAt.toISOString());
    if (keepTrackingQa) {
      await mkdir("tmp/tracking-route-qa", { recursive: true });
      await writeFile("tmp/tracking-route-qa/skills-tracking-route.pdf", trackingPdf);
      await writeFile("tmp/tracking-route-qa/skills-tracking-route.xlsx", trackingXlsx);
      await writeFile("tmp/tracking-route-qa/context.json", JSON.stringify({ emailA, emailB, password, clientA, assessmentA }, null, 2));
      qaPreserved = true;
    }
  } finally {
    if (!keepTrackingQa || !qaPreserved) await database.query(`DELETE FROM "User" WHERE email = ANY($1::text[])`, [[emailA, emailB]]).catch(() => {});
    await database.end();
  }
});
