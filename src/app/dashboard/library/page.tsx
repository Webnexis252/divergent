import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getPageAuth } from "@/lib/page-auth";
import { LibraryView } from "./LibraryView";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const auth = await getPageAuth(["STUDENT"]);
  if (!auth) redirect("/login");

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: auth.userId, status: "ACTIVE" },
    select: { course: { select: { id: true, title: true } } },
  });

  return <LibraryView courses={enrollments.map(({ course }) => course)} />;
}
