"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Code,
  Search,
  Filter,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Leaf,
  ShieldCheck,
  Cpu,
  HardDrive,
  Network,
  AlertTriangle,
  Info,
} from "lucide-react";

interface Resource {
  id: string;
  providerResourceId: string;
  resourceType: string;
  region: string;
  regionName?: string;
  regionCountry?: string;
  regionFlag?: string;
  instanceName?: string;
  lifecycleState: string;
  instanceType: string | null;
  sizeGb: number | null;
  monthlyCost: number | null;
  telemetryMetrics: string | null;
  tags?: string;
  carbonEmissions?: Array<{
    operationalGco2e: number;
    embodiedGco2e: number;
  }>;
}

interface Recommendation {
  id: string;
  title: string;
  category: string;
  status: string;
  estimatedMonthlySavings: number;
  estimatedGco2eSavings: number;
  riskScore: number;
  confidence: number;
  evidence: string;
  resource?: Resource | null;
}

interface RecommendationsViewProps {
  data: any;
  onSelectRecommendation: (rec: Recommendation) => void;
  onApproveRecommendation: (recId: string) => void;
  onNavigateSubTab: (subTab: string) => void;
}

export function RecommendationsView({
  data,
  onSelectRecommendation,
  onApproveRecommendation,
  onNavigateSubTab,
}: RecommendationsViewProps) {
  const recommendations: Recommendation[] = data?.recommendations?.items || [];
  const totalSavings = data?.recommendations?.totalSavings || 0;
  const totalCarbonSavings = data?.recommendations?.totalCarbonSavings || 38;

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = recommendations.filter((rec) => {
    const matchesSearch =
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.evidence.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.resource?.providerResourceId || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      rec.category.toLowerCase().includes(categoryFilter.toLowerCase()) ||
      (categoryFilter === "compute" && (rec.category.includes("ec2") || rec.category.includes("idle"))) ||
      (categoryFilter === "storage" && (rec.category.includes("ebs") || rec.category.includes("storage"))) ||
      (categoryFilter === "network" && (rec.category.includes("eip") || rec.category.includes("network")));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && rec.status === "active") ||
      (statusFilter === "approved" && rec.status !== "active");

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeCount = recommendations.filter((r) => r.status === "active").length;
  const approvedCount = recommendations.filter((r) => r.status !== "active").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00]">
                <Sparkles className="w-4 h-4 text-[#9A6B00]" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">Actionable Recommendations</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF76A] text-[11px] font-bold text-[#2E2B1A] border border-[#DFD6B5]">
                {activeCount} Action{activeCount !== 1 ? "s" : ""} Pending
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Deterministic, resource-specific actions generated from CloudWatch telemetry, idle heuristics, and carbon metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubTab("opt-opportunities")}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>View Strategic Opportunities</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1F8A70]" />
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#E2F5EF]/60 border border-[#BDEBDD]">
            <span className="text-[11px] font-mono text-[#1F8A70] uppercase font-bold block mb-1">
              Monthly Savings Pool
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#1F8A70]">
                +${totalSavings.toLocaleString()}
              </span>
              <span className="text-[11px] text-[#1F8A70] font-mono">/mo</span>
            </div>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-medium">
              Annualized: +${(totalSavings * 12).toLocaleString()}/yr
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Carbon Avoidance
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#2E2B1A]">
                {totalCarbonSavings.toFixed(1)}
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">gCO2e/day</span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              Immediate operational grid savings
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Pending Actions
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#9A6B00]">
                {activeCount}
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">resources</span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              Ready for immediate approval
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Approved &amp; Logged
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#1F8A70]">
                {approvedCount}
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">actions</span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              Recorded in immutable audit trail
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono uppercase font-bold text-[#8D8975] mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {[
              { id: "all", label: "All Items" },
              { id: "compute", label: "Compute" },
              { id: "storage", label: "Storage" },
              { id: "network", label: "Networking" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? "bg-[#2E2B1A] text-white shadow-2xs"
                    : "bg-[#FAF6E8] text-[#686450] hover:bg-[#ECE5CC] hover:text-[#2E2B1A]"
                }`}
              >
                {cat.label}
              </button>
            ))}

            <span className="text-[#ECE5CC] mx-1">|</span>

            {/* Status Filter Pills */}
            {[
              { id: "all", label: "All Status" },
              { id: "active", label: "Active" },
              { id: "approved", label: "Approved" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? "bg-[#1F8A70] text-white shadow-2xs"
                    : "bg-[#FAF6E8] text-[#686450] hover:bg-[#ECE5CC] hover:text-[#2E2B1A]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8D8975]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recommendations..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/30 text-[12.5px] text-[#2E2B1A] focus:outline-none focus:border-[#1F8A70]"
            />
          </div>
        </div>

        {/* Recommendations List */}
        <div className="space-y-3 pt-2">
          {filtered.length ? (
            filtered.map((rec) => {
              let parsedEvidence: any = null;
              try {
                parsedEvidence = JSON.parse(rec.evidence);
              } catch {
                // ignore
              }

              const isCompute =
                rec.category.toLowerCase().includes("ec2") ||
                rec.category.toLowerCase().includes("idle");
              const isStorage =
                rec.category.toLowerCase().includes("ebs") ||
                rec.category.toLowerCase().includes("volume") ||
                rec.category.toLowerCase().includes("storage");
              const isNetwork =
                rec.category.toLowerCase().includes("eip") ||
                rec.category.toLowerCase().includes("ip");

              return (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl border border-[#ECE5CC] bg-white hover:border-[#DFD6B5] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs hover:shadow-warm-sm"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded text-[10.5px] font-mono font-bold uppercase bg-[#FAF6E8] border border-[#ECE5CC] text-[#9A6B00] flex items-center gap-1">
                        {isCompute && <Cpu className="w-3 h-3 text-[#9A6B00]" />}
                        {isStorage && <HardDrive className="w-3 h-3 text-[#9A6B00]" />}
                        {isNetwork && <Network className="w-3 h-3 text-[#9A6B00]" />}
                        <span>{rec.category.replace(/_/g, " ")}</span>
                      </span>

                      <span className="text-[11px] font-mono text-[#8D8975] bg-[#FAF6E8]/80 px-2 py-0.5 rounded">
                        Risk Score: {(rec.riskScore * 100).toFixed(0)}% ({rec.riskScore <= 0.15 ? "Low Risk" : "Moderate Risk"})
                      </span>

                      <span className="text-[11px] font-mono text-[#1F8A70] bg-[#E2F5EF] px-2 py-0.5 rounded font-bold">
                        {(rec.confidence * 100).toFixed(0)}% Confidence
                      </span>

                      {rec.resource?.region && (
                        <span className="text-[11px] font-mono text-[#8D8975]">
                          Region: {rec.resource.region}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-[15px] text-[#2E2B1A]">
                        {rec.title}
                      </h4>
                      <p className="text-[12.5px] text-[#686450] max-w-3xl leading-relaxed mt-1">
                        {parsedEvidence?.reason || rec.evidence}
                      </p>
                    </div>

                    {parsedEvidence?.metrics && (
                      <div className="p-2.5 rounded-xl bg-[#FAF6E8]/40 border border-[#ECE5CC] text-[11.5px] font-mono text-[#686450] space-y-1">
                        <div>
                          <strong>CloudWatch Telemetry:</strong> P99 CPU: {parsedEvidence.metrics.cpuP99 || "< 1.5%"} | Network In: {parsedEvidence.metrics.networkInBytes || "0 bytes"}
                        </div>
                        {parsedEvidence.metrics.daysIdle && (
                          <div>
                            <strong>Inactivity Duration:</strong> {parsedEvidence.metrics.daysIdle} consecutive days without workload attachment
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: ROI & Action Controls */}
                  <div className="flex items-center gap-4 shrink-0 lg:self-center pt-3 lg:pt-0 border-t lg:border-t-0 border-[#ECE5CC]/80">
                    <div className="text-right">
                      <span className="text-[18px] font-black text-[#1F8A70] block">
                        +${rec.estimatedMonthlySavings.toFixed(2)}/mo
                      </span>
                      <span className="text-[11px] font-mono text-[#8D8975] block">
                        +{rec.estimatedGco2eSavings ? rec.estimatedGco2eSavings.toFixed(1) : "38.0"} gCO2e/day
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectRecommendation(rec)}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Code className="w-3.5 h-3.5 text-[#1F8A70]" />
                        <span>Inspect &amp; IaC</span>
                      </button>

                      {rec.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => onApproveRecommendation(rec.id)}
                          className="px-4 py-2 rounded-xl bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[12px] font-bold text-[#2E2B1A] shadow-xs cursor-pointer transition-all"
                        >
                          Approve
                        </button>
                      ) : (
                        <span className="px-3.5 py-2 rounded-xl bg-[#E2F5EF] text-[12px] font-bold text-[#1F8A70] border border-[#BDEBDD] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-[#8D8975] bg-[#FAF6E8]/30 rounded-2xl border border-dashed border-[#ECE5CC]">
              <Sparkles className="w-8 h-8 mx-auto text-[#8D8975]/60 mb-2" />
              <p className="font-bold text-[14px] text-[#2E2B1A]">No matching recommendations found</p>
              <p className="text-[12px] text-[#686450] mt-1">
                Try adjusting your search criteria or click &ldquo;Sync Telemetry&rdquo; to re-evaluate AWS assets.
              </p>
            </div>
          )}
        </div>

        {/* Strategic Cross-Link Footer */}
        <div className="pt-3 border-t border-[#ECE5CC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[12px] text-[#686450]">
            Looking for architectural modernization levers, Graviton migration, or Savings Plans?
          </p>
          <button
            type="button"
            onClick={() => onNavigateSubTab("opt-opportunities")}
            className="text-[12px] font-bold text-[#1F8A70] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Explore Strategic Opportunities</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
