"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";
import { isAppLanguage, type AppLanguage } from "@/lib/language";

export async function updateLanguagePreferenceAction(language: AppLanguage, assessmentId?: string) {
  const userId = await requireUserId();
  if (!isAppLanguage(language)) return { status: "error" as const };
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({ where: { id: userId }, data: { language } });
      if (assessmentId) {
        const updated = await transaction.assessment.updateMany({ where: { id: assessmentId, ownerId: userId }, data: { language } });
        if (updated.count !== 1) throw new Error("ASSESSMENT_NOT_FOUND");
      }
    });
    revalidatePath("/clientes", "layout");
    return { status: "success" as const };
  } catch {
    return { status: "error" as const };
  }
}
