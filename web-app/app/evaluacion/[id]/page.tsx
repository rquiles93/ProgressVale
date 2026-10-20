import { notFound, redirect } from "next/navigation";
import { Assessment } from "@/components/assessment";
import { requireSession } from "@/lib/auth-session";
import { localizedSection, localizedTask, nextAvailableSection, protocolSections, protocolTaskById, protocolTasks, tasksForSection, type AssessmentLanguageValue } from "@/lib/ablls-content";
import { prisma } from "@/lib/prisma";
import { firstUnansweredTaskId } from "@/lib/progress";
import { appLanguage } from "@/lib/language";

export default async function AssessmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ task?: string; view?: string; section?: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const query = await searchParams;
  const assessment = await prisma.assessment.findFirst({
    where: { id, ownerId: session.user.id },
    include: { client: true, sections: true, scores: true, notes: true },
  });
  if (!assessment) notFound();
  const language: AssessmentLanguageValue = appLanguage(session.user.language);
  if (assessment.sections.length === 0) redirect(`/clientes/${assessment.clientId}`);

  const enabledCodes = new Set(assessment.sections.filter((section) => section.enabled).map((section) => section.sectionCode));
  const firstTask = protocolTasks.find((task) => enabledCodes.has(task.sectionCode));
  if (!firstTask) notFound();
  const requestedTask = query.task ? protocolTaskById.get(query.task) : undefined;
  const orderedEnabledTasks = protocolTasks.filter((item) => enabledCodes.has(item.sectionCode));
  const resumeTaskId = firstUnansweredTaskId(orderedEnabledTasks.map((item) => item.id), assessment.scores);
  const resumeTask = protocolTaskById.get(resumeTaskId ?? "") ?? firstTask;
  const task = requestedTask && enabledCodes.has(requestedTask.sectionCode) ? requestedTask : resumeTask;
  const score = assessment.scores.find((item) => item.skillIdentifier === task.id);
  const note = assessment.notes.find((item) => item.skillIdentifier === task.id);
  const sectionTasks = tasksForSection(task.sectionCode);
  const taskIndex = sectionTasks.findIndex((item) => item.id === task.id);
  const previousTask = sectionTasks[taskIndex - 1] ?? null;
  const nextTask = sectionTasks[taskIndex + 1] ?? null;

  const sidebarSections = protocolSections.map((section) => {
    const snapshot = assessment.sections.find((item) => item.sectionCode === section.code);
    const tasks = tasksForSection(section.code);
    const answered = tasks.filter((item) => assessment.scores.some((saved) => saved.skillIdentifier === item.id && saved.score !== null)).length;
    return { ...localizedSection(section, language), enabled: snapshot?.enabled ?? false, lockReason: snapshot?.lockReason ?? "PERMANENT", answered, href: tasks[0] ? `/evaluacion/${id}?task=${tasks[0].id}` : null, tasks: tasks.map((item) => ({ id: item.id, answered: assessment.scores.some((saved) => saved.skillIdentifier === item.id && saved.score !== null) })) };
  });

  const enabledTasks = orderedEnabledTasks;
  const answeredCount = enabledTasks.filter((item) => assessment.scores.some((saved) => saved.skillIdentifier === item.id && saved.score !== null)).length;
  const transitionSectionSource = query.section ? protocolSections.find((section) => section.code === query.section) ?? null : null;
  const nextSectionSource = transitionSectionSource ? nextAvailableSection(transitionSectionSource.code, enabledCodes) : null;
  const transitionSection = transitionSectionSource ? localizedSection(transitionSectionSource, language) : null;
  const nextSection = nextSectionSource ? localizedSection(nextSectionSource, language) : null;

  const view = query.view === "summary" || query.view === "section-complete" ? query.view : "task";
  return <Assessment key={`${task.id}:${view}`} assessment={{ id: assessment.id, status: assessment.status, language, clientId: assessment.clientId, clientName: assessment.client.name, clientIdentifier: assessment.client.identifier, protocolVersion: assessment.protocolVersion, answeredCount, enabledTaskCount: enabledTasks.length, lockedTaskCount: protocolTasks.length - enabledTasks.length }} sections={sidebarSections} task={localizedTask(task, language)} savedScore={score?.score ?? null} savedNote={note?.content ?? ""} previousTaskId={previousTask?.id ?? null} nextTaskId={nextTask?.id ?? null} view={view} transitionSection={transitionSection} nextSection={nextSection} />;
}
