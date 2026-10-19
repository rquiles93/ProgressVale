import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assessmentColor, buildTrackingGrid, verifyTrackingGrid } from "../lib/tracking-grid.ts";
import { generateTrackingXlsx } from "../lib/tracking-xlsx.ts";
import { ASSESSMENT_COLOR_PALETTE, availableAssessmentColors, TRACKING_EXCLUDED_SECTION_HEADER_COLOR } from "../lib/assessment-colors.ts";
import ExcelJS from "exceljs";

const tasks = [1, 2, 4].map((maxScore, index) => ({ id: `A${index + 1}`, sectionCode: "A", taskName: `Tarea ${index + 1}`, maxScore }));
const sections = [{ code: "A", name: "Sección A", tasks }];
const content = JSON.parse(readFileSync(new URL("../lib/ablls-content.v1.json", import.meta.url), "utf8"));
const reportSections = content.sections.map((section) => ({ ...section, tasks: content.tasks.filter((task) => task.sectionCode === section.code) }));
const assessment = (index, values, enabled = true) => ({ id: `assessment-${index}`, createdAt: new Date(Date.UTC(2026, 0, index + 1)), evaluationCompletedAt: new Date(Date.UTC(2026, 0, index + 1)), sections: [{ sectionCode: "A", enabled }], scores: values.map((score, taskIndex) => ({ skillIdentifier: `A${taskIndex + 1}`, score, maxScore: tasks[taskIndex].maxScore })) });

test("grid geometry uses verified maximums, equal total widths, and bottom-to-top task order", () => {
  const model = buildTrackingGrid(sections, [assessment(0, [1, 2, 4])]);
  const report = verifyTrackingGrid(sections, model);
  assert.equal(report.valid, true, report.errors.join("\n"));
  assert.deepEqual(model.sections[0].rowsTopToBottom.map((row) => row.task.id), ["A3", "A2", "A1"]);
  assert.deepEqual(model.sections[0].rowsTopToBottom.map((row) => row.boxes.length), [4, 2, 1]);
  assert.ok(model.sections[0].rowsTopToBottom.every((row) => row.boxSpan * row.boxes.length === 4));
});

test("cumulative colors cover acquisition, unchanged, regression, reacquisition, zero, null, and locks", () => {
  const cases = [
    { values: [[2], [4]], colors: [0, 0, 1, 1], regressions: 0 },
    { values: [[4], [4]], colors: [0, 0, 0, 0], regressions: 0 },
    { values: [[4], [2]], colors: [0, 0, 0, 0], regressions: 1 },
    { values: [[4], [2], [3]], colors: [0, 0, 0, 0], regressions: 1 },
    { values: [[2], [0]], colors: [0, 0, null, null], regressions: 1 },
    { values: [[0], [2]], colors: [1, 1, null, null], regressions: 0 },
    { values: [[null], [2]], colors: [1, 1, null, null], regressions: 0 },
    { values: [[2], [null]], colors: [0, 0, null, null], regressions: 0 },
  ];
  for (const item of cases) {
    const assessments = item.values.map((values, index) => assessment(index, [null, null, values[0]]));
    const row = buildTrackingGrid(sections, assessments).sections[0].rowsTopToBottom[0];
    assert.deepEqual(row.boxes.map((box) => box?.assessmentIndex ?? null), item.colors);
    assert.equal(row.regressions.length, item.regressions);
  }
  const locked = buildTrackingGrid(sections, [assessment(0, [1, 0, null], false)]).sections[0].rowsTopToBottom[0];
  assert.equal(locked.latestStatus, "locked");
});

test("assessment ordering and colors are stable and unique for large histories", () => {
  const colors = Array.from({ length: 40 }, (_, index) => assessmentColor(index));
  assert.equal(new Set(colors).size, colors.length);
  for (const count of [1, 2, 5, 10, 20]) {
    const earlier = Array.from({ length: count }, (_, index) => assessmentColor(index));
    const extended = Array.from({ length: count + 1 }, (_, index) => assessmentColor(index));
    assert.deepEqual(extended.slice(0, count), earlier, `${count} historical colors must not change when a later assessment is added`);
    assert.equal(new Set(earlier).size, earlier.length, `${count} assessments must not receive duplicate colors`);
  }
  const model = buildTrackingGrid(sections, [assessment(2, [1, 1, 1]), assessment(0, [1, 1, 1]), assessment(1, [1, 1, 1])]);
  assert.deepEqual(model.legend.map((item) => item.assessment.id), ["assessment-0", "assessment-1", "assessment-2"]);
});

