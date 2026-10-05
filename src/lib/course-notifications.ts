import prisma from '@/lib/prisma';
import { enqueueJob } from '@/lib/jobs';

export interface CourseNotificationContent {
  title: string;
  body: string;
  type?: string;
  actionUrl?: string | null;
}

// Enrollments read and notification rows inserted per round trip. Each row is
// ~6 bind parameters, so 2,000 rows stays far below Postgres' 65,535 limit.
const BATCH_SIZE = 2000;

/**
 * Notifies one batch of a course's ACTIVE students, starting after the
 * enrollment id `cursor`. Returns the cursor for the next batch, or null when
 * this was the last one.
 */
export async function notifyCourseStudentsBatch(
  courseId: string,
  content: CourseNotificationContent,
  cursor?: string,
): Promise<{ created: number; nextCursor: string | null }> {
  const { title, body, type = 'INFO', actionUrl = null } = content;
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: 'ACTIVE' },
    select: { id: true, userId: true },
    orderBy: { id: 'asc' },
    take: BATCH_SIZE,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  if (enrollments.length === 0) return { created: 0, nextCursor: null };

  const result = await prisma.notification.createMany({
    data: enrollments.map((e) => ({ userId: e.userId, title, body, type, actionUrl })),
  });
  return {
    created: result.count,
    nextCursor: enrollments.length < BATCH_SIZE ? null : enrollments[enrollments.length - 1].id,
  };
}

/**
 * Sends `content` to every ACTIVE student of a course, paging through
 * enrollments by id and inserting one chunk at a time, so a 100k-student
 * course never loads all ids or builds one giant INSERT.
 *
 * @returns the number of notifications created.
 */
export async function notifyCourseStudents(
  courseId: string,
  content: CourseNotificationContent,
): Promise<number> {
  let created = 0;
  let cursor: string | undefined;
  for (;;) {
    const batch = await notifyCourseStudentsBatch(courseId, content, cursor);
    created += batch.created;
    if (!batch.nextCursor) return created;
    cursor = batch.nextCursor;
  }
}

/**
 * Same as `notifyCourseStudents`, but off the request path, so the teacher or
 * admin who posted the assignment or live class isn't kept waiting while
 * thousands of rows are written. Goes through the job queue (src/lib/jobs.ts):
 * with QStash configured each batch is its own retried job; without it this
 * runs after the response as before. Failures are logged, never turned into a
 * failed create.
 */
export async function notifyCourseStudentsInBackground(
  courseId: string,
  content: CourseNotificationContent,
): Promise<void> {
  try {
    await enqueueJob('course-notify', { courseId, content });
  } catch (err) {
    console.error('[COURSE_NOTIFY_ERROR]', { courseId, err });
  }
}
