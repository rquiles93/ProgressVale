"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateLanguagePreferenceAction } from "@/app/actions/language";
import type { AppLanguage } from "@/lib/language";

export function LanguageSelector({ language, assessmentId, compact = false }: { language: AppLanguage; assessmentId?: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const label = language === "ES" ? "Idioma" : "Language";
  function select(next: AppLanguage) {
    setOpen(false);
    if (next === language || pending) return;
    startTransition(async () => {
      const result = await updateLanguagePreferenceAction(next, assessmentId);
      if (result.status === "success") router.refresh();
    });
  }
  return <div className="relative"><button type="button" aria-label={`${label}: ${language}`} aria-haspopup="menu" aria-expanded={open} disabled={pending} onClick={() => setOpen((value) => !value)} className={`focus-ring flex min-h-9 items-center gap-2 rounded-xl border border-line bg-paper px-2.5 text-xs font-bold text-navy transition hover:bg-cream disabled:opacity-60 ${compact ? "min-w-12 justify-center" : "min-w-16"}`}>{language}<ChevronDown size={14} aria-hidden="true" /></button>{open && <div role="menu" aria-label={label} className="absolute right-0 z-[70] mt-2 w-36 rounded-xl border border-line bg-paper p-1.5 shadow-soft">{([['EN', 'English'], ['ES', 'Español']] as const).map(([value, name]) => <button key={value} role="menuitemradio" aria-checked={language === value} type="button" onClick={() => select(value)} className={`focus-ring flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${language === value ? "bg-rust-soft font-semibold text-rust-dark" : "text-navy hover:bg-cream"}`}><span>{name}</span><span className="text-[10px] font-bold">{value}</span></button>)}</div>}</div>;
}
