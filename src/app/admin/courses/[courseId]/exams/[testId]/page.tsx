"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { 
  Plus, Trash2, Clock, Target, Users, GripVertical,
  X, Check, AlertCircle, CircleDot, CheckSquare, Hash, Palette, MoreVertical
} from "lucide-react";
import { BuilderDrawer } from "./_components/builder-drawer";
import { ChevronDown, ChevronUp } from "lucide-react";

// Types
type QuestionType = "SCQ" | "MCQ" | "SKETCH" | "NUMERIC";
type QuestionCategory = "CONCEPT" | "VISUALIZATION" | "OBSERVATION" | "PRACTICAL";

type Question = {
  id: string; type: QuestionType; category: QuestionCategory; prompt: string;
  explanation: string | null; explanationImageUrl: string | null; options: string[]; correctAnswer: string[];
  imageUrl: string | null; points: number; negativeMarks: number; allowPartialMarking: boolean;
};

type Group = { id: string; title: string | null; content: string | null; imageUrl: string | null; questions: Question[] };
type Section = { id: string; title: string; questionType: QuestionType; groups: Group[]; questions: Question[] };
type Part = { id: string; title: string; durationMins: number | null; sections: Section[] };

type DrawerTarget = {
  type: "GROUP" | "QUESTION";
  partId: string;
  sectionId: string;
  groupId?: string;
  fixedQuestionType: QuestionType;
};

// Reusable Modal Component
const Modal = ({ isOpen, onClose, title, children }: any) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 10 }} 
          className="relative w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_-12px_rgba(0,0,0,0.15)] border border-white/20"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 bg-white">{children}</div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: any) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <div className="flex flex-col items-center text-center space-y-4">
      <div className="rounded-full bg-red-100 p-4 text-red-600">
        <AlertCircle className="h-8 w-8" />
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      <div className="mt-6 flex w-full gap-3">
        <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 hover:shadow transition-all">
          Yes, Delete
        </button>
      </div>
    </div>
  </Modal>
);

const QUESTION_ICONS: Record<QuestionType, React.ReactNode> = {
  SCQ: <CircleDot className="h-4 w-4" />,
  MCQ: <CheckSquare className="h-4 w-4" />,
  NUMERIC: <Hash className="h-4 w-4" />,
  SKETCH: <Palette className="h-4 w-4" />
};

