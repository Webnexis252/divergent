"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, ChevronDown, ChevronUp, Plus, Trash2,
  CheckCircle, Circle, Eye, EyeOff, Edit2, Check, X, Video, FileText, AlignLeft
} from "lucide-react";
import { cx } from "@/lib/cx";

type Lesson = {
  id: string; title: string; order: number;
  contentType: "VIDEO" | "PDF" | "TEXT";
  contentUrl: string | null; bodyText: string | null;
  isFreePreview: boolean; isPublished: boolean; durationMins: number;
};
type Chapter = { id: string; title: string; order: number; isPublished: boolean; lessons: Lesson[] };

const CONTENT_ICONS = { VIDEO: Video, PDF: FileText, TEXT: AlignLeft };

function LessonRow({ lesson, courseId, chapterId, onUpdate, onDelete }: {
  lesson: Lesson; courseId: string; chapterId: string;
  onUpdate: (l: Lesson) => void; onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: lesson.title, contentType: lesson.contentType, contentUrl: lesson.contentUrl ?? "", durationMins: String(lesson.durationMins) });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/lessons/${lesson.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, durationMins: Number(form.durationMins) }),
    });
    const j = await res.json();
    if (j.success) { onUpdate(j.data); setEditing(false); }
    setSaving(false);
  }

  async function togglePublish() {
    const res = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/lessons/${lesson.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !lesson.isPublished }),
    });
    const j = await res.json();
    if (j.success) onUpdate(j.data);
  }

  async function toggleFreePreview() {
    const res = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/lessons/${lesson.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFreePreview: !lesson.isFreePreview }),
    });
    const j = await res.json();
    if (j.success) onUpdate(j.data);
  }

  async function del() {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    await fetch(`/api/courses/${courseId}/chapters/${chapterId}/lessons/${lesson.id}`, { method: "DELETE" });
    onDelete(lesson.id);
  }

  const Icon = CONTENT_ICONS[lesson.contentType] ?? Video;

  return (
    <div className="rounded-[12px] border border-[#eef2f7] bg-white px-4 py-3">
      {editing ? (
        <div className="space-y-2">
          <input className="w-full rounded-[8px] border border-[#dde3ee] px-3 py-1.5 text-[13px] outline-none focus:border-[#38c1ff]" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Lesson title" />
          <div className="flex gap-2">
            <select className="flex-1 rounded-[8px] border border-[#dde3ee] px-2 py-1.5 text-[12px] outline-none" value={form.contentType} onChange={e => setForm(p => ({ ...p, contentType: e.target.value as Lesson["contentType"] }))}>
              <option value="VIDEO">Video</option>
              <option value="PDF">PDF</option>
              <option value="TEXT">Text</option>
            </select>
            <input className="flex-1 rounded-[8px] border border-[#dde3ee] px-3 py-1.5 text-[12px] outline-none focus:border-[#38c1ff]" value={form.contentUrl} onChange={e => setForm(p => ({ ...p, contentUrl: e.target.value }))} placeholder="Content URL" />
            <input type="number" className="w-20 rounded-[8px] border border-[#dde3ee] px-2 py-1.5 text-[12px] outline-none" value={form.durationMins} onChange={e => setForm(p => ({ ...p, durationMins: e.target.value }))} placeholder="Mins" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-1 rounded-[8px] bg-[#38c1ff] px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"><Check className="h-3 w-3" />{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => setEditing(false)} className="flex items-center gap-1 rounded-[8px] border border-[#dde3ee] px-3 py-1 text-[12px] font-semibold text-[#64748b]"><X className="h-3 w-3" />Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#eef8ff] text-[#38c1ff]">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#0f172a]">{lesson.title}</p>
            <p className="text-[11px] text-[#94a3b8]">{lesson.contentType}{lesson.durationMins > 0 ? ` · ${lesson.durationMins}m` : ""}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {lesson.isFreePreview && <span className="rounded-full bg-[#fef9c3] px-2 py-0.5 text-[10px] font-bold text-[#a16207]">FREE</span>}
            <button title="Toggle free preview" onClick={toggleFreePreview} className={cx("rounded-[6px] p-1 text-[10px] font-bold transition", lesson.isFreePreview ? "bg-[#fef9c3] text-[#a16207]" : "text-[#cbd5e1] hover:text-[#64748b]")}>
              {lesson.isFreePreview ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <button title="Toggle published" onClick={togglePublish} className={cx("rounded-[6px] p-1 transition", lesson.isPublished ? "text-[#22c55e]" : "text-[#cbd5e1] hover:text-[#64748b]")}>
              {lesson.isPublished ? <CheckCircle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => setEditing(true)} className="rounded-[6px] p-1 text-[#94a3b8] hover:text-[#38c1ff]"><Edit2 className="h-3.5 w-3.5" /></button>
            <button onClick={del} className="rounded-[6px] p-1 text-[#94a3b8] hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChapterBlock({ chapter, courseId, onUpdate, onDelete }: {
  chapter: Chapter; courseId: string;
  onUpdate: (c: Chapter) => void; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveTitle() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/courses/${courseId}/chapters/${chapter.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const j = await res.json();
    if (j.success) { onUpdate(j.data); setEditingTitle(false); }
    setSaving(false);
  }

  async function togglePublish() {
    const res = await fetch(`/api/courses/${courseId}/chapters/${chapter.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !chapter.isPublished }),
    });
    const j = await res.json();
    if (j.success) onUpdate(j.data);
  }

  async function del() {
    if (!confirm(`Delete chapter "${chapter.title}" and all its lessons?`)) return;
    await fetch(`/api/courses/${courseId}/chapters/${chapter.id}`, { method: "DELETE" });
    onDelete(chapter.id);
  }

  async function addLesson() {
    if (!newLessonTitle.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/courses/${courseId}/chapters/${chapter.id}/lessons`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newLessonTitle }),
    });
    const j = await res.json();
    if (j.success) {
      onUpdate({ ...chapter, lessons: [...chapter.lessons, j.data] });
      setNewLessonTitle(""); setAddingLesson(false);
    }
    setSaving(false);
  }

  function updateLesson(updated: Lesson) {
    onUpdate({ ...chapter, lessons: chapter.lessons.map(l => l.id === updated.id ? updated : l) });
  }
  function deleteLesson(id: string) {
    onUpdate({ ...chapter, lessons: chapter.lessons.filter(l => l.id !== id) });
  }

  return (
    <div className="rounded-[16px] border border-[#e2edf8] bg-[#f8fbff] overflow-hidden">
      {/* Chapter header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button onClick={() => setOpen(o => !o)} className="text-[#94a3b8] hover:text-[#0f172a]">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#38c1ff]/10 text-[#38c1ff]">
          <BookOpen className="h-3.5 w-3.5" />
        </div>
        {editingTitle ? (
          <div className="flex flex-1 items-center gap-2">
            <input autoFocus className="flex-1 rounded-[8px] border border-[#38c1ff] px-2 py-1 text-[13px] font-semibold outline-none" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitle(chapter.title); setEditingTitle(false); } }} />
            <button onClick={saveTitle} disabled={saving} className="flex items-center gap-1 rounded-[8px] bg-[#38c1ff] px-2.5 py-1 text-[12px] font-semibold text-white"><Check className="h-3 w-3" /></button>
            <button onClick={() => { setTitle(chapter.title); setEditingTitle(false); }} className="rounded-[8px] border border-[#dde3ee] p-1"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <p className="flex-1 text-[14px] font-semibold text-[#0f172a] cursor-pointer" onClick={() => setEditingTitle(true)}>{chapter.title}</p>
        )}
        <div className="flex shrink-0 items-center gap-1 ml-auto">
          <span className="text-[11px] text-[#94a3b8]">{chapter.lessons.length} lesson{chapter.lessons.length !== 1 ? "s" : ""}</span>
          <button title="Toggle published" onClick={togglePublish} className={cx("ml-1 rounded-[6px] p-1 transition", chapter.isPublished ? "text-[#22c55e]" : "text-[#cbd5e1] hover:text-[#64748b]")}>
            {chapter.isPublished ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          </button>
          <button onClick={() => setEditingTitle(true)} className="rounded-[6px] p-1 text-[#94a3b8] hover:text-[#38c1ff]"><Edit2 className="h-3.5 w-3.5" /></button>
          <button onClick={del} className="rounded-[6px] p-1 text-[#94a3b8] hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Lessons */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="space-y-2 px-4 pb-4">
              {chapter.lessons.map(lesson => (
                <LessonRow key={lesson.id} lesson={lesson} courseId={courseId} chapterId={chapter.id} onUpdate={updateLesson} onDelete={deleteLesson} />
              ))}
              {chapter.lessons.length === 0 && !addingLesson && (
                <p className="text-center text-[12px] text-[#94a3b8] py-2">No lessons yet. Add one below.</p>
              )}

              {addingLesson ? (
                <div className="flex gap-2">
                  <input autoFocus className="flex-1 rounded-[10px] border border-[#38c1ff] px-3 py-2 text-[13px] outline-none" placeholder="Lesson title…" value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addLesson(); if (e.key === "Escape") setAddingLesson(false); }} />
                  <button onClick={addLesson} disabled={saving || !newLessonTitle.trim()} className="flex items-center gap-1 rounded-[10px] bg-[#38c1ff] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setAddingLesson(false)} className="rounded-[10px] border border-[#dde3ee] px-3 py-2 text-[12px] text-[#64748b]"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <button onClick={() => setAddingLesson(true)} className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#c8dff5] py-2 text-[12px] font-semibold text-[#38c1ff] hover:border-[#38c1ff] hover:bg-[#eef8ff] transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add Lesson
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CurriculumManager({ courseId }: { courseId: string }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/chapters`)
      .then(r => r.json())
      .then(j => { if (j.success) setChapters(j.data); })
      .finally(() => setLoading(false));
  }, [courseId]);

  async function addChapter() {
    if (!newChapterTitle.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/courses/${courseId}/chapters`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newChapterTitle }),
    });
    const j = await res.json();
    if (j.success) { setChapters(p => [...p, j.data]); setNewChapterTitle(""); setAddingChapter(false); }
    setSaving(false);
  }

  function updateChapter(updated: Chapter) {
    setChapters(p => p.map(c => c.id === updated.id ? updated : c));
  }
  function deleteChapter(id: string) {
    setChapters(p => p.filter(c => c.id !== id));
  }

  if (loading) return (
    <div className="space-y-3">
      {[1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-[16px] bg-[#f3f4f6]" />)}
    </div>
  );

  return (
    <div className="space-y-3">
      {chapters.map(chapter => (
        <ChapterBlock key={chapter.id} chapter={chapter} courseId={courseId} onUpdate={updateChapter} onDelete={deleteChapter} />
      ))}

      {chapters.length === 0 && !addingChapter && (
        <div className="rounded-[16px] border border-dashed border-[#c8dff5] py-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-[#c8dff5]" />
          <p className="mt-3 text-[13px] font-semibold text-[#94a3b8]">No modules yet</p>
          <p className="text-[12px] text-[#c4cdd8]">Add a module below to start building the curriculum.</p>
        </div>
      )}

      {addingChapter ? (
        <div className="flex gap-2">
          <input autoFocus className="flex-1 rounded-[12px] border border-[#38c1ff] px-4 py-2.5 text-[14px] font-semibold outline-none" placeholder="Module / Chapter title…" value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addChapter(); if (e.key === "Escape") setAddingChapter(false); }} />
          <button onClick={addChapter} disabled={saving || !newChapterTitle.trim()} className="flex items-center gap-1.5 rounded-[12px] bg-[#38c1ff] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(56,193,255,0.3)] disabled:opacity-50 hover:bg-[#2db4f0] transition-colors">
            <Check className="h-4 w-4" />{saving ? "Adding…" : "Add"}
          </button>
          <button onClick={() => setAddingChapter(false)} className="rounded-[12px] border border-[#dde3ee] px-3 py-2.5 text-[13px] text-[#64748b] hover:bg-[#f8fafc]"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button onClick={() => setAddingChapter(true)} className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#bdd8f5] py-3.5 text-[13px] font-semibold text-[#38c1ff] hover:border-[#38c1ff] hover:bg-[#eef8ff] transition-colors">
          <Plus className="h-4 w-4" /> Add Module / Chapter
        </button>
      )}
    </div>
  );
}
