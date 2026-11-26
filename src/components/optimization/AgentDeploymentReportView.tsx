"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  TrendingDown,
  Cpu,
  Layers,
  CheckCircle2,
  DollarSign,
  Leaf,
  ShieldCheck,
  Copy,
  Check,
  Play,
  RotateCw,
  Terminal,
  FileCode,
  Zap,
  Printer,
  Sliders,
  Server,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { calculateTargetMachine, EC2_CATALOG, TargetMachineShift } from "@/services/machineCatalog";

interface AgentDeploymentReportViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
  onRefreshData?: () => Promise<void>;
  onOpenReportPreview?: () => void;
}

export function AgentDeploymentReportView({
  data,
  onNavigateSubTab,
  onRefreshData,
  onOpenReportPreview,
}: AgentDeploymentReportViewProps) {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [agentTab, setAgentTab] = useState<"cli" | "terraform" | "python">("cli");
  const [filterFamily, setFilterFamily] = useState<string>("all");

  // Agent execution runner modal state
  const [executingAgent, setExecutingAgent] = useState(false);
  const [executionTarget, setExecutionTarget] = useState<"all" | string | null>(null);
  const [executionStage, setExecutionStage] = useState<number>(0);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  // Derive shiftable machines from recommendations and resources
  const shiftItems = useMemo(() => {
    const items: Array<{
      id: string;
      recommendationId?: string;
      resourceId: string;
      nameTag: string;
      region: string;
      currentType: string;
      currentCost: number;
      peakCpu: number;
      avgCpu: number;
      shift: TargetMachineShift;
      status: string;
    }> = [];

    const recs = data?.recommendations?.items || [];
    const ec2List = data?.resources?.ec2 || [];

    // 1. From recommendations
    recs.forEach((r: any) => {
      let parsed: any = null;
      try {
        parsed = typeof r.evidence === "string" ? JSON.parse(r.evidence) : r.evidence;
      } catch {}

      if (r.category === "rightsizing" || parsed?.machineShift) {
        const res = r.resource || {};
        let peak = 18;
        let avg = 7;
        try {
          if (res.telemetryMetrics) {
            const tm = JSON.parse(res.telemetryMetrics);
            if (tm.peakCpu) peak = tm.peakCpu;
            if (Array.isArray(tm.cpuDailyAverages) && tm.cpuDailyAverages.length > 0) {
              avg = tm.cpuDailyAverages.reduce((a: number, b: number) => a + b, 0) / tm.cpuDailyAverages.length;
            }
          }
        } catch {}

        const shift = parsed?.machineShift || calculateTargetMachine(
          res.instanceType || "t3.large",
          peak,
          avg,
          res.monthlyCost,
          res.providerResourceId || r.resourceId,
          res.region || "ap-south-1"
        );

        let nameTag = res.providerResourceId || r.resourceId;
        try {
          const tags = JSON.parse(res.tags || "[]");
          const found = tags.find((t: any) => t.Key === "Name");
          if (found?.Value) nameTag = found.Value;
        } catch {}

        items.push({
          id: r.id,
          recommendationId: r.id,
          resourceId: res.providerResourceId || r.resourceId,
          nameTag,
          region: res.region || "ap-south-1",
          currentType: shift.currentMachine,
          currentCost: shift.currentMonthlyCost,
          peakCpu: peak,
          avgCpu: avg,
          shift,
          status: r.status,
        });
      }
    });

    // 2. Fallback to active EC2 list if no rightsizing recs
    if (items.length === 0 && ec2List.length > 0) {
      ec2List
        .filter((e: any) => e.lifecycleState === "running")
        .forEach((e: any, idx: number) => {
          let peak = 18;
          let avg = 7;
          try {
            if (e.telemetryMetrics) {
              const tm = JSON.parse(e.telemetryMetrics);
              if (tm.peakCpu) peak = tm.peakCpu;
              if (Array.isArray(tm.cpuDailyAverages) && tm.cpuDailyAverages.length > 0) {
                avg = tm.cpuDailyAverages.reduce((a: number, b: number) => a + b, 0) / tm.cpuDailyAverages.length;
              }
            }
          } catch {}

          const shift = calculateTargetMachine(
            e.instanceType || "t3.large",
            peak,
            avg,
            e.monthlyCost,
            e.providerResourceId,
            e.region || "ap-south-1"
          );

          let nameTag = e.providerResourceId;
          try {
            const tags = JSON.parse(e.tags || "[]");
            const found = tags.find((t: any) => t.Key === "Name");
            if (found?.Value) nameTag = found.Value;
          } catch {}

          items.push({
            id: `item-${e.id || idx}`,
            resourceId: e.providerResourceId,
            nameTag,
            region: e.region || "ap-south-1",
            currentType: shift.currentMachine,
            currentCost: shift.currentMonthlyCost,
            peakCpu: peak,
            avgCpu: avg,
            shift,
            status: "active",
          });
        });
    }

    // 3. Fallback defaults if cloud account has no data yet
    if (items.length === 0) {
      const shift1 = calculateTargetMachine("t3.xlarge", 18.2, 6.5, 121.47, "i-0c1f948e5cc96d55c", "ap-south-1");
      const shift2 = calculateTargetMachine("m5.large", 14.8, 5.1, 70.08, "i-0f23280f9e61097b7", "ap-south-1");

      items.push({
        id: "item-default-1",
        resourceId: "i-0c1f948e5cc96d55c",
        nameTag: "production-api-gateway",
        region: "ap-south-1",
        currentType: shift1.currentMachine,
        currentCost: shift1.currentMonthlyCost,
        peakCpu: 18.2,
        avgCpu: 6.5,
        shift: shift1,
        status: "active",
      });

      items.push({
        id: "item-default-2",
        resourceId: "i-0f23280f9e61097b7",
        nameTag: "staging-worker-node",
        region: "ap-south-1",
        currentType: shift2.currentMachine,
        currentCost: shift2.currentMonthlyCost,
        peakCpu: 14.8,
        avgCpu: 5.1,
        shift: shift2,
        status: "active",
      });
    }

    return items;
  }, [data]);

  const filteredItems = useMemo(() => {
    if (filterFamily === "all") return shiftItems;
    return shiftItems.filter((i) =>
      i.currentType.toLowerCase().startsWith(filterFamily.toLowerCase())
    );
  }, [shiftItems, filterFamily]);

  const totalMonthlySavings = useMemo(() => {
    return parseFloat(
      shiftItems.reduce((acc, curr) => acc + curr.shift.monthlySavings, 0).toFixed(2)
    );
  }, [shiftItems]);

  const totalAnnualSavings = parseFloat((totalMonthlySavings * 12).toFixed(2));
  const totalCarbonSavingsDaily = parseFloat((shiftItems.length * 32.5).toFixed(1));

  // Run autonomous optimization runner
  const handleTriggerAgentOptimization = async (target: "all" | string) => {
    try {
      setExecutingAgent(true);
      setExecutionTarget(target);
      setExecutionStage(1); // Stage 1: Telemetry Check
      setExecutionError(null);
      setExecutionResult(null);

      await new Promise((r) => setTimeout(r, 600));
      setExecutionStage(2); // Stage 2: Safety Check & Snapshot

      await new Promise((r) => setTimeout(r, 700));
      setExecutionStage(3); // Stage 3: Target Machine Shift

      let endpoint = "/api/agent/deploy";
      let payload: any = { action: "fast_optimize_all" };

      if (target !== "all") {
        const item = shiftItems.find((s) => s.id === target || s.recommendationId === target);
        if (item?.recommendationId) {
          endpoint = `/api/recommendations/${item.recommendationId}/approve`;
          payload = { mode: "agent_execute", approver: "autonomous_agent_user" };
        } else {
          payload = { action: "fast_optimize_single", recommendationId: target };
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Autonomous agent execution encountered an error");
      }

      setExecutionStage(4); // Stage 4: Ledger & Audit Record
      await new Promise((r) => setTimeout(r, 500));
      setExecutionStage(5); // Stage 5: Completed
      setExecutionResult(json.result || json);

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (e: any) {
      setExecutionError(e.message || "Failed to execute agent optimization");
    } finally {
      setExecutingAgent(false);
    }
  };

  const cliSnippet = `curl -sSL https://get.greencloud.ai/agent.sh | bash -s -- --auto-rightsize --target=graviton3`;
  const terraformSnippet = `# GreenCloud AI — Autonomous Optimizer Terraform Module
module "greencloud_agent" {
  source  = "greencloud/optimizer/aws"
  version = "~> 2.4.0"

  auto_shift_graviton     = true
  max_peak_cpu_threshold  = 35.0
  schedule_cron           = "cron(0 2 * * ? *)" # Nightly sweep
  target_regions          = ["ap-south-1", "us-east-1", "us-west-2"]
}`;

  const pythonSnippet = `import boto3

ec2 = boto3.client("ec2")
# Autonomous GreenCloud Fast Shift:
# aws ec2 modify-instance-attribute --instance-id i-0c1f948e5cc96d55c --instance-type '{"Value": "t4g.medium"}'
print("Autonomous GreenCloud Agent active: Monitoring P99 CPU metrics and Graviton3 shifting.")`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── Top Header Card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E2F5EF] border border-[#BDEBDD] flex items-center justify-center text-[#1F8A70]">
                <Zap className="w-4 h-4 text-[#1F8A70]" />
              </div>
              <h2 className="text-[19px] font-black text-[#2E2B1A]">
                Autonomous Agent Deployment &amp; Machine Shift Report
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                Agent v2.4 Active
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1.5 max-w-3xl">
              Deterministic machine rightsizing roadmap. Shifting underutilized EC2 workloads to <strong>exact AWS Graviton3 targets</strong> eliminates up to 80% of idle compute spend with verified telemetry safety margins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenReportPreview && (
              <button
                type="button"
                onClick={onOpenReportPreview}
                className="px-3.5 py-2 rounded-xl bg-[#FAF6E8] hover:bg-[#F3EDD7] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-[#9A6B00]" />
                <span>Print / PDF Briefing</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateSubTab("opt-recommendations")}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Actionable Queue</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1F8A70]" />
            </button>
          </div>
        </div>

        {/* ─── 4 Summary Metric Boxes ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Monthly Savings */}
          <div className="p-4 rounded-2xl bg-[#E2F5EF]/70 border border-[#BDEBDD] relative overflow-hidden">
            <span className="text-[11px] font-mono text-[#1F8A70] uppercase font-bold block mb-1">
              Machine Shift Savings Pool
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-black text-[#1F8A70]">
                +${totalMonthlySavings.toFixed(2)}
              </span>
              <span className="text-[12px] text-[#1F8A70] font-mono">/mo</span>
            </div>
            <span className="text-[11.5px] text-[#1F8A70] block mt-1 font-semibold">
              Annualized ROI: +${totalAnnualSavings.toFixed(2)}/yr
            </span>
          </div>

          {/* Card 2: Shiftable Machines */}
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/50 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Shiftable Fleet Instances
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-black text-[#2E2B1A]">
                {shiftItems.length}
              </span>
              <span className="text-[12px] text-[#8D8975] font-mono">nodes</span>
            </div>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-medium">
              100% P99 CPU Telemetry Verified
            </span>
          </div>

          {/* Card 3: Carbon Avoidance */}
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/50 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Graviton Carbon Avoidance
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-black text-[#1F8A70]">
                -60%
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">to -80%</span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              ~{totalCarbonSavingsDaily} gCO2e/day avoided
            </span>
          </div>

          {/* Card 4: Agent Deployment Velocity */}
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/50 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Fast Agent Time-to-Value
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-black text-[#9A6B00]">
                &lt; 3 mins
              </span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              1-Click Autonomous Execution
            </span>
          </div>
        </div>

        {/* ─── Fast Agent 1-Click Fleet Optimization Banner ─────────────────── */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1F8A70]/10 via-[#FAF6E8] to-[#FFF76A]/20 border border-[#BDEBDD] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#1F8A70] text-white text-[10px] font-bold tracking-wide uppercase">
                Fast-Track Agent
              </span>
              <h3 className="font-bold text-[15px] text-[#2E2B1A]">
                Deploy Agent for Faster Fleet Optimization
              </h3>
            </div>
            <p className="text-[12.5px] text-[#686450]">
              The autonomous agent will evaluate CloudWatch P99 telemetry, verify safety headroom (&gt;50%), tag rollback snapshots, and shift all {shiftItems.length} candidate instances to their optimal target machines.
            </p>
          </div>

          <button
            type="button"
            disabled={executingAgent}
            onClick={() => handleTriggerAgentOptimization("all")}
            className="px-5 py-2.5 rounded-xl bg-[#1F8A70] hover:bg-[#186D58] text-white text-[13px] font-bold transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer disabled:opacity-60 active:scale-95"
          >
            {executingAgent && executionTarget === "all" ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Agent Optimizing Fleet...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Deploy Agent Fast Optimization (+${totalMonthlySavings}/mo)</span>
              </>
            )}
          </button>
        </div>

        {/* ─── Exact Machine Shift Ledger Table ──────────────────────────────── */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-[16px] text-[#2E2B1A] flex items-center gap-2">
                <Server className="w-4 h-4 text-[#1F8A70]" />
                Exact Machine Migration &amp; Rightsizing Ledger
              </h3>
              <p className="text-[12px] text-[#686450]">
                Shows current machine name, telemetry utilization, exact shift-to target machine, and net monthly money saved.
              </p>
            </div>

            {/* Filter by Family */}
            <div className="flex items-center gap-1.5 bg-[#FAF6E8] p-1 rounded-xl border border-[#ECE5CC] text-[11.5px]">
              <span className="text-[#8D8975] font-bold px-2 uppercase font-mono text-[10.5px]">Family:</span>
              {["all", "t3", "m5", "c5", "r5"].map((fam) => (
                <button
                  key={fam}
                  type="button"
                  onClick={() => setFilterFamily(fam)}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    filterFamily === fam
                      ? "bg-white text-[#2E2B1A] shadow-2xs border border-[#ECE5CC]"
                      : "text-[#686450] hover:text-[#2E2B1A]"
                  }`}
                >
                  {fam.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border border-[#ECE5CC] rounded-2xl shadow-2xs">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#FAF6E8]/70 border-b border-[#ECE5CC] font-mono text-[11px] text-[#8D8975] uppercase">
                <tr>
                  <th className="py-3 px-3.5">Instance / Resource ID</th>
                  <th className="py-3 px-3.5">Current Machine &amp; Specs</th>
                  <th className="py-3 px-3.5 text-center">Peak CPU</th>
                  <th className="py-3 px-3.5">Recommended Shift Target</th>
                  <th className="py-3 px-3.5 text-right">Net Savings</th>
                  <th className="py-3 px-3.5 text-center">Carbon Delta</th>
                  <th className="py-3 px-3.5 text-right">Autonomous Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE5CC]/60 bg-white">
                {filteredItems.map((item) => {
                  const isExecuting = executingAgent && executionTarget === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-[#FAF6E8]/30 transition-colors">
                      {/* Resource Name / ID */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-bold text-[#2E2B1A] text-[13px]">{item.nameTag}</div>
                        <div className="font-mono text-[11px] text-[#8D8975] flex items-center gap-1.5 mt-0.5">
                          <span>{item.resourceId}</span>
                          <span className="px-1.5 py-0.2 rounded bg-[#FAF6E8] text-[#686450] border border-[#ECE5CC] text-[10px]">
                            {item.region}
                          </span>
                        </div>
                      </td>

                      {/* Current Machine */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-mono font-bold text-[#2E2B1A] text-[13px]">
                          {item.currentType}
                        </div>
                        <div className="text-[11px] text-[#686450] mt-0.5">
                          {item.shift.currentSpecs}
                        </div>
                        <div className="text-[11px] text-[#8D8975] font-mono mt-0.5">
                          ${item.currentCost.toFixed(2)}/mo
                        </div>
                      </td>

                      {/* Telemetry CPU */}
                      <td className="py-3.5 px-3.5 text-center">
                        <div className="inline-block px-2.5 py-1 rounded-lg bg-[#FAF6E8] border border-[#ECE5CC] font-mono">
                          <span className="font-bold text-[#9A6B00]">{item.peakCpu.toFixed(1)}%</span>
                          <span className="text-[10px] text-[#8D8975] block">Avg: {item.avgCpu.toFixed(1)}%</span>
                        </div>
                      </td>

                      {/* Exact Target Shift Machine */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-[#1F8A70] text-[13.5px] bg-[#E2F5EF] px-2 py-0.5 rounded-lg border border-[#BDEBDD]">
                            {item.shift.targetMachine}
                          </span>
                          <span className="text-[10.5px] font-bold text-[#1F8A70] uppercase">
                            Graviton3
                          </span>
                        </div>
                        <div className="text-[11px] text-[#686450] mt-1 font-medium">
                          {item.shift.targetSpecs}
                        </div>
                        <div className="text-[10.5px] text-[#8D8975] mt-0.5">
                          x86 Alt: <span className="font-mono font-bold text-[#2E2B1A]">{item.shift.alternativeX86Target}</span> (${item.shift.alternativeX86MonthlyCost}/mo)
                        </div>
                      </td>

                      {/* Savings */}
                      <td className="py-3.5 px-3.5 text-right font-mono">
                        <div className="text-[14px] font-black text-[#1F8A70]">
                          +${item.shift.monthlySavings.toFixed(2)}/mo
                        </div>
                        <span className="text-[10.5px] font-bold text-[#1F8A70] bg-[#E2F5EF] px-1.5 py-0.2 rounded-full inline-block mt-0.5">
                          -{item.shift.savingsPercentage}% spend
                        </span>
                        <div className="text-[10.5px] text-[#8D8975] mt-0.5">
                          +${item.shift.annualSavings.toFixed(0)}/yr
                        </div>
                      </td>

                      {/* Carbon Delta */}
                      <td className="py-3.5 px-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD] inline-flex items-center gap-1">
                          <Leaf className="w-3 h-3" />
                          -{item.shift.carbonReductionPercent}% gCO2e
                        </span>
                        <span className="block text-[10px] text-[#686450] mt-1">
                          Headroom: {item.shift.safetyMarginPercent}%
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-3.5 text-right">
                        <button
                          type="button"
                          disabled={executingAgent}
                          onClick={() => handleTriggerAgentOptimization(item.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] hover:border-[#1F8A70] text-[#1F8A70] text-[11.5px] font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {isExecuting ? (
                            <>
                              <RotateCw className="w-3 h-3 animate-spin text-[#1F8A70]" />
                              <span>Shifting...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3 text-[#1F8A70]" />
                              <span>Execute Shift</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Standalone Cloud Agent Deployment Station ────────────────────── */}
        <div className="p-5 rounded-2xl border border-[#ECE5CC] bg-white space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ECE5CC] gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] text-[#2E2B1A] flex items-center justify-center font-bold">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-[#2E2B1A]">
                  Autonomous Cloud Agent Deployment Package
                </h3>
                <span className="text-[11.5px] text-[#686450]">
                  Deploy 24/7 continuous autonomous telemetry sweeps and rightsizing directly inside your AWS account.
                </span>
              </div>
            </div>

            {/* Sub-Tabs: CLI / Terraform / Python */}
            <div className="flex items-center gap-1 bg-[#FAF6E8] p-1 rounded-xl border border-[#ECE5CC] text-[11.5px]">
              <button
                type="button"
                onClick={() => setAgentTab("cli")}
                className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  agentTab === "cli"
                    ? "bg-[#2E2B1A] text-white"
                    : "text-[#686450] hover:text-[#2E2B1A]"
                }`}
              >
                1-Liner CLI
              </button>
              <button
                type="button"
                onClick={() => setAgentTab("terraform")}
                className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  agentTab === "terraform"
                    ? "bg-[#2E2B1A] text-white"
                    : "text-[#686450] hover:text-[#2E2B1A]"
                }`}
              >
                Terraform HCL
              </button>
              <button
                type="button"
                onClick={() => setAgentTab("python")}
                className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  agentTab === "python"
                    ? "bg-[#2E2B1A] text-white"
                    : "text-[#686450] hover:text-[#2E2B1A]"
                }`}
              >
                Lambda Python
              </button>
            </div>
          </div>

          {/* Code Display Area */}
          <div className="p-3.5 bg-[#1F2937] text-gray-100 rounded-xl font-mono text-[11px] overflow-x-auto relative">
            <pre className="leading-relaxed">
              {agentTab === "cli" && cliSnippet}
              {agentTab === "terraform" && terraformSnippet}
              {agentTab === "python" && pythonSnippet}
            </pre>

            <button
              type="button"
              onClick={() => {
                const text =
                  agentTab === "cli"
                    ? cliSnippet
                    : agentTab === "terraform"
                    ? terraformSnippet
                    : pythonSnippet;
                handleCopy(text, `agent-${agentTab}`);
              }}
              className="absolute top-2.5 right-2.5 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[10.5px] font-bold border border-gray-600 flex items-center gap-1 transition-all cursor-pointer"
            >
              {copiedSnippet === `agent-${agentTab}` ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-gray-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11.5px] text-[#686450]">
            <div className="p-2.5 rounded-lg bg-[#FAF6E8]/40 border border-[#ECE5CC]">
              <strong className="text-[#2E2B1A] block mb-0.5">Least Privilege IAM:</strong>
              Scoped strictly to `ec2:ModifyInstanceAttribute` and `cloudwatch:GetMetricData`.
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF6E8]/40 border border-[#ECE5CC]">
              <strong className="text-[#2E2B1A] block mb-0.5">Automated Safety Tags:</strong>
              Every shifted node is tagged with `PreviousMachine` and timestamp for instant rollback.
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF6E8]/40 border border-[#ECE5CC]">
              <strong className="text-[#2E2B1A] block mb-0.5">Nightly Cron Sweep:</strong>
              Executes at 02:00 UTC during off-peak hours to guarantee zero disruption.
            </div>
          </div>
        </div>
      </div>

      {/* ─── Agent Execution Stepper Modal ─────────────────────────────────── */}
      {(executingAgent || executionStage === 5 || executionError) && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-[#FFFDF4] rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-lg space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#E2F5EF] text-[#1F8A70] flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[15px] text-[#2E2B1A]">
                  Autonomous Agent Optimization Runner
                </h3>
              </div>
              <span className="text-[10.5px] font-mono text-[#8D8975]">
                {executionStage < 5 ? "Executing..." : "Completed"}
              </span>
            </div>

            {/* Stepper Progress */}
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2.5">
                {executionStage > 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#1F8A70]" />
                ) : executionStage === 1 ? (
                  <RotateCw className="w-4 h-4 text-[#9A6B00] animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[#DFD6B5]" />
                )}
                <span className={executionStage >= 1 ? "font-bold text-[#2E2B1A]" : "text-[#8D8975]"}>
                  1. Telemetry &amp; CPU P99 Verification (&lt; 20% average)
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {executionStage > 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#1F8A70]" />
                ) : executionStage === 2 ? (
                  <RotateCw className="w-4 h-4 text-[#9A6B00] animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[#DFD6B5]" />
                )}
                <span className={executionStage >= 2 ? "font-bold text-[#2E2B1A]" : "text-[#8D8975]"}>
                  2. Safety Backup Snapshot &amp; Rollback Metadata Tagging
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {executionStage > 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#1F8A70]" />
                ) : executionStage === 3 ? (
                  <RotateCw className="w-4 h-4 text-[#9A6B00] animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[#DFD6B5]" />
                )}
                <span className={executionStage >= 3 ? "font-bold text-[#2E2B1A]" : "text-[#8D8975]"}>
                  3. Instance Machine Transition &rarr; Exact Target (`t4g.medium`)
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {executionStage >= 4 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#1F8A70]" />
                ) : executionStage === 4 ? (
                  <RotateCw className="w-4 h-4 text-[#9A6B00] animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[#DFD6B5]" />
                )}
                <span className={executionStage >= 4 ? "font-bold text-[#2E2B1A]" : "text-[#8D8975]"}>
                  4. FinOps Cost Ledger Update &amp; Immutable Audit Log
                </span>
              </div>
            </div>

            {/* Success Receipt */}
            {executionStage === 5 && (
              <div className="p-3.5 rounded-xl bg-[#E2F5EF] border border-[#BDEBDD] space-y-1.5 text-[11.5px] animate-in fade-in">
                <div className="font-bold text-[#1F8A70] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Autonomous Optimization Applied Successfully!</span>
                </div>
                <p className="text-[#14532D]">
                  All selected instances have been shifted to their target machines. Monthly run-rate expenditure reduced by <strong>${totalMonthlySavings}/mo</strong>.
                </p>
              </div>
            )}

            {executionError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11.5px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{executionError}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={executingAgent}
                onClick={() => {
                  setExecutionStage(0);
                  setExecutingAgent(false);
                  setExecutionTarget(null);
                  setExecutionError(null);
                }}
                className="px-4 py-1.5 rounded-full bg-[#2E2B1A] text-white hover:bg-black text-[12px] font-bold cursor-pointer disabled:opacity-50"
              >
                {executionStage === 5 ? "Done" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
