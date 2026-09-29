"use client";

import React, { useState } from "react";
import {
  Globe,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Info,
} from "lucide-react";

interface RegionalGridItem {
  region: string;
  location: string;
  gridIntensity: number;
  mix: string;
  status: string;
}

interface RegionalGridMatrixViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
}

export function RegionalGridMatrixView({ data, onNavigateSubTab }: RegionalGridMatrixViewProps) {
  const regionalGrid: RegionalGridItem[] = data?.carbon?.regionalGrid || [];

  const [fromRegion, setFromRegion] = useState("us-east-1");
  const [toRegion, setToRegion] = useState("us-west-2");
  const [monthlyKwh, setMonthlyKwh] = useState(150);

  const fromMeta = regionalGrid.find((r) => r.region === fromRegion) || {
    region: "us-east-1",
    location: "US East (N. Virginia)",
    gridIntensity: 420,
    mix: "Gas & Coal",
    status: "Moderate",
  };

  const toMeta = regionalGrid.find((r) => r.region === toRegion) || {
    region: "us-west-2",
    location: "US West (Oregon)",
    gridIntensity: 80,
    mix: "Hydro & Wind",
    status: "Ultra Clean",
  };

  const currentEmissions = (monthlyKwh * fromMeta.gridIntensity) / 1000; // in kg
  const projectedEmissions = (monthlyKwh * toMeta.gridIntensity) / 1000; // in kg
  const savingsPct = fromMeta.gridIntensity > 0
    ? Math.round(((fromMeta.gridIntensity - toMeta.gridIntensity) / fromMeta.gridIntensity) * 100)
    : 0;
  const netSavedKg = Math.max(0, currentEmissions - projectedEmissions);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                <Globe className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">Regional Electricity Grid Carbon Matrix</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                17 AWS Regions Monitored
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Live regional electricity grid emission factors derived from electricity maps and climate data.
            </p>
          </div>

          <span className="text-[12px] font-mono font-bold text-[#8D8975]">
            Emissions Factor: gCO2e / kWh
          </span>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Cleanest Available AWS Grid
            </span>
            <span className="text-[24px] font-black text-[#1F8A70]">
              45 gCO2e/kWh
            </span>
            <span className="text-[11px] text-[#686450] block mt-1 font-semibold">
              eu-north-1 (Stockholm, Sweden) · Hydro &amp; Nuclear
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Cleanest US Deployment Zone
            </span>
            <span className="text-[24px] font-black text-[#1F8A70]">
              80 gCO2e/kWh
            </span>
            <span className="text-[11px] text-[#686450] block mt-1 font-semibold">
              us-west-2 (Oregon) · Columbia River Hydro
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Highest Carbon Thermal Grid
            </span>
            <span className="text-[24px] font-black text-[#9A6B00]">
              680 gCO2e/kWh
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1">
              ap-south-1 (Mumbai, India) · Thermal Coal
            </span>
          </div>
        </div>

        {/* Interactive Carbon-Aware Shifting Simulator */}
        <div className="p-5 rounded-2xl bg-[#E2F5EF]/30 border border-[#BDEBDD] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#1F8A70]" />
                <h3 className="font-bold text-[15px] text-[#2E2B1A]">Carbon-Aware Migration Calculator</h3>
              </div>
              <p className="text-[12px] text-[#686450]">
                Simulate emission reduction by migrating compute instances to greener AWS regions.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#1F8A70] text-white">
              Instant Simulation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-mono font-bold text-[#8D8975] uppercase block mb-1">
                Source Region (From):
              </label>
              <select
                value={fromRegion}
                onChange={(e) => setFromRegion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#ECE5CC] text-[12.5px] font-bold text-[#2E2B1A] focus:outline-none focus:border-[#1F8A70]"
              >
                {regionalGrid.map((r) => (
                  <option key={r.region} value={r.region}>
                    {r.region} - {r.location} ({r.gridIntensity}g)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold text-[#8D8975] uppercase block mb-1">
                Destination Region (To):
              </label>
              <select
                value={toRegion}
                onChange={(e) => setToRegion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#ECE5CC] text-[12.5px] font-bold text-[#2E2B1A] focus:outline-none focus:border-[#1F8A70]"
              >
                {regionalGrid.map((r) => (
                  <option key={r.region} value={r.region}>
                    {r.region} - {r.location} ({r.gridIntensity}g)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold text-[#8D8975] uppercase block mb-1">
                Monthly Workload Energy (kWh):
              </label>
              <input
                type="number"
                min="1"
                value={monthlyKwh}
                onChange={(e) => setMonthlyKwh(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#ECE5CC] text-[12.5px] font-mono font-bold text-[#2E2B1A] focus:outline-none focus:border-[#1F8A70]"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#BDEBDD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12.5px]">
            <div className="space-y-0.5">
              <span className="font-bold text-[#2E2B1A]">
                Migrating from {fromMeta.location} to {toMeta.location}:
              </span>
              <p className="text-[11.5px] text-[#686450]">
                Baseline: {currentEmissions.toFixed(2)} kgCO2e/mo → Clean Destination: {projectedEmissions.toFixed(2)} kgCO2e/mo
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[18px] font-black text-[#1F8A70] block">
                {savingsPct > 0 ? `-${savingsPct}%` : `+${Math.abs(savingsPct)}%`} Emissions
              </span>
              <span className="text-[11px] font-mono text-[#8D8975]">
                {netSavedKg > 0 ? `Saves ~${netSavedKg.toFixed(2)} kgCO2e / month` : "Equal carbon intensity"}
              </span>
            </div>
          </div>
        </div>

        {/* 17-Region Matrix Table */}
        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[#ECE5CC] font-mono text-[11px] text-[#8D8975] uppercase">
                <th className="py-2.5">AWS Region</th>
                <th className="py-2.5">Location Name</th>
                <th className="py-2.5">Grid Intensity</th>
                <th className="py-2.5">Primary Energy Mix</th>
                <th className="py-2.5">Carbon Rating</th>
                <th className="py-2.5 text-right">Workload Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE5CC]/50">
              {regionalGrid.map((grid, idx) => {
                const isClean = grid.status === "Clean" || grid.status === "Ultra Clean";
                const isHigh = grid.status === "High Carbon";

                return (
                  <tr key={idx} className="hover:bg-[#FAF6E8]/40 transition-colors">
                    <td className="py-3 font-mono font-bold text-[#2E2B1A]">{grid.region}</td>
                    <td className="py-3 text-[#2E2B1A] font-medium">{grid.location}</td>
                    <td className="py-3 font-mono font-bold">
                      <span className={isClean ? "text-[#1F8A70]" : isHigh ? "text-[#9A6B00]" : "text-[#2E2B1A]"}>
                        {grid.gridIntensity} gCO2e/kWh
                      </span>
                    </td>
                    <td className="py-3 text-[#686450] text-[12px]">{grid.mix}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                        isClean
                          ? "bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD]"
                          : isHigh
                          ? "bg-[#FFF3D6] text-[#9A6B00] border border-[#ECE5CC]"
                          : "bg-[#FAF6E8] text-[#686450] border border-[#ECE5CC]"
                      }`}>
                        {grid.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-[11.5px] font-semibold ${isClean ? "text-[#1F8A70]" : "text-[#8D8975]"}`}>
                        {isClean ? "✓ Optimal for Heavy Compute" : isHigh ? "Avoid Batch Jobs" : "Nominal"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
