"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  Save,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  CircleDot,
  CheckSquare,
  Palette,
  Hash,
  LucideIcon,
  Eye,
  X,
} from "lucide-react";
import { ExamPreview } from "./_components/exam-preview";
import {
  QUESTION_CATEGORY_LABELS,
  QUESTION_CATEGORY_OPTIONS,
  groupQuestionsBySection,
  reindexQuestionsBySection,
} from "@/lib/test-question-sections";

// ─── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = "SCQ" | "MCQ" | "SKETCH" | "NUMERIC";
type QuestionCategory = (typeof QUESTION_CATEGORY_OPTIONS)[number];

type DraftQuestion = {
  id: string;
  type: QuestionType;
  category: QuestionCategory;
  prompt: string;
  options: string[];            // used by SCQ / MCQ
  correctAnswer: string[];      // indices for SCQ, multiple for MCQ; value for NUMERIC; [] for SKETCH
  imageUrl: string | null;      // optional image for the question prompt
  referenceImage: string | null; // SKETCH only
  points: number;
  negativeMarks: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  explanation: string;
};

const TYPE_META: Record<QuestionType, { label: string; color: string; icon: LucideIcon; desc: string }> = {
  SCQ: { label: "Single Choice", color: "bg-blue-50 border-blue-200 text-blue-700", icon: CircleDot, desc: "Exactly 1 correct option" },
  MCQ: { label: "Multiple Choice", color: "bg-violet-50 border-violet-200 text-violet-700", icon: CheckSquare, desc: "Select 1 to 4 correct options" },
  SKETCH: { label: "Sketch Upload", color: "bg-amber-50 border-amber-200 text-amber-700", icon: Palette, desc: "Student uploads a hand-drawn sketch" },
  NUMERIC: { label: "Numeric / Text", color: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: Hash, desc: "Student types an exact value" },
};

function uid() { return Math.random().toString(36).slice(2); }

function blankQuestion(type: QuestionType): DraftQuestion {
  return {
    id: uid(),
    type,
    category: "CONCEPT",
    prompt: "",
    options: type === "SCQ" || type === "MCQ" ? ["", "", "", ""] : [],
    correctAnswer: [],
    imageUrl: null,
    referenceImage: null,
    points: 1,
    negativeMarks: 0,
    difficulty: "MEDIUM",
    explanation: "",
  };
}

// ─── Reference image compressor ────────────────────────────────────────────────

