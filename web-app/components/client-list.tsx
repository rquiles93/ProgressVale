"use client";

import Link from "next/link";
import { ArrowRight, Plus, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { createClientAction } from "@/app/actions/clients";
import { ClientFormDialog } from "./client-form-dialog";
import { StatusPill } from "./ui";

export type ClientListItem = {
  id: string;
  name: string;
  identifier: string | null;
  initials: string;
  status: "En progreso" | "Sin iniciar" | "Completada";
  lastActivity: string;
  progress: number | null;
};

export function ClientList({ clients }: { clients: ClientListItem[] }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return clients;
    return clients.filter((client) => `${client.name} ${client.identifier ?? ""}`.toLocaleLowerCase("es").includes(normalized));
  }, [clients, query]);

  return (
    <>
      <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-rust">Panel de trabajo</p>
          <h1 className="font-serif text-4xl tracking-tight text-navy sm:text-5xl">Mis clientes</h1>
          <p className="mt-3 text-sm text-ink/55">Gestiona evaluaciones y revisa el progreso de tus clientes.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="focus-ring flex h-11 items-center justify-center gap-2 rounded-xl bg-rust px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(54,95,74,0.18)] transition hover:bg-rust-dark"><Plus size={17} /> Nuevo cliente</button>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-paper shadow-soft">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <label className="relative block w-full sm:max-w-md"><span className="sr-only">Buscar clientes por nombre o identificador</span><Search aria-hidden="true" size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o identificador" className="focus-ring h-10 w-full rounded-xl border border-line bg-cream/45 pl-10 pr-4 text-sm placeholder:text-ink/35" /></label>
          <span className="text-xs text-ink/45">{filteredClients.length} {filteredClients.length === 1 ? "cliente" : "clientes"}</span>
        </div>

        <div className="hidden grid-cols-[1.55fr_0.85fr_0.8fr_1fr_180px] gap-4 border-b border-line bg-cream/30 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40 lg:grid"><span>Cliente</span><span>Estado</span><span>Progreso</span><span>Última actividad</span><span /></div>
        <div className="divide-y divide-line">
          {filteredClients.map((client) => {
            const action = client.status === "En progreso" ? "Continuar evaluación" : client.status === "Sin iniciar" ? "Iniciar evaluación" : "Nueva evaluación";
            return (
              <article key={client.id} className="grid gap-5 px-5 py-5 transition hover:bg-cream/35 sm:px-6 lg:grid-cols-[1.55fr_0.85fr_0.8fr_1fr_180px] lg:items-center lg:gap-4">
                <Link href={`/clientes/${client.id}`} className="focus-ring flex items-center gap-4 rounded-lg"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rust-soft text-xs font-bold text-navy">{client.initials}</span><span><span className="block text-sm font-semibold text-navy">{client.name}</span><span className="mt-1 block text-[11px] text-ink/45">{client.identifier ? `ID: ${client.identifier}` : "Sin identificador interno"}</span></span></Link>
                <div><StatusPill status={client.status} /></div>
                <div>{client.progress === null ? <span className="text-xs text-ink/35">—</span> : <div className="flex items-center gap-3"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-line"><div style={{ width: `${client.progress}%` }} className="h-full rounded-full bg-sage" /></div><span className="text-xs font-semibold text-ink/60">{client.progress}%</span></div>}</div>
                <span className="text-xs text-ink/50">{client.lastActivity}</span>
                <Link href={`/clientes/${client.id}`} className="focus-ring flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-xs font-semibold text-navy transition hover:border-rust/40 hover:bg-rust-soft/30 hover:text-rust-dark">{action}<ArrowRight size={14} /></Link>
              </article>
            );
          })}
          {filteredClients.length === 0 && <div className="grid place-items-center px-6 py-16 text-center"><UsersRound size={28} className="mb-3 text-ink/25" /><p className="text-sm font-semibold text-navy">{clients.length === 0 ? "Aún no tienes clientes" : "No encontramos clientes"}</p><p className="mt-1 max-w-sm text-xs leading-5 text-ink/45">{clients.length === 0 ? "Crea tu primer cliente para comenzar a organizar sus evaluaciones." : "Prueba con otro nombre o identificador."}</p>{clients.length === 0 && <button type="button" onClick={() => setCreating(true)} className="focus-ring mt-5 rounded-xl bg-rust px-4 py-2.5 text-xs font-semibold text-white hover:bg-rust-dark"><Plus size={14} className="mr-2 inline" />Crear cliente</button>}</div>}
        </div>
      </section>
      {creating && <ClientFormDialog open onClose={() => setCreating(false)} title="Nuevo cliente" submitLabel="Crear cliente" action={createClientAction} />}
    </>
  );
}