test("the selectable five-color palette is client-scoped and excludes the application sage", () => {
  assert.equal(ASSESSMENT_COLOR_PALETTE.length, 5);
  assert.equal(new Set(ASSESSMENT_COLOR_PALETTE.map((item) => item.value)).size, 5);
  assert.equal(ASSESSMENT_COLOR_PALETTE.some((item) => item.value === "#365F4A"), false);
  for (let used = 0; used <= 5; used += 1) assert.equal(availableAssessmentColors(ASSESSMENT_COLOR_PALETTE.slice(0, used).map((item) => item.value)).length, 5 - used);
  assert.equal(availableAssessmentColors([ASSESSMENT_COLOR_PALETTE[0].value]).length, 4);
  assert.equal(availableAssessmentColors([]).length, 5, "another client receives an independent palette");
});

test("persisted assessment colors override legacy positional colors without changing chronology", () => {
  const first = { ...assessment(0, [1, 1, 1]), trackingColor: "#B04A6F" };
  const second = { ...assessment(1, [1, 1, 2]), trackingColor: "#557A95" };
  const model = buildTrackingGrid(sections, [second, first]);
  assert.deepEqual(model.legend.map((item) => [item.assessment.id, item.color]), [[first.id, "#B04A6F"], [second.id, "#557A95"]]);
  assert.equal(model.sections[0].rowsTopToBottom[0].boxes[0].color, "#B04A6F");
  assert.equal(model.sections[0].rowsTopToBottom[0].boxes[1].color, "#557A95");
});

test("in-progress assessment is ordered last and labeled provisional without changing acquisition logic", () => {
  const finalized = { ...assessment(0, [1, 1, 2]), id: "finalized", status: "FINALIZED", createdAt: new Date("2026-02-01T00:00:00Z"), evaluationCompletedAt: new Date("2026-02-02T00:00:00Z") };
  const provisional = { ...assessment(1, [1, 1, 4]), id: "active", status: "IN_PROGRESS", createdAt: new Date("2026-01-01T00:00:00Z"), evaluationCompletedAt: null };
  const model = buildTrackingGrid(sections, [provisional, finalized]);
  assert.deepEqual(model.legend.map((item) => [item.assessment.id, item.provisional]), [["finalized", false], ["active", true]]);
  assert.deepEqual(model.sections[0].rowsTopToBottom[0].boxes.map((box) => box?.assessmentIndex), [0, 0, 1, 1]);
});

test("verified dataset reconstructs all 25 sections and 544 tasks exactly once", () => {
  const model = buildTrackingGrid(reportSections, []);
  const report = verifyTrackingGrid(reportSections, model);
  assert.equal(report.valid, true, report.errors.join("\n"));
  assert.equal(report.sections.length, 25);
  assert.equal(report.sections.reduce((total, section) => total + section.taskCount, 0), 544);
  assert.deepEqual(report.sections.map((section) => [section.section, section.taskCount]), [["A",19],["B",27],["C",57],["D",27],["E",20],["F",29],["G",47],["H",49],["I",9],["J",20],["K",15],["L",34],["M",12],["N",10],["P",6],["Q",17],["R",29],["S",10],["T",7],["U",15],["V",10],["W",7],["X",10],["Y",30],["Z",28]]);
  assert.deepEqual(model.sections.filter((section) => section.permanentlyExcluded).map((section) => section.code), ["J", "Q", "R", "S", "T", "Y", "Z"]);
  assert.equal(new Set(model.sections.flatMap((section) => section.rowsTopToBottom.map((row) => row.task.id))).size, 544);
});

test("XLSX export contains five real-cell grid sheets with fills and merged variable-width boxes", async () => {
  const assessmentRecord = { id: "xlsx-qa-1", createdAt: new Date("2026-01-01T00:00:00Z"), evaluationCompletedAt: new Date("2026-01-02T00:00:00Z"), sections: reportSections.map((section) => ({ sectionCode: section.code, enabled: section.assessmentApproved, lockReason: section.permanentlyExcluded ? "PERMANENT" : null })), scores: reportSections.filter((section) => section.assessmentApproved).flatMap((section) => section.tasks.map((task) => ({ skillIdentifier: task.id, score: task.maxScore, maxScore: task.maxScore }))) };
  const buffer = await generateTrackingXlsx({ clientName: "Cliente XLSX ficticio", clientIdentifier: "QA-XLSX", sections: reportSections, assessments: [assessmentRecord] });
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer);
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Rejilla 1", "Rejilla 2", "Rejilla 3", "Rejilla 4", "Rejilla 5"]);
  assert.equal(workbook.getWorksheet("Rejilla 1").getCell("B62").value, "A · Cooperation and Reinforcer Effectiveness");
  assert.equal(workbook.getWorksheet("Rejilla 1").getCell("B62").fill.fgColor.argb, "FF365F4A", "regular section headers use institutional green");
  assert.equal(workbook.getWorksheet("Rejilla 2").getCell("B54").value, "F · Requests");
  assert.equal(workbook.getWorksheet("Rejilla 3").getCell("B39").value, "K · Play and Leisure Skills");
  assert.equal(workbook.getWorksheet("Rejilla 4").getCell("B34").value, "Q · Reading Skills");
  assert.equal(workbook.getWorksheet("Rejilla 5").getCell("B35").value, "V · Eating Skills");
  assert.equal(workbook.getWorksheet("Rejilla 1").getRow(62).height, 36);
  assert.ok(workbook.getWorksheet("Rejilla 1").getCell("B62").font.size < 10, "the longest section name must shrink to fit");
  assert.equal(workbook.getWorksheet("Rejilla 2").getCell("B54").font.size, 10, "short section names retain the standard font size");
  assert.ok(workbook.getWorksheet("Rejilla 1").model.merges.includes("B62:E62"), "headers must align to the narrower scoring area");
  assert.equal(workbook.getWorksheet("Rejilla 1").getCell("A3").value, "#1");
  assert.ok(workbook.getWorksheet("Rejilla 1").getCell("B3").fill.fgColor.argb);
  assert.match(String(workbook.getWorksheet("Rejilla 1").getCell("C3").value), /2 ene 2026/);
  assert.equal(workbook.getWorksheet("Rejilla 1").getCell("A61").value.startsWith("A1"), true, "task 1 must share the bottom baseline");
  assert.ok(workbook.getWorksheet("Rejilla 1").model.merges.length > 3, "1- and 2-point task boxes should use merged cells");
});

