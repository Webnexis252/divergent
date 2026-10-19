"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Loader2,
  AlertCircle,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Clock,
  Search,
  X,
  Banknote,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import {
  AdminPanelHeader,
  StatusBadge,
  adminButton,
  adminButtonSm,
  adminInputClass,
  adminLabelClass,
  adminPanelClass,
  adminTable,
  adminToolbarClass,
} from "../_components/admin-ui";
import type { IconTone } from "../_components/admin-ui";
import { useRouter } from "next/navigation";

type InstallmentData = {
  id: string;
  userId: string;
  courseId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  courseTitle: string;
  currentInstallment: number;
  totalInstallments: number;
  nextAmount: number;
  validUntil: string | null;
  isExpired: boolean;
  hasPendingRequest: boolean;
};

function CashPaymentModal({
  isOpen,
  onClose,
  data,
  initialStudent,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: InstallmentData[];
  initialStudent?: InstallmentData | null;
}) {
  const router = useRouter();
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState(""); // Upload functionality not fully implemented here
  const [installmentIndex, setInstallmentIndex] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialStudent) {
        setSelectedStudentId(initialStudent.id);
        setAmount(initialStudent.nextAmount.toString());
        setInstallmentIndex(initialStudent.currentInstallment.toString());
        setStudentSearch("");
      } else {
        setSelectedStudentId("");
        setAmount("");
        setInstallmentIndex("");
        setStudentSearch("");
      }
      setIsDropdownOpen(false);
      setShowConfirm(false);
      setPaymentDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setReferenceNumber("");
      setNotes("");
      setReceiptUrl("");
      setError("");
    }
  }, [isOpen, initialStudent]);

  const selectedStudent = data.find((d) => d.id === selectedStudentId);

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    const student = data.find((d) => d.id === id);
    if (student) {
      setAmount(student.nextAmount.toString());
      setInstallmentIndex(student.currentInstallment.toString());
    } else {
      setAmount("");
      setInstallmentIndex("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setError("Please select a student");
      return;
    }
    if (!amount || !installmentIndex) {
      setError("Amount and Installment Number are required");
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/installments/cash-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudent.userId,
          courseId: selectedStudent.courseId,
          amount: parseFloat(amount),
          paymentDate,
          referenceNumber,
          notes,
          receiptUrl,
          installmentIndex: parseInt(installmentIndex),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to record cash payment");
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[24px] border border-[#e8edf3] bg-white shadow-[0_40px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] p-6">
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">
            Record Cash Payment
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#94a3b8] hover:bg-[#f8fafc] hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] p-3 text-[#b91c1c]">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="relative">
            <label className={adminLabelClass}>
              Student & Course
            </label>
            {!!initialStudent ? (
              <input
                type="text"
                disabled
                value={`${initialStudent.studentName} (${initialStudent.courseTitle})`}
                className={`${adminInputClass} cursor-not-allowed bg-[#f8fafc] text-[#64748b]`}
              />
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Search student or course..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setIsDropdownOpen(true);
                    if (selectedStudentId) {
                      setSelectedStudentId(""); // Clear selection if user types
                      setAmount("");
                      setInstallmentIndex("");
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className={adminInputClass}
                  required={!selectedStudentId}
                />
                {isDropdownOpen && studentSearch && !selectedStudentId && (
                  <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[12px] border border-[#e2e8f0] bg-white py-1 text-sm shadow-[0_20px_50px_rgba(15,23,42,0.14)]">
                    {data
                      .filter(
                        (d) =>
                          d.studentName
                            .toLowerCase()
                            .includes(studentSearch.toLowerCase()) ||
                          d.courseTitle
                            .toLowerCase()
                            .includes(studentSearch.toLowerCase())
                      )
                      .map((d) => (
                        <li
                          key={d.id}
                          className="cursor-pointer px-4 py-2 hover:bg-[#f0f9ff] hover:text-[#0369a1]"
                          onClick={() => {
                            setStudentSearch(`${d.studentName} (${d.courseTitle})`);
                            handleStudentChange(d.id);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="font-medium text-[#0f172a]">{d.studentName}</div>
                          <div className="text-xs text-[#64748b]">{d.courseTitle}</div>
                        </li>
                      ))}
                    {data.filter(
                      (d) =>
                        d.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        d.courseTitle.toLowerCase().includes(studentSearch.toLowerCase())
                    ).length === 0 && (
                      <li className="px-4 py-2 text-[#64748b]">No matching students found</li>
                    )}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={adminLabelClass}>
                Installment Number
              </label>
              <select
                value={installmentIndex}
                onChange={(e) => setInstallmentIndex(e.target.value)}
                className={adminInputClass}
                required
              >
                <option value="">Select...</option>
                {selectedStudent &&
                  Array.from({ length: selectedStudent.totalInstallments }).map(
                    (_, i) => (
                      <option key={i} value={i}>
                        Installment {i + 1}
                      </option>
                    ),
                  )}
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>
                Amount Paid (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={adminInputClass}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={adminLabelClass}>
                Payment Date
              </label>
              <input
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className={adminInputClass}
                required
              />
            </div>
            <div>
              <label className={adminLabelClass}>
                Reference Number{" "}
                <span className="text-[#94a3b8] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. Receipt #123"
                className={adminInputClass}
              />
            </div>
          </div>

          <div>
            <label className={adminLabelClass}>
              Notes{" "}
              <span className="text-[#94a3b8] font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={adminInputClass}
            ></textarea>
          </div>

          <div>
            <label className={adminLabelClass}>
              Receipt Photo URL{" "}
              <span className="text-[#94a3b8] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://..."
              className={adminInputClass}
            />
          </div>

          {showConfirm && (
            <div className="flex items-start gap-3 rounded-[12px] border border-[#fde68a] bg-[#fffbeb] p-4 text-[#92400e]">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h3 className="font-semibold">Confirm Cash Payment</h3>
                <p className="text-sm mt-1">
                  Are you sure you want to record this cash payment of ₹{amount} for {selectedStudent?.studentName}? This action will immediately advance their installment plan and cannot be undone.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f1f5f9] pt-6">
            <button
              type="button"
              onClick={() => showConfirm ? setShowConfirm(false) : onClose()}
              className={adminButton.secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={adminButton.primary}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="h-4 w-4" />
              )}
              {showConfirm ? "Yes, Confirm Payment" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminInstallmentsClient({
  initialData,
  adminId,
}: {
  initialData: InstallmentData[];
  adminId: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [selectedInstallmentForCash, setSelectedInstallmentForCash] =
    useState<InstallmentData | null>(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleRequestExtension = async (item: InstallmentData) => {
    try {
      setLoadingId(item.id);
      setError("");

      const res = await fetch("/api/admin/installments/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: item.userId,
          courseId: item.courseId,
          name: item.studentName,
          email: item.studentEmail,
          phone: item.studentPhone,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to request extension");
      }

      setData((prev) =>
        prev.map((d) =>
          d.id === item.id ? { ...d, hasPendingRequest: true } : d,
        ),
      );
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const openCashModal = (item: InstallmentData | null = null) => {
    setSelectedInstallmentForCash(item);
    setIsCashModalOpen(true);
  };

  const filteredData = data.filter((d) =>
    d.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const expiredInstallments = filteredData.filter((d) => d.isExpired);
  const activeInstallments = filteredData.filter((d) => !d.isExpired);

  const pendingRequests = filteredData.filter((d) => d.hasPendingRequest).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <StaggerGrid className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AdminStatCard index={0} title="Expired" value={expiredInstallments.length} caption="Past their installment due date." icon={<CalendarX />} tone="rose" />
        <AdminStatCard index={1} title="Active plans" value={activeInstallments.length} caption="Students paying on schedule." icon={<CalendarCheck />} tone="emerald" />
        <AdminStatCard index={2} title="Extensions pending" value={pendingRequests} caption="Waiting on super admin approval." icon={<Clock />} tone="amber" />
      </StaggerGrid>

      <div className={`${adminToolbarClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <label className="relative max-w-md flex-1">
          <span className="sr-only">Search by student name</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by student name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${adminInputClass} pl-10`}
          />
        </label>

        <button type="button" onClick={() => openCashModal()} className={adminButton.primary}>
          <Banknote className="h-4 w-4" aria-hidden="true" />
          Record cash payment
        </button>
      </div>

      <InstallmentTable
        title="Expired installments"
        description="Students whose installment due date has passed"
        icon={CalendarX}
        tone="rose"
        dateLabel="Expired on"
        dateClass="text-[#b91c1c]"
        rows={expiredInstallments}
        emptyText="No expired installments."
        renderActions={(item) => (
          <div className="flex items-center gap-2">
            {item.hasPendingRequest ? (
              <StatusBadge tone="warning" icon={Clock}>Pending approval</StatusBadge>
            ) : (
              <button
                type="button"
                onClick={() => handleRequestExtension(item)}
                disabled={loadingId === item.id}
                className={adminButtonSm.secondary}
              >
                {loadingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Request extension"}
              </button>
            )}
            <button type="button" onClick={() => openCashModal(item)} className={adminButtonSm.secondary}>
              <Banknote className="h-3.5 w-3.5 text-[#15803d]" aria-hidden="true" />
              Record cash
            </button>
          </div>
        )}
      />

      <InstallmentTable
        title="Active installments"
        description="Students currently on an active installment plan"
        icon={CalendarCheck}
        tone="emerald"
        dateLabel="Valid until"
        dateClass="text-[#334155]"
        rows={activeInstallments}
        emptyText="No active installments."
        renderActions={(item) => (
          <button type="button" onClick={() => openCashModal(item)} className={adminButtonSm.secondary}>
            <Banknote className="h-3.5 w-3.5 text-[#15803d]" aria-hidden="true" />
            Record cash
          </button>
        )}
      />

      <CashPaymentModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        data={data}
        initialStudent={selectedInstallmentForCash}
      />
    </div>
  );
}

function InstallmentTable({
  title,
  description,
  icon,
  tone,
  dateLabel,
  dateClass,
  rows,
  emptyText,
  renderActions,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: IconTone;
  dateLabel: string;
  dateClass: string;
  rows: InstallmentData[];
  emptyText: string;
  renderActions: (item: InstallmentData) => React.ReactNode;
}) {
  return (
    <section className={adminPanelClass}>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <AdminPanelHeader
          icon={icon}
          tone={tone}
          title={title}
          description={description}
          actions={<StatusBadge>{rows.length}</StatusBadge>}
        />
      </div>
      <div className={`${adminTable.wrap} mt-5`}>
        <table className={adminTable.table}>
          <thead className={adminTable.head}>
            <tr>
              <th className={adminTable.th}>Student</th>
              <th className={adminTable.th}>Course</th>
              <th className={adminTable.th}>Installment</th>
              <th className={adminTable.th}>{dateLabel}</th>
              <th className={adminTable.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-t border-[#f1f5f9]">
                <td colSpan={5} className="px-5 py-10 text-center text-[13px] text-[#64748b]">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.id} className={adminTable.row}>
                  <td className={adminTable.td}>
                    <p className="font-semibold text-[#0f172a]">{item.studentName}</p>
                    <p className="text-[12px] text-[#64748b]">{item.studentEmail}</p>
                  </td>
                  <td className={`${adminTable.td} font-medium text-[#0f172a]`}>{item.courseTitle}</td>
                  <td className={adminTable.td}>
                    {item.currentInstallment + 1} of {item.totalInstallments}
                    <p className="text-[12px] font-semibold tabular-nums text-[#0369a1]">
                      ₹{item.nextAmount.toLocaleString("en-IN")}
                    </p>
                  </td>
                  <td className={`${adminTable.td} font-medium ${dateClass}`}>
                    {item.validUntil ? format(new Date(item.validUntil), "PPp") : "Unknown"}
                  </td>
                  <td className={adminTable.td}>{renderActions(item)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
