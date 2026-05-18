import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { getPageAuth } from "@/lib/page-auth";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const user = await getPageAuth();

  if (user?.role === "MENTOR") {
    redirect("/dashboard/teacher/overview");
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      description="Create the account that matches how you’ll use the platform. The experience stays consistent; the workspace adapts to whether you’re learning or teaching."
      eyebrow="Start Here"
      highlights={[
        {
          title: "Students",
          description:
            "Move into the student dashboard, course schedule, doubts, and assignments from day one.",
        },
        {
          title: "Teachers",
          description:
            "Mentor accounts map to the existing teaching role so you can land inside the teacher surface immediately.",
        },
      ]}
      title="Choose the right workspace once, then get moving."
    >
      <Suspense fallback={<div>Loading...</div>}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
