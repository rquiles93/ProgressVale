"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { updateClientAction } from "@/app/actions/clients";
import { ClientFormDialog } from "./client-form-dialog";
import type { ServiceSettingValue } from "@/lib/ablls-content";
import type { AssessmentColor } from "@/lib/assessment-colors";
import { text, type AppLanguage } from "@/lib/language";

type AvailableColor = { value: AssessmentColor; label: string };

export function ClientDetailActions({ client, assessmentAction, onAssessment, hasActiveAssessment, availableColors, colorError, language }: { client: { id: string; name: string; identifier: string | null; serviceSettings: ServiceSettingValue[] }; assessmentAction: string; onAssessment: (formData: FormData) => Promise<void>; hasActiveAssessment: boolean; availableColors: AvailableColor[]; colorError?: boolean; language: AppLanguage }) {
  const [editing, setEditing] = useState(false);
  const [choosingColor, setChoosingColor] = useState(false);
  const noSettings = client.serviceSettings.length === 0;
  const noColors = !hasActiveAssessment && availableColors.length === 0;
  return (
    <>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={() => setEditing(true)} className="focus-ring flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-5 text-sm font-semibold text-navy transition hover:bg-cream"><Pencil size={16} /> {text(language, "Edit Client", "Editar cliente")}</button>
        {hasActiveAssessment ? <form action={onAssessment}><input type="hidden" name="clientId" value={client.id} /><button type="submit" className="focus-ring flex h-11 items-center justify-center gap-2 rounded-xl bg-rust px-5 text-sm font-semibold text-white"><Plus size={17} /> {assessmentAction}</button></form> : <button type="button" onClick={() => setChoosingColor(true)} disabled={noSettings || noColors} title={noSettings ? text(language, "Edit the client and select at least one Service Setting.", "Edita el cliente y selecciona al menos un Service Setting.") : noColors ? text(language, "No colors remain available for a new assessment.", "No quedan colores disponibles para una nueva evaluación.") : undefined} className="focus-ring flex h-11 items-center justify-center gap-2 rounded-xl bg-rust px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"><Plus size={17} /> {assessmentAction}</button>}
        {noColors && <p role="status" className="w-full max-w-sm text-right text-xs leading-5 text-rust-dark">{text(language, "All five colors are already assigned. Existing assessments remain available, but another cannot be created until the palette is expanded.", "Las cinco opciones de color ya están asignadas. Las evaluaciones existentes siguen disponibles, pero no se puede crear otra hasta ampliar la paleta.")}</p>}
        {colorError && !noColors && <p role="alert" className="w-full max-w-sm text-right text-xs leading-5 text-rust-dark">{text(language, "That color is no longer available. Choose another option.", "Ese color ya no está disponible. Elige otra opción.")}</p>}
      </div>
      {editing && <ClientFormDialog open onClose={() => setEditing(false)} title={text(language, "Edit Client", "Editar cliente")} submitLabel={text(language, "Save Changes", "Guardar cambios")} action={updateClientAction} client={client} language={language} />}
      {choosingColor && <AssessmentColorDialog clientId={client.id} colors={availableColors} action={onAssessment} onClose={() => setChoosingColor(false)} language={language} />}
    </>
  );
}

function AssessmentColorDialog({ clientId, colors, action, onClose, language }: { clientId: string; colors: AvailableColor[]; action: (formData: FormData) => Promise<void>; onClose: () => void; language: AppLanguage }) {
  const dialogRef = useRef<HTMLElement>(null);
  const [returnFocus] = useState<HTMLElement | null>(() => typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const closeDialog = useCallback(() => { onClose(); requestAnimationFrame(() => returnFocus?.focus()); }, [onClose, returnFocus]);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeDialog(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0]; const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog]);
  const colorLabels: Record<string, [string, string]> = { Terracota: ["Terracotta", "Terracota"], "Azul acero": ["Steel Blue", "Azul acero"], Ciruela: ["Plum", "Ciruela"], Ocre: ["Ochre", "Ocre"], Frambuesa: ["Raspberry", "Frambuesa"] };
  return <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-navy/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="assessment-color-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-line bg-paper p-6 shadow-soft sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rust">{text(language, "New Assessment", "Nueva evaluación")}</p><h2 id="assessment-color-title" className="mt-2 font-serif text-3xl text-navy">{text(language, "Configure the assessment", "Configura la evaluación")}</h2><p className="mt-3 text-sm leading-6 text-ink/55">{text(language, "The color will identify this assessment in Skills Tracking. The global language can be changed at any time without affecting responses.", "El color identificará la evaluación en Skills Tracking. El idioma global puede cambiarse en cualquier momento sin afectar las respuestas.")}</p></div><button type="button" onClick={closeDialog} aria-label={text(language, "Close", "Cerrar")} className="focus-ring rounded-xl p-2 text-ink/45 hover:bg-cream hover:text-navy"><X size={18} /></button></div><form action={action} className="mt-7"><input type="hidden" name="clientId" value={clientId} /><fieldset><legend className="text-xs font-bold uppercase tracking-[0.13em] text-navy">{text(language, "Assessment color", "Color de la evaluación")}</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{colors.map((color, index) => <label key={color.value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-navy transition has-[:checked]:border-navy has-[:checked]:bg-cream"><input autoFocus={index === 0} required type="radio" name="trackingColor" value={color.value} className="size-4 accent-[#172B42]" /><span className="size-6 rounded-lg border border-black/10" style={{ backgroundColor: color.value }} aria-hidden="true" />{colorLabels[color.label] ? text(language, colorLabels[color.label][0], colorLabels[color.label][1]) : color.label}</label>)}</div></fieldset><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeDialog} className="focus-ring h-11 rounded-xl border border-line px-5 text-sm font-semibold text-navy hover:bg-cream">{text(language, "Cancel", "Cancelar")}</button><button type="submit" className="focus-ring h-11 rounded-xl bg-rust px-5 text-sm font-semibold text-white hover:bg-rust-dark">{text(language, "Start Assessment", "Iniciar evaluación")}</button></div></form></section></div>;
}
