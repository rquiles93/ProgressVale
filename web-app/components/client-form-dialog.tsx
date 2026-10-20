"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ClientActionState } from "@/app/actions/clients";
import { serviceSettingLabels, type ServiceSettingValue } from "@/lib/ablls-content";
import { text, type AppLanguage } from "@/lib/language";

const initialClientActionState: ClientActionState = { status: "idle", message: "" };

type ClientFormDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  action: (state: ClientActionState, formData: FormData) => Promise<ClientActionState>;
  onClose: () => void;
  client?: { id: string; name: string; identifier: string | null; serviceSettings: ServiceSettingValue[] };
  language: AppLanguage;
};

export function ClientFormDialog({ open, title, submitLabel, action, onClose, client, language }: ClientFormDialogProps) {
  const [state, formAction, pending] = useActionState(action, initialClientActionState);
  const dialogRef = useRef<HTMLElement>(null);
  const [returnFocus] = useState<HTMLElement | null>(() => typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const closeDialog = useCallback(() => {
    onClose();
    requestAnimationFrame(() => returnFocus?.focus());
  }, [onClose, returnFocus]);

  useEffect(() => {
    if (state.status === "success") closeDialog();
  }, [state.status, closeDialog]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeDialog]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-navy/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="client-dialog-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-line bg-paper p-6 shadow-soft sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rust">{text(language, "Basic details", "Datos básicos")}</p><h2 id="client-dialog-title" className="mt-2 font-serif text-3xl text-navy">{title}</h2></div>
          <button type="button" onClick={closeDialog} aria-label={text(language, "Close", "Cerrar")} className="focus-ring rounded-xl p-2 text-ink/45 hover:bg-cream hover:text-navy"><X size={18} /></button>
        </div>
        <form action={formAction} className="space-y-5">
          {client && <input type="hidden" name="clientId" value={client.id} />}
          <label className="block"><span className="mb-2 block text-xs font-semibold text-navy">{text(language, "Name", "Nombre")} <span className="text-rust">*</span></span><input name="name" required maxLength={100} defaultValue={client?.name} autoFocus className="focus-ring h-12 w-full rounded-xl border border-line bg-white px-4 text-sm" /></label>
          <label className="block"><span className="mb-2 block text-xs font-semibold text-navy">{text(language, "Internal identifier", "Identificador interno")} <span className="font-normal text-ink/40">({text(language, "optional", "opcional")})</span></span><input name="identifier" maxLength={50} defaultValue={client?.identifier ?? ""} placeholder={text(language, "E.g. CL-001", "Ej. CL-001")} className="focus-ring h-12 w-full rounded-xl border border-line bg-white px-4 text-sm placeholder:text-ink/30" /><span className="mt-2 block text-[11px] leading-4 text-ink/45">{text(language, "For your practice's internal organization only.", "Sólo para la organización interna de tu práctica.")}</span></label>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-navy">{text(language, "Service Setting", "Entorno de servicio")} <span className="text-rust">*</span></legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.entries(serviceSettingLabels) as [ServiceSettingValue, string][]).map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-3 text-xs font-semibold text-navy has-[:checked]:border-rust/50 has-[:checked]:bg-rust-soft/40"><input type="checkbox" name="serviceSettings" value={value} defaultChecked={client?.serviceSettings.includes(value)} className="size-4 accent-[#365F4A]" />{language === "ES" ? ({ HOME: "Hogar", SCHOOL: "Escuela", CLINIC_BASED: "ABA en clínica" } as const)[value] : label}</label>)}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-ink/45">{text(language, "Select at least one service setting.", "Selecciona al menos un entorno de servicio.")}</p>
          </fieldset>
          {state.status === "error" && <p role="alert" className="rounded-xl bg-rust-soft/60 px-4 py-3 text-xs text-rust-dark">{state.message}</p>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeDialog} className="focus-ring h-11 rounded-xl border border-line px-5 text-sm font-semibold text-navy hover:bg-cream">{text(language, "Cancel", "Cancelar")}</button><button type="submit" disabled={pending} className="focus-ring h-11 rounded-xl bg-rust px-5 text-sm font-semibold text-white hover:bg-rust-dark disabled:cursor-wait disabled:opacity-65">{pending ? text(language, "Saving…", "Guardando…") : submitLabel}</button></div>
        </form>
      </section>
    </div>
  );
}
