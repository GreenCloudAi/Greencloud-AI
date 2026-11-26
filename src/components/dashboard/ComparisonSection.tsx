"use client";

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CloudProviderId, DashboardData } from "./types";

interface ComparisonSectionProps {
  data: DashboardData;
}

const PROVIDER_META: Record<CloudProviderId, { name: string; icon: string }> = {
  aws: { name: "Amazon Web Services", icon: "/icons/aws-dark.svg" },
  gcp: { name: "Google Cloud Platform", icon: "/icons/gcp.svg" },
  azure: { name: "Microsoft Azure", icon: "/icons/azure.svg" },
};

function fmtMoney(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ComparisonSection({ data }: ComparisonSectionProps) {
  const accounts = data.comparisons.byAccount || [];
  const providers = data.comparisons.byProvider || [];
  const regions = (data.resources.byRegion || []).sort((a, b) => b.monthlyCost - a.monthlyCost);

  const [compareMode, setCompareMode] = useState<"accounts" | "providers" | "regions">(
    providers.length > 1 ? "providers" : "accounts"
  );
  const [leftId, setLeftId] = useState<string>(accounts[0]?.id || "");
  const [rightId, setRightId] = useState<string>(accounts[1]?.id || accounts[0]?.id || "");

  const leftAccount = useMemo(
    () => accounts.find((a) => a.id === leftId) || accounts[0] || null,
    [accounts, leftId]
  );
  const rightAccount = useMemo(
    () => accounts.find((a) => a.id === rightId) || accounts[1] || accounts[0] || null,
    [accounts, rightId]
  );

  return (
    <div className="gc-panel-swap space-y-5">
      {/* Mode Selector */}
      <div className="rounded-[24px] bg-[#FAF6E8] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16.5px] font-bold text-[#2E2B1A]">
            Multi-Account & Cloud Comparison
          </h2>
          <p className="text-[12.5px] text-[#686450]">
            Compare selected accounts, hyperscalers, and regional intensity side by side
          </p>
        </div>

        <div className="m3-connected-h">
          {[
            { id: "accounts" as const, label: `Accounts (${accounts.length})` },
            { id: "providers" as const, label: `Providers (${providers.length})` },
            { id: "regions" as const, label: `Regions (${regions.length})` },
          ].map((m) => {
            const selected = compareMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                data-selected={selected ? "true" : "false"}
                onClick={() => setCompareMode(m.id)}
                className={`m3-seg ${
                  selected
                    ? "bg-[#FFF76A] text-[#2E2B1A]"
                    : "bg-[#FFFDF4] text-[#686450] hover:text-[#2E2B1A]"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ACCOUNT VS ACCOUNT + RANKED MATRIX */}
      {compareMode === "accounts" && (
        <div className="space-y-5">
          {accounts.length >= 2 && leftAccount && rightAccount && (
            <div className="rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[15px] font-bold text-[#2E2B1A]">Side-by-Side Diff</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Left account comparison"
                    value={leftAccount.id}
                    onChange={(e) => setLeftId(e.target.value)}
                    className="rounded-xl bg-[#FFFDF4] px-3 py-1.5 text-[12.5px] font-semibold text-[#2E2B1A]"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.provider.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <span className="text-[12px] font-bold text-[#8D8975]">vs</span>
                  <select
                    aria-label="Right account comparison"
                    value={rightAccount.id}
                    onChange={(e) => setRightId(e.target.value)}
                    className="rounded-xl bg-[#FFFDF4] px-3 py-1.5 text-[12.5px] font-semibold text-[#2E2B1A]"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.provider.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Monthly Billed Spend",
                    left: fmtMoney(leftAccount.monthlySpend),
                    right: fmtMoney(rightAccount.monthlySpend),
                    delta: fmtMoney(leftAccount.monthlySpend - rightAccount.monthlySpend),
                  },
                  {
                    label: "Potential Savings",
                    left: fmtMoney(leftAccount.potentialSavings),
                    right: fmtMoney(rightAccount.potentialSavings),
                    delta: `${leftAccount.activeRecCount} vs ${rightAccount.activeRecCount} actions`,
                  },
                  {
                    label: "Operational Carbon",
                    left: `${(leftAccount.operationalCarbonG / 1000).toFixed(2)} kg`,
                    right: `${(rightAccount.operationalCarbonG / 1000).toFixed(2)} kg`,
                    delta: `${leftAccount.resourceCount} vs ${rightAccount.resourceCount} assets`,
                  },
                  {
                    label: "Mean Compute CPU",
                    left: leftAccount.avgCpu !== null ? `${leftAccount.avgCpu}%` : "--",
                    right: rightAccount.avgCpu !== null ? `${rightAccount.avgCpu}%` : "--",
                    delta: `${leftAccount.ec2Count} vs ${rightAccount.ec2Count} compute`,
                  },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-[20px] bg-[#FFFDF4] p-4 space-y-2">
                    <div className="text-[11.5px] font-bold text-[#686450]">{metric.label}</div>
                    <div className="flex items-baseline justify-between gap-2 tabular-nums">
                      <span className="text-[17px] font-extrabold text-[#2E2B1A]">
                        {metric.left}
                      </span>
                      <span className="text-[13px] font-bold text-[#8D8975]">
                        {metric.right}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#155E4B] tabular-nums">
                      Delta: {metric.delta}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart + Table across all selected accounts */}
          <div className="rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
            <div className="text-[15px] font-bold text-[#2E2B1A]">
              Selected Accounts Rollup
            </div>
            {accounts.length > 0 ? (
              <>
                <div className="rounded-[20px] bg-[#FFFDF4] p-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={accounts} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="#EDE7D2" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#686450" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#8D8975" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#2E2B1A",
                          border: "none",
                          borderRadius: "12px",
                          color: "#FFFDF4",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="monthlySpend" name="Monthly Spend ($)" fill="#9A6B00" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="potentialSavings" name="Potential Savings ($)" fill="#155E4B" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-2 min-w-[640px]">
                    <thead>
                      <tr className="text-[11.5px] font-bold text-[#686450]">
                        <th className="py-1.5 px-3">Account</th>
                        <th className="py-1.5 px-3">Provider</th>
                        <th className="py-1.5 px-3">Resources</th>
                        <th className="py-1.5 px-3">Billed Spend</th>
                        <th className="py-1.5 px-3">Effective Cost</th>
                        <th className="py-1.5 px-3 text-right">Savings Opportunity</th>
                      </tr>
                    </thead>
                    <tbody className="text-[13px]">
                      {accounts.map((acc) => (
                        <tr key={acc.id} className="bg-[#FFFDF4]">
                          <td className="py-3 px-3 rounded-l-[14px] font-bold text-[#2E2B1A]">
                            {acc.name}
                            <div className="text-[11px] font-normal text-[#8D8975] code-font">
                              {acc.externalAccountId}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <img
                              src={PROVIDER_META[acc.provider].icon}
                              alt={acc.provider}
                              className="h-4 w-auto object-contain"
                            />
                          </td>
                          <td className="py-3 px-3 tabular-nums text-[#686450]">
                            {acc.resourceCount} ({acc.ec2Count} compute)
                          </td>
                          <td className="py-3 px-3 tabular-nums font-bold">
                            {fmtMoney(acc.monthlySpend)}
                          </td>
                          <td className="py-3 px-3 tabular-nums text-[#686450]">
                            {fmtMoney(acc.effectiveCost)}
                          </td>
                          <td className="py-3 px-3 rounded-r-[14px] text-right font-extrabold text-[#155E4B] tabular-nums">
                            {fmtMoney(acc.potentialSavings)}/mo
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-[18px] bg-[#FFFDF4] p-5 text-[13px] text-[#686450]">
                Select or import accounts to view cross-account comparisons.
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROVIDER VS PROVIDER */}
      {compareMode === "providers" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["aws", "gcp", "azure"] as CloudProviderId[]).map((provId) => {
            const p = providers.find((item) => item.provider === provId);
            return (
              <div key={provId} className="rounded-[24px] bg-[#FAF6E8] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <img
                    src={PROVIDER_META[provId].icon}
                    alt={PROVIDER_META[provId].name}
                    className="h-6 w-auto object-contain"
                  />
                  <span className="text-[11.5px] font-bold text-[#686450] tabular-nums">
                    {p ? `${p.accountCount} account(s)` : "Not connected"}
                  </span>
                </div>
                <div>
                  <div className="text-[15.5px] font-bold text-[#2E2B1A]">
                    {PROVIDER_META[provId].name}
                  </div>
                  <div className="text-[24px] font-extrabold text-[#2E2B1A] tabular-nums mt-1">
                    {p ? fmtMoney(p.monthlySpend) : "$0.00"}
                  </div>
                </div>
                <div className="rounded-[16px] bg-[#FFFDF4] p-3.5 space-y-1.5 text-[12px] tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[#686450]">Effective Cost</span>
                    <span className="font-bold">{p ? fmtMoney(p.effectiveCost) : "--"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#686450]">Potential Savings</span>
                    <span className="font-bold text-[#155E4B]">
                      {p ? fmtMoney(p.potentialSavings) : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#686450]">Operational CO2e</span>
                    <span className="font-bold">
                      {p ? `${(p.operationalCarbonG / 1000).toFixed(2)} kg` : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#686450]">Resources</span>
                    <span className="font-bold">{p ? p.resourceCount : 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REGION VS REGION TRADE-OFF */}
      {compareMode === "regions" && (
        <div className="rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
          <div className="text-[15px] font-bold text-[#2E2B1A]">
            Active Cloud Regions: Spend vs. Grid Intensity
          </div>
          {regions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {regions.map((reg) => (
                <div key={reg.region} className="rounded-[20px] bg-[#FFFDF4] p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[14px] font-bold text-[#2E2B1A]">{reg.region}</div>
                      <div className="text-[11.5px] text-[#686450]">{reg.name}</div>
                    </div>
                    <img
                      src={PROVIDER_META[reg.provider].icon}
                      alt={reg.provider}
                      className="h-4 w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[12.5px] tabular-nums pt-1">
                    <span className="font-extrabold text-[#2E2B1A]">
                      {fmtMoney(reg.monthlyCost)}/mo
                    </span>
                    <span
                      className={`font-bold ${
                        reg.gridIntensity <= 150
                          ? "text-[#155E4B]"
                          : reg.gridIntensity >= 450
                          ? "text-[#991B1B]"
                          : "text-[#9A6B00]"
                      }`}
                    >
                      {reg.gridIntensity} g CO2e/kWh
                    </span>
                  </div>
                  <div className="text-[11.5px] text-[#8D8975] tabular-nums">
                    {reg.resourceCount} assets across {reg.accountCount} account(s)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] bg-[#FFFDF4] p-5 text-[13px] text-[#686450]">
              No active cloud regions recorded yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
