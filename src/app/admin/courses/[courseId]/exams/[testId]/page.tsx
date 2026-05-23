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
import { ImagePlus } from "lucide-react";

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
  imageUrl: string | null;
  points: number;
  negativeMarks: number;
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
    correctAnswer: ["0"],
    imageUrl: null as string | null,
    points: 1,
    negativeMarks: 0,
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
      form.correctAnswer.some((idx) => !form.options[parseInt(idx, 10)]?.trim())
    ) {
      setError("Correct answers cannot be empty options");
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
          options: form.options.filter((o) => o.trim()),
          correctAnswer: (form.type === "SCQ" || form.type === "MCQ")
            ? form.correctAnswer.map((idx) => form.options[parseInt(idx, 10)]).filter((o) => o?.trim())
            : form.correctAnswer,
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
        correctAnswer: ["0"],
        imageUrl: null,
        points: 1,
        negativeMarks: 0,
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
          <div className="sticky top-0 z-50 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-4 bg-white/90 backdrop-blur-md border-b shadow-sm mb-6 flex items-center justify-between">
            <div>
              <button 
                onClick={() => router.push(`/admin/courses/${courseId}/exams`)}
                className="mb-2 text-sm text-blue-600 hover:underline"
              >
                &larr; Back to Exams
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Questions
              </h1>
              <p className="mt-1 text-gray-600">
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
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 shadow-md"
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
                    {form.imageUrl ? (
                      <div className="mt-3 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-gray-50/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.imageUrl} alt="Question" className="max-h-[280px] w-full object-contain" />
                        <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-t border-[#e5e7eb]">
                          <span className="text-[12px] text-gray-600 font-medium">Question image uploaded ✓</span>
                          <button type="button" onClick={() => setForm({...form, imageUrl: null})} className="text-[12px] text-red-500 hover:text-red-700 font-semibold">Remove</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => document.getElementById('qImageUpload')?.click()}
                        className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-[12px] font-medium text-gray-600 transition hover:bg-gray-50"
                      >
                        <ImagePlus className="h-3.5 w-3.5" /> Add Question Image (Optional)
                      </button>
                    )}
                    <input
                      id="qImageUpload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const img = new Image();
                            img.onload = () => {
                              const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
                              const canvas = document.createElement("canvas");
                              canvas.width = Math.round(img.width * scale);
                              canvas.height = Math.round(img.height * scale);
                              canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                              setForm({...form, imageUrl: canvas.toDataURL("image/jpeg", 0.85)});
                            };
                            img.src = ev.target!.result as string;
                          };
                          reader.readAsDataURL(f);
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Type</label>
                      <select 
                        value={form.type}
                        onChange={e => {
                          const nextType = e.target.value as QuestionType;
                          const isOldTypeChoice = form.type === "SCQ" || form.type === "MCQ";
                          const isNewTypeChoice = nextType === "SCQ" || nextType === "MCQ";

                          let nextCorrectAnswer: string[] = [];
                          if (isNewTypeChoice) {
                            if (isOldTypeChoice) {
                              nextCorrectAnswer = form.correctAnswer.filter((idx) => parseInt(idx, 10) < form.options.length);
                              if (nextType === "SCQ") nextCorrectAnswer = nextCorrectAnswer.slice(0, 1);
                            } else {
                              nextCorrectAnswer = ["0"];
                            }
                          } else if (nextType === "NUMERIC") {
                            nextCorrectAnswer = !isOldTypeChoice && form.correctAnswer.length > 0 ? [form.correctAnswer[0]] : [];
                          }

                          setForm({
                            ...form,
                            type: nextType,
                            options: isNewTypeChoice
                                ? form.options.length > 0
                                  ? form.options
                                  : ["Option 1", "Option 2", "Option 3", "Option 4"]
                                : [],
                            correctAnswer: nextCorrectAnswer,
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
                    <div>
                      <label className="mb-1 block text-sm font-medium">Negative Marks</label>
                      <input 
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.negativeMarks}
                        onChange={e => setForm({...form, negativeMarks: parseFloat(e.target.value) || 0})}
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
                                checked={form.correctAnswer[0] === String(i)}
                                onChange={() => setForm({...form, correctAnswer: [String(i)]})}
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={form.correctAnswer.includes(String(i))}
                                onChange={() =>
                                  setForm({
                                    ...form,
                                    correctAnswer: form.correctAnswer.includes(String(i))
                                      ? form.correctAnswer.filter((answer) => answer !== String(i))
                                      : [...form.correctAnswer, String(i)],
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
                      <div className="mb-1 flex items-center justify-between">
                        <label className="block text-sm font-medium">Correct Answer *</label>
                        <button
                          type="button"
                          onClick={() => setForm({...form, correctAnswer: form.correctAnswer.length > 1 ? [form.correctAnswer[0] ?? ""] : [form.correctAnswer[0] ?? "", ""]})}
                          className="text-[12px] font-medium text-[#38c1ff] hover:underline"
                        >
                          {form.correctAnswer.length > 1 ? "Switch to Exact Match" : "Switch to Range Match"}
                        </button>
                      </div>

                      {form.correctAnswer.length > 1 ? (
                        <div className="flex gap-4">
                          <input
                            value={form.correctAnswer[0] ?? ""}
                            onChange={(e) => setForm({...form, correctAnswer: [e.target.value, form.correctAnswer[1] ?? ""]})}
                            placeholder="Min value"
                            className="w-full rounded-md border p-2 text-sm"
                          />
                          <input
                            value={form.correctAnswer[1] ?? ""}
                            onChange={(e) => setForm({...form, correctAnswer: [form.correctAnswer[0] ?? "", e.target.value]})}
                            placeholder="Max value"
                            className="w-full rounded-md border p-2 text-sm"
                          />
                        </div>
                      ) : (
                        <input
                          value={form.correctAnswer[0] ?? ""}
                          onChange={(e) => setForm({...form, correctAnswer: [e.target.value]})}
                          placeholder="Enter the exact expected answer"
                          className="w-full rounded-md border p-2 text-sm"
                        />
                      )}
                      
                      <p className="mt-1 text-[12px] text-gray-500">
                        {form.correctAnswer.length > 1 
                          ? "Student answer must be a number between Min and Max (inclusive)." 
                          : 'Exact match (case-insensitive, trimmed). For numbers: "12" and "12.0" are treated as different.'}
                      </p>
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
                            {q.imageUrl && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={q.imageUrl} alt="Question" className="mt-3 max-h-[200px] rounded-lg border object-contain bg-gray-50" />
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold">{q.points} pts</span>
                            {q.negativeMarks > 0 && <span className="rounded bg-red-50 text-red-600 px-2 py-1 text-xs font-semibold">-{q.negativeMarks} pts</span>}
                          </div>
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
