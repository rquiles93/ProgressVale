import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";

const baseURL = process.env.AUTH_TEST_BASE_URL;
const databaseURL = process.env.AUTH_TEST_DATABASE_URL;
const passwordOne = "Ficticia-2026-Segura1";
const passwordTwo = "Ficticia-2026-Segura2";

function assertIsolation() {
  const origin = new URL(baseURL ?? "invalid:");
  const database = new URL(databaseURL ?? "invalid:");
  assert.ok(["localhost", "127.0.0.1"].includes(origin.hostname));
  assert.ok(!["3000", "3001"].includes(origin.port));
  assert.ok(["localhost", "127.0.0.1"].includes(database.hostname));
  assert.equal(database.port, "5433");
  assert.match(database.pathname.slice(1), /^progressvale_auth_test_[a-z0-9_]+$/);
  assert.notEqual(database.pathname.slice(1), "ablls_db");
  assert.equal(process.env.BREVO_API_KEY, "");
  assert.equal(process.env.BREVO_SENDER_EMAIL, "");
}
assertIsolation();

async function request(path, { cookie, body, ip = "198.51.100.20" } = {}) {
  return fetch(`${baseURL}${path}`, { method: body ? "POST" : "GET", headers: { origin: baseURL, "x-forwarded-for": ip, ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
}
function cookie(response) { return (response.headers.getSetCookie?.()[0] ?? response.headers.get("set-cookie") ?? "").split(";", 1)[0]; }
async function createVerificationToken(db, userId, { expired = false } = {}) { const raw = randomBytes(32).toString("base64url"); const hash = createHash("sha256").update(raw).digest("hex"); await db.query(`INSERT INTO "Verification" (id,identifier,value,"expiresAt","createdAt","updatedAt") VALUES ($1,$2,$3,NOW()+($4::text)::interval,NOW(),NOW())`, [`verify-${randomUUID()}`, `progressvale-email-verification:${userId}`, hash, expired ? "-1 minute" : "60 minutes"]); return raw; }
async function createResetToken(db, userId, { expired = false } = {}) { const raw = randomUUID().replaceAll("-", ""); await db.query(`INSERT INTO "Verification" (id,identifier,value,"expiresAt","createdAt","updatedAt") VALUES ($1,$2,$3,NOW()+($4::text)::interval,NOW(),NOW())`, [`reset-${randomUUID()}`, `reset-password:${raw}`, userId, expired ? "-1 minute" : "15 minutes"]); return raw; }

test("isolated verification and legacy authentication lifecycle", async () => {
  const db = new pg.Client({ connectionString: databaseURL }); await db.connect();
  const id = randomUUID(); const email = `new-${id}@example.invalid`; const otherEmail = `other-${id}@example.invalid`; const legacyEmail = `legacy-${id}@example.invalid`;
  try {
    const signup = await request("/api/auth/sign-up/email", { body: { name: "Nueva QA", email, password: passwordOne } });
    assert.equal(signup.status, 200); assert.equal(cookie(signup), "");
    const user = (await db.query(`SELECT id, "emailVerified", "emailVerificationRequired" FROM "User" WHERE email=$1`, [email])).rows[0];
    assert.equal(user.emailVerified, false); assert.equal(user.emailVerificationRequired, true);
    const blocked = await request("/api/auth/sign-in/email", { body: { email, password: passwordOne } }); assert.equal(blocked.status, 403); assert.equal(cookie(blocked), "");
    const protectedRoute = await request("/clientes"); assert.equal(protectedRoute.status, 307); assert.equal(protectedRoute.headers.get("location"), "/login");

    await request("/api/auth/sign-up/email", { body: { name: "Otra QA", email: otherEmail, password: passwordOne }, ip: "198.51.100.21" });
    const validToken = await createVerificationToken(db, user.id); const verificationURL = `${baseURL}/verificar-correo?token=${validToken}`; const verified = await fetch(verificationURL); assert.match(await verified.text(), /Correo verificado|Email verified/);
    assert.equal((await db.query(`SELECT "emailVerified" FROM "User" WHERE email=$1`, [otherEmail])).rows[0].emailVerified, false);
    const replay = await fetch(verificationURL); assert.match(await replay.text(), /ya fue usado|already been used/);

    const expiredToken = await createVerificationToken(db, user.id, { expired: true });
    const expired = await fetch(`${baseURL}/verificar-correo?token=${expiredToken}`); assert.match(await expired.text(), /expir[oó]|expired/i);

    await request("/api/auth/sign-up/email", { body: { name: "Legacy QA", email: legacyEmail, password: passwordOne }, ip: "198.51.100.22" });
    const legacyId = (await db.query(`UPDATE "User" SET "emailVerificationRequired"=false WHERE email=$1 RETURNING id`, [legacyEmail])).rows[0].id;
    const legacyLogin = await request("/api/auth/sign-in/email", { body: { email: legacyEmail, password: passwordOne }, ip: "198.51.100.23" }); assert.equal(legacyLogin.status, 200);
    const legacy = (await db.query(`SELECT id,"emailVerified","emailVerificationRequired" FROM "User" WHERE email=$1`, [legacyEmail])).rows[0];
    assert.deepEqual(legacy, { id: legacyId, emailVerified: false, emailVerificationRequired: false });
  } finally { await db.end(); }
});

test("isolated password recovery, sessions, OAuth preservation, enumeration and throttling", async () => {
  const db = new pg.Client({ connectionString: databaseURL }); await db.connect();
  const id = randomUUID(); const email = `reset-${id}@example.invalid`; const googleEmail = `google-${id}@example.invalid`;
  try {
    await request("/api/auth/sign-up/email", { body: { name: "Reset QA", email, password: passwordOne }, ip: "198.51.100.30" });
    const userId = (await db.query(`SELECT id FROM "User" WHERE email=$1`, [email])).rows[0].id;
    await fetch(`${baseURL}/verificar-correo?token=${await createVerificationToken(db, userId)}`);
    await db.query(`INSERT INTO "AuthIdentity" (id,"userId",provider,"providerAccountId","createdAt","updatedAt") VALUES ($1,$2,'google',$3,NOW(),NOW())`, [`linked-${id}`, userId, `provider-${id}`]);
    const login1 = await request("/api/auth/sign-in/email", { body: { email, password: passwordOne }, ip: "198.51.100.31" }); const login2 = await request("/api/auth/sign-in/email", { body: { email, password: passwordOne }, ip: "198.51.100.32" });
    const cookie1 = cookie(login1); const cookie2 = cookie(login2); assert.ok(cookie1 && cookie2);

    const resetToken = await createResetToken(db, userId);
    const reset = await request("/api/auth/reset-password", { body: { token: resetToken, newPassword: passwordTwo }, ip: "198.51.100.34" }); assert.equal(reset.status, 200);
    const replay = await request("/api/auth/reset-password", { body: { token: resetToken, newPassword: passwordOne }, ip: "198.51.100.35" }); assert.ok(replay.status >= 400);
    for (const oldCookie of [cookie1, cookie2]) assert.equal(await (await request("/api/auth/get-session", { cookie: oldCookie })).json(), null);
    assert.ok((await request("/api/auth/sign-in/email", { body: { email, password: passwordOne }, ip: "198.51.100.36" })).status >= 400);
    assert.equal((await request("/api/auth/sign-in/email", { body: { email, password: passwordTwo }, ip: "198.51.100.37" })).status, 200);
    assert.equal((await db.query(`SELECT COUNT(*)::int count FROM "AuthIdentity" WHERE "userId"=$1 AND provider='google'`, [userId])).rows[0].count, 1);

    const expiredToken = await createResetToken(db, userId, { expired: true });
    assert.ok((await request("/api/auth/reset-password", { body: { token: expiredToken, newPassword: passwordOne }, ip: "198.51.100.39" })).status >= 400);

    const googleId = `google-only-${id}`; await db.query(`INSERT INTO "User" (id,email,"displayName","emailVerified","emailVerificationRequired","createdAt","updatedAt") VALUES ($1,$2,'Google QA',true,false,NOW(),NOW())`, [googleId, googleEmail]);
    await db.query(`INSERT INTO "AuthIdentity" (id,"userId",provider,"providerAccountId","createdAt","updatedAt") VALUES ($1,$2,'google',$3,NOW(),NOW())`, [`google-account-${id}`, googleId, `google-only-provider-${id}`]);
    const googleResponse = await request("/api/auth/request-password-reset", { body: { email: googleEmail, redirectTo: "/restablecer-contrasena" }, ip: "198.51.100.40" });
    const absentResponse = await request("/api/auth/request-password-reset", { body: { email: `absent-${id}@example.invalid`, redirectTo: "/restablecer-contrasena" }, ip: "198.51.100.41" });
    assert.deepEqual(await googleResponse.json(), await absentResponse.json());
    assert.equal((await db.query(`SELECT COUNT(*)::int count FROM "AuthIdentity" WHERE "userId"=$1 AND provider='credential'`, [googleId])).rows[0].count, 0);

    const other = `cooldown-${id}@example.invalid`; await request("/api/auth/sign-up/email", { body: { name: "Cooldown QA", email: other, password: passwordOne }, ip: "198.51.100.42" });
    await request("/api/auth/send-verification-email", { body: { email: other, callbackURL: "/login" }, ip: "198.51.100.43" });
    await request("/api/auth/send-verification-email", { body: { email: other, callbackURL: "/login" }, ip: "198.51.100.43" });
    assert.ok((await db.query(`SELECT COUNT(*)::int count FROM "EmailActionThrottle" WHERE key LIKE 'email-action:verify:%'`)).rows[0].count >= 2);
  } finally { await db.end(); }
});

test("unavailable email provider cannot grant access", async () => {
  const db = new pg.Client({ connectionString: databaseURL }); await db.connect(); const id = randomUUID(); const email = `failure-${id}@example.invalid`;
  try {
    const signup = await request("/api/auth/sign-up/email", { body: { name: "Failure QA", email, password: passwordOne }, ip: "198.51.100.50" }); assert.equal(signup.status, 200); assert.equal(cookie(signup), "");
    const user = (await db.query(`SELECT "emailVerified","emailVerificationRequired" FROM "User" WHERE email=$1`, [email])).rows[0]; assert.deepEqual(user, { emailVerified: false, emailVerificationRequired: true });
    assert.equal((await request("/clientes")).status, 307);
    const pending = await request("/verificar-correo/pendiente"); const copy = await pending.text(); assert.match(copy, /registration request was accepted/i); assert.doesNotMatch(copy, /Enviamos un enlace|We sent a link/i); assert.match(copy, /Send link/);
    assert.equal((await db.query(`SELECT COUNT(*)::int count FROM "User" WHERE email=$1`, [email])).rows[0].count, 1);
  } finally { await db.end(); }
});
