"use client";

import React, { useMemo, useState } from "react";
import { CloudProviderId, DashboardData } from "./types";

interface CarbonTabProps {
  data: DashboardData;
  isReadOnly: boolean;
  onSaveUnits?: (units: number) => Promise<void>;
}

function fmtCarbon(grams: number | null | undefined) {
  if (grams === null || grams === undefined || Number.isNaN(grams)) return "--";
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${grams.toFixed(0)} g`;
}

export function CarbonTab({ data, isReadOnly, onSaveUnits }: CarbonTabProps) {
  const { carbon } = data;
  const [unitSlider, setUnitSlider] = useState<number>(carbon.functionalUnits || 100000);
  const [gridFilter, setGridFilter] = useState<"active" | "all" | CloudProviderId>("active");
  const [savingUnits, setSavingUnits] = useState(false);

  const totalG = carbon.totalCarbon ?? 0;
  const liveSci = unitSlider > 0 ? totalG / unitSlider : 0;

  const filteredGrid = useMemo(() => {
    const items = carbon.regionalGrid || [];
    if (gridFilter === "active") {
      const activeOnly = items.filter((r) => r.resourceCount > 0);
      return activeOnly.length > 0 ? activeOnly : items.slice(0, 9);
    }
    if (gridFilter === "all") return items;
    return items.filter((r) => r.provider === gridFilter);
  }, [carbon.regionalGrid, gridFilter]);

  const handlePersistUnits = async () => {
    if (!onSaveUnits || isReadOnly) return;
    setSavingUnits(true);
    try {
      await onSaveUnits(unitSlider);
    } finally {
      setSavingUnits(false);
    }
  };

  return (
    <div className="gc-panel-swap space-y-6">
      {/* Operational, Embodied, Combined & SCI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[24px] bg-[#E2F5EF] p-5 space-y-2">
          <div className="text-[12.5px] font-bold text-[#155E4B]">Operational CO2e</div>
          <div className="text-[26px] font-extrabold text-[#2E2B1A] tabular-nums">
            {fmtCarbon(carbon.totalOperationalCarbon)}
          </div>
          <div className="text-[12px] text-[#155E4B]">Runtime kWh x grid intensity</div>
        </div>

        <div className="rounded-[24px] bg-[#FAF6E8] p-5 space-y-2">
          <div className="text-[12.5px] font-bold text-[#686450]">Embodied Hardware</div>
          <div className="text-[26px] font-extrabold text-[#2E2B1A] tabular-nums">
            {fmtCarbon(carbon.totalEmbodiedCarbon)}
          </div>
          <div className="text-[12px] text-[#686450]">Scope 3 amortized server LCA</div>
        </div>

        <div className="rounded-[24px] bg-[#FAF6E8] p-5 space-y-2">
          <div className="text-[12.5px] font-bold text-[#686450]">Combined Footprint</div>
          <div className="text-[26px] font-extrabold text-[#2E2B1A] tabular-nums">
            {fmtCarbon(carbon.totalCarbon)}
          </div>
          <div className="text-[12px] text-[#686450]">
            {carbon.cleanGridSharePct}% resources in clean grids
          </div>
        </div>

        <div className="rounded-[24px] bg-[#FFF3A8]/80 p-5 space-y-2">
          <div className="text-[12.5px] font-bold text-[#5C4B05]">SCI Intensity</div>
          <div className="text-[26px] font-extrabold text-[#2E2B1A] tabular-nums">
            {liveSci > 0 ? liveSci.toFixed(4) : "0.0000"}
          </div>
          <div className="text-[12px] text-[#5C4B05]">g CO2e per request unit</div>
        </div>
      </section>

      {/* SCI Interactive Model Card */}
      <section className="rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold text-[#2E2B1A]">
              Software Carbon Intensity (SCI = (O + M) / R)
            </h2>
            <p className="text-[12.5px] text-[#686450]">
              Adjust functional throughput units (R) to model workload carbon efficiency
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full bg-[#FFFDF4] px-4 py-1.5 text-[13px] font-bold text-[#2E2B1A] tabular-nums">
              R = {unitSlider.toLocaleString("en-US")} units
            </div>
            {!isReadOnly && unitSlider !== carbon.functionalUnits && onSaveUnits && (
              <button
                type="button"
                disabled={savingUnits}
                onClick={handlePersistUnits}
                className="m3-btn m3-btn-compact m3-pastel-sun text-[12px]"
              >
                {savingUnits ? "Saving..." : "Save R to workspace"}
              </button>
            )}
          </div>
        </div>

        <input
          type="range"
          min={10000}
          max={500000}
          step={10000}
          value={unitSlider}
          onChange={(e) => setUnitSlider(Number(e.target.value))}
          aria-label="Functional throughput units"
          className="w-full accent-[#155E4B] cursor-pointer"
        />
      </section>

      {/* Multi-Cloud Regional Grid Carbon Matrix */}
      <section className="rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold text-[#2E2B1A]">
              Multi-Cloud Regional Grid Intensity
            </h2>
            <p className="text-[12.5px] text-[#686450]">
              Compare AWS, GCP, and Azure regional carbon intensity & live deployed assets
            </p>
          </div>

          <div className="m3-connected-h">
            {[
              { id: "active" as const, label: "Deployed" },
              { id: "all" as const, label: "All Regions" },
              { id: "aws" as const, label: "AWS" },
              { id: "gcp" as const, label: "GCP" },
              { id: "azure" as const, label: "Azure" },
            ].map((f) => {
              const selected = gridFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  data-selected={selected ? "true" : "false"}
                  onClick={() => setGridFilter(f.id)}
                  className={`m3-seg ${
                    selected
                      ? "bg-[#FFF76A] text-[#2E2B1A]"
                      : "bg-[#FFFDF4] text-[#686450] hover:text-[#2E2B1A]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredGrid.map((reg) => {
            const isClean = reg.gridIntensity <= 150;
            const isHigh = reg.gridIntensity >= 450;
            return (
              <div
                key={`${reg.provider}-${reg.region}`}
                className="rounded-[20px] bg-[#FFFDF4] p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[13.5px] font-bold text-[#2E2B1A]">
                      {reg.region}
                    </div>
                    <div className="text-[12px] text-[#686450]">
                      {reg.name} · {reg.provider.toUpperCase()}
                    </div>
                  </div>
                  <span
                    className={`text-[12px] font-bold tabular-nums ${
                      isClean
                        ? "text-[#155E4B]"
                        : isHigh
                        ? "text-[#991B1B]"
                        : "text-[#9A6B00]"
                    }`}
                  >
                    {reg.gridIntensity} g/kWh
                  </span>
                </div>

                <div className="h-2 rounded-full bg-[#FAF6E8] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isClean
                        ? "bg-[#155E4B]"
                        : isHigh
                        ? "bg-[#991B1B]"
                        : "bg-[#9A6B00]"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((reg.gridIntensity / 700) * 100))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11.5px] text-[#8D8975] tabular-nums">
                  <span>{reg.mix}</span>
                  <span className="font-semibold text-[#2E2B1A]">
                    {reg.resourceCount} assets · {fmtCarbon(reg.estimatedCarbonGco2e)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
