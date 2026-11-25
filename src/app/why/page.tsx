"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NavigationBar } from "@/components/common/NavigationBar";
import { ComplianceFooter } from "@/components/common/ComplianceFooter";
import { HeroShapeMorph } from "@/components/overview/MotionPrimitives";
import {
  OptimizationReviewModal,
  type OptimizationReviewItem,
} from "@/components/overview/OptimizationReviewModal";

interface PipelineItem {
  num: string;
  subtitle: string;
  title: string;
  desc: string;
  shape: "sunny" | "clover" | "flower" | "cookie9";
  shapeColor: string;
  numInk: string;
  showClouds?: boolean;
}

interface CapabilityCard {
  subtitle: string;
  title: string;
  desc: string;
  href: string;
  linkLabel: string;
  shape: "sunny" | "clover" | "flower" | "cookie9";
  shapeColor: string;
  iconInk: string;
  icon: string;
}

interface QaItem {
  topic: string;
  question: string;
  answer: string;
  trayBg: string;
  accentInk: string;
}

interface TeamRole {
  subtitle: string;
  title: string;
  desc: string;
  shape: "sunny" | "clover" | "flower" | "cookie9";
  shapeColor: string;
  iconInk: string;
  icon: string;
}

const PIPELINE_ITEMS: PipelineItem[] = [
  {
    num: "01",
    subtitle: "Multi-cloud context",
    title: "Cloud Accounts",
    desc: "Link AWS accounts with read-only IAM alongside unified AWS, GCP, and Azure telemetry baselines.",
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    numInk: "text-[#524305]",
    showClouds: true,
  },
  {
    num: "02",
    subtitle: "Daily billing pulse",
    title: "Cost",
    desc: "Track hourly and monthly dollar trends across compute, managed databases, and storage tiers.",
    shape: "clover",
    shapeColor: "text-[#FBE0BC]",
    numInk: "text-[#6B4814]",
  },
  {
    num: "03",
    subtitle: "Asset inventory",
    title: "Resources",
    desc: "Group idle servers, oversized RDS clusters, detached EBS disks, and cold object buckets cleanly.",
    shape: "flower",
    shapeColor: "text-[#CEECE0]",
    numInk: "text-[#155E4B]",
  },
  {
    num: "04",
    subtitle: "Empirical utilization",
    title: "Usage",
    desc: "Measure 14-to-30-day CPU, memory, network, and disk IOPS peaks before suggesting changes.",
    shape: "cookie9",
    shapeColor: "text-[#EAE0BE]",
    numInk: "text-[#2E2B1A]",
  },
  {
    num: "05",
    subtitle: "Grid-aware intensity",
    title: "Carbon",
    desc: "Convert estimated server kilowatt-hours into regional kg CO₂e based on data center energy mix.",
    shape: "flower",
    shapeColor: "text-[#CEECE0]",
    numInk: "text-[#155E4B]",
  },
  {
    num: "06",
    subtitle: "Reviewable diffs",
    title: "Recommendations",
    desc: "Prioritize every action by monthly savings, emissions reduction, and production risk level.",
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    numInk: "text-[#524305]",
  },
];

