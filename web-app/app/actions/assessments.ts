"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireUserId } from "@/lib/auth-session";
import { initialSectionAvailability, PROTOCOL_VERSION, protocolSections, protocolTaskById, tasksForSection, type AssessmentLanguageValue, type ServiceSettingValue } from "@/lib/ablls-content";
import { navigationAfterTaskSave } from "@/lib/assessment-navigation";
import { prisma } from "@/lib/prisma";
import { availableAssessmentColors, isAssessmentColor } from "@/lib/assessment-colors";

export type AssessmentActionState = { status: "idle" | "success" | "error"; message: string; navigateTo?: string };

const isLanguage = (value: string): value is AssessmentLanguageValue => value === "EN" || value === "ES";
const message = (language: AssessmentLanguageValue, english: string, spanish: string) => language === "ES" ? spanish : english;

async function ownedAssessment(assessmentId: string, ownerId: string) {
  return prisma.assessment.findFirst({ where: { id: assessmentId, ownerId }, include: { sections: true } });
}

export async function startAssessmentAction(formData: FormData) {
  const ownerId = await requireUserId();
  const clientId = String(formData.get("clientId") ?? "");
  const requestedColor = String(formData.get("trackingColor") ?? "").toUpperCase();
  const user = await prisma.user.findUnique({ where: { id: ownerId }, select: { language: true } });
  const requestedLanguage: AssessmentLanguageValue = user?.language ?? "EN";
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
        language: requestedLanguage,
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
  const assessment = await ownedAssessment(assessmentId, ownerId);
  const language: AssessmentLanguageValue = assessment?.language ?? "EN";
  if (!task || !Number.isInteger(score) || !task.validScores.includes(score)) return { status: "error", message: message(language, "Select a valid score before continuing.", "Selecciona una puntuación válida antes de continuar.") };
  if (note.length > 10000) return { status: "error", message: message(language, "Notes cannot exceed 10,000 characters.", "Las notas no pueden superar 10,000 caracteres.") };
  const section = assessment?.sections.find((item) => item.sectionCode === task.sectionCode);
  if (!assessment || assessment.status !== "IN_PROGRESS" || !section?.enabled || !protocolSections.find((item) => item.code === task.sectionCode)?.assessmentApproved) {
    return { status: "error", message: message(language, "This assessment or section cannot be changed.", "Esta evaluación o sección no permite cambios.") };
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
    return { status: "error", message: message(language, "Changes could not be saved. Your selection remains on screen.", "No se pudieron guardar los cambios. Tu selección permanece en pantalla.") };
  }

  const navigateTo = navigationAfterTaskSave(assessmentId, task.id, task.sectionCode, tasksForSection(task.sectionCode).map((item) => item.id));
  if (!navigateTo) return { status: "error", message: message(language, "The next assessment screen could not be determined.", "No se pudo determinar la siguiente pantalla de la evaluación.") };
  revalidatePath(`/evaluacion/${assessmentId}`);
  return { status: "success", message: message(language, "Score and notes saved.", "Puntuación y notas guardadas."), navigateTo };
}

export async function updateAssessmentLanguageAction(assessmentId: string, language: AssessmentLanguageValue) {
  const ownerId = await requireUserId();
  if (!isLanguage(language)) return { status: "error" as const };
  const assessment = await prisma.assessment.findFirst({ where: { id: assessmentId, ownerId }, select: { id: true, status: true, language: true } });
  if (!assessment) return { status: "error" as const };
  if (assessment.language !== language) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: ownerId }, data: { language } }),
      prisma.assessment.updateMany({ where: { id: assessmentId, ownerId }, data: { language } }),
    ]);
    revalidatePath(`/evaluacion/${assessmentId}`);
    revalidatePath("/clientes", "layout");
  } else {
    await prisma.user.update({ where: { id: ownerId }, data: { language } });
  }
  return { status: "success" as const };
}

export async function toggleSectionAction(assessmentId: string, sectionCode: string, enabled: boolean): Promise<AssessmentActionState> {
  const ownerId = await requireUserId();
  const assessment = await ownedAssessment(assessmentId, ownerId);
  const language: AssessmentLanguageValue = assessment?.language ?? "EN";
  const section = assessment?.sections.find((item) => item.sectionCode === sectionCode);
  if (!assessment || assessment.status !== "IN_PROGRESS" || !section || section.lockReason !== "SERVICE_SETTING") return { status: "error", message: message(language, "This section cannot be changed.", "Esta sección no se puede modificar.") };
  try {
    await prisma.$transaction(async (transaction) => {
      const writable = await transaction.assessment.updateMany({ where: { id: assessmentId, ownerId, status: "IN_PROGRESS" }, data: { updatedAt: new Date() } });
      if (writable.count !== 1) throw new Error("ASSESSMENT_NOT_WRITABLE");
      await transaction.assessmentSection.update({ where: { assessmentId_sectionCode: { assessmentId, sectionCode } }, data: { enabled } });
    });
  } catch {
    return { status: "error", message: message(language, "This section cannot be changed.", "Esta sección no se puede modificar.") };
  }
  revalidatePath(`/evaluacion/${assessmentId}`);
  return { status: "success", message: enabled ? message(language, "Section enabled.", "Sección habilitada.") : message(language, "Section locked.", "Sección bloqueada.") };
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
