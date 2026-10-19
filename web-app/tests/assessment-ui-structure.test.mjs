import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../components/assessment.tsx", import.meta.url), "utf8");
const summary = source.slice(source.indexOf("function Summary"), source.indexOf("function Transition"));
const transition = source.slice(source.indexOf("function Transition"), source.indexOf("function Stat"));
const assessmentComponent = source.slice(source.indexOf("export function Assessment"), source.indexOf("function Sidebar"));

test("summary places the localized client navigation above the section list", () => {
  assert.equal((summary.match(/labels\.backClient/g) ?? []).length, 1);
  assert.ok(summary.indexOf("labels.backClient") < summary.indexOf("sections.map"));
  assert.ok(summary.indexOf("sections.map") < summary.indexOf("finalizeAssessmentAction"));
});

test("summary finalization remains behind explicit confirmation", () => {
  assert.ok(summary.includes("setConfirming(true)"));
  assert.ok(summary.includes("role=\"alertdialog\""));
  assert.ok(summary.includes("<button className=\"focus-ring rounded-xl bg-rust"));
});

test("section transition keeps localized messaging and explicit next-section navigation", () => {
  assert.ok(transition.includes("copy[language]"));
  assert.ok(transition.includes("labels.sectionCompleted"));
  assert.ok(transition.includes("labels.nextSection"));
  assert.ok(transition.includes("target.href"));
});

test("summary close restores the current task with replace while questionnaire close exits to the client", () => {
  assert.ok(assessmentComponent.includes("assessmentSummaryHref(assessment.id, task.id)"));
  assert.ok(assessmentComponent.includes("view === \"summary\" ? navigate(assessmentTaskHref(assessment.id, task.id), true) : navigate(`/clientes/${assessment.clientId}`)"));
  assert.ok(assessmentComponent.includes("if (dirty && !window.confirm(labels.discard)) return"));
  assert.ok(assessmentComponent.includes("if (replace) router.replace(href); else router.push(href)"));
  assert.ok(assessmentComponent.includes("view === \"summary\" ? labels.closeSummary : labels.exit"));
});
