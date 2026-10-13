"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";

export type ClientActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function validateClient(formData: FormData): { ok: true; name: string; identifier: string | null } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const rawIdentifier = String(formData.get("identifier") ?? "").trim();
  const identifier = rawIdentifier ? rawIdentifier.toUpperCase() : null;

  if (!name || name.length > 100 || /[\u0000-\u001F\u007F]/.test(name)) {
    return { ok: false, error: "Escribe un nombre válido de hasta 100 caracteres." };
  }
  if (identifier && (identifier.length > 50 || /[\u0000-\u001F\u007F]/.test(identifier))) {
    return { ok: false, error: "El identificador debe tener hasta 50 caracteres válidos." };
  }
  return { ok: true, name, identifier };
}

function clientError(error: unknown): ClientActionState {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { status: "error", message: "Ya existe un cliente con ese identificador." };
  }
  return { status: "error", message: "No se pudo guardar el cliente. Inténtalo de nuevo." };
}

export async function createClientAction(_state: ClientActionState, formData: FormData): Promise<ClientActionState> {
  const ownerId = await requireUserId();
  const input = validateClient(formData);
  if (!input.ok) return { status: "error", message: input.error };

  try {
    await prisma.client.create({ data: { name: input.name, identifier: input.identifier, ownerId } });
    revalidatePath("/clientes");
    return { status: "success", message: "Cliente creado." };
  } catch (error) {
    return clientError(error);
  }
}

export async function updateClientAction(_state: ClientActionState, formData: FormData): Promise<ClientActionState> {
  const ownerId = await requireUserId();
  const clientId = String(formData.get("clientId") ?? "");
  const input = validateClient(formData);
  if (!clientId || !input.ok) {
    return { status: "error", message: !input.ok ? input.error : "No se encontró el cliente." };
  }

  try {
    await prisma.client.update({
      where: { id_ownerId: { id: clientId, ownerId } },
      data: { name: input.name, identifier: input.identifier },
    });
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${clientId}`);
    return { status: "success", message: "Cambios guardados." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { status: "error", message: "No se encontró el cliente." };
    }
    return clientError(error);
  }
}
