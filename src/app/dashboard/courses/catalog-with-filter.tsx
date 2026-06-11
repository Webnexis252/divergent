"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { AnimCard, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { BundleCheckoutButton } from "@/app/(public)/bundles/[slug]/_components/BundleCheckoutButton";
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

export function CatalogWithFilter({
  courses,
  bundles,
  userId
}: {
  courses: Array<any>;
  bundles: Array<any>;
  userId: string;
}) {
  const [filter, setFilter] = useState<"ALL" | "COURSES" | "BUNDLES">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const items = [];
  
  if (filter === "ALL" || filter === "BUNDLES") {
    items.push(...bundles.map(b => ({ type: "BUNDLE" as const, data: b })));
  }
  if (filter === "ALL" || filter === "COURSES") {
    items.push(...courses.map(c => ({ type: "COURSE" as const, data: c })));
  }

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-[clamp(1.9rem,3vw,2rem)] font-medium text-black">
          {filter === "ALL" ? "Catalog" : filter === "BUNDLES" ? "Bundles" : "Courses"}
        </h2>
        
        <div className="relative inline-flex items-center">
          <select 
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="appearance-none rounded-[10px] border border-gray-200 bg-white px-4 py-2.5 pr-10 text-[14px] font-medium text-gray-700 outline-none hover:border-[#38c1ff] focus:border-[#38c1ff] focus:ring-1 focus:ring-[#38c1ff] shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer"
          >
            <option value="ALL">All Items</option>
            <option value="COURSES">Individual Courses</option>
            <option value="BUNDLES">Bundles</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-gray-400" />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[20px] bg-white px-6 py-8 shadow-[0_4px_10px_rgba(0,0,0,0.18)]">
          <p className="text-[1.15rem] font-semibold text-black">No items available</p>
          <p className="mt-3 text-[14px] leading-7 text-black/58">
            Try changing your filter.
          </p>
        </div>
      ) : (
        <StaggerGrid className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginatedItems.map((item) => {
            if (item.type === "COURSE") {
              const course = item.data;
              return (
                <AnimCard key={`course-${course.id}`}>
                  <article className="overflow-hidden rounded-[20px] bg-white p-[10px] shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] h-full flex flex-col">
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

                    <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
                      <div className="space-y-1 mb-4">
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

                      <div className="mt-auto flex items-end justify-between gap-4">
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
              );
            } else {
              const bundle = item.data;
              return (
                <AnimCard key={`bundle-${bundle.id}`}>
                  <article className="flex h-full flex-col overflow-hidden rounded-[20px] border border-blue-100 bg-blue-50/20 p-[10px] shadow-[0_4px_10px_rgba(56,193,255,0.1)] transition hover:shadow-[0_8px_20px_rgba(56,193,255,0.2)]">
                    <div className="overflow-hidden rounded-[16px] bg-[#d0d0d0]">
                      <div
                        aria-hidden="true"
                        className="h-[184px] w-full bg-cover bg-center"
                        style={{
                          backgroundImage: bundle.thumbnail
                            ? `linear-gradient(180deg, rgba(8, 16, 24, 0.04), rgba(8, 16, 24, 0.18)), url("${bundle.thumbnail}")`
                            : `linear-gradient(135deg, #bae6fd, #38c1ff)`,
                        }}
                      />
                    </div>

                    <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
                      <div className="space-y-1 mb-4">
                        <div className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 mb-1 tracking-wider uppercase">
                          Bundle
                        </div>
                        <h3 className="text-[16px] font-bold leading-[1.15] text-[#101828]">
                          {bundle.title}
                        </h3>
                        {bundle.description && (
                          <p className="line-clamp-2 text-[13px] text-gray-600 mt-1">
                            {bundle.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {bundle.courses.map((bc: any) => (
                            <span key={bc.course.title} className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                              {bc.course.title}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-blue-100/50">
                        <div className="flex items-end justify-between gap-4 mb-3">
                          <p className="text-[18px] font-bold text-[#38c1ff]">
                            ₹{bundle.price.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <BundleCheckoutButton bundleId={bundle.id} userId={userId} />
                      </div>
                    </div>
                  </article>
                </AnimCard>
              );
            }
          })}
        </StaggerGrid>
      )}

      {items.length > itemsPerPage && (
        <div className="flex items-center justify-end gap-4 px-2 py-4 text-sm text-[#64748b]">
          <div>
            {Math.min((currentPage - 1) * itemsPerPage + 1, items.length)}–
            {Math.min(currentPage * itemsPerPage, items.length)} of {items.length}
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
