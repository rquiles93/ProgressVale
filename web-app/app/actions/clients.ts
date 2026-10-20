"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";
import type { ServiceSettingValue } from "@/lib/ablls-content";
import { appLanguage, text, type AppLanguage } from "@/lib/language";

export type ClientActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const validSettings = new Set<ServiceSettingValue>(["HOME", "SCHOOL", "CLINIC_BASED"]);

function validateClient(formData: FormData, language: AppLanguage): { ok: true; name: string; identifier: string | null; serviceSettings: ServiceSettingValue[] } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const rawIdentifier = String(formData.get("identifier") ?? "").trim();
  const identifier = rawIdentifier ? rawIdentifier.toUpperCase() : null;
  const serviceSettings = [...new Set(formData.getAll("serviceSettings").map(String))].filter((value): value is ServiceSettingValue => validSettings.has(value as ServiceSettingValue));

  if (!name || name.length > 100 || /[\u0000-\u001F\u007F]/.test(name)) {
    return { ok: false, error: text(language, "Enter a valid name up to 100 characters.", "Escribe un nombre válido de hasta 100 caracteres.") };
  }
  if (identifier && (identifier.length > 50 || /[\u0000-\u001F\u007F]/.test(identifier))) {
    return { ok: false, error: text(language, "The identifier must contain no more than 50 valid characters.", "El identificador debe tener hasta 50 caracteres válidos.") };
  }
  if (serviceSettings.length === 0) {
    return { ok: false, error: text(language, "Select at least one Service Setting.", "Selecciona al menos un Service Setting.") };
  }
  return { ok: true, name, identifier, serviceSettings };
}

function clientError(error: unknown, language: AppLanguage): ClientActionState {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { status: "error", message: text(language, "A client with that identifier already exists.", "Ya existe un cliente con ese identificador.") };
  }
  return { status: "error", message: text(language, "The client could not be saved. Try again.", "No se pudo guardar el cliente. Inténtalo de nuevo.") };
}

async function userLanguage(userId: string) { return appLanguage((await prisma.user.findUnique({ where: { id: userId }, select: { language: true } }))?.language); }

export async function createClientAction(_state: ClientActionState, formData: FormData): Promise<ClientActionState> {
  const ownerId = await requireUserId();
  const language = await userLanguage(ownerId);
  const input = validateClient(formData, language);
  if (!input.ok) return { status: "error", message: input.error };

  try {
    await prisma.client.create({ data: { name: input.name, identifier: input.identifier, serviceSettings: input.serviceSettings, ownerId } });
    revalidatePath("/clientes");
    return { status: "success", message: text(language, "Client created.", "Cliente creado.") };
  } catch (error) {
    return clientError(error, language);
  }
}

export async function updateClientAction(_state: ClientActionState, formData: FormData): Promise<ClientActionState> {
  const ownerId = await requireUserId();
  const language = await userLanguage(ownerId);
  const clientId = String(formData.get("clientId") ?? "");
  const input = validateClient(formData, language);
  if (!clientId || !input.ok) {
    return { status: "error", message: !input.ok ? input.error : text(language, "Client not found.", "No se encontró el cliente.") };
  }

  try {
    await prisma.client.update({
      where: { id_ownerId: { id: clientId, ownerId } },
      data: { name: input.name, identifier: input.identifier, serviceSettings: input.serviceSettings },
    });
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${clientId}`);
    return { status: "success", message: text(language, "Changes saved.", "Cambios guardados.") };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { status: "error", message: text(language, "Client not found.", "No se encontró el cliente.") };
    }
    return clientError(error, language);
  }
}
