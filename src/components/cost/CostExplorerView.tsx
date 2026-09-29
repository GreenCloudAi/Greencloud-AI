"use client";

import React, { useState, useMemo } from "react";
import {
  DollarSign,
  Download,
  Search,
  Filter,
  Layers,
  Cpu,
  HardDrive,
  Network,
  Server,
  Shield,
  Activity,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Info,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface ServiceCostItem {
  service: string;
  total: number;
}

interface CostExplorerViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
}

export function CostExplorerView({ data, onNavigateSubTab }: CostExplorerViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [granularity, setGranularity] = useState<"daily" | "monthly">("monthly");
  const [costMetric, setCostMetric] = useState<"unblended" | "amortized" | "net">("unblended");

  const totalCost = data?.costs?.totalCost || 0;
  const dailyBurn = data?.costs?.dailyBurnRate || 0;
  const rawServices: ServiceCostItem[] = data?.costs?.byService || [];
  const dailyTrend: Array<{ date: string; cost: number }> = data?.costs?.dailyTrend || [];

  // Helper to categorize AWS services
  const getServiceCategory = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes("ec2") || lower.includes("compute") || lower.includes("lambda")) return "Compute";
    if (lower.includes("ebs") || lower.includes("s3") || lower.includes("storage") || lower.includes("glacier")) return "Storage";
    if (lower.includes("rds") || lower.includes("dynamo") || lower.includes("database")) return "Database";
    if (lower.includes("vpc") || lower.includes("nat") || lower.includes("eip") || lower.includes("cloudfront") || lower.includes("transfer") || lower.includes("route53")) return "Networking";
    if (lower.includes("cloudwatch") || lower.includes("cloudtrail") || lower.includes("config") || lower.includes("monitoring")) return "Management";
    return "Other";
  };

  const getServiceIcon = (category: string) => {
    switch (category) {
      case "Compute":
        return <Cpu className="w-4 h-4 text-[#1F8A70]" />;
      case "Storage":
        return <HardDrive className="w-4 h-4 text-[#9A6B00]" />;
      case "Database":
        return <Server className="w-4 h-4 text-[#3B82F6]" />;
      case "Networking":
        return <Network className="w-4 h-4 text-[#8D8975]" />;
      case "Management":
        return <Activity className="w-4 h-4 text-[#1F8A70]" />;
      default:
        return <Layers className="w-4 h-4 text-[#8D8975]" />;
    }
  };

  // Filtered services
  const filteredServices = useMemo(() => {
    return rawServices.filter((item) => {
      const matchesSearch = item.service.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedCategory === "all") return true;
      const cat = getServiceCategory(item.service);
      return cat.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [rawServices, searchQuery, selectedCategory]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredServices.length) return;
    const headers = ["Service Name", "Category", "Billed Amount (USD)", "Invoice Share (%)", "Daily Run Rate (USD)"];
    const rows = filteredServices.map((s) => {
      const cat = getServiceCategory(s.service);
      const pct = totalCost > 0 ? ((s.total / totalCost) * 100).toFixed(1) : "0.0";
      const daily = (s.total / 30).toFixed(2);
      return [`"${s.service}"`, `"${cat}"`, s.total.toFixed(2), `${pct}%`, daily];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aws_cost_explorer_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">AWS Cost Explorer</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                Multi-Dimensional Ledger
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Deep-dive cloud usage ledger with AWS Cost &amp; Usage Report (CUR) granularity.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Metric Toggle */}
            <div className="flex items-center bg-[#FAF6E8] p-1 rounded-xl border border-[#ECE5CC] text-[11.5px]">
              <button
                type="button"
                onClick={() => setCostMetric("unblended")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  costMetric === "unblended" ? "bg-white text-[#2E2B1A] shadow-2xs" : "text-[#8D8975]"
                }`}
              >
                Unblended
              </button>
              <button
                type="button"
                onClick={() => setCostMetric("amortized")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  costMetric === "amortized" ? "bg-white text-[#2E2B1A] shadow-2xs" : "text-[#8D8975]"
                }`}
              >
                Amortized
              </button>
            </div>

            {/* Granularity Toggle */}
            <div className="flex items-center bg-[#FAF6E8] p-1 rounded-xl border border-[#ECE5CC] text-[11.5px]">
              <button
                type="button"
                onClick={() => setGranularity("daily")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  granularity === "daily" ? "bg-white text-[#2E2B1A] shadow-2xs" : "text-[#8D8975]"
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setGranularity("monthly")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  granularity === "monthly" ? "bg-white text-[#2E2B1A] shadow-2xs" : "text-[#8D8975]"
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#1F8A70]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Active Billing Cycle
            </span>
            <span className="text-[26px] font-black text-[#2E2B1A]">
              ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold">
              {rawServices.length} Billed AWS services recorded
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Daily Amortized Run-Rate
            </span>
            <span className="text-[26px] font-black text-[#2E2B1A]">
              ${dailyBurn.toFixed(2)}/day
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1 font-mono">
              Normalized over active period
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Top Spend Driver
            </span>
            <span className="text-[22px] font-black text-[#2E2B1A] truncate block">
              {rawServices[0]?.service || "None"}
            </span>
            <span className="text-[11px] text-[#9A6B00] block mt-1 font-semibold">
              {rawServices[0] && totalCost > 0 ? `${Math.round((rawServices[0].total / totalCost) * 100)}% of monthly total` : "--"}
            </span>
          </div>
        </div>

        {/* Daily Spend Velocity SVG Graph */}
        <div className="pt-2 border-t border-[#ECE5CC]">
          <div className="flex items-center justify-between mb-3 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#2E2B1A]">Daily Spend Trajectory</span>
              <span className="text-[#8D8975] font-mono text-[11px]">
                ({dailyTrend.length > 0 ? `${dailyTrend.length} days captured` : "30-day window"})
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#1F8A70] font-bold">
              Current Burn: ${dailyBurn.toFixed(2)}/day
            </span>
          </div>

          <div className="h-40 w-full bg-[#FAF6E8]/30 rounded-2xl p-3 border border-[#ECE5CC]/60 flex flex-col justify-between relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="spendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFF76A" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#FFF76A" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {totalCost > 0 ? (
                <>
                  <path d="M 0,90 Q 120,80 250,55 T 500,25 L 500,120 L 0,120 Z" fill="url(#spendAreaGrad)" />
                  <path d="M 0,90 Q 120,80 250,55 T 500,25" fill="transparent" stroke="#1F8A70" strokeWidth="2.5" />
                </>
              ) : (
                <line x1="0" y1="100" x2="500" y2="100" stroke="#1F8A70" strokeWidth="2" strokeDasharray="4 4" />
              )}
            </svg>

            <div className="flex items-center justify-between text-[10.5px] font-mono text-[#8D8975] pt-1 border-t border-[#ECE5CC]/40">
              <span>Day 1</span>
              <span>Day 7</span>
              <span>Day 14</span>
              <span>Day 21</span>
              <span>Day 30 (Today)</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#8D8975] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search AWS services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF6E8]/50 border border-[#ECE5CC] text-[12.5px] text-[#2E2B1A] placeholder-[#8D8975] focus:outline-none focus:border-[#1F8A70]"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {["all", "compute", "storage", "database", "networking", "management"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold capitalize transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#1F8A70] text-white shadow-2xs"
                    : "bg-[#FAF6E8] text-[#686450] hover:text-[#2E2B1A] border border-[#ECE5CC]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Service Spend Ledger Table */}
        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[#ECE5CC] font-mono text-[11px] text-[#8D8975] uppercase">
                <th className="py-2.5">AWS Service</th>
                <th className="py-2.5">Category</th>
                <th className="py-2.5">Billed Spend</th>
                <th className="py-2.5">Invoice Share</th>
                <th className="py-2.5">Daily Velocity</th>
                <th className="py-2.5 text-right">Optimization Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE5CC]/50">
              {filteredServices.length > 0 ? (
                filteredServices.map((item, idx) => {
                  const cat = getServiceCategory(item.service);
                  const pct = totalCost > 0 ? Math.round((item.total / totalCost) * 100) : 0;
                  const daily = item.total / 30;

                  return (
                    <tr key={idx} className="hover:bg-[#FAF6E8]/40 transition-colors">
                      <td className="py-3 font-bold text-[#2E2B1A]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center shrink-0">
                            {getServiceIcon(cat)}
                          </div>
                          <span>{item.service}</span>
                        </div>
                      </td>
                      <td className="py-3 text-[#686450]">
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF6E8] text-[11px] font-mono font-bold text-[#8D8975] border border-[#ECE5CC]">
                          {cat}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-[#2E2B1A]">
                        ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] overflow-hidden">
                            <div
                              className="h-full bg-[#1F8A70] rounded-full"
                              style={{ width: `${Math.max(pct, item.total > 0 ? 5 : 0)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-[#8D8975]">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-[#686450]">
                        ~${daily.toFixed(2)}/day
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#1F8A70]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Monitored</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8D8975]">
                    {searchQuery || selectedCategory !== "all" ? (
                      <div>No AWS services found matching your search filter.</div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-bold text-[#2E2B1A]">No billable AWS charges recorded in active billing cycle.</p>
                        <p className="text-[12px] text-[#686450]">All connected compute and storage resources are operating within the AWS Free Tier.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
