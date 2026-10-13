import { AppHeader } from "@/components/ui";
import { ClientList } from "@/components/client-list";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default async function ClientsPage() {
  const session = await requireSession();
  const records = await prisma.client.findMany({
    where: { ownerId: session.user.id },
    include: { assessments: { select: { status: true, updatedAt: true }, orderBy: { updatedAt: "desc" } } },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
  const clients = records.map((client) => {
    const hasUnfinished = client.assessments.some((assessment) => assessment.status === "DRAFT" || assessment.status === "IN_PROGRESS");
    const hasHistory = client.assessments.some((assessment) => assessment.status === "COMPLETED" || assessment.status === "ARCHIVED");
    const status = hasUnfinished ? "En progreso" as const : hasHistory ? "Completada" as const : "Sin iniciar" as const;
    const lastActivity = client.assessments[0]?.updatedAt ?? client.updatedAt;
    return { id: client.id, name: client.name, identifier: client.identifier, initials: initials(client.name), status, progress: null, lastActivity: new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(lastActivity) };
  });
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader user={{ name: session.user.name, email: session.user.email }} />
      <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14"><ClientList clients={clients} /></main>
      <footer className="mx-auto flex max-w-[1440px] items-center justify-between px-5 pb-8 text-[10px] text-ink/35 sm:px-8 lg:px-12"><span>ABLLS-R · Prototipo visual</span><span>Fase 1</span></footer>
    </div>
  );
}
