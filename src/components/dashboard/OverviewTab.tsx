"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lock } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AccountCoverage } from "./AccountCoverage";
import { ComparisonSection } from "./ComparisonSection";
import { DashboardData, DashboardTab, RoleFilter, TimeWindow } from "./types";

interface OverviewTabProps {
  data: DashboardData;
  timeWindow: TimeWindow;
  roleFilter: RoleFilter;
  onSelectTab: (tab: DashboardTab) => void;
  onSync: () => void;
  syncing: boolean;
  onOpenFocusImport: () => void;
}

type ViewMode = "overview" | "graphs" | "comparison";

function formatMoney(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "--";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCarbon(grams: number | null | undefined) {
  if (grams === null || grams === undefined || Number.isNaN(grams)) return "--";
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg CO2e`;
  return `${grams.toFixed(0)} g CO2e`;
}

export function OverviewTab({
  data,
  timeWindow,
  roleFilter,
  onSelectTab,
  onSync,
  syncing,
  onOpenFocusImport,
}: OverviewTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  const {
    account,
    selectedAccounts,
    costs,
    carbon,
    resources,
    recommendations,
    scanCoverage,
    inventory,
    budget,
    cpuDistribution,
    auditLogs,
    comparisons,
  } = data;

  const isReadOnly = data.accessMode === "scoped" || roleFilter === "viewer";
  const billingCurrencies = new Set(comparisons.byAccount.flatMap((account) =>
    (account.billingTotals ?? []).map(({ currency }) => currency)
  ));
  const hasComparableUsdBilling = billingCurrencies.size === 1 && billingCurrencies.has("USD");

  const chartData = useMemo(() => {
    const windowDays = timeWindow === "7d" ? 7 : timeWindow === "90d" ? 90 : 30;
    if (!hasComparableUsdBilling) return [];
    const trajectory = data.forecast?.trajectory ?? [];
    if (trajectory.length > 0) {
      const historical = trajectory.filter((pt) => !pt.isForecast).slice(-windowDays);
      const projected = trajectory.filter((pt) => pt.isForecast);
      return [...historical, ...projected].map((pt) => ({
        label: pt.date.slice(5),
        spend: pt.predictedCost ?? pt.actualCost ?? pt.projectedCost ?? null,
      }));
    }
    return (costs.dailyTrend || []).slice(-windowDays).map((d) => ({
      label: d.date.slice(5),
      spend: d.cost,
    }));
  }, [costs.dailyTrend, data.forecast?.trajectory, hasComparableUsdBilling, timeWindow]);

  const cpuBandBars = useMemo(
    () => [
      { band: "0-20%", count: cpuDistribution.band0_20 },
      { band: "20-50%", count: cpuDistribution.band20_50 },
      { band: "50-80%", count: cpuDistribution.band50_80 },
      { band: "80%+", count: cpuDistribution.band80_plus },
    ],
    [cpuDistribution]
  );

  const activeRecs = useMemo(
    () => (recommendations.items || []).filter((r) => r.status === "active").slice(0, 3),
    [recommendations.items]
  );

  if (!account && (data.allAccounts.length > 0 || isReadOnly)) {
    return <p className="rounded-[24px] bg-[#FAF6E8] p-6">No accounts match the current selection.</p>;
  }

  if (!account) {
    return (
      <div className="gc-panel-swap rounded-[28px] bg-[#FAF6E8] p-8 sm:p-12 text-center max-w-2xl mx-auto mt-6 space-y-5">
        <div className="flex items-center justify-center gap-4">
          <img src="/icons/aws-dark.svg" alt="AWS" className="h-7 w-auto object-contain" />
          <img src="/icons/gcp.svg" alt="GCP" className="h-7 w-auto object-contain" />
          <img src="/icons/azure.svg" alt="Azure" className="h-7 w-auto object-contain" />
        </div>
        <div className="space-y-2">
          <h2 className="text-[24px] font-extrabold tracking-tight text-[#2E2B1A]">
            Connect a cloud account or import FOCUS billing
          </h2>
          <p className="text-[14.5px] text-[#686450] max-w-md mx-auto leading-relaxed">
            Link an AWS IAM Role for live telemetry or ingest CNCF FOCUS billing exports from GCP, Azure, or AWS to analyze accounts together.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link href="/onboarding" prefetch={true} className="m3-btn m3-pastel-sun">
            <span>Connect AWS IAM</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button type="button" onClick={onOpenFocusImport} className="m3-btn m3-pastel-oat">
            <span>Import FOCUS CSV/JSON</span>
          </button>
        </div>
      </div>
    );
  }

  // Role-Tailored 4 KPI Cards (zero hardcoding; computed from real selected accounts)
  const roleKpiCards = (() => {
    const priorDelta =
      hasComparableUsdBilling && costs.totalCost !== null && costs.priorPeriodCost !== null && costs.priorPeriodCost > 0
        ? `${(((costs.totalCost - costs.priorPeriodCost) / costs.priorPeriodCost) * 100).toFixed(1)}% vs prior ${timeWindow}`
        : costs.dailyBurnRate !== null
        ? `${formatMoney(costs.dailyBurnRate)}/day burn`
        : "Awaiting billing records";

    switch (roleFilter) {
      case "admin":
        return [
          {
            title: "Consolidated Spend",
            value: formatMoney(hasComparableUsdBilling ? costs.totalCost : null),
            sub: priorDelta,
            bg: "bg-[#FBE7CB]/70 hover:bg-[#FBE7CB]",
            ink: "text-[#6B4814]",
            icon: "payments",
            tab: "costs" as DashboardTab,
          },
          {
            title: "Selected Scope",
            value: `${selectedAccounts.length} account${selectedAccounts.length === 1 ? "" : "s"}`,
            sub: `${comparisons.byProvider.length} cloud provider(s) active`,
            bg: "bg-[#FAF6E8] hover:bg-[#F5EED6]",
            ink: "text-[#686450]",
            icon: "admin_panel_settings",
            tab: "resources" as DashboardTab,
          },
          {
            title: "Actionable Savings",
            value: `${formatMoney(recommendations.totalSavings || 0)}/mo`,
            sub: `${recommendations.activeCount} pending review(s)`,
            bg: "bg-[#FFF3A8]/80 hover:bg-[#FFF3A8]",
            ink: "text-[#5C4B05]",
            icon: "trending_down",
            tab: "actions" as DashboardTab,
          },
          {
            title: "Audit Trail",
            value: `${auditLogs.length} events`,
            sub: `${resources.total} monitored cloud assets`,
            bg: "bg-[#E2F5EF] hover:bg-[#D7F0E4]",
            ink: "text-[#155E4B]",
            icon: "verified_user",
            tab: "carbon" as DashboardTab,
          },
        ];

      case "finops":
        return [
          {
            title: "Billed Cloud Spend",
            value: formatMoney(hasComparableUsdBilling ? costs.totalCost : null),
            sub: priorDelta,
            bg: "bg-[#FBE7CB]/70 hover:bg-[#FBE7CB]",
            ink: "text-[#6B4814]",
            icon: "payments",
            tab: "costs" as DashboardTab,
          },
          {
            title: "Effective Cost",
            value: formatMoney(hasComparableUsdBilling ? costs.effectiveCostTotal : null),
            sub: hasComparableUsdBilling ? `${formatMoney(costs.discountSavings)} commitment savings` : "See account billing coverage",
            bg: "bg-[#FAF6E8] hover:bg-[#F5EED6]",
            ink: "text-[#686450]",
            icon: "savings",
            tab: "costs" as DashboardTab,
          },
          {
            title: "Budget Pace",
            value: hasComparableUsdBilling && selectedAccounts.length === data.allAccounts.length ? `${budget.pacePercentage}%` : "—",
            sub: `Target: ${formatMoney(budget.target)}/mo`,
            bg: budget.status === "exceeded" ? "bg-[#FEE2E2]" : "bg-[#E2F5EF]",
            ink: budget.status === "exceeded" ? "text-[#991B1B]" : "text-[#155E4B]",
            icon: "speed",
            tab: "costs" as DashboardTab,
          },
          {
            title: "Reclaimable Waste",
            value: `${formatMoney(recommendations.totalSavings || 0)}/mo`,
            sub: `${data.anomalies.detectedCount} anomaly signal(s)`,
            bg: "bg-[#FFF3A8]/80 hover:bg-[#FFF3A8]",
            ink: "text-[#5C4B05]",
            icon: "trending_down",
            tab: "actions" as DashboardTab,
          },
        ];

      case "devops":
        return [
          {
            title: "Compute Fleet",
            value: `${resources.runningEc2Count} / ${inventory.ec2Total}`,
            sub: "Running vs total compute nodes",
            bg: "bg-[#FAF6E8] hover:bg-[#F5EED6]",
            ink: "text-[#686450]",
            icon: "dns",
            tab: "resources" as DashboardTab,
          },
          {
            title: "Idle & Stopped",
            value: `${resources.byState.underutilized + resources.byState.stopped}`,
            sub: `${inventory.ebsIdle} unattached EBS · ${inventory.eipUnused} idle IPs`,
            bg: "bg-[#FBE7CB]/70 hover:bg-[#FBE7CB]",
            ink: "text-[#6B4814]",
            icon: "build_circle",
            tab: "resources" as DashboardTab,
          },
          {
            title: "Recommendations to review",
            value: `${recommendations.activeCount} ready`,
            sub: `${formatMoney(recommendations.totalSavings || 0)}/mo savings`,
            bg: "bg-[#FFF3A8]/80 hover:bg-[#FFF3A8]",
            ink: "text-[#5C4B05]",
            icon: "code",
            tab: "actions" as DashboardTab,
          },
          {
            title: "Peak Headroom",
            value: `${resources.byState.peak} high load`,
            sub: `${resources.byState.healthy} nodes in 20-80% CPU`,
            bg: "bg-[#E2F5EF] hover:bg-[#D7F0E4]",
            ink: "text-[#155E4B]",
            icon: "monitoring",
            tab: "resources" as DashboardTab,
          },
        ];

      case "architect":
        return [
          {
            title: "Active Regions",
            value: `${resources.byRegion.length} active`,
            sub: `${scanCoverage.totalMonitoredRegions} global regions cataloged`,
            bg: "bg-[#FAF6E8] hover:bg-[#F5EED6]",
            ink: "text-[#686450]",
            icon: "public",
            tab: "resources" as DashboardTab,
          },
          {
            title: "Multi-Region Compute",
            value: `${scanCoverage.activeRegionsWithRunningCompute.length} regions`,
            sub: scanCoverage.isMultiRegionRunning
              ? "Active across multiple regions"
              : "Single primary compute region",
            bg: "bg-[#FBE7CB]/70 hover:bg-[#FBE7CB]",
            ink: "text-[#6B4814]",
            icon: "account_tree",
            tab: "costs" as DashboardTab,
          },
          {
            title: "Clean-Grid Share",
            value: `${carbon.cleanGridSharePct}%`,
            sub: "Assets in <=210 gCO2e/kWh regions",
            bg: "bg-[#E2F5EF] hover:bg-[#D7F0E4]",
            ink: "text-[#155E4B]",
            icon: "energy_savings_leaf",
            tab: "carbon" as DashboardTab,
          },
          {
            title: "Rightsizing Scope",
            value: `${formatMoney(recommendations.totalSavings || 0)}/mo`,
            sub: `${cpuDistribution.oversizedCount} nodes <20% utilization`,
            bg: "bg-[#FFF3A8]/80 hover:bg-[#FFF3A8]",
            ink: "text-[#5C4B05]",
            icon: "tune",
            tab: "actions" as DashboardTab,
          },
        ];

      case "sustainability":
        return [
          {
            title: "Operational CO2e",
            value: formatCarbon(carbon.totalOperationalCarbon),
            sub: "Compute & storage runtime energy",
            bg: "bg-[#E2F5EF] hover:bg-[#D7F0E4]",
            ink: "text-[#155E4B]",
            icon: "eco",
            tab: "carbon" as DashboardTab,
          },
          {
            title: "Embodied Hardware",
            value: formatCarbon(carbon.totalEmbodiedCarbon),
            sub: "Amortized server manufacturing",
            bg: "bg-[#FAF6E8] hover:bg-[#F5EED6]",
            ink: "text-[#686450]",
            icon: "memory",
            tab: "carbon" as DashboardTab,
          },
          {
            title: "SCI Score",
            value: carbon.sciScore !== null ? `${carbon.sciScore.toFixed(4)} g` : "--",
            sub: `Per unit (${carbon.functionalUnits.toLocaleString("en-US")} units)`,
            bg: "bg-[#FFF3A8]/80 hover:bg-[#FFF3A8]",
            ink: "text-[#5C4B05]",
            icon: "science",
            tab: "carbon" as DashboardTab,
          },
          {
            title: "Clean-Grid Workload",
            value: `${carbon.cleanGridSharePct}%`,
            sub: `${formatCarbon(recommendations.totalCarbonSavings || 0)}/mo reducible`,
            bg: "bg-[#FBE7CB]/70 hover:bg-[#FBE7CB]",
            ink: "text-[#6B4814]",
            icon: "bolt",
            tab: "actions" as DashboardTab,
          },
        ];

      case "viewer":
      default:
        return [
          {
            title: "Monthly Cloud Spend",
            value: formatMoney(hasComparableUsdBilling ? costs.totalCost : null),
            sub: priorDelta,
            bg: "bg-[#FBE7CB]/70",
            ink: "text-[#6B4814]",
            icon: "payments",
            tab: "costs" as DashboardTab,
          },
          {
            title: "Savings Opportunity",
            value: `${formatMoney(recommendations.totalSavings || 0)}/mo`,
            sub: `${recommendations.activeCount} identified opportunities`,
            bg: "bg-[#FFF3A8]/80",
            ink: "text-[#5C4B05]",
            icon: "trending_down",
            tab: "actions" as DashboardTab,
          },
          {
            title: "Carbon Footprint",
            value: formatCarbon(carbon.totalOperationalCarbon),
            sub: `${carbon.cleanGridSharePct}% in low-carbon regions`,
            bg: "bg-[#E2F5EF]",
            ink: "text-[#155E4B]",
            icon: "eco",
            tab: "carbon" as DashboardTab,
          },
          {
            title: "Asset Summary",
            value: `${resources.total} assets`,
            sub: `${selectedAccounts.length} connected account(s)`,
            bg: "bg-[#FAF6E8]",
            ink: "text-[#686450]",
            icon: "dns",
            tab: "resources" as DashboardTab,
          },
        ];
    }
  })();

  return (
    <div className="gc-panel-swap space-y-6">
      {/* Compact Progressive Display Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="m3-connected-h bg-[#FAF6E8] p-1 rounded-full">
          {[
            { id: "overview" as const, label: "Overview" },
            { id: "graphs" as const, label: "Graphs" },
            { id: "comparison" as const, label: "Comparison" },
          ].map((mode) => {
            const selected = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                data-selected={selected ? "true" : "false"}
                onClick={() => setViewMode(mode.id)}
                className={`m3-seg min-h-[32px] px-3.5 text-[12.5px] ${
                  selected
                    ? "bg-[#FFF76A] text-[#2E2B1A]"
                    : "bg-transparent text-[#686450] hover:text-[#2E2B1A]"
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {isReadOnly && (
          <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#686450]">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-Only Viewer summary active</span>
          </div>
        )}
      </div>

      {/* Role-Specific 4 KPI Cards (Always Visible Above Fold) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {roleKpiCards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => onSelectTab(card.tab)}
            className={`cursor-pointer rounded-[24px] p-5 text-left transition-colors flex flex-col justify-between gap-4 ${card.bg}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[12.5px] font-bold ${card.ink}`}>{card.title}</span>
              <span className={`material-symbols-outlined icon-filled text-[20px] ${card.ink}`}>
                {card.icon}
              </span>
            </div>
            <div>
              <div className="text-[27px] font-extrabold tracking-tight text-[#2E2B1A] tabular-nums leading-none">
                {card.value}
              </div>
              <div className="text-[12px] text-[#686450] mt-2 tabular-nums">{card.sub}</div>
            </div>
          </button>
        ))}
      </section>

      {/* MODE 1: ROLE-TAILORED OVERVIEW */}
      {viewMode === "overview" && (
        <div className="space-y-6">
          <AccountCoverage data={data} role={roleFilter} onSelectTab={onSelectTab} />
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Shared Trajectory Graph */}
            <div className="lg:col-span-8 rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-bold text-[#2E2B1A]">
                    Spend trajectory
                  </h2>
                  <p className="text-[12.5px] text-[#686450]">
                    Combined across {selectedAccounts.length} account(s) ({timeWindow.toUpperCase()})
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[12px] font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-[#9A6B00]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9A6B00]" />
                    Spend ($)
                  </span>
                </div>
              </div>

              <div className="rounded-[22px] bg-[#FFFDF4] p-4 h-[265px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ovSpendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9A6B00" stopOpacity={0.14} />
                          <stop offset="95%" stopColor="#9A6B00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#EDE7D2" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8D8975" }} axisLine={false} tickLine={false} minTickGap={22} />
                      <YAxis yAxisId="spend" tick={{ fontSize: 11, fill: "#9A6B00" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#2E2B1A",
                          border: "none",
                          borderRadius: "14px",
                          color: "#FFFDF4",
                          fontSize: "12px",
                        }}
                      />
                      <Area yAxisId="spend" type="monotone" dataKey="spend" name="Spend ($)" stroke="#9A6B00" strokeWidth={2} fill="url(#ovSpendGrad)" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                    <p className="text-[13.5px] text-[#686450]">
                      {billingCurrencies.size > 0 ? "See account totals by currency above." : "No billing rows for this period."}
                    </p>
                    {!isReadOnly && (
                      <button type="button" onClick={onSync} disabled={syncing} className="m3-btn m3-btn-compact m3-pastel-sun text-[12.5px]">
                        {syncing ? "Syncing..." : "Run Sync"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Role Spotlight Card */}
            <div className="lg:col-span-4 rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 flex flex-col justify-between gap-4">
              {roleFilter === "admin" && (
                <>
                  <div className="space-y-1">
                    <h2 className="text-[17px] font-bold text-[#2E2B1A]">Account Governance</h2>
                    <p className="text-[12.5px] text-[#686450]">Per-account spend & optimization queue</p>
                  </div>
                  <div className="space-y-2">
                    {comparisons.byAccount.slice(0, 4).map((acc) => (
                      <div key={acc.id} className="rounded-[16px] bg-[#FFFDF4] px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[#2E2B1A] truncate">{acc.name}</div>
                          <div className="text-[11px] text-[#8D8975]">{acc.provider.toUpperCase()} · {acc.resourceCount} assets</div>
                        </div>
                        <div className="text-right tabular-nums shrink-0">
                          <div className="text-[13px] font-extrabold text-[#2E2B1A]">{formatMoney(acc.billingTotals?.length === 1 && acc.billingTotals[0].currency === "USD" ? acc.billingTotals[0].amount : null)}</div>
                          <div className="text-[11px] font-bold text-[#155E4B]">-{formatMoney(acc.potentialSavings)}/mo</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => onSelectTab("actions")}
                      className="m3-btn m3-btn-compact m3-pastel-sun w-full justify-between"
                    >
                      <span>Review Optimization Queue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
  {data.accessMode === "local_demo" && (                  <Link href="/audit-history" prefetch={true} className="m3-btn m3-btn-compact m3-pastel-oat w-full justify-between">
                      <span>Open Audit History</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>)}
                  </div>
                </>
              )}

              {roleFilter === "finops" && (
                <>
                  <div className="space-y-1">
                    <h2 className="text-[17px] font-bold text-[#2E2B1A]">Top Cloud Services</h2>
                    <p className="text-[12.5px] text-[#686450]">Largest billed services across selected scope</p>
                  </div>
                  <div className="space-y-2">
                    {hasComparableUsdBilling && costs.byService.slice(0, 4).map((s) => (
                      <div key={`${s.provider}-${s.service}`} className="rounded-[16px] bg-[#FFFDF4] px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[#2E2B1A] truncate">{s.service}</div>
                          <div className="text-[11px] text-[#8D8975]">{s.category} · {s.provider.toUpperCase()}</div>
                        </div>
                        <span className="text-[13px] font-extrabold text-[#9A6B00] tabular-nums">{formatMoney(s.total)}</span>
                      </div>
                    ))}
                    {(!hasComparableUsdBilling || costs.byService.length === 0) && (
                      <div className="rounded-[16px] bg-[#FFFDF4] p-4 text-[12.5px] text-[#686450]">{billingCurrencies.size > 0 ? "Compare costs within one currency." : "No service costs for this period."}</div>
                    )}
                  </div>
                  <button type="button" onClick={() => onSelectTab("costs")} className="m3-btn m3-btn-compact m3-pastel-oat w-full justify-between">
                    <span>Budget & Allocation</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {(roleFilter === "devops" || roleFilter === "viewer") && (
                <>
                  <div className="space-y-1">
                    <h2 className="text-[17px] font-bold text-[#2E2B1A]">Compute Health</h2>
                    <p className="text-[12.5px] text-[#686450]">CPU distribution across selected accounts</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[18px] bg-[#E2F5EF] p-3.5">
                      <div className="text-[11.5px] font-bold text-[#155E4B]">Measured CPU (20–80%)</div>
                      <div className="text-[22px] font-extrabold text-[#2E2B1A] tabular-nums mt-1">{resources.byState.healthy}</div>
                    </div>
                    <div className="rounded-[18px] bg-[#FFF3A8] p-3.5">
                      <div className="text-[11.5px] font-bold text-[#5C4B05]">Idle (&lt;10%)</div>
                      <div className="text-[22px] font-extrabold text-[#2E2B1A] tabular-nums mt-1">{resources.byState.underutilized}</div>
                    </div>
                    <div className="rounded-[18px] bg-[#FEE2E2] p-3.5">
                      <div className="text-[11.5px] font-bold text-[#991B1B]">Peak (&gt;80%)</div>
                      <div className="text-[22px] font-extrabold text-[#2E2B1A] tabular-nums mt-1">{resources.byState.peak}</div>
                    </div>
                    <div className="rounded-[18px] bg-[#FFFDF4] p-3.5">
                      <div className="text-[11.5px] font-bold text-[#686450]">Stopped</div>
                      <div className="text-[22px] font-extrabold text-[#2E2B1A] tabular-nums mt-1">{resources.byState.stopped}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => onSelectTab("resources")} className="m3-btn m3-btn-compact m3-pastel-oat w-full justify-between">
                    <span>Inspect Inventory</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {(roleFilter === "architect" || roleFilter === "sustainability") && (
                <>
                  <div className="space-y-1">
                    <h2 className="text-[17px] font-bold text-[#2E2B1A]">Regional Grid Exposure</h2>
                    <p className="text-[12.5px] text-[#686450]">Top deployed regions ranked by cost & intensity</p>
                  </div>
                  <div className="space-y-2">
                    {resources.byRegion.slice(0, 4).map((r) => (
                      <div key={r.region} className="rounded-[16px] bg-[#FFFDF4] px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[13px] font-bold text-[#2E2B1A]">{r.region}</div>
                          <div className="text-[11px] text-[#8D8975]">{r.resourceCount} assets · {formatMoney(hasComparableUsdBilling ? r.monthlyCost : null)}</div>
                        </div>
                        <span className={`text-[12px] font-bold tabular-nums ${r.gridIntensity <= 150 ? "text-[#155E4B]" : r.gridIntensity >= 450 ? "text-[#991B1B]" : "text-[#9A6B00]"}`}>
                          {r.gridIntensity} g/kWh
                        </span>
                      </div>
                    ))}
                    {resources.byRegion.length === 0 && (
                      <div className="rounded-[16px] bg-[#FFFDF4] p-4 text-[12.5px] text-[#686450]">No active cloud regions mapped yet.</div>
                    )}
                  </div>
                  <button type="button" onClick={() => onSelectTab("carbon")} className="m3-btn m3-btn-compact m3-pastel-oat w-full justify-between">
                    <span>Regional Matrix</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Priority Recommendations */}
          <section className="rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-bold text-[#2E2B1A]">Priority Optimization Queue</h2>
                <p className="text-[12.5px] text-[#686450]">
                  Evidence-backed actions across selected cloud accounts
                </p>
              </div>
              <button type="button" onClick={() => onSelectTab("actions")} className="m3-btn m3-btn-compact m3-pastel-oat text-[12.5px]">
                <span>View all ({recommendations.activeCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeRecs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeRecs.map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => onSelectTab("actions")}
                    className="cursor-pointer rounded-[22px] bg-[#FFFDF4] hover:bg-[#FFF9E2] p-4 text-left transition-colors flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-[#8D8975] uppercase tracking-wide">
                        {rec.provider} · {rec.accountName}
                      </div>
                      <div className="text-[14.5px] font-bold text-[#2E2B1A] leading-snug">{rec.title}</div>
                    </div>
                    <div className="flex items-center justify-between text-[12.5px] font-bold tabular-nums pt-1">
                      <span className="text-[#155E4B]">Save {formatMoney(rec.estimatedMonthlySavings)}/mo</span>
                      <span className="text-[#686450]">{rec.estimatedGco2eSavings.toFixed(0)} g CO2e</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] bg-[#FFFDF4] p-5 flex items-center gap-3 text-[13px] text-[#686450]">
                <Check className="w-4 h-4 text-[#155E4B] shrink-0" />
                <span>No pending recommendations for the selected accounts right now.</span>
              </div>
            )}
          </section>
        </div>
      )}

      {/* MODE 2: MULTI-GRAPH ANALYTICS */}
      {viewMode === "graphs" && (
        <div className="gc-panel-swap grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Spend by Cloud Provider Trend */}
          <div className="rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-[16.5px] font-bold text-[#2E2B1A]">Daily Spend by Provider</h2>
              <p className="text-[12.5px] text-[#686450]">AWS, GCP, and Azure daily normalized spend</p>
            </div>
            <div className="rounded-[20px] bg-[#FFFDF4] p-4 h-64">
              {costs.dailyByProvider.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costs.dailyByProvider.map((d) => ({ ...d, label: d.date.slice(5) }))}>
                    <CartesianGrid stroke="#EDE7D2" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8D8975" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#8D8975" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: "#2E2B1A", border: "none", borderRadius: "12px", color: "#FFFDF4", fontSize: "12px" }} />
                    <Bar dataKey="aws" name="AWS ($)" stackId="p" fill="#9A6B00" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gcp" name="GCP ($)" stackId="p" fill="#4285F4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="azure" name="Azure ($)" stackId="p" fill="#155E4B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[13px] text-[#686450]">
                  No daily billing entries recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* CPU Utilization Histogram */}
          <div className="rounded-[28px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-[16.5px] font-bold text-[#2E2B1A]">CPU Utilization Distribution</h2>
              <p className="text-[12.5px] text-[#686450]">Compute instances bucketed by average CPU load</p>
            </div>
            <div className="rounded-[20px] bg-[#FFFDF4] p-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cpuBandBars}>
                  <CartesianGrid stroke="#EDE7D2" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="band" tick={{ fontSize: 12, fill: "#2E2B1A" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8D8975" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#2E2B1A", border: "none", borderRadius: "12px", color: "#FFFDF4", fontSize: "12px" }} />
                  <Bar dataKey="count" name="Instances" fill="#155E4B" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: MULTI-ACCOUNT & MULTI-CLOUD COMPARISON */}
      {viewMode === "comparison" && <ComparisonSection data={data} />}
    </div>
  );
}
