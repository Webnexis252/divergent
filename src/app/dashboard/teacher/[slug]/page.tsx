import { notFound } from "next/navigation";
import { TeacherDashboard } from "../../_components/teacher-dashboard";
import { TeacherDoubtList } from "../../_components/teacher-doubt-list";
import { TeacherDoubtDetail } from "../../_components/teacher-doubt-detail";
import { TeacherAnalytics } from "../../_components/teacher-analytics";
import { requirePageAuth } from "@/lib/page-auth";

const teacherPageSlugs = [
  "overview",
  "doubt-list",
  "doubt-detail",
  "analytics",
] as const;

type TeacherDashboardPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return teacherPageSlugs.map((slug) => ({ slug }));
}

export default async function TeacherDashboardPage({
  params,
}: TeacherDashboardPageProps) {
  const { slug } = await params;

  if (!teacherPageSlugs.includes(slug as (typeof teacherPageSlugs)[number])) {
    notFound();
  }

  await requirePageAuth(["MENTOR"]);

  if (slug === "doubt-list") {
    return <TeacherDoubtList />;
  }

  if (slug === "doubt-detail") {
    return <TeacherDoubtDetail />;
  }

  if (slug === "analytics") {
    return <TeacherAnalytics />;
  }

  return <TeacherDashboard />;
}
