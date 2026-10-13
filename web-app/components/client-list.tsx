"use client";

import Link from "next/link";
import { ArrowRight, Plus, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { clients } from "@/lib/demo-data";
import { DemoBadge, StatusPill } from "./ui";

export function ClientList() {
  const [query, setQuery] = useState("");
  const filteredClients = useMemo(() => clients.filter((client) => `${client.name} ${client.identifier}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <>
      <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-3"><p className="text-xs font-bold uppercase tracking-[0.18em] text-rust">Panel de trabajo</p><DemoBadge /></div>
          <h1 className="font-serif text-4xl tracking-tight text-navy sm:text-5xl">Mis clientes</h1>
          <p className="mt-3 text-sm text-ink/55">Gestiona evaluaciones y revisa el progreso de tus clientes.</p>
        </div>
        <button type="button" className="focus-ring flex h-11 items-center justify-center gap-2 rounded-xl bg-rust px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(54,95,74,0.18)] transition hover:bg-rust-dark"><Plus size={17} /> Nuevo cliente</button>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-paper shadow-soft">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <label className="relative block w-full sm:max-w-md">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o identificador" className="focus-ring h-10 w-full rounded-xl border border-line bg-cream/45 pl-10 pr-4 text-sm placeholder:text-ink/35" />
          </label>
          <div className="flex items-center gap-3 text-xs text-ink/45"><span>{filteredClients.length} clientes</span><button className="focus-ring rounded-lg border border-line p-2 text-ink/60 hover:bg-cream" aria-label="Filtrar clientes"><SlidersHorizontal size={16} /></button></div>
        </div>

        <div className="hidden grid-cols-[1.55fr_0.85fr_0.8fr_1fr_180px] gap-4 border-b border-line bg-cream/30 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40 lg:grid">
          <span>Cliente</span><span>Estado</span><span>Progreso</span><span>Última actividad</span><span />
        </div>
        <div className="divide-y divide-line">
          {filteredClients.map((client) => {
            const action = client.status === "En progreso" ? "Continuar evaluación" : client.status === "Sin iniciar" ? "Iniciar evaluación" : "Nueva evaluación";
            return (
              <article key={client.id} className="grid gap-5 px-5 py-5 transition hover:bg-cream/35 sm:px-6 lg:grid-cols-[1.55fr_0.85fr_0.8fr_1fr_180px] lg:items-center lg:gap-4">
                <Link href={`/clientes/${client.id}`} className="focus-ring flex items-center gap-4 rounded-lg">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${client.accent} text-xs font-bold text-navy`}>{client.initials}</span>
                  <span><span className="block text-sm font-semibold text-navy">{client.name}</span><span className="mt-1 block text-[11px] text-ink/45">ID: {client.identifier}</span></span>
                </Link>
                <div><StatusPill status={client.status} /></div>
                <div>
                  {client.progress === null ? <span className="text-xs text-ink/35">—</span> : <div className="flex items-center gap-3"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-line"><div style={{ width: `${client.progress}%` }} className="h-full rounded-full bg-sage" /></div><span className="text-xs font-semibold text-ink/60">{client.progress}%</span></div>}
                </div>
                <span className="text-xs text-ink/50">{client.lastActivity}</span>
                <Link href={client.status === "Completada" ? `/clientes/${client.id}` : "/evaluacion/demo-2026"} className="focus-ring flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-xs font-semibold text-navy transition hover:border-rust/40 hover:bg-rust-soft/30 hover:text-rust-dark">{action}<ArrowRight size={14} /></Link>
              </article>
            );
          })}
          {filteredClients.length === 0 && <div className="grid place-items-center px-6 py-16 text-center"><UsersRound size={28} className="mb-3 text-ink/25" /><p className="text-sm font-semibold text-navy">No encontramos clientes</p><p className="mt-1 text-xs text-ink/45">Prueba con otro nombre o identificador.</p></div>}
        </div>
      </section>
    </>
  );
}
