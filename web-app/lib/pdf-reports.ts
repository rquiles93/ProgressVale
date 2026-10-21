import PDFDocument from "pdfkit";
import { buildTrackingGrid } from "./tracking-grid.ts";
import { TRACKING_EXCLUDED_SECTION_HEADER_COLOR, TRACKING_SECTION_HEADER_COLOR } from "./assessment-colors.ts";

export const REPORT_COLORS = ["#365F4A", "#C67A5A", "#557A95", "#9A7AA0", "#B08A3E", "#487F78", "#8A5F55", "#667A48"] as const;

const NAVY = "#172B42";
const SAGE = "#365F4A";
const MEDIUM_SAGE = "#789B80";
const LIGHT_SAGE = "#E8F0E7";
const CREAM = "#F8F4EC";
const INK = "#314052";
const LINE = "#DDE2DC";
const MUTED = "#66717E";

export type ReportTask = { id: string; sectionCode: string; taskName: string; maxScore: number };
export type ReportSection = { code: string; name: string; tasks: ReportTask[]; assessmentApproved?: boolean; permanentlyExcluded?: boolean };
export type ReportScore = { skillIdentifier: string; score: number | null; maxScore: number };
export type ReportNote = { skillIdentifier: string; content: string };
export type ReportSectionState = { sectionCode: string; enabled: boolean; lockReason: string | null };

export type AssessmentReportData = {
  clientName: string;
  clientIdentifier: string | null;
  status: string;
  createdAt: Date;
  evaluationStartedAt: Date | null;
  evaluationCompletedAt: Date | null;
  serviceSettings: string[];
  protocolVersion: string | null;
  sections: ReportSection[];
  sectionStates: ReportSectionState[];
  scores: ReportScore[];
  notes: ReportNote[];
};

export type TrackingAssessment = {
  id: string;
  status: string;
  trackingColor: string | null;
  evaluationCompletedAt: Date | null;
  createdAt: Date;
  scores: ReportScore[];
  sections: ReportSectionState[];
};

export type TrackingReportData = {
  clientName: string;
  clientIdentifier: string | null;
  sections: ReportSection[];
  assessments: TrackingAssessment[];
};

export function trackingInformationRows(data: Pick<TrackingReportData, "assessments">) {
  return buildTrackingGrid([], data.assessments).legend.slice(-4).map((item) => ({
    assessmentId: item.assessment.id,
    date: item.assessment.evaluationCompletedAt ?? item.assessment.createdAt,
    color: item.color,
  }));
}

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completada",
  FINALIZED: "Finalizada",
  ARCHIVED: "Archivada",
};

const settingLabels: Record<string, string> = {
  HOME: "Hogar",
  SCHOOL: "Escuela",
  CLINIC_BASED: "Clínica ABA",
};

function formatDate(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat("es", { dateStyle: "medium", timeZone: "UTC" }).format(value) : "Sin fecha";
}

function safeFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "reporte";
}

export function assessmentPdfFilename(data: Pick<AssessmentReportData, "clientName" | "createdAt">) {
  return `evaluacion-${safeFilename(data.clientName)}-${data.createdAt.toISOString().slice(0, 10)}.pdf`;
}

export function trackingPdfFilename(data: Pick<TrackingReportData, "clientName">) {
  return `seguimiento-${safeFilename(data.clientName)}.pdf`;
}

function createDocument(options: PDFKit.PDFDocumentOptions) {
  const doc = new PDFDocument({ autoFirstPage: false, bufferPages: true, info: { Title: "ABLLS-R - Resumen de resultados", Author: "ProgressVale" }, ...options });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  return { doc, completed };
}

function addPageBrand(doc: PDFKit.PDFDocument, title: string) {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  doc.rect(0, 0, doc.page.width, 18).fill(SAGE);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(SAGE).text("ABLLS-R", left, 30, { continued: true });
  doc.font("Helvetica").fillColor(MUTED).text(`  |  ${title}`, { align: "left" });
  doc.moveTo(left, 46).lineTo(left + width, 46).strokeColor(LINE).lineWidth(0.5).stroke();
  doc.y = 60;
}

function addFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 28;
    doc.font("Helvetica").fontSize(7).fillColor(MUTED)
      .text("Resumen generado por la aplicación. No reproduce un formulario oficial del editor.", doc.page.margins.left, y, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 50, lineBreak: false })
      .text(`${index + 1} / ${range.count}`, doc.page.width - doc.page.margins.right - 42, y, { width: 42, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }
}

function addPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(7).fillColor(MUTED).text(`${index + 1} / ${range.count}`, doc.page.width - doc.page.margins.right - 42, doc.page.height - 28, { width: 42, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number, title: string) {
  if (doc.y + needed <= doc.page.height - doc.page.margins.bottom - 18) return false;
  doc.addPage();
  addPageBrand(doc, title);
  return true;
}

function metaCard(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.roundedRect(x, y, width, 47, 6).fill(LIGHT_SAGE);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(SAGE).text(label.toUpperCase(), x + 10, y + 9, { width: width - 20 });
  doc.font("Helvetica").fontSize(9).fillColor(NAVY).text(value, x + 10, y + 24, { width: width - 20, ellipsis: true });
}

function assessmentTableHeader(doc: PDFKit.PDFDocument, y: number, widths: number[]) {
  const x = doc.page.margins.left;
  const labels = ["Tarea", "Nombre", "Resultado", "Notas"];
  doc.rect(x, y, widths.reduce((sum, item) => sum + item, 0), 24).fill(SAGE);
  let cursor = x;
  labels.forEach((label, index) => {
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#FFFFFF").text(label, cursor + 6, y + 8, { width: widths[index] - 12, lineBreak: false });
    cursor += widths[index];
  });
  doc.y = y + 24;
}

export async function generateAssessmentPdf(data: AssessmentReportData) {
  const { doc, completed } = createDocument({ size: "A4", margins: { top: 54, right: 36, bottom: 48, left: 36 } });
  const reportTitle = "Resumen de evaluación";
  doc.addPage();
  addPageBrand(doc, reportTitle);
  doc.font("Times-Roman").fontSize(25).fillColor(NAVY).text("Resumen de evaluación", { lineGap: 2 });
  doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(data.clientName);
  const cardY = doc.y + 18;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 8;
  const cardWidth = (contentWidth - gap) / 2;
  metaCard(doc, "Identificador", data.clientIdentifier || "No registrado", doc.page.margins.left, cardY, cardWidth);
  metaCard(doc, "Estado", statusLabels[data.status] ?? data.status, doc.page.margins.left + cardWidth + gap, cardY, cardWidth);
  metaCard(doc, "Inicio", formatDate(data.evaluationStartedAt ?? data.createdAt), doc.page.margins.left, cardY + 55, cardWidth);
  metaCard(doc, "Finalización", formatDate(data.evaluationCompletedAt), doc.page.margins.left + cardWidth + gap, cardY + 55, cardWidth);
  doc.y = cardY + 122;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(SAGE).text("SERVICE SETTING");
  doc.font("Helvetica").fontSize(9).fillColor(INK).text(data.serviceSettings.map((value) => settingLabels[value] ?? value).join(", ") || "No registrado");
  doc.moveDown(0.5).fontSize(8).fillColor(MUTED).text(`Versión de contenido: ${data.protocolVersion ?? "sin versión"}`);
  doc.moveDown(1).fontSize(8).fillColor(MUTED).text("Las tareas sin respuesta se muestran como 'Sin responder'. Una puntuación 0 representa un valor registrado. Las secciones deshabilitadas por el Service Setting se muestran como bloqueadas.", { lineGap: 2 });

  const scoreMap = new Map(data.scores.map((item) => [item.skillIdentifier, item]));
  const noteMap = new Map(data.notes.map((item) => [item.skillIdentifier, item.content]));
  const stateMap = new Map(data.sectionStates.map((item) => [item.sectionCode, item]));
  const widths = [45, 180, 68, contentWidth - 293];

  for (const section of data.sections) {
    ensureSpace(doc, 62, reportTitle);
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(SAGE).text(`${section.code}  ${section.name}`);
    const state = stateMap.get(section.code);
    if (!state?.enabled) {
      doc.moveDown(0.4).roundedRect(doc.page.margins.left, doc.y, contentWidth, 30, 5).fill(CREAM);
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text("Sección bloqueada en esta evaluación por el Service Setting. Sus tareas no se contabilizan como puntuaciones cero.", doc.page.margins.left + 8, doc.y - 22, { width: contentWidth - 16 });
      doc.y += 12;
      continue;
    }
    assessmentTableHeader(doc, doc.y + 6, widths);
    for (const task of section.tasks) {
      const score = scoreMap.get(task.id);
      const note = noteMap.get(task.id)?.trim() ?? "";
      const rowValue = score?.score === null || score === undefined ? "Sin responder" : `${score.score} / ${score.maxScore}`;
      const textOptions = [{ value: task.id, width: widths[0] }, { value: task.taskName, width: widths[1] }, { value: rowValue, width: widths[2] }, { value: note || "-", width: widths[3] }];
      const rowHeight = Math.max(28, ...textOptions.map((item) => doc.font("Helvetica").fontSize(7.5).heightOfString(item.value, { width: item.width - 12, lineGap: 1 }) + 14));
      if (ensureSpace(doc, rowHeight + 30, reportTitle)) assessmentTableHeader(doc, doc.y, widths);
      const rowY = doc.y;
      doc.rect(doc.page.margins.left, rowY, contentWidth, rowHeight).fillColor("#FFFFFF").fill().strokeColor(LINE).lineWidth(0.4).stroke();
      let cursor = doc.page.margins.left;
      textOptions.forEach((item, index) => {
        if (index) doc.moveTo(cursor, rowY).lineTo(cursor, rowY + rowHeight).strokeColor(LINE).lineWidth(0.4).stroke();
        doc.font(index === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor(index === 2 && score?.score === 0 ? SAGE : INK).text(item.value, cursor + 6, rowY + 7, { width: item.width - 12, lineGap: 1 });
        cursor += item.width;
      });
      doc.y = rowY + rowHeight;
    }
  }
  addFooters(doc);
  doc.end();
  return completed;
}

export function trackingPdfTaskLabel(taskId: string) {
  return taskId;
}

function addTrackingInformationBox(doc: PDFKit.PDFDocument, data: TrackingReportData, x: number, y: number, width: number) {
  const rows = trackingInformationRows(data);
  const height = 82;
  const padding = 7;
  const labelWidth = 48;
  const dateX = x + 70;
  const colorX = x + width - 60;
  doc.rect(x, y, width, height).strokeColor("#AAB2AA").lineWidth(0.6).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor(INK).text("Learner:", x + padding, y + 7, { width: labelWidth, lineBreak: false });
  doc.text(data.clientName, x + 48, y + 7, { width: width - 55, lineBreak: false, ellipsis: true });
  doc.text("Assessor", x + padding, y + 22, { width: labelWidth, lineBreak: false });
  doc.text("Date", dateX, y + 22, { width: 55, align: "center", lineBreak: false });
  doc.text("Color", colorX, y + 22, { width: 52, align: "center", lineBreak: false });
  for (let index = 0; index < 4; index += 1) {
    const row = rows[index];
    const rowY = y + 36 + index * 10.5;
    doc.moveTo(x + padding, rowY + 7).lineTo(x + 55, rowY + 7).strokeColor("#727A72").lineWidth(0.45).stroke();
    if (row) doc.font("Helvetica").fontSize(6.8).fillColor(INK).text(formatDate(row.date), dateX - 5, rowY, { width: 67, align: "center", lineBreak: false, ellipsis: true });
    else doc.moveTo(dateX, rowY + 7).lineTo(dateX + 55, rowY + 7).strokeColor("#727A72").lineWidth(0.45).stroke();
    doc.rect(colorX, rowY - 1, 52, 9).fillAndStroke(row ? row.color : "#FFFFFF", "#172B42");
  }
}

export function trackingPdfSectionPresentation(status: string) {
  const unavailable = status !== "available";
  return {
    headerColor: unavailable ? TRACKING_EXCLUDED_SECTION_HEADER_COLOR : TRACKING_SECTION_HEADER_COLOR,
    textColor: unavailable ? NAVY : "#FFFFFF",
    showScoreColors: !unavailable,
  };
}

export const TRACKING_PDF_FULL_PAGE = { width: 841.89, height: 1190.55 } as const;

export function trackingPdfPageGeometry(pageIndex: number, taskCounts: number[]) {
  const informationY = 96;
  const informationHeight = 82;
  const metadataClearance = 18;
  const bottomReserve = 82;
  const minimumPageHeight = 560;
  const tallestSection = Math.max(...taskCounts, 1);
  const bibliographyRowHeight = (TRACKING_PDF_FULL_PAGE.height - bottomReserve - informationY) / 57;
  const rowHeight = [0, 1, 2, 5].includes(pageIndex) && tallestSection >= 30 ? bibliographyRowHeight : 14;
  const gridStart = [3, 4].includes(pageIndex) ? informationY + informationHeight + metadataClearance : informationY;
  const requiredHeight = gridStart + tallestSection * rowHeight + bottomReserve;
  const pageHeight = pageIndex === 0 ? TRACKING_PDF_FULL_PAGE.height : Math.min(TRACKING_PDF_FULL_PAGE.height, Math.max(minimumPageHeight, requiredHeight));
  return { pageHeight, gridBottom: pageHeight - bottomReserve, rowHeight, gridStart };
}

export async function generateTrackingPdf(data: TrackingReportData) {
  const model = buildTrackingGrid(data.sections, data.assessments);
  const { doc, completed } = createDocument({ size: "A3", layout: "portrait", margins: { top: 44, right: 28, bottom: 36, left: 28 } });
  const sectionGroups = [["A", "B", "C", "D"], ["E", "F", "G", "H"], ["I", "J", "K", "L"], ["M", "N", "P", "Q"], ["R", "S", "T", "U"], ["V", "W", "X", "Y", "Z"]];
  for (const [pageIndex, sectionCodes] of sectionGroups.entries()) {
    const pageSections = sectionCodes.map((code) => model.sections.find((section) => section.code === code)).filter((section): section is NonNullable<typeof section> => Boolean(section));
    const geometry = trackingPdfPageGeometry(pageIndex, pageSections.map((section) => section.rowsTopToBottom.length));
    if (pageIndex === 0) doc.addPage();
    else doc.addPage({ size: [TRACKING_PDF_FULL_PAGE.width, geometry.pageHeight], margins: { top: 44, right: 28, bottom: 36, left: 28 } });
    addPageBrand(doc, "Skills Tracking");
    doc.font("Times-Roman").fontSize(21).fillColor(NAVY).text(`Skills Tracking - ${data.clientName}`, 28, 54, { width: doc.page.width - 56 });
    if (data.clientIdentifier) doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(`ID: ${data.clientIdentifier}`, 28, 80, { width: doc.page.width - 56 });
    const informationY = 96;
    addTrackingInformationBox(doc, data, 28, informationY, 220);
    const gridBottom = geometry.gridBottom;
    const finalPage = pageSections.length === 5;
    const columnWidth = finalPage ? 136 : 164;
    const gap = finalPage ? 12 : 18;
    const groupWidth = pageSections.length * columnWidth + (pageSections.length - 1) * gap;
    const groupLeft = (doc.page.width - groupWidth) / 2;
    pageSections.forEach((section, columnIndex) => {
      const x = groupLeft + columnIndex * (columnWidth + gap);
      const labelWidth = finalPage ? 38 : 44;
      const boxWidth = columnWidth - labelWidth;
      const rowHeight = geometry.rowHeight;
      const sectionTop = gridBottom - rowHeight * section.rowsTopToBottom.length;
      const presentation = trackingPdfSectionPresentation(section.latestSectionStatus);
      const sectionUnavailable = !presentation.showScoreColors;
      const headerFill = presentation.headerColor;
      const headerText = `${section.code} · ${section.name}`;
      const headerWidth = columnWidth - labelWidth * 0.55;
      const scoringGridRight = x + labelWidth + boxWidth;
      const headerX = scoringGridRight - headerWidth;
      doc.roundedRect(headerX, gridBottom + 7, headerWidth, 34, 1.5).fill(headerFill);
      doc.font("Helvetica-Bold").fontSize(finalPage ? 8.2 : 8.7).fillColor(presentation.textColor).text(headerText, headerX + 4, gridBottom + 11, { width: headerWidth - 8, height: 26, ellipsis: true, align: "center" });
      section.rowsTopToBottom.forEach((row, rowIndex) => {
        const y = sectionTop + rowIndex * rowHeight;
        const labelFontSize = Math.max(6.4, Math.min(finalPage ? 7.8 : 8.3, rowHeight - 1.8));
        doc.font("Helvetica-Bold").fontSize(labelFontSize).fillColor(INK).text(trackingPdfTaskLabel(row.task.id), x, y + Math.max(0.8, (rowHeight - labelFontSize) / 2), { width: labelWidth - 3, align: "right", lineBreak: false });
        const cellWidth = boxWidth / row.task.maxScore;
        row.boxes.forEach((box, boxIndex) => { const bx = x + labelWidth + boxIndex * cellWidth; doc.rect(bx, y, cellWidth, rowHeight).fillAndStroke(sectionUnavailable ? CREAM : box?.color ?? CREAM, LINE); });
      });
    });
  }
  addPageNumbers(doc);
  doc.end();
  return completed;
}
