import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { getPageAuth } from "@/lib/page-auth";
import { LoginForm } from "./login-form";

export default async function TeacherLoginPage() {
  const user = await getPageAuth();

  if (user?.role === "MENTOR") {
    redirect("/dashboard/teacher/overview");
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      description="Enter the workspace built for your rhythm. Mentors move straight into their teaching surface."
      eyebrow="Welcome Back"
      highlights={[
        {
          title: "Mentor workspace",
          description:
            "Jump into the teaching dashboard, live-class controls, and support flow with the same sign-in.",
        },
      ]}
      title="Sign back in without re-entering the maze."
    >
      <LoginForm />
    </AuthShell>
  );
}
