export type ComparisonAssessment = {
  id: string;
  scores: readonly { skillIdentifier: string; score: number | null; maxScore: number }[];
  sections: readonly { sectionCode: string; enabled: boolean }[];
};

export type ComparisonState = "improved" | "regressed" | "unchanged" | "unanswered" | "locked" | "incompatible";
export type ComparableTask = { id: string; sectionCode: string; taskName: string; maxScore: number };

export function compareAssessments(previous: ComparisonAssessment, current: ComparisonAssessment, tasks: readonly ComparableTask[], sectionNames: ReadonlyMap<string, string> = new Map()) {
  const previousScores = new Map(previous.scores.map((item) => [item.skillIdentifier, item]));
  const currentScores = new Map(current.scores.map((item) => [item.skillIdentifier, item]));
  const previousEnabled = new Set(previous.sections.filter((item) => item.enabled).map((item) => item.sectionCode));
  const currentEnabled = new Set(current.sections.filter((item) => item.enabled).map((item) => item.sectionCode));

  const rows = tasks.map((task) => {
    const before = previousScores.get(task.id);
    const after = currentScores.get(task.id);
    let state: ComparisonState;
    if (!previousEnabled.has(task.sectionCode) || !currentEnabled.has(task.sectionCode)) state = "locked";
    else if ((before && before.maxScore !== task.maxScore) || (after && after.maxScore !== task.maxScore)) state = "incompatible";
    else if (before?.score === null || before?.score === undefined || after?.score === null || after?.score === undefined) state = "unanswered";
    else if (after.score > before.score) state = "improved";
    else if (after.score < before.score) state = "regressed";
    else state = "unchanged";
    return { task, previousScore: before?.score ?? null, currentScore: after?.score ?? null, state };
  });

  const sections = [...new Set(rows.map((row) => row.task.sectionCode))].map((sectionCode) => {
    const sectionRows = rows.filter((row) => row.task.sectionCode === sectionCode);
    const comparable = sectionRows.filter((row) => ["improved", "regressed", "unchanged"].includes(row.state));
    return {
      sectionCode,
      name: sectionNames.get(sectionCode) ?? sectionCode,
      comparable: comparable.length,
      available: sectionRows.filter((row) => row.state !== "locked" && row.state !== "incompatible").length,
      assessedBoth: comparable.length,
      improved: comparable.filter((row) => row.state === "improved").length,
      regressed: comparable.filter((row) => row.state === "regressed").length,
      unchanged: comparable.filter((row) => row.state === "unchanged").length,
    };
  });
  return { rows, sections };
}
