"use client";

import { useState } from "react";
import { AlertCircle, Check, ShieldAlert } from "lucide-react";
import { SAFETY_SCENARIOS } from "@/components/how-it-works/HowItWorksData";

function CheckIcon({ status }: { status: "pass" | "hold" | "alert" }) {
  if (status === "pass") {
    return <Check className="w-4 h-4 text-[#155E4B] shrink-0" strokeWidth={2.5} />;
  }
  if (status === "hold") {
    return <AlertCircle className="w-4 h-4 text-[#8C5A00] shrink-0" strokeWidth={2.25} />;
  }
  return <ShieldAlert className="w-4 h-4 text-[#991B1B] shrink-0" strokeWidth={2.25} />;
}

function statusPillClass(status: "pass" | "hold" | "alert") {
  if (status === "pass") return "bg-[#E2F5EF] text-[#155E4B]";
  if (status === "hold") return "bg-[#FBE7CB] text-[#6B4814]";
  return "bg-[#FEE2E2] text-[#991B1B]";
}

function statusPillText(status: "pass" | "hold" | "alert") {
  if (status === "pass") return "Passed";
  if (status === "hold") return "Held back";
  return "Flagged";
}

export function GateWalkthrough() {
  const [activeId, setActiveId] = useState<string>(SAFETY_SCENARIOS[0].id);
  const scenario = SAFETY_SCENARIOS.find((s) => s.id === activeId) ?? SAFETY_SCENARIOS[0];

  return (
    <div className="rounded-[32px] bg-[#FAF6E8] p-6 sm:p-8 lg:p-10 shadow-warm-sm space-y-6 sm:space-y-7">
      {/* Section Header & Connected Scenario Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
        <div className="space-y-1.5">
          <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
            How GreenCloud keeps workloads safe
          </h2>
          <p className="text-[15px] text-[#686450] max-w-2xl mx-auto lg:mx-0">
            Click through three everyday cloud situations to see when a change moves forward, when it gets held for safety, and how savings are checked afterwards.
          </p>
        </div>

        <div
          className="m3-connected-h justify-center lg:justify-end"
          role="group"
          aria-label="Choose example cloud scenario"
        >
          {SAFETY_SCENARIOS.map((item) => {
            const selected = item.id === scenario.id;
            return (
              <button
                key={item.id}
                type="button"
                data-selected={selected}
                aria-pressed={selected}
                onClick={() => setActiveId(item.id)}
                className={`m3-seg ${selected ? "m3-pastel-sun" : "m3-pastel-oat"}`}
              >
                {item.tabLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Summary Card */}
        <div className="lg:col-span-5 rounded-[26px] bg-[#FFFDF4] p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold text-[#686450]">
                {scenario.subtitle}
              </span>
              <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${scenario.badgeClass}`}>
                {scenario.badgeText}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-[#2E2B1A] leading-snug">
                {scenario.headline}
              </h3>
              <p className="text-[14px] text-[#686450] leading-relaxed">
                {scenario.explanation}
              </p>
            </div>
          </div>

          {/* Clear Before / Expected / Verified Breakdown */}
          <div className="rounded-[20px] bg-[#FBF6E3] p-4 space-y-2.5">
            <div className="text-[12px] font-semibold text-[#686450]">
              What appears in your dashboard
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[#686450]">Current spend</span>
                <span className="font-bold text-[#2E2B1A] text-right tabular-nums">
                  {scenario.beforeAfter.currentSpend}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[#686450]">Expected impact</span>
                <span className="font-bold text-[#524305] text-right tabular-nums">
                  {scenario.beforeAfter.expectedChange}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[#686450]">Verification state</span>
                <span className="font-bold text-[#155E4B] text-right">
                  {scenario.beforeAfter.verifiedStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Safety Checks + Practical Takeaway */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scenario.checks.map((check) => (
              <div
                key={check.label}
                className="rounded-[22px] bg-[#FFFDF4] p-5 flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckIcon status={check.status} />
                    <h4 className="text-[14.5px] font-bold text-[#2E2B1A] leading-snug">
                      {check.label}
                    </h4>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${statusPillClass(
                      check.status
                    )}`}
                  >
                    {statusPillText(check.status)}
                  </span>
                </div>
                <p className="text-[13px] text-[#686450] leading-relaxed">
                  {check.detail}
                </p>
              </div>
            ))}
          </div>

          {scenario.terraformPreview ? (
            <div className="rounded-[22px] bg-[#2E2B1A] text-[#FAF6E8] p-5 space-y-3 overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="font-semibold text-[#FFF76A]">What you review before applying</span>
                <span className="text-[#8CE9C8]">You control the merge</span>
              </div>
              <pre className="code-font text-[12.5px] leading-relaxed m-0 whitespace-pre">
                <code>{scenario.terraformPreview}</code>
              </pre>
            </div>
          ) : (
            <div className="rounded-[22px] bg-[#2E2B1A] text-[#FAF6E8] p-5 space-y-1.5">
              <div className="text-[12px] font-semibold text-[#FFF76A]">
                Why this protects your team
              </div>
              <p className="text-[13.5px] text-[#FAF6E8]/90 leading-relaxed">
                {scenario.takeaway}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
