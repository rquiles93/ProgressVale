export type AppLanguage = "EN" | "ES";

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "EN" || value === "ES";
}

export function appLanguage(value: unknown): AppLanguage {
  return isAppLanguage(value) ? value : "EN";
}

export function text(language: AppLanguage, english: string, spanish: string) {
  return language === "ES" ? spanish : english;
}

export function locale(language: AppLanguage) {
  return language === "ES" ? "es" : "en-US";
}
