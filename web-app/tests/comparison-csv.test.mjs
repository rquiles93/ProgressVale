import assert from "node:assert/strict";
import test from "node:test";
import { compareAssessments } from "../lib/assessment-comparison.ts";
import { assessmentCsv, csvCell } from "../lib/assessment-csv.ts";

const sections = (aEnabled = true) => [{ sectionCode: "A", enabled: aEnabled }];
const tasks = [
  { id: "A1", sectionCode: "A", taskName: "Uno", maxScore: 2 },
  { id: "A2", sectionCode: "A", taskName: "Dos", maxScore: 2 },
  { id: "A3", sectionCode: "A", taskName: "Tres", maxScore: 2 },
  { id: "A4", sectionCode: "A", taskName: "Cuatro", maxScore: 2 },
  { id: "B1", sectionCode: "B", taskName: "Cinco", maxScore: 4 },
];

test("comparison distinguishes improvement, regression, unchanged, unanswered, and locked", () => {
  const previous = { id: "one", sections: sections(), scores: [
    { skillIdentifier: "A1", score: 0, maxScore: 2 },
    { skillIdentifier: "A2", score: 2, maxScore: 2 },
    { skillIdentifier: "A3", score: 1, maxScore: 2 },
    { skillIdentifier: "A4", score: null, maxScore: 2 },
  ] };
  const current = { id: "two", sections: sections(), scores: [
    { skillIdentifier: "A1", score: 1, maxScore: 2 },
    { skillIdentifier: "A2", score: 1, maxScore: 2 },
    { skillIdentifier: "A3", score: 1, maxScore: 2 },
    { skillIdentifier: "A4", score: 0, maxScore: 2 },
  ] };
  const states = new Map(compareAssessments(previous, current, tasks).rows.map((row) => [row.task.id, row.state]));
  assert.equal(states.get("A1"), "improved");
  assert.equal(states.get("A2"), "regressed");
  assert.equal(states.get("A3"), "unchanged");
  assert.equal(states.get("A4"), "unanswered");
  assert.equal(compareAssessments({ ...previous, sections: sections(false) }, current, tasks).rows.find((row) => row.task.id === "A1").state, "locked");
});

test("comparison rejects changed maximum scores as incompatible", () => {
  const base = { id: "one", sections: sections(), scores: [{ skillIdentifier: "A1", score: 1, maxScore: 3 }] };
  const next = { id: "two", sections: sections(), scores: [{ skillIdentifier: "A1", score: 2, maxScore: 2 }] };
  assert.equal(compareAssessments(base, next, tasks).rows.find((row) => row.task.id === "A1").state, "incompatible");
});

test("CSV is UTF-8 BOM compatible, preserves blanks, locked state, and neutralizes formulas", () => {
  assert.equal(csvCell("=HYPERLINK(\"bad\")"), '"\'=HYPERLINK(""bad"")"');
  const csv = assessmentCsv({ status: "IN_PROGRESS", sections: sections(), scores: [{ skillIdentifier: "A1", score: 0, maxScore: 2 }], notes: [{ skillIdentifier: "A1", content: "+SUM(1,1)" }] }, tasks);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"A1"[^\r\n]*,"0","2","Respondida","'\+SUM\(1,1\)"/);
  assert.match(csv, /"A2"[^\r\n]*,"","2","Sin responder"/);
  assert.match(csv, /"B1"[^\r\n]*,"","4","Bloqueada"/);
});
