export type ProgressScore = { skillIdentifier: string; score: number | null; maxScore: number };
export type ProgressAssessment = { id: string; status: string; evaluationCompletedAt: Date | null; createdAt: Date; scores: ProgressScore[] };

export const HISTORY_COLORS = ["#365F4A", "#C67A5A", "#557A95", "#9A7AA0", "#B08A3E", "#487F78", "#8A5F55", "#667A48"] as const;

export function isAnsweredScore(score: number | null | undefined): score is number {
  return score !== null && score !== undefined;
}

export function firstUnansweredTaskId(taskIds: readonly string[], scores: readonly Pick<ProgressScore, "skillIdentifier" | "score">[]) {
  const answered = new Set(scores.filter((item) => isAnsweredScore(item.score)).map((item) => item.skillIdentifier));
  return taskIds.find((taskId) => !answered.has(taskId)) ?? taskIds.at(-1) ?? null;
}

export function latestScoresBySkill(assessments: readonly ProgressAssessment[]) {
  const result = new Map<string, ProgressScore>();
  for (const assessment of assessments) {
    for (const score of assessment.scores) result.set(score.skillIdentifier, score);
  }
  return result;
}

export function comparableScoreChange(assessments: readonly ProgressAssessment[]) {
  if (assessments.length < 2) return { comparable: 0, improved: 0, unchanged: 0, regressed: 0, netChange: 0 };
  const previous = new Map(assessments.at(-2)!.scores.filter((item) => item.score !== null).map((item) => [item.skillIdentifier, item.score!]));
  const current = new Map(assessments.at(-1)!.scores.filter((item) => item.score !== null).map((item) => [item.skillIdentifier, item.score!]));
  let improved = 0; let unchanged = 0; let regressed = 0; let netChange = 0;
  for (const [skill, score] of current) {
    const before = previous.get(skill);
    if (before === undefined) continue;
    netChange += score - before;
    if (score > before) improved += 1;
    else if (score < before) regressed += 1;
    else unchanged += 1;
  }
  return { comparable: improved + unchanged + regressed, improved, unchanged, regressed, netChange };
}
