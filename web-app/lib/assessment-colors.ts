export const ASSESSMENT_COLOR_PALETTE = [
  { value: "#C67A5A", label: "Terracota" },
  { value: "#557A95", label: "Azul acero" },
  { value: "#9A7AA0", label: "Ciruela" },
  { value: "#B08A3E", label: "Ocre" },
  { value: "#B04A6F", label: "Frambuesa" },
] as const;

export type AssessmentColor = (typeof ASSESSMENT_COLOR_PALETTE)[number]["value"];

const assessmentColors = new Set<string>(ASSESSMENT_COLOR_PALETTE.map((item) => item.value));

export function isAssessmentColor(value: string): value is AssessmentColor {
  return assessmentColors.has(value);
}

export function availableAssessmentColors(usedColors: readonly (string | null)[]) {
  const used = new Set(usedColors.filter((color): color is string => Boolean(color)));
  return ASSESSMENT_COLOR_PALETTE.filter((item) => !used.has(item.value));
}

export function fadedAssessmentColor(color: string, whiteRatio = 0.72) {
  const hex = color.replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return "#E5E7EB";
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `#${channels.map((channel) => Math.round(channel + (255 - channel) * whiteRatio).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
