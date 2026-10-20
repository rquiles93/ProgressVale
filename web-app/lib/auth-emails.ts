import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendBrevoTransactionalEmail } from "@/lib/brevo-email";
import { enforceEmailActionLimit, requestIPAddress } from "@/lib/email-action-throttle";

const VERIFICATION_PREFIX = "progressvale-email-verification:";
const VERIFICATION_TTL_MS = 60 * 60 * 1000;

type AuthEmailUser = { id: string; email: string; name?: string };

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function applicationBaseURL() {
  const value = process.env.BETTER_AUTH_URL?.trim();
  if (!value) throw new Error("BETTER_AUTH_URL is required for authentication emails.");
  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("Authentication email links require HTTPS in production.");
  if (process.env.NODE_ENV !== "production" && url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("HTTP authentication email links are limited to localhost development.");
  return url.origin;
}

function safeLink(url: string) {
  return url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function sendOneTimeVerificationEmail(user: AuthEmailUser, request?: Request) {
  if (request) await enforceEmailActionLimit("verify", user.email, requestIPAddress(request.headers));
  const token = randomBytes(32).toString("base64url");
  const identifier = `${VERIFICATION_PREFIX}${user.id}`;
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

  const record = await prisma.verification.create({ data: { identifier, value: tokenHash(token), expiresAt } });

  const url = `${applicationBaseURL()}/verificar-correo?token=${encodeURIComponent(token)}`;
  try {
    await sendBrevoTransactionalEmail({
      to: user.email,
      subject: "Verify your ProgressVale email",
      textContent: `Verify your ProgressVale email with this link (valid for 60 minutes): ${url}`,
      htmlContent: `<p>Verify your ProgressVale email. This link expires in 60 minutes.</p><p><a href="${safeLink(url)}">Verify email</a></p>`,
    });
    await prisma.verification.deleteMany({ where: { identifier, id: { not: record.id } } });
  } catch (error) {
    await prisma.verification.deleteMany({ where: { id: record.id } }).catch(() => {});
    throw error;
  }
}

export async function consumeOneTimeVerificationToken(token: string): Promise<"verified" | "expired" | "invalid"> {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return "invalid";
  const hash = tokenHash(token);
  return prisma.$transaction(async (tx) => {
    const record = await tx.verification.findFirst({ where: { identifier: { startsWith: VERIFICATION_PREFIX }, value: hash } });
    if (!record) return "invalid";
    await tx.verification.deleteMany({ where: { identifier: record.identifier } });
    if (record.expiresAt <= new Date()) return "expired";
    const userId = record.identifier.slice(VERIFICATION_PREFIX.length);
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return "invalid";
    await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    return "verified";
  }, { isolationLevel: "Serializable" });
}

export async function sendPasswordResetEmail({ user, url, token }: { user: AuthEmailUser; url: string; token: string }, request?: Request) {
  if (request) await enforceEmailActionLimit("reset", user.email, requestIPAddress(request.headers));
  const credential = await prisma.authIdentity.findFirst({ where: { userId: user.id, provider: "credential", password: { not: null } }, select: { id: true } });
  if (!credential) {
    await prisma.verification.deleteMany({ where: { identifier: `reset-password:${token}` } });
    return;
  }
  try {
    await sendBrevoTransactionalEmail({
      to: user.email,
      subject: "Reset your ProgressVale password",
      textContent: `Reset your ProgressVale password with this link (valid for 15 minutes): ${url}`,
      htmlContent: `<p>Use this link to reset your ProgressVale password. It expires in 15 minutes.</p><p><a href="${safeLink(url)}">Reset password</a></p>`,
    });
  } catch (error) {
    await prisma.verification.deleteMany({ where: { identifier: `reset-password:${token}` } }).catch(() => {});
    throw error;
  }
}
