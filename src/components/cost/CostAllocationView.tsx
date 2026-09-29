"use client";

import React, { useState } from "react";
import {
  Tag,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Info,
  Server,
  HardDrive,
  Network,
  Cpu,
  ExternalLink,
  Layers,
  ArrowRight,
} from "lucide-react";

interface CostAllocationViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
}

export function CostAllocationView({ data, onNavigateSubTab }: CostAllocationViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tagData = data?.tagAllocation;
  const hygieneScore = tagData?.hygieneScore ?? 100;
  const taggedCount = tagData?.taggedCount ?? 0;
  const untaggedCount = tagData?.untaggedCount ?? 0;
  const totalCount = taggedCount + untaggedCount;

  const byEnvironment = tagData?.byEnvironment || [];
  const byTeam = tagData?.byTeam || [];

  // Extract untagged resources from ec2, ebs, and eip lists
  const allResources: any[] = [
    ...(data?.resources?.ec2 || []),
    ...(data?.resources?.ebs || []),
    ...(data?.resources?.eip || []),
  ];

  const untaggedResources = allResources.filter((res) => {
    try {
      if (!res.tags) return true;
      const parsed = JSON.parse(res.tags);
      if (!Array.isArray(parsed) || parsed.length === 0) return true;
      const hasEnv = parsed.some(
        (t: any) => t.Key.toLowerCase() === "environment" || t.Key.toLowerCase() === "env"
      );
      return !hasEnv;
    } catch {
      return true;
    }
  });

  const handleCopyTagCommand = (resourceId: string, region: string) => {
    const cmd = `aws ec2 create-tags --region ${region} --resources ${resourceId} --tags Key=Environment,Value=Production Key=Owner,Value=PlatformTeam`;
    navigator.clipboard.writeText(cmd);
    setCopiedId(resourceId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00]">
                <Tag className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">Cost Allocation &amp; Tag Showback</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                hygieneScore >= 80
                  ? "bg-[#E2F5EF] text-[#1F8A70] border-[#BDEBDD]"
                  : "bg-[#FFF3D6] text-[#9A6B00] border-[#ECE5CC]"
              }`}>
                {hygieneScore}% Compliant
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Multi-dimensional cloud showback tracking spend allocated across business environments and teams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono font-bold text-[#8D8975]">
              Dimensions: Environment · Owner · Project
            </span>
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              FinOps Tag Hygiene
            </span>
            <span className="text-[26px] font-black text-[#2E2B1A]">
              {hygieneScore}%
            </span>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold">
              {taggedCount} of {totalCount} resources tagged
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Unallocated (Untagged) Assets
            </span>
            <span className={`text-[26px] font-black ${untaggedCount > 0 ? "text-[#9A6B00]" : "text-[#1F8A70]"}`}>
              {untaggedCount} Assets
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1">
              Missing mandatory Environment tag
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Production Allocation Share
            </span>
            <span className="text-[26px] font-black text-[#1F8A70]">
              {byEnvironment.find((e: any) => e.name === "Production")?.percentage || 0}%
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1 font-mono">
              ${byEnvironment.find((e: any) => e.name === "Production")?.cost.toFixed(2) || "0.00"}/mo allocated
            </span>
          </div>
        </div>

        {/* Environment Showback Distribution (Two Column Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-[#ECE5CC]">
          {/* Left Column: Environment Progress Bars (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div>
              <h4 className="font-bold text-[14px] text-[#2E2B1A]">Environment Allocation Showback</h4>
              <p className="text-[12px] text-[#686450]">
                Monthly spend grouped by operational environment derived from AWS resource tags.
              </p>
            </div>

            <div className="space-y-3">
              {byEnvironment.length > 0 ? (
                byEnvironment.map((env: any, i: number) => {
                  const isProd = env.name === "Production";
                  const isStaging = env.name === "Staging";
                  const isDev = env.name === "Development";

                  const barColor = isProd
                    ? "bg-[#1F8A70]"
                    : isStaging
                    ? "bg-[#9A6B00]"
                    : isDev
                    ? "bg-[#3B82F6]"
                    : "bg-[#8D8975]";

                  return (
                    <div key={env.name || i} className="p-3.5 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC] space-y-2">
                      <div className="flex items-center justify-between text-[12.5px]">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${barColor}`} />
                          <span className="font-bold text-[#2E2B1A]">{env.name}</span>
                          <span className="text-[11px] text-[#8D8975]">({env.count} resources)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[#2E2B1A]">
                            ${env.cost.toFixed(2)}/mo
                          </span>
                          <span className="text-[11.5px] font-mono text-[#8D8975] font-semibold">
                            {env.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#ECE5CC] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${Math.max(env.percentage, env.count > 0 ? 5 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-[#FAF6E8]/40 border border-[#ECE5CC] text-center text-[12px] text-[#8D8975]">
                  No tagged environments detected yet.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: FinOps Tag Hygiene Governance (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[13.5px] text-[#2E2B1A]">AWS Tag Governance Best Practices</span>
                <ShieldCheck className="w-4 h-4 text-[#1F8A70]" />
              </div>
              <p className="text-[12px] text-[#686450] leading-relaxed">
                FinOps best practices mandate that every production, staging, and development asset carry standardized <code className="font-mono text-[#2E2B1A] bg-white px-1 rounded border border-[#ECE5CC]">Environment</code> and <code className="font-mono text-[#2E2B1A] bg-white px-1 rounded border border-[#ECE5CC]">Owner</code> tags.
              </p>
              <div className="mt-3 space-y-2 text-[11.5px] text-[#686450]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70]" />
                  <span>Enables automated FinOps chargeback &amp; showback</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70]" />
                  <span>Identifies orphaned test volumes and unassigned IPs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70]" />
                  <span>Feeds AWS Cost Categories and Cost Anomaly monitors</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#ECE5CC] text-[11px] text-[#686450]">
              <span className="font-bold text-[#2E2B1A] block mb-1">Recommended Tag Policy:</span>
              <div className="font-mono text-[10.5px] text-[#8D8975] space-y-0.5">
                <div>Environment: [Production | Staging | Development]</div>
                <div>Owner: [team-email-or-handle]</div>
                <div>Project: [system-name]</div>
              </div>
            </div>
          </div>
        </div>

        {/* Untagged Resources Remediation Ledger */}
        <div className="pt-4 border-t border-[#ECE5CC] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#9A6B00]" />
                <h3 className="font-bold text-[15px] text-[#2E2B1A]">Untagged Resource Remediation Queue</h3>
              </div>
              <p className="text-[12px] text-[#686450]">
                Specific AWS assets missing required allocation tags. Copy the remediation CLI command to apply tags immediately.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FAF6E8] text-[11px] font-mono font-bold text-[#8D8975] border border-[#ECE5CC]">
              {untaggedResources.length} Assets Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-[#ECE5CC] font-mono text-[11px] text-[#8D8975] uppercase">
                  <th className="py-2.5">Resource ID</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Region</th>
                  <th className="py-2.5">Lifecycle</th>
                  <th className="py-2.5">Monthly Cost</th>
                  <th className="py-2.5 text-right">Quick Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE5CC]/50">
                {untaggedResources.length > 0 ? (
                  untaggedResources.map((res: any) => {
                    const isEc2 = res.resourceType === "ec2";
                    const isEbs = res.resourceType === "ebs";
                    const isEip = res.resourceType === "eip";

                    const IconComp = isEc2 ? Cpu : isEbs ? HardDrive : isEip ? Network : Server;
                    const resName = res.instanceName || res.providerResourceId;

                    return (
                      <tr key={res.id} className="hover:bg-[#FAF6E8]/40 transition-colors">
                        <td className="py-3 font-mono font-bold text-[#2E2B1A]">
                          <div className="flex items-center gap-2">
                            <IconComp className="w-3.5 h-3.5 text-[#8D8975]" />
                            <span className="truncate max-w-[180px]" title={res.providerResourceId}>
                              {resName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-[#FAF6E8] text-[10.5px] font-mono uppercase text-[#8D8975] border border-[#ECE5CC]">
                            {res.resourceType}
                          </span>
                        </td>
                        <td className="py-3 text-[#686450] font-mono text-[11px]">
                          {res.region}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                            res.lifecycleState === "running"
                              ? "bg-[#E2F5EF] text-[#1F8A70]"
                              : "bg-[#FAF6E8] text-[#8D8975]"
                          }`}>
                            {res.lifecycleState}
                          </span>
                        </td>
                        <td className="py-3 font-mono font-bold text-[#2E2B1A]">
                          ${(res.monthlyCost || 0).toFixed(2)}/mo
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopyTagCommand(res.providerResourceId, res.region)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[11px] font-bold text-[#2E2B1A] transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            {copiedId === res.providerResourceId ? (
                              <>
                                <Check className="w-3 h-3 text-[#1F8A70]" />
                                <span className="text-[#1F8A70]">Copied CLI!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-[#8D8975]" />
                                <span>Copy Tag Command</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#1F8A70] font-bold">
                      ✓ All discovered AWS resources are compliant with mandatory allocation tags.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