const CAPABILITY_CARDS: CapabilityCard[] = [
  {
    subtitle: "Unified overview",
    title: "Spend & carbon trendline",
    desc: "Compare daily cloud bills against carbon footprint in one synchronized chart.",
    href: "/dashboard",
    linkLabel: "Open dashboard",
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    iconInk: "text-[#524305]",
    icon: "show_chart",
  },
  {
    subtitle: "Idle compute detection",
    title: "Off-hours dev schedules",
    desc: "Spot non-production servers sitting under 2% CPU at night and weekends.",
    href: "/#optimization",
    linkLabel: "See recommendations",
    shape: "clover",
    shapeColor: "text-[#FBE0BC]",
    iconInk: "text-[#6B4814]",
    icon: "schedule",
  },
  {
    subtitle: "Database right-sizing",
    title: "Oversized RDS clusters",
    desc: "Match memory and vCPU tiers to observed 30-day peak load instead of guess estimates.",
    href: "/#optimization",
    linkLabel: "Inspect DB findings",
    shape: "flower",
    shapeColor: "text-[#CEECE0]",
    iconInk: "text-[#155E4B]",
    icon: "database",
  },
  {
    subtitle: "Storage hygiene",
    title: "Detached volumes & buckets",
    desc: "Reclaim unattached gp3 disks and move unread object archives to low-cost cold tiers.",
    href: "/#optimization",
    linkLabel: "View storage savings",
    shape: "cookie9",
    shapeColor: "text-[#EAE0BE]",
    iconInk: "text-[#2E2B1A]",
    icon: "hard_drive",
  },
  {
    subtitle: "Code-first workflow",
    title: "Terraform HCL previews",
    desc: "Inspect exact line-by-line resource diffs before any infrastructure change happens.",
    href: "/how-it-works",
    linkLabel: "See Terraform flow",
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    iconInk: "text-[#524305]",
    icon: "code",
  },
  {
    subtitle: "Grid intensity math",
    title: "Regional emission factors",
    desc: "Identify workloads running on carbon-heavy grids versus hydroelectric regions.",
    href: "/#documentation",
    linkLabel: "Read methodology",
    shape: "flower",
    shapeColor: "text-[#CEECE0]",
    iconInk: "text-[#155E4B]",
    icon: "public",
  },
  {
    subtitle: "Governance ledger",
    title: "Immutable audit trail",
    desc: "Verify who synced accounts, approved fixes, or exported Terraform patches and when.",
    href: "/audit-history",
    linkLabel: "Open audit history",
    shape: "clover",
    shapeColor: "text-[#FBE0BC]",
    iconInk: "text-[#6B4814]",
    icon: "history",
  },
  {
    subtitle: "Zero write risk",
    title: "Read-only IAM posture",
    desc: "Evaluate full infrastructure health safely using scoped read-only credentials.",
    href: "/how-it-works",
    linkLabel: "Inspect security",
    shape: "cookie9",
    shapeColor: "text-[#EAE0BE]",
    iconInk: "text-[#2E2B1A]",
    icon: "verified_user",
  },
  {
    subtitle: "Instant onboarding",
    title: "Sandbox & live modes",
    desc: "Test full optimization reports immediately or connect live AWS billing in minutes.",
    href: "/onboarding",
    linkLabel: "Connect account",
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    iconInk: "text-[#524305]",
    icon: "rocket_launch",
  },
];

const QA_ITEMS: QaItem[] = [
  {
    topic: "Idle compute",
    question: "Why are we still paying for staging clusters overnight?",
    answer: "Dev and staging EC2 instances with near-zero night traffic are flagged with 14-day CPU proofs and one-click schedule diffs.",
    trayBg: "bg-[#FBF6E3]",
    accentInk: "text-[#524305]",
  },
  {
    topic: "Carbon math",
    question: "How does cutting idle cloud spend reduce real CO₂e?",
    answer: "Physical servers draw 50 to 70% of peak power even at idle. Shutting down unused capacity cuts measurable grid electricity.",
    trayBg: "bg-[#E2F5EF]",
    accentInk: "text-[#155E4B]",
  },
  {
    topic: "Engineering trust",
    question: "Will automated tools break production workloads?",
    answer: "Never. GreenCloud works read-only and outputs Terraform pull request diffs that require explicit human sign-off.",
    trayBg: "bg-[#FBE7CB]",
    accentInk: "text-[#6B4814]",
  },
  {
    topic: "ROI visibility",
    question: "Which single action delivers the biggest win this month?",
    answer: "Recommendations rank highest monthly savings plus kg CO₂e removed at the top so teams focus where impact is greatest.",
    trayBg: "bg-[#FFF3A8]",
    accentInk: "text-[#524305]",
  },
];

