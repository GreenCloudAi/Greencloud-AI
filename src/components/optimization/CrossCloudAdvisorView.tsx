"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRightLeft,
  SlidersHorizontal,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  Leaf,
  DollarSign,
  Server,
  ShieldCheck,
} from "lucide-react";
import type {
  CrossCloudResponse,
  VmComparison,
  PricedOption,
} from "@/services/crossCloudAdvisor";

interface CrossCloudAdvisorViewProps {
  accountId: string;
}

const DEFAULT_ASSUMPTIONS = {
  regionMode: "paired",
  targetPeak: 70,
  allowArm: false,
  laborHours: 8,
  laborRate: 75,
  minUsd: 10,
  minPct: 10,
  maxPayback: 6,
};

export function CrossCloudAdvisorView({ accountId }: CrossCloudAdvisorViewProps) {
  const [report, setReport] = useState<CrossCloudResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAssumptions, setShowAssumptions] = useState(false);
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [isCustomAssumptions, setIsCustomAssumptions] = useState(false);

  const [providerFilter, setProviderFilter] = useState<"all" | "aws" | "azure">("all");
  const [verdictFilter, setVerdictFilter] = useState<"all" | "SHIFT" | "CONSIDER" | "STAY">("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"shift_savings" | "payback" | "current_cost">("shift_savings");

  const [selectedVm, setSelectedVm] = useState<VmComparison | null>(null);
  const [copiedTf, setCopiedTf] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        accountId: accountId || "all",
        regionMode: assumptions.regionMode,
        targetPeak: String(assumptions.targetPeak),
        allowArm: String(assumptions.allowArm),
        laborHours: String(assumptions.laborHours),
        laborRate: String(assumptions.laborRate),
        minUsd: String(assumptions.minUsd),
        minPct: String(assumptions.minPct),
        maxPayback: String(assumptions.maxPayback),
      });
      const res = await fetch(`/api/cross-cloud?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json?.error?.message || "Failed to load Cross-Cloud Advisor report");
      }
      setReport(json);
    } catch (e: any) {
      setError(e.message || "Failed to load Cross-Cloud Advisor");
    } finally {
      setLoading(false);
    }
  }, [accountId, assumptions]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleRefreshPrices = async () => {
    setRefreshingPrices(true);
    try {
      await fetch("/api/cross-cloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh_prices" }),
      });
      await fetchReport();
      setActionToast("Live cloud pricing refreshed.");
      setTimeout(() => setActionToast(null), 3500);
    } catch {
      setActionToast("Failed to refresh prices.");
      setTimeout(() => setActionToast(null), 3500);
    } finally {
      setRefreshingPrices(false);
    }
  };

  const handleApproveMigration = async (vm: VmComparison) => {
    try {
      const res = await fetch(`/api/recommendations/rec_xc_${vm.resourceId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ticket",
          comment: `Approved Cross-Cloud migration for ${vm.name}`,
        }),
      });
      if (res.ok) {
        setActionToast(`Migration plan approved & logged for ${vm.name}.`);
      } else {
        setActionToast("Sync telemetry first to register recommendation in queue.");
      }
    } catch {
      setActionToast("Could not approve migration recommendation.");
    }
    setTimeout(() => setActionToast(null), 4000);
  };

  const updateAssumption = <K extends keyof typeof DEFAULT_ASSUMPTIONS>(
    key: K,
    val: (typeof DEFAULT_ASSUMPTIONS)[K]
  ) => {
    setAssumptions((prev) => ({ ...prev, [key]: val }));
    setIsCustomAssumptions(true);
  };

  const resetAssumptions = () => {
    setAssumptions(DEFAULT_ASSUMPTIONS);
    setIsCustomAssumptions(false);
  };

  const verdictBadge = (verdict: VmComparison["verdict"]) => {
    if (verdict === "SHIFT") {
      return "bg-[#E2F5EF] text-[#1F8A70] border-[#BDEBDD]";
    }
    if (verdict === "CONSIDER") {
      return "bg-[#FFF3D6] text-[#9A6B00] border-[#F3E5BC]";
    }
    return "bg-[#FAF6E8] text-[#686450] border-[#ECE5CC]";
  };

  const machines = report?.machines || [];
  const uniqueRegions = Array.from(new Set(machines.map((m) => m.region)));

  const filtered = machines
    .filter((m) => (providerFilter === "all" ? true : m.provider === providerFilter))
    .filter((m) => (verdictFilter === "all" ? true : m.verdict === verdictFilter))
    .filter((m) => (regionFilter === "all" ? true : m.region === regionFilter))
    .sort((a, b) => {
      if (sortBy === "payback") {
        return (a.migration.paybackMonths ?? 9999) - (b.migration.paybackMonths ?? 9999);
      }
      if (sortBy === "current_cost") {
        return b.optionA.monthlyUsd - a.optionA.monthlyUsd;
      }
      return b.shiftSavingsMonthly - a.shiftSavingsMonthly;
    });

  const avgCarbonDelta =
    machines.length > 0
      ? parseFloat(
          (machines.reduce((s, m) => s + m.carbon.deltaPct, 0) / machines.length).toFixed(1)
        )
      : 0;

  if (loading && !report) {
    return (
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-10 text-center text-[#686450]">
        <div className="w-6 h-6 border-2 border-[#1F8A70] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[13.5px] font-medium">Analyzing cross-cloud placement across AWS & Azure…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl border border-[#FFCCCC] p-6 text-[#D32F2F] flex items-center justify-between">
        <span className="text-[13.5px] font-medium">{error}</span>
        <button
          type="button"
          onClick={fetchReport}
          className="px-4 py-1.5 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] text-[12px] font-bold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const summary = report?.summary;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {actionToast && (
        <div className="p-3 rounded-2xl bg-[#E2F5EF] border border-[#BDEBDD] text-[#1F8A70] text-[12.5px] font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* 1. VERDICT BANNER */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E2F5EF] border border-[#BDEBDD] text-[11px] font-bold text-[#1F8A70]">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Cross-Cloud Advisor
              </span>
              {isCustomAssumptions && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFF76A] border border-[#DFD6B5] text-[11px] font-bold text-[#2E2B1A]">
                  Using custom assumptions
                </span>
              )}
              <span className="text-[11px] text-[#8D8975] font-mono">
                Prices as of {report?.priceInfo.aws.asOf.slice(0, 10)}
              </span>
            </div>

            <h2 className="text-[20px] font-black text-[#2E2B1A] tracking-tight">
              {summary?.headlineText || "No running machines to compare."}
            </h2>

            {summary && summary.runningVmCount > 0 && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-[#686450]">
                <span>
                  Net shift savings:{" "}
                  <strong className="text-[#1F8A70]">
                    ${summary.shiftMonthlyUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo
                  </strong>{" "}
                  (${(summary.shiftMonthlyUsd * 12).toLocaleString("en-US", { minimumFractionDigits: 2 })}/yr)
                </span>
                <span>
                  One-time cost:{" "}
                  <strong className="text-[#2E2B1A]">
                    ${summary.shiftOneTimeUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </strong>
                </span>
                <span>
                  Payback:{" "}
                  <strong className="text-[#2E2B1A]">
                    {summary.shiftPaybackMonths !== null ? `${summary.shiftPaybackMonths} mo` : "—"}
                  </strong>
                </span>
                <span>
                  + Rightsize in place:{" "}
                  <strong className="text-[#2E2B1A]">
                    ${summary.rightsizeInPlaceMonthlyUsd.toFixed(2)}/mo
                  </strong>{" "}
                  (no migration needed)
                </span>
              </div>
            )}

            {summary?.mixedEstateNote && (
              <p className="text-[11.5px] text-[#8D8975] pt-1">{summary.mixedEstateNote}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefreshPrices}
              disabled={refreshingPrices}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8] hover:bg-[#FFF76A]/40 text-[12px] font-bold text-[#2E2B1A] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingPrices ? "animate-spin" : ""}`} />
              <span>{refreshingPrices ? "Refreshing…" : "Refresh Prices"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#ECE5CC] bg-white hover:bg-[#FAF6E8] text-[12px] font-bold text-[#2E2B1A] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Assumptions</span>
            </button>
          </div>
        </div>

        {/* ASSUMPTIONS PANEL */}
        {showAssumptions && (
          <div className="pt-4 border-t border-[#ECE5CC] grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
            <div>
              <label className="block font-bold text-[#2E2B1A] mb-1">Region Mode</label>
              <select
                value={assumptions.regionMode}
                onChange={(e) => updateAssumption("regionMode", e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#ECE5CC] bg-[#FAF6E8]/50 text-[#2E2B1A]"
              >
                <option value="paired">Paired (Same Latency)</option>
                <option value="same_country">Same Country</option>
                <option value="same_continent">Same Continent</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#2E2B1A] mb-1">Target Peak CPU (%)</label>
              <input
                type="number"
                min={20}
                max={95}
                value={assumptions.targetPeak}
                onChange={(e) => updateAssumption("targetPeak", Number(e.target.value) || 70)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#ECE5CC] bg-white text-[#2E2B1A]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2E2B1A] mb-1">Labor Hours / VM</label>
              <input
                type="number"
                min={0}
                max={100}
                value={assumptions.laborHours}
                onChange={(e) => updateAssumption("laborHours", Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#ECE5CC] bg-white text-[#2E2B1A]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2E2B1A] mb-1">Labor Rate ($/hr)</label>
              <input
                type="number"
                min={0}
                max={500}
                value={assumptions.laborRate}
                onChange={(e) => updateAssumption("laborRate", Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#ECE5CC] bg-white text-[#2E2B1A]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2E2B1A] mb-1">Min Shift ($/mo)</label>
              <input
                type="number"
                min={0}
                value={assumptions.minUsd}
                onChange={(e) => updateAssumption("minUsd", Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#ECE5CC] bg-white text-[#2E2B1A]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2E2B1A] mb-1">Min Shift (%)</label>
              <input
                type="number"
                min={0}
                max={90}
                value={assumptions.minPct}
                onChange={(e) => updateAssumption("minPct", Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#ECE5CC] bg-white text-[#2E2B1A]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2E2B1A] mb-1">Max Payback (mo)</label>
              <input
                type="number"
                min={1}
                max={36}
                value={assumptions.maxPayback}
                onChange={(e) => updateAssumption("maxPayback", Number(e.target.value) || 6)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#ECE5CC] bg-white text-[#2E2B1A]"
              />
            </div>
            <div className="flex flex-col justify-between">
              <label className="flex items-center gap-2 font-bold text-[#2E2B1A] cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={assumptions.allowArm}
                  onChange={(e) => updateAssumption("allowArm", e.target.checked)}
                />
                <span>Allow Arm64 (Graviton/Ampere)</span>
              </label>
              {isCustomAssumptions && (
                <button
                  type="button"
                  onClick={resetAssumptions}
                  className="text-left text-[11px] font-bold text-[#1F8A70] hover:underline cursor-pointer"
                >
                  Reset to defaults
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. KPI ROW */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4">
            <span className="text-[11px] font-bold text-[#8D8975] uppercase">Running VMs</span>
            <div className="text-[22px] font-black text-[#2E2B1A] mt-0.5">{summary.runningVmCount}</div>
            {summary.stoppedVmCount > 0 && (
              <span className="text-[11px] text-[#8D8975]">{summary.stoppedVmCount} stopped not analysed</span>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4">
            <span className="text-[11px] font-bold text-[#1F8A70] uppercase">SHIFT</span>
            <div className="text-[22px] font-black text-[#1F8A70] mt-0.5">{summary.verdictCounts.SHIFT}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4">
            <span className="text-[11px] font-bold text-[#9A6B00] uppercase">CONSIDER</span>
            <div className="text-[22px] font-black text-[#9A6B00] mt-0.5">{summary.verdictCounts.CONSIDER}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4">
            <span className="text-[11px] font-bold text-[#686450] uppercase">STAY</span>
            <div className="text-[22px] font-black text-[#2E2B1A] mt-0.5">{summary.verdictCounts.STAY}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4">
            <span className="text-[11px] font-bold text-[#8D8975] uppercase">Avg CO₂e Δ</span>
            <div className={`text-[22px] font-black mt-0.5 ${avgCarbonDelta <= 0 ? "text-[#1F8A70]" : "text-[#9A6B00]"}`}>
              {avgCarbonDelta > 0 ? `+${avgCarbonDelta}%` : `${avgCarbonDelta}%`}
            </div>
          </div>
        </div>
      )}

      {/* 3. FILTERS & TABLE */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-5 shadow-warm-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/50 font-semibold text-[#2E2B1A]"
            >
              <option value="all">All Providers</option>
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
            </select>
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/50 font-semibold text-[#2E2B1A]"
            >
              <option value="all">All Verdicts</option>
              <option value="SHIFT">SHIFT</option>
              <option value="CONSIDER">CONSIDER</option>
              <option value="STAY">STAY</option>
            </select>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/50 font-semibold text-[#2E2B1A]"
            >
              <option value="all">All Regions</option>
              {uniqueRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-[#8D8975] font-semibold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/50 font-semibold text-[#2E2B1A]"
            >
              <option value="shift_savings">Shift Savings</option>
              <option value="payback">Fastest Payback</option>
              <option value="current_cost">Current Cost</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-[#8D8975] text-[13.5px]">
            No running machines to compare. Connect an AWS or Azure account and sync telemetry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#ECE5CC] text-[#8D8975] text-[11px] uppercase">
                  <th className="py-2.5 pr-3">Machine</th>
                  <th className="py-2.5 px-3">Now (Option A)</th>
                  <th className="py-2.5 px-3">Best Same Cloud (B)</th>
                  <th className="py-2.5 px-3">Best Other Cloud (D)</th>
                  <th className="py-2.5 px-3">Shift Savings (B − D)</th>
                  <th className="py-2.5 pl-3 text-right">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE5CC]/60">
                {filtered.map((m) => (
                  <tr
                    key={m.resourceId}
                    onClick={() => setSelectedVm(m)}
                    className="hover:bg-[#FAF6E8]/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-3">
                      <div className="font-bold text-[#2E2B1A]">{m.name}</div>
                      <div className="text-[11px] text-[#8D8975]">
                        <span className="font-bold uppercase">{m.provider}</span> · {m.regionName} · Peak {m.telemetry.peakCpu}%
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono font-semibold text-[#2E2B1A]">{m.optionA.displayName}</div>
                      <div className="text-[11px] text-[#686450]">
                        {m.optionA.vCpu} vCPU / {m.optionA.memoryGb} GB · ${m.optionA.monthlyUsd.toFixed(2)}/mo
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono font-semibold text-[#2E2B1A]">{m.optionB.displayName}</div>
                      <div className="text-[11px] text-[#686450]">
                        {m.optionB.vCpu} vCPU / {m.optionB.memoryGb} GB · ${m.optionB.monthlyUsd.toFixed(2)}/mo
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {m.optionD ? (
                        <>
                          <div className="font-mono font-semibold text-[#2E2B1A]">
                            <span className="uppercase text-[10px] font-bold mr-1 text-[#1F8A70]">
                              {m.optionD.provider}
                            </span>
                            {m.optionD.displayName}
                          </div>
                          <div className="text-[11px] text-[#686450]">
                            {m.optionD.regionName} · ${m.optionD.monthlyUsd.toFixed(2)}/mo
                          </div>
                        </>
                      ) : (
                        <span className="text-[#8D8975]">Unavailable</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className={`font-bold ${m.shiftSavingsMonthly > 0 ? "text-[#1F8A70]" : "text-[#686450]"}`}>
                        ${m.shiftSavingsMonthly.toFixed(2)}/mo ({m.shiftSavingsPct}%)
                      </div>
                      <div className="text-[11px] text-[#8D8975]">
                        ${m.shiftSavingsAnnual.toFixed(2)}/yr · pb {m.migration.paybackMonths ?? "—"} mo
                      </div>
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full border text-[11px] font-bold ${verdictBadge(m.verdict)}`}>
                        {m.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. DETAIL DRAWER */}
      {selectedVm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
          onClick={() => setSelectedVm(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#FFFDF4] h-full overflow-y-auto p-6 shadow-2xl border-l border-[#ECE5CC] space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-[#ECE5CC]">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${verdictBadge(selectedVm.verdict)}`}>
                    {selectedVm.verdict}
                  </span>
                  <span className="text-[11px] font-bold uppercase text-[#8D8975]">
                    {selectedVm.provider} · {selectedVm.regionName}
                  </span>
                </div>
                <h3 className="text-[20px] font-black text-[#2E2B1A] mt-1">{selectedVm.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVm(null)}
                className="p-2 rounded-xl hover:bg-[#FAF6E8] text-[#686450] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4-Option Cost Bars */}
            <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4 space-y-3">
              <h4 className="text-[13px] font-bold text-[#2E2B1A]">Four-Option Monthly Run Cost</h4>
              {(
                [
                  ["A · Stay as-is", selectedVm.optionA],
                  ["B · Rightsize same cloud", selectedVm.optionB],
                  ["C · Shift like-for-like", selectedVm.optionC],
                  ["D · Shift + rightsize", selectedVm.optionD],
                ] as Array<[string, PricedOption | null]>
              ).map(([label, opt]) =>
                opt ? (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-[12px]">
                      <span className="font-semibold text-[#2E2B1A]">
                        {label} — <span className="font-mono">{opt.displayName}</span> ({opt.regionName})
                      </span>
                      <span className="font-bold text-[#2E2B1A]">${opt.monthlyUsd.toFixed(2)}/mo</span>
                    </div>
                    <div className="text-[11px] text-[#8D8975] flex gap-3">
                      <span>Compute: ${opt.computeMonthlyUsd.toFixed(2)}</span>
                      <span>Storage: ${opt.storageMonthlyUsd.toFixed(2)}</span>
                      <span>IP: ${opt.ipMonthlyUsd.toFixed(2)}</span>
                      <span>
                        {opt.vCpu} vCPU / {opt.memoryGb} GB ({opt.arch}) · Proj. Peak {opt.projectedPeakCpuPct}%
                      </span>
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {/* Savings & Migration Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4 space-y-1.5 text-[12px]">
                <div className="flex items-center gap-1.5 font-bold text-[#1F8A70]">
                  <DollarSign className="w-4 h-4" />
                  <span>Savings Breakdown</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#686450]">Rightsize in-place (A − B):</span>
                  <strong>${selectedVm.rightsizingSavingsMonthly.toFixed(2)}/mo</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#686450]">Cloud shift savings (B − D):</span>
                  <strong className="text-[#1F8A70]">
                    ${selectedVm.shiftSavingsMonthly.toFixed(2)}/mo ({selectedVm.shiftSavingsPct}%)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#686450]">First-year net after migration:</span>
                  <strong>${selectedVm.migration.netFirstYearUsd.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#ECE5CC]">
                  <span className="text-[#686450] flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-[#1F8A70]" /> Carbon delta:
                  </span>
                  <strong>
                    {selectedVm.carbon.currentKgMonth} → {selectedVm.carbon.targetKgMonth} kg/mo ({selectedVm.carbon.deltaPct}%)
                  </strong>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4 space-y-1.5 text-[12px]">
                <div className="flex items-center gap-1.5 font-bold text-[#2E2B1A]">
                  <Server className="w-4 h-4" />
                  <span>One-Time Migration Cost</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#686450]">Egress ({selectedVm.migration.dataGb} GB):</span>
                  <strong>${selectedVm.migration.egressUsd.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#686450]">Engineering effort:</span>
                  <strong>${selectedVm.migration.laborUsd.toFixed(2)}</strong>
                </div>
                {selectedVm.migration.archLaborUsd > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#686450]">Arm64 porting effort:</span>
                    <strong>${selectedVm.migration.archLaborUsd.toFixed(2)}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#686450]">Parallel cut-over run:</span>
                  <strong>${selectedVm.migration.parallelRunUsd.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#ECE5CC]">
                  <span className="font-bold text-[#2E2B1A]">Total / Payback:</span>
                  <strong>
                    ${selectedVm.migration.oneTimeUsd.toFixed(2)} · {selectedVm.migration.paybackMonths ?? "—"} mo
                  </strong>
                </div>
              </div>
            </div>

            {/* Reasons & Caveats */}
            <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4 space-y-2.5 text-[12.5px]">
              <h4 className="font-bold text-[#2E2B1A]">Decision Rationale</h4>
              <ul className="list-disc pl-5 space-y-1 text-[#686450]">
                {selectedVm.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              {selectedVm.caveats.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedVm.caveats.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF3D6] border border-[#F3E5BC] text-[10.5px] font-semibold text-[#9A6B00]"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Migration Steps & Terraform */}
            <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4 space-y-3 text-[12.5px]">
              <h4 className="font-bold text-[#2E2B1A]">Migration Checklist</h4>
              <ol className="list-decimal pl-5 space-y-1 text-[#686450]">
                {selectedVm.actions.migrationSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11.5px] font-bold text-[#2E2B1A]">Target Terraform Snippet</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedVm.actions.terraform);
                      setCopiedTf(true);
                      setTimeout(() => setCopiedTf(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1F8A70] cursor-pointer"
                  >
                    {copiedTf ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTf ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-[#2E2B1A] text-[#FFFDF4] text-[11px] font-mono overflow-x-auto">
                  {selectedVm.actions.terraform}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedVm(null)}
                className="px-4 py-2 rounded-full border border-[#ECE5CC] text-[12.5px] font-semibold text-[#686450] cursor-pointer"
              >
                Close
              </button>
              {selectedVm.verdict !== "STAY" && (
                <button
                  type="button"
                  onClick={() => handleApproveMigration(selectedVm)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#1F8A70] hover:bg-[#176E59] text-white text-[12.5px] font-bold cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Approve Migration Plan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
