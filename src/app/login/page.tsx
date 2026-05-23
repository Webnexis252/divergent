import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { getPageAuth } from "@/lib/page-auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getPageAuth();

  if (user?.role === "MENTOR") {
    redirect("/dashboard/teacher/overview");
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      description="Enter the workspace built for your rhythm. Students return to classes, deadlines, and progress in one place."
      eyebrow="Welcome Back"
      highlights={[
        {
          title: "Student workspace",
          description:
            "Open upcoming classes, assignments, and progress without bouncing between disconnected screens.",
        },
      ]}
      title="Sign back in without re-entering the maze."
    >
      <LoginForm />
    </AuthShell>
  );
}
