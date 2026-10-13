"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function logout() {
    setPending(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <button type="button" disabled={pending} onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rust hover:bg-rust-soft/50 disabled:opacity-60"><LogOut size={16} /> {pending ? "Cerrando…" : "Cerrar sesión"}</button>;
}
