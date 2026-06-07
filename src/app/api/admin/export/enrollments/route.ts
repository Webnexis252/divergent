import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["SUPER_ADMIN"]);
    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const enrollments = await prisma.enrollment.findMany({
      include: {
        user: {
          include: {
            payments: true,
          },
        },
        course: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const headers = [
      "Learner Details",
      "Name",
      "Mobile",
      "Enrolled Type",
      "Product title",
      "Product Type",
      "Enrolled On",
      "Expiry Date",
      "Enrolled By",
      "Purchased On",
      "Overall Spent",
      "Repurchased",
      "Signed Up",
      "Last Active On",
    ];

    const rows = enrollments.map((e) => {
      const email = e.user.email || "NA";
      const name = e.user.name || "NA";
      const phone = e.user.phone || "NA";
      const isFree = e.course.price === 0;
      const enrolledType = isFree ? "Free" : "Paid";
      const productTitle = e.course.title;
      // You can tweak this if you introduce an actual CourseType field:
      const productType = e.course.category || "Course";
      const enrolledOn = e.createdAt.toISOString();
      const expiryDate = "NA"; // No strict expiry column currently
      const enrolledBy = "Learner"; // Default
      
      // Calculate payment info related to this course
      const coursePayments = e.user.payments.filter((p) => p.courseId === e.courseId && p.status === "SUCCESS");
      let purchasedOn = "NA";
      let overallSpent = 0;

      if (coursePayments.length > 0) {
        purchasedOn = coursePayments[0].createdAt.toISOString().split("T")[0];
        overallSpent = coursePayments.reduce((sum, p) => sum + p.amount, 0);
      }

      const repurchased = coursePayments.length > 1 ? "Yes" : "No";
      const signedUp = e.user.createdAt.toISOString();
      const lastActiveOn = e.user.updatedAt.toISOString();

      return [
        email,
        name,
        phone,
        enrolledType,
        productTitle,
        productType,
        enrolledOn,
        expiryDate,
        enrolledBy,
        purchasedOn,
        overallSpent,
        repurchased,
        signedUp,
        lastActiveOn,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => {
            if (typeof value === "string") {
              // Escape double quotes and wrap in quotes if there's a comma
              const escaped = value.replace(/"/g, '""');
              return `"${escaped}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const response = new NextResponse(csvContent);
    response.headers.set("Content-Type", "text/csv; charset=utf-8");
    response.headers.set("Content-Disposition", 'attachment; filename="learner_enrollments.csv"');
    
    return response;

  } catch (error) {
    console.error("[EXPORT_ENROLLMENTS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
