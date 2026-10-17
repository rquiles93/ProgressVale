import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { assessmentCsv } from "@/lib/assessment-csv";
import { protocolSections, protocolTasks } from "@/lib/ablls-content";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado", { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const { id } = await params;
  try {
    const assessment = await prisma.assessment.findFirst({
      where: { id, ownerId: session.user.id },
      select: { status: true, scores: { select: { skillIdentifier: true, score: true, maxScore: true } }, notes: { select: { skillIdentifier: true, content: true } }, sections: { select: { sectionCode: true, enabled: true } } },
    });
    if (!assessment) return new NextResponse("No encontrado", { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const sectionNames = new Map(protocolSections.map((section) => [section.code, section.name]));
    return new NextResponse(assessmentCsv(assessment, protocolTasks, sectionNames), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="evaluacion-${id}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new NextResponse("No se pudo preparar la exportación.", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
