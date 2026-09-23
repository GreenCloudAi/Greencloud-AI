"use client";

import Link from "next/link";
import { NavigationBar } from "@/components/common/NavigationBar";
import { ComplianceFooter } from "@/components/common/ComplianceFooter";
import {
  Cloud,
  Cpu,
  Database,
  Server,
  HardDrive,
  BarChart3,
  Leaf,
  Code2,
  CheckCircle2,
  ArrowRight,
  Shield,
  FileText,
  Activity,
  ArrowDown,
} from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      {/* 1. TOP NAVIGATION BAR */}
      <NavigationBar />

      {/* 2. MAIN CONTENT */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 w-full flex-grow space-y-12 sm:space-y-16 pt-4 pb-16">
        {/* HERO / INTRO */}
        <section className="text-center max-w-3xl mx-auto pt-6 sm:pt-8 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] text-[12px] font-bold mb-3 shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-[#1F8A70]" />
            <span>SYSTEM ARCHITECTURE & FLOW</span>
          </div>

          <h1 className="text-[32px] sm:text-[42px] lg:text-[46px] font-black text-[#2E2B1A] leading-[1.15] tracking-[-0.03em] mb-3">
            How GreenCloud AI Works
          </h1>

          <p className="text-[15px] sm:text-[17px] text-[#686450] leading-relaxed max-w-2xl font-normal">
            A clear explanation of how GreenCloud AI connects to AWS, scans for unused resources, calculates carbon emissions, and prepares reviewable code fixes.
          </p>
        </section>

        {/* SECTION 1: ARCHITECTURE FLOWCHART (3-Stage Linear Diagram) */}
        <section className="bg-white rounded-[28px] border border-[#ECE5CC] p-6 sm:p-8 shadow-warm-sm">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-[22px] sm:text-[26px] font-black text-[#2E2B1A] tracking-tight">
              Application Architecture Flowchart
            </h2>
            <p className="text-[14px] text-[#686450] mt-1">
              Data moves across three clear layers: Ingesting your cloud metrics, processing waste, and delivering recommendations.
            </p>
          </div>

          {/* 3 Main Stages Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative">
            {/* STAGE 1: CLOUD DATA SOURCE */}
            <div className="bg-[#FAF6E8] rounded-2xl p-5 border border-[#ECE5CC] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white text-[#9A6B00] border border-[#ECE5CC]">
                    LAYER 01
                  </span>
                  <Cloud className="w-5 h-5 text-[#9A6B00]" />
                </div>

                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1">
                  1. Your AWS Account
                </h3>
                <p className="text-[13px] text-[#686450] leading-relaxed mb-4">
                  GreenCloud connects using a secure, read-only IAM role to read resource data without modifying anything.
                </p>

                <div className="space-y-2 text-[12.5px] bg-white rounded-xl p-3 border border-[#ECE5CC]">
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                    <span><strong>EC2 Instances:</strong> CPU & memory metrics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                    <span><strong>EBS Volumes:</strong> Attachment & age status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                    <span><strong>Cost Explorer:</strong> Daily billing lines</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                    <span><strong>Grid Intensity:</strong> Regional emission rate</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#ECE5CC] text-[11.5px] text-[#8D8975] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#1F8A70]" />
                <span>Read-Only IAM • No static keys stored</span>
              </div>
            </div>

            {/* STAGE 2: PROCESSING ENGINE */}
            <div className="bg-[#FAF6E8] rounded-2xl p-5 border border-[#ECE5CC] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white text-[#1F8A70] border border-[#ECE5CC]">
                    LAYER 02
                  </span>
                  <Cpu className="w-5 h-5 text-[#1F8A70]" />
                </div>

                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1">
                  2. GreenCloud Engine
                </h3>
                <p className="text-[13px] text-[#686450] leading-relaxed mb-4">
                  The backend service analyzes resource usage patterns and calculates the environmental and cost impact.
                </p>

                <div className="space-y-2 text-[12.5px] bg-white rounded-xl p-3 border border-[#ECE5CC]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#9A6B00] shrink-0" />
                    <span><strong>Waste Detection:</strong> Flags CPU &lt; 5% or idle disks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#9A6B00] shrink-0" />
                    <span><strong>Carbon Engine:</strong> Energy kWh × Grid intensity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#9A6B00] shrink-0" />
                    <span><strong>Database Storage:</strong> Saves history in Prisma</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#9A6B00] shrink-0" />
                    <span><strong>Scoring Algorithm:</strong> Ranks actions by savings</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#ECE5CC] text-[11.5px] text-[#8D8975] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#9A6B00]" />
                <span>Prisma ORM • Telemetry Timeseries</span>
              </div>
            </div>

            {/* STAGE 3: OUTPUT & ACTIONS */}
            <div className="bg-[#FAF6E8] rounded-2xl p-5 border border-[#ECE5CC] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white text-[#2E2B1A] border border-[#ECE5CC]">
                    LAYER 03
                  </span>
                  <Code2 className="w-5 h-5 text-[#2E2B1A]" />
                </div>

                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1">
                  3. Dashboard & Actions
                </h3>
                <p className="text-[13px] text-[#686450] leading-relaxed mb-4">
                  Engineers view recommendations, verify evidence, and copy ready-to-merge infrastructure code.
                </p>

                <div className="space-y-2 text-[12.5px] bg-white rounded-xl p-3 border border-[#ECE5CC]">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                    <span><strong>Cost & Carbon Charts:</strong> Spend & trend breakdown</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                    <span><strong>Evidence Card:</strong> 14-day metrics & reasons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                    <span><strong>Terraform Diff:</strong> Ready code change</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                    <span><strong>Audit History:</strong> Logs approved actions</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#ECE5CC] text-[11.5px] text-[#8D8975] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1F8A70]" />
                <span>Human Review • You decide what to apply</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: STEP-BY-STEP WORKING DETAILS */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto mb-2">
            <h2 className="text-[22px] sm:text-[26px] font-black text-[#2E2B1A] tracking-tight">
              Detailed Workflow Steps
            </h2>
            <p className="text-[14px] text-[#686450]">
              How the platform detects waste and presents fixes step by step.
            </p>
          </div>

          {/* STEP 1 */}
          <div className="bg-white rounded-2xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="w-8 h-8 rounded-lg bg-[#FFF76A] border border-[#DFD6B5] flex items-center justify-center font-mono font-bold text-[#2E2B1A] text-sm shrink-0">
                  1
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1">
                    Connect AWS Using a Read-Only IAM Role
                  </h3>
                  <p className="text-[13.5px] text-[#686450] leading-relaxed max-w-2xl">
                    You provide an AWS IAM Role ARN configured with read-only permissions (such as <code className="px-1.5 py-0.5 rounded bg-[#FAF6E8] text-[#2E2B1A] font-mono text-[12px]">SecurityAudit</code> and <code className="px-1.5 py-0.5 rounded bg-[#FAF6E8] text-[#2E2B1A] font-mono text-[12px]">CloudWatchReadOnlyAccess</code>). GreenCloud uses AWS STS AssumeRole with an External ID to securely authenticate. No AWS access keys or passwords are ever stored.
                  </p>
                </div>
              </div>
              <span className="self-start px-2.5 py-1 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[11px] font-mono font-bold text-[#9A6B00] shrink-0">
                Setup: &lt; 2 minutes
              </span>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="bg-white rounded-2xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="w-8 h-8 rounded-lg bg-[#FFF76A] border border-[#DFD6B5] flex items-center justify-center font-mono font-bold text-[#2E2B1A] text-sm shrink-0">
                  2
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1">
                    Collect Utilization Metrics & Daily Invoices
                  </h3>
                  <p className="text-[13.5px] text-[#686450] leading-relaxed max-w-2xl">
                    The ingestion service reads CloudWatch metrics for each EC2 instance over a 14-day lookback window. It records average CPU utilization, peak utilization, and network traffic. It also fetches daily spend breakdown lines from AWS Cost Explorer so costs can be tied directly to individual services and teams.
                  </p>
                </div>
              </div>
              <span className="self-start px-2.5 py-1 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[11px] font-mono font-bold text-[#1F8A70] shrink-0">
                14-Day Lookback
              </span>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="bg-white rounded-2xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="w-8 h-8 rounded-lg bg-[#FFF76A] border border-[#DFD6B5] flex items-center justify-center font-mono font-bold text-[#2E2B1A] text-sm shrink-0">
                  3
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1">
                    Detect Idle Resources & Calculate Carbon Output
                  </h3>
                  <p className="text-[13.5px] text-[#686450] leading-relaxed max-w-2xl">
                    The recommendation engine checks each resource against waste criteria:
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[13px] text-[#2E2B1A] list-disc list-inside">
                    <li><strong>Idle EC2:</strong> Average CPU is below 5% and peak CPU is below 20% for 14 straight days.</li>
                    <li><strong>Unattached EBS:</strong> Storage volumes disconnected from any virtual machine for more than 7 days.</li>
                    <li><strong>Carbon Calculation:</strong> Multiplies estimated energy draw (kWh) by the regional electrical grid carbon intensity (e.g. 415 gCO₂e/kWh for us-east-1).</li>
                  </ul>
                </div>
              </div>
              <span className="self-start px-2.5 py-1 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[11px] font-mono font-bold text-[#9A6B00] shrink-0">
                Automated Rules
              </span>
            </div>
          </div>

          {/* STEP 4 */}
          <div className="bg-white rounded-2xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="w-8 h-8 rounded-lg bg-[#FFF76A] border border-[#DFD6B5] flex items-center justify-center font-mono font-bold text-[#2E2B1A] text-sm shrink-0">
                  4
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1">
                    Generate Reviewable Terraform Code & Jira Issues
                  </h3>
                  <p className="text-[13.5px] text-[#686450] leading-relaxed max-w-2xl">
                    Instead of changing live servers automatically, GreenCloud creates the exact fix code for your team:
                  </p>

                  {/* Concrete code example */}
                  <div className="mt-3 p-3 rounded-xl bg-[#2E2B1A] text-white font-mono text-[12px] max-w-xl">
                    <span className="text-[#8D8975]"># Rightsizing example generated by GreenCloud AI</span>
                    <br />
                    <span className="text-[#FF7D7D]">- instance_type = "c5.2xlarge"  # $248/mo</span>
                    <br />
                    <span className="text-[#79FFA8]">+ instance_type = "t4g.large"   # $49/mo (Saves $199/mo)</span>
                  </div>

                  <p className="text-[12.5px] text-[#686450] mt-2">
                    Engineers review the change in GitHub or Jira, verify the savings evidence, and apply it through their normal CI/CD pipeline.
                  </p>
                </div>
              </div>
              <span className="self-start px-2.5 py-1 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[11px] font-mono font-bold text-[#1F8A70] shrink-0">
                Code-First Output
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 3: QUICK LINKS */}
        <section className="bg-[#FAF6E8] rounded-2xl border border-[#ECE5CC] p-6 sm:p-8 text-center flex flex-col items-center">
          <h3 className="text-[19px] sm:text-[21px] font-bold text-[#2E2B1A] mb-2">
            Explore the Platform
          </h3>
          <p className="text-[14px] text-[#686450] max-w-lg mb-5">
            View the live telemetry charts on the dashboard or explore our sample recommendation queue.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[#2E2B1A] font-bold text-[13.5px] shadow-sm transition-all"
            >
              <span>View Live Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/#optimization"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] font-semibold text-[13.5px] transition-colors"
            >
              <span>See Recommendations</span>
            </Link>
            <Link
              href="/why"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] font-semibold text-[13.5px] transition-colors"
            >
              <span>Why Cost & Carbon?</span>
            </Link>
          </div>
        </section>
      </main>

      {/* 3. FOOTER */}
      <ComplianceFooter />
    </div>
  );
}
