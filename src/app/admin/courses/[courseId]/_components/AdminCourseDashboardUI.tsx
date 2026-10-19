"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m as motion } from "motion/react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  Upload,
  Video,
  Search,
  Plus,
  X,
  Loader2,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  Check,
  BookOpen,
} from "lucide-react";
import { PageTransition } from "@/app/dashboard/_components/motion-wrappers";
import {
  AdminPageHeader,
  adminButton,
  adminButtonSm,
  adminInputClass,
  adminLabelClass,
  adminPanelClass,
} from "../../../_components/admin-ui";
import { formatShortDate } from "@/lib/date-format";

// ─── Types ────────────────────────────────────────────────────────────────────

type LiveClass = {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  duration: number;
  meetingUrl: string | null;
  recordingUrl: string | null;
  teacherId?: string | null;
  isEnded: boolean;
  createdAt: Date;
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | null;
  points: number;
  status: string;
  createdAt: Date;
};

type Exam = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  durationMins: number;
  passingScore: number;
  createdAt: Date;
  _count: { questions: number; attempts: number };
};

type CourseDetails = {
  id: string;
  title: string;
  liveClasses: LiveClass[];
  assignments: Assignment[];
  tests: Exam[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByMonth<T>(items: T[], dateExtractor: (item: T) => Date) {
  const groups: Record<string, T[]> = {};
  items.forEach((item) => {
    const d = new Date(dateExtractor(item));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const [year, month] = key.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      return { key, label, items: groups[key] };
    });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PUBLISHED: "bg-green-100 text-green-700",
    DRAFT: "bg-yellow-100 text-yellow-700",
    ACTIVE: "bg-blue-100 text-blue-700",
    CLOSED: "bg-[#f1f5f9] text-[#475569]",
  };
  return map[status] ?? "bg-[#f1f5f9] text-[#475569]";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminCourseDashboardUI({
  initialCourse,
  availableTeachers = [],
}: {
  initialCourse: CourseDetails;
  availableTeachers?: { id: string; name: string | null; email: string | null }[];
}) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetails>(initialCourse);

  // ── Accordion open/close ──
  const [examsOpen, setExamsOpen] = useState(true);
  const [liveClassesOpen, setLiveClassesOpen] = useState(true);
  const [assignmentsOpen, setAssignmentsOpen] = useState(true);

  // ── Month expand state ──
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const toggleMonth = (category: string, monthKey: string) => {
    const k = `${category}-${monthKey}`;
    setExpandedMonths((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  // ── Global search ──
  const [searchQuery, setSearchQuery] = useState("");

  // ── Recording upload ──
  const [recordingInputId, setRecordingInputId] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [savingRecording, setSavingRecording] = useState(false);

  const handleSaveRecording = async (classId: string) => {
    if (!recordingUrl.trim()) return;
    setSavingRecording(true);
    try {
      const res = await fetch(`/api/admin/live-classes/${classId}/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingUrl: recordingUrl.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save recording");

      setCourse((prev) => ({
        ...prev,
        liveClasses: prev.liveClasses.map((c) =>
          c.id === classId ? { ...c, recordingUrl: recordingUrl.trim() } : c,
        ),
      }));
      setRecordingInputId(null);
      setRecordingUrl("");
      router.refresh();
    } catch {
      alert("Failed to save recording URL");
    } finally {
      setSavingRecording(false);
    }
  };

  // ── Delete live class ──
  const handleDeleteLiveClass = async (classId: string) => {
    if (!confirm("Delete this live class? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/live-classes/${classId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setCourse((prev) => ({
        ...prev,
        liveClasses: prev.liveClasses.filter((c) => c.id !== classId),
      }));
    } catch {
      alert("Error deleting live class");
    }
  };

  // ── Filter helpers ──
  const filterItems = <T extends { title: string }>(items: T[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(q));
  };

  const filteredExams = filterItems(course.tests);
  const filteredClasses = filterItems(course.liveClasses);
  const filteredAssignments = filterItems(course.assignments);

  const examGroups = groupByMonth(filteredExams, (t) => new Date(t.createdAt));
  const classGroups = groupByMonth(filteredClasses, (c) => new Date(c.startTime));
  const assignmentGroups = groupByMonth(filteredAssignments, (a) => new Date(a.createdAt));

  // ─────────────────────────────────────────────────────────────────────────
  // LIVE CLASS FORM
  // ─────────────────────────────────────────────────────────────────────────
  const [showLiveClassForm, setShowLiveClassForm] = useState(false);
  const [savingLiveClass, setSavingLiveClass] = useState(false);
  const [liveClassError, setLiveClassError] = useState("");
  const [liveClassForm, setLiveClassForm] = useState({
    title: "",
    description: "",
    startTime: "",
    duration: 60,
    meetingUrl: "",
    teacherId: "",
  });

  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(event.target as Node)) {
        setIsTeacherDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateLiveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLiveClass(true);
    setLiveClassError("");
    try {
      const res = await fetch(
        `/api/admin/courses/${course.id}/live-classes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(liveClassForm),
        },
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to create live class");

      setCourse((prev) => ({
        ...prev,
        liveClasses: [payload.data, ...prev.liveClasses],
      }));
      setShowLiveClassForm(false);
      setLiveClassForm({ title: "", description: "", startTime: "", duration: 60, meetingUrl: "", teacherId: "" });
    } catch (err) {
      setLiveClassError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSavingLiveClass(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EXAM FORM
  // ─────────────────────────────────────────────────────────────────────────
  const [showExamForm, setShowExamForm] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [examError, setExamError] = useState("");
  const [examForm, setExamForm] = useState({
    title: "",
    description: "",
    type: "COURSE_EXAM",
    durationMins: 60,
    passingScore: 50,
    maxAttempts: 1,
    availableFrom: "",
  });

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExam(true);
    setExamError("");
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(examForm),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to create exam");

      router.push(`/admin/courses/${course.id}/exams/${payload.data.id}`);
    } catch (err) {
      setExamError(err instanceof Error ? err.message : "Network error");
      setSavingExam(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ASSIGNMENT FORM
  // ─────────────────────────────────────────────────────────────────────────
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [uploadingAssignment, setUploadingAssignment] = useState(false);
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    deadline: "",
    points: 0,
    attachmentUrl: "",
  });

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAssignment(true);
    setAssignmentError("");
    try {
      let uploadedUrl = assignmentForm.attachmentUrl;

      if (assignmentFile) {
        setUploadingAssignment(true);
        const formData = new FormData();
        formData.append("file", assignmentFile);
        
        const uploadRes = await fetch("/api/upload/assignments", {
          method: "POST",
          body: formData,
        });
        const uploadPayload = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadPayload.error || "Failed to upload file");
        
        uploadedUrl = uploadPayload.data.url;
        setUploadingAssignment(false);
      }

      const res = await fetch(`/api/admin/courses/${course.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...assignmentForm, attachmentUrl: uploadedUrl }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to create assignment");

      setCourse((prev) => ({
        ...prev,
        assignments: [payload.data, ...prev.assignments],
      }));
      setShowAssignmentForm(false);
      setAssignmentForm({ title: "", description: "", deadline: "", points: 0, attachmentUrl: "" });
      setAssignmentFile(null);
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : "Network error");
      setUploadingAssignment(false);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Delete this assignment? All submissions will also be removed.")) return;
    try {
      const res = await fetch(
        `/api/admin/courses/${course.id}/assignments?assignmentId=${assignmentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete");
      setCourse((prev) => ({
        ...prev,
        assignments: prev.assignments.filter((a) => a.id !== assignmentId),
      }));
    } catch {
      alert("Error deleting assignment");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#64748b] transition-colors hover:text-[#0f172a]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to courses
        </Link>

        <AdminPageHeader
          eyebrow="Course management"
          icon={BookOpen}
          title={course.title}
          description="Exams, assignments and curriculum for this course."
          actions={
            <label className="relative w-full sm:w-72">
              <span className="sr-only">Search items</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search items…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${adminInputClass} pl-10`}
              />
            </label>
          }
        />

        <div className="space-y-6">
          {/* ═══════════════════════════════════════════════════════════════
              EXAMS SECTION
          ═══════════════════════════════════════════════════════════════ */}
          <section className={`overflow-hidden ${adminPanelClass}`}>
            {/* Accordion header */}
            <div className="flex items-center justify-between px-6 py-4">
              <button
                className="flex flex-1 items-center gap-3 transition-colors hover:opacity-80"
                onClick={() => setExamsOpen(!examsOpen)}
              >
                <FileText className="h-5 w-5 text-blue-500" />
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[#0f172a]">
                  Exams ({course.tests.length})
                </h2>
                {examsOpen ? (
                  <ChevronUp className="ml-auto h-5 w-5 text-[#94a3b8]" />
                ) : (
                  <ChevronDown className="ml-auto h-5 w-5 text-[#94a3b8]" />
                )}
              </button>
              <button
                id="btn-add-exam"
                onClick={() => {
                  setExamsOpen(true);
                  setShowExamForm((v) => !v);
                }}
                className={`ml-4 ${adminButtonSm.primary}`}
              >
                {showExamForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {showExamForm ? "Cancel" : "Create Exam"}
              </button>
            </div>

            {/* Inline create form */}
            <AnimatePresence>
              {showExamForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-[#f1f5f9]"
                >
                  <form
                    onSubmit={handleCreateExam}
                    className="bg-[#f8fafc] px-6 py-5"
                  >
                    <h3 className="mb-4 text-sm font-semibold text-[#1e293b]">
                      New Exam
                    </h3>
                    {examError && (
                      <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                        {examError}
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <label className={adminLabelClass}>
                          Title *
                        </label>
                        <input
                          required
                          value={examForm.title}
                          onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                          placeholder="e.g. Midterm Exam"
                          className={adminInputClass}
                        />
                      </div>
                      <div>
                        <label className={adminLabelClass}>
                          Type
                        </label>
                        <select
                          value={examForm.type}
                          onChange={(e) => setExamForm({ ...examForm, type: e.target.value })}
                          className={adminInputClass}
                        >
                          <option value="COURSE_EXAM">Course Exam</option>
                          <option value="MOCK_TEST">Mock Test</option>
                          <option value="CHAPTER_TEST">Chapter Test</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className={adminLabelClass}>
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={examForm.description}
                          onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                          className={adminInputClass}
                        />
                      </div>
                      <div>
                        <label className={adminLabelClass}>
                          Duration (mins)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={examForm.durationMins}
                          onChange={(e) =>
                            setExamForm({ ...examForm, durationMins: parseInt(e.target.value) })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div>
                        <label className={adminLabelClass}>
                          Passing Score (%)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={examForm.passingScore}
                          onChange={(e) =>
                            setExamForm({ ...examForm, passingScore: parseInt(e.target.value) })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div>
                        <label className={adminLabelClass}>
                          Max Attempts
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={examForm.maxAttempts}
                          onChange={(e) =>
                            setExamForm({ ...examForm, maxAttempts: parseInt(e.target.value) })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div>
                        <label className={adminLabelClass}>
                          Available From (optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={examForm.availableFrom}
                          onChange={(e) => setExamForm({ ...examForm, availableFrom: e.target.value })}
                          className={adminInputClass}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingExam}
                        className={adminButton.primary}
                      >
                        {savingExam && <Loader2 className="h-4 w-4 animate-spin" />}
                        {savingExam ? "Creating..." : "Create Exam"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Exam list */}
            {examsOpen && (
              <div className="p-6">
                {examGroups.length === 0 ? (
                  <p className="text-center text-sm text-[#94a3b8]">
                    No exams created yet. Click &quot;Create Exam&quot; to add one.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {examGroups.map((group) => {
                      const isMonthOpen =
                        !!searchQuery.trim() || !!expandedMonths[`exams-${group.key}`];
                      return (
                        <div
                          key={group.key}
                          className="overflow-hidden rounded-[14px] border border-[#eef1f5] bg-[#fbfcfd]"
                        >
                          <button
                            onClick={() => toggleMonth("exams", group.key)}
                            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-100/50"
                          >
                            <h3 className="text-sm font-semibold text-[#334155]">
                              {group.label} ({group.items.length})
                            </h3>
                            {isMonthOpen ? (
                              <ChevronUp className="h-4 w-4 text-[#94a3b8]" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-[#94a3b8]" />
                            )}
                          </button>
                          {isMonthOpen && (
                            <div className="divide-y divide-[#f1f5f9] bg-white px-4">
                              {group.items.map((test) => (
                                <div
                                  key={test.id}
                                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-[#0f172a]">{test.title}</p>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#64748b]">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {test.durationMins}m
                                      </span>
                                      <span>·</span>
                                      <span>Pass: {test.passingScore}%</span>
                                      {test._count && (
                                        <>
                                          <span>·</span>
                                          <span>{test._count.questions} questions</span>
                                        </>
                                      )}
                                      <span
                                        className={`rounded-full px-2 py-0.5 font-medium ${statusBadge(test.status)}`}
                                      >
                                        {test.status}
                                      </span>
                                    </div>
                                  </div>
                                  <Link
                                    href={`/admin/courses/${course.id}/exams/${test.id}`}
                                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Manage
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              LIVE CLASSES SECTION
          ═══════════════════════════════════════════════════════════════ */}
          <section className={`overflow-hidden ${adminPanelClass}`}>
            <div className="flex items-center justify-between px-6 py-4">
              <button
                className="flex flex-1 items-center gap-3 transition-colors hover:opacity-80"
                onClick={() => setLiveClassesOpen(!liveClassesOpen)}
              >
                <Video className="h-5 w-5 text-purple-500" />
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[#0f172a]">
                  Live Classes ({course.liveClasses.length})
                </h2>
                {liveClassesOpen ? (
                  <ChevronUp className="ml-auto h-5 w-5 text-[#94a3b8]" />
                ) : (
                  <ChevronDown className="ml-auto h-5 w-5 text-[#94a3b8]" />
                )}
              </button>
              <button
                id="btn-add-live-class"
                onClick={() => {
                  setLiveClassesOpen(true);
                  setShowLiveClassForm((v) => !v);
                }}
                className={`ml-4 ${adminButtonSm.primary}`}
              >
                {showLiveClassForm ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {showLiveClassForm ? "Cancel" : "Schedule Class"}
              </button>
            </div>

            {/* Inline create form */}
            <AnimatePresence>
              {showLiveClassForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-[#f1f5f9]"
                >
                  <form onSubmit={handleCreateLiveClass} className="bg-[#f8fafc] px-6 py-5">
                    <h3 className="mb-4 text-sm font-semibold text-[#1e293b]">
                      Schedule Live Class
                    </h3>
                    {liveClassError && (
                      <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                        {liveClassError}
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className={adminLabelClass}>
                          Title *
                        </label>
                        <input
                          required
                          value={liveClassForm.title}
                          onChange={(e) =>
                            setLiveClassForm({ ...liveClassForm, title: e.target.value })
                          }
                          placeholder="e.g. Introduction to Chapter 3"
                          className={adminInputClass}
                        />
                      </div>
                      <div>
                        <label className={adminLabelClass}>
                          Duration (mins) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={liveClassForm.duration}
                          onChange={(e) =>
                            setLiveClassForm({ ...liveClassForm, duration: parseInt(e.target.value) })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className={adminLabelClass}>
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={liveClassForm.description}
                          onChange={(e) =>
                            setLiveClassForm({ ...liveClassForm, description: e.target.value })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div>
                        <label className={adminLabelClass}>
                          Start Date & Time *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={liveClassForm.startTime}
                          onChange={(e) =>
                            setLiveClassForm({ ...liveClassForm, startTime: e.target.value })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={adminLabelClass}>
                          Meeting URL
                        </label>
                        <input
                          type="url"
                          value={liveClassForm.meetingUrl}
                          onChange={(e) =>
                            setLiveClassForm({ ...liveClassForm, meetingUrl: e.target.value })
                          }
                          placeholder="https://meet.google.com/..."
                          className={adminInputClass}
                        />
                      </div>
                      <div className="sm:col-span-1 lg:col-span-1 relative" ref={teacherDropdownRef}>
                        <label className={adminLabelClass}>
                          Assign Teacher (optional)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                          className="flex w-full items-center justify-between rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#334155] outline-none hover:bg-[#f8fafc] focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        >
                          <span className="truncate">
                            {liveClassForm.teacherId
                              ? availableTeachers.find((t) => t.id === liveClassForm.teacherId)?.name ||
                                availableTeachers.find((t) => t.id === liveClassForm.teacherId)?.email
                              : "No Teacher Assigned"}
                          </span>
                          <ChevronDown className="h-4 w-4 text-[#94a3b8]" />
                        </button>

                        <AnimatePresence>
                          {isTeacherDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              transition={{ duration: 0.15 }}
                              className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[#f1f5f9] bg-white py-1 shadow-lg ring-1 ring-black/5"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setLiveClassForm({ ...liveClassForm, teacherId: "" });
                                  setIsTeacherDropdownOpen(false);
                                }}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#f8fafc]"
                              >
                                <span className={!liveClassForm.teacherId ? "font-medium text-purple-600" : "text-[#334155]"}>
                                  No Teacher Assigned
                                </span>
                                {!liveClassForm.teacherId && <Check className="h-4 w-4 text-purple-600" />}
                              </button>
                              {availableTeachers.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    setLiveClassForm({ ...liveClassForm, teacherId: t.id });
                                    setIsTeacherDropdownOpen(false);
                                  }}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#f8fafc]"
                                >
                                  <span className={liveClassForm.teacherId === t.id ? "font-medium text-purple-600" : "text-[#334155]"}>
                                    {t.name || t.email}
                                  </span>
                                  {liveClassForm.teacherId === t.id && <Check className="h-4 w-4 text-purple-600" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingLiveClass}
                        className={adminButton.primary}
                      >
                        {savingLiveClass && <Loader2 className="h-4 w-4 animate-spin" />}
                        {savingLiveClass ? "Scheduling..." : "Schedule Class"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live class list */}
            {liveClassesOpen && (
              <div className="p-6">
                {classGroups.length === 0 ? (
                  <p className="text-center text-sm text-[#94a3b8]">
                    No live classes scheduled. Click &quot;Schedule Class&quot; to add one.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {classGroups.map((group) => {
                      const isMonthOpen =
                        !!searchQuery.trim() || !!expandedMonths[`classes-${group.key}`];
                      return (
                        <div
                          key={group.key}
                          className="overflow-hidden rounded-[14px] border border-[#eef1f5] bg-[#fbfcfd]"
                        >
                          <button
                            onClick={() => toggleMonth("classes", group.key)}
                            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-100/50"
                          >
                            <h3 className="text-sm font-semibold text-[#334155]">
                              {group.label} ({group.items.length})
                            </h3>
                            {isMonthOpen ? (
                              <ChevronUp className="h-4 w-4 text-[#94a3b8]" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-[#94a3b8]" />
                            )}
                          </button>
                          {isMonthOpen && (
                            <div className="divide-y divide-[#f1f5f9] bg-white px-4">
                              {group.items.map((cls) => (
                                <div
                                  key={cls.id}
                                  className="flex flex-wrap items-start justify-between gap-4 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-[#0f172a]">{cls.title}</p>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#64748b]">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatShortDate(new Date(cls.startTime).toISOString())}
                                      </span>
                                      <span>·</span>
                                      <span>{cls.duration}m</span>
                                      {cls.teacherId && (
                                        <>
                                          <span>·</span>
                                          <span>
                                            Teacher:{" "}
                                            {availableTeachers.find((t) => t.id === cls.teacherId)
                                              ?.name || "Assigned"}
                                          </span>
                                        </>
                                      )}
                                      {cls.isEnded && (
                                        <>
                                          <span>·</span>
                                          <span className="flex items-center gap-1 text-green-600">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Ended
                                          </span>
                                        </>
                                      )}
                                      {cls.meetingUrl && (
                                        <>
                                          <span>·</span>
                                          <a
                                            href={cls.meetingUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1 text-purple-600 hover:underline"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                            Meeting Link
                                          </a>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Recording actions */}
                                    {cls.recordingUrl && recordingInputId !== cls.id ? (
                                      <div className="flex items-center gap-2">
                                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                          Recording Available
                                        </span>
                                        <button
                                          onClick={() => {
                                            setRecordingUrl(cls.recordingUrl || "");
                                            setRecordingInputId(cls.id);
                                          }}
                                          className="text-[12px] font-semibold text-[#0369a1] hover:underline"
                                        >
                                          Edit Link
                                        </button>
                                      </div>
                                    ) : recordingInputId === cls.id ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="url"
                                          value={recordingUrl}
                                          onChange={(e) => setRecordingUrl(e.target.value)}
                                          placeholder="Paste recording URL..."
                                          className="h-8 w-52 rounded-[10px] border border-[#e2e8f0] bg-white px-3 text-[13px] outline-none focus:border-[#209bd2] focus:ring-2 focus:ring-[#38c1ff]/20"
                                        />
                                        <button
                                          onClick={() => handleSaveRecording(cls.id)}
                                          disabled={savingRecording || !recordingUrl.trim()}
                                          className={adminButtonSm.primary}
                                        >
                                          {savingRecording ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                          onClick={() => setRecordingInputId(null)}
                                          className={adminButtonSm.secondary}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setRecordingUrl("");
                                          setRecordingInputId(cls.id);
                                        }}
                                        className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-600 hover:bg-purple-100"
                                      >
                                        <Upload className="h-3 w-3" />
                                        Upload Recording
                                      </button>
                                    )}

                                    {/* Delete */}
                                    <button
                                      onClick={() => handleDeleteLiveClass(cls.id)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-red-50 hover:text-red-500"
                                      title="Delete live class"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              ASSIGNMENTS SECTION
          ═══════════════════════════════════════════════════════════════ */}
          <section className={`overflow-hidden ${adminPanelClass}`}>
            <div className="flex items-center justify-between px-6 py-4">
              <button
                className="flex flex-1 items-center gap-3 transition-colors hover:opacity-80"
                onClick={() => setAssignmentsOpen(!assignmentsOpen)}
              >
                <FileText className="h-5 w-5 text-amber-500" />
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[#0f172a]">
                  Assignments ({course.assignments.length})
                </h2>
                {assignmentsOpen ? (
                  <ChevronUp className="ml-auto h-5 w-5 text-[#94a3b8]" />
                ) : (
                  <ChevronDown className="ml-auto h-5 w-5 text-[#94a3b8]" />
                )}
              </button>
              <button
                id="btn-add-assignment"
                onClick={() => {
                  setAssignmentsOpen(true);
                  setShowAssignmentForm((v) => !v);
                }}
                className={`ml-4 ${adminButtonSm.primary}`}
              >
                {showAssignmentForm ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {showAssignmentForm ? "Cancel" : "Add Assignment"}
              </button>
            </div>

            {/* Inline create form */}
            <AnimatePresence>
              {showAssignmentForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-[#f1f5f9]"
                >
                  <form
                    onSubmit={handleCreateAssignment}
                    className="bg-[#f8fafc] px-6 py-5"
                  >
                    <h3 className="mb-4 text-sm font-semibold text-[#1e293b]">
                      New Assignment
                    </h3>
                    {assignmentError && (
                      <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                        {assignmentError}
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className={adminLabelClass}>
                          Title *
                        </label>
                        <input
                          required
                          value={assignmentForm.title}
                          onChange={(e) =>
                            setAssignmentForm({ ...assignmentForm, title: e.target.value })
                          }
                          placeholder="e.g. Portfolio Project — Week 3"
                          className={adminInputClass}
                        />
                      </div>
                      <div>
                        <label className={adminLabelClass}>
                          Points
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={assignmentForm.points}
                          onChange={(e) =>
                            setAssignmentForm({ ...assignmentForm, points: parseInt(e.target.value) || 0 })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className={adminLabelClass}>
                          Description / Instructions
                        </label>
                        <textarea
                          rows={2}
                          value={assignmentForm.description}
                          onChange={(e) =>
                            setAssignmentForm({ ...assignmentForm, description: e.target.value })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div>
                        <label className={adminLabelClass}>
                          Deadline (optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={assignmentForm.deadline}
                          onChange={(e) =>
                            setAssignmentForm({ ...assignmentForm, deadline: e.target.value })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={adminLabelClass}>
                          Attachment (File or URL)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.zip"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setAssignmentFile(e.target.files[0]);
                                setAssignmentForm({ ...assignmentForm, attachmentUrl: "" });
                              }
                            }}
                            className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-amber-50 file:px-4 file:py-1 file:text-sm file:font-semibold file:text-amber-700 hover:file:bg-amber-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          />
                          <span className="text-sm font-medium text-[#64748b]">OR</span>
                          <input
                            type="url"
                            disabled={!!assignmentFile}
                            value={assignmentForm.attachmentUrl}
                            onChange={(e) =>
                              setAssignmentForm({ ...assignmentForm, attachmentUrl: e.target.value })
                            }
                            placeholder="https://..."
                            className={`${adminInputClass} disabled:bg-[#f8fafc] disabled:opacity-50`}
                          />
                        </div>
                        {assignmentFile && (
                          <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-4 w-4 shrink-0 text-amber-600" />
                              <span className="truncate font-medium">{assignmentFile.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAssignmentFile(null)}
                              className="ml-2 rounded-full p-1 hover:bg-amber-100"
                            >
                              <X className="h-3.5 w-3.5 text-amber-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingAssignment}
                        className={adminButton.primary}
                      >
                        {savingAssignment && <Loader2 className="h-4 w-4 animate-spin" />}
                        {savingAssignment || uploadingAssignment ? "Creating..." : "Create Assignment"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Assignment list */}
            {assignmentsOpen && (
              <div className="p-6">
                {assignmentGroups.length === 0 ? (
                  <p className="text-center text-sm text-[#94a3b8]">
                    No assignments created yet. Click &quot;Add Assignment&quot; to create one.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {assignmentGroups.map((group) => {
                      const isMonthOpen =
                        !!searchQuery.trim() || !!expandedMonths[`assignments-${group.key}`];
                      return (
                        <div
                          key={group.key}
                          className="overflow-hidden rounded-[14px] border border-[#eef1f5] bg-[#fbfcfd]"
                        >
                          <button
                            onClick={() => toggleMonth("assignments", group.key)}
                            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-100/50"
                          >
                            <h3 className="text-sm font-semibold text-[#334155]">
                              {group.label} ({group.items.length})
                            </h3>
                            {isMonthOpen ? (
                              <ChevronUp className="h-4 w-4 text-[#94a3b8]" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-[#94a3b8]" />
                            )}
                          </button>
                          {isMonthOpen && (
                            <div className="divide-y divide-[#f1f5f9] bg-white px-4">
                              {group.items.map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-[#0f172a]">{assignment.title}</p>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#64748b]">
                                      <span>
                                        Created:{" "}
                                        {formatShortDate(new Date(assignment.createdAt).toISOString())}
                                      </span>
                                      {assignment.points > 0 && (
                                        <>
                                          <span>·</span>
                                          <span>{assignment.points} pts</span>
                                        </>
                                      )}
                                      {assignment.deadline && (
                                        <>
                                          <span>·</span>
                                          <span className="text-amber-600">
                                            Due:{" "}
                                            {formatShortDate(
                                              new Date(assignment.deadline).toISOString(),
                                            )}
                                          </span>
                                        </>
                                      )}
                                      <span
                                        className={`rounded-full px-2 py-0.5 font-medium ${statusBadge(assignment.status)}`}
                                      >
                                        {assignment.status}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteAssignment(assignment.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-red-50 hover:text-red-500"
                                    title="Delete assignment"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
