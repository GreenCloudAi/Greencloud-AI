"use client";

import { TelemetryChart } from "./TelemetryChart";
import { OptimizationQueue, RecommendationItem } from "./OptimizationQueue";

interface WorkbenchConsoleProps {
  recommendations?: RecommendationItem[];
  onReviewAction?: (id: string) => void;
}

export function WorkbenchConsole({
  recommendations = [],
  onReviewAction,
}: WorkbenchConsoleProps) {
  return (
    <div
      id="recommended-optimizations"
      className="bg-[#FFFDF4] rounded-[24px] sm:rounded-[26px] border border-[#ECE5CC] shadow-warm-lg overflow-hidden mb-20"
    >
      {/* Integrated Console Top Bar */}
      <div className="px-5 sm:px-7 py-3.5 bg-[#FBF6E3] border-b border-[#ECE5CC] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1F8A70] animate-pulse"></span>
            <span className="font-bold text-[#2E2B1A] text-[13.5px]">
              Live Simulation Console
            </span>
          </div>
          <span className="text-[#DFD6B5] hidden sm:inline">•</span>
          <span className="text-[#8D8975] font-mono text-[11px] bg-[#FFFDF4] px-2.5 py-0.5 rounded-full border border-[#ECE5CC]">
            AWS Multi-Region Sample
          </span>
          <span className="text-[#686450] text-[12px] font-medium hidden md:inline">
            Compute, Storage & Database Telemetry
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap font-mono text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2F5EF] text-[#1F8A70] font-semibold border border-[#1F8A70]/20">
            <span className="material-symbols-outlined text-[13px] leading-none">lock</span>
            <span>Read-Only Mode</span>
          </span>
          <span className="text-[#686450] bg-[#FFFDF4] border border-[#ECE5CC] px-2.5 py-1 rounded-full hidden sm:inline-flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[13px] text-[#1F8A70] leading-none">verified</span>
            <span>FOCUS 1.0</span>
          </span>
          <span className="px-3 py-1 bg-[#FFFDF4] rounded-full border border-[#ECE5CC] text-[#2E2B1A] font-semibold">
            Last 30 Days
          </span>
        </div>
      </div>

      {/* Side-by-Side Canvas: Left (Telemetry Timeseries) | Right (Scrollable Recommended Optimizations) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#ECE5CC]">
        <TelemetryChart />
        <OptimizationQueue
          recommendations={recommendations}
          onReviewAction={onReviewAction}
        />
      </div>
    </div>
  );
}
