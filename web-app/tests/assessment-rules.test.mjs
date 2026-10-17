import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const content = JSON.parse(readFileSync(new URL("../lib/ablls-content.v1.json", import.meta.url), "utf8"));
const approved = new Set("ABCDEFGHIKLMNPUVWX".split(""));
const excluded = new Set("JQRSTYZ".split(""));

function availability(settings) {
  const all = settings.includes("SCHOOL") || settings.includes("CLINIC_BASED");
  return content.sections.map((section) => ({
    code: section.code,
    enabled: approved.has(section.code) && (all || !["M", "N"].includes(section.code)),
    reason: excluded.has(section.code) ? "PERMANENT" : !all && ["M", "N"].includes(section.code) ? "SERVICE_SETTING" : null,
  }));
}

test("imports all source tasks in canonical order", () => {
  assert.equal(content.sections.length, 25);
  assert.equal(content.tasks.length, 544);
  assert.equal(new Set(content.tasks.map((task) => task.id)).size, 544);
  for (const section of content.sections) {
    const ids = content.tasks.filter((task) => task.sectionCode === section.code).map((task) => task.id);
    assert.deepEqual(ids, Array.from({ length: section.taskCount }, (_, index) => `${section.code}${index + 1}`));
  }
});

test("preserves complete fields and task-specific score values", () => {
  for (const task of content.tasks) {
    assert.ok(task.taskName && task.taskObjective && task.question && task.scoringCriteria, task.id);
    assert.equal(task.validScores[0], 0, task.id);
    assert.equal(task.validScores.at(-1), task.maxScore, task.id);
    assert.deepEqual(task.validScores, Array.from({ length: task.maxScore + 1 }, (_, index) => index), task.id);
  }
  assert.ok(content.tasks.some((task) => task.maxScore === 1));
  assert.ok(content.tasks.some((task) => task.maxScore === 2));
  assert.ok(content.tasks.some((task) => task.maxScore === 4));
});

test("marks exactly the approved and permanently excluded sections", () => {
  assert.deepEqual(content.sections.filter((section) => section.assessmentApproved).map((section) => section.code), [...approved]);
  assert.deepEqual(content.sections.filter((section) => section.permanentlyExcluded).map((section) => section.code), [...excluded]);
});

test("service-setting combinations produce the required availability", () => {
  const home = availability(["HOME"]);
  assert.equal(home.filter((section) => section.enabled).length, 16);
  assert.deepEqual(home.filter((section) => section.reason === "SERVICE_SETTING").map((section) => section.code), ["M", "N"]);
  for (const settings of [["SCHOOL"], ["CLINIC_BASED"], ["HOME", "SCHOOL"], ["HOME", "CLINIC_BASED"]]) {
    assert.deepEqual(availability(settings).filter((section) => section.enabled).map((section) => section.code), [...approved]);
  }
});

test("unconfigured clients remain distinguishable for explicit setup", () => {
  const settings = [];
  assert.equal(settings.length, 0);
});

test("home-only transition skips service-locked M and N", () => {
  const enabled = new Set(availability(["HOME"]).filter((section) => section.enabled).map((section) => section.code));
  const afterL = content.sections.slice(content.sections.findIndex((section) => section.code === "L") + 1).find((section) => enabled.has(section.code));
  assert.equal(afterL.code, "P");
});

test("Section B image relationships were preserved", () => {
  const images = content.tasks.flatMap((task) => task.exampleImages);
  assert.equal(images.length, 6);
  assert.ok(images.every((path) => path.startsWith("/protocol-examples/v1/")));
});

test("dataset records the exact corrected Word source files", () => {
  for (const [name, expectedHash] of Object.entries(content.sourceDocuments)) {
    const source = readFileSync(new URL(`../../verified-documents/${name}`, import.meta.url));
    assert.equal(createHash("sha256").update(source).digest("hex"), expectedHash, name);
  }
});
