"use client";

import Link from "next/link";
import { NavigationBar } from "@/components/common/NavigationBar";
import { ComplianceFooter } from "@/components/common/ComplianceFooter";
import {
  Eye,
  Activity,
  DollarSign,
  TrendingUp,
  Cloud,
  Layers,
  Leaf,
  ArrowDown,
  Wand2,
  ArrowRight,
  Server,
  Receipt,
  Cpu,
  Gauge,
  CheckCircle2,
  Sparkles,
  Sliders,
  LineChart,
  AlertTriangle,
  FileText,
  Shield,
  History,
  HelpCircle,
  PiggyBank,
  Terminal,
  Code,
  Globe2,
  BarChart3,
  RefreshCw,
  BookOpen,
} from "lucide-react";

export default function WhyPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      {/* 1. TOP NAVIGATION BAR */}
      <NavigationBar />

      {/* 2. MAIN CONTENT */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 w-full flex-grow space-y-16 sm:space-y-20 pt-4 pb-16">
        {/* HERO / INTRO HEADER */}
        <section className="text-center max-w-3xl mx-auto pt-6 sm:pt-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E2F5EF] border border-[#BDEBDD] text-[#1F8A70] mb-4 shadow-warm-sm">
            <Eye className="w-4 h-4 text-[#1F8A70]" />
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
              WHY GREENCLOUD AI?
            </span>
          </div>

          <h1 className="text-[34px] sm:text-[46px] lg:text-[50px] font-black text-[#2E2B1A] leading-[1.1] tracking-[-0.03em] mb-4">
            Your cloud can be hard to understand.
          </h1>

          <p className="text-[16px] sm:text-[18px] text-[#686450] leading-relaxed max-w-2xl font-normal mb-5">
            GreenCloud brings your cloud cost, resources, usage, and carbon information together so you can quickly see what is happening and what needs attention.
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[#686450] text-[12px] font-mono shadow-xs">
            <Activity className="w-3.5 h-3.5 text-[#1F8A70]" />
            <span className="font-semibold text-[#2E2B1A]">PUBLIC READING SHOWCASE</span>
            <span>•</span>
            <span>ILLUSTRATIVE TELEMETRY DATA</span>
            <span>•</span>
            <span className="text-[#1F8A70] font-semibold">NO CREDENTIALS REQUIRED</span>
          </div>
        </section>

        {/* SECTION 1: THE CORE PROBLEMS (2x2 Grid) */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: FinOps */}
            <div className="bg-white rounded-[26px] p-6 sm:p-7 border border-[#ECE5CC] shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF3D6] text-[#9A6B00] border border-[#F3E5BC] font-mono text-[11px] font-bold">
                    <DollarSign className="w-3.5 h-3.5" />
                    FINOPS
                  </span>
                  <span className="font-mono text-[11px] text-[#8D8975] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded-md font-semibold">
                    DEMO DATA
                  </span>
                </div>

                <h2 className="text-[22px] sm:text-[24px] font-black text-[#2E2B1A] tracking-tight mb-2">
                  Where is my money going?
                </h2>
                <p className="text-[14px] text-[#686450] leading-relaxed mb-6">
                  See how much your cloud costs and which services, teams, accounts, and environments are using the most.
                </p>
              </div>

              <div className="bg-[#FAF6E8] rounded-2xl p-4 sm:p-5 border border-[#ECE5CC]">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC]">
                  <div>
                    <span className="text-[12px] text-[#8D8975] font-medium block">Cloud Spend (MTD)</span>
                    <span className="text-[24px] font-black text-[#2E2B1A]">$24,842</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFE8E8] text-[#D32F2F] font-mono text-[12px] font-bold">
                    <TrendingUp className="w-3.5 h-3.5" /> +4.8%
                  </span>
                </div>

                <div className="space-y-2.5 mt-3 text-[12px] font-mono">
                  <div>
                    <div className="flex justify-between text-[#686450] mb-1">
                      <span>EC2 Compute</span>
                      <span className="font-bold text-[#2E2B1A]">$10,420 (42%)</span>
                    </div>
                    <div className="w-full bg-[#EAE3CB] rounded-full h-2 overflow-hidden">
                      <div className="bg-[#9A6B00] h-full rounded-full" style={{ width: "42%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#686450] mb-1">
                      <span>Storage (S3 / EBS)</span>
                      <span className="font-bold text-[#2E2B1A]">$4,280 (17%)</span>
                    </div>
                    <div className="w-full bg-[#EAE3CB] rounded-full h-2 overflow-hidden">
                      <div className="bg-[#1F8A70] h-full rounded-full" style={{ width: "17%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#686450] mb-1">
                      <span>Network & NAT</span>
                      <span className="font-bold text-[#2E2B1A]">$2,140 (9%)</span>
                    </div>
                    <div className="w-full bg-[#EAE3CB] rounded-full h-2 overflow-hidden">
                      <div className="bg-[#788865] h-full rounded-full" style={{ width: "9%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#686450] mb-1">
                      <span>Other Workloads</span>
                      <span className="font-bold text-[#2E2B1A]">$8,002 (32%)</span>
                    </div>
                    <div className="w-full bg-[#EAE3CB] rounded-full h-2 overflow-hidden">
                      <div className="bg-[#A49E86] h-full rounded-full" style={{ width: "32%" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Infrastructure */}
            <div className="bg-white rounded-[26px] p-6 sm:p-7 border border-[#ECE5CC] shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF6E8] text-[#686450] border border-[#ECE5CC] font-mono text-[11px] font-bold">
                    <Cloud className="w-3.5 h-3.5" />
                    INFRASTRUCTURE
                  </span>
                  <span className="font-mono text-[11px] text-[#8D8975] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded-md font-semibold">
                    DEMO DATA
                  </span>
                </div>

                <h2 className="text-[22px] sm:text-[24px] font-black text-[#2E2B1A] tracking-tight mb-2">
                  Am I paying for things I don't need?
                </h2>
                <p className="text-[14px] text-[#686450] leading-relaxed mb-6">
                  Find unused, idle, or oversized resources that may be costing you money without providing enough value.
                </p>
              </div>

              <div className="bg-[#FAF6E8] rounded-2xl p-4 sm:p-5 border border-[#ECE5CC]">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A]">
                      <Layers className="w-4 h-4 text-[#9A6B00]" />
                    </div>
                    <div>
                      <span className="text-[12px] text-[#8D8975] font-medium block">Unused Resources</span>
                      <span className="text-[22px] font-black text-[#2E2B1A]">12 items</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] text-[#8D8975] font-medium block">Potential Savings</span>
                    <span className="text-[22px] font-black text-[#1F8A70]">$1,240/mo</span>
                  </div>
                </div>

                <div className="space-y-2 mt-3 text-[12.5px]">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#ECE5CC]">
                    <div className="flex items-center gap-2 text-[#2E2B1A] font-medium">
                      <Cpu className="w-3.5 h-3.5 text-[#1F8A70]" />
                      <span>Idle EC2 instances</span>
                    </div>
                    <span className="font-mono text-[12px] font-bold text-[#686450]">4 instances</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#ECE5CC]">
                    <div className="flex items-center gap-2 text-[#2E2B1A] font-medium">
                      <Server className="w-3.5 h-3.5 text-[#1F8A70]" />
                      <span>Unused EBS volumes</span>
                    </div>
                    <span className="font-mono text-[12px] font-bold text-[#686450]">5 detached</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#ECE5CC]">
                    <div className="flex items-center gap-2 text-[#2E2B1A] font-medium">
                      <Globe2 className="w-3.5 h-3.5 text-[#1F8A70]" />
                      <span>Unused Elastic IPs</span>
                    </div>
                    <span className="font-mono text-[12px] font-bold text-[#686450]">3 unbound</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: GreenOps */}
            <div className="bg-white rounded-[26px] p-6 sm:p-7 border border-[#ECE5CC] shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD] font-mono text-[11px] font-bold">
                    <Leaf className="w-3.5 h-3.5" />
                    GREENOPS
                  </span>
                  <span className="font-mono text-[11px] text-[#8D8975] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded-md font-semibold">
                    DEMO DATA
                  </span>
                </div>

                <h2 className="text-[22px] sm:text-[24px] font-black text-[#2E2B1A] tracking-tight mb-2">
                  How much carbon does my cloud create?
                </h2>
                <p className="text-[14px] text-[#686450] leading-relaxed mb-6">
                  See your estimated cloud emissions and understand where they come from with regional intensity tracking.
                </p>
              </div>

              <div className="bg-[#FAF6E8] rounded-2xl p-4 sm:p-5 border border-[#ECE5CC]">
                <div className="flex items-center justify-between pb-2 border-b border-[#ECE5CC]">
                  <div>
                    <span className="text-[12px] text-[#8D8975] font-medium block">Estimated Footprint</span>
                    <span className="text-[24px] font-black text-[#1F8A70]">12.8 tCO₂e</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E2F5EF] text-[#1F8A70] font-mono text-[12px] font-bold">
                    <ArrowDown className="w-3.5 h-3.5" /> ↓ 6.4% vs last mo
                  </span>
                </div>

                <p className="text-[11.5px] text-[#8D8975] my-2">
                  Estimated emissions calculated from regional grid carbon intensity (gCO₂e/kWh).
                </p>

                <div className="space-y-2 text-[12px] font-mono">
                  <div>
                    <div className="flex justify-between text-[#686450] mb-1">
                      <span>Compute Workloads</span>
                      <span className="font-bold text-[#1F8A70]">68%</span>
                    </div>
                    <div className="w-full bg-[#EAE3CB] rounded-full h-2 overflow-hidden">
                      <div className="bg-[#1F8A70] h-full rounded-full" style={{ width: "68%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#686450] mb-1">
                      <span>Storage Retention</span>
                      <span className="font-bold text-[#2E2B1A]">22%</span>
                    </div>
                    <div className="w-full bg-[#EAE3CB] rounded-full h-2 overflow-hidden">
                      <div className="bg-[#788865] h-full rounded-full" style={{ width: "22%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#686450] mb-1">
                      <span>Other Cloud Services</span>
                      <span className="font-bold text-[#2E2B1A]">10%</span>
                    </div>
                    <div className="w-full bg-[#EAE3CB] rounded-full h-2 overflow-hidden">
                      <div className="bg-[#A49E86] h-full rounded-full" style={{ width: "10%" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Optimization */}
            <div className="bg-white rounded-[26px] p-6 sm:p-7 border border-[#ECE5CC] shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF76A] text-[#2E2B1A] border border-[#DFD6B5] font-mono text-[11px] font-bold">
                    <Wand2 className="w-3.5 h-3.5" />
                    OPTIMIZATION
                  </span>
                  <span className="font-mono text-[11px] text-[#8D8975] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded-md font-semibold">
                    DEMO DATA
                  </span>
                </div>

                <h2 className="text-[22px] sm:text-[24px] font-black text-[#2E2B1A] tracking-tight mb-2">
                  What should I fix first?
                </h2>
                <p className="text-[14px] text-[#686450] leading-relaxed mb-6">
                  GreenCloud finds useful opportunities and shows the evidence, possible savings, carbon impact, risk, and confidence.
                </p>
              </div>

              <div className="bg-[#FAF6E8] rounded-2xl p-4 sm:p-5 border border-[#ECE5CC]">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#9A6B00]" />
                    <span className="text-[15px] font-bold text-[#2E2B1A]">Low-utilization EC2</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white border border-[#ECE5CC] text-[#2E2B1A] font-mono text-[11.5px] font-semibold">
                    i-0a883e2
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
                  <div className="p-2.5 rounded-xl bg-white border border-[#ECE5CC]">
                    <span className="text-[11px] text-[#8D8975] font-medium block">Savings</span>
                    <span className="font-mono text-[13px] font-bold text-[#1F8A70]">+$118/mo</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#ECE5CC]">
                    <span className="text-[11px] text-[#8D8975] font-medium block">Carbon</span>
                    <span className="font-mono text-[13px] font-bold text-[#1F8A70]">↓ 42 kg</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#ECE5CC]">
                    <span className="text-[11px] text-[#8D8975] font-medium block">Risk</span>
                    <span className="font-mono text-[13px] font-bold text-[#2E2B1A]">Moderate</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#ECE5CC]">
                    <span className="text-[11px] text-[#8D8975] font-medium block">Confidence</span>
                    <span className="font-mono text-[13px] font-bold text-[#9A6B00]">91%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#ECE5CC]">
                  <span className="text-[12px] text-[#686450]">Recommended: Rightsizing to t4g.large</span>
                  <Link
                    href="/#optimization"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#1F8A70] text-white text-[12px] font-bold hover:bg-[#186D58] transition-colors"
                  >
                    <span>Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHAT GREENCLOUD BRINGS TOGETHER (01-06 Visual Pipeline) */}
        <section className="bg-[#FAF6E8] rounded-[30px] border border-[#ECE5CC] p-6 sm:p-10 shadow-warm-sm">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-[26px] sm:text-[34px] font-black text-[#2E2B1A] tracking-tight leading-tight mb-2">
              Everything you need in one place.
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              GreenCloud connects the information your teams normally have to check in different places.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE5CC] shadow-xs flex flex-col justify-between hover:shadow-warm-sm transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[12px] font-bold text-[#8D8975]">01</span>
                </div>
                <h3 className="font-bold text-[#2E2B1A] text-[15px] mb-1">Cloud Accounts</h3>
                <p className="text-[12px] text-[#686450] leading-relaxed">Where your cloud lives across multi-cloud setups.</p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#ECE5CC] font-mono text-[11px] text-[#1F8A70] font-semibold flex items-center gap-1">
                <span>AWS, Azure, GCP</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE5CC] shadow-xs flex flex-col justify-between hover:shadow-warm-sm transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00]">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[12px] font-bold text-[#8D8975]">02</span>
                </div>
                <h3 className="font-bold text-[#2E2B1A] text-[15px] mb-1">Cost</h3>
                <p className="text-[12px] text-[#686450] leading-relaxed">What you're spending on invoices and line items.</p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#ECE5CC] font-mono text-[11px] text-[#9A6B00] font-semibold flex items-center gap-1">
                <span>Invoices & CUR</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE5CC] shadow-xs flex flex-col justify-between hover:shadow-warm-sm transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                    <Server className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[12px] font-bold text-[#8D8975]">03</span>
                </div>
                <h3 className="font-bold text-[#2E2B1A] text-[15px] mb-1">Resources</h3>
                <p className="text-[12px] text-[#686450] leading-relaxed">What you're running: compute, disk, cluster nodes.</p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#ECE5CC] font-mono text-[11px] text-[#1F8A70] font-semibold flex items-center gap-1">
                <span>Live Inventory</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE5CC] shadow-xs flex flex-col justify-between hover:shadow-warm-sm transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00]">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[12px] font-bold text-[#8D8975]">04</span>
                </div>
                <h3 className="font-bold text-[#2E2B1A] text-[15px] mb-1">Usage</h3>
                <p className="text-[12px] text-[#686450] leading-relaxed">How much you use: CPU, IOPS, and memory telemetry.</p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#ECE5CC] font-mono text-[11px] text-[#9A6B00] font-semibold flex items-center gap-1">
                <span>Active Metrics</span>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE5CC] shadow-xs flex flex-col justify-between hover:shadow-warm-sm transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[12px] font-bold text-[#8D8975]">05</span>
                </div>
                <h3 className="font-bold text-[#2E2B1A] text-[15px] mb-1">Carbon</h3>
                <p className="text-[12px] text-[#686450] leading-relaxed">Your estimated footprint from regional grid mix.</p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#ECE5CC] font-mono text-[11px] text-[#1F8A70] font-semibold flex items-center gap-1">
                <span>Grid Intensity</span>
              </div>
            </div>

            {/* Step 6 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE5CC] shadow-xs flex flex-col justify-between hover:shadow-warm-sm transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[12px] font-bold text-[#8D8975]">06</span>
                </div>
                <h3 className="font-bold text-[#2E2B1A] text-[15px] mb-1">Recommendations</h3>
                <p className="text-[12px] text-[#686450] leading-relaxed">What you can improve with clear, verified steps.</p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#ECE5CC] font-mono text-[11px] text-[#9A6B00] font-semibold flex items-center gap-1">
                <span>Verified Actions</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: CORE CAPABILITIES (3x3 Grid of 9 Cards) */}
        <section>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-[26px] sm:text-[34px] font-black text-[#2E2B1A] tracking-tight leading-tight mb-2">
              One place to understand your cloud.
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              Nine core capabilities built to give every team clarity without clutter.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Cap 1 */}
            <div className="bg-white rounded-2xl p-6 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#FFF3D6] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00] mb-4">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1.5">Cloud Cost</h3>
                <p className="text-[13.5px] text-[#686450] leading-relaxed">
                  See where your money goes across accounts and workloads with transparent allocation.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[12px]">
                <span className="font-mono text-[#8D8975]">FinOps Module</span>
                <Link href="/dashboard" className="text-[#9A6B00] font-bold hover:underline flex items-center gap-1">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Cap 2 */}
            <div className="bg-white rounded-2xl p-6 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A] mb-4">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1.5">Resource Usage</h3>
                <p className="text-[13.5px] text-[#686450] leading-relaxed">
                  Find idle and oversized resources before they waste budget or accumulate dead weight.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[12px]">
                <span className="font-mono text-[#8D8975]">Inventory Live</span>
                <Link href="/dashboard" className="text-[#9A6B00] font-bold hover:underline flex items-center gap-1">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Cap 3 */}
            <div className="bg-white rounded-2xl p-6 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#E2F5EF] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70] mb-4">
                  <Leaf className="w-5 h-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1.5">Carbon</h3>
                <p className="text-[13.5px] text-[#686450] leading-relaxed">
                  Understand your estimated cloud footprint with regional accuracy and clean energy mix insights.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[12px]">
                <span className="font-mono text-[#8D8975]">GreenOps Telemetry</span>
                <Link href="/dashboard" className="text-[#1F8A70] font-bold hover:underline flex items-center gap-1">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Cap 4 */}
            <div className="bg-white rounded-2xl p-6 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#FFF76A] border border-[#DFD6B5] flex items-center justify-center text-[#2E2B1A] mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1.5">Recommendations</h3>
                <p className="text-[13.5px] text-[#686450] leading-relaxed">
                  Find useful actions backed by verifiable telemetry data and calculated confidence ratings.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[12px]">
                <span className="font-mono text-[#8D8975]">Decision Engine</span>
                <Link href="/#optimization" className="text-[#9A6B00] font-bold hover:underline flex items-center gap-1">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Cap 5 */}
            <div className="bg-white rounded-2xl p-6 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00] mb-4">
                  <LineChart className="w-5 h-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1.5">Forecasts</h3>
                <p className="text-[13.5px] text-[#686450] leading-relaxed">
                  See where your cost and emissions may be heading next month based on historical run-rates.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[12px]">
                <span className="font-mono text-[#8D8975]">Predictive AI</span>
                <Link href="/dashboard" className="text-[#9A6B00] font-bold hover:underline flex items-center gap-1">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Cap 6 */}
            <div className="bg-white rounded-2xl p-6 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#FFE8E8] border border-[#ECE5CC] flex items-center justify-center text-[#D32F2F] mb-4">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1.5">Anomalies</h3>
                <p className="text-[13.5px] text-[#686450] leading-relaxed">
                  Spot unusual changes in cost or usage the moment they occur before billing cycles close.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[12px]">
                <span className="font-mono text-[#8D8975]">Real-time Watch</span>
                <Link href="/dashboard" className="text-[#D32F2F] font-bold hover:underline flex items-center gap-1">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Cap 7 */}
            <div className="bg-white rounded-2xl p-6 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#686450] mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1.5">Reports</h3>
                <p className="text-[13.5px] text-[#686450] leading-relaxed">
                  Share clear, jargon-free information with your team and executives in one-click exports.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[12px]">
                <span className="font-mono text-[#8D8975]">Executive Summaries</span>
                <Link href="/dashboard" className="text-[#9A6B00] font-bold hover:underline flex items-center gap-1">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Cap 8 */}
            <div className="bg-white rounded-2xl p-6 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#E2F5EF] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70] mb-4">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1.5">Security</h3>
                <p className="text-[13.5px] text-[#686450] leading-relaxed">
                  Use secure, read-only cloud access with strict zero-mutation policy across your estate.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[12px]">
                <span className="font-mono text-[#8D8975]">Read-only IAM</span>
                <Link href="/#documentation" className="text-[#1F8A70] font-bold hover:underline flex items-center gap-1">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Cap 9 */}
            <div className="bg-white rounded-2xl p-6 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00] mb-4">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1.5">Audit</h3>
                <p className="text-[13.5px] text-[#686450] leading-relaxed">
                  Keep a clear, verifiable history of what changed and who approved it for total compliance.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[12px]">
                <span className="font-mono text-[#8D8975]">Signed Changelog</span>
                <Link href="/audit-history" className="text-[#9A6B00] font-bold hover:underline flex items-center gap-1">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: SIMPLE QUESTIONS (4 Cards) */}
        <section className="bg-[#FAF6E8] rounded-[30px] border border-[#ECE5CC] p-6 sm:p-10 shadow-warm-sm">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-[26px] sm:text-[34px] font-black text-[#2E2B1A] tracking-tight leading-tight mb-2">
              Ask GreenCloud the simple questions.
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              You shouldn't need a certification to know what is happening in your cloud.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Question 1 */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A] mb-3">
                  <HelpCircle className="w-4 h-4 text-[#9A6B00]" />
                </div>
                <h3 className="text-[15px] font-bold text-[#2E2B1A] mb-4">
                  “How much did we spend?”
                </h3>
              </div>
              <div className="bg-[#FAF6E8] rounded-xl p-3 border border-[#ECE5CC]">
                <span className="text-[18px] font-black text-[#2E2B1A] block font-mono">$24,842</span>
                <span className="text-[11px] text-[#8D8975] font-medium block mt-0.5">+4.8% vs last month</span>
              </div>
            </div>

            {/* Question 2 */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A] mb-3">
                  <HelpCircle className="w-4 h-4 text-[#1F8A70]" />
                </div>
                <h3 className="text-[15px] font-bold text-[#2E2B1A] mb-4">
                  “Where are we wasting money?”
                </h3>
              </div>
              <div className="bg-[#FAF6E8] rounded-xl p-3 border border-[#ECE5CC]">
                <span className="text-[18px] font-black text-[#1F8A70] block font-mono">12 resources</span>
                <span className="text-[11px] text-[#8D8975] font-medium block mt-0.5">$1,240/mo recoverable</span>
              </div>
            </div>

            {/* Question 3 */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A] mb-3">
                  <HelpCircle className="w-4 h-4 text-[#9A6B00]" />
                </div>
                <h3 className="text-[15px] font-bold text-[#2E2B1A] mb-4">
                  “Where are emissions coming from?”
                </h3>
              </div>
              <div className="bg-[#FAF6E8] rounded-xl p-3 border border-[#ECE5CC]">
                <span className="text-[18px] font-black text-[#2E2B1A] block">Compute loads</span>
                <span className="text-[11px] text-[#8D8975] font-medium block mt-0.5">68% of total footprint</span>
              </div>
            </div>

            {/* Question 4 */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A] mb-3">
                  <HelpCircle className="w-4 h-4 text-[#1F8A70]" />
                </div>
                <h3 className="text-[15px] font-bold text-[#2E2B1A] mb-4">
                  “What should we look at first?”
                </h3>
              </div>
              <div className="bg-[#FAF6E8] rounded-xl p-3 border border-[#ECE5CC]">
                <span className="text-[18px] font-black text-[#1F8A70] block font-mono">3 opportunities</span>
                <span className="text-[11px] text-[#8D8975] font-medium block mt-0.5">Verified safe to review</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: FOR DIFFERENT TEAMS (5 Compact Role Cards) */}
        <section>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-[26px] sm:text-[34px] font-black text-[#2E2B1A] tracking-tight leading-tight mb-2">
              Useful for every team.
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              Tailored perspectives so finance, engineering, and leadership stay aligned.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Role 1: Finance */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF3D6] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00]">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10.5px] font-bold text-[#9A6B00] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded">
                    FINOPS
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-[#2E2B1A] mb-1">Finance</h3>
                <p className="text-[12.5px] text-[#686450] leading-relaxed">
                  Understand spending, manage budgets, and find immediate cloud savings.
                </p>
              </div>
            </div>

            {/* Role 2: DevOps */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A]">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10.5px] font-bold text-[#2E2B1A] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded">
                    DEVOPS
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-[#2E2B1A] mb-1">Operations</h3>
                <p className="text-[12.5px] text-[#686450] leading-relaxed">
                  Understand live resources, prevent waste, and maintain system stability.
                </p>
              </div>
            </div>

            {/* Role 3: Developers */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                    <Code className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10.5px] font-bold text-[#1F8A70] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded">
                    DEVS
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-[#2E2B1A] mb-1">Engineering</h3>
                <p className="text-[12.5px] text-[#686450] leading-relaxed">
                  See how your deployments directly impact daily cloud cost and telemetry.
                </p>
              </div>
            </div>

            {/* Role 4: Sustainability */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E2F5EF] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10.5px] font-bold text-[#1F8A70] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded">
                    ESG
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-[#2E2B1A] mb-1">Sustainability</h3>
                <p className="text-[12.5px] text-[#686450] leading-relaxed">
                  Report verifiable cloud carbon figures and emissions to ESG stakeholders.
                </p>
              </div>
            </div>

            {/* Role 5: Leaders */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF3D6] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00]">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10.5px] font-bold text-[#9A6B00] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded">
                    EXEC
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-[#2E2B1A] mb-1">Leaders</h3>
                <p className="text-[12.5px] text-[#686450] leading-relaxed">
                  See the big picture, track efficiency results, and set organizational benchmarks.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION & PROGRESSION FOOTER */}
        <section className="rounded-[30px] bg-white border border-[#ECE5CC] p-8 sm:p-12 shadow-warm-md text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFF76A] border border-[#DFD6B5] text-[#2E2B1A] text-[12px] font-bold mb-4">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>AUTOMATED INTELLIGENCE</span>
          </div>

          <h2 className="text-[26px] sm:text-[34px] font-black text-[#2E2B1A] tracking-tight leading-tight max-w-xl mb-3">
            Next: Explore the Decision Loop in depth
          </h2>

          <p className="text-[15px] text-[#686450] leading-relaxed max-w-lg mb-8">
            See how GreenCloud continuously gathers telemetry, analyzes root causes, and provides risk-weighted recommendations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[#2E2B1A] font-bold text-[14px] shadow-sm hover:shadow-sunshine-glow transition-all"
            >
              <span>Explore Live Demo Sandbox</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#optimization"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] font-semibold text-[14px] shadow-xs transition-colors"
            >
              <Sparkles className="w-4 h-4 text-[#9A6B00]" />
              <span>View Recommendations</span>
            </Link>
            <Link
              href="/#documentation"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FAF6E8] hover:bg-[#F2ECD8] border border-[#ECE5CC] text-[#2E2B1A] font-semibold text-[14px] transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#9A6B00]" />
              <span>Explore Documentation</span>
            </Link>
          </div>

          <p className="text-[12px] text-[#8D8975] mt-6 font-mono flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1F8A70]"></span>
            <span>Public Reading Showcase • Curated Demo Dataset • Zero Cloud Credentials Required</span>
          </p>
        </section>
      </main>

      {/* 3. FOOTER */}
      <ComplianceFooter />
    </div>
  );
}
