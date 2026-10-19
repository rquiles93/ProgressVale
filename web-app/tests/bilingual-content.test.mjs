import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const english = JSON.parse(readFileSync(new URL("../lib/ablls-content.v1.json", import.meta.url), "utf8"));
const spanish = JSON.parse(readFileSync(new URL("../lib/ablls-content.es.v1.json", import.meta.url), "utf8"));
const examples = JSON.parse(readFileSync(new URL("../lib/simple-examples.v1.json", import.meta.url), "utf8"));
const approved = new Set("ABCDEFGHIKLMNPUVWX".split(""));
const fields = ["taskName", "taskObjective", "question", "examples", "scoringCriteria", "protocolNotes"];
const assessable = english.tasks.filter((task) => approved.has(task.sectionCode));

const numericTokens = (value) => (value.match(/\d+(?:\.\d+)?%?/g) ?? []).map((token) => token.replace("%", ""));
const scoreMarkers = (value) => [...value.matchAll(/(?<!\d)([0-4])\s*=/g)].map((match) => Number(match[1]));

test("Spanish layer covers exactly the 403 assessable tasks and all nonempty fields", () => {
  assert.equal(assessable.length, 403);
  assert.deepEqual(Object.keys(spanish.tasks), assessable.map((task) => task.id));
  assert.equal(new Set(Object.keys(spanish.tasks)).size, 403);
  assert.deepEqual(Object.keys(spanish.sections), english.sections.filter((section) => approved.has(section.code)).map((section) => section.code));
  for (const task of assessable) {
    const translated = spanish.tasks[task.id];
    assert.ok(translated, task.id);
    for (const field of fields) {
      assert.equal(Boolean(translated[field]), Boolean(task[field]), `${task.id}.${field}`);
      assert.doesNotMatch(translated[field], /PENDING|TODO|TRANSLATION REQUIRED|TRADUCCI[ÓO]N PENDIENTE/, `${task.id}.${field}`);
    }
  }
});

test("Spanish scoring criteria preserve score levels and every numeric token", () => {
  for (const task of assessable) {
    const translated = spanish.tasks[task.id];
    assert.deepEqual(scoreMarkers(translated.scoringCriteria), scoreMarkers(task.scoringCriteria), `${task.id} score markers`);
    assert.deepEqual(numericTokens(translated.scoringCriteria), numericTokens(task.scoringCriteria), `${task.id} numeric requirements`);
    assert.equal(scoreMarkers(translated.scoringCriteria).includes(0), scoreMarkers(task.scoringCriteria).includes(0), `${task.id} score zero`);
  }
  assert.deepEqual(new Set(assessable.map((task) => task.maxScore)), new Set([2, 4]));
  assert.deepEqual(new Set(english.tasks.map((task) => task.maxScore)), new Set([1, 2, 4]));
});

test("approved bilingual simple examples align one-to-one by task code", () => {
  assert.deepEqual(Object.keys(examples.examples), assessable.map((task) => task.id));
  assert.equal(Object.keys(examples.examples).length, 403);
  for (const task of assessable) {
    assert.ok(examples.examples[task.id].en.trim(), `${task.id}.en`);
    assert.ok(examples.examples[task.id].es.trim(), `${task.id}.es`);
  }
});
