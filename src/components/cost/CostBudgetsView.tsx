"use client";

import React, { useState } from "react";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Sliders,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Info,
  Calendar,
} from "lucide-react";

interface CostBudgetsViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
}

export function CostBudgetsView({ data, onNavigateSubTab }: CostBudgetsViewProps) {
  const defaultTarget = data?.budget?.target || 50;
  const [budgetLimit, setBudgetLimit] = useState<number>(defaultTarget);
  const [editingTarget, setEditingTarget] = useState(false);
  const [inputVal, setInputVal] = useState(defaultTarget.toString());
  const [saveToast, setSaveToast] = useState(false);

  const spent = data?.budget?.spent ?? (data?.costs?.totalCost || 0);
  const pacePercentage = budgetLimit > 0 ? Math.min(100, Math.round((spent / budgetLimit) * 100)) : 0;
  const projectedMonthEnd = data?.forecast?.monthEndProjectedCost ?? data?.budget?.projectedMonthEnd ?? (spent * 1.05);
  const isOverBudget = spent > budgetLimit;
  const isNearBudget = spent > budgetLimit * 0.8;

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(inputVal);
    if (!isNaN(val) && val > 0) {
      setBudgetLimit(val);
      setEditingTarget(false);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">AWS Budgets &amp; Governance</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isOverBudget
                  ? "bg-[#FDE8E8] text-[#C84B31] border-[#F8B4B4]"
                  : isNearBudget
                  ? "bg-[#FFF3D6] text-[#9A6B00] border-[#ECE5CC]"
                  : "bg-[#E2F5EF] text-[#1F8A70] border-[#BDEBDD]"
              }`}>
                {isOverBudget ? "Budget Exceeded" : isNearBudget ? "80% Warning Pace" : "Within Safe Pace"}
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Active monthly budget limits, threshold alerts, and month-end overspend protection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingTarget(!editingTarget);
                setInputVal(budgetLimit.toString());
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#1F8A70]" />
              <span>{editingTarget ? "Cancel Edit" : "Configure Limit"}</span>
            </button>
          </div>
        </div>

        {/* Budget Editor Panel if open */}
        {editingTarget && (
          <form onSubmit={handleSaveBudget} className="p-4 rounded-2xl bg-[#FAF6E8]/60 border border-[#ECE5CC] flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-[12.5px] font-bold text-[#2E2B1A]">Target Monthly Limit:</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D8975] font-mono text-[12px]">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="pl-6 pr-3 py-1.5 rounded-xl bg-white border border-[#ECE5CC] text-[12.5px] font-mono font-bold text-[#2E2B1A] w-32 focus:outline-none focus:border-[#1F8A70]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#1F8A70] hover:bg-[#186D58] text-white text-[12px] font-bold shadow-2xs transition-all cursor-pointer"
              >
                Apply Limit
              </button>
            </div>
          </form>
        )}

        {saveToast && (
          <div className="p-3 rounded-xl bg-[#E2F5EF] border border-[#BDEBDD] text-[12px] font-bold text-[#1F8A70] flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Monthly budget target updated to ${budgetLimit.toFixed(2)}. Alert thresholds recalculated.</span>
          </div>
        )}

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Current Billed Spend
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-black text-[#2E2B1A]">
                ${spent.toFixed(2)}
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">
                / ${budgetLimit.toFixed(2)}
              </span>
            </div>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold">
              {pacePercentage}% of monthly limit consumed
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Projected Month-End Spend
            </span>
            <span className={`text-[26px] font-black ${projectedMonthEnd > budgetLimit ? "text-[#C84B31]" : "text-[#2E2B1A]"}`}>
              ${projectedMonthEnd.toFixed(2)}
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1 font-mono">
              {projectedMonthEnd > budgetLimit
                ? `+$${(projectedMonthEnd - budgetLimit).toFixed(2)} projected overrun`
                : `-$${(budgetLimit - projectedMonthEnd).toFixed(2)} projected cushion`}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Burn Rate Headroom
            </span>
            <span className="text-[26px] font-black text-[#1F8A70]">
              ${Math.max(0, budgetLimit - spent).toFixed(2)}
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1 font-mono">
              Remaining budget for active cycle
            </span>
          </div>
        </div>

        {/* Visual Budget Progress Bar with Checkpoints */}
        <div className="p-5 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC] space-y-3">
          <div className="flex items-center justify-between text-[12px] font-bold">
            <span className="text-[#2E2B1A]">Budget Burn Pacing</span>
            <span className="font-mono text-[#8D8975]">{pacePercentage}% Paced</span>
          </div>

          {/* Progress track */}
          <div className="relative w-full h-3 rounded-full bg-[#ECE5CC] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOverBudget
                  ? "bg-[#C84B31]"
                  : isNearBudget
                  ? "bg-[#9A6B00]"
                  : "bg-[#1F8A70]"
              }`}
              style={{ width: `${Math.max(2, pacePercentage)}%` }}
            />
          </div>

          {/* Checkpoint Indicators */}
          <div className="flex items-center justify-between text-[10.5px] font-mono text-[#8D8975] pt-1">
            <div className="flex flex-col items-start">
              <span>0% Start</span>
              <span className="text-[10px] text-[#686450]">$0.00</span>
            </div>
            <div className="flex flex-col items-center">
              <span>50% Nominal</span>
              <span className="text-[10px] text-[#686450]">${(budgetLimit * 0.5).toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[#9A6B00] font-bold">80% Alert</span>
              <span className="text-[10px] text-[#9A6B00]">${(budgetLimit * 0.8).toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[#C84B31] font-bold">100% Limit</span>
              <span className="text-[10px] text-[#C84B31]">${budgetLimit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Active Alert Policy Rules */}
        <div className="pt-3 border-t border-[#ECE5CC] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[14.5px] text-[#2E2B1A]">Active Budget Threshold Rules</h3>
              <p className="text-[12px] text-[#686450]">
                Configured automated monitors that trigger notifications when spend reaches target thresholds.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
              3 Monitors Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Rule 1 */}
            <div className="p-4 rounded-xl bg-white border border-[#ECE5CC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase">Rule 01</span>
                <span className={`w-2 h-2 rounded-full ${spent >= budgetLimit * 0.8 ? "bg-[#9A6B00]" : "bg-[#1F8A70]"}`} />
              </div>
              <h4 className="font-bold text-[13px] text-[#2E2B1A]">80% Actual Spend Threshold</h4>
              <p className="text-[11.5px] text-[#686450] leading-snug">
                Triggers when actual billed month-to-date spend reaches <strong>${(budgetLimit * 0.8).toFixed(2)}</strong>.
              </p>
              <div className="pt-2 border-t border-[#ECE5CC]/60 text-[10.5px] font-mono text-[#8D8975]">
                Status: {spent >= budgetLimit * 0.8 ? "Triggered" : "Active (Monitoring)"}
              </div>
            </div>

            {/* Rule 2 */}
            <div className="p-4 rounded-xl bg-white border border-[#ECE5CC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase">Rule 02</span>
                <span className={`w-2 h-2 rounded-full ${projectedMonthEnd > budgetLimit ? "bg-[#C84B31]" : "bg-[#1F8A70]"}`} />
              </div>
              <h4 className="font-bold text-[13px] text-[#2E2B1A]">100% Forecast Overrun Alert</h4>
              <p className="text-[11.5px] text-[#686450] leading-snug">
                Triggers when statistical linear trend projects month-end spend above <strong>${budgetLimit.toFixed(2)}</strong>.
              </p>
              <div className="pt-2 border-t border-[#ECE5CC]/60 text-[10.5px] font-mono text-[#8D8975]">
                Status: {projectedMonthEnd > budgetLimit ? "Warning (Forecasted Exceeded)" : "Nominal (Within Budget)"}
              </div>
            </div>

            {/* Rule 3 */}
            <div className="p-4 rounded-xl bg-white border border-[#ECE5CC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase">Rule 03</span>
                <span className="w-2 h-2 rounded-full bg-[#1F8A70]" />
              </div>
              <h4 className="font-bold text-[13px] text-[#2E2B1A]">Multi-Region Burn Guard</h4>
              <p className="text-[11.5px] text-[#686450] leading-snug">
                Monitors running compute across all 17 regions to prevent unintended cross-region credit burn.
              </p>
              <div className="pt-2 border-t border-[#ECE5CC]/60 text-[10.5px] font-mono text-[#8D8975]">
                Status: Active (Continuous Watch)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
