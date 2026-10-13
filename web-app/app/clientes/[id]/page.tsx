import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Check, ClipboardCheck, Clock3, FileText, Plus } from "lucide-react";
import { AppHeader, DemoBadge, StatusPill } from "@/components/ui";
import { clients } from "@/lib/demo-data";

const history = [
  { date: "14 mar – 2 oct 2026", label: "Evaluación anual", status: "Completada", result: "Resultados disponibles" },
  { date: "9 ene – 21 feb 2025", label: "Evaluación inicial", status: "Completada", result: "Resultados disponibles" },
];

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = clients.find((entry) => entry.id === id);
  if (!client) notFound();
  const activeProgress = client.progress === null || client.progress === 100 ? 38 : client.progress;

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader back={{ href: "/clientes", label: "Mis clientes" }} />
      <main className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="mb-10 flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-5">
            <span className={`grid size-16 place-items-center rounded-2xl ${client.accent} text-lg font-bold text-navy`}>{client.initials}</span>
            <div>
              <div className="mb-2 flex items-center gap-3"><DemoBadge /><span className="text-xs text-ink/40">ID: {client.identifier}</span></div>
              <h1 className="font-serif text-4xl tracking-tight text-navy sm:text-5xl">{client.name}</h1>
            </div>
          </div>
          <button className="focus-ring flex h-11 items-center justify-center gap-2 rounded-xl border border-rust/40 bg-paper px-5 text-sm font-semibold text-rust-dark transition hover:bg-rust-soft/40"><Plus size={17} /> Nueva evaluación</button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-line bg-paper p-6 shadow-soft sm:p-8">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-rust">Evaluación actual</p><h2 className="font-serif text-2xl text-navy">Evaluación 2026</h2></div>
                <StatusPill status="En progreso" />
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <div className="rounded-2xl bg-cream/65 p-4"><CalendarDays size={17} className="mb-3 text-rust" /><p className="text-[10px] uppercase tracking-[0.1em] text-ink/40">Iniciada</p><p className="mt-1 text-sm font-semibold text-navy">8 oct 2026</p></div>
                <div className="rounded-2xl bg-cream/65 p-4"><Clock3 size={17} className="mb-3 text-rust" /><p className="text-[10px] uppercase tracking-[0.1em] text-ink/40">Última actividad</p><p className="mt-1 text-sm font-semibold text-navy">Hoy, 10:24</p></div>
                <div className="rounded-2xl bg-cream/65 p-4"><ClipboardCheck size={17} className="mb-3 text-rust" /><p className="text-[10px] uppercase tracking-[0.1em] text-ink/40">Sección actual</p><p className="mt-1 text-sm font-semibold text-navy">A · Cooperación</p></div>
              </div>
              <div className="mt-7">
                <div className="mb-2 flex justify-between text-xs"><span className="font-medium text-ink/60">Progreso general</span><span className="font-semibold text-navy">{activeProgress}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-sage" style={{ width: `${activeProgress}%` }} /></div>
              </div>
              <Link href="/evaluacion/demo-2026" className="focus-ring mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rust text-sm font-semibold text-white transition hover:bg-rust-dark">Continuar evaluación <ArrowRight size={17} /></Link>
            </section>

            <section>
              <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rust">Historial</p><h2 className="mt-2 font-serif text-3xl text-navy">Evaluaciones anteriores</h2></div>
              <div className="overflow-hidden rounded-3xl border border-line bg-paper shadow-soft">
                {history.map((item, index) => <div key={item.date} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${index ? "border-t border-line" : ""}`}><div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#E8F0E7] text-[#365F4A]"><Check size={17} /></span><div><p className="text-sm font-semibold text-navy">{item.label}</p><p className="mt-1 text-xs text-ink/45">{item.date}</p></div></div><button className="focus-ring flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-navy hover:bg-cream"><FileText size={15} /> Ver resultados</button></div>)}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-line bg-paper p-6"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Resumen</p><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between border-b border-line pb-4"><dt className="text-ink/50">Evaluaciones</dt><dd className="font-semibold text-navy">3</dd></div><div className="flex justify-between border-b border-line pb-4"><dt className="text-ink/50">Completadas</dt><dd className="font-semibold text-navy">2</dd></div><div className="flex justify-between"><dt className="text-ink/50">En curso</dt><dd className="font-semibold text-rust">1</dd></div></dl></section>
            <section className="rounded-3xl bg-navy p-6 text-white"><p className="font-serif text-xl">Sobre los resultados</p><p className="mt-3 text-xs leading-5 text-white/55">Esta área será el acceso a los resultados históricos. La visualización y exportación se incorporarán en una fase posterior.</p><span className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/65">Marcador visual</span></section>
          </aside>
        </div>
      </main>
    </div>
  );
}
