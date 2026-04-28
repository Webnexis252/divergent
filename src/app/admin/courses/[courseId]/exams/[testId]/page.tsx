"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import {
  QUESTION_CATEGORY_LABELS,
  QUESTION_CATEGORY_OPTIONS,
  QUESTION_TYPE_SECTION_LABELS,
  groupQuestionsBySection,
} from "@/lib/test-question-sections";

type QuestionType = "SCQ" | "MCQ" | "SKETCH" | "NUMERIC";
type QuestionCategory = (typeof QUESTION_CATEGORY_OPTIONS)[number];

type Question = {
  id: string;
  testId: string;
  type: QuestionType;
  category: QuestionCategory;
  prompt: string;
  explanation: string | null;
  options: string[];
  correctAnswer: string[];
  points: number;
  order: number;
};

export default function AdminManageQuestionsPage({ params }: { params: Promise<{ courseId: string; testId: string }> }) {
  const router = useRouter();
  const { courseId, testId } = use(params);
  
  const [test, setTest] = useState<{ title: string; status: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: "SCQ" as QuestionType,
    category: "CONCEPT" as QuestionCategory,
    prompt: "",
    explanation: "",
    options: ["Option 1", "Option 2", "Option 3", "Option 4"],
    correctAnswer: ["Option 1"],
    points: 1,
    order: 0,
  });

  useEffect(() => {
    fetchTestDetails();
  }, [courseId, testId]);

  async function fetchTestDetails() {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/tests/${testId}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || "Failed to load test details");
      
      setTest(payload.data);
      if (payload.data.questions) {
        setQuestions(payload.data.questions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const trimmedOptions = form.options.map((option) => option.trim()).filter(Boolean);
    if ((form.type === "SCQ" || form.type === "MCQ") && trimmedOptions.length < 2) {
      setError("Choice questions need at least 2 options");
      setSaving(false);
      return;
    }
    if (form.type === "SCQ" && form.correctAnswer.length !== 1) {
      setError("Single Choice questions must have exactly 1 correct answer");
      setSaving(false);
      return;
    }
    if (form.type === "MCQ" && form.correctAnswer.length < 1) {
      setError("Multiple Choice questions need at least 1 correct answer");
      setSaving(false);
      return;
    }
    if (
      (form.type === "SCQ" || form.type === "MCQ") &&
      form.correctAnswer.some((answer) => !trimmedOptions.includes(answer.trim()))
    ) {
      setError("Correct answers must match the available options");
      setSaving(false);
      return;
    }
    if (form.type === "NUMERIC" && !form.correctAnswer[0]?.trim()) {
      setError("Numerical questions need a correct answer");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/tests/${testId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // options must be an array of strings, it already is
          // correctAnswer must be an array of strings, it already is
        }),
      });
      
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || "Failed to add question");
      }
      
      setQuestions(payload.data.questions);
      setShowAdd(false);
      setForm({
        type: "SCQ",
        category: "CONCEPT",
        prompt: "",
        explanation: "",
        options: ["Option 1", "Option 2", "Option 3", "Option 4"],
        correctAnswer: ["Option 1"],
        points: 1,
        order: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle() {
    const newStatus = test?.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/courses/${courseId}/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok) {
        setTest(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      alert("Failed to change status");
    }
  }

  const groupedQuestions = groupQuestionsBySection(questions);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1000px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <div className="flex items-center justify-between">
            <div>
              <button 
                onClick={() => router.push(`/admin/courses/${courseId}/exams`)}
                className="mb-4 text-sm text-blue-600 hover:underline"
              >
                &larr; Back to Exams
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Questions
              </h1>
              <p className="mt-2 text-gray-600">
                {test ? `Exam: ${test.title}` : "Loading..."}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handlePublishToggle}
                className={`rounded-lg border px-4 py-2 font-medium ${
                  test?.status === "PUBLISHED" 
                    ? "border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100" 
                    : "border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
                }`}
              >
                {test?.status === "PUBLISHED" ? "Unpublish" : "Publish Exam"}
              </button>
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                {showAdd ? "Cancel" : "+ Add Question"}
              </button>
            </div>
          </div>
        </RevealSection>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <RevealSection>
                <form onSubmit={handleAddQuestion} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">New Question</h2>
                  
                  <div>
                    <label className="mb-1 block text-sm font-medium">Question Prompt *</label>
                    <textarea 
                      required
                      value={form.prompt}
                      onChange={e => setForm({...form, prompt: e.target.value})}
                      className="w-full rounded-md border p-2"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Type</label>
                      <select 
                        value={form.type}
                        onChange={e => {
                          const nextType = e.target.value as QuestionType;
                          setForm({
                            ...form,
                            type: nextType,
                            options:
                              nextType === "SCQ" || nextType === "MCQ"
                                ? form.options.length > 0
                                  ? form.options
                                  : ["Option 1", "Option 2", "Option 3", "Option 4"]
                                : [],
                            correctAnswer:
                              nextType === "MCQ"
                                ? form.correctAnswer
                                : nextType === "SCQ"
                                  ? [form.correctAnswer[0] ?? "Option 1"]
                                  : nextType === "NUMERIC"
                                    ? [form.correctAnswer[0] ?? ""]
                                    : [],
                          });
                        }}
                        className="w-full rounded-md border p-2"
                      >
                        <option value="SCQ">Single Choice</option>
                        <option value="MCQ">Multiple Choice</option>
                        <option value="SKETCH">Sketching</option>
                        <option value="NUMERIC">Numerical</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Category</label>
                      <select
                        value={form.category}
                        onChange={e => setForm({...form, category: e.target.value as QuestionCategory})}
                        className="w-full rounded-md border p-2"
                      >
                        {QUESTION_CATEGORY_OPTIONS.map((category) => (
                          <option key={category} value={category}>
                            {QUESTION_CATEGORY_LABELS[category]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Points</label>
                      <input 
                        type="number"
                        min="1"
                        value={form.points}
                        onChange={e => setForm({...form, points: parseInt(e.target.value)})}
                        className="w-full rounded-md border p-2"
                      />
                    </div>
                  </div>

                  {(form.type === "SCQ" || form.type === "MCQ") && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium">
                        Options
                      </label>
                      <p className="text-xs text-gray-500">
                        {form.type === "SCQ"
                          ? "Select exactly 1 correct option."
                          : "Select 1, 2, 3, or all 4 correct options for Multiple Choice questions."}
                      </p>
                      {form.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <input 
                            value={opt}
                            onChange={e => {
                              const newOpts = [...form.options];
                              newOpts[i] = e.target.value;
                              setForm({...form, options: newOpts});
                            }}
                            className="flex-1 rounded-md border p-2"
                          />
                          <div className="flex items-center gap-2 px-2">
                            {form.type === "SCQ" ? (
                              <input 
                                type="radio" 
                                name="correctAnswer"
                                checked={form.correctAnswer[0] === opt}
                                onChange={() => setForm({...form, correctAnswer: [opt]})}
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={form.correctAnswer.includes(opt)}
                                onChange={() =>
                                  setForm({
                                    ...form,
                                    correctAnswer: form.correctAnswer.includes(opt)
                                      ? form.correctAnswer.filter((answer) => answer !== opt)
                                      : [...form.correctAnswer, opt],
                                  })
                                }
                              />
                            )}
                            <span className="text-sm">Correct</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {form.type === "NUMERIC" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium">Correct Answer</label>
                      <input
                        value={form.correctAnswer[0] ?? ""}
                        onChange={e => setForm({...form, correctAnswer: [e.target.value]})}
                        className="w-full rounded-md border p-2"
                        placeholder="Enter the exact expected answer"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium">Explanation (optional)</label>
                    <textarea 
                      value={form.explanation}
                      onChange={e => setForm({...form, explanation: e.target.value})}
                      className="w-full rounded-md border p-2 text-sm text-gray-600"
                      rows={2}
                      placeholder="Why is this answer correct?"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Question"}
                    </button>
                  </div>
                </form>
              </RevealSection>
            </motion.div>
          )}
        </AnimatePresence>

        <RevealSection>
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 text-xl border-b pb-2">Questions ({questions.length})</h3>
            
            {loading ? (
              <p>Loading questions...</p>
            ) : questions.length === 0 ? (
              <p className="text-gray-500 py-4 text-center border rounded-xl border-dashed bg-gray-50">
                No questions added to this exam yet.
              </p>
            ) : (
              <div className="space-y-6">
                {groupedQuestions.map((section) => (
                  <div key={section.type} className="space-y-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {QUESTION_TYPE_SECTION_LABELS[section.type]} Section
                      </h4>
                      <p className="text-xs text-gray-500">
                        {section.questions.length} question{section.questions.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {section.questions.map((q) => (
                      <div key={q.id} className="rounded-xl border bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-blue-600">
                                Q{q.order + 1}. {QUESTION_TYPE_SECTION_LABELS[q.type]}
                              </span>
                              <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                                {QUESTION_CATEGORY_LABELS[q.category]}
                              </span>
                            </div>
                            <p className="mt-1 font-medium text-gray-900">{q.prompt}</p>
                          </div>
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold">{q.points} pts</span>
                        </div>

                        {q.options.length > 0 ? (
                          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            {q.options.map((opt, i) => {
                              const isCorrect = q.correctAnswer.includes(opt);
                              return (
                                <div key={i} className={`rounded-lg border p-2 ${isCorrect ? "border-green-300 bg-green-50 text-green-900" : "bg-gray-50"}`}>
                                  <span className={isCorrect ? "font-bold" : ""}>{opt}</span>
                                  {isCorrect && <span className="ml-2 text-xs font-bold uppercase tracking-wider text-green-600">Correct</span>}
                                </div>
                              );
                            })}
                          </div>
                        ) : q.type === "NUMERIC" ? (
                          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                            Correct answer: <strong>{q.correctAnswer[0] || "Not set"}</strong>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            Sketch question. Students will upload a drawing response.
                          </div>
                        )}

                        {q.explanation && (
                          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                            <strong>Explanation: </strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </RevealSection>
      </div>
    </PageTransition>
  );
}
