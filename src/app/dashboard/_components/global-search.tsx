"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, BookOpen, FileText, CheckSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";

type SearchResult = {
  courses: { id: string; title: string; slug: string; thumbnail: string | null }[];
  lessons: { id: string; title: string; contentType: string; chapter: { course: { slug: string; title: string } } }[];
  assignments: { id: string; title: string; deadline: string | null }[];
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ courses: [], lessons: [], assignments: [] });
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
    setQuery("");
  }, [pathname]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults({ courses: [], lessons: [], assignments: [] });
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) {
          setResults(json.data);
        }
      })
      .catch((err) => console.error("Search error:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  const hasResults =
    results.courses.length > 0 || results.lessons.length > 0 || results.assignments.length > 0;

  const isDropdownVisible = isOpen && query.length >= 2;

  return (
    <div className="relative w-full max-w-[26rem]" ref={containerRef}>
      <div 
        className={cx(
          "flex h-11 w-full items-center gap-3 rounded-[var(--radius-pill)] border border-[var(--line-soft)] bg-white/84 px-4 text-[14px] shadow-[var(--shadow-soft)] transition-colors focus-within:border-[var(--brand-primary)]",
          isDropdownVisible && "rounded-b-none border-b-transparent shadow-none"
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
        <input
          type="text"
          placeholder="Search classes, assignments, or notes"
          className="h-full w-full bg-transparent text-[var(--text-strong)] outline-none placeholder:text-[var(--text-subtle)]"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="grid h-5 w-5 place-items-center rounded-full bg-[var(--line-soft)] text-[var(--text-muted)] hover:bg-[var(--line-strong)] hover:text-black"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isDropdownVisible && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-b-[16px] border border-t-0 border-[var(--line-soft)] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
          >
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {isLoading && !hasResults && (
                <div className="flex items-center justify-center py-8 text-[var(--text-subtle)]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-[14px]">Searching...</span>
                </div>
              )}

              {!isLoading && !hasResults && (
                <div className="py-8 text-center text-[14px] text-[var(--text-subtle)]">
                  No results found for &quot;{query}&quot;
                </div>
              )}

              {results.courses.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                    Courses
                  </div>
                  {results.courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/dashboard/courses/${course.slug}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[rgba(56,193,255,0.08)]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-100 text-blue-600">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-[var(--text-strong)]">
                          {course.title}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results.lessons.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                    Lessons
                  </div>
                  {results.lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/courses/${lesson.chapter.course.slug}/lessons/${lesson.id}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[rgba(56,193,255,0.08)]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-purple-100 text-purple-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-[var(--text-strong)]">
                          {lesson.title}
                        </p>
                        <p className="truncate text-[12px] text-[var(--text-subtle)]">
                          in {lesson.chapter.course.title}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results.assignments.length > 0 && (
                <div className="mb-1">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                    Assignments
                  </div>
                  {results.assignments.map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={`/dashboard/assignments`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[rgba(56,193,255,0.08)]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-orange-100 text-orange-600">
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-[var(--text-strong)]">
                          {assignment.title}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
