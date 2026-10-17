"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireUserId } from "@/lib/auth-session";
import { initialSectionAvailability, PROTOCOL_VERSION, protocolSections, protocolTaskById, tasksForSection, type ServiceSettingValue } from "@/lib/ablls-content";
import { prisma } from "@/lib/prisma";
import { availableAssessmentColors, isAssessmentColor } from "@/lib/assessment-colors";

export type AssessmentActionState = { status: "idle" | "success" | "error"; message: string; navigateTo?: string };

async function ownedAssessment(assessmentId: string, ownerId: string) {
  return prisma.assessment.findFirst({ where: { id: assessmentId, ownerId }, include: { sections: true } });
}

export async function startAssessmentAction(formData: FormData) {
  const ownerId = await requireUserId();
  const clientId = String(formData.get("clientId") ?? "");
  const requestedColor = String(formData.get("trackingColor") ?? "").toUpperCase();
  const client = await prisma.client.findFirst({ where: { id: clientId, ownerId }, select: { id: true, serviceSettings: true, assessments: { select: { id: true, status: true, trackingColor: true, sections: { select: { id: true }, take: 1 } } } } });
  if (!client) redirect("/clientes");
  if (client.serviceSettings.length === 0) redirect(`/clientes/${client.id}?settingRequired=1`);

  const settings = client.serviceSettings as ServiceSettingValue[];
  const activeAssessment = client.assessments.find((assessment) => assessment.status === "DRAFT" || assessment.status === "IN_PROGRESS");
  if (activeAssessment) {
    if (activeAssessment.sections.length === 0) {
      await prisma.assessment.update({ where: { id: activeAssessment.id }, data: { status: "IN_PROGRESS", evaluationStartedAt: new Date(), protocolVersion: PROTOCOL_VERSION, serviceSettingsSnapshot: settings, sections: { create: initialSectionAvailability(settings) } } });
    }
    redirect(`/evaluacion/${activeAssessment.id}`);
  }
  const availableColors = availableAssessmentColors(client.assessments.map((assessment) => assessment.trackingColor));
  if (!isAssessmentColor(requestedColor) || !availableColors.some((color) => color.value === requestedColor)) redirect(`/clientes/${client.id}?colorUnavailable=1`);
  let assessmentId: string;
  try {
    const assessment = await prisma.assessment.create({
      data: {
        clientId: client.id,
        ownerId,
        status: "IN_PROGRESS",
        evaluationStartedAt: new Date(),
        protocolVersion: PROTOCOL_VERSION,
        serviceSettingsSnapshot: settings,
        trackingColor: requestedColor,
        sections: { create: initialSectionAvailability(settings) },
      },
      select: { id: true },
    });
    assessmentId = assessment.id;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const concurrentAssessment = await prisma.assessment.findFirst({
      where: { clientId: client.id, ownerId, status: { in: ["DRAFT", "IN_PROGRESS"] } },
      select: { id: true },
    });
    if (!concurrentAssessment) redirect(`/clientes/${client.id}?colorUnavailable=1`);
    assessmentId = concurrentAssessment.id;
  }
  redirect(`/evaluacion/${assessmentId}`);
}

export async function saveTaskAction(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const ownerId = await requireUserId();
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const score = Number(formData.get("score"));
  const note = String(formData.get("note") ?? "").trim();
  const task = protocolTaskById.get(taskId);
  if (!task || !Number.isInteger(score) || !task.validScores.includes(score)) return { status: "error", message: "Selecciona una puntuación válida antes de continuar." };
  if (note.length > 10000) return { status: "error", message: "Las notas no pueden superar 10,000 caracteres." };

  const assessment = await ownedAssessment(assessmentId, ownerId);
  const section = assessment?.sections.find((item) => item.sectionCode === task.sectionCode);
  if (!assessment || assessment.status !== "IN_PROGRESS" || !section?.enabled || !protocolSections.find((item) => item.code === task.sectionCode)?.assessmentApproved) {
    return { status: "error", message: "Esta evaluación o sección no permite cambios." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const writable = await transaction.assessment.updateMany({ where: { id: assessmentId, ownerId, status: "IN_PROGRESS" }, data: { updatedAt: new Date() } });
      if (writable.count !== 1) throw new Error("ASSESSMENT_NOT_WRITABLE");
      await transaction.assessmentScore.upsert({ where: { assessmentId_skillIdentifier: { assessmentId, skillIdentifier: task.id } }, create: { assessmentId, skillIdentifier: task.id, score, maxScore: task.maxScore, observedAt: new Date() }, update: { score, maxScore: task.maxScore, observedAt: new Date() } });
      if (note) await transaction.assessmentNote.upsert({ where: { assessmentId_skillIdentifier: { assessmentId, skillIdentifier: task.id } }, create: { assessmentId, skillIdentifier: task.id, content: note }, update: { content: note } });
      else await transaction.assessmentNote.deleteMany({ where: { assessmentId, skillIdentifier: task.id } });
    });
  } catch {
    return { status: "error", message: "No se pudieron guardar los cambios. Tu selección permanece en pantalla." };
  }

  const sectionTasks = tasksForSection(task.sectionCode);
  const position = sectionTasks.findIndex((item) => item.id === task.id);
  const next = sectionTasks[position + 1];
  const navigateTo = next ? `/evaluacion/${assessmentId}?task=${next.id}` : `/evaluacion/${assessmentId}?view=section-complete&section=${task.sectionCode}`;
  revalidatePath(`/evaluacion/${assessmentId}`);
  return { status: "success", message: "Puntuación y notas guardadas.", navigateTo };
}

export async function toggleSectionAction(assessmentId: string, sectionCode: string, enabled: boolean): Promise<AssessmentActionState> {
  const ownerId = await requireUserId();
  const assessment = await ownedAssessment(assessmentId, ownerId);
  const section = assessment?.sections.find((item) => item.sectionCode === sectionCode);
  if (!assessment || assessment.status !== "IN_PROGRESS" || !section || section.lockReason !== "SERVICE_SETTING") return { status: "error", message: "Esta sección no se puede modificar." };
  try {
    await prisma.$transaction(async (transaction) => {
      const writable = await transaction.assessment.updateMany({ where: { id: assessmentId, ownerId, status: "IN_PROGRESS" }, data: { updatedAt: new Date() } });
      if (writable.count !== 1) throw new Error("ASSESSMENT_NOT_WRITABLE");
      await transaction.assessmentSection.update({ where: { assessmentId_sectionCode: { assessmentId, sectionCode } }, data: { enabled } });
    });
  } catch {
    return { status: "error", message: "Esta sección no se puede modificar." };
  }
  revalidatePath(`/evaluacion/${assessmentId}`);
  return { status: "success", message: enabled ? "Sección habilitada." : "Sección bloqueada." };
}

export async function finalizeAssessmentAction(formData: FormData) {
  const ownerId = await requireUserId();
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const assessment = await ownedAssessment(assessmentId, ownerId);
  if (!assessment || assessment.status !== "IN_PROGRESS") redirect("/clientes");
  const finalized = await prisma.assessment.updateMany({ where: { id: assessmentId, ownerId, status: "IN_PROGRESS" }, data: { status: "FINALIZED", evaluationCompletedAt: new Date(), updatedAt: new Date() } });
  if (finalized.count !== 1) redirect("/clientes");
  revalidatePath(`/clientes/${assessment.clientId}`);
  redirect(`/evaluacion/${assessmentId}?view=summary`);
}
