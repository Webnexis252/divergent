import { useState } from "react";
import { X, ImagePlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type QuestionType = "SCQ" | "MCQ" | "SKETCH" | "NUMERIC";
type QuestionCategory = "CONCEPT" | "VISUALIZATION" | "OBSERVATION" | "PRACTICAL";

const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  CONCEPT: "Concept",
  VISUALIZATION: "Visualization",
  OBSERVATION: "Observation",
  PRACTICAL: "Practical"
};
const QUESTION_CATEGORY_OPTIONS: QuestionCategory[] = ["CONCEPT", "VISUALIZATION", "OBSERVATION", "PRACTICAL"];

export function BuilderDrawer({
  isOpen,
  onClose,
  target,
  courseId,
  testId,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  target: { type: "GROUP" | "QUESTION", partId: string, sectionId: string, groupId?: string, fixedQuestionType: QuestionType } | null;
  courseId: string;
  testId: string;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Group Form
  const [groupTitle, setGroupTitle] = useState("");
  const [groupContent, setGroupContent] = useState("");

  // Question Form
  const [qForm, setQForm] = useState({
    category: "CONCEPT" as QuestionCategory,
    prompt: "",
    explanation: "",
    explanationImageUrl: null as string | null,
    options: ["Option 1", "Option 2", "Option 3", "Option 4"],
    correctAnswer: ["0"],
    imageUrl: null as string | null,
    points: 1,
    negativeMarks: 0,
    allowPartialMarking: false,
  });

  if (!isOpen || !target) return null;

  async function handleSaveGroup(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/tests/sections/${target!.sectionId}/groups`, {
        method: "POST",
        body: JSON.stringify({ title: groupTitle, content: groupContent }),
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error("Failed to create group");
      
      setGroupTitle("");
      setGroupContent("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const type = target!.fixedQuestionType;

    if (!qForm.imageUrl) {
      setError("Question Image is required");
      setSaving(false);
      return;
    }

    const trimmedOptions = qForm.options.map((option) => option.trim()).filter(Boolean);
    if ((type === "SCQ" || type === "MCQ") && trimmedOptions.length < 2) {
      setError("Choice questions need at least 2 options");
      setSaving(false);
      return;
    }
    if (type === "SCQ" && qForm.correctAnswer.length !== 1) {
      setError("Single Choice questions must have exactly 1 correct answer");
      setSaving(false);
      return;
    }
    if (type === "MCQ" && qForm.correctAnswer.length < 1) {
      setError("Multiple Choice questions need at least 1 correct answer");
      setSaving(false);
      return;
    }
    if (
      (type === "SCQ" || type === "MCQ") &&
      qForm.correctAnswer.some((idx) => !qForm.options[parseInt(idx, 10)]?.trim())
    ) {
      setError("Correct answers cannot be empty options");
      setSaving(false);
      return;
    }
    if (type === "NUMERIC" && !qForm.correctAnswer[0]?.trim()) {
      setError("Numerical questions need a correct answer");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/tests/${testId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...qForm,
          type: type,
          partId: target!.partId,
          sectionId: target!.sectionId,
          groupId: target!.groupId || undefined,
          options: qForm.options.filter((o) => o.trim()),
          correctAnswer: (type === "SCQ" || type === "MCQ")
            ? qForm.correctAnswer.map((idx) => qForm.options[parseInt(idx, 10)]).filter((o) => o?.trim())
            : qForm.correctAnswer,
        }),
      });
      
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || "Failed to add question");
      
      setQForm({
        category: "CONCEPT", prompt: "", explanation: "", explanationImageUrl: null,
        options: ["Option 1", "Option 2", "Option 3", "Option 4"],
        correctAnswer: ["0"], imageUrl: null, points: 1, negativeMarks: 0, allowPartialMarking: false,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/20 backdrop-blur-sm flex justify-end"
      >
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">
              {target.type === "GROUP" ? "New Group" : "New Question"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-5 w-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            
            {target.type === "GROUP" ? (
              <form id="drawer-form" onSubmit={handleSaveGroup} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Group Title (Optional)</label>
                  <input value={groupTitle} onChange={e => setGroupTitle(e.target.value)} className="w-full rounded-md border p-2" placeholder="e.g. Read the passage and answer..." />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Shared Context / Passage</label>
                  <textarea value={groupContent} onChange={e => setGroupContent(e.target.value)} className="w-full rounded-md border p-2" rows={5} placeholder="Common text for all questions in this group..." />
                </div>
              </form>
            ) : (
              <form id="drawer-form" onSubmit={handleSaveQuestion} className="space-y-5">
                <div className="rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 border border-blue-100 mb-2">
                  Question Type: {target.fixedQuestionType}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Question Prompt (Optional)</label>
                  <textarea value={qForm.prompt} onChange={e => setQForm({...qForm, prompt: e.target.value})} className="w-full rounded-md border p-2" rows={3} />
                  
                  {qForm.imageUrl ? (
                      <div className="mt-3 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-gray-50/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qForm.imageUrl} alt="Question" className="max-h-[280px] w-full object-contain" />
                        <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-t border-[#e5e7eb]">
                          <span className="text-[12px] text-gray-600 font-medium">Question image uploaded ✓</span>
                          <button type="button" onClick={() => setQForm({...qForm, imageUrl: null})} className="text-[12px] text-red-500 hover:text-red-700 font-semibold">Remove</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => document.getElementById('qImageUpload2')?.click()}
                        className="mt-2 flex w-fit items-center gap-2 rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-[12px] font-medium text-gray-600 transition hover:bg-gray-50"
                      >
                        <ImagePlus className="h-3.5 w-3.5" /> Add Question Image *
                      </button>
                    )}
                    <input
                      id="qImageUpload2"
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
                              setQForm({...qForm, imageUrl: canvas.toDataURL("image/jpeg", 0.85)});
                            };
                            img.src = ev.target!.result as string;
                          };
                          reader.readAsDataURL(f);
                        }
                      }}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Category</label>
                    <select value={qForm.category} onChange={e => setQForm({...qForm, category: e.target.value as QuestionCategory})} className="w-full rounded-md border p-2">
                      {QUESTION_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{QUESTION_CATEGORY_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Points (+)</label>
                    <input type="number" min="1" value={qForm.points} onChange={e => setQForm({...qForm, points: parseInt(e.target.value)})} className="w-full rounded-md border p-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Negative Marks (-)</label>
                    <input type="number" min="0" step="0.5" value={qForm.negativeMarks} onChange={e => setQForm({...qForm, negativeMarks: parseFloat(e.target.value) || 0})} className="w-full rounded-md border p-2" />
                  </div>
                </div>

                {target.fixedQuestionType === "MCQ" && (
                  <label className="flex items-center gap-2 cursor-pointer bg-blue-50 p-2 rounded border border-blue-100">
                    <input type="checkbox" checked={qForm.allowPartialMarking} onChange={e => setQForm({...qForm, allowPartialMarking: e.target.checked})} />
                    <span className="text-sm font-medium text-blue-900">Allow Partial Marking</span>
                  </label>
                )}

                {(target.fixedQuestionType === "SCQ" || target.fixedQuestionType === "MCQ") && (
                  <div className="space-y-3 border-t pt-4">
                    <label className="block text-sm font-medium">Options</label>
                    {qForm.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={opt} onChange={e => { const newOpts = [...qForm.options]; newOpts[i] = e.target.value; setQForm({...qForm, options: newOpts}); }} className="flex-1 rounded-md border p-2 text-sm" />
                        <div className="flex items-center gap-2 px-2">
                          {target.fixedQuestionType === "SCQ" ? (
                            <input type="radio" checked={qForm.correctAnswer[0] === String(i)} onChange={() => setQForm({...qForm, correctAnswer: [String(i)]})} />
                          ) : (
                            <input type="checkbox" checked={qForm.correctAnswer.includes(String(i))} onChange={() => setQForm({ ...qForm, correctAnswer: qForm.correctAnswer.includes(String(i)) ? qForm.correctAnswer.filter(a => a !== String(i)) : [...qForm.correctAnswer, String(i)] })} />
                          )}
                          <span className="text-sm">Correct</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {target.fixedQuestionType === "NUMERIC" && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium mb-1">Correct Answer *</label>
                    {qForm.correctAnswer.length > 1 ? (
                      <div className="flex gap-4">
                        <input value={qForm.correctAnswer[0] ?? ""} onChange={(e) => setQForm({...qForm, correctAnswer: [e.target.value, qForm.correctAnswer[1] ?? ""]})} placeholder="Min value" className="w-full rounded-md border p-2 text-sm" />
                        <input value={qForm.correctAnswer[1] ?? ""} onChange={(e) => setQForm({...qForm, correctAnswer: [qForm.correctAnswer[0] ?? "", e.target.value]})} placeholder="Max value" className="w-full rounded-md border p-2 text-sm" />
                      </div>
                    ) : (
                      <input value={qForm.correctAnswer[0] ?? ""} onChange={(e) => setQForm({...qForm, correctAnswer: [e.target.value]})} placeholder="Exact answer" className="w-full rounded-md border p-2 text-sm" />
                    )}
                    <button type="button" onClick={() => setQForm({...qForm, correctAnswer: qForm.correctAnswer.length > 1 ? [qForm.correctAnswer[0] ?? ""] : [qForm.correctAnswer[0] ?? "", ""]})} className="text-[12px] mt-1 font-medium text-[#38c1ff] hover:underline">
                      {qForm.correctAnswer.length > 1 ? "Switch to Exact Match" : "Switch to Range Match"}
                    </button>
                  </div>
                )}

                <div className="border-t pt-4">
                  <label className="mb-1 block text-sm font-medium">Explanation (optional)</label>
                  <textarea value={qForm.explanation} onChange={e => setQForm({...qForm, explanation: e.target.value})} className="w-full rounded-md border p-2 text-sm text-gray-600" rows={2} />
                  
                  {qForm.explanationImageUrl ? (
                    <div className="mt-3 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-gray-50/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qForm.explanationImageUrl} alt="Explanation" className="max-h-[200px] w-full object-contain" />
                      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-t border-[#e5e7eb]">
                        <span className="text-[12px] text-gray-600 font-medium">Explanation image uploaded ✓</span>
                        <button type="button" onClick={() => setQForm({...qForm, explanationImageUrl: null})} className="text-[12px] text-red-500 hover:text-red-700 font-semibold">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => document.getElementById('explImageUpload')?.click()}
                      className="mt-2 flex w-fit items-center gap-2 rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-[12px] font-medium text-gray-600 transition hover:bg-gray-50"
                    >
                      <ImagePlus className="h-3.5 w-3.5" /> Add Explanation Image (Optional)
                    </button>
                  )}
                  <input
                    id="explImageUpload"
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
                            const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
                            const canvas = document.createElement("canvas");
                            canvas.width = Math.round(img.width * scale);
                            canvas.height = Math.round(img.height * scale);
                            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                            setQForm({...qForm, explanationImageUrl: canvas.toDataURL("image/jpeg", 0.85)});
                          };
                          img.src = ev.target!.result as string;
                        };
                        reader.readAsDataURL(f);
                      }
                    }}
                  />
                </div>
              </form>
            )}
          </div>

          <div 
            className="border-t p-6 bg-gray-50 flex justify-end gap-3"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Cancel</button>
            <button type="submit" form="drawer-form" disabled={saving} className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
