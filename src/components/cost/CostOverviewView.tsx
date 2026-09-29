"use client";

import React from "react";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  AlertTriangle,
  LineChart,
  HardDrive,
  Cpu,
  Network,
} from "lucide-react";

interface CostOverviewViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
  onOpenSync?: () => void;
}

export function CostOverviewView({
  data,
  onNavigateSubTab,
}: CostOverviewViewProps) {
  const totalCost = data?.costs?.totalCost;
  const dailyBurn = data?.costs?.dailyBurnRate;
  const savings = data?.recommendations?.totalSavings;
  const activeRecsCount = data?.recommendations?.activeCount || 0;
  const priorMonthCost = data?.costs?.priorMonthCost;

  // Calculate approximate service breakdown shares
  const byService = data?.costs?.byService || [];
  const computeTotal = byService
    .filter((s: any) => s.service.toLowerCase().includes("ec2") || s.service.toLowerCase().includes("compute"))
    .reduce((sum: number, s: any) => sum + s.total, 0);
  const storageTotal = byService
    .filter((s: any) => s.service.toLowerCase().includes("ebs") || s.service.toLowerCase().includes("s3") || s.service.toLowerCase().includes("storage"))
    .reduce((sum: number, s: any) => sum + s.total, 0);
  const networkTotal = byService
    .filter((s: any) => s.service.toLowerCase().includes("vpc") || s.service.toLowerCase().includes("nat") || s.service.toLowerCase().includes("eip") || s.service.toLowerCase().includes("transfer"))
    .reduce((sum: number, s: any) => sum + s.total, 0);
  const otherTotal = Math.max(0, (totalCost || 0) - (computeTotal + storageTotal + networkTotal));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">Cost & Usage Overview</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                AWS Cost Explorer Active
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Consolidated cloud billing, run-rate velocity, and committed spend optimization cockpit.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubTab("cost-explorer")}
              className="px-3.5 py-1.5 rounded-xl bg-[#FAF6E8] hover:bg-[#F4EED8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Explore Detailed Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Executive Metric Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Billed Month-to-Date Spend
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-black text-[#2E2B1A]">
                {totalCost !== null && totalCost !== undefined
                  ? `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "--"}
              </span>
              {priorMonthCost && (
                <span className="text-[11px] font-mono text-[#8D8975]">
                  vs ${priorMonthCost.toFixed(2)} prior mo
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Normalized via AWS Cost Explorer API
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Estimated Daily Run Rate
            </span>
            <span className="text-[26px] font-black text-[#2E2B1A]">
              {dailyBurn !== null && dailyBurn !== undefined
                ? `$${dailyBurn.toFixed(2)}/day`
                : "--"}
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1 font-mono">
              ~${dailyBurn ? (dailyBurn * 30).toFixed(2) : "0.00"} projected 30-day burn
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Actionable FinOps Savings
            </span>
            <span className="text-[26px] font-black text-[#1F8A70]">
              {savings !== null && savings !== undefined
                ? `$${savings.toLocaleString()}/mo`
                : "--"}
            </span>
            <span className="text-[11px] text-[#9A6B00] block mt-1 font-semibold">
              {activeRecsCount} Verified waste reduction actions
            </span>
          </div>
        </div>

        {/* Category Breakdown Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[12px] font-bold text-[#2E2B1A] mb-2">
            <span>Spend Distribution by Resource Class</span>
            <span className="font-mono text-[#8D8975] font-normal">
              Compute {(totalCost && totalCost > 0) ? Math.round((computeTotal / totalCost) * 100) : 0}% · Storage {(totalCost && totalCost > 0) ? Math.round((storageTotal / totalCost) * 100) : 0}% · Network {(totalCost && totalCost > 0) ? Math.round((networkTotal / totalCost) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] overflow-hidden flex">
            <div
              style={{ width: `${(totalCost && totalCost > 0) ? Math.max(5, (computeTotal / totalCost) * 100) : 40}%` }}
              className="bg-[#1F8A70] h-full"
              title={`Compute: $${computeTotal.toFixed(2)}`}
            />
            <div
              style={{ width: `${(totalCost && totalCost > 0) ? Math.max(5, (storageTotal / totalCost) * 100) : 35}%` }}
              className="bg-[#9A6B00] h-full"
              title={`Storage: $${storageTotal.toFixed(2)}`}
            />
            <div
              style={{ width: `${(totalCost && totalCost > 0) ? Math.max(5, (networkTotal / totalCost) * 100) : 25}%` }}
              className="bg-[#3B82F6] h-full"
              title={`Networking: $${networkTotal.toFixed(2)}`}
            />
          </div>
          <div className="flex items-center gap-4 mt-2 text-[11px] text-[#686450] flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1F8A70]" />
              <span>Compute (${computeTotal.toFixed(2)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9A6B00]" />
              <span>Storage (${storageTotal.toFixed(2)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
              <span>Networking & NAT (${networkTotal.toFixed(2)})</span>
            </div>
          </div>
        </div>

        {/* Savings Plan Simulator Banner */}
        <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD]">
                Savings Plan Simulator
              </span>
              <span className="text-[11px] font-mono text-[#8D8975]">
                Coverage: 100% On-Demand
              </span>
            </div>
            <h4 className="font-bold text-[13.5px] text-[#2E2B1A]">
              1-Year Compute Savings Plan Simulation
            </h4>
            <p className="text-[12px] text-[#686450] max-w-xl">
              Committing to steady-state EC2 compute utilization reduces standard on-demand rates by up to <strong>28% - 35%</strong> across all monitored regions.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[16px] font-black text-[#1F8A70] block">
                Up to 35% Off
              </span>
              <span className="text-[10.5px] text-[#8D8975]">
                Zero upfront option
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Section Quick Jump Cards Grid */}
      <div>
        <h3 className="text-[14px] font-bold text-[#2E2B1A] mb-3">Deep-Dive Cost Intelligence Sections</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Cost Explorer */}
          <div
            onClick={() => onNavigateSubTab("cost-explorer")}
            className="p-5 rounded-2xl bg-white border border-[#ECE5CC] hover:border-[#1F8A70] hover:shadow-warm-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] group-hover:bg-[#E2F5EF] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70] mb-3 transition-colors">
                <DollarSign className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A] group-hover:text-[#1F8A70] transition-colors">
                Cost Explorer
              </h4>
              <p className="text-[12px] text-[#686450] mt-1 leading-relaxed">
                Granular service spend ledger with search, filtering by AWS primitive, daily trends, and CSV export.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11.5px] font-bold text-[#1F8A70]">
              <span>Inspect Ledger</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Cost Allocation */}
          <div
            onClick={() => onNavigateSubTab("cost-allocation")}
            className="p-5 rounded-2xl bg-white border border-[#ECE5CC] hover:border-[#9A6B00] hover:shadow-warm-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] group-hover:bg-[#FFF3D6] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00] mb-3 transition-colors">
                <Tag className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A] group-hover:text-[#9A6B00] transition-colors">
                Cost Allocation & Tags
              </h4>
              <p className="text-[12px] text-[#686450] mt-1 leading-relaxed">
                Tag showback across environments (Prod/Staging/Dev), FinOps tag hygiene score, and remediation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11.5px] font-bold text-[#9A6B00]">
              <span>View Tag Hygiene</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Budgets */}
          <div
            onClick={() => onNavigateSubTab("cost-budgets")}
            className="p-5 rounded-2xl bg-white border border-[#ECE5CC] hover:border-[#1F8A70] hover:shadow-warm-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] group-hover:bg-[#E2F5EF] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70] mb-3 transition-colors">
                <Target className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A] group-hover:text-[#1F8A70] transition-colors">
                Budgets & Governance
              </h4>
              <p className="text-[12px] text-[#686450] mt-1 leading-relaxed">
                Monthly budget tracking vs actual pace, threshold alert indicators (50%, 80%, 100%), and limit controls.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11.5px] font-bold text-[#1F8A70]">
              <span>Manage Budgets</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Anomalies */}
          <div
            onClick={() => onNavigateSubTab("cost-anomalies")}
            className="p-5 rounded-2xl bg-white border border-[#ECE5CC] hover:border-[#C84B31] hover:shadow-warm-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] group-hover:bg-[#FDE8E8] border border-[#ECE5CC] flex items-center justify-center text-[#C84B31] mb-3 transition-colors">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A] group-hover:text-[#C84B31] transition-colors">
                Cost Anomalies
              </h4>
              <p className="text-[12px] text-[#686450] mt-1 leading-relaxed">
                Z-Score (&ge;2.5&sigma;) statistical outlier detection, spike root cause hints, and risk severity triage.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11.5px] font-bold text-[#C84B31]">
              <span>Review Anomalies</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 5: Forecast */}
          <div
            onClick={() => onNavigateSubTab("cost-forecast")}
            className="p-5 rounded-2xl bg-white border border-[#ECE5CC] hover:border-[#1F8A70] hover:shadow-warm-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] group-hover:bg-[#E2F5EF] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70] mb-3 transition-colors">
                <LineChart className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A] group-hover:text-[#1F8A70] transition-colors">
                Predictive Forecast Studio
              </h4>
              <p className="text-[12px] text-[#686450] mt-1 leading-relaxed">
                Holt&apos;s double exponential smoothing, 30-day forward trajectory with 95% confidence bounds and velocity.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11.5px] font-bold text-[#1F8A70]">
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
