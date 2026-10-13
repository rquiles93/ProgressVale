"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import type { ClientActionState } from "@/app/actions/clients";

const initialClientActionState: ClientActionState = { status: "idle", message: "" };

type ClientFormDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  action: (state: ClientActionState, formData: FormData) => Promise<ClientActionState>;
  onClose: () => void;
  client?: { id: string; name: string; identifier: string | null };
};

export function ClientFormDialog({ open, title, submitLabel, action, onClose, client }: ClientFormDialogProps) {
  const [state, formAction, pending] = useActionState(action, initialClientActionState);

  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state.status, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-navy/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="client-dialog-title" className="w-full max-w-lg rounded-3xl border border-line bg-paper p-6 shadow-soft sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rust">Datos básicos</p><h2 id="client-dialog-title" className="mt-2 font-serif text-3xl text-navy">{title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="focus-ring rounded-xl p-2 text-ink/45 hover:bg-cream hover:text-navy"><X size={18} /></button>
        </div>
        <form action={formAction} className="space-y-5">
          {client && <input type="hidden" name="clientId" value={client.id} />}
          <label className="block"><span className="mb-2 block text-xs font-semibold text-navy">Nombre <span className="text-rust">*</span></span><input name="name" required maxLength={100} defaultValue={client?.name} autoFocus className="focus-ring h-12 w-full rounded-xl border border-line bg-white px-4 text-sm" /></label>
          <label className="block"><span className="mb-2 block text-xs font-semibold text-navy">Identificador interno <span className="font-normal text-ink/40">(opcional)</span></span><input name="identifier" maxLength={50} defaultValue={client?.identifier ?? ""} placeholder="Ej. CL-001" className="focus-ring h-12 w-full rounded-xl border border-line bg-white px-4 text-sm placeholder:text-ink/30" /><span className="mt-2 block text-[11px] leading-4 text-ink/45">Sólo para la organización interna de tu práctica.</span></label>
          {state.status === "error" && <p role="alert" className="rounded-xl bg-rust-soft/60 px-4 py-3 text-xs text-rust-dark">{state.message}</p>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="focus-ring h-11 rounded-xl border border-line px-5 text-sm font-semibold text-navy hover:bg-cream">Cancelar</button><button type="submit" disabled={pending} className="focus-ring h-11 rounded-xl bg-rust px-5 text-sm font-semibold text-white hover:bg-rust-dark disabled:cursor-wait disabled:opacity-65">{pending ? "Guardando…" : submitLabel}</button></div>
        </form>
      </section>
    </div>
  );
}
