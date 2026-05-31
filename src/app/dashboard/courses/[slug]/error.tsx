"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function CoursePageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("CourseDetailPage error boundary triggered", error, {
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] border border-red-100 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="mb-2 text-[22px] font-bold tracking-tight text-black">
          Couldn&apos;t load this course
        </h1>
        <p className="mb-8 text-[14px] leading-6 text-gray-500">
          Something went wrong while loading the course page. This is usually a
          temporary issue — try refreshing or go back to your courses.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-gray-200 bg-white px-5 py-3 text-[14px] font-semibold text-black shadow-sm transition hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/dashboard/courses"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#38c1ff] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(56,193,255,0.3)] transition hover:bg-[#2db4f0]"
          >
            <Home className="h-4 w-4" />
            Back to Courses
          </Link>
        </div>
      </div>
    </div>
  );
}
