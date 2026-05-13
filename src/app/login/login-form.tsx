"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, GraduationCap, UserRound } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { cx } from "@/lib/cx";

type LoginResponse = {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      role: "STUDENT" | "MENTOR" | "ADMIN";
    };
  };
  error?: string;
};

type AuthRole = "STUDENT" | "MENTOR" | "ADMIN";
type LoginMode = "TEACHER" | "STUDENT";

function getPostLoginHref(role: AuthRole) {
  if (role === "MENTOR") return "/dashboard/teacher/overview";
  return "/dashboard";
}

const modes = [
  {
    value: "TEACHER" as const,
    label: "Teacher",
    description: "Open the mentor dashboard, live-class tools, and review queues.",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    value: "STUDENT" as const,
    label: "Student",
    description: "Continue into your classes, assignments, quizzes, and progress view.",
    icon: <UserRound className="h-4 w-4" />,
  },
];

export function LoginForm() {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<LoginMode>("TEACHER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.success || !payload.data) {
        setError(payload.error ?? "Unable to log in right now.");
        return;
      }

      router.push(getPostLoginHref(payload.data.user.role));
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Surface className="w-full max-w-[33rem] px-5 py-5 sm:px-6 sm:py-6" tone="elevated">
      <div className="space-y-3">
        <p className="section-eyebrow">Account Access</p>
        <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-balance">
          Log in to your {loginMode === "TEACHER" ? "mentor" : "student"} workspace.
        </h2>
        <p className="text-[15px] leading-7 text-(--text-muted)">
          Use your existing account. The workspace adapts automatically after sign-in.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map((option) => {
            const active = loginMode === option.value;

            return (
              <motion.button
                key={option.value}
                aria-pressed={active}
                className={cx(
                  "group rounded-(--radius-lg) border px-4 py-4 text-left transition-[transform,border-color,background-color,box-shadow] duration-150 ease-out focus-visible:outline-none",
                  active
                    ? "border-(--brand-primary) bg-(--brand-primary-soft) shadow-[0_0_0_4px_rgba(56,193,255,0.12)]"
                    : "border-(--line-soft) bg-white/74 hover:border-(--line-strong) hover:bg-white",
                )}
                onClick={() => setLoginMode(option.value)}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[14px] font-semibold text-(--text-strong)">
                      {option.icon}
                      {option.label}
                    </div>
                    <p className="mt-3 text-[13px] leading-6 text-(--text-muted)">
                      {option.description}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className={cx(
                      "mt-1 h-4 w-4 rounded-full border transition-colors",
                      active
                        ? "border-(--brand-primary) bg-(--brand-primary)"
                        : "border-black/15 bg-transparent",
                    )}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>

        <Field
          autoComplete="email"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />

        <Field
          autoComplete="current-password"
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
          type="password"
          value={password}
        />

        {error ? (
          <p className="rounded-(--radius-md) border border-[rgba(255,61,0,0.18)] bg-[rgba(255,61,0,0.08)] px-4 py-3 text-[14px] text-(--danger)">
            {error}
          </p>
        ) : null}

        <Button block loading={isSubmitting} size="lg" type="submit">
          {isSubmitting
            ? "Signing in"
            : loginMode === "TEACHER"
              ? "Enter Mentor Workspace"
              : "Enter Student Workspace"}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3 text-[13px] text-(--text-subtle)">
        <div className="h-px flex-1 bg-black/[0.08]" />
        <span>Or continue with</span>
        <div className="h-px flex-1 bg-black/[0.08]" />
      </div>

      <a
        className={cx(
          buttonStyles({ variant: "secondary", size: "lg", className: "mt-6 w-full" }),
          "justify-between px-5",
        )}
        href={`/api/auth/google?action=login&role=${loginMode === "TEACHER" ? "MENTOR" : "STUDENT"}`}
      >
        <span className="flex items-center gap-3">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </span>
        <ArrowRight className="h-4 w-4" />
      </a>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-[14px] text-(--text-muted)">
        <span>No account yet?</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            className="font-semibold text-(--brand-primary-dark) transition-colors hover:text-(--brand-primary)"
            href="/signup"
          >
            Create account
          </Link>
          <Link
            className="font-semibold text-(--brand-primary-dark) transition-colors hover:text-(--brand-primary)"
            href="/"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </Surface>
  );
}
