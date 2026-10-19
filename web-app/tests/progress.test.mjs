import assert from "node:assert/strict";
import test from "node:test";
import { comparableScoreChange, firstUnansweredTaskId, HISTORY_COLORS, isAnsweredScore, latestScoresBySkill } from "../lib/progress.ts";
import { buildTrackingGrid } from "../lib/tracking-grid.ts";

test("progress calculation keeps unanswered distinct from an explicit zero", async () => {
  const assessments = [
    { id: "one", status: "FINALIZED", evaluationCompletedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01"), scores: [{ skillIdentifier: "A1", score: 0, maxScore: 2 }, { skillIdentifier: "A2", score: null, maxScore: 2 }] },
    { id: "two", status: "FINALIZED", evaluationCompletedAt: new Date("2026-02-01"), createdAt: new Date("2026-02-01"), scores: [{ skillIdentifier: "A1", score: 1, maxScore: 2 }, { skillIdentifier: "A2", score: 0, maxScore: 2 }] },
  ];
  const latest = latestScoresBySkill(assessments);
  assert.equal(latest.get("A1").score, 1);
  assert.equal(latest.get("A2").score, 0);
  assert.deepEqual(comparableScoreChange(assessments), { comparable: 1, improved: 1, unchanged: 0, regressed: 0, netChange: 1 });
});

test("resume selects the first unanswered task and treats zero as answered", () => {
  const tasks = ["A1", "A2", "A3", "A4"];
  assert.equal(firstUnansweredTaskId(tasks, [{ skillIdentifier: "A1", score: 0 }, { skillIdentifier: "A3", score: 2 }]), "A2");
  assert.equal(firstUnansweredTaskId(tasks, tasks.map((skillIdentifier) => ({ skillIdentifier, score: 0 }))), "A4");
  assert.equal(firstUnansweredTaskId([], []), null);
});

test("tracking state distinguishes explicit zero, unanswered, and stable color order", () => {
  assert.equal(isAnsweredScore(0), true);
  assert.equal(isAnsweredScore(null), false);
  assert.equal(isAnsweredScore(undefined), false);
  assert.equal(HISTORY_COLORS[0], "#365F4A");
  assert.equal(new Set(HISTORY_COLORS).size, HISTORY_COLORS.length);
});

test("regression is preserved rather than converted into cumulative achievement", () => {
  const assessments = [
    { id: "one", status: "FINALIZED", evaluationCompletedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01"), scores: [{ skillIdentifier: "A1", score: 2, maxScore: 2 }, { skillIdentifier: "A2", score: 1, maxScore: 2 }] },
    { id: "two", status: "FINALIZED", evaluationCompletedAt: new Date("2026-02-01"), createdAt: new Date("2026-02-01"), scores: [{ skillIdentifier: "A1", score: 0, maxScore: 2 }, { skillIdentifier: "A2", score: 2, maxScore: 2 }] },
  ];
  assert.deepEqual(comparableScoreChange(assessments), { comparable: 2, improved: 1, unchanged: 0, regressed: 1, netChange: -1 });
});

test("historical observations retain improvement, unchanged, decrease, unanswered, and explicit zero", () => {
  const section = [{ code: "A", name: "QA", tasks: [{ id: "A1", sectionCode: "A", taskName: "QA", maxScore: 4 }] }];
  const record = (id, score, day) => ({ id, status: "FINALIZED", trackingColor: id === "first" ? "#C67A5A" : "#B04A6F", createdAt: new Date(`2026-01-${day}T00:00:00Z`), evaluationCompletedAt: new Date(`2026-01-${day}T00:00:00Z`), sections: [{ sectionCode: "A", enabled: true }], scores: score === undefined ? [] : [{ skillIdentifier: "A1", score, maxScore: 4 }] });
  const rowFor = (first, second) => buildTrackingGrid(section, [record("first", first, "01"), record("second", second, "02")]).sections[0].rowsTopToBottom[0];

  assert.deepEqual(rowFor(2, 4).boxes.map((box) => box?.assessmentIndex), [0, 0, 1, 1]);
  assert.deepEqual(rowFor(2, 2).boxes.map((box) => box?.assessmentIndex ?? null), [0, 0, null, null]);
  const decreased = rowFor(4, 2);
  assert.deepEqual(decreased.boxes.map((box) => box?.assessmentIndex), [0, 0, 0, 0]);
  assert.deepEqual(decreased.observations.map(({ assessmentIndex, score }) => [assessmentIndex, score]), [[0, 4], [1, 2]], "the later lower score remains individually retrievable");
  assert.deepEqual(rowFor(2, undefined).observations.map(({ score }) => score), [2]);
  const explicitZero = rowFor(undefined, 0);
  assert.deepEqual(explicitZero.observations.map(({ assessmentIndex, score }) => [assessmentIndex, score]), [[1, 0]]);
  assert.equal(explicitZero.latestScore, 0);
});
