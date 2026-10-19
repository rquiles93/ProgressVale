import content from "./ablls-content.v1.json";
import spanish from "./ablls-content.es.v1.json";
import simpleExamples from "./simple-examples.v1.json";

export const PROTOCOL_VERSION = content.version;

export type ProtocolSection = (typeof content.sections)[number];
export type ProtocolTask = (typeof content.tasks)[number];
export type ServiceSettingValue = "HOME" | "SCHOOL" | "CLINIC_BASED";
export type AssessmentLanguageValue = "EN" | "ES";
export type LocalizedProtocolTask = ProtocolTask & { simpleExample: string };

export const protocolSections = content.sections;
export const protocolTasks = content.tasks;
export const protocolTaskById = new Map(protocolTasks.map((task) => [task.id, task]));

type TranslatedTask = { taskName: string; taskObjective: string; question: string; examples: string; scoringCriteria: string; protocolNotes: string };
const spanishTasks = spanish.tasks as Record<string, TranslatedTask>;
const spanishSections = spanish.sections as Record<string, string>;
const examples = simpleExamples.examples as Record<string, { en: string; es: string }>;

export function localizedTask(task: ProtocolTask, language: AssessmentLanguageValue): LocalizedProtocolTask {
  const simpleExample = examples[task.id]?.[language === "ES" ? "es" : "en"] ?? "";
  if (language === "EN") return { ...task, simpleExample };
  const translated = spanishTasks[task.id];
  return translated ? { ...task, ...translated, simpleExample } : { ...task, simpleExample };
}

export function localizedSection<T extends ProtocolSection>(section: T, language: AssessmentLanguageValue): T {
  return language === "ES" && spanishSections[section.code] ? { ...section, name: spanishSections[section.code] } : section;
}

export const serviceSettingLabels: Record<ServiceSettingValue, string> = {
  HOME: "Home",
  SCHOOL: "School",
  CLINIC_BASED: "Clinic-Based ABA",
};

export function initialSectionAvailability(settings: readonly ServiceSettingValue[]) {
  const allApproved = settings.includes("SCHOOL") || settings.includes("CLINIC_BASED");
  return protocolSections.map((section) => {
    const permanent = section.permanentlyExcluded;
    const homeLocked = !allApproved && (section.code === "M" || section.code === "N");
    return {
      sectionCode: section.code,
      defaultEnabled: section.assessmentApproved && !homeLocked,
      enabled: section.assessmentApproved && !homeLocked,
      lockReason: permanent ? "PERMANENT" : homeLocked ? "SERVICE_SETTING" : null,
    };
  });
}

export function tasksForSection(sectionCode: string) {
  return protocolTasks.filter((task) => task.sectionCode === sectionCode);
}

export function nextAvailableSection(currentCode: string, enabledCodes: ReadonlySet<string>) {
  const current = protocolSections.findIndex((section) => section.code === currentCode);
  return protocolSections.slice(current + 1).find((section) => enabledCodes.has(section.code)) ?? null;
}
