"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, FileText, PenBox, Video, BookOpen, Calendar, ClipboardList } from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  durationMins: number;
  isFreePreview: boolean;
};

type Chapter = {
  id: string;
  title: string;
  lessons: Lesson[];
};

type LiveClass = {
  id: string;
  title: string;
  startTime: Date;
  recordingUrl: string | null;
};

type Assignment = {
  id: string;
  title: string;
  createdAt: Date;
};

type Test = {
  id: string;
  title: string;
  durationMins: number;
  createdAt: Date;
};

type CourseCurriculumSectionProps = {
  chapters: Chapter[];
  liveClasses: LiveClass[];
  assignments: Assignment[];
  tests: Test[];
  isEnrolled: boolean;
  completedLessonIds: string[];
};

export function CourseCurriculumSection({
  chapters,
  liveClasses,
  assignments,
  tests,
  isEnrolled,
  completedLessonIds: completedLessonIdsProp,
}: CourseCurriculumSectionProps) {
  const [selectedLiveClassMonth, setSelectedLiveClassMonth] = useState<string>("ALL");
  const [selectedAssignmentMonth, setSelectedAssignmentMonth] = useState<string>("ALL");
  const [selectedTestMonth, setSelectedTestMonth] = useState<string>("ALL");
  
  const completedLessonIds = useMemo(() => new Set(completedLessonIdsProp), [completedLessonIdsProp]);

  const liveClassMonths = useMemo(() => {
    const monthSet = new Set<string>();
    liveClasses.forEach((lc) => monthSet.add(new Date(lc.startTime).toLocaleString('default', { month: 'long', year: 'numeric' })));
    return Array.from(monthSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [liveClasses]);

  const assignmentMonths = useMemo(() => {
    const monthSet = new Set<string>();
    assignments.forEach((a) => monthSet.add(new Date(a.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' })));
    return Array.from(monthSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [assignments]);

  const testMonths = useMemo(() => {
    const monthSet = new Set<string>();
    tests.forEach((t) => monthSet.add(new Date(t.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' })));
    return Array.from(monthSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [tests]);

  const filteredLiveClasses = useMemo(() => {
    if (selectedLiveClassMonth === "ALL") return liveClasses;
    return liveClasses.filter(lc => new Date(lc.startTime).toLocaleString('default', { month: 'long', year: 'numeric' }) === selectedLiveClassMonth);
  }, [liveClasses, selectedLiveClassMonth]);

  const filteredAssignments = useMemo(() => {
    if (selectedAssignmentMonth === "ALL") return assignments;
    return assignments.filter(a => new Date(a.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' }) === selectedAssignmentMonth);
  }, [assignments, selectedAssignmentMonth]);

  const filteredTests = useMemo(() => {
    if (selectedTestMonth === "ALL") return tests;
    return tests.filter(t => new Date(t.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' }) === selectedTestMonth);
  }, [tests, selectedTestMonth]);

  const hasContent = chapters.length > 0 || liveClasses.length > 0 || assignments.length > 0 || tests.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[26px] font-bold text-black flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-blue-500" />
          Course Curriculum
        </h2>
      </div>

      <div className="space-y-4">
        {hasContent ? (
          <>
            {/* Course Modules */}
            {chapters.length > 0 && (
              <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" open>
                <summary className="flex cursor-pointer items-center justify-between bg-gray-50 px-6 py-4 list-none transition-colors hover:opacity-80 [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-1 items-center gap-3">
                    <BookOpen className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Course Modules ({chapters.length})
                    </h2>
                  </div>
                  <ChevronDown className="ml-auto h-5 w-5 text-gray-400 group-open:hidden" />
                  <ChevronUp className="ml-auto h-5 w-5 text-gray-400 hidden group-open:block" />
                </summary>
                <div className="border-t border-gray-100 bg-white px-6 py-5">
                  <div className="space-y-5">
                    {chapters.map((chapter, index) => {
                      const chapterCompletedCount = isEnrolled
                        ? chapter.lessons.filter((l) => completedLessonIds.has(l.id)).length
                        : 0;
                      const chapterTotal = chapter.lessons.length;
                      const chapterPercent =
                        isEnrolled && chapterTotal > 0
                          ? Math.round((chapterCompletedCount / chapterTotal) * 100)
                          : 0;

                      return (
                        <div key={chapter.id} className="space-y-3">
                          {/* Chapter header */}
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[17px] font-semibold text-black">
                              <span className="mr-2 text-[#38c1ff]">Module {index + 1}:</span>
                              {chapter.title}
                            </p>
                            {isEnrolled && chapterTotal > 0 && (
                              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-medium text-[#777]">
                                {chapterCompletedCount}/{chapterTotal}
                              </span>
                            )}
                          </div>

                          {/* Chapter progress bar (enrolled only) */}
                          {isEnrolled && chapterTotal > 0 && (
                            <div className="h-1 w-full overflow-hidden rounded-full bg-black/6">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#4caf50,#38c1ff)] transition-all duration-500"
                                style={{ width: `${chapterPercent}%` }}
                              />
                            </div>
                          )}

                          {/* Lesson rows */}
                          {chapterTotal > 0 ? (
                            <div className="space-y-1.5 pt-1">
                              {chapter.lessons.map((lesson, li) => {
                                const done = isEnrolled && completedLessonIds.has(lesson.id);
                                return (
                                  <div
                                    key={lesson.id}
                                    className={`flex min-h-[44px] items-center justify-between gap-3 rounded-[10px] border px-[13px] py-[11px] text-[14px] transition-colors ${
                                      done
                                        ? "border-green-200 bg-green-50/60 text-green-800"
                                        : "border-[#e9e9e9] bg-white text-black"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {/* Lesson number */}
                                      <span className={`shrink-0 text-[11px] font-semibold w-5 text-right ${done ? "text-green-500" : "text-[#bbb]"}`}>
                                        {li + 1}
                                      </span>
                                      <span className="truncate">{lesson.title}</span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      {lesson.durationMins > 0 && (
                                        <span className="text-[11px] text-[#bbb]">
                                          {lesson.durationMins}m
                                        </span>
                                      )}
                                      {lesson.isFreePreview && (
                                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">
                                          Preview
                                        </span>
                                      )}
                                      {/* Completion tick */}
                                      {done ? (
                                        <span className="text-green-500 text-[16px]" aria-label="Completed">✓</span>
                                      ) : (
                                        <span className="h-4 w-4 rounded-full border-2 border-[#ddd]" aria-hidden />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex min-h-[44px] items-center rounded-[10px] border border-[#e9e9e9] px-[13px] py-[11px] text-[15px] text-[#8b8888]">
                              Lessons will appear here soon.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>
            )}

            {/* Live Classes */}
            {liveClasses.length > 0 && (
              <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" open>
                <summary className="flex cursor-pointer items-center justify-between bg-gray-50 px-6 py-4 list-none transition-colors hover:opacity-80 [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-purple-500" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        Live Classes ({filteredLiveClasses.length})
                      </h2>
                    </div>
                    {liveClassMonths.length > 0 && (
                      <div className="relative mr-4" onClick={(e) => e.preventDefault()}>
                        <select
                          value={selectedLiveClassMonth}
                          onChange={(e) => setSelectedLiveClassMonth(e.target.value)}
                          className="appearance-none bg-white border border-gray-200 rounded-lg pl-9 pr-8 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="ALL">All Months</option>
                          {liveClassMonths.map(month => (
                            <option key={month} value={month}>{month}</option>
                          ))}
                        </select>
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>
                  <ChevronDown className="shrink-0 h-5 w-5 text-gray-400 group-open:hidden" />
                  <ChevronUp className="shrink-0 h-5 w-5 text-gray-400 hidden group-open:block" />
                </summary>
                <div className="border-t border-gray-100 bg-white px-6 py-5">
                  {filteredLiveClasses.length > 0 ? (
                    <div className="space-y-2">
                      {filteredLiveClasses.map((lc) => {
                        const originalIndex = liveClasses.findIndex((x) => x.id === lc.id);
                        const isFreePreview = originalIndex < 2;
                        const canAccess = isEnrolled || isFreePreview;

                        return (
                          <div 
                            key={lc.id} 
                            onClick={() => {
                              if (!canAccess) {
                                alert("Please buy the course to see this live recording.");
                                return;
                              }
                              if (!lc.recordingUrl) {
                                alert("Recording is not available yet.");
                                return;
                              }
                              window.open(lc.recordingUrl, "_blank");
                            }}
                            className={`flex items-center gap-3 rounded-[10px] border border-[#e9e9e9] bg-white px-[13px] py-[11px] text-[14px] cursor-pointer hover:bg-gray-50 transition-colors ${!canAccess ? "opacity-80" : ""}`}
                          >
                            <Video className="h-4 w-4 text-[#bbb]" />
                            <span className="font-medium text-black">{lc.title}</span>
                            {!canAccess && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                                Locked
                              </span>
                            )}
                            {!isEnrolled && canAccess && (
                              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                                Preview
                              </span>
                            )}
                            <span className="ml-auto text-[12px] text-[#bbb]">{new Date(lc.startTime).toLocaleDateString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">No live classes found for the selected month.</div>
                  )}
                </div>
              </details>
            )}

            {/* Assignments */}
            {assignments.length > 0 && (
              <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" open>
                <summary className="flex cursor-pointer items-center justify-between bg-gray-50 px-6 py-4 list-none transition-colors hover:opacity-80 [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PenBox className="h-5 w-5 text-amber-500" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        Assignments ({filteredAssignments.length})
                      </h2>
                    </div>
                    {assignmentMonths.length > 0 && (
                      <div className="relative mr-4" onClick={(e) => e.preventDefault()}>
                        <select
                          value={selectedAssignmentMonth}
                          onChange={(e) => setSelectedAssignmentMonth(e.target.value)}
                          className="appearance-none bg-white border border-gray-200 rounded-lg pl-9 pr-8 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="ALL">All Months</option>
                          {assignmentMonths.map(month => (
                            <option key={month} value={month}>{month}</option>
                          ))}
                        </select>
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>
                  <ChevronDown className="shrink-0 h-5 w-5 text-gray-400 group-open:hidden" />
                  <ChevronUp className="shrink-0 h-5 w-5 text-gray-400 hidden group-open:block" />
                </summary>
                <div className="border-t border-gray-100 bg-white px-6 py-5">
                  {filteredAssignments.length > 0 ? (
                    <div className="space-y-2">
                      {filteredAssignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center gap-3 rounded-[10px] border border-[#e9e9e9] bg-white px-[13px] py-[11px] text-[14px]">
                          <PenBox className="h-4 w-4 text-[#bbb]" />
                          <span className="font-medium text-black">{assignment.title}</span>
                          <span className="ml-auto text-[12px] text-[#bbb]">{new Date(assignment.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">No assignments found for the selected month.</div>
                  )}
                </div>
              </details>
            )}

            {/* Exams */}
            {tests.length > 0 && (
              <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" open>
                <summary className="flex cursor-pointer items-center justify-between bg-gray-50 px-6 py-4 list-none transition-colors hover:opacity-80 [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        Exams ({filteredTests.length})
                      </h2>
                    </div>
                    {testMonths.length > 0 && (
                      <div className="relative mr-4" onClick={(e) => e.preventDefault()}>
                        <select
                          value={selectedTestMonth}
                          onChange={(e) => setSelectedTestMonth(e.target.value)}
                          className="appearance-none bg-white border border-gray-200 rounded-lg pl-9 pr-8 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="ALL">All Months</option>
                          {testMonths.map(month => (
                            <option key={month} value={month}>{month}</option>
                          ))}
                        </select>
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>
                  <ChevronDown className="shrink-0 h-5 w-5 text-gray-400 group-open:hidden" />
                  <ChevronUp className="shrink-0 h-5 w-5 text-gray-400 hidden group-open:block" />
                </summary>
                <div className="border-t border-gray-100 bg-white px-6 py-5">
                  {filteredTests.length > 0 ? (
                    <div className="space-y-2">
                      {filteredTests.map((test) => (
                        <div key={test.id} className="flex items-center gap-3 rounded-[10px] border border-[#e9e9e9] bg-white px-[13px] py-[11px] text-[14px]">
                          <FileText className="h-4 w-4 text-[#bbb]" />
                          <span className="font-medium text-black">{test.title}</span>
                          {test.durationMins > 0 && <span className="ml-auto text-[12px] text-[#bbb]">{test.durationMins} mins</span>}
                          <span className="ml-4 text-[12px] text-[#bbb]">{new Date(test.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">No exams found for the selected month.</div>
                  )}
                </div>
              </details>
            )}
          </>
        ) : (
          <div className="rounded-[10px] border border-dashed border-[#e9e9e9] px-5 py-10 text-center text-[15px] text-[#8b8888]">
            Curriculum will appear here as soon as lessons are published.
          </div>
        )}
      </div>
    </div>
  );
}