const TEAM_ROLES: TeamRole[] = [
  {
    subtitle: "Budget & variance",
    title: "Finance",
    desc: "Reconcile monthly spend spikes and quantify net savings from completed cleanup actions.",
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    iconInk: "text-[#524305]",
    icon: "account_balance_wallet",
  },
  {
    subtitle: "Uptime & capacity",
    title: "Operations",
    desc: "Retire detached storage disks and unused load balancers without risking SLA stability.",
    shape: "clover",
    shapeColor: "text-[#FBE0BC]",
    iconInk: "text-[#6B4814]",
    icon: "settings_suggest",
  },
  {
    subtitle: "Terraform velocity",
    title: "Engineering",
    desc: "Receive exact HCL diffs backed by P95 utilization instead of vague spreadsheets.",
    shape: "cookie9",
    shapeColor: "text-[#EAE0BE]",
    iconInk: "text-[#2E2B1A]",
    icon: "terminal",
  },
  {
    subtitle: "ESG reporting",
    title: "Sustainability",
    desc: "Track verifiable regional CO₂e reductions tied directly to infrastructure changes.",
    shape: "flower",
    shapeColor: "text-[#CEECE0]",
    iconInk: "text-[#155E4B]",
    icon: "eco",
  },
  {
    subtitle: "Executive ROI",
    title: "Leaders",
    desc: "Monitor cloud efficiency gains and sustainability targets in one high-signal view.",
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    iconInk: "text-[#524305]",
    icon: "insights",
  },
];

interface PillarRecommendation extends OptimizationReviewItem {
  monthlySavings: string;
  trayHint: string;
  trayBg: string;
  metrics: { k: string; v: string }[];
}

const PILLAR_RECOMMENDATIONS: PillarRecommendation[] = [
  {
    id: "why-ec2-i0a883e2",
    title: "Low-utilization development node",
    service: "Amazon EC2",
    resource: "i-0a883e2",
    region: "us-east-1",
    monthlySavings: "+$96",
    trayHint: "Verified schedule patch ready to preview",
    trayBg: "bg-[#FFF3A8]/60",
    metrics: [
      { k: "14d P95 CPU", v: "1.8%" },
      { k: "Current cost", v: "$148/mo" },
      { k: "Savings", v: "+$96/mo" },
      { k: "Carbon cut", v: "19 kg CO₂e" },
    ],
    recommendation:
      "Schedule automatic off-hours shutdown during nights and weekends on development node i-0a883e2, saving $96/mo and cutting 19 kg CO₂e/mo with zero impact on daytime workflows.",
    evidence: [
      { label: "14d P95 CPU", value: "1.8%" },
      { label: "Current cost", value: "$148/mo" },
      { label: "Savings", value: "+$96/mo ($1,152/yr)" },
      { label: "Carbon cut", value: "19 kg CO₂e/mo" },
    ],
    terraform: `# Off-hours schedule patch for development node i-0a883e2
resource "aws_instance" "dev_node_i0a883e2" {
  instance_state = "stopped"
  tags = {
    InstanceId   = "i-0a883e2"
    Environment  = "development"
    AutoShutdown = "nights-and-weekends"
  }
}`,
    shape: "cookie9",
    icon: "dns",
    shapeColor: "text-[#FFF3A8]",
    iconInk: "text-[#524305]",
  },
  {
    id: "why-rds-staging-postgres",
    title: "Oversized staging database",
    service: "Amazon RDS",
    resource: "staging-postgres-db",
    region: "us-east-1",
    monthlySavings: "+$184",
    trayHint: "Verified Graviton rightsize diff ready to preview",
    trayBg: "bg-[#FBE7CB]/65",
    metrics: [
      { k: "30d peak RAM", v: "2.4 / 32 GB" },
      { k: "Current cost", v: "$280/mo" },
      { k: "Savings", v: "+$184/mo" },
      { k: "Carbon cut", v: "31 kg CO₂e" },
    ],
    recommendation:
      "Downsize staging-postgres-db from db.m5.xlarge (32 GB) to Graviton db.t4g.medium (8 GB) during your scheduled maintenance window based on 30-day peak load below 10%.",
    evidence: [
      { label: "30d peak RAM", value: "2.4 GB / 32 GB" },
      { label: "Average IOPS", value: "42 IOPS" },
      { label: "Savings", value: "+$184/mo ($2,208/yr)" },
      { label: "Carbon cut", value: "31 kg CO₂e/mo" },
    ],
    terraform: `# Right-size oversized staging database based on 30-day peak load
resource "aws_db_instance" "staging_postgres" {
  identifier        = "staging-postgres-db"
  instance_class    = "db.t4g.medium" # Down from db.m5.xlarge
  allocated_storage = 100
}`,
    shape: "flower",
    icon: "database",
    shapeColor: "text-[#FBE0BC]",
    iconInk: "text-[#6B4814]",
  },
];

