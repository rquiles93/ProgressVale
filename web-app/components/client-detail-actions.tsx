"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { updateClientAction } from "@/app/actions/clients";
import { ClientFormDialog } from "./client-form-dialog";

export function ClientDetailActions({ client, assessmentAction }: { client: { id: string; name: string; identifier: string | null }; assessmentAction: string }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setEditing(true)} className="focus-ring flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-5 text-sm font-semibold text-navy transition hover:bg-cream"><Pencil size={16} /> Editar cliente</button>
        <button type="button" disabled title="La gestión de evaluaciones estará disponible en una fase posterior." className="flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-rust/25 bg-paper px-5 text-sm font-semibold text-rust-dark/55"><Plus size={17} /> {assessmentAction}</button>
      </div>
      {editing && <ClientFormDialog open onClose={() => setEditing(false)} title="Editar cliente" submitLabel="Guardar cambios" action={updateClientAction} client={client} />}
    </>
  );
}
