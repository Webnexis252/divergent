"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimCard, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { cx } from "@/lib/cx";

const assets = {
  currentCourseFallback:
    "https://api.dicebear.com/9.x/shapes/svg?seed=973b6412-1165-4257-8071-b30234e453cb",
} as const;

function workspaceButtonStyles({
  variant = "primary",
  className,
}: {
  variant?: "primary" | "soft";
  className?: string;
}) {
  return cx(
    "inline-flex items-center justify-center rounded-[10px] font-semibold transition-transform duration-150 ease-out hover:-translate-y-0.5",
    variant === "primary"
      ? "bg-[#38c1ff] text-white shadow-[0_4px_12px_rgba(56,193,255,0.28)]"
      : "bg-white text-[#38c1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
    className,
  );
}

function formatPrice(price: number) {
  return price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Free";
}

function formatStudentCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k students`;
  }
  return `${value} student${value === 1 ? "" : "s"}`;
}

export function PaginatedCourses({
  courses,
}: {
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    price: number;
    teachers: { name: string | null }[];
    _count: { enrollments: number };
  }>;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(courses.length / itemsPerPage);
  const paginatedCourses = courses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (courses.length === 0) {
    return (
      <div className="rounded-[20px] bg-white px-6 py-8 shadow-[0_4px_10px_rgba(0,0,0,0.18)]">
        <p className="text-[1.15rem] font-semibold text-black">No courses available yet</p>
        <p className="mt-3 text-[14px] leading-7 text-black/58">
          Published courses will appear here as soon as the catalog is updated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StaggerGrid className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginatedCourses.map((course) => (
          <AnimCard key={course.id}>
            <article className="overflow-hidden rounded-[20px] bg-white p-[10px] shadow-[0_4px_10px_rgba(0,0,0,0.25)]">
              <div className="overflow-hidden rounded-[16px] bg-[#d0d0d0]">
                <div
                  aria-hidden="true"
                  className="h-[184px] w-full bg-cover bg-center"
                  style={{
                    backgroundImage: course.thumbnail
                      ? `linear-gradient(180deg, rgba(8, 16, 24, 0.04), rgba(8, 16, 24, 0.18)), url("${course.thumbnail}")`
                      : `url("${assets.currentCourseFallback}")`,
                  }}
                />
              </div>

              <div className="space-y-3 px-1 pb-1 pt-4">
                <div className="space-y-1">
                  <h3 className="text-[16px] font-semibold leading-[1.15] text-black">
                    {course.title}
                  </h3>
                  <p className="text-[12px] text-[#959595]">
                    by {course.teachers?.[0]?.name ?? "Expert Mentors"}
                  </p>
                  <p className="text-[12px] font-medium text-black">
                    {formatStudentCount(course._count.enrollments)}
                  </p>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[12px] font-medium text-black">
                      {formatPrice(course.price)}
                    </p>
                    <p className="text-[12px] text-[#4caf50]">
                      {course.price > 0 ? "Available now" : "Open access"}
                    </p>
                  </div>

                  <Link
                    className={workspaceButtonStyles({
                      className: "h-[32px] px-4 text-[12px]",
                    })}
                    href={`/dashboard/courses/${course.slug}`}
                  >
                    {course.price > 0 ? "Enroll Now" : "Open Course"}
                  </Link>
                </div>
              </div>
            </article>
          </AnimCard>
        ))}
      </StaggerGrid>

      {courses.length > itemsPerPage && (
        <div className="flex items-center justify-end gap-4 px-2 py-4 text-sm text-[#64748b]">
          <div>
            {Math.min((currentPage - 1) * itemsPerPage + 1, courses.length)}–
            {Math.min(currentPage * itemsPerPage, courses.length)} of {courses.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded p-1 hover:bg-[#f1f5f9] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="rounded p-1 hover:bg-[#f1f5f9] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
