"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Activity,
  CheckCircle2,
  Filter,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
} from "lucide-react";

interface AnomalyItem {
  id: string;
  date: string;
  dimension: string;
  entityName: string;
  actualCost: number;
  expectedBaseline: number;
  deviationPercent: number;
  zScore: number;
  severity: "critical" | "warning" | "info";
  rootCauseHint: string;
  recommendedAction: string;
}

interface CostAnomaliesViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
}

export function CostAnomaliesView({ data, onNavigateSubTab }: CostAnomaliesViewProps) {
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning">("all");

  const anomalyData = data?.anomalies;
  const rawItems: AnomalyItem[] = anomalyData?.items || [];
  const detectedCount = anomalyData?.detectedCount || rawItems.length;
  const criticalCount = anomalyData?.criticalCount || rawItems.filter((i) => i.severity === "critical").length;
  const warningCount = anomalyData?.warningCount || rawItems.filter((i) => i.severity === "warning").length;

  const filteredItems = rawItems.filter((item) => {
    if (severityFilter === "all") return true;
    return item.severity === severityFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#C84B31]">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">Cost Anomaly Detection</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                criticalCount > 0
                  ? "bg-[#FDE8E8] text-[#C84B31] border-[#F8B4B4]"
                  : detectedCount > 0
                  ? "bg-[#FFF3D6] text-[#9A6B00] border-[#ECE5CC]"
                  : "bg-[#E2F5EF] text-[#1F8A70] border-[#BDEBDD]"
              }`}>
                {criticalCount > 0
                  ? `${criticalCount} Critical Spikes`
                  : detectedCount > 0
                  ? `${detectedCount} Outliers Detected`
                  : "Nominal (Zero Anomalies)"}
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Statistical outlier detector tracking spend anomalies using rolling Z-Score (&ge;2.5&sigma;) and IQR analysis.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#FAF6E8] p-1 rounded-xl border border-[#ECE5CC] text-[11.5px]">
            <button
              type="button"
              onClick={() => setSeverityFilter("all")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                severityFilter === "all" ? "bg-white text-[#2E2B1A] shadow-2xs" : "text-[#8D8975]"
              }`}
            >
              All ({rawItems.length})
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter("critical")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                severityFilter === "critical" ? "bg-[#FDE8E8] text-[#C84B31] shadow-2xs" : "text-[#8D8975]"
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter("warning")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                severityFilter === "warning" ? "bg-[#FFF3D6] text-[#9A6B00] shadow-2xs" : "text-[#8D8975]"
              }`}
            >
              Warning ({warningCount})
            </button>
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Detected Outlier Events
            </span>
            <span className={`text-[26px] font-black ${detectedCount > 0 ? "text-[#C84B31]" : "text-[#1F8A70]"}`}>
              {detectedCount} Events
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1">
              Statistically significant spend spikes
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Z-Score Confidence Bound
            </span>
            <span className="text-[26px] font-black text-[#2E2B1A]">
              &ge; 2.5 &sigma;
            </span>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold">
              98.7% statistical confidence limit
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Detection Mechanism
            </span>
            <span className="text-[20px] font-black text-[#2E2B1A] block">
              Z-Score + IQR
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1 font-mono">
              Residual standard error filtering
            </span>
          </div>
        </div>

        {/* Anomaly Feed Ledger */}
        <div className="space-y-3 pt-2 border-t border-[#ECE5CC]">
          <h3 className="text-[14px] font-bold text-[#2E2B1A]">Detailed Anomaly Triage Ledger</h3>

          {filteredItems.length > 0 ? (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC] space-y-3 hover:bg-[#FAF6E8]/60 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        item.severity === "critical"
                          ? "bg-[#FDE8E8] text-[#C84B31]"
                          : "bg-[#FFF3D6] text-[#9A6B00]"
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[14px] text-[#2E2B1A]">{item.entityName}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.severity === "critical"
                              ? "bg-[#FDE8E8] text-[#C84B31] border border-[#F8B4B4]"
                              : "bg-[#FFF3D6] text-[#9A6B00] border border-[#ECE5CC]"
                          }`}>
                            {item.severity}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#8D8975]">
                          Date: {item.date} · Dimension: {item.dimension}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono font-black text-[15px] text-[#2E2B1A] block">
                          ${item.actualCost.toFixed(2)}
                        </span>
                        <span className="text-[10.5px] font-mono text-[#8D8975]">
                          Baseline: ${item.expectedBaseline.toFixed(2)}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold ${
                        item.severity === "critical"
                          ? "bg-[#FDE8E8] text-[#C84B31]"
                          : "bg-[#FFF3D6] text-[#9A6B00]"
                      }`}>
                        +{item.deviationPercent}% (Z: {item.zScore})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#ECE5CC]/60 text-[12px]">
                    <div className="p-2.5 rounded-xl bg-white border border-[#ECE5CC]">
                      <span className="text-[10.5px] font-mono text-[#8D8975] uppercase block mb-0.5">Root Cause Hint</span>
                      <p className="text-[#2E2B1A] font-medium leading-snug">{item.rootCauseHint}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#E2F5EF]/40 border border-[#BDEBDD]">
                      <span className="text-[10.5px] font-mono text-[#1F8A70] uppercase block mb-0.5">Recommended Remediation</span>
                      <p className="text-[#1F8A70] font-medium leading-snug">{item.recommendedAction}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC] text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#1F8A70] mx-auto" />
              <h4 className="font-bold text-[15px] text-[#2E2B1A]">Zero Cost Anomalies Detected</h4>
              <p className="text-[12.5px] text-[#686450] max-w-md mx-auto">
                All cloud spend and regional compute burn rates are currently operating within nominal baseline standard deviation bounds (&lt; 2.5&sigma;).
              </p>
            </div>
          )}
        </div>

        {/* Methodology Card */}
        <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] space-y-2 pt-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#9A6B00]" />
            <h4 className="font-bold text-[13px] text-[#2E2B1A]">Statistical Detection Methodology</h4>
          </div>
          <p className="text-[12px] text-[#686450] leading-relaxed">
            GreenCloud AI evaluates 14-day rolling historical telemetry using Holt&apos;s double exponential smoothing. Data points with residuals exceeding <strong>2.5 standard deviations (Z &ge; 2.5)</strong> and beyond 1.5&times; the Interquartile Range (IQR) are flagged to eliminate false positives caused by expected weekly cycles.
          </p>
        </div>
      </div>
    </div>
  );
}
