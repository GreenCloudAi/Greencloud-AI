"use client";

import { useState } from "react";

export function TelemetryChart() {
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D">("30D");
  const [activeSeries, setActiveSeries] = useState<"all" | "cost" | "carbon">("all");

  return (
    <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between bg-[#FFFDF4]">
      <div>
        {/* Header & Legend Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-bold text-[#2E2B1A] flex items-center gap-2">
              <span>Cloud Cost & Carbon Telemetry</span>
              <span className="text-[10px] sm:text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#FBF6E3] border border-[#ECE5CC] text-[#8D8975]">
                Synchronized
              </span>
            </h3>
            <p className="text-[12px] text-[#686450] mt-0.5">
              Real-time cost & carbon telemetry correlated with infrastructure workload demand
            </p>
          </div>

          {/* Controls: Series Legend & Time Range */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {/* Series Toggles */}
            <div className="flex items-center gap-1 bg-[#FBF6E3] p-1 rounded-full border border-[#ECE5CC] text-[11px]">
              <button
                type="button"
                onClick={() => setActiveSeries(activeSeries === "cost" ? "all" : "cost")}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition-colors ${
                  activeSeries === "cost" || activeSeries === "all"
                    ? "bg-[#FFFDF4] border border-[#ECE5CC] text-[#2E2B1A] font-semibold shadow-warm-sm"
                    : "text-[#8D8975] hover:text-[#2E2B1A]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#9A6B00]"></span>
                <span>Cost ($/day)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSeries(activeSeries === "carbon" ? "all" : "carbon")}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition-colors ${
                  activeSeries === "carbon" || activeSeries === "all"
                    ? "bg-[#FFFDF4] border border-[#ECE5CC] text-[#2E2B1A] font-semibold shadow-warm-sm"
                    : "text-[#8D8975] hover:text-[#2E2B1A]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#1F8A70]"></span>
                <span>Carbon (kgCO₂e)</span>
              </button>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center bg-[#FBF6E3] p-1 rounded-lg border border-[#ECE5CC] text-[11px] font-bold">
              {(["7D", "30D", "90D"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    timeRange === range
                      ? "bg-[#FFF76A] border border-[#DFD6B5] text-[#2E2B1A] shadow-warm-sm"
                      : "text-[#686450] hover:text-[#2E2B1A]"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Visual Frame */}
        <div className="relative bg-[#FAF6E8] rounded-[20px] border border-[#ECE5CC] p-4 sm:p-5 pt-8 overflow-hidden">
          {/* Active Day Inspection Tooltip Callout */}
          <div className="absolute top-3 right-4 bg-[#2E2B1A] text-[#FFFDF4] px-3.5 py-1.5 rounded-xl text-[11px] font-mono shadow-warm-md flex items-center gap-2 z-10 border border-[#ECE5CC]/20">
            <span className="w-2 h-2 rounded-full bg-[#FFF76A] animate-ping"></span>
            <span className="text-[#DFD6B5]">Oct 24 Aggregation:</span>
            <span className="text-[#FFF76A] font-bold">$842.10</span>
            <span className="text-[#8D8975]">|</span>
            <span className="text-[#7C9A6D] font-bold">0.42 tCO₂e</span>
          </div>

          {/* SVG Curves */}
          <div className="w-full h-52 sm:h-56">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 760 190">
              <defs>
                <linearGradient id="costSunGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#9A6B00" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#9A6B00" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="carbonSunGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1F8A70" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#1F8A70" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Reference Gridlines */}
              <line stroke="#ECE5CC" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="760" y1="40" y2="40" />
              <line stroke="#ECE5CC" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="760" y1="90" y2="90" />
              <line stroke="#ECE5CC" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="760" y1="140" y2="140" />

              {/* Ledger Baseline */}
              <line opacity="0.65" stroke="#8D8975" strokeDasharray="6 4" strokeWidth="1.5" x1="0" x2="760" y1="110" y2="110" />

              {/* Cost Area & Curve */}
              {(activeSeries === "cost" || activeSeries === "all") && (
                <>
                  <path
                    d="M0,125 C50,118 85,62 135,70 C185,76 225,138 275,132 C325,126 375,50 425,58 C475,65 525,105 585,82 C645,60 695,46 760,40 L760,185 L0,185 Z"
                    fill="url(#costSunGrad)"
                  />
                  <path
                    d="M0,125 C50,118 85,62 135,70 C185,76 225,138 275,132 C325,126 375,50 425,58 C475,65 525,105 585,82 C645,60 695,46 760,40"
                    fill="none"
                    stroke="#9A6B00"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />
                </>
              )}

              {/* Carbon Area & Curve */}
              {(activeSeries === "carbon" || activeSeries === "all") && (
                <>
                  <path
                    d="M0,140 C50,134 95,94 145,98 C195,102 235,148 285,142 C335,138 385,78 435,84 C485,88 535,118 595,102 C655,88 705,72 760,62 L760,185 L0,185 Z"
                    fill="url(#carbonSunGrad)"
                  />
                  <path
                    d="M0,140 C50,134 95,94 145,98 C195,102 235,148 285,142 C335,138 385,78 435,84 C485,88 535,118 595,102 C655,88 705,72 760,62"
                    fill="none"
                    stroke="#1F8A70"
                    strokeLinecap="round"
                    strokeWidth="2.2"
                  />
                </>
              )}

              {/* Scrubber Pin at Day 24 */}
              <line stroke="#2E2B1A" strokeDasharray="3 3" strokeWidth="1.5" x1="585" x2="585" y1="20" y2="180" />
              <circle cx="585" cy="82" fill="#9A6B00" r="5" stroke="#FFFDF4" strokeWidth="2.5" />
              <circle cx="585" cy="102" fill="#1F8A70" r="5" stroke="#FFFDF4" strokeWidth="2.5" />
            </svg>
          </div>

          {/* X Axis Date Labels */}
          <div className="flex justify-between text-[11px] font-mono text-[#8D8975] pt-3 px-1 border-t border-[#ECE5CC]">
            <span>Oct 01</span>
            <span>Oct 06</span>
            <span>Oct 12</span>
            <span>Oct 18</span>
            <span className="text-[#2E2B1A] font-bold bg-[#FFF76A] px-2 py-0.5 rounded border border-[#DFD6B5]">
              Oct 24 (Active)
            </span>
            <span>Oct 30</span>
          </div>
        </div>
      </div>

      {/* Sync Freshness & Provenance Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between text-[11px] font-mono text-[#8D8975] gap-2 pt-2 border-t border-[#ECE5CC]/60">
        <span>Telemetry sync rate: &lt;60s live frequency</span>
        <span className="flex items-center gap-1.5 text-[#1F8A70] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70]"></span>
          Synchronized with AWS CUR 2.0 & CloudWatch
        </span>
      </div>
    </div>
  );
}
