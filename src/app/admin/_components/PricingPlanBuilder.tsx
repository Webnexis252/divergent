"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { cx } from "@/lib/cx";

export type EmiInstalment = { label: string; amount: string; dueDays: string };
export type PricingPlan = {
  id: string;
  name: string;
  installments: EmiInstalment[];
};

export default function PricingPlanBuilder({
  plans,
  onChange,
}: {
  plans: PricingPlan[];
  onChange: (plans: PricingPlan[]) => void;
}) {
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(plans[0]?.id || null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanName, setEditPlanName] = useState("");

  const [editingInstIdx, setEditingInstIdx] = useState<{ planId: string; idx: number } | null>(null);
  const [editInst, setEditInst] = useState<EmiInstalment>({ label: "", amount: "", dueDays: "" });

  const [showAddForm, setShowAddForm] = useState<string | null>(null); // planId
  const [newInst, setNewInst] = useState<EmiInstalment>({ label: "", amount: "", dueDays: "" });

  function handleAddPlan() {
    const newPlan: PricingPlan = {
      id: crypto.randomUUID(),
      name: `Installment Plan ${plans.length + 1}`,
      installments: [],
    };
    onChange([...plans, newPlan]);
    setExpandedPlanId(newPlan.id);
  }

  function updatePlan(planId: string, updater: (p: PricingPlan) => PricingPlan) {
    onChange(plans.map((p) => (p.id === planId ? updater(p) : p)));
  }

  function deletePlan(planId: string) {
    onChange(plans.filter((p) => p.id !== planId));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500">Custom Instalment Plans</p>
          <p className="mt-0.5 text-[12px] text-slate-400">Define multiple payment plans (e.g. Pay in 2, Pay in 4)</p>
        </div>
        <button
          type="button"
          onClick={handleAddPlan}
          className="flex items-center gap-1.5 rounded-[10px] border border-[#dde8f5] bg-[#f6faff] px-3 py-1.5 text-[13px] font-semibold text-[#0284c7] transition hover:bg-[#e0f2fe]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Plan
        </button>
      </div>

      <div className="space-y-3">
        {plans.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-slate-300 p-6 text-center text-[13px] text-slate-500">
            No custom installment plans defined. Students will only see the One-Time Payment option.
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="overflow-hidden rounded-[16px] border border-[#e2ebf5] bg-white">
              {/* Plan Header */}
              <div className="flex items-center justify-between bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-3 border-b border-[#e2ebf5]">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    type="button"
                    onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                    className="grid h-6 w-6 place-items-center rounded bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  >
                    {expandedPlanId === plan.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {editingPlanId === plan.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        value={editPlanName}
                        onChange={(e) => setEditPlanName(e.target.value)}
                        className="rounded-[6px] border border-blue-200 px-2 py-1 text-[14px] font-semibold outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updatePlan(plan.id, (p) => ({ ...p, name: editPlanName }));
                          setEditingPlanId(null);
                        }}
                        className="rounded bg-blue-500 px-2 py-1 text-[12px] font-medium text-white hover:bg-blue-600"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <span className="text-[14px] font-semibold text-slate-800">{plan.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-slate-500 mr-2">
                    Total: ₹{plan.installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString("en-IN")}
                  </span>
                  {editingPlanId !== plan.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditPlanName(plan.name);
                        setEditingPlanId(plan.id);
                        setExpandedPlanId(plan.id);
                      }}
                      className="text-slate-400 hover:text-blue-500 transition"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deletePlan(plan.id)}
                    className="text-slate-400 hover:text-red-500 transition ml-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Plan Body */}
              {expandedPlanId === plan.id && (
                <div>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <th className="px-4 py-2 text-left font-semibold">Instalment</th>
                        <th className="px-4 py-2 text-left font-semibold">Amount (₹)</th>
                        <th className="px-4 py-2 text-left font-semibold">Due (days)</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.installments.map((inst, idx) => {
                        const isEditing = editingInstIdx?.planId === plan.id && editingInstIdx.idx === idx;
                        return (
                          <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                            {isEditing ? (
                              <>
                                <td className="px-4 py-2">
                                  <input
                                    value={editInst.label}
                                    onChange={(e) => setEditInst((p) => ({ ...p, label: e.target.value }))}
                                    className="w-full rounded border border-blue-200 px-2 py-1 text-[13px] outline-none focus:border-blue-500"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={editInst.amount}
                                    onChange={(e) => setEditInst((p) => ({ ...p, amount: e.target.value }))}
                                    className="w-24 rounded border border-blue-200 px-2 py-1 text-[13px] outline-none focus:border-blue-500"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={editInst.dueDays}
                                    onChange={(e) => setEditInst((p) => ({ ...p, dueDays: e.target.value }))}
                                    className="w-20 rounded border border-blue-200 px-2 py-1 text-[13px] outline-none focus:border-blue-500"
                                  />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updatePlan(plan.id, (p) => {
                                        const newInsts = [...p.installments];
                                        newInsts[idx] = editInst;
                                        return { ...p, installments: newInsts };
                                      });
                                      setEditingInstIdx(null);
                                    }}
                                    className="text-blue-600 hover:underline mr-3 text-[12px] font-semibold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingInstIdx(null)}
                                    className="text-slate-500 hover:underline text-[12px]"
                                  >
                                    Cancel
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-2 text-slate-800">{inst.label || `${idx + 1} instalment`}</td>
                                <td className="px-4 py-2 font-semibold text-slate-800">
                                  ₹{Number(inst.amount).toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-2 text-slate-500">{inst.dueDays} days</td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditInst({ ...inst });
                                      setEditingInstIdx({ planId: plan.id, idx });
                                    }}
                                    className="text-slate-400 hover:text-blue-500 mr-3 transition"
                                  >
                                    <Pencil className="h-3.5 w-3.5 inline" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updatePlan(plan.id, (p) => ({
                                        ...p,
                                        installments: p.installments.filter((_, i) => i !== idx),
                                      }))
                                    }
                                    className="text-slate-400 hover:text-red-500 transition"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 inline" />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      
                      {/* Add new instalment row */}
                      {showAddForm === plan.id ? (
                        <tr className="bg-blue-50/50">
                          <td className="px-4 py-2">
                            <input
                              autoFocus
                              value={newInst.label}
                              onChange={(e) => setNewInst((p) => ({ ...p, label: e.target.value }))}
                              className="w-full rounded border border-blue-200 px-2 py-1 text-[13px] outline-none focus:border-blue-500"
                              placeholder="e.g. 1st instalment"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={newInst.amount}
                              onChange={(e) => setNewInst((p) => ({ ...p, amount: e.target.value }))}
                              className="w-24 rounded border border-blue-200 px-2 py-1 text-[13px] outline-none focus:border-blue-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={newInst.dueDays}
                              onChange={(e) => setNewInst((p) => ({ ...p, dueDays: e.target.value }))}
                              className="w-20 rounded border border-blue-200 px-2 py-1 text-[13px] outline-none focus:border-blue-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                updatePlan(plan.id, (p) => ({
                                  ...p,
                                  installments: [
                                    ...p.installments,
                                    {
                                      label: newInst.label || `${p.installments.length + 1} instalment`,
                                      amount: newInst.amount || "0",
                                      dueDays: newInst.dueDays || "0",
                                    },
                                  ],
                                }));
                                setShowAddForm(null);
                                setNewInst({ label: "", amount: "", dueDays: "" });
                              }}
                              className="text-blue-600 hover:underline mr-3 text-[12px] font-semibold"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddForm(null)}
                              className="text-slate-500 hover:underline text-[12px]"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNewInst({ label: "", amount: "", dueDays: "" });
                                setShowAddForm(plan.id);
                              }}
                              className="text-[12px] font-medium text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add Instalment to {plan.name}
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
