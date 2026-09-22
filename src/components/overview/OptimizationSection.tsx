"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Server,
  Database,
  HardDrive,
  FolderArchive,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  Code2,
  Activity,
  Layers,
} from "lucide-react";

export interface OptimizationItem {
  id: string;
  category: "compute" | "database" | "storage";
  title: string;
  service: string;
  resource: string;
  region: string;
  savings: string;
  annualSavings: string;
  carbon: string;
  problem: string;
  recommendation: string;
  risk: string;
  riskType: "safe" | "scheduled";
  confidence: string;
  evidence: {
    label: string;
    value: string;
  }[];
  terraform: string;
}

export function OptimizationSection() {
  const [activeCategory, setActiveCategory] = useState<"all" | "compute" | "database" | "storage">("all");
  const [selectedItem, setSelectedItem] = useState<OptimizationItem | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedTerraform, setCopiedTerraform] = useState(false);

  // Exactly 4 Concrete, Evidence-Backed Actions (Matches "4 Actions Ready" & "All (4)" 100%)
  const optimizationItems: OptimizationItem[] = [
    {
      id: "opt-ec2-01",
      category: "compute",
      title: "Idle Development Server",
      service: "Amazon EC2",
      resource: "dev-api-server-01",
      region: "us-east-1",
      savings: "$52",
      annualSavings: "$624",
      carbon: "12 kg CO₂e",
      problem: "CPU utilization averaged under 2% for 14 consecutive days. Server sits completely idle outside business hours.",
      recommendation: "Configure automatic schedule to shut down during nights and weekends, cutting 68% of active runtime.",
      risk: "Safe to apply",
      riskType: "safe",
      confidence: "98% confidence",
      evidence: [
        { label: "14-Day P95 CPU", value: "1.8% (Target < 5%)" },
        { label: "Memory Peak", value: "14% of 16 GB" },
        { label: "Off-Hours Traffic", value: "0 HTTP requests (7 PM - 8 AM)" },
        { label: "Downtime Risk", value: "Zero (Dev Environment)" },
      ],
      terraform: `# Automated nightly schedule for idle test instance
resource "aws_instance" "dev_api_server" {
  instance_state = "stopped" # Schedule: 7PM - 8AM Mon-Fri
  tags = {
    AutoShutdown = "true"
    Environment  = "development"
  }
}`,
    },
    {
      id: "opt-rds-01",
      category: "database",
      title: "Oversized Staging Database",
      service: "Amazon RDS",
      resource: "staging-postgres-db",
      region: "us-east-1",
      savings: "$184",
      annualSavings: "$2,208",
      carbon: "31 kg CO₂e",
      problem: "Allocated 8 vCPUs and 32 GB memory, but actual peak demand stayed below 10% over the last 30 days.",
      recommendation: "Downsize to a 2 vCPU / 8 GB memory instance (db.t4g.medium) during your weekly maintenance window.",
      risk: "Low risk (Scheduled)",
      riskType: "scheduled",
      confidence: "95% confidence",
      evidence: [
        { label: "Allocated Shape", value: "db.m5.xlarge ($280/mo)" },
        { label: "30-Day Peak RAM", value: "2.4 GB / 32 GB" },
        { label: "Average IOPS", value: "42 IOPS (Baseline 3000)" },
        { label: "Recommended Shape", value: "db.t4g.medium ($96/mo)" },
      ],
      terraform: `# Downsize staging database to match actual demand
resource "aws_db_instance" "staging_db" {
- instance_class = "db.m5.xlarge"  # 8 vCPU, 32GB RAM ($280/mo)
+ instance_class = "db.t4g.medium" # 2 vCPU, 8GB RAM ($96/mo)
  apply_immediately = false # Safe apply in scheduled window
}`,
    },
    {
      id: "opt-ebs-01",
      category: "storage",
      title: "Unattached Storage Disk",
      service: "Amazon EBS",
      resource: "vol-backup-disk-500g",
      region: "us-east-1",
      savings: "$40",
      annualSavings: "$480",
      carbon: "6 kg CO₂e",
      problem: "500 GB storage volume has remained disconnected and unattached for 26 days after its virtual machine was deleted.",
      recommendation: "Take an automated safety snapshot backup, then safely delete the orphaned storage disk.",
      risk: "Safe to apply",
      riskType: "safe",
      confidence: "99% confidence",
      evidence: [
        { label: "Orphaned Duration", value: "26 Days Disconnected" },
        { label: "Allocated Size", value: "500 GB gp3" },
        { label: "Safety Snapshot", value: "Pre-execution snapshot included" },
        { label: "Attached Instance", value: "Terminated Aug 28" },
      ],
      terraform: `# Step 1: Create safety snapshot backup
resource "aws_ebs_snapshot" "safety_backup" {
  volume_id   = "vol-backup-disk-500g"
  description = "Safety snapshot before volume termination"
}
# Step 2: Unused volume removed safely`,
    },
    {
      id: "opt-s3-01",
      category: "storage",
      title: "Inactive Log Bucket Tiering",
      service: "Amazon S3",
      resource: "prod-raw-logs-archive",
      region: "us-east-1",
      savings: "$126",
      annualSavings: "$1,512",
      carbon: "15 kg CO₂e",
      problem: "8.4 TB of application log archives in S3 Standard have had zero read requests for over 90 consecutive days.",
      recommendation: "Apply an automated S3 Lifecycle rule to transition objects older than 90 days to Glacier Instant Retrieval.",
      risk: "Safe to apply",
      riskType: "safe",
      confidence: "96% confidence",
      evidence: [
        { label: "Bucket Size", value: "8.4 TB Standard ($193/mo)" },
        { label: "Last Read Request", value: "92 days ago" },
        { label: "Target Tier", value: "Glacier Instant Retrieval ($33/mo)" },
        { label: "Access Latency", value: "Milliseconds (Instant Retrieval)" },
      ],
      terraform: `# Transition inactive logs to Glacier Instant Retrieval
resource "aws_s3_bucket_lifecycle_configuration" "log_tiering" {
  bucket = "prod-raw-logs-archive"
  rule {
    id     = "archive-90d-logs"
    status = "Enabled"
    transition {
      days          = 90
      storage_class = "GLACIER_IR" # 68% cheaper storage
    }
  }
}`,
    },
  ];

  const filteredItems = activeCategory === "all"
    ? optimizationItems
    : optimizationItems.filter((item) => item.category === activeCategory);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTerraform(true);
    setTimeout(() => setCopiedTerraform(false), 2000);
  };

  return (
    <section id="optimization" className="scroll-mt-20">
      <div className="p-6 sm:p-7 rounded-[28px] bg-white border border-[#ECE5CC] shadow-warm-lg">
        {/* Section Header: Title + Badge on left, Filter Tabs on right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#ECE5CC]">
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] sm:text-[22px] font-black text-[#2E2B1A] tracking-tight">
              Recommended Optimizations
            </h2>
            <span className="text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFF76A] text-[#2E2B1A] border border-[#DFD6B5]">
              4 Ready
            </span>
          </div>

          {/* Filter Tabs: All (4), Compute, Database, Storage (Fully Rounded Capsule Pill) */}
          <div className="flex items-center gap-1 bg-[#FAF6E8] p-1 rounded-full border border-[#ECE5CC] text-[12px] font-medium shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-3.5 py-1 rounded-full transition-all ${
                activeCategory === "all"
                  ? "bg-white text-[#2E2B1A] shadow-sm font-bold"
                  : "text-[#8D8975] hover:text-[#2E2B1A]"
              }`}
            >
              All (4)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("compute")}
              className={`px-3.5 py-1 rounded-full transition-all ${
                activeCategory === "compute"
                  ? "bg-white text-[#2E2B1A] shadow-sm font-bold"
                  : "text-[#8D8975] hover:text-[#2E2B1A]"
              }`}
            >
              Compute
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("database")}
              className={`px-3.5 py-1 rounded-full transition-all ${
                activeCategory === "database"
                  ? "bg-white text-[#2E2B1A] shadow-sm font-bold"
                  : "text-[#8D8975] hover:text-[#2E2B1A]"
              }`}
            >
              Database
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("storage")}
              className={`px-3.5 py-1 rounded-full transition-all ${
                activeCategory === "storage"
                  ? "bg-white text-[#2E2B1A] shadow-sm font-bold"
                  : "text-[#8D8975] hover:text-[#2E2B1A]"
              }`}
            >
              Storage
            </button>
          </div>
        </div>

        {/* Clean Recommendation Cards with Distinct Warm Contrast */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-[22px] bg-[#FAF6E8] hover:bg-[#F5EEDB] border border-[#ECE5CC] hover:border-[#DFD6B5] transition-all shadow-warm-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left: Service Icon + Title + Resource Tag + Description */}
              <div className="flex items-start gap-4 flex-1">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                    item.category === "compute"
                      ? "bg-[#FFF8E7] text-[#D97706] border-[#FDE68A]"
                      : item.category === "database"
                      ? "bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]"
                      : item.id === "opt-s3-01"
                      ? "bg-[#FAF5FF] text-[#7C3AED] border-[#DDD6FE]"
                      : "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                  }`}
                >
                  {item.category === "compute" && <Server className="w-5 h-5" />}
                  {item.category === "database" && <Database className="w-5 h-5" />}
                  {item.id === "opt-s3-01" ? (
                    <FolderArchive className="w-5 h-5" />
                  ) : item.category === "storage" ? (
                    <HardDrive className="w-5 h-5" />
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Row 1: Title + Service Badge + Resource ID (All inline utilizing available space) */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="text-[16px] font-bold text-[#2E2B1A]">
                      {item.title}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold text-[#686450] bg-white border border-[#ECE5CC] shadow-2xs">
                      {item.service}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono text-[#8D8975] bg-white border border-[#ECE5CC] shadow-2xs">
                      {item.resource}
                    </span>
                  </div>

                  {/* Row 2: Description utilizing full available width without orphan wraps */}
                  <p className="text-[13px] text-[#686450] leading-relaxed">
                    {item.problem}
                  </p>
                </div>
              </div>

              {/* Right: Savings Numbers, Risk Badge, and Review Button */}
              <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-0 border-[#ECE5CC]">
                <div className="text-right">
                  <div className="text-[17px] font-black text-[#9A6B00]">
                    +{item.savings} <span className="text-[12px] font-normal text-[#686450]">/ mo</span>
                  </div>
                  <div className="text-[12px] text-[#1F8A70] font-semibold">
                    ↓ {item.carbon} cut
                  </div>
                </div>

                {/* Risk Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-semibold border ${
                    item.riskType === "safe"
                      ? "bg-[#E2F5EF] text-[#1F8A70] border-[#1F8A70]/25"
                      : "bg-[#FFF3D6] text-[#9A6B00] border-[#9A6B00]/25"
                  }`}
                >
                  {item.riskType === "safe" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  <span>{item.risk}</span>
                </span>

                {/* Review Action Button */}
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="px-5 py-2 rounded-full text-[13px] font-bold bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[#2E2B1A] shadow-sm hover:shadow-sunshine-glow transition-all"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Modal Dialog (Clean, Rich Evidence Inspection) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-[#2E2B1A]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#ECE5CC] rounded-[24px] max-w-lg w-full p-6 shadow-warm-xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#ECE5CC]">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#1F8A70]"></span>
                <h4 className="font-bold text-[16.5px] text-[#2E2B1A]">{selectedItem.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full hover:bg-[#FAF6E8] flex items-center justify-center text-[#686450] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-[13px] text-[#686450] mb-6">
              {/* Target Resource Box */}
              <div className="p-3.5 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-between">
                <div>
                  <div className="text-[#8D8975] text-[10.5px] uppercase font-bold tracking-wider mb-0.5">
                    Target AWS Resource
                  </div>
                  <div className="font-bold text-[#2E2B1A] text-[14px]">
                    {selectedItem.resource} ({selectedItem.service})
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-[#ECE5CC] text-[#8D8975]">
                  {selectedItem.region}
                </span>
              </div>

              {/* Problem Analysis */}
              <div>
                <strong className="text-[#2E2B1A] block mb-1">Detected Waste:</strong>
                <p className="leading-relaxed bg-[#FFFDF7] p-2.5 rounded-lg border border-[#ECE5CC]">
                  {selectedItem.problem}
                </p>
              </div>

              {/* Recommended Action */}
              <div>
                <strong className="text-[#2E2B1A] block mb-1">Recommended Solution:</strong>
                <p className="leading-relaxed bg-[#FFFDF7] p-2.5 rounded-lg border border-[#ECE5CC]">
                  {selectedItem.recommendation}
                </p>
              </div>

              {/* Automated Infrastructure Code (Terraform) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-[#8D8975] uppercase tracking-wider">
                    Automated Infrastructure Change (Terraform):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedItem.terraform)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9A6B00] hover:text-[#2E2B1A]"
                  >
                    {copiedTerraform ? (
                      <>
                        <Check className="w-3 h-3 text-[#1F8A70]" />
                        <span className="text-[#1F8A70]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-[#2E2B1A] text-[#FFFDF4] font-mono text-[11.5px] overflow-x-auto leading-relaxed border border-[#DFD6B5]/20">
                  {selectedItem.terraform}
                </pre>
              </div>

              {/* ROI & Impact Metrics */}
              <div className="grid grid-cols-2 gap-3 text-center pt-1">
                <div className="p-3 rounded-xl bg-[#FFF3D6] border border-[#DFD6B5]">
                  <span className="text-[11px] text-[#9A6B00] block font-semibold">Monthly Savings</span>
                  <strong className="text-[19px] text-[#9A6B00] font-black">+{selectedItem.savings} / mo</strong>
                  <span className="text-[10px] text-[#9A6B00]/80 block mt-0.5">({selectedItem.annualSavings} / year)</span>
                </div>
                <div className="p-3 rounded-xl bg-[#E2F5EF] border border-[#1F8A70]/20">
                  <span className="text-[11px] text-[#1F8A70] block font-semibold">Carbon Reduction</span>
                  <strong className="text-[19px] text-[#1F8A70] font-black">{selectedItem.carbon} cut</strong>
                  <span className="text-[10px] text-[#1F8A70]/80 block mt-0.5">Direct electricity savings</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#ECE5CC]">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-full border border-[#ECE5CC] text-[#686450] text-[13px] font-semibold hover:bg-[#FAF6E8] transition-colors"
              >
                Close
              </button>
              <Link
                href="/onboarding"
                className="px-5 py-2 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[#2E2B1A] text-[13px] font-bold shadow-sm inline-flex items-center gap-1.5 transition-all"
              >
                <span>Connect AWS to Apply</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
