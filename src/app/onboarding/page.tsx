"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavigationBar } from "@/components/common/NavigationBar";
import { ComplianceFooter } from "@/components/common/ComplianceFooter";
import {
  Users,
  Cloud,
  Check,
  ArrowRight,
  ArrowLeft,
  Server,
  Code2,
  Network,
  DollarSign,
  Shield,
  Briefcase,
  Lock,
  AlertCircle,
  KeyRound,
  Sparkles,
  CheckCircle2,
  Leaf,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  // Existing Accounts State
  const [existingAccounts, setExistingAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/cloud-accounts")
      .then((r) => r.json())
      .then((accs) => {
        if (Array.isArray(accs) && accs.length > 0) {
          setExistingAccounts(accs);
        }
      })
      .catch(() => {});
  }, []);

  // Wizard Step State (1 through 4)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 2: Role State (Company Cloud Management Team Roles)
  const [selectedRole, setSelectedRole] = useState<string>("devops");

  // Step 3: Cloud Provider State (AWS unlocked, Azure & GCP locked)
  const [selectedProvider, setSelectedProvider] = useState<"aws" | "azure" | "gcp">("aws");
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [providerError, setProviderError] = useState<string | null>(null);

  // Step 4: AWS Connection Form State (clean, un-prefilled)
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [externalId, setExternalId] = useState("");

  // Loading & Submission State
  const [connecting, setConnecting] = useState(false);
  const [connectionStage, setConnectionStage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Authentic Cloud Computing, Carbon & FinOps Roles
  const companyRoles = [
    {
      id: "operations",
      category: "Cloud Governance & Operations",
      title: "Cloud Operations Manager",
      persona: "Platform Lead & Infrastructure Management",
      desc: "Infrastructure health, multi-account governance, and operational standards.",
      capabilities: [
        "Executive multi-account cloud health and inventory status",
        "Budget threshold alerts and team spend guardrails",
        "Complete audit logs of all automated optimizations and approvals",
      ],
      metrics: ["Total Cloud Spend", "Idle Waste Rate", "Account Health", "Optimization Velocity"],
      icon: Users,
    },
    {
      id: "sustainability",
      category: "Carbon Accounting & GreenOps",
      title: "Cloud Sustainability Lead",
      persona: "ESG & Green Software Specialist",
      desc: "Carbon emissions modeling, Software Carbon Intensity (SCI), and grid efficiency.",
      capabilities: [
        "Operational carbon emissions tracking (gCO2e) via regional grid intensity",
        "Hardware manufacturing embodied emissions estimation",
        "Software Carbon Intensity (SCI) per functional unit and region migration guidance",
      ],
      metrics: ["Operational gCO2e", "Embodied Carbon", "Grid Intensity (gCO2e/kWh)", "SCI Score"],
      icon: Leaf,
    },
    {
      id: "finops",
      category: "Cloud Financial Management",
      title: "FinOps Engineer",
      persona: "Cloud Cost Specialist & FinOps Practitioner",
      desc: "Cost allocation, spend anomaly detection, and commitment portfolio optimization.",
      capabilities: [
        "Automated spend anomaly detection with root cause identification",
        "Cost allocation by tags, environment, and team (showback/chargeback)",
        "Reserved Instance (RI) and Savings Plans coverage simulations",
      ],
      metrics: ["Monthly Billed Cost", "Identified Waste ($/mo)", "Daily Spend Spikes", "RI/SP Coverage"],
      icon: DollarSign,
    },
    {
      id: "devops",
      category: "Platform & Reliability",
      title: "DevOps Engineer",
      persona: "Site Reliability & Infrastructure Automation",
      desc: "Infrastructure operations, CI/CD automation, idle resource cleanup, and uptime.",
      capabilities: [
        "Automated detection of unattached EBS volumes and unused Elastic IPs",
        "Safe remediation policies with dry-run simulations and automated rollbacks",
        "Pull-request automation for Infrastructure-as-Code (Terraform / CloudFormation)",
      ],
      metrics: ["CloudWatch CPU/RAM%", "Unattached EBS Disks", "Unused Elastic IPs", "SLO Uptime"],
      icon: Server,
    },
    {
      id: "architect",
      category: "Cloud Architecture & Design",
      title: "Cloud Solutions Architect",
      persona: "Solutions Architecture & Topology Design",
      desc: "System topology, multi-region architecture, high availability, and reliability.",
      capabilities: [
        "Multi-region AWS infrastructure mapping and regional topology insights",
        "Compute family evaluations (Graviton vs x86 performance and cost efficiency)",
        "High-availability vs idle waste architecture trade-off reviews",
      ],
      metrics: ["Region Distribution", "Instance Efficiency", "Topology Resilience", "Storage Tiering"],
      icon: Network,
    },
    {
      id: "developer",
      category: "Application Engineering",
      title: "Software Developer",
      persona: "Backend & Cloud Services Developer",
      desc: "Backend services, APIs, microservices, and container workloads.",
      capabilities: [
        "VM and container rightsizing recommendations based on 7-day telemetry",
        "Pre-deployment cost and carbon impact context directly on pull requests",
        "Transparent calculation evidence and CPU utilization time series",
      ],
      metrics: ["Instance Rightsizing", "Average CPU Utilization", "Storage Allocation", "PR Impact Cost"],
      icon: Code2,
    },
  ];

  // Quick fill helper for testing
  const handleQuickFill = () => {
    setAccountName("My AWS Production");
    setAccountId("123456789012");
    setRoleArn("arn:aws:iam::123456789012:role/GreenCloudReadOnlyRole");
    setExternalId("greencloud-demo");
    setError(null);
  };

  // Handle final connection submission
  const handleFinalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!accountName.trim()) {
      setError("Please provide a connection name (e.g. My AWS Production).");
      return;
    }

    if (!/^\d{12}$/.test(accountId.trim())) {
      setError("AWS Account ID must be exactly 12 numeric digits (e.g. 123456789012).");
      return;
    }

    if (!roleArn.trim().startsWith("arn:aws:iam::")) {
      setError("Role ARN must follow format: arn:aws:iam::<12-digit-account>:role/<role-name>");
      return;
    }

    setConnecting(true);

    try {
      setConnectionStage("Authenticating AWS IAM Role via STS AssumeRole...");

      const res = await fetch("/api/cloud-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "aws",
          externalAccountId: accountId.trim(),
          name: accountName.trim(),
          roleArn: roleArn.trim(),
          externalId: externalId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      setConnectionStage("Connected successfully! Opening dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to connect cloud account. Please check the IAM Role ARN.");
      setConnecting(false);
    }
  };

  const steps = [
    { num: 1, label: "Welcome" },
    { num: 2, label: "Role" },
    { num: 3, label: "Cloud" },
    { num: 4, label: "Connect" },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      {/* 1. TOP NAVIGATION */}
      <NavigationBar />

      {/* 2. MAIN WIZARD CONTAINER */}
      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 w-full flex-grow pt-4 pb-16">
        {/* Banner if cloud account is already connected */}
        {existingAccounts.length > 0 && (
          <div className="max-w-[620px] mx-auto mb-6 p-4 rounded-2xl bg-[#E2F5EF] border border-[#BDEBDD] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1F8A70] text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-[13.5px] text-[#1F8A70] block">
                  Cloud Account Connected: {existingAccounts[0].name}
                </span>
                <span className="text-[11.5px] text-[#686450] font-mono">
                  {existingAccounts[0].externalAccountId} · {existingAccounts.length} active account{existingAccounts.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F8A70] hover:bg-[#186D58] text-white font-bold text-[12.5px] shadow-xs transition-colors shrink-0"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* COMPACT, PROPORTIONAL STEPPER BAR WITH CLEAN SEGMENTED TRACK */}
        <div className="max-w-[620px] mx-auto mb-8 bg-white rounded-2xl border border-[#ECE5CC] px-6 py-4 shadow-warm-xs">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => {
                    if (step.num < currentStep) setCurrentStep(step.num);
                  }}
                  className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all ${
                    step.num < currentStep ? "cursor-pointer group" : "cursor-default"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-[13px] font-bold transition-all shadow-2xs ${
                      currentStep === step.num
                        ? "bg-[#FFF76A] border-2 border-[#2E2B1A] text-[#2E2B1A] ring-4 ring-[#FFF76A]/40 scale-105"
                        : currentStep > step.num
                        ? "bg-[#1F8A70] text-white border-2 border-[#1F8A70]"
                        : "bg-[#FAF6E8] border-2 border-[#ECE5CC] text-[#8D8975]"
                    }`}
                  >
                    {currentStep > step.num ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      step.num
                    )}
                  </div>
                  <span
                    className={`text-[12px] font-bold tracking-tight whitespace-nowrap ${
                      currentStep === step.num
                        ? "text-[#2E2B1A]"
                        : currentStep > step.num
                        ? "text-[#1F8A70] group-hover:underline"
                        : "text-[#8D8975]"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>

                {/* Segmented connector line between steps */}
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-[2.5px] mx-3 -mt-5 rounded-full transition-all duration-300 ${
                      currentStep > step.num ? "bg-[#1F8A70]" : "bg-[#ECE5CC]"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: WELCOME & ROADMAP                                                 */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="text-center max-w-2xl mx-auto pt-2">
              <h1 className="text-[30px] sm:text-[38px] font-black text-[#2E2B1A] tracking-tight leading-tight mb-2">
                Let's set up your GreenCloud workspace
              </h1>
              <p className="text-[15px] sm:text-[16px] text-[#686450] leading-relaxed">
                A simple 3-step walkthrough to customize your team's role view, select your cloud environment, and connect AWS telemetry.
              </p>
            </div>

            {/* 4 Clean Visual Cards Grounded in Real Architecture */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between hover:shadow-warm-md transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[11px] font-bold text-[#8D8975]">01</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#2E2B1A] mb-1">Choose your role</h3>
                  <p className="text-[12.5px] text-[#686450] leading-relaxed">
                    Select your role to prioritize the telemetry and optimization views you care about.
                  </p>
                </div>
                <div className="mt-5 pt-2.5 border-t border-[#ECE5CC] text-[11px] font-semibold text-[#1F8A70]">
                  Role-Based View
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between hover:shadow-warm-md transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00]">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[11px] font-bold text-[#8D8975]">02</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#2E2B1A] mb-1">Select cloud provider</h3>
                  <p className="text-[12.5px] text-[#686450] leading-relaxed">
                    Select Amazon Web Services (AWS) as your primary scanning environment.
                  </p>
                </div>
                <div className="mt-5 pt-2.5 border-t border-[#ECE5CC] text-[11px] font-semibold text-[#9A6B00]">
                  Cloud Selection
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between hover:shadow-warm-md transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70]">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[11px] font-bold text-[#8D8975]">03</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#2E2B1A] mb-1">Connect AWS IAM</h3>
                  <p className="text-[12.5px] text-[#686450] leading-relaxed">
                    Provide your read-only IAM Role ARN and External ID to authenticate via STS.
                  </p>
                </div>
                <div className="mt-5 pt-2.5 border-t border-[#ECE5CC] text-[11px] font-semibold text-[#1F8A70]">
                  STS AssumeRole
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between hover:shadow-warm-md transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[11px] font-bold text-[#8D8975]">04</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#2E2B1A] mb-1">Instant telemetry</h3>
                  <p className="text-[12.5px] text-[#686450] leading-relaxed">
                    View EC2 and EBS inventory, CloudWatch metrics, idle waste, and carbon footprint.
                  </p>
                </div>
                <div className="mt-5 pt-2.5 border-t border-[#ECE5CC] text-[11px] font-semibold text-[#9A6B00]">
                  Cost & Carbon
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[#2E2B1A] font-bold text-[14px] shadow-sm hover:shadow-sunshine-glow transition-all cursor-pointer"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: ROLE SELECTION (CLOUD, CARBON & FINOPS ROLES + DYNAMIC SIDE INFO)  */}
        {/* ========================================================================= */}
        {currentStep === 2 && (() => {
          const activeRole = companyRoles.find((r) => r.id === selectedRole) || companyRoles[0];
          const ActiveIcon = activeRole.icon;

          return (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
              <div className="text-center">
                <h2 className="text-[24px] sm:text-[28px] font-black text-[#2E2B1A] tracking-tight mb-1">
                  Choose your role in the cloud team
                </h2>
                <p className="text-[13.5px] text-[#686450]">
                  Select your functional focus to see your tailored GreenCloud workspace capabilities and telemetry.
                </p>
              </div>

              {/* 2-Column Responsive Layout: Cards on Left (7 cols), Selected Role Details on Right (5 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* LEFT: 6 Clean Role Cards Grid (7 cols) */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {companyRoles.map((role) => {
                    const isSelected = selectedRole === role.id;
                    const IconComp = role.icon;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                          isSelected
                            ? "bg-white border-[#2E2B1A] shadow-warm-sm ring-2 ring-[#FFF76A]"
                            : "bg-white border-[#ECE5CC] hover:border-[#DFD6B5] hover:bg-[#FAF6E8]/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A] shrink-0 mt-0.5">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-[#2E2B1A] text-[14px] block mb-0.5 leading-snug">
                              {role.title}
                            </span>
                            <p className="text-[11.5px] text-[#686450] leading-relaxed">
                              {role.desc}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2 mt-1">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "bg-[#1F8A70] border-[#1F8A70] text-white"
                                : "border-[#ECE5CC] bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* RIGHT: Dynamic Side Layout (What You Are Signing Up For) (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm flex flex-col justify-between space-y-4">
                  <div>
                    {/* Header: Category Badge + Selected View */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC] mb-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FAF6E8] border border-[#ECE5CC] text-[#9A6B00]">
                        {activeRole.category}
                      </span>
                      <span className="text-[11px] font-semibold text-[#1F8A70] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selected
                      </span>
                    </div>

                    {/* Role Title & Persona */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A] shrink-0">
                        <ActiveIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#2E2B1A] text-[16px] leading-tight">
                          {activeRole.title}
                        </h3>
                        <span className="text-[11.5px] text-[#8D8975] block mt-0.5">
                          {activeRole.persona}
                        </span>
                      </div>
                    </div>

                    {/* What this role gets in GreenCloud */}
                    <div className="mb-4">
                      <span className="text-[10.5px] font-bold text-[#2E2B1A] uppercase tracking-wider block mb-2">
                        What you get in your workspace:
                      </span>
                      <ul className="space-y-2">
                        {activeRole.capabilities.map((cap, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px] text-[#686450] leading-snug">
                            <span className="w-4 h-4 rounded-full bg-[#E2F5EF] text-[#1F8A70] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                              ✓
                            </span>
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Key Metrics Tracked */}
                    <div className="pt-3 border-t border-[#ECE5CC]">
                      <span className="text-[10.5px] font-bold text-[#2E2B1A] uppercase tracking-wider block mb-2">
                        Primary Telemetry You'll Track:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeRole.metrics.map((metric, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A]"
                          >
                            {metric}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Trust & Least-Privilege Note */}
                  <div className="pt-2.5 border-t border-[#ECE5CC] text-[11px] text-[#8D8975] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                    <span>Read-only telemetry. Tailored to your operational focus.</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-[#ECE5CC] hover:bg-[#FAF6E8] text-[13px] font-semibold text-[#686450] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[13px] font-bold text-[#2E2B1A] shadow-xs transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* STEP 3: CHOOSE CLOUD PROVIDER (AWS UNLOCKED, AZURE & GCP LOCKED)          */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="text-center">
              <h2 className="text-[24px] font-black text-[#2E2B1A] tracking-tight mb-1">
                Choose your cloud provider
              </h2>
              <p className="text-[13.5px] text-[#686450]">
                Select the cloud provider to scan. Currently, Amazon Web Services is supported.
              </p>
            </div>

            {/* Provider Warning / Notice if locked clicked */}
            {providerError && (
              <div className="p-3 rounded-xl bg-[#FFF3D6] border border-[#F3E5BC] text-[#9A6B00] text-[12.5px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{providerError}</span>
              </div>
            )}

            {/* Providers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* AWS (Active & Selectable) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider("aws");
                  setProviderError(null);
                }}
                className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  selectedProvider === "aws"
                    ? "bg-white border-[#2E2B1A] shadow-warm-sm ring-2 ring-[#FFF76A]"
                    : "bg-white border-[#ECE5CC] hover:border-[#DFD6B5]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF3D6] flex items-center justify-center text-[#9A6B00]">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#E2F5EF] border border-[#BDEBDD] text-[11px] font-bold text-[#1F8A70]">
                      Available
                    </span>
                  </div>
                  <h3 className="font-bold text-[#2E2B1A] text-[16px] mb-1">
                    Amazon Web Services
                  </h3>
                  <p className="text-[12.5px] text-[#686450] leading-relaxed">
                    Full scanning for EC2 instances, EBS storage, and AWS Cost Explorer.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-[#ECE5CC] text-[11.5px] font-bold text-[#1F8A70]">
                  Ready to Connect
                </div>
              </button>

              {/* Azure (LOCKED) */}
              <div
                onClick={() => setProviderError("Microsoft Azure integration is currently locked. Please select Amazon Web Services to proceed.")}
                className="p-5 rounded-2xl border border-[#ECE5CC] bg-[#FAF6E8]/50 opacity-60 cursor-not-allowed text-left flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FAF6E8] flex items-center justify-center text-[#8D8975]">
                      <Server className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#ECE5CC] text-[10.5px] font-bold text-[#8D8975]">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  </div>
                  <h3 className="font-bold text-[#686450] text-[16px] mb-1">
                    Microsoft Azure
                  </h3>
                  <p className="text-[12.5px] text-[#8D8975] leading-relaxed">
                    Azure Virtual Machines, Disks, and Azure Cost Management adapter.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-[#ECE5CC]/60 text-[11px] font-medium text-[#8D8975]">
                  Coming Soon
                </div>
              </div>

              {/* GCP (LOCKED) */}
              <div
                onClick={() => setProviderError("Google Cloud integration is currently locked. Please select Amazon Web Services to proceed.")}
                className="p-5 rounded-2xl border border-[#ECE5CC] bg-[#FAF6E8]/50 opacity-60 cursor-not-allowed text-left flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FAF6E8] flex items-center justify-center text-[#8D8975]">
                      <Server className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#ECE5CC] text-[10.5px] font-bold text-[#8D8975]">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  </div>
                  <h3 className="font-bold text-[#686450] text-[16px] mb-1">
                    Google Cloud Platform
                  </h3>
                  <p className="text-[12.5px] text-[#8D8975] leading-relaxed">
                    Google Compute Engine, Persistent Disks, and GCP Billing Export.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-[#ECE5CC]/60 text-[11px] font-medium text-[#8D8975]">
                  Coming Soon
                </div>
              </div>
            </div>

            {/* AWS Region Dropdown (Clean, unconstrained) */}
            <div className="bg-white rounded-2xl border border-[#ECE5CC] p-4 sm:p-5 shadow-warm-sm">
              <label className="block text-[13px] font-bold text-[#2E2B1A] mb-1.5">
                Primary AWS Region
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/40 focus:bg-white focus:outline-none focus:border-[#9A6B00] text-[13.5px] text-[#2E2B1A] font-medium transition-all cursor-pointer"
              >
                <option value="us-east-1">US East (N. Virginia) [us-east-1] - Default</option>
                <option value="us-east-2">US East (Ohio) [us-east-2]</option>
                <option value="us-west-2">US West (Oregon) [us-west-2]</option>
                <option value="us-west-1">US West (N. California) [us-west-1]</option>
                <option value="eu-central-1">Europe (Frankfurt) [eu-central-1]</option>
                <option value="eu-west-1">Europe (Ireland) [eu-west-1]</option>
                <option value="eu-west-2">Europe (London) [eu-west-2]</option>
                <option value="ap-northeast-1">Asia Pacific (Tokyo) [ap-northeast-1]</option>
                <option value="ap-south-1">Asia Pacific (Mumbai) [ap-south-1]</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore) [ap-southeast-1]</option>
                <option value="all">All Active Regions (Global Scan)</option>
              </select>
              <p className="mt-2 text-[11.5px] text-[#8D8975]">
                GreenCloud uses your primary AWS region to calculate regional grid carbon intensity (gCO2e/kWh).
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-[#ECE5CC] hover:bg-[#FAF6E8] text-[13px] font-semibold text-[#686450] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[13px] font-bold text-[#2E2B1A] shadow-xs transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: CONNECT AWS ACCOUNT (BALANCED SIDE-BY-SIDE MODERN LAYOUT)         */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="text-center">
              <h2 className="text-[24px] sm:text-[28px] font-black text-[#2E2B1A] tracking-tight mb-1">
                Connect AWS Account
              </h2>
              <p className="text-[13.5px] text-[#686450]">
                Enter your AWS IAM Role details to begin syncing resource inventory, billing, and carbon telemetry.
              </p>
            </div>

            {/* Error Message if any */}
            {error && (
              <div className="p-3.5 rounded-xl bg-[#FFE8E8] border border-[#FFCCCC] text-[#D32F2F] text-[13px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Unified 2-Column Responsive Card Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* LEFT: Connection Form Card (7 cols) */}
              <form
                onSubmit={handleFinalSubmit}
                className="lg:col-span-7 bg-white rounded-3xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC] mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF6E8] flex items-center justify-center text-[#9A6B00]">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-[#2E2B1A] text-[13.5px] block leading-tight">
                          IAM Role Credentials
                        </span>
                        <span className="text-[11px] text-[#8D8975]">
                          STS AssumeRole Authentication
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleQuickFill}
                      className="text-[11px] font-mono font-bold text-[#9A6B00] hover:underline bg-[#FAF6E8] px-2.5 py-1 rounded-md border border-[#ECE5CC] cursor-pointer"
                    >
                      Fill Sample Values
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {/* Compact 2-Column Grid for Name & Account ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-bold text-[#2E2B1A] mb-1">
                          Connection Name
                        </label>
                        <input
                          type="text"
                          required
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          placeholder="e.g. My AWS Production"
                          className="w-full px-3 py-2 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/30 focus:bg-white focus:outline-none focus:border-[#9A6B00] text-[12.5px] text-[#2E2B1A] placeholder:text-[#8D8975]/60"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-bold text-[#2E2B1A] mb-1">
                          AWS Account ID (12 digits)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456789012"
                          className="w-full px-3 py-2 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/30 focus:bg-white focus:outline-none focus:border-[#9A6B00] text-[12.5px] text-[#2E2B1A] font-mono placeholder:text-[#8D8975]/60"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#2E2B1A] mb-1">
                        IAM Role ARN
                      </label>
                      <input
                        type="text"
                        required
                        value={roleArn}
                        onChange={(e) => setRoleArn(e.target.value)}
                        placeholder="arn:aws:iam::<account-id>:role/GreenCloudReadOnlyRole"
                        className="w-full px-3 py-2 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/30 focus:bg-white focus:outline-none focus:border-[#9A6B00] text-[12.5px] text-[#2E2B1A] font-mono placeholder:text-[#8D8975]/60"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#2E2B1A] mb-1">
                        External ID (Confused Deputy Prevention)
                      </label>
                      <input
                        type="text"
                        value={externalId}
                        onChange={(e) => setExternalId(e.target.value)}
                        placeholder="e.g. greencloud-demo"
                        className="w-full px-3 py-2 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8]/30 focus:bg-white focus:outline-none focus:border-[#9A6B00] text-[12.5px] text-[#2E2B1A] font-mono placeholder:text-[#8D8975]/60"
                      />
                    </div>

                    {/* Progress feedback */}
                    {connecting && (
                      <div className="p-3 rounded-xl bg-[#FFF76A]/40 border border-[#DFD6B5] flex items-center justify-center gap-2.5 text-[12px] font-bold text-[#2E2B1A]">
                        <div className="w-3.5 h-3.5 border-2 border-[#2E2B1A] border-t-transparent rounded-full animate-spin"></div>
                        <span>{connectionStage}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-[#ECE5CC] flex items-center justify-between">
                  <button
                    type="button"
                    disabled={connecting}
                    onClick={() => setCurrentStep(3)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#ECE5CC] hover:bg-[#FAF6E8] text-[12.5px] font-semibold text-[#686450] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={connecting}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[13px] font-bold text-[#2E2B1A] shadow-sm hover:shadow-sunshine-glow transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>Connect AWS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* RIGHT: Setup Reference & Security Card (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-[#ECE5CC] mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#FAF6E8] flex items-center justify-center text-[#1F8A70]">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2E2B1A] text-[13.5px] leading-tight">
                        Setup Reference Guide
                      </h3>
                      <span className="text-[11px] text-[#8D8975]">
                        docs/aws-setup-guide.md
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-[12px] text-[#686450]">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[#9A6B00] font-mono text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <strong className="text-[#2E2B1A] block">12-Digit Account ID</strong>
                        Find in the top-right user menu in the AWS Management Console.
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[#9A6B00] font-mono text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <strong className="text-[#2E2B1A] block">Read-Only IAM Role</strong>
                        Attach policy with least-privilege telemetry permissions (<code className="bg-[#FAF6E8] px-1 py-0.5 rounded text-[10.5px]">ec2:Describe*</code>, <code className="bg-[#FAF6E8] px-1 py-0.5 rounded text-[10.5px]">cloudwatch:Get*</code>, <code className="bg-[#FAF6E8] px-1 py-0.5 rounded text-[10.5px]">ce:Get*</code>).
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[#9A6B00] font-mono text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <strong className="text-[#2E2B1A] block">External ID Security</strong>
                        Configured in your Trust Policy to prevent confused deputy impersonation.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Guarantee Pill at Bottom */}
                <div className="mt-4 pt-3 border-t border-[#ECE5CC] bg-[#FAF6E8]/50 rounded-xl p-3 border border-[#ECE5CC]/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1F8A70] mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Zero Static Keys Stored</span>
                  </div>
                  <p className="text-[11px] text-[#8D8975] leading-relaxed">
                    GreenCloud authenticates via AWS STS to generate short-lived 15-minute temporary credentials on demand.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <ComplianceFooter />
    </div>
  );
}
