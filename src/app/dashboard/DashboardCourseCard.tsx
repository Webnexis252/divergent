"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { motion } from "motion/react";
import { buttonStyles } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { fadeUp } from "./_components/motion-wrappers";
import type { EnrolledCourse } from "./_types";

export function DashboardCourseCard({ course }: { course: EnrolledCourse }) {
  const progress = Math.max(0, Math.min(100, Math.round(course.progressPercent)));

  return (
    <motion.article
      className="h-full"
      transition={{ duration: 0.2 }}
      variants={fadeUp}
      whileHover={{ y: -3 }}
    >
      <Surface className="flex h-full flex-col overflow-hidden p-4 sm:p-5" tone="panel">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[calc(var(--radius-lg)-0.2rem)] bg-[rgba(56,193,255,0.1)]">
          {course.thumbnail ? (
            <Image
              alt={course.title}
              className="object-cover"
              fill
              sizes="(max-width: 1024px) 100vw, 32vw"
              src={course.thumbnail}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(56,193,255,0.2),rgba(254,198,0,0.16))]">
              <BookOpen className="h-8 w-8 text-[var(--brand-primary-dark)]" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between gap-5 px-1 pb-1 pt-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Badge tone="brand">{progress}% complete</Badge>
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                Enrolled
              </span>
            </div>
            <div>
              <h3 className="text-[22px] font-semibold tracking-[-0.05em] text-[var(--text-strong)] text-balance">
                {course.title}
              </h3>
              <p className="mt-2 text-[14px] leading-7 text-[var(--text-muted)]">
                {course.meta}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-primary-strong),var(--accent-gold))]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Link className={buttonStyles({ variant: "secondary", size: "sm", className: "w-full" })} href={`/dashboard/courses/${course.slug}`}>
              Continue learning
            </Link>
          </div>
        </div>
      </Surface>
    </motion.article>
  );
}
