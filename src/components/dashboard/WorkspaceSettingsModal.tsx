"use client";

import React, { useEffect, useState } from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";

interface WorkspaceSettingsModalProps {
  open: boolean;
  onClose: () => void;
  monthlyBudget: number;
  functionalUnits: number;
  isReadOnly: boolean;
  onSaved: () => void;
}

export function WorkspaceSettingsModal({
  open,
  onClose,
  monthlyBudget,
  functionalUnits,
  isReadOnly,
  onSaved,
}: WorkspaceSettingsModalProps) {
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudget));
  const [unitsInput, setUnitsInput] = useState(String(functionalUnits));
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    setBudgetInput(String(monthlyBudget));
    setUnitsInput(String(functionalUnits));
  }, [monthlyBudget, functionalUnits, open]);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setErrMsg(null);
    setSavedMsg(null);

    const parsedBudget = Number(budgetInput);
    const parsedUnits = Number(unitsInput);

    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setErrMsg("Monthly budget must be greater than 0.");
      return;
    }
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      setErrMsg("Functional units must be greater than 0.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/workspace/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyBudget: parsedBudget,
          functionalUnits: parsedUnits,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to save workspace config.");
      }
      setSavedMsg("Budget and SCI functional unit saved to database.");
      onSaved();
    } catch (err: any) {
      setErrMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2E2B1A]/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="gc-panel-swap w-full max-w-md rounded-[28px] bg-[#FFFDF4] p-6 shadow-warm-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF6E8] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5 text-[#155E4B]" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">
                Workspace Thresholds
              </h2>
              <p className="text-[12.5px] text-[#686450]">
                Persisted budget ceiling & Green Software SCI denominator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-[#FAF6E8] hover:bg-[#F5EED6] flex items-center justify-center text-[#2E2B1A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedMsg && (
          <div className="p-3 rounded-[16px] bg-[#E2F5EF] text-[#155E4B] text-[12.5px] font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}
        {errMsg && (
          <div className="p-3 rounded-[16px] bg-[#FEE2E2] text-[#991B1B] text-[12.5px] font-semibold">
            {errMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-[20px] bg-[#FAF6E8] p-4 space-y-3">
            <div>
              <label className="block text-[12px] font-bold text-[#2E2B1A] mb-1">
                Monthly Cloud Budget Target (USD)
              </label>
              <input
                type="number"
                step="1"
                disabled={isReadOnly}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full rounded-xl bg-[#FFFDF4] px-3.5 py-2.5 text-[13.5px] font-bold tabular-nums text-[#2E2B1A] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/30"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#2E2B1A] mb-1">
                SCI Functional Units (Requests / Jobs per Period)
              </label>
              <input
                type="number"
                step="1000"
                disabled={isReadOnly}
                value={unitsInput}
                onChange={(e) => setUnitsInput(e.target.value)}
                className="w-full rounded-xl bg-[#FFFDF4] px-3.5 py-2.5 text-[13.5px] font-bold tabular-nums text-[#2E2B1A] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/30"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="m3-btn m3-btn-compact m3-pastel-oat">
              Close
            </button>
            {!isReadOnly && (
              <button type="submit" disabled={busy} className="m3-btn m3-btn-compact m3-pastel-sun">
                {busy ? "Saving..." : "Save thresholds"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
