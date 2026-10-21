import { getSession } from "@/lib/auth-session";
import { getOwnedTrackingReport } from "@/lib/pdf-data";
import { generateTrackingXlsx, trackingXlsxFilename } from "@/lib/tracking-xlsx";
import { appLanguage } from "@/lib/language";

export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session) return new Response("No autorizado", { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id } = await params; let report;
  const language = appLanguage(session.user.language);
  try { report = await getOwnedTrackingReport(id, session.user.id, language); } catch { return new Response("No se pudo preparar el reporte.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
  if (!report) return new Response("No encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });
  try { const workbook = await generateTrackingXlsx(report, language); return new Response(new Uint8Array(workbook), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${trackingXlsxFilename(report)}"`, "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" } }); } catch { return new Response("No se pudo generar el reporte.", { status: 500, headers: { "Cache-Control": "no-store" } }); }
}
