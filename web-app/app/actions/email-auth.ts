"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { appLanguage, text } from "@/lib/language";

export type EmailAuthState = { status: "idle" | "success" | "error"; message: string };

const genericRequestMessage = "If the account is eligible and email delivery is available, you will receive a link.";

function emailFrom(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

export async function requestVerificationEmailAction(_: EmailAuthState, formData: FormData): Promise<EmailAuthState> {
  const email = emailFrom(formData);
  if (!email) return { status: "error", message: "Enter a valid email." };
  try {
    await auth.api.sendVerificationEmail({ body: { email, callbackURL: "/login?verified=1" }, headers: await headers() });
  } catch {}
  return { status: "success", message: genericRequestMessage };
}

export async function requestPasswordResetAction(_: EmailAuthState, formData: FormData): Promise<EmailAuthState> {
  const email = emailFrom(formData);
  if (!email) return { status: "error", message: "Enter a valid email." };
  try {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: "/restablecer-contrasena" }, headers: await headers() });
  } catch {}
  return { status: "success", message: genericRequestMessage };
}

export async function resendOwnVerificationAction(_: EmailAuthState): Promise<EmailAuthState> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, emailVerified: true, language: true } });
  const language = appLanguage(user?.language);
  if (!user || user.emailVerified) return { status: "success", message: text(language, "Email is already verified.", "El correo ya está verificado.") };
  try {
    await auth.api.sendVerificationEmail({ body: { email: user.email, callbackURL: "/perfil" }, headers: await headers() });
    return { status: "success", message: text(language, "Link requested. Check your email.", "Enlace solicitado. Revisa tu correo.") };
  } catch {
    return { status: "error", message: text(language, "The link could not be sent. Try again later.", "No se pudo enviar el enlace. Inténtalo más tarde.") };
  }
}