test("XLSX export preserves every verified task, geometry, legend, print setup, and safe values", async () => {
  const assessments = Array.from({ length: 20 }, (_, assessmentIndex) => ({
    id: `history-${String(assessmentIndex + 1).padStart(2, "0")}`,
    createdAt: new Date(Date.UTC(2025, assessmentIndex, 1)),
    evaluationCompletedAt: new Date(Date.UTC(2025, assessmentIndex, 2)),
    sections: reportSections.map((section) => ({ sectionCode: section.code, enabled: section.assessmentApproved && !(assessmentIndex === 19 && ["M", "N"].includes(section.code)), lockReason: section.permanentlyExcluded ? "PERMANENT" : assessmentIndex === 19 && ["M", "N"].includes(section.code) ? "SERVICE_SETTING" : null })),
    scores: reportSections.filter((section) => section.assessmentApproved).flatMap((section) => section.tasks.map((task, taskIndex) => ({
      skillIdentifier: task.id,
      score: taskIndex % 17 === 0 ? null : assessmentIndex === 1 && taskIndex % 11 === 0 ? 0 : Math.min(task.maxScore, (assessmentIndex + taskIndex) % (task.maxScore + 1)),
      maxScore: task.maxScore,
    }))),
  }));
  const report = { clientName: "=Cliente ficticio de nombre muy largo para validar seguridad y presentación", clientIdentifier: "QA-20", sections: reportSections, assessments };
  const expectedModel = buildTrackingGrid(reportSections, assessments);
  const buffer = await generateTrackingXlsx(report);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer);
  const actualTaskIds = [];
  const seenMerges = new Set();

  workbook.worksheets.forEach((sheet, pageIndex) => {
    assert.equal(sheet.pageSetup.orientation, "landscape");
    assert.equal(sheet.pageSetup.fitToWidth, 1);
    assert.equal(sheet.pageSetup.fitToHeight, 1);
    assert.ok(sheet.pageSetup.printArea);
    assert.equal(sheet.getCell("A1").value.startsWith("Skills Tracking - "), true, "client text must remain a value, not a formula");
    assert.equal(sheet.getCell("A1").type, ExcelJS.ValueType.String);
    assert.equal(sheet.getCell("A1").formula, undefined);
    assert.equal(sheet.views[0].state, "frozen");

    const pageSections = expectedModel.sections.slice(pageIndex * 5, (pageIndex + 1) * 5);
    const firstGridRow = expectedModel.legend.length + 4;
    const maxRows = Math.max(...pageSections.map((section) => section.rowsTopToBottom.length));
    const gridBottomRow = firstGridRow + maxRows - 1;
    const headerRow = gridBottomRow + 1;
    pageSections.forEach((section, sectionIndex) => {
      const start = sectionIndex * 6 + 1;
      const unavailable = section.latestSectionStatus !== "available";
      assert.equal(sheet.getCell(headerRow, start + 1).value, `${section.code} · ${section.name}`);
      assert.equal(sheet.getCell(headerRow, start + 1).fill.fgColor.argb, argbForTest(unavailable ? TRACKING_EXCLUDED_SECTION_HEADER_COLOR : "#365F4A"));
      assert.ok(sheet.getCell(headerRow, start + 1).font.size <= 10 && sheet.getCell(headerRow, start + 1).font.size >= 6, `${section.code} header font must stay within the deterministic fitting range`);
      assert.ok(sheet.model.merges.includes(`${sheet.getCell(headerRow, start + 1).address}:${sheet.getCell(headerRow, start + 4).address}`), `${section.code} header must occupy only its scoring area`);
      for (let column = start; column <= start + 4; column += 1) assert.equal(sheet.getCell(headerRow, column).protection?.locked ?? true, true, `${section.code} header must be protected`);
      const firstTaskRow = gridBottomRow - section.rowsTopToBottom.length + 1;
      section.rowsTopToBottom.forEach((row, rowIndex) => {
        const excelRow = firstTaskRow + rowIndex;
        const label = String(sheet.getCell(excelRow, start).value);
        assert.equal(label, `${row.task.id} -`, `${row.task.id} must use the standard task-label format`);
        assert.equal(sheet.getCell(excelRow, start).protection?.locked ?? true, unavailable, `${row.task.id} label protection must match availability`);
        actualTaskIds.push(row.task.id);
        assert.equal(sheet.getRow(excelRow).height, 12);
        const span = 4 / row.task.maxScore;
        row.boxes.forEach((box, boxIndex) => {
          const from = start + 1 + boxIndex * span;
          const to = from + span - 1;
          const cell = sheet.getCell(excelRow, from);
          assert.ok(cell.fill?.fgColor?.argb, `${row.task.id} level ${boxIndex + 1} must have a fill`);
          assert.equal(cell.border.left?.style, "thin", `${row.task.id} level ${boxIndex + 1} must retain its left border`);
          assert.equal(cell.border.right?.style, "thin", `${row.task.id} level ${boxIndex + 1} must retain its right border`);
          assert.equal(cell.border.top?.style, "thin", `${row.task.id} level ${boxIndex + 1} must retain its top border`);
          assert.equal(cell.border.bottom?.style, "thin", `${row.task.id} level ${boxIndex + 1} must retain its bottom border`);
          if (unavailable) assert.equal(cell.fill.fgColor.argb.replace(/^FF/, ""), "F8F4EC", `${row.task.id} unavailable score cells must use the neutral grid fill`);
          assert.equal(cell.formula, undefined);
          assert.equal(cell.protection?.locked ?? true, unavailable, `${row.task.id} protection must match availability`);
          if (to > from) {
            const range = `${sheet.getCell(excelRow, from).address}:${sheet.getCell(excelRow, to).address}`;
            assert.ok(sheet.model.merges.includes(range), `${row.task.id} must merge ${range}`);
          }
        });
      });
      assert.ok(String(sheet.getCell(gridBottomRow, start).value).startsWith(`${section.code}1`), `${section.code}1 must be on the shared bottom baseline`);
    });
    assert.ok(sheet.sheetProtection, `${sheet.name} must carry sheet protection`);
    assert.equal(sheet.sheetProtection.formatCells ?? false, false, `${sheet.name} must prevent formatting changes to protected excluded cells`);
    for (const merge of sheet.model.merges) {
      assert.equal(seenMerges.has(`${sheet.name}!${merge}`), false, `duplicate merge ${merge}`);
      seenMerges.add(`${sheet.name}!${merge}`);
    }
  });

  const expectedTaskIds = reportSections.flatMap((section) => [...section.tasks].reverse().map((task) => task.id));
  assert.deepEqual(actualTaskIds, expectedTaskIds);
  assert.equal(actualTaskIds.length, 544);
  assert.equal(new Set(actualTaskIds).size, 544);
  for (const excluded of ["J", "Q", "R", "S", "T", "Y", "Z"]) {
    const section = expectedModel.sections.find((item) => item.code === excluded);
    assert.ok(section.rowsTopToBottom.every((row) => row.latestStatus === "excluded" && row.boxes.every((box) => box === null)), `${excluded} must remain complete and uncolored`);
  }
  const expectedFaded = argbForTest(TRACKING_EXCLUDED_SECTION_HEADER_COLOR);
  assert.equal(workbook.getWorksheet("Rejilla 4").getCell(`B${expectedModel.legend.length + 4 + 29}`).fill.fgColor.argb, expectedFaded);
  const blockedM = expectedModel.sections.find((section) => section.code === "M");
  const blockedMPage = workbook.getWorksheet("Rejilla 3");
  const blockedMHeaderRow = expectedModel.legend.length + 4 + Math.max(...expectedModel.sections.slice(10, 15).map((section) => section.rowsTopToBottom.length));
  assert.equal(blockedM.latestSectionStatus, "locked");
  assert.equal(blockedMPage.getCell(`N${blockedMHeaderRow}`).value, "M · Group Instruction");
  assert.equal(blockedMPage.getCell(`N${blockedMHeaderRow}`).fill.fgColor.argb, expectedFaded);
});

function argbForTest(color) { return `FF${color.replace("#", "").toUpperCase()}`; }
