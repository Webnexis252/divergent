"use client";

import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MoreVerticalIcon, PauseCircleIcon } from "./admin-icons";
import { formatShortDate } from "@/lib/date-format";
import { Target } from "lucide-react";
import { AssignGoalModal } from "../students/_components/AssignGoalModal";

import type { StudentRecord } from "../students/_types";


export function StudentTable({
  canManageXp = false,
  onXpAdjust,
  students,
  onStatusChange,
}: {
  canManageXp?: boolean;
  onXpAdjust?: (id: string, direction: "ADD" | "REMOVE", amount: number) => Promise<void> | void;
  students: StudentRecord[];
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [xpDrafts, setXpDrafts] = useState<Record<string, string>>({});
  const [adjustingStudentId, setAdjustingStudentId] = useState<string | null>(null);
  const [assignGoalStudent, setAssignGoalStudent] = useState<{ id: string; name: string } | null>(null);

  async function handleXpAction(studentId: string, direction: "ADD" | "REMOVE") {
    if (!onXpAdjust) return;

    const rawAmount = xpDrafts[studentId] ?? "25";
    const amount = Number(rawAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      return;
    }

    setAdjustingStudentId(studentId);
    try {
      await onXpAdjust(studentId, direction, amount);
      setXpDrafts((current) => ({ ...current, [studentId]: "" }));
    } finally {
      setAdjustingStudentId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="grid gap-3 p-3 md:hidden">
        {students.map((student) => {
          const isExpanded = expandedRow === student.id;
          const xpAmount = Number(xpDrafts[student.id] ?? "");
          const hasValidXpAmount = Number.isInteger(xpAmount) && xpAmount > 0;

          return (
            <article
              key={student.id}
              className="rounded-[22px] border border-[#edf2f7] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
            >
              <button
                className="flex w-full items-start gap-3 text-left"
                onClick={() => setExpandedRow(isExpanded ? null : student.id)}
                type="button"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#38c1ff_0%,#0ea5e9_100%)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(56,193,255,0.28)]">
                  {student.name?.[0]?.toUpperCase() || "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#0f172a]">
                    {student.name ?? "Unnamed student"}
                  </p>
                  <p className="truncate text-sm text-[#64748b]">{student.email ?? "No email"}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <span className="rounded-2xl bg-[#f8fbff] px-2 py-2 text-[11px] font-semibold text-[#475569]">
                      {formatShortDate(student.createdAt)}
                    </span>
                    <span className="rounded-2xl bg-[#e0f2fe] px-2 py-2 text-[11px] font-bold text-[#0369a1]">
                      {student.xpPoints} XP
                    </span>
                    <span className="rounded-2xl bg-[#f1f5f9] px-2 py-2 text-[11px] font-semibold text-[#475569]">
                      {student._count.enrollments} Courses
                    </span>
                  </div>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-4 border-t border-[#eef2f7] pt-4">
                      <div>
                        <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#94a3b8]">
                          Recent Enrollments
                        </h4>
                        {student.enrollments.length > 0 ? (
                          <div className="space-y-3">
                            {student.enrollments.map((enrollment, index) => (
                              <div
                                key={`${enrollment.courseId}-${index}`}
                                className="rounded-2xl border border-[#edf2f7] bg-[#fcfdff] px-3 py-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <span className="min-w-0 flex-1 text-sm font-medium text-[#0f172a]">
                                    {enrollment.course.title}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                      enrollment.status === "ACTIVE"
                                        ? "bg-[#ecfdf5] text-[#15803d]"
                                        : "bg-[#fff7df] text-[#b45309]"
                                    }`}
                                  >
                                    {enrollment.status}
                                  </span>
                                </div>
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
                                  <div
                                    className="h-full rounded-full bg-[linear-gradient(90deg,#38c1ff_0%,#0ea5e9_100%)]"
                                    style={{ width: `${enrollment.progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[#64748b]">No enrollments yet.</p>
                        )}
                      </div>

                      {canManageXp ? (
                        <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#0f172a]">XP Balance</p>
                              <p className="text-xs text-[#64748b]">Super admin action</p>
                            </div>
                            <span className="rounded-full bg-[#e0f2fe] px-3 py-1 text-xs font-bold text-[#0369a1]">
                              {student.xpPoints.toLocaleString()} XP
                            </span>
                          </div>
                          <input
                            className="mt-4 h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] outline-none transition focus:border-[#38c1ff]"
                            min="1"
                            onChange={(event) =>
                              setXpDrafts((current) => ({
                                ...current,
                                [student.id]: event.target.value,
                              }))
                            }
                            placeholder="Enter XP amount"
                            step="1"
                            type="number"
                            value={xpDrafts[student.id] ?? ""}
                          />
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              className="rounded-xl bg-[#dcfce7] px-3 py-2 text-sm font-semibold text-[#15803d] transition disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={adjustingStudentId === student.id || !hasValidXpAmount}
                              onClick={() => void handleXpAction(student.id, "ADD")}
                              type="button"
                            >
                              Give XP
                            </button>
                            <button
                              className="rounded-xl bg-[#fee2e2] px-3 py-2 text-sm font-semibold text-[#b91c1c] transition disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={adjustingStudentId === student.id || !hasValidXpAmount}
                              onClick={() => void handleXpAction(student.id, "REMOVE")}
                              type="button"
                            >
                              Take XP
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-[#eff8ff] p-4 text-center">
                          <p className="text-2xl font-bold text-[#0284c7]">
                            {student._count.createdDoubts}
                          </p>
                          <p className="mt-1 text-xs text-[#64748b]">Doubts Asked</p>
                        </div>
                        <div className="rounded-2xl bg-[#eefcf3] p-4 text-center">
                          <p className="text-2xl font-bold text-[#16a34a]">
                            {student._count.assignmentSubmissions}
                          </p>
                          <p className="mt-1 text-xs text-[#64748b]">Assignments</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button
                          className="flex w-full items-center justify-between rounded-2xl border border-[#bae6fd] bg-[#f0f9ff] p-3 text-sm font-medium text-[#0284c7] transition hover:bg-[#e0f2fe]"
                          onClick={() => setAssignGoalStudent({ id: student.id, name: student.name ?? "Student" })}
                          type="button"
                        >
                          <span className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Assign Weekly Goal
                          </span>
                        </button>
                        <button
                          className="flex w-full items-center justify-between rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-3 text-sm font-medium text-[#dc2626] transition active:bg-[#fee2e2]"
                          onClick={() => onStatusChange(student.id, "SUSPENDED")}
                          type="button"
                        >
                          <span className="flex items-center gap-2">
                            <PauseCircleIcon className="h-4 w-4" />
                            Suspend Account
                          </span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e8eef5] bg-[#f8fbff]">
              <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Student Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Joined</th>
              <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Total XP</th>
              <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Courses</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[#64748b]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const isExpanded = expandedRow === student.id;
              const xpAmount = Number(xpDrafts[student.id] ?? "");
              const hasValidXpAmount = Number.isInteger(xpAmount) && xpAmount > 0;

              return (
                <Fragment key={student.id}>
                  <tr
                    className="cursor-pointer border-b border-[#eef2f7] transition-colors hover:bg-[#fbfdff]"
                    onClick={() => setExpandedRow(isExpanded ? null : student.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpandedRow(isExpanded ? null : student.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-[linear-gradient(135deg,#38c1ff_0%,#0ea5e9_100%)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(56,193,255,0.3)]">
                          {student.name?.[0]?.toUpperCase() || "S"}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-[#0f172a]">
                            {student.name ?? "Unnamed student"}
                          </p>
                          <p className="text-sm text-[#64748b]">{student.email ?? "No email"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#475569]">
                      {formatShortDate(student.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#0284c7]">
                      {student.xpPoints} XP
                    </td>
                    <td className="px-6 py-4 text-sm text-[#475569]">
                      {student._count.enrollments} Enrolled
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="rounded-xl p-2 text-[#64748b] transition hover:bg-[#eef6fb] hover:text-[#0f172a]"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedRow(isExpanded ? null : student.id);
                        }}
                        type="button"
                      >
                        <MoreVerticalIcon className="h-[18px] w-[18px]" />
                      </button>
                    </td>
                  </tr>
                  <AnimatePresence>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="border-b border-[#eef2f7] bg-[#fcfdff] p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
                              <div className="col-span-2">
                                <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#94a3b8]">
                                  Recent Enrollments
                                </h4>
                                {student.enrollments.length > 0 ? (
                                  <div className="space-y-3">
                                    {student.enrollments.map((enrollment, index) => (
                                      <div
                                        key={`${enrollment.courseId}-${index}`}
                                        className="flex flex-col gap-3 rounded-2xl border border-[#edf2f7] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between"
                                      >
                                        <span className="text-sm font-medium text-[#0f172a]">
                                          {enrollment.course.title}
                                        </span>
                                        <div className="flex items-center gap-4">
                                          <div className="h-2 w-24 overflow-hidden rounded-full bg-[#e2e8f0]">
                                            <div
                                              className="h-full rounded-full bg-[linear-gradient(90deg,#38c1ff_0%,#0ea5e9_100%)]"
                                              style={{ width: `${enrollment.progressPercent}%` }}
                                            />
                                          </div>
                                          <span
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                                              enrollment.status === "ACTIVE"
                                                ? "bg-[#ecfdf5] text-[#15803d]"
                                                : "bg-[#fff7df] text-[#b45309]"
                                            }`}
                                          >
                                            {enrollment.status}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-[#64748b]">No enrollments yet.</p>
                                )}
                              </div>

                              <div className="space-y-4">
                                <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#94a3b8]">
                                  Quick Actions
                                </h4>
                                {canManageXp ? (
                                  <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-[#0f172a]">
                                          XP Balance
                                        </p>
                                        <p className="text-xs text-[#64748b]">
                                          Only super admins can give or take learner XP.
                                        </p>
                                      </div>
                                      <span className="rounded-full bg-[#e0f2fe] px-3 py-1 text-xs font-bold text-[#0369a1]">
                                        {student.xpPoints.toLocaleString()} XP
                                      </span>
                                    </div>

                                    <div className="mt-4 flex flex-col gap-3">
                                      <input
                                        className="h-11 rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] outline-none transition focus:border-[#38c1ff]"
                                        min="1"
                                        onChange={(event) =>
                                          setXpDrafts((current) => ({
                                            ...current,
                                            [student.id]: event.target.value,
                                          }))
                                        }
                                        placeholder="Enter XP amount"
                                        step="1"
                                        type="number"
                                        value={xpDrafts[student.id] ?? ""}
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <button
                                          className="rounded-xl bg-[#dcfce7] px-3 py-2 text-sm font-semibold text-[#15803d] transition hover:bg-[#bbf7d0] disabled:cursor-not-allowed disabled:opacity-60"
                                          disabled={adjustingStudentId === student.id || !hasValidXpAmount}
                                          onClick={() => void handleXpAction(student.id, "ADD")}
                                          type="button"
                                        >
                                          Give XP
                                        </button>
                                        <button
                                          className="rounded-xl bg-[#fee2e2] px-3 py-2 text-sm font-semibold text-[#b91c1c] transition hover:bg-[#fecaca] disabled:cursor-not-allowed disabled:opacity-60"
                                          disabled={adjustingStudentId === student.id || !hasValidXpAmount}
                                          onClick={() => void handleXpAction(student.id, "REMOVE")}
                                          type="button"
                                        >
                                          Take XP
                                        </button>
                                      </div>
                                      {!hasValidXpAmount ? (
                                        <p className="text-xs text-[#94a3b8]">
                                          Enter a positive whole XP amount to enable these actions.
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}
                                <div className="flex flex-col gap-3">
                                  <button
                                    className="flex w-full items-center justify-between rounded-2xl border border-[#bae6fd] bg-[#f0f9ff] p-3 text-sm font-medium text-[#0284c7] transition hover:bg-[#e0f2fe]"
                                    onClick={() => setAssignGoalStudent({ id: student.id, name: student.name ?? "Student" })}
                                    type="button"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Target className="h-4 w-4" />
                                      Assign Weekly Goal
                                    </span>
                                  </button>
                                  <button
                                    className="flex w-full items-center justify-between rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-3 text-sm font-medium text-[#dc2626] transition hover:bg-[#fee2e2]"
                                    onClick={() => onStatusChange(student.id, "SUSPENDED")}
                                    type="button"
                                  >
                                    <span className="flex items-center gap-2">
                                      <PauseCircleIcon className="h-4 w-4" />
                                      Suspend Account
                                    </span>
                                  </button>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                  <div className="rounded-2xl bg-[#eff8ff] p-4 text-center">
                                    <p className="text-2xl font-bold text-[#0284c7]">
                                      {student._count.createdDoubts}
                                    </p>
                                    <p className="mt-1 text-xs text-[#64748b]">Doubts Asked</p>
                                  </div>
                                  <div className="rounded-2xl bg-[#eefcf3] p-4 text-center">
                                    <p className="text-2xl font-bold text-[#16a34a]">
                                      {student._count.assignmentSubmissions}
                                    </p>
                                    <p className="mt-1 text-xs text-[#64748b]">Assignments</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <AssignGoalModal
        isOpen={!!assignGoalStudent}
        onClose={() => setAssignGoalStudent(null)}
        studentId={assignGoalStudent?.id ?? ""}
        studentName={assignGoalStudent?.name ?? ""}
      />
    </div>
  );
}
