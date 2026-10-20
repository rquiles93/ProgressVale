import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const publicSources = [
  "components/auth-form.tsx",
  "components/auth-email-page.tsx",
  "components/email-auth-forms.tsx",
  "app/recuperar-contrasena/page.tsx",
  "app/restablecer-contrasena/page.tsx",
  "app/verificar-correo/page.tsx",
  "app/verificar-correo/pendiente/page.tsx",
].map(source).join("\n");

test("public authentication UI uses ProgressVale branding and English-only copy", () => {
  assert.match(source("components/ui.tsx"), /ProgressVale/);
  assert.match(source("components/ui.tsx"), /"Evaluation & Tracking", "Evaluación y seguimiento"/);
  assert.match(source("components/ui.tsx"), /language = "EN"/);
  assert.match(source("app/layout.tsx"), /ProgressVale — Evaluation & Tracking/);
  assert.match(source("lib/auth.ts"), /appName: "ProgressVale"/);
  assert.doesNotMatch(publicSources, /ABLLS-R|Español|Correo|Contraseña|Iniciar sesión|Verifica tu|Recuperar contraseña|Restablecer/);
});

test("transactional authentication emails are ProgressVale-branded and English only", () => {
  const emails = source("lib/auth-emails.ts");
  assert.match(emails, /Verify your ProgressVale email/);
  assert.match(emails, /Reset your ProgressVale password/);
  assert.doesNotMatch(emails, /ABLLS-R|Español|Verifica tu|Restablece tu/);
});

test("ABLLS-R remains the named assessment instrument", () => {
  const assessment = source("components/assessment.tsx");
  assert.match(assessment, /25 ABLLS-R sections/);
  assert.match(assessment, /25 secciones ABLLS-R/);
});
