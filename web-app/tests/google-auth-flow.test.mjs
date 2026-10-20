import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  GOOGLE_ACCOUNT_NOT_LINKED,
  GOOGLE_UNVERIFIED_EMAIL,
  googleOAuthConfigured,
  googleOAuthErrorMessage,
  normalizeGoogleOAuthError,
  requiresGoogleAccountLink,
  validateGoogleOAuthUserInfo,
} from "../lib/google-auth-flow.ts";

const authConfig = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
const authForm = readFileSync(new URL("../components/auth-form.tsx", import.meta.url), "utf8");
const profileForm = readFileSync(new URL("../components/profile-form.tsx", import.meta.url), "utf8");
const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

const googleValidation = (emailVerified, action = "create-user") => validateGoogleOAuthUserInfo({
  user: { emailVerified },
  source: { action, method: "oauth", oauth: { providerId: "google" } },
});

test("Google is enabled only when both non-empty credentials exist", () => {
  assert.equal(googleOAuthConfigured("client", "secret"), true);
  assert.equal(googleOAuthConfigured("client", "  "), false);
  assert.equal(googleOAuthConfigured(undefined, "secret"), false);
});

test("verified Google identities pass create, link, and returning sign-in validation", () => {
  assert.equal(googleValidation(true, "create-user"), undefined);
  assert.equal(googleValidation(true, "link-account"), undefined);
  assert.equal(googleValidation(true, "sign-in"), undefined);
});

test("unverified Google identities fail closed for create, link, and sign-in", () => {
  for (const action of ["create-user", "link-account", "sign-in"]) {
    assert.equal(googleValidation(false, action)?.error, GOOGLE_UNVERIFIED_EMAIL);
  }
  assert.equal(googleValidation(undefined)?.error, GOOGLE_UNVERIFIED_EMAIL);
});

test("the verified-email gate does not alter password or other-provider authentication", () => {
  assert.equal(validateGoogleOAuthUserInfo({ user: { emailVerified: false }, source: { method: "email-password" } }), undefined);
  assert.equal(validateGoogleOAuthUserInfo({ user: { emailVerified: false }, source: { method: "oauth", oauth: { providerId: "github" } } }), undefined);
});

test("same-email rejection enters the explicit password-confirmed linking flow", () => {
  assert.equal(normalizeGoogleOAuthError(GOOGLE_ACCOUNT_NOT_LINKED), GOOGLE_ACCOUNT_NOT_LINKED);
  assert.equal(requiresGoogleAccountLink(GOOGLE_ACCOUNT_NOT_LINKED), true);
  assert.equal(requiresGoogleAccountLink(undefined, true), true);
  assert.equal(requiresGoogleAccountLink("access_denied"), false);
});

test("OAuth errors are allowlisted and exposed as safe English messages", () => {
  assert.equal(normalizeGoogleOAuthError("secret-provider-detail"), "oauth_error");
  assert.equal(normalizeGoogleOAuthError(["access_denied", "invalid_code"]), "access_denied");
  assert.match(googleOAuthErrorMessage("access_denied"), /cancel/i);
  assert.doesNotMatch(googleOAuthErrorMessage("oauth_error"), /secret-provider-detail/);
});

test("Better Auth keeps implicit linking off and validates Google identities", () => {
  assert.match(authConfig, /disableImplicitLinking:\s*true/);
  assert.match(authConfig, /allowDifferentEmails:\s*false/);
  assert.match(authConfig, /validateUserInfo:\s*validateGoogleOAuthUserInfo/);
  assert.match(authConfig, /encryptOAuthTokens:\s*true/);
  assert.match(authConfig, /scope:\s*\["openid",\s*"email",\s*"profile"\]/);
});

test("provider identity uniqueness prevents cross-user duplicate Google links", () => {
  assert.match(schema, /@@unique\(\[provider, providerAccountId\]\)/);
  assert.match(schema, /email\s+String\s+@unique/);
});

test("login confirms a password before routing to the authenticated linking step", () => {
  assert.match(authForm, /needsGoogleLink \? "\/perfil\?linkGoogle=1" : "\/clientes"/);
  assert.match(authForm, /authClient\.signIn\.email/);
  assert.match(profileForm, /authClient\.linkSocial/);
  assert.match(profileForm, /authClient\.linkSocial/);
});

test("Google sign-in supports new users and routes callback failures safely", () => {
  assert.match(authForm, /newUserCallbackURL:\s*"\/clientes"/);
  assert.match(authForm, /errorCallbackURL:\s*"\/login\?oauth=google"/);
  assert.doesNotMatch(authForm, /GOOGLE_CLIENT_SECRET/);
});

test("credential forms retain safe POST fallback and ordinary registration/login", () => {
  assert.match(authForm, /<form method="post"/);
  assert.match(authForm, /authClient\.signUp\.email/);
  assert.match(authForm, /authClient\.signIn\.email/);
  assert.doesNotMatch(authForm, /method="get"/i);
});
