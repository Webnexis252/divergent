"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { TeacherSidebar } from "@/app/dashboard/_components/teacher-sidebar";

type Resource = {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  createdAt: string;
  course?: { id: string; title: string } | null;
};

type Course = {
  id: string;
  title: string;
};

const typeIcons: Record<string, string> = {
  PDF: "📄", SLIDE: "📊", CODE: "💻", OTHER: "📎",
};

export default function TeacherResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const hasAssignedCourses = courses.length > 0;

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/teacher/resources").then((r) => r.json()),
      fetch("/api/teacher/courses").then((r) => r.json()),
    ])
      .then(([resJson, coursesJson]) => {
        if (resJson.success) {
          setResources(resJson.data);
        }
        if (coursesJson.success) setCourses(coursesJson.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf") {
      alert("Only PDF files are allowed");
      return;
    }
    setFile(selectedFile);
  };

  const handleCreate = async () => {
    if (!title.trim() || !file || !selectedCourseId) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const uploadRes = await fetch("/api/upload/resources", {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      
      if (!uploadJson.success) {
        alert(uploadJson.error || uploadJson.message || "Upload failed");
        return;
      }

      const res = await fetch("/api/teacher/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          fileUrl: uploadJson.data.url, 
          type: "PDF",
          courseId: selectedCourseId || null 
        }),
      });
      const resJson = await res.json();

      if (res.ok && resJson.success) { 
        setTitle(""); 
        setFile(null); 
        setSelectedCourseId("");
        setShowForm(false); 
        load(); 
      } else {
        alert(resJson.error || "Unable to save resource");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/teacher/resources?id=${id}`, { method: "DELETE" });
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="text-black">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-8 px-0 pb-16 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <TeacherSidebar />
          <section className="px-6 py-6 lg:px-[38px] lg:py-[18px]">
            <div className="mx-auto max-w-[900px] space-y-8">

              <RevealSection>
                <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#059669] to-[#38c1ff] px-8 py-10 text-white shadow-[0_20px_50px_rgba(5,150,105,0.25)]">
                  <motion.div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <div className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest">📚 My Library</div>
                      <h1 className="mt-4 text-[32px] font-semibold tracking-tight">Resource Library</h1>
                      <p className="mt-2 text-white/80">{resources.length} resources saved.</p>
                    </div>
                    <motion.button
                      onClick={() => setShowForm(!showForm)}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                      className="rounded-[14px] bg-white/20 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm"
                    >
                      {showForm ? "✕ Cancel" : "+ Add Resource"}
                    </motion.button>
                  </div>
                </div>
              </RevealSection>

              {showForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[20px] bg-white p-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
                  <h3 className="mb-4 text-[17px] font-semibold">Add New Resource</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Title</label>
                      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title..." className="w-full rounded-[12px] border px-4 py-2.5 text-sm outline-none focus:border-[#059669]" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Assign to Course</label>
                      {hasAssignedCourses ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {courses.map((course) => {
                              const isSelected = selectedCourseId === course.id;

                              return (
                                <button
                                  key={course.id}
                                  type="button"
                                  onClick={() => setSelectedCourseId(course.id)}
                                  className={`rounded-[16px] border px-4 py-3 text-left transition ${
                                    isSelected
                                      ? "border-[#059669] bg-emerald-50 shadow-[0_8px_24px_rgba(5,150,105,0.12)]"
                                      : "border-gray-200 bg-white hover:border-[#38c1ff] hover:bg-sky-50/40"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-[#101828]">{course.title}</p>
                                      <p className="mt-1 text-xs text-[#64748b]">
                                        Upload this material to make it visible in this course&apos;s student modules.
                                      </p>
                                    </div>
                                    <span
                                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                        isSelected
                                          ? "border-[#059669] bg-[#059669] text-white"
                                          : "border-gray-300 bg-white text-transparent"
                                      }`}
                                    >
                                      •
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            className="w-full rounded-[12px] border px-4 py-2.5 text-sm outline-none focus:border-[#059669] bg-white"
                          >
                            <option value="">Choose the course students should see this in</option>
                            {courses.map((course) => (
                              <option key={course.id} value={course.id}>
                                {course.title}
                              </option>
                            ))}
                          </select>

                          {selectedCourse ? (
                            <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                              Selected course: <span className="font-semibold">{selectedCourse.title}</span>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          No course is assigned to this teacher yet. Assign the teacher to a course first, then upload the module or question bank.
                        </div>
                      )}
                      <p className="text-[12px] text-[#64748b]">
                        Students will see this file in their Modules page only if it is attached to their enrolled course.
                      </p>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">File</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept=".pdf" 
                          id="pdf-upload"
                          className="hidden" 
                          onChange={handleFileUpload}
                        />
                        <label 
                          htmlFor="pdf-upload"
                          className="flex w-full cursor-pointer items-center gap-3 rounded-[12px] border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-[20px]">📄</span>
                          {file ? <span className="text-black font-medium truncate">{file.name}</span> : "Click to select local PDF file"}
                        </label>
                      </div>
                    </div>

                    <motion.button onClick={handleCreate} disabled={submitting || !file || !title.trim() || !selectedCourseId || !hasAssignedCourses} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="w-full rounded-[12px] bg-[#059669] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {submitting ? "Uploading & Saving..." : "Save Resource"}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-[18px] bg-gray-100" />)}</div>
              ) : resources.length === 0 ? (
                <div className="rounded-[24px] bg-white p-12 text-center shadow-sm">
                  <p className="text-[48px]">📚</p>
                  <p className="mt-4 text-[18px] font-semibold text-[#101828]">No resources yet</p>
                  <p className="mt-2 text-[14px] text-[#94a3b8]">Add PDFs or question banks to a course so enrolled students can see them in Modules.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resources.map((r, i) => (
                    <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 rounded-[18px] bg-white px-5 py-4 shadow-[0px_2px_8px_rgba(0,0,0,0.05)]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-[24px]">
                        {typeIcons[r.type] ?? "📎"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#101828] truncate">{r.title}</p>
                          {r.course && (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                              {r.course.title}
                            </span>
                          )}
                          {!r.course && (
                            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-tight">
                              Not visible to students
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#94a3b8]">{r.type} · Added {new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <a href={r.fileUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-[#059669] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#047857] transition">
                          Open
                        </a>
                        <button onClick={() => handleDelete(r.id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition">
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </PageTransition>
    </div>
  );
}
