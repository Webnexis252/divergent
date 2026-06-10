"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { formatShortDate } from "@/lib/date-format";

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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <div className="flex items-center justify-between">
            <div>
              <button 
                onClick={() => router.back()}
                className="mb-4 text-sm text-blue-600 hover:underline"
              >
                &larr; Back to Courses
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Exams
              </h1>
              <p className="mt-2 text-gray-600">
                {courseTitle ? `For course: ${courseTitle}` : "Loading..."}
              </p>
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {showCreate ? "Cancel" : "+ Create Exam"}
            </button>
          </div>
        </RevealSection>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-600">
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
              <RevealSection>
                <form onSubmit={handleCreate} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">New Exam</h2>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Title *</label>
                      <input 
                        required
                        value={form.title}
                        onChange={e => setForm({...form, title: e.target.value})}
                        className="w-full rounded-md border p-2"
                        placeholder="Midterm Exam"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Type</label>
                      <select 
                        value={form.type}
                        onChange={e => setForm({...form, type: e.target.value})}
                        className="w-full rounded-md border p-2"
                      >
                        <option value="COURSE_EXAM">Course Exam</option>
                        <option value="MOCK_TEST">Mock Test</option>
                        <option value="CHAPTER_TEST">Chapter Test</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium">Description</label>
                      <textarea 
                        value={form.description}
                        onChange={e => setForm({...form, description: e.target.value})}
                        className="w-full rounded-md border p-2"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Duration (mins)</label>
                      <input 
                        type="number"
                        min="1"
                        value={form.durationMins}
                        onChange={e => setForm({...form, durationMins: parseInt(e.target.value)})}
                        className="w-full rounded-md border p-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Passing Score (%)</label>
                      <input 
                        type="number"
                        min="1"
                        max="100"
                        value={form.passingScore}
                        onChange={e => setForm({...form, passingScore: parseInt(e.target.value)})}
                        className="w-full rounded-md border p-2"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Exam"}
                    </button>
                  </div>
                </form>
              </RevealSection>
            </motion.div>
          )}
        </AnimatePresence>

        <RevealSection>
          <div className="space-y-4">
            {loading ? (
              <p>Loading exams...</p>
            ) : tests.length === 0 ? (
              <p className="text-gray-500">No exams created yet.</p>
            ) : (
              tests.map(test => (
                <div key={test.id} className="flex items-center justify-between rounded-xl border bg-white p-6 shadow-sm">
                  <div>
                    <h3 className="text-lg font-semibold">{test.title}</h3>
                    <div className="mt-2 flex gap-4 text-sm text-gray-600">
                      <span>{test.durationMins} mins</span>
                      <span>•</span>
                      <span>Pass: {test.passingScore}%</span>
                      <span>•</span>
                      <span>Questions: {test._count.questions}</span>
                      <span>•</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        test.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {test.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => router.push(`/admin/courses/${courseId}/exams/${test.id}`)}
                      className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Manage Questions
                    </button>
                    <button 
                      onClick={() => handleDelete(test.id)}
                      className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </RevealSection>
      </div>
    </PageTransition>
  );
}
