import { getPageAuth } from "@/lib/page-auth";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AdminInstallmentsClient } from "@/app/admin/installments/AdminInstallmentsClient";

export const dynamic = "force-dynamic";

type RawEnrollment = {
  id: string;
  userId: string;
  courseId: string;
  isInstallmentBased: boolean;
  currentInstallment: number;
  validUntil: Date | null;
  status: string;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  courseTitle: string;
  emiPlans: string | null;
};

type RawPendingRequest = {
  targetUserId: string;
  courseId: string | null;
};

export default async function AdminInstallmentsPage() {
  const auth = await getPageAuth();
  if (!auth || (auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN")) {
    return notFound();
  }

  // Raw SQL queries to avoid IDE Prisma type cache issues
  const enrollments = await prisma.$queryRaw<any[]>`
    SELECT 
      e.id,
      e."userId",
      e."courseId",
      e."isInstallmentBased",
      e."currentInstallment",
      e."validUntil",
      e.status,
      u.name as "userName",
      u.email as "userEmail",
      u.phone as "userPhone",
      c.title as "courseTitle",
      c."emiPlans"::text as "emiPlans",
      (
        SELECT notes FROM "Payment" p 
        WHERE p."userId" = e."userId" AND p."courseId" = e."courseId" AND p.status = 'SUCCESS'
        ORDER BY p."createdAt" ASC
        LIMIT 1
      ) as "paymentNotes"
    FROM "Enrollment" e
    JOIN "User" u ON u.id = e."userId"
    JOIN "Course" c ON c.id = e."courseId"
    WHERE e."isInstallmentBased" = true
      AND e."validUntil" IS NOT NULL
    ORDER BY e."validUntil" ASC
  `;

  const pendingRequests = await prisma.$queryRaw<RawPendingRequest[]>`
    SELECT "targetUserId", "courseId"
    FROM "StudentApprovalRequest"
    WHERE type = 'EXTEND_INSTALLMENT'
      AND status = 'PENDING'
  `;

  const pendingSet = new Set(
    pendingRequests.map((r) => `${r.targetUserId}-${r.courseId}`)
  );

  const formattedData = enrollments.map((enr) => {
    let parsedPlans: any[] = [];
    try {
      if (enr.emiPlans) {
        parsedPlans = JSON.parse(enr.emiPlans);
      }
    } catch {
      parsedPlans = [];
    }

    let planId = "legacy";
    try {
      if (enr.paymentNotes) {
        const notesObj = JSON.parse(enr.paymentNotes);
        if (notesObj.planId) planId = notesObj.planId;
      }
    } catch (e) {}

    let emiPlans: any[] = [];
    if (parsedPlans.length > 0) {
      if (parsedPlans[0]?.installments) {
        // new PricingPlan structure
        const selectedPlan = parsedPlans.find((p: any) => p.id === planId) || parsedPlans[0];
        emiPlans = selectedPlan.installments;
      } else {
        // legacy structure
        emiPlans = parsedPlans;
      }
    }

    const totalInstallments = emiPlans.length;
    const isExpired = enr.validUntil ? new Date() > enr.validUntil : false;
    const nextPlan =
      enr.currentInstallment < totalInstallments
        ? emiPlans[enr.currentInstallment]
        : null;
    const nextAmount = nextPlan ? Number(nextPlan.amount) : 0;

    return {
      id: enr.id,
      userId: enr.userId,
      courseId: enr.courseId,
      studentName: enr.userName || "Unknown Student",
      studentEmail: enr.userEmail || "No email",
      studentPhone: enr.userPhone || "",
      courseTitle: enr.courseTitle,
      currentInstallment: enr.currentInstallment,
      totalInstallments,
      nextAmount,
      validUntil: enr.validUntil ? new Date(enr.validUntil).toISOString() : null,
      isExpired,
      hasPendingRequest: pendingSet.has(`${enr.userId}-${enr.courseId}`),
    };
  }).filter((enr) => enr.currentInstallment < enr.totalInstallments);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Installments
          </h1>
          <p className="text-sm text-slate-500">
            Manage student installment plans and request extensions
          </p>
        </div>
      </div>

      <AdminInstallmentsClient initialData={formattedData} adminId={auth.userId} />
    </div>
  );
}
