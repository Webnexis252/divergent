import { notifyCourseStudentsBatch } from '@/lib/course-notifications';
import { sendClassReminderBatch } from '@/lib/class-reminders';
import { sendWeeklyReportBatch } from '@/lib/weekly-reports';
import { enqueueJob, type JobName, type JobPayloads } from '@/lib/jobs';

/**
 * One step of each job: does one batch and returns the payload for the next
 * batch, or null when the job is finished.
 */
const handlers: { [K in JobName]: (payload: JobPayloads[K]) => Promise<JobPayloads[K] | null> } = {
  'course-notify': async (payload) => {
    const { created, nextCursor } = await notifyCourseStudentsBatch(payload.courseId, payload.content, payload.cursor);
    console.log(`[JOBS] course-notify ${payload.courseId}: ${created} notifications`);
    return nextCursor ? { ...payload, cursor: nextCursor } : null;
  },
  'weekly-reports': async (payload) => {
    const { sent, failed, nextCursor } = await sendWeeklyReportBatch(payload.weekEnding, payload.cursor);
    console.log(`[JOBS] weekly-reports ${payload.weekEnding}: ${sent} sent, ${failed} failed`);
    return nextCursor ? { ...payload, cursor: nextCursor } : null;
  },
  'class-reminders': async (payload) => {
    const { sent, failed, nextCursor } = await sendClassReminderBatch(payload.liveClassId, payload.cursor);
    console.log(`[JOBS] class-reminders ${payload.liveClassId}: ${sent} sent, ${failed} failed`);
    return nextCursor ? { ...payload, cursor: nextCursor } : null;
  },
};

function step<K extends JobName>(name: K, payload: JobPayloads[K]): Promise<JobPayloads[K] | null> {
  return (handlers[name] as (p: JobPayloads[K]) => Promise<JobPayloads[K] | null>)(payload);
}

/** Queue mode: run one batch, then hand the next batch back to the queue. */
export async function runJobStep<K extends JobName>(name: K, payload: JobPayloads[K]): Promise<void> {
  const next = await step(name, payload);
  if (next) await enqueueJob(name, next);
}

/** Fallback mode (no queue): run every batch in this invocation. */
export async function runJobToCompletion<K extends JobName>(name: K, payload: JobPayloads[K]): Promise<void> {
  let next: JobPayloads[K] | null = payload;
  while (next) next = await step(name, next);
}
