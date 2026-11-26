"use client";

import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { ComplianceFooter } from "@/components/common/ComplianceFooter";
import { useAccountStatus } from "@/components/common/AccountStatusContext";
import {
  HeroShapeMorph,
  ScrollRevealObserver,
} from "@/components/overview/MotionPrimitives";
import { GateWalkthrough } from "@/components/how-it-works/GateWalkthrough";
import {
  ARCHITECTURE_FLOW,
  METRIC_CLARITY_CARDS,
  TRUST_GUARDS,
  USER_STEPS,
} from "@/components/how-it-works/HowItWorksData";

export default function HowItWorksPage() {
  const { hasAccount } = useAccountStatus();

  return (
    <div className="flex-1 bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      <ScrollRevealObserver />

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow space-y-14 sm:space-y-20 pt-3 sm:pt-6">
        {/* Intro Hero */}
        <section className="max-w-3xl mx-auto text-center space-y-5 pt-2 sm:pt-4">
          <div className="gc-hero-enter inline-flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF6E8] flex items-center justify-center p-2">
              <img src="/icons/aws-dark.svg" alt="AWS" className="w-full h-full object-contain" />
            </div>
            <span className="text-[13px] font-semibold text-[#686450]">
              Read-only AWS connection · Human-reviewed changes · Verified savings
            </span>
          </div>

          <h1 className="gc-hero-enter text-[32px] sm:text-[42px] lg:text-[46px] font-extrabold tracking-[-0.03em] text-[#2E2B1A] leading-[1.12]">
            How GreenCloud AI helps you cut cloud cost and carbon safely
          </h1>

          <p className="gc-hero-enter-delay-1 text-[16px] sm:text-[17.5px] text-[#686450] leading-relaxed max-w-2xl mx-auto">
            Connect AWS in minutes without giving write access. We inspect real usage peaks and billing lines, flag only safe changes with ready Terraform code, and verify your actual bill once you deploy.
          </p>

          <div className="gc-hero-enter-delay-2 flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <Link
              href={hasAccount ? "/dashboard" : "/onboarding"}
              prefetch={true}
              className="m3-btn m3-pastel-sun"
            >
              <span className="material-symbols-outlined icon-filled text-[18px] leading-none">
                {hasAccount ? "dashboard" : "link"}
              </span>
              <span>{hasAccount ? "Go to dashboard" : "Connect AWS account"}</span>
            </Link>
            <Link
              href={hasAccount ? "/onboarding" : "/dashboard"}
              prefetch={true}
              className="m3-btn m3-pastel-oat"
            >
              <span className="material-symbols-outlined text-[18px] leading-none">
                {hasAccount ? "link" : "play_circle"}
              </span>
              <span>{hasAccount ? "Connect AWS" : "Live demo"}</span>
            </Link>
          </div>
        </section>

        {/* Section 1: Four Step User Journey */}
        <section className="space-y-6 sm:space-y-7">
          <div className="gc-rv flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
            <div className="space-y-1.5">
              <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
                Four clear steps from setup to verified savings
              </h2>
              <p className="text-[15px] text-[#686450] max-w-2xl mx-auto lg:mx-0">
                Built so engineering and FinOps teams stay fully in control of production infrastructure from day one.
              </p>
            </div>
            <Link
              href="/why"
              prefetch={true}
              className="m3-btn m3-btn-compact m3-pastel-oat shrink-0 group"
            >
              <span>Why cost &amp; carbon?</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {USER_STEPS.map((step) => (
              <div
                key={step.num}
                className="gc-rv gc-rv-pop gc-card-hover group rounded-[28px] bg-[#FAF6E8] p-6 sm:p-7 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-12 h-12 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                      <div className={`absolute inset-0 ${step.shapeColor}`}>
                        <HeroShapeMorph shape={step.shape} />
                      </div>
                      <span className={`relative z-10 text-[15px] font-extrabold tabular-nums ${step.numInk}`}>
                        {step.num}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#686450]">
                        {step.timing}
                      </div>
                      <h3 className="text-[18.5px] font-bold text-[#2E2B1A] leading-snug">
                        {step.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-[14px] text-[#686450] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <ul className={`rounded-[20px] ${step.trayBg} p-4 space-y-2`}>
                  {step.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-[13px] font-medium text-[#2E2B1A]">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${step.numInk}`} strokeWidth={2.5} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Interactive Walkthrough (Pass vs Protected vs Post-Change Check) */}
        <section>
          <GateWalkthrough />
        </section>

        {/* Section 3: How Data Moves Safely */}
        <section className="space-y-6 sm:space-y-7">
          <div className="gc-rv flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
            <div className="space-y-1.5">
              <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
                How your AWS data moves without write risk
              </h2>
              <p className="text-[15px] text-[#686450] max-w-2xl mx-auto lg:mx-0">
                Everything runs read-only from billing and CloudWatch discovery to your Git pull request workflow.
              </p>
            </div>
            <Link
              href="/audit-history"
              prefetch={true}
              className="m3-btn m3-btn-compact m3-pastel-oat shrink-0 group"
            >
              <span>Inspect audit log</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {ARCHITECTURE_FLOW.map((col) => (
              <div
                key={col.num}
                className="gc-rv gc-rv-pop gc-card-hover group rounded-[26px] bg-[#FBF6E3] p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-11 h-11 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                      <div className={`absolute inset-0 ${col.shapeColor}`}>
                        <HeroShapeMorph shape={col.shape} />
                      </div>
                      <span className={`relative z-10 text-[14px] font-extrabold tabular-nums ${col.numInk}`}>
                        {col.num}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#686450]">
                        {col.subtitle}
                      </div>
                      <h3 className="text-[18px] font-bold text-[#2E2B1A] leading-snug">
                        {col.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-[13.5px] text-[#686450] leading-relaxed">
                    {col.desc}
                  </p>
                </div>

                <ul className={`rounded-[18px] ${col.trayBg} p-4 space-y-2`}>
                  {col.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-[12.5px] font-medium text-[#2E2B1A]">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${col.numInk}`} strokeWidth={2.5} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Clear Numbers & Trust Guarantees */}
        <section className="gc-rv rounded-[32px] bg-[#FAF6E8] p-6 sm:p-8 lg:p-10 shadow-warm-sm space-y-8">
          <div className="gc-rv space-y-1.5 text-center lg:text-left">
            <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
              Honest numbers from first scan to final bill
            </h2>
            <p className="text-[15px] text-[#686450] max-w-2xl mx-auto lg:mx-0">
              We always keep what you paid, what you might save, and what you actually saved clearly labeled.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {METRIC_CLARITY_CARDS.map((card) => (
              <div
                key={card.title}
                className="gc-rv gc-rv-pop gc-card-hover group rounded-[24px] bg-[#FFFDF4] p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
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
                        <h3 className="text-[16.5px] font-bold text-[#2E2B1A] leading-snug">
                          {card.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-[13.5px] text-[#686450] leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div>
                  <span className={`inline-flex px-3 py-1 rounded-full text-[12px] font-semibold ${card.chipBg} ${card.chipInk}`}>
                    {card.whenShown}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Three Simple Safety Promises */}
          <div className="gc-rv gc-rv-pop rounded-[24px] bg-[#FFFDF4] p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            {TRUST_GUARDS.map((guard) => (
              <div key={guard.title} className="space-y-1.5">
                <div className="flex items-center gap-2 text-[#155E4B]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <h4 className="text-[14.5px] font-bold text-[#2E2B1A]">{guard.title}</h4>
                </div>
                <p className="text-[13px] text-[#686450] leading-relaxed">{guard.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="gc-rv gc-rv-pop rounded-[32px] bg-[#FAF6E8] p-8 sm:p-11 text-center flex flex-col items-center space-y-5">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
              See what your cloud is actually costing
            </h2>
            <p className="text-[15px] text-[#686450] leading-relaxed">
              Connect an AWS account with read-only permissions in under two minutes, or inspect sample telemetry in the live demo first.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              href={hasAccount ? "/dashboard" : "/onboarding"}
              prefetch={true}
              className="m3-btn m3-pastel-sun"
            >
              <span>{hasAccount ? "Go to dashboard" : "Connect AWS account"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={hasAccount ? "/#optimization" : "/dashboard"}
              prefetch={true}
              scroll={!hasAccount}
              className="m3-btn m3-pastel-oat"
            >
              <span>{hasAccount ? "View example fixes" : "Live demo"}</span>
            </Link>
            <Link href="/#optimization" prefetch={true} scroll={false} className="m3-btn m3-pastel-mint">
              <span>Explore optimizations</span>
            </Link>
          </div>
        </section>
      </main>

      <ComplianceFooter />
    </div>
  );
}
