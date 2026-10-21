import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { generateAssessmentPdf, generateTrackingPdf, REPORT_COLORS, TRACKING_PDF_FULL_PAGE, trackingInformationRows, trackingPdfPageGeometry, trackingPdfSectionPresentation, trackingPdfTaskLabel } from "../lib/pdf-reports.ts";
import { HISTORY_COLORS } from "../lib/progress.ts";
import { TRACKING_EXCLUDED_SECTION_HEADER_COLOR, TRACKING_SECTION_HEADER_COLOR } from "../lib/assessment-colors.ts";

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

function pageSizes(buffer) {
  return [...buffer.toString("latin1").matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/g)].map((match) => [Number(match[1]), Number(match[2])]);
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
  const assessments = Array.from({ length: 30 }, (_, index) => ({
    id: `assessment-${index}`,
    trackingColor: index === 29 ? "#B04A6F" : null,
    createdAt: new Date(Date.UTC(2024, index % 12, 1)),
    evaluationCompletedAt: new Date(Date.UTC(2024 + Math.floor(index / 12), index % 12, 2)),
    sections: completeSections.map((section) => ({ sectionCode: section.code, enabled: section.assessmentApproved && !(index === 29 && ["M", "N"].includes(section.code)), lockReason: section.permanentlyExcluded ? "PERMANENT" : index === 29 && ["M", "N"].includes(section.code) ? "SERVICE_SETTING" : null })),
    scores: [
      { skillIdentifier: "A1", score: index === 0 ? 2 : index === 1 ? 0 : index % 3, maxScore: 2 },
      { skillIdentifier: "A2", score: index % 2 ? null : 1, maxScore: 3 },
    ],
  }));
  const buffer = await generateTrackingPdf({ clientName: "Cliente Ficticio Histórico", clientIdentifier: "QA-HIST", sections: completeSections, assessments });
  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  assert.equal(REPORT_COLORS.length, 8);
  assert.deepEqual(REPORT_COLORS, HISTORY_COLORS);
  assert.equal(TRACKING_SECTION_HEADER_COLOR, "#365F4A");
  assert.notEqual(TRACKING_EXCLUDED_SECTION_HEADER_COLOR, assessments.at(-1).trackingColor);
  assert.equal(pageCount(buffer), 6, "25 complete sections use the approved four/four/four/four/four/five distribution on six A3 portrait pages");
  assert.deepEqual(pageSizes(buffer).map(([width, height]) => [Number(width.toFixed(2)), Number(height.toFixed(2))]), [[841.89,1190.55],[841.89,1048.44],[841.89,781.98],[841.89,560],[841.89,684],[841.89,710.92]]);
  assert.ok(buffer.length > 10_000);
});

test("tracking PDF standardizes labels and neutralizes blocked and excluded sections", () => {
  for (const id of ["A1", "A19", "B1", "B27", "M1", "N10", "Q14"]) assert.equal(trackingPdfTaskLabel(id), id);
  const regular = trackingPdfSectionPresentation("available");
  const blocked = trackingPdfSectionPresentation("locked");
  const excluded = trackingPdfSectionPresentation("excluded");
  assert.deepEqual(blocked, excluded, "client-settings-blocked and permanently excluded sections must render identically");
  assert.equal(regular.headerColor, TRACKING_SECTION_HEADER_COLOR);
  assert.equal(regular.showScoreColors, true);
  assert.equal(blocked.headerColor, TRACKING_EXCLUDED_SECTION_HEADER_COLOR);
  assert.equal(blocked.showScoreColors, false);
});

test("tracking information box uses the latest four evaluations in chronological order with matching colors", () => {
  const assessments = Array.from({ length: 6 }, (_, index) => ({
    id: `info-${index + 1}`,
    status: "FINALIZED",
    trackingColor: `#00000${index + 1}`,
    createdAt: new Date(Date.UTC(2026, 0, index + 1)),
    evaluationCompletedAt: new Date(Date.UTC(2026, 1, index + 1)),
    sections: [], scores: [],
  }));
  assert.deepEqual(trackingInformationRows({ assessments }).map((row) => [row.assessmentId, row.date.toISOString(), row.color]), [
    ["info-3", "2026-02-03T00:00:00.000Z", "#000003"],
    ["info-4", "2026-02-04T00:00:00.000Z", "#000004"],
    ["info-5", "2026-02-05T00:00:00.000Z", "#000005"],
    ["info-6", "2026-02-06T00:00:00.000Z", "#000006"],
  ]);
  assert.equal(trackingInformationRows({ assessments: assessments.slice(0, 2) }).length, 2);
});

test("first tracking page starts Section C beside the information box while all grids share the bottom baseline", () => {
  const taskCounts = [19, 27, 57, 27];
  const geometry = trackingPdfPageGeometry(0, taskCounts);
  assert.equal(geometry.pageHeight, TRACKING_PDF_FULL_PAGE.height);
  assert.equal(geometry.gridBottom - geometry.rowHeight * Math.max(...taskCounts), 96);
  for (const count of taskCounts) assert.equal((geometry.gridBottom - geometry.rowHeight * count) + geometry.rowHeight * count, geometry.gridBottom);
});

test("pages 2 through 6 calculate shorter media boxes while preserving row geometry and metadata clearance", () => {
  const pageOne = trackingPdfPageGeometry(0, [19, 27, 57, 27]);
  const pageTaskCounts = [[20, 29, 47, 49], [9, 20, 15, 34], [12, 10, 6, 17], [29, 10, 7, 15], [10, 7, 10, 30, 28]];
  const expectedHeights = [1048.438, 781.977, 560, 684, 710.921];
  for (let pageIndex = 1; pageIndex < 6; pageIndex += 1) {
    const counts = pageTaskCounts[pageIndex - 1];
    const geometry = trackingPdfPageGeometry(pageIndex, counts);
    assert.ok(Math.abs(geometry.pageHeight - expectedHeights[pageIndex - 1]) < 0.01);
    assert.ok(geometry.pageHeight < TRACKING_PDF_FULL_PAGE.height);
    assert.equal(geometry.rowHeight, [1, 2, 5].includes(pageIndex) ? pageOne.rowHeight : 14);
    const tallestTop = geometry.gridBottom - geometry.rowHeight * Math.max(...counts);
    assert.ok(tallestTop >= geometry.gridStart, `page ${pageIndex + 1} must preserve metadata clearance`);
  }
});
