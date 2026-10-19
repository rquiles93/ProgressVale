import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseScoringCriteria } from "../lib/scoring-criteria.ts";

const content = JSON.parse(readFileSync(new URL("../lib/ablls-content.v1.json", import.meta.url), "utf8"));

test("maps every verified scoring criterion only to its explicit score marker", () => {
  for (const task of content.tasks) {
    const parsed = parseScoringCriteria(task.scoringCriteria, task.validScores);
    assert.equal(parsed.fallback, null, task.id);
    assert.equal(parsed.byScore.size, task.maxScore === 1 ? 2 : task.maxScore, task.id);
    for (let score = 1; score <= task.maxScore; score += 1) assert.ok(parsed.byScore.has(score), `${task.id}: ${score}`);
    for (const [score, criterion] of parsed.byScore) {
      assert.ok(task.validScores.includes(score), `${task.id}: ${score}`);
      assert.ok(criterion.length > 0, `${task.id}: ${score}`);
    }
  }
});

test("leaves score zero blank unless the verified source explicitly defines it", () => {
  const withoutZero = parseScoringCriteria("2= always, 1= sometimes", [0, 1, 2]);
  assert.equal(withoutZero.byScore.has(0), false);
  const withZero = parseScoringCriteria("1= yes, 0= no", [0, 1]);
  assert.equal(withZero.byScore.get(0), "no");
});

test("preserves ambiguous or unsupported formats as an intact fallback", () => {
  const original = "Use professional judgment for this item.";
  const parsed = parseScoringCriteria(original, [0, 1, 2]);
  assert.equal(parsed.byScore.size, 0);
  assert.equal(parsed.fallback, original);
});
