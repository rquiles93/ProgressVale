import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const assessment = read("../components/assessment.tsx");
const clientDialog = read("../components/client-form-dialog.tsx");
const assessmentDialog = read("../components/client-detail-actions.tsx");
const helpPopover = read("../components/help-popover.tsx");
const globalStyles = read("../app/globals.css");

test("mobile dialogs keep their full content reachable inside the viewport", () => {
  for (const source of [clientDialog, assessmentDialog]) {
    assert.match(source, /max-h-\[calc\(100dvh-2rem\)\]/);
    assert.match(source, /overflow-y-auto/);
    assert.match(source, /overscroll-contain/);
  }
});

test("the questionnaire header uses compact language labels on phones and portrait tablets", () => {
  assert.match(assessment, /<span className="language-label-short">\{language\}<\/span>/);
  assert.match(assessment, /<span className="language-label-full">/);
  assert.match(globalStyles, /@media \(min-width: 640px\)[\s\S]*\.language-label-short \{ display: none; \}[\s\S]*\.language-label-full \{ display: inline; \}/);
  assert.match(globalStyles, /@media \(min-width: 768px\) and \(max-width: 1023px\) and \(orientation: portrait\)[\s\S]*\.language-label-short \{ display: inline; \}[\s\S]*\.language-label-full \{ display: none; \}/);
  assert.match(assessment, /aria-label=\{`\$\{labels\.language\}:/);
});

test("left-aligned help content stays centered on narrow screens", () => {
  assert.match(helpPopover, /left-1\/2 -translate-x-1\/2 sm:left-0 sm:translate-x-0/);
  assert.match(helpPopover, /align === "right" \? "right-0"/);
});

test("mobile scoring uses one selector and ties the criterion directly to the selected score", () => {
  assert.match(assessment, /scoring-mobile grid gap-4 min-\[520px\]:grid-cols-\[minmax\(200px,0\.85fr\)_minmax\(0,1\.15fr\)\]/);
  assert.match(assessment, /onClick=\{\(\) => onScore\(value\)\}/);
  assert.match(assessment, /const selectedCriterion = score === null \? null : parsed\.byScore\.get\(score\)/);
  assert.match(assessment, /Select a score to view its criterion\./);
  assert.doesNotMatch(assessment, /viewedScore|setViewedScore|Review criteria|Reviewing does not change/);
  assert.match(assessment, /size-11/);
  assert.match(assessment, /scoring-desktop overflow-x-auto pb-1/);
  assert.match(globalStyles, /@media \(min-width: 768px\) and \(min-height: 500px\)/);
  assert.match(globalStyles, /@media \(max-height: 499px\)[\s\S]*header\.sticky \{ position: relative; \}/);
});

test("mobile questionnaire navigation uses two full-width tap targets", () => {
  assert.match(assessment, /mt-6 grid grid-cols-2 gap-3 sm:flex/);
  assert.ok((assessment.match(/min-h-12 w-full/g) ?? []).length >= 3);
  assert.match(assessment, /hidden text-\[11px\] text-ink\/40 sm:block/);
});
