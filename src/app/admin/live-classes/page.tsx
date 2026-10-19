"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { m as motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CircleCheck,
  Clock,
  Edit2,
  Film,
  Link2,
  Loader2,
  Plus,
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
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanelHeader,
  StatusBadge,
  adminButton,
  adminButtonSm,
  adminPanelClass,
  adminTable,
} from "../_components/admin-ui";
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
  const [editTarget, setEditTarget] = useState<AdminLiveClass | null>(null);

  // Recording upload state
  const [recordingTarget, setRecordingTarget] = useState<AdminLiveClass | null>(null);
  const [recordingTab, setRecordingTab] = useState<"link" | "upload">("link");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingSaving, setRecordingSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
            p.data.map((c: { id: string; title: string; slug: string; teachers?: { id: string; name: string | null; email: string | null }[] }) => ({
              id: c.id,
              title: c.title,
              slug: c.slug,
              teachers: c.teachers ?? [],
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

  const handleCreatedOrUpdated = useCallback((createdOrUpdated: AdminLiveClass) => {
    setClasses((prev) => {
      const idx = prev.findIndex(c => c.id === createdOrUpdated.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = createdOrUpdated;
        return next;
      }
      return [createdOrUpdated, ...prev];
    });
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
        setUploadProgress(0);
        
        // 1. Get signed URL to upload directly to Supabase
        const signRes = await fetch("/api/upload/video/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: recordingFile.name })
        });
        const signPayload = await signRes.json();
        
        if (!signRes.ok || !signPayload.success) {
          throw new Error(signPayload.error ?? "Failed to initialize upload");
        }
        
        const { signedUrl, token, publicUrl } = signPayload.data;

        // 2. Upload file directly to Supabase via XMLHttpRequest for true progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", signedUrl);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.setRequestHeader("Content-Type", recordingFile.type);
          // Supabase prefers the cache control to be explicit if possible, but it's optional.
          
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percent);
            }
          });

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error("Failed to upload to storage"));
            }
          };
          
          xhr.onerror = () => reject(new Error("Network error during upload"));
          
          // Send raw file body (not FormData) for signed URL
          xhr.send(recordingFile);
        });
        
        finalUrl = publicUrl;
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
        setUploadProgress(0);
      }, 1500);
    } catch (err: unknown) {
      setRecordingError(err instanceof Error ? err.message : "Network error — please try again.");
      setUploadProgress(0);
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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <AdminPageHeader
            eyebrow="Scheduling"
            icon={Video}
            title="Live classes"
            description="Schedule live sessions for any course. They appear right away on the teacher's control panel and in enrolled students' dashboards."
            actions={
              <button type="button" onClick={() => setShowSchedule(true)} className={adminButton.primary}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Schedule class
              </button>
            }
          />
        </RevealSection>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard index={0} title="Total classes" value={loading ? "…" : classes.length} caption="All live classes across the platform." icon={<Video />} tone="sky" />
          <AdminStatCard index={1} title="Live now" value={loading ? "…" : liveCount} caption="Classes currently in session." icon={<Radio />} tone="emerald" />
          <AdminStatCard index={2} title="Upcoming" value={loading ? "…" : upcomingCount} caption="Scheduled sessions not yet started." icon={<CalendarClock />} tone="amber" />
          <AdminStatCard index={3} title="Completed" value={loading ? "…" : completedCount} caption="Sessions that have wrapped up." icon={<CircleCheck />} tone="slate" />
        </StaggerGrid>

        {/* Table */}
        <RevealSection>
          <section className={adminPanelClass}>
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <AdminPanelHeader
                icon={Video}
                tone="violet"
                title="All live classes"
                description={`${classes.length} total class${classes.length !== 1 ? "es" : ""}`}
              />
            </div>
            <div className="mt-5 overflow-x-auto">
              {loading ? (
                <div className="space-y-3 px-5 pb-6 sm:px-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-[16px] bg-[#f1f5f9]" />
                  ))}
                </div>
              ) : classes.length === 0 ? (
                <div className="px-5 pb-6 sm:px-6">
                  <AdminEmptyState
                    icon={Video}
                    title="No live classes yet"
                    description="Schedule your first class and it will appear for teachers and students instantly."
                    action={
                      <button type="button" onClick={() => setShowSchedule(true)} className={adminButton.primary}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Schedule class
                      </button>
                    }
                  />
                </div>
              ) : (
                <table className={adminTable.table}>
                  <thead className={adminTable.head}>
                    <tr>
                      <th className={adminTable.th}>Class</th>
                      <th className={adminTable.th}>Course</th>
                      <th className={adminTable.th}>Teacher</th>
                      <th className={adminTable.th}>Date &amp; time</th>
                      <th className={adminTable.th}>Duration</th>
                      <th className={`${adminTable.th} text-center`}>Attendees</th>
                      <th className={adminTable.th}>Status</th>
                      <th className={adminTable.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls, i) => {
                      const status = getLiveClassStatus(cls.startTime, cls.duration);
                      return (
                        <motion.tr
                          key={cls.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.03, 0.3) }}
                          className={adminTable.row}
                        >
                          <td className={adminTable.td}>
                            <p className="font-semibold text-[#0f172a]">{cls.title}</p>
                            {cls.description && (
                              <p className="mt-0.5 line-clamp-1 max-w-[220px] text-[12px] text-[#94a3b8]">{cls.description}</p>
                            )}
                          </td>
                          <td className={adminTable.td}>{cls.course.title}</td>
                          <td className={adminTable.td}>
                            {cls.course.teacher ? (
                              <span className="font-medium text-[#0f172a]">
                                {cls.course.teacher.name ?? cls.course.teacher.email}
                              </span>
                            ) : (
                              <span className="text-[#94a3b8]">Not assigned</span>
                            )}
                          </td>
                          <td className={`${adminTable.td} whitespace-nowrap`}>
                            {new Date(cls.startTime).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className={`${adminTable.td} whitespace-nowrap`}>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-[#94a3b8]" aria-hidden="true" />
                              {formatDuration(cls.duration)}
                            </span>
                          </td>
                          <td className={`${adminTable.td} text-center font-semibold tabular-nums text-[#0f172a]`}>
                            {cls._count.attendances}
                          </td>
                          <td className={adminTable.td}>
                            {status === "live" ? (
                              <StatusBadge tone="good" icon={Radio}>Live</StatusBadge>
                            ) : status === "upcoming" ? (
                              <StatusBadge tone="info">Upcoming</StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral">Completed</StatusBadge>
                            )}
                          </td>
                          <td className={adminTable.td}>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditTarget(cls);
                                  setShowSchedule(true);
                                }}
                                className={adminButtonSm.secondary}
                              >
                                <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Edit
                              </button>
                              {status === "completed" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecordingTarget(cls);
                                    setRecordingTab("link");
                                    setRecordingUrl(cls.recordingUrl ?? "");
                                    setRecordingFile(null);
                                    setRecordingError("");
                                    setRecordingSuccess("");
                                  }}
                                  className={adminButtonSm.secondary}
                                >
                                  <Film className={`h-3.5 w-3.5 ${cls.recordingUrl ? "text-[#15803d]" : ""}`} aria-hidden="true" />
                                  {cls.recordingUrl ? "Edit recording" : "Upload recording"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelTarget(cls);
                                  setCancelError("");
                                }}
                                className={adminButtonSm.danger}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
            editTarget={editTarget ?? undefined}
            onClose={() => {
              setShowSchedule(false);
              setEditTarget(null);
            }}
            onCreated={handleCreatedOrUpdated}
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
                            if (file && file.size > 10 * 1024 * 1024 * 1024) {
                              setRecordingError("File is too large. Max size is 10 GB.");
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
                        Upload a local video file (MP4, WEBM, OGG, MOV). Max size: 10 GB.
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

                {recordingSaving && recordingTab === "upload" && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1 font-medium text-[#475569]">
                      <span>{uploadProgress === 100 ? "Processing video..." : "Uploading..."}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-[#e2e8f0] rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#2563eb] h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
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
