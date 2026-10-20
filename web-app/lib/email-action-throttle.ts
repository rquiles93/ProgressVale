import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;

export class EmailActionRateLimitError extends Error {
  constructor(public readonly reason: "cooldown" | "rate_limit") {
    super("Email action is temporarily rate limited.");
  }
}

function fingerprint(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function enforceEmailActionLimit(action: "verify" | "reset", email: string, ipAddress: string, now = new Date()) {
  const keys = [
    { key: `email-action:${action}:email:${fingerprint(email)}`, limit: 5, cooldown: true },
    { key: `email-action:${action}:ip:${fingerprint(ipAddress || "unknown")}`, limit: 10, cooldown: false },
  ];

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of keys) {
        const existing = await tx.emailActionThrottle.findUnique({ where: { key: item.key } });
        if (existing && item.cooldown && now.getTime() - existing.lastAttemptAt.getTime() < 60_000) throw new EmailActionRateLimitError("cooldown");

        const withinWindow = existing && now.getTime() - existing.windowStartedAt.getTime() < WINDOW_MS;
        const nextCount = withinWindow ? existing.count + 1 : 1;
        if (nextCount > item.limit) throw new EmailActionRateLimitError("rate_limit");

        await tx.emailActionThrottle.upsert({
          where: { key: item.key },
          create: { key: item.key, count: 1, windowStartedAt: now, lastAttemptAt: now },
          update: { count: nextCount, windowStartedAt: withinWindow ? existing.windowStartedAt : now, lastAttemptAt: now },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof EmailActionRateLimitError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new EmailActionRateLimitError("cooldown");
    throw error;
  }
}

export function requestIPAddress(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "unknown";
}
