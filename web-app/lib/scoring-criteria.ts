export type ParsedScoringCriteria = {
  byScore: ReadonlyMap<number, string>;
  fallback: string | null;
};

const SCORE_MARKER = /(?:^|[;,]\s*|\s+)([0-4])\s*=\s*/g;

export function parseScoringCriteria(criteria: string, validScores: readonly number[]): ParsedScoringCriteria {
  const matches = [...criteria.matchAll(SCORE_MARKER)];
  const allowed = new Set(validScores);
  const scores = matches.map((match) => Number(match[1]));
  const unambiguous = matches.length > 0
    && matches[0].index === 0
    && new Set(scores).size === scores.length
    && scores.every((score) => allowed.has(score));

  if (!unambiguous) return { byScore: new Map(), fallback: criteria };

  const byScore = new Map<number, string>();
  matches.forEach((match, index) => {
    const start = match.index! + match[0].length;
    const end = matches[index + 1]?.index ?? criteria.length;
    byScore.set(Number(match[1]), criteria.slice(start, end).trim());
  });

  return { byScore, fallback: null };
}
