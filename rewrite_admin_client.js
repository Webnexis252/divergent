const fs = require('fs');

const code = `"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, AlertCircle, CheckCircle2, Search, X, Banknote, Upload } from "lucide-react";
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
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState(""); // Upload functionality not fully implemented here
  const [installmentIndex, setInstallmentIndex] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialStudent) {
        setSelectedStudentId(initialStudent.id);
        setAmount(initialStudent.nextAmount.toString());
        setInstallmentIndex(initialStudent.currentInstallment.toString());
      } else {
        setSelectedStudentId("");
        setAmount("");
        setInstallmentIndex("");
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Record Cash Payment</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student & Course</label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              disabled={!!initialStudent}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#38c1ff] focus:outline-none focus:ring-1 focus:ring-[#38c1ff] disabled:bg-gray-50 disabled:text-gray-500"
              required
            >
              <option value="">Select a student...</option>
              {data.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.studentName} ({d.courseTitle})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Installment Number</label>
              <select
                value={installmentIndex}
                onChange={(e) => setInstallmentIndex(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#38c1ff] focus:outline-none focus:ring-1 focus:ring-[#38c1ff]"
                required
              >
                <option value="">Select...</option>
                {selectedStudent && Array.from({ length: selectedStudent.totalInstallments }).map((_, i) => (
                  <option key={i} value={i}>Installment {i + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#38c1ff] focus:outline-none focus:ring-1 focus:ring-[#38c1ff]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#38c1ff] focus:outline-none focus:ring-1 focus:ring-[#38c1ff]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. Receipt #123"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#38c1ff] focus:outline-none focus:ring-1 focus:ring-[#38c1ff]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(Optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#38c1ff] focus:outline-none focus:ring-1 focus:ring-[#38c1ff]"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Photo URL <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input
              type="text"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#38c1ff] focus:outline-none focus:ring-1 focus:ring-[#38c1ff]"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#38c1ff]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-[#38c1ff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0284c7] focus:outline-none focus:ring-2 focus:ring-[#38c1ff] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Banknote className="h-4 w-4 mr-2" />}
              Record Payment
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
  const [selectedInstallmentForCash, setSelectedInstallmentForCash] = useState<InstallmentData | null>(null);

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
        prev.map((d) => (d.id === item.id ? { ...d, hasPendingRequest: true } : d))
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
    d.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const expiredInstallments = filteredData.filter((d) => d.isExpired);
  const activeInstallments = filteredData.filter((d) => !d.isExpired);

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative max-w-md flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-gray-500 focus:border-[#38c1ff] focus:outline-none focus:ring-1 focus:ring-[#38c1ff] shadow-sm"
          />
        </div>

        <button
          onClick={() => openCashModal()}
          className="inline-flex items-center justify-center rounded-xl bg-[#38c1ff] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0284c7] focus:outline-none focus:ring-2 focus:ring-[#38c1ff] transition-colors"
        >
          <Banknote className="mr-2 h-4 w-4" />
          Record Cash Payment
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Expired Installments</h2>
          <p className="text-sm text-gray-500">Students whose installment valid date has passed</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Course</th>
                <th className="px-6 py-3">Installment</th>
                <th className="px-6 py-3">Expired On</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {expiredInstallments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No expired installments found.
                  </td>
                </tr>
              ) : (
                expiredInstallments.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{item.studentName}</p>
                      <p className="text-xs text-gray-500">{item.studentEmail}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.courseTitle}</td>
                    <td className="px-6 py-4">
                      {item.currentInstallment + 1} of {item.totalInstallments}
                      <p className="text-xs font-semibold text-[#38c1ff]">₹{item.nextAmount.toLocaleString("en-IN")}</p>
                    </td>
                    <td className="px-6 py-4 text-red-600 font-medium">
                      {item.validUntil ? format(new Date(item.validUntil), "PPp") : "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.hasPendingRequest ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Pending Approval
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRequestExtension(item)}
                            disabled={loadingId === item.id}
                            className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {loadingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Request Extension"
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => openCashModal(item)}
                          className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                        >
                          <Banknote className="h-4 w-4 mr-1.5 text-green-600" />
                          Record Cash
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Active Installments</h2>
          <p className="text-sm text-gray-500">Students currently on active installment plans</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Course</th>
                <th className="px-6 py-3">Installment</th>
                <th className="px-6 py-3">Valid Until</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {activeInstallments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No active installments found.
                  </td>
                </tr>
              ) : (
                activeInstallments.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{item.studentName}</p>
                      <p className="text-xs text-gray-500">{item.studentEmail}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.courseTitle}</td>
                    <td className="px-6 py-4">
                      {item.currentInstallment + 1} of {item.totalInstallments}
                      <p className="text-xs font-semibold text-[#38c1ff]">₹{item.nextAmount.toLocaleString("en-IN")}</p>
                    </td>
                    <td className="px-6 py-4 text-green-600 font-medium">
                      {item.validUntil ? format(new Date(item.validUntil), "PPp") : "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openCashModal(item)}
                        className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                      >
                        <Banknote className="h-4 w-4 mr-1.5 text-green-600" />
                        Record Cash
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CashPaymentModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        data={data}
        initialStudent={selectedInstallmentForCash}
      />
    </div>
  );
}
`;

fs.writeFileSync('/Users/vedansh/Downloads/lmsproto/src/app/admin/installments/AdminInstallmentsClient.tsx', code);