export default function WhyGreenOpsPage() {
  const [activeReviewItem, setActiveReviewItem] =
    useState<OptimizationReviewItem | null>(null);

  return (
    <div className="min-h-screen bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      <NavigationBar />

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow space-y-14 sm:space-y-20 pt-3 sm:pt-6">
        {/* Intro Hero */}
        <section className="max-w-3xl mx-auto text-center space-y-5 pt-2 sm:pt-4">
          <div className="inline-flex items-center justify-center gap-2.5">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 text-[#CEECE0]">
                <HeroShapeMorph shape="flower" />
              </div>
              <span className="material-symbols-outlined icon-filled relative z-10 text-[16px] text-[#155E4B]">
                eco
              </span>
            </div>
            <span className="text-[13px] font-semibold text-[#686450]">
              Why cloud cost and carbon belong together
            </span>
          </div>

          <h1 className="text-[32px] sm:text-[42px] lg:text-[46px] font-extrabold tracking-[-0.03em] text-[#2E2B1A] leading-[1.12]">
            Wasted cloud compute costs twice: in dollars and in carbon
          </h1>

          <p className="text-[16px] sm:text-[17.5px] text-[#686450] leading-relaxed max-w-2xl mx-auto">
            Over-provisioned databases and idle night servers inflate your monthly invoice while burning preventable grid energy. Fixing one fixes both.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <Link href="/dashboard" className="m3-btn m3-pastel-sun">
              <span className="material-symbols-outlined icon-filled text-[18px] leading-none">
                dashboard
              </span>
              <span>Open live dashboard</span>
            </Link>
            <Link href="/how-it-works" className="m3-btn m3-pastel-oat">
              <span className="material-symbols-outlined icon-filled text-[18px] leading-none">
                account_tree
              </span>
              <span>See how it works</span>
            </Link>
          </div>
        </section>

        {/* Section 1: Four Pillars in Practice */}
        <section className="space-y-6 sm:space-y-7">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
            <div className="space-y-1.5">
              <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
                Cost, waste, and emissions in one picture
              </h2>
              <p className="text-[15px] text-[#686450] max-w-2xl mx-auto lg:mx-0">
                See how cloud spend, unused infrastructure, and grid carbon move together across your workspace.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Pillar 1: FinOps */}
            <div className="gc-card-hover group rounded-[28px] bg-[#FAF6E8] p-6 sm:p-7 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                    <div className="absolute inset-0 text-[#FFE985]">
                      <HeroShapeMorph shape="sunny" />
                    </div>
                    <span className="material-symbols-outlined icon-filled relative z-10 text-[20px] text-[#524305]">
                      payments
                    </span>
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[#686450]">FinOps visibility</div>
                    <h3 className="text-[18px] font-bold text-[#2E2B1A] leading-snug">Monthly cloud spend</h3>
                  </div>
                </div>

                <div className="flex items-baseline gap-2.5">
                  <span className="text-[34px] font-extrabold text-[#2E2B1A] tabular-nums tracking-tight">
                    $24,842
                  </span>
                  <span className="text-[13px] font-medium text-[#686450]">/mo across AWS services</span>
                </div>
              </div>

              <div className="rounded-[20px] bg-[#FFFDF4] p-4 space-y-3">
                {[
                  { label: "Amazon EC2 Compute", pct: "58%", amount: "$14,408", bar: "bg-[#2E2B1A] w-[58%]" },
                  { label: "Amazon RDS Managed", pct: "26%", amount: "$6,459", bar: "bg-[#B8860B] w-[26%]" },
                  { label: "EBS & S3 Storage", pct: "16%", amount: "$3,975", bar: "bg-[#155E4B] w-[16%]" },
                ].map((row) => (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="font-semibold text-[#2E2B1A]">{row.label}</span>
                      <span className="font-bold text-[#686450] tabular-nums">{row.amount} ({row.pct})</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#FAF6E8] overflow-hidden">
                      <div className={`h-full rounded-full ${row.bar}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pillar 2: Infrastructure */}
            <div className="gc-card-hover group rounded-[28px] bg-[#FAF6E8] p-6 sm:p-7 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                    <div className="absolute inset-0 text-[#FBE0BC]">
                      <HeroShapeMorph shape="clover" />
                    </div>
                    <span className="material-symbols-outlined icon-filled relative z-10 text-[20px] text-[#6B4814]">
                      dns
                    </span>
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[#686450]">Infrastructure hygiene</div>
                    <h3 className="text-[18px] font-bold text-[#2E2B1A] leading-snug">Unused capacity detected</h3>
                  </div>
                </div>

                <div className="flex items-baseline gap-2.5">
                  <span className="text-[34px] font-extrabold text-[#2E2B1A] tabular-nums tracking-tight">
                    12 assets
                  </span>
                  <span className="text-[13px] font-semibold text-[#8C5A00] tabular-nums">
                    $1,240/mo recoverable
                  </span>
                </div>
              </div>

              <div className="rounded-[20px] bg-[#FFFDF4] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { count: "5", label: "Idle EC2 dev boxes", detail: "Under 2% night CPU" },
                  { count: "4", label: "Detached EBS disks", detail: "26+ days unmounted" },
                  { count: "3", label: "Oversized RDS nodes", detail: "Below 10% RAM load" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[14px] bg-[#FAF6E8] p-3 space-y-1">
                    <div className="text-[20px] font-extrabold text-[#2E2B1A] tabular-nums">{item.count}</div>
                    <div className="text-[12.5px] font-bold text-[#2E2B1A] leading-tight">{item.label}</div>
                    <div className="text-[11.5px] text-[#686450]">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pillar 3: GreenOps */}
            <div className="gc-card-hover group rounded-[28px] bg-[#FAF6E8] p-6 sm:p-7 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                    <div className="absolute inset-0 text-[#CEECE0]">
                      <HeroShapeMorph shape="flower" />
                    </div>
                    <span className="material-symbols-outlined icon-filled relative z-10 text-[20px] text-[#155E4B]">
                      eco
                    </span>
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[#686450]">Carbon intensity tracking</div>
                    <h3 className="text-[18px] font-bold text-[#2E2B1A] leading-snug">Estimated emissions footprint</h3>
                  </div>
                </div>

                <div className="flex items-baseline gap-2.5">
                  <span className="text-[34px] font-extrabold text-[#155E4B] tabular-nums tracking-tight">
                    12.8 tCO₂e
                  </span>
                  <span className="text-[13px] font-medium text-[#686450]">monthly regional footprint</span>
                </div>

                <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2.5">
                  {[
                    { k: "Addressable waste", v: "2.1 tCO₂e/mo" },
                    { k: "Estimated power", v: "34.6 MWh" },
                    { k: "Hydro region gap", v: "95% lower" },
                  ].map((stat) => (
                    <div key={stat.k} className="rounded-[14px] bg-[#FFFDF4] p-2.5 sm:p-3">
                      <div className="text-[11px] font-medium text-[#686450]">{stat.k}</div>
                      <div className="text-[13.5px] font-extrabold text-[#155E4B] tabular-nums">{stat.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] bg-[#FFFDF4] p-4 sm:p-5 space-y-3">
                {[
                  { region: "ap-south-1 (Mumbai)", intensity: "708 gCO₂e/kWh", bar: "bg-[#8C5A00] w-[92%]" },
                  { region: "us-east-1 (N. Virginia)", intensity: "379 gCO₂e/kWh", bar: "bg-[#6B4814] w-[58%]" },
                  { region: "eu-west-1 (Ireland)", intensity: "285 gCO₂e/kWh", bar: "bg-[#155E4B] w-[42%]" },
                  { region: "eu-north-1 (Stockholm)", intensity: "18 gCO₂e/kWh", bar: "bg-[#1F8A70] w-[10%]" },
                ].map((r) => (
                  <div key={r.region} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="font-semibold text-[#2E2B1A]">{r.region}</span>
                      <span className="font-semibold text-[#686450] tabular-nums">{r.intensity}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#FAF6E8] overflow-hidden">
                      <div className={`h-full rounded-full ${r.bar}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pillar 4: Two Uniform Optimization Rule Examples */}
            <div className="gc-card-hover rounded-[28px] bg-[#FAF6E8] p-6 sm:p-7 flex flex-col justify-between gap-5">
              {PILLAR_RECOMMENDATIONS.map((rec) => (
                <div key={rec.id} className="space-y-3.5">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                      <div className={`absolute inset-0 ${rec.shapeColor}`}>
                        <HeroShapeMorph shape={rec.shape} />
                      </div>
                      <span
                        className={`material-symbols-outlined icon-filled relative z-10 text-[20px] ${rec.iconInk}`}
                      >
                        {rec.icon}
                      </span>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[#686450]">
                        {rec.service} · {rec.resource}
                      </div>
                      <h3 className="text-[18px] font-bold text-[#2E2B1A] leading-snug">
                        {rec.title}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {rec.metrics.map((m) => (
                      <div key={m.k} className="rounded-[14px] bg-[#FFFDF4] p-2.5 sm:p-3">
                        <div className="text-[11px] font-medium text-[#686450]">{m.k}</div>
                        <div className="text-[13.5px] font-extrabold text-[#2E2B1A] tabular-nums">
                          {m.v}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`rounded-[18px] ${rec.trayBg} px-4 py-3 flex items-center justify-between gap-3`}
                  >
                    <div>
                      <div className="text-[18px] font-extrabold text-[#2E2B1A] tabular-nums leading-none">
                        {rec.monthlySavings}{" "}
                        <span className="text-[12px] font-semibold text-[#686450]">/mo</span>
                      </div>
                      <div className="text-[11.5px] font-medium text-[#686450] mt-1">
                        {rec.trayHint}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveReviewItem(rec)}
                      className="m3-btn m3-btn-compact m3-pastel-sun shrink-0"
                    >
                      <span>Review</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2: Everything You Need in One Place */}
        <section className="rounded-[32px] bg-[#FAF6E8] p-6 sm:p-8 lg:p-10 shadow-warm-sm space-y-7">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
            <div className="space-y-1.5">
              <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
                Everything you need in one place
              </h2>
              <p className="text-[15px] text-[#686450] max-w-2xl mx-auto lg:mx-0">
                Six connected layers move teams smoothly from raw multi-cloud billing lines to safe optimization commits.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {PIPELINE_ITEMS.map((item) => (
              <div
                key={item.num}
                className="gc-card-hover group rounded-[24px] bg-[#FFFDF4] p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-11 h-11 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                        <div className={`absolute inset-0 ${item.shapeColor}`}>
                          <HeroShapeMorph shape={item.shape} />
                        </div>
                        <span className={`relative z-10 text-[14px] font-extrabold tabular-nums ${item.numInk}`}>
                          {item.num}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-[#686450] truncate">
                          {item.subtitle}
                        </div>
                        <h3 className="text-[16.5px] font-bold text-[#2E2B1A] leading-snug">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    {item.showClouds && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-7 h-7 rounded-lg bg-[#FAF6E8] p-1 flex items-center justify-center">
                          <img src="/icons/aws-dark.svg" alt="AWS" className="w-full h-full object-contain" />
                        </span>
                        <span className="w-7 h-7 rounded-lg bg-[#FAF6E8] p-1 flex items-center justify-center">
                          <img src="/icons/gcp.svg" alt="GCP" className="w-full h-full object-contain" />
                        </span>
                        <span className="w-7 h-7 rounded-lg bg-[#FAF6E8] p-1 flex items-center justify-center">
                          <img src="/icons/azure.svg" alt="Azure" className="w-full h-full object-contain" />
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[13.5px] text-[#686450] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: One Place to Understand Your Cloud (9 Capabilities) */}
        <section className="space-y-6 sm:space-y-7">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
            <div className="space-y-1.5">
              <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
                One place to understand your cloud
              </h2>
              <p className="text-[15px] text-[#686450] max-w-2xl mx-auto lg:mx-0">
                Built around verifiable telemetry, carbon transparency, and Git-native workflows instead of black-box scripts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {CAPABILITY_CARDS.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="gc-card-hover group rounded-[24px] bg-[#FBF6E3] p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-10 h-10 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                      <div className={`absolute inset-0 ${card.shapeColor}`}>
                        <HeroShapeMorph shape={card.shape} />
                      </div>
                      <span className={`material-symbols-outlined icon-filled relative z-10 text-[18px] ${card.iconInk}`}>
                        {card.icon}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#686450] truncate">
                        {card.subtitle}
                      </div>
                      <h3 className="text-[16px] font-bold text-[#2E2B1A] leading-snug">
                        {card.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-[13.5px] text-[#686450] leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2E2B1A]">
                  <span>{card.linkLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 4: Ask GreenCloud the Simple Questions */}
        <section className="rounded-[32px] bg-[#FAF6E8] p-6 sm:p-8 lg:p-10 shadow-warm-sm space-y-7">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
            <div className="space-y-1.5">
              <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
                Ask the simple questions
              </h2>
              <p className="text-[15px] text-[#686450] max-w-2xl mx-auto lg:mx-0">
                Plain answers backed by utilization data, carbon intensity factors, and safe Terraform changes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {QA_ITEMS.map((item) => (
              <div
                key={item.question}
                className="rounded-[24px] bg-[#FFFDF4] p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className={`text-[12px] font-semibold ${item.accentInk}`}>
                    {item.topic}
                  </div>
                  <h3 className="text-[17px] font-bold text-[#2E2B1A] leading-snug">
                    &ldquo;{item.question}&rdquo;
                  </h3>
                </div>

                <p className={`rounded-[18px] ${item.trayBg} px-4 py-3.5 text-[13.5px] text-[#2E2B1A] leading-relaxed`}>
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Useful for Every Team */}
        <section className="space-y-6 sm:space-y-7">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
            <div className="space-y-1.5">
              <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
                Useful for every team
              </h2>
              <p className="text-[15px] text-[#686450] max-w-2xl mx-auto lg:mx-0">
                One shared telemetry source aligns financial planning, operations reliability, engineering code, and ESG disclosure.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TEAM_ROLES.map((role) => (
              <div
                key={role.title}
                className="gc-card-hover group rounded-[24px] bg-[#FBF6E3] p-5 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                    <div className={`absolute inset-0 ${role.shapeColor}`}>
                      <HeroShapeMorph shape={role.shape} />
                    </div>
                    <span className={`material-symbols-outlined icon-filled relative z-10 text-[18px] ${role.iconInk}`}>
                      {role.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-semibold text-[#686450] truncate">
                      {role.subtitle}
                    </div>
                    <h3 className="text-[16px] font-bold text-[#2E2B1A] leading-snug">
                      {role.title}
                    </h3>
                  </div>
                </div>

                <p className="text-[13px] text-[#686450] leading-relaxed">
                  {role.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="rounded-[32px] bg-[#FAF6E8] p-8 sm:p-11 text-center flex flex-col items-center space-y-5">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
              Next: see the telemetry in action
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              Explore live cost and carbon charts, inspect ranked optimization diffs, or review how GreenCloud connects step by step.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link href="/dashboard" className="m3-btn m3-pastel-sun">
              <span>Explore live dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/#optimization" className="m3-btn m3-pastel-oat">
              <span>View recommendations</span>
            </Link>
            <Link href="/how-it-works" className="m3-btn m3-pastel-mint">
              <span>How it works</span>
            </Link>
          </div>
        </section>
      </main>

      <ComplianceFooter />

      <OptimizationReviewModal
        item={activeReviewItem}
        onClose={() => setActiveReviewItem(null)}
      />
    </div>
  );
}
