"use client";

import { useRef, useState } from "react";
import { QUESTION_CATEGORY_LABELS, QUESTION_CATEGORY_OPTIONS } from "@/lib/test-question-sections";

export type QuestionType = "SCQ" | "MCQ" | "SKETCH" | "NUMERIC";
export type QuestionCategory = (typeof QUESTION_CATEGORY_OPTIONS)[number];

export type QuestionData = {
  id: string;
  type: QuestionType;
  category?: QuestionCategory | null;
  prompt: string;
  options: string[];
  imageUrl?: string | null;
  referenceImage?: string | null; // Only shown to teacher, never to student during exam
  points: number;
};

export type QuestionWatermark = {
  name: string;
  email: string;
  phone: string;
};

// ─── Shared helpers ────────────────────────────────────────────────────────────

function compressImage(file: File, maxPx = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function TypeBadge({ type }: { type: QuestionType }) {
  const labels: Record<QuestionType, string> = {
    SCQ: "Single Choice",
    MCQ: "Multiple Choice",
    SKETCH: "Sketch",
    NUMERIC: "Numeric",
  };
  const colors: Record<QuestionType, string> = {
    SCQ: "bg-blue-50 text-blue-700",
    MCQ: "bg-violet-50 text-violet-700",
    SKETCH: "bg-amber-50 text-amber-700",
    NUMERIC: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

function QuestionSecurityWatermark({
  watermark,
}: {
  watermark: QuestionWatermark;
}) {
  const parts = [watermark.name, watermark.email, watermark.phone].filter(Boolean);
  const watermarkText = parts.join(" • ");
  const rows = [
    { key: "row-1", top: "8%" },
    { key: "row-2", top: "38%" },
    { key: "row-3", top: "68%" },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-[20px] select-none"
    >
      {rows.map((row) => (
        <div
          key={row.key}
          className="absolute left-[-18%] right-[-18%] flex justify-between gap-10 whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.22em] text-[#0f172a] opacity-[0.08]"
          style={{ top: row.top, transform: "rotate(-18deg)" }}
        >
          <span>{watermarkText}</span>
          <span>{watermarkText}</span>
          <span>{watermarkText}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Sub-components per question type ─────────────────────────────────────────

function ScqMcqOptions({
  question,
  selectedAnswer,
  onAnswer,
  showResult,
  correctAnswer,
}: {
  question: QuestionData;
  selectedAnswer: unknown;
  onAnswer: (id: string, answer: unknown) => void;
  showResult?: boolean;
  correctAnswer?: unknown;
}) {
  const isMulti = question.type === "MCQ";

  const multiSelected: string[] = isMulti && Array.isArray(selectedAnswer)
    ? selectedAnswer as string[]
    : [];

  const handleToggle = (opt: string) => {
    if (showResult) return;
    if (isMulti) {
      const updated = multiSelected.includes(opt)
        ? multiSelected.filter((v) => v !== opt)
        : [...multiSelected, opt];
      onAnswer(question.id, updated);
    } else {
      onAnswer(question.id, opt);
    }
  };

  const isSelected = (opt: string) => {
    if (isMulti) return multiSelected.includes(opt);
    return String(selectedAnswer) === opt;
  };

  const getState = (opt: string): "default" | "selected" | "correct" | "incorrect" => {
    if (!showResult) return isSelected(opt) ? "selected" : "default";
    const correct = Array.isArray(correctAnswer)
      ? (correctAnswer as string[]).includes(opt)
      : String(correctAnswer) === opt;
    if (correct) return "correct";
    if (isSelected(opt) && !correct) return "incorrect";
    return "default";
  };

  const stateStyles: Record<string, string> = {
    default: "border-[#e5e7eb] bg-transparent hover:border-[#38c1ff] hover:bg-blue-50/40",
    selected: "border-[#38c1ff] bg-blue-50",
    correct: "border-[#22c55e] bg-green-50",
    incorrect: "border-[#ef4444] bg-red-50",
  };
  const letterStyles: Record<string, string> = {
    default: "bg-black/5 text-[#6b7280]",
    selected: "bg-[#38c1ff] text-white",
    correct: "bg-[#22c55e] text-white",
    incorrect: "bg-[#ef4444] text-white",
  };

  if (isMulti) {
    return (
      <p className="mb-3 text-[12px] italic text-[#6b7280]">
        Select all correct answers
      </p>
    );
  }

  return (
    <>
      {isMulti && (
        <p className="mb-3 text-[12px] italic text-[#6b7280]">Select all correct answers</p>
      )}
      <div className="flex flex-col gap-2.5">
        {question.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const state = getState(opt);
          return (
            <button
              key={`${question.id}-${i}`}
              onClick={() => handleToggle(opt)}
              disabled={!!showResult}
              className={`flex items-center gap-3 rounded-[12px] border-[1.5px] px-4 py-3 text-left transition-all duration-150 ${stateStyles[state]}`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[12px] font-bold transition-colors ${letterStyles[state]}`}>
                {letter}
              </span>
              <span className="flex-1 text-[15px] text-[#111827]">{opt}</span>
              {showResult && state === "correct" && (
                <span className="text-[#22c55e] font-bold">✓</span>
              )}
              {showResult && state === "incorrect" && (
                <span className="text-[#ef4444] font-bold">✗</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

function McqOptions({
  question,
  selectedAnswer,
  onAnswer,
  showResult,
  correctAnswer,
}: {
  question: QuestionData;
  selectedAnswer: unknown;
  onAnswer: (id: string, answer: unknown) => void;
  showResult?: boolean;
  correctAnswer?: unknown;
}) {
  const multiSelected: string[] = Array.isArray(selectedAnswer)
    ? selectedAnswer as string[]
    : [];

  const handleToggle = (opt: string) => {
    if (showResult) return;
    const updated = multiSelected.includes(opt)
      ? multiSelected.filter((v) => v !== opt)
      : [...multiSelected, opt];
    onAnswer(question.id, updated);
  };

  const isSelected = (opt: string) => multiSelected.includes(opt);

  const getState = (opt: string): "default" | "selected" | "correct" | "incorrect" => {
    if (!showResult) return isSelected(opt) ? "selected" : "default";
    const correct = Array.isArray(correctAnswer)
      ? (correctAnswer as string[]).includes(opt)
      : String(correctAnswer) === opt;
    if (correct) return "correct";
    if (isSelected(opt) && !correct) return "incorrect";
    return "default";
  };

  const stateStyles: Record<string, string> = {
    default: "border-[#e5e7eb] bg-transparent hover:border-[#a78bfa] hover:bg-violet-50/40",
    selected: "border-[#a78bfa] bg-violet-50",
    correct: "border-[#22c55e] bg-green-50",
    incorrect: "border-[#ef4444] bg-red-50",
  };
  const checkStyles: Record<string, string> = {
    default: "border-[#e5e7eb] bg-white",
    selected: "border-[#a78bfa] bg-[#a78bfa]",
    correct: "border-[#22c55e] bg-[#22c55e]",
    incorrect: "border-[#ef4444] bg-[#ef4444]",
  };

  return (
    <>
      <p className="mb-3 text-[12px] italic text-[#6b7280]">Select all correct answers</p>
      <div className="flex flex-col gap-2.5">
        {question.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const state = getState(opt);
          return (
            <button
              key={`${question.id}-${i}`}
              onClick={() => handleToggle(opt)}
              disabled={!!showResult}
              className={`flex items-center gap-3 rounded-[12px] border-[1.5px] px-4 py-3 text-left transition-all duration-150 ${stateStyles[state]}`}
            >
              {/* Checkbox */}
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors ${checkStyles[state]}`}>
                {(state === "selected" || state === "correct") && (
                  <svg viewBox="0 0 12 9" fill="none" className="h-3 w-3">
                    <path d="M1 4l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {state === "incorrect" && (
                  <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5">
                    <path d="M1 1l8 8M9 1l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              <span className="text-[13px] text-[#6b7280] font-mono">{letter}</span>
              <span className="flex-1 text-[15px] text-[#111827]">{opt}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function SketchUpload({
  questionId,
  selectedAnswer,
  onAnswer,
  showResult,
}: {
  questionId: string;
  selectedAnswer: unknown;
  onAnswer: (id: string, answer: unknown) => void;
  showResult?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);

  const currentImage = typeof selectedAnswer === "string" ? selectedAnswer : null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setCompressing(true);
    try {
      const dataUrl = await compressImage(file, 1200);
      onAnswer(questionId, dataUrl);
    } finally {
      setCompressing(false);
    }
  };

  if (showResult && currentImage) {
    return (
      <div className="rounded-[14px] border border-[#e5e7eb] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentImage} alt="Your submitted sketch" className="w-full max-h-[400px] object-contain bg-gray-50" />
        <p className="px-4 py-2 text-[12px] text-[#6b7280] bg-amber-50 border-t border-amber-100">
          📋 Submitted sketch — pending teacher review
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {currentImage ? (
        <div className="rounded-[14px] border-2 border-amber-400 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentImage} alt="Your sketch preview" className="w-full max-h-[360px] object-contain bg-amber-50/30" />
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-t border-amber-100">
            <span className="text-[13px] font-medium text-amber-800">Sketch uploaded ✓</span>
            {!showResult && (
              <button
                onClick={() => { onAnswer(questionId, ""); if (inputRef.current) { inputRef.current.value = ""; } }}
                className="text-[12px] font-semibold text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => !showResult && !compressing && inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed border-amber-300 bg-amber-50/40 px-6 py-10 transition hover:border-amber-400 hover:bg-amber-50"
        >
          <div className="grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-600">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="2">
              <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-amber-800">Upload your sketch</p>
            <p className="mt-1 text-[13px] text-amber-600">Take a photo or upload an image file</p>
          </div>
          {compressing && (
            <div className="flex items-center gap-2 text-[13px] text-amber-700">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
              Compressing…
            </div>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />
    </div>
  );
}

function NumericInput({
  questionId,
  selectedAnswer,
  onAnswer,
  showResult,
  correctAnswer,
  explanation,
}: {
  questionId: string;
  selectedAnswer: unknown;
  onAnswer: (id: string, answer: unknown) => void;
  showResult?: boolean;
  correctAnswer?: unknown;
  explanation?: string | null;
}) {
  const value = typeof selectedAnswer === "string" ? selectedAnswer : "";
  const correct = Array.isArray(correctAnswer)
    ? (correctAnswer as string[])[0]
    : String(correctAnswer ?? "");
  const isCorrect = showResult
    ? value.trim().toLowerCase() === correct.trim().toLowerCase()
    : null;

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={value}
        onChange={(e) => !showResult && onAnswer(questionId, e.target.value)}
        disabled={!!showResult}
        placeholder="Type your answer here…"
        className={`w-full rounded-[12px] border-2 px-4 py-3 text-[16px] outline-none transition-colors
          ${showResult
            ? isCorrect
              ? "border-[#22c55e] bg-green-50 text-green-800"
              : "border-[#ef4444] bg-red-50 text-red-800"
            : "border-[#e5e7eb] bg-white focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100"
          }`}
      />
      {showResult && (
        <div className={`flex items-start gap-2 rounded-[10px] px-4 py-3 text-[13px] ${isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          <span className="text-base font-bold">{isCorrect ? "✓" : "✗"}</span>
          <span>
            {isCorrect ? "Correct!" : `Incorrect. Correct answer: `}
            {!isCorrect && <strong>{correct}</strong>}
            {explanation && <span className="ml-2 text-[#6b7280]"> — {explanation}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main QuestionCard ─────────────────────────────────────────────────────────

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswer,
  isFlagged,
  onToggleFlag,
  showResult,
  correctAnswer,
  explanation,
  watermark,
}: {
  question: QuestionData;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: unknown;
  onAnswer: (questionId: string, answer: unknown) => void;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
  showResult?: boolean;
  correctAnswer?: unknown;
  explanation?: string | null;
  watermark?: QuestionWatermark;
}) {
  return (
    <div className="relative rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
      {watermark && <QuestionSecurityWatermark watermark={watermark} />}

      {/* Header */}
      <div className="relative z-[1] mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-bold text-[#38c1ff]">
            Q{questionNumber}
            <span className="font-normal text-[#9ca3af]">/{totalQuestions}</span>
          </span>
          <TypeBadge type={question.type} />
          {question.category && (
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-purple-700">
              {QUESTION_CATEGORY_LABELS[question.category]}
            </span>
          )}
          <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-[#6b7280]">
            {question.points} pt{question.points !== 1 ? "s" : ""}
          </span>
        </div>
        {onToggleFlag && (
          <button
            onClick={onToggleFlag}
            title={isFlagged ? "Unflag" : "Flag for review"}
            className="rounded-lg p-1.5 transition hover:bg-black/5 text-lg"
          >
            {isFlagged ? "🚩" : "🏳️"}
          </button>
        )}
      </div>

      {/* Prompt */}
      <p className="relative z-[1] mb-5 text-[17px] font-medium leading-relaxed text-[#111827]">
        {question.prompt}
      </p>

      {/* Optional image in prompt */}
      {question.imageUrl && (
        <div className="relative z-[1] mb-5 overflow-hidden rounded-[12px] border border-[#e5e7eb]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={question.imageUrl} alt="Question image" className="max-h-[300px] w-full object-contain" />
        </div>
      )}

      {/* ── Type-specific answer area ── */}
      <div className="relative z-[1]">
        {question.type === "SCQ" && (
          <ScqMcqOptions
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswer={onAnswer}
            showResult={showResult}
            correctAnswer={correctAnswer}
          />
        )}
        {question.type === "MCQ" && (
          <McqOptions
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswer={onAnswer}
            showResult={showResult}
            correctAnswer={correctAnswer}
          />
        )}
        {question.type === "SKETCH" && (
          <SketchUpload
            questionId={question.id}
            selectedAnswer={selectedAnswer}
            onAnswer={onAnswer}
            showResult={showResult}
          />
        )}
        {question.type === "NUMERIC" && (
          <NumericInput
            questionId={question.id}
            selectedAnswer={selectedAnswer}
            onAnswer={onAnswer}
            showResult={showResult}
            correctAnswer={correctAnswer}
            explanation={explanation}
          />
        )}
      </div>

      {/* Explanation (shown after grading for SCQ/MCQ) */}
      {showResult && explanation && question.type !== "NUMERIC" && (
        <div className="relative z-[1] mt-4 rounded-[10px] bg-blue-50 px-4 py-3 text-[13px] leading-relaxed text-[#374151]">
          <strong className="text-[#38c1ff]">Explanation: </strong>
          {explanation}
        </div>
      )}
    </div>
  );
}
