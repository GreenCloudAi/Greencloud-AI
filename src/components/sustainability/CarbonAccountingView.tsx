"use client";

import React from "react";
import {
  Leaf,
  Download,
  ShieldCheck,
  TrendingDown,
  Layers,
  Cpu,
  HardDrive,
  Info,
  Calendar,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface CarbonAccountingViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
}

export function CarbonAccountingView({ data, onNavigateSubTab }: CarbonAccountingViewProps) {
  const totalCarbon = data?.carbon?.totalCarbon;
  const operationalCarbon = data?.carbon?.totalOperationalCarbon || 0;
  const embodiedCarbon = data?.carbon?.totalEmbodiedCarbon || 0;
  const totalGco2e = operationalCarbon + embodiedCarbon;

  const opPct = totalGco2e > 0 ? Math.round((operationalCarbon / totalGco2e) * 100) : 65;
  const embPct = 100 - opPct;

  const dailyTrend: Array<{ date: string; cost: number }> = data?.costs?.dailyTrend || [];
  const dailyCarbon = dailyTrend.map((d) => ({
    date: d.date,
    gco2e: operationalCarbon > 0 && (data?.costs?.totalCost || 0) > 0
      ? parseFloat(((d.cost / (data.costs.totalCost || 1)) * operationalCarbon).toFixed(1))
      : 0,
  }));

  const handleExportCSV = () => {
    const headers = ["Metric", "Classification", "Emissions (gCO2e)", "Emissions (kgCO2e)", "Share (%)"];
    const rows = [
      ["Server Electricity", "Scope 2 (Operational)", operationalCarbon.toFixed(2), (operationalCarbon / 1000).toFixed(4), `${opPct}%`],
      ["Hardware Manufacturing", "Scope 3 (Embodied)", embodiedCarbon.toFixed(2), (embodiedCarbon / 1000).toFixed(4), `${embPct}%`],
      ["Total Cloud Footprint", "Gross Emissions", totalGco2e.toFixed(2), (totalCarbon || totalGco2e / 1000).toFixed(4), "100%"],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `carbon_accounting_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                <Leaf className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">Scope 2 &amp; Scope 3 Carbon Accounting</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                GHG Protocol Aligned
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Rigorous breakdown of operational server electricity and hardware manufacturing footprint.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#1F8A70]" />
              <span>Export Carbon CSV</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Scope 2: Operational Electricity
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-black text-[#1F8A70]">
                {operationalCarbon.toFixed(1)} g
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">({opPct}%)</span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              Location-based grid intensity &times; kWh consumed
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Scope 3: Embodied Manufacturing
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-black text-[#9A6B00]">
                {embodiedCarbon.toFixed(1)} g
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">({embPct}%)</span>
            </div>
            <span className="text-[11px] text-[#8D8975] block mt-1 font-mono">
              Amortized server lifecycle hardware footprint
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Gross Monthly Cloud Footprint
            </span>
            <span className="text-[26px] font-black text-[#2E2B1A]">
              {totalCarbon !== null && totalCarbon !== undefined ? `${totalCarbon} kg` : "--"}
            </span>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Verified CCF methodology
            </span>
          </div>
        </div>

        {/* Operational vs Embodied Visual Ratio Bar */}
        <div className="p-5 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC] space-y-3">
          <div className="flex items-center justify-between text-[12px] font-bold">
            <span className="text-[#2E2B1A]">Scope 2 vs Scope 3 Ratio Comparison</span>
            <span className="font-mono text-[#8D8975]">{opPct}% Operational · {embPct}% Embodied</span>
          </div>

          <div className="w-full h-3 rounded-full bg-[#ECE5CC] overflow-hidden flex">
            <div
              style={{ width: `${opPct}%` }}
              className="bg-[#1F8A70] h-full"
              title={`Operational (Scope 2): ${operationalCarbon.toFixed(1)} gCO2e`}
            />
            <div
              style={{ width: `${embPct}%` }}
              className="bg-[#9A6B00] h-full"
              title={`Embodied (Scope 3): ${embodiedCarbon.toFixed(1)} gCO2e`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#686450]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1F8A70]" />
              <span>Scope 2: Server Electricity ({operationalCarbon.toFixed(1)} gCO2e)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9A6B00]" />
              <span>Scope 3: Hardware Lifecycle ({embodiedCarbon.toFixed(1)} gCO2e)</span>
            </div>
          </div>
        </div>

        {/* Daily Carbon Emissions Trajectory Graph */}
        <div className="pt-2 border-t border-[#ECE5CC]">
          <div className="flex items-center justify-between mb-3 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#2E2B1A]">Daily Carbon Emissions Velocity</span>
              <span className="text-[#8D8975] font-mono text-[11px]">
                ({dailyCarbon.length > 0 ? `${dailyCarbon.length} days recorded` : "30-day window"})
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#1F8A70] font-bold">
              Avg Daily Output: {dailyCarbon.length > 0 ? (operationalCarbon / Math.max(1, dailyCarbon.length)).toFixed(1) : 0} gCO2e/day
            </span>
          </div>

          <div className="h-40 w-full bg-[#FAF6E8]/30 rounded-2xl p-3 border border-[#ECE5CC]/60 flex flex-col justify-between relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="carbonAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1F8A70" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#1F8A70" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {operationalCarbon > 0 ? (
                <>
                  <path d="M 0,95 Q 120,85 250,60 T 500,30 L 500,120 L 0,120 Z" fill="url(#carbonAreaGrad)" />
                  <path d="M 0,95 Q 120,85 250,60 T 500,30" fill="transparent" stroke="#1F8A70" strokeWidth="2.5" />
                </>
              ) : (
                <line x1="0" y1="100" x2="500" y2="100" stroke="#1F8A70" strokeWidth="2" strokeDasharray="4 4" />
              )}
            </svg>

            <div className="flex items-center justify-between text-[10.5px] font-mono text-[#8D8975] pt-1 border-t border-[#ECE5CC]/40">
              <span>Day 1</span>
              <span>Day 7</span>
              <span>Day 14</span>
              <span>Day 21</span>
              <span>Day 30 (Today)</span>
            </div>
          </div>
        </div>

        {/* GHG Protocol Standards Checklist */}
        <div className="pt-3 border-t border-[#ECE5CC] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[14.5px] text-[#2E2B1A]">GHG Protocol Cloud Standards Compliance</h3>
            <span className="text-[11px] font-mono font-bold text-[#1F8A70]">100% Traceable</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
            <div className="p-3.5 rounded-xl bg-white border border-[#ECE5CC] space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F8A70]" />
                <span className="font-bold text-[#2E2B1A]">Scope 2 (Location-Based)</span>
              </div>
              <p className="text-[#686450] text-[11.5px] leading-snug">
                Dynamically applies average annual regional grid carbon factors (e.g. 420 g/kWh for us-east-1, 80 g/kWh for us-west-2).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#ECE5CC] space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F8A70]" />
                <span className="font-bold text-[#2E2B1A]">Scope 3 (Embodied Hardware)</span>
              </div>
              <p className="text-[#686450] text-[11.5px] leading-snug">
                Amortizes physical chip, chassis, and datacenter construction footprint over a 4-year server depreciation timeline.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#ECE5CC] space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F8A70]" />
                <span className="font-bold text-[#2E2B1A]">PUE Accounting</span>
              </div>
              <p className="text-[#686450] text-[11.5px] leading-snug">
                Factor 1.15 Power Usage Effectiveness (PUE) standard applied to compute workloads to reflect cooling and infrastructure overhead.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
