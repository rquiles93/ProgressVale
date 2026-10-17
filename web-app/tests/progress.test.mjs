import assert from "node:assert/strict";
import test from "node:test";
import { comparableScoreChange, firstUnansweredTaskId, HISTORY_COLORS, isAnsweredScore, latestScoresBySkill } from "../lib/progress.ts";

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
