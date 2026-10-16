import type { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Who may do what with a course. Role checks alone ("is this a MENTOR?") let
 * any teacher edit any course's tests and any signed-in student open any
 * course's exams; these checks are about the course itself.
 */

export type CourseActor = { userId: string; role: UserRole };

/**
 * ADMIN and SUPER_ADMIN manage every course; a MENTOR only the courses they
 * teach. Content with no course (`courseId` null) is admin-only, matching the
 * teacher dashboards, which only list a mentor's own courses.
 */
export async function canManageCourse(actor: CourseActor, courseId: string | null): Promise<boolean> {
  if (actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN') return true;
  if (actor.role !== 'MENTOR' || !courseId) return false;
  const taught = await prisma.course.count({
    where: { id: courseId, teachers: { some: { id: actor.userId } } },
  });
  return taught > 0;
}

/** The enrollment fields that decide whether a student can still study the course. */
export type EnrollmentAccess = {
  status: string;
  isInstallmentBased: boolean;
  validUntil: Date | null;
};

/**
 * ACTIVE or COMPLETED enrollments give access. An installment enrollment
 * whose paid-up period has run out (`validUntil` in the past) doesn't, the
 * same rule the course and bundle pages use to ask for the next installment.
 */
export function enrollmentGrantsAccess(enrollment: EnrollmentAccess | null, now = new Date()): boolean {
  if (!enrollment) return false;
  if (enrollment.status !== 'ACTIVE' && enrollment.status !== 'COMPLETED') return false;
  if (enrollment.isInstallmentBased && enrollment.validUntil && enrollment.validUntil < now) return false;
  return true;
}

export async function hasStudentAccess(userId: string, courseId: string, now = new Date()): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { status: true, isInstallmentBased: true, validUntil: true },
  });
  return enrollmentGrantsAccess(enrollment, now);
}

export type CourseRelation = 'manager' | 'student' | 'none';

/** Managers see drafts and answer keys; students see published content they've paid for. */
export async function courseRelation(actor: CourseActor, courseId: string): Promise<CourseRelation> {
  if (await canManageCourse(actor, courseId)) return 'manager';
  if (await hasStudentAccess(actor.userId, courseId)) return 'student';
  return 'none';
}
