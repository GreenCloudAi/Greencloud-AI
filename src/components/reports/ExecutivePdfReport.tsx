"use client";

import React from "react";
import { ExecutiveReportSummary } from "@/services/executiveAgent";
import { 
  ShieldCheck, 
  TrendingDown, 
  Leaf, 
  DollarSign, 
  Server, 
  Layers, 
  Zap, 
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface ExecutivePdfReportProps {
  summary: ExecutiveReportSummary;
}

export const ExecutivePdfReport: React.FC<ExecutivePdfReportProps> = ({ summary }) => {
  const {
    account,
    generatedAt,
    narrative,
    scorecard,
    serviceLedger,
    prioritizedActions,
    modernizationLevers,
    regionalComparison,
    compliance,
  } = summary;

  const formattedDate = React.useMemo(() => {
    try {
      return new Date(generatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return "Sep 29, 2026";
    }
  }, [generatedAt]);

  return (
    <div className="pdf-report-root bg-white text-[#1A1A1A] text-[11px] leading-relaxed font-sans max-w-[820px] mx-auto">
      {/* ========================================================
          PAGE 1: FINOPS & ESG SCORECARD & OPERATIONAL POSTURE
          ======================================================== */}
      <section className="pdf-page p-8 min-h-[1060px] flex flex-col justify-between border-b border-[#E5E0D0] print:border-none print:p-6 print:min-h-0">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-[#1F8A70] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1F8A70] text-white flex items-center justify-center font-black text-lg shadow-sm">
                GC
              </div>
              <div>
                <h1 className="text-[17px] font-black tracking-tight text-[#111827] uppercase">
                  Executive FinOps & ESG Briefing
                </h1>
                <p className="text-[10px] text-[#6B7280]">
                  GreenCloud AI Autonomous Telemetry & Resource Intelligence
                </p>
              </div>
            </div>
            <div className="text-right text-[10px] text-[#4B5563] space-y-0.5">
              <div>
                <span className="font-semibold text-[#111827]">Account:</span>{" "}
                {account.name} ({account.providerAccountId})
              </div>
              <div>
                <span className="font-semibold text-[#111827]">Monitored Scope:</span>{" "}
                {scorecard.monitoredRegionsCount} AWS Regions | {scorecard.totalResourcesCount} Resources
              </div>
              <div suppressHydrationWarning>
                <span className="font-semibold text-[#111827]">Date:</span> {formattedDate} |{" "}
                <span className="text-[#059669] font-bold">CONFIDENTIAL</span>
              </div>
            </div>
          </div>

          {/* AI Executive Synthesis Narrative */}
          <div className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#166534] font-bold text-[11px]">
              <Zap className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>AI Executive Synthesis & Posture Assessment</span>
            </div>
            <p className="text-[10.5px] text-[#14532D] leading-snug">
              {narrative}
            </p>
          </div>

          {/* 4 Scorecard KPI Cards */}
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#374151] mb-2">
              Cloud FinOps & ESG Scorecard
            </h2>
            <div className="grid grid-cols-4 gap-2.5">
              {/* Card 1: Billed Spend */}
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-2.5">
                <span className="text-[9.5px] font-medium text-[#6B7280] uppercase tracking-wider block">
                  Billed Monthly Spend
                </span>
                <div className="text-[18px] font-black text-[#111827] mt-0.5">
                  ${scorecard.billedMonthlySpend.toFixed(2)}
                </div>
                <span className="text-[9.5px] text-[#4B5563] block mt-0.5">
                  Run-rate: ${(scorecard.dailyBurnRate).toFixed(2)}/day
                </span>
              </div>

              {/* Card 2: Immediate Savings */}
              <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-2.5">
                <span className="text-[9.5px] font-medium text-[#047857] uppercase tracking-wider block">
                  Actionable Savings
                </span>
                <div className="text-[18px] font-black text-[#065F46] mt-0.5">
                  +${scorecard.immediateSavingsPool.toFixed(2)}
                  <span className="text-[11px] font-bold text-[#059669] ml-1">/mo</span>
                </div>
                <span className="text-[9.5px] font-semibold text-[#047857] block mt-0.5">
                  -{scorecard.savingsPercentage}% spend reduction
                </span>
              </div>

              {/* Card 3: Carbon Footprint */}
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-2.5">
                <span className="text-[9.5px] font-medium text-[#6B7280] uppercase tracking-wider block">
                  Carbon Emissions
                </span>
                <div className="text-[18px] font-black text-[#111827] mt-0.5">
                  {scorecard.totalCarbonKg.toFixed(1)}
                  <span className="text-[11px] font-normal text-[#6B7280] ml-1">kgCO2e</span>
                </div>
                <span className="text-[9.5px] text-[#4B5563] block mt-0.5">
                  SCI: {(scorecard.sciScore * 1000).toFixed(3)} m-gCO2e/unit
                </span>
              </div>

              {/* Card 4: Tag & Governance Hygiene */}
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-2.5">
                <span className="text-[9.5px] font-medium text-[#6B7280] uppercase tracking-wider block">
                  FinOps Hygiene Score
                </span>
                <div className="text-[18px] font-black text-[#111827] mt-0.5">
                  {scorecard.hygieneScore}%
                </div>
                <span className="text-[9.5px] text-[#059669] font-medium block mt-0.5">
                  {scorecard.activeWasteCount} active waste flags
                </span>
              </div>
            </div>
          </div>

          {/* Service Spend & Scope 2/3 Emissions Ledger */}
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#374151] mb-1.5">
              Service Spend & Scope 2 Emissions Ledger
            </h2>
            <table className="w-full text-left border-collapse border border-[#E5E7EB] rounded-lg overflow-hidden text-[10px]">
              <thead className="bg-[#F3F4F6] text-[#374151] font-semibold border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-1.5 px-3">AWS Service Category</th>
                  <th className="py-1.5 px-3 text-right">Monthly Spend ($)</th>
                  <th className="py-1.5 px-3 text-right">Cost Share (%)</th>
                  <th className="py-1.5 px-3 text-right">Operational Emissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {serviceLedger.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"}>
                    <td className="py-1.5 px-3 font-medium text-[#111827] flex items-center gap-1.5">
                      <Server className="w-3 h-3 text-[#6B7280]" />
                      {row.service}
                    </td>
                    <td className="py-1.5 px-3 text-right font-medium text-[#111827]">
                      ${row.monthlyCost.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-3 text-right text-[#4B5563]">
                      {row.percentage.toFixed(1)}%
                    </td>
                    <td className="py-1.5 px-3 text-right text-[#4B5563]">
                      {row.scope2Gco2e > 0 ? `${row.scope2Gco2e.toFixed(1)} gCO2e/day` : "Negligible (Scope 3)"}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-[#F3F4F6] font-bold text-[#111827] border-t-2 border-[#D1D5DB]">
                  <td className="py-1.5 px-3">Total Cloud Billed Footprint</td>
                  <td className="py-1.5 px-3 text-right">${scorecard.billedMonthlySpend.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right">100.0%</td>
                  <td className="py-1.5 px-3 text-right">{scorecard.dailyCarbonGco2e.toFixed(1)} gCO2e/day</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Regional Grid Intensity Analysis */}
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 space-y-1.5">
            <h2 className="text-[10.5px] font-bold text-[#374151] flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-[#059669]" />
              Regional Grid Carbon Intensity & Shifting Opportunity
            </h2>
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="bg-white p-2 rounded border border-[#E5E7EB]">
                <span className="text-[#6B7280] block">Current Primary Region:</span>
                <span className="font-semibold text-[#111827]">{regionalComparison.primaryRegion} ({regionalComparison.primaryLocation})</span>
                <span className="block text-[#DC2626] font-medium mt-0.5">
                  {regionalComparison.primaryGridIntensity} gCO2e/kWh (High Carbon Grid)
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-[#BBF7D0]">
                <span className="text-[#6B7280] block">Recommended Green Region:</span>
                <span className="font-semibold text-[#111827]">{regionalComparison.recommendedCleanRegion} ({regionalComparison.recommendedCleanLocation})</span>
                <span className="block text-[#059669] font-medium mt-0.5">
                  {regionalComparison.cleanGridIntensity} gCO2e/kWh ({regionalComparison.potentialReductionPercent}% Reduction Potential)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page 1 Footer */}
        <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-[9px] text-[#6B7280]">
          <div>GreenCloud AI Enterprise FinOps & Carbon Platform</div>
          <div className="font-semibold">Page 1 of 2</div>
        </div>
      </section>

      {/* ========================================================
          PAGE BREAK ENFORCED FOR A4/LETTER PRINTERS
          ======================================================== */}
      <div className="page-break" style={{ pageBreakBefore: "always", breakBefore: "page" }} />

      {/* ========================================================
          PAGE 2: PRIORITIZED ACTIONS, MODERNIZATION & GOVERNANCE
          ======================================================== */}
      <section className="pdf-page p-8 min-h-[1060px] flex flex-col justify-between print:p-6 print:min-h-0">
        <div className="space-y-4">
          {/* Page 2 Header */}
          <div className="flex items-center justify-between border-b-2 border-[#1F8A70] pb-2">
            <div>
              <h2 className="text-[15px] font-black tracking-tight text-[#111827] uppercase">
                Prioritized Action Ledger & Modernization Roadmap
              </h2>
              <p className="text-[10px] text-[#6B7280]">
                Immediate Remediation Actions and 1-3 Month Fleet Modernization Initiatives
              </p>
            </div>
            <div className="text-right text-[10px] text-[#4B5563]">
              Account: <span className="font-semibold">{account.providerAccountId}</span>
            </div>
          </div>

          {/* Top 3-4 Deterministic Remediation Actions */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#374151] mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              Prioritized Remediation Actions (Immediate Implementation)
            </h3>
            <div className="space-y-2">
              {prioritizedActions.map((action) => (
                <div 
                  key={action.id}
                  className="rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[10px] space-y-1 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div className="font-bold text-[#111827] flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#1F8A70] text-white flex items-center justify-center text-[9px] font-bold">
                        {action.rank}
                      </span>
                      {action.title}
                    </div>
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-[#059669] bg-[#ECFDF5] px-1.5 py-0.5 rounded border border-[#A7F3D0]">
                        +${action.monthlySavings.toFixed(2)}/mo
                      </span>
                      {action.dailyGco2eReduction > 0 && (
                        <span className="text-[#047857] bg-[#F0FDF4] px-1.5 py-0.5 rounded border border-[#BBF7D0]">
                          -{action.dailyGco2eReduction.toFixed(1)} gCO2e/d
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[9.5px] text-[#4B5563] pt-0.5">
                    <div>
                      <span className="font-semibold text-[#111827]">Resource:</span>{" "}
                      <code className="text-[#1F8A70] font-mono">{action.resourceId}</code>
                    </div>
                    <div>
                      <span className="font-semibold text-[#111827]">Region:</span> {action.region}
                    </div>
                    <div>
                      <span className="font-semibold text-[#111827]">Risk / Confidence:</span>{" "}
                      <span className={action.riskScore <= 15 ? "text-[#059669] font-medium" : "text-[#D97706] font-medium"}>
                        {action.riskScore <= 15 ? "Low Risk" : "Review"} ({Math.round(action.confidence * 100)}%)
                      </span>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-[#4B5563] italic">
                    &ldquo;{action.reason}&rdquo;
                  </p>

                  <div className="text-[9px] font-semibold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                    Recommended Action: {action.recommendedAction}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Modernization Matrix */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#374151] mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
              Strategic Fleet Modernization Levers (1-3 Month Target)
            </h3>
            <table className="w-full text-left border-collapse border border-[#E5E7EB] rounded-lg overflow-hidden text-[9.5px]">
              <thead className="bg-[#F3F4F6] text-[#374151] font-semibold border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-1.5 px-2.5">Modernization Lever</th>
                  <th className="py-1.5 px-2.5 text-right">Estimated Gain</th>
                  <th className="py-1.5 px-2.5">Carbon Alignment</th>
                  <th className="py-1.5 px-2.5 text-center">Effort</th>
                  <th className="py-1.5 px-2.5">Architectural Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {modernizationLevers.map((m, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"}>
                    <td className="py-1.5 px-2.5 font-semibold text-[#111827]">{m.name}</td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-[#059669]">
                      +${m.monthlyGain.toFixed(2)}/mo
                    </td>
                    <td className="py-1.5 px-2.5 text-[#4B5563]">{m.carbonImpact}</td>
                    <td className="py-1.5 px-2.5 text-center">
                      <span className={`px-1.5 py-0.2 rounded font-medium text-[9px] ${
                        m.effort === "Low" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"
                      }`}>
                        {m.effort}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-[#4B5563]">{m.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Audit Compliance & Executive Sign-off Block */}
          <div className="rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#111827]">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                Audit Trail Verification & Regulatory Compliance
              </div>
              <div className="text-[9px] font-mono text-[#6B7280]" suppressHydrationWarning>
                {compliance.immutableHash}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[9.5px] text-[#4B5563]">
              <div>
                <span className="font-semibold text-[#111827]">Standard:</span> {compliance.standard}
              </div>
              <div>
                <span className="font-semibold text-[#111827]">STS Role ARN:</span>{" "}
                <span className="font-mono text-[8.5px]">{compliance.stsRoleArn}</span>
              </div>
            </div>

            {/* Formal Signature Lines */}
            <div className="pt-3 border-t border-[#E5E7EB] grid grid-cols-2 gap-6 text-[10px]">
              <div className="space-y-4">
                <div className="border-b border-[#9CA3AF] pb-1 font-mono text-[#4B5563]">
                  &nbsp;
                </div>
                <div className="flex justify-between text-[#374151]">
                  <span className="font-bold">FinOps Lead Signature</span>
                  <span className="text-[#6B7280]">Date: ___________</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b border-[#9CA3AF] pb-1 font-mono text-[#4B5563]">
                  &nbsp;
                </div>
                <div className="flex justify-between text-[#374151]">
                  <span className="font-bold">Sustainability Officer Signature</span>
                  <span className="text-[#6B7280]">Date: ___________</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-[9px] text-[#6B7280]">
          <div>GreenCloud AI Enterprise FinOps & Carbon Platform</div>
          <div className="font-semibold">Page 2 of 2</div>
        </div>
      </section>
    </div>
  );
};
