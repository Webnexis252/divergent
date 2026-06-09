"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { ImagePlus, Plus, Trash2, Clock, FileText, Target, Users, GripVertical } from "lucide-react";
import { BuilderDrawer } from "./_components/builder-drawer";

// Types
type QuestionType = "SCQ" | "MCQ" | "SKETCH" | "NUMERIC";
type QuestionCategory = "CONCEPT" | "VISUALIZATION" | "OBSERVATION" | "PRACTICAL";

type Question = {
  id: string; type: QuestionType; category: QuestionCategory; prompt: string;
  explanation: string | null; options: string[]; correctAnswer: string[];
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

export default function ExamContentBuilder({ params }: { params: Promise<{ courseId: string; testId: string }> }) {
  const router = useRouter();
  const { courseId, testId } = use(params);

  const [test, setTest] = useState<{ title: string; status: string } | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer / Add State
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget | null>(null);

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

  // Very simple Add Part logic to quickly get started
  async function handleAddPart() {
    const title = prompt("Part Title (e.g. Part A)");
    if (!title) return;
    const dur = prompt("Duration in minutes (leave blank for no limit)");
    const durationMins = dur ? parseInt(dur) : null;
    
    await fetch(`/api/tests/${testId}/parts`, {
      method: "POST",
      body: JSON.stringify({ title, durationMins })
    });
    fetchExamData();
  }

  async function handleAddSection(partId: string) {
    const title = prompt("Section Title (e.g. Physics Section)");
    if (!title) return;
    const typeStr = prompt("Question Type (SCQ, MCQ, NUMERIC, SKETCH)", "SCQ");
    if (!typeStr) return;

    await fetch(`/api/tests/parts/${partId}/sections`, {
      method: "POST",
      body: JSON.stringify({ title, questionType: typeStr.toUpperCase() })
    });
    fetchExamData();
  }

  function openDrawer(target: DrawerTarget) {
    setDrawerTarget(target);
    setAddDrawerOpen(true);
  }

  async function handleDelete(type: "PART" | "SECTION" | "GROUP" | "QUESTION", id: string) {
    if (!confirm(`Are you sure you want to delete this ${type.toLowerCase()}?`)) return;
    
    let url = "";
    if (type === "PART") url = `/api/tests/parts/${id}`;
    if (type === "SECTION") url = `/api/tests/sections/${id}`;
    if (type === "GROUP") url = `/api/tests/groups/${id}`;
    if (type === "QUESTION") url = `/api/courses/${courseId}/tests/${testId}/questions/${id}`;

    await fetch(url, { method: "DELETE" });
    fetchExamData();
  }

  function renderQuestion(q: Question, index: number) {
    return (
      <div key={q.id} className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm group">
        <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => handleDelete("QUESTION", q.id)} className="text-red-500 hover:text-red-700 p-1">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex gap-3">
          <GripVertical className="h-5 w-5 text-gray-400 mt-0.5 cursor-grab" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">Q{index + 1}.</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">{q.category}</span>
              <span className="ml-auto text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">+{q.points}</span>
              {q.negativeMarks > 0 && <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">-{q.negativeMarks}</span>}
            </div>
            
            <p className="text-sm text-gray-800 font-medium">{q.prompt}</p>
            {q.imageUrl && <img src={q.imageUrl} alt="Question" className="mt-2 max-h-40 rounded border" />}
            
            {q.options && q.options.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {q.options.map((opt, i) => {
                  const isCorrect = q.correctAnswer.includes(String(i));
                  return (
                    <div key={i} className={`rounded-md border p-2 text-xs ${isCorrect ? "border-green-300 bg-green-50 font-semibold" : "bg-gray-50"}`}>
                      {opt}
                    </div>
                  );
                })}
              </div>
            )}
            
            {q.type === "NUMERIC" && (
              <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900 font-medium">
                Answer: {q.correctAnswer.join(" to ")}
              </div>
            )}
            {q.type === "SKETCH" && (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                Student will sketch answer.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10">
        
        {/* Sticky Header */}
        <RevealSection>
          <div className="sticky top-0 z-50 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-4 bg-white/90 backdrop-blur-md border-b shadow-sm mb-6 flex items-center justify-between">
            <div>
              <button onClick={() => router.push(`/admin/courses/${courseId}/exams`)} className="mb-2 text-sm text-blue-600 hover:underline">
                &larr; Back to Exams
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Content Builder</h1>
              <p className="mt-1 text-gray-600">{test ? test.title : "Loading..."}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={handleAddPart} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-md transition-all">
                <Plus className="h-4 w-4" /> Add Part
              </button>
            </div>
          </div>
        </RevealSection>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-xl bg-gray-200"></div>
            <div className="h-32 rounded-xl bg-gray-200"></div>
          </div>
        ) : parts.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900">No content yet</h3>
            <p className="mt-2 text-gray-500">Start by adding a Part to this exam.</p>
            <button onClick={handleAddPart} className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700">Add Part</button>
          </div>
        ) : (
          <div className="space-y-8">
            {parts.map(part => (
              <div key={part.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{part.title}</h2>
                    {part.durationMins && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-orange-600">
                        <Clock className="h-4 w-4" /> {part.durationMins} Minutes Time Limit
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleAddSection(part.id)} className="rounded-lg border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Add Section
                    </button>
                    <button onClick={() => handleDelete("PART", part.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {part.sections.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">No sections in this part.</p>
                  ) : (
                    part.sections.map(section => (
                      <div key={section.id} className="rounded-xl border border-blue-100 bg-blue-50/30 overflow-hidden">
                        <div className="bg-blue-50/80 px-4 py-3 flex items-center justify-between border-b border-blue-100">
                          <div className="flex items-center gap-3">
                            <Target className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold text-blue-900">{section.title}</h3>
                            <span className="rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-800 tracking-wide">
                              {section.questionType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openDrawer({ type: "GROUP", partId: part.id, sectionId: section.id, fixedQuestionType: section.questionType })} className="text-xs font-medium text-blue-700 hover:underline px-2 py-1 bg-white/50 rounded">Add Group</button>
                            <span className="text-blue-300">|</span>
                            <button onClick={() => openDrawer({ type: "QUESTION", partId: part.id, sectionId: section.id, fixedQuestionType: section.questionType })} className="text-xs font-medium text-blue-700 hover:underline px-2 py-1 bg-white/50 rounded">Add Question</button>
                            <button onClick={() => handleDelete("SECTION", section.id)} className="ml-2 text-red-400 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 space-y-6">
                           {/* Render Direct Questions */}
                           {section.questions?.length > 0 && (
                             <div className="space-y-3">
                               {section.questions.map((q, i) => renderQuestion(q, i))}
                             </div>
                           )}

                           {/* Render Groups */}
                           {section.groups?.length > 0 && (
                             <div className="space-y-4">
                               {section.groups.map(group => (
                                 <div key={group.id} className="rounded-xl border border-purple-100 bg-white shadow-sm overflow-hidden relative group">
                                   <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-start justify-between">
                                     <div>
                                        <div className="flex items-center gap-2">
                                          <Users className="h-4 w-4 text-purple-600" />
                                          <h4 className="font-semibold text-purple-900 text-sm">{group.title || "Group"}</h4>
                                        </div>
                                        {group.content && <p className="mt-1 text-xs text-purple-800/80">{group.content}</p>}
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <button onClick={() => openDrawer({ type: "QUESTION", partId: part.id, sectionId: section.id, groupId: group.id, fixedQuestionType: section.questionType })} className="text-xs font-medium text-purple-700 bg-white px-2 py-1 rounded shadow-sm hover:bg-gray-50 border">
                                          + Add Question
                                        </button>
                                        <button onClick={() => handleDelete("GROUP", group.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                     </div>
                                   </div>
                                   <div className="p-4 bg-gray-50/50 space-y-3">
                                     {group.questions?.length > 0 ? (
                                       group.questions.map((q, i) => renderQuestion(q, i))
                                     ) : (
                                       <p className="text-xs text-gray-400 text-center py-2">No questions in this group.</p>
                                     )}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           )}

                           {(section.questions?.length === 0 && section.groups?.length === 0) && (
                             <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed rounded-lg">Empty section. Add a group or question.</p>
                           )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
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
    </PageTransition>
  );
}
