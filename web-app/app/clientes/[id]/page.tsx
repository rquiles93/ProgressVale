import { notFound } from "next/navigation";
import { CalendarDays, Check, Clock3, FileText } from "lucide-react";
import { AppHeader, StatusPill } from "@/components/ui";
import { ClientDetailActions } from "@/components/client-detail-actions";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

const statusLabels = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completada",
  ARCHIVED: "Archivada",
} as const;

function formatDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(date) : "Sin fecha";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id_ownerId: { id, ownerId: session.user.id } },
    include: { assessments: { orderBy: { createdAt: "desc" } } },
  });
  if (!client) notFound();

  const active = client.assessments.find((assessment) => assessment.status === "DRAFT" || assessment.status === "IN_PROGRESS");
  const history = client.assessments.filter((assessment) => assessment.status === "COMPLETED" || assessment.status === "ARCHIVED");
  const completedCount = client.assessments.filter((assessment) => assessment.status === "COMPLETED").length;
  const assessmentAction = active ? "Continuar evaluación" : history.length ? "Nueva evaluación" : "Iniciar evaluación";
  const overallStatus = active ? "En progreso" : history.length ? "Completada" : "Sin iniciar";

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader user={{ name: session.user.name, email: session.user.email }} back={{ href: "/clientes", label: "Mis clientes" }} />
      <main className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="mb-10 flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-5">
            <span className="grid size-16 place-items-center rounded-2xl bg-rust-soft text-lg font-bold text-navy">{initials(client.name)}</span>
            <div><div className="mb-2 flex items-center gap-3"><StatusPill status={overallStatus} /><span className="text-xs text-ink/40">{client.identifier ? `ID: ${client.identifier}` : "Sin identificador interno"}</span></div><h1 className="font-serif text-4xl tracking-tight text-navy sm:text-5xl">{client.name}</h1></div>
          </div>
          <ClientDetailActions client={{ id: client.id, name: client.name, identifier: client.identifier }} assessmentAction={assessmentAction} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-line bg-paper p-6 shadow-soft sm:p-8">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-rust">Evaluación actual</p><h2 className="font-serif text-2xl text-navy">{active ? "Evaluación sin finalizar" : "Sin evaluación activa"}</h2></div>{active && <StatusPill status={statusLabels[active.status]} />}</div>
              {active ? <div className="grid gap-5 sm:grid-cols-2"><div className="rounded-2xl bg-cream/65 p-4"><CalendarDays size={17} className="mb-3 text-rust" /><p className="text-[10px] uppercase tracking-[0.1em] text-ink/40">Creada</p><p className="mt-1 text-sm font-semibold text-navy">{formatDate(active.createdAt)}</p></div><div className="rounded-2xl bg-cream/65 p-4"><Clock3 size={17} className="mb-3 text-rust" /><p className="text-[10px] uppercase tracking-[0.1em] text-ink/40">Última actividad</p><p className="mt-1 text-sm font-semibold text-navy">{formatDate(active.updatedAt)}</p></div></div> : <div className="rounded-2xl bg-cream/65 px-5 py-8 text-center"><p className="text-sm font-semibold text-navy">No hay una evaluación en curso.</p><p className="mt-2 text-xs leading-5 text-ink/45">La creación de evaluaciones se habilitará en una fase posterior.</p></div>}
              <div className="mt-6 rounded-xl border border-rust/15 bg-rust-soft/35 px-4 py-3 text-xs leading-5 text-ink/55">{assessmentAction} no está disponible todavía. Esta fase sólo administra los datos del cliente.</div>
            </section>

            <section>
              <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rust">Historial</p><h2 className="mt-2 font-serif text-3xl text-navy">Evaluaciones anteriores</h2></div>
              <div className="overflow-hidden rounded-3xl border border-line bg-paper shadow-soft">
                {history.map((assessment, index) => <div key={assessment.id} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${index ? "border-t border-line" : ""}`}><div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rust-soft text-rust-dark"><Check size={17} /></span><div><p className="text-sm font-semibold text-navy">{statusLabels[assessment.status]}</p><p className="mt-1 text-xs text-ink/45">{formatDate(assessment.evaluationStartedAt ?? assessment.createdAt)}{assessment.evaluationCompletedAt ? ` – ${formatDate(assessment.evaluationCompletedAt)}` : ""}</p></div></div><button disabled title="Los resultados estarán disponibles en una fase posterior." className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-navy/40"><FileText size={15} /> Ver resultados</button></div>)}
                {history.length === 0 && <div className="px-6 py-12 text-center"><p className="text-sm font-semibold text-navy">Sin evaluaciones anteriores</p><p className="mt-2 text-xs text-ink/45">El historial aparecerá aquí cuando existan evaluaciones completadas.</p></div>}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-line bg-paper p-6"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Resumen</p><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between border-b border-line pb-4"><dt className="text-ink/50">Evaluaciones</dt><dd className="font-semibold text-navy">{client.assessments.length}</dd></div><div className="flex justify-between border-b border-line pb-4"><dt className="text-ink/50">Completadas</dt><dd className="font-semibold text-navy">{completedCount}</dd></div><div className="flex justify-between"><dt className="text-ink/50">En curso</dt><dd className="font-semibold text-rust">{active ? 1 : 0}</dd></div></dl></section>
            <section className="rounded-3xl bg-navy p-6 text-white"><p className="font-serif text-xl">Sobre los resultados</p><p className="mt-3 text-xs leading-5 text-white/55">La visualización y exportación de resultados se incorporarán en una fase posterior.</p><span className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/65">Próximamente</span></section>
          </aside>
        </div>
      </main>
    </div>
  );
}
