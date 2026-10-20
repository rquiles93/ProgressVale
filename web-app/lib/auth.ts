import "server-only";

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { betterAuthBaseURL } from "@/lib/auth-origin";
import { googleOAuthConfigured, validateGoogleOAuthUserInfo } from "@/lib/google-auth-flow";
import { sendOneTimeVerificationEmail, sendPasswordResetEmail } from "@/lib/auth-emails";

const googleEnabled = googleOAuthConfigured(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  appName: "ProgressVale",
  baseURL: betterAuthBaseURL(),
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: {
    modelName: "User",
    fields: { name: "displayName" },
    validateUserInfo: validateGoogleOAuthUserInfo,
    additionalFields: {
      emailVerificationRequired: { type: "boolean", defaultValue: false, input: false },
    },
  },
  account: {
    modelName: "AuthIdentity",
    fields: {
      accountId: "providerAccountId",
      providerId: "provider",
    },
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
      updateUserInfoOnLink: false,
    },
  },
  socialProviders: googleEnabled ? {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      disableDefaultScope: true,
      scope: ["openid", "email", "profile"],
      includeGrantedScopes: false,
      prompt: "select_account",
    },
  } : undefined,
  session: {
    modelName: "Session",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  verification: { modelName: "Verification" },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user }, request) => sendOneTimeVerificationEmail(user, request),
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
    resetPasswordTokenExpiresIn: 15 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: sendPasswordResetEmail,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => context?.path === "/sign-up/email"
          ? { data: { ...user, emailVerificationRequired: true } }
          : undefined,
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { emailVerified: true, emailVerificationRequired: true } });
          if (user?.emailVerificationRequired && !user.emailVerified) {
            throw new APIError("FORBIDDEN", { code: "EMAIL_NOT_VERIFIED", message: "Email verification is required." });
          }
        },
      },
    },
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
      "/send-verification-email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 5 },
      "/reset-password": { window: 300, max: 5 },
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
