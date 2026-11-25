"use client";

import { ScrollRevealObserver } from "@/components/overview/MotionPrimitives";
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
    <div className="min-h-screen overflow-x-clip bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      <ScrollRevealObserver />
      <NavigationBar />

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow space-y-14 sm:space-y-20">
        <HeroSection />
        <OptimizationSection />
        <DecisionLoop />
        <WhyGreenOps />
        <UserPersonasSection />
        <IntegrationMatrix />
        <DocumentationSection />
      </main>

      <ComplianceFooter />
    </div>
  );
}
