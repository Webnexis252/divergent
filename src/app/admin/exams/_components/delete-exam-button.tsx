"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DeleteExamButton({ examId, courseId }: { examId: string; courseId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault(); // Prevent navigating to the exam page
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this exam? This action cannot be undone and will delete all associated questions and attempts.")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/tests/${examId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete exam");
      
      router.refresh();
    } catch (err) {
      alert("Error deleting exam");
      setIsDeleting(false);
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="ml-4 rounded-md p-2 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
      title="Delete Exam"
    >
      <Trash2 className="h-5 w-5" />
    </button>
  );
}
