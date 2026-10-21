import ExcelJS from "exceljs";
import { buildTrackingGrid } from "./tracking-grid.ts";
import { TRACKING_EXCLUDED_SECTION_HEADER_COLOR, TRACKING_SECTION_HEADER_COLOR } from "./assessment-colors.ts";
import { trackingInformationRows, type TrackingReportData } from "./pdf-reports.ts";
import type { AssessmentLanguageValue } from "./ablls-content.ts";

const NAVY = "172B42"; const LIGHT = "E8F0E7"; const CREAM = "F8F4EC"; const LINE = "C7D0C8"; const WHITE = "FFFFFF";
const argb = (color: string) => `FF${color.replace("#", "").toUpperCase()}`;

export function trackingXlsxTaskLabel(task: { id: string; taskName: string }) {
  return task.id;
}

function sectionHeaderFontSize(text: string) {
  const availableWidthPx = 4 * (3.4 * 7 + 5) - 10;
  const availableHeightPt = 32;
  const characterWidth = (character: string, size: number) => {
    const factor = /[A-Z0-9]/.test(character) ? 0.68 : /[a-z]/.test(character) ? 0.52 : /\s/.test(character) ? 0.28 : 0.34;
    return factor * size * (96 / 72) * 1.05;
  };
  const wrappedLines = (size: number) => {
    const words = text.split(/\s+/);
    let lines = 1;
    let lineWidth = 0;
    for (const word of words) {
      const wordWidth = [...word].reduce((width, character) => width + characterWidth(character, size), 0);
      const spaceWidth = characterWidth(" ", size);
      if (lineWidth > 0 && lineWidth + spaceWidth + wordWidth > availableWidthPx) { lines += 1; lineWidth = wordWidth; }
      else lineWidth += (lineWidth > 0 ? spaceWidth : 0) + wordWidth;
    }
    return lines;
  };
  return [10, 9, 8, 7, 6].find((size) => wrappedLines(size) * size * 1.28 <= availableHeightPt) ?? 6;
}

export function trackingXlsxFilename(data: Pick<TrackingReportData, "clientName">) {
  const safe = data.clientName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "seguimiento";
  return `seguimiento-${safe}.xlsx`;
}

