"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { m as motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { formatShortDate } from "@/lib/date-format";
import { ChevronLeft, ClipboardCheck, FileText, Plus, X } from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  StatusBadge,
  adminButton,
  adminButtonSm,
  adminInputClass,
  adminLabelClass,
  adminPanelClass,
  adminRowClass,
  adminTextareaClass,
} from "../../../_components/admin-ui";

type TestItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  durationMins: number;
  passingScore: number;
  maxAttempts: number;
  availableFrom: string | null;
  availableUntil: string | null;
  chapter: { id: string; title: string } | null;
  _count: { questions: number; attempts: number };
};

export default function AdminCourseExamsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const router = useRouter();
  const { courseId } = use(params);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseTitle, setCourseTitle] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "COURSE_EXAM",
    durationMins: 60,
    passingScore: 50,
    maxAttempts: 1,
    shuffleQuestions: true,
    showResults: true,
  });

  useEffect(() => {
    fetchTests();
  }, [courseId]);

  async function fetchTests() {
    setLoading(true);
    try {
      // First get course details
      const courseRes = await fetch(`/api/courses/${courseId}`);
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        if (courseData.success) {
          setCourseTitle(courseData.data.title);
        }
      }

      // Then get tests
      const res = await fetch(`/api/courses/${courseId}/tests`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || "Failed to load tests");
      setTests(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading tests");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/courses/${courseId}/tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || "Failed to create test");
      }
      
      setTests([payload.data, ...tests]);
      setShowCreate(false);
      setForm({
        title: "",
        description: "",
        type: "COURSE_EXAM",
        durationMins: 60,
        passingScore: 50,
        maxAttempts: 1,
        shuffleQuestions: true,
        showResults: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(testId: string) {
    if (!confirm("Are you sure you want to delete this exam? This action cannot be undone and will delete all associated questions and attempts.")) return;
    
    try {
      const res = await fetch(`/api/courses/${courseId}/tests/${testId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete exam");
      
      setTests(tests.filter(t => t.id !== testId));
    } catch (err) {
      alert("Error deleting exam");
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#64748b] transition-colors hover:text-[#0f172a]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>

        <RevealSection>
          <AdminPageHeader
            eyebrow="Exam management"
            icon={FileText}
            title="Manage exams"
            description={courseTitle ? `For ${courseTitle}` : "Loading…"}
            actions={
              <button type="button" onClick={() => setShowCreate(!showCreate)} className={showCreate ? adminButton.secondary : adminButton.primary}>
                {showCreate ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {showCreate ? "Cancel" : "Create exam"}
              </button>
            }
          />
        </RevealSection>

        {error && (
          <div className="rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
            {error}
          </div>
        )}

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleCreate} className={`${adminPanelClass} space-y-5 p-5 sm:p-6`}>
                <AdminPanelHeader icon={Plus} tone="sky" title="New exam" description="Add questions after you save it" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className={adminLabelClass}>Title *</span>
                    <input
                      required
                      value={form.title}
                      onChange={e => setForm({...form, title: e.target.value})}
                      className={adminInputClass}
                      placeholder="Midterm exam"
                    />
                  </label>
                  <label className="block">
                    <span className={adminLabelClass}>Type</span>
                    <select
                      value={form.type}
                      onChange={e => setForm({...form, type: e.target.value})}
                      className={adminInputClass}
                    >
                      <option value="COURSE_EXAM">Course exam</option>
                      <option value="MOCK_TEST">Mock test</option>
                      <option value="CHAPTER_TEST">Chapter test</option>
                    </select>
                  </label>
                  <label className="block md:col-span-2">
                    <span className={adminLabelClass}>Description</span>
                    <textarea
                      value={form.description}
                      onChange={e => setForm({...form, description: e.target.value})}
                      className={adminTextareaClass}
                      rows={3}
                    />
                  </label>
                  <label className="block">
                    <span className={adminLabelClass}>Duration (mins)</span>
                    <input
                      type="number"
                      min="1"
                      value={form.durationMins}
                      onChange={e => setForm({...form, durationMins: parseInt(e.target.value)})}
                      className={adminInputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={adminLabelClass}>Passing score (%)</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={form.passingScore}
                      onChange={e => setForm({...form, passingScore: parseInt(e.target.value)})}
                      className={adminInputClass}
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={saving} className={adminButton.primary}>
                    {saving ? "Saving…" : "Save exam"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <RevealSection>
          <AdminPanel>
            <AdminPanelHeader
              icon={ClipboardCheck}
              tone="slate"
              title="Exams in this course"
              description={loading ? "Loading…" : `${tests.length} exam${tests.length === 1 ? "" : "s"}`}
            />
            <div className="mt-5 space-y-3">
              {loading ? (
                [1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-[16px] bg-[#f1f5f9]" />)
              ) : tests.length === 0 ? (
                <AdminEmptyState icon={FileText} title="No exams yet" description="Create the first one with Create exam." />
              ) : (
                tests.map(test => (
                  <div key={test.id} className={`${adminRowClass} flex flex-wrap items-center justify-between gap-4`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-[#0f172a]">{test.title}</h3>
                        <StatusBadge tone={test.status === "PUBLISHED" ? "good" : "warning"}>
                          {test.status.charAt(0) + test.status.slice(1).toLowerCase()}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-[12px] text-[#64748b]">
                        {test.durationMins} mins · Pass {test.passingScore}% · {test._count.questions} questions
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/courses/${courseId}/exams/${test.id}`)}
                        className={adminButtonSm.secondary}
                      >
                        Manage questions
                      </button>
                      <button type="button" onClick={() => handleDelete(test.id)} className={adminButtonSm.danger}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </RevealSection>
      </div>
    </PageTransition>
  );
}
