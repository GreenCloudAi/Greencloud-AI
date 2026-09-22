"use client";

import { NavigationBar } from "@/components/common/NavigationBar";
import { ComplianceFooter } from "@/components/common/ComplianceFooter";
import { HeroSection } from "@/components/overview/HeroSection";
import { OptimizationSection } from "@/components/overview/OptimizationSection";
import { DecisionLoop } from "@/components/overview/DecisionLoop";
import { WhyGreenOps } from "@/components/overview/WhyGreenOps";
import { UserPersonasSection } from "@/components/overview/UserPersonasSection";
import { IntegrationMatrix } from "@/components/overview/IntegrationMatrix";
import { DocumentationSection } from "@/components/overview/DocumentationSection";

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      {/* 1. TOP FLOATING NAVIGATION BAR */}
      <NavigationBar />

      {/* 2. MAIN PUBLIC PRODUCT OVERVIEW CONTENT */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 w-full flex-grow space-y-12 sm:space-y-16">
        {/* HERO SECTION: BALANCED 50/50 SPLIT (VALUE PROP + LIVE TELEMETRY CONSOLE) */}
        <HeroSection />

        {/* RECOMMENDED OPTIMIZATIONS (SPACIOUS ACTION SHOWCASE) */}
        <OptimizationSection />

        {/* HOW GREENCLOUD AI WORKS (4-STEP DECISION LIFECYCLE) */}
        <DecisionLoop />

        {/* WHY CLOUD COST & CARBON BELONG TOGETHER */}
        <WhyGreenOps />

        {/* BUILT FOR CROSS-FUNCTIONAL TEAMS */}
        <UserPersonasSection />

        {/* MULTI-CLOUD INFRASTRUCTURE MATRIX */}
        <IntegrationMatrix />

        {/* TECHNICAL DOCUMENTATION & SETUP GUIDES */}
        <DocumentationSection />
      </main>

      {/* 3. ENTERPRISE COMPLIANCE & AUDIT FOOTER */}
      <ComplianceFooter />
    </div>
  );
}
