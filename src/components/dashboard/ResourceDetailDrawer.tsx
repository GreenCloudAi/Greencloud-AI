"use client";

import React from "react";
import { X } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Ec2ResourceItem, RecommendationItem } from "./types";

interface ResourceDetailDrawerProps {
  resource: Ec2ResourceItem | null;
  recommendations: RecommendationItem[];
  onClose: () => void;
  onJumpToActions: () => void;
}

export function ResourceDetailDrawer({
  resource,
  recommendations,
  onClose,
  onJumpToActions,
}: ResourceDetailDrawerProps) {
  if (!resource) return null;

  const cpuChart = (resource.cpuSeries || []).map((val, idx) => ({
    day: `D-${resource.cpuSeries.length - idx}`,
    cpu: Number(val.toFixed(1)),
  }));

  const carbon = resource.carbonEmissions?.[0];
  const linkedRecs = recommendations.filter(
    (r) => r.resource?.providerResourceId === resource.providerResourceId
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2E2B1A]/35 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <aside
        className="gc-panel-swap w-full max-w-lg h-full bg-[#FFFDF4] p-6 shadow-warm-xl overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="text-[11.5px] font-bold text-[#686450] uppercase tracking-wide">
              {resource.provider} · {resource.accountName}
            </div>
            <h2 className="text-[20px] font-extrabold text-[#2E2B1A] truncate">
              {resource.name}
            </h2>
            <div className="text-[12px] code-font text-[#8D8975]">
              {resource.providerResourceId} · {resource.instanceType} · {resource.region}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close telemetry inspector"
            className="w-8 h-8 rounded-full bg-[#FAF6E8] hover:bg-[#F5EED6] flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[18px] bg-[#FAF6E8] p-3.5">
            <div className="text-[11px] font-bold text-[#686450]">Monthly Cost</div>
            <div className="text-[18px] font-extrabold text-[#2E2B1A] tabular-nums mt-1">
              ${resource.monthlyCost.toFixed(2)}
            </div>
          </div>
          <div className="rounded-[18px] bg-[#FAF6E8] p-3.5">
            <div className="text-[11px] font-bold text-[#686450]">Avg / Peak CPU</div>
            <div className="text-[18px] font-extrabold text-[#2E2B1A] tabular-nums mt-1">
              {resource.avgCpu !== null ? `${resource.avgCpu.toFixed(1)}%` : "--"}
              {resource.peakCpu !== null ? ` / ${resource.peakCpu.toFixed(0)}%` : ""}
            </div>
          </div>
          <div className="rounded-[18px] bg-[#E2F5EF] p-3.5">
            <div className="text-[11px] font-bold text-[#155E4B]">Grid Intensity</div>
            <div className="text-[18px] font-extrabold text-[#2E2B1A] tabular-nums mt-1">
              {resource.gridIntensity} g
            </div>
          </div>
        </div>

        {/* Daily CPU Utilization Graph */}
        <div className="rounded-[22px] bg-[#FAF6E8] p-4 space-y-2.5">
          <div className="text-[13px] font-bold text-[#2E2B1A]">
            CPU Utilization Series (CloudWatch Lookback)
          </div>
          <div className="rounded-[16px] bg-[#FFFDF4] p-3 h-48">
            {cpuChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuChart} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuSeriesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#155E4B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#155E4B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EDE7D2" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8D8975" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#8D8975" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#2E2B1A",
                      border: "none",
                      borderRadius: "12px",
                      color: "#FFFDF4",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU %"
                    stroke="#155E4B"
                    strokeWidth={2}
                    fill="url(#cpuSeriesFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[12.5px] text-[#686450]">
                No daily CloudWatch CPU points stored for this asset yet.
              </div>
            )}
          </div>
        </div>

        {/* Carbon Footprint Math */}
        {carbon && (
          <div className="rounded-[22px] bg-[#FAF6E8] p-4 space-y-2">
            <div className="text-[13px] font-bold text-[#2E2B1A]">
              Daily Energy & Carbon Model ({resource.regionName})
            </div>
            <div className="grid grid-cols-3 gap-2 text-[12px] tabular-nums">
              <div className="rounded-xl bg-[#FFFDF4] p-2.5">
                <div className="text-[#8D8975]">Energy</div>
                <div className="font-bold text-[#2E2B1A]">{carbon.energyKwh.toFixed(3)} kWh</div>
              </div>
              <div className="rounded-xl bg-[#FFFDF4] p-2.5">
                <div className="text-[#8D8975]">Operational</div>
                <div className="font-bold text-[#155E4B]">{carbon.operationalGco2e.toFixed(1)} g</div>
              </div>
              <div className="rounded-xl bg-[#FFFDF4] p-2.5">
                <div className="text-[#8D8975]">Embodied</div>
                <div className="font-bold text-[#2E2B1A]">{carbon.embodiedGco2e.toFixed(1)} g</div>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="rounded-[22px] bg-[#FAF6E8] p-4 space-y-2.5">
          <div className="text-[13px] font-bold text-[#2E2B1A]">Resource Tags</div>
          {resource.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {resource.tags.map((t, idx) => (
                <span
                  key={`${t.Key}-${idx}`}
                  className="rounded-full bg-[#FFFDF4] px-3 py-1 text-[11.5px] font-semibold text-[#2E2B1A]"
                >
                  <span className="text-[#8D8975]">{t.Key}:</span> {t.Value}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[12px] text-[#8D8975]">No allocation tags attached.</div>
          )}
        </div>

        {/* Linked Actions */}
        {linkedRecs.length > 0 && (
          <div className="rounded-[22px] bg-[#FFF3A8] p-4 space-y-2">
            <div className="text-[13px] font-bold text-[#2E2B1A]">
              Active Recommendations ({linkedRecs.length})
            </div>
            {linkedRecs.map((rec) => (
              <div key={rec.id} className="text-[12.5px] text-[#3D3616]">
                {rec.title} — save ${rec.estimatedMonthlySavings.toFixed(2)}/mo
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                onClose();
                onJumpToActions();
              }}
              className="m3-btn m3-btn-compact bg-[#FFFDF4] text-[#2E2B1A] mt-1 text-[12px]"
            >
              Review Terraform diff
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
