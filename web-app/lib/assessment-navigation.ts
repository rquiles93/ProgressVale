export function navigationAfterTaskSave(assessmentId: string, taskId: string, sectionCode: string, sectionTaskIds: readonly string[]) {
  const position = sectionTaskIds.indexOf(taskId);
  if (position < 0) return null;
  const nextTaskId = sectionTaskIds[position + 1];
  return nextTaskId
    ? `/evaluacion/${assessmentId}?task=${nextTaskId}`
    : `/evaluacion/${assessmentId}?view=section-complete&section=${sectionCode}`;
}

export function assessmentSummaryHref(assessmentId: string, taskId: string) {
  return `/evaluacion/${assessmentId}?task=${taskId}&view=summary`;
}

export function assessmentTaskHref(assessmentId: string, taskId: string) {
  return `/evaluacion/${assessmentId}?task=${taskId}`;
}
