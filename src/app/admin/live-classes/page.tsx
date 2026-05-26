"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Check,
  Clock,
  Film,
  Link2,
  Loader2,
  Radio,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import {
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";
import { buttonStyles } from "@/components/ui/button";
import { cx } from "@/lib/cx";

import type { AdminLiveClass, CourseSummary } from "./_types";
import { getLiveClassStatus, formatDuration } from "./_types";

const ScheduleClassModal = lazy(() => import("./ScheduleClassModal"));

export default function AdminLiveClassesPage() {
  const [classes, setClasses] = useState<AdminLiveClass[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AdminLiveClass | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Recording upload state
  const [recordingTarget, setRecordingTarget] = useState<AdminLiveClass | null>(null);
  const [recordingTab, setRecordingTab] = useState<"link" | "upload">("link");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingSaving, setRecordingSaving] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [recordingSuccess, setRecordingSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/live-classes")
      .then((r) => r.json())
      .then((p) => {
        if (!cancelled && p.success) setClasses(p.data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/courses")
      .then((r) => r.json())
      .then((p) => {
        if (!cancelled && p.success) {
          setCourses(
            p.data.map((c: { id: string; title: string; slug: string; teacher?: { name: string | null; email: string | null } | null }) => ({
              id: c.id,
              title: c.title,
              slug: c.slug,
              teacher: c.teacher ?? null,
            })),
          );
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setCoursesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreated = useCallback((created: AdminLiveClass) => {
    setClasses((prev) => [created, ...prev]);
  }, []);

  const handleCancelClass = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/admin/live-classes/${cancelTarget.id}`, {
        method: "DELETE",
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        setCancelError(payload.error ?? "Failed to cancel class");
        return;
      }
      setClasses((prev) => prev.filter((c) => c.id !== cancelTarget.id));
      setCancelTarget(null);
    } catch {
      setCancelError("Network error — please try again.");
    } finally {
      setCancelling(false);
    }
  }, [cancelTarget]);

  const handleSaveRecordingUrl = async (url: string) => {
    const res = await fetch(
      `/api/admin/live-classes/${recordingTarget!.id}/recording`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingUrl: url }),
      }
    );
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload.error ?? "Failed to save recording URL");
    }
    return url;
  };

  const handleSaveRecording = useCallback(async () => {
    if (!recordingTarget) return;

    if (recordingTab === "link" && !recordingUrl.trim()) {
      setRecordingError("Please enter a URL.");
      return;
    }
    if (recordingTab === "upload" && !recordingFile) {
      setRecordingError("Please select a video file.");
      return;
    }

    setRecordingSaving(true);
    setRecordingError("");
    setRecordingSuccess("");

    try {
      let finalUrl = recordingUrl.trim();

      if (recordingTab === "upload" && recordingFile) {
        const formData = new FormData();
        formData.append("file", recordingFile);

        const uploadRes = await fetch("/api/upload/video", {
          method: "POST",
          body: formData,
        });
        const uploadPayload = await uploadRes.json();
        
        if (!uploadRes.ok || !uploadPayload.success) {
          throw new Error(uploadPayload.error ?? "Failed to upload video file");
        }
        
        finalUrl = uploadPayload.data.url;
      }

      await handleSaveRecordingUrl(finalUrl);

      // Update local state
      setClasses((prev) =>
        prev.map((c) =>
          c.id === recordingTarget.id
            ? { ...c, recordingUrl: finalUrl }
            : c
        )
      );
      setRecordingSuccess(recordingTab === "upload" ? "Video uploaded and saved!" : "Recording URL saved!");
      setTimeout(() => {
        setRecordingTarget(null);
        setRecordingUrl("");
        setRecordingFile(null);
        setRecordingSuccess("");
      }, 1500);
    } catch (err: unknown) {
      setRecordingError(err instanceof Error ? err.message : "Network error — please try again.");
    } finally {
      setRecordingSaving(false);
    }
  }, [recordingTarget, recordingTab, recordingUrl, recordingFile]);

  const handleDeleteRecording = useCallback(async () => {
    if (!recordingTarget) return;
    setRecordingSaving(true);
    setRecordingError("");
    setRecordingSuccess("");

    try {
      const res = await fetch(
        `/api/admin/live-classes/${recordingTarget.id}/recording`,
        { method: "DELETE" }
      );
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to delete recording URL");
      }

      setClasses((prev) =>
        prev.map((c) =>
          c.id === recordingTarget.id ? { ...c, recordingUrl: null } : c
        )
      );
      setRecordingSuccess("Recording deleted!");
      setTimeout(() => {
        setRecordingTarget(null);
        setRecordingUrl("");
        setRecordingFile(null);
        setRecordingSuccess("");
      }, 1500);
    } catch (err: unknown) {
      setRecordingError(err instanceof Error ? err.message : "Network error — please try again.");
    } finally {
      setRecordingSaving(false);
    }
  }, [recordingTarget]);

  const liveCount = classes.filter((c) => getLiveClassStatus(c.startTime, c.duration) === "live").length;
  const upcomingCount = classes.filter((c) => getLiveClassStatus(c.startTime, c.duration) === "upcoming").length;
  const completedCount = classes.filter((c) => getLiveClassStatus(c.startTime, c.duration) === "completed").length;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#a78bfa] px-8 py-10 text-white shadow-[0_24px_60px_rgba(124,58,237,0.28)]">
            <motion.div
              className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                  Scheduling
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
                  Live Classes
                </h1>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/85">
                  Schedule live sessions for any course. The class instantly
                  appears on the teacher&apos;s control panel and in enrolled students&apos;
                  dashboards.
                </p>
              </div>
              <button
                onClick={() => setShowSchedule(true)}
                className={cx(
                  buttonStyles({
                    variant: "secondary",
                    size: "md",
                    className:
                      "shrink-0 rounded-[18px] border-white/70 bg-white/94 text-[#7c3aed] hover:bg-white",
                  }),
                )}
              >
                + Schedule Class
              </button>
            </div>
          </section>
        </RevealSection>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <AdminStatCard
            index={0}
            title="Total Classes"
            value={loading ? "…" : classes.length}
            caption="All live classes across the platform."
            tone="sky"
          />
          <AdminStatCard
            index={1}
            title="Live Now"
            value={loading ? "…" : liveCount}
            caption="Classes currently in session."
            tone="emerald"
          />
          <AdminStatCard
            index={2}
            title="Upcoming"
            value={loading ? "…" : upcomingCount}
            caption="Scheduled sessions not yet started."
            tone="amber"
          />
          <AdminStatCard
            index={3}
            title="Completed"
            value={loading ? "…" : completedCount}
            caption="Sessions that have wrapped up."
            tone="slate"
          />
        </StaggerGrid>

        {/* Table */}
        <RevealSection>
          <section className="rounded-[28px] border border-white/70 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-[#eef0f3] px-6 py-5">
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">
                All Live Classes
              </h2>
              <p className="mt-1 text-[13px] text-[#667085]">
                {classes.length} total class{classes.length !== 1 ? "es" : ""}
              </p>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-[18px] bg-[#f3f4f6]"
                    />
                  ))}
                </div>
              ) : classes.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[20px] bg-[#f0f4ff] text-[#7c3aed]">
                    <Video className="h-6 w-6" />
                  </div>
                  <p className="text-[16px] font-semibold text-[#101828]">
                    No live classes yet
                  </p>
                  <p className="mt-2 text-[14px] text-[#64748b]">
                    Schedule your first class and it will appear for teachers and
                    students instantly.
                  </p>
                  <button
                    onClick={() => setShowSchedule(true)}
                    className={cx(
                      buttonStyles({ size: "sm", className: "mt-5" }),
                    )}
                  >
                    + Schedule Class
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-[#eef0f3] text-[12px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                      <th className="px-6 py-4">Class</th>
                      <th className="px-6 py-4">Course</th>
                      <th className="px-6 py-4">Teacher</th>
                      <th className="px-6 py-4">Date &amp; Time</th>
                      <th className="px-6 py-4">Duration</th>
                      <th className="px-6 py-4">Attendees</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls, i) => {
                      const status = getLiveClassStatus(
                        cls.startTime,
                        cls.duration,
                      );
                      return (
                        <motion.tr
                          key={cls.id}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-[#f1f5f9] last:border-none hover:bg-[#f8fafc]"
                        >
                          <td className="px-6 py-4">
                            <p className="font-semibold text-[#101828]">
                              {cls.title}
                            </p>
                            {cls.description && (
                              <p className="mt-0.5 line-clamp-1 text-[12px] text-[#94a3b8]">
                                {cls.description}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-[#475569]">
                            {cls.course.title}
                          </td>
                          <td className="px-6 py-4">
                            {cls.course.teacher ? (
                              <span className="font-semibold text-[#101828]">
                                {cls.course.teacher.name ??
                                  cls.course.teacher.email}
                              </span>
                            ) : (
                              <span className="text-[13px] text-[#94a3b8]">
                                Not assigned
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-[#475569]">
                            {new Date(cls.startTime).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </td>
                          <td className="px-6 py-4 text-[#475569]">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-[#94a3b8]" />
                              {formatDuration(cls.duration)}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-[#101828]">
                            {cls._count.attendances}
                          </td>
                          <td className="px-6 py-4">
                            {status === "live" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ecfdf5] px-3 py-1 text-[11px] font-bold text-[#15803d]">
                                <Radio className="h-3 w-3 animate-pulse" />
                                Live
                              </span>
                            ) : status === "upcoming" ? (
                              <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[11px] font-bold text-[#2563eb]">
                                Upcoming
                              </span>
                            ) : (
                              <span className="rounded-full bg-[#f1f5f9] px-3 py-1 text-[11px] font-bold text-[#64748b]">
                                Completed
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {status === "completed" && (
                                <button
                                  onClick={() => {
                                    setRecordingTarget(cls);
                                    setRecordingTab("link");
                                    setRecordingUrl(cls.recordingUrl ?? "");
                                    setRecordingFile(null);
                                    setRecordingError("");
                                    setRecordingSuccess("");
                                  }}
                                  className={cx(
                                    "inline-flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-[12px] font-semibold transition",
                                    cls.recordingUrl
                                      ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d] hover:bg-[#dcfce7]"
                                      : "border-[#dbeafe] bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe]"
                                  )}
                                >
                                  <Film className="h-3 w-3" />
                                  {cls.recordingUrl ? "Edit Recording" : "Upload Recording"}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setCancelTarget(cls);
                                  setCancelError("");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#fee2e2] bg-[#fef2f2] px-3 py-1.5 text-[12px] font-semibold text-[#dc2626] transition hover:bg-[#fee2e2]"
                              >
                                <Trash2 className="h-3 w-3" />
                                Cancel
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </RevealSection>
      </div>

      {/* Schedule Modal — lazy loaded */}
      {showSchedule && (
        <Suspense fallback={null}>
          <ScheduleClassModal
            courses={courses}
            coursesLoading={coursesLoading}
            onClose={() => setShowSchedule(false)}
            onCreated={handleCreated}
          />
        </Suspense>
      )}

      {/* Cancel Confirmation Dialog */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0f172a]/52 px-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !cancelling) {
                setCancelTarget(null);
              }
            }}
          >
            <motion.div
              className="w-full max-w-[480px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_40px_80px_rgba(15,23,42,0.18)]"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-[#fee2e2] bg-[#fef2f2] px-6 py-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#dc2626]/10 text-[#dc2626]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#0f172a]">
                      Cancel this class?
                    </h3>
                    <p className="mt-1 text-[13px] text-[#64748b]">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !cancelling && setCancelTarget(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#e7eef6] bg-white text-[#94a3b8] transition-colors hover:text-[#0f172a]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <div className="rounded-[16px] border border-[#f1f5f9] bg-[#f8fafc] px-4 py-4">
                  <p className="text-[16px] font-semibold text-[#0f172a]">
                    {cancelTarget.title}
                  </p>
                  <p className="mt-1 text-[13px] text-[#64748b]">
                    {cancelTarget.course.title}
                    {cancelTarget.course.teacher?.name
                      ? ` — ${cancelTarget.course.teacher.name}`
                      : ""}
                  </p>
                  <p className="mt-2 text-[13px] text-[#94a3b8]">
                    {new Date(cancelTarget.startTime).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {formatDuration(cancelTarget.duration)}
                  </p>
                </div>

                <p className="mt-4 text-[14px] leading-6 text-[#475569]">
                  Cancelling will permanently remove this class. Enrolled students and the assigned teacher will no longer see it in their dashboards.
                </p>

                {cancelError && (
                  <p className="mt-3 rounded-[12px] border border-[#fee2e2] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#dc2626]">
                    {cancelError}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-[#f1f5f9] px-6 py-4">
                <button
                  onClick={() => !cancelling && setCancelTarget(null)}
                  disabled={cancelling}
                  className={cx(
                    buttonStyles({ variant: "secondary", size: "sm" }),
                  )}
                >
                  Keep Class
                </button>
                <button
                  onClick={() => void handleCancelClass()}
                  disabled={cancelling}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#dc2626] px-5 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(220,38,38,0.24)] transition hover:bg-[#b91c1c] disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {cancelling ? "Cancelling…" : "Yes, Cancel Class"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Upload Modal */}
      <AnimatePresence>
        {recordingTarget && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0f172a]/52 px-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !recordingSaving) {
                setRecordingTarget(null);
              }
            }}
          >
            <motion.div
              className="w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_40px_80px_rgba(15,23,42,0.18)]"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-[#dbeafe] bg-[#eff6ff] px-6 py-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#2563eb]/10 text-[#2563eb]">
                    <Film className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#0f172a]">
                      {recordingTarget.recordingUrl ? "Edit" : "Upload"} Recording
                    </h3>
                    <p className="mt-1 text-[13px] text-[#64748b]">
                      Paste the video recording URL for this class.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !recordingSaving && setRecordingTarget(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#e7eef6] bg-white text-[#94a3b8] transition-colors hover:text-[#0f172a]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div className="rounded-[16px] border border-[#f1f5f9] bg-[#f8fafc] px-4 py-3">
                  <p className="text-[15px] font-semibold text-[#0f172a]">
                    {recordingTarget.title}
                  </p>
                  <p className="mt-1 text-[13px] text-[#64748b]">
                    {recordingTarget.course.title}
                    {" · "}
                    {new Date(recordingTarget.startTime).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                  <div className="flex rounded-lg bg-[#f1f5f9] p-1 mb-4">
                    <button
                      type="button"
                      onClick={() => setRecordingTab("link")}
                      className={cx(
                        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                        recordingTab === "link"
                          ? "bg-white text-[#0f172a] shadow-sm"
                          : "text-[#64748b] hover:text-[#0f172a]"
                      )}
                    >
                      Paste Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecordingTab("upload")}
                      className={cx(
                        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                        recordingTab === "upload"
                          ? "bg-white text-[#0f172a] shadow-sm"
                          : "text-[#64748b] hover:text-[#0f172a]"
                      )}
                    >
                      Upload File
                    </button>
                  </div>

                  {recordingTab === "link" ? (
                    <div>
                      <label
                        htmlFor="recording-url"
                        className="block text-[13px] font-semibold text-[#475569] mb-2"
                      >
                        Recording URL
                      </label>
                      <div className="relative">
                        <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
                        <input
                          id="recording-url"
                          type="url"
                          placeholder="https://drive.google.com/... or https://youtube.com/..."
                          value={recordingUrl}
                          onChange={(e) => {
                            setRecordingUrl(e.target.value);
                            setRecordingError("");
                          }}
                          className="block w-full rounded-[14px] border border-[#e2e8f0] bg-white py-3 pl-10 pr-4 text-[14px] text-[#0f172a] placeholder-[#94a3b8] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors"
                        />
                      </div>
                      <p className="mt-2 text-[12px] text-[#94a3b8]">
                        Paste any video URL — YouTube, Google Drive, Vimeo, etc. Students will open this link to watch the recording.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="recording-file"
                        className="block text-[13px] font-semibold text-[#475569] mb-2"
                      >
                        Upload Video File
                      </label>
                      <div className="relative">
                        <input
                          id="recording-file"
                          type="file"
                          accept="video/mp4,video/webm,video/ogg,video/quicktime"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file && file.size > 500 * 1024 * 1024) {
                              setRecordingError("File is too large. Max size is 500 MB.");
                              setRecordingFile(null);
                              e.target.value = ''; // clear input
                            } else {
                              setRecordingFile(file);
                              setRecordingError("");
                            }
                          }}
                          className="block w-full text-sm text-[#64748b] file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#eff6ff] file:text-[#2563eb] hover:file:bg-[#dbeafe]"
                        />
                      </div>
                      <p className="mt-2 text-[12px] text-[#94a3b8]">
                        Upload a local video file (MP4, WEBM, OGG, MOV). Max size: 500 MB.
                      </p>
                    </div>
                  )}

                {recordingError && (
                  <p className="rounded-[12px] border border-[#fee2e2] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#dc2626]">
                    {recordingError}
                  </p>
                )}

                {recordingSuccess && (
                  <motion.p
                    className="flex items-center gap-1.5 rounded-[12px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-medium text-[#15803d]"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {recordingSuccess}
                  </motion.p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#f1f5f9] px-6 py-4">
                <div>
                  {recordingTarget.recordingUrl && (
                    <button
                      onClick={() => void handleDeleteRecording()}
                      disabled={recordingSaving}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-[#fee2e2] bg-[#fef2f2] px-4 text-sm font-medium text-[#dc2626] transition-colors hover:bg-[#fee2e2] disabled:opacity-50"
                    >
                      Delete Recording
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => !recordingSaving && setRecordingTarget(null)}
                    disabled={recordingSaving}
                    className={cx(
                      buttonStyles({ variant: "secondary", size: "sm" }),
                    )}
                  >
                    Cancel
                  </button>
                <button
                  onClick={() => void handleSaveRecording()}
                  disabled={recordingSaving || (recordingTab === "link" ? !recordingUrl.trim() : !recordingFile)}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#2563eb] px-5 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.24)] transition hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  {recordingSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : recordingTab === "upload" ? (
                    <UploadCloud className="h-3.5 w-3.5" />
                  ) : (
                    <Film className="h-3.5 w-3.5" />
                  )}
                  {recordingSaving ? "Saving…" : "Save Recording"}
                </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