export async function generateTrackingXlsx(data: TrackingReportData, language: AssessmentLanguageValue = "EN") {
  const workbook = new ExcelJS.Workbook(); workbook.creator = "ProgressVale"; workbook.created = new Date();
  const model = buildTrackingGrid(data.sections, data.assessments); const groups = Array.from({ length: Math.ceil(model.sections.length / 5) }, (_, index) => model.sections.slice(index * 5, (index + 1) * 5));
  const informationRows = trackingInformationRows(data);
  const excludedHeaderColor = TRACKING_EXCLUDED_SECTION_HEADER_COLOR;
  for (const [pageIndex, sections] of groups.entries()) {
    const informationBottomRow = 9;
    const firstGridRow = informationBottomRow + 2;
    const sheet = workbook.addWorksheet(`Rejilla ${pageIndex + 1}`, { views: [{ showGridLines: false, state: "frozen", ySplit: firstGridRow - 1 }], pageSetup: { orientation: "landscape", paperSize: 5, fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 } } });
    const lastColumn = sections.length * 6 - 1; sheet.mergeCells(1, 1, 1, lastColumn); const title = sheet.getCell(1, 1); title.value = `Skills Tracking - ${data.clientName}${data.clientIdentifier ? ` · ${data.clientIdentifier}` : ""}`; title.font = { name: "Arial", size: 14, bold: true, color: { argb: NAVY } }; title.alignment = { vertical: "middle", horizontal: "left" }; sheet.getRow(1).height = 24;
    sheet.mergeCells(2, 1, 2, lastColumn); const note = sheet.getCell(2, 1); note.value = language === "ES" ? "El color corresponde a la primera evaluación que alcanzó cada nivel. Las secciones no disponibles se muestran en verde atenuado y sin puntuaciones." : "Each color shows the first assessment that reached that level. Unavailable sections appear in pale green without scores."; note.font = { name: "Arial", size: 9, color: { argb: "66717E" } };
    const informationStartColumn = lastColumn - 8;
    sheet.mergeCells(3, informationStartColumn, 3, informationStartColumn + 1); sheet.getCell(3, informationStartColumn).value = "Learner:";
    sheet.mergeCells(3, informationStartColumn + 2, 3, lastColumn); sheet.getCell(3, informationStartColumn + 2).value = data.clientName;
    sheet.mergeCells(4, informationStartColumn, 4, informationStartColumn + 1); sheet.getCell(4, informationStartColumn).value = "Assessor";
    sheet.mergeCells(4, informationStartColumn + 2, 4, lastColumn); sheet.getCell(4, informationStartColumn + 2).value = null;
    sheet.mergeCells(5, informationStartColumn, 5, informationStartColumn + 4); sheet.getCell(5, informationStartColumn).value = "Date";
    sheet.mergeCells(5, informationStartColumn + 5, 5, lastColumn); sheet.getCell(5, informationStartColumn + 5).value = "Color";
    for (let index = 0; index < 4; index += 1) {
      const rowNumber = 6 + index; const item = informationRows[index];
      sheet.mergeCells(rowNumber, informationStartColumn, rowNumber, informationStartColumn + 4); const dateCell = sheet.getCell(rowNumber, informationStartColumn); dateCell.value = item?.date ?? null; if (item) dateCell.numFmt = language === "ES" ? "dd/mm/yyyy" : "mm/dd/yyyy";
      sheet.mergeCells(rowNumber, informationStartColumn + 5, rowNumber, lastColumn); const colorCell = sheet.getCell(rowNumber, informationStartColumn + 5); if (item) colorCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(item.color) } };
    }
    for (let row = 3; row <= informationBottomRow; row += 1) for (let column = informationStartColumn; column <= lastColumn; column += 1) { const cell = sheet.getCell(row, column); cell.font = { name: "Arial", size: 8, color: { argb: NAVY } }; cell.alignment = { vertical: "middle", horizontal: "center" }; cell.border = { top: { style: "thin", color: { argb: LINE } }, bottom: { style: "thin", color: { argb: LINE } }, left: { style: "thin", color: { argb: LINE } }, right: { style: "thin", color: { argb: LINE } } }; }
    sheet.getCell(3, informationStartColumn).alignment = { vertical: "middle", horizontal: "left" }; sheet.getCell(3, informationStartColumn + 2).alignment = { vertical: "middle", horizontal: "left" }; sheet.getCell(4, informationStartColumn).alignment = { vertical: "middle", horizontal: "left" };
    const maxRows = Math.max(...sections.map((section) => section.rowsTopToBottom.length)); const gridBottomRow = firstGridRow + maxRows - 1; const headerRow = gridBottomRow + 1; sheet.getRow(headerRow).height = 36;
    sections.forEach((section, sectionIndex) => {
      const start = sectionIndex * 6 + 1; const headerStart = start + 1; sheet.mergeCells(headerRow, headerStart, headerRow, start + 4); const header = sheet.getCell(headerRow, headerStart); const unavailable = section.latestSectionStatus !== "available"; const headerText = `${section.code} · ${section.name}`; header.value = headerText; header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(unavailable ? excludedHeaderColor : TRACKING_SECTION_HEADER_COLOR) } }; header.font = { name: "Arial", size: sectionHeaderFontSize(headerText), bold: true, color: { argb: unavailable ? NAVY : WHITE } }; header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      sheet.getColumn(start).width = 8; for (let column = start + 1; column <= start + 4; column += 1) sheet.getColumn(column).width = 3.4; if (sectionIndex < sections.length - 1) sheet.getColumn(start + 5).width = 2;
      const firstTaskRow = gridBottomRow - section.rowsTopToBottom.length + 1;
      section.rowsTopToBottom.forEach((row, rowIndex) => {
        const excelRow = firstTaskRow + rowIndex; sheet.getRow(excelRow).height = 12; const unavailable = section.latestSectionStatus !== "available"; const label = sheet.getCell(excelRow, start); label.value = trackingXlsxTaskLabel(row.task); label.font = { name: "Arial", size: 7, bold: true, color: { argb: NAVY } }; label.alignment = { vertical: "middle", horizontal: "right" };
        const span = 4 / row.task.maxScore;
        row.boxes.forEach((box, boxIndex) => { const from = start + 1 + boxIndex * span; const to = from + span - 1; if (to > from) sheet.mergeCells(excelRow, from, excelRow, to); const range = sheet.getCell(excelRow, from); range.fill = { type: "pattern", pattern: "solid", fgColor: { argb: unavailable ? CREAM : box ? argb(box.color) : CREAM } }; range.border = { top: { style: "thin", color: { argb: LINE } }, bottom: { style: "thin", color: { argb: LINE } }, left: { style: "thin", color: { argb: LINE } }, right: { style: "thin", color: { argb: LINE } } };
        });
      });
    });
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(lastColumn).letter}${headerRow}`;
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
