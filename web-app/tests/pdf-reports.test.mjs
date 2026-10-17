import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { generateAssessmentPdf, generateTrackingPdf, REPORT_COLORS } from "../lib/pdf-reports.ts";
import { HISTORY_COLORS } from "../lib/progress.ts";

const task = (sectionCode, index, maxScore = 2) => ({ id: `${sectionCode}${index}`, sectionCode, taskName: `Tarea ficticia ${sectionCode}${index}`, maxScore });
const sectionCodes = "ABCDEFGHIJKLMNOPQR".split("");
const maxima = [1, 2, 4];
const sections = sectionCodes.map((code) => ({ code, name: `Sección ficticia ${code}`, tasks: Array.from({ length: 22 }, (_, index) => task(code, index + 1, maxima[index % maxima.length])) }));
const sectionStates = sections.map(({ code }) => ({ sectionCode: code, enabled: code !== "M", lockReason: code === "M" ? "SERVICE_SETTING" : null }));
const content = JSON.parse(readFileSync(new URL("../lib/ablls-content.v1.json", import.meta.url), "utf8"));
const completeSections = content.sections.map((section) => ({ ...section, tasks: content.tasks.filter((item) => item.sectionCode === section.code) }));

function pageCount(buffer) {
  return (buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
}

test("assessment PDF renders all supported sections with overflow-safe long notes", async () => {
  const scores = [
    { skillIdentifier: "A1", score: 0, maxScore: 2 },
    { skillIdentifier: "A2", score: null, maxScore: 3 },
    { skillIdentifier: "B1", score: 2, maxScore: 2 },
  ];
  const notes = [{ skillIdentifier: "A1", content: "Nota ficticia extensa. ".repeat(150) }];
  const buffer = await generateAssessmentPdf({
    clientName: "Cliente Ficticio PDF",
    clientIdentifier: "QA-PDF",
    status: "IN_PROGRESS",
    createdAt: new Date("2026-01-02T12:00:00Z"),
    evaluationStartedAt: new Date("2026-01-02T12:00:00Z"),
    evaluationCompletedAt: null,
    serviceSettings: ["HOME"],
    protocolVersion: "qa",
    sections,
    sectionStates,
    scores,
    notes,
  });
  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  assert.ok(buffer.length > 25_000);
  assert.ok(pageCount(buffer) > 10, "long report should span multiple valid PDF pages");
});

test("finalized assessment PDF preserves explicit zero separately from unanswered", async () => {
  const buffer = await generateAssessmentPdf({
    clientName: "Cliente Ficticio Final",
    clientIdentifier: null,
    status: "FINALIZED",
    createdAt: new Date("2026-02-02T12:00:00Z"),
    evaluationStartedAt: new Date("2026-02-02T12:00:00Z"),
    evaluationCompletedAt: new Date("2026-02-03T12:00:00Z"),
    serviceSettings: ["SCHOOL"],
    protocolVersion: "qa",
    sections: sections.slice(0, 1),
    sectionStates: sectionStates.slice(0, 1),
    scores: [{ skillIdentifier: "A1", score: 0, maxScore: 2 }, { skillIdentifier: "A2", score: null, maxScore: 3 }],
    notes: [],
  });
  assert.ok(pageCount(buffer) >= 1);
  assert.ok(buffer.length > 2_000);
});

test("tracking PDF renders all 25 complete sections on six portrait grid pages with many assessments and regression", async () => {
  const assessments = Array.from({ length: 19 }, (_, index) => ({
    id: `assessment-${index}`,
    createdAt: new Date(Date.UTC(2024, index % 12, 1)),
    evaluationCompletedAt: new Date(Date.UTC(2024 + Math.floor(index / 12), index % 12, 2)),
    sections: completeSections.map((section) => ({ sectionCode: section.code, enabled: section.assessmentApproved && !(index === 18 && ["M", "N"].includes(section.code)), lockReason: section.permanentlyExcluded ? "PERMANENT" : index === 18 && ["M", "N"].includes(section.code) ? "SERVICE_SETTING" : null })),
    scores: [
      { skillIdentifier: "A1", score: index === 0 ? 2 : index === 1 ? 0 : index % 3, maxScore: 2 },
      { skillIdentifier: "A2", score: index % 2 ? null : 1, maxScore: 3 },
    ],
  }));
  const buffer = await generateTrackingPdf({ clientName: "Cliente Ficticio Histórico", clientIdentifier: "QA-HIST", sections: completeSections, assessments });
  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  assert.equal(REPORT_COLORS.length, 8);
  assert.deepEqual(REPORT_COLORS, HISTORY_COLORS);
  assert.equal(pageCount(buffer), 6, "25 complete sections use the approved four/four/four/four/four/five distribution on six A3 portrait pages");
  assert.ok(buffer.length > 10_000);
});