export default function ExamContentBuilder({ params }: { params: Promise<{ courseId: string; testId: string }> }) {
  const router = useRouter();
  const { courseId, testId } = use(params);

  const [test, setTest] = useState<{ title: string; status: string } | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  // Modals State
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget | null>(null);

  const [partModalOpen, setPartModalOpen] = useState(false);
  const [partTitle, setPartTitle] = useState("");
  const [partDuration, setPartDuration] = useState("");

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [targetPartId, setTargetPartId] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionType, setSectionType] = useState<QuestionType>("SCQ");

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: "PART" | "SECTION" | "GROUP" | "QUESTION"; id: string } | null>(null);

  useEffect(() => {
    fetchExamData();
  }, [courseId, testId]);

  async function fetchExamData() {
    try {
      const [testRes, partsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/tests/${testId}`),
        fetch(`/api/tests/${testId}/parts`)
      ]);
      const testData = await testRes.json();
      const partsData = await partsRes.json();
      if (testData.success) setTest(testData.data);
      if (partsData.success) setParts(partsData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPartSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partTitle) return;
    const durationMins = partDuration ? parseInt(partDuration) : null;
    
    await fetch(`/api/tests/${testId}/parts`, {
      method: "POST",
      body: JSON.stringify({ title: partTitle, durationMins })
    });
    setPartModalOpen(false);
    setPartTitle("");
    setPartDuration("");
    fetchExamData();
  }

  async function handleTogglePublish() {
    if (!test) return;
    setIsPublishing(true);
    const newStatus = test.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/courses/${courseId}/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTest({ ...test, status: newStatus });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleAddSectionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionTitle || !targetPartId) return;

    await fetch(`/api/tests/parts/${targetPartId}/sections`, {
      method: "POST",
      body: JSON.stringify({ title: sectionTitle, questionType: sectionType })
    });
    setSectionModalOpen(false);
    setSectionTitle("");
    setSectionType("SCQ");
    fetchExamData();
  }

  function openDrawer(target: DrawerTarget) {
    setDrawerTarget(target);
    setAddDrawerOpen(true);
  }

  function confirmDelete(type: "PART" | "SECTION" | "GROUP" | "QUESTION", id: string) {
    setDeleteModal({ isOpen: true, type, id });
  }

  async function handleDeleteConfirm() {
    if (!deleteModal) return;
    const { type, id } = deleteModal;
    
    let url = "";
    if (type === "PART") url = `/api/tests/parts/${id}`;
    if (type === "SECTION") url = `/api/tests/sections/${id}`;
    if (type === "GROUP") url = `/api/tests/groups/${id}`;
    if (type === "QUESTION") url = `/api/courses/${courseId}/tests/${testId}/questions/${id}`;

    await fetch(url, { method: "DELETE" });
    setDeleteModal(null);
    fetchExamData();
  }

  function toggleSection(sectionId: string) {
    setExpandedSections(prev => {
      // By default, if undefined, we assume it's expanded, so clicking it sets it to false.
      const isCurrentlyExpanded = prev[sectionId] ?? true;
      return { ...prev, [sectionId]: !isCurrentlyExpanded };
    });
  }

  function renderQuestion(q: Question, index: number) {
    return (
      <div key={q.id} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:border-blue-100 transition-all">
        <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => confirmDelete("QUESTION", q.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex gap-4">
          <div className="pt-1">
            <GripVertical className="h-5 w-5 text-slate-300 cursor-grab hover:text-slate-500 transition-colors" />
          </div>
          <div className="flex-1 pr-12">
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="text-[15px] font-bold text-slate-900">Q{index + 1}.</span>
              <span className="rounded-full bg-slate-100/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 border border-slate-200/60">{q.category}</span>
              <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shadow-sm">+{q.points} Pts</span>
              {q.negativeMarks > 0 && <span className="text-xs font-bold text-red-700 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full shadow-sm">-{q.negativeMarks}</span>}
            </div>
            
            <p className="text-[15px] text-slate-800 font-medium leading-relaxed">{q.prompt}</p>
            {q.imageUrl && <img src={q.imageUrl} alt="Question" className="mt-4 max-h-48 rounded-xl border border-slate-200 shadow-sm" />}
            
            {q.options && q.options.length > 0 && (q.type === "SCQ" || q.type === "MCQ") && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt, i) => {
                  const isCorrect = q.correctAnswer.includes(String(i));
                  return (
                    <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 text-[14px] transition-colors ${isCorrect ? "border-emerald-300 bg-emerald-50/50 text-emerald-900 font-semibold" : "border-slate-200 bg-slate-50/50 text-slate-700"}`}>
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-slate-400"}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      {opt}
                    </div>
                  );
                })}
              </div>
            )}
            
            {q.type === "NUMERIC" && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/50 p-3 text-[13px] text-sky-900 font-semibold">
                <Hash className="h-4 w-4 text-sky-600" /> Acceptable Range: {q.correctAnswer.join(" to ")}
              </div>
            )}
            {q.type === "SKETCH" && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/50 p-3 text-[13px] text-orange-900 font-medium">
                <Palette className="h-4 w-4 text-orange-600" /> Student will upload a sketch drawing for this question.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        
        {/* Sticky Header with Glassmorphism */}
        <RevealSection>
          <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-5 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_4px_32px_-12px_rgba(0,0,0,0.1)] mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
            <div>
              <button onClick={() => router.push(`/admin/courses/${courseId}/exams`)} className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                &larr; Back to Exams
              </button>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center gap-3">
                Exam Builder
                {test && (
                  <span className={`text-[12px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${test.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {test.status}
                  </span>
                )}
              </h1>
              <p className="mt-1 text-[15px] font-medium text-slate-500">{test ? test.title : "Loading workspace..."}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {test && (
                <button 
                  onClick={handleTogglePublish}
                  disabled={isPublishing}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-bold shadow-sm transition-all duration-200 active:scale-[0.98] ${
                    test.status === "PUBLISHED" 
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200" 
                      : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-[0_4px_14px_rgba(5,150,105,0.3)]"
                  } disabled:opacity-50`}
                >
                  {isPublishing ? "Saving..." : test.status === "PUBLISHED" ? "Unpublish Exam" : "Publish Exam"}
                </button>
              )}
              <button 
                onClick={() => setPartModalOpen(true)} 
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-[14px] font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Add Part
              </button>
            </div>
          </div>
        </RevealSection>

        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-40 rounded-3xl bg-slate-200/60"></div>
            <div className="h-40 rounded-3xl bg-slate-200/60"></div>
          </div>
        ) : parts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-slate-200 bg-slate-50/50 py-24 text-center px-6"
          >
            <div className="rounded-full bg-blue-100 p-5 text-blue-600 mb-6 shadow-inner">
              <Target className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Empty Canvas</h3>
            <p className="mt-2 text-[15px] max-w-md text-slate-500 leading-relaxed">Your exam doesn't have any parts yet. Start building your structure by adding your first Part.</p>
            <button 
              onClick={() => setPartModalOpen(true)} 
              className="mt-8 flex items-center gap-2 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/80 px-6 py-3 text-[14px] font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Create First Part
            </button>
          </motion.div>
        ) : (
          <div className="space-y-12">
            {parts.map((part, index) => (
              <RevealSection key={part.id} delay={index * 0.1}>
                <div className="relative rounded-[28px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                  {/* Premium Part Header */}
                  <div className="sticky top-[80px] z-30 bg-white/95 backdrop-blur-xl px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-t-[28px] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">Part {index + 1}</span>
                      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">{part.title}</h2>
                      {part.durationMins && (
                         <div className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-100 px-3 py-1.5 text-[12px] font-bold text-orange-700">
                           <Clock className="h-3.5 w-3.5" /> {part.durationMins} Min Limit
                         </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setTargetPartId(part.id); setSectionModalOpen(true); }} 
                        className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-4 py-2.5 text-[13px] font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 shadow-sm transition-all flex items-center gap-2 active:scale-95"
                      >
                        <Plus className="h-4 w-4" /> Add Section
                      </button>
                      <button 
                        onClick={() => confirmDelete("PART", part.id)} 
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-95 border border-transparent hover:border-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-8 bg-slate-50/30 rounded-b-[28px]">
                    {part.sections.length === 0 ? (
                      <div className="text-center py-12 rounded-2xl border border-dashed border-slate-300 bg-white">
                        <p className="text-[14px] font-medium text-slate-500">No sections in this part.</p>
                      </div>
                    ) : (
                      part.sections.map(section => {
                        const isExpanded = expandedSections[section.id] ?? true;
                        
                        return (
                        <div key={section.id} className="rounded-[20px] border border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-100/80">
                          {/* Section Header */}
                          <div 
                            onClick={() => toggleSection(section.id)}
                            className="sticky top-[168px] z-20 bg-white/95 backdrop-blur-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100/60 cursor-pointer hover:bg-blue-50/50 transition-colors shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] rounded-t-[20px]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                                {QUESTION_ICONS[section.questionType]}
                              </div>
                              <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">{section.title}</h3>
                              <span className="rounded-full bg-blue-50 border border-blue-100/80 px-3 py-1 text-[11px] font-black text-blue-700 tracking-widest shadow-sm">
                                {section.questionType}
                              </span>
                              <div className="ml-2 text-slate-400 group-hover:text-blue-500 transition-colors">
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); openDrawer({ type: "GROUP", partId: part.id, sectionId: section.id, fixedQuestionType: section.questionType }); }} className="text-[12px] font-bold text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                                Add Group
                              </button>
                              <span className="text-blue-200">|</span>
                              <button onClick={(e) => { e.stopPropagation(); openDrawer({ type: "QUESTION", partId: part.id, sectionId: section.id, fixedQuestionType: section.questionType }); }} className="text-[12px] font-bold text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                                Add Question
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); confirmDelete("SECTION", section.id); }} className="ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-6 space-y-8 bg-white border-t border-slate-100">
                                   {/* Direct Questions */}
                                   {section.questions?.length > 0 && (
                                     <div className="space-y-4">
                                       {section.questions.map((q, i) => renderQuestion(q, i))}
                                     </div>
                                   )}

                                   {/* Groups */}
                                   {section.groups?.length > 0 && (
                                     <div className="space-y-6">
                                       {section.groups.map(group => (
                                         <div key={group.id} className="rounded-[20px] border border-indigo-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden relative group/group">
                                           <div className="bg-indigo-50/60 px-6 py-4 border-b border-indigo-100 flex items-start justify-between">
                                             <div>
                                                <div className="flex items-center gap-2.5 mb-1.5">
                                                  <Users className="h-4 w-4 text-indigo-600" />
                                                  <h4 className="font-bold text-indigo-950 text-[15px]">{group.title || "Question Group"}</h4>
                                                </div>
                                                {group.content && <p className="text-[13px] text-indigo-900/70 font-medium leading-relaxed">{group.content}</p>}
                                             </div>
                                             <div className="flex items-center gap-3">
                                                <button onClick={() => openDrawer({ type: "QUESTION", partId: part.id, sectionId: section.id, groupId: group.id, fixedQuestionType: section.questionType })} className="text-[12px] font-bold text-indigo-700 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-200/60 hover:bg-indigo-50 transition-colors">
                                                  + Add Question
                                                </button>
                                                <button onClick={() => confirmDelete("GROUP", group.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg opacity-0 group-hover/group:opacity-100 transition-all">
                                                  <Trash2 className="h-4 w-4" />
                                                </button>
                                             </div>
                                           </div>
                                           <div className="p-5 bg-slate-50/30 space-y-4">
                                             {group.questions?.length > 0 ? (
                                               group.questions.map((q, i) => renderQuestion(q, i))
                                             ) : (
                                               <p className="text-[13px] text-slate-400 font-medium text-center py-4">No questions added to this group yet.</p>
                                             )}
                                           </div>
                                         </div>
                                       ))}
                                     </div>
                                   )}

                                   {(section.questions?.length === 0 && section.groups?.length === 0) && (
                                     <div className="py-10 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-blue-200/60 bg-blue-50/30 mb-6">
                                        <div className="h-10 w-10 rounded-full bg-blue-100/50 flex items-center justify-center mb-3">
                                          <CircleDot className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <p className="text-[14px] font-medium text-slate-500">This section is empty. Start adding questions or groups.</p>
                                     </div>
                                   )}

                                   <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-slate-100">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); openDrawer({ type: "QUESTION", partId: part.id, sectionId: section.id, fixedQuestionType: section.questionType }); }} 
                                        className="flex items-center gap-1.5 rounded-lg bg-blue-50/50 border border-blue-100 px-4 py-2 text-[13px] font-bold text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all shadow-sm active:scale-95"
                                      >
                                        <Plus className="h-4 w-4" /> Add Another Question
                                      </button>
                                   </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        );
                      })
                    )}

                    {part.sections.length > 0 && (
                      <div className="mt-8 flex justify-center">
                        <button 
                          onClick={() => { setTargetPartId(part.id); setSectionModalOpen(true); }} 
                          className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-5 py-2.5 text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-all shadow-sm active:scale-95"
                        >
                          <Plus className="h-4 w-4" /> Add Another Section
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        )}
      </div>

      <BuilderDrawer 
        isOpen={addDrawerOpen} 
        onClose={() => setAddDrawerOpen(false)} 
        target={drawerTarget} 
        courseId={courseId} 
        testId={testId} 
        onSuccess={fetchExamData} 
      />

      {/* Add Part Modal */}
      <Modal isOpen={partModalOpen} onClose={() => setPartModalOpen(false)} title="Create New Part">
        <form onSubmit={handleAddPartSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-slate-700">Part Title</label>
            <input 
              autoFocus
              value={partTitle}
              onChange={(e) => setPartTitle(e.target.value)}
              placeholder="e.g. Part A - Physics"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-slate-700">Duration (Minutes)</label>
            <input 
              type="number"
              value={partDuration}
              onChange={(e) => setPartDuration(e.target.value)}
              placeholder="Leave blank for no limit"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button type="submit" className="w-full rounded-xl bg-blue-600 py-3 text-[14px] font-bold text-white shadow-sm hover:bg-blue-700 transition-colors">
            Create Part
          </button>
        </form>
      </Modal>

      {/* Add Section Modal */}
      <Modal isOpen={sectionModalOpen} onClose={() => setSectionModalOpen(false)} title="Create New Section">
        <form onSubmit={handleAddSectionSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-slate-700">Section Title</label>
            <input 
              autoFocus
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="e.g. Multiple Choice Questions"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-slate-700">Question Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(["SCQ", "MCQ", "NUMERIC", "SKETCH"] as QuestionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSectionType(type)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-[13px] font-bold transition-all ${sectionType === type ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md ${sectionType === type ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                    {QUESTION_ICONS[type]}
                  </div>
                  {type}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-[14px] font-bold text-white shadow-sm hover:bg-blue-700 transition-colors">
            Create Section
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={deleteModal?.isOpen || false} 
        onClose={() => setDeleteModal(null)} 
        onConfirm={handleDeleteConfirm} 
        title="Confirm Deletion"
        message={`Are you sure you want to delete this ${deleteModal?.type.toLowerCase()}? This action cannot be undone and will remove all nested content.`}
      />
    </PageTransition>
  );
}
