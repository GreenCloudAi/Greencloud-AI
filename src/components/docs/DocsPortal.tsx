"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Copy } from "lucide-react";
import { HeroShapeMorph } from "@/components/overview/MotionPrimitives";
import {
  API_ENDPOINTS,
  DOC_NAV_SECTIONS,
  PROVIDER_GUIDES,
  QUICKSTART_STEPS,
  SECURITY_CONTROLS,
  TERRAFORM_EXAMPLE_BLOCK,
  TROUBLESHOOTING_ITEMS,
  type CodeBlockSpec,
  type ProviderDocId,
} from "@/components/docs/DocsData";

function DocsCodeBlock({ block }: { block: CodeBlockSpec }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-2xl bg-[#2E2B1A] text-[#FAF6E8] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#242113] text-[12px]">
        <span className="code-font text-[#EAE0BE] truncate">{block.filename}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-[#FFF76A] hover:text-[#FFFDF4] font-semibold transition-colors shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 code-font text-[12.5px] leading-relaxed overflow-x-auto m-0">
        <code>{block.code}</code>
      </pre>
    </div>
  );
}

export function DocsPortal() {
  const searchParams = useSearchParams();
  const [selectedProvider, setSelectedProvider] = useState<ProviderDocId>("aws");
  const [activeNav, setActiveNav] = useState<string>("quickstart");

  useEffect(() => {
    const param = searchParams.get("provider");
    if (param === "aws" || param === "gcp" || param === "azure") {
      setSelectedProvider(param);
      setActiveNav("providers");
    }
  }, [searchParams]);

  const providerGuide = PROVIDER_GUIDES[selectedProvider];

  const handleJump = (sectionId: string) => {
    setActiveNav(sectionId);
    const el = document.getElementById(sectionId);
    if (!el) return;
    const headerHeight = document.querySelector("header")?.offsetHeight ?? 84;
    const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - (headerHeight + 16));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Sticky Documentation Navigation */}
      <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-4">
        <div className="rounded-[24px] bg-[#FAF6E8] p-4 space-y-1.5 shadow-warm-sm">
          <div className="px-3 py-1.5 text-[12px] font-bold text-[#686450]">
            Documentation
          </div>
          <nav aria-label="Documentation sections" className="flex flex-col gap-1">
            {DOC_NAV_SECTIONS.map((sec) => {
              const isSelected = activeNav === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleJump(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[16px] text-[13.5px] font-semibold text-left transition-colors ${
                    isSelected
                      ? "bg-[#155E4B] text-[#FFFDF4]"
                      : "text-[#2E2B1A] hover:bg-[#FFFDF4]"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined icon-filled text-[18px] leading-none ${
                      isSelected ? "text-[#FFFDF4]" : "text-[#686450]"
                    }`}
                  >
                    {sec.icon}
                  </span>
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="rounded-[24px] bg-[#FBF6E3] p-5 space-y-3">
          <div className="text-[14px] font-bold text-[#2E2B1A]">
            Ready to connect?
          </div>
          <p className="text-[12.5px] text-[#686450] leading-relaxed">
            Launch the guided onboarding wizard to verify your read-only IAM Role ARN and External ID.
          </p>
          <Link
            href="/onboarding"
            prefetch={true}
            className="m3-btn m3-btn-compact m3-pastel-sun w-full"
          >
            <span>Open setup wizard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* Main Documentation Content */}
      <div className="lg:col-span-9 space-y-12 sm:space-y-14 min-w-0">
        {/* 1. Quickstart */}
        <section id="quickstart" className="scroll-mt-28 space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-[#2E2B1A]">
              Quickstart overview
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              Connect cloud accounts with strictly read-only credentials, collect billing and guest memory metrics, tag workloads, and verify post-change outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {QUICKSTART_STEPS.map((step) => (
              <div
                key={step.num}
                className="gc-rv gc-rv-pop gc-card-hover group rounded-[24px] bg-[#FAF6E8] p-5 flex items-start gap-4"
              >
                <div className="relative w-11 h-11 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                  <div className={`absolute inset-0 ${step.shapeColor}`}>
                    <HeroShapeMorph shape={step.shape} />
                  </div>
                  <span className={`relative z-10 text-[14px] font-extrabold tabular-nums ${step.numInk}`}>
                    {step.num}
                  </span>
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-[16px] font-bold text-[#2E2B1A]">{step.title}</h3>
                  <p className="text-[13px] text-[#686450] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Multi-Cloud Provider Setup */}
        <section
          id="providers"
          className="scroll-mt-28 rounded-[32px] bg-[#FAF6E8] p-6 sm:p-8 shadow-warm-sm space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-[#2E2B1A]">
                Cloud provider optimization setup
              </h2>
              <p className="text-[14.5px] text-[#686450]">
                Complete 5-step setup for billing exports, read-only IAM, memory agents, and workload tags per provider.
              </p>
            </div>

            <div
              className="m3-connected-h"
              role="tablist"
              aria-label="Select cloud provider guide"
            >
              {(["aws", "gcp", "azure"] as ProviderDocId[]).map((pid) => {
                const guide = PROVIDER_GUIDES[pid];
                const selected = pid === selectedProvider;
                return (
                  <button
                    key={pid}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    data-selected={selected}
                    onClick={() => setSelectedProvider(pid)}
                    className={`m3-seg gap-2 ${selected ? "m3-pastel-sun" : "m3-pastel-oat"}`}
                  >
                    <img
                      src={guide.iconSrc}
                      alt=""
                      className="w-4 h-4 object-contain"
                    />
                    <span>{guide.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Provider Guide */}
          <div key={providerGuide.id} className="gc-hero-enter space-y-5">
            <div className="rounded-[24px] bg-[#FFFDF4] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF6E8] p-2 flex items-center justify-center shrink-0">
                    <img
                      src={providerGuide.iconSrc}
                      alt={providerGuide.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="text-[19px] font-bold text-[#2E2B1A]">
                    {providerGuide.name}
                  </h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[12px] font-bold ${providerGuide.statusBg} ${providerGuide.statusInk}`}
                >
                  {providerGuide.statusLabel}
                </span>
              </div>

              <p className="text-[14px] text-[#686450] leading-relaxed">
                {providerGuide.summary}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-[16px] bg-[#FAF6E8] p-3.5">
                  <div className="text-[11.5px] font-semibold text-[#686450]">Authentication</div>
                  <div className="text-[13px] font-bold text-[#2E2B1A] mt-0.5">
                    {providerGuide.authMethod}
                  </div>
                </div>
                <div className="rounded-[16px] bg-[#FAF6E8] p-3.5">
                  <div className="text-[11.5px] font-semibold text-[#686450]">Billing export</div>
                  <div className="text-[13px] font-bold text-[#2E2B1A] mt-0.5">
                    {providerGuide.billingSource}
                  </div>
                </div>
                <div className="rounded-[16px] bg-[#FAF6E8] p-3.5">
                  <div className="text-[11.5px] font-semibold text-[#686450]">Metrics telemetry</div>
                  <div className="text-[13px] font-bold text-[#2E2B1A] mt-0.5">
                    {providerGuide.metricsSource}
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] bg-[#FBF6E3] p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {providerGuide.optimizationChecklist.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[12.5px] font-medium text-[#2E2B1A]">
                    <Check className="w-4 h-4 text-[#155E4B] shrink-0" strokeWidth={2.5} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {providerGuide.steps.map((step) => (
                <div key={step.num} className="rounded-[24px] bg-[#FFFDF4] p-5 sm:p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#155E4B] text-[#FFFDF4] text-[13px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step.num}
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-[16.5px] font-bold text-[#2E2B1A]">{step.title}</h4>
                      <p className="text-[13.5px] text-[#686450] leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                  {step.codeBlock && <DocsCodeBlock block={step.codeBlock} />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Terraform & Change Review Workflow */}
        <section id="terraform" className="scroll-mt-28 space-y-5">
          <div className="gc-rv space-y-1.5">
            <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-[#2E2B1A]">
              Terraform review and execution workflow
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              GreenCloud separates discovery from mutation. Approved recommendations export clean HCL blocks so teams review, plan, and merge through standard Git CI/CD pipelines.
            </p>
          </div>

          <div className="gc-rv gc-rv-pop rounded-[28px] bg-[#FAF6E8] p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "1. Evidence gate",
                  value: "Checks 14d peaks, RAM & owner policy before suggesting changes.",
                },
                {
                  label: "2. Human review",
                  value: "Approving an item exports a Terraform diff without mutating cloud resources.",
                },
                {
                  label: "3. Post-change check",
                  value: "Compares settled billing and app latency after you apply.",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-[18px] bg-[#FFFDF4] p-4 space-y-1">
                  <div className="text-[13px] font-bold text-[#2E2B1A]">{item.label}</div>
                  <p className="text-[12.5px] text-[#686450] leading-relaxed">{item.value}</p>
                </div>
              ))}
            </div>

            <DocsCodeBlock block={TERRAFORM_EXAMPLE_BLOCK} />
          </div>
        </section>

        {/* 4. Cost & Carbon Methodology */}
        <section id="methodology" className="scroll-mt-28 space-y-5">
          <div className="gc-rv space-y-1.5">
            <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-[#2E2B1A]">
              Cost, carbon, and verification methodology
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              Every metric distinguishes observed provider billing from modeled estimates and verified post-change outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="gc-rv gc-rv-pop rounded-[24px] bg-[#FBF6E3] p-6 space-y-2.5">
              <h3 className="text-[17px] font-bold text-[#2E2B1A]">
                Billing grain &amp; overlap control
              </h3>
              <p className="text-[13.5px] text-[#686450] leading-relaxed">
                Resource-level billing lines keep unallocated account fees separate, match exact region and term pricing, and prevent double-counting overlapping recommendations on the same resource.
              </p>
            </div>
            <div className="gc-rv gc-rv-pop rounded-[24px] bg-[#E2F5EF] p-6 space-y-2.5">
              <h3 className="text-[17px] font-bold text-[#155E4B]">
                Regional energy &amp; carbon intensity
              </h3>
              <p className="text-[13.5px] text-[#155E4B]/90 leading-relaxed">
                Operational power draw is paired with regional grid intensity factors (gCO₂e/kWh) and kept clearly separate from monthly provider carbon exports.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Security & Least Privilege */}
        <section id="security" className="scroll-mt-28 space-y-5">
          <div className="gc-rv space-y-1.5">
            <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-[#2E2B1A]">
              Security &amp; least-privilege architecture
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              Built around read-only cloud roles, External ID verification, and complete auditability.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SECURITY_CONTROLS.map((ctrl) => (
              <div
                key={ctrl.title}
                className="gc-rv gc-rv-pop gc-card-hover group rounded-[24px] bg-[#FAF6E8] p-5 flex items-start gap-3.5"
              >
                <div className="relative w-10 h-10 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                  <div className={`absolute inset-0 ${ctrl.shapeColor}`}>
                    <HeroShapeMorph shape={ctrl.shape} />
                  </div>
                  <span className={`material-symbols-outlined icon-filled relative z-10 text-[18px] ${ctrl.iconInk}`}>
                    {ctrl.icon}
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-[15.5px] font-bold text-[#2E2B1A]">{ctrl.title}</h3>
                  <p className="text-[13px] text-[#686450] leading-relaxed">{ctrl.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. API Reference & Troubleshooting */}
        <section id="troubleshooting" className="scroll-mt-28 space-y-6">
          <div className="gc-rv space-y-1.5">
            <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-[#2E2B1A]">
              Platform APIs &amp; troubleshooting
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              Core REST endpoints powering account onboarding, telemetry sync, approvals, and audit logging.
            </p>
          </div>

          <div className="gc-rv gc-rv-pop rounded-[26px] bg-[#FAF6E8] p-5 sm:p-6 space-y-3">
            {API_ENDPOINTS.map((ep) => (
              <div
                key={ep.path}
                className="rounded-[18px] bg-[#FFFDF4] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[#155E4B] code-font text-[11px] font-bold shrink-0">
                    {ep.method}
                  </span>
                  <span className="code-font text-[13px] font-bold text-[#2E2B1A] truncate">
                    {ep.path}
                  </span>
                </div>
                <span className="text-[12.5px] text-[#686450] sm:text-right">{ep.purpose}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TROUBLESHOOTING_ITEMS.map((item) => (
              <div key={item.symptom} className="gc-rv gc-rv-pop rounded-[22px] bg-[#FBF6E3] p-5 space-y-2">
                <h3 className="text-[15px] font-bold text-[#2E2B1A]">{item.symptom}</h3>
                <p className="text-[12.5px] text-[#686450] leading-relaxed">
                  <strong className="text-[#2E2B1A]">Cause:</strong> {item.cause}
                </p>
                <p className="text-[12.5px] text-[#155E4B] leading-relaxed rounded-[14px] bg-[#FFFDF4] px-3 py-2">
                  <strong>Fix:</strong> {item.resolution}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
