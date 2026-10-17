import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import "dotenv/config";
import pg from "pg";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const passwordOne = "Ficticia-2026-Segura1";
const passwordTwo = "Ficticia-2026-Segura2";
const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

async function request(path, { cookie, body, redirect = "follow" } = {}) {
  return fetch(`${baseURL}/api/auth${path}`, {
    method: body ? "POST" : "GET",
    headers: { origin: baseURL, "x-forwarded-for": testIp, ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect,
  });
}

function sessionCookie(response) {
  const raw = response.headers.getSetCookie?.()[0] ?? response.headers.get("set-cookie") ?? "";
  return raw.split(";", 1)[0];
}

test("email/password account lifecycle and ownership protection", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  const token = randomUUID();
  const emailA = `auth-a-${token}@example.invalid`;
  const emailB = `auth-b-${token}@example.invalid`;
  const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await database.connect();
  try {
    const signupA = await request("/sign-up/email", { body: { name: "Cuenta QA A", email: emailA, password: passwordOne } });
    assert.equal(signupA.status, 200);
    const cookieA = sessionCookie(signupA);
    assert.ok(cookieA.includes("="));

    const signupB = await request("/sign-up/email", { body: { name: "Cuenta QA B", email: emailB, password: passwordOne } });
    assert.equal(signupB.status, 200);
    const cookieB = sessionCookie(signupB);

    const duplicate = await request("/sign-up/email", { body: { name: "Duplicada", email: emailA, password: passwordOne } });
    assert.ok(duplicate.status >= 400);

    const identity = await database.query(
      `SELECT ai.password, u.id FROM "AuthIdentity" ai JOIN "User" u ON u.id = ai."userId" WHERE u.email = $1 AND ai.provider = 'credential'`,
      [emailA],
    );
    assert.equal(identity.rowCount, 1);
    assert.notEqual(identity.rows[0].password, passwordOne);
    assert.ok(identity.rows[0].password.length > passwordOne.length);
    const ownerA = identity.rows[0].id;

    const invalid = await request("/sign-in/email", { body: { email: emailA, password: "Incorrecta-2026-000" } });
    assert.ok(invalid.status >= 400);

    const session = await request("/get-session", { cookie: cookieA });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).user.email, emailA);

    const update = await request("/update-user", { cookie: cookieA, body: { name: "Cuenta QA Actualizada" } });
    assert.equal(update.status, 200);
    const updatedName = await database.query(`SELECT "displayName" FROM "User" WHERE id = $1`, [ownerA]);
    assert.equal(updatedName.rows[0].displayName, "Cuenta QA Actualizada");

    const wrongChange = await request("/change-password", { cookie: cookieA, body: { currentPassword: "Incorrecta-2026-000", newPassword: passwordTwo, revokeOtherSessions: true } });
    assert.ok(wrongChange.status >= 400);
    const changed = await request("/change-password", { cookie: cookieA, body: { currentPassword: passwordOne, newPassword: passwordTwo, revokeOtherSessions: true } });
    assert.equal(changed.status, 200);

    const oldLogin = await request("/sign-in/email", { body: { email: emailA, password: passwordOne } });
    assert.ok(oldLogin.status >= 400);
    const newLogin = await request("/sign-in/email", { body: { email: emailA, password: passwordTwo } });
    assert.equal(newLogin.status, 200);
    const newCookieA = sessionCookie(newLogin);

    const clientId = `auth-client-${token}`;
    const now = new Date();
    await database.query(
      `INSERT INTO "Client" (id, "ownerId", name, identifier, "serviceSettings", "createdAt", "updatedAt") VALUES ($1, $2, 'Cliente QA aislado', 'AUTH-QA', ARRAY['HOME']::"ServiceSetting"[], $3, $3)`,
      [clientId, ownerA, now],
    );
    const unauthorized = await fetch(`${baseURL}/clientes`, { redirect: "manual" });
    assert.ok([302, 303, 307, 308].includes(unauthorized.status));
    assert.match(unauthorized.headers.get("location") ?? "", /\/login/);
    const otherOwnerPage = await fetch(`${baseURL}/clientes/${clientId}`, { headers: { cookie: cookieB }, redirect: "manual" });
    assert.equal(otherOwnerPage.status, 404);
    const ownerPage = await fetch(`${baseURL}/clientes/${clientId}`, { headers: { cookie: newCookieA } });
    assert.equal(ownerPage.status, 200);

    const signout = await request("/sign-out", { cookie: newCookieA, body: {} });
    assert.equal(signout.status, 200);
    const revoked = await request("/get-session", { cookie: newCookieA });
    assert.equal(await revoked.json(), null);
  } finally {
    await database.query(`DELETE FROM "User" WHERE email = ANY($1::text[])`, [[emailA, emailB]]).catch(() => {});
    await database.end();
  }
});
