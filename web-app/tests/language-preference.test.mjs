import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appLanguage, isAppLanguage, locale, text } from "../lib/language.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20261020090000_add_user_language_preference/migration.sql");
const action = read("app/actions/language.ts");
const dashboard = read("components/client-list.tsx");
const assessmentPage = read("app/evaluacion/[id]/page.tsx");
const assessmentAction = read("app/actions/assessments.ts");
const clientDetail = read("app/clientes/[id]/page.tsx");
const tracking = read("app/clientes/[id]/seguimiento/page.tsx");
const comparison = read("app/clientes/[id]/comparar/page.tsx");
const profile = read("components/profile-form.tsx");
const header = read("components/ui.tsx");
const selector = read("components/language-selector.tsx");
const publicAuth = [read("components/auth-form.tsx"), read("components/email-auth-forms.tsx")].join("\n");

test("language helpers default safely and support only English and Spanish", () => {
  assert.equal(appLanguage(undefined), "EN");
  assert.equal(appLanguage("invalid"), "EN");
  assert.equal(isAppLanguage("EN"), true);
  assert.equal(isAppLanguage("ES"), true);
  assert.equal(isAppLanguage("fr"), false);
  assert.equal(text("EN", "English", "Español"), "English");
  assert.equal(text("ES", "English", "Español"), "Español");
  assert.equal(locale("EN"), "en-US");
  assert.equal(locale("ES"), "es");
});

test("user preference is database-backed with a safe English migration default", () => {
  assert.match(schema, /language\s+AssessmentLanguage\s+@default\(EN\)/);
  assert.match(migration, /ADD COLUMN "language" "AssessmentLanguage" NOT NULL DEFAULT 'EN'/);
});

test("preference updates are authenticated, allowlisted, and owner-scoped", () => {
  assert.match(action, /requireUserId\(\)/);
  assert.match(action, /isAppLanguage\(language\)/);
  assert.match(action, /user\.update\(\{ where: \{ id: userId \}/);
  assert.match(action, /assessment\.updateMany\(\{ where: \{ id: assessmentId, ownerId: userId \}/);
});

test("dashboard and assessment consume the authenticated user language", () => {
  assert.match(dashboard, /Workspace/);
  assert.match(dashboard, /My Clients/);
  assert.match(dashboard, /Search by name or identifier/);
  assert.match(dashboard, /No internal ID/);
  assert.match(assessmentPage, /appLanguage\(session\.user\.language\)/);
  assert.match(assessmentAction, /prisma\.user\.update/);
});

test("public authentication remains English-only and has no authenticated selector", () => {
  assert.doesNotMatch(publicAuth, /LanguageSelector|Idioma|Cerrar sesión|Mis clientes/);
  assert.match(publicAuth, /Sign in/);
});

test("authenticated client, tracking, comparison, profile, and navigation surfaces are bilingual", () => {
  for (const source of [clientDetail, tracking, comparison, profile, header]) {
    assert.match(source, /text\(language,/);
  }
  assert.match(clientDetail, /"Summary", "Resumen"/);
  assert.match(clientDetail, /"Latest Assessment", "Última evaluación"/);
  assert.match(tracking, /"Back to Client", "Volver al cliente"/);
  assert.match(comparison, /"Compare Assessments", "Comparar evaluaciones"/);
  assert.match(profile, /"Profile information", "Información de perfil"/);
});

test("global selector remains accessible and contains only the language code and chevron", () => {
  assert.match(selector, /aria-haspopup="menu"/);
  assert.match(selector, /aria-expanded=\{open\}/);
  assert.match(selector, /ChevronDown/);
  assert.doesNotMatch(selector, /Languages/);
  assert.match(selector, /\['EN', 'English'\]/);
  assert.match(selector, /\['ES', 'Español'\]/);
});
