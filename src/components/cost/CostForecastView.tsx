"use client";

import React, { useState } from "react";
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Info,
  ChevronRight,
  Leaf,
  Layers,
} from "lucide-react";

interface ForecastPoint {
  date: string;
  predictedCost: number;
  lowerBoundCost: number;
  upperBoundCost: number;
  predictedCarbonGco2e: number;
  isForecast: boolean;
}

interface CostForecastViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
}

export function CostForecastView({ data, onNavigateSubTab }: CostForecastViewProps) {
  const [showTable, setShowTable] = useState(false);

  const forecast = data?.forecast;
  const trajectory: ForecastPoint[] = forecast?.trajectory || [];
  const trendVelocity = forecast?.trendVelocity || "stable";
  const budgetRisk = forecast?.budgetRisk || "low";
  const monthEndCost = forecast?.monthEndProjectedCost ?? data?.budget?.projectedMonthEnd ?? 0;
  const next30Cost = forecast?.next30DaysProjectedCost ?? 0;
  const monthEndCarbon = forecast?.monthEndProjectedCarbon ?? 0;

  // Split historical vs forecast points
  const histPoints = trajectory.filter((p) => !p.isForecast);
  const forePoints = trajectory.filter((p) => p.isForecast);

  // SVG Chart Geometry
  const rawMax = Math.max(
    ...trajectory.map((p) => Math.max(p.predictedCost, p.upperBoundCost)),
    0.35
  );
  const maxVal = parseFloat((rawMax * 1.15).toFixed(2));
  const chartW = 800;
  const chartH = 160;
  const padding = 15;
  const axisLeft = 45;

  const getX = (idx: number) =>
    padding + axisLeft + (idx / Math.max(1, trajectory.length - 1)) * (chartW - padding * 2 - axisLeft);
  const getY = (val: number) =>
    chartH - padding - (val / maxVal) * (chartH - padding * 2);

  // Paths
  const histPath = histPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.predictedCost)}`)
    .join(" ");

  const foreStartIndex = Math.max(0, histPoints.length - 1);
  const allForePoints = [
    ...(histPoints.length > 0 ? [histPoints[histPoints.length - 1]] : []),
    ...forePoints,
  ];
  const forePath = allForePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(foreStartIndex + i)} ${getY(p.predictedCost)}`)
    .join(" ");

  let bandPath = "";
  if (allForePoints.length > 1) {
    const upperPath = allForePoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(foreStartIndex + i)} ${getY(p.upperBoundCost)}`)
      .join(" ");
    const lowerPath = [...allForePoints]
      .reverse()
      .map((p, i) => `L ${getX(foreStartIndex + allForePoints.length - 1 - i)} ${getY(p.lowerBoundCost)}`)
      .join(" ");
    bandPath = `${upperPath} ${lowerPath} Z`;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                <LineChart className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">30-Day Predictive Forecasting Studio</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                Holt&apos;s Linear Trend Model
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Statistically projects future cloud spend and emissions with 95% confidence intervals and Z-Score outlier detection.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] text-[11.5px]">
              <span className="text-[#8D8975]">Trend Velocity:</span>
              <span className={`font-bold capitalize ${
                trendVelocity === "accelerating"
                  ? "text-[#C84B31]"
                  : trendVelocity === "decelerating"
                  ? "text-[#1F8A70]"
                  : "text-[#9A6B00]"
              }`}>
                {trendVelocity}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] text-[11.5px]">
              <span className="text-[#8D8975]">Budget Risk:</span>
              <span className={`font-bold uppercase ${
                budgetRisk === "high"
                  ? "text-[#C84B31]"
                  : budgetRisk === "medium"
                  ? "text-[#9A6B00]"
                  : "text-[#1F8A70]"
              }`}>
                {budgetRisk}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Forecast Metric Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC]">
            <span className="text-[10.5px] font-mono font-bold text-[#8D8975] uppercase block">
              Projected Month-End Spend
            </span>
            <span className="text-[24px] font-black text-[#2E2B1A] block mt-1 font-mono">
              ${monthEndCost.toFixed(2)}
            </span>
            <span className="text-[11px] text-[#686450] block mt-0.5">
              Projected through end of month
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC]">
            <span className="text-[10.5px] font-mono font-bold text-[#8D8975] uppercase block">
              30-Day Forward Forecast
            </span>
            <span className="text-[24px] font-black text-[#1F8A70] block mt-1 font-mono">
              ${next30Cost.toFixed(2)}
            </span>
            <span className="text-[11px] text-[#686450] block mt-0.5">
              Forward 30 calendar days
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC]">
            <span className="text-[10.5px] font-mono font-bold text-[#8D8975] uppercase block">
              Projected Month-End Carbon
            </span>
            <span className="text-[24px] font-black text-[#2E2B1A] block mt-1 font-mono">
              {monthEndCarbon > 0 ? `${monthEndCarbon} g` : "--"}
            </span>
            <span className="text-[11px] text-[#686450] block mt-0.5">
              Embodied + Operational footprint
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC]">
            <span className="text-[10.5px] font-mono font-bold text-[#8D8975] uppercase block">
              Confidence Interval Band
            </span>
            <span className="text-[24px] font-black text-[#9A6B00] block mt-1 font-mono">
              95% Bounds
            </span>
            <span className="text-[11px] text-[#686450] block mt-0.5">
              Residual standard error modeling
            </span>
          </div>
        </div>

        {/* Interactive SVG Forecast Trajectory Visualization */}
        <div className="p-5 rounded-2xl bg-white border border-[#ECE5CC] space-y-3">
          <div className="flex items-center justify-between text-[11.5px] flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#1F8A70] rounded-full inline-block" />
                <span className="font-bold text-[#2E2B1A]">Historical Spend (Actual)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-[#9A6B00] inline-block" />
                <span className="font-bold text-[#9A6B00]">Holt&apos;s Forecast Trend</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-[#FFF76A]/40 border border-[#ECE5CC] rounded-xs inline-block" />
                <span className="text-[#8D8975]">95% Confidence Band</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#8D8975]">
              {trajectory.length > 0 ? `${trajectory.length} Timeline Points` : "30-Day Model"}
            </span>
          </div>

          {/* SVG Chart */}
          <div className="w-full h-48 relative bg-[#FAF6E8]/20 rounded-xl border border-[#ECE5CC]/60 p-2 overflow-hidden flex flex-col justify-end">
            {trajectory.length > 0 ? (
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="forecastBandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFF76A" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#FFF76A" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Scale Labels */}
                {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                  const yPos = getY(maxVal * ratio);
                  return (
                    <g key={ratio}>
                      <line
                        x1={padding + axisLeft}
                        y1={yPos}
                        x2={chartW - padding}
                        y2={yPos}
                        stroke="#ECE5CC"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={padding + axisLeft - 6}
                        y={yPos + 3}
                        textAnchor="end"
                        fontSize="8.5"
                        fill="#8D8975"
                        fontFamily="monospace"
                      >
                        ${(maxVal * ratio).toFixed(2)}
                      </text>
                    </g>
                  );
                })}

                {/* 95% Confidence Band Polygon */}
                {bandPath && (
                  <path d={bandPath} fill="url(#forecastBandGrad)" stroke="#E5B542" strokeWidth="0.5" strokeOpacity="0.5" />
                )}

                {/* Historical Line */}
                {histPath && (
                  <path d={histPath} fill="none" stroke="#1F8A70" strokeWidth="2.5" strokeLinecap="round" />
                )}

                {/* Forecast Line */}
                {forePath && (
                  <path d={forePath} fill="none" stroke="#9A6B00" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />
                )}

                {/* Historical Points */}
                {histPoints.map((p, i) => (
                  <circle
                    key={`hist-${i}`}
                    cx={getX(i)}
                    cy={getY(p.predictedCost)}
                    r="3.5"
                    fill="#1F8A70"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  >
                    <title>{`${p.date}: $${p.predictedCost.toFixed(2)}`}</title>
                  </circle>
                ))}

                {/* Forecast Points */}
                {forePoints.map((p, i) => (
                  <circle
                    key={`fore-${i}`}
                    cx={getX(histPoints.length + i)}
                    cy={getY(p.predictedCost)}
                    r="3"
                    fill="#FFFFFF"
                    stroke="#9A6B00"
                    strokeWidth="1.5"
                  >
                    <title>{`Forecast ${p.date}: $${p.predictedCost.toFixed(2)} (95% CI: $${p.lowerBoundCost.toFixed(2)} - $${p.upperBoundCost.toFixed(2)})`}</title>
                  </circle>
                ))}
              </svg>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[12px] text-[#8D8975]">
                Insufficient historical timeline to plot forecast. Click &quot;Sync Telemetry&quot; to pull recent AWS records.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowTable(!showTable)}
              className="text-[12px] font-bold text-[#1F8A70] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{showTable ? "Hide Forward Calendar Ledger" : "View Forward 30-Day Calendar Ledger"}</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showTable ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>

        {/* Forward Calendar Ledger Table */}
        {showTable && forePoints.length > 0 && (
          <div className="pt-2 border-t border-[#ECE5CC] space-y-3 animate-in fade-in">
            <h4 className="font-bold text-[14px] text-[#2E2B1A]">Day-by-Day Forecast Schedule</h4>
            <div className="max-h-64 overflow-y-auto border border-[#ECE5CC] rounded-2xl">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[#FAF6E8] sticky top-0 border-b border-[#ECE5CC] font-mono text-[10.5px] text-[#8D8975] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Predicted Spend</th>
                    <th className="py-2.5 px-3">Lower 95% Bound</th>
                    <th className="py-2.5 px-3">Upper 95% Bound</th>
                    <th className="py-2.5 px-3">Est. Carbon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE5CC]/50">
                  {forePoints.map((p, i) => (
                    <tr key={i} className="hover:bg-[#FAF6E8]/30">
                      <td className="py-2 px-3 font-mono text-[#2E2B1A] font-bold">{p.date}</td>
                      <td className="py-2 px-3 font-mono font-bold text-[#1F8A70]">${p.predictedCost.toFixed(2)}</td>
                      <td className="py-2 px-3 font-mono text-[#8D8975]">${p.lowerBoundCost.toFixed(2)}</td>
                      <td className="py-2 px-3 font-mono text-[#9A6B00]">${p.upperBoundCost.toFixed(2)}</td>
                      <td className="py-2 px-3 font-mono text-[#686450]">{p.predictedCarbonGco2e} gCO2e</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Model Notes Card */}
        <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] space-y-2 pt-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#9A6B00]" />
            <h4 className="font-bold text-[13px] text-[#2E2B1A]">Double Exponential Smoothing Parameters</h4>
          </div>
          <p className="text-[12px] text-[#686450] leading-relaxed">
            Holt&apos;s Linear Trend algorithm dynamically fits Level (&alpha; = 0.3) and Trend (&beta; = 0.1) smoothing parameters over rolling AWS billing records. Confidence intervals expand with square-root horizon steps to accurately represent compounding variance.
          </p>
        </div>
      </div>
    </div>
  );
}
