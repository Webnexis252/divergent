"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  FileText, 
  Upload,
  Video,
  Search
} from "lucide-react";
import { PageTransition } from "@/app/dashboard/_components/motion-wrappers";
import { formatShortDate } from "@/lib/date-format";

type LiveClass = {
  id: string;
  title: string;
  startTime: Date;
  recordingUrl: string | null;
};

type CourseDetails = {
  id: string;
  title: string;
  liveClasses: LiveClass[];
  assignments: { id: string; title: string; createdAt: Date }[];
  tests: { id: string; title: string; status: string; createdAt: Date }[];
};

function groupByMonth<T>(items: T[], dateExtractor: (item: T) => Date) {
  const groups: Record<string, T[]> = {};
  items.forEach(item => {
    const d = new Date(dateExtractor(item));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  
  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map(key => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return { key, label, items: groups[key] };
    });
}

export default function AdminCourseDashboardUI({ initialCourse }: { initialCourse: CourseDetails }) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetails>(initialCourse);
  
  // Accordion states
  const [examsOpen, setExamsOpen] = useState(true);
  const [liveClassesOpen, setLiveClassesOpen] = useState(true);
  const [assignmentsOpen, setAssignmentsOpen] = useState(true);

  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const toggleMonth = (category: string, monthKey: string) => {
    const k = `${category}-${monthKey}`;
    setExpandedMonths(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const [searchQuery, setSearchQuery] = useState("");

  // Recording upload state
  const [recordingInputId, setRecordingInputId] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [savingRecording, setSavingRecording] = useState(false);

  const handleSaveRecording = async (classId: string) => {
    if (!recordingUrl.trim()) return;
    setSavingRecording(true);
    try {
      const res = await fetch(`/api/admin/live-classes/${classId}/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingUrl: recordingUrl.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save recording");
      
      setCourse(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          liveClasses: prev.liveClasses.map(c => 
            c.id === classId ? { ...c, recordingUrl: recordingUrl.trim() } : c
          )
        };
      });
      setRecordingInputId(null);
      setRecordingUrl("");
      router.refresh();
    } catch (err) {
      alert("Failed to save recording URL");
    } finally {
      setSavingRecording(false);
    }
  };

  const filterItems = <T extends { title: string }>(items: T[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => item.title.toLowerCase().includes(q));
  };

  const filteredExams = filterItems(course.tests);
  const filteredClasses = filterItems(course.liveClasses);
  const filteredAssignments = filterItems(course.assignments);

  const examGroups = groupByMonth(filteredExams, t => new Date(t.createdAt));
  const classGroups = groupByMonth(filteredClasses, c => new Date(c.startTime));
  const assignmentGroups = groupByMonth(filteredAssignments, a => new Date(a.createdAt));

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/courses"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform hover:scale-105"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
              <p className="text-sm text-gray-500">Course Management Dashboard</p>
            </div>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-6">
          {/* Exams Section */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <button 
              className="flex w-full items-center justify-between bg-gray-50 px-6 py-4 transition-colors hover:bg-gray-100"
              onClick={() => setExamsOpen(!examsOpen)}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">Exams ({course.tests.length})</h2>
              </div>
              {examsOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            {examsOpen && (
              <div className="p-6">
                {examGroups.length === 0 ? (
                  <p className="text-center text-sm text-gray-500">No exams generated for this course.</p>
                ) : (
                  <div className="space-y-4">
                    {examGroups.map(group => {
                      const isMonthOpen = !!searchQuery.trim() || (expandedMonths[`exams-${group.key}`] || false);
                      return (
                        <div key={group.key} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50">
                          <button 
                            onClick={() => toggleMonth('exams', group.key)}
                            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-100/50"
                          >
                            <h3 className="text-sm font-semibold text-gray-700">{group.label} ({group.items.length})</h3>
                            {isMonthOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                          </button>
                          {isMonthOpen && (
                            <div className="divide-y divide-gray-100 bg-white px-4">
                              {group.items.map(test => (
                                <div key={test.id} className="flex items-center justify-between py-3">
                                  <div>
                                    <p className="font-medium text-gray-900">{test.title}</p>
                                    <p className="text-xs text-gray-500">Created: {formatShortDate(new Date(test.createdAt).toISOString())} · {test.status}</p>
                                  </div>
                                  <Link 
                                    href={`/admin/courses/${course.id}/exams/${test.id}`}
                                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                                  >
                                    Manage
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Live Classes Section */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <button 
              className="flex w-full items-center justify-between bg-gray-50 px-6 py-4 transition-colors hover:bg-gray-100"
              onClick={() => setLiveClassesOpen(!liveClassesOpen)}
            >
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-gray-900">Live Classes ({course.liveClasses.length})</h2>
              </div>
              {liveClassesOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            {liveClassesOpen && (
              <div className="p-6">
                {classGroups.length === 0 ? (
                  <p className="text-center text-sm text-gray-500">No live classes scheduled.</p>
                ) : (
                  <div className="space-y-4">
                    {classGroups.map(group => {
                      const isMonthOpen = !!searchQuery.trim() || (expandedMonths[`classes-${group.key}`] || false);
                      return (
                        <div key={group.key} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50">
                          <button 
                            onClick={() => toggleMonth('classes', group.key)}
                            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-100/50"
                          >
                            <h3 className="text-sm font-semibold text-gray-700">{group.label} ({group.items.length})</h3>
                            {isMonthOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                          </button>
                          {isMonthOpen && (
                            <div className="divide-y divide-gray-100 bg-white px-4">
                              {group.items.map(cls => (
                                <div key={cls.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                                  <div>
                                    <p className="font-medium text-gray-900">{cls.title}</p>
                                    <p className="flex items-center gap-1 text-xs text-gray-500">
                                      <Calendar className="h-3 w-3" />
                                      {formatShortDate(new Date(cls.startTime).toISOString())}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                    {cls.recordingUrl && recordingInputId !== cls.id ? (
                                      <div className="flex items-center gap-2">
                                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                          Recording Available
                                        </span>
                                        <button 
                                          onClick={() => {
                                            setRecordingUrl(cls.recordingUrl || "");
                                            setRecordingInputId(cls.id);
                                          }}
                                          className="text-xs font-medium text-blue-600 hover:underline"
                                        >
                                          Edit Link
                                        </button>
                                      </div>
                                    ) : recordingInputId === cls.id ? (
                                      <div className="flex items-center gap-2">
                                        <input 
                                          type="url"
                                          value={recordingUrl}
                                          onChange={e => setRecordingUrl(e.target.value)}
                                          placeholder="Paste recording URL..."
                                          className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                                        />
                                        <button 
                                          onClick={() => handleSaveRecording(cls.id)}
                                          disabled={savingRecording || !recordingUrl.trim()}
                                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                          {savingRecording ? "Saving..." : "Save"}
                                        </button>
                                        <button 
                                          onClick={() => setRecordingInputId(null)}
                                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => {
                                          setRecordingUrl("");
                                          setRecordingInputId(cls.id);
                                        }}
                                        className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-600 hover:bg-purple-100"
                                      >
                                        <Upload className="h-3 w-3" />
                                        Upload Recording
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Assignments Section */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <button 
              className="flex w-full items-center justify-between bg-gray-50 px-6 py-4 transition-colors hover:bg-gray-100"
              onClick={() => setAssignmentsOpen(!assignmentsOpen)}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-gray-900">Assignments ({course.assignments.length})</h2>
              </div>
              {assignmentsOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            {assignmentsOpen && (
              <div className="p-6">
                {assignmentGroups.length === 0 ? (
                  <p className="text-center text-sm text-gray-500">No assignments created.</p>
                ) : (
                  <div className="space-y-4">
                    {assignmentGroups.map(group => {
                      const isMonthOpen = !!searchQuery.trim() || (expandedMonths[`assignments-${group.key}`] || false);
                      return (
                        <div key={group.key} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50">
                          <button 
                            onClick={() => toggleMonth('assignments', group.key)}
                            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-100/50"
                          >
                            <h3 className="text-sm font-semibold text-gray-700">{group.label} ({group.items.length})</h3>
                            {isMonthOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                          </button>
                          {isMonthOpen && (
                            <div className="divide-y divide-gray-100 bg-white px-4">
                              {group.items.map(assignment => (
                                <div key={assignment.id} className="flex items-center justify-between py-3">
                                  <div>
                                    <p className="font-medium text-gray-900">{assignment.title}</p>
                                    <p className="text-xs text-gray-500">Created: {formatShortDate(new Date(assignment.createdAt).toISOString())}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
