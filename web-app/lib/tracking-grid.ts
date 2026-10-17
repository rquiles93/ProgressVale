export type GridTask = { id: string; sectionCode: string; taskName: string; maxScore: number };
export type GridSection = {
  code: string;
  name: string;
  tasks: GridTask[];
  assessmentApproved?: boolean;
  permanentlyExcluded?: boolean;
};
export type GridAssessment = {
  id: string;
  status?: string;
  trackingColor?: string | null;
  evaluationCompletedAt: Date | null;
  createdAt: Date;
  scores: readonly { skillIdentifier: string; score: number | null; maxScore: number }[];
  sections: readonly { sectionCode: string; enabled: boolean }[];
};

export function isProvisionalAssessment(assessment: Pick<GridAssessment, "status">) {
  return assessment.status === "DRAFT" || assessment.status === "IN_PROGRESS";
}

const BASE_COLORS = ["#365F4A", "#C67A5A", "#557A95", "#9A7AA0", "#B08A3E", "#487F78", "#8A5F55", "#667A48", "#B04A6F", "#3F78A8", "#A26935", "#6F63A6", "#2F877C", "#A84F45", "#718AA8", "#7B6A39"] as const;

function hslToHex(hue: number, saturation = 48, lightness = 43) {
  const s = saturation / 100; const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s; const x = c * (1 - Math.abs((hue / 60) % 2 - 1)); const m = l - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((value) => Math.round((value + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function assessmentColor(index: number) {
  return BASE_COLORS[index] ?? hslToHex((index * 137.508 + 17) % 360, 52, index % 2 ? 38 : 48);
}

export function buildTrackingGrid(sections: readonly GridSection[], assessments: readonly GridAssessment[]) {
  const orderedAssessments = [...assessments].sort((a, b) => Number(isProvisionalAssessment(a)) - Number(isProvisionalAssessment(b)) || (a.evaluationCompletedAt ?? a.createdAt).getTime() - (b.evaluationCompletedAt ?? b.createdAt).getTime() || a.id.localeCompare(b.id));
  const legend = orderedAssessments.map((assessment, index) => ({ assessment, color: assessment.trackingColor ?? assessmentColor(index), index, provisional: isProvisionalAssessment(assessment) }));
  const grids = sections.map((section) => {
    const permanentlyExcluded = section.permanentlyExcluded ?? false;
    const latest = legend.at(-1);
    const latestSectionState = latest?.assessment.sections.find((state) => state.sectionCode === section.code);
    const latestSectionStatus = permanentlyExcluded ? "excluded" : latest && !latestSectionState?.enabled ? "locked" : "available";
    return {
    code: section.code,
    name: section.name,
    assessmentApproved: section.assessmentApproved ?? !permanentlyExcluded,
    permanentlyExcluded,
    latestSectionStatus,
    rowsTopToBottom: [...section.tasks].reverse().map((task) => {
      const boxes: Array<{ level: number; assessmentIndex: number; color: string } | null> = Array.from({ length: task.maxScore }, () => null);
      const observations: Array<{ assessmentIndex: number; score: number }> = [];
      const regressions: Array<{ assessmentIndex: number; previous: number; current: number }> = [];
      let acquired = 0; let previousObserved: number | null = null;
      for (const item of legend) {
        if (permanentlyExcluded) continue;
        const enabled = item.assessment.sections.some((state) => state.sectionCode === section.code && state.enabled);
        if (!enabled) continue;
        const record = item.assessment.scores.find((score) => score.skillIdentifier === task.id);
        if (record?.score === null || record?.score === undefined) continue;
        const score = Math.max(0, Math.min(task.maxScore, record.score));
        observations.push({ assessmentIndex: item.index, score });
        if (previousObserved !== null && score < previousObserved) regressions.push({ assessmentIndex: item.index, previous: previousObserved, current: score });
        for (let level = acquired + 1; level <= score; level += 1) boxes[level - 1] = { level, assessmentIndex: item.index, color: item.color };
        acquired = Math.max(acquired, score); previousObserved = score;
      }
      const latestEnabled = latest?.assessment.sections.some((state) => state.sectionCode === section.code && state.enabled) ?? false;
      const latestRecord = latest?.assessment.scores.find((score) => score.skillIdentifier === task.id);
      const latestStatus = permanentlyExcluded ? "excluded" : !latestEnabled ? "locked" : latestRecord?.score === null || latestRecord?.score === undefined ? "unanswered" : "assessed";
      return { task, boxes, boxSpan: 4 / task.maxScore, totalWidthUnits: 4, observations, regressions, latestStatus, latestScore: latestStatus === "assessed" ? latestRecord!.score : null };
    }),
  }});
  return { legend, sections: grids };
}

export function verifyTrackingGrid(sections: readonly GridSection[], model: ReturnType<typeof buildTrackingGrid>) {
  const expected = sections.flatMap((section) => section.tasks.map((task) => task.id));
  const actual = model.sections.flatMap((section) => section.rowsTopToBottom.map((row) => row.task.id));
  const errors: string[] = [];
  if (model.sections.length !== sections.length) errors.push(`Número de secciones incorrecto: ${model.sections.length}.`);
  if (new Set(actual).size !== actual.length) errors.push("Hay tareas duplicadas.");
  for (const id of expected) if (!actual.includes(id)) errors.push(`Falta ${id}.`);
  for (const id of actual) if (!expected.includes(id)) errors.push(`Tarea inesperada ${id}.`);
  for (const section of model.sections) {
    const source = sections.find((item) => item.code === section.code);
    const expectedTopToBottom = [...(source?.tasks ?? [])].reverse().map((task) => task.id);
    if (section.rowsTopToBottom.map((row) => row.task.id).join("|") !== expectedTopToBottom.join("|")) errors.push(`Orden incorrecto en ${section.code}.`);
    if (section.permanentlyExcluded && section.rowsTopToBottom.some((row) => row.boxes.some(Boolean))) errors.push(`${section.code}: una sección excluida contiene color.`);
    for (const row of section.rowsTopToBottom) {
      if (row.boxes.length !== row.task.maxScore) errors.push(`${row.task.id}: número de cajas incorrecto.`);
      if (row.totalWidthUnits !== 4 || row.boxSpan * row.boxes.length !== 4) errors.push(`${row.task.id}: ancho total incorrecto.`);
      if (![1, 2, 4].includes(row.task.maxScore)) errors.push(`${row.task.id}: máximo no admitido.`);
    }
  }
  return { valid: errors.length === 0, errors, sections: model.sections.map((section) => ({ section: section.code, taskCount: section.rowsTopToBottom.length })) };
}
