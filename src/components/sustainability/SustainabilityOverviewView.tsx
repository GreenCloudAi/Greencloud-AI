"use client";

import React from "react";
import {
  Leaf,
  Globe,
  Sliders,
  Server,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  HardDrive,
} from "lucide-react";

interface SustainabilityOverviewViewProps {
  data: any;
  sciFunctionalUnit: number;
  onNavigateSubTab: (subTab: string) => void;
}

export function SustainabilityOverviewView({
  data,
  sciFunctionalUnit,
  onNavigateSubTab,
}: SustainabilityOverviewViewProps) {
  const totalCarbon = data?.carbon?.totalCarbon;
  const operationalCarbon = data?.carbon?.totalOperationalCarbon;
  const embodiedCarbon = data?.carbon?.totalEmbodiedCarbon;

  const rawTotalGco2e = (operationalCarbon || 0) + (embodiedCarbon || 0);
  const sciScore = rawTotalGco2e > 0 && sciFunctionalUnit > 0
    ? (rawTotalGco2e / sciFunctionalUnit).toFixed(5)
    : "--";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E2F5EF] border border-[#BDEBDD] flex items-center justify-center text-[#1F8A70]">
                <Leaf className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">Sustainability Overview</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                GSF SCI Standard
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Software Carbon Intensity (SCI) accounting, Scope 2/3 footprinting, and regional grid optimization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubTab("sustainability-carbon")}
              className="px-3.5 py-1.5 rounded-xl bg-[#FAF6E8] hover:bg-[#F4EED8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Detailed Accounting</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Executive Metric Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Total Carbon Footprint
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-black text-[#2E2B1A]">
                {totalCarbon !== null && totalCarbon !== undefined ? `${totalCarbon} kgCO2e` : "--"}
              </span>
            </div>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Operational + Embodied Hardware Footprint
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Operational Grid Emissions
            </span>
            <span className="text-[26px] font-black text-[#2E2B1A]">
              {operationalCarbon !== null && operationalCarbon !== undefined ? `${operationalCarbon} gCO2e` : "--"}
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1 font-mono">
              Direct electricity consumed by active compute
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              GSF SCI Business Score
            </span>
            <span className="text-[26px] font-black text-[#1F8A70]">
              {sciScore !== "--" ? `${sciScore} g/unit` : "--"}
            </span>
            <span className="text-[11px] text-[#9A6B00] block mt-1 font-semibold font-mono">
              Normalized for {sciFunctionalUnit.toLocaleString()} units
            </span>
          </div>
        </div>

        {/* Clean Grid Migration Simulator Banner */}
        <div className="p-4 rounded-2xl bg-[#E2F5EF]/40 border border-[#BDEBDD] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1F8A70] text-white">
                Carbon-Aware Shifting
              </span>
              <span className="text-[11px] font-mono text-[#1F8A70] font-bold">
                us-east-1 → us-west-2
              </span>
            </div>
            <h4 className="font-bold text-[14px] text-[#2E2B1A]">
              Clean Grid Migration Simulation
            </h4>
            <p className="text-[12px] text-[#686450] max-w-xl">
              Relocating non-latency-sensitive workloads from Northern Virginia (312 gCO2e/kWh) to Oregon (80 gCO2e/kWh - Hydro &amp; Wind) eliminates <strong>~36.5%</strong> of direct grid emissions without code changes.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[16px] font-black text-[#1F8A70] block">
                -36.5% gCO2e
              </span>
              <span className="text-[10.5px] text-[#8D8975]">
                Zero performance penalty
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Deep-Dive Sub-Section Quick Jump Cards */}
      <div>
        <h3 className="text-[14px] font-bold text-[#2E2B1A] mb-3">Specialized Sustainability Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Carbon Accounting */}
          <div
            onClick={() => onNavigateSubTab("sustainability-carbon")}
            className="p-5 rounded-2xl bg-white border border-[#ECE5CC] hover:border-[#1F8A70] hover:shadow-warm-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] group-hover:bg-[#E2F5EF] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70] mb-3 transition-colors">
                <Leaf className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A] group-hover:text-[#1F8A70] transition-colors">
                Carbon Accounting
              </h4>
              <p className="text-[12px] text-[#686450] mt-1 leading-relaxed">
                Scope 2 (server electricity) vs Scope 3 (embodied hardware), emissions trajectory, and CSV export.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11.5px] font-bold text-[#1F8A70]">
              <span>Inspect Scopes</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Resource Carbon */}
          <div
            onClick={() => onNavigateSubTab("sustainability-resources")}
            className="p-5 rounded-2xl bg-white border border-[#ECE5CC] hover:border-[#9A6B00] hover:shadow-warm-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] group-hover:bg-[#FFF3D6] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00] mb-3 transition-colors">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A] group-hover:text-[#9A6B00] transition-colors">
                Resource Attribution
              </h4>
              <p className="text-[12px] text-[#686450] mt-1 leading-relaxed">
                Per-instance EC2, EBS, and EIP emissions inventory with carbon efficiency ratings.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11.5px] font-bold text-[#9A6B00]">
              <span>View Inventory</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Regional Grid Matrix */}
          <div
            onClick={() => onNavigateSubTab("sustainability-regions")}
            className="p-5 rounded-2xl bg-white border border-[#ECE5CC] hover:border-[#1F8A70] hover:shadow-warm-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] group-hover:bg-[#E2F5EF] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70] mb-3 transition-colors">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A] group-hover:text-[#1F8A70] transition-colors">
                Regional Grid Matrix
              </h4>
              <p className="text-[12px] text-[#686450] mt-1 leading-relaxed">
                17-region AWS electricity grid intensity matrix, local energy mix, and carbon shifting simulator.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11.5px] font-bold text-[#1F8A70]">
              <span>Explore Grids</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: GSF SCI Studio */}
          <div
            onClick={() => onNavigateSubTab("sustainability-sci")}
            className="p-5 rounded-2xl bg-white border border-[#ECE5CC] hover:border-[#1F8A70] hover:shadow-warm-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] group-hover:bg-[#E2F5EF] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70] mb-3 transition-colors">
                <Sliders className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A] group-hover:text-[#1F8A70] transition-colors">
                GSF-SCI Studio
              </h4>
              <p className="text-[12px] text-[#686450] mt-1 leading-relaxed">
                Green Software Foundation SCI formula tuner: SCI = (O + M) / R with custom horizon adjustment.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11.5px] font-bold text-[#1F8A70]">
              <span>Tune Formula</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
