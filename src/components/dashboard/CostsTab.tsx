"use client";

import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ComparisonSection } from "./ComparisonSection";
import { DashboardData } from "./types";

interface CostsTabProps {
  data: DashboardData;
}

function money(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "--";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CostsTab({ data }: CostsTabProps) {
  const { costs, budget, tagAllocation, anomalies, forecast, scope } = data;
  const maxServiceTotal = Math.max(1, ...(costs.byService || []).map((s) => s.total));

  return (
    <div className="gc-panel-swap space-y-6">
      {/* Billed vs Effective vs Budget vs Hygiene */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[24px] bg-[#FBE7CB]/70 p-5 space-y-2">
          <div className="text-[12.5px] font-bold text-[#6B4814]">
            Billed Spend ({scope.window.toUpperCase()})
          </div>
          <div className="text-[28px] font-extrabold text-[#2E2B1A] tabular-nums">
            {money(costs.totalCost)}
          </div>
          <div className="text-[12px] text-[#686450] tabular-nums">
            {costs.priorPeriodCost !== null
              ? `Prior ${scope.window}: ${money(costs.priorPeriodCost)}`
              : "No prior window billing data"}
          </div>
        </div>

        <div className="rounded-[24px] bg-[#E2F5EF] p-5 space-y-2">
          <div className="text-[12.5px] font-bold text-[#155E4B]">Effective Cost (FOCUS)</div>
          <div className="text-[28px] font-extrabold text-[#2E2B1A] tabular-nums">
            {money(costs.effectiveCostTotal)}
          </div>
          <div className="text-[12px] text-[#155E4B] tabular-nums">
            {money(costs.discountSavings)} commitment discount saved
          </div>
        </div>

        <div className="rounded-[24px] bg-[#FAF6E8] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-[#686450]">Budget Pace</span>
            <span className="text-[12px] font-bold text-[#2E2B1A] tabular-nums">
              {budget.pacePercentage}% of {money(budget.target)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#EAE0BE] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                budget.status === "exceeded"
                  ? "bg-[#991B1B]"
                  : budget.status === "warning"
                  ? "bg-[#9A6B00]"
                  : "bg-[#155E4B]"
              }`}
              style={{ width: `${Math.min(100, budget.pacePercentage)}%` }}
            />
          </div>
          <div className="text-[12px] text-[#686450] tabular-nums">
            Projected month-end: {money(budget.projectedMonthEnd)}
          </div>
        </div>

        <div className="rounded-[24px] bg-[#FAF6E8] p-5 space-y-2">
          <div className="text-[12.5px] font-bold text-[#686450]">Tag Allocation Hygiene</div>
          <div className="text-[28px] font-extrabold text-[#2E2B1A] tabular-nums">
            {tagAllocation.hygieneScore}%
          </div>
          <div className="text-[12px] text-[#686450] tabular-nums">
            {tagAllocation.taggedCount} tagged · {tagAllocation.untaggedCount} untagged
          </div>
        </div>
      </section>

      {/* Service Cost Bars & Environments */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-[17px] font-bold text-[#2E2B1A]">Cost by Normalized Cloud Service</h2>
            <p className="text-[12.5px] text-[#686450]">
              Unified FOCUS service breakdown across selected accounts
            </p>
          </div>

          {(costs.byService || []).length > 0 ? (
            <div className="space-y-3">
              {costs.byService.map((item) => (
                <div
                  key={`${item.provider}-${item.service}`}
                  className="rounded-[18px] bg-[#FFFDF4] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-[13px] font-bold">
                    <div className="min-w-0 truncate">
                      <span className="text-[#2E2B1A]">{item.service}</span>
                      <span className="ml-2 text-[11px] font-semibold text-[#8D8975]">
                        {item.provider.toUpperCase()} · {item.category}
                      </span>
                    </div>
                    <span className="text-[#9A6B00] tabular-nums shrink-0">{money(item.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#FAF6E8] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#9A6B00]"
                      style={{
                        width: `${Math.max(4, Math.round((item.total / maxServiceTotal) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] bg-[#FFFDF4] p-5 text-[13px] text-[#686450]">
              No service cost records in the selected {scope.window} window.
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-[17px] font-bold text-[#2E2B1A]">Spend by Environment Tag</h2>
            <p className="text-[12.5px] text-[#686450]">
              Showback grouped by Environment and CostCenter tags
            </p>
          </div>

          <div className="space-y-2.5">
            {(tagAllocation.byEnvironment || []).map((env) => (
              <div
                key={env.name}
                className="rounded-[18px] bg-[#FFFDF4] px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-[13.5px] font-bold text-[#2E2B1A]">{env.name}</div>
                  <div className="text-[11.5px] text-[#8D8975] tabular-nums">
                    {env.count} resources ({env.percentage}%)
                  </div>
                </div>
                <div className="text-[14px] font-extrabold text-[#2E2B1A] tabular-nums">
                  {money(env.cost)}
                </div>
              </div>
            ))}
          </div>

          {forecast && (
            <div className="rounded-[18px] bg-[#FFF3A8]/65 p-4 text-[12.5px] text-[#2E2B1A] space-y-1">
              <div className="font-bold">30-Day Statistical Forecast</div>
              <div className="tabular-nums text-[#5C4B05]">
                Projected next 30 days: {money(forecast.next30DaysProjectedCost)}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Account & Provider Spend Comparison */}
      {data.comparisons.byAccount.length > 0 && <ComparisonSection data={data} />}

      {/* Anomalies Feed */}
      <section className="rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-bold text-[#2E2B1A]">Spend & Region Anomalies</h2>
            <p className="text-[12.5px] text-[#686450]">{anomalies.message}</p>
          </div>
          <span className="text-[12px] font-bold text-[#2E2B1A] tabular-nums">
            {anomalies.detectedCount} detected
          </span>
        </div>

        {(anomalies.items || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {anomalies.items.map((item) => (
              <div key={item.id} className="rounded-[20px] bg-[#FFFDF4] p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#9A6B00] shrink-0" />
                    <span className="text-[13.5px] font-bold text-[#2E2B1A]">
                      {item.entityName}
                    </span>
                  </div>
                  <span className="text-[11.5px] font-semibold text-[#8D8975] tabular-nums">
                    {item.date}
                  </span>
                </div>
                <p className="text-[12.5px] text-[#686450]">{item.rootCauseHint}</p>
                <div className="text-[12px] font-semibold text-[#155E4B]">
                  {item.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] bg-[#FFFDF4] p-4 flex items-center gap-2.5 text-[13px] text-[#155E4B] font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Spend velocity is within baseline bounds with zero anomalies.</span>
          </div>
        )}
      </section>
    </div>
  );
}
