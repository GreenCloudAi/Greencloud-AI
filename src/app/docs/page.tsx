"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ComplianceFooter } from "@/components/common/ComplianceFooter";
import { ScrollRevealObserver } from "@/components/overview/MotionPrimitives";
import { DocsPortal } from "@/components/docs/DocsPortal";

export default function DocsPage() {
  return (
    <div className="flex-1 bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      <ScrollRevealObserver />

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow space-y-12 sm:space-y-16 pt-3 sm:pt-6">
        {/* Intro Hero */}
        <section className="max-w-3xl mx-auto text-center space-y-5 pt-2 sm:pt-4">
          <div className="gc-hero-enter inline-flex items-center justify-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-7 h-7 rounded-xl bg-[#FAF6E8] p-1.5 flex items-center justify-center">
                <img src="/icons/aws-dark.svg" alt="AWS" className="w-full h-full object-contain" />
              </span>
              <span className="w-7 h-7 rounded-xl bg-[#FAF6E8] p-1.5 flex items-center justify-center">
                <img src="/icons/gcp.svg" alt="GCP" className="w-full h-full object-contain" />
              </span>
              <span className="w-7 h-7 rounded-xl bg-[#FAF6E8] p-1.5 flex items-center justify-center">
                <img src="/icons/azure.svg" alt="Azure" className="w-full h-full object-contain" />
              </span>
            </div>
            <span className="text-[13px] font-semibold text-[#686450]">
              Multi-cloud setup, IAM policies, Terraform &amp; API reference
            </span>
          </div>

          <h1 className="gc-hero-enter text-[32px] sm:text-[42px] lg:text-[46px] font-extrabold tracking-[-0.03em] text-[#2E2B1A] leading-[1.12]">
            GreenCloud AI Documentation
          </h1>

          <p className="gc-hero-enter-delay-1 text-[16px] sm:text-[17.5px] text-[#686450] leading-relaxed max-w-2xl mx-auto">
            Step-by-step guides to connect AWS, Google Cloud, and Microsoft Azure with read-only permissions, generate reviewable Terraform fixes, and verify cost and carbon outcomes.
          </p>

          <div className="gc-hero-enter-delay-2 flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <Link href="/onboarding" prefetch={true} className="m3-btn m3-pastel-sun">
              <span className="material-symbols-outlined text-[18px] leading-none">
                link
              </span>
              <span>Connect cloud account</span>
            </Link>
            <Link href="/audit-history" prefetch={true} className="m3-btn m3-pastel-oat">
              <span className="material-symbols-outlined icon-filled text-[18px] leading-none">
                history
              </span>
              <span>View audit history</span>
            </Link>
          </div>
        </section>

        <Suspense fallback={null}>
          <DocsPortal />
        </Suspense>
      </main>

      <ComplianceFooter />
    </div>
  );
}
