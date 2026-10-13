import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  appName: "ABLLS-R",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: {
    modelName: "User",
    fields: { name: "displayName" },
  },
  account: {
    modelName: "AuthIdentity",
    fields: {
      accountId: "providerAccountId",
      providerId: "provider",
    },
    encryptOAuthTokens: true,
  },
  session: {
    modelName: "Session",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  verification: { modelName: "Verification" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    storage: "database",
    modelName: "RateLimit",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 5 },
    },
  },
  advanced: {
    cookiePrefix: "ablls",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  plugins: [nextCookies()],
});
