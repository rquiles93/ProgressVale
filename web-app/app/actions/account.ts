"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export type AccountActionState = { status: "idle" | "success" | "error"; message: string };

export async function updateProfileNameAction(_previous: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 100 || /[\u0000-\u001F\u007F]/.test(name)) return { status: "error", message: "El nombre debe tener entre 2 y 100 caracteres válidos." };
  await prisma.user.update({ where: { id: userId }, data: { displayName: name } });
  revalidatePath("/perfil");
  return { status: "success", message: "Nombre actualizado." };
}

export async function changePasswordAction(_previous: AccountActionState, formData: FormData): Promise<AccountActionState> {
  await requireUserId();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (newPassword.length < 12 || newPassword.length > 128 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(newPassword) || !/\d/.test(newPassword)) return { status: "error", message: "Usa entre 12 y 128 caracteres, con al menos una letra y un número." };
  if (newPassword !== confirmation) return { status: "error", message: "Las contraseñas nuevas no coinciden." };
  if (newPassword === currentPassword) return { status: "error", message: "La contraseña nueva debe ser diferente de la actual." };
  try {
    await auth.api.changePassword({ headers: await headers(), body: { currentPassword, newPassword, revokeOtherSessions: true } });
    return { status: "success", message: "Contraseña actualizada. Las demás sesiones fueron cerradas." };
  } catch {
    return { status: "error", message: "No se pudo cambiar la contraseña. Verifica la contraseña actual." };
  }
}
