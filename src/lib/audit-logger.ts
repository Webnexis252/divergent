import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

type AuditAction =
  | 'COURSE_CREATED' | 'COURSE_DELETED' | 'COURSE_UPDATED'
  | 'STUDENT_SUSPENDED' | 'STUDENT_ACTIVATED'
  | 'PAYMENT_REFUNDED'
  | 'MENTOR_ASSIGNED_TO_DOUBT'
  | 'DOUBT_RESOLVED' | 'DOUBT_CLOSED'
  | 'POST_DELETED' | 'POST_FLAGGED'
  | 'COHORT_CREATED'
  | 'USER_ROLE_UPDATED'
  | 'STUDENT_XP_ADJUSTED';

/**
 * Logs an admin or super-admin action to the audit trail.
 * This is a fire-and-forget utility — errors are swallowed to not disrupt the main flow.
 */
export async function logAudit(params: {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: (params.details || {}) as Prisma.InputJsonObject,
      },
    });
  } catch (err) {
    // Don't let audit logging failures break the main request
    console.error('[AUDIT_LOG_WRITE_ERROR]', err);
  }
}
