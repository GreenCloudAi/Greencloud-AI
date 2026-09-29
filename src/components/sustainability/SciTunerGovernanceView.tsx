"use client";

import React, { useState } from "react";
import {
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Cpu,
  Layers,
  Sparkles,
  GitBranch,
  Gauge,
  Info,
} from "lucide-react";

interface SciTunerGovernanceViewProps {
  data: any;
  sciFunctionalUnit: number;
  setSciFunctionalUnit: (unit: number) => void;
  onNavigateSubTab: (subTab: string) => void;
}

export function SciTunerGovernanceView({
  data,
  sciFunctionalUnit,
  setSciFunctionalUnit,
  onNavigateSubTab,
}: SciTunerGovernanceViewProps) {
  const operationalCarbon = data?.carbon?.totalOperationalCarbon || 0;
  const embodiedCarbon = data?.carbon?.totalEmbodiedCarbon || 0;
  const totalGco2e = operationalCarbon + embodiedCarbon;

  const [customUnitInput, setCustomUnitInput] = useState<string>(sciFunctionalUnit.toString());
  const [sciBudgetThreshold, setSciBudgetThreshold] = useState<number>(0.05);

  const sciScore = totalGco2e > 0 && sciFunctionalUnit > 0
    ? (totalGco2e / sciFunctionalUnit)
    : 0;

  const isBudgetPassed = sciScore <= sciBudgetThreshold;

  const handleCustomUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customUnitInput.replace(/,/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSciFunctionalUnit(parsed);
    }
  };

  const handlePresetSelect = (val: number) => {
    setSciFunctionalUnit(val);
    setCustomUnitInput(val.toString());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                <Sliders className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">GSF-SCI Studio &amp; Carbon Governance</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                GSF Standard v1.0
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Green Software Foundation Software Carbon Intensity (SCI) equation modeling, unit tuning, and CI/CD gate budgets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] bg-[#FAF6E8] text-[#2E2B1A] border border-[#ECE5CC] px-3 py-1.5 rounded-xl font-bold">
              Formula: SCI = (O + M) / R
            </span>
          </div>
        </div>

        {/* 4 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#E2F5EF]/50 border border-[#BDEBDD]">
            <span className="text-[11px] font-mono text-[#1F8A70] uppercase font-bold block mb-1">
              Current SCI Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#1F8A70]">
                {sciScore > 0 ? sciScore.toFixed(5) : "--"}
              </span>
              <span className="text-[11px] text-[#1F8A70] font-mono">g / req</span>
            </div>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-medium">
              Normalized per functional unit (R)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Operational Carbon (O)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#2E2B1A]">
                {operationalCarbon.toFixed(1)}
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">gCO2e</span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              Active electricity consumption
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Embodied Carbon (M)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#2E2B1A]">
                {embodiedCarbon.toFixed(1)}
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">gCO2e</span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              Hardware supply chain footprint
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Functional Unit (R)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[24px] font-black text-[#2E2B1A]">
                {sciFunctionalUnit.toLocaleString()}
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">units</span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              Business throughput denominator
            </span>
          </div>
        </div>

        {/* SCI Formula Visualizer */}
        <div className="p-5 rounded-2xl bg-[#FAF6E8]/50 border border-[#ECE5CC] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[14px] text-[#2E2B1A] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1F8A70]" />
              GSF-SCI Formula Decomposition
            </h3>
            <span className="text-[11px] font-mono text-[#8D8975]">
              ISO / Green Software Foundation Standard
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div className="p-3.5 rounded-xl bg-white border border-[#ECE5CC] text-center">
              <span className="text-[11px] font-mono font-bold text-[#1F8A70] block">O (Operational)</span>
              <span className="text-[18px] font-bold text-[#2E2B1A] block mt-1">{operationalCarbon.toFixed(1)} g</span>
              <span className="text-[10.5px] text-[#8D8975]">kWh &times; Grid Intensity</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#ECE5CC] text-center">
              <span className="text-[11px] font-mono font-bold text-[#9A6B00] block">M (Embodied)</span>
              <span className="text-[18px] font-bold text-[#2E2B1A] block mt-1">{embodiedCarbon.toFixed(1)} g</span>
              <span className="text-[10.5px] text-[#8D8975]">Hardware Manufacturing</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#ECE5CC] text-center">
              <span className="text-[11px] font-mono font-bold text-[#2E2B1A] block">R (Functional Unit)</span>
              <span className="text-[18px] font-bold text-[#2E2B1A] block mt-1">{sciFunctionalUnit.toLocaleString()}</span>
              <span className="text-[10.5px] text-[#8D8975]">API calls / requests</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1F8A70] text-white text-center shadow-warm-sm">
              <span className="text-[11px] font-mono font-bold opacity-80 block">SCI Result</span>
              <span className="text-[18px] font-black block mt-1">{sciScore > 0 ? sciScore.toFixed(5) : "--"}</span>
              <span className="text-[10.5px] opacity-80">gCO2e per request</span>
            </div>
          </div>
        </div>

        {/* Functional Unit Tuner & Presets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
          {/* Left: Presets & Custom Input (7 cols) */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-[#ECE5CC] space-y-4">
            <div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A]">Tune Functional Unit Denominator (R)</h4>
              <p className="text-[12px] text-[#686450] mt-0.5">
                Adjust the denominator to reflect your application&apos;s actual business volume (e.g. daily API calls, batch jobs, or active monthly users).
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase block">
                Quick-Select Volume Presets:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "10,000 req", val: 10000 },
                  { label: "50,000 req", val: 50000 },
                  { label: "100,000 req", val: 100000, defaultBadge: true },
                  { label: "1,000,000 req", val: 1000000 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => handlePresetSelect(preset.val)}
                    className={`px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all text-center border cursor-pointer ${
                      sciFunctionalUnit === preset.val
                        ? "bg-[#FFF76A] text-[#2E2B1A] border-[#DFD6B5] shadow-2xs"
                        : "bg-white hover:bg-[#FAF6E8] text-[#686450] border-[#ECE5CC]"
                    }`}
                  >
                    <span>{preset.label}</span>
                    {preset.defaultBadge && (
                      <span className="block text-[9.5px] font-mono text-[#8D8975] font-normal mt-0.5">Default</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleCustomUnitSubmit} className="pt-2 border-t border-[#ECE5CC]/80 space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase block">
                Custom Numerical Horizon (R):
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customUnitInput}
                  onChange={(e) => setCustomUnitInput(e.target.value)}
                  placeholder="e.g. 250000"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/30 text-[13px] font-mono font-bold text-[#2E2B1A] focus:outline-none focus:border-[#1F8A70]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1F8A70] hover:bg-[#186F5A] text-white text-[12px] font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Apply Horizon
                </button>
              </div>
              <span className="text-[11px] text-[#8D8975] block">
                Press Apply to re-normalize intensity ratings across all sub-components.
              </span>
            </form>
          </div>

          {/* Right: Extrapolated Volume Projections (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-[#ECE5CC] space-y-4">
            <h4 className="font-bold text-[14px] text-[#2E2B1A]">Volume Extrapolations</h4>
            <p className="text-[12px] text-[#686450]">
              Carbon intensity scaled across enterprise deployment volumes:
            </p>

            <div className="space-y-3 font-mono text-[12px]">
              <div className="p-3 rounded-xl bg-[#FAF6E8]/50 border border-[#ECE5CC] flex items-center justify-between">
                <span className="text-[#686450]">Per 100k Requests:</span>
                <strong className="text-[#2E2B1A]">
                  {sciScore > 0 ? (sciScore * 100000).toFixed(2) : "--"} gCO2e
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF6E8]/50 border border-[#ECE5CC] flex items-center justify-between">
                <span className="text-[#686450]">Per 1 Million Requests:</span>
                <strong className="text-[#2E2B1A]">
                  {sciScore > 0 ? ((sciScore * 1000000) / 1000).toFixed(3) : "--"} kgCO2e
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF6E8]/50 border border-[#ECE5CC] flex items-center justify-between">
                <span className="text-[#686450]">Per 100M Requests (Enterprise):</span>
                <strong className="text-[#1F8A70]">
                  {sciScore > 0 ? ((sciScore * 100000000) / 1000000).toFixed(2) : "--"} MT CO2e
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* CI/CD Carbon Budget Gate & Policy Controls */}
        <div className="p-5 rounded-2xl bg-white border border-[#ECE5CC] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ECE5CC]">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1F8A70]" />
                <h3 className="font-bold text-[14.5px] text-[#2E2B1A]">CI/CD Deployment Carbon Budget Gate</h3>
              </div>
              <p className="text-[12px] text-[#686450] mt-0.5">
                Enforce maximum allowable SCI intensity scores before allowing builds to deploy to production.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                isBudgetPassed
                  ? "bg-[#E2F5EF] text-[#1F8A70] border-[#BDEBDD]"
                  : "bg-[#FFF3D6] text-[#9A6B00] border-[#DFD6B5]"
              }`}>
                {isBudgetPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{isBudgetPassed ? "Gate Passing: Verified" : "Gate Warning: Threshold Exceeded"}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#FAF6E8]/30 border border-[#ECE5CC] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#2E2B1A]">SCI Threshold Target:</span>
                <span className="font-mono text-[13px] font-bold text-[#1F8A70]">{sciBudgetThreshold.toFixed(4)} g/req</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.2"
                step="0.005"
                value={sciBudgetThreshold}
                onChange={(e) => setSciBudgetThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#1F8A70] cursor-pointer"
              />
              <div className="flex justify-between text-[10.5px] font-mono text-[#8D8975]">
                <span>0.005 (Ultra Strict)</span>
                <span>0.100 (Standard)</span>
                <span>0.200 (Lenient)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF6E8]/30 border border-[#ECE5CC] space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase block">
                Continuous Integration Actions:
              </span>
              <ul className="text-[12px] space-y-1.5 text-[#686450]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                  <span>GitHub Action / GitLab runner regression gate</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                  <span>Block PRs that cause &gt; 5% carbon regression</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                  <span>Auto-generate GreenOps badge for README.md</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Jump Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE5CC]">
          <span className="text-[12px] text-[#8D8975]">Explore other GreenOps intelligence modules:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubTab("sustainability-overview")}
              className="text-[12px] font-bold text-[#1F8A70] hover:underline cursor-pointer"
            >
              Overview
            </button>
            <span className="text-[#ECE5CC]">&bull;</span>
            <button
              type="button"
              onClick={() => onNavigateSubTab("sustainability-carbon")}
              className="text-[12px] font-bold text-[#1F8A70] hover:underline cursor-pointer"
            >
              Scope 2/3 Accounting
            </button>
            <span className="text-[#ECE5CC]">&bull;</span>
            <button
              type="button"
              onClick={() => onNavigateSubTab("sustainability-regions")}
              className="text-[12px] font-bold text-[#1F8A70] hover:underline cursor-pointer"
            >
              Regional Grid Matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
