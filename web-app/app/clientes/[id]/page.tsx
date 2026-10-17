import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Check, ChevronDown, Clock3, FileText } from "lucide-react";
import { AppHeader, StatusPill } from "@/components/ui";
import { ClientDetailActions } from "@/components/client-detail-actions";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { startAssessmentAction } from "@/app/actions/assessments";
import { protocolSections, protocolTasks, serviceSettingLabels, type ServiceSettingValue } from "@/lib/ablls-content";
import { comparableScoreChange } from "@/lib/progress";
import { availableAssessmentColors } from "@/lib/assessment-colors";

const statusLabels = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completada",
  FINALIZED: "Finalizada",
  ARCHIVED: "Archivada",
} as const;

function formatDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(date) : "Sin fecha";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default async function ClientDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pagina?: string; colorUnavailable?: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const query = await searchParams;
  const client = await prisma.client.findUnique({
    where: { id_ownerId: { id, ownerId: session.user.id } },
    include: { assessments: { orderBy: { createdAt: "desc" }, include: { scores: true, sections: true } } },
  });
  if (!client) notFound();

  const active = client.assessments.find((assessment) => assessment.status === "DRAFT" || assessment.status === "IN_PROGRESS");
  const selectableColors = availableAssessmentColors(client.assessments.map((assessment) => assessment.trackingColor));
  const history = client.assessments.filter((assessment) => assessment.status === "COMPLETED" || assessment.status === "FINALIZED" || assessment.status === "ARCHIVED");
  const historyPage = Math.max(1, Number.parseInt(query.pagina ?? "1", 10) || 1);
  const historyPageSize = 10;
  const historyPages = Math.max(1, Math.ceil(history.length / historyPageSize));
  const visibleHistory = history.slice((Math.min(historyPage, historyPages) - 1) * historyPageSize, Math.min(historyPage, historyPages) * historyPageSize);
  const completedCount = client.assessments.filter((assessment) => assessment.status === "COMPLETED" || assessment.status === "FINALIZED").length;
  const assessmentAction = active ? "Continuar evaluación" : history.length ? "Nueva evaluación" : "Iniciar evaluación";
  const overallStatus = active ? "En progreso" : history.length ? "Completada" : "Sin iniciar";
  const finalizedChronological = client.assessments.filter((assessment) => assessment.status === "COMPLETED" || assessment.status === "FINALIZED").toSorted((a, b) => (a.evaluationCompletedAt ?? a.createdAt).getTime() - (b.evaluationCompletedAt ?? b.createdAt).getTime());
  const comparison = comparableScoreChange(finalizedChronological);
  const trackingAvailable = Boolean(active || finalizedChronological.length);
  const latest = client.assessments[0] ?? null;
  const latestEnabled = new Set(latest?.sections.filter((section) => section.enabled).map((section) => section.sectionCode) ?? []);
  const latestTasks = protocolTasks.filter((task) => latestEnabled.has(task.sectionCode));
  const latestAnswered = latestTasks.filter((task) => latest?.scores.some((score) => score.skillIdentifier === task.id && score.score !== null)).length;
  const supportedSectionProgress = protocolSections.filter((section) => section.assessmentApproved).map((section) => ({ code: section.code, name: section.name, enabled: latestEnabled.has(section.code), answered: latest?.scores.filter((score) => score.skillIdentifier.startsWith(section.code) && score.score !== null).length ?? 0, total: section.taskCount }));

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader user={{ name: session.user.name, email: session.user.email }} back={{ href: "/clientes", label: "Mis clientes" }} />
      <main className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="mb-10 flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-5">
            <span className="grid size-16 place-items-center rounded-2xl bg-rust-soft text-lg font-bold text-navy">{initials(client.name)}</span>
            <div><div className="mb-2 flex items-center gap-3"><StatusPill status={overallStatus} /><span className="text-xs text-ink/40">{client.identifier ? `ID: ${client.identifier}` : "Sin identificador interno"}</span></div><h1 className="font-serif text-4xl tracking-tight text-navy sm:text-5xl">{client.name}</h1></div>
          </div>
          <ClientDetailActions client={{ id: client.id, name: client.name, identifier: client.identifier, serviceSettings: client.serviceSettings as ServiceSettingValue[] }} assessmentAction={assessmentAction} onAssessment={startAssessmentAction} hasActiveAssessment={Boolean(active)} availableColors={selectableColors} colorError={query.colorUnavailable === "1"} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-line bg-paper p-6 shadow-soft sm:p-8">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-rust">Evaluación actual</p><h2 className="font-serif text-2xl text-navy">{active ? "Evaluación sin finalizar" : "Sin evaluación activa"}</h2></div>{active && <StatusPill status={statusLabels[active.status]} />}</div>
              {active ? <div className="grid gap-5 sm:grid-cols-2"><div className="rounded-2xl bg-cream/65 p-4"><CalendarDays size={17} className="mb-3 text-rust" /><p className="text-[10px] uppercase tracking-[0.1em] text-ink/40">Creada</p><p className="mt-1 text-sm font-semibold text-navy">{formatDate(active.createdAt)}</p></div><div className="rounded-2xl bg-cream/65 p-4"><Clock3 size={17} className="mb-3 text-rust" /><p className="text-[10px] uppercase tracking-[0.1em] text-ink/40">Última actividad</p><p className="mt-1 text-sm font-semibold text-navy">{formatDate(active.updatedAt)}</p></div></div> : <div className="rounded-2xl bg-cream/65 px-5 py-8 text-center"><p className="text-sm font-semibold text-navy">No hay una evaluación en curso.</p><p className="mt-2 text-xs leading-5 text-ink/45">Puedes iniciar una evaluación cuando el cliente tenga un Service Setting configurado.</p></div>}
              {active && <div className="mt-6 rounded-2xl border border-line bg-cream/45 p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">Exportar Skills Tracking</p><div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row"><a href={`/api/clients/${client.id}/skills-tracking/pdf`} className="focus-ring inline-flex min-h-10 items-center justify-center rounded-xl bg-rust px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-rust-dark">PDF</a><a href={`/api/clients/${client.id}/skills-tracking/xlsx`} className="focus-ring inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-paper px-5 py-2.5 text-xs font-semibold text-navy transition hover:border-rust/40 hover:bg-rust-soft/30">Excel</a></div><details className="group mt-3 w-full min-[420px]:w-fit"><summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 text-xs font-semibold text-ink/60 transition hover:bg-paper hover:text-navy">Otros reportes<ChevronDown size={14} aria-hidden="true" className="transition group-open:rotate-180" /></summary><div className="mt-1 grid min-w-44 gap-1 rounded-xl border border-line bg-paper p-1.5 shadow-soft"><a href={`/api/assessments/${active.id}/pdf`} className="focus-ring rounded-lg px-3 py-2.5 text-xs font-semibold text-navy transition hover:bg-rust-soft/40">Detalle — PDF</a><a href={`/api/assessments/${active.id}/csv`} className="focus-ring rounded-lg px-3 py-2.5 text-xs font-semibold text-navy transition hover:bg-rust-soft/40">Detalle — CSV</a></div></details></div>}
              <div className="mt-6 rounded-xl border border-rust/15 bg-rust-soft/35 px-4 py-3 text-xs leading-5 text-ink/55">Service Setting: {client.serviceSettings.length ? (client.serviceSettings as ServiceSettingValue[]).map((item) => serviceSettingLabels[item]).join(", ") : "pendiente de configuración"}</div>
            </section>

            <section>
              <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rust">Historial</p><h2 className="mt-2 font-serif text-3xl text-navy">Evaluaciones anteriores</h2></div>
              <div className="overflow-hidden rounded-3xl border border-line bg-paper shadow-soft">
                {visibleHistory.map((assessment, index) => <div key={assessment.id} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${index ? "border-t border-line" : ""}`}><div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rust-soft text-rust-dark"><Check size={17} /></span><div><p className="text-sm font-semibold text-navy">{statusLabels[assessment.status]}</p><p className="mt-1 text-xs text-ink/45">{formatDate(assessment.evaluationStartedAt ?? assessment.createdAt)}{assessment.evaluationCompletedAt ? ` – ${formatDate(assessment.evaluationCompletedAt)}` : ""}</p></div></div><div className="flex flex-wrap gap-2"><a href={`/api/assessments/${assessment.id}/csv`} className="focus-ring rounded-xl border border-line px-3 py-2.5 text-xs font-semibold text-navy">Detalle — CSV</a><a href={`/api/assessments/${assessment.id}/pdf`} className="focus-ring rounded-xl border border-line px-3 py-2.5 text-xs font-semibold text-navy">Detalle — PDF</a><a href={`/evaluacion/${assessment.id}?view=summary`} className="focus-ring flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-navy"><FileText size={15} /> Ver resultados</a></div></div>)}
                {history.length === 0 && <div className="px-6 py-12 text-center"><p className="text-sm font-semibold text-navy">Sin evaluaciones anteriores</p><p className="mt-2 text-xs text-ink/45">El historial aparecerá aquí cuando existan evaluaciones completadas.</p></div>}
                {history.length > historyPageSize && <nav aria-label="Páginas del historial" className="flex items-center justify-between border-t border-line px-5 py-4 text-xs"><Link aria-disabled={historyPage <= 1} className={`font-semibold text-navy ${historyPage <= 1 ? "pointer-events-none opacity-35" : ""}`} href={`/clientes/${client.id}?pagina=${historyPage - 1}`}>Anterior</Link><span className="text-ink/45">Página {Math.min(historyPage, historyPages)} de {historyPages}</span><Link aria-disabled={historyPage >= historyPages} className={`font-semibold text-navy ${historyPage >= historyPages ? "pointer-events-none opacity-35" : ""}`} href={`/clientes/${client.id}?pagina=${historyPage + 1}`}>Siguiente</Link></nav>}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-line bg-paper p-6"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Resumen</p><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between border-b border-line pb-4"><dt className="text-ink/50">Evaluaciones</dt><dd className="font-semibold text-navy">{client.assessments.length}</dd></div><div className="flex justify-between border-b border-line pb-4"><dt className="text-ink/50">Completadas</dt><dd className="font-semibold text-navy">{completedCount}</dd></div><div className="flex justify-between"><dt className="text-ink/50">En curso</dt><dd className="font-semibold text-rust">{active ? 1 : 0}</dd></div></dl></section>
            <section className="rounded-3xl border border-line bg-paper p-6"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Última evaluación</p><p className="mt-3 font-serif text-3xl text-navy">{latestAnswered}<span className="text-base text-ink/35"> / {latestTasks.length}</span></p><p className="mt-1 text-xs text-ink/45">tareas respondidas; las no respondidas no cuentan como cero</p><div className="mt-5 max-h-48 space-y-2 overflow-y-auto pr-1">{supportedSectionProgress.map((section) => <div key={section.code} className="flex items-center gap-2 text-[10px]"><b className="w-4 text-navy">{section.code}</b><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><span className="block h-full bg-sage" style={{ width: section.enabled ? `${section.answered / section.total * 100}%` : "0%" }} /></span><span className="w-12 text-right text-ink/40">{section.enabled ? `${section.answered}/${section.total}` : "bloq."}</span></div>)}</div></section>
            <section className="rounded-3xl bg-navy p-6 text-white"><p className="font-serif text-xl">Skills Tracking</p><p className="mt-3 text-xs leading-5 text-white/60">{active ? "Vista provisional con las puntuaciones guardadas de la evaluación en curso; no cambia su estado." : comparison.comparable ? `${comparison.comparable} tareas comparables entre las dos evaluaciones finalizadas más recientes: ${comparison.improved} subieron, ${comparison.regressed} bajaron y ${comparison.unchanged} no cambiaron.` : "La rejilla reúne el progreso guardado de las evaluaciones disponibles."}</p><div className="mt-5 flex flex-wrap gap-2"><Link href={`/clientes/${client.id}/seguimiento`} className="focus-ring inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-navy">Ver Skills Tracking</Link>{trackingAvailable && !active && <><a href={`/api/clients/${client.id}/skills-tracking/pdf`} className="focus-ring inline-flex rounded-xl border border-white/25 px-4 py-2.5 text-xs font-semibold text-white">Skills Tracking — PDF</a><a href={`/api/clients/${client.id}/skills-tracking/xlsx`} className="focus-ring inline-flex rounded-xl border border-white/25 px-4 py-2.5 text-xs font-semibold text-white">Skills Tracking — Excel</a></>}{finalizedChronological.length >= 2 && <Link href={`/clientes/${client.id}/comparar`} className="focus-ring inline-flex rounded-xl border border-white/25 px-4 py-2.5 text-xs font-semibold text-white">Comparar</Link>}</div></section>
          </aside>
        </div>
      </main>
    </div>
  );
}
