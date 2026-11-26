"use client";

import React, { Suspense, useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Lock } from "lucide-react";
import { ComplianceFooter } from "@/components/common/ComplianceFooter";
import {
  ONBOARDING_RETURN_KEY,
  useAccountStatus,
} from "@/components/common/AccountStatusContext";

interface RoleSpec {
  id: string;
  accessLabel: string;
  title: string;
  persona: string;
  shortDesc: string;
  desc: string;
  capabilities: string[];
  metrics: string[];
  icon: string;
}

const COMPANY_ROLES: RoleSpec[] = [
  {
    id: "admin",
    accessLabel: "Full control · All accounts",
    title: "Workspace Admin",
    persona: "Full Account, Role & Governance Control",
    shortDesc: "Manage team roles, accounts, and all views.",
    desc: "Full access to manage team roles, connected accounts, approvals, and every workspace view.",
    capabilities: [
      "Assign or modify team roles, IAM accounts, and permission boundaries",
      "View all FinOps, DevOps, Architecture, and Sustainability metrics together",
      "Approve optimization PRs and audit every action across all environments",
    ],
    metrics: [
      "All Role Views",
      "Role & Account Control",
      "Total Cloud Spend",
      "Verified Savings",
    ],
    icon: "admin_panel_settings",
  },
  {
    id: "finops",
    accessLabel: "Cost & billing",
    title: "FinOps Engineer",
    persona: "Spend Allocation & Cost Optimization",
    shortDesc: "Track daily spend, anomalies, and savings.",
    desc: "Track cost attribution, daily spend anomalies, and commitment-aware savings.",
    capabilities: [
      "Track daily AWS Cost Explorer & CUR 2.0 spend trends",
      "Separate observed billed cost from modeled savings",
      "Prevent double-counting overlapping resource recommendations",
    ],
    metrics: [
      "Monthly Billed Spend",
      "Addressable Waste ($/mo)",
      "Daily Burn Rate",
      "Savings Forecast",
    ],
    icon: "payments",
  },
  {
    id: "devops",
    accessLabel: "Infra & Terraform",
    title: "DevOps Engineer",
    persona: "Infrastructure & GitOps Workflows",
    shortDesc: "Detect idle servers and Terraform PR diffs.",
    desc: "Inspect idle compute, detached EBS volumes, and reviewable Terraform PR diffs.",
    capabilities: [
      "Detect idle EC2 nodes, unattached EBS volumes, and unused Elastic IPs",
      "Export reviewable Terraform HCL diffs for Git pull requests",
      "Verify post-change billing and latency after deployments",
    ],
    metrics: [
      "14d P95 CPU & RAM",
      "Detached EBS Disks",
      "Unused Elastic IPs",
      "Terraform Diffs",
    ],
    icon: "dns",
  },
  {
    id: "architect",
    accessLabel: "Topology & sizing",
    title: "Solutions Architect",
    persona: "Multi-Region Design & Efficiency",
    shortDesc: "Plan regions, Graviton, and workload sizing.",
    desc: "Evaluate regional workload placement, Graviton families, and headroom.",
    capabilities: [
      "Evaluate x86 to AWS Graviton instance migrations safely",
      "Compare regional cost and carbon intensity trade-offs",
      "Review multi-account inventory across AWS regions",
    ],
    metrics: [
      "Regional Distribution",
      "Compute Efficiency",
      "Storage Tiering",
      "Graviton Readiness",
    ],
    icon: "account_tree",
  },
  {
    id: "sustainability",
    accessLabel: "Carbon & ESG",
    title: "Sustainability Lead",
    persona: "Emissions & Regional Grid Efficiency",
    shortDesc: "Monitor regional carbon and ESG reports.",
    desc: "Monitor regional electricity carbon intensity and emissions reduction reports.",
    capabilities: [
      "Estimate operational energy and regional kg CO2e per workload",
      "Compare high-intensity grids against low-carbon hydro regions",
      "Keep modeled estimates distinct from monthly provider exports",
    ],
    metrics: [
      "Monthly tCO2e",
      "Grid Intensity (gCO2e/kWh)",
      "Addressable CO2e",
      "Power Draw (MWh)",
    ],
    icon: "eco",
  },
  {
    id: "viewer",
    accessLabel: "View only · Basic summary",
    title: "Read-Only Viewer",
    persona: "Minimal Summary & Reporting Access",
    shortDesc: "View spend totals and basic summaries only.",
    desc: "Basic read-only access to high-level spend totals and carbon summaries without edit controls.",
    capabilities: [
      "Read high-level monthly spend, carbon totals, and headline KPIs",
      "View completed savings summaries for executive or stakeholder updates",
      "No access to IAM credentials, role management, or Terraform exports",
    ],
    metrics: ["Summary Spend", "Carbon Overview", "Read-Only Mode"],
    icon: "visibility",
  },
];

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHasAccount } = useAccountStatus();

  const rawStep = Number(searchParams.get("step") || "1");
  const currentStep =
    Number.isFinite(rawStep) && rawStep >= 1 && rawStep <= 4 ? Math.floor(rawStep) : 1;

  const [existingAccounts, setExistingAccounts] = useState<any[]>([]);
  const [returnTarget, setReturnTarget] = useState<"/" | "/dashboard">("/");
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const [selectedProvider, setSelectedProvider] = useState<"aws" | "azure" | "gcp">("aws");
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [providerError, setProviderError] = useState<string | null>(null);

  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [externalId, setExternalId] = useState("");
  const [showEncryptedCreds, setShowEncryptedCreds] = useState(false);
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");

  const [connecting, setConnecting] = useState(false);
  const [connectionStage, setConnectionStage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const navigatingRef = useRef(false);
  const guardCleanupRef = useRef<(() => void) | null>(null);
  const transitionDirRef = useRef<"initial" | "forward" | "back">("initial");
  const currentStepRef = useRef(currentStep);
  const returnTargetRef = useRef(returnTarget);
  currentStepRef.current = currentStep;
  returnTargetRef.current = returnTarget;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(ONBOARDING_RETURN_KEY);
    setReturnTarget(saved === "/dashboard" ? "/dashboard" : "/");
  }, []);

  const forceScrollTop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const lockTopAcrossTransition = useCallback(() => {
    if (typeof window === "undefined") return () => {};
    if (guardCleanupRef.current) {
      guardCleanupRef.current();
    }

    navigatingRef.current = true;
    forceScrollTop();

    const cleanup = () => {
      navigatingRef.current = false;
      window.removeEventListener("wheel", cleanup);
      window.removeEventListener("touchstart", cleanup);
      window.removeEventListener("scroll", onScroll);
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(doneTimer);
      if (guardCleanupRef.current === cleanup) {
        guardCleanupRef.current = null;
      }
    };

    const onScroll = () => {
      if (navigatingRef.current && window.scrollY > 0) {
        forceScrollTop();
      }
    };

    window.addEventListener("wheel", cleanup, { passive: true, once: true });
    window.addEventListener("touchstart", cleanup, { passive: true, once: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const timers = [0, 20, 60, 120, 220].map((ms) =>
      window.setTimeout(() => {
        if (navigatingRef.current) forceScrollTop();
      }, ms)
    );
    const doneTimer = window.setTimeout(cleanup, 350);

    guardCleanupRef.current = cleanup;
    return cleanup;
  }, [forceScrollTop]);

  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      const previous = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      const onPop = () => {
        if (
          currentStepRef.current === 1 &&
          !window.location.pathname.startsWith("/onboarding") &&
          window.location.pathname !== returnTargetRef.current
        ) {
          router.replace(returnTargetRef.current);
          return;
        }
        const nextRaw = Number(new URLSearchParams(window.location.search).get("step") || "1");
        const nextStep = Number.isFinite(nextRaw) ? Math.floor(nextRaw) : 1;
        transitionDirRef.current = nextStep < currentStepRef.current ? "back" : "forward";
        lockTopAcrossTransition();
      };
      window.addEventListener("popstate", onPop);
      return () => {
        window.removeEventListener("popstate", onPop);
        window.history.scrollRestoration = previous;
      };
    }
  }, [lockTopAcrossTransition, router]);

  useLayoutEffect(() => {
    return lockTopAcrossTransition();
  }, [currentStep, lockTopAcrossTransition]);

  const goToStep = useCallback(
    (nextStep: number) => {
      const clamped = Math.max(1, Math.min(4, nextStep));
      if (clamped === currentStep) return;
      transitionDirRef.current = clamped > currentStep ? "forward" : "back";
      setError(null);
      setProviderError(null);
      forceScrollTop();
      const target = clamped === 1 ? "/onboarding" : `/onboarding?step=${clamped}`;
      router.push(target, { scroll: true });
    },
    [currentStep, forceScrollTop, router]
  );

  const goBackOneStep = useCallback(() => {
    transitionDirRef.current = "back";
    setError(null);
    setProviderError(null);
    if (currentStep > 1) {
      lockTopAcrossTransition();
      router.back();
      return;
    }
    router.push(returnTarget);
  }, [currentStep, lockTopAcrossTransition, returnTarget, router]);

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

  const handleQuickFill = () => {
    setAccountName("My AWS Production");
    setAccountId("123456789012");
    setRoleArn("arn:aws:iam::123456789012:role/GreenCloudReadOnlyRole");
    setExternalId("");
    setError(null);
  };

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

    if (!new RegExp("^arn:aws:iam::" + accountId.trim() + ":role/[A-Za-z0-9+=,.@_/-]+$").test(roleArn.trim())) {
      setError("Enter an IAM role ARN for the AWS account ID above.");
      return;
    }

    setConnecting(true);

    try {
      setConnectionStage("Saving AWS connection settings...");

      const res = await fetch("/api/cloud-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "aws",
          externalAccountId: accountId.trim(),
          name: accountName.trim(),
          primaryRegion: selectedRegion === "all" ? "us-east-1" : selectedRegion,
          roleArn: roleArn.trim(),
          externalId: externalId.trim() || undefined,
          accessKeyId: accessKeyId.trim() || undefined,
          secretAccessKey: secretAccessKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error?.message ?? "Unable to save the connection.");

      setHasAccount(true);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("gc_selected_role", selectedRole);
      }
      await fetch("/api/workspace/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeRole: selectedRole }),
      }).catch(() => {});
      setConnectionStage("Connection saved. Run a sync to validate AWS access.");
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

  const activeRoleObj =
    COMPANY_ROLES.find((r) => r.id === selectedRole) ?? COMPANY_ROLES[0];

  const stepAnimClass =
    transitionDirRef.current === "back"
      ? "gc-step-back"
      : transitionDirRef.current === "forward"
      ? "gc-step-forward"
      : "gc-hero-enter";

  const welcomeCards = [
    {
      num: "01",
      subtitle: "Role & Access",
      title: "Choose your role",
      desc: "Pick full admin control, a specialist view, or read-only summary access.",
      icon: "admin_panel_settings",
    },
    {
      num: "02",
      subtitle: "Cloud Provider",
      title: "Select cloud platform",
      desc: "Choose Amazon Web Services (AWS) as your primary telemetry source.",
      icon: "cloud",
    },
    {
      num: "03",
      subtitle: "STS AssumeRole",
      title: "Connect AWS IAM",
      desc: "Provide your read-only IAM Role ARN and External ID for secure access.",
      icon: "key",
    },
    {
      num: "04",
      subtitle: "Cost & Carbon",
      title: "Inspect telemetry",
      desc: "Review EC2 and EBS inventory, CloudWatch peaks, and carbon footprint.",
      icon: "insights",
    },
  ];

  return (
    <div className="flex-1 bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow pt-4 pb-12">
        {/* Subtle inline connected status (containerless) */}
        {existingAccounts.length > 0 && currentStep === 1 && (
          <div className="max-w-3xl mx-auto mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[13px] text-[#686450]">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#155E4B]" />
              <span>
                Connected:{" "}
                <strong className="font-semibold text-[#2E2B1A]">
                  {existingAccounts[0].name}
                </strong>{" "}
                <span className="code-font text-[12px] text-[#8D8975]">
                  {existingAccounts[0].externalAccountId}
                </span>
                {existingAccounts.length > 1
                  ? ` · ${existingAccounts.length} accounts`
                  : ""}
              </span>
            </span>
            <Link
              href="/dashboard"
              prefetch={true}
              className="inline-flex items-center gap-1 font-semibold text-[#2E2B1A] underline underline-offset-4 hover:text-[#155E4B] transition-colors"
            >
              <span>Open dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Preserved 1-2-3-4 Stepper Bar (borderless warm tonal container) */}
        <div className="max-w-[640px] mx-auto mb-9 bg-[#FAF6E8] rounded-[26px] px-6 py-4 shadow-warm-sm">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => {
                    if (step.num < currentStep) goToStep(step.num);
                  }}
                  className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all ${
                    step.num < currentStep ? "cursor-pointer group" : "cursor-default"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center tabular-nums text-[13px] font-bold transition-all ${
                      currentStep === step.num
                        ? "bg-[#FFF76A] text-[#2E2B1A] ring-4 ring-[#FFF76A]/45 scale-105 shadow-warm-sm"
                        : currentStep > step.num
                        ? "bg-[#155E4B] text-[#FFFDF4]"
                        : "bg-[#FFFDF4] text-[#8D8975]"
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
                        ? "text-[#155E4B] group-hover:underline"
                        : "text-[#8D8975]"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>

                {idx < steps.length - 1 && (
                  <div className="flex-1 h-[3px] mx-3 -mt-5 rounded-full bg-[#EAE0BE] overflow-hidden">
                    <div
                      className="h-full w-full rounded-full bg-[#155E4B] origin-left transition-transform duration-300 ease-out"
                      style={{
                        transform: currentStep > step.num ? "scaleX(1)" : "scaleX(0)",
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* STEP 1: WELCOME */}
        {currentStep === 1 && (
          <div key="step-1" className={`max-w-5xl mx-auto space-y-8 ${stepAnimClass}`}>
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h1 className="text-[32px] sm:text-[42px] font-extrabold tracking-[-0.03em] text-[#2E2B1A] leading-[1.12]">
                Let&apos;s set up your GreenCloud workspace
              </h1>
              <p className="text-[16px] text-[#686450] leading-relaxed">
                A quick guided setup to choose your role permissions, select your cloud provider, and connect read-only AWS telemetry.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {welcomeCards.map((card) => (
                <div
                  key={card.num}
                  className="gc-card-hover rounded-[24px] bg-[#FAF6E8] p-5 sm:p-6 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="material-symbols-outlined icon-filled text-[22px] text-[#686450]">
                        {card.icon}
                      </span>
                      <span className="text-[12px] font-bold text-[#8D8975] tabular-nums">
                        {card.num}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[12px] font-semibold text-[#8D8975]">
                        {card.subtitle}
                      </div>
                      <h2 className="text-[17px] font-bold text-[#2E2B1A]">{card.title}</h2>
                    </div>

                    <p className="text-[13px] text-[#686450] leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={goBackOneStep}
                className="m3-btn m3-btn-compact m3-pastel-oat"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>
                  {returnTarget === "/dashboard" ? "Back to dashboard" : "Back to overview"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="m3-btn m3-pastel-sun"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ROLE SELECTION */}
        {currentStep === 2 && (
          <div key="step-2" className={`max-w-5xl mx-auto space-y-6 ${stepAnimClass}`}>
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-[28px] sm:text-[34px] font-extrabold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
                Choose your workspace role
              </h2>
              <p className="text-[15px] text-[#686450]">
                From full account and role management down to basic read-only summaries.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left 6 Compact Selectable Role Options */}
              <div className="lg:col-span-7 rounded-[28px] bg-[#FAF6E8] p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                {COMPANY_ROLES.map((role) => {
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role.id);
                        if (typeof window !== "undefined") {
                          window.sessionStorage.setItem("gc_selected_role", role.id);
                        }
                        fetch("/api/workspace/config", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ activeRole: role.id }),
                        }).catch(() => {});
                      }}
                      aria-pressed={isSelected}
                      className={`group cursor-pointer rounded-[20px] p-4 text-left transition-all duration-200 active:scale-[0.985] flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-[#FFF3A8] shadow-warm-sm"
                          : "bg-[#FFFDF4] hover:bg-[#FFF9E2]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`material-symbols-outlined icon-filled text-[20px] shrink-0 ${
                              isSelected ? "text-[#2E2B1A]" : "text-[#686450]"
                            }`}
                          >
                            {role.icon}
                          </span>
                          <h3 className="text-[14.5px] font-bold text-[#2E2B1A] leading-tight truncate">
                            {role.title}
                          </h3>
                        </div>

                        {/* Clear interactive radio selection indicator */}
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? "bg-[#155E4B] text-[#FFFDF4]"
                              : "bg-[#FAF6E8] ring-2 ring-[#C9BFA0] group-hover:ring-[#9E9374]"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                      </div>

                      <div
                        className={`text-[11.5px] font-semibold ${
                          isSelected ? "text-[#5C4B05]" : "text-[#8D8975]"
                        }`}
                      >
                        {role.accessLabel}
                      </div>

                      <p
                        className={`text-[12.5px] leading-snug ${
                          isSelected ? "text-[#3D3616]" : "text-[#686450]"
                        }`}
                      >
                        {role.shortDesc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Right Selected Role Preview */}
              <div className="lg:col-span-5 rounded-[28px] bg-[#FAF6E8] p-6">
                <div
                  key={activeRoleObj.id}
                  className="gc-panel-swap flex flex-col justify-between gap-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#686450]">
                        {activeRoleObj.accessLabel}
                      </span>
                      <span className="text-[11.5px] font-bold text-[#155E4B]">
                        Selected
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined icon-filled text-[26px] text-[#2E2B1A]">
                          {activeRoleObj.icon}
                        </span>
                        <div>
                          <h3 className="text-[18px] font-bold text-[#2E2B1A]">
                            {activeRoleObj.title}
                          </h3>
                          <div className="text-[12.5px] text-[#686450]">{activeRoleObj.persona}</div>
                        </div>
                      </div>
                      <p className="text-[13px] text-[#686450] leading-relaxed">
                        {activeRoleObj.desc}
                      </p>
                    </div>

                    <div className="rounded-[20px] bg-[#FFFDF4] p-4 space-y-2.5">
                      <div className="text-[12px] font-bold text-[#2E2B1A]">
                        What this role can do
                      </div>
                      {activeRoleObj.capabilities.map((cap) => (
                        <div key={cap} className="flex items-start gap-2 text-[12.5px] text-[#2E2B1A]">
                          <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.5} />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[12px] font-bold text-[#686450]">
                      Workspace views shown
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeRoleObj.metrics.map((m) => (
                        <span
                          key={m}
                          className="px-3 py-1 rounded-full bg-[#FFFDF4] text-[12px] font-semibold text-[#2E2B1A]"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={goBackOneStep}
                className="m3-btn m3-btn-compact m3-pastel-oat"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="m3-btn m3-pastel-sun"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CLOUD PROVIDER SELECTION */}
        {currentStep === 3 && (
          <div key="step-3" className={`max-w-4xl mx-auto space-y-6 ${stepAnimClass}`}>
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-[28px] sm:text-[34px] font-extrabold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
                Select your cloud provider
              </h2>
              <p className="text-[15px] text-[#686450]">
                Choose your cloud platform. Amazon Web Services is ready for live read-only scanning.
              </p>
            </div>

            {providerError && (
              <div className="gc-panel-swap p-3.5 rounded-[18px] bg-[#FBE7CB] text-[#6B4814] text-[13px] font-medium text-center">
                {providerError}
              </div>
            )}

            <div className="rounded-[30px] bg-[#FAF6E8] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* AWS Option Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider("aws");
                  setProviderError(null);
                }}
                aria-pressed={selectedProvider === "aws"}
                className={`group cursor-pointer rounded-[22px] p-5 sm:p-6 text-left transition-all duration-200 active:scale-[0.99] flex flex-col justify-between gap-5 ${
                  selectedProvider === "aws"
                    ? "bg-[#FFF3A8] shadow-warm-sm"
                    : "bg-[#FFFDF4] hover:bg-[#FFF9E2]"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <img
                      src="/icons/aws-dark.svg"
                      alt="AWS"
                      className="h-7 w-auto object-contain"
                    />
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        selectedProvider === "aws"
                          ? "bg-[#155E4B] text-[#FFFDF4]"
                          : "bg-[#FAF6E8] ring-2 ring-[#C9BFA0]"
                      }`}
                    >
                      {selectedProvider === "aws" && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-[17px] font-bold text-[#2E2B1A]">
                      Amazon Web Services
                    </h3>
                    <p className="text-[13px] text-[#3D3616] leading-relaxed mt-1">
                      EC2, RDS, EBS, Elastic IPs, CloudWatch utilization, and Cost Explorer / CUR 2.0.
                    </p>
                  </div>
                </div>

                <div className="text-[12px] font-semibold text-[#155E4B]">
                  Ready to connect
                </div>
              </button>

              {/* Google Cloud Option Card */}
              <button
                type="button"
                onClick={() =>
                  setProviderError(
                    "Google Cloud live connector is in roadmap. Select Amazon Web Services to continue setup."
                  )
                }
                className="cursor-pointer rounded-[22px] bg-[#FFFDF4] hover:bg-[#FAF8EE] p-5 sm:p-6 text-left flex flex-col justify-between gap-5 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <img
                      src="/icons/gcp.svg"
                      alt="Google Cloud"
                      className="h-7 w-auto object-contain"
                    />
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#8D8975]">
                      <Lock className="w-3 h-3" />
                      Roadmap
                    </span>
                  </div>

                  <div>
                    <h3 className="text-[17px] font-bold text-[#2E2B1A]">
                      Google Cloud Platform
                    </h3>
                    <p className="text-[13px] text-[#686450] leading-relaxed mt-1">
                      Compute Engine, Cloud Monitoring, and BigQuery billing export connector.
                    </p>
                  </div>
                </div>

                <Link
                  href="/docs?provider=gcp#providers"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[12px] font-semibold text-[#686450] hover:text-[#2E2B1A] hover:underline"
                >
                  View GCP setup guide
                </Link>
              </button>

              {/* Azure Option Card */}
              <button
                type="button"
                onClick={() =>
                  setProviderError(
                    "Microsoft Azure live connector is in roadmap. Select Amazon Web Services to continue setup."
                  )
                }
                className="cursor-pointer rounded-[22px] bg-[#FFFDF4] hover:bg-[#FAF8EE] p-5 sm:p-6 text-left flex flex-col justify-between gap-5 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <img
                      src="/icons/azure.svg"
                      alt="Microsoft Azure"
                      className="h-7 w-auto object-contain"
                    />
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#8D8975]">
                      <Lock className="w-3 h-3" />
                      Roadmap
                    </span>
                  </div>

                  <div>
                    <h3 className="text-[17px] font-bold text-[#2E2B1A]">
                      Microsoft Azure
                    </h3>
                    <p className="text-[13px] text-[#686450] leading-relaxed mt-1">
                      Azure Virtual Machines, Monitor metrics, and daily FOCUS Cost Management export.
                    </p>
                  </div>
                </div>

                <Link
                  href="/docs?provider=azure#providers"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[12px] font-semibold text-[#686450] hover:text-[#2E2B1A] hover:underline"
                >
                  View Azure setup guide
                </Link>
              </button>
            </div>

            {/* Region Selector */}
            <div className="rounded-[24px] bg-[#FAF6E8] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[14px] font-bold text-[#2E2B1A]">Primary AWS Region</div>
                <div className="text-[12.5px] text-[#686450]">
                  Initial region for STS handshake, or scan across all enabled AWS regions.
                </div>
              </div>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                aria-label="Primary AWS Region"
                className="rounded-xl bg-[#FFFDF4] px-4 py-2.5 text-[13.5px] font-semibold text-[#2E2B1A] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/35 cursor-pointer"
              >
                <option value="all">All AWS Regions (Auto-discover enabled)</option>
                <optgroup label="North America">
                  <option value="us-east-1">us-east-1 (N. Virginia)</option>
                  <option value="us-east-2">us-east-2 (Ohio)</option>
                  <option value="us-west-1">us-west-1 (N. California)</option>
                  <option value="us-west-2">us-west-2 (Oregon)</option>
                  <option value="ca-central-1">ca-central-1 (Canada Central)</option>
                  <option value="ca-west-1">ca-west-1 (Calgary)</option>
                  <option value="mx-central-1">mx-central-1 (Mexico)</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="eu-west-1">eu-west-1 (Ireland)</option>
                  <option value="eu-west-2">eu-west-2 (London)</option>
                  <option value="eu-west-3">eu-west-3 (Paris)</option>
                  <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                  <option value="eu-central-2">eu-central-2 (Zurich)</option>
                  <option value="eu-north-1">eu-north-1 (Stockholm)</option>
                  <option value="eu-south-1">eu-south-1 (Milan)</option>
                  <option value="eu-south-2">eu-south-2 (Spain)</option>
                </optgroup>
                <optgroup label="Asia Pacific">
                  <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                  <option value="ap-south-2">ap-south-2 (Hyderabad)</option>
                  <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                  <option value="ap-southeast-2">ap-southeast-2 (Sydney)</option>
                  <option value="ap-southeast-3">ap-southeast-3 (Jakarta)</option>
                  <option value="ap-southeast-4">ap-southeast-4 (Melbourne)</option>
                  <option value="ap-southeast-5">ap-southeast-5 (Malaysia)</option>
                  <option value="ap-southeast-7">ap-southeast-7 (Thailand)</option>
                  <option value="ap-northeast-1">ap-northeast-1 (Tokyo)</option>
                  <option value="ap-northeast-2">ap-northeast-2 (Seoul)</option>
                  <option value="ap-northeast-3">ap-northeast-3 (Osaka)</option>
                  <option value="ap-east-1">ap-east-1 (Hong Kong)</option>
                </optgroup>
                <optgroup label="South America, Middle East & Africa">
                  <option value="sa-east-1">sa-east-1 (Sao Paulo)</option>
                  <option value="me-south-1">me-south-1 (Bahrain)</option>
                  <option value="me-central-1">me-central-1 (UAE)</option>
                  <option value="il-central-1">il-central-1 (Tel Aviv)</option>
                  <option value="af-south-1">af-south-1 (Cape Town)</option>
                </optgroup>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={goBackOneStep}
                className="m3-btn m3-btn-compact m3-pastel-oat"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => goToStep(4)}
                className="m3-btn m3-pastel-sun"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CONNECT AWS */}
        {currentStep === 4 && (
          <div key="step-4" className={`max-w-5xl mx-auto space-y-6 ${stepAnimClass}`}>
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-[28px] sm:text-[34px] font-extrabold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
                Connect your AWS account
              </h2>
              <p className="text-[15px] text-[#686450]">
                Provide your read-only IAM Role ARN and External ID to begin syncing inventory and billing.
              </p>
            </div>

            {error && (
              <div className="gc-panel-swap p-4 rounded-[20px] bg-[#FEE2E2] text-[#991B1B] text-[13.5px] font-medium text-center">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Form Card */}
              <form
                onSubmit={handleFinalSubmit}
                className="lg:col-span-7 rounded-[28px] bg-[#FAF6E8] p-6 sm:p-7 shadow-warm-sm flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src="/icons/aws-dark.svg"
                        alt="AWS"
                        className="h-7 w-auto object-contain shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold text-[#2E2B1A]">
                          IAM Role Credentials
                        </div>
                        <div className="text-[12px] text-[#686450]">
                          Read-only STS AssumeRole ·{" "}
                          {selectedRegion === "all" ? "All regions" : selectedRegion}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleQuickFill}
                      className="m3-btn m3-btn-compact m3-pastel-oat text-[12px] shrink-0"
                    >
                      Use sample values
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[12px] font-bold text-[#2E2B1A] mb-1.5">
                        Connection Name
                      </label>
                      <input
                        type="text"
                        required
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="e.g. My AWS Production"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF4] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/35 text-[13px] text-[#2E2B1A] placeholder:text-[#8D8975]"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#2E2B1A] mb-1.5">
                        AWS Account ID (12 digits)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={12}
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456789012"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF4] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/35 text-[13px] text-[#2E2B1A] code-font placeholder:text-[#8D8975]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[#2E2B1A] mb-1.5">
                      IAM Role ARN
                    </label>
                    <input
                      type="text"
                      required
                      value={roleArn}
                      onChange={(e) => setRoleArn(e.target.value)}
                      placeholder="arn:aws:iam::<account-id>:role/GreenCloudReadOnlyRole"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF4] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/35 text-[13px] text-[#2E2B1A] code-font placeholder:text-[#8D8975]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[#2E2B1A] mb-1.5">
                      External ID
                    </label>
                    <input
                      type="text"
                      value={externalId}
                      onChange={(e) => setExternalId(e.target.value)}
                      placeholder="e.g. greencloud-prod-external-id"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF4] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/35 text-[13px] text-[#2E2B1A] code-font placeholder:text-[#8D8975]"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEncryptedCreds((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#686450] hover:text-[#2E2B1A] transition-colors cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          showEncryptedCreds ? "rotate-180" : ""
                        }`}
                      />
                      <span>
                        {showEncryptedCreds
                          ? "Hide static AWS access keys"
                          : "Optional: Add static AWS access keys (local dev)"}
                      </span>
                    </button>

                    {showEncryptedCreds && (
                      <div className="gc-panel-swap mt-3 space-y-3 rounded-[18px] bg-[#FFFDF4] p-4">
                        <p className="text-[11.5px] text-[#686450]">
                          Stored encrypted with AES-256-GCM. Only needed if your runtime calls STS without an attached IAM user or profile.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11.5px] font-bold text-[#2E2B1A] mb-1">
                              AWS Access Key ID
                            </label>
                            <input
                              type="text"
                              value={accessKeyId}
                              onChange={(e) => setAccessKeyId(e.target.value)}
                              placeholder="AKIA..."
                              className="w-full px-3 py-2 rounded-lg bg-[#FAF6E8] text-[12px] code-font text-[#2E2B1A] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/35"
                            />
                          </div>
                          <div>
                            <label className="block text-[11.5px] font-bold text-[#2E2B1A] mb-1">
                              AWS Secret Access Key
                            </label>
                            <input
                              type="password"
                              value={secretAccessKey}
                              onChange={(e) => setSecretAccessKey(e.target.value)}
                              placeholder="Enter secret key"
                              className="w-full px-3 py-2 rounded-lg bg-[#FAF6E8] text-[12px] code-font text-[#2E2B1A] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/35"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={goBackOneStep}
                    disabled={connecting}
                    className="m3-btn m3-btn-compact m3-pastel-oat"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={connecting}
                    className="m3-btn m3-pastel-sun"
                  >
                    <span>
                      {connecting
                        ? connectionStage || "Connecting..."
                        : "Connect AWS account"}
                    </span>
                    {!connecting && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </form>

              {/* Right: Setup Reference */}
              <div className="lg:col-span-5 rounded-[28px] bg-[#FAF6E8] p-6 sm:p-7 flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined icon-filled text-[22px] text-[#155E4B]">
                      verified_user
                    </span>
                    <div>
                      <div className="text-[12px] font-semibold text-[#686450]">
                        Least-privilege posture
                      </div>
                      <h3 className="text-[17px] font-bold text-[#2E2B1A]">
                        Read-only AWS verification
                      </h3>
                    </div>
                  </div>

                  <ul className="rounded-[20px] bg-[#FFFDF4] p-4 space-y-2.5 text-[13px] text-[#2E2B1A]">
                    {[
                      "Zero write, stop, or terminate permissions",
                      "ExternalId guards against confused-deputy access",
                      "Reads Cost Explorer, CloudWatch & EC2/EBS/RDS metadata",
                      "All Terraform changes stay human-reviewed in Git",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[20px] bg-[#FFFDF4] p-4 space-y-2.5">
                  <div className="text-[13px] font-bold text-[#2E2B1A]">
                    Need the IAM policy or CloudFormation command?
                  </div>
                  <p className="text-[12.5px] text-[#686450] leading-relaxed">
                    Copy the JSON policy and CloudWatch Agent steps directly from the AWS setup guide.
                  </p>
                  <Link
                    href="/docs?provider=aws#providers"
                    prefetch={true}
                    className="m3-btn m3-btn-compact m3-pastel-oat w-full"
                  >
                    <span>Open AWS setup docs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <ComplianceFooter />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-[#FFFDF4] text-[#2E2B1A] flex items-center justify-center py-24 text-[14px] font-semibold text-[#686450]">
          Loading setup...
        </div>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
}
