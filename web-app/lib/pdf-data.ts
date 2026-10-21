import "server-only";

import { localizedSection, localizedTask, protocolSections, tasksForSection, type AssessmentLanguageValue } from "@/lib/ablls-content";
import { prisma } from "@/lib/prisma";
import type { AssessmentReportData, ReportSection, TrackingReportData } from "@/lib/pdf-reports";

const assessmentReportSections: ReportSection[] = protocolSections
  .filter((section) => section.assessmentApproved)
  .map((section) => ({
    code: section.code,
    name: section.name,
    tasks: tasksForSection(section.code).map((task) => ({ id: task.id, sectionCode: task.sectionCode, taskName: task.taskName, maxScore: task.maxScore })),
  }));

const trackingReportSections = (language: AssessmentLanguageValue): ReportSection[] => protocolSections.map((section) => ({
  code: section.code,
  name: localizedSection(section, language).name,
  assessmentApproved: section.assessmentApproved,
  permanentlyExcluded: section.permanentlyExcluded,
  tasks: tasksForSection(section.code).map((task) => ({ id: task.id, sectionCode: task.sectionCode, taskName: localizedTask(task, language).taskName, maxScore: task.maxScore })),
}));

export async function getOwnedAssessmentReport(assessmentId: string, ownerId: string): Promise<AssessmentReportData | null> {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, ownerId },
    include: { client: true, scores: true, notes: true, sections: true },
  });
  if (!assessment) return null;
  return {
    clientName: assessment.client.name,
    clientIdentifier: assessment.client.identifier,
    status: assessment.status,
    createdAt: assessment.createdAt,
    evaluationStartedAt: assessment.evaluationStartedAt,
    evaluationCompletedAt: assessment.evaluationCompletedAt,
    serviceSettings: assessment.serviceSettingsSnapshot,
    protocolVersion: assessment.protocolVersion,
    sections: assessmentReportSections,
    sectionStates: assessment.sections,
    scores: assessment.scores,
    notes: assessment.notes,
  };
}

export async function getOwnedTrackingReport(clientId: string, ownerId: string, language: AssessmentLanguageValue = "EN"): Promise<TrackingReportData | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, ownerId },
    include: {
      assessments: {
        where: { status: { in: ["IN_PROGRESS", "COMPLETED", "FINALIZED"] } },
        orderBy: [{ evaluationCompletedAt: "asc" }, { createdAt: "asc" }],
        include: { scores: true, sections: true },
      },
    },
  });
  if (!client) return null;
  return { clientName: client.name, clientIdentifier: client.identifier, sections: trackingReportSections(language), assessments: client.assessments };
}
