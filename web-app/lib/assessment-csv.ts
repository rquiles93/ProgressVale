export type CsvAssessment = {
  status: string;
  scores: readonly { skillIdentifier: string; score: number | null; maxScore: number }[];
  notes: readonly { skillIdentifier: string; content: string }[];
  sections: readonly { sectionCode: string; enabled: boolean }[];
};
export type CsvTask = { id: string; sectionCode: string; taskName: string; maxScore: number };

export function csvCell(value: string | number | null) {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function assessmentCsv(assessment: CsvAssessment, tasks: readonly CsvTask[], sectionNames: ReadonlyMap<string, string> = new Map()) {
  const scores = new Map(assessment.scores.map((item) => [item.skillIdentifier, item]));
  const notes = new Map(assessment.notes.map((item) => [item.skillIdentifier, item.content]));
  const enabled = new Set(assessment.sections.filter((item) => item.enabled).map((item) => item.sectionCode));
  const header = ["Sección", "Código", "Tarea", "Puntuación", "Puntuación máxima", "Estado", "Notas"];
  const rows = tasks.map((task) => {
    const locked = !enabled.has(task.sectionCode);
    const score = scores.get(task.id);
    const status = locked ? "Bloqueada" : score?.score === null || score?.score === undefined ? "Sin responder" : "Respondida";
    return [sectionNames.get(task.sectionCode) ?? task.sectionCode, task.id, task.taskName, locked ? null : score?.score ?? null, score?.maxScore ?? task.maxScore, status, notes.get(task.id) ?? ""];
  });
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