function compressImage(file: File, maxPx = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Single question editor ─────────────────────────────────────────────────────

function QuestionEditor({
  q,
  index,
  onChange,
  onRemove,
}: {
  q: DraftQuestion;
  index: number;
  onChange: (updated: DraftQuestion) => void;
  onRemove: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const qImageRef = useRef<HTMLInputElement>(null);
  const refImageRef = useRef<HTMLInputElement>(null);
  const meta = TYPE_META[q.type];

  const setField = <K extends keyof DraftQuestion>(key: K, value: DraftQuestion[K]) =>
    onChange({ ...q, [key]: value });

  const changeType = (nextType: QuestionType) => {
    const nextOptions =
      nextType === "SCQ" || nextType === "MCQ"
        ? q.options.length > 0
          ? q.options
          : ["", "", "", ""]
        : [];
    
    const isOldTypeChoice = q.type === "SCQ" || q.type === "MCQ";
    const isNewTypeChoice = nextType === "SCQ" || nextType === "MCQ";
    
    let nextCorrectAnswer: string[] = [];
    if (isNewTypeChoice) {
      if (isOldTypeChoice) {
        nextCorrectAnswer = q.correctAnswer.filter((idx) => parseInt(idx, 10) < nextOptions.length);
        if (nextType === "SCQ") nextCorrectAnswer = nextCorrectAnswer.slice(0, 1);
      }
    } else if (nextType === "NUMERIC") {
      nextCorrectAnswer = !isOldTypeChoice && q.correctAnswer.length > 0 ? [q.correctAnswer[0]] : [];
    }

    onChange({
      ...q,
      type: nextType,
      options: nextOptions,
      correctAnswer: nextCorrectAnswer,
      imageUrl: q.imageUrl,
      referenceImage: nextType === "SKETCH" ? q.referenceImage : null,
    });
  };

  const setOption = (i: number, val: string) => {
    const opts = [...q.options];
    opts[i] = val;
    onChange({ ...q, options: opts });
  };

  const toggleCorrect = (idx: number) => {
    const optIdx = String(idx);
    if (q.type === "SCQ") {
      setField("correctAnswer", [optIdx]);
    } else {
      const updated = q.correctAnswer.includes(optIdx)
        ? q.correctAnswer.filter((a) => a !== optIdx)
        : [...q.correctAnswer, optIdx];
      setField("correctAnswer", updated);
    }
  };

  const handleRefImg = async (file: File) => {
    const dataUrl = await compressImage(file, 1400);
    setField("referenceImage", dataUrl);
  };

  const handleQImg = async (file: File) => {
    const dataUrl = await compressImage(file, 1400);
    setField("imageUrl", dataUrl);
  };

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-[18px] border border-[#e8eaef] bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#f0f0f5] px-5 py-4">
        <GripVertical className="h-5 w-5 shrink-0 text-[#d1d5db] cursor-grab" />
        <span className="text-[13px] font-bold text-[#9ca3af]">Q{index + 1}</span>
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.color}`}>
          <meta.icon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <button onClick={() => setCollapsed(!collapsed)} className="text-[#9ca3af] hover:text-[#374151]">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button onClick={onRemove} className="text-[#9ca3af] hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </div>

      {!collapsed && (
        <div className="space-y-5 p-5">
          {/* Prompt */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Question Prompt *</label>
            <textarea
              value={q.prompt}
              onChange={(e) => setField("prompt", e.target.value)}
              placeholder="Write the question here…"
              rows={2}
              className="w-full resize-none rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100"
            />
            {q.imageUrl ? (
              <div className="mt-3 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-gray-50/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.imageUrl} alt="Question" className="max-h-[280px] w-full object-contain" />
                <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-t border-[#e5e7eb]">
                  <span className="text-[12px] text-gray-600 font-medium">Question image uploaded ✓</span>
                  <button onClick={() => setField("imageUrl", null)} className="text-[12px] text-red-500 hover:text-red-700 font-semibold">Remove</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => qImageRef.current?.click()}
                className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-[12px] font-medium text-gray-600 transition hover:bg-gray-50"
              >
                <ImagePlus className="h-3.5 w-3.5" /> Add Question Image (Optional)
              </button>
            )}
            <input
              ref={qImageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleQImg(f); }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Question Type</label>
            <select
              value={q.type}
              onChange={(e) => changeType(e.target.value as QuestionType)}
              className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100"
            >
              {(Object.entries(TYPE_META) as [QuestionType, (typeof TYPE_META)[QuestionType]][]).map(([type, typeMeta]) => (
                <option key={type} value={type}>
                  {typeMeta.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[12px] text-[#9ca3af]">{TYPE_META[q.type].desc}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Category</label>
            <select
              value={q.category}
              onChange={(e) => setField("category", e.target.value as QuestionCategory)}
              className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100"
            >
              {QUESTION_CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {QUESTION_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </div>

          {/* SCQ / MCQ options */}
          {(q.type === "SCQ" || q.type === "MCQ") && (
            <div className="space-y-2">
              <label className="block text-[13px] font-semibold text-[#374151]">
                Options — {q.type === "SCQ" ? "select 1 correct option" : "select 1 to 4 correct options"}
              </label>
              <p className="text-[12px] text-[#9ca3af]">
                {q.type === "SCQ"
                  ? "Single Choice questions allow exactly one correct answer."
                  : "Multiple Choice questions can have one, two, three, or all four options marked correct."}
              </p>
              {q.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                const isCorrect = q.correctAnswer.includes(String(i)) && opt.trim() !== "";
                return (
                  <div key={i} className="flex items-center gap-3">
                    {/* Correct toggle */}
                    <button
                      type="button"
                      title="Mark as correct"
                      onClick={() => toggleCorrect(i)}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 text-[12px] font-bold transition ${
                        q.type === "MCQ" ? "rounded-[8px]" : "rounded-full"
                      } ${
                        isCorrect
                          ? "border-[#22c55e] bg-[#22c55e] text-white"
                          : "border-[#e5e7eb] bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </button>
                    <span className="flex h-7 w-6 items-center justify-center text-[12px] font-semibold text-[#9ca3af]">{letter}</span>
                    <input
                      value={opt}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder={`Option ${letter}`}
                      className="flex-1 rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                );
              })}
              {/* Add option button (up to 8) */}
              {q.options.length < 8 && (
                <button
                  onClick={() => setField("options", [...q.options, ""])}
                  className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-[#38c1ff] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add option
                </button>
              )}
            </div>
          )}

          {/* SKETCH reference image */}
          {q.type === "SKETCH" && (
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">
                Reference Sketch (Answer Key) *
              </label>
              <p className="mb-3 text-[12px] text-[#9ca3af]">
                Upload the ideal sketch — only teachers will see this, not students.
              </p>
              {q.referenceImage ? (
                <div className="overflow-hidden rounded-[14px] border-2 border-amber-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.referenceImage} alt="Reference sketch" className="max-h-[280px] w-full object-contain bg-amber-50/30" />
                  <div className="flex items-center justify-between bg-amber-50 px-4 py-2 border-t border-amber-100">
                    <span className="text-[12px] text-amber-800 font-medium">Reference uploaded ✓</span>
                    <button onClick={() => setField("referenceImage", null)} className="text-[12px] text-red-500 hover:text-red-700 font-semibold">Remove</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => refImageRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-amber-300 bg-amber-50/40 py-8 text-[14px] font-medium text-amber-700 transition hover:border-amber-400 hover:bg-amber-50"
                >
                  <ImagePlus className="h-5 w-5" /> Upload Reference Sketch
                </button>
              )}
              <input
                ref={refImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleRefImg(f); }}
              />
            </div>
          )}

          {/* NUMERIC correct answer */}
          {q.type === "NUMERIC" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-[13px] font-semibold text-[#374151]">Correct Answer *</label>
                <button
                  type="button"
                  onClick={() => setField("correctAnswer", q.correctAnswer.length > 1 ? [q.correctAnswer[0] ?? ""] : [q.correctAnswer[0] ?? "", ""])}
                  className="text-[12px] font-medium text-[#38c1ff] hover:underline"
                >
                  {q.correctAnswer.length > 1 ? "Switch to Exact Match" : "Switch to Range Match"}
                </button>
              </div>
              
              {q.correctAnswer.length > 1 ? (
                <div className="flex gap-4">
                  <input
                    value={q.correctAnswer[0] ?? ""}
                    onChange={(e) => setField("correctAnswer", [e.target.value, q.correctAnswer[1] ?? ""])}
                    placeholder="Min value (e.g. 10.5)"
                    className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100"
                  />
                  <input
                    value={q.correctAnswer[1] ?? ""}
                    onChange={(e) => setField("correctAnswer", [q.correctAnswer[0] ?? "", e.target.value])}
                    placeholder="Max value (e.g. 12.0)"
                    className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              ) : (
                <input
                  value={q.correctAnswer[0] ?? ""}
                  onChange={(e) => setField("correctAnswer", [e.target.value])}
                  placeholder="e.g. 42  or  Paris  or  12.5"
                  className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100"
                />
              )}
              
              <p className="mt-1 text-[12px] text-[#9ca3af]">
                {q.correctAnswer.length > 1 
                  ? "Student answer must be a number between Min and Max (inclusive)." 
                  : 'Exact match (case-insensitive, trimmed). For numbers: "12" and "12.0" are treated as different.'}
              </p>
            </div>
          )}

          {/* Points + Negative Marks + Difficulty + Explanation */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Points</label>
              <input
                type="number"
                min={1}
                max={100}
                value={q.points}
                onChange={(e) => setField("points", Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[14px] outline-none focus:border-[#38c1ff]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Negative Marks</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={q.negativeMarks}
                onChange={(e) => setField("negativeMarks", Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[14px] outline-none focus:border-[#38c1ff]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Difficulty</label>
              <select
                value={q.difficulty}
                onChange={(e) => setField("difficulty", e.target.value as DraftQuestion["difficulty"])}
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[14px] outline-none focus:border-[#38c1ff]"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          {q.type !== "SKETCH" && (
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Explanation (optional — shown after grading)</label>
              <textarea
                value={q.explanation}
                onChange={(e) => setField("explanation", e.target.value)}
                placeholder="Explain why the correct answer is right…"
                rows={2}
                className="w-full resize-none rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateExamPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [durationMins, setDurationMins] = useState("60");
  const [availableFrom, setAvailableFrom] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCourses(json.data);
          if (json.data.length > 0) setCourseId(json.data[0].id);
        }
      });
  }, []);

  const addQuestion = (type: QuestionType) => {
    setQuestions((prev) => [...prev, blankQuestion(type)]);
    setShowTypeMenu(false);
  };

  const updateQuestion = (id: string, updated: DraftQuestion) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? updated : q)));

  const removeQuestion = (id: string) =>
    setQuestions((prev) => prev.filter((q) => q.id !== id));

  const validate = (): string | null => {
    if (!title.trim()) return "Exam title is required";
    if (!courseId) return "Please select a course";
    if (questions.length === 0) return "Add at least one question";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return `Q${i + 1}: Prompt is required`;
      if (q.type === "SCQ" || q.type === "MCQ") {
        const nonEmpty = q.options.filter((o) => o.trim());
        if (nonEmpty.length < 2) return `Q${i + 1}: Add at least 2 options`;
        if (q.correctAnswer.length === 0) return `Q${i + 1}: Mark at least one correct answer`;
        if (q.type === "SCQ" && q.correctAnswer.length > 1) return `Q${i + 1}: SCQ can have only 1 correct answer`;
        const validCorrect = q.correctAnswer.filter((idx) => q.options[parseInt(idx, 10)]?.trim());
        if (validCorrect.length === 0) return `Q${i + 1}: Correct answer cannot be empty`;
      }
      if (q.type === "NUMERIC") {
        if (q.correctAnswer.length > 1) {
          if (!q.correctAnswer[0]?.trim() || !q.correctAnswer[1]?.trim()) {
            return `Q${i + 1}: Both Min and Max values are required for Numeric range`;
          }
          if (isNaN(Number(q.correctAnswer[0])) || isNaN(Number(q.correctAnswer[1]))) {
            return `Q${i + 1}: Min and Max must be valid numbers`;
          }
          if (Number(q.correctAnswer[0]) > Number(q.correctAnswer[1])) {
            return `Q${i + 1}: Min cannot be greater than Max`;
          }
        } else if (!q.correctAnswer[0]?.trim()) {
          return `Q${i + 1}: Correct answer is required for Numeric questions`;
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        title,
        courseId,
        durationMins: parseInt(durationMins, 10) || 60,
        availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
        questions: arrangedQuestions.map((q) => ({
          prompt: q.prompt,
          type: q.type,
          category: q.category,
          options: q.options.filter((o) => o.trim()),
          correctAnswer: (q.type === "SCQ" || q.type === "MCQ")
            ? q.correctAnswer.map((idx) => q.options[parseInt(idx, 10)]).filter((o) => o?.trim())
            : q.correctAnswer,
          imageUrl: q.imageUrl,
          referenceImage: q.referenceImage,
          points: q.points,
          negativeMarks: q.negativeMarks,
          difficulty: q.difficulty,
          explanation: q.explanation || null,
          order: q.order,
        })),
      };

      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save");

      setSuccess(true);
      setTimeout(() => router.push("/admin/exams"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const arrangedQuestions = reindexQuestionsBySection(
    questions.map((question, index) => ({
      ...question,
      order: index,
    }))
  );
  const arrangedQuestionSections = groupQuestionsBySection(arrangedQuestions);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-[#667085]">
        <button onClick={() => router.push("/admin/exams")} className="hover:text-black">Exams</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-black">Create Exam</span>
      </div>

      {/* ── Step 1: Details ── */}
      <section className="overflow-hidden rounded-[24px] border border-[#e8eaef] bg-white shadow-sm">
        <div className="border-b border-[#f0f0f5] px-6 py-5">
          <h2 className="text-[18px] font-semibold tracking-tight text-[#101828]">1. Exam Details</h2>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {error && (
            <div className="col-span-full flex items-center gap-2 rounded-[12px] bg-red-50 px-4 py-3 text-[13px] text-red-600 border border-red-100">
              {error}
            </div>
          )}
          <div className="col-span-full sm:col-span-1 lg:col-span-2">
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Exam Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. UCEED Mock Test 1"
              className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Course *</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff]"
            >
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Duration (Minutes)</label>
            <input
              type="number"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
              min={1}
              className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Available From (Optional)</label>
            <input
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff]"
            />
          </div>
        </div>
      </section>

      {/* ── Step 2: Questions ── */}
      <section className="overflow-hidden rounded-[24px] border border-[#e8eaef] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#f0f0f5] px-6 py-5">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-[#101828]">2. Questions</h2>
            <p className="text-[13px] text-[#9ca3af]">
              {questions.length} question{questions.length !== 1 ? "s" : ""} · {totalPoints} total pts
            </p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {questions.length === 0 ? (
            <div className="rounded-[16px] border-2 border-dashed border-[#e5e7eb] py-12 text-center text-[#9ca3af]">
              <p className="text-[15px] font-medium">No questions yet</p>
              <p className="mt-1 text-[13px]">Click &quot;+ Add Question&quot; below to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {arrangedQuestionSections.map((section) => (
                <div key={section.type} className="space-y-3">
                  <div className="flex items-center justify-between rounded-[14px] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#111827]">{section.label} Section</h3>
                      <p className="text-[12px] text-[#6b7280]">
                        {section.questions.length} question{section.questions.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {section.questions.map((q) => (
                      <QuestionEditor
                        key={q.id}
                        q={q}
                        index={q.order}
                        onChange={(updated) => updateQuestion(q.id, updated)}
                        onRemove={() => removeQuestion(q.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Sticky Add Question Bar ── */}
      <div
        className="sticky top-4 z-50 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3"
      >
        <div className="flex items-center justify-between rounded-[18px] border border-[#e8eaef] bg-white/95 px-5 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
          <div className="flex items-center gap-3 text-[13px] text-[#6b7280]">
            <span className="font-semibold text-[#111827]">{questions.length}</span> question{questions.length !== 1 ? "s" : ""}
            <span className="text-[#d1d5db]">·</span>
            <span className="font-semibold text-[#111827]">{totalPoints}</span> pts
          </div>
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 rounded-[12px] bg-white border border-[#e8eaef] px-5 py-2.5 text-[13px] font-semibold text-[#374151] shadow-sm transition hover:bg-gray-50 active:scale-[0.97]"
            >
              <Eye className="h-4 w-4" /> Preview
            </button>
            <button
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              className="flex items-center gap-2 rounded-[12px] bg-[#38c1ff] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-200/50 transition hover:bg-[#0ea5e9] active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" /> Add Question
            </button>
            <AnimatePresence>
              {showTypeMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-2 z-20 w-[280px] overflow-hidden rounded-[16px] border border-[#e8eaef] bg-white shadow-xl"
                >
                  {(Object.entries(TYPE_META) as [QuestionType, typeof TYPE_META.SCQ][]).map(([type, meta]) => (
                    <button
                      key={type}
                      onClick={() => addQuestion(type)}
                      className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50"
                    >
                      <span className="text-gray-500 mt-0.5"><meta.icon className="h-5 w-5" /></span>
                      <div>
                        <p className="text-[14px] font-semibold text-[#111827]">{meta.label}</p>
                        <p className="text-[12px] text-[#9ca3af]">{meta.desc}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Step 3: Publish ── */}
      {questions.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-[24px] border border-[#e8eaef] bg-white px-6 py-5 shadow-sm"
        >
          <div>
            <h2 className="text-[16px] font-semibold text-[#101828]">3. Publish</h2>
            <p className="text-[13px] text-[#9ca3af]">
              {questions.length} question{questions.length !== 1 ? "s" : ""} · {totalPoints} pts · {durationMins} min
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || success}
            className="flex items-center gap-2 rounded-[12px] bg-[#22c55e] px-6 py-3 text-[14px] font-bold text-white shadow transition hover:bg-[#16a34a] disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {success ? "Published!" : isSaving ? "Saving…" : "Publish Exam"}
          </button>
        </motion.section>
      )}

      {/* ── Preview Modal ── */}
      <AnimatePresence>
        {showPreview && (
          <ExamPreview
            exam={{ title, durationMins: parseInt(durationMins, 10) || 60 }}
            questions={arrangedQuestions.map((q) => ({
              id: q.id,
              type: q.type,
              category: q.category,
              prompt: q.prompt,
              options: q.options,
              imageUrl: q.imageUrl,
              referenceImage: q.referenceImage,
              points: q.points,
            }))}
            onClose={() => setShowPreview(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
