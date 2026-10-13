import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireUserId() {
  return (await requireSession()).user.id;
}

export function ownedClientWhere(clientId: string, userId: string) {
  return { id: clientId, ownerId: userId } as const;
}
