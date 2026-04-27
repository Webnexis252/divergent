"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

type Course = {
  id: string;
  title: string;
};

export function TeacherAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [points, setPoints] = useState("100");
  const [courseId, setCourseId] = useState("");
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/courses")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setCourses(json.data);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          points: parseInt(points) || 0,
          courseId: courseId || undefined,
        }),
      });
      const json = await res.json();
      if (json.success || res.status === 201) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setTitle("");
          setDescription("");
          setDeadline("");
          setPoints("100");
          setCourseId("");
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-[520px] rounded-[24px] bg-white p-8 shadow-[0_24px_60px_rgba(0,0,0,0.2)]"
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            {success ? (
              <div className="py-8 text-center">
                <motion.p className="text-[48px]" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>✅</motion.p>
                <p className="mt-4 text-[20px] font-semibold text-[#15803d]">Assignment created!</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[20px] font-semibold text-black">Create Assignment</h3>
                    <p className="mt-1 text-[14px] text-[#6b7280]">Fill in the details for your new assignment.</p>
                  </div>
                  <button onClick={onClose} className="text-[20px] leading-none text-[#9ca3af] hover:text-black">&times;</button>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  <div>
                    <label className="text-[13px] font-medium text-[#374151]">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Algebra Homework #2"
                      className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[13px] font-medium text-[#374151]">Points</label>
                      <input
                        type="number"
                        value={points}
                        onChange={(e) => setPoints(e.target.value)}
                        className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[13px] font-medium text-[#374151]">Deadline</label>
                      <input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-[#374151]">Course</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                    >
                      <option value="">No specific course (General)</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-[#374151]">Description (optional)</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add instructions or useful links..."
                      className="mt-1 w-full resize-none rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <motion.button
                    onClick={handleSubmit}
                    disabled={submitting || !title.trim()}
                    className="flex-1 rounded-[12px] bg-[#38c1ff] py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(56,193,255,0.3)] disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {submitting ? "Creating..." : "Create Assignment"}
                  </motion.button>
                  <button onClick={onClose} className="rounded-[12px] border border-[#e5e7eb] px-5 py-3 text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb]">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
