"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { BrandLogo } from "@/components/ui/brand-logo";

const footerVariants = {
  student: {
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Courses", href: "/dashboard/courses" },
      { label: "Calendar", href: "/dashboard/calendar" },
      { label: "Live Classes", href: "/dashboard/live-classes" },
      { label: "Assignments", href: "/dashboard/assignments" },
    ],
    description:
      "The student product now runs on a calmer execution layer: clearer spacing, consistent surfaces, sharper focus states, and motion that helps instead of shouting.",
    closing:
      "Prepared for focused learning, live teaching, and daily consistency.",
  },
  teacher: {
    links: [
      { label: "Dashboard", href: "/dashboard/teacher/overview" },
      { label: "Calendar", href: "/dashboard/teacher/calendar" },
      { label: "Class Control", href: "/dashboard/teacher/class-control" },
      { label: "Assignments", href: "/dashboard/teacher/assignments" },
      { label: "Resources", href: "/dashboard/teacher/resources" },
      { label: "Analytics", href: "/dashboard/teacher/analytics" },
    ],
    description:
      "The teaching workspace is tuned for live instruction, clear review loops, and faster control over classes, resources, and student progress.",
    closing:
      "Prepared for clearer teaching rhythms, faster reviews, and better classroom flow.",
  },
  admin: {
    links: [
      { label: "Overview", href: "/admin/overview" },
      { label: "Calendar", href: "/admin/calendar" },
      { label: "Students", href: "/admin/students" },
      { label: "Courses", href: "/admin/courses" },
      { label: "Mentors", href: "/admin/mentors" },
      { label: "Live Classes", href: "/admin/live-classes" },
    ],
    description:
      "The operations layer stays calmer under load: better scan paths, cleaner controls, and dashboards that support decisions instead of adding friction.",
    closing:
      "Prepared for planning, moderation, delivery, and day-to-day operational clarity.",
  },
  superAdmin: {
    links: [
      { label: "Health", href: "/admin/super/overview" },
      { label: "Revenue", href: "/admin/super/revenue" },
      { label: "Coupons", href: "/admin/super/coupons" },
      { label: "Admins", href: "/admin/super/admins" },
      { label: "Settings", href: "/admin/super/settings" },
    ],
    description:
      "The owner control layer is shaped for oversight: revenue visibility, governance tools, and system-level settings collected into one focused surface.",
    closing:
      "Prepared for business visibility, governance, and confident system stewardship.",
  },
  public: {
    links: [
      { label: "Home", href: "/" },
      { label: "Student Login", href: "/login" },
      { label: "Teacher Login", href: "/teacher-login" },
      { label: "Sign Up", href: "/signup" },
      { label: "Teacher Access", href: "/teacher-register" },
      { label: "Contact Us", href: "/contact" },
    ],
    description:
      "Divergent Classes brings live learning, structured courses, mentorship, and progress systems into one calmer experience for students and educators.",
    closing:
      "Prepared for discovery, enrollment, and a smoother path into the learning workspace.",
  },
} as const;

const policyLinks = [
  { label: "Contact Us", href: "/contact" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Refund & Cancellation", href: "/refund-policy" },
];

export function DashboardFooter() {
  const pathname = usePathname();

  const variant = pathname.startsWith("/admin/super")
    ? footerVariants.superAdmin
    : pathname.startsWith("/admin")
      ? footerVariants.admin
      : pathname.startsWith("/dashboard/teacher")
        ? footerVariants.teacher
        : pathname.startsWith("/dashboard")
          ? footerVariants.student
          : footerVariants.public;

  return (
    <footer className="hidden border-t border-white/70 px-4 py-8 sm:block sm:px-6 lg:px-8">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex max-w-[1920px] flex-col gap-8 rounded-(--radius-xl) border border-white/80 bg-[rgba(13,13,20,0.96)] px-6 py-8 text-white shadow-[0_28px_60px_rgba(13,13,20,0.2)]"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.32 }}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[32rem] space-y-4">
            <BrandLogo inverted size="sm" />
            <p className="text-[14px] leading-7 text-white/65">
              {variant.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {variant.links.map((link) => (
              <Link
                key={link.href}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] font-semibold text-white/74 transition-colors duration-150 hover:border-white/20 hover:bg-white/8 hover:text-white"
                href={link.href}
              >
                {link.label}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 text-[12px] text-white/42 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Divergent Classes. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            {policyLinks.map((pl) => (
              <Link
                key={pl.href}
                href={pl.href}
                className="text-white/40 transition-colors hover:text-white/70"
              >
                {pl.label}
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </footer>
  );
}
