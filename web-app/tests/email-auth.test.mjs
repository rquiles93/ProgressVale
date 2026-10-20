import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createBrevoRequest, deliverBrevoEmail, EmailDeliveryError, readBrevoConfiguration } from "../lib/brevo-email-core.ts";
import { validatePasswordReset } from "../lib/password-reset-validation.ts";

const authConfig = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const authEmails = readFileSync(new URL("../lib/auth-emails.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/actions/email-auth.ts", import.meta.url), "utf8");
const authForm = readFileSync(new URL("../components/auth-form.tsx", import.meta.url), "utf8");
const pendingPage = readFileSync(new URL("../app/verificar-correo/pendiente/page.tsx", import.meta.url), "utf8");
const emailAuthForms = readFileSync(new URL("../components/email-auth-forms.tsx", import.meta.url), "utf8");

test("Brevo configuration is fail-closed unless every required value exists", () => {
  assert.equal(readBrevoConfiguration({}), null);
  assert.equal(readBrevoConfiguration({ BREVO_API_KEY: "key", BREVO_SENDER_EMAIL: "sender@example.test" }), null);
  assert.deepEqual(readBrevoConfiguration({ BREVO_API_KEY: " key ", BREVO_SENDER_EMAIL: " sender@example.test ", BREVO_SENDER_NAME: " ProgressVale " }), { apiKey: "key", senderEmail: "sender@example.test", senderName: "ProgressVale" });
});

test("Brevo request contains only transactional email fields and keeps the key in a header", () => {
  const request = createBrevoRequest({ apiKey: "secret-key", senderEmail: "sender@example.test", senderName: "ProgressVale" }, { to: "user@example.test", subject: "Subject", htmlContent: "<p>Hello</p>", textContent: "Hello" });
  assert.equal(request.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers["api-key"], "secret-key");
  assert.doesNotMatch(String(request.init.body), /secret-key/);
  assert.deepEqual(JSON.parse(String(request.init.body)).to, [{ email: "user@example.test" }]);
});

test("Brevo delivery distinguishes success, missing config, network failure, and HTTP failure without exposing secrets", async () => {
  const config = { apiKey: "do-not-expose", senderEmail: "sender@example.test", senderName: "ProgressVale" };
  const message = { to: "user@example.test", subject: "Subject", htmlContent: "<p>Hello</p>", textContent: "Hello" };
  await assert.doesNotReject(deliverBrevoEmail(config, message, async () => new Response(null, { status: 201 })));
  for (const operation of [
    () => deliverBrevoEmail(null, message),
    () => deliverBrevoEmail(config, message, async () => { throw new Error("network detail"); }),
    () => deliverBrevoEmail(config, message, async () => new Response("provider detail", { status: 400 })),
  ]) {
    await assert.rejects(operation, (error) => error instanceof EmailDeliveryError && !error.message.includes("do-not-expose") && !error.message.includes("provider detail") && !error.message.includes("network detail"));
  }
  await assert.rejects(
    () => deliverBrevoEmail(config, message, (_url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new DOMException("timed out", "AbortError")))), 5),
    (error) => error instanceof EmailDeliveryError && error.reason === "delivery_failed" && !error.message.includes("timed out"),
  );
});

test("new credential users are persistently distinguished while legacy users default to exempt", () => {
  assert.match(schema, /emailVerificationRequired\s+Boolean\s+@default\(false\)/);
  assert.match(authConfig, /context\?\.path === "\/sign-up\/email"/);
  assert.match(authConfig, /emailVerificationRequired: true/);
  assert.match(authConfig, /user\?\.emailVerificationRequired && !user\.emailVerified/);
  assert.match(authConfig, /EMAIL_NOT_VERIFIED/);
});

test("verification and reset policy use the requested expirations and revoke sessions", () => {
  assert.match(authConfig, /expiresIn:\s*60 \* 60/);
  assert.match(authConfig, /resetPasswordTokenExpiresIn:\s*15 \* 60/);
  assert.match(authConfig, /revokeSessionsOnPasswordReset:\s*true/);
  assert.match(authConfig, /autoSignIn:\s*false/);
  assert.match(authEmails, /provider:\s*"credential", password:\s*\{ not: null \}/);
});

test("verification tokens are random, hashed at rest, consumed, and old links invalidated", () => {
  assert.match(authEmails, /randomBytes\(32\)/);
  assert.match(authEmails, /createHash\("sha256"\)/);
  assert.match(authEmails, /deleteMany\(\{ where: \{ identifier: record\.identifier \} \}\)/);
  assert.doesNotMatch(authEmails, /data:\s*\{ identifier, value: token,/);
});

test("public request actions return one enumeration-safe response and swallow provider details", () => {
  const occurrences = actions.match(/genericRequestMessage/g)?.length ?? 0;
  assert.ok(occurrences >= 3);
  assert.match(actions, /catch \{\}/);
  assert.doesNotMatch(actions, /USER_NOT_FOUND|account exists|no account/i);
});

test("credential form still has POST fallback and exposes recovery without GET credentials", () => {
  assert.match(authForm, /<form method="post"/);
  assert.match(authForm, /href="\/recuperar-contrasena"/);
  assert.doesNotMatch(authForm, /method="get"/i);
});

test("pending registration copy never claims that Brevo accepted or delivered an email", () => {
  assert.match(pendingPage, /registration request was accepted/);
  assert.doesNotMatch(pendingPage, /Enviamos un enlace|We sent a link|correo enviado|email sent/i);
});

test("password recovery success uses a neutral confirmation with same-tab sign-in navigation", () => {
  assert.match(emailAuthForms, /state\.status === "success"/);
  assert.match(emailAuthForms, /Check your email/);
  assert.match(emailAuthForms, /If an eligible account exists/);
  assert.match(emailAuthForms, /valid for 15 minutes/);
  assert.match(emailAuthForms, /<Link href="\/login"/);
  assert.doesNotMatch(emailAuthForms, /target="_blank"|window\.open\(|window\.close\(/);
});

test("password reset validation distinguishes length, mismatch, and policy errors", () => {
  assert.deepEqual(validatePasswordReset("short", "different"), {
    password: "Password must be at least 12 characters.",
    confirmation: "Passwords do not match.",
  });
  assert.deepEqual(validatePasswordReset("abcdefghijkl", "abcdefghijkl"), {
    password: "Password must include at least one letter and one number.",
  });
  assert.deepEqual(validatePasswordReset("SecurePassword12", "SecurePassword12"), {});
});

test("both reset fields are masked independently and expose accessible controls", () => {
  assert.match(emailAuthForms, /showPassword, setShowPassword\] = useState\(false\)/);
  assert.match(emailAuthForms, /showConfirmation, setShowConfirmation\] = useState\(false\)/);
  assert.match(emailAuthForms, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(emailAuthForms, /type=\{showConfirmation \? "text" : "password"\}/);
  assert.match(emailAuthForms, /Hide new password.*Show new password/);
  assert.match(emailAuthForms, /Hide confirmation password.*Show confirmation password/);
  assert.match(emailAuthForms, /aria-describedby=\{errors\.password/);
  assert.match(emailAuthForms, /aria-describedby=\{errors\.confirmation/);
});
