"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  TrendingDown,
  Cpu,
  HardDrive,
  Clock,
  Archive,
  Award,
  Layers,
  CheckCircle2,
  DollarSign,
  Leaf,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Sliders,
} from "lucide-react";

interface OpportunitiesViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
  onSelectRecommendation?: (rec: any) => void;
}

export function OpportunitiesView({
  data,
  onNavigateSubTab,
  onSelectRecommendation,
}: OpportunitiesViewProps) {
  const totalCost = data?.costs?.totalCost || 112.95;
  const runningEc2 = data?.resources?.runningEc2Count || (data?.resources?.ec2?.filter((e: any) => e.lifecycleState === "running").length || 2);
  const totalEbs = data?.resources?.ebs?.length || 2;

  // Modernization Simulations
  const gravitonPotentialMonthlySavings = parseFloat((totalCost * 0.18).toFixed(2));
  const savingsPlan3YearMonthlySavings = parseFloat((totalCost * 0.32).toFixed(2));
  const gp2ToGp3MonthlySavings = parseFloat((totalEbs * 6.4).toFixed(2));
  const devSchedulingMonthlySavings = parseFloat((totalCost * 0.22).toFixed(2));
  const s3TieringMonthlySavings = 14.50;

  const totalStrategicOpportunity = parseFloat(
    (gravitonPotentialMonthlySavings + savingsPlan3YearMonthlySavings + gp2ToGp3MonthlySavings + devSchedulingMonthlySavings + s3TieringMonthlySavings).toFixed(2)
  );

  const [activeSavingsPlanTerm, setActiveSavingsPlanTerm] = useState<"1yr" | "3yr">("1yr");
  const [savingsPlanPaymentOption, setSavingsPlanPaymentOption] = useState<"no_upfront" | "all_upfront">("no_upfront");
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  const getSavingsPlanDiscountPct = () => {
    if (activeSavingsPlanTerm === "3yr") {
      return savingsPlanPaymentOption === "all_upfront" ? 38 : 32;
    }
    return savingsPlanPaymentOption === "all_upfront" ? 28 : 24;
  };

  const currentDiscount = getSavingsPlanDiscountPct();
  const calculatedSavingsPlanAmount = parseFloat(((totalCost * currentDiscount) / 100).toFixed(2));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                <Layers className="w-4 h-4 text-[#1F8A70]" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">Strategic Modernization Opportunities</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                Architectural FinOps
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              High-leverage engineering transformations, modern silicon adoption, and commercial commitment portfolio models.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubTab("opt-recommendations")}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>Back to Actionable Items</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1F8A70]" />
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#E2F5EF]/60 border border-[#BDEBDD]">
            <span className="text-[11px] font-mono text-[#1F8A70] uppercase font-bold block mb-1">
              Total Modernization Value
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#1F8A70]">
                +${totalStrategicOpportunity.toFixed(2)}
              </span>
              <span className="text-[11px] text-[#1F8A70] font-mono">/mo</span>
            </div>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-medium">
              Annualized: +${(totalStrategicOpportunity * 12).toFixed(2)}/yr
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Graviton Silicon Advantage
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#2E2B1A]">
                -20% Cost
              </span>
            </div>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold">
              +60% Energy Efficiency (gCO2e)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              gp2 &rarr; gp3 Modernization
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#2E2B1A]">
                -20%
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">per GB</span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              Free 3,000 IOPS &amp; 125 MB/s baseline
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Dev/Staging Sleep Cycles
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-[#1F8A70]">
                -65%
              </span>
              <span className="text-[11px] text-[#8D8975] font-mono">hours</span>
            </div>
            <span className="text-[11px] text-[#686450] block mt-1">
              Nights &amp; weekends shutdown
            </span>
          </div>
        </div>

        {/* 5 Deep-Dive Opportunity Modules */}
        <div className="space-y-4 pt-2">
          {/* 1. AWS Graviton3 / Arm64 Migration */}
          <div className="p-5 rounded-2xl border border-[#ECE5CC] bg-white space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ECE5CC] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E2F5EF] text-[#1F8A70] flex items-center justify-center font-bold text-[13px]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-[#2E2B1A]">
                    1. AWS Graviton3 (Arm64) Silicon Architecture Migration
                  </h3>
                  <span className="text-[11.5px] text-[#686450]">
                    Migrate compute-bound and memory-bound EC2 instances from x86_64 to custom AWS Graviton processors.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-[#E2F5EF] text-[#1F8A70] font-mono font-bold text-[12px] border border-[#BDEBDD]">
                  +${gravitonPotentialMonthlySavings}/mo Potential
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
              <div className="p-3.5 rounded-xl bg-[#FAF6E8]/40 border border-[#ECE5CC] space-y-1">
                <span className="text-[10.5px] font-mono text-[#8D8975] uppercase font-bold block">
                  Current Compute Baseline
                </span>
                <p className="font-bold text-[#2E2B1A]">Intel / AMD x86_64 Architecture</p>
                <p className="text-[#686450]">
                  Standard `c5`, `m5`, `t3` instances running in active regions with standard thermal envelopes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF6E8]/40 border border-[#ECE5CC] space-y-1">
                <span className="text-[10.5px] font-mono text-[#8D8975] uppercase font-bold block">
                  Recommended Target
                </span>
                <p className="font-bold text-[#1F8A70]">Graviton3 (`c7g`, `m7g`, `t4g`)</p>
                <p className="text-[#686450]">
                  Drop-in replacement for containerized Linux, Go, Node.js, Python, Java, and Redis workloads.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF6E8]/40 border border-[#ECE5CC] space-y-1">
                <span className="text-[10.5px] font-mono text-[#8D8975] uppercase font-bold block">
                  FinOps &amp; GreenOps Impact
                </span>
                <p className="font-bold text-[#2E2B1A]">-20% Cost &amp; -60% Energy</p>
                <p className="text-[#686450]">
                  Delivers superior price/performance while dramatically slashing your organization&apos;s Scope 2 carbon footprint.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF6E8]/30 border border-[#ECE5CC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
              <div className="font-mono text-[11.5px] text-[#686450]">
                <strong>Docker Multi-Arch Build CLI:</strong> <code>docker buildx build --platform linux/arm64,linux/amd64 -t app:v1 .</code>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("docker buildx build --platform linux/arm64,linux/amd64 -t app:v1 .", "graviton")}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#ECE5CC] hover:bg-[#FAF6E8] text-[11px] font-bold text-[#2E2B1A] flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedSnippet === "graviton" ? <Check className="w-3 h-3 text-[#1F8A70]" /> : <Copy className="w-3 h-3 text-[#8D8975]" />}
                <span>{copiedSnippet === "graviton" ? "Copied Command" : "Copy Buildx Command"}</span>
              </button>
            </div>
          </div>

          {/* 2. Compute Savings Plans & Reservation Modeling */}
          <div className="p-5 rounded-2xl border border-[#ECE5CC] bg-white space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ECE5CC] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFF3D6] text-[#9A6B00] flex items-center justify-center font-bold text-[13px]">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-[#2E2B1A]">
                    2. Compute Savings Plans &amp; Reserved Instances (RI) Portfolio
                  </h3>
                  <span className="text-[11.5px] text-[#686450]">
                    Commitment modeling for steady-state baseline compute across EC2, Fargate, and Lambda.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-[#E2F5EF] text-[#1F8A70] font-mono font-bold text-[12px] border border-[#BDEBDD]">
                  +{currentDiscount}% Discount (+${calculatedSavingsPlanAmount}/mo)
                </span>
              </div>
            </div>

            {/* Interactive Commitment Simulator */}
            <div className="p-4 rounded-xl bg-[#FAF6E8]/40 border border-[#ECE5CC] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase">Term Horizon:</span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#ECE5CC]">
                    <button
                      type="button"
                      onClick={() => setActiveSavingsPlanTerm("1yr")}
                      className={`px-3 py-1 rounded-lg text-[11.5px] font-bold cursor-pointer transition-all ${
                        activeSavingsPlanTerm === "1yr"
                          ? "bg-[#2E2B1A] text-white"
                          : "text-[#686450] hover:text-[#2E2B1A]"
                      }`}
                    >
                      1 Year Commitment
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSavingsPlanTerm("3yr")}
                      className={`px-3 py-1 rounded-lg text-[11.5px] font-bold cursor-pointer transition-all ${
                        activeSavingsPlanTerm === "3yr"
                          ? "bg-[#2E2B1A] text-white"
                          : "text-[#686450] hover:text-[#2E2B1A]"
                      }`}
                    >
                      3 Year Commitment (Max ROI)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase">Payment Mode:</span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#ECE5CC]">
                    <button
                      type="button"
                      onClick={() => setSavingsPlanPaymentOption("no_upfront")}
                      className={`px-3 py-1 rounded-lg text-[11.5px] font-bold cursor-pointer transition-all ${
                        savingsPlanPaymentOption === "no_upfront"
                          ? "bg-[#1F8A70] text-white"
                          : "text-[#686450] hover:text-[#2E2B1A]"
                      }`}
                    >
                      No Upfront (Monthly Billed)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavingsPlanPaymentOption("all_upfront")}
                      className={`px-3 py-1 rounded-lg text-[11.5px] font-bold cursor-pointer transition-all ${
                        savingsPlanPaymentOption === "all_upfront"
                          ? "bg-[#1F8A70] text-white"
                          : "text-[#686450] hover:text-[#2E2B1A]"
                      }`}
                    >
                      All Upfront
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[12px] font-mono">
                <div className="p-3 bg-white rounded-lg border border-[#ECE5CC]">
                  <span className="text-[#8D8975] block text-[10.5px]">Projected Discount:</span>
                  <strong className="text-[16px] text-[#1F8A70]">{currentDiscount}% off On-Demand</strong>
                </div>
                <div className="p-3 bg-white rounded-lg border border-[#ECE5CC]">
                  <span className="text-[#8D8975] block text-[10.5px]">Estimated Monthly Savings:</span>
                  <strong className="text-[16px] text-[#2E2B1A]">+${calculatedSavingsPlanAmount}/mo</strong>
                </div>
                <div className="p-3 bg-white rounded-lg border border-[#ECE5CC]">
                  <span className="text-[#8D8975] block text-[10.5px]">Break-Even Horizon:</span>
                  <strong className="text-[16px] text-[#9A6B00]">Immediate (No Upfront)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 3. gp2 to gp3 EBS Block Storage Modernization */}
          <div className="p-5 rounded-2xl border border-[#ECE5CC] bg-white space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ECE5CC] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] text-[#9A6B00] flex items-center justify-center font-bold text-[13px]">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-[#2E2B1A]">
                    3. gp2 to gp3 EBS Block Storage Modernization
                  </h3>
                  <span className="text-[11.5px] text-[#686450]">
                    Zero-downtime volume upgrade providing an immediate 20% price reduction with uncoupled IOPS/throughput.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-[#E2F5EF] text-[#1F8A70] font-mono font-bold text-[12px] border border-[#BDEBDD]">
                  -20% Storage Cost
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
              <div className="p-3.5 rounded-xl bg-[#FAF6E8]/30 border border-[#ECE5CC] space-y-2">
                <h4 className="font-bold text-[#2E2B1A] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1F8A70]" />
                  Why Upgrade from gp2 to gp3?
                </h4>
                <ul className="space-y-1.5 text-[#686450]">
                  <li>&bull; <strong>20% Lower Cost:</strong> $0.08/GB-month vs $0.10/GB-month on gp2.</li>
                  <li>&bull; <strong>Free Baseline Performance:</strong> 3,000 baseline IOPS and 125 MB/s throughput included free regardless of disk size.</li>
                  <li>&bull; <strong>Zero Downtime:</strong> AWS Elastic Volumes modifies the disk live without instance reboot or IO freeze.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF6E8]/30 border border-[#ECE5CC] space-y-2">
                <h4 className="font-bold text-[#2E2B1A]">Live Migration AWS CLI Script:</h4>
                <div className="p-2.5 bg-white rounded-lg border border-[#ECE5CC] font-mono text-[11px] text-[#2E2B1A] overflow-x-auto">
                  <code>aws ec2 modify-volume --volume-id vol-0e782e44fdd06d214 --volume-type gp3</code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy("aws ec2 modify-volume --volume-id vol-0e782e44fdd06d214 --volume-type gp3", "ebs")}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#ECE5CC] hover:bg-[#FAF6E8] text-[11px] font-bold text-[#2E2B1A] flex items-center gap-1 cursor-pointer"
                >
                  {copiedSnippet === "ebs" ? <Check className="w-3 h-3 text-[#1F8A70]" /> : <Copy className="w-3 h-3 text-[#8D8975]" />}
                  <span>{copiedSnippet === "ebs" ? "Copied Script" : "Copy AWS CLI Modification Command"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Automated Dev/Staging Off-Hours Sleep Scheduling */}
          <div className="p-5 rounded-2xl border border-[#ECE5CC] bg-white space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ECE5CC] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] text-[#1F8A70] flex items-center justify-center font-bold text-[13px]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-[#2E2B1A]">
                    4. Automated Dev/Staging Off-Hours Sleep Scheduling
                  </h3>
                  <span className="text-[11.5px] text-[#686450]">
                    Automatically stop non-production instances during nights and weekends, cutting runtime from 730 to ~240 hrs/month.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-[#E2F5EF] text-[#1F8A70] font-mono font-bold text-[12px] border border-[#BDEBDD]">
                  -65% Runtime (+${devSchedulingMonthlySavings}/mo)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
              <div className="p-3 bg-[#FAF6E8]/30 rounded-xl border border-[#ECE5CC]">
                <span className="text-[10.5px] font-mono text-[#8D8975] uppercase block">Schedule Window</span>
                <p className="font-bold text-[#2E2B1A] mt-0.5">Weekdays 19:00 &rarr; 07:00</p>
                <p className="text-[#686450] text-[11.5px]">Instances paused automatically outside engineer core hours.</p>
              </div>

              <div className="p-3 bg-[#FAF6E8]/30 rounded-xl border border-[#ECE5CC]">
                <span className="text-[10.5px] font-mono text-[#8D8975] uppercase block">Weekend Policy</span>
                <p className="font-bold text-[#2E2B1A] mt-0.5">Friday 19:00 &rarr; Monday 07:00</p>
                <p className="text-[#686450] text-[11.5px]">48 consecutive hours of zero idle compute burn.</p>
              </div>

              <div className="p-3 bg-[#FAF6E8]/30 rounded-xl border border-[#ECE5CC]">
                <span className="text-[10.5px] font-mono text-[#8D8975] uppercase block">Carbon Avoidance</span>
                <p className="font-bold text-[#1F8A70] mt-0.5">~180 kgCO2e/yr Avoided</p>
                <p className="text-[#686450] text-[11.5px]">Directly prevents off-peak dirty grid electricity consumption.</p>
              </div>
            </div>
          </div>

          {/* 5. S3 Intelligent-Tiering & Lifecycle Policies */}
          <div className="p-5 rounded-2xl border border-[#ECE5CC] bg-white space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ECE5CC] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] text-[#9A6B00] flex items-center justify-center font-bold text-[13px]">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-[#2E2B1A]">
                    5. S3 Intelligent-Tiering &amp; Cold Data Lifecycle Automation
                  </h3>
                  <span className="text-[11.5px] text-[#686450]">
                    Automatically transition data unaccessed for 30+ days to Infrequent Access and Glacier Instant Retrieval with zero retrieval latency.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-[#E2F5EF] text-[#1F8A70] font-mono font-bold text-[12px] border border-[#BDEBDD]">
                  Up to 68% Storage Savings
                </span>
              </div>
            </div>

            <p className="text-[12.5px] text-[#686450] leading-relaxed">
              Objects stored in standard S3 buckets for backups, log archives, and artifact stores accumulate monthly fees. Applying an S3 Lifecycle Rule to automatically shift unaccessed objects to Glacier Instant Retrieval preserves millisecond access speeds while dropping the cost from $0.023/GB to $0.004/GB.
            </p>
          </div>
        </div>

        {/* Strategic Impact & Effort Matrix */}
        <div className="pt-2">
          <h3 className="font-bold text-[15px] text-[#2E2B1A] mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#1F8A70]" />
            Strategic Impact &amp; Engineering Effort Matrix
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-[#ECE5CC] font-mono text-[11px] text-[#8D8975] uppercase">
                  <th className="py-2.5">Opportunity Initiative</th>
                  <th className="py-2.5">Focus Domain</th>
                  <th className="py-2.5">Monthly Financial ROI</th>
                  <th className="py-2.5">Carbon Benefit</th>
                  <th className="py-2.5">Implementation Effort</th>
                  <th className="py-2.5">Time to Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE5CC]/50">
                <tr className="hover:bg-[#FAF6E8]/40">
                  <td className="py-3 font-bold text-[#2E2B1A]">gp2 to gp3 Block Volume Upgrade</td>
                  <td className="py-3 text-[#686450]">Storage Architecture</td>
                  <td className="py-3 font-mono font-bold text-[#1F8A70]">+${gp2ToGp3MonthlySavings}/mo</td>
                  <td className="py-3 text-[#686450]">Embodied Hardware Optimization</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E2F5EF] text-[#1F8A70]">
                      Low (Zero Downtime)
                    </span>
                  </td>
                  <td className="py-3 font-mono text-[#2E2B1A]">Immediate (&lt; 1 hour)</td>
                </tr>

                <tr className="hover:bg-[#FAF6E8]/40">
                  <td className="py-3 font-bold text-[#2E2B1A]">Compute Savings Plan (1-Yr No Upfront)</td>
                  <td className="py-3 text-[#686450]">Commercial Commitment</td>
                  <td className="py-3 font-mono font-bold text-[#1F8A70]">+${calculatedSavingsPlanAmount}/mo</td>
                  <td className="py-3 text-[#686450]">Commercial Alignment</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E2F5EF] text-[#1F8A70]">
                      Low (1-Click AWS Billing)
                    </span>
                  </td>
                  <td className="py-3 font-mono text-[#2E2B1A]">Immediate (&lt; 1 day)</td>
                </tr>

                <tr className="hover:bg-[#FAF6E8]/40">
                  <td className="py-3 font-bold text-[#2E2B1A]">Non-Prod Automated Sleep Cycles</td>
                  <td className="py-3 text-[#686450]">Governance &amp; Automation</td>
                  <td className="py-3 font-mono font-bold text-[#1F8A70]">+${devSchedulingMonthlySavings}/mo</td>
                  <td className="py-3 text-[#1F8A70] font-semibold">-65% Operational Carbon</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFF3D6] text-[#9A6B00]">
                      Medium (EventBridge Rules)
                    </span>
                  </td>
                  <td className="py-3 font-mono text-[#2E2B1A]">1 &ndash; 2 Days</td>
                </tr>

                <tr className="hover:bg-[#FAF6E8]/40">
                  <td className="py-3 font-bold text-[#2E2B1A]">AWS Graviton3 (Arm64) Silicon Migration</td>
                  <td className="py-3 text-[#686450]">Compute Architecture</td>
                  <td className="py-3 font-mono font-bold text-[#1F8A70]">+${gravitonPotentialMonthlySavings}/mo</td>
                  <td className="py-3 text-[#1F8A70] font-semibold">-60% Carbon Intensity</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFF3D6] text-[#9A6B00]">
                      Medium (Multi-Arch Containers)
                    </span>
                  </td>
                  <td className="py-3 font-mono text-[#2E2B1A]">1 &ndash; 2 Weeks</td>
                </tr>

                <tr className="hover:bg-[#FAF6E8]/40">
                  <td className="py-3 font-bold text-[#2E2B1A]">S3 Intelligent-Tiering Lifecycle Automation</td>
                  <td className="py-3 text-[#686450]">Data Lifecycle</td>
                  <td className="py-3 font-mono font-bold text-[#1F8A70]">+${s3TieringMonthlySavings}/mo</td>
                  <td className="py-3 text-[#686450]">Cold Storage Optimization</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E2F5EF] text-[#1F8A70]">
                      Low (Bucket Policy)
                    </span>
                  </td>
                  <td className="py-3 font-mono text-[#2E2B1A]">Immediate</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Navigation Footer */}
        <div className="pt-3 border-t border-[#ECE5CC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[12px] text-[#686450]">
            Ready to review and approve specific, resource-level recommendations?
          </p>
          <button
            type="button"
            onClick={() => onNavigateSubTab("opt-recommendations")}
            className="text-[12px] font-bold text-[#1F8A70] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Go to Actionable Recommendations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
