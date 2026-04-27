import { notFound } from "next/navigation";
import { StudentAssignmentTask } from "../../_components/student-assignment-task";
import {
  assignmentTaskSlugs,
  getAssignmentTaskBySlug,
} from "../assignments-data";

type AssignmentTaskDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return assignmentTaskSlugs.map((slug) => ({ slug }));
}

export default async function AssignmentTaskDetailPage({
  params,
}: AssignmentTaskDetailPageProps) {
  const { slug } = await params;
  const assignment = getAssignmentTaskBySlug(slug);

  if (!assignment) {
    notFound();
  }

  return <StudentAssignmentTask assignment={assignment} />;
}
