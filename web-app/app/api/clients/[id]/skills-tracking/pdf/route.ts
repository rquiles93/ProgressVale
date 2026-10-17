import { getSession } from "@/lib/auth-session";
import { getOwnedTrackingReport } from "@/lib/pdf-data";
import { generateTrackingPdf, trackingPdfFilename } from "@/lib/pdf-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("No autorizado", { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id } = await params;
  let report;
  try {
    report = await getOwnedTrackingReport(id, session.user.id);
  } catch {
    return new Response("No se pudo preparar el reporte.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!report) return new Response("No encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });
  let pdf;
  try {
    pdf = await generateTrackingPdf(report);
  } catch {
    return new Response("No se pudo generar el reporte.", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${trackingPdfFilename(report)}"`,
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
