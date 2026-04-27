"use client";

import { Search, BookOpen, FileText, ClipboardList, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import useSWR from "swr";
import { cx } from "@/lib/cx";
import { apiClient } from "@/lib/api-client";

interface Course {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
}

interface Lesson {
  id: string;
  title: string;
  contentType: "VIDEO" | "PDF" | "TEXT";
  chapter: { course: { slug: string; title: string } };
}

interface Assignment {
  id: string;
  title: string;
  deadline: string | null;
}

interface SearchResults {
  courses: Course[];
  lessons: Lesson[];
  assignments: Assignment[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function ResultSection<T>({
  title,
  items,
  renderItem,
}: {
  title: string;
  items: T[];
  renderItem: (item: T, idx: number) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">
        {title}
      </p>
      {items.map((item, idx) => renderItem(item, idx))}
    </div>
  );
}

const fetcher = (url: string) => apiClient.get<SearchResults>(url);

export function GlobalSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 280);

  const shouldFetch = debouncedQuery.length >= 2;
  const { data: results, isValidating: loading } = useSWR<SearchResults>(
    shouldFetch ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetcher
  );

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const hasResults =
    results &&
    (results.courses.length > 0 ||
      results.lessons.length > 0 ||
      results.assignments.length > 0);

  const showDropdown = open && query.length >= 2;

  return (
    <div className={cx("relative", className)} ref={containerRef}>
      <label className="block">
        <span className="sr-only">Search dashboard</span>
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-black/35" />
          <input
            ref={inputRef}
            className="h-12 w-full rounded-full border border-black/6 bg-white pl-10 pr-12 text-[15px] text-black/80 shadow-[0_2px_10px_rgba(0,0,0,0.08)] placeholder:text-black/35 focus:border-[#38c1ff]/40 focus:outline-none focus:ring-2 focus:ring-[#38c1ff]/20"
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search courses, lessons… (⌘K)"
            type="search"
            value={query}
          />
          {query && (
            <button
              className="absolute right-4 rounded-full p-0.5 text-black/30 hover:text-black/60"
              onClick={() => { setQuery(""); }}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </label>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[18px] border border-black/8 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.14)]"
            exit={{ opacity: 0, y: -6 }}
            initial={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  className="h-5 w-5 rounded-full border-2 border-[#38c1ff] border-t-transparent"
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                />
              </div>
            ) : !hasResults ? (
              <div className="px-5 py-10 text-center">
                <Search className="mx-auto h-7 w-7 text-black/15" />
                <p className="mt-2 text-[14px] text-black/40">No results for &quot;{query}&quot;</p>
              </div>
            ) : (
              <div className="py-2" onClick={handleClose}>
                <ResultSection
                  title="Courses"
                  items={results?.courses ?? []}
                  renderItem={(course) => (
                    <Link
                      key={course.id}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.03]"
                      href={`/dashboard/courses/${course.slug}`}
                    >
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[#38c1ff]/10">
                        <BookOpen className="h-4 w-4 text-[#38c1ff]" />
                      </div>
                      <p className="text-[14px] font-medium text-black">{course.title}</p>
                    </Link>
                  )}
                />

                <ResultSection
                  title="Lessons"
                  items={results?.lessons ?? []}
                  renderItem={(lesson) => (
                    <Link
                      key={lesson.id}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.03]"
                      href={`/dashboard/courses/${lesson.chapter.course.slug}/lessons/${lesson.id}`}
                    >
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[#ffc107]/10">
                        <FileText className="h-4 w-4 text-[#ffc107]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-black">{lesson.title}</p>
                        <p className="text-[11px] text-black/45">{lesson.chapter.course.title}</p>
                      </div>
                    </Link>
                  )}
                />

                <ResultSection
                  title="Assignments"
                  items={results?.assignments ?? []}
                  renderItem={(assignment) => (
                    <Link
                      key={assignment.id}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.03]"
                      href="/dashboard/assignments"
                    >
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[#ff5e2f]/10">
                        <ClipboardList className="h-4 w-4 text-[#ff5e2f]" />
                      </div>
                      <p className="text-[14px] font-medium text-black">{assignment.title}</p>
                    </Link>
                  )}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
