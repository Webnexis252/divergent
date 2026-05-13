"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { cx } from "@/lib/cx";

interface LessonCompleteButtonProps {
  lessonId: string;
  courseSlug: string;
  nextLessonId?: string | null;
  /** Initial completion state from SSR */
  initialCompleted?: boolean;
}

export function LessonCompleteButton({
  lessonId,
  courseSlug,
  nextLessonId,
  initialCompleted = false,
}: LessonCompleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [progressInfo, setProgressInfo] = useState<{
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current completion status on mount (in case SSR was stale)
  useEffect(() => {
    fetch(`/api/lessons/${lessonId}/progress`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setIsCompleted(data.data.isCompleted);
        }
      })
      .catch(() => {/* silent */});
  }, [lessonId]);

  async function handleToggle() {
    setError(null);
    const newCompleted = !isCompleted;

    // Optimistic update
    setIsCompleted(newCompleted);

    try {
      const res = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: newCompleted }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Revert on failure
        setIsCompleted(!newCompleted);
        setError(data.message || "Failed to update progress");
        return;
      }

      setIsCompleted(data.data.isCompleted);
      setProgressInfo({
        completedLessons: data.data.completedLessons,
        totalLessons: data.data.totalLessons,
        progressPercent: data.data.progressPercent,
      });

      // Refresh server components to update sidebar/progress bars
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setIsCompleted(!newCompleted);
      setError("Network error — please try again");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Progress summary pill */}
      {progressInfo && (
        <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-[13px] font-medium text-green-700 ring-1 ring-green-200 w-fit">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {progressInfo.completedLessons} / {progressInfo.totalLessons} lessons completed
          <span className="text-green-500">({progressInfo.progressPercent}%)</span>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-red-500">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          aria-label={isCompleted ? "Mark lesson as incomplete" : "Mark lesson as complete"}
          className={cx(
            "inline-flex items-center gap-2.5 rounded-[10px] px-5 py-2.5 text-[14px] font-semibold transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            isCompleted
              ? "bg-green-600 text-white shadow-[0_4px_12px_rgba(22,163,74,0.30)] hover:bg-green-700 focus-visible:ring-green-500"
              : "bg-(--brand-primary-strong) text-white shadow-(--shadow-accent) hover:bg-(--brand-primary) focus-visible:ring-(--brand-primary)",
            (isPending) && "opacity-70 pointer-events-none",
          )}
          disabled={isPending}
          id="mark-complete-btn"
          onClick={handleToggle}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
          {isCompleted ? "Completed ✓" : "Mark as Complete"}
        </button>

        {/* Auto-advance to next lesson once marked complete */}
        {isCompleted && nextLessonId && (
          <a
            href={`/dashboard/courses/${courseSlug}/lessons/${nextLessonId}`}
            className="inline-flex items-center gap-2 rounded-[10px] border border-(--line-soft) bg-white px-5 py-2.5 text-[14px] font-semibold text-(--text-strong) hover:border-(--line-strong) hover:bg-white/80 transition-colors duration-150"
          >
            Next Lesson →
          </a>
        )}
      </div>
    </div>
  );
}
